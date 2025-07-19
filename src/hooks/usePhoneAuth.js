import { useState, useCallback } from 'react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

// دوال التحقق المحسنة
export const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmedName = name.trim();
  const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{2,40}$/;
  return nameRegex.test(trimmedName) && trimmedName.length >= 2;
};

export const validateBirthdate = (date) => {
  if (!date || typeof date !== 'string') return false;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const birthDate = new Date(date);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) return false;
  if (birthDate > today) return false;
  
  const age = today.getFullYear() - birthDate.getFullYear();
  if (age < 0 || age > 150) return false;
  if (birthDate.getFullYear() < 1850) return false;
  
  return true;
};

export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;

  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  const iraqiPhoneRegex = /^\+9647[0-9]{8,10}$/;

  return iraqiPhoneRegex.test(cleanPhone);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  if (cleanPhone.startsWith('07')) {
    return '+964' + cleanPhone.substring(1);
  }
  
  if (cleanPhone.startsWith('7') && !cleanPhone.startsWith('07')) {
    return '+964' + cleanPhone;
  }
  
  if (cleanPhone.startsWith('+964')) {
    return cleanPhone;
  }

  return cleanPhone;
};

// Hook الرئيسي
export default function usePhoneAuth() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const navigate = useNavigate();

  const sendCode = useCallback(async () => {
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
        try {
          await window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn('تحذير: فشل في تنظيف reCAPTCHA:', e);
        }
        window.recaptchaVerifier = null;
      }

      // التحقق من وجود العنصر
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        throw new Error('عنصر reCAPTCHA غير موجود');
      }

      // إنشاء reCAPTCHA بالطريقة الصحيحة
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {

        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired');
          setMessage('❌ انتهت صلاحية التحقق، يرجى المحاولة مرة أخرى');
        },
        'error-callback': (error) => {
          console.error('❌ reCAPTCHA error:', error);
          setMessage('❌ خطأ في نظام التحقق، يرجى المحاولة مرة أخرى');
        }
      });

      await window.recaptchaVerifier.render();
      await new Promise(resolve => setTimeout(resolve, 500));

      // إرسال رمز التحقق

      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      
      setConfirmationResult(result);
      setPhone(formattedPhone);
      setMessage('✅ تم إرسال كود التحقق إلى هاتفك');

      return { success: true };
      
    } catch (error) {
      console.error('❌ خطأ مفصل في إرسال الكود:', {
        code: error.code,
        message: error.message,
        phone: formattedPhone,
        timestamp: new Date().toISOString()
      });
      
      let friendlyMessage = '❌ حدث خطأ أثناء إرسال الكود';
      
      switch (error.code) {
        case 'auth/invalid-app-credential':
          friendlyMessage = '❌ خطأ في إعدادات Firebase. تحقق من Firebase Console';
          break;
        case 'auth/too-many-requests':
          friendlyMessage = '❌ تم إرسال الكثير من الطلبات. يرجى المحاولة لاحقاً';
          break;
        case 'auth/invalid-phone-number':
          friendlyMessage = '❌ رقم الهاتف غير صحيح. استخدم صيغة: +9647xxxxxxxx';
          break;
        case 'auth/quota-exceeded':
          friendlyMessage = '❌ تم تجاوز الحد المسموح من الرسائل لهذا اليوم';
          break;
        case 'auth/app-not-authorized':
          friendlyMessage = '❌ التطبيق غير مُخول. أضف localhost في Firebase Console';
          break;
        case 'auth/operation-not-allowed':
          friendlyMessage = '❌ Phone Authentication غير مفعل في Firebase Console';
          break;
        case 'auth/captcha-check-failed':
          friendlyMessage = '❌ فشل التحقق الأمني. أعد تحميل الصفحة';
          break;
        default:
          if (error.message.includes('network')) {
            friendlyMessage = '❌ مشكلة في الاتصال بالإنترنت';
          } else if (error.message.includes('cors')) {
            friendlyMessage = '❌ مشكلة في إعدادات الأمان';
          } else {
            friendlyMessage = `❌ خطأ: ${error.message}`;
          }
          break;
      }
      
      setMessage(friendlyMessage);
      
      // تنظيف reCAPTCHA عند الخطأ
      if (window.recaptchaVerifier) {
        try {
          await window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (clearError) {
          console.warn('تحذير: فشل في تنظيف reCAPTCHA بعد الخطأ:', clearError);
        }
      }
      
      return { success: false, error: friendlyMessage };
      
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const verifyCode = useCallback(async () => {
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

      // حفظ البيانات محلياً
      localStorage.setItem('verifiedUid', uid);
      localStorage.setItem('verifiedPhone', phoneNumber);
      localStorage.setItem('lastLogin', new Date().toISOString());

      setMessage('✅ تم تسجيل الدخول بنجاح!');
      
      setTimeout(() => {
        navigate('/family');
      }, 1500);

      return { success: true, user, uid, phoneNumber };
      
    } catch (error) {
      console.error('❌ خطأ في التحقق من الكود:', error);
      
      let errorMessage = '❌ كود التحقق غير صحيح';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = '❌ كود التحقق غير صحيح';
          break;
        case 'auth/code-expired':
          errorMessage = '❌ انتهت صلاحية الكود. أرسل كود جديد';
          setConfirmationResult(null);
          break;
        case 'auth/session-expired':
          errorMessage = '❌ انتهت جلسة التحقق. ابدأ من جديد';
          setConfirmationResult(null);
          break;
        default:
          errorMessage = `❌ خطأ: ${error.message}`;
      }
      
      setMessage(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setConfirmationLoading(false);
    }
  }, [confirmationResult, code, navigate]);

  return {
    phone,
    setPhone,
    code,
    setCode,
    message,
    loading,
    confirmationLoading,
    confirmationResult,
    sendCode,
    verifyCode
  };
}
