/*
  lib/firebase.js - minimal shim
  If you actually use Firebase, replace this with real init code and run:
    npm install firebase
*/
const notConfigured = (name) => () => {
  throw new Error(\`Firebase "\${name}" called but Firebase is not configured. Replace lib/firebase.js with real Firebase init and install the firebase package if needed.\`);
};

export const auth = notConfigured("auth");
export const firestore = notConfigured("firestore");

// default export (keeps imports that import default happy)
export default {
  auth,
  firestore,
};
