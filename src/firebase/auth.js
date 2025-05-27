import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { app } from "../firebase/config";

const auth = getAuth(app);

export {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber
};
