# دليل إعداد Supabase

تم تحديث المشروع لاستخدام **Supabase** كقاعدة بيانات بدلاً من Firestore، مع الاحتفاظ بـ Firebase للمصادقة والتخزين.

## خطوات الإعداد

### 1. إنشاء مشروع Supabase

1. اذهب إلى [Supabase.com](https://supabase.com)
2. أنشئ حساب جديد أو سجل دخول
3. اضغط على "New Project"
4. اختر اسماً للمشروع وكلمة مرور قوية لقاعدة البيانات
5. اختر المنطقة الأقرب إليك

### 2. إعداد قاعدة البيانات

1. في لوحة تحكم Supabase، اذهب إلى **SQL Editor**
2. انسخ محتوى ملف `database-setup/supabase-schema.sql`
3. الصق الكود في SQL Editor واضغط **RUN**
4. تأكد من إنشاء الجداول بنجاح

### 3. الحصول على مفاتيح الـ API

1. في لوحة تحكم Supabase، اذهب إلى **Settings** > **API**
2. انسخ:
   - **Project URL** 
   - **anon public key**

### 4. إعداد متغيرات البيئة

1. انسخ ملف `.env.example` إلى `.env`
2. املأ القيم التالية:

```env
# Supabase
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. إعداد المصادقة (Firebase + Supabase)

يتم استخدام Firebase للمصادقة وSupabase لتخزين البيانات. تأكد من:

1. تفعيل Row Level Security (RLS) في Supabase
2. المصادقة عبر Firebase تعمل بشكل صحيح
3. يتم ربط `uid` من Firebase مع جدول `users` في Supabase

## هيكل قاعدة البيانات

### جدول `users`
- `id`: المفتاح الأساسي
- `uid`: معرف المستخدم من Firebase (فريد)
- `phone_number`: رقم الهاتف
- `created_at` / `updated_at`: طوابع زمنية

### جدول `family_members` 
- `id`: المفتاح الأساسي (UUID)
- `user_uid`: مرجع للمستخدم المالك
- `first_name`, `father_name`, `grandfather_name`, `surname`: الأسماء
- `birthdate`: تاريخ الميلاد
- `relation`: العلاقة العائلية
- `parent_id`: مرجع للوالد في نفس الجدول
- `avatar`: رابط الصورة الشخصية
- `manual_parent_name`: اسم الوالد المدخل يدوياً
- `linked_parent_uid`: ربط بمستخدم آخر

## الميزات الجديدة

### 1. الشجرة الموحدة
يمكن الآن بناء شجرة عائلة موحدة من عدة مستخدمين:

```javascript
import { loadUnifiedFamilyTree } from '../services/familyService.js';

const unifiedTree = await loadUnifiedFamilyTree();
```

### 2. البحث المتقدم
بحث سريع في جميع أفراد العائلة:

```javascript
import { searchInUnifiedFamilyTree } from '../services/familyService.js';

const results = await searchInUnifiedFamilyTree('أحمد');
```

### 3. أمان محسن
- Row Level Security (RLS)
- كل مستخدم يرى بياناته فقط
- إمكانية فتح الشجرة للعرض العام لاحقاً

## استكشاف الأخطاء

### خطأ الاتصال بـ Supabase
```
Error: Invalid API key or URL
```
**الحل**: تأكد من صحة `REACT_APP_SUPABASE_URL` و `REACT_APP_SUPABASE_ANON_KEY`

### خطأ الصلاحيات
```
Error: Row Level Security policy violation
```
**الحل**: تأكد من تشغيل SQL script بالكامل وتفعيل RLS

### عدم ظهور البيانات
**الحل**: تأكد من أن `uid` في Firebase يطابق `user_uid` في Supabase

## التطوير المستقبلي

### ربط المستخدمين
يمكن ربط أفراد العائلة من مستخدمين مختلفين عبر:
```sql
UPDATE family_members 
SET linked_parent_uid = 'firebase_uid_of_parent' 
WHERE id = 'member_id';
```

### إحصائيات متقدمة
```javascript
-- عدد أفراد العائلة لكل مستخدم
SELECT user_uid, COUNT(*) as family_count 
FROM family_members 
GROUP BY user_uid;
```

## دعم

للحصول على المساعدة:
1. راجع ملفات الـ logs في console المتصفح
2. تأكد من إعداد متغيرات البيئة
3. راجع [وثائق Supabase](https://supabase.com/docs)
