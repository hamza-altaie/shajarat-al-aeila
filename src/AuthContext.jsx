import React, { useEffect, useState, useCallback } from 'react';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { fetchUserData } from './userService';
import { AuthContext } from './contexts/AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshUserData = useCallback(async (uid) => {
    try {
      const data = await fetchUserData(uid);
      setUserData(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

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

  const validateLocalStorage = useCallback((currentUser) => {
    const storedPhone = localStorage.getItem('verifiedPhone');
    const storedUid = localStorage.getItem('verifiedUid');

    if (!storedPhone || !storedUid) {
      return false;
    }

    if (currentUser) {
      if (currentUser.uid !== storedUid || currentUser.phoneNumber !== storedPhone) {
        console.warn('عدم تطابق البيانات المحلية مع Firebase');
        return false;
      }
    }

    return true;
  }, []);

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem('verifiedPhone');
    localStorage.removeItem('verifiedUid');
    setUserData(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
  const timeout = setTimeout(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setError(null);
        setUser(currentUser);

        if (currentUser) {
          const isValidLocal = validateLocalStorage(currentUser);
          
          if (isValidLocal) {
            const userData = await fetchUserData(currentUser.uid);
            
            if (userData) {
              setIsAuthenticated(true);
              await updateLastLogin(currentUser.uid);
              setUserData(userData);
            } else {
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
            clearLocalStorage();
            setIsAuthenticated(false);
          }
        } else {
          const hasLocalData = localStorage.getItem('verifiedPhone') || localStorage.getItem('verifiedUid');
          if (hasLocalData) {
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

    window.__auth_unsub = unsubscribe;
  }, 300); // تأخير بسيط حتى Firebase يتهيأ

  return () => {
    clearTimeout(timeout);
    if (window.__auth_unsub) {
      window.__auth_unsub();
    }
  };
}, [validateLocalStorage, updateLastLogin, clearLocalStorage]);


  const login = useCallback(async (user, additionalData = {}) => {
    try {
      setError(null);
      setLoading(true);

      localStorage.setItem('verifiedUid', user.uid);
      localStorage.setItem('verifiedPhone', user.phoneNumber);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let userData;
      if (userSnap.exists()) {
        userData = {
          ...userSnap.data(),
          lastLogin: new Date().toISOString(),
          ...additionalData
        };
      } else {
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

  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      await signOut(auth);
      
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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

  const contextValue = {
    user,
    loading,
    error,
    isAuthenticated,
    userData,

    login,
    logout,
    refreshUserData,
    clearError,
    updateUserData,

    hasPermission,

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