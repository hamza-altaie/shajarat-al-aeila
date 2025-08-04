// src/services/familyService.js - خدمات إدارة العائلة باستخدام Supabase
import { 
  fetchFamilyMembers,
  saveFamilyMember,
  deleteFamilyMember,
  fetchUnifiedFamilyTree,
  searchUnifiedFamilyTree
} from '../supabase/database.js';

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
    const familyData = await fetchFamilyMembers(uid);
    
    // تحويل أسماء الحقول من snake_case إلى camelCase للتوافق مع الواجهة الأمامية
    return familyData.map(member => ({
      id: member.id,
      firstName: member.first_name || '',
      fatherName: member.father_name || '',
      grandfatherName: member.grandfather_name || '',
      surname: member.surname || '',
      relation: member.relation || '',
      birthdate: member.birthdate || '',
      avatar: member.avatar || '',
      parentId: member.parent_id || '',
      manualParentName: member.manual_parent_name || '',
      linkedParentUid: member.linked_parent_uid || '',
      createdAt: member.created_at || '',
      updatedAt: member.updated_at || ''
    }));
    
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
    // تحويل أسماء الحقول من camelCase إلى snake_case لقاعدة البيانات
    const dataToSave = {
      id: memberData.id || undefined,
      first_name: memberData.firstName || '',
      father_name: memberData.fatherName || '',
      grandfather_name: memberData.grandfatherName || '',
      surname: memberData.surname || '',
      birthdate: memberData.birthdate || null,
      relation: memberData.relation || '',
      parent_id: memberData.parentId || null,
      avatar: memberData.avatar || '',
      manual_parent_name: memberData.manualParentName || '',
      linked_parent_uid: memberData.linkedParentUid || null
    };

    const savedMember = await saveFamilyMember(uid, dataToSave);
    
    // تحويل البيانات المرجعة إلى camelCase
    return {
      id: savedMember.id,
      firstName: savedMember.first_name || '',
      fatherName: savedMember.father_name || '',
      grandfatherName: savedMember.grandfather_name || '',
      surname: savedMember.surname || '',
      relation: savedMember.relation || '',
      birthdate: savedMember.birthdate || '',
      avatar: savedMember.avatar || '',
      parentId: savedMember.parent_id || '',
      manualParentName: savedMember.manual_parent_name || '',
      linkedParentUid: savedMember.linked_parent_uid || '',
      createdAt: savedMember.created_at || '',
      updatedAt: savedMember.updated_at || ''
    };
    
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
    return await deleteFamilyMember(uid, memberId);
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
    const unifiedData = await fetchUnifiedFamilyTree();
    
    // تحويل البيانات للتوافق مع الواجهة الأمامية
    return unifiedData.map(member => ({
      id: member.id,
      firstName: member.first_name || '',
      fatherName: member.father_name || '',
      grandfatherName: member.grandfather_name || '',
      surname: member.surname || '',
      relation: member.relation || '',
      birthdate: member.birthdate || '',
      avatar: member.avatar || '',
      parentId: member.parent_id || '',
      manualParentName: member.manual_parent_name || '',
      linkedParentUid: member.linked_parent_uid || '',
      userUid: member.user_uid || '',
      userPhone: member.user?.phone_number || '',
      createdAt: member.created_at || '',
      updatedAt: member.updated_at || ''
    }));
    
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
    const searchResults = await searchUnifiedFamilyTree(searchTerm);
    
    // تحويل البيانات للتوافق مع الواجهة الأمامية
    return searchResults.map(member => ({
      id: member.id,
      firstName: member.first_name || '',
      fatherName: member.father_name || '',
      grandfatherName: member.grandfather_name || '',
      surname: member.surname || '',
      relation: member.relation || '',
      birthdate: member.birthdate || '',
      avatar: member.avatar || '',
      parentId: member.parent_id || '',
      manualParentName: member.manual_parent_name || '',
      linkedParentUid: member.linked_parent_uid || '',
      userUid: member.user_uid || '',
      userPhone: member.user?.phone_number || '',
      createdAt: member.created_at || '',
      updatedAt: member.updated_at || ''
    }));
    
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
