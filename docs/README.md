# 🌳 تطبيق شجرة العائلة

تطبيق ويب متقدم لإنشاء وإدارة شجرة العائلة باستخدام React وFirebase وD3.js.

## 🚀 الميزات الرئيسية
- واجهة عربية حديثة ومتجاوبة (Material-UI)
- مصادقة آمنة برقم الهاتف (Firebase Auth)
- إدارة أفراد العائلة (إضافة، تعديل، حذف)
- عرض شجرة العائلة بشكل رسومي تفاعلي وجذاب (D3.js)
- حماية الصفحات بحيث لا يمكن الوصول إلا بعد التحقق
- دعم البحث عن الأفراد مع تحسينات البحث والزووم
- دعم PWA (تشغيل دون اتصال)
- تحسينات الأداء والأنيميشن للشجرة العائلية

## 🔧 المتطلبات
- Node.js 18.0.0 أو أحدث
- npm أو yarn
- حساب Firebase مع إعداد Authentication وFirestore

## ⚡ البدء السريع

### 1. تحميل المشروع
```bash
git clone https://github.com/your-username/shajarat-al-aeila.git
cd shajarat-al-aeila
```

### 2. تثبيت الحزم
```bash
npm install
# أو
yarn install
```

### 3. إعداد متغيرات البيئة
- أنشئ ملف `.env` وضع بيانات Firebase الخاصة بك.

### 4. تشغيل الخادم المحلي
```bash
npm run dev
# أو
yarn dev
```

سيعمل التطبيق على `http://localhost:5173`

## 📁 هيكل المشروع
```
src/
├── App.jsx                # المكون الرئيسي
├── AppRoutes.jsx          # تعريف المسارات
├── AuthContext.jsx        # إدارة المصادقة
├── main.jsx               # نقطة الدخول للتطبيق
├── ProtectedRoute.jsx     # حماية المسارات
├── userService.js         # خدمات المستخدم
├── contexts/              # السياقات المشتركة
│   ├── AuthContext.js
│   ├── FamilyTreeContext.jsx
│   ├── FamilyTreeHelpers.js
│   ├── helpers.js
│   ├── sharedConstants.js
│   ├── sharedFunctions.js
│   ├── sharedHooks.js
│   └── helpers/
│       └── useSmartCache.js
├── components/            # المكونات التفاعلية
│   ├── AdvancedFamilyFeatures.jsx
│   ├── ExtendedFamilyLinking.jsx
│   ├── FamilySelectionPage.jsx
│   ├── FamilyTreeAdvanced.css
│   ├── FamilyTreeAdvanced.jsx
│   ├── ModernFamilyNodeHTML.jsx
│   ├── SearchBar.jsx
├── pages/                 # الصفحات الرئيسية
│   ├── Family.jsx
│   ├── FamilySelection.jsx
│   ├── FamilyTree.jsx
│   ├── PhoneLogin.jsx
│   └── PrivacyPolicy.jsx
├── firebase/              # إعدادات Firebase
│   ├── auth.js
│   └── config.js
├── hooks/                 # React Hooks مخصصة
│   ├── authHooks.js
│   ├── useAdvancedFamilyGraph.js
│   ├── usePhoneAuth.js
│   └── useSearchZoom.js
├── utils/                 # أدوات مساعدة
│   └── AdvancedFamilyGraph.js
public/
├── index.html             # ملف HTML الرئيسي
├── manifest.json          # ملف المانيفست للتطبيق
├── sw.js                  # Service Worker
├── tree-bg.png            # صورة الخلفية للشجرة
├── icons/                 # أيقونات التطبيق
│   ├── boy.png
│   ├── girl.png
│   └── logo.png
functions/
├── index.js               # وظائف Firebase
├── package.json           # إعدادات الوظائف
firestore-rules/
├── firestore.rules        # قواعد Firestore
```

## 🚀 البناء والنشر
### البناء للإنتاج
```bash
npm run build
# أو
yarn build
```

### معاينة البناء
```bash
npm run preview
# أو
yarn preview
```

### النشر على Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

## 🔒 الأمان والخصوصية
- مصادقة آمنة باستخدام Firebase Authentication
- قواعد Firestore محكمة
- لا يتم تخزين كلمات مرور
- تشفير البيانات في النقل والتخزين

## 🐛 الإبلاغ عن المشاكل
- تأكد من اتباع تعليمات الإصلاح أعلاه
- فحص الكونسول للأخطاء
- أنشئ Issue جديد في GitHub مع وصف المشكلة ولقطة شاشة إن أمكن

## 🤝 المساهمة
نرحب بالمساهمات! افتح Pull Request لأي تحسين أو ميزة جديدة.

## 📄 الرخصة
هذا المشروع مرخص تحت [MIT License](../LICENSE).

---
**صُنع بـ ❤️ لخدمة العائلات العربية**