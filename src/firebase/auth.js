import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  PhoneAuthProvider,
  updatePhoneNumber,
  deleteUser,
} from 'firebase/auth';
import { auth } from './config.js';

let confirmationResult = null;
let recaptchaVerifier = null;
let phoneUpdateVerificationId = null; // ✅ لتحديث رقم الهاتف

// إرسال كود OTP
export async function sendOtp(phoneNumber) {
  try {
    // تحقق من رقم الهاتف
    if (!phoneNumber.startsWith('+964')) {
      throw new Error('صيغة الرقم غير صحيحة. يجب أن يبدأ بـ +964');
    }

    if (!auth) {
      throw new Error('Firebase غير مهيأ بشكل صحيح. تحقق من متغيرات البيئة');
    }

    // تحقق من وجود عنصر reCAPTCHA
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (!recaptchaContainer) {
      throw new Error(
        'عنصر reCAPTCHA غير موجود في الصفحة. تأكد من وجود <div id="recaptcha-container"></div> في الصفحة'
      );
    }

    // إعادة تعيين RecaptchaVerifier إذا كان موجوداً أو مشغولاً
    if (recaptchaVerifier) {
      try {
        // محاولة استدعاء الدالة clear إذا كانت موجودة
        if (typeof recaptchaVerifier.clear === 'function') {
          recaptchaVerifier.clear();
        }
      } catch (e) {
        console.warn('⚠️ تحذير: لا يمكن حذف RecaptchaVerifier السابق', e);
      }
      recaptchaVerifier = null;
    }

    // أنشئ RecaptchaVerifier جديد
    try {
      recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA verified
        },
        'expired-callback': () => {
          recaptchaVerifier = null;
        },
      });
    } catch (recaptchaError) {
      console.error('❌ خطأ في reCAPTCHA:', recaptchaError);
      throw new Error(`فشل في تهيئة reCAPTCHA: ${recaptchaError.message || recaptchaError}`);
    }

    // إرسال OTP
    try {
      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return { success: true };
    } catch (signInError) {
      // إعادة تعيين recaptchaVerifier عند فشل إرسال OTP
      recaptchaVerifier = null;
      console.error('❌ خطأ في إرسال OTP:', signInError);
      throw new Error(signInError.message || 'فشل في إرسال الكود');
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال OTP:', error);
    throw new Error(error.message || 'فشل في إرسال الكود');
  }
}

// التحقق من الكود
export async function verifyOtp(code) {
  try {
    if (!confirmationResult) {
      throw new Error('لم يتم إرسال الكود أولاً. يرجى إرسال كود جديد');
    }

    const result = await confirmationResult.confirm(code);

    return {
      success: true,
      user: {
        id: result.user.uid,
        phone: result.user.phoneNumber,
      },
    };
  } catch (error) {
    console.error('❌ خطأ في التحقق:', error.message);
    throw new Error(error.message || 'فشل التحقق من الكود');
  }
}

// تسجيل الخروج
export async function logout() {
  try {
    if (!auth) {
      throw new Error('Firebase غير مهيأ');
    }
    await signOut(auth);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  }
}

// الحصول على المستخدم الحالي
export async function getCurrentUser() {
  return new Promise((resolve) => {
    if (!auth) {
      console.error('❌ Firebase غير مهيأ');
      resolve(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve({
          uid: user.uid,
          id: user.uid,
          phone: user.phoneNumber,
          phoneNumber: user.phoneNumber,
        });
      } else {
        resolve(null);
      }
    });
  });
}

// الاستماع لتغييرات حالة المصادقة
export function onAuthChange(callback) {
  if (!auth) {
    console.error('❌ Firebase غير مهيأ');
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        id: user.uid,
        phone: user.phoneNumber,
        phoneNumber: user.phoneNumber,
      });
    } else {
      callback(null);
    }
  });
}

// =============================================
// ✅ دوال تحديث رقم الهاتف
// =============================================

/**
 * إرسال OTP للرقم الجديد لتحديث رقم الهاتف
 * @param {string} newPhoneNumber - رقم الهاتف الجديد (مثال: +9647701234567)
 * @returns {Promise<{success: boolean}>}
 */
export async function sendOtpForPhoneUpdate(newPhoneNumber) {
  try {
    if (!newPhoneNumber.startsWith('+964')) {
      throw new Error('صيغة الرقم غير صحيحة. يجب أن يبدأ بـ +964');
    }

    if (!auth || !auth.currentUser) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    // تحقق من وجود عنصر reCAPTCHA
    const recaptchaContainer = document.getElementById('recaptcha-container-update');
    if (!recaptchaContainer) {
      throw new Error('عنصر reCAPTCHA غير موجود');
    }

    // إعادة تعيين RecaptchaVerifier
    if (recaptchaVerifier) {
      try {
        if (typeof recaptchaVerifier.clear === 'function') {
          recaptchaVerifier.clear();
        }
      } catch {
        // تجاهل
      }
      recaptchaVerifier = null;
    }

    // إنشاء RecaptchaVerifier جديد
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-update', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        recaptchaVerifier = null;
      },
    });

    // إرسال OTP باستخدام PhoneAuthProvider
    const provider = new PhoneAuthProvider(auth);
    phoneUpdateVerificationId = await provider.verifyPhoneNumber(newPhoneNumber, recaptchaVerifier);

    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في إرسال OTP لتحديث الرقم:', error);
    recaptchaVerifier = null;
    throw new Error(error.message || 'فشل في إرسال كود التحقق');
  }
}

/**
 * التحقق من الكود وتحديث رقم الهاتف
 * @param {string} verificationCode - كود التحقق المُرسل
 * @returns {Promise<{success: boolean, newPhone: string}>}
 */
export async function verifyAndUpdatePhone(verificationCode) {
  try {
    if (!phoneUpdateVerificationId) {
      throw new Error('لم يتم إرسال كود التحقق. يرجى إعادة المحاولة');
    }

    if (!auth.currentUser) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    // إنشاء credential من الكود
    const credential = PhoneAuthProvider.credential(phoneUpdateVerificationId, verificationCode);

    // تحديث رقم الهاتف
    await updatePhoneNumber(auth.currentUser, credential);

    // إعادة تعيين
    phoneUpdateVerificationId = null;

    return {
      success: true,
      newPhone: auth.currentUser.phoneNumber,
    };
  } catch (error) {
    console.error('❌ خطأ في تحديث رقم الهاتف:', error);

    // رسائل خطأ مفهومة
    let errorMessage = 'فشل في تحديث رقم الهاتف';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'كود التحقق غير صحيح';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'انتهت صلاحية كود التحقق. أعد المحاولة';
    } else if (error.code === 'auth/credential-already-in-use') {
      errorMessage = 'هذا الرقم مستخدم بحساب آخر';
    }

    throw new Error(errorMessage);
  }
}

/**
 * حذف حساب المستخدم من Firebase نهائياً
 * @returns {Promise<void>}
 */
export async function deleteAccount() {
  try {
    if (!auth.currentUser) {
      throw new Error('لا يوجد مستخدم مسجل دخول');
    }

    await deleteUser(auth.currentUser);
  } catch (error) {
    console.error('❌ خطأ في حذف الحساب من Firebase:', error);

    // رسائل خطأ مفهومة
    let errorMessage = 'فشل في حذف الحساب';
    if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'يجب إعادة تسجيل الدخول قبل حذف الحساب لأسباب أمنية';
    }

    throw new Error(errorMessage);
  }
}
