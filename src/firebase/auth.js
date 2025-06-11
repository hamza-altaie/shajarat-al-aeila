// src/firebase/auth.js
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import app from "./config"; // ✅ تصحيح الاستيراد

const auth = getAuth(app);

export {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
};