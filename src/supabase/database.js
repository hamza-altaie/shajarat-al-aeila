// src/supabase/database.js - خدمات قاعدة البيانات باستخدام Supabase
import { supabase } from './config.js'

// ===========================================================================
// خدمات المستخدمين الأساسية
// ===========================================================================

/**
 * تعيين معرف المستخدم الحالي في Supabase لـ RLS
 * @param {string} uid - معرف المستخدم
 */
const setCurrentUser = async (uid) => {
  if (uid) {
    await supabase.rpc('set_current_user_uid', { user_uid: uid });
  }
}

/**
 * جلب بيانات المستخدم من Supabase
 * @param {string} uid - معرف المستخدم
 * @returns {Object|null} بيانات المستخدم أو null
 */
export const fetchUserData = async (uid) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    if (data) {
      return data
    } else {
      // إذا لم توجد بيانات، أنشئ مستند جديد للمستخدم ببيانات أساسية
      const newUserData = {
        uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: insertedData, error: insertError } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single()

      if (insertError) throw insertError
      
      return insertedData
    }
  } catch (err) {
    console.error('خطأ في جلب بيانات المستخدم:', err)
    throw new Error('فشل في جلب بيانات المستخدم')
  }
}

/**
 * إنشاء أو تحديث بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @param {Object} userData - بيانات المستخدم
 * @returns {Object} نتيجة العملية
 */
export const createOrUpdateUser = async (uid, userData) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    // التحقق من وجود المستخدم
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single()

    const dataToSave = {
      ...userData,
      uid,
      updated_at: new Date().toISOString(),
      ...(existingUser ? {} : { created_at: new Date().toISOString() })
    }

    let result
    if (existingUser) {
      // تحديث المستخدم الموجود
      const { data, error } = await supabase
        .from('users')
        .update(dataToSave)
        .eq('uid', uid)
        .select()
        .single()
      
      if (error) throw error
      result = { data, error: null }
    } else {
      // إنشاء مستخدم جديد
      const { data, error } = await supabase
        .from('users')
        .insert([dataToSave])
        .select()
        .single()
      
      if (error) throw error
      result = { data, error: null }
    }
    
    return {
      success: true,
      data: result.data,
      isNewUser: !existingUser
    }
    
  } catch (error) {
    console.error('❌ خطأ في حفظ بيانات المستخدم:', error)
    throw new Error(`فشل في حفظ بيانات المستخدم: ${error.message}`)
  }
}

/**
 * تحديث بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @param {Object} updates - التحديثات
 * @returns {boolean} نجح التحديث أم لا
 */
export const updateUser = async (uid, updates) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('users')
      .update(dataToUpdate)
      .eq('uid', uid)
    
    if (error) throw error
    
    return true
    
  } catch (error) {
    console.error('❌ خطأ في تحديث بيانات المستخدم:', error)
    throw new Error(`فشل في تحديث بيانات المستخدم: ${error.message}`)
  }
}

/**
 * حذف بيانات المستخدم
 * @param {string} uid - معرف المستخدم
 * @returns {boolean} نجح الحذف أم لا
 */
export const deleteUser = async (uid) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('uid', uid)
    
    if (error) throw error
    
    return true
    
  } catch (error) {
    console.error('❌ خطأ في حذف بيانات المستخدم:', error)
    throw new Error(`فشل في حذف بيانات المستخدم: ${error.message}`)
  }
}

/**
 * البحث عن المستخدمين برقم الهاتف
 * @param {string} phoneNumber - رقم الهاتف
 * @returns {Array} قائمة المستخدمين
 */
export const findUserByPhone = async (phoneNumber) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
    
    if (error) throw error
    
    return data || []
    
  } catch (error) {
    console.error('❌ خطأ في البحث عن المستخدم:', error)
    throw new Error(`فشل في البحث عن المستخدم: ${error.message}`)
  }
}

// ===========================================================================
// خدمات العائلة - البنية الجديدة الموحدة
// ===========================================================================

/**
 * جلب بيانات أفراد العائلة للمستخدم
 * @param {string} uid - معرف المستخدم
 * @returns {Array} قائمة أفراد العائلة
 */
export const fetchFamilyMembers = async (uid) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return data || []
    
  } catch (error) {
    console.error('❌ خطأ في جلب بيانات العائلة:', error)
    throw new Error(`فشل في جلب بيانات العائلة: ${error.message}`)
  }
}

/**
 * حفظ أو تحديث عضو في العائلة
 * @param {string} uid - معرف المستخدم
 * @param {Object} memberData - بيانات العضو
 * @returns {Object} بيانات العضو المحفوظة
 */
export const saveFamilyMember = async (uid, memberData) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    let result
    if (memberData.id) {
      // تحديث عضو موجود
      const dataToUpdate = {
        ...memberData,
        user_uid: uid,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('family_members')
        .update(dataToUpdate)
        .eq('id', memberData.id)
        .eq('user_uid', uid)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // إضافة عضو جديد - لا نرسل حقل id ليتم إنشاؤه تلقائياً
      const dataToInsert = {
        ...memberData,
        user_uid: uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // حذف حقل id إذا كان موجوداً لأن PostgreSQL سينشئه تلقائياً
      delete dataToInsert.id
      
      const { data, error } = await supabase
        .from('family_members')
        .insert([dataToInsert])
        .select()
        .single()
      
      if (error) throw error
      result = data
    }
    
    return result
    
  } catch (error) {
    console.error('❌ خطأ في حفظ بيانات العضو:', error)
    throw new Error(`فشل في حفظ بيانات العضو: ${error.message}`)
  }
}

/**
 * حذف عضو من العائلة
 * @param {string} uid - معرف المستخدم
 * @param {string} memberId - معرف العضو
 * @returns {boolean} نجح الحذف أم لا
 */
export const deleteFamilyMember = async (uid, memberId) => {
  try {
    // تعيين المستخدم الحالي أولاً
    await setCurrentUser(uid);
    
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('user_uid', uid)
    
    if (error) throw error
    
    return true
    
  } catch (error) {
    console.error('❌ خطأ في حذف العضو:', error)
    throw new Error(`فشل في حذف العضو: ${error.message}`)
  }
}

// ===========================================================================
// خدمات الشجرة الموحدة - للمستقبل
// ===========================================================================

/**
 * جلب الشجرة الموحدة من جميع المستخدمين
 * @returns {Array} قائمة أفراد العائلة من جميع المستخدمين
 */
export const fetchUnifiedFamilyTree = async () => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        *,
        user:users(uid, phone_number)
      `)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return data || []
    
  } catch (error) {
    console.error('❌ خطأ في جلب الشجرة الموحدة:', error)
    throw new Error(`فشل في جلب الشجرة الموحدة: ${error.message}`)
  }
}

/**
 * البحث في الشجرة الموحدة
 * @param {string} searchTerm - مصطلح البحث
 * @returns {Array} نتائج البحث
 */
export const searchUnifiedFamilyTree = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        *,
        user:users(uid, phone_number)
      `)
      .or(`first_name.ilike.%${searchTerm}%,father_name.ilike.%${searchTerm}%,grandfather_name.ilike.%${searchTerm}%,surname.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return data || []
    
  } catch (error) {
    console.error('❌ خطأ في البحث في الشجرة:', error)
    throw new Error(`فشل في البحث في الشجرة: ${error.message}`)
  }
}
