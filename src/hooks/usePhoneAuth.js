import { useState } from 'react';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from '../firebase/auth';
import { useNavigate } from 'react-router-dom';

// دالة التحقق من صحة الاسم (يجب أن يكون عربيًا أو إنجليزيًا، 2-40 حرفًا)
function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  // يسمح بحروف عربية أو إنجليزية ومسافة، 2-40 حرف
  const re = /^[\u0600-\u06FFa-zA-Z\s]{2,40}$/;
  return re.test(name.trim());
}

// دالة التحقق من صحة تاريخ الميلاد (صيغة yyyy-mm-dd، منطقية، ليس في المستقبل)
function validateBirthdate(date) {
  if (!date || typeof date !== 'string') return false;
  // تحقق من الصيغة
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(date)) return false;
  const d = new Date(date);
  const now = new Date();
  if (isNaN(d.getTime())) return false;
  if (d > now) return false;
  // عمر منطقي (أقل من 120 سنة)
  const age = now.getFullYear() - d.getFullYear();
  if (age < 0 || age > 120) return false;
  return true;
}

// دالة التحقق من صحة رقم الهاتف العراقي (+964xxxxxxxxx)
function validatePhone(phone) {
  if (!phone) return false;
  // إزالة الفراغات
  const p = phone.replace(/\s+/g, '');
  // تحقق من الصيغة الدولية العراقية
  const re = /^\+9647[0-9]{9}$/;
  return re.test(p);
}

export default function usePhoneAuth() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const sendCode = async () => {
    if (!validatePhone(phone)) {
      setMessage('❌ أدخل رقم هاتف عراقي صالح (+9647xxxxxxxxx)');
      return;
    }
    try {
      // تفعيل reCAPTCHA
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', { size: 'invisible' }, auth);
        await window.recaptchaVerifier.render();
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      setMessage('✅ تم إرسال كود التحقق إلى هاتفك');
    } catch (error) {
      setMessage('❌ حدث خطأ أثناء إرسال الكود: ' + error.message);
    }
  };

  const verifyCode = async (redirectPath = '/family') => {
    if (!confirmationResult || !code) {
      setMessage('❌ أدخل كود التحقق');
      return;
    }
    try {
      await confirmationResult.confirm(code);
      localStorage.setItem('verifiedPhone', phone);
      setMessage('✅ تم التحقق بنجاح');
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      setMessage('❌ كود التحقق غير صحيح أو منتهي الصلاحية');
    }
  };

  return {
    phone, setPhone,
    code, setCode,
    confirmationResult,
    message, setMessage,
    sendCode,
    verifyCode,
    validateName,
    validateBirthdate
  };
}

export { validateName, validateBirthdate, validatePhone };
