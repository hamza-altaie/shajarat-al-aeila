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

  // تحميل القبيلة والعضوية
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('⏳ في انتظار تسجيل الدخول...');
      setTribe(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    const loadTribeData = async () => {
      try {
        setLoading(true);
        console.log('🔄 تحميل بيانات القبيلة...');
        
        // جلب القبيلة الافتراضية
        const tribeData = await getDefaultTribe();
        console.log('✅ تم تحميل القبيلة:', tribeData);
        setTribe(tribeData);

        // التحقق من العضوية
        let membershipData = await checkUserMembership(tribeData.id);
        
        // إذا لم يكن عضو، انضم تلقائياً
        if (!membershipData) {
          console.log('📝 المستخدم ليس عضواً، جاري الانضمام...');
          membershipData = await joinTribe(tribeData.id, {
            phone: user.phoneNumber,
            displayName: user.displayName || user.phoneNumber
          });
          console.log('✅ تم الانضمام للقبيلة:', membershipData);
        } else {
          console.log('✅ المستخدم عضو بالفعل:', membershipData);
        }
        
        setMembership(membershipData);
      } catch (err) {
        console.error('❌ خطأ في تحميل بيانات القبيلة:', err);
      } finally {
        setLoading(false);
        console.log('✅ انتهى تحميل بيانات القبيلة');
      }
    };

    loadTribeData();
  }, [isAuthenticated, user]);

  const value = {
    tribe,
    membership,
    loading,
    isAdmin: membership?.role === 'admin',
    isModerator: membership?.role === 'moderator' || membership?.role === 'admin',
    canEdit: membership?.role !== 'viewer',
  };

  return (
    <TribeContext.Provider value={value}>
      {children}
    </TribeContext.Provider>
  );
};
