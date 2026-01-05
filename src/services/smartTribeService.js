// src/services/smartTribeService.js
// خدمة القبيلة الذكية - منع التكرار والربط التلقائي

import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../firebase/auth.js';
import { 
  findSimilarPersons, 
  isExactMatch, 
  buildFullName,
  suggestBestMatch 
} from './personMatcher.js';

// =============================================
// دوال مساعدة
// =============================================

/**
 * التحقق من عضوية المستخدم وصلاحياته
 */
async function checkMembership(tribeId) {
  const user = await getCurrentUser();
  if (!user?.uid) return null;

  const { data, error } = await supabase
    .from('tribe_users')
    .select('*')
    .eq('tribe_id', tribeId)
    .eq('firebase_uid', user.uid)
    .maybeSingle();

  if (error) {
    console.error('❌ خطأ في التحقق من العضوية:', error);
    return null;
  }
  
  return data;
}

/**
 * جلب جميع الأشخاص في القبيلة
 */
async function getAllPersons(tribeId) {
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('tribe_id', tribeId);

  if (error) throw error;
  return data || [];
}

// =============================================
// 🧠 الإضافة الذكية - Smart Add
// =============================================

/**
 * إضافة شخص جديد بذكاء
 * - يبحث عن تطابق قبل الإضافة
 * - يقترح الربط إذا وجد شخص مشابه
 * - يمنع التكرار
 * 
 * @param {string} tribeId - معرف القبيلة
 * @param {Object} personData - بيانات الشخص الجديد
 * @returns {Object} { action, person, suggestion }
 */
export async function smartAddPerson(tribeId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // جلب جميع الأشخاص للبحث عن تطابق
    const allPersons = await getAllPersons(tribeId);
    
    // البحث عن تطابق
    const matchResult = suggestBestMatch(personData, allPersons);
    
    // ============================================
    // حالة "أنا" - معاملة خاصة
    // ============================================
    if (personData.relation === 'أنا') {
      // البحث عن تطابق تام
      const exactMatch = allPersons.find(p => isExactMatch(personData, p));
      
      if (exactMatch) {
        // تم العثور على تطابق تام
        
        // ربط المستخدم بالشخص الموجود
        await linkUserToPerson(tribeId, membership.id, exactMatch.id, user.uid);
        
        return {
          action: 'linked',
          person: exactMatch,
          message: `تم ربطك بـ "${buildFullName(exactMatch)}" الموجود في الشجرة`
        };
      }
      
      // إذا وجد تطابق عالي (90%+)، نقترح الربط
      if (matchResult.found && matchResult.similarity >= 90) {
        return {
          action: 'suggest_link',
          suggestion: matchResult.suggestion,
          similarity: matchResult.similarity,
          personData: personData,
          message: matchResult.message
        };
      }
    }
    
    // ============================================
    // الحالة العامة - فحص التكرار
    // ============================================
    
    // إذا وجد تطابق عالي جداً (95%+)، نمنع الإضافة
    if (matchResult.found && matchResult.similarity >= 95) {
      return {
        action: 'duplicate_found',
        existingPerson: matchResult.suggestion,
        similarity: matchResult.similarity,
        message: `يوجد شخص مشابه جداً: "${buildFullName(matchResult.suggestion)}"`
      };
    }
    
    // إذا وجد تطابق متوسط (80-95%)، نسأل المستخدم
    if (matchResult.found && matchResult.similarity >= 80) {
      return {
        action: 'confirm_needed',
        suggestion: matchResult.suggestion,
        similarity: matchResult.similarity,
        personData: personData,
        message: matchResult.message
      };
    }
    
    // لا يوجد تطابق - إضافة عادية
    const newPerson = await createPerson(tribeId, personData, user.uid);
    
    return {
      action: 'created',
      person: newPerson,
      message: `تم إضافة "${buildFullName(newPerson)}" بنجاح`
    };
    
  } catch (err) {
    console.error('❌ خطأ في الإضافة الذكية:', err);
    throw err;
  }
}

/**
 * تأكيد إضافة شخص جديد (بعد التأكد أنه ليس مكرر)
 */
export async function confirmAddPerson(tribeId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    const newPerson = await createPerson(tribeId, personData, user.uid);
    
    return {
      action: 'created',
      person: newPerson,
      message: `تم إضافة "${buildFullName(newPerson)}" بنجاح`
    };
  } catch (err) {
    console.error('❌ خطأ في تأكيد الإضافة:', err);
    throw err;
  }
}

/**
 * تأكيد الربط بشخص موجود (للحالة "أنا")
 */
export async function confirmLinkToExisting(tribeId, existingPersonId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // ربط المستخدم بالشخص الموجود
    await linkUserToPerson(tribeId, membership.id, existingPersonId, user.uid);
    
    // جلب بيانات الشخص
    const { data: person } = await supabase
      .from('persons')
      .select('*')
      .eq('id', existingPersonId)
      .single();
    
    return {
      action: 'linked',
      person: person,
      message: `تم ربطك بـ "${buildFullName(person)}" بنجاح`
    };
  } catch (err) {
    console.error('❌ خطأ في تأكيد الربط:', err);
    throw err;
  }
}

