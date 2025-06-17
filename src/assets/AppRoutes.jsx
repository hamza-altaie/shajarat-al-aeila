import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';

// استيراد الصفحات من مجلد pages - مسارات صحيحة
import PhoneLogin from './pages/PhoneLogin.jsx';
import Family from './pages/Family.jsx';
import FamilyTree from './pages/FamilyTree.jsx';
import FamilySelection from './pages/FamilySelection.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* الصفحة الرئيسية - توجيه إلى تسجيل الدخول */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* صفحة تسجيل الدخول */}
      <Route 
        path="/login" 
        element={
          <ProtectedRoute requireAuth={false}>
            <PhoneLogin />
          </ProtectedRoute>
        } 
      />
      
      {/* صفحة اختيار العائلة */}
      <Route 
        path="/family-selection" 
        element={
          <ProtectedRoute>
            <FamilySelection />
          </ProtectedRoute>
        } 
      />
      
      {/* صفحة إدارة العائلة */}
      <Route 
        path="/family" 
        element={
          <ProtectedRoute>
            <Family />
          </ProtectedRoute>
        } 
      />
      
      {/* صفحة شجرة العائلة */}
      <Route 
        path="/tree" 
        element={
          <ProtectedRoute>
            <FamilyTree />
          </ProtectedRoute>
        } 
      />
      
      {/* صفحة سياسة الخصوصية */}
      <Route 
        path="/privacy" 
        element={
          <ProtectedRoute requireAuth={false}>
            <PrivacyPolicy />
          </ProtectedRoute>
        } 
      />
      
      {/* صفحة 404 - غير موجود */}
      <Route 
        path="/404" 
        element={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            fontFamily: '"Cairo", sans-serif',
            backgroundColor: '#f8f9fa',
            color: '#495057',
            direction: 'rtl'
          }}>
            <div style={{
              fontSize: '6rem',
              fontWeight: 'bold',
              color: '#dc3545',
              marginBottom: '1rem'
            }}>
              404
            </div>
            <h1 style={{
              fontSize: '2rem',
              marginBottom: '1rem',
              color: '#343a40'
            }}>
              الصفحة غير موجودة
            </h1>
            <p style={{
              fontSize: '1.1rem',
              marginBottom: '2rem',
              maxWidth: '400px',
              lineHeight: '1.6'
            }}>
              عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر.
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#2e7d32',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'background-color 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1b5e20'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#2e7d32'}
            >
              🏠 العودة للصفحة الرئيسية
            </a>
          </div>
        } 
      />
      
      {/* إعادة توجيه أي مسار غير معروف إلى 404 */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}