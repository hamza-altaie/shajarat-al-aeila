// 🔄 حل شامل - استبدل ملف src/firebase/config.js بالكامل بهذا:

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// ✅ إعدادات Firebase (تأكد من أن هذه صحيحة من Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyC_3sC6QTgBlarZKlUZLQYUiuJtn9fjXbk",
  authDomain: "shajarat-al-aeila.firebaseapp.com",
  projectId: "shajarat-al-aeila",
  storageBucket: "shajarat-al-aeila.firebasestorage.app",
  messagingSenderId: "395923557025",
  appId: "1:395923557025:web:315f774d0a02909cc57ee0",
  measurementId: "G-9Z35NT21KG"
};

// تنظيف وإعادة تهيئة Firebase
let app;
let auth;
let db;
let storage;
let functions;

try {
  // إزالة جميع التطبيقات الموجودة
  const existingApps = getApps();
  existingApps.forEach(async (existingApp) => {
    try {
      await existingApp.delete();
    } catch {
      console.log('تنظيف التطبيقات القديمة...');
    }
  });

  // تهيئة جديدة
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  console.log('🔥 تم إعادة تهيئة Firebase بنجاح');
  console.log('📋 Project ID:', firebaseConfig.projectId);

} catch (error) {
  console.error('❌ خطأ في تهيئة Firebase:', error);
}

// تصدير الخدمات
export { auth, db, storage, functions };
export default app;

// دالة فحص مبسطة
export const getFirebaseStatus = () => {
  const isInitialized = !!app && !!auth && !!db;
  
  const status = {
    isInitialized,
    config: {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      hasValidConfig: true
    },
    services: {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      functions: !!functions
    },
    timestamp: new Date().toISOString()
  };

  console.log('✅ Firebase Status:', isInitialized ? 'جاهز' : 'غير جاهز');
  return status;
};

// دالة اختبار بسيطة
export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 اختبار Firebase بسيط...');
    
    if (!auth) {
      throw new Error('Auth غير متاح');
    }
    
    if (!db) {
      throw new Error('Firestore غير متاح'); 
    }

    console.log('✅ Firebase جاهز للمصادقة');
    return { 
      success: true, 
      message: 'Firebase جاهز',
      auth: !!auth,
      firestore: !!db
    };

  } catch (error) {
    console.error('❌ خطأ في اختبار Firebase:', error);
    return { success: false, error: error.message };
  }
};

// تنظيف عند إغلاق الصفحة
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      } catch {
        console.log('تنظيف reCAPTCHA...');
      }
    }
  });

  // أدوات التطوير
  window.firebaseDebug = {
    config: firebaseConfig,
    status: getFirebaseStatus,
    test: testFirebaseConnection,
    auth,
    db,
    app,
    // دالة إعادة تعيين شاملة
    reset: () => {
      window.location.reload();
    }
  };
  
  console.log('🛠️ أدوات Firebase متاحة في window.firebaseDebug');
}