// src/userService.js - خدمات إدارة المستخدمين
// تم تحديث الخدمة لاستخدام Firebase Firestore
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase/config.js';

// ===========================================================================
// خدمات المستخدم الأساسية
// ===========================================================================

/**
 * جلب بيانات المستخدم من Firebase Firestore
 * @param {string} uid - معرف المستخدم
 * @returns {Object|null} بيانات المستخدم أو null
 */
export const fetchUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return {
        uid,
        ...userDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات المستخدم:', error);
    throw new Error(`فشل في جلب بيانات المستخدم: ${error.message}`);
  }
};

/**
 * إنشاء أو تحديث بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @param {Object} userData - بيانات المستخدم
 * @returns {Object} نتيجة العملية
 */
export const createOrUpdateUser = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    const dataToSave = {
      ...userData,
      updatedAt: serverTimestamp(),
      ...(userDoc.exists() ? {} : { createdAt: serverTimestamp() })
    };
    
    await setDoc(userRef, dataToSave, { merge: true });
    
    return {
      success: true,
      uid,
      data: dataToSave
    };
  } catch (error) {
    console.error('❌ خطأ في إنشاء/تحديث المستخدم:', error);
    throw new Error(`فشل في إنشاء/تحديث المستخدم: ${error.message}`);
  }
};

/**
 * تحديث بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @param {Object} updates - التحديثات
 * @returns {boolean} نجح التحديث أم لا
 */
export const updateUser = async (uid, updates) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    const dataToUpdate = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(userRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error('❌ خطأ في تحديث المستخدم:', error);
    throw new Error(`فشل في تحديث المستخدم: ${error.message}`);
  }
};

/**
 * تحديث آخر تسجيل دخول
 * @param {string} uid - معرف المستخدم  
 * @returns {boolean} نجح التحديث أم لا
 */
export const updateLastLogin = async (uid) => {
  try {
    await updateUser(uid, {
      lastLogin: serverTimestamp(),
      lastActive: serverTimestamp()
    });
    
    return true;
    
  } catch (error) {
    console.warn('⚠️ لم يتم تحديث آخر تسجيل دخول:', error);
    // لا نرمي خطأ هنا لأنه ليس حرجياً
    return false;
  }
};

// ===========================================================================
// كائن الخدمة الرئيسي
// ===========================================================================

export const userService = {
  // الوظائف الأساسية
  fetchUserData,
  createOrUpdateUser,
  updateUser,
  
  // التحديثات المختصرة
  updateLastLogin
};

// التصدير الافتراضي
export default userService;
