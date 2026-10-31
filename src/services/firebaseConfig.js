import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
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

// Initialize Firebase Auth with Async Storage persistence (safe against Fast Refresh)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

// Initialize Firestore with long-polling for React Native / Expo
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
  });
} catch (e) {
  db = getFirestore(app);
}

export { app, auth, db };
