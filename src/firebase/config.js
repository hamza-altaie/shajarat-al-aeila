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
  console.error("❌ Firebase غير مهيأ! تحقق من متغيرات البيئة:");
  console.error("   VITE_FIREBASE_API_KEY:", firebaseConfig.apiKey ? '✓' : '✗');
  console.error("   VITE_FIREBASE_PROJECT_ID:", firebaseConfig.projectId ? '✓' : '✗');
}

console.log("🔥 Firebase Config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? '✓ (Configured)' : '✗ (Missing)',
  appId: firebaseConfig.appId ? '✓ (Configured)' : '✗ (Missing)',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance
const authInstance = getAuth(app);

// Disable app verification for testing in development (reCAPTCHA bypass)
if (import.meta.env.DEV) {
  // Only set this if we're in development and need to bypass reCAPTCHA
  try {
    authInstance.settings.appVerificationDisabledForTesting = true;
    console.log("⚠️ App verification disabled for testing (DEV mode)");
  } catch (e) {
    console.warn("⚠️ Could not disable app verification for testing", e);
  }
}

console.log("✅ Firebase initialized successfully");

export const auth = authInstance;
export default app;
