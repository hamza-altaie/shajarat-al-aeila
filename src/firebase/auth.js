import { 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './config.js';


let confirmationResult = null;
let recaptchaVerifier = null;

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

    console.log("📱 إرسال OTP إلى:", phoneNumber);

    // تحقق من وجود عنصر reCAPTCHA
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (!recaptchaContainer) {
      throw new Error('عنصر reCAPTCHA غير موجود في الصفحة. تأكد من وجود <div id="recaptcha-container"></div> في الصفحة');
    }

    // إعادة تعيين RecaptchaVerifier إذا كان موجوداً أو مشغولاً
    if (recaptchaVerifier) {
      try {
        // محاولة استدعاء الدالة clear إذا كانت موجودة
        if (typeof recaptchaVerifier.clear === 'function') {
          recaptchaVerifier.clear();
        }
      } catch (e) {
        console.warn("⚠️ تحذير: لا يمكن حذف RecaptchaVerifier السابق", e);
      }
      recaptchaVerifier = null;
    }

    // أنشئ RecaptchaVerifier جديد
    try {
      recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          console.log("✅ تم التحقق من reCAPTCHA بنجاح");
        },
        'expired-callback': () => {
          console.warn("⚠️ انتهت صلاحية reCAPTCHA");
          recaptchaVerifier = null;
        }
      });
      console.log("✅ تم إنشاء RecaptchaVerifier بنجاح");
    } catch (recaptchaError) {
      console.error("❌ خطأ في reCAPTCHA:", recaptchaError);
      throw new Error(`فشل في تهيئة reCAPTCHA: ${recaptchaError.message || recaptchaError}`);
    }

    // إرسال OTP
    try {
      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      console.log("✅ تم إرسال الكود بنجاح");
      return { success: true };
    } catch (signInError) {
      // إعادة تعيين recaptchaVerifier عند فشل إرسال OTP
      recaptchaVerifier = null;
      console.error("❌ خطأ في إرسال OTP:", signInError);
      throw new Error(signInError.message || 'فشل في إرسال الكود');
    }
  } catch (error) {
    console.error("❌ خطأ في إرسال OTP:", error);
    throw new Error(error.message || 'فشل في إرسال الكود');
  }
}

// التحقق من الكود
export async function verifyOtp(code) {
  try {
    if (!confirmationResult) {
      throw new Error('لم يتم إرسال الكود أولاً. يرجى إرسال كود جديد');
    }

    console.log("🔐 التحقق من الكود");
    const result = await confirmationResult.confirm(code);
    
    console.log("✅ تسجيل دخول ناجح!");
    return {
      success: true,
      user: {
        id: result.user.uid,
        phone: result.user.phoneNumber,
      }
    };
  } catch (error) {
    console.error("❌ خطأ في التحقق:", error.message);
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
    console.log("✅ تم تسجيل الخروج");
  } catch (error) {
    console.error("❌ خطأ:", error.message);
    throw error;
  }
}

// الحصول على المستخدم الحالي
export async function getCurrentUser() {
  return new Promise((resolve) => {
    if (!auth) {
      console.error("❌ Firebase غير مهيأ");
      resolve(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve({
          id: user.uid,
          phone: user.phoneNumber
        });
      } else {
        resolve(null);
      }
    });
  });
}
