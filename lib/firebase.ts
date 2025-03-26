import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

// Firebase configuration - hardcoded for testing
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAHRlGKjXeqqnZhDZnwJSP78-MGWoPTDxo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "visitiraq-d5e49.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "visitiraq-d5e49",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "visitiraq-d5e49.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "608642275608",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:608642275608:web:61c2068642aec7c9ca66d",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-SX3ZJC9GJT"
};

// Track connection state
let firebaseInitialized = false;
let connectionError: Error | null = null;

// Initialize Firebase with error handling
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

try {
  // Initialize Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  
  firebaseInitialized = true;
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  connectionError = error instanceof Error ? error : new Error('Unknown error initializing Firebase');
  
  // Set fallback values for services
  app = null;
  db = null;
  auth = null;
  storage = null;
}

export { 
  app, 
  db, 
  auth, 
  storage,
  firebaseInitialized,
  connectionError
}; 