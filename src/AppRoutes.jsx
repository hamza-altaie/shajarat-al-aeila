import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import FamilyTree from './pages/FamilyTree.jsx';
import PhoneLogin from './pages/PhoneLogin.jsx';
import ProtectedRoute from './ProtectedRoute';
import Family from './pages/Family';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SelectFather from './pages/SelectFather';


export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/tree" element={
        <ProtectedRoute>
          <FamilyTree />
        </ProtectedRoute>
      } />
      <Route path="/family" element={
        <ProtectedRoute>
          <Family />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<PhoneLogin />} />
      <Route path="/select-father" element={<SelectFather />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
    </Routes>
  );
}
