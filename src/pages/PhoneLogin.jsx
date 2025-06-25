// src/pages/PhoneLogin.jsx - صفحة تسجيل الدخول المُحدثة
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, 
  Alert, Snackbar, CircularProgress, Divider, Stack
} from '@mui/material';
import { Phone, Send, Verified, Warning as WarningIcon } from '@mui/icons-material';

// استيراد Firebase مع معالجة الأخطاء
import { auth, getFirebaseStatus, testFirestoreConnection } from '../firebase/config';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  updateProfile,
  onAuthStateChanged 
} from 'firebase/auth';

// استيراد الخدمات
import userService from '../userService';

export default function PhoneLogin() {
  // ===========================================================================
  // الحالات الأساسية
  // ===========================================================================
  
  const navigate = useNavigate();
  
  // حالات النموذج
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [step, setStep] = useState('phone'); // 'phone' | 'verification'
  
  // حالات التحميل والأخطاء
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // حالات Firebase
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  
  // ===========================================================================
  // التأثيرات والتهيئة
  // ===========================================================================
  
  // فحص حالة Firebase عند التحميل
  useEffect(() => {
    const checkFirebaseStatus = async () => {
      try {
        const status = getFirebaseStatus();
        setFirebaseStatus(status);
        
        // اختبار الاتصال بـ Firestore
        if (status.services.firestore) {
          await testFirestoreConnection();
        }
        
        console.log('✅ Firebase جاهز للاستخدام');
      } catch (error) {
        console.error('❌ خطأ في فحص Firebase:', error);
        setError('خطأ في الاتصال بالخدمة. يرجى إعادة تحميل الصفحة.');
      }
    };
    
    checkFirebaseStatus();
  }, []);
  
  // مراقبة حالة المصادقة
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('✅ المستخدم مسجل دخول، توجيه إلى الصفحة الرئيسية');
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
          size: 'normal',
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
  
  // ===========================================================================
  // وظائف المساعدة
  // ===========================================================================
  
  // تنسيق رقم الهاتف
  const formatPhoneNumber = (phone) => {
    // إزالة جميع الأحرف غير الرقمية
    const cleaned = phone.replace(/\D/g, '');
    
    // إضافة رمز الدولة إذا لم يكن موجوداً
    if (cleaned.startsWith('05') || cleaned.startsWith('5')) {
      return '+966' + cleaned.slice(cleaned.startsWith('0') ? 1 : 0);
    }
    
    if (cleaned.startsWith('966')) {
      return '+' + cleaned;
    }
    
    if (cleaned.startsWith('+966')) {
      return cleaned;
    }
    
    // افتراض رقم سعودي
    return '+966' + cleaned;
  };
  
  // التحقق من صحة رقم الهاتف
  const validatePhoneNumber = (phone) => {
    const formatted = formatPhoneNumber(phone);
    const phoneRegex = /^\+966[5][0-9]{8}$/;
    return phoneRegex.test(formatted);
  };
  
  // ===========================================================================
  // معالجات الأحداث
  // ===========================================================================
  
  // إرسال رمز التحقق
  const handleSendCode = useCallback(async () => {
    if (!phoneNumber.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('يرجى إدخال رقم هاتف سعودي صحيح (مثال: 0501234567)');
      return;
    }
    
    if (!recaptchaVerifier) {
      setError('جاري تحضير التحقق الأمني، يرجى الانتظار...');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('📱 إرسال رمز التحقق إلى:', formattedPhone);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      
      setConfirmationResult(confirmation);
      setStep('verification');
      setSuccess(`تم إرسال رمز التحقق إلى ${formattedPhone}`);
      
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
  }, [phoneNumber, recaptchaVerifier]);
  
  // التحقق من الرمز
  const handleVerifyCode = useCallback(async () => {
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
    
    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 التحقق من الرمز...');
      
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
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
          setStep('phone');
          setConfirmationResult(null);
          break;
        case 'auth/session-expired':
          errorMessage = 'انتهت جلسة التحقق. يرجى المحاولة مرة أخرى';
          setStep('phone');
          setConfirmationResult(null);
          break;
        default:
          errorMessage = error.message || 'حدث خطأ في التحقق';
      }
      
      setError(errorMessage);
      
    } finally {
      setLoading(false);
    }
  }, [verificationCode, confirmationResult, navigate]);
  
  // العودة لخطوة إدخال الهاتف
  const handleBackToPhone = () => {
    setStep('phone');
    setVerificationCode('');
    setConfirmationResult(null);
    setError('');
    setSuccess('');
  };
  
  // ===========================================================================
  // معالجات الإدخال
  // ===========================================================================
  
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // السماح بالأرقام والرموز الأساسية فقط
    const cleaned = value.replace(/[^\d+\-\s()]/g, '');
    setPhoneNumber(cleaned);
    
    // مسح الخطأ عند الكتابة
    if (error) setError('');
  };
  
  const handleCodeChange = (e) => {
    const value = e.target.value;
    // السماح بالأرقام فقط
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(cleaned);
    
    // مسح الخطأ عند الكتابة
    if (error) setError('');
  };
  
  // ===========================================================================
  // معالجات لوحة المفاتيح
  // ===========================================================================
  
  const handlePhoneKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSendCode();
    }
  };
  
  const handleCodeKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleVerifyCode();
    }
  };
  
  // ===========================================================================
  // العرض
  // ===========================================================================
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* شعار التطبيق */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
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

          {/* خطوة إدخال رقم الهاتف */}
          {step === 'phone' && (
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Phone sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  تسجيل الدخول برقم الهاتف
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  أدخل رقم هاتفك لتلقي رمز التحقق
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="رقم الهاتف"
                placeholder="0501234567"
                value={phoneNumber}
                onChange={handlePhoneChange}
                onKeyPress={handlePhoneKeyPress}
                disabled={loading}
                dir="ltr"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#4caf50',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4caf50',
                    },
                  },
                }}
                helperText="مثال: 0501234567 أو +966501234567"
              />

              {/* حاوي reCAPTCHA */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <div id="recaptcha-container"></div>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSendCode}
                disabled={loading || !phoneNumber.trim() || !recaptchaVerifier}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#2e7d32' },
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </Button>
            </Stack>
          )}

          {/* خطوة التحقق من الرمز */}
          {step === 'verification' && (
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Verified sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  التحقق من رمز الهاتف
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  أدخل الرمز المُرسل إلى {formatPhoneNumber(phoneNumber)}
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="رمز التحقق"
                placeholder="123456"
                value={verificationCode}
                onChange={handleCodeChange}
                onKeyPress={handleCodeKeyPress}
                disabled={loading}
                inputProps={{ 
                  maxLength: 6,
                  style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#4caf50',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4caf50',
                    },
                  },
                }}
                helperText="الرمز مكون من 6 أرقام"
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Verified />}
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#2e7d32' },
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                {loading ? 'جاري التحقق...' : 'تأكيد الرمز'}
              </Button>

              <Divider />

              <Button
                fullWidth
                variant="outlined"
                onClick={handleBackToPhone}
                disabled={loading}
                sx={{
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': {
                    borderColor: '#2e7d32',
                    color: '#2e7d32',
                    bgcolor: 'rgba(76, 175, 80, 0.04)'
                  }
                }}
              >
                تغيير رقم الهاتف
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* رسائل النجاح والخطأ */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}