import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { app } from "./config";

// تهيئة خدمة المصادقة
const auth = getAuth(app);

// تصدير الخدمات المطلوبة
export {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
};