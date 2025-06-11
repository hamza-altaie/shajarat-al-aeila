import React, { useState, useEffect } from 'react';
import usePhoneAuth from '../hooks/usePhoneAuth';
import {
  Container, Paper, TextField, Button, Box, Typography, 
  Alert, CircularProgress, InputAdornment, Link
} from '@mui/material';
import { Phone as PhoneIcon, Security as SecurityIcon, Warning as WarningIcon } from '@mui/icons-material';

const PhoneLogin = () => {
  const {
    phone, setPhone,
    code, setCode,
    confirmationResult,
    message, setMessage,
    loading,
    confirmationLoading,
    sendCode,
    verifyCode,
    formatPhoneNumber
  } = usePhoneAuth();

  const [timer, setTimer] = useState(0);
  const [phoneInput, setPhoneInput] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState(null);

  // فحص حالة Firebase عند التحميل
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { checkFirebaseStatus } = await import('../firebase/config');
        const status = checkFirebaseStatus();
        setFirebaseStatus(status);
        
        if (!status.isInitialized) {
          setMessage('❌ خطأ في تهيئة Firebase. يرجى التحقق من الإعدادات.');
        } else if (status.config.isDemoConfig) {
          setMessage('⚠️ يتم استخدام إعدادات تجريبية. يرجى تحديث ملف .env');
        }
      } catch (error) {
        console.error('خطأ في فحص Firebase:', error);
        setFirebaseStatus({ isInitialized: false, error: error.message });
      }
    };
    
    checkStatus();
  }, [setMessage]);

  // عداد مؤقت لإعادة تفعيل زر الإرسال
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // دالة مساعدة للتحقق من الرقم العراقي
  const isValidIraqiNumber = (phoneInput) => {
    // 07xxxxxxxx (10 أرقام تبدأ بـ 07)
    if (phoneInput.length === 10 && phoneInput.startsWith('07')) {
      return true;
    }
    
    // 7xxxxxxxx أو 7xxxxxxxxx (9-10 أرقام تبدأ بـ 7 بدون صفر)
    if ((phoneInput.length === 9 || phoneInput.length === 10) && phoneInput.startsWith('7') && !phoneInput.startsWith('07')) {
      return true;
    }
    
    return false;
  };

  // معالجة تغيير رقم الهاتف
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // إزالة كل شيء عدا الأرقام
    
    // تحديد الحد الأقصى للأرقام (10 أرقام للأرقام العراقية)
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    
    setPhoneInput(value);
    
    // تنسيق الرقم للعرض والإرسال
    let formattedPhone = '';
    if (value.length > 0) {
      // معالجة أرقام الهاتف العراقية
      if (value.startsWith('07') && value.length === 10) {
        // إزالة الصفر الأول من 07xxxxxxxx -> 7xxxxxxxx
        formattedPhone = '+964' + value.substring(1);
      } else if (value.startsWith('7') && value.length === 9) {
        // إضافة كود الدولة مباشرة لـ 7xxxxxxxx
        formattedPhone = '+964' + value;
      } else if (value.length === 10 && value.startsWith('7')) {
        // للأرقام التي تبدأ بـ 7 وطولها 10
        formattedPhone = '+964' + value;
      }
    }
    
    setPhone(formattedPhone);
  };

  // إرسال كود التحقق
  const handleSendCode = async () => {
    // التأكد من أن الرقم صحيح قبل الإرسال
    if (!phone || !phone.startsWith('+9647') || (phone.length !== 13 && phone.length !== 14)) {
      setMessage('❌ يرجى إدخال رقم هاتف عراقي صحيح');
      return;
    }
    
    // فحص حالة Firebase قبل الإرسال
    if (!firebaseStatus?.isInitialized) {
      setMessage('❌ خطأ في الاتصال بالخدمة. يرجى إعادة تحميل الصفحة.');
      return;
    }
    
    try {
      const result = await sendCode();
      if (result?.success !== false) {
        setTimer(60); // 60 ثانية انتظار
      }
    } catch (error) {
      console.error('خطأ في إرسال الكود:', error);
      setMessage('❌ فشل في إرسال الكود، يرجى المحاولة مرة أخرى');
    }
  };

  // التحقق من الكود
  const handleVerifyCode = async () => {
    try {
      await verifyCode();
    } catch (error) {
      console.error('خطأ في التحقق:', error);
    }
  };

  // التحقق من صحة رقم الهاتف للعرض
  const isPhoneValid = () => {
    if (!phone) return false;
    
    // التحقق من أن الرقم يبدأ بكود العراق الصحيح
    if (!phone.startsWith('+9647')) return false;
    
    // التحقق من طول الرقم الصحيح
    return phone.length === 13 || phone.length === 14;
  };

  const isCodeValid = code && code.length === 6;

  // تحديد النص التوضيحي بناءً على ما تم إدخاله
  const getHelperText = () => {
    if (phoneInput.length === 0) {
      return "مثال: 7701234567 أو 07701234567";
    } else if (phoneInput.length < 9) {
      return `أدخل ${9 - phoneInput.length} أرقام إضافية`;
    } else if (phoneInput.length === 9 && phoneInput.startsWith('7')) {
      return "✅ رقم صحيح";
    } else if (phoneInput.length === 10 && phoneInput.startsWith('07')) {
      return "✅ رقم صحيح";
    } else if (phoneInput.length === 10 && phoneInput.startsWith('7')) {
      return "✅ رقم صحيح";
    } else {
      return "تنسيق الرقم غير صحيح";
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

        {firebaseStatus?.config?.isDemoConfig && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              يتم استخدام إعدادات تجريبية. قد لا تعمل جميع الميزات بشكل صحيح.
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
            {phone && (
              <Box mb={2} p={1} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  الرقم الكامل: <strong dir="ltr">{phone}</strong>
                </Typography>
              </Box>
            )}
            
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
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                  setCode(value);
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
          {message && (
            <Alert 
              severity={message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}
              sx={{ mb: 2 }}
            >
              {message}
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

        {/* حاوية reCAPTCHA مخفية */}
        <Box 
          id="recaptcha-container" 
          sx={{ 
            position: 'absolute',
            top: -9999,
            left: -9999,
            visibility: 'hidden',
            opacity: 0,
            pointerEvents: 'none'
          }}
        />
      </Paper>
    </Container>
  );
};

export default PhoneLogin;