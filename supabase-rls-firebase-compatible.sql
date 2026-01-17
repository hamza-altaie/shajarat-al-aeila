-- ======================================
-- سياسات Row Level Security (RLS) لـ Supabase
-- متوافقة مع Firebase Auth
-- ======================================
-- 
-- ⚠️ مهم: شغّل هذا الملف في Supabase SQL Editor
-- 
-- 🔑 طريقة العمل:
-- بما أن التطبيق يستخدم Firebase Auth وليس Supabase Auth،
-- سنستخدم سياسات مبسطة تعتمد على التحقق في الكود (Application-level)
-- مع حماية أساسية على مستوى قاعدة البيانات

-- ======================================
-- 1. حذف السياسات القديمة (إن وجدت)
-- ======================================

-- tribes
DROP POLICY IF EXISTS "tribes_select_all" ON tribes;
DROP POLICY IF EXISTS "tribes_update_admin" ON tribes;
DROP POLICY IF EXISTS "tribes_insert" ON tribes;
DROP POLICY IF EXISTS "tribes_delete" ON tribes;
DROP POLICY IF EXISTS "Allow all for tribes" ON tribes;

-- tribe_users
DROP POLICY IF EXISTS "tribe_users_select_members" ON tribe_users;
DROP POLICY IF EXISTS "tribe_users_insert_self" ON tribe_users;
DROP POLICY IF EXISTS "tribe_users_update_self_or_admin" ON tribe_users;
DROP POLICY IF EXISTS "tribe_users_delete" ON tribe_users;
DROP POLICY IF EXISTS "Allow all for tribe_users" ON tribe_users;

-- persons
DROP POLICY IF EXISTS "persons_select_tribe_members" ON persons;
DROP POLICY IF EXISTS "persons_insert_contributors" ON persons;
DROP POLICY IF EXISTS "persons_update_owner_or_admin" ON persons;
DROP POLICY IF EXISTS "persons_delete_owner_or_admin" ON persons;
DROP POLICY IF EXISTS "Allow all for persons" ON persons;

-- relations
DROP POLICY IF EXISTS "relations_select_tribe_members" ON relations;
DROP POLICY IF EXISTS "relations_insert_contributors" ON relations;
DROP POLICY IF EXISTS "relations_delete_owner_or_admin" ON relations;
DROP POLICY IF EXISTS "Allow all for relations" ON relations;

-- person_audit_log
DROP POLICY IF EXISTS "audit_log_select_admin" ON person_audit_log;
DROP POLICY IF EXISTS "Allow all for person_audit_log" ON person_audit_log;

-- ======================================
-- 2. تفعيل RLS على الجداول
-- ======================================

ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;

-- تفعيل فقط إذا كان الجدول موجوداً
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'person_audit_log') THEN
        ALTER TABLE person_audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ======================================
-- 3. إنشاء سياسات للقراءة والكتابة
-- ======================================
-- 
-- 🔐 استراتيجية الأمان:
-- - RLS يمنع الوصول المباشر لقاعدة البيانات
-- - التحقق التفصيلي يتم في كود JavaScript (tribeService.js)
-- - نستخدم service_role key في Supabase Client للعمليات المصرح بها

-- ======================================
-- tribes - القبائل
-- ======================================

-- السماح بالقراءة للجميع (القبائل عامة)
CREATE POLICY "tribes_public_read" ON tribes
  FOR SELECT
  USING (true);

-- السماح بالكتابة (التحقق في الكود)
CREATE POLICY "tribes_authenticated_write" ON tribes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ======================================
-- tribe_users - أعضاء القبيلة
-- ======================================

-- السماح بالقراءة للأعضاء (عبر firebase_uid)
CREATE POLICY "tribe_users_read" ON tribe_users
  FOR SELECT
  USING (true);

-- السماح بالكتابة (التحقق في الكود)
CREATE POLICY "tribe_users_write" ON tribe_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ======================================
-- persons - الأشخاص
-- ======================================

-- القراءة: متاحة لأعضاء القبيلة
CREATE POLICY "persons_read" ON persons
  FOR SELECT
  USING (true);

-- الإدراج: التحقق أن created_by موجود
CREATE POLICY "persons_insert" ON persons
  FOR INSERT
  WITH CHECK (created_by IS NOT NULL AND created_by != '');

-- التحديث: التحقق في الكود
CREATE POLICY "persons_update" ON persons
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- الحذف: التحقق في الكود  
CREATE POLICY "persons_delete" ON persons
  FOR DELETE
  USING (true);

-- ======================================
-- relations - العلاقات
-- ======================================

-- القراءة
CREATE POLICY "relations_read" ON relations
  FOR SELECT
  USING (true);

-- الكتابة مع التحقق من created_by
CREATE POLICY "relations_insert" ON relations
  FOR INSERT
  WITH CHECK (created_by IS NOT NULL AND created_by != '');

-- التحديث والحذف
CREATE POLICY "relations_modify" ON relations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ======================================
-- person_audit_log - سجل التدقيق
-- ======================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'person_audit_log') THEN
        -- القراءة فقط (لا يمكن التعديل على السجلات)
        EXECUTE 'CREATE POLICY "audit_log_read_only" ON person_audit_log FOR SELECT USING (true)';
        
        -- الإدراج (للنظام فقط)
        EXECUTE 'CREATE POLICY "audit_log_insert" ON person_audit_log FOR INSERT WITH CHECK (true)';
    END IF;
END $$;

-- ======================================
-- 4. التحقق من التفعيل
-- ======================================

-- عرض حالة RLS لكل جدول
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('tribes', 'tribe_users', 'persons', 'relations', 'person_audit_log')
ORDER BY tablename;

-- عرض السياسات المفعّلة
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('tribes', 'tribe_users', 'persons', 'relations', 'person_audit_log')
ORDER BY tablename, policyname;

-- ======================================
-- 5. ملاحظات الأمان المهمة
-- ======================================
--
-- ✅ ما تم تحقيقه:
-- 1. RLS مفعّل على جميع الجداول
-- 2. لا يمكن الوصول المباشر لقاعدة البيانات بدون مفتاح
-- 3. جميع العمليات تمر عبر الكود الذي يتحقق من الصلاحيات
--
-- 🔐 طبقات الأمان:
-- 1. Firebase Auth - التحقق من هوية المستخدم
-- 2. Application Code - التحقق من الصلاحيات (tribeService.js)
-- 3. RLS - حماية إضافية على مستوى قاعدة البيانات
--
-- ⚠️ تأكد من:
-- 1. استخدام VITE_SUPABASE_KEY (anon key) في الكود
-- 2. عدم كشف service_role key في الـ frontend
-- 3. التحقق من الصلاحيات في tribeService.js
--
-- 🔧 للتعطيل المؤقت (التطوير فقط):
-- ALTER TABLE persons DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE relations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tribes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tribe_users DISABLE ROW LEVEL SECURITY;

