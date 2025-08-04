// src/userService.js - خدمات إدارة المستخدمين
// تم تحديث الخدمة لاستخدام Supabase بدلاً من Firestore
import { 
  fetchUserData as supabaseFetchUserData,
  createOrUpdateUser as supabaseCreateOrUpdateUser,
  updateUser as supabaseUpdateUser,
  deleteUser as supabaseDeleteUser,
  findUserByPhone as supabaseFindUserByPhone
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
 * حذف بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @returns {boolean} نجح الحذف أم لا
 */
export const deleteUser = async (uid) => {
  return await supabaseDeleteUser(uid);
};

/**
 * البحث عن المستخدمين برقم الهاتف
 * @param {string} phoneNumber - رقم الهاتف
 * @returns {Array} قائمة المستخدمين
 */
export const findUserByPhone = async (phoneNumber) => {
  return await supabaseFindUserByPhone(phoneNumber);
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

/**
 * التحقق من صحة بيانات المستخدم
 * @param {Object} userData - بيانات المستخدم
 * @returns {Object} نتيجة التحقق
 */
export const validateUserData = (userData) => {
  const errors = [];
  
  if (!userData.phone_number) {
    errors.push('رقم الهاتف مطلوب');
  }
  
  if (userData.phone_number && !/^\+9647\d{8}$/.test(userData.phone_number)) {
    errors.push('رقم الهاتف غير صحيح');
  }
  
  if (userData.display_name && userData.display_name.length < 2) {
    errors.push('الاسم يجب أن يكون أكثر من حرفين');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * إحصائيات المستخدم
 * @param {string} uid - معرف المستخدم
 * @returns {Object} إحصائيات المستخدم
 */
export const getUserStats = async (uid) => {
  try {
    const userData = await fetchUserData(uid);
    
    if (!userData) {
      return null;
    }
    
    // حساب الإحصائيات الأساسية
    const stats = {
      joinDate: userData.created_at,
      lastLogin: userData.last_login,
      familyRole: userData.is_family_root ? 'رب العائلة' : 'عضو',
      profileCompletion: calculateProfileCompletion(userData)
    };
    
    return stats;
    
  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المستخدم:', error);
    return null;
  }
};

/**
 * حساب نسبة اكتمال الملف الشخصي
 * @param {Object} userData - بيانات المستخدم
 * @returns {number} نسبة الاكتمال (0-100)
 */
const calculateProfileCompletion = (userData) => {
  let completion = 0;
  const fields = [
    'phone_number',
    'display_name',
    'first_name',
    'last_name',
    'birth_date',
    'profile_picture'
  ];
  
  fields.forEach(field => {
    if (userData[field]) {
      completion += (100 / fields.length);
    }
  });
  
  return Math.round(completion);
};

// ===========================================================================
// كائن الخدمة الرئيسي
// ===========================================================================

export const userService = {
  // الوظائف الأساسية
  fetchUserData,
  createOrUpdateUser,
  updateUser,
  deleteUser,
  
  // البحث والاستعلام
  findUserByPhone,
  
  // التحديثات المختصرة
  updateLastLogin,
  
  // التحقق والإحصائيات
  validateUserData,
  getUserStats,
  
  // وظائف مساعدة
  calculateProfileCompletion
};

// التصدير الافتراضي
export default userService;
