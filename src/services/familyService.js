// src/services/familyService.js - خدمات إدارة العائلة باستخدام Firebase Firestore
import { 
  doc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

// ===========================================================================
// خدمات العائلة الأساسية
// ===========================================================================

/**
 * جلب أفراد العائلة للمستخدم
 * @param {string} uid - معرف المستخدم
 * @returns {Array} قائمة أفراد العائلة
 */
export const loadFamily = async (uid) => {
  try {
    const familyCollection = collection(db, 'families');
    const q = query(
      familyCollection, 
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const familyData = [];
    
    querySnapshot.forEach((doc) => {
      familyData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return familyData;
    
  } catch (error) {
    console.error('❌ خطأ في تحميل بيانات العائلة:', error);
    throw new Error(`فشل في تحميل بيانات العائلة: ${error.message}`);
  }
};

/**
 * حفظ عضو في العائلة
 * @param {string} uid - معرف المستخدم
 * @param {Object} memberData - بيانات العضو
 * @returns {Object} بيانات العضو المحفوظة
 */
export const saveFamilyMemberData = async (uid, memberData) => {
  try {
    const dataToSave = {
      ...memberData,
      userId: uid,
      updatedAt: new Date(),
      ...(memberData.id ? {} : { createdAt: new Date() })
    };

    let savedMember;
    
    if (memberData.id) {
      // تحديث عضو موجود
      const memberRef = doc(db, 'families', memberData.id);
      await updateDoc(memberRef, dataToSave);
      savedMember = { id: memberData.id, ...dataToSave };
    } else {
      // إضافة عضو جديد
      const familyCollection = collection(db, 'families');
      const docRef = await addDoc(familyCollection, dataToSave);
      savedMember = { id: docRef.id, ...dataToSave };
    }
    
    return savedMember;
    
  } catch (error) {
    console.error('❌ خطأ في حفظ بيانات العضو:', error);
    throw new Error(`فشل في حفظ بيانات العضو: ${error.message}`);
  }
};

/**
 * حذف عضو من العائلة
 * @param {string} uid - معرف المستخدم
 * @param {string} memberId - معرف العضو
 * @returns {boolean} نجح الحذف أم لا
 */
export const deleteFamilyMemberData = async (uid, memberId) => {
  try {
    const memberRef = doc(db, 'families', memberId);
    
    // التأكد من أن العضو ينتمي للمستخدم قبل الحذف
    const memberDoc = await getDoc(memberRef);
    if (!memberDoc.exists()) {
      throw new Error('العضو غير موجود');
    }
    
    const memberData = memberDoc.data();
    if (memberData.userId !== uid) {
      throw new Error('غير مصرح لك بحذف هذا العضو');
    }
    
    await deleteDoc(memberRef);
    return true;
  } catch (error) {
    console.error('❌ خطأ في حذف العضو:', error);
    throw new Error(`فشل في حذف العضو: ${error.message}`);
  }
};

// ===========================================================================
// خدمات الشجرة الموحدة - للمستقبل
// ===========================================================================

/**
 * جلب الشجرة الموحدة من جميع المستخدمين
 * @returns {Array} قائمة أفراد العائلة من جميع المستخدمين
 */
export const loadUnifiedFamilyTree = async () => {
  try {
    const familyCollection = collection(db, 'families');
    const querySnapshot = await getDocs(familyCollection);
    
    const unifiedData = [];
    querySnapshot.forEach((doc) => {
      unifiedData.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return unifiedData;
    
  } catch (error) {
    console.error('❌ خطأ في تحميل الشجرة الموحدة:', error);
    throw new Error(`فشل في تحميل الشجرة الموحدة: ${error.message}`);
  }
};

/**
 * البحث في الشجرة الموحدة
 * @param {string} searchTerm - مصطلح البحث
 * @returns {Array} نتائج البحث
 */
export const searchInUnifiedFamilyTree = async (searchTerm) => {
  try {
    const familyData = await loadUnifiedFamilyTree();
    
    // البحث في البيانات محلياً
    const searchResults = familyData.filter(member => {
      const fullName = `${member.firstName} ${member.fatherName} ${member.grandfatherName} ${member.surname}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase()) ||
             (member.relation && member.relation.toLowerCase().includes(searchTerm.toLowerCase()));
    });
    
    return searchResults;
    
  } catch (error) {
    console.error('❌ خطأ في البحث في الشجرة:', error);
    throw new Error(`فشل في البحث في الشجرة: ${error.message}`);
  }
};

// ===========================================================================
// وظائف مساعدة
// ===========================================================================

/**
 * التحقق من صحة بيانات العضو
 * @param {Object} memberData - بيانات العضو
 * @returns {Object} نتيجة التحقق
 */
export const validateMemberData = (memberData) => {
  const errors = {};
  
  if (!memberData.firstName || memberData.firstName.length < 2) {
    errors.firstName = 'أدخل الاسم الأول (2-40 حرف)';
  }
  
  if (!memberData.fatherName || memberData.fatherName.length < 2) {
    errors.fatherName = 'أدخل اسم الأب (2-40 حرف)';
  }
  
  if (!memberData.grandfatherName || memberData.grandfatherName.length < 2) {
    errors.grandfatherName = 'أدخل اسم الجد (2-40 حرف)';
  }
  
  if (!memberData.surname || memberData.surname.length < 2) {
    errors.surname = 'أدخل اللقب (2-40 حرف)';
  }
  
  if (!memberData.relation) {
    errors.relation = 'اختر القرابة';
  }
  
  if (memberData.birthdate) {
    const birth = new Date(memberData.birthdate);
    const today = new Date();
    if (isNaN(birth.getTime()) || birth > today) {
      errors.birthdate = 'أدخل تاريخ ميلاد صحيح وليس في المستقبل';
    }
  }
  
  if (memberData.id && memberData.parentId === memberData.id) {
    errors.parentId = 'لا يمكن للفرد أن يكون أبًا لنفسه';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * حساب العمر من تاريخ الميلاد
 * @param {string} birthdate - تاريخ الميلاد
 * @returns {string} العمر المحسوب
 */
export const calculateAge = (birthdate) => {
  if (!birthdate) return '';
  
  try {
    const birth = new Date(birthdate);
    const today = new Date();
    
    if (isNaN(birth.getTime())) return '';
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age === 0) {
      const monthsDiff = today.getMonth() - birth.getMonth() + 
                       (12 * (today.getFullYear() - birth.getFullYear()));
      
      if (monthsDiff < 1) {
        const daysDiff = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
        return `${daysDiff} يوم`;
      } else {
        return `${monthsDiff} شهر`;
      }
    }
    
    return `${age} سنة`;
  } catch {
    return '';
  }
};

// ===========================================================================
// كائن الخدمة الرئيسي
// ===========================================================================

export const familyService = {
  // إدارة العائلة الشخصية
  loadFamily,
  saveFamilyMemberData,
  deleteFamilyMemberData,
  
  // الشجرة الموحدة
  loadUnifiedFamilyTree,
  searchInUnifiedFamilyTree,
  
  // وظائف مساعدة
  validateMemberData,
  calculateAge
};

// التصدير الافتراضي
export default familyService;
