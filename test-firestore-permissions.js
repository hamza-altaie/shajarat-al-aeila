// تجربة سريعة لاختبار صلاحيات Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBbgPqL6FcXL4kAjQT3CWLuCi5qHqA8O0E",
  authDomain: "familytree-d5030.firebaseapp.com",
  projectId: "familytree-d5030",
  storageBucket: "familytree-d5030.firebasestorage.app",
  messagingSenderId: "1006354458655",
  appId: "1:1006354458655:web:e7fc3471b7b89ac4fb6fab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testFirestorePermissions() {
  try {
    console.log('🔄 جاري اختبار اتصال Firestore...');
    
    // تسجيل دخول مجهول للاختبار
    const userCredential = await signInAnonymously(auth);
    console.log('✅ تم تسجيل الدخول المجهول:', userCredential.user.uid);
    
    // اختبار قراءة مجموعة test_connection
    console.log('🔄 اختبار قراءة مجموعة test_connection...');
    const testCollection = collection(db, 'test_connection');
    const testSnapshot = await getDocs(testCollection);
    console.log('✅ قراءة مجموعة test_connection نجحت. عدد المستندات:', testSnapshot.size);
    
    // اختبار إضافة مستند جديد
    console.log('🔄 اختبار إضافة مستند جديد...');
    const testDoc = await addDoc(testCollection, {
      message: 'اختبار الصلاحيات',
      timestamp: new Date(),
      userId: userCredential.user.uid
    });
    console.log('✅ تم إضافة مستند جديد:', testDoc.id);
    
    // اختبار قراءة مجموعة families
    console.log('🔄 اختبار قراءة مجموعة families...');
    const familiesCollection = collection(db, 'families');
    const familiesSnapshot = await getDocs(familiesCollection);
    console.log('✅ قراءة مجموعة families نجحت. عدد المستندات:', familiesSnapshot.size);
    
  } catch (error) {
    console.error('❌ خطأ في اختبار Firestore:', error);
  }
}

testFirestorePermissions();
