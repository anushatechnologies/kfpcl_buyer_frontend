const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const rawApiUrl = trimTrailingSlash(
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "https://api.kfpclexports.com",
);

// Base origin for endpoints starting with /api/...
export const API_BASE_URL = rawApiUrl.replace(/\/api(\/v1)?$/, "");
export const API_ORIGIN = API_BASE_URL;

export const SHARE_URL = trimTrailingSlash(
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SHARE_URL) || "https://kfpcl.com",
);

export const FIREBASE_CONFIG = {
  apiKey: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_API_KEY) || "AIzaSyBa1Arilraettuqi_8IA0v4Qae0mwrkYjQ",
  // authDomain MUST be the Firebase project auth domain (anushabazaar-2288e.firebaseapp.com)
  // where the Firebase Auth handler and reCAPTCHA iframe are hosted.
  // Your website domain (kfpclexports.com) belongs in Firebase Console → Authentication → Settings → Authorized Domains.
  authDomain: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || "anushabazaar-2288e.firebaseapp.com",
  projectId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || "anushabazaar-2288e",
  appId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_APP_ID) || "1:64875938387:web:a9a54e1f6253e26fba7ca6",
  messagingSenderId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || "64875938387",
  storageBucket: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || "anushabazaar-2288e.firebasestorage.app",
  databaseURL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_DATABASE_URL) || "https://anushabazaar-2288e-default-rtdb.firebaseio.com",
  measurementId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || "G-FPFNPKEK50",
};

export const HAS_FIREBASE_CONFIG = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.appId,
);

export const APP_COPY = {
  brand: "KFPCL Exports",
  tagLine: "Fresh groceries, trusted quality, and doorstep convenience.",
  phonePrimary: "+91 63099 81444",
  phoneSecondary: "+91 63099 81444",
  supportEmail: "kfpclexports@gmail.com",
  backupEmail: "kfpclexports@gmail.com",
  headquarters: "C99F+VXG, Madhura Nagar Colony, Gachibowli, Hyderabad, Telangana 500104",
  defaultCity: "Hyderabad",
  defaultState: "Telangana",
};
