# دليل التشغيل - شجرة العائلة مع Supabase

## 🚀 خطوات التشغيل السريع

### 1. تثبيت المتطلبات
```bash
npm install
```

### 2. إعداد متغيرات البيئة
انسخ ملف `.env.example` إلى `.env` وملء القيم:

```bash
cp .env.example .env
```

املأ القيم في ملف `.env`:

```env
# Firebase (للمصادقة والتخزين - بدون تغيير)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id

# Supabase (للبيانات - جديد)
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. إعداد قاعدة البيانات في Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. أنشئ مشروع جديد
3. اذهب إلى **SQL Editor**
4. نفذ الكود الموجود في `database-setup/supabase-schema.sql`

### 4. التشغيل
```bash
# للتطوير
npm run dev

# للبناء
npm run build

# للمعاينة بعد البناء
npm run preview
```

## 🔧 استكشاف الأخطاء

### خطأ متغيرات البيئة
```
Error: Invalid API key or URL
```
**الحل:**
1. تأكد من ملء جميع متغيرات البيئة في `.env`
2. أعد تشغيل الخادم: `npm run dev`

### خطأ قاعدة البيانات
```
Error: relation "users" does not exist
```
**الحل:**
1. تأكد من تنفيذ `supabase-schema.sql` في Supabase
2. تحقق من أن الجداول تم إنشاؤها بنجاح

### خطأ الصلاحيات
```
Error: Row Level Security policy violation
```
**الحل:**
1. تأكد من تفعيل RLS في Supabase
2. تحقق من أن المستخدم مسجل دخول عبر Firebase

### لا تظهر البيانات
**الحل:**
1. تحقق من المصادقة عبر Firebase
2. تأكد من أن `uid` صحيح في قاعدة البيانات
3. افتح Developer Tools وتحقق من الأخطاء في Console

## 📁 هيكل المشروع المُحدث

```
src/
├── supabase/                 # خدمات Supabase (جديد)
│   ├── config.js            # إعداد Supabase
│   ├── database.js          # عمليات قاعدة البيانات
│   └── test-connection.js   # اختبار الاتصال
├── services/                # خدمات التطبيق (محدث)
│   └── familyService.js     # خدمات العائلة مع Supabase
├── firebase/                # Firebase (بدون تغيير)
│   ├── config.js            # إعداد Firebase
│   └── auth.js              # خدمات المصادقة
└── ...                      # باقي الملفات
```

## 🔄 الهجرة من Firestore

إذا كان لديك بيانات في Firestore وتريد نقلها:

### 1. تصدير البيانات من Firestore
```javascript
// هذا الكود للمطورين فقط
import { collection, getDocs } from 'firebase/firestore';

const exportFirestoreData = async () => {
  // استخراج المستخدمين
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));
  
  // استخراج أفراد العائلة
  const familyData = [];
  for (const user of users) {
    const familySnap = await getDocs(collection(db, 'users', user.id, 'family'));
    familySnap.docs.forEach(doc => {
      familyData.push({
        user_uid: user.id,
        ...doc.data()
      });
    });
  }
  
  console.log('Users:', users);
  console.log('Family Members:', familyData);
};
```

### 2. استيراد البيانات إلى Supabase
```javascript
// نفذ هذا في Supabase SQL Editor بعد تعديل البيانات
INSERT INTO users (uid, phone_number, created_at)
VALUES ('firebase_uid', '+9647xxxxxxxx', NOW());

INSERT INTO family_members (user_uid, first_name, father_name, ...)
VALUES ('firebase_uid', 'الاسم', 'اسم الأب', ...);
```

## 🎯 الميزات الجديدة

### البحث المتقدم
```javascript
import { searchInUnifiedFamilyTree } from '../services/familyService.js';
const results = await searchInUnifiedFamilyTree('أحمد');
```

### الشجرة الموحدة
```javascript
import { loadUnifiedFamilyTree } from '../services/familyService.js';
const unifiedTree = await loadUnifiedFamilyTree();
```

### التحقق من البيانات
```javascript
import { validateMemberData } from '../services/familyService.js';
const validation = validateMemberData(memberData);
if (!validation.isValid) {
  console.error('أخطاء:', validation.errors);
}
```

## 📞 الدعم

للحصول على المساعدة:
1. راجع الأخطاء في Developer Console
2. تحقق من ملف `docs/SUPABASE_SETUP.md`
3. راجع [وثائق Supabase](https://supabase.com/docs)
4. راجع [وثائق Firebase](https://firebase.google.com/docs)
