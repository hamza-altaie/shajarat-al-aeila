import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Box, Typography, Alert, 
  CircularProgress, InputAdornment, Divider
} from '@mui/material';
import { Phone as PhoneIcon, Security as SecurityIcon } from '@mui/icons-material';
import { usePhoneAuth } from '../hooks/usePhoneAuth';

export default function ProductionSMSForm({ onSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [timer, setTimer] = useState(0);

  const { sendVerificationCode, verifyCode, loading, error, reset } = usePhoneAuth();

  // مؤقت إعادة الإرسال
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendCode = async () => {
    const result = await sendVerificationCode(phoneNumber);
    
    if (result.success) {
      setStep('code');
      setTimer(120); // مؤقت 2 دقيقة
    }
  };

  const handleVerifyCode = async () => {
    const result = await verifyCode(verificationCode);
    
    if (result.success) {
      onSuccess?.(result.user);
    }
  };

  const handleResendCode = () => {
    setStep('phone');
    setVerificationCode('');
    reset();
  };

  const formatPhoneNumber = (value) => {
    // تنسيق تلقائي لرقم الهاتف
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('964')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('07')) {
      return `+964${cleaned.substring(1)}`;
    } else if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      return `+964${cleaned}`;
    }
    return value;
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', p: 3 }}>
      <Typography variant="h5" align="center" gutterBottom sx={{ fontFamily: 'Cairo' }}>
        🌳 دخول شجرة العائلة
      </Typography>
      
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
        {step === 'phone' 
          ? 'أدخل رقم هاتفك لتلقي كود التحقق'
          : 'أدخل كود التحقق المرسل إلى هاتفك'
        }
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} dir="rtl">
          {error}
        </Alert>
      )}

      {step === 'phone' ? (
        <>
          <TextField
            fullWidth
            label="رقم الهاتف"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            placeholder="+9647xxxxxxxx"
            type="tel"
            dir="ltr"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
            helperText="أدخل رقم هاتفك العراقي مع رمز الدولة"
          />
          
          <Button
            fullWidth
            variant="contained"
            onClick={handleSendCode}
            disabled={loading || !phoneNumber}
            startIcon={loading ? <CircularProgress size={20} /> : <SecurityIcon />}
            sx={{ py: 1.5, fontSize: '1.1rem' }}
          >
            {loading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
          </Button>
        </>
      ) : (
        <>
          <TextField
            fullWidth
            label="كود التحقق"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
            placeholder="xxxxxx"
            type="text"
            inputMode="numeric"
            dir="ltr"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SecurityIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
            helperText={`تم إرسال الكود إلى ${phoneNumber}`}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleVerifyCode}
            disabled={loading || verificationCode.length !== 6}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ py: 1.5, fontSize: '1.1rem', mb: 2 }}
          >
            {loading ? 'جاري التحقق...' : 'تحقق من الكود'}
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ textAlign: 'center' }}>
            {timer > 0 ? (
              <Typography variant="body2" color="text.secondary">
                يمكنك إعادة إرسال الكود بعد {timer} ثانية
              </Typography>
            ) : (
              <Button
                variant="text"
                onClick={handleResendCode}
                sx={{ textDecoration: 'underline' }}
              >
                إعادة إرسال الكود
              </Button>
            )}
          </Box>
        </>
      )}

      {/* حاوي reCAPTCHA المخفي */}
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
      
      <Typography variant="caption" align="center" sx={{ mt: 3, display: 'block', color: 'text.secondary' }}>
        🔒 محمي برمز التحقق الآمن
      </Typography>
    </Box>
  );
}