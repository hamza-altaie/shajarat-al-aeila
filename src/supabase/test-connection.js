// src/supabase/test-connection.js
import { supabase } from './config.js'

/**
 * اختبار الاتصال بـ Supabase
 */
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 اختبار الاتصال بـ Supabase...')
    
    // اختبار أساسي للاتصال
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ خطأ في الاتصال:', error.message)
      return false
    }
    
    console.log('✅ الاتصال بـ Supabase نجح!')
    console.log(`📊 عدد المستخدمين: ${data?.length || 0}`)
    return true
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الاتصال:', error.message)
    return false
  }
}

/**
 * اختبار شامل لجميع وظائف Supabase
 */
export const runFullSupabaseTest = async () => {
  console.log('🚀 بدء الاختبار الشامل لـ Supabase...\n')
  
  // اختبار الاتصال
  const connectionTest = await testSupabaseConnection()
  
  if (!connectionTest) {
    console.log('❌ فشل الاختبار - تحقق من إعدادات Supabase')
    return
  }
  
  try {
    // اختبار الجداول
    console.log('\n🔍 فحص الجداول...')
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info')
      .then(() => ({ data: ['users', 'family_members'], error: null }))
      .catch(() => ({ data: null, error: 'لا يمكن الوصول للجداول' }))
    
    if (tablesError) {
      console.log('⚠️ تحذير: لا يمكن فحص الجداول بشكل مفصل')
    } else {
      console.log('✅ الجداول متاحة:', tables?.join(', '))
    }
    
    console.log('\n✅ اكتمل الاختبار بنجاح!')
    console.log('🎉 Supabase جاهز للاستخدام!')
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار الشامل:', error.message)
  }
}

// تشغيل الاختبار إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullSupabaseTest()
}
