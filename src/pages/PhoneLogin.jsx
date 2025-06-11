import React, { useState } from 'react';
import usePhoneAuth from '../hooks/usePhoneAuth';
import { Container, Paper, TextField, Button, Box } from '@mui/material';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PhoneLogin = () => {
  const {
    phone, setPhone,
    code, setCode,
    confirmationResult,
    message, // تمت إزالة setMessage
    sendCode,
    verifyCode
  } = usePhoneAuth();

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [localMessage, setLocalMessage] = useState("");


  // عداد مؤقت لإعادة تفعيل زر الإرسال
  React.useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ width: '100%', p: { xs: 2, sm: 3 }, textAlign: 'center', borderRadius: 3, boxShadow: 2 }}>
        <img src="/tree-bg.png" alt="شعار شجرة العائلة" style={{ width: 80, height: 80, marginBottom: 12, borderRadius: '50%' }} />
        <h2 style={{ fontSize: 22, marginBottom: 10, color: '#388e3c', fontWeight: 700 }}>مرحباً بك في تطبيق شجرة العائلة</h2>
        <p style={{ fontSize: 15, marginBottom: 18, color: '#444' }}>يرجى تسجيل الدخول باستخدام رقم هاتفك للبدء في بناء شجرتك العائلية بسهولة وأمان.</p>
        <h3 style={{ fontSize: 18, marginBottom: 20 }}>تسجيل الدخول برقم الهاتف</h3>
        

        <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
          <TextField
            value="+964"
            disabled
            sx={{ width: 90, direction: 'ltr', input: { textAlign: 'center', fontWeight: 700, color: '#388e3c' } }}
            variant="outlined"
          />
          <TextField
            type="tel"
            label="رقم الهاتف"
            placeholder="XXXXXXXXXX"
            value={phone.replace(/^\+964/, '')}
            onChange={e => setPhone('+964' + e.target.value.replace(/[^0-9]/g, '').slice(0,10))}
            fullWidth
            size="medium"
            sx={{ direction: 'rtl', textAlign: 'right', ml: 1 }}
            inputProps={{ style: { textAlign: 'right', direction: 'rtl' }, maxLength: 10 }}
            inputMode="numeric"
          />
        </Box>
        <Button
          variant="contained"
          color="success"
          fullWidth
          sx={{ py: 1.2, fontSize: 16, borderRadius: 2, mb: 2, position: 'relative' }}
          onClick={async () => {
            try {
              setSending(true);
              const result = await sendCode();
              if (result?.success !== false) {
                setTimer(30);
              }
            } catch (e) {
              console.error(e);
            } finally {
              setSending(false);
            }
          }}
          disabled={sending || timer > 0}
        >
          {sending ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>جاري الإرسال...</span>
              <span className="spinner" style={{ width: 18, height: 18, border: '2px solid #fff', borderTop: '2px solid #388e3c', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
            </span>
          ) : timer > 0 ? `إرسال كود (${timer})` : 'إرسال كود'}
        </Button>
        {confirmationResult && (
          <>
            <TextField
              type="text"
              label="أدخل الكود"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              size="medium"
              sx={{ mb: 2, direction: 'rtl', textAlign: 'right' }}
              inputProps={{ style: { textAlign: 'right', direction: 'rtl' } }}
              inputMode="numeric"
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ py: 1.2, fontSize: 16, borderRadius: 2, mb: 2, position: 'relative', opacity: verifying ? 0.6 : 1, pointerEvents: verifying ? 'none' : 'auto' }}
              onClick={async () => {
                try {
                  setVerifying(true);
                  await verifyCode();
                } catch (e) {
                  setLocalMessage("فشل التحقق من الكود. تأكد من صحته.");
                } finally {
                  setVerifying(false);
                }
              }}
              disabled={verifying}
            >
              {verifying ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span>جاري التحقق...</span>
                  <span className="spinner" style={{ width: 18, height: 18, border: '2px solid #fff', borderTop: '2px solid #1976d2', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                </span>
              ) : 'تحقق'}
            </Button>
          </>
        )}
        <p style={{ fontSize: 14, color: '#d32f2f', minHeight: 24 }}>{localMessage || message}</p>
        <div id="recaptcha-container" style={{ direction: 'ltr' }}></div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </Paper>
    </Container>
  );
};

export default PhoneLogin;
