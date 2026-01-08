// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// 🔥 استيراد Firebase
import {
  sendOtp as firebaseSendOtp,
  verifyOtp as firebaseVerifyOtp,
  logout as firebaseLogout,
  onAuthChange
} from './firebase/auth';

// عرّف الـ Context محليًا وصدّر useAuth
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // الحالة
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // الواجهة
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // تهيئة الجلسة والاستماع لتغييرات المصادقة
  useEffect(() => {
    setLoading(true);
    
    // الاستماع المستمر لتغييرات حالة المصادقة
    const unsubscribe = onAuthChange((u) => {
      if (u) {
        console.log("🔥 مستخدم Firebase:", u);
        setUser(u);
        setUserData(u);
        setIsAuthenticated(true);
      } else {
        console.log("🔓 لا يوجد مستخدم مسجل");
        setUser(null);
        setUserData(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    // تنظيف عند إلغاء المكون
    return () => unsubscribe();
  }, []);

  // طلب إرسال رمز OTP
  const loginPhoneRequest = useCallback(async (phone) => {
    try {
      setError(null);
      await firebaseSendOtp(phone);
      return { success: true };
    } catch (err) {
      setError(err.message || 'تعذر إرسال الرمز');
      return { success: false, error: err.message };
    }
  }, []);

  // تأكيد الرمز وتسجيل الدخول
  const loginPhoneVerify = useCallback(async (phone, code) => {
    try {
      setError(null);
      setLoading(true);
      const result = await firebaseVerifyOtp(code);
      if (result && result.user) {
        setUser(result.user);
        setUserData(result.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        throw new Error('فشل التحقق من الرمز');
      }
    } catch (err) {
      setError(err.message || 'فشل التحقق من الرمز');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // تسجيل خروج
  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await firebaseLogout();
      setUser(null);
      setUserData(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (err) {
      setError('فشل في تسجيل الخروج');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const hasPermission = useCallback(() => !!isAuthenticated, [isAuthenticated]);

  const value = {
    user,
    userData,
    isAuthenticated,
    loading,
    error,
    loginPhoneRequest,
    loginPhoneVerify,
    logout,
    clearError,
    hasPermission,
    isLoading: loading,
    isLoggedIn: isAuthenticated,
    userPhone: userData?.phone,
    userId: userData?.id || userData?.uid,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};