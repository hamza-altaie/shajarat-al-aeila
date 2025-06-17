// src/firebase/auth.js - تصحيح الاستيراد
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { app } from "./config"; // ✅ استيراد صحيح من config

const auth = getAuth(app);

export {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
};