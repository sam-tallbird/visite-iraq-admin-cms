// Test Firebase authentication
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration from .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Print config (without quotes)
console.log('Firebase Config:');
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`${key}: ${value?.replace(/"/g, '')}`);
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test login
async function testLogin() {
  try {
    console.log('Attempting to login...');
    // Replace with your actual test credentials
    const email = 'admin@visitiraq.com';
    const password = 'yourpassword'; // Replace with the actual password you set
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful!');
    console.log('User:', userCredential.user.email);
  } catch (error) {
    console.error('Login error:', error.code, error.message);
  }
}

// Run the test
testLogin(); 