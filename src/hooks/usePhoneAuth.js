import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { getDoc, setDoc, doc } from 'firebase/firestore';

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
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const iraqiPhoneRegex = /^\+9647[0-9]{8,9}$/;
  
  return iraqiPhoneRegex.test(cleanPhone);
};

export const formatPhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  if (cleanPhone.startsWith('07')) {
    return '+964' + cleanPhone.substring(1);
  }
  
  if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
    return '+964' + cleanPhone;
  }
  
  if (cleanPhone.startsWith('7') && cleanPhone.length === 10) {
    return '+964' + cleanPhone;
  }
  
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

      // إنشاء reCAPTCHA جديد مع إعدادات محسنة
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          console.log('✅ تم حل reCAPTCHA بنجاح');
        },
        'expired-callback': () => {
          console.warn('⚠️ انتهت صلاحية reCAPTCHA');
          setMessage('❌ انتهت صلاحية التحقق، يرجى المحاولة مرة أخرى');
        },
        'error-callback': (error) => {
          console.error('❌ خطأ في reCAPTCHA:', error);
          setMessage('❌ خطأ في نظام التحقق، يرجى المحاولة مرة أخرى');
        }
      });

      // تقديم reCAPTCHA
      try {
        await window.recaptchaVerifier.render();
        console.log('✅ تم تقديم reCAPTCHA بنجاح');
      } catch (renderError) {
        console.error('❌ خطأ في تقديم reCAPTCHA:', renderError);
        throw new Error('فشل في تهيئة نظام التحقق');
      }

      // إرسال رمز التحقق
      console.log('📱 إرسال رمز التحقق إلى:', formattedPhone);
      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      
      setConfirmationResult(result);
      setPhone(formattedPhone);
      setMessage('✅ تم إرسال كود التحقق إلى هاتفك');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ خطأ في إرسال الكود:', error);
      
      let friendlyMessage = '❌ حدث خطأ أثناء إرسال الكود';
      
      // معالجة أنواع الأخطاء المختلفة
      switch (error.code) {
        case 'auth/too-many-requests':
          friendlyMessage = '❌ تم إرسال الكثير من الطلبات. يرجى المحاولة لاحقاً';
          break;
        case 'auth/invalid-phone-number':
          friendlyMessage = '❌ رقم الهاتف غير صحيح';
          break;
        case 'auth/quota-exceeded':
          friendlyMessage = '❌ تم تجاوز الحد المسموح من الرسائل لهذا اليوم';
          break;
        case 'auth/app-not-authorized':
          friendlyMessage = '❌ التطبيق غير مصرح له باستخدام هذه الخدمة';
          break;
        case 'auth/recaptcha-not-enabled':
          friendlyMessage = '❌ نظام التحقق غير مفعل';
          break;
        case 'auth/operation-not-allowed':
          friendlyMessage = '❌ تسجيل الدخول بالهاتف غير مفعل';
          break;
        default:
          if (error.message.includes('network')) {
            friendlyMessage = '❌ مشكلة في الاتصال بالإنترنت';
          } else if (error.message.includes('cors')) {
            friendlyMessage = '❌ مشكلة في إعدادات الأمان';
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
  };

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
      console.log('🔐 التحقق من الكود...');
      const result = await confirmationResult.confirm(code);
      const user = result.user;
      const uid = user.uid;
      const phoneNumber = user.phoneNumber;

      console.log('✅ تم التحقق من الكود بنجاح');

      // حفظ البيانات محلياً
      localStorage.setItem('verifiedUid', uid);
      localStorage.setItem('verifiedPhone', phoneNumber);

      // التحقق من وجود المستخدم في قاعدة البيانات
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // مستخدم جديد
        const newUserData = {
          uid,
          phone: phoneNumber,
          createdAt: new Date().toISOString(),
          isFamilyRoot: false,
          isNewUser: true,
          hasCompletedSetup: false,
          lastLogin: new Date().toISOString(),
        };
        
        await setDoc(userRef, newUserData);
        console.log('✅ تم إنشاء حساب جديد');
        
        setMessage('✅ تم إنشاء حسابك بنجاح');
        navigate('/family-selection');
        
      } else {
        // مستخدم موجود
        const userData = userSnap.data();
        
        // تحديث آخر تسجيل دخول
        await setDoc(userRef, {
          lastLogin: new Date().toISOString(),
        }, { merge: true });

        console.log('✅ تم تسجيل دخول مستخدم موجود');
        setMessage('✅ تم تسجيل الدخول بنجاح');
        
        // توجيه المستخدم بناءً على حالة حسابه
        if (userData.isNewUser && !userData.hasCompletedSetup) {
          navigate('/family-selection');
        } else {
          navigate('/family');
        }
      }
      
      // تنظيف البيانات
      setCode('');
      setConfirmationResult(null);
      
      // تنظيف reCAPTCHA
      if (window.recaptchaVerifier) {
        try {
          await window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (clearError) {
          console.warn('تحذير: فشل في تنظيف reCAPTCHA:', clearError);
        }
      }
      
    } catch (error) {
      console.error('❌ خطأ في التحقق من الكود:', error);
      
      let friendlyMessage = '❌ كود التحقق غير صحيح';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          friendlyMessage = '❌ كود التحقق غير صحيح';
          break;
        case 'auth/code-expired':
          friendlyMessage = '❌ انتهت صلاحية كود التحقق، يرجى طلب كود جديد';
          break;
        case 'auth/session-expired':
          friendlyMessage = '❌ انتهت جلسة التحقق، يرجى البدء من جديد';
          break;
        case 'auth/invalid-verification-id':
          friendlyMessage = '❌ معرف التحقق غير صالح، يرجى طلب كود جديد';
          break;
        case 'auth/missing-verification-code':
          friendlyMessage = '❌ يرجى إدخال كود التحقق';
          break;
        default:
          if (error.message.includes('network')) {
            friendlyMessage = '❌ مشكلة في الاتصال بالإنترنت';
          }
          break;
      }
      
      setMessage(friendlyMessage);
      
    } finally {
      setConfirmationLoading(false);
    }
  };

  const cleanup = () => {
    // تنظيف شامل
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('تحذير: فشل في تنظيف reCAPTCHA:', e);
      }
      window.recaptchaVerifier = null;
    }
    
    setPhone('');
    setCode('');
    setConfirmationResult(null);
    setMessage('');
    setLoading(false);
    setConfirmationLoading(false);
  };

  // تنظيف عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    phone,
    code,
    confirmationResult,
    message,
    loading,
    confirmationLoading,
    
    setPhone,
    setCode,
    setMessage,
    setConfirmationLoading,
    sendCode,
    verifyCode,
    cleanup,
    
    validateName,
    validateBirthdate,
    validatePhone,
    formatPhoneNumber,
  };
}