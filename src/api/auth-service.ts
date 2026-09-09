/**
 * Production Auth Service: Real SMS OTP with Invisible Verification (Zero Captcha for User)
 * Production Base URL: https://api.kfpclexports.com
 * Firebase SDK: Modular v9/v10
 */

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import axios from "axios";
import { getFirebaseAuthInstance } from "@/app/lib/firebase";
import { API_BASE_URL } from "@/app/lib/config";

const BACKEND_BASE_URL = API_BASE_URL || "https://api.kfpclexports.com";

// Module-level variable to store confirmation result
let confirmationResult: ConfirmationResult | null = null;

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

/**
 * Helper to initialize 100% INVISIBLE background verifier
 */
export function getInvisibleVerifier(containerId = "kfpcl-recaptcha-container"): RecaptchaVerifier {
  const auth = getFirebaseAuthInstance();
  auth.languageCode = "en";

  // Clean up any existing instance to avoid duplicate renders
  if (typeof window !== "undefined" && window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (_) {}
    window.recaptchaVerifier = null;
  }

  // Ensure dedicated isolated container div exists in the DOM
  if (typeof document !== "undefined") {
    let target = document.getElementById("kfpcl-recaptcha-container");
    if (!target) {
      target = document.createElement("div");
      target.id = "kfpcl-recaptcha-container";
      target.style.position = "fixed";
      target.style.bottom = "0";
      target.style.right = "0";
      target.style.zIndex = "-1";
      document.body.appendChild(target);
    }
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, "kfpcl-recaptcha-container", {
    size: "invisible", // Zero captcha, zero puzzle for the user
    callback: () => {
      console.log("Invisible reCAPTCHA verified successfully in background");
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Resetting verifier.");
      if (typeof window !== "undefined") {
        window.recaptchaVerifier = null;
      }
    },
  });

  return window.recaptchaVerifier;
}

/**
 * 1. Check if phone number exists in DB
 */
export async function checkPhoneStatus(rawPhone: string): Promise<{ exists: boolean; isRegistered: boolean; success: boolean }> {
  const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error("Please enter a valid 10-digit mobile number");
  }

  const response = await axios.get(`${BACKEND_BASE_URL}/api/auth/check-phone/${cleanPhone}`);
  const data = response.data?.data || response.data || {};
  const isRegistered = Boolean(data.isRegistered ?? data.registered ?? data.exists);

  return {
    exists: isRegistered,
    isRegistered,
    success: true,
  };
}

/**
 * 2. Send Real SMS OTP to Mobile Phone (Invisible Background Check)
 */
export async function sendRealSmsOtp(rawPhone: string, buttonElementId = "send-otp-btn"): Promise<{ success: boolean; phone: string }> {
  try {
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number");
    }

    const fullPhoneNumber = `+91${cleanPhone}`;
    const auth = getFirebaseAuthInstance();
    const verifier = getInvisibleVerifier(buttonElementId);

    confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
    return { success: true, phone: cleanPhone };
  } catch (error: any) {
    console.error("Firebase SMS OTP Error details:", error?.code, error?.message, error);
    // Reset verifier if network/token failed
    if (typeof window !== "undefined" && window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }

    let friendly = error?.message || "Failed to send SMS OTP.";
    const code = error?.code || "";
    const msg = error?.message || "";

    if (code === "auth/too-many-requests" || msg.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
      friendly = "Too many OTP requests. Firebase SMS limit reached for today or this phone number. Please wait a while or check Firebase Console.";
    } else if (code === "auth/quota-exceeded" || msg.includes("QUOTA_EXCEEDED")) {
      friendly = "Daily SMS quota exceeded on Firebase project (Spark free tier is 10 SMS/day). Upgrade to Blaze plan to send unlimited SMS.";
    } else if (code === "auth/invalid-phone-number") {
      friendly = "Invalid phone number. Please enter a valid 10-digit Indian mobile number.";
    } else if (code === "auth/captcha-check-failed") {
      friendly = "Background verification failed. Please refresh the page and try again.";
    } else if (code === "auth/unauthorized-domain") {
      friendly = "Domain not authorized in Firebase Console (Authentication > Settings > Authorized domains).";
    } else if (code === "auth/billing-not-enabled") {
      friendly = "Firebase Phone Auth requires a linked Cloud Billing account for SMS delivery.";
    }

    throw new Error(friendly);
  }
}

/**
 * 3. Verify OTP & Authenticate Existing Buyer (Login)
 */
export async function verifyOtpAndLogin(sixDigitOtp: string): Promise<any> {
  if (!confirmationResult) {
    throw new Error("Please request an OTP first.");
  }

  const cleanOtp = sixDigitOtp.trim();
  if (cleanOtp.length !== 6) {
    throw new Error("Please enter the complete 6-digit OTP.");
  }

  // 1. Confirm code with Firebase
  const userCredential = await confirmationResult.confirm(cleanOtp);
  const idToken = await userCredential.user.getIdToken();

  // 2. Call Spring Boot Backend
  const response = await axios.post(`${BACKEND_BASE_URL}/api/auth/firebase-login`, {
    idToken: idToken,
  });

  const data = response.data?.data || response.data || {};
  const { accessToken, refreshToken, user } = data;

  if (accessToken && typeof window !== "undefined") {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("kfpcl_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("kfpcl_refresh_token", refreshToken);
    }
    if (user) {
      localStorage.setItem("buyer", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
    }
  }

  return { accessToken, refreshToken, user };
}

/**
 * 4. Verify OTP for New Buyer (During Registration)
 */
export async function verifyOtpForRegistration(sixDigitOtp: string): Promise<User> {
  if (!confirmationResult) {
    throw new Error("Please request an OTP first.");
  }

  const cleanOtp = sixDigitOtp.trim();
  if (cleanOtp.length !== 6) {
    throw new Error("Please enter the complete 6-digit OTP.");
  }

  // Confirms with Firebase that user owns the phone
  const userCredential = await confirmationResult.confirm(cleanOtp);
  return userCredential.user; // Phone is now verified!
}

export interface BuyerRegistrationFormValues {
  fullName: string;
  mobileNumber: string;
  email: string;
  companyName: string;
  businessType: string; // "WHOLESALER", "TRADER", "RETAILER", or "OTHER"
  state: string;
  city: string;
  panNumber: string;
  panCardFile?: File | null;
  gstin?: string;
  gstinPhotoFile?: File | null;
}

/**
 * 5. Submit Registration Form with Multipart Form Data
 */
export async function submitBuyerRegistration(formValues: BuyerRegistrationFormValues): Promise<any> {
  const formData = new FormData();
  formData.append("fullName", formValues.fullName);
  formData.append("mobileNumber", formValues.mobileNumber.replace(/\D/g, "").slice(-10));
  formData.append("email", formValues.email);
  formData.append("companyName", formValues.companyName);
  formData.append("businessType", formValues.businessType); // "WHOLESALER", "TRADER", "RETAILER", or "OTHER"
  formData.append("state", formValues.state);
  formData.append("city", formValues.city);
  formData.append("panNumber", formValues.panNumber.toUpperCase());

  if (formValues.panCardFile) {
    formData.append("panCardImage", formValues.panCardFile); // File object
  }
  if (formValues.gstin) {
    formData.append("gstin", formValues.gstin.toUpperCase());
  }
  if (formValues.gstinPhotoFile) {
    formData.append("gstinPhoto", formValues.gstinPhotoFile); // File object
  }

  const response = await axios.post(`${BACKEND_BASE_URL}/api/v1/register`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
