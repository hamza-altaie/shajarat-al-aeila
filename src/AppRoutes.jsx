import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from './AuthContext.jsx';

// ======================================
// 🚀 Lazy Loading للصفحات الكبيرة
// ======================================
// هذا يقلل حجم التحميل الأولي ويحسن الأداء

// صفحة تسجيل الدخول - تحميل فوري (أول صفحة يراها المستخدم)
import PhoneLogin from './pages/PhoneLogin.jsx';

// الصفحات الكبيرة - تحميل عند الحاجة
const Family = lazy(() => import('./pages/Family.jsx'));
const FamilyTree = lazy(() => import('./pages/FamilyTree.jsx'));
const Statistics = lazy(() => import('./pages/Statistics.jsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

// ======================================
// مكون التحميل
// ======================================
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      gap: 2,
      backgroundColor: '#f5f5f5',
    }}
  >
    <CircularProgress size={50} sx={{ color: '#2e7d32' }} />
    <Typography
      variant="h6"
      sx={{
        fontFamily: 'Cairo, sans-serif',
        color: '#666',
      }}
    >
      جاري التحميل...
    </Typography>
  </Box>
);

export default function AppRoutes() {
  const { isAuthenticated, loading } = useAuth?.() || { isAuthenticated: false, loading: true };

  // يقرر الوجهة عند الدخول للجذر /
  const IndexRoute = () => {
    // انتظار انتهاء التحميل قبل التوجيه
    if (loading) {
      return <LoadingFallback />;
    }
    return isAuthenticated ? <Navigate to="/family" replace /> : <Navigate to="/login" replace />;
  };

  // صفحة اللوجن: لو المستخدم مسجّل، وديه لإدارة العائلة
  const LoginRoute = () => {
    // ✅ انتظار انتهاء التحميل قبل عرض صفحة اللوجن
    if (loading) {
      return <LoadingFallback />;
    }
    if (isAuthenticated) {
      return <Navigate to="/family" replace />;
    }
    return <PhoneLogin />;
  };

  const NotFound = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        fontFamily: '"Cairo", sans-serif',
        backgroundColor: '#f8f9fa',
        color: '#495057',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          fontSize: '6rem',
          fontWeight: 'bold',
          color: '#dc3545',
          marginBottom: '1rem',
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          color: '#343a40',
        }}
      >
        الصفحة غير موجودة
      </h1>
      <p
        style={{
          fontSize: '1.1rem',
          marginBottom: '2rem',
          maxWidth: '400px',
          lineHeight: '1.6',
        }}
      >
        عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر.
      </p>

      {/* Link بدل href حتى يحترم basename (/app/) */}
      <Link
        to="/login"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#2e7d32',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          transition: 'background-color 0.3s ease',
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = '#1b5e20')}
        onMouseOut={(e) => (e.target.style.backgroundColor = '#2e7d32')}
      >
        🏠 العودة للصفحة الرئيسية
      </Link>
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* الجذر */}
        <Route path="/" element={<IndexRoute />} />

        {/* تسجيل الدخول برقم الهاتف (عام، مع تحويل المُسجَّل) */}
        <Route path="/login" element={<LoginRoute />} />

        {/* صفحات محمية */}
        <Route
          path="/family"
          element={
            <ProtectedRoute>
              <Family />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tree"
          element={
            <ProtectedRoute>
              <FamilyTree />
            </ProtectedRoute>
          }
        />

        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          }
        />

        {/* صفحة المدير - محمية */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* صفحة الإعدادات - محمية */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* صفحات عامة */}
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* 404 */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
