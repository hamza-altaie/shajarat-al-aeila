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
  useEffect(() => {
  if (!firebaseStatus?.services?.auth) return;
  
  const setupRecaptcha = async () => {
    try {
      console.log('🔧 بدء إعداد reCAPTCHA...');
      
      // تنظيف كامل
      if (window.recaptchaVerifier) {
        try {
          await window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('تنظيف reCAPTCHA القديم...');
        }
        window.recaptchaVerifier = null;
      }
      
      // تنظيف العناصر الإضافية
      const container = document.getElementById('recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }
      
      // إعداد جديد ومبسط
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('✅ reCAPTCHA جاهز');
        },
        'expired-callback': () => {
          console.warn('⚠️ انتهت صلاحية reCAPTCHA');
        },
        'error-callback': (error) => {
          console.error('❌ خطأ reCAPTCHA:', error);
        }
      });
      
      // تقديم مع معالجة الأخطاء
      try {
        await verifier.render();
        console.log('✅ تم تقديم reCAPTCHA بنجاح');
      } catch (renderError) {
        console.error('❌ خطأ في تقديم reCAPTCHA:', renderError);
        // لا نرمي خطأ هنا - سنحاول إنشاء واحد جديد عند الإرسال
      }
      
      setRecaptchaVerifier(verifier);
      window.recaptchaVerifier = verifier;
      
    } catch (error) {
      console.error('❌ خطأ في إعداد reCAPTCHA:', error);
      // لا نعرض خطأ للمستخدم - سنحاول إنشاء reCAPTCHA عند الحاجة
    }
  };
  
  // تأخير 3 ثوان للتأكد من تحميل كل شيء
  const timer = setTimeout(setupRecaptcha, 3000);
  
  return () => {
    clearTimeout(timer);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      } catch (e) {
        console.log('تنظيف عند الخروج...');
      }
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
    // إعداد أو التأكد من reCAPTCHA
    let verifier = window.recaptchaVerifier;

    if (!verifier) {
      setError("❌ حدثت مشكلة في التحقق الأمني، يرجى إعادة تحميل الصفحة");
      setLoading(false);
      return;
    }
    
    // محاولة إرسال الكود
    console.log('📤 إرسال الكود إلى:', phoneNumber);
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    
    // نجح الإرسال
    setConfirmationResult(confirmation);
    setSuccess(`✅ تم إرسال كود التحقق إلى ${phoneNumber}`);
    setTimer(120);
    
    console.log('🎉 تم إرسال الكود بنجاح!');
    
  } catch (error) {
  console.error('❌ خطأ في إرسال الكود:', error);
  
  let errorMessage = 'فشل في إرسال الكود';
  let showResetButton = false;
  
  switch (error.code) {
    case 'auth/invalid-app-credential':
      errorMessage = `❌ خطأ في إعدادات Firebase:
      
• تحقق من أن localhost مُضاف في Authorized domains
• تأكد من تفعيل Phone Authentication في Firebase Console
• راجع إعدادات App Check إذا كان مفعل
      
اتبع الخطوات في الدليل أدناه لحل المشكلة.`;
      showResetButton = true;
      break;
      
    case 'auth/argument-error':
      errorMessage = 'خطأ في إعدادات reCAPTCHA. سيتم إعادة المحاولة...';
      // إعادة تعيين reCAPTCHA بدلاً من إعادة تحميل الصفحة
      setConfirmationResult(null);
      setTimer(0);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      break;
      
    case 'auth/app-not-authorized':
      errorMessage = `❌ التطبيق غير مُخول:
      
أضف المجال الحالي (${window.location.hostname}) في Firebase Console:
Authentication → Settings → Authorized domains`;
      showResetButton = true;
      break;
      
    case 'auth/operation-not-allowed':
      errorMessage = `❌ Phone Authentication غير مفعل:
      
فعل Phone Authentication في Firebase Console:
Authentication → Sign-in method → Phone`;
      break;
      
    case 'auth/invalid-phone-number':
      errorMessage = 'رقم الهاتف غير صحيح. استخدم تنسيق: +9647xxxxxxxx';
      break;
      
    case 'auth/too-many-requests':
      errorMessage = 'تم تجاوز الحد المسموح. انتظر 15 دقيقة أو جرب من جهاز آخر';
      break;
      
    case 'auth/captcha-check-failed':
      errorMessage = 'فشل التحقق الأمني. أعد المحاولة أو حدث الصفحة';
      break;
      
    case 'auth/quota-exceeded':
      errorMessage = 'تم تجاوز حصة الرسائل اليومية. جرب غداً أو تواصل مع الدعم';
      break;
      
    default:
      if (error.message.includes('site key') || error.message.includes('Invalid site key')) {
        errorMessage = `❌ مشكلة في إعدادات reCAPTCHA:
        
راجع إعدادات App Check في Firebase Console أو عطل App Check مؤقتاً للاختبار`;
        showResetButton = true;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'مشكلة في الاتصال بالإنترنت. تحقق من اتصالك وأعد المحاولة';
      } else {
        errorMessage = `خطأ غير متوقع: ${error.message}`;
      }
      break;
  }
  
  setError(errorMessage);
  
  // إظهار أدوات تشخيص إضافية في بيئة التطوير
  if (import.meta.env.DEV) {
    console.log('🔍 معلومات تشخيصية:');
    console.log('- Firebase Project ID:', firebaseStatus?.config?.projectId);
    console.log('- Current domain:', window.location.hostname);
    console.log('- Auth domain:', firebaseStatus?.config?.authDomain);
    console.log('- Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    // اختبار Firebase status
    if (window.firebaseDebug) {
      window.firebaseDebug.test().then(result => {
        console.log('🧪 Firebase connection test:', result);
      });
    }
  }
  
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
          phone: user.phoneNumber, // تعديل الحقل ليطابق القاعدة
          displayName: user.displayName || `مستخدم ${user.phoneNumber.replace('+964', '0')}`,
          isActive: true,
          authMethod: 'phone'
        });
        
        console.log('✅ تم حفظ بيانات المستخدم في قاعدة البيانات');
        
        // تأكيد حفظ المستخدم قبل التوجيه
        let retries = 0;
        let userDoc = null;
        while (retries < 5 && !userDoc) {
          try {
            userDoc = await userService.fetchUserData(user.uid);
          } catch (e) {
            await new Promise(res => setTimeout(res, 500));
            retries++;
          }
        }
        if (!userDoc) {
          setError('⚠️ حدثت مشكلة في حفظ بيانات المستخدم. يرجى إعادة المحاولة لاحقاً.');
          setConfirmationLoading(false);
          return;
        }
        
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
        />
      </Paper>
    </Container>
  );
};

export default PhoneLogin;