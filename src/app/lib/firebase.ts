import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { FIREBASE_CONFIG, HAS_FIREBASE_CONFIG } from "./config";

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;

const getFirebaseOptions = (): FirebaseOptions => {
  const missing = requiredKeys.filter((key) => !FIREBASE_CONFIG[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(", ")}`);
  }

  return FIREBASE_CONFIG;
};

export const getFirebaseApp = () => {
  if (!HAS_FIREBASE_CONFIG) {
    throw new Error("Firebase config is missing for phone sign-in.");
  }

  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseOptions());
};

export const getFirebaseAuthInstance = () => getAuth(getFirebaseApp());

let analyticsPromise: Promise<Analytics | null> | null = null;

export const initializeFirebaseAnalytics = () => {
  if (!HAS_FIREBASE_CONFIG || !FIREBASE_CONFIG.measurementId || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported: boolean) => (supported ? getAnalytics(getFirebaseApp()) : null))
      .catch(() => null);
  }

  return analyticsPromise;
};
