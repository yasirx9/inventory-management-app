// Firebase configuration and initialization for EIH Inventory
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

// Your live Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyATr38SZhW5pUPd8pQNJjojP6mxrq39Hos",
  authDomain: "eih-inventory.firebaseapp.com",
  databaseURL: "https://eih-inventory-default-rtdb.firebaseio.com",
  projectId: "eih-inventory",
  storageBucket: "eih-inventory.firebasestorage.app",
  messagingSenderId: "564301733461",
  appId: "1:564301733461:web:291062ce2b8419a516fedc",
  measurementId: "G-KQF9T0E8T2"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase Realtime Database
export const database = getDatabase(app);
export const rtdb = database; // Alias for convenience

// Initialize and export Firestore (backup database)
export const firestore = getFirestore(app);
export const db = firestore; // Alias for convenience

export default app;
