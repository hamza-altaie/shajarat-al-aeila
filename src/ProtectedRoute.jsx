import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const phoneVerified = !!localStorage.getItem('verifiedPhone');
  if (!phoneVerified) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
