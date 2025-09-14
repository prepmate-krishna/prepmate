// lib/firebase.js - Firebase initializer (modular SDK v9+)
// Uses NEXT_PUBLIC_FIREBASE_* env vars (set these in Vercel and .env.local)
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

// Initialize Firebase app only once
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Export auth and firestore instances
export const auth = getAuth();
export const firestore = getFirestore();

// Default export (for any default imports)
export default { auth, firestore };
