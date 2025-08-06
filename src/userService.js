// src/userService.js - خدمات إدارة المستخدمين
// تم تحديث الخدمة لاستخدام Supabase بدلاً من Firestore
import { 
  fetchUserData as supabaseFetchUserData,
  createOrUpdateUser as supabaseCreateOrUpdateUser,
  updateUser as supabaseUpdateUser
} from './supabase/database.js';

// ===========================================================================
// خدمات المستخدم الأساسية
// ===========================================================================

/**
 * جلب بيانات المستخدم من Supabase
 * @param {string} uid - معرف المستخدم
 * @returns {Object|null} بيانات المستخدم أو null
 */
export const fetchUserData = async (uid) => {
  return await supabaseFetchUserData(uid);
};

/**
 * إنشاء أو تحديث بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @param {Object} userData - بيانات المستخدم
 * @returns {Object} نتيجة العملية
 */
export const createOrUpdateUser = async (uid, userData) => {
  return await supabaseCreateOrUpdateUser(uid, userData);
};

/**
 * تحديث بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @param {Object} updates - التحديثات
 * @returns {boolean} نجح التحديث أم لا
 */
export const updateUser = async (uid, updates) => {
  return await supabaseUpdateUser(uid, updates);
};

/**
 * تحديث آخر تسجيل دخول
 * @param {string} uid - معرف المستخدم  
 * @returns {boolean} نجح التحديث أم لا
 */
export const updateLastLogin = async (uid) => {
  try {
    await updateUser(uid, {
      last_login: new Date().toISOString(),
      last_active: new Date().toISOString()
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
