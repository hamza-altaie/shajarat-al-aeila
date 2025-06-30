// src/firebase/config.js - إصلاح شامل
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// تكوين Firebase من متغيرات البيئة
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// التحقق من وجود المتغيرات المطلوبة
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

// ✅ إصلاح: طباعة تفصيلية للمتغيرات
console.log('🔍 فحص متغيرات البيئة:');
requiredEnvVars.forEach(varName => {
  const value = import.meta.env[varName];
  console.log(`${varName}: ${value ? '✅ موجود' : '❌ مفقود'}`);
});

if (missingVars.length > 0) {
  console.error(`❌ متغيرات البيئة المفقودة: ${missingVars.join(', ')}`);
  console.error('💡 تأكد من وجود ملف .env في المجلد الجذر مع المتغيرات المطلوبة');
}

// تهيئة Firebase مع معالجة الأخطاء
let app;
let initializationError = null;

try {
  if (!getApps().length) {
    // ✅ إصلاح: التحقق من صحة التكوين قبل التهيئة
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Firebase config is incomplete. Check your environment variables.');
    }
    
    app = initializeApp(firebaseConfig);
    console.log('🔥 تم تهيئة Firebase بنجاح');
  } else {
    app = getApp();
    console.log('🔥 Firebase موجود مسبقاً');
  }
} catch (error) {
  console.error('❌ خطأ في تهيئة Firebase:', error);
  initializationError = error;
  // إنشاء app وهمي لتجنب أخطاء أخرى
  app = null;
}

// تهيئة الخدمات مع معالجة الأخطاء
let auth, db, storage, functions;

try {
  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    console.log('✅ تم تهيئة خدمات Firebase بنجاح');
  } else {
    console.error('❌ لا يمكن تهيئة خدمات Firebase - التطبيق غير متاح');
  }
} catch (error) {
  console.error('❌ خطأ في تهيئة خدمات Firebase:', error);
}

// ✅ إصلاح: إضافة دالة getFirebaseStatus المطلوبة
export const getFirebaseStatus = () => {
  const isInitialized = getApps().length > 0 && !initializationError;
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  
  // فحص شامل للإعدادات التجريبية أو المعطلة
  const isDemoConfig = 
    !firebaseConfig.projectId ||
    firebaseConfig.projectId === 'demo-project-id' || 
    firebaseConfig.projectId?.includes('demo') ||
    firebaseConfig.projectId?.includes('test') ||
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey?.includes('demo') ||
    firebaseConfig.apiKey?.length < 30 ||
    !firebaseConfig.authDomain ||
    firebaseConfig.authDomain?.includes('demo') ||
    missingVars.length > 0;

  return {
    isInitialized,
    initializationError: initializationError?.message || null,
    environment: {
      isDevelopment,
      isProduction,
      mode: import.meta.env.MODE
    },
    config: {
      isDemoConfig,
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      hasAllRequiredVars: missingVars.length === 0,
      missingVars: missingVars
    },
    services: {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      functions: !!functions
    }
  };
};

// ✅ إصلاح: إضافة دالة فحص جاهزية التطبيق
export const checkAppReadiness = () => {
  const status = getFirebaseStatus();
  const issues = [];

  if (!status.isInitialized) {
    issues.push('❌ Firebase غير مُهيأ بشكل صحيح');
    if (status.initializationError) {
      issues.push(`❌ خطأ التهيئة: ${status.initializationError}`);
    }
  }

  if (status.config.isDemoConfig) {
    issues.push('❌ إعدادات Firebase غير مكتملة أو تجريبية');
  }

  if (!status.config.hasAllRequiredVars) {
    issues.push(`❌ متغيرات البيئة مفقودة: ${status.config.missingVars.join(', ')}`);
  }

  if (!status.services.auth) {
    issues.push('❌ خدمة Firebase Auth غير متاحة');
  }

  return {
    isReady: issues.length === 0,
    issues,
    status,
    recommendations: issues.length > 0 ? [
      '1. تأكد من وجود ملف .env في المجلد الجذر',
      '2. تأكد من صحة بيانات Firebase من Firebase Console',
      '3. أعد تشغيل الخادم بعد تعديل ملف .env'
    ] : ['✅ جاهز للعمل!']
  };
};

// تصدير الخدمات
export { auth, db, storage, functions };

// معلومات للتطوير
if (import.meta.env.DEV) {
  const status = getFirebaseStatus();
  console.log('🔥 حالة Firebase:', status);
  
  if (!status.isInitialized) {
    console.error('❌ Firebase غير جاهز للاستخدام');
    console.error('💡 تحقق من متغيرات البيئة وإعدادات Firebase Console');
  }
  
  // أدوات تطوير
  window.firebaseDebug = {
    getStatus: getFirebaseStatus,
    checkReadiness: checkAppReadiness,
    config: firebaseConfig,
    services: { auth, db, storage, functions }
  };
  
  console.log('🔧 أدوات Firebase متاحة في: window.firebaseDebug');
}