# 🌳 تطبيق شجرة العائلة

تطبيق ويب متقدم لإنشاء وإدارة شجرة العائلة باستخدام React وFirebase وD3.js.

## 🚀 الميزات الرئيسية
- واجهة عربية حديثة ومتجاوبة (Material-UI)
- مصادقة آمنة برقم الهاتف (Firebase Auth)
- إدارة أفراد العائلة (إضافة، تعديل، حذف)
- عرض شجرة العائلة بشكل رسومي تفاعلي وجذاب (D3.js)
- حماية الصفحات بحيث لا يمكن الوصول إلا بعد التحقق
- دعم البحث عن الأفراد
- دعم PWA (تشغيل دون اتصال)

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
├── AuthContext.jsx        # سياق المصادقة
├── main.jsx               # نقطة دخول التطبيق
├── ProtectedRoute.jsx     # حماية المسارات
│
├── components/            # مكونات واجهة المستخدم
│   ├── AdvancedFamilyFeatures.jsx
│   ├── ExtendedFamilyLinking.jsx
│   ├── FamilySelectionPage.jsx
│   ├── FamilyTreeAdvanced.jsx
│   ├── FamilyTreeAdvanced.css
│   └── ModernFamilyNodeHTML.jsx
│
├── pages/                 # صفحات التطبيق
│   ├── Family.jsx
│   ├── FamilySelection.jsx
│   ├── FamilyTree.jsx
│   ├── PhoneLogin.jsx
│   └── PrivacyPolicy.jsx
│
├── hooks/                 # React Hooks مخصصة
│   ├── useAdvancedFamilyGraph.js
│   └── usePhoneAuth.js
│
├── utils/                 # أدوات مساعدة
│   └── AdvancedFamilyGraph.js
│
├── contexts/              # React Contexts
│   └── FamilyTreeContext.jsx
│
├── firebase/              # إعدادات Firebase
│   ├── config.js
│   └── auth.js
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