// src/supabase/config.js
import { createClient } from '@supabase/supabase-js'

// ✅ قيم Supabase الصحيحة
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hxqnftgasyhfscguxpxz.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cW5mdGdhc3loZnNjZ3V4cHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNzU2MzEsImV4cCI6MjA2OTc1MTYzMX0.Pzn0jgHe2jlrUYPSCozD6e_valyColl0feAeYnCR0nA'

// إنشاء عميل Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// تصدير الكونفيجريشن للاستخدام في حالة الحاجة
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
}
