import React, { useState, useEffect } from 'react';
import {
  Container, Paper, TextField, Button, Box, Typography, 
  Alert, CircularProgress, InputAdornment, Link
} from '@mui/material';
import { Phone as PhoneIcon, Security as SecurityIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { auth, getFirebaseStatus, testFirebaseConnection } from '../firebase/config';
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




  useEffect(() => {
    console.log('🚀 تم تحميل مكون PhoneLogin');
    
    // دالة التنظيف (cleanup function)
    return () => {
      console.log('🧹 بدء تنظيف مكون PhoneLogin...');
      
      try {
        // تنظيف reCAPTCHA
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
          console.log('✅ تم تنظيف window.recaptchaVerifier');
        }
        
        // تنظيف الـ state المحلي
        setRecaptchaVerifier(null);
        setConfirmationResult(null);
        setLoading(false);
        setError('');
        setSuccess('');
        console.log('✅ تم تنظيف الـ state');
        
        // تنظيف عنصر HTML
        const container = document.getElementById('recaptcha-container');
        if (container) {
          container.innerHTML = '';
          console.log('✅ تم تنظيف HTML container');
        }
        
        // إيقاف المؤقت إذا كان يعمل
        if (timer > 0) {
          setTimer(0);
          console.log('✅ تم إيقاف المؤقت');
        }
        
      } catch (error) {
        console.warn('⚠️ تحذير أثناء التنظيف:', error);
      }
      
      console.log('🎉 اكتمل تنظيف مكون PhoneLogin');
    };
  }, []);

  // فحص حالة Firebase عند التحميل
  useEffect(() => {
  const checkStatus = async () => {
    try {
      // استخدام الدالة المُستوردة مباشرة
      const status = getFirebaseStatus();
      setFirebaseStatus(status);

      if (!status.isInitialized) {
        setError('❌ خطأ في تهيئة Firebase. يرجى التحقق من الإعدادات.');
      } else {
        setError('');
        console.log('✅ Firebase جاهز للاستخدام');
        
        // اختبار اتصال Firebase
        testFirebaseConnection().then(result => {
          if (!result.success) {
            console.warn('⚠️ تحذير Firebase:', result.error);
          } else {
            console.log('🎉 جميع خدمات Firebase تعمل بشكل ممتاز!');
          }
        });
      }
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
  // إعداد reCAPTCHA - تشغيل مرة واحدة فقط
  useEffect(() => {
    if (!firebaseStatus?.services?.auth) return;
    
    const setupRecaptcha = async () => {
      try {
        console.log('🔧 بدء إعداد reCAPTCHA الأولي...');
        
        // التأكد من عدم وجود reCAPTCHA سابق
        if (window.recaptchaVerifier) {
          console.log('🔧 تنظيف reCAPTCHA الموجود...');
          try {
            await window.recaptchaVerifier.clear();
          } catch (e) {
            console.log('تنظيف reCAPTCHA...');
          }
          window.recaptchaVerifier = null;
        }
        
        // تنظيف العنصر
        const container = document.getElementById('recaptcha-container');
        if (container) {
          container.innerHTML = '';
        }
        
        // لا ننشئ reCAPTCHA هنا - سننشئه عند الحاجة في handleSendCode
        console.log('✅ تم تنظيف reCAPTCHA. سيتم إنشاؤه عند الحاجة');
        
      } catch (error) {
        console.error('❌ خطأ في إعداد reCAPTCHA:', error);
      }
    };

    setupRecaptcha();
  }, [firebaseStatus?.services?.auth]); // يتم التشغيل مرة واحدة فقط

  // عداد مؤقت لإعادة تفعيل زر الإرسال
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // دالة مساعدة للتحقق من الرقم العراقي
  const isValidIraqiNumber = (phoneInput) => {
  if (!phoneInput || typeof phoneInput !== 'string') return false;
  
  // إزالة المسافات والرموز
  const cleanInput = phoneInput.replace(/[\s\-()]/g, '');
  
  // التحقق من الأنماط المقبولة للأرقام العراقية
  const validPatterns = [
    /^07[0-9]{8}$/, // 07xxxxxxxx
    /^7[0-9]{8}$/,  // 7xxxxxxxx (9 أرقام)
    /^7[0-9]{9}$/   // 7xxxxxxxxx (10 أرقام)
  ];
  
  return validPatterns.some(pattern => pattern.test(cleanInput));
};

// 4. تحسين دالة handlePhoneChange:
const handlePhoneChange = (e) => {
  let value = e.target.value.replace(/[^\d]/g, ''); // الأرقام فقط
  
  // حد أقصى 10 أرقام
  if (value.length > 10) {
    value = value.slice(0, 10);
  }
  
  setPhoneInput(value);
  
  // تنسيق الرقم للإرسال
  let formattedPhone = '';
  if (value.length > 0) {
    if (value.startsWith('07') && value.length === 10) {
      // تحويل 07xxxxxxxx إلى +9647xxxxxxxx
      formattedPhone = '+964' + value.substring(1);
    } else if (value.startsWith('7') && (value.length === 9 || value.length === 10)) {
      // تحويل 7xxxxxxxx إلى +9647xxxxxxxx
      formattedPhone = '+964' + value;
    }
  }
  
  setPhoneNumber(formattedPhone);
};

  // 1. تحديث دالة handleSendCode للإنتاج النهائي:
  const handleSendCode = async () => {
  console.log('🚀 بدء عملية إرسال الكود...');
  console.log('📞 الرقم:', phoneNumber);
  
  // فحص أساسي
  if (!phoneNumber || phoneNumber.length < 13) {
    setError('❌ يرجى إدخال رقم هاتف صحيح');
    return;
  }
  
  if (!firebaseStatus?.isInitialized) {
    setError('❌ Firebase غير جاهز. أعد تحميل الصفحة');
    return;
  }
  
  setLoading(true);
  setError('');
  setSuccess('');
  
  try {
    // 🔥 تنظيف كامل قبل إنشاء reCAPTCHA جديد
    if (window.recaptchaVerifier) {
      try {
        await window.recaptchaVerifier.clear();
      } catch (e) {
        console.log('تنظيف reCAPTCHA القديم...');
      }
      window.recaptchaVerifier = null;
      setRecaptchaVerifier(null);
    }
    
    // تنظيف العنصر HTML
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // 🔥 انتظار قصير للتأكد من التنظيف
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // إنشاء reCAPTCHA جديد
    console.log('🔧 إنشاء reCAPTCHA جديد...');
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      sitekey: '6LdQcnQrAAAAAHBcSFsSxfs68h0lXvcdlw0Wafb0',
      callback: () => console.log('✅ reCAPTCHA جاهز'),
      'expired-callback': () => {
        console.warn('⚠️ انتهت صلاحية reCAPTCHA');
        setError('❌ انتهت صلاحية التحقق، يرجى المحاولة مرة أخرى');
      },
      'error-callback': (error) => {
        console.error('❌ خطأ reCAPTCHA:', error);
        setError('❌ خطأ في نظام التحقق، يرجى المحاولة مرة أخرى');
      }
    });
    
    // تقديم reCAPTCHA
    await verifier.render();
    window.recaptchaVerifier = verifier;
    setRecaptchaVerifier(verifier);
    
    console.log('✅ reCAPTCHA جديد جاهز');
    
    // إرسال الكود
    console.log('📤 إرسال الكود إلى:', phoneNumber);
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    
    setConfirmationResult(confirmation);
    setSuccess(`✅ تم إرسال كود التحقق إلى ${phoneNumber}`);
    setTimer(120);
    
    console.log('🎉 تم إرسال الكود بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إرسال الكود:', error);
    
    let errorMessage = 'فشل في إرسال الكود';
    
    switch (error.code) {
      case 'auth/invalid-app-credential':
        errorMessage = 'مشكلة في إعدادات التطبيق. جاري إعادة التحميل...';
        setTimeout(() => window.location.reload(), 3000);
        break;
        
      case 'auth/invalid-phone-number':
        errorMessage = 'رقم الهاتف غير صحيح';
        break;
        
      case 'auth/too-many-requests':
        errorMessage = 'تم تجاوز الحد المسموح. انتظر 15 دقيقة';
        break;
        
      case 'auth/captcha-check-failed':
        errorMessage = 'فشل التحقق الأمني. أعد المحاولة';
        break;
        
      default:
        errorMessage = error.message || 'حدث خطأ غير متوقع';
        break;
    }
    
    setError(errorMessage);
    
  } finally {
    setLoading(false);
  }
};
  
  // التحقق من الكود
  const handleVerifyCode = async () => {
    // التحقق من صحة الكود
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
    
    try {
      console.log('🔐 التحقق من كود SMS...');
      
      const result = await confirmationResult.confirm(verificationCode.trim());
      const user = result.user;
      
      console.log('✅ تم التحقق من كود SMS بنجاح:', user.uid);
      
      // حفظ بيانات المصادقة محلياً
      localStorage.setItem('verifiedUid', user.uid);
      localStorage.setItem('verifiedPhone', user.phoneNumber);
      localStorage.setItem('lastLogin', new Date().toISOString());
      
      // تحديث معلومات المستخدم
      if (!user.displayName) {
        await updateProfile(user, {
          displayName: `مستخدم ${user.phoneNumber.replace('+964', '0')}`
        });
      }
      
      // حفظ بيانات المستخدم في قاعدة البيانات
      try {
        await userService.createOrUpdateUser(user.uid, {
          phoneNumber: user.phoneNumber,
          displayName: user.displayName || `مستخدم ${user.phoneNumber.replace('+964', '0')}`,
          lastLogin: new Date(),
          createdAt: new Date(),
          isActive: true,
          authMethod: 'phone'
        });
        
        console.log('✅ تم حفظ بيانات المستخدم في قاعدة البيانات');
        
      } catch (dbError) {
        console.warn('⚠️ تحذير: مشكلة في حفظ البيانات:', dbError);
        // لا نوقف العملية - المصادقة تمت بنجاح
      }
      
      setSuccess('🎉 تم تسجيل الدخول بنجاح! جاري التوجه للتطبيق...');
      
      // تنظيف reCAPTCHA
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      
      // توجيه المستخدم بعد تأخير قصير
      setTimeout(() => {
        navigate('/family');
      }, 2000);
      
    } catch (error) {
      console.error('❌ خطأ في التحقق من كود SMS:', error);
      
      let errorMessage = '❌ كود التحقق غير صحيح';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = '❌ كود التحقق غير صحيح. تأكد من إدخال الكود الصحيح';
          break;
        case 'auth/code-expired':
          errorMessage = '❌ انتهت صلاحية كود التحقق. يرجى طلب كود جديد';
          // إعادة تعيين الحالة لطلب كود جديد
          setConfirmationResult(null);
          setTimer(0);
          break;
        case 'auth/session-expired':
          errorMessage = '❌ انتهت جلسة التحقق. يرجى البدء من جديد';
          setConfirmationResult(null);
          setTimer(0);
          break;
        case 'auth/missing-verification-code':
          errorMessage = '❌ لم يتم إدخال كود التحقق';
          break;
        default:
          errorMessage = `❌ خطأ في التحقق: ${error.message}`;
      }
      
      setError(errorMessage);
      
      // مسح الكود المُدخل في حالة الخطأ
      if (error.code === 'auth/invalid-verification-code') {
        setVerificationCode('');
      }
      
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

        {/* حاوية reCAPTCHA */}
        <Box 
          id="recaptcha-container" 
          sx={{ display: 'none' }}
        />
      </Paper>
    </Container>
  );
};

export default PhoneLogin;