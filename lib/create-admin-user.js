// This script creates an admin user in Firebase Authentication
// Run it with: node lib/create-admin-user.js
require('dotenv').config({ path: '.env.local' });

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} = require('firebase/auth');

// Firebase configuration - hardcoded for testing
const firebaseConfig = {
  apiKey: "AIzaSyAHRlGKjXeqqnZhDZnwJSP78-MGWoPTDxo",
  authDomain: "visitiraq-d5e49.firebaseapp.com",
  projectId: "visitiraq-d5e49",
  storageBucket: "visitiraq-d5e49.firebasestorage.app",
  messagingSenderId: "608642275608",
  appId: "1:608642275608:web:61c2068642aec7c9ca66d",
  measurementId: "G-SX3ZJC9GJT"
};

console.log('Firebase Config:');
console.log(firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Function to create an admin user
async function createAdminUser() {
  try {
    // Replace with your desired admin user details
    const email = 'admin@visitiraq.com';
    const password = 'Admin123!'; // Use a strong password in production

    // First try to sign in to see if the user already exists
    try {
      console.log('Checking if user already exists...');
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User already exists and credentials are correct');
      return;
    } catch (error) {
      // If error is not auth/user-not-found, log and return
      if (error.code !== 'auth/user-not-found') {
        console.log('Error signing in:', error.code, error.message);
        if (error.code === 'auth/wrong-password') {
          console.log('User exists but password is incorrect. Cannot proceed.');
          return;
        }
      } else {
        console.log('User does not exist. Creating new user...');
      }
    }

    // Create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Admin user created successfully:', userCredential.user.email);
    console.log('UID:', userCredential.user.uid);
    
  } catch (error) {
    console.error('Error creating admin user:', error.code, error.message);
  }
}

// Run the function
createAdminUser(); 