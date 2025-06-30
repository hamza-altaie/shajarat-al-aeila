// src/pages/PhoneLogin.jsx - الإصلاح النهائي للأخطاء المتبقية

import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography, 
  Alert, CircularProgress, InputAdornment, Link
} from '@mui/material';
import { Phone as PhoneIcon, Security as SecurityIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { auth } from '../firebase/config';
import {
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  updateProfile,
  onAuthStateChanged 
} from 'firebase/auth';

import userService from '../userService';

const PhoneLogin = () => {
  const navigate = useNavigate();

  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const [timer, setTimer] = useState(0);
  const [phoneInput, setPhoneInput] = useState('');

  // فحص حالة Firebase عند التحميل
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { getFirebaseStatus } = await import('../firebase/config');

        if (typeof getFirebaseStatus !== 'function') {
          throw new Error('getFirebaseStatus is not a function');
        }

        setTimeout(() => {
          const status = getFirebaseStatus();
          setFirebaseStatus(status);

          if (!status.isInitialized) {
            setError('❌ خطأ في تهيئة Firebase. يرجى التحقق من الإعدادات.');
          } else if (status.config?.isDemoConfig) {
            setError('⚠️ يتم استخدام إعدادات تجريبية. يرجى تحديث ملف .env');
          } else {
            setError('');
          }
        }, 100);
      } catch (error) {
        console.error('خطأ في فحص Firebase:', error);
        setFirebaseStatus({
          isInitialized: false,
          error: error.message || 'فشل في فحص حالة Firebase'
        });
        setError('⚠️ تحذير: قد تكون هناك مشكلة في إعدادات Firebase');
      }
    };

    checkStatus();
  }, []);

  // مراقبة حالة المصادقة
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && localStorage.getItem('verifiedUid') && localStorage.getItem('verifiedPhone')) {
        console.log('✅ المستخدم مكتمل التحقق، توجيه إلى الصفحة الرئيسية');
        navigate('/family');
      }
    });
    return () => unsubscribe();
  }, [navigate]);
  
  // إعداد reCAPTCHA مُحسن
  useEffect(() => {
    if (!firebaseStatus?.services?.auth) return;
    
    const setupRecaptcha = async () => {
      try {
        // تنظيف أي reCAPTCHA موجود
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (e) {
            console.warn('تنظيف reCAPTCHA السابق:', e);
          }
          window.recaptchaVerifier = null;
        }
        
        // التأكد من وجود العنصر
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          console.error('❌ عنصر recaptcha-container غير موجود');
          return;
        }
        
        // إنشاء reCAPTCHA جديد مع إعدادات محسنة
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response) => {
            console.log('✅ reCAPTCHA تم التحقق منه بنجاح:', response);
          },
          'expired-callback': () => {
            console.warn('⚠️ reCAPTCHA انتهت صلاحيته');
            setError('انتهت صلاحية التحقق. يرجى المحاولة مرة أخرى.');
          },
          'error-callback': (error) => {
            console.error('❌ خطأ في reCAPTCHA:', error);
            setError('خطأ في التحقق الأمني. يرجى إعادة تحميل الصفحة.');
          }
        });
        
        // تقديم reCAPTCHA
        await verifier.render();
        console.log('✅ تم تقديم reCAPTCHA بنجاح');
        
        setRecaptchaVerifier(verifier);
        window.recaptchaVerifier = verifier;
        
      } catch (error) {
        console.error('❌ خطأ في إعداد reCAPTCHA:', error);
        setError('خطأ في إعداد التحقق الأمني. يرجى إعادة تحميل الصفحة.');
      }
    };
    
    const timer = setTimeout(setupRecaptcha, 1000);
    
    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn('تنظيف reCAPTCHA عند إلغاء التحميل:', e);
        }
        window.recaptchaVerifier = null;
      }
    };
  }, [firebaseStatus?.services?.auth]);

  // عداد مؤقت لإعادة تفعيل زر الإرسال
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // ✅ إصلاح دالة التحقق من الرقم العراقي
  const isValidIraqiNumber = (phoneInput) => {
    if (!phoneInput || typeof phoneInput !== 'string') return false;
    
    // إزالة الفراغات والشرط
    const cleaned = phoneInput.replace(/[\s\-()]/g, '');
    
    // أنماط الأرقام العراقية المقبولة:
    // 07xxxxxxxx (10 أرقام)
    // 7xxxxxxxx (9 أرقام) 
    // 7xxxxxxxxx (10 أرقام بدون صفر أولي)
    
    if (cleaned.length === 10 && cleaned.startsWith('07')) {
      return /^07[0-9]{8}$/.test(cleaned);
    }
    
    if (cleaned.length === 9 && cleaned.startsWith('7') && !cleaned.startsWith('07')) {
      return /^7[0-9]{8}$/.test(cleaned);
    }
    
    // إضافة دعم للأرقام 10 أرقام بدون صفر أولي
    if (cleaned.length === 10 && cleaned.startsWith('7') && !cleaned.startsWith('07')) {
      return /^7[0-9]{9}$/.test(cleaned);
    }
    
    return false;
  };

  // ✅ إصلاح دالة تنسيق رقم الهاتف
  const formatPhoneNumber = (phoneInput) => {
    if (!phoneInput) return '';
    
    // إزالة كل شيء عدا الأرقام
    const cleaned = phoneInput.replace(/[^\d]/g, '');
    
    // تحويل إلى التنسيق الدولي
    if (cleaned.startsWith('07') && cleaned.length === 10) {
      // 07xxxxxxxx -> +9647xxxxxxxx
      return '+964' + cleaned.substring(1);
    } else if (cleaned.startsWith('7') && cleaned.length === 9 && !cleaned.startsWith('07')) {
      // 7xxxxxxxx -> +9647xxxxxxxx
      return '+964' + cleaned;
    } else if (cleaned.startsWith('7') && cleaned.length === 10 && !cleaned.startsWith('07')) {
      // 7xxxxxxxxx -> +9647xxxxxxxxx
      return '+964' + cleaned;
    }
    
    return '';
  };

  // ✅ معالجة تغيير رقم الهاتف المحسنة
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // إزالة كل شيء عدا الأرقام
    
    // تحديد الحد الأقصى
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    
    setPhoneInput(value);
  };

  // ✅ الحصول على الرقم المنسق للإرسال
  const getFormattedPhoneNumber = () => {
    return formatPhoneNumber(phoneInput);
  };

  // ✅ التحقق من صحة الرقم للإرسال
  const isPhoneValidForSending = () => {
    const formatted = getFormattedPhoneNumber();
    return formatted && formatted.startsWith('+9647') && (formatted.length === 13 || formatted.length === 14 || formatted.length === 15);
  };

  // ✅ إرسال كود التحقق - مُحسن بالكامل
  const handleSendCode = async () => {
    // تعريف متغير phoneNumber محلياً لتجنب خطأ initialization
    const phoneNumber = getFormattedPhoneNumber();
    
    // تشخيص شامل قبل الإرسال
    console.log('🔍 تشخيص ما قبل الإرسال:');
    console.log('- رقم الهاتف المُدخل:', phoneInput);
    console.log('- رقم الهاتف المُنسق:', phoneNumber);
    console.log('- Firebase Status:', firebaseStatus);
    console.log('- reCAPTCHA Status:', !!recaptchaVerifier);
    
    // التحقق من صحة الرقم
    if (!phoneNumber || !isPhoneValidForSending()) {
      setError('❌ يرجى إدخال رقم هاتف عراقي صحيح (مثال: 07701234567 أو 7701234567)');
      return;
    }
    
    // فحص حالة Firebase
    if (!firebaseStatus?.isInitialized) {
      setError('❌ خطأ في الاتصال بالخدمة. يرجى إعادة تحميل الصفحة.');
      return;
    }
    
    // التحقق من وجود reCAPTCHA
    if (!recaptchaVerifier || !window.recaptchaVerifier) {
      setError('❌ جاري تحضير التحقق الأمني، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى...');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('📱 إرسال رمز التحقق إلى:', phoneNumber);
      console.log('🔐 باستخدام reCAPTCHA:', !!window.recaptchaVerifier);
      
      // إضافة تأخير قصير قبل الإرسال للتأكد من جاهزية reCAPTCHA
      await new Promise(resolve => setTimeout(resolve, 500));

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      
      setConfirmationResult(confirmation);
      setSuccess(`✅ تم إرسال رمز التحقق إلى ${phoneNumber}`);
      setTimer(60);
      
      console.log('✅ تم إرسال رمز التحقق بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في إرسال رمز التحقق:', error);
      
      let errorMessage = 'حدث خطأ في إرسال رمز التحقق';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = '❌ رقم الهاتف غير صحيح. تأكد من الصيغة الصحيحة';
          break;
        case 'auth/too-many-requests':
          errorMessage = '❌ تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة لاحقاً';
          setTimer(3600);
          break;
        case 'auth/captcha-check-failed':
          errorMessage = '❌ فشل التحقق الأمني. يرجى إعادة تحميل الصفحة';
          break;
        case 'auth/quota-exceeded':
          errorMessage = '❌ تم تجاوز الحد المسموح اليومي. يرجى المحاولة غداً';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = '❌ تسجيل الدخول بالهاتف غير مفعل. تحقق من إعدادات Firebase';
          break;
        default:
          errorMessage = `❌ خطأ: ${error.message || 'حدث خطأ غير متوقع'}`;
          break;
      }
      
      setError(errorMessage);
      
      // إعادة تعيين reCAPTCHA عند الخطأ
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
          setRecaptchaVerifier(null);
        } catch (clearError) {
          console.warn('فشل في تنظيف reCAPTCHA:', clearError);
        }
      }
      
    } finally {
      setLoading(false);
    }
  };
  
  // التحقق من الكود
  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('يرجى إدخال رمز التحقق');
      return;
    }
    
    if (verificationCode.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }
    
    if (!confirmationResult) {
      setError('خطأ في عملية التحقق. يرجى المحاولة مرة أخرى');
      return;
    }
    
    setConfirmationLoading(true);
    setError('');
    
    try {
      console.log('🔐 التحقق من الرمز...');
      
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;

      localStorage.setItem('verifiedUid', user.uid);
      localStorage.setItem('verifiedPhone', user.phoneNumber);
      
      console.log('✅ تم التحقق بنجاح، المستخدم:', user.uid);
      
      // تحديث معلومات المستخدم
      if (!user.displayName) {
        await updateProfile(user, {
          displayName: `مستخدم ${user.phoneNumber}`
        });
      }
      
      // حفظ أو تحديث بيانات المستخدم
      try {
        await userService.createOrUpdateUser(user.uid, {
          phoneNumber: user.phoneNumber,
          displayName: user.displayName || `مستخدم ${user.phoneNumber}`,
          lastLogin: new Date(),
          createdAt: new Date()
        });
        
        console.log('✅ تم حفظ بيانات المستخدم');
      } catch (userError) {
        console.warn('⚠️ تحذير: لم يتم حفظ بيانات المستخدم:', userError);
      }
      
      setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');
      
      // توجيه المستخدم بعد تأخير قصير
      setTimeout(() => {
        navigate('/family');
      }, 1500);
      
    } catch (error) {
      console.error('❌ خطأ في التحقق من الرمز:', error);
      
      let errorMessage = 'رمز التحقق غير صحيح';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'رمز التحقق غير صحيح';
          break;
        case 'auth/code-expired':
          errorMessage = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد';
          break;
        case 'auth/session-expired':
          errorMessage = 'انتهت جلسة التحقق. يرجى المحاولة مرة أخرى';
          break;
        default:
          errorMessage = error.message || 'حدث خطأ في التحقق';
      }
      
      setError(errorMessage);
      
    } finally {
      setConfirmationLoading(false);
    }
  };

  const isCodeValid = verificationCode && verificationCode.length === 6;

  // ✅ تحديد النص التوضيحي المحسن
  const getHelperText = () => {
    if (phoneInput.length === 0) {
      return "مثال: 7701234567 أو 07701234567";
    } 
    
    if (phoneInput.length < 9) {
      return `أدخل ${9 - phoneInput.length} أرقام إضافية على الأقل`;
    }
    
    if (isValidIraqiNumber(phoneInput)) {
      const formatted = getFormattedPhoneNumber();
      return `✅ سيتم الإرسال إلى: ${formatted}`;
    }
    
    return "❌ تنسيق الرقم غير صحيح";
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
        {/* حاوية reCAPTCHA */}
        <Box 
          id="recaptcha-container" 
          sx={{ 
            position: 'fixed',
            top: '-1000px',
            left: '-1000px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none'
          }}
        />

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
            ابنِ شجرة عائلتك بسهولة وأمان
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
            
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              onClick={handleSendCode}
              disabled={loading || timer > 0 || !isPhoneValidForSending() || !firebaseStatus?.isInitialized}
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
      </Paper>
    </Container>
  );
};

export default PhoneLogin;