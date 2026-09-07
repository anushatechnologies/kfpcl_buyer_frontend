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
  import.meta.env.VITE_SHARE_URL || "https://kfpcl.com",
);

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
