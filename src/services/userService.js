import { supabase } from '../supabaseClient';
import { getCurrentUser, logout as firebaseLogout } from '../firebase/auth.js';

// =============================================
// دوال المصادقة
// =============================================

// الحصول على المستخدم الحالي
export async function getMe() {
  return await getCurrentUser();
}

// تسجيل الخروج
export async function logout() {
  await firebaseLogout();
  localStorage.removeItem('bl_auth');
  localStorage.removeItem('verifiedUid');
  localStorage.removeItem('verifiedPhone');
}

// =============================================
// دوال قاعدة البيانات - Persons
// =============================================

// قائمة الأشخاص
export async function listPersons(search = '') {
  try {
    let query = supabase
      .from('persons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.ilike('first_name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error("❌ خطأ في تحميل الأشخاص:", err);
    throw err;
  }
}

// إضافة شخص جديد
export async function createPerson(personData) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('يجب تسجيل الدخول');

    const { data, error} = await supabase
      .from('persons')
      .insert([{
        first_name: personData.first_name,
        father_name: personData.father_name,
        family_name: personData.family_name,
        gender: personData.gender,
        relation: personData.relation, // حفظ العلاقة
        is_root: personData.is_root || false,
        created_by: user.id
      }])
      .select()
      .single();
    
    if (error) throw error;

    // إضافة العلاقة إن وجدت
    if (personData.parent_id) {
      await createRelation(personData.parent_id, data.id);
    }

    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة شخص:", err);
    throw err;
  }
}

// تحديث شخص
export async function updatePerson(id, personData) {
  try {
    const { data, error } = await supabase
      .from('persons')
      .update({
        first_name: personData.first_name,
        father_name: personData.father_name,
        family_name: personData.family_name,
        gender: personData.gender,
        relation: personData.relation, // تحديث العلاقة
        is_root: personData.is_root
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في تحديث الشخص:", err);
    throw err;
  }
}

// حذف شخص
export async function deletePerson(id) {
  try {
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("❌ خطأ في حذف الشخص:", err);
    throw err;
  }
}

// =============================================
// دوال قاعدة البيانات - Relations
// =============================================

// إضافة علاقة (parent-child)
export async function createRelation(parentId, childId) {
  try {
    const { data, error } = await supabase
      .from('relations')
      .insert([{
        parent_id: parentId,
        child_id: childId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ في إضافة علاقة:", err);
    throw err;
  }
}

// حذف علاقة
export async function deleteRelation(id) {
  try {
    const { error } = await supabase
      .from('relations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("❌ خطأ في حذف العلاقة:", err);
    throw err;
  }
}

// =============================================
// الحصول على الشجرة الكاملة
// =============================================

// الحصول على شجرة العائلة الكاملة
export async function getTree() {
  try {
    const [personsRes, relationsRes] = await Promise.all([
      supabase.from('persons').select('*'),
      supabase.from('relations').select('*')
    ]);

    if (personsRes.error) throw personsRes.error;
    if (relationsRes.error) throw relationsRes.error;

    return {
      persons: personsRes.data || [],
      relations: relationsRes.data || []
    };
  } catch (err) {
    console.error("❌ خطأ في تحميل الشجرة:", err);
    throw err;
  }
}
