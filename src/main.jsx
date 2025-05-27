import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import FamilyTree from './pages/FamilyTree.jsx'; 
import PhoneLogin from './pages/PhoneLogin.jsx';
import ProtectedRoute from './ProtectedRoute';
import Family from './pages/Family';
import PrivacyPolicy from './pages/PrivacyPolicy';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
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
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
