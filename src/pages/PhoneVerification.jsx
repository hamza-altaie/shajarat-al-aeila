import React from 'react';
import usePhoneAuth from '../hooks/usePhoneAuth';

export default function PhoneVerification() {
  const {
    phone, setPhone,
    code, setCode,
    confirmationResult,
    message,
    sendCode,
    verifyCode
  } = usePhoneAuth();

  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h2>تسجيل الدخول برقم الهاتف</h2>
      <input
        type="tel"
        placeholder="+964XXXXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      /><br /><br />
      <button onClick={sendCode}>إرسال الرمز</button><br /><br />
      {confirmationResult && (
        <>
          <input
            type="text"
            placeholder="رمز التحقق"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          /><br /><br />
          <button onClick={() => verifyCode('/')}>تحقق</button><br /><br />
        </>
      )}
      <div id="recaptcha-container"></div>
      <p>{message}</p>
    </div>
  );
}
