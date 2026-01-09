import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAuth } from './AuthContext.jsx';

// الصفحات
import PhoneLogin from './pages/PhoneLogin.jsx';
import Family from './pages/Family.jsx';
import FamilyTree from './pages/FamilyTree.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Statistics from './pages/Statistics.jsx';
import AddPerson from './pages/AddPerson.jsx';
import PendingMatches from './pages/PendingMatches.jsx';
import AdminPanel from './pages/AdminPanel.jsx';


export default function AppRoutes() {
  const { isAuthenticated } = useAuth?.() || { isAuthenticated: false };

  // يقرر الوجهة عند الدخول للجذر /
  const IndexRoute = () =>
    isAuthenticated ? <Navigate to="/family" replace /> : <Navigate to="/login" replace />;

  // صفحة اللوجن: لو المستخدم مسجّل، وديه لإدارة العائلة
  const LoginRoute = () => {
    // تجنب إعادة التوجيه المتكررة
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

      <Route
        path="/add-person"
        element={
          <ProtectedRoute>
            <AddPerson />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pending-matches"
        element={
          <ProtectedRoute>
            <PendingMatches />
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

      {/* صفحات عامة */}
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* 404 */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
