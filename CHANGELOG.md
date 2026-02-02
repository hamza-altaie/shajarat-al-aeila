# Changelog

جميع التغييرات المهمة في هذا المشروع سيتم توثيقها في هذا الملف.

التنسيق مبني على [Keep a Changelog](https://keepachangelog.com/ar/1.0.0/)،
وهذا المشروع يلتزم بـ [Semantic Versioning](https://semver.org/lang/ar/).

---

## [1.1.0] - 2026-02-02

### Added (إضافات)
- ✅ صفحة إعدادات الحساب (`/settings`)
- ✅ ميزة حذف الحساب نهائياً (Firebase + Supabase)
- ✅ دالة `deleteUserData()` في tribeService.js
- ✅ دالة `deleteAccount()` في firebase/auth.js
- ✅ خيار "إعدادات الحساب" في قائمة الإعدادات
- ✅ Prettier configuration للتنسيق الموحد
- ✅ تحسينات Bundle Size في vite.config.js
- ✅ تقرير التدقيق الشامل (AUDIT_REPORT.md)

### Changed (تغييرات)
- ✅ تحسين تقسيم الكود (Code Splitting) في Vite
- ✅ فصل MUI Icons عن MUI Material لتقليل الحجم
- ✅ إزالة زر الإعدادات من القائمة السفلية للهاتف
- ✅ إصلاح console.log في auth.js

### Fixed (إصلاحات)
- ✅ إصلاح مشكلة collapse buttons في أجهزة iOS
- ✅ إصلاح زر الخروج من وضع fullscreen
- ✅ إصلاح infinite loop في صفحة الإحصائيات
- ✅ إصلاح حساب عدد الأجيال
- ✅ إصلاح عدد الأفراد المكرر

---

## [1.0.0] - 2026-01-15

### Added (إضافات)
- ✅ تسجيل الدخول برقم الهاتف (Firebase OTP)
- ✅ إدارة أفراد العائلة (CRUD)
- ✅ شجرة العائلة التفاعلية (D3.js)
- ✅ صفحة الإحصائيات
- ✅ لوحة تحكم المدير
- ✅ دعم الصور (Supabase Storage)
- ✅ Smart Auto-linking للعلاقات
- ✅ منع الحلقات المغلقة (Cycle Detection)
- ✅ واجهة عربية كاملة RTL
- ✅ تصميم متجاوب (Mobile-first)
- ✅ Progressive Web App (PWA)
- ✅ قائمة تنقل سفلية للهاتف
- ✅ تصدير الشجرة كصورة PNG
- ✅ البحث والفلترة
- ✅ Dark Mode Support (تلقائي)

### Technical
- React 19
- Material-UI 7
- Firebase 11 (Auth)
- Supabase (PostgreSQL)
- D3.js 7.9.0
- Vite 6
- React Router 7

---

## النوع المختلف من التغييرات

- `Added` - ميزات جديدة
- `Changed` - تغييرات في الميزات الموجودة
- `Deprecated` - ميزات ستُزال قريباً
- `Removed` - ميزات تم إزالتها
- `Fixed` - إصلاح أخطاء
- `Security` - إصلاحات أمنية

---

## التخطيط للإصدارات القادمة

### [1.2.0] - مخطط
- [ ] إضافة الاختبارات (Unit Tests)
- [ ] تحسين الأداء (Performance)
- [ ] دعم اللغة الإنجليزية
- [ ] ميزة Multi-Tribe
- [ ] إشعارات الدفع (Push Notifications)
- [ ] Export PDF للشجرة
- [ ] Timeline للأحداث العائلية

---

**ملاحظات:**
- التواريخ بصيغة YYYY-MM-DD
- الروابط للإصدارات تُضاف عند النشر على GitHub Releases
