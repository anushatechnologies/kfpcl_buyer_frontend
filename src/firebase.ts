// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBa1Arilraettuqi_8IA0v4Qae0mwrkYjQ",
  authDomain: "anushabazaar-2288e.firebaseapp.com",
  databaseURL: "https://anushabazaar-2288e-default-rtdb.firebaseio.com",
  projectId: "anushabazaar-2288e",
  storageBucket: "anushabazaar-2288e.firebasestorage.app",
  messagingSenderId: "64875938387",
  appId: "1:64875938387:web:a9a54e1f6253e26fba7ca6",
  measurementId: "G-FPFNPKEK50"
};

// Initialize Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Safe Analytics initialization for browser environments
let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export const analytics = analyticsInstance;
export const getFirebaseAnalytics = () => analyticsInstance;

export default app;
