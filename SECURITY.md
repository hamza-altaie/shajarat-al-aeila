# أمن تطبيق شجرة العائلة

## 1. تفعيل التحقق الفعلي عند تسجيل الدخول

### التوصية:
- يجب تفعيل التحقق عبر SMS (OTP) باستخدام Firebase Auth أو أي مزود موثوق.
- لا تعتمد على تسجيل الدخول المباشر بدون تحقق، حتى في بيئة تجريبية.
- أضف reCAPTCHA أو أي آلية تحقق بشري لمنع إساءة الاستخدام.

### خطوات مقترحة:
1. أعد تفعيل منطق إرسال كود SMS عبر Firebase:
   - استخدم `signInWithPhoneNumber(auth, phone, appVerifier)` مع RecaptchaVerifier.
2. أضف عنصر reCAPTCHA في صفحة تسجيل الدخول.
3. لا تسمح بتسجيل الدخول إلا بعد إدخال الكود الصحيح.
4. عالج الأخطاء وأظهر رسائل واضحة للمستخدم عند فشل التحقق.

### مثال (مقتطف كود):
```js
// في usePhoneAuth.js
const sendCode = async () => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', { size: 'invisible' }, auth);
    await window.recaptchaVerifier.render();
  }
  const appVerifier = window.recaptchaVerifier;
  const result = await signInWithPhoneNumber(auth, phone, appVerifier);
  setConfirmationResult(result);
};
```

### ملاحظات:
- لا تعتمد على localStorage فقط للتحقق من هوية المستخدم.
- راجع إعدادات أمان قاعدة البيانات (Firestore Rules) لمنع التلاعب من خارج التطبيق.

---

# Firestore Security Rules

## القواعد المقترحة لتطبيق شجرة العائلة:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // السماح بالقراءة والكتابة فقط للمستخدم الذي رقم هاتفه مطابق لمسار الوثيقة
    match /users/{userPhone}/family/{docId} {
      allow read, write: if request.auth != null && request.auth.token.phone_number == userPhone;
    }

    // السماح للمستخدم بقراءة بياناته فقط
    match /users/{userPhone} {
      allow read: if request.auth != null && request.auth.token.phone_number == userPhone;
      allow write: if false; // لا يُسمح بالكتابة مباشرة على وثيقة المستخدم
    }
  }
}
```

### توصيات:
- يجب تفعيل التحقق عبر الهاتف (SMS) في Firebase Auth.
- لا تعتمد على localStorage فقط للتحقق من الهوية.
- راجع القواعد بعد كل تحديث للتأكد من عدم وجود ثغرات.
- اختبر القواعد باستخدام محاكي Firestore أو وحدة التحكم في Firebase.

---

لأي استفسار أمني إضافي، راجع توثيقات Firebase أو استشر مختص أمن معلومات.

للمزيد: [Firebase Security Rules Docs](https://firebase.google.com/docs/rules)
