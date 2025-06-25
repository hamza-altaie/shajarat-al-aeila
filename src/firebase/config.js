// src/firebase/config.js - التكوين الموحد والمُحدث لجميع خدمات Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// إعدادات Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// التحقق من وجود الإعدادات المطلوبة
const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingConfig = requiredConfig.filter(key => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  console.error('❌ Firebase config ناقص! المفاتيح المفقودة:', missingConfig);
  console.error('تأكد من وجود ملف .env وأنه يحتوي على جميع المتغيرات المطلوبة');
}

// تهيئة Firebase App
let app;
try {
  // التحقق من وجود تطبيق Firebase مُهيأ مسبقاً
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase تم تهيئته بنجاح');
} catch (error) {
  console.error('❌ خطأ في تهيئة Firebase:', error);
  throw new Error(`فشل في تهيئة Firebase: ${error.message}`);
}

// تهيئة الخدمات
let auth, db, storage, functions;

try {
  // Authentication
  auth = getAuth(app);
  auth.useDeviceLanguage(); // استخدام لغة الجهاز (العربية)
  
  // Firestore
  db = getFirestore(app);
  
  // Storage
  storage = getStorage(app);
  
  // Functions
  functions = getFunctions(app);
  
  console.log('✅ جميع خدمات Firebase تم تهيئتها بنجاح');
  
} catch (error) {
  console.error('❌ خطأ في تهيئة خدمات Firebase:', error);
  throw new Error(`فشل في تهيئة خدمات Firebase: ${error.message}`);
}

// اتصال بـ Emulators في بيئة التطوير (اختياري)
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && import.meta.env.MODE === 'development') {
  try {
    // Auth Emulator
    if (!auth._settings?.appVerificationDisabledForTesting) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    
    // Firestore Emulator
    if (!db._settings) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    // Storage Emulator
    if (!storage._location) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
    
    // Functions Emulator
    connectFunctionsEmulator(functions, 'localhost', 5001);
    
    console.log('🔧 Firebase Emulators متصلة');
  } catch (emulatorError) {
    console.warn('⚠️ تحذير: لم يتم الاتصال بـ Firebase Emulators:', emulatorError.message);
  }
}

// وظائف مساعدة للتحقق من حالة Firebase
export const getFirebaseStatus = () => {
  return {
    isInitialized: !!app,
    config: {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      isDemoConfig: firebaseConfig.projectId === 'demo-project-id'
    },
    services: {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      functions: !!functions
    }
  };
};

// وظيفة للتحقق من الاتصال بـ Firestore
export const testFirestoreConnection = async () => {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc);
    console.log('✅ Firestore متصل بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ Firestore:', error);
    return false;
  }
};

// وظيفة لإعداد مستمعات الأخطاء
export const setupErrorHandlers = () => {
  // مستمع أخطاء Auth
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('✅ المستخدم مسجل دخول:', user.uid);
    } else {
      console.log('ℹ️ لا يوجد مستخدم مسجل دخول');
    }
  }, (error) => {
    console.error('❌ خطأ في حالة المصادقة:', error);
  });
  
  // مستمع أخطاء عامة
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('firebase/')) {
      console.error('❌ خطأ Firebase غير مُعالج:', event.reason);
    }
  });
};

// تشغيل إعداد مستمعات الأخطاء
setupErrorHandlers();

// التصدير
export { auth, db, storage, functions };
export default app;

// معلومات إضافية للتطوير
if (import.meta.env.MODE === 'development') {
  console.log('🔧 معلومات Firebase للتطوير:');
  console.log('- Project ID:', firebaseConfig.projectId);
  console.log('- Auth Domain:', firebaseConfig.authDomain);
  console.log('- حالة الخدمات:', getFirebaseStatus().services);
}