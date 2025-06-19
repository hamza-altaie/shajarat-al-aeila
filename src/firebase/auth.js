// src/firebase/auth.js
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { app } from "./config";

const auth = getAuth(app);

export {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
};