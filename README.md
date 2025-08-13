# شجرة العائلة (Shajarat Al-Aeila)

تطبيق React.js لإدارة وعرض شجرة العائلة باللغة العربية.

## آخر التحديثات

### تنظيف المشروع من Supabase (أغسطس 2025)

تم إزالة جميع مكونات Supabase من المشروع والعودة إلى استخدام Firebase بالكامل.

#### التغييرات التقنية:
- إزالة مكتبة `@supabase/supabase-js`
- حذف مجلد `src/supabase/`
- تحديث `userService.js` و `familyService.js` لاستخدام Firebase Firestore
- حذف ملفات قاعدة البيانات `database-setup/`
- تنظيف متغيرات البيئة من مراجع Supabase

### تنظيف الكود غير المستخدم (ديسمبر 2024)

تم حذف جميع الملفات والمكونات غير المستخدمة:

#### الملفات المحذوفة:
- `src/services/` - مجلد فارغ
- `src/hooks/useAdvancedFamilyGraph.js` - hook غير مستخدم
- `src/utils/AdvancedFamilyGraph.js` - كلاس غير مستخدم
- `src/components/FamilyTreeAdvanced.jsx.backup` - ملف نسخ احتياطي
- `src/components/SearchBar.jsx` - مكون بحث غير مستخدم
- `src/components/ProductionSMSForm.jsx` - نموذج SMS غير مستخدم
- `src/components/AdvancedFamilyFeatures.jsx` - ميزات متقدمة غير مستخدمة
- `src/hooks/authHooks.js` - hooks تسجيل دخول غير مستخدمة
- `src/contexts/FamilyTreeContext.jsx` - سياق شجرة العائلة غير مستخدم
- `src/contexts/helpers/useSmartCache.js` - hook تخزين مؤقت غير مستخدم
- `src/contexts/helpers/` - مجلد فارغ

#### التحسينات في الملفات الموجودة:
- إزالة imports غير مستخدمة من `Statistics.jsx`
- تحسين حجم حزمة البناء
- تقليل وقت التجميع

### إزالة نظام ربط العائلات (ديسمبر 2024)

تم إزالة نظام ربط العائلات كاملاً من التطبيق وذلك يشمل:

#### الملفات المحذوفة:
- `src/components/FamilySelectionPage.jsx` - صفحة اختيار العائلة
- `src/pages/FamilySelection.jsx` - صفحة التحديد الرئيسية
- `src/components/ExtendedFamilyLinking.jsx` - نظام الربط المتقدم

#### التعديلات على الملفات الموجودة:
- `src/AppRoutes.jsx` - إزالة route `/family-selection`
- `src/components/FamilyTreeAdvanced.jsx` - إزالة واجهة الربط وآليات linkedFamilies
- `src/pages/Statistics.jsx` - إزالة إحصائيات الشجرة الموسعة

#### المفاهيم المزالة:
- نظام `linkedFamilies` في قاعدة البيانات
- واجهة الربط اليدوي للعائلات
- الشجرة الموسعة (Extended Tree)
- إحصائيات العائلات المرتبطة
- البحث عن العائلات للربط
- تحليل العلاقات عبر الروابط الخارجية

## الميزات الحالية

- عرض شجرة العائلة الفردية
- إضافة وتحرير أفراد العائلة
- إحصائيات العائلة
- تسجيل الدخول بالهاتف
- حماية البيانات

## التقنيات المستخدمة

- React.js
- Firebase (Authentication + Firestore + Storage)
- Material-UI
- D3.js لعرض الشجرة
- Vite للبناء

## التشغيل

```bash
npm install
npm run dev
```

## البناء للإنتاج

```bash
npm run build
```