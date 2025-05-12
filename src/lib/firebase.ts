"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAaikrjCPCzXZDmS4umPpXKpX_WiIvtbjY",
  authDomain: "absensi-kehadiran-834e4.firebaseapp.com",
  projectId: "absensi-kehadiran-834e4",
  storageBucket: "absensi-kehadiran-834e4.appspot.com",
  messagingSenderId: "426481229875",
  appId: "1:426481229875:web:e6c8f1e3550370080d0346",
  measurementId: "G-1ZQQGP3ZQ1"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence for Firestore - with better error handling and reconnection
if (typeof window !== 'undefined') {
  // Import and enable persistence only on client side
  import('firebase/firestore').then((firestore) => {
    try {
      // Skip reinitializing Firestore if it's already initialized
      if (getApps().length > 0) {
        // Set network reconnection parameters
        firestore.setLogLevel('error'); // Only log errors
        
        // Enable persistence only if it hasn't been enabled yet
        firestore.enableIndexedDbPersistence(db, {
          forceOwnership: false // Don't force persistence in this tab
        }).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
          } else if (err.code === 'unimplemented') {
            console.warn("The current browser doesn't support all of the features required to enable persistence");
          } else if (err.code !== "already-initialized") {
            console.error("Error enabling persistence:", err);
          }
          // Silently ignore 'already-initialized' errors
        });
      }
      
      // Add online/offline detection
      window.addEventListener('online', () => {
        console.log('App is online. Reconnecting to Firestore...');
      });
      
      window.addEventListener('offline', () => {
        console.log('App is offline. Operations will be queued.');
      });
      
    } catch (err) {
      console.error("Firestore initialization error:", err);
    }
  });
}

export { app, auth, db, storage };
