// operaiq.client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ---------------------------------------------------------------------------
// Firebase configuration – replace with your project’s values if they differ.
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAnQhZtOrC1UXxuz5q-cH0rWv1LCAM2mXs",
  authDomain: "opera-ai-b0fea.firebaseapp.com",
  projectId: "opera-ai-b0fea",
  storageBucket: "opera-ai-b0fea.appspot.com",
  messagingSenderId: "111162798719",
  appId: "1:111162798719:web:d7fdf6b4cac6665656054a",
  measurementId: "G-7GJGE4ZPVV"
};

// Initialize Firebase app (singleton)
const app = initializeApp(firebaseConfig);

// Export commonly used services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider(); // for Google sign‑in UI
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
