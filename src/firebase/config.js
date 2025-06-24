// src/firebase/config.js - التكوين الموحد لجميع خدمات Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// إعدادات Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// التحقق من وجود الإعدادات المطلوبة
const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingConfig = requiredConfig.filter(key => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  console.error('❌ Firebase config ناقص! المتغيرات المفقودة:', missingConfig);
  console.error('تأكد من وجود هذه المتغيرات في ملف .env:');
  missingConfig.forEach(key => {
    console.error(`- VITE_FIREBASE_${key.toUpperCase()}`);
  });
  throw new Error('Firebase configuration is incomplete');
}

// تهيئة Firebase App (تجنب التكرار)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 تم تهيئة Firebase بنجاح');
} else {
  app = getApp();
  console.log('🔥 Firebase مُهيأ مسبقاً');
}

// تهيئة الخدمات
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// إعدادات المحاكي للتطوير المحلي (اختياري)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    // محاكي Auth
    if (!auth._delegate._config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
    
    // محاكي Firestore
    if (!db._delegate._databaseId.projectId.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    // محاكي Storage
    if (!storage._delegate._host.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('🔧 متصل بمحاكي Storage');
    }
  } catch (error) {
    console.warn('⚠️ فشل الاتصال بالمحاكيات:', error.message);
  }
}

// تصدير الكائنات
export { app };
export default { app, auth, db, storage };

// دالة فحص حالة Firebase
export const checkFirebaseStatus = () => {
  try {
    // التحقق من تهيئة Firebase
    if (!app) {
      return {
        isInitialized: false,
        error: 'Firebase app غير مُهيأ',
        config: null
      };
    }

    // التحقق من إعدادات Firebase
    const config = app.options;
    const isDemoConfig = (
      config.projectId === 'demo-project' ||
      config.apiKey === 'demo-key' ||
      config.authDomain === 'demo.firebaseapp.com'
    );

    // التحقق من خدمات Firebase
    const services = {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage
    };

    return {
      isInitialized: true,
      services,
      config: {
        projectId: config.projectId,
        isDemoConfig
      },
      error: null
    };

  } catch (error) {
    console.error('خطأ في فحص حالة Firebase:', error);
    return {
      isInitialized: false,
      error: error.message,
      config: null
    };
  }
};

// دالة اختبار الاتصال بـ Firebase
export const testFirebaseConnection = async () => {
  try {
    // اختبار Firestore
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc);
    
    // اختبار Auth
    const currentUser = auth.currentUser;
    
    return {
      success: true,
      firestore: true,
      auth: !!currentUser,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('فشل اختبار الاتصال:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};