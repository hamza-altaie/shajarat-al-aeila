-- =========================================
-- Supabase Schema for Shajarat Al-Aeila
-- =========================================
-- هذا الملف يحتوي على البنية الكاملة لقاعدة البيانات

-- 1. جدول الأشخاص
CREATE TABLE IF NOT EXISTS persons (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  father_name TEXT,
  family_name TEXT,
  gender TEXT CHECK (gender IN ('M', 'F')),
  is_root BOOLEAN DEFAULT FALSE,
  created_by TEXT, -- Firebase UID (نوع TEXT)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول العلاقات (parent-child)
CREATE TABLE IF NOT EXISTS relations (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES persons(id) ON DELETE CASCADE,
  child_id BIGINT REFERENCES persons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- 3. الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_persons_created_by ON persons(created_by);
CREATE INDEX IF NOT EXISTS idx_persons_is_root ON persons(is_root);
CREATE INDEX IF NOT EXISTS idx_relations_parent ON relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_relations_child ON relations(child_id);

-- 4. تعطيل RLS للتطوير (يمكن تفعيله لاحقاً)
ALTER TABLE persons DISABLE ROW LEVEL SECURITY;
ALTER TABLE relations DISABLE ROW LEVEL SECURITY;

-- =========================================
-- ملاحظات مهمة:
-- =========================================
-- 1. created_by من نوع TEXT لأن Firebase UID ليس UUID
-- 2. gender: 'M' = ذكر, 'F' = أنثى
-- 3. is_root: true فقط لرب العائلة
-- 4. العلاقات تُحذف تلقائياً عند حذف الشخص (CASCADE)
