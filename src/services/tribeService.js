import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../firebase/auth.js';

// =============================================
// دوال القبيلة (Tribe)
// =============================================

// الحصول على القبيلة الافتراضية (سنستخدم قبيلة واحدة حالياً)
export async function getDefaultTribe() {
  try {
    const { data, error } = await supabase
      .from('tribes')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في تحميل القبيلة:", err);
    throw err;
  }
}

// إضافة/تحديث مستخدم في القبيلة
export async function joinTribe(tribeId, userData = {}) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const { data, error } = await supabase
      .from('tribe_users')
      .upsert({
        tribe_id: tribeId,
        firebase_uid: user.uid,
        phone: userData.phone || user.phoneNumber,
        display_name: userData.displayName,
        role: 'contributor',
        status: 'active'
      }, {
        onConflict: 'tribe_id,firebase_uid'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في الانضمام للقبيلة:", err);
    throw err;
  }
}

// التحقق من عضوية المستخدم
export async function checkUserMembership(tribeId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) return null;

    const { data, error } = await supabase
      .from('tribe_users')
      .select('*')
      .eq('tribe_id', tribeId)
      .eq('firebase_uid', user.uid)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في التحقق من العضوية:", err);
    return null;
  }
}

// =============================================
// دوال الأشخاص (Persons) - نسخة القبيلة
// =============================================

// قائمة جميع الأشخاص في القبيلة
export async function listTribePersons(tribeId, search = '') {
  try {
    let query = supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('generation', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,father_name.ilike.%${search}%,family_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل الأشخاص:", err);
    throw err;
  }
}

// ✅ إنشاء العلاقات التلقائية بناءً على relation
async function createAutoRelations(tribeId, newPerson, membership, userId) {
  try {
    const relation = newPerson.relation;
    
    // 1. إذا كان "أنا" → ربط person_id في tribe_users
    if (relation === 'أنا') {
      await supabase
        .from('tribe_users')
        .update({ person_id: newPerson.id })
        .eq('id', membership.id);
      return; // "أنا" ليس له علاقة parent/child
    }

    // الحصول على person_id الخاص بالمستخدم
    const userPersonId = membership.person_id;
    if (!userPersonId) {
      console.log('⚠️ المستخدم لم يضف نفسه ("أنا") بعد');
      return; // يجب أن يضيف المستخدم نفسه أولاً
    }

    // 2. إذا كان "ابن" أو "بنت" → المستخدم هو الوالد
    if (relation === 'ابن' || relation === 'بنت') {
      await supabase
        .from('relations')
        .insert({
          tribe_id: tribeId,
          parent_id: userPersonId,
          child_id: newPerson.id,
          created_by: userId
        });
      console.log(`✅ تم ربط ${relation}: ${userPersonId} → ${newPerson.id}`);
    }
    
    // 3. إذا كان "والد" أو "والدة" → المستخدم هو الطفل
    else if (relation === 'والد' || relation === 'والدة') {
      await supabase
        .from('relations')
        .insert({
          tribe_id: tribeId,
          parent_id: newPerson.id,
          child_id: userPersonId,
          created_by: userId
        });
      console.log(`✅ تم ربط ${relation}: ${newPerson.id} → ${userPersonId}`);
    }
    
    // 4. إذا كان "أخ" أو "أخت" → نفس الوالد
    else if (relation === 'أخ' || relation === 'أخت') {
      // البحث عن والد المستخدم
      const { data: parentRel } = await supabase
        .from('relations')
        .select('parent_id')
        .eq('child_id', userPersonId)
        .limit(1)
        .single();
      
      if (parentRel) {
        await supabase
          .from('relations')
          .insert({
            tribe_id: tribeId,
            parent_id: parentRel.parent_id,
            child_id: newPerson.id,
            created_by: userId
          });
        console.log(`✅ تم ربط ${relation}: ${parentRel.parent_id} → ${newPerson.id}`);
      } else {
        console.log('⚠️ لم يتم العثور على والد المستخدم، يجب إضافة الوالد أولاً');
      }
    }
    
    // 5. إذا كان "جد" أو "جدة" → والد الوالد
    else if (relation === 'جد' || relation === 'جدة') {
      // البحث عن والد المستخدم
      const { data: parentRel } = await supabase
        .from('relations')
        .select('parent_id')
        .eq('child_id', userPersonId)
        .limit(1)
        .single();
      
      if (parentRel) {
        await supabase
          .from('relations')
          .insert({
            tribe_id: tribeId,
            parent_id: newPerson.id,
            child_id: parentRel.parent_id,
            created_by: userId
          });
        console.log(`✅ تم ربط ${relation}: ${newPerson.id} → ${parentRel.parent_id}`);
      }
    }
  } catch (err) {
    console.error('❌ خطأ في إنشاء العلاقات التلقائية:', err);
    // لا نرمي الخطأ لأن إضافة الشخص نجحت
  }
}

// إضافة شخص جديد للقبيلة
export async function createTribePerson(tribeId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // التحقق من العضوية
    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    const { data, error } = await supabase
      .from('persons')
      .insert({
        tribe_id: tribeId,
        ...personData,
        created_by: user.uid,
      })
      .select()
      .single();

    if (error) throw error;

    // إنشاء العلاقات التلقائية
    await createAutoRelations(tribeId, data, membership, user.uid);

    // إضافة سجل في Audit Log
    await logPersonAction(tribeId, data.id, 'create', user.uid, null, data);

    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة الشخص:", err);
    throw err;
  }
}

