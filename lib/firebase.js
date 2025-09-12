// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALLfega545_TZvg7i9o9eg9RZ9EgL6Xg0",
  authDomain: "prepmate-256a3.firebaseapp.com",
  projectId: "prepmate-256a3",
  storageBucket: "prepmate-256a3.firebasestorage.app",
  messagingSenderId: "367354212794",
  appId: "1:367354212794:web:f04dae42f965179223ad83",
  measurementId: "G-452W0QB6D7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// If you previously used recaptcha for phone flows, keep this helper:
import { RecaptchaVerifier } from "firebase/auth";
export const setupRecaptcha = () => {
  if (typeof window !== "undefined" && !window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  }
};
