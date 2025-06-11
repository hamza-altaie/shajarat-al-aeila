import React, { createContext, useEffect, useState, useCallback } from 'react';
import { auth } from './firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase/config';

// إنشاء Context للمصادقة
export const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  userData: null,
  login: () => {},
  logout: () => {},
  refreshUserData: () => {},
  clearError: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // جلب بيانات المستخدم من Firestore
  const fetchUserData = useCallback(async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        return data;
      } else {
        console.warn('لا توجد بيانات للمستخدم في Firestore');
        return null;
      }
    } catch (err) {
      console.error('خطأ في جلب بيانات المستخدم:', err);
      setError('فشل في جلب بيانات المستخدم');
      return null;
    }
  }, []);

  // تحديث آخر تسجيل دخول
  const updateLastLogin = useCallback(async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        lastLogin: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error('خطأ في تحديث آخر تسجيل دخول:', err);
    }
  }, []);

  // التحقق من صحة البيانات المحلية
  const validateLocalStorage = useCallback((currentUser) => {
    const storedPhone = localStorage.getItem('verifiedPhone');
    const storedUid = localStorage.getItem('verifiedUid');

    if (!storedPhone || !storedUid) {
      return false;
    }

    if (currentUser) {
      // التحقق من تطابق البيانات
      if (currentUser.uid !== storedUid || currentUser.phoneNumber !== storedPhone) {
        console.warn('عدم تطابق البيانات المحلية مع Firebase');
        return false;
      }
    }

    return true;
  }, []);

  // تنظيف البيانات المحلية
  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem('verifiedPhone');
    localStorage.removeItem('verifiedUid');
    setUserData(null);
    setIsAuthenticated(false);
  }, []);

  // مراقبة حالة المصادقة
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setError(null);
        setUser(currentUser);

        if (currentUser) {
          // التحقق من صحة البيانات المحلية
          const isValidLocal = validateLocalStorage(currentUser);
          
          if (isValidLocal) {
            // جلب بيانات المستخدم من Firestore
            const userData = await fetchUserData(currentUser.uid);
            
            if (userData) {
              setIsAuthenticated(true);
              await updateLastLogin(currentUser.uid);
            } else {
              // لا توجد بيانات في Firestore - إنشاء بيانات أساسية
              const newUserData = {
                uid: currentUser.uid,
                phone: currentUser.phoneNumber,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isFamilyRoot: true,
                linkedParentUid: '',
              };
              
              await setDoc(doc(db, 'users', currentUser.uid), newUserData);
              setUserData(newUserData);
              setIsAuthenticated(true);
            }
          } else {
            // بيانات محلية غير صحيحة
            clearLocalStorage();
            setIsAuthenticated(false);
          }
        } else {
          // لا يوجد مستخدم مسجل دخول
          const hasLocalData = localStorage.getItem('verifiedPhone') || localStorage.getItem('verifiedUid');
          if (hasLocalData) {
            // يوجد بيانات محلية ولكن لا يوجد مستخدم في Firebase
            clearLocalStorage();
          }
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('خطأ في مراقبة المصادقة:', err);
        setError('حدث خطأ في التحقق من حالة المصادقة');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [validateLocalStorage, fetchUserData, updateLastLogin, clearLocalStorage]);

  // تسجيل الدخول (يتم استدعاؤها بعد التحقق من الهاتف)
  const login = useCallback(async (user, additionalData = {}) => {
    try {
      setError(null);
      setLoading(true);

      // حفظ بيانات المصادقة محلياً
      localStorage.setItem('verifiedUid', user.uid);
      localStorage.setItem('verifiedPhone', user.phoneNumber);

      // تحديث أو إنشاء بيانات المستخدم في Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let userData;
      if (userSnap.exists()) {
        // تحديث البيانات الموجودة
        userData = {
          ...userSnap.data(),
          lastLogin: new Date().toISOString(),
          ...additionalData
        };
      } else {
        // إنشاء بيانات جديدة
        userData = {
          uid: user.uid,
          phone: user.phoneNumber,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isFamilyRoot: true,
          linkedParentUid: '',
          ...additionalData
        };
      }

      await setDoc(userRef, userData, { merge: true });
      
      setUser(user);
      setUserData(userData);
      setIsAuthenticated(true);

      return { success: true, userData };
    } catch (err) {
      console.error('خطأ في تسجيل الدخول:', err);
      setError('فشل في تسجيل الدخول');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // تسجيل الخروج
  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // تسجيل الخروج من Firebase
      await signOut(auth);
      
      // تنظيف البيانات المحلية والحالة
      clearLocalStorage();
      setUser(null);

      return { success: true };
    } catch (err) {
      console.error('خطأ في تسجيل الخروج:', err);
      setError('فشل في تسجيل الخروج');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [clearLocalStorage]);

  // تحديث بيانات المستخدم
  const refreshUserData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      const userData = await fetchUserData(user.uid);
      return userData;
    } catch (err) {
      console.error('خطأ في تحديث بيانات المستخدم:', err);
      setError('فشل في تحديث البيانات');
      return null;
    }
  }, [user?.uid, fetchUserData]);

  // مسح رسائل الخطأ
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // تحديث بيانات المستخدم في Context
  const updateUserData = useCallback(async (newData) => {
    if (!user?.uid) return false;

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...userData,
        ...newData,
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, updatedData, { merge: true });
      setUserData(updatedData);
      
      return true;
    } catch (err) {
      console.error('خطأ في تحديث بيانات المستخدم:', err);
      setError('فشل في تحديث البيانات');
      return false;
    }
  }, [user?.uid, userData]);

  // التحقق من صلاحية المستخدم لإجراء معين
  const hasPermission = useCallback((permission) => {
    if (!userData) return false;

    switch (permission) {
      case 'DELETE_MEMBERS':
        return userData.isFamilyRoot === true;
      case 'EDIT_FAMILY':
        return userData.isFamilyRoot === true;
      case 'INVITE_MEMBERS':
        return userData.isFamilyRoot === true;
      default:
        return true;
    }
  }, [userData]);

  // قيم Context
  const contextValue = {
    // البيانات
    user,
    loading,
    error,
    isAuthenticated,
    userData,

    // الوظائف الأساسية
    login,
    logout,
    refreshUserData,
    clearError,
    updateUserData,

    // وظائف مساعدة
    hasPermission,

    // معلومات إضافية
    isLoading: loading,
    isLoggedIn: isAuthenticated,
    userPhone: userData?.phone || user?.phoneNumber,
    userId: userData?.uid || user?.uid,
    isFamilyHead: userData?.isFamilyRoot === true,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook مخصص لاستخدام Context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Hook للتحقق من المصادقة
export const useRequireAuth = () => {
  const { isAuthenticated, loading } = useAuth();
  
  return {
    isAuthenticated,
    loading,
    isReady: !loading && isAuthenticated
  };
};

// Hook للتحقق من الصلاحيات
export const usePermissions = () => {
  const { hasPermission, userData } = useAuth();
  
  return {
    hasPermission,
    canDeleteMembers: hasPermission('DELETE_MEMBERS'),
    canEditFamily: hasPermission('EDIT_FAMILY'),
    canInviteMembers: hasPermission('INVITE_MEMBERS'),
    isFamilyHead: userData?.isFamilyRoot === true,
  };
};