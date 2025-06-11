import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext.jsx';
import { CircularProgress, Box } from '@mui/material';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const phoneVerified = !!localStorage.getItem('verifiedPhone');

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <p style={{ marginTop: 12, color: '#555' }}>جاري التحقق من الحساب...</p>
      </Box>
    );
  }
  if (!user || !phoneVerified) return <Navigate to="/login" replace />;
  return children;
}
