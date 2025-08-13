// src/utils/firestoreTest.js - اختبار الاتصال مع Firestore
/* eslint-disable no-console */
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

/**
 * اختبار الاتصال مع Firestore
 * @param {string} uid - معرف المستخدم للاختبار
 * @returns {Object} نتيجة الاختبار
 */
export const testFirestoreConnection = async (uid) => {
  const testResults = {
    connection: false,
    write: false,
    read: false,
    delete: false,
    error: null
  };

  try {
    // اختبار الاتصال
    console.log('🔍 بدء اختبار Firestore...');
    
    // اختبار الكتابة
    const testDocRef = doc(db, 'test_connection', `test_${uid}_${Date.now()}`);
    const testData = {
      message: 'اختبار الاتصال مع Firestore',
      timestamp: serverTimestamp(),
      userId: uid,
      testId: Math.random().toString(36).substr(2, 9)
    };
    
    await setDoc(testDocRef, testData);
    testResults.write = true;
    console.log('✅ اختبار الكتابة نجح');
    
    // اختبار القراءة
    const docSnap = await getDoc(testDocRef);
    if (docSnap.exists()) {
      testResults.read = true;
      console.log('✅ اختبار القراءة نجح');
      console.log('📄 البيانات المقروءة:', docSnap.data());
    }
    
    // اختبار الحذف
    await deleteDoc(testDocRef);
    testResults.delete = true;
    console.log('✅ اختبار الحذف نجح');
    
    testResults.connection = true;
    console.log('🎉 جميع اختبارات Firestore نجحت!');
    
  } catch (error) {
    testResults.error = error.message;
    console.error('❌ خطأ في اختبار Firestore:', error);
  }
  
  return testResults;
};

/**
 * اختبار إنشاء مستخدم تجريبي
 * @param {string} uid - معرف المستخدم
 * @param {string} phoneNumber - رقم الهاتف
 * @returns {Object} نتيجة الإنشاء
 */
export const createTestUser = async (uid, phoneNumber) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userData = {
      uid,
      phoneNumber,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      isTestUser: true
    };
    
    await setDoc(userRef, userData);
    console.log('✅ تم إنشاء مستخدم تجريبي:', uid);
    
    return { success: true, userData };
  } catch (error) {
    console.error('❌ خطأ في إنشاء المستخدم التجريبي:', error);
    return { success: false, error: error.message };
  }
};

/**
 * اختبار إنشاء عضو عائلة تجريبي
 * @param {string} uid - معرف المستخدم
 * @returns {Object} نتيجة الإنشاء
 */
export const createTestFamilyMember = async (uid) => {
  try {
    const familyRef = doc(collection(db, 'families'));
    const memberData = {
      userId: uid,
      firstName: 'أحمد',
      fatherName: 'محمد',
      grandfatherName: 'علي',
      surname: 'الطائي',
      relation: 'الأب',
      birthdate: '1980-01-01',
      avatar: '',
      parentId: null,
      manualParentName: '',
      linkedParentUid: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isTestMember: true
    };
    
    await setDoc(familyRef, memberData);
    console.log('✅ تم إنشاء عضو عائلة تجريبي:', familyRef.id);
    
    return { success: true, memberId: familyRef.id, memberData };
  } catch (error) {
    console.error('❌ خطأ في إنشاء عضو العائلة التجريبي:', error);
    return { success: false, error: error.message };
  }
};

/**
 * تنظيف البيانات التجريبية
 * @param {string} uid - معرف المستخدم
 */
export const cleanupTestData = async (uid) => {
  try {
    console.log('🧹 بدء تنظيف البيانات التجريبية...');
    
    // حذف المستخدم التجريبي
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    
    // حذف أعضاء العائلة التجريبيين
    const familiesRef = collection(db, 'families');
    const q = query(familiesRef, where('userId', '==', uid), where('isTestMember', '==', true));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    console.log('✅ تم تنظيف البيانات التجريبية بنجاح');
    return { success: true };
    
  } catch (error) {
    console.error('❌ خطأ في تنظيف البيانات التجريبية:', error);
    return { success: false, error: error.message };
  }
};
