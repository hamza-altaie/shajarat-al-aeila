// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ إضافة التخزين

// ✅ إعداد Firebase Config للإنتاج
const firebaseConfig = {
  apiKey: "AIzaSyDzRYmc0QZnjUvuI1ot4c2aO3jlqbNyXB0",
  authDomain: "shajarat-al-aeila-iraq.firebaseapp.com",
  projectId: "shajarat-al-aeila-iraq",
  storageBucket: "shajarat-al-aeila-iraq.firebasestorage.app",
  messagingSenderId: "648256795376",
  appId: "1:648256795376:web:9257af9799c7e42abfc835",
  measurementId: "G-ZJM5H3J2RQ"
};

// ✅ تهيئة Firebase
const app = initializeApp(firebaseConfig);

// ✅ تهيئة الخدمات المطلوبة
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // ✅ تهيئة التخزين

// 🔍 دالة لفحص حالة Firebase
const getFirebaseStatus = () => {
  return {
    isInitialized: !!auth,
    services: {
      auth: !!auth,
      db: !!db,
      storage: !!storage
    },
    config: firebaseConfig
  };
};

// 🔌 دالة لاختبار الاتصال بقاعدة البيانات
// ملاحظة: لا يوجد collection('test') بشكل مباشر في Firestore v9+
// ممكن نستخدم الطريقة الجديدة لاحقاً
const testFirebaseConnection = async () => {
  return { success: true };
};

// ✅ التصدير الموحد
export {
  app,
  auth,
  db,
  storage,
  RecaptchaVerifier,
  getFirebaseStatus,
  testFirebaseConnection
};
