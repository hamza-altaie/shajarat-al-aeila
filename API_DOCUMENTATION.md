# API Documentation - شجرة العائلة

## 📚 دوال userService.js

### Authentication (المصادقة)

#### `getMe()`
الحصول على المستخدم الحالي من Firebase.

```javascript
const user = await getMe();
// Returns: { id: 'firebase_uid', phone: '+9647xxxxxxxxx' } or null
```

#### `logout()`
تسجيل خروج المستخدم وحذف بيانات الجلسة.

```javascript
await logout();
```

---

### Persons (الأشخاص)

#### `listPersons(search?)`
جلب قائمة الأشخاص مع إمكانية البحث.

**Parameters:**
- `search` (string, optional): نص للبحث في الاسم الأول

**Returns:** Array of persons

```javascript
const persons = await listPersons();
const searchResults = await listPersons('حمزة');

// Response:
[
  {
    id: 1,
    first_name: 'حمزة',
    father_name: 'علي',
    family_name: 'الطائي',
    gender: 'M',
    is_root: true,
    created_by: 'firebase_uid',
    created_at: '2025-12-30T12:00:00Z'
  },
  // ...
]
```

#### `createPerson(personData)`
إضافة شخص جديد للعائلة.

**Parameters:**
- `personData` (object):
  - `first_name` (string, required): الاسم الأول
  - `father_name` (string, optional): اسم الأب
  - `family_name` (string, optional): اسم العائلة
  - `gender` (string, required): 'M' أو 'F'
  - `is_root` (boolean, optional): رب العائلة؟
  - `parent_id` (number, optional): معرّف الأب

**Returns:** Object - الشخص المُضاف

```javascript
const newPerson = await createPerson({
  first_name: 'محمد',
  father_name: 'حمزة',
  family_name: 'الطائي',
  gender: 'M',
  is_root: false,
  parent_id: 1 // معرّف الأب
});

// Response:
{
  id: 2,
  first_name: 'محمد',
  father_name: 'حمزة',
  family_name: 'الطائي',
  gender: 'M',
  is_root: false,
  created_by: 'firebase_uid',
  created_at: '2025-12-30T12:00:00Z'
}
```

#### `updatePerson(id, personData)`
تحديث بيانات شخص.

**Parameters:**
- `id` (number, required): معرّف الشخص
- `personData` (object): البيانات المراد تحديثها

```javascript
const updated = await updatePerson(2, {
  first_name: 'محمد',
  father_name: 'حمزة علي',
  family_name: 'الطائي',
  gender: 'M',
  is_root: false
});
```

#### `deletePerson(id)`
حذف شخص من العائلة.

**Parameters:**
- `id` (number, required): معرّف الشخص

**Returns:** boolean

```javascript
await deletePerson(2);
// Returns: true
```

---

### Relations (العلاقات)

#### `createRelation(parentId, childId)`
إنشاء علاقة أب-ابن.

**Parameters:**
- `parentId` (number, required): معرّف الأب
- `childId` (number, required): معرّف الابن

**Returns:** Object - العلاقة المُنشأة

```javascript
const relation = await createRelation(1, 2);

// Response:
{
  id: 1,
  parent_id: 1,
  child_id: 2,
  created_at: '2025-12-30T12:00:00Z'
}
```

#### `deleteRelation(id)`
حذف علاقة.

**Parameters:**
- `id` (number, required): معرّف العلاقة

```javascript
await deleteRelation(1);
// Returns: true
```

---

### Tree (الشجرة)

#### `getTree()`
جلب شجرة العائلة الكاملة (الأشخاص + العلاقات).

**Returns:** Object with persons and relations

```javascript
const tree = await getTree();

// Response:
{
  persons: [
    {
      id: 1,
      first_name: 'حمزة',
      father_name: 'علي',
      family_name: 'الطائي',
      gender: 'M',
      is_root: true,
      created_by: 'firebase_uid',
      created_at: '2025-12-30T12:00:00Z'
    },
    // ...
  ],
  relations: [
    {
      id: 1,
      parent_id: 1,
      child_id: 2,
      created_at: '2025-12-30T12:00:00Z'
    },
    // ...
  ]
}
```

---

## 🔐 Firebase Auth Functions

### في `firebase/auth.js`

#### `sendOtp(phoneNumber)`
إرسال رمز OTP إلى رقم هاتف.

**Parameters:**
- `phoneNumber` (string): رقم الهاتف بصيغة +964xxxxxxxxxx

```javascript
import { sendOtp } from './firebase/auth';

await sendOtp('+9647712345670');
```

#### `verifyOtp(code)`
التحقق من رمز OTP.

**Parameters:**
- `code` (string): الرمز المكون من 6 أرقام

```javascript
import { verifyOtp } from './firebase/auth';

const result = await verifyOtp('123456');
// Returns: { success: true, user: { id, phone } }
```

#### `getCurrentUser()`
الحصول على المستخدم الحالي.

```javascript
import { getCurrentUser } from './firebase/auth';

const user = await getCurrentUser();
// Returns: { id: 'firebase_uid', phone: '+964...' } or null
```

---

## 🎨 Component Props

### FamilyTreeAdvanced
عرض الشجرة التفاعلية.

لا يحتاج props - يجلب البيانات تلقائياً.

```jsx
import FamilyTreeAdvanced from './components/FamilyTreeAdvanced';

<FamilyTreeAdvanced />
```

---

## 📊 Data Types

### Person Object
```typescript
{
  id: number;
  first_name: string;
  father_name?: string;
  family_name?: string;
  gender: 'M' | 'F';
  is_root: boolean;
  created_by: string; // Firebase UID
  created_at: string; // ISO timestamp
}
```

### Relation Object
```typescript
{
  id: number;
  parent_id: number;
  child_id: number;
  created_at: string; // ISO timestamp
}
```

---

## ⚠️ Error Handling

جميع الدوال ترمي أخطاء عند الفشل:

```javascript
try {
  const person = await createPerson(data);
} catch (error) {
  console.error(error.message);
  // عرض رسالة خطأ للمستخدم
}
```

---

## 🔑 Environment Variables

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
