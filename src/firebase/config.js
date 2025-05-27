import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADPWJyhK_zB63x1AOIGsGSeDOLZXcyuvU",
  authDomain: "shajarat-al-aeila.firebaseapp.com",
  projectId: "shajarat-al-aeila",
  storageBucket: "shajarat-al-aeila.firebasestorage.app",
  messagingSenderId: "395923557025",
  appId: "1:395923557025:web:315f774d0a02909cc57ee0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ✅ App Check باستخدام reCAPTCHA v3
// تم التعطيل مؤقتاً أثناء التطوير
// import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("6Lee-QQrAAAAAOk5oSKOphRuJj8THx0Ag8CR-95i"),
//   isTokenAutoRefreshEnabled: true,
// });

export { app };
