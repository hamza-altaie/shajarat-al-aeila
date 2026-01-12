-- إضافة عمود اسم الأم لجدول persons
-- يستخدم للتمييز بين الأشخاص المتشابهين في الاسم

ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS mother_name TEXT;

-- إضافة تعليق للعمود
COMMENT ON COLUMN persons.mother_name IS 'اسم الأم - يستخدم للتمييز بين الأشخاص المتشابهين';
