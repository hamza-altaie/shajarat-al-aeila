// src/contexts/TribeContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { getDefaultTribe, joinTribe, checkUserMembership } from '../services/tribeService';

const TribeContext = createContext(null);

export const useTribe = () => useContext(TribeContext);

export const TribeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tribe, setTribe] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ إضافة ref لتتبع حالة المكون
  const isMountedRef = useRef(true);

  // تحميل القبيلة والعضوية - يتم إعادة التحميل عند تغير المستخدم
  useEffect(() => {
    // ✅ تعيين الحالة عند بداية كل effect
    isMountedRef.current = true;
    
    // إعادة تعيين البيانات عند تغير المستخدم
    setTribe(null);
    setMembership(null);
    
    if (!isAuthenticated || !user?.uid) {
      setLoading(false);
      return;
    }

    const loadTribeData = async () => {
      try {
        setLoading(true);
        
        // جلب القبيلة الافتراضية
        const tribeData = await getDefaultTribe();
        
        // ✅ التحقق قبل تحديث الحالة
        if (!isMountedRef.current) return;
        setTribe(tribeData);

        // التحقق من العضوية
        let membershipData = await checkUserMembership(tribeData.id);
        
        // ✅ التحقق مرة أخرى
        if (!isMountedRef.current) return;
        
        // إذا لم يكن عضو، انضم تلقائياً
        if (!membershipData) {
          membershipData = await joinTribe(tribeData.id, {
            phone: user.phoneNumber,
            displayName: user.displayName || user.phoneNumber
          });
          
          // ✅ التحقق بعد الانضمام
          if (!isMountedRef.current) return;
        }
        
        setMembership(membershipData);
      } catch (err) {
        console.error('❌ خطأ في تحميل بيانات القبيلة:', err);
      } finally {
        // ✅ التحقق قبل إيقاف التحميل
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadTribeData();
    
    // ✅ Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [isAuthenticated, user?.uid, user?.phoneNumber, user?.displayName]);

  // ✅ دالة لإعادة تحميل العضوية (تُستخدم بعد إضافة "أنا")
  const refreshMembership = async () => {
    if (!tribe?.id) return;
    try {
      const membershipData = await checkUserMembership(tribe.id);
      // ✅ التحقق قبل التحديث
      if (isMountedRef.current) {
        setMembership(membershipData);
      }
      return membershipData;
    } catch (err) {
      console.error('❌ خطأ في إعادة تحميل العضوية:', err);
      return null;
    }
  };

  const value = {
    tribe,
    membership,
    loading,
    isAdmin: membership?.role === 'admin',
    isModerator: membership?.role === 'moderator' || membership?.role === 'admin',
    canEdit: membership?.role !== 'viewer',
    refreshMembership, // ✅ إضافة الدالة
  };

  return (
    <TribeContext.Provider value={value}>
      {children}
    </TribeContext.Provider>
  );
};
