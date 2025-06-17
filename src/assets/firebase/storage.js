// src/firebase/storage.js
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from './config'; // استيراد التطبيق الافتراضي

// تهيئة خدمة التخزين
export const storage = getStorage(app);

/**
 * رفع ملف إلى Firebase Storage
 * @param {File} file - الملف المراد رفعه
 * @param {string} path - مسار الحفظ
 * @returns {Promise<string>} رابط الملف
 */
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    throw error;
  }
};

/**
 * رفع صورة العضو
 * @param {File} file - ملف الصورة
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<string>} رابط الصورة
 */
export const uploadAvatar = async (file, userId) => {
  const timestamp = Date.now();
  const fileName = `${userId}_${timestamp}_${file.name}`;
  const path = `avatars/${fileName}`;
  
  return await uploadFile(file, path);
};

/**
 * حذف ملف من التخزين
 * @param {string} url - رابط الملف
 */
export const deleteFile = async (url) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('خطأ في حذف الملف:', error);
    throw error;
  }
};

/**
 * الحصول على مرجع ملف
 * @param {string} path - مسار الملف
 * @returns {StorageReference} مرجع الملف
 */
export const getFileRef = (path) => {
  return ref(storage, path);
};

export default storage;