import React from 'react';
import usePhoneAuth from '../hooks/usePhoneAuth';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export default function PhoneVerification() {
  const navigate = useNavigate();
  const {
    phone, setPhone,
    code, setCode,
    confirmationResult,
    message, setMessage,
    sendCode,
    confirmationLoading,
    setConfirmationLoading,
  } = usePhoneAuth();

  const verifyCode = async () => {
    setMessage('');
    if (!confirmationResult) return;

    try {
      setConfirmationLoading(true);
      await confirmationResult.confirm(code);
      localStorage.setItem('verifiedPhone', phone);

      // ✅ التحقق هل هذا المستخدم مرتبط مسبقًا بأب
      const userDoc = await getDoc(doc(db, 'users', phone));
      const hasFather = userDoc.exists() && userDoc.data().linkedParentUid;

      if (!hasFather) {
        navigate('/select-father'); // لا يوجد أب، نرسله لاختيار الأب
      } else {
        navigate('/family'); // يوجد أب مسبقًا
      }
    } catch (error) {
      console.error('Verification error:', error);
      setMessage('❌ فشل التحقق من الرمز');
    } finally {
      setConfirmationLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h2>تسجيل الدخول برقم الهاتف</h2>
      <input
        type="tel"
        placeholder="+964XXXXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      /><br /><br />
      <button onClick={sendCode} disabled={confirmationLoading}>إرسال الرمز</button><br /><br />
      {confirmationResult && (
        <>
          <input
            type="text"
            placeholder="رمز التحقق"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          /><br /><br />
          <button onClick={verifyCode} disabled={confirmationLoading}>
            {confirmationLoading ? 'جارٍ التحقق...' : 'تحقق'}
          </button>
          <br /><br />
        </>
      )}
      <div id="recaptcha-container"></div>
      <p>{message}</p>
    </div>
  );
}