// تحديث شخص
export async function updateTribePerson(tribeId, personId, personData) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    // التحقق من العضوية
    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // جلب البيانات القديمة
    const { data: oldData } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .eq('tribe_id', tribeId)
      .single();

    const { data, error } = await supabase
      .from('persons')
      .update({
        ...personData,
        updated_by: user.uid,
      })
      .eq('id', personId)
      .eq('tribe_id', tribeId)
      .select()
      .single();

    if (error) throw error;

    // سجل التعديل
    await logPersonAction(tribeId, personId, 'update', user.uid, oldData, data);

    return data;
  } catch (err) {
    console.error("❌ خطأ في تحديث الشخص:", err);
    throw err;
  }
}

// حذف شخص
export async function deleteTribePerson(tribeId, personId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const membership = await checkUserMembership(tribeId);
    if (!membership) throw new Error('يجب الانضمام للقبيلة أولاً');

    // جلب البيانات قبل الحذف
    const { data: oldData } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .eq('tribe_id', tribeId)
      .single();

    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId)
      .eq('tribe_id', tribeId);

    if (error) throw error;

    // سجل الحذف
    await logPersonAction(tribeId, personId, 'delete', user.uid, oldData, null);

    return true;
  } catch (err) {
    console.error("❌ خطأ في حذف الشخص:", err);
    throw err;
  }
}

// =============================================
// دوال العلاقات (Relations)
// =============================================

// إضافة علاقة والد-ابن
export async function createTribeRelation(tribeId, parentId, childId) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const { data, error } = await supabase
      .from('relations')
      .insert({
        tribe_id: tribeId,
        parent_id: parentId,
        child_id: childId,
        created_by: user.uid,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة العلاقة:", err);
    throw err;
  }
}

// حذف علاقة
export async function deleteTribeRelation(tribeId, parentId, childId) {
  try {
    const { error } = await supabase
      .from('relations')
      .delete()
      .eq('tribe_id', tribeId)
      .eq('parent_id', parentId)
      .eq('child_id', childId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("❌ خطأ في حذف العلاقة:", err);
    throw err;
  }
}

// الحصول على الشجرة الكاملة
export async function getTribeTree(tribeId) {
  try {
    // جلب جميع الأشخاص
    const { data: persons, error: personsError } = await supabase
      .from('persons')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('generation', { ascending: true });

    if (personsError) throw personsError;

    // جلب جميع العلاقات
    const { data: relations, error: relationsError } = await supabase
      .from('relations')
      .select('*')
      .eq('tribe_id', tribeId);

    if (relationsError) throw relationsError;

    return {
      persons: persons || [],
      relations: relations || []
    };
  } catch (err) {
    console.error("❌ خطأ في تحميل الشجرة:", err);
    throw err;
  }
}

// =============================================
// دوال الزواج (Marriages)
// =============================================

// إضافة زواج
export async function createMarriage(tribeId, husbandId, wifeId, marriageData = {}) {
  try {
    const user = await getCurrentUser();
    if (!user?.uid) throw new Error('المستخدم غير مسجل');

    const { data, error } = await supabase
      .from('marriages')
      .insert({
        tribe_id: tribeId,
        husband_id: husbandId,
        wife_id: wifeId,
        ...marriageData,
        created_by: user.uid,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة الزواج:", err);
    throw err;
  }
}

// قائمة الزيجات
export async function listMarriages(tribeId) {
  try {
    const { data, error } = await supabase
      .from('marriages')
      .select(`
        *,
        husband:persons!marriages_husband_id_fkey(*),
        wife:persons!marriages_wife_id_fkey(*)
      `)
      .eq('tribe_id', tribeId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل الزيجات:", err);
    throw err;
  }
}

// =============================================
// دوال مساعدة
// =============================================

// سجل التعديلات (Audit Log)
async function logPersonAction(tribeId, personId, action, changedBy, oldData, newData) {
  try {
    await supabase
      .from('person_audit_log')
      .insert({
        tribe_id: tribeId,
        person_id: personId,
        action,
        changed_by: changedBy,
        old_data: oldData,
        new_data: newData,
      });
  } catch (err) {
    console.error("⚠️ خطأ في سجل التعديلات:", err);
  }
}

// قائمة المساهمين
export async function listTribeContributors(tribeId) {
  try {
    const { data, error } = await supabase
      .from('tribe_users')
      .select('*')
      .eq('tribe_id', tribeId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل المساهمين:", err);
    throw err;
  }
}
