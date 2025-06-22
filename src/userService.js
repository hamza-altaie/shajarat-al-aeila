import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';

export const fetchUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      console.warn('لا توجد بيانات للمستخدم في Firestore');
      return null;
    }
  } catch (err) {
    console.error('خطأ في جلب بيانات المستخدم:', err);
    throw new Error('فشل في جلب بيانات المستخدم');
  }
};
