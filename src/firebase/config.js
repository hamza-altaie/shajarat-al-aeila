import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase Configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// تحقق من تهيئة الإعدادات
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase غير مهيأ! تحقق من متغيرات البيئة:');
  console.error('   VITE_FIREBASE_API_KEY:', firebaseConfig.apiKey ? '✓' : '✗');
  console.error('   VITE_FIREBASE_PROJECT_ID:', firebaseConfig.projectId ? '✓' : '✗');
}

// Firebase Config loaded

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance
const authInstance = getAuth(app);

// ⚠️ تم تعطيل وضع الاختبار - التسجيل الآن برقم حقيقي فقط
// لتفعيل وضع الاختبار مرة أخرى، أزل التعليق من الكود أدناه:
/*
if (import.meta.env.DEV) {
  try {
    authInstance.settings.appVerificationDisabledForTesting = true;
  } catch {
    // Could not disable app verification
  }
}
*/

// Firebase initialized - Production Mode (Real Phone Numbers)

export const auth = authInstance;
export default app;
