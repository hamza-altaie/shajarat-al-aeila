import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography, 
  Alert, CircularProgress, InputAdornment, Link
} from '@mui/material';
import { Phone as PhoneIcon, Security as SecurityIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useAuth } from '../AuthContext.jsx';

const PhoneLogin = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [firebaseStatus] = useState({ isInitialized: true });
  const [timer, setTimer] = useState(0);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const {
    loginPhoneRequest,
    loginPhoneVerify,
    clearError,
  } = useAuth() || {};

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // التحقق من الرقم العراقي (10-11 رقم)
  const isValidIraqiNumber = (phoneInput) => {
    if (!phoneInput || typeof phoneInput !== 'string') return false;
    const cleanInput = phoneInput.replace(/\s|\(|\)/g, '');
    const validPatterns = [
      /^07[0-9]{9}$/,       // 0771234567 (10 أرقام)
      /^07[0-9]{10}$/,      // 07712345670 (11 رقم)
      /^7[0-9]{9}$/,        // 771234567 (10 أرقام)
      /^7[0-9]{10}$/        // 7712345670 (11 رقم)
    ];
    return validPatterns.some(pattern => pattern.test(cleanInput));
  };

  // تغيير رقم الهاتف (قبول 10-11 رقم)
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    
    // ❌ الحد الأقصى للرقم العراقي هو 11 رقم (07XXXXXXXXXX)
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    
    setPhoneInput(value);
    let formattedPhone = '';
    
    // تنسيق الرقم بناءً على البداية
    if (value.length > 0) {
      if (value.startsWith('07')) {
        // 07xxxxxxxxx أو 07xxxxxxxxxxx (10-11 أرقام) -> +964 7xxxxxxxxxx
        if (value.length === 10 || value.length === 11) {
          const withoutZero = value.substring(1); // 7xxxxxxxxx أو 7xxxxxxxxxxx
          formattedPhone = '+964' + withoutZero;
        }
      } else if (value.startsWith('7')) {
        // 7xxxxxxxxx أو 7xxxxxxxxxxx (9-10 أرقام) -> +964 7xxxxxxxxxx
        if ((value.length === 9 || value.length === 10)) {
          formattedPhone = '+964' + value;
        }
      }
    }
    
    setPhoneNumber(formattedPhone);
  };

  // إرسال كود التحقق
  const handleSendCode = async () => {
    // 1. التحقق من صحة الرقم - الحد الأدنى 13 حرف (+964 + 9 أرقام)
    if (!phoneNumber || phoneNumber.length < 13) {
      setError('❌ يرجى إدخال رقم هاتف صحيح (10-11 رقم محلي)');
      return;
    }

    // 2. التحقق الإضافي من صيغة الرقم (10 أرقام بعد 964)
    const digitCount = phoneNumber.replace(/[^\d]/g, '').length;
    if (digitCount !== 13) {
      setError(`❌ خطأ في طول الرقم: يجب أن يكون 10 أرقام بعد 964 (13 مجموع)، الحالي: ${digitCount} أرقام`);
      return;
    }

    if (!phoneNumber.startsWith('+9647')) {
      setError('❌ رقم غير صحيح: يجب أن يبدأ الرقم بـ +9647');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    if (clearError) clearError();

    try {
      // 3. التحقق من وجود دالة الإرسال
      if (!loginPhoneRequest) {
        throw new Error('خدمة إرسال الرمز غير متاحة حالياً');
      }

      // 4. محاولة إرسال الكود
      const res = await loginPhoneRequest(phoneNumber);

      if (!res?.success) {
        throw new Error(res?.error || 'فشل في إرسال الكود');
      }

      // 5. نجاح الإرسال
      setConfirmationResult(true);
      setSuccess(`✅ تم إرسال كود التحقق إلى ${phoneNumber}`);
      setTimer(120);

    } catch (error) {
      setConfirmationResult(null);
      
      const errorMessage = error.message || 'فشل في إرسال الكود';
      
      // معالجة أخطاء Firebase الشائعة
      if (errorMessage.includes('firebase') || errorMessage.includes('Firebase')) {
        setError('⚠️ خطأ في Firebase - تحقق من متغيرات البيئة وإعدادات المشروع');
      } else if (errorMessage.includes('reCAPTCHA')) {
        setError('⚠️ خطأ في reCAPTCHA - حاول لاحقاً أو أعد تحميل الصفحة');
      } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        setError('⏳ لقد تجاوزت حد المحاولات. يرجى الانتظار 15 دقيقة');
        setTimer(60);
      } else {
        setError(errorMessage);
      }
      setTimer(0);
    } finally {
      setLoading(false);
    }
  };

  // التحقق من الكود
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.trim().length === 0) {
      setError('❌ يرجى إدخال كود التحقق');
      return;
    }
    if (verificationCode.length !== 6) {
      setError('❌ كود التحقق يجب أن يكون 6 أرقام بالضبط');
      return;
    }
    if (!confirmationResult) {
      setError('❌ خطأ في جلسة التحقق. يرجى إرسال كود جديد');
      return;
    }
    setConfirmationLoading(true);
    setError('');
    setSuccess('');
    if (clearError) {
      clearError();
    }

    try {
      if (!loginPhoneVerify) {
        throw new Error('خدمة التحقق غير متاحة حالياً');
      }

      const result = await loginPhoneVerify(phoneNumber, verificationCode.trim());

      if (!result?.success) {
        throw new Error(result?.error || '❌ كود التحقق غير صحيح');
      }

      const user = result.user || {};

      try {
        const uid = user.id || user.ID || user.uid;
        if (uid) {
          localStorage.setItem('verifiedUid', String(uid));
        }
        const phone = user.phone || user.phoneNumber || phoneNumber;
        if (phone) {
          localStorage.setItem('verifiedPhone', phone);
        }
        localStorage.setItem('lastLogin', new Date().toISOString());
      } catch (e) {
        console.warn('⚠️ تحذير: مشكلة في حفظ بيانات المستخدم محليًا:', e);
      }

      setSuccess('🎉 تم تسجيل الدخول بنجاح! جاري التوجه للتطبيق...');
      
      // 🧪 تحديث الحالة فوراً في التطوير
      try {
        // لا حاجة لتسجيل هذا
      } catch {
        // تجاهل أي أخطاء
      }
      
      // التوجيه مرة واحدة فقط بعد تأخير قصير
      setTimeout(() => {
        window.location.href = '/family';
      }, 1000);
    } catch (error) {
      const message = error.message || '❌ كود التحقق غير صحيح';
      setError(message);
      if (!message.includes('جلسة التحقق') && !message.includes('غير متاحة')) {
        setVerificationCode('');
      }
    } finally {
      setConfirmationLoading(false);
    }
  };

  // التحقق من صحة رقم الهاتف للعرض
  const isPhoneValid = () => {
    if (!phoneNumber) return false;
    if (!phoneNumber.startsWith('+9647')) return false;
    return phoneNumber.length === 13 || phoneNumber.length === 14;
  };

  const isCodeValid = verificationCode && verificationCode.length === 6;

  const getHelperText = () => {
    if (phoneInput.length === 0) {
      return 'مثال: 7701234567 أو 07701234567';
    } else if (phoneInput.length < 9) {
      return `أدخل ${9 - phoneInput.length} أرقام إضافية`;
    } else if (phoneInput.length === 9 && phoneInput.startsWith('7')) {
      return '✅ رقم صحيح';
    } else if (phoneInput.length === 10 && phoneInput.startsWith('07')) {
      return '✅ رقم صحيح';
    } else if (phoneInput.length === 10 && phoneInput.startsWith('7')) {
      return '✅ رقم صحيح';
    } else {
      return 'تنسيق الرقم غير صحيح';
    }
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}
    >
      <Paper 
        elevation={8}
        sx={{ 
          width: '100%', 
          p: { xs: 3, sm: 4 }, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        }}
      >
        {/* شعار التطبيق */}
        <Box textAlign="center" mb={4}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)'
            }}
          >
            <Typography variant="h3" sx={{ color: 'white' }}>
              🌳
            </Typography>
          </Box>
          
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            gutterBottom
            sx={{ 
              color: '#2e7d32',
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            شجرة العائلة
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ mb: 3, lineHeight: 1.6 }}
          >
            ابنِ شجرة عائلتك بسهولة وأمان. تطبيق شامل لإدارة وعرض أفراد العائلة
          </Typography>
        </Box>

        {/* تحذير حالة Firebase */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            🔥 Firebase Phone Authentication
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            سيتم إرسال SMS حقيقي إلى رقمك. تأكد من توفر رصيد في حسابك.
          </Typography>
        </Alert>

        {firebaseStatus && !firebaseStatus.isInitialized && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<WarningIcon />}>
            <Typography variant="body2" fontWeight="bold">
              خطأ في الاتصال بالخدمة
            </Typography>
            <Typography variant="body2">
              يرجى التحقق من اتصالك بالإنترنت وإعادة تحميل الصفحة
            </Typography>
          </Alert>
        )}

        {/* نموذج تسجيل الدخول */}
        <Box>
          <Typography 
            variant="h6" 
            gutterBottom 
            textAlign="center"
            sx={{ mb: 3, color: '#1976d2' }}
          >
            تسجيل الدخول برقم الهاتف
          </Typography>

          {/* 🧪 تنبيه وضع التطوير */}
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>🧪 وضع التطوير:</strong> لا يتم إرسال SMS فعلي<br/>
            استخدم أي رقم + كود: <strong>123456</strong>
          </Alert>

          {/* حقل رقم الهاتف */}
          <Box mb={3}>
            <Box display="flex" gap={1} mb={2}>
              <TextField
                type="tel"
                label="رقم الهاتف"
                placeholder="7701234567"
                value={phoneInput}
                onChange={handlePhoneChange}
                fullWidth
                size="medium"
                dir="ltr"
                disabled={!firebaseStatus?.isInitialized}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                helperText={getHelperText()}
                inputProps={{ 
                  maxLength: 10,
                  style: { textAlign: 'left' }
                }}
                error={phoneInput.length > 0 && !isValidIraqiNumber(phoneInput)}
              />
              
              <TextField
                value="+964"
                disabled
                sx={{ 
                  width: 80,
                  '& .MuiInputBase-input': {
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#2e7d32'
                  }
                }}
                size="medium"
              />
            </Box>
            
            {/* عرض الرقم الكامل المنسق */}
            {phoneNumber && (
              <Box mb={2} p={1} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  الرقم الكامل: <strong dir="ltr">{phoneNumber}</strong>
                </Typography>
              </Box>
            )}
            
            {/* 🔐 reCAPTCHA Container - rendered at bottom of page */}
            {/* Note: The recaptcha-container is rendered below as a hidden div */}
            
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              onClick={handleSendCode}
              disabled={loading || timer > 0 || !isPhoneValid() || !firebaseStatus?.isInitialized}
              sx={{ 
                py: 1.5, 
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 2,
                position: 'relative'
              }}
            >
              {loading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} color="inherit" />
                  جاري الإرسال...
                </Box>
              ) : timer > 0 ? (
                `إعادة الإرسال خلال ${timer} ثانية`
              ) : (
                'إرسال كود التحقق'
              )}
            </Button>
          </Box>

          {/* حقل كود التحقق */}
          {confirmationResult && (
            <Box mb={3}>
              <TextField
                type="text"
                label="كود التحقق"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                fullWidth
                size="medium"
                placeholder="أدخل الكود المكون من 6 أرقام"
                disabled={!firebaseStatus?.isInitialized}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SecurityIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }
                }}
                helperText="تم إرسال الكود إلى هاتفك"
              />
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={handleVerifyCode}
                disabled={confirmationLoading || !isCodeValid || !firebaseStatus?.isInitialized}
                sx={{ 
                  py: 1.5, 
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 2,
                  mt: 2
                }}
              >
                {confirmationLoading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} color="inherit" />
                    جاري التحقق...
                  </Box>
                ) : (
                  'تأكيد الكود'
                )}
              </Button>

              {/* زر إعادة إرسال الكود */}
              {timer === 0 && (
                <Box textAlign="center" mt={2}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={handleSendCode}
                    disabled={loading || !firebaseStatus?.isInitialized}
                    sx={{ cursor: 'pointer' }}
                  >
                    لم تستلم الكود؟ إعادة الإرسال
                  </Link>
                </Box>
              )}
            </Box>
          )}

          {/* رسائل الحالة */}
          {error && (
            <Alert 
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => setError('')}>
                  إغلاق
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert 
              severity="success"
              sx={{ mb: 2 }}
            >
              {success}
            </Alert>
          )}

          {/* معلومات إضافية */}
          <Box mt={4} p={2} bgcolor="grey.50" borderRadius={2}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              🔒 بياناتك محمية بتقنيات التشفير المتقدمة
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
              نحن نحترم خصوصيتك ولا نشارك بياناتك مع أي طرف ثالث
            </Typography>
          </Box>

          {/* رابط سياسة الخصوصية */}
          <Box textAlign="center" mt={3}>
            <Link
              href="/privacy"
              variant="body2"
              color="primary"
              underline="hover"
            >
              سياسة الخصوصية والشروط
            </Link>
          </Box>
        </Box>

        {/* حاوية reCAPTCHA - مخفية (غير مرئية) */}
        <div id="recaptcha-container" style={{ visibility: 'hidden', height: 0, position: 'absolute' }}></div>
      </Paper>
    </Container>
  );
};

export default PhoneLogin;
