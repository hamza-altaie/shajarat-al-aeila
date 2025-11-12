// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  fetchNonce,
  me as getMe,
  logout as wpLogout,
  requestOtp,
  verifyOtp,
} from './userService';

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

  // تهيئة الجلسة
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        await fetchNonce();
        const u = await getMe(); // 401 إن ماكو جلسة
        if (!mounted) return;
        if (u) {
          setUser(u);
          setUserData(u);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setUserData(null);
          setIsAuthenticated(false);
        }
      } catch {
        if (mounted) {
          setUser(null);
          setUserData(null);
          setIsAuthenticated(false);
        }
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // طلب إرسال رمز OTP
  const loginPhoneRequest = useCallback(async (phone) => {
    try {
      setError(null);
      await requestOtp(phone);
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
      const u = await verifyOtp(phone, code);
      setUser(u);
      setUserData(u);
      setIsAuthenticated(true);
      return { success: true, user: u };
    } catch (err) {
      setError(err.message || 'رمز غير صحيح أو منتهي الصلاحية');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // تحديث محلي لبيانات المستخدم (بدون API)
  const updateUserData = useCallback(async (newData) => {
    try {
      const merged = { ...(userData || {}), ...(newData || {}), updatedAt: new Date().toISOString() };
      setUserData(merged);
      setUser(merged);
      return true;
    } catch {
      setError('فشل في تحديث البيانات');
      return false;
    }
  }, [userData]);

  // تحديث من الخادم
  const refreshUserData = useCallback(async () => {
    try {
      setError(null);
      const u = await getMe();
      setUser(u || null);
      setUserData(u || null);
      setIsAuthenticated(!!u);
    } catch (err) {
      setUser(null);
      setUserData(null);
      setIsAuthenticated(false);
      setError(err.message || 'فشل في جلب بيانات المستخدم');
    }
  }, []);

  // تسجيل خروج
  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await wpLogout();
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

  // صلاحيات بسيطة مبدئيًا
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
    refreshUserData,
    updateUserData,
    clearError,
    hasPermission,

    // أسماء بديلة
    isLoading: loading,
    isLoggedIn: isAuthenticated,
    userPhone: userData?.phone,
    userId: userData?.id || userData?.uid,
    isFamilyHead: true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
