// src/userService.js - خدمات إدارة المستخدمين
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase/config';

// ===========================================================================
// خدمات المستخدم الأساسية
// ===========================================================================

/**
 * جلب بيانات المستخدم من Firestore
 * @param {string} uid - معرف المستخدم
 * @returns {Object|null} بيانات المستخدم أو null
 */
export const fetchUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return {
        uid,
        ...userSnap.data()
      };
    } else {
      // إذا لم توجد بيانات، أنشئ مستند جديد للمستخدم ببيانات أساسية
      const newUserData = {
        uid,
        createdAt: serverTimestamp(),
      };
      await setDoc(userRef, newUserData);
      return { uid, ...newUserData };
    }
  } catch (err) {
    console.error('خطأ في جلب بيانات المستخدم:', err);
    throw new Error('فشل في جلب بيانات المستخدم');
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
    
    // التحقق من وجود المستخدم
    const existingUser = await getDoc(userRef);
    
    const dataToSave = {
      ...userData,
      uid,
      updatedAt: serverTimestamp(),
      ...(existingUser.exists() ? {} : { createdAt: serverTimestamp() })
    };

    await setDoc(userRef, dataToSave, { merge: true });
    
    return {
      success: true,
      data: dataToSave,
      isNewUser: !existingUser.exists()
    };
    
  } catch (error) {
    console.error('❌ خطأ في حفظ بيانات المستخدم:', error);
    throw new Error(`فشل في حفظ بيانات المستخدم: ${error.message}`);
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
    console.error('❌ خطأ في تحديث بيانات المستخدم:', error);
    throw new Error(`فشل في تحديث بيانات المستخدم: ${error.message}`);
  }
};

/**
 * حذف بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @returns {boolean} نجح الحذف أم لا
 */
export const deleteUser = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في حذف بيانات المستخدم:', error);
    throw new Error(`فشل في حذف بيانات المستخدم: ${error.message}`);
  }
};

/**
 * البحث عن المستخدمين برقم الهاتف
 * @param {string} phoneNumber - رقم الهاتف
 * @returns {Array} قائمة المستخدمين
 */
export const findUserByPhone = async (phoneNumber) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data()
      });
    });
    
    return users;
    
  } catch (error) {
    console.error('❌ خطأ في البحث عن المستخدم:', error);
    throw new Error(`فشل في البحث عن المستخدم: ${error.message}`);
  }
};

/**
 * تحديث آخر تسجيل دخول
 * @param {string} uid - معرف المستخدم
 * @returns {boolean} نجح التحديث أم لا
 */
export const updateLastLogin = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
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

/**
 * التحقق من صحة بيانات المستخدم
 * @param {Object} userData - بيانات المستخدم
 * @returns {Object} نتيجة التحقق
 */
export const validateUserData = (userData) => {
  const errors = [];
  
  if (!userData.phoneNumber) {
    errors.push('رقم الهاتف مطلوب');
  }
  
  if (userData.phoneNumber && !/^\+9647\d{8}$/.test(userData.phoneNumber)) {
    errors.push('رقم الهاتف غير صحيح');
  }
  
  if (userData.displayName && userData.displayName.length < 2) {
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
      joinDate: userData.createdAt,
      lastLogin: userData.lastLogin,
      familyRole: userData.isFamilyRoot ? 'رب العائلة' : 'عضو',
      linkedFamilies: userData.linkedParentUid ? 1 : 0,
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
    'phoneNumber',
    'displayName',
    'firstName',
    'lastName',
    'birthDate',
    'profilePicture'
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
