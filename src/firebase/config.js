// src/firebase/config.js - النسخة المُحدثة والمُصححة
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
if (missingVars.length > 0) {
  console.error(`❌ متغيرات البيئة المفقودة: ${missingVars.join(', ')}`);
}

// تهيئة Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 تم تهيئة Firebase بنجاح');
} else {
  app = getApp();
  console.log('🔥 Firebase موجود مسبقاً');
}

// تهيئة الخدمات
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// الاتصال بـ Firebase Emulators في بيئة التطوير فقط
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  try {
    // تجنب الاتصال المتكرر بـ Emulators
    if (!auth._delegate?._config?.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('🔧 متصل بـ Auth Emulator');
    }
    
    if (!db._delegate?._databaseId?.projectId?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔧 متصل بـ Firestore Emulator');
    }
    
    if (!storage._delegate?._host?.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('🔧 متصل بـ Storage Emulator');
    }
    
    if (!functions._delegate?._url?.includes('localhost')) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('🔧 متصل بـ Functions Emulator');
    }
  } catch (error) {
    console.warn('⚠️ تحذير: فشل الاتصال بـ Firebase Emulators:', error.message);
  }
}

// تصدير الخدمات
export { auth, db, storage, functions };

// دالة فحص حالة Firebase - مُحدثة ومُصححة
export const getFirebaseStatus = () => {
  const isInitialized = getApps().length > 0;
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;
  
  // فحص شامل للإعدادات التجريبية أو المعطلة
  const isDemoConfig = 
    // فحص project ID
    !firebaseConfig.projectId ||
    firebaseConfig.projectId === 'demo-project-id' || 
    firebaseConfig.projectId?.includes('demo') ||
    firebaseConfig.projectId?.includes('test') ||
    
    // فحص API Key
    !firebaseConfig.apiKey ||
    firebaseConfig.apiKey?.includes('demo') ||
    firebaseConfig.apiKey?.length < 30 ||
    
    // فحص auth domain
    !firebaseConfig.authDomain ||
    firebaseConfig.authDomain?.includes('demo') ||
    
    // فحص متغيرات البيئة المفقودة
    missingVars.length > 0;

  return {
    isInitialized,
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
    },
    emulators: {
      enabled: isDevelopment && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true',
      authConnected: auth._delegate?._config?.emulator !== undefined,
      firestoreConnected: db._delegate?._databaseId?.projectId?.includes('localhost'),
      storageConnected: storage._delegate?._host?.includes('localhost'),
      functionsConnected: functions._delegate?._url?.includes('localhost')
    }
  };
};

// دالة فحص جاهزية الإنتاج
export const checkProductionReadiness = () => {
  const status = getFirebaseStatus();
  const issues = [];

  if (status.config.isDemoConfig) {
    issues.push('❌ إعدادات Firebase غير مكتملة أو تجريبية');
  }

  if (!status.config.hasAllRequiredVars) {
    issues.push(`❌ متغيرات البيئة مفقودة: ${status.config.missingVars.join(', ')}`);
  }

  if (status.environment.isProduction && status.emulators.enabled) {
    issues.push('⚠️ Firebase Emulators مُفعلة في بيئة الإنتاج');
  }

  if (!status.isInitialized) {
    issues.push('❌ Firebase غير مُهيأ بشكل صحيح');
  }

  return {
    isReady: issues.length === 0,
    issues,
    status,
    recommendations: issues.length > 0 ? [
      '1. تأكد من وجود جميع متغيرات البيئة في ملف .env',
      '2. تأكد من صحة بيانات Firebase من Console',
      '3. في الإنتاج، تأكد من إيقاف Emulators'
    ] : ['✅ جاهز للنشر!']
  };
};

// طباعة معلومات Firebase في بيئة التطوير
if (import.meta.env.DEV) {
  const status = getFirebaseStatus();
  console.log('🔥 معلومات Firebase:', status);
  
  if (status.config.isDemoConfig) {
    console.warn('⚠️ تحذير: يتم استخدام إعدادات Firebase غير مكتملة');
  }
  
  // أدوات تطوير إضافية
  window.firebaseDebug = {
    getStatus: getFirebaseStatus,
    checkProduction: checkProductionReadiness,
    config: firebaseConfig,
    services: { auth, db, storage, functions }
  };
  
  console.log('🔧 أدوات Firebase متاحة في: window.firebaseDebug');
}