# 👨‍💻 دليل التطوير - شجرة العائلة

## 🏗️ البنية المعمارية

### نمط المعمارية
التطبيق يستخدم **Component-Based Architecture** مع **Service Layer Pattern**.

```
┌─────────────┐
│   UI Layer  │  ← React Components
├─────────────┤
│ Logic Layer │  ← Hooks & Contexts
├─────────────┤
│Service Layer│  ← userService.js
├─────────────┤
│  API Layer  │  ← Firebase + Supabase
└─────────────┘
```

---

## 📂 دليل الملفات الرئيسية

### Components
- **FamilyTreeAdvanced.jsx**: عرض الشجرة باستخدام D3.js
- **InstallPrompt.jsx**: دعوة تثبيت PWA

### Pages
- **PhoneLogin.jsx**: صفحة تسجيل الدخول
- **Family.jsx**: إدارة أفراد العائلة
- **FamilyTree.jsx**: Wrapper لمكون الشجرة
- **Statistics.jsx**: عرض إحصائيات العائلة

### Services
- **userService.js**: جميع عمليات قاعدة البيانات

### Utils
- **FamilyTreeBuilder.js**: بناء هيكل الشجرة من البيانات
- **FamilyRelations.js**: إدارة العلاقات العائلية
- **FamilyAnalytics.js**: حسابات إحصائية
- **DebugLogger.js**: تسجيل معلومات التطوير

---

## 🎯 إضافة ميزة جديدة

### 1. إضافة صفحة جديدة

#### الخطوة 1: إنشاء الملف
```jsx
// src/pages/NewPage.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';

export default function NewPage() {
  return (
    <Container>
      <Typography variant="h4">صفحة جديدة</Typography>
    </Container>
  );
}
```

#### الخطوة 2: إضافة Route
```jsx
// src/AppRoutes.jsx
import NewPage from './pages/NewPage';

// داخل <Routes>
<Route path="/new" element={
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
} />
```

### 2. إضافة دالة API جديدة

#### في userService.js
```javascript
// src/services/userService.js
export async function yourNewFunction(params) {
  try {
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .eq('field', params);
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ خطأ:", err);
    throw err;
  }
}
```

### 3. إضافة Context جديد

```jsx
// src/contexts/YourContext.jsx
import React, { createContext, useContext, useState } from 'react';

const YourContext = createContext();

export function YourProvider({ children }) {
  const [state, setState] = useState(null);

  return (
    <YourContext.Provider value={{ state, setState }}>
      {children}
    </YourContext.Provider>
  );
}

export const useYour = () => useContext(YourContext);
```

#### استخدامه في App.jsx
```jsx
import { YourProvider } from './contexts/YourContext';

<YourProvider>
  <AuthProvider>
    {/* ... */}
  </AuthProvider>
</YourProvider>
```

---

## 🔧 أدوات التطوير المفيدة

### React DevTools
```bash
# تثبيت React DevTools Extension
# Chrome: https://chrome.google.com/webstore
```

### Supabase Studio
```
https://app.supabase.com/project/your-project-id/editor
```

### Firebase Console
```
https://console.firebase.google.com/project/your-project-id
```

---

## 🐛 Debug & Troubleshooting

### تفعيل Debug Logger
```javascript
// src/utils/DebugLogger.js
const DEBUG_ENABLED = true; // تغيير إلى true

// استخدام في الكود
import debugLogger from './utils/DebugLogger';
debugLogger.log('معلومة مهمة', data);
```

### فحص Firebase Auth
```javascript
// في Console المتصفح
import { auth } from './firebase/config';
console.log(auth.currentUser);
```

### فحص Supabase
```javascript
// في Console المتصفح
import { supabase } from './supabaseClient';
const { data } = await supabase.from('persons').select('*');
console.log(data);
```

---

## 📝 Coding Standards

### تسمية الملفات
- **Components**: PascalCase - `FamilyTree.jsx`
- **Utilities**: camelCase - `debugLogger.js`
- **Constants**: UPPER_SNAKE_CASE - `API_CONSTANTS.js`

### تسمية المتغيرات
```javascript
// ✅ Good
const userData = await getMe();
const isAuthenticated = user !== null;

// ❌ Bad
const d = await getMe();
const flag = user !== null;
```

### التعليقات
```javascript
// ✅ Good - عربي للمنطق التجاري
// تحقق من أن المستخدم مسجّل دخول
if (!user) return;

// ✅ Good - إنجليزي للكود التقني
// Initialize D3 tree layout
const tree = d3.tree();

// ❌ Bad - تعليق عديم الفائدة
// هذا متغير
const x = 5;
```

### Import Order
```javascript
// 1. React
import React, { useState, useEffect } from 'react';

// 2. Third-party
import { Container, Button } from '@mui/material';

// 3. Internal
import { getMe } from './services/userService';
import './styles.css';
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] تسجيل دخول بالهاتف
- [ ] إضافة رب عائلة
- [ ] إضافة أبناء
- [ ] عرض الشجرة
- [ ] حذف شخص
- [ ] تسجيل خروج

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## 🚀 Deployment

### Build للإنتاج
```bash
npm run build
```

### معاينة البناء
```bash
npm run preview
```

### Firebase Hosting
```bash
firebase deploy --only hosting
```

---

## 📚 موارد مفيدة

### React
- [React Docs](https://react.dev)
- [React Hooks](https://react.dev/reference/react)

### Material-UI
- [MUI Docs](https://mui.com)
- [MUI Components](https://mui.com/material-ui/all-components/)

### D3.js
- [D3 Documentation](https://d3js.org)
- [D3 Tree Layout](https://observablehq.com/@d3/tree)

### Firebase
- [Firebase Docs](https://firebase.google.com/docs)
- [Phone Auth](https://firebase.google.com/docs/auth/web/phone-auth)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)

---

## ⚡ Performance Tips

### 1. Lazy Loading
```javascript
// تحميل المكونات عند الحاجة
const Statistics = React.lazy(() => import('./pages/Statistics'));
```

### 2. Memoization
```javascript
// استخدام useMemo للحسابات الثقيلة
const treeData = useMemo(() => buildTree(persons), [persons]);
```

### 3. Virtualization
للقوائم الطويلة، استخدم `react-window`:
```bash
npm install react-window
```

---

## 🔐 Security Best Practices

1. **لا تُخزّن Secrets في الكود**
   - استخدم `.env` دائماً
   - أضف `.env` إلى `.gitignore`

2. **Validate User Input**
   ```javascript
   if (!phoneNumber.match(/^\+964\d{10}$/)) {
     throw new Error('رقم غير صحيح');
   }
   ```

3. **Sanitize Data**
   ```javascript
   const cleanName = name.trim().replace(/[<>]/g, '');
   ```

---

## 📧 المساعدة

للأسئلة أو المساعدة:
- افتح Issue في GitHub
- راجع API_DOCUMENTATION.md
- تحقق من README.md

---

Happy Coding! 🎉
