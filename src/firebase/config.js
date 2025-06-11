// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// إعدادات Firebase مع قيم افتراضية آمنة
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DEMO"
};

// التحقق من صحة الإعدادات
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];
  const missingFields = requiredFields.filter(field => 
    !firebaseConfig[field] || firebaseConfig[field].includes('demo')
  );
  
  if (missingFields.length > 0) {
    console.warn('⚠️ Firebase config contains demo values. Please update your .env file with real values.');
    console.warn('Missing or demo fields:', missingFields);
    
    if (import.meta.env.DEV) {
      console.info('🔧 Development mode: Using demo configuration');
    }
  }
  
  return missingFields.length === 0;
};

// تهيئة Firebase
let app;
let auth;
let db;
let storage;

try {
  // تهيئة التطبيق
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase app initialized');
  
  // تهيئة الخدمات
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  // إعدادات خاصة بالتطوير
  if (import.meta.env.DEV) {
    // تعطيل التحقق من التطبيق في وضع التطوير
    if (typeof window !== 'undefined') {
      window.recaptchaVerifierSettings = {
        appVerificationDisabledForTesting: true
      };
    }
    
    // الاتصال بالمحاكيات إذا كانت متاحة
    try {
      // محاكي Auth
      if (!auth._delegate.emulatorConfig) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        console.log('🔧 Connected to Auth emulator');
      }
    } catch (emulatorError) {
      console.log('ℹ️ Auth emulator not available, using production');
    }
    
    try {
      // محاكي Firestore
      if (!db._delegate._databaseId.projectId.includes('localhost')) {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('🔧 Connected to Firestore emulator');
      }
    } catch (emulatorError) {
      console.log('ℹ️ Firestore emulator not available, using production');
    }
    
    try {
      // محاكي Storage
      if (!storage._location.bucket.includes('localhost')) {
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('🔧 Connected to Storage emulator');
      }
    } catch (emulatorError) {
      console.log('ℹ️ Storage emulator not available, using production');
    }
  }
  
  // التحقق من صحة الإعدادات
  const isValidConfig = validateFirebaseConfig();
  
  if (isValidConfig) {
    console.log('✅ Firebase initialized successfully with valid configuration');
  } else {
    console.warn('⚠️ Firebase initialized with demo configuration - please update .env file');
  }
  
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  
  // إنشاء كائنات وهمية لتجنب الأخطاء
  auth = null;
  db = null;
  storage = null;
  
  // عرض رسالة خطأ للمستخدم
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const errorMessage = `
        خطأ في تهيئة Firebase:
        ${error.message}
        
        يرجى التحقق من:
        1. ملف .env موجود ويحتوي على القيم الصحيحة
        2. اتصالك بالإنترنت
        3. إعدادات Firebase في وحدة التحكم
      `;
      
      if (confirm(errorMessage + '\n\nهل تريد إعادة تحميل الصفحة؟')) {
        window.location.reload();
      }
    }, 1000);
  }
}

// دالة فحص حالة Firebase
export const checkFirebaseStatus = () => {
  return {
    isInitialized: !!app,
    hasAuth: !!auth,
    hasFirestore: !!db,
    hasStorage: !!storage,
    config: {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      isDemoConfig: firebaseConfig.projectId.includes('demo')
    }
  };
};

// دالة إعادة تهيئة Firebase
export const reinitializeFirebase = async () => {
  try {
    if (app) {
      await app.delete();
    }
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('🔄 Firebase reinitialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to reinitialize Firebase:', error);
    return false;
  }
};

// تصدير الكائنات
export { auth, db, storage };
export default app;