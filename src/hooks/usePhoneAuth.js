import { useState } from 'react';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from '../firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { getDoc, setDoc, doc } from 'firebase/firestore';

// دوال التحقق المحسنة
export const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmedName = name.trim();
  // يسمح بحروف عربية أو إنجليزية ومسافة، 2-40 حرف
  const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{2,40}$/;
  return nameRegex.test(trimmedName) && trimmedName.length >= 2;
};

export const validateBirthdate = (date) => {
  if (!date || typeof date !== 'string') return false;
  
  // تحقق من الصيغة YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const birthDate = new Date(date);
  const today = new Date();
  
  // تحقق من صحة التاريخ
  if (isNaN(birthDate.getTime())) return false;
  
  // تحقق من عدم كون التاريخ في المستقبل
  if (birthDate > today) return false;
  
  // تحقق من العمر المنطقي (أقل من 150 سنة)
  const age = today.getFullYear() - birthDate.getFullYear();
  if (age < 0 || age > 150) return false;
  
  // تحقق من التاريخ المنطقي (ليس قبل 1850)
  if (birthDate.getFullYear() < 1850) return false;
  
  return true;
};

// دالة التحقق من رقم الهاتف - مُصلحة
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // إزالة الفراغات والرموز الخاصة
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // تحقق من الصيغة العراقية الدولية - مُصلح
  // يقبل +9647 متبوعاً بـ 8 أو 9 أرقام
  const iraqiPhoneRegex = /^\+9647[0-9]{8,9}$/;
  
  return iraqiPhoneRegex.test(cleanPhone);
};

// دالة تنسيق رقم الهاتف - محسنة
export const formatPhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // إذا بدأ بـ 07، أضف رمز العراق واحذف الصفر
  if (cleanPhone.startsWith('07')) {
    return '+964' + cleanPhone.substring(1);
  }
  
  // إذا بدأ بـ 7 وطوله 9 أرقام، أضف رمز العراق
  if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
    return '+964' + cleanPhone;
  }
  
  // إذا بدأ بـ 7 وطوله 10 أرقام، أضف رمز العراق
  if (cleanPhone.startsWith('7') && cleanPhone.length === 10) {
    return '+964' + cleanPhone;
  }
  
  // إذا بدأ بـ +964، احتفظ به كما هو
  if (cleanPhone.startsWith('+964')) {
    return cleanPhone;
  }
  
  return cleanPhone;
};

export default function usePhoneAuth() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const navigate = useNavigate();

  // إرسال كود التحقق
  const sendCode = async () => {
    const formattedPhone = formatPhoneNumber(phone);
    
    if (!validatePhone(formattedPhone)) {
      setMessage('❌ أدخل رقم هاتف عراقي صالح (مثال: +9647xxxxxxxx أو 07xxxxxxxx)');
      return { success: false };
    }

    setLoading(true);
    setMessage('');

    try {
      // تنظيف reCAPTCHA السابق
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      // إنشاء reCAPTCHA جديد
      window.recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            setMessage('❌ انتهت صلاحية التحقق، يرجى المحاولة مرة أخرى');
          }
        },
        auth
      );

      await window.recaptchaVerifier.render();
      const appVerifier = window.recaptchaVerifier;
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setPhone(formattedPhone); // حفظ الرقم المنسق
      setMessage('✅ تم إرسال كود التحقق إلى هاتفك');
      
      return { success: true };
    } catch (error) {
      console.error('Error sending code:', error);
      
      let friendlyMessage = '❌ حدث خطأ أثناء إرسال الكود';
      
      if (error.code === 'auth/too-many-requests') {
        friendlyMessage = '❌ تم إرسال الكثير من الطلبات. يرجى المحاولة لاحقاً';
      } else if (error.code === 'auth/invalid-phone-number') {
        friendlyMessage = '❌ رقم الهاتف غير صحيح';
      } else if (error.code === 'auth/quota-exceeded') {
        friendlyMessage = '❌ تم تجاوز الحد المسموح من الرسائل لهذا اليوم';
      }
      
      setMessage(friendlyMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // التحقق من الكود
  const verifyCode = async () => {
    if (!confirmationResult) {
      setMessage('❌ يرجى إرسال كود التحقق أولاً');
      return;
    }

    if (!code || code.length < 6) {
      setMessage('❌ أدخل كود التحقق المكون من 6 أرقام');
      return;
    }

    setConfirmationLoading(true);
    setMessage('');

    try {
      const result = await confirmationResult.confirm(code);
      const user = result.user;
      const uid = user.uid;
      const phoneNumber = user.phoneNumber;

      // حفظ بيانات المصادقة
      localStorage.setItem('verifiedUid', uid);
      localStorage.setItem('verifiedPhone', phoneNumber);

      // التحقق من وجود المستخدم في قاعدة البيانات
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // مستخدم جديد - إنشاء حساب أساسي
        await setDoc(userRef, {
          uid,
          phone: phoneNumber,
          createdAt: new Date().toISOString(),
          isFamilyRoot: false, // سيتم تحديد هذا في صفحة اختيار العائلة
          isNewUser: true, // علامة للمستخدم الجديد
          hasCompletedSetup: false, // لم يكمل الإعداد بعد
          lastLogin: new Date().toISOString(),
        });
        
        setMessage('✅ تم إنشاء حسابك بنجاح');
        
        // توجيه المستخدم الجديد لصفحة اختيار العائلة
        navigate('/family-selection');
        
      } else {
        // مستخدم موجود - تحديث آخر تسجيل دخول
        const userData = userSnap.data();
        await setDoc(userRef, {
          lastLogin: new Date().toISOString(),
        }, { merge: true });

        setMessage('✅ تم تسجيل الدخول بنجاح');
        
        // التحقق إذا كان المستخدم تخطى اختيار العائلة سابقاً
        if (userData.isNewUser && !userData.hasCompletedSetup) {
          // مستخدم قديم لم يكمل الإعداد - توجيه لاختيار العائلة
          navigate('/family-selection');
        } else {
          // مستخدم مكتمل الإعداد - توجيه للصفحة الرئيسية
          navigate('/family');
        }
      }
      // تنظيف النموذج
      setCode('');
      setConfirmationResult(null);
      
    } catch (error) {
      console.error('Error verifying code:', error);
      
      let friendlyMessage = '❌ كود التحقق غير صحيح';
      
      if (error.code === 'auth/invalid-verification-code') {
        friendlyMessage = '❌ كود التحقق غير صحيح';
      } else if (error.code === 'auth/code-expired') {
        friendlyMessage = '❌ انتهت صلاحية كود التحقق، يرجى طلب كود جديد';
      } else if (error.code === 'auth/session-expired') {
        friendlyMessage = '❌ انتهت جلسة التحقق، يرجى البدء من جديد';
      }
      
      setMessage(friendlyMessage);
    } finally {
      setConfirmationLoading(false);
    }
  };

  // تنظيف الموارد
  const cleanup = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    setPhone('');
    setCode('');
    setConfirmationResult(null);
    setMessage('');
    setLoading(false);
    setConfirmationLoading(false);
  };

  return {
    // البيانات
    phone,
    code,
    confirmationResult,
    message,
    loading,
    confirmationLoading,
    
    // الدوال
    setPhone,
    setCode,
    setMessage,
    setConfirmationLoading,
    sendCode,
    verifyCode,
    cleanup,
    
    // دوال التحقق
    validateName,
    validateBirthdate,
    validatePhone,
    formatPhoneNumber,
  };
}