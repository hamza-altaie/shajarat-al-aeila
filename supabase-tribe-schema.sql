-- ======================================
-- Schema لشجرة القبيلة الموسعة
-- ======================================

-- 1. جدول القبائل (Tribes)
CREATE TABLE IF NOT EXISTS tribes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  founder_person_id BIGINT, -- مؤسس القبيلة (سيتم ربطه بـ persons)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  logo_url TEXT,
  location TEXT,
  established_year INTEGER,
  UNIQUE(name)
);

-- 2. جدول المستخدمين المساهمين (Contributors)
CREATE TABLE IF NOT EXISTS tribe_users (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  firebase_uid TEXT NOT NULL, -- من Firebase Auth
  role TEXT NOT NULL DEFAULT 'contributor', -- roles: admin, moderator, contributor, viewer
  person_id BIGINT, -- ربط المستخدم بشخص في الشجرة (اختياري)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- active, pending, blocked
  phone TEXT,
  display_name TEXT,
  UNIQUE(tribe_id, firebase_uid)
);

-- 3. تحديث جدول الأشخاص (Persons) - مشترك بين الكل
DROP TABLE IF EXISTS persons CASCADE;
CREATE TABLE persons (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  
  -- البيانات الأساسية
  first_name TEXT NOT NULL,
  father_name TEXT,
  grandfather_name TEXT,
  family_name TEXT,
  
  -- المعلومات
  gender TEXT CHECK (gender IN ('M', 'F')),
  relation TEXT, -- رب العائلة، ابن، بنت، والد، جد، إلخ
  birth_date DATE,
  death_date DATE,
  is_alive BOOLEAN DEFAULT TRUE,
  
  -- الموقع والتواصل
  location TEXT,
  phone TEXT,
  email TEXT,
  
  -- معلومات إضافية
  occupation TEXT,
  education TEXT,
  bio TEXT,
  notes TEXT,
  
  -- الصور
  photo_url TEXT,
  
  -- المساهمات
  created_by TEXT NOT NULL, -- Firebase UID للمضيف
  updated_by TEXT, -- آخر من عدّل
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- العلاقات الهرمية
  is_root BOOLEAN DEFAULT FALSE,
  generation INTEGER DEFAULT 0 -- الجيل (0 = الجد الأكبر)
);

-- 4. جدول العلاقات (Relations) - والد-ابن
DROP TABLE IF EXISTS relations CASCADE;
CREATE TABLE relations (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  parent_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  child_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- منع التكرار
  UNIQUE(parent_id, child_id),
  
  -- منع الشخص من أن يكون والد نفسه
  CHECK (parent_id != child_id)
);

-- 5. جدول الزواج (Marriages) - علاقات الأزواج
CREATE TABLE IF NOT EXISTS marriages (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  husband_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  wife_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  marriage_date DATE,
  divorce_date DATE,
  status TEXT DEFAULT 'married', -- married, divorced, widowed
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(husband_id, wife_id)
);

-- 6. جدول سجل التعديلات (Audit Log)
CREATE TABLE IF NOT EXISTS person_audit_log (
  id BIGSERIAL PRIMARY KEY,
  tribe_id BIGINT NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  person_id BIGINT REFERENCES persons(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- create, update, delete
  changed_by TEXT NOT NULL, -- Firebase UID
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB,
  notes TEXT
);

-- 7. الفهارس (Indexes) للأداء
CREATE INDEX IF NOT EXISTS idx_persons_tribe_id ON persons(tribe_id);
CREATE INDEX IF NOT EXISTS idx_persons_created_by ON persons(created_by);
CREATE INDEX IF NOT EXISTS idx_persons_first_name ON persons(first_name);
CREATE INDEX IF NOT EXISTS idx_persons_generation ON persons(generation);
CREATE INDEX IF NOT EXISTS idx_relations_parent ON relations(parent_id);
CREATE INDEX IF NOT EXISTS idx_relations_child ON relations(child_id);
CREATE INDEX IF NOT EXISTS idx_relations_tribe ON relations(tribe_id);
CREATE INDEX IF NOT EXISTS idx_marriages_tribe ON marriages(tribe_id);
CREATE INDEX IF NOT EXISTS idx_tribe_users_firebase ON tribe_users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_tribe_users_tribe ON tribe_users(tribe_id);

-- 8. دوال مساعدة (Helper Functions)

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على الجداول
DROP TRIGGER IF EXISTS update_persons_updated_at ON persons;
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tribes_updated_at ON tribes;
CREATE TRIGGER update_tribes_updated_at
  BEFORE UPDATE ON tribes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. بيانات أولية (Default Tribe)
-- إنشاء قبيلة افتراضية
INSERT INTO tribes (name, name_en, description)
VALUES ('قبيلة الطائي', 'Al-Taei Tribe', 'شجرة قبيلة الطائي الموسعة')
ON CONFLICT (name) DO NOTHING;

-- 10. ملاحظات
-- RLS (Row Level Security) معطل مؤقتاً للتطوير
-- سيتم تفعيله لاحقاً مع الصلاحيات

-- عرض الجداول المنشأة
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
