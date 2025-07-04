/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';

// =======================================================
// 🏗️ نظام إدارة الحالة المتقدم لشجرة العائلة
// =======================================================

// إنشاء السياق
const FamilyTreeContext = createContext();

// أنواع الإجراءات
const ACTION_TYPES = {
  // حالة التحميل
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // بيانات المستخدم
  SET_USER: 'SET_USER',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_USER: 'CLEAR_USER',
  
  // بيانات العائلة
  SET_FAMILY_MEMBERS: 'SET_FAMILY_MEMBERS',
  ADD_FAMILY_MEMBER: 'ADD_FAMILY_MEMBER',
  UPDATE_FAMILY_MEMBER: 'UPDATE_FAMILY_MEMBER',
  REMOVE_FAMILY_MEMBER: 'REMOVE_FAMILY_MEMBER',
  
  // العائلات المرتبطة
  SET_CONNECTED_FAMILIES: 'SET_CONNECTED_FAMILIES',
  ADD_CONNECTED_FAMILY: 'ADD_CONNECTED_FAMILY',
  REMOVE_CONNECTED_FAMILY: 'REMOVE_CONNECTED_FAMILY',
  
  // البحث والفلترة
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_SEARCH_FILTERS: 'SET_SEARCH_FILTERS',
  CLEAR_SEARCH: 'CLEAR_SEARCH',
  
  // الإحصائيات
  SET_STATISTICS: 'SET_STATISTICS',
  UPDATE_STATISTICS: 'UPDATE_STATISTICS',
  
  // الذاكرة المؤقتة
  SET_CACHE: 'SET_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',

  // إعدادات التطبيق
  SET_SETTINGS: 'SET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',

  // الأنشطة الحية
  SET_LIVE_ACTIVITIES: 'SET_LIVE_ACTIVITIES',
  ADD_LIVE_ACTIVITY: 'ADD_LIVE_ACTIVITY',
  REMOVE_LIVE_ACTIVITY: 'REMOVE_LIVE_ACTIVITY',

  // الاقتراحات
  SET_SUGGESTIONS: 'SET_SUGGESTIONS',
  ADD_SUGGESTION: 'ADD_SUGGESTION',
  REMOVE_SUGGESTION: 'REMOVE_SUGGESTION'
};

// الحالة الأولية المحسنة
const initialState = {
  // حالة التطبيق
  loading: false,
  error: null,
  initialized: false,

  // بيانات المستخدم
  user: null,
  userSettings: {
    theme: 'light',
    language: 'ar',
    notifications: true,
    allowLinking: false,
    privacy: {
      showPhone: false,
      showBirthDate: true,
      allowSearch: true
    }
  },

  // بيانات العائلة
  familyMembers: new Map(),
  connectedFamilies: new Map(),
  familyStatistics: null,

  // البحث والفلترة
  searchResults: [],
  searchFilters: {
    query: '',
    relation: '',
    generation: null,
    hasPhoto: null,
    familyId: null
  },
  searchHistory: [],

  // الذاكرة المؤقتة
  cache: new Map(),
  cacheTimestamps: new Map(),

  // الأنشطة والاقتراحات
  liveActivities: [],
  suggestions: [],

  // إعدادات الأداء
  performance: {
    lastSyncTime: null,
    pendingOperations: 0,
    realtimeListeners: new Set(),
    batchOperations: []
  }
};

