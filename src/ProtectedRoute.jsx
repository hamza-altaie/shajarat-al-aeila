<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
=======
import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext.jsx';
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
import { CircularProgress, Box, Typography, Alert, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

export default function ProtectedRoute({ children, requireAuth = true }) {
<<<<<<< HEAD
  const [authStatus, setAuthStatus] = useState('checking');
=======
  const { user, loading } = useContext(AuthContext);
  const [verificationStatus, setVerificationStatus] = useState('checking');
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
<<<<<<< HEAD
    const checkAuth = async () => {
      try {
        setError(null);
        setAuthStatus('checking');

        // إذا لم تكن المصادقة مطلوبة، اسمح بالوصول
        if (!requireAuth) {
          setAuthStatus('allowed');
          return;
        }

        // فحص البيانات المحلية
        const phoneVerified = localStorage.getItem('verifiedPhone');
        const uidVerified = localStorage.getItem('verifiedUid');

        if (!phoneVerified || !uidVerified) {
          setAuthStatus('unauthorized');
          return;
        }

        // التحقق من صحة البيانات
        if (phoneVerified.length > 5 && uidVerified.length > 10) {
          setAuthStatus('authorized');
        } else {
          // بيانات غير صحيحة - تنظيف
          localStorage.removeItem('verifiedPhone');
          localStorage.removeItem('verifiedUid');
          setAuthStatus('unauthorized');
        }

      } catch (err) {
        console.error('خطأ في التحقق من المصادقة:', err);
        setError('حدث خطأ في التحقق من صلاحية الوصول');
        setAuthStatus('error');
      }
    };

    // تأخير بسيط لتجنب الومضة
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [requireAuth]);

  // مؤشر التحميل
  if (authStatus === 'checking') {
=======
    const verifyUser = async () => {
      try {
        setError(null);
        setVerificationStatus('checking');

        // التحقق من البيانات المحلية
        const phoneVerified = localStorage.getItem('verifiedPhone');
        const uidVerified = localStorage.getItem('verifiedUid');

        if (!requireAuth) {
          setVerificationStatus('allowed');
          return;
        }

        // التحقق من وجود بيانات المصادقة
        if (!phoneVerified || !uidVerified) {
          setVerificationStatus('unauthorized');
          return;
        }

        // التحقق من تطابق البيانات مع Firebase
        if (user) {
          if (user.uid === uidVerified && user.phoneNumber === phoneVerified) {
            setVerificationStatus('authorized');
          } else {
            // عدم تطابق - تنظيف البيانات المحلية
            localStorage.removeItem('verifiedPhone');
            localStorage.removeItem('verifiedUid');
            setVerificationStatus('unauthorized');
          }
        } else if (!loading) {
          // لا يوجد مستخدم في Firebase ولكن يوجد بيانات محلية
          localStorage.removeItem('verifiedPhone');
          localStorage.removeItem('verifiedUid');
          setVerificationStatus('unauthorized');
        }
      } catch (err) {
        console.error('خطأ في التحقق من المصادقة:', err);
        setError('حدث خطأ في التحقق من صلاحية الوصول');
        setVerificationStatus('error');
      }
    };

    if (!loading) {
      verifyUser();
    }
  }, [user, loading, requireAuth]);

  // مؤشر التحميل
  if (loading || verificationStatus === 'checking') {
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="#f8f9fa"
        p={3}
      >
        {/* شعار التطبيق */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            boxShadow: '0 8px 24px rgba(76, 175, 80, 0.3)',
            animation: 'pulse 2s infinite'
          }}
        >
          <Typography variant="h4" sx={{ color: 'white' }}>
            🌳
          </Typography>
        </Box>

        <CircularProgress 
          size={50} 
          sx={{ 
            color: '#2e7d32',
            mb: 2
          }} 
        />
        
        <Typography 
          variant="h6" 
          color="text.secondary" 
          gutterBottom
          textAlign="center"
        >
          جاري التحقق من الحساب...
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          textAlign="center"
          sx={{ maxWidth: 300 }}
        >
<<<<<<< HEAD
          يرجى الانتظار بينما نتأكد من صلاحية وصولك
=======
          يرجى الانتظار بينما نتأكد من صلاحية وصولك للتطبيق
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
        </Typography>

        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          `}
        </style>
      </Box>
    );
  }

<<<<<<< HEAD
  // رسالة الخطأ
  if (authStatus === 'error') {
=======
  // رسالة الخطأ مع إمكانية إعادة المحاولة
  if (verificationStatus === 'error') {
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="#f8f9fa"
        p={3}
      >
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            maxWidth: 500,
            width: '100%'
          }}
        >
          <Typography variant="h6" gutterBottom>
            خطأ في التحقق من الصلاحيات
          </Typography>
          <Typography variant="body2">
            {error || 'حدث خطأ غير متوقع أثناء التحقق من بيانات المصادقة'}
          </Typography>
        </Alert>
        
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
          sx={{ mb: 2 }}
        >
          إعادة المحاولة
        </Button>
        
        <Button
          variant="text"
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          color="error"
        >
          تسجيل دخول جديد
        </Button>
      </Box>
    );
  }

  // غير مصرح له بالوصول
<<<<<<< HEAD
  if (authStatus === 'unauthorized') {
=======
  if (verificationStatus === 'unauthorized') {
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // مصرح له بالوصول أو لا يتطلب مصادقة
<<<<<<< HEAD
  if (authStatus === 'authorized' || authStatus === 'allowed') {
    return children;
  }

  // حالة افتراضية
=======
  if (verificationStatus === 'authorized' || verificationStatus === 'allowed') {
    return children;
  }

  // حالة افتراضية - إعادة توجيه لتسجيل الدخول
>>>>>>> 28e487ce19d61bfd638839fa61f185c8bbc97f13
  return <Navigate to="/login" replace />;
}