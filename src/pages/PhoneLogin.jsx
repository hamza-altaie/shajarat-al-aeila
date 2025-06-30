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
  const [phoneNumber, setPhoneNumber] = useState('');

  // فحص حالة Firebase عند التحميل
  useEffect(() => {
  const checkStatus = async () => {
    try {
      const { getFirebaseStatus } = await import('../firebase/config');

      if (typeof getFirebaseStatus !== 'function') {
        throw new Error('getFirebaseStatus is not a function');
      }

      // نضيف تأخير بسيط قبل استدعاء الفحص
      setTimeout(() => {
        const status = getFirebaseStatus();
        setFirebaseStatus(status);

        if (!status.isInitialized) {
          setError('❌ خطأ في تهيئة Firebase. يرجى التحقق من الإعدادات.');
        } else {
          setError('');
        }
      }, 100); // تأخير 100 مللي ثانية
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
  
  // إعداد reCAPTCHA
  useEffect(() => {
    if (!firebaseStatus?.services?.auth) return;
    
    const setupRecaptcha = () => {
      try {
        // تنظيف أي reCAPTCHA موجود
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }
        
        // إعداد reCAPTCHA جديد
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('✅ reCAPTCHA تم التحقق منه');
          },
          'expired-callback': () => {
            console.log('⚠️ reCAPTCHA انتهت صلاحيته');
            setError('انتهت صلاحية التحقق. يرجى المحاولة مرة أخرى.');
          },
          'error-callback': (error) => {
            console.error('❌ خطأ في reCAPTCHA:', error);
            setError('خطأ في التحقق الأمني. يرجى إعادة تحميل الصفحة.');
          }
        });
        
        setRecaptchaVerifier(verifier);
        window.recaptchaVerifier = verifier;
        
      } catch (error) {
        console.error('❌ خطأ في إعداد reCAPTCHA:', error);
        setError('خطأ في إعداد التحقق الأمني.');
      }
    };
    
    // تأخير قصير للتأكد من تحميل DOM
    const timer = setTimeout(setupRecaptcha, 500);
    
    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [firebaseStatus]);

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
    
    setPhoneNumber(formattedPhone);
  };

  // إرسال كود التحقق
  const handleSendCode = async () => {
    // التأكد من أن الرقم صحيح قبل الإرسال
    if (!phoneNumber || !phoneNumber.startsWith('+9647') || (phoneNumber.length !== 13 && phoneNumber.length !== 14)) {
      setError('❌ يرجى إدخال رقم هاتف عراقي صحيح');
      return;
    }
    
    // فحص حالة Firebase قبل الإرسال
    if (!firebaseStatus?.isInitialized) {
      setError('❌ خطأ في الاتصال بالخدمة. يرجى إعادة تحميل الصفحة.');
      return;
    }
    
    if (!recaptchaVerifier) {
      setError('جاري تحضير التحقق الأمني، يرجى الانتظار...');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('📱 إرسال رمز التحقق إلى:', phoneNumber);
      
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      
      setConfirmationResult(confirmation);
      setSuccess(`تم إرسال رمز التحقق إلى ${phoneNumber}`);
      setTimer(60); // 60 ثانية انتظار
      
      console.log('✅ تم إرسال رمز التحقق بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في إرسال رمز التحقق:', error);
      
      // معالجة أخطاء مختلفة
      let errorMessage = 'حدث خطأ في إرسال رمز التحقق';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'رقم الهاتف غير صحيح';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة لاحقاً';
          break;
        case 'auth/captcha-check-failed':
          errorMessage = 'فشل التحقق الأمني. يرجى إعادة تحميل الصفحة';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'تم تجاوز الحد المسموح اليومي. يرجى المحاولة غداً';
          break;
        default:
          errorMessage = error.message || 'حدث خطأ غير متوقع';
      }
      
      setError(errorMessage);
      
      // إعادة تعيين reCAPTCHA
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        window.location.reload(); // إعادة تحميل الصفحة لإعادة تعيين reCAPTCHA
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
        // لا نوقف العملية بسبب هذا الخطأ
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

  // التحقق من صحة رقم الهاتف للعرض
  const isPhoneValid = () => {
    if (!phoneNumber) return false;
    
    // التحقق من أن الرقم يبدأ بكود العراق الصحيح
    if (!phoneNumber.startsWith('+9647')) return false;
    
    // التحقق من طول الرقم الصحيح
    return phoneNumber.length === 13 || phoneNumber.length === 14;
  };

  const isCodeValid = verificationCode && verificationCode.length === 6;

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
            {phoneNumber && (
              <Box mb={2} p={1} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  الرقم الكامل: <strong dir="ltr">{phoneNumber}</strong>
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

        {/* حاوية reCAPTCHA */}
        <Box 
          id="recaptcha-container" 
          sx={{ 
            display: 'flex',
            justifyContent: 'center',
            mt: 2,
            mb: 2
          }}
        />
      </Paper>
    </Container>
  );
};

export default PhoneLogin;