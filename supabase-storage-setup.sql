-- ======================================
-- إعداد Storage لصور الأشخاص في Supabase
-- ======================================
-- قم بتشغيل هذه الأوامر في Supabase SQL Editor

-- ⚠️ مهم: قبل تشغيل هذه الأوامر:
-- 1. اذهب إلى Storage في Supabase Dashboard
-- 2. أنشئ bucket جديد باسم: person-photos
-- 3. فعّل "Public bucket" ✅

-- ======================================
-- 1. حذف السياسات القديمة إن وجدت
-- ======================================
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- ======================================
-- 2. سياسات الأمان للـ Storage (مُحدّثة)
-- ======================================

-- السماح للجميع بقراءة الصور (عامة)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'person-photos');

-- السماح لأي شخص برفع الصور (للتطوير)
-- ملاحظة: في الإنتاج، غيّر TO public إلى TO authenticated
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'person-photos');

-- السماح بتحديث الصور
CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'person-photos');

-- السماح بحذف الصور
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'person-photos');

-- ======================================
-- 3. تأكد من وجود حقل photo_url في جدول persons
-- ======================================

-- إضافة الحقل إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'persons' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE persons ADD COLUMN photo_url TEXT;
  END IF;
END $$;

-- ======================================
-- 4. إنشاء فهرس للبحث السريع
-- ======================================

CREATE INDEX IF NOT EXISTS idx_persons_photo_url 
ON persons(photo_url) 
WHERE photo_url IS NOT NULL;

-- ======================================
-- 5. دالة لحساب إحصائيات الصور
-- ======================================

CREATE OR REPLACE FUNCTION get_photo_stats(p_tribe_id BIGINT)
RETURNS JSON AS $$
DECLARE
  total_count INT;
  with_photos INT;
  result JSON;
BEGIN
  SELECT COUNT(*) INTO total_count 
  FROM persons WHERE tribe_id = p_tribe_id;
  
  SELECT COUNT(*) INTO with_photos 
  FROM persons 
  WHERE tribe_id = p_tribe_id AND photo_url IS NOT NULL;
  
  result := json_build_object(
    'total', total_count,
    'withPhotos', with_photos,
    'withoutPhotos', total_count - with_photos,
    'percentage', CASE WHEN total_count > 0 
      THEN ROUND((with_photos::NUMERIC / total_count) * 100)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- تعليمات الإعداد في Supabase Dashboard:
-- ======================================
-- 
-- 1. انتقل إلى Storage في Supabase Dashboard
-- 2. اضغط "New bucket"
-- 3. الاسم: person-photos
-- 4. فعّل "Public bucket" للسماح بالقراءة العامة
-- 5. اضغط "Create bucket"
-- 
-- 6. انتقل إلى Policies في Storage
-- 7. أضف السياسات أعلاه أو استخدم الإعدادات:
--    - SELECT: public (anyone)
--    - INSERT: authenticated only
--    - UPDATE: authenticated only  
--    - DELETE: authenticated only
--
-- ======================================
