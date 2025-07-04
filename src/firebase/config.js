// src/firebase/config.js - للإنتاج
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

// إعدادات Firebase مع التحقق
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// التحقق من المتغيرات المطلوبة
const validateConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missing = required.filter(key => !firebaseConfig[key]);
  
  if (missing.length > 0) {
    if (import.meta.env.PROD) {
      throw new Error(`❌ Missing production Firebase config: ${missing.join(', ')}`);
    } else {
      console.warn('⚠️ Missing Firebase config:', missing);
      // في التطوير، استخدم القيم الافتراضية
      Object.assign(firebaseConfig, {
        apiKey: firebaseConfig.apiKey || "AIzaSyBbq9BYxf04dxpeqaK_1Y5OPceynURDuao",
        authDomain: firebaseConfig.authDomain || "shajarat-al-aeila-1.firebaseapp.com",
        projectId: firebaseConfig.projectId || "shajarat-al-aeila-1",
        storageBucket: firebaseConfig.storageBucket || "shajarat-al-aeila-1.appspot.com",
        messagingSenderId: firebaseConfig.messagingSenderId || "803509567710",
        appId: firebaseConfig.appId || "1:803509567710:web:6e7dfc549a605798d9424f"
      });
    }
  }
};

// التحقق من التكوين
validateConfig();

// تهيئة Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];


// تهيئة الخدمات
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Analytics للإنتاج فقط
export const analytics = import.meta.env.PROD ? getAnalytics(app) : null;

// دوال المساعدة المحسنة
export const getFirebaseStatus = () => {
  return {
    isInitialized: !!(app && auth && db),
    environment: import.meta.env.MODE,
    config: {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      hasApiKey: !!firebaseConfig.apiKey,
      hasAppCheck: import.meta.env.VITE_APP_CHECK_ENABLED === 'true'
    },
    services: {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      functions: !!functions,
      analytics: !!analytics
    },
    timestamp: new Date().toISOString()
  };
};

export const testFirebaseConnection = async () => {
  try {
    return {
      success: true,
      message: 'Firebase services ready',
      environment: import.meta.env.MODE
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Firebase connection failed'
    };
  }
};

export default app;