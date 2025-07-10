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
  const [timer, setTimer] = useState(0);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // فحص حالة Firebase عند التحميل
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = getFirebaseStatus();
        setFirebaseStatus(status);
        if (!status.isInitialized) {
          setError('❌ خطأ في تهيئة Firebase. يرجى التحقق من الإعدادات.');
        } else {
          setError('');
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && localStorage.getItem('verifiedUid') && localStorage.getItem('verifiedPhone')) {
        navigate('/family');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!firebaseStatus?.services?.auth) return;
    const setupRecaptcha = async () => {
      try {
        if (window.recaptchaVerifier) {
          try {
            await window.recaptchaVerifier.clear();
          } catch {
            console.warn('تنظيف reCAPTCHA السابق...');
          }
          window.recaptchaVerifier = null;
        }
        const container = document.getElementById('recaptcha-container');
        if (container) container.innerHTML = '';
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            console.warn('⚠️ انتهت صلاحية reCAPTCHA');
            setError('انتهت صلاحية التحقق الأمني، يرجى المحاولة مرة أخرى');
          },
          'error-callback': (err) => {
            console.error('❌ خطأ reCAPTCHA:', err);
            setError('خطأ في نظام التحقق الأمني');
          }
        });
        await verifier.render();
        window.recaptchaVerifier = verifier;
      } catch (err) {
        console.error('❌ فشل إعداد reCAPTCHA:', err);
        setError('فشل في إعداد نظام التحقق الأمني');
      }
    };
    setupRecaptcha();
  }, [firebaseStatus]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // التحقق من الرقم العراقي
  const isValidIraqiNumber = (phoneInput) => {
    if (!phoneInput || typeof phoneInput !== 'string') return false;
    const cleanInput = phoneInput.replace(/\s|\(|\)/g, '');
    const validPatterns = [
      /^07[0-9]{8}$/,
      /^7[0-9]{8}$/,
      /^7[0-9]{9}$/
    ];
    return validPatterns.some(pattern => pattern.test(cleanInput));
  };

  // تغيير رقم الهاتف
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    setPhoneInput(value);
    let formattedPhone = '';
    if (value.length > 0) {
      if (value.startsWith('07') && value.length === 10) {
        formattedPhone = '+964' + value.substring(1);
      } else if (value.startsWith('7') && (value.length === 9 || value.length === 10)) {
        formattedPhone = '+964' + value;
      }
    }
    setPhoneNumber(formattedPhone);
  };

  // إرسال كود التحقق
  const handleSendCode = async () => {
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
      let verifier = window.recaptchaVerifier;
      if (!verifier) {
        setError('❌ حدثت مشكلة في التحقق الأمني، يرجى إعادة تحميل الصفحة');
        setLoading(false);
        return;
      }
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(confirmation);
      setSuccess(`✅ تم إرسال كود التحقق إلى ${phoneNumber}`);
      setTimer(120);
    } catch (error) {
      let errorMessage = 'فشل في إرسال الكود';
      switch (error.code) {
        case 'auth/invalid-app-credential':
          errorMessage = '❌ خطأ في إعدادات Firebase: تحقق من أن localhost مُضاف في Authorized domains وتفعيل Phone Authentication.';
          break;
        case 'auth/argument-error':
          errorMessage = 'خطأ في إعدادات reCAPTCHA. سيتم إعادة المحاولة...';
          setConfirmationResult(null);
          setTimer(0);
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
          break;
        case 'auth/app-not-authorized':
          errorMessage = '❌ التطبيق غير مُخول: أضف المجال الحالي في Firebase Console.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = '❌ Phone Authentication غير مفعل: فعل Phone Authentication في Firebase Console.';
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
            errorMessage = '❌ مشكلة في إعدادات reCAPTCHA: راجع إعدادات App Check في Firebase Console.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'مشكلة في الاتصال بالإنترنت. تحقق من اتصالك وأعد المحاولة';
          } else {
            errorMessage = `خطأ غير متوقع: ${error.message}`;
          }
          break;
      }
      setError(errorMessage);
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
    try {
      const result = await confirmationResult.confirm(verificationCode.trim());
      const user = result.user;
      localStorage.setItem('verifiedUid', user.uid);
      localStorage.setItem('verifiedPhone', user.phoneNumber);
      localStorage.setItem('lastLogin', new Date().toISOString());
      if (!user.displayName) {
        await updateProfile(user, {
          displayName: `مستخدم ${user.phoneNumber.replace('+964', '0')}`
        });
      }
      try {
        await userService.createOrUpdateUser(user.uid, {
          phone: user.phoneNumber,
          displayName: user.displayName || `مستخدم ${user.phoneNumber.replace('+964', '0')}`,
          isActive: true,
          authMethod: 'phone'
        });
        let retries = 0;
        let userDoc = null;
        while (retries < 5 && !userDoc) {
          try {
            userDoc = await userService.fetchUserData(user.uid);
          } catch {
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
      }
      setSuccess('🎉 تم تسجيل الدخول بنجاح! جاري التوجه للتطبيق...');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      setTimeout(() => {
        navigate('/family');
      }, 2000);
    } catch (error) {
      let errorMessage = '❌ كود التحقق غير صحيح';
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = '❌ كود التحقق غير صحيح. تأكد من إدخال الكود الصحيح';
          break;
        case 'auth/code-expired':
          errorMessage = '❌ انتهت صلاحية كود التحقق. يرجى طلب كود جديد';
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
        <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
          <div id="recaptcha-container"></div>
        </Box>
      </Paper>
    </Container>
  );
};

export default PhoneLogin;