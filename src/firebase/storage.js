import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "./config";

// تهيئة خدمة التخزين
const storage = getStorage(app);

// تصدير الخدمات المطلوبة
export { 
  storage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
};