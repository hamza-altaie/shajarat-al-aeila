# دليل التشغيل - شجرة العائلة مع Firebase Firestore

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
# Firebase (للمصادقة وقاعدة البيانات والتخزين)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. إعداد Firebase Firestore

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. أنشئ مشروع جديد أو استخدم موجود
3. فعّل **Firestore Database**
4. فعّل **Authentication** واختر **Phone Authentication**
5. انسخ محتوى ملف `firestore.rules` إلى Firebase Console > Firestore > Rules

### 4. التشغيل
```bash
# للتطوير
npm run dev

# للبناء
npm run build

# للمعاينة بعد البناء
npm run preview
```

### 5. اختبار الاتصال
يمكنك اختبار الاتصال مع Firestore عبر الرابط:
```
http://localhost:5175/firestore-test
```

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد أو استخدم مشروع موجود
3. فعّل **Authentication** و **Firestore Database**
4. انسخ بيانات التكوين إلى ملف `.env`

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
Error: Firebase configuration is missing
```
**الحل:**
1. تأكد من صحة بيانات Firebase في `.env`
2. تحقق من تفعيل Firestore في مشروع Firebase

### خطأ الصلاحيات
```
Error: Missing or insufficient permissions
```
**الحل:**
1. تأكد من إعداد قواعد الأمان في Firestore
2. تحقق من أن المستخدم مسجل دخول

### لا تظهر البيانات
**الحل:**
1. تحقق من المصادقة عبر Firebase
2. تأكد من أن `uid` صحيح في قاعدة البيانات
3. افتح Developer Tools وتحقق من الأخطاء في Console

## 📁 هيكل المشروع المُحدث

```
src/
├── services/                # خدمات التطبيق
│   ├── familyService.js     # خدمات العائلة مع Firebase
│   └── userService.js       # خدمات المستخدمين
├── firebase/                # Firebase
│   ├── config.js            # إعداد Firebase
│   └── auth.js              # خدمات المصادقة
├── components/              # مكونات الواجهة
├── pages/                   # صفحات التطبيق
└── ...                      # باقي الملفات
```

## 🎯 الميزات المتاحة

### إدارة العائلة
```javascript
import { loadFamily, saveFamilyMemberData } from '../services/familyService.js';

// جلب أفراد العائلة
const familyMembers = await loadFamily(userUid);

// حفظ عضو جديد
const savedMember = await saveFamilyMemberData(userUid, memberData);
```

### البحث في البيانات
```javascript
import { searchInUnifiedFamilyTree } from '../services/familyService.js';
const results = await searchInUnifiedFamilyTree('أحمد');
```

### التحقق من البيانات
```javascript
import { validateMemberData } from '../services/familyService.js';
const validation = validateMemberData(memberData);
if (!validation.isValid) {
  console.error('أخطاء:', validation.errors);
}
```

### حساب الأعمار
```javascript
import { calculateAge } from '../services/familyService.js';
const age = calculateAge('1990-01-01');
console.log(age); // "34 سنة"
```

## 📞 الدعم

للحصول على المساعدة:
1. راجع الأخطاء في Developer Console
2. تحقق من إعدادات Firebase
3. راجع [وثائق Firebase](https://firebase.google.com/docs)
4. راجع [وثائق React](https://react.dev/)
