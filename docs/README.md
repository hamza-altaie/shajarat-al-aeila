# 🌳 شجرة العائلة (Shajarat Al-Aeila)

تطبيق ويب متقدم لإنشاء وإدارة شجرة العائلة باستخدام React وFirebase وD3.js.

## 🚀 الميزات الرئيسية
- واجهة عربية حديثة ومتجاوبة (Material-UI)
- مصادقة آمنة برقم الهاتف (Firebase Auth)
- إدارة أفراد العائلة (إضافة، تعديل، حذف)
- عرض تفاعلي وجذاب لشجرة العائلة (D3.js)
- حماية الصفحات (الدخول بعد التحقق فقط)
- بحث متقدم مع زووم وتحسينات تجربة المستخدم
- دعم PWA (تشغيل دون اتصال)
- تحسينات الأداء والأنيميشن

## 🔧 المتطلبات
- Node.js 18 أو أحدث
- npm أو yarn
- حساب Firebase مع تفعيل Authentication وFirestore

## ⚡ البدء السريع

1. **تحميل المشروع:**
   ```bash
   git clone https://github.com/your-username/shajarat-al-aeila.git
   cd shajarat-al-aeila
   ```
2. **تثبيت الحزم:**
   ```bash
   npm install
   # أو
   yarn install
   ```
3. **إعداد متغيرات البيئة:**
   - أنشئ ملف `.env` وضع بيانات Firebase الخاصة بك.
4. **تشغيل الخادم المحلي:**
   ```bash
   npm run dev
   # أو
   yarn dev
   ```
   التطبيق سيعمل على: [http://localhost:5173](http://localhost:5173)

## 📁 هيكل المشروع
```
src/
  App.jsx
  AppRoutes.jsx
  AuthContext.jsx
  main.jsx
  ProtectedRoute.jsx
  userService.js
  contexts/
    AuthContext.js
    FamilyTreeContext.jsx
    FamilyTreeHelpers.js
    helpers.js
    sharedConstants.js
    sharedFunctions.js
    sharedHooks.js
    helpers/
      useSmartCache.js
  components/
    AdvancedFamilyFeatures.jsx
    ExtendedFamilyLinking.jsx
    FamilySelectionPage.jsx
    FamilyTreeAdvanced.css
    FamilyTreeAdvanced.jsx
    ModernFamilyNodeHTML.jsx
    SearchBar.jsx
  pages/
    Family.jsx
    FamilySelection.jsx
    FamilyTree.jsx
    PhoneLogin.jsx
    PrivacyPolicy.jsx
  firebase/
    auth.js
    config.js
  hooks/
    authHooks.js
    useAdvancedFamilyGraph.js
    usePhoneAuth.js
    useSearchZoom.js
  utils/
    AdvancedFamilyGraph.js
public/
  index.html
  manifest.json
  sw.js
  tree-bg.png
  icons/
    boy.png
    girl.png
    icon-72x72.png
    icon-96x96.png
    icon-144x144.png
    icon-192x192.png
    icon-512x512.png
    logo.png
functions/
  index.js
  package.json
firestore-rules/
  firestore.rules
```

## 🚀 البناء والنشر
- **بناء للإنتاج:**
  ```bash
  npm run build
  # أو
  yarn build
  ```
- **معاينة البناء:**
  ```bash
  npm run preview
  # أو
  yarn preview
  ```
- **النشر على Firebase Hosting:**
  ```bash
  npm run build
  firebase deploy --only hosting
  ```

## 🔒 الأمان والخصوصية
- مصادقة آمنة باستخدام Firebase Authentication
- قواعد Firestore محكمة
- لا يتم تخزين كلمات مرور
- تشفير البيانات أثناء النقل والتخزين

## 🐛 الإبلاغ عن المشاكل
- تأكد من اتباع التعليمات أعلاه
- فحص الكونسول للأخطاء
- أنشئ Issue جديد في GitHub مع وصف المشكلة ولقطة شاشة إن أمكن

## 🤝 المساهمة
نرحب بالمساهمات! افتح Pull Request لأي تحسين أو ميزة جديدة.

## 📄 الرخصة
هذا المشروع مرخص تحت [MIT License](../LICENSE).

---
**صُنع بـ ❤️ لخدمة العائلات العربية**