// ======================================================
// 🎯 مزود السياق الرئيسي
// ======================================================
export function FamilyTreeProvider({ children }) {
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case ACTION_TYPES.SET_LOADING:
        return {
          ...state,
          loading: action.payload
        };

      case ACTION_TYPES.SET_ERROR:
        return {
          ...state,
          error: action.payload,
          loading: false
        };

      case ACTION_TYPES.CLEAR_ERROR:
        return {
          ...state,
          error: null
        };

      case ACTION_TYPES.SET_USER:
        return {
          ...state,
          user: action.payload,
          initialized: true
        };

      case ACTION_TYPES.UPDATE_USER:
        return {
          ...state,
          user: { ...state.user, ...action.payload }
        };

      case ACTION_TYPES.CLEAR_USER:
        return {
          ...initialState
        };

      case ACTION_TYPES.SET_FAMILY_MEMBERS: {
        const membersMap = new Map();
        action.payload.forEach(member => {
          membersMap.set(member.id, member);
        });
        return {
          ...state,
          familyMembers: membersMap
        };
      }

      case ACTION_TYPES.ADD_FAMILY_MEMBER: {
        const newMembersMap = new Map(state.familyMembers);
        newMembersMap.set(action.payload.id, action.payload);
        return {
          ...state,
          familyMembers: newMembersMap
        };
      }

      case ACTION_TYPES.UPDATE_FAMILY_MEMBER: {
        const updatedMembersMap = new Map(state.familyMembers);
        const existingMember = updatedMembersMap.get(action.payload.id);
        if (existingMember) {
          updatedMembersMap.set(action.payload.id, { ...existingMember, ...action.payload });
        }
        return {
          ...state,
          familyMembers: updatedMembersMap
        };
      }

      case ACTION_TYPES.REMOVE_FAMILY_MEMBER: {
        const filteredMembersMap = new Map(state.familyMembers);
        filteredMembersMap.delete(action.payload);
        return {
          ...state,
          familyMembers: filteredMembersMap
        };
      }

      case ACTION_TYPES.SET_CONNECTED_FAMILIES: {
        const connectedMap = new Map();
        action.payload.forEach(family => {
          connectedMap.set(family.id, family);
        });
        return {
          ...state,
          connectedFamilies: connectedMap
        };
      }

      case ACTION_TYPES.SET_SEARCH_RESULTS:
        return {
          ...state,
          searchResults: action.payload,
          searchHistory: action.query ? 
            [...new Set([action.query, ...state.searchHistory.slice(0, 4)])] : 
            state.searchHistory
        };

      case ACTION_TYPES.SET_SEARCH_FILTERS:
        return {
          ...state,
          searchFilters: { ...state.searchFilters, ...action.payload }
        };

      case ACTION_TYPES.CLEAR_SEARCH:
        return {
          ...state,
          searchResults: [],
          searchFilters: initialState.searchFilters
        };

      case ACTION_TYPES.SET_STATISTICS:
        return {
          ...state,
          familyStatistics: action.payload
        };

      case ACTION_TYPES.SET_CACHE: {
        const newCache = new Map(state.cache);
        const newTimestamps = new Map(state.cacheTimestamps);
        newCache.set(action.key, action.payload);
        newTimestamps.set(action.key, Date.now());
        return {
          ...state,
          cache: newCache,
          cacheTimestamps: newTimestamps
        };
      }

      case ACTION_TYPES.CLEAR_CACHE:
        return {
          ...state,
          cache: new Map(),
          cacheTimestamps: new Map()
        };

      case ACTION_TYPES.SET_SETTINGS:
        return {
          ...state,
          userSettings: { ...state.userSettings, ...action.payload }
        };

      case ACTION_TYPES.SET_SUGGESTIONS:
        return {
          ...state,
          suggestions: action.payload
        };

      default:
        return state;
    }
  }, initialState);
  const functions = getFunctions();
  
  // ====================================================
  // 🔧 دوال المساعدة والأدوات
  // ====================================================
  
  // تنظيف الذاكرة المؤقتة
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 دقائق
    
    const newCache = new Map();
    const newTimestamps = new Map();
    
    state.cache.forEach((value, key) => {
      const timestamp = state.cacheTimestamps.get(key);
      if (timestamp && (now - timestamp) < maxAge) {
        newCache.set(key, value);
        newTimestamps.set(key, timestamp);
      }
    });
    
    dispatch({ type: ACTION_TYPES.SET_CACHE, payload: { cache: newCache, timestamps: newTimestamps } });
  }, [state.cache, state.cacheTimestamps]);
  
  // الحصول من الذاكرة المؤقتة
  const getFromCache = useCallback((key) => {
    const timestamp = state.cacheTimestamps.get(key);
    if (timestamp && (Date.now() - timestamp) < 5 * 60 * 1000) {
      return state.cache.get(key);
    }
    return null;
  }, [state.cache, state.cacheTimestamps]);
  
  // حفظ في الذاكرة المؤقتة
  const setCache = useCallback((key, value) => {
    dispatch({ type: ACTION_TYPES.SET_CACHE, key, payload: value });
  }, []);
  
  // ====================================================
  // 👤 دوال إدارة المستخدم
  // ====================================================
  
  const initializeUser = useCallback(async (userId) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      
      // تحميل بيانات المستخدم
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        dispatch({ type: ACTION_TYPES.SET_USER, payload: { id: userId, ...userData } });
        
        // تحميل الإعدادات
        const settingsDoc = await getDoc(doc(db, 'user_settings', userId));
        if (settingsDoc.exists()) {
          dispatch({ type: ACTION_TYPES.SET_SETTINGS, payload: settingsDoc.data() });
        }
        
        // بدء المراقبة المباشرة
        startRealtimeListeners(userId);
      }
      
    } catch (error) {
      console.error('خطأ في تهيئة المستخدم:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
    }, [startRealtimeListeners]);
 
  
  const updateUserSettings = useCallback(async (settings) => {
    try {
      const userId = state.user?.id;
      if (!userId) return;
      
      await setDoc(doc(db, 'user_settings', userId), settings, { merge: true });
      dispatch({ type: ACTION_TYPES.SET_SETTINGS, payload: settings });
      
    } catch (error) {
      console.error('خطأ في تحديث الإعدادات:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, [state.user]);
  
  // ====================================================
  // 👨‍👩‍👧‍👦 دوال إدارة العائلة
  // ====================================================
  
  const loadFamilyMembers = useCallback(async (userId) => {
    try {
      const cacheKey = `family_${userId}`;
      const cached = getFromCache(cacheKey);
      if (cached) {
        dispatch({ type: ACTION_TYPES.SET_FAMILY_MEMBERS, payload: cached });
        return;
      }
      
      const familyQuery = query(
        collection(db, 'users', userId, 'family'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(familyQuery);
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      dispatch({ type: ACTION_TYPES.SET_FAMILY_MEMBERS, payload: members });
      setCache(cacheKey, members);
      
    } catch (error) {
      console.error('خطأ في تحميل أعضاء العائلة:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, [getFromCache, setCache]);
  
  const addFamilyMember = useCallback(async (memberData) => {
    try {
      const userId = state.user?.id;
      if (!userId) return;
      
      const memberRef = doc(collection(db, 'users', userId, 'family'));
      const memberWithId = {
        ...memberData,
        id: memberRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(memberRef, memberWithId);
      dispatch({ type: ACTION_TYPES.ADD_FAMILY_MEMBER, payload: memberWithId });
      
      // تحديث الذاكرة المؤقتة
      const cacheKey = `family_${userId}`;
      const cached = getFromCache(cacheKey);
      if (cached) {
        setCache(cacheKey, [...cached, memberWithId]);
      }
      
      return memberWithId;
      
    } catch (error) {
      console.error('خطأ في إضافة عضو العائلة:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [state.user, getFromCache, setCache]);
  
  const updateFamilyMember = useCallback(async (memberId, updates) => {
    try {
      const userId = state.user?.id;
      if (!userId) return;
      
      const memberRef = doc(db, 'users', userId, 'family', memberId);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await updateDoc(memberRef, updateData);
      dispatch({ type: ACTION_TYPES.UPDATE_FAMILY_MEMBER, payload: { id: memberId, ...updateData } });
      
    } catch (error) {
      console.error('خطأ في تحديث عضو العائلة:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [state.user]);
  
  const removeFamilyMember = useCallback(async (memberId) => {
    try {
      const userId = state.user?.id;
      if (!userId) return;
      
      await deleteDoc(doc(db, 'users', userId, 'family', memberId));
      dispatch({ type: ACTION_TYPES.REMOVE_FAMILY_MEMBER, payload: memberId });
      
    } catch (error) {
      console.error('خطأ في حذف عضو العائلة:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [state.user]);
  
  // ====================================================
  // 🔍 دوال البحث المتقدم
  // ====================================================
  
  const performAdvancedSearch = useCallback(async (searchQuery, filters = {}) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
      
      // استخدام Cloud Function للبحث المتقدم
      const advancedSearch = httpsCallable(functions, 'advancedSearch');
      const result = await advancedSearch({
        query: searchQuery,
        filters,
        limit: 50
      });
      
      dispatch({ 
        type: ACTION_TYPES.SET_SEARCH_RESULTS, 
        payload: result.data.results,
        query: searchQuery 
      });
      
      return result.data.results;
      
    } catch (error) {
      console.error('خطأ في البحث المتقدم:', error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      return [];
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
    }
  }, [functions]);
  
  const updateSearchFilters = useCallback((filters) => {
    dispatch({ type: ACTION_TYPES.SET_SEARCH_FILTERS, payload: filters });
  }, []);
  
  const clearSearch = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_SEARCH });
  }, []);
  
  // ====================================================
  // 🔗 دوال الروابط والاقتراحات
  // ====================================================
  
  const getSuggestions = useCallback(async (memberId) => {
    try {
      const suggestConnections = httpsCallable(functions, 'suggestConnections');
      const result = await suggestConnections({ memberId });
      
      dispatch({ type: ACTION_TYPES.SET_SUGGESTIONS, payload: result.data.suggestions });
      
      return result.data.suggestions;
      
    } catch (error) {
      console.error('خطأ في الحصول على الاقتراحات:', error);
      return [];
    }
  }, [functions]);
  
  // ====================================================
  // 📊 دوال الإحصائيات
  // ====================================================
  
  const loadStatistics = useCallback(async () => {
    try {
      const userId = state.user?.id;
      if (!userId) return;
      
      const cacheKey = `stats_${userId}`;
      const cached = getFromCache(cacheKey);
      if (cached) {
        dispatch({ type: ACTION_TYPES.SET_STATISTICS, payload: cached });
        return;
      }
      
      const statsDoc = await getDoc(doc(db, 'analytics', userId));
      if (statsDoc.exists()) {
        const stats = statsDoc.data();
        dispatch({ type: ACTION_TYPES.SET_STATISTICS, payload: stats });
        setCache(cacheKey, stats);
      }
      
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  }, [state.user, getFromCache, setCache]);
  
  // ====================================================
  // 🔴 المراقبة المباشرة
  // ====================================================
  
  const startRealtimeListeners = useCallback(() => {
    const familyRef = collection(db, 'families');
    const unsubscribe = onSnapshot(familyRef, (snapshot) => {
      const families = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dispatch({ type: ACTION_TYPES.SET_CONNECTED_FAMILIES, payload: families });
    });

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = startRealtimeListeners();
    return () => unsubscribe();
  }, [startRealtimeListeners]);

  const stopRealtimeListeners = useCallback(() => {
    state.performance.realtimeListeners.forEach(unsubscribe => {
      unsubscribe();
    });
    state.performance.realtimeListeners.clear();
  }, [state.performance.realtimeListeners]);

  // ====================================================
  // 🧹 تنظيف الموارد
  // ====================================================
  
  useEffect(() => {
    // تنظيف دوري للذاكرة المؤقتة
    const cacheCleanupInterval = setInterval(cleanupCache, 60000); // كل دقيقة
    
    return () => {
      clearInterval(cacheCleanupInterval);
      stopRealtimeListeners();
    };
  }, [cleanupCache, stopRealtimeListeners]);
  
  // ====================================================
  // 📋 القيم المحسوبة
  // ====================================================
  
  const computedValues = useMemo(() => {
    const familyMembersArray = Array.from(state.familyMembers.values());
    
    return {
      familyMembersArray,
      familyMembersCount: familyMembersArray.length,
      generations: [...new Set(familyMembersArray.map(m => m.generation || 0))].sort((a, b) => b - a),
      relations: [...new Set(familyMembersArray.map(m => m.relation))].filter(Boolean),
      isSearchActive: state.searchResults.length > 0 || state.searchFilters.query.length > 0,
      hasConnectedFamilies: state.connectedFamilies.size > 0,
      cacheSize: state.cache.size,
      isInitialized: state.initialized && state.user !== null
    };
  }, [state]);
  
  // ====================================================
  // 🎯 القيمة المرجعة للسياق
  // ====================================================
  
  const contextValue = {
    // الحالة
    ...state,
    ...computedValues,
    
    // دوال المستخدم
    initializeUser,
    updateUserSettings,
    
    // دوال العائلة
    loadFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    
    // دوال البحث
    performAdvancedSearch,
    updateSearchFilters,
    clearSearch,
    
    // دوال الاقتراحات
    getSuggestions,
    
    // دوال الإحصائيات
    loadStatistics,
    
    // دوال المساعدة
    clearError: () => dispatch({ type: ACTION_TYPES.CLEAR_ERROR }),
    clearCache: () => dispatch({ type: ACTION_TYPES.CLEAR_CACHE }),
    
    // دوال المراقبة
    startRealtimeListeners,
    stopRealtimeListeners
  };
  
  return (
    <FamilyTreeContext.Provider value={contextValue}>
      {children}
    </FamilyTreeContext.Provider>
  );
}
// ====================================================
// 🪝 Hook للاستخدام
// ====================================================
export function useFamilyTree() {
  const context = useContext(FamilyTreeContext);
  
  if (!context) {
    throw new Error('useFamilyTree must be used within a FamilyTreeProvider');
  }
  
  return context;
}