// firebase.ts

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Uncommented

const firebaseConfig = {
  apiKey: "AIzaSyB4_iEYfejfLLsO6LweYdst_6Ml9fncVLA",
  authDomain: "nust-wms.firebaseapp.com",
  projectId: "nust-wms",
  storageBucket: "nust-wms.appspot.com", // ✅ Corrected
  messagingSenderId: "469646504784",
  appId: "1:469646504784:web:1e29e369644075b92a3255",
  measurementId: "G-S7F1DVZ1KY" // Optional
};

// Prevent duplicate initialization in dev
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app); 

export { app, auth, db }; 