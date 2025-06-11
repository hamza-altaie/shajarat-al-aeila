import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADPWJyhK_zB63x1AOIGsGSeDOLZXcyuvU",
  authDomain: "shajarat-al-aeila.firebaseapp.com",
  projectId: "shajarat-al-aeila",
  storageBucket: "shajarat-al-aeila.firebasestorage.app",
  messagingSenderId: "395923557025",
  appId: "1:395923557025:web:315f774d0a02909cc57ee0",
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة الخدمات
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// تصدير التطبيق
export { app };

// ✅ App Check باستخدام reCAPTCHA v3 (معطل مؤقتاً أثناء التطوير)
// import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
//   initializeAppCheck(app, {
//     provider: new ReCaptchaV3Provider("6Lee-QQrAAAAAOk5oSKOphRuJj8THx0Ag8CR-95i"),
//     isTokenAutoRefreshEnabled: true,
//   });
// }