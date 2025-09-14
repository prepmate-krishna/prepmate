// lib/firebase.js
// Minimal shim to avoid build errors when firebase imports exist.
// If you actually use Firebase, replace this with your firebase config code
// and run `npm install firebase`.

const firebaseShim = {
  auth: () => {
    throw new Error("Firebase auth shim called. Replace lib/firebase.js with real Firebase init if you need Firebase.");
  },
  firestore: () => {
    throw new Error("Firebase firestore shim called. Replace lib/firebase.js with real Firebase init if you need Firebase.");
  },
};

export default firebaseShim;
export const getAuth = () => firebaseShim.auth();
export const getFirestore = () => firebaseShim.firestore();
