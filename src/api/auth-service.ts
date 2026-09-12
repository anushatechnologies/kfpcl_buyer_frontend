/**
 * Production Auth Service: Real SMS OTP with Invisible Verification (Zero Captcha for User)
 * Production Base URL: https://api.kfpclexports.com
 * Firebase SDK: Modular v9/v10
 */

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import axios from "axios";
import { getFirebaseAuthInstance } from "@/app/lib/firebase";
import { API_BASE_URL } from "@/app/lib/config";
import { writeStoredSession } from "@/app/lib/session";
import type { CustomerSession } from "@/app/types/storefront";

const BACKEND_BASE_URL = API_BASE_URL || "https://api.kfpclexports.com";

// Module-level variable to store confirmation result
let confirmationResult: ConfirmationResult | null = null;

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
  }
}

/**
 * Helper to reset/clear any existing reCAPTCHA instance and its DOM container
 */
export function resetRecaptchaVerifier(): void {
  if (typeof window !== "undefined") {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }
    const target = document.getElementById("kfpcl-recaptcha-container");
    if (target) {
      target.remove();
    }
  }
}

/**
 * Helper to initialize 100% INVISIBLE background verifier
 */
export function getInvisibleVerifier(): RecaptchaVerifier {
  // If an active verifier already exists in window, reuse it
  if (typeof window !== "undefined" && window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  const auth = getFirebaseAuthInstance();
  auth.languageCode = "en";

  // Ensure any previous stale DOM container is completely removed
  resetRecaptchaVerifier();

  // Create a brand-new, clean isolated container element
  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.id = "kfpcl-recaptcha-container";
    container.style.position = "fixed";
    container.style.bottom = "0";
    container.style.right = "0";
    container.style.zIndex = "-1";
    document.body.appendChild(container);
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, "kfpcl-recaptcha-container", {
    size: "invisible", // Zero captcha, zero puzzle for the user
    callback: () => {
      console.log("Invisible reCAPTCHA verified successfully in background");
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Resetting verifier.");
      resetRecaptchaVerifier();
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
    const verifier = getInvisibleVerifier();

    confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
    return { success: true, phone: cleanPhone };
  } catch (error: any) {
    console.error("Firebase SMS OTP Error details:", error?.code, error?.message, error);
    // Reset verifier and clean up container if network/token failed
    resetRecaptchaVerifier();

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
  const accessToken = data.accessToken || data.token;
  const refreshToken = data.refreshToken;
  const user = data.user;
  const cleanPhone = user?.phoneNumber || user?.phone || userCredential.user?.phoneNumber || "";

  if (accessToken && typeof window !== "undefined") {
    // Persist via writeStoredSession so SESSION_UPDATED_EVENT is fired
    // and Zustand authStore hydrates immediately
    const sessionData: CustomerSession = {
      accessToken,
      refreshToken: refreshToken || "",
      customerId: Number(user?.buyerId || user?.id) || 1,
      phoneNumber: cleanPhone,
      name: user?.fullName || user?.name || "Buyer",
      email: user?.email || "",
      roles: user?.role || user?.roles || "buyer",
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    writeStoredSession(sessionData);
    // Also write to raw keys for maximum compatibility
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("kfpcl_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("kfpcl_refresh_token", refreshToken);
    }
    const userToStore = user || {
      buyerId: String(sessionData.customerId),
      id: String(sessionData.customerId),
      fullName: sessionData.name,
      phoneNumber: cleanPhone,
      email: sessionData.email,
      role: "buyer",
    };
    localStorage.setItem("buyer", JSON.stringify(userToStore));
    localStorage.setItem("user", JSON.stringify(userToStore));
    if (sessionData.phoneNumber) {
      localStorage.setItem("kfpcl_user_phone", sessionData.phoneNumber);
    }
    if (sessionData.email) {
      localStorage.setItem("kfpcl_user_email", sessionData.email);
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

  let response: any;
  try {
    // Primary Web buyer registration endpoint: POST /api/v1/buyer/auth/register
    response = await axios.post(`${BACKEND_BASE_URL}/api/v1/buyer/auth/register`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (err: any) {
    // If backend returned HTTP 400 (e.g. duplicate email), immediately propagate error
    if (err?.response?.status === 400) {
      throw err;
    }
    // If 404, fallback to legacy /api/v1/register
    if (err?.response?.status === 404 || !err?.response) {
      response = await axios.post(`${BACKEND_BASE_URL}/api/v1/register`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } else {
      throw err;
    }
  }

  return response.data;
}
