-- ======================================
-- سياسات Row Level Security (RLS) لـ Supabase
-- ======================================
-- ⚠️ مهم: شغّل هذا الملف في Supabase SQL Editor قبل الإنتاج

-- ======================================
-- 1. تفعيل RLS على الجداول
-- ======================================

ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marriages ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_audit_log ENABLE ROW LEVEL SECURITY;

-- ======================================
-- 2. سياسات جدول tribes (القبائل)
-- ======================================

-- القراءة: الجميع يمكنهم رؤية القبائل
CREATE POLICY "tribes_select_all" ON tribes
  FOR SELECT TO public
  USING (true);

-- التعديل: الأدمن فقط
CREATE POLICY "tribes_update_admin" ON tribes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = tribes.id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role = 'admin'
    )
  );

-- ======================================
-- 3. سياسات جدول tribe_users (أعضاء القبيلة)
-- ======================================

-- القراءة: أعضاء القبيلة فقط
CREATE POLICY "tribe_users_select_members" ON tribe_users
  FOR SELECT TO authenticated
  USING (
    firebase_uid = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tribe_users tu 
      WHERE tu.tribe_id = tribe_users.tribe_id 
      AND tu.firebase_uid = auth.uid()::text
    )
  );

-- الإدراج: أي مستخدم مصادق يمكنه الانضمام
CREATE POLICY "tribe_users_insert_self" ON tribe_users
  FOR INSERT TO authenticated
  WITH CHECK (firebase_uid = auth.uid()::text);

-- التحديث: المستخدم يحدث بياناته فقط أو الأدمن
CREATE POLICY "tribe_users_update_self_or_admin" ON tribe_users
  FOR UPDATE TO authenticated
  USING (
    firebase_uid = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tribe_users tu 
      WHERE tu.tribe_id = tribe_users.tribe_id 
      AND tu.firebase_uid = auth.uid()::text
      AND tu.role = 'admin'
    )
  );

-- ======================================
-- 4. سياسات جدول persons (الأشخاص)
-- ======================================

-- القراءة: أعضاء القبيلة يمكنهم رؤية أشخاص قبيلتهم
CREATE POLICY "persons_select_tribe_members" ON persons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = persons.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.status = 'active'
    )
  );

-- الإدراج: أعضاء القبيلة النشطون (غير viewers)
CREATE POLICY "persons_insert_contributors" ON persons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = persons.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.status = 'active'
      AND tribe_users.role != 'viewer'
    )
    AND created_by = auth.uid()::text
  );

-- التحديث: من أنشأ الشخص أو الأدمن/المشرف
CREATE POLICY "persons_update_owner_or_admin" ON persons
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = persons.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role IN ('admin', 'moderator')
    )
  );

-- الحذف: من أنشأ الشخص أو الأدمن
CREATE POLICY "persons_delete_owner_or_admin" ON persons
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = persons.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role = 'admin'
    )
  );

-- ======================================
-- 5. سياسات جدول relations (العلاقات)
-- ======================================

-- القراءة: أعضاء القبيلة
CREATE POLICY "relations_select_tribe_members" ON relations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = relations.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
    )
  );

-- الإدراج: المساهمون فقط
CREATE POLICY "relations_insert_contributors" ON relations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = relations.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role != 'viewer'
    )
    AND created_by = auth.uid()::text
  );

-- الحذف: من أنشأ العلاقة أو الأدمن
CREATE POLICY "relations_delete_owner_or_admin" ON relations
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = relations.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role = 'admin'
    )
  );

-- ======================================
-- 6. سياسات جدول marriages (الزواج)
-- ======================================

CREATE POLICY "marriages_select_tribe_members" ON marriages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = marriages.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
    )
  );

CREATE POLICY "marriages_insert_contributors" ON marriages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = marriages.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role != 'viewer'
    )
  );

-- ======================================
-- 7. سياسات سجل التدقيق (للقراءة فقط)
-- ======================================

CREATE POLICY "audit_log_select_admin" ON person_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tribe_users 
      WHERE tribe_users.tribe_id = person_audit_log.tribe_id 
      AND tribe_users.firebase_uid = auth.uid()::text
      AND tribe_users.role IN ('admin', 'moderator')
    )
  );

-- ======================================
-- 8. ملاحظات مهمة
-- ======================================
-- 
-- ⚠️ قبل تشغيل هذا الملف:
-- 1. تأكد من وجود دالة auth.uid() في Supabase
-- 2. Firebase UID يُرسل عبر JWT custom claims
-- 3. اختبر السياسات في بيئة التطوير أولاً
--
-- 🔧 لتعطيل RLS مؤقتاً (للتطوير فقط):
-- ALTER TABLE persons DISABLE ROW LEVEL SECURITY;
--
-- 📖 التوثيق:
-- https://supabase.com/docs/guides/auth/row-level-security
