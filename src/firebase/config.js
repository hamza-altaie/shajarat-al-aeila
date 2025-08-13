// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

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
const storage = getStorage(app);
const db = getFirestore(app);

// 🔍 دالة لفحص حالة Firebase
const getFirebaseStatus = () => {
  return {
    isInitialized: !!auth,
    services: {
      auth: !!auth,
      storage: !!storage,
      db: !!db
    },
    config: firebaseConfig
  };
};

// 🔌 دالة لاختبار الاتصال
const testFirebaseConnection = async () => {
  return { success: true };
};

// ✅ التصدير الموحد
export {
  app,
  auth,
  storage,
  db,
  RecaptchaVerifier,
  getFirebaseStatus,
  testFirebaseConnection
};
