/**
 * Firebase Phone Authentication Service
 * Sends real OTP via Firebase to the user's mobile number.
 * OTP is delivered by Firebase through SMS.
 */

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from "firebase/auth";
import { getFirebaseAuthInstance } from "@/app/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
    confirmationResult?: ConfirmationResult | null;
  }
}

/**
 * 1. Helper to safely get or create RecaptchaVerifier
 * Cleans up any existing instance and resets container DOM to prevent
 * "reCAPTCHA has already been rendered in this element" errors.
 */
export const setupRecaptcha = (containerId: string = "recaptcha-container"): RecaptchaVerifier => {
  const auth: Auth = getFirebaseAuthInstance();
  // Clear previous verifier
  if (typeof window !== "undefined" && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (_) {}
    window.recaptchaVerifier = null;
  }
  // Replace container element so grecaptcha treats it as a brand new element
  if (typeof document !== "undefined") {
    const existing = document.getElementById(containerId);
    if (existing && existing.parentNode) {
      const freshContainer = document.createElement("div");
      freshContainer.id = containerId;
      freshContainer.style.display = "none";
      existing.parentNode.replaceChild(freshContainer, existing);
    } else if (!existing) {
      const container = document.createElement("div");
      container.id = containerId;
      container.style.display = "none";
      document.body.appendChild(container);
    }
  }
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      if (typeof window !== "undefined") {
        window.recaptchaVerifier = null;
      }
    },
  });
  if (typeof window !== "undefined") {
    window.recaptchaVerifier = verifier;
  }
  return verifier;
};

/**
 * 2. Send Real SMS via Firebase Phone Auth
 * Sanitizes phone number strictly to E.164 (+91XXXXXXXXXX) with NO SPACES to prevent
 * identitytoolkit 400 Bad Request.
 */
export const firebaseSendOtp = async (
  rawPhoneNumber: string,
  containerId: string = "recaptcha-container"
): Promise<{ success: true; message: string }> => {
  try {
    // Sanitize phone number strictly to E.164 without any spaces or hyphens:
    const clean10Digits = rawPhoneNumber.replace(/[^0-9]/g, "").slice(-10);
    if (clean10Digits.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number");
    }

    const e164Phone = `+91${clean10Digits}`; // e.g. "+919959940727" (NO SPACES!)
    const auth = getFirebaseAuthInstance();
    const appVerifier = setupRecaptcha(containerId);

    const confirmation = await signInWithPhoneNumber(auth, e164Phone, appVerifier);

    // Store confirmation object in window for OTP verification
    if (typeof window !== "undefined") {
      window.confirmationResult = confirmation;
    }

    return {
      success: true,
      message: `OTP sent to +91 ******${clean10Digits.slice(-4)} via SMS`,
    };
  } catch (err: any) {
    console.error("Firebase SMS Send Error:", err);

    // Clean up reCAPTCHA so user can retry without 'already rendered' error
    if (typeof window !== "undefined" && window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        // ignore
      }
      window.recaptchaVerifier = null;
    }

    const code: string = err?.code || "";
    if (code === "auth/invalid-app-credential") {
      const error: any = new Error(
        "Firebase app verification failed (auth/invalid-app-credential). Ensure your domain is listed in Firebase Console -> Authentication -> Settings -> Authorized Domains."
      );
      error.code = code;
      throw error;
    }
    if (code === "auth/unauthorized-domain") {
      const error: any = new Error(
        "This domain is not authorized in Firebase Authentication. Add it under Firebase Console -> Authentication -> Settings -> Authorized Domains."
      );
      error.code = code;
      throw error;
    }
    if (code === "auth/operation-not-allowed") {
      const error: any = new Error(
        "Phone sign-in is not enabled in Firebase Authentication. Enable Phone provider in Firebase Console -> Authentication -> Sign-in method."
      );
      error.code = code;
      throw error;
    }
    if (code === "auth/invalid-phone-number") {
      const error: any = new Error("Invalid phone number format. Please enter a valid 10-digit number.");
      error.code = code;
      throw error;
    }
    if (code === "auth/too-many-requests") {
      const error: any = new Error("Too many attempts. Please wait a moment before requesting another OTP.");
      error.code = code;
      throw error;
    }
    if (code === "auth/captcha-check-failed") {
      const error: any = new Error("reCAPTCHA security check failed. Please refresh and try again.");
      error.code = code;
      throw error;
    }
    if (code === "auth/network-request-failed") {
      const error: any = new Error("Network request failed. Please check your internet connection.");
      error.code = code;
      throw error;
    }

    const customErr: any = new Error(err?.message || "Failed to send OTP: " + (err?.message || err));
    customErr.code = code;
    throw customErr;
  }
};

/**
 * 3. Confirm OTP and obtain Firebase ID Token
 */
export const firebaseVerifyOtp = async (
  enteredOtp: string
): Promise<{
  success: true;
  uid: string;
  idToken: string;
  phoneNumber: string;
}> => {
  const confirmation = typeof window !== "undefined" ? window.confirmationResult : null;

  if (!confirmation) {
    throw new Error("Session expired. Please request a new OTP.");
  }

  const cleanOtp = (enteredOtp || "").trim();
  if (!cleanOtp || cleanOtp.length < 6) {
    throw new Error("Please enter the complete 6-digit verification code.");
  }

  try {
    const result = await confirmation.confirm(cleanOtp);
    const user = result.user;
    const idToken = await user.getIdToken();

    // Clean up session confirmation after successful verification
    if (typeof window !== "undefined") {
      window.confirmationResult = null;
    }

    return {
      success: true,
      uid: user.uid,
      idToken,
      phoneNumber: user.phoneNumber || "",
    };
  } catch (err: any) {
    console.error("Invalid OTP:", err);
    const code: string = err?.code || "";
    if (code === "auth/invalid-verification-code") {
      throw new Error("Invalid verification code. Please check and try again.");
    }
    if (code === "auth/code-expired") {
      throw new Error("Verification code has expired. Please request a new OTP.");
    }
    if (code === "auth/session-expired") {
      throw new Error("Session expired. Please request a new OTP.");
    }
    throw new Error(err?.message || "Invalid verification code. Please check and try again.");
  }
};

/**
 * 4. Helper to perform Backend Login after Firebase Verification
 * POST https://api.kfpclexports.com/api/auth/firebase-login
 */
export const firebaseLoginBackend = async ({
  idToken,
  phoneNumber,
  fullName,
  email = "",
}: {
  idToken: string;
  phoneNumber?: string;
  fullName?: string;
  email?: string;
}) => {
  const response = await fetch("https://api.kfpclexports.com/api/auth/firebase-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idToken,
      fcmToken: "",
      fullName: fullName || `Buyer ${(phoneNumber || "").slice(-4) || "User"}`,
      email: email || "",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Backend login failed: " + (data?.message || "Unknown error"));
  }

  if (typeof window !== "undefined") {
    if (data.accessToken) localStorage.setItem("accessToken", data.accessToken);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};

/**
 * 5. Reset the Firebase OTP session & reCAPTCHA verifier
 */
export const resetFirebaseSession = () => {
  if (typeof window !== "undefined") {
    window.confirmationResult = null;
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }
  }
};
