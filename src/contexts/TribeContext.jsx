// src/contexts/TribeContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { getDefaultTribe, joinTribe, checkUserMembership } from '../services/tribeService';

const TribeContext = createContext(null);

export const useTribe = () => useContext(TribeContext);

export const TribeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tribe, setTribe] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  // تحميل القبيلة والعضوية - يتم إعادة التحميل عند تغير المستخدم
  useEffect(() => {
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
        setTribe(tribeData);

        // التحقق من العضوية
        let membershipData = await checkUserMembership(tribeData.id);
        
        // إذا لم يكن عضو، انضم تلقائياً
        if (!membershipData) {
          membershipData = await joinTribe(tribeData.id, {
            phone: user.phoneNumber,
            displayName: user.displayName || user.phoneNumber
          });
        }
        
        setMembership(membershipData);
      } catch (err) {
        console.error('❌ خطأ في تحميل بيانات القبيلة:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTribeData();
  }, [isAuthenticated, user?.uid, user?.phoneNumber, user?.displayName]);

  // ✅ دالة لإعادة تحميل العضوية (تُستخدم بعد إضافة "أنا")
  const refreshMembership = async () => {
    if (!tribe?.id) return;
    try {
      const membershipData = await checkUserMembership(tribe.id);
      setMembership(membershipData);
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
