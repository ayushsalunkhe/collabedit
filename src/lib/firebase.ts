import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- Firebase Configuration ---
// IMPORTANT: Replace the placeholder values below with your own
// Firebase project's configuration. For more information, see:
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBBGyHMNRYG8odoGCGUpO0QLCSjeuFZUnQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "codesync-ceeb7.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "codesync-ceeb7",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "codesync-ceeb7.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "284318557427",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:284318557427:web:fc2cd30471db7912e60386"
};

// Initialize Firebase App
// This pattern prevents reinitializing the app on hot reloads
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firebase services
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
