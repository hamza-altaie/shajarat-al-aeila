# 🌳 تطبيق شجرة العائلة

تطبيق ويب متقدم لإنشاء وإدارة شجرة العائلة باستخدام React و Firebase.

## 🚀 الميزات الرئيسية

- ✨ **واجهة حديثة ومتجاوبة** مع Material-UI
- 🔐 **مصادقة آمنة** برقم الهاتف عبر Firebase
- 🌳 **شجرة عائلة تفاعلية** مع react-d3-tree
- 📊 **إحصائيات وتحليلات متقدمة**
- 🔍 **بحث ذكي** في أفراد العائلة
- 📱 **PWA متقدم** يعمل دون اتصال
- 🎨 **تصدير متعدد الصيغ** (صورة، JSON، CSV)
- 🔗 **ربط العائلات** وإدارة العلاقات

## 🔧 المتطلبات

- Node.js 18.0.0 أو أحدث
- npm أو yarn
- حساب Firebase مع إعداد Authentication و Firestore

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

```bash
# انسخ ملف المتغيرات البيئية
cp .env.example .env

# حرر الملف وأدخل بيانات Firebase الخاصة بك
nano .env
```

### 4. تشغيل الخادم المحلي

```bash
npm run dev
# أو
yarn dev
```

سيعمل التطبيق على `http://localhost:5173`

## 🛠️ إصلاح المشاكل الشائعة

### مشكلة SyntaxError و undefined identifier

إذا واجهت أخطاء في الكونسول، اتبع هذه الخطوات:

1. **استبدال الملفات المُصححة:**
   ```bash
   # استبدل الملفات التالية بالإصدارات المُصححة
   src/hooks/useAdvancedFamilyGraph.js
   src/utils/AdvancedFamilyGraph.js
   src/App.jsx
   src/main.jsx
   src/ProtectedRoute.jsx
   src/components/FamilyTreeAdvanced.jsx
   ```

2. **مسح ذاكرة التخزين المؤقت:**
   ```bash
   # مسح node_modules وإعادة التثبيت
   rm -rf node_modules package-lock.json
   npm install
   
   # مسح ذاكرة Vite
   npm run dev -- --force
   ```

3. **مسح ذاكرة المتصفح:**
   - افتح Developer Tools (F12)
   - انقر بزر الماوس الأيمن على زر Refresh
   - اختر "Empty Cache and Hard Reload"

4. **فحص متغيرات البيئة:**
   ```bash
   # تأكد من أن ملف .env موجود ويحتوي على البيانات الصحيحة
   cat .env
   ```

### مشاكل Firebase

```bash
# تأكد من تسجيل الدخول إلى Firebase CLI
firebase login

# تهيئة المشروع إذا لزم الأمر
firebase init
```

### مشاكل الشبكة أو CORS

أضف هذا إلى `vite.config.js`:

```javascript
server: {
  cors: true,
  proxy: {
    '/api': {
      target: 'https://your-firebase-project.firebaseapp.com',
      changeOrigin: true
    }
  }
}
```

## 📁 هيكل المشروع

```
src/
├── components/          # المكونات القابلة لإعادة الاستخدام
│   ├── FamilyTreeAdvanced.jsx
│   ├── AdvancedFamilyFeatures.jsx
│   └── FamilySelectionPage.jsx
├── pages/              # صفحات التطبيق
│   ├── PhoneLogin.jsx
│   ├── Family.jsx
│   ├── FamilyTree.jsx
│   ├── FamilySelection.jsx
│   └── PrivacyPolicy.jsx
├── hooks/              # React Hooks مخصصة
│   ├── useAdvancedFamilyGraph.js
│   └── usePhoneAuth.js
├── utils/              # أدوات مساعدة
│   └── AdvancedFamilyGraph.js
├── contexts/           # React Contexts
│   └── FamilyTreeContext.jsx
├── firebase/           # إعدادات Firebase
│   ├── config.js
│   ├── auth.js
│   └── storage.js
├── App.jsx             # المكون الرئيسي
├── main.jsx           # نقطة دخول التطبيق
└── ProtectedRoute.jsx  # حماية المسارات
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
# البناء والنشر
npm run build
firebase deploy --only hosting

# أو استخدم الأمر المختصر
npm run deploy
```

## 🔒 الأمان والخصوصية

- 🔐 **مصادقة آمنة** باستخدام Firebase Authentication
- 🛡️ **قواعد Firestore محكمة** تمنع الوصول غير المصرح
- 🚫 **عدم تخزين كلمات مرور** - المصادقة برقم الهاتف فقط
- 🔒 **تشفير البيانات** في النقل والتخزين
- 📱 **التحقق بـ reCAPTCHA** لمنع الروبوتات

## 🎨 التخصيص

### تغيير الألوان

حرر `src/App.jsx` وابحث عن `createAppTheme`:

```javascript
palette: {
  primary: {
    main: '#2e7d32', // اللون الأساسي
    light: '#4caf50',
    dark: '#1b5e20'
  }
}
```

### إضافة لغات جديدة

1. أضف ملفات الترجمة في `src/locales/`
2. حرر `src/i18n/index.js`
3. أضف خيار اللغة في إعدادات التطبيق

## 🐛 الإبلاغ عن المشاكل

إذا واجهت أي مشاكل:

1. تأكد من اتباع تعليمات الإصلاح أعلاه
2. فحص الكونسول للأخطاء
3. أنشئ Issue جديد في GitHub مع:
   - وصف المشكلة
   - خطوات إعادة الإنتاج
   - لقطة شاشة إن أمكن
   - معلومات البيئة (نوع المتصفح، نسخة Node.js)

## 🤝 المساهمة

نرحب بالمساهمات! اتبع هذه الخطوات:

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push إلى Branch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

## 📄 الرخصة

هذا المشروع مرخص تحت [MIT License](LICENSE).

## 🙏 شكر وتقدير

- [React](https://reactjs.org/) - مكتبة واجهة المستخدم
- [Material-UI](https://mui.com/) - مكونات التصميم
- [Firebase](https://firebase.google.com/) - منصة التطوير
- [react-d3-tree](https://github.com/bkrem/react-d3-tree) - عرض الشجرة
- [Vite](https://vitejs.dev/) - أداة البناء

## 📞 الدعم

للحصول على المساعدة:

- 📧 **البريد الإلكتروني**: support@family-tree-app.com
- 💬 **Discord**: [رابط الخادم](https://discord.gg/family-tree)
- 📖 **الوثائق**: [docs.family-tree-app.com](https://docs.family-tree-app.com)

---

**صُنع بـ ❤️ لخدمة العائلات العربية**