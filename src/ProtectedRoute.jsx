// src/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function ProtectedRoute({ children, requireAuth = true }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // صفحات لا تتطلب مصادقة
  if (!requireAuth) {
    return children;
  }

  // شاشة انتظار أثناء التحقق من الجلسة
  if (loading) {
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
            animation: 'pulse 2s infinite',
          }}
        >
          <Typography variant="h4" sx={{ color: 'white' }}>
            🌳
          </Typography>
        </Box>

        <CircularProgress size={50} sx={{ color: '#2e7d32', mb: 2 }} />

        <Typography variant="h6" color="text.secondary" gutterBottom textAlign="center">
          جاري التحقق من الحساب...
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 300 }}
        >
          يرجى الانتظار بينما نتأكد من صلاحية وصولك للتطبيق
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

  // غير مصرح له → تحويل إلى /login مع تذكر الوجهة
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // مصرح له
  return children;
}
