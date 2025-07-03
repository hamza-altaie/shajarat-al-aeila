// src/firebase/config.js - إعدادات Firebase موحدة ومصححة

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// ✅ اختر مجموعة واحدة فقط من الإعدادات
// احصل على الإعدادات الصحيحة من Firebase Console

const firebaseConfig = {
  // 🔥 استخدم هذه الإعدادات إذا كان مشروعك هو "shajarat-al-aeila-1"
  apiKey: "AIzaSyBbq9BYxf04dxpeqaK_1Y5OPceynURDuao",
  authDomain: "shajarat-al-aeila-1.firebaseapp.com",
  projectId: "shajarat-al-aeila-1",
  storageBucket: "shajarat-al-aeila-1.appspot.com",
  messagingSenderId: "803509567710",
  appId: "1:803509567710:web:6e7dfc549a605798d9424f",
  measurementId: "G-7DVE3CHCW9"
};

// تنظيف التطبيقات الموجودة
const existingApps = getApps();
existingApps.forEach(app => {
  try {
    app.delete();
  } catch (error) {
    console.log('تنظيف Firebase apps:', error);
  }
});

// تهيئة Firebase
let app, auth, db, storage, functions;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  console.log('✅ Firebase تم تهيئته بنجاح');
  console.log('📋 Project ID:', firebaseConfig.projectId);
  console.log('🔗 Auth Domain:', firebaseConfig.authDomain);
  
} catch (error) {
  console.error('❌ خطأ في تهيئة Firebase:', error);
  throw error;
}

// تصدير الخدمات
export { auth, db, storage, functions };
export default app;

// دالة فحص الحالة
export const getFirebaseStatus = () => {
  const isInitialized = !!(app && auth && db);
  
  return {
    isInitialized,
    config: {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKey: firebaseConfig.apiKey ? 'موجود' : 'غير موجود'
    },
    services: {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      functions: !!functions
    },
    timestamp: new Date().toISOString()
  };
};

// دالة اختبار الاتصال
export const testFirebaseConnection = async () => {
  try {
    if (!auth || !db) {
      throw new Error('Firebase services غير متاحة');
    }
    
    // اختبار بسيط للاتصال
    const currentUser = auth.currentUser;
    console.log('👤 Current user:', currentUser ? 'موجود' : 'غير موجود');
    
    return {
      success: true,
      message: 'Firebase جاهز للاستخدام',
      services: {
        auth: 'متاح',
        firestore: 'متاح',
        currentUser: currentUser ? 'مسجل الدخول' : 'غير مسجل'
      }
    };
    
  } catch (error) {
    console.error('❌ خطأ في اختبار Firebase:', error);
    return {
      success: false,
      error: error.message,
      message: 'فشل في اختبار Firebase'
    };
  }
};

// دالة تشخيص شاملة
export const diagnoseFirebase = () => {
  console.log('🔍 تشخيص Firebase...');
  console.log('📋 التكوين:');
  console.log('- Project ID:', firebaseConfig.projectId);
  console.log('- Auth Domain:', firebaseConfig.authDomain);
  console.log('- API Key:', firebaseConfig.apiKey ? 'موجود' : '❌ غير موجود');
  console.log('- Current Domain:', window.location.hostname);
  console.log('- Port:', window.location.port);
  
  console.log('🔧 الخدمات:');
  console.log('- App:', app ? '✅ متاح' : '❌ غير متاح');
  console.log('- Auth:', auth ? '✅ متاح' : '❌ غير متاح');
  console.log('- Firestore:', db ? '✅ متاح' : '❌ غير متاح');
  console.log('- Storage:', storage ? '✅ متاح' : '❌ غير متاح');
  console.log('- Functions:', functions ? '✅ متاح' : '❌ غير متاح');
  
  return getFirebaseStatus();
};