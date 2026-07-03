import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyD1rxvncWoRVUZ-HyR7KFADqDiwxPMsLn8",
  authDomain: "pawscura-dbd13.firebaseapp.com",
  projectId: "pawscura-dbd13",
  storageBucket: "pawscura-dbd13.firebasestorage.app",
  messagingSenderId: "528980114902",
  appId: "1:528980114902:web:d43ae7115220f005c5b877",
  measurementId: "G-L85D17LS3C"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with Async Storage persistence for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