// =============================================
// 🔍 البحث عن المكررين
// =============================================

/**
 * البحث عن جميع الأشخاص المكررين المحتملين
 */
export async function findAllDuplicates(tribeId, threshold = 85) {
  try {
    const allPersons = await getAllPersons(tribeId);
    const duplicateGroups = [];
    const processed = new Set();
    
    for (const person of allPersons) {
      if (processed.has(person.id)) continue;
      
      const similar = findSimilarPersons(person, allPersons, threshold);
      
      if (similar.length > 0) {
        const group = {
          primary: person,
          duplicates: similar.map(s => ({
            ...s.person,
            similarity: s.similarity
          }))
        };
        
        duplicateGroups.push(group);
        
        // تحديد كل الأشخاص في المجموعة كمعالجين
        processed.add(person.id);
        similar.forEach(s => processed.add(s.person.id));
      }
    }
    
    return duplicateGroups;
  } catch (err) {
    console.error('❌ خطأ في البحث عن المكررين:', err);
    throw err;
  }
}

// =============================================
// 🔧 دوال دمج الأشخاص (للمدير فقط)
// =============================================

/**
 * دمج شخصين - متاح للمدير فقط
 */
export async function mergePersons(tribeId, keepPersonId, removePersonId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkMembership(tribeId);
    
    // ✅ التحقق من صلاحية المدير
    if (!membership || membership.role !== 'admin') {
      throw new Error('فقط المدير يمكنه دمج الأشخاص');
    }

    // بدء عملية الدمج

    // 1️⃣ نقل علاقات الوالد
    await supabase
      .from('relations')
      .update({ parent_id: keepPersonId })
      .eq('tribe_id', tribeId)
      .eq('parent_id', removePersonId);

    // 2️⃣ نقل علاقات الطفل (مع تجنب التكرار)
    const { data: removeChildRels } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId)
      .eq('child_id', removePersonId);

    const { data: keepChildRels } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId)
      .eq('child_id', keepPersonId);

    const keepParents = new Set((keepChildRels || []).map(r => r.parent_id));
    
    for (const rel of (removeChildRels || [])) {
      if (!keepParents.has(rel.parent_id)) {
        await supabase
          .from('relations')
          .update({ child_id: keepPersonId })
          .eq('id', rel.id);
      } else {
        await supabase
          .from('relations')
          .delete()
          .eq('id', rel.id);
      }
    }

    // 3️⃣ نقل ربط المستخدمين
    await supabase
      .from('tribe_users')
      .update({ person_id: keepPersonId })
      .eq('tribe_id', tribeId)
      .eq('person_id', removePersonId);

    // 4️⃣ حذف الشخص المُدمج
    await supabase
      .from('persons')
      .delete()
      .eq('id', removePersonId)
      .eq('tribe_id', tribeId);

    // تم الدمج بنجاح
    
    return { success: true, message: 'تم الدمج بنجاح' };
  } catch (err) {
    console.error('❌ خطأ في دمج الأشخاص:', err);
    throw err;
  }
}

// =============================================
// دوال مساعدة داخلية
// =============================================

/**
 * إنشاء شخص جديد
 */
async function createPerson(tribeId, personData, userId) {
  const { data, error } = await supabase
    .from('persons')
    .insert({
      tribe_id: tribeId,
      ...personData,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ربط مستخدم بشخص موجود
 */
async function linkUserToPerson(tribeId, membershipId, personId, userId) {
  // تحديث الربط
  const { error: linkError } = await supabase
    .from('tribe_users')
    .update({ person_id: personId })
    .eq('id', membershipId);

  if (linkError) throw linkError;

  // تحديث الشخص ليكون "أنا"
  const { error: updateError } = await supabase
    .from('persons')
    .update({ 
      relation: 'أنا',
      updated_by: userId 
    })
    .eq('id', personId);

  if (updateError) throw updateError;

  // تم الربط بنجاح
}

// =============================================
// 🧠 دوال الإضافة الذكية للصفحة القديمة
// =============================================

/**
 * إضافة شخص مع الربط الذكي التلقائي
 * (للتوافق مع SmartAddPerson.jsx)
 */
export async function addPersonWithSmartLinking(tribeId, personData) {
  return smartAddPerson(tribeId, personData);
}

/**
 * البحث عن الأب المحتمل بناءً على الاسم
 */
export async function findPotentialFather(tribeId, fatherName, grandfatherName = '') {
  try {
    const allPersons = await getAllPersons(tribeId);
    
    // البحث عن شخص يطابق اسم الأب
    const matches = findSimilarPersons(
      { 
        first_name: fatherName, 
        father_name: grandfatherName 
      }, 
      allPersons, 
      75 // حد أدنى 75% للتطابق
    );
    
    return matches.map(m => ({
      ...m.person,
      similarity: m.similarity
    }));
  } catch (err) {
    console.error('❌ خطأ في البحث عن الأب:', err);
    return [];
  }
}

// =============================================
// تصدير الدوال من personMatcher
// =============================================

export {
  findSimilarPersons,
  isExactMatch,
  buildFullName,
  suggestBestMatch
} from './personMatcher.js';
