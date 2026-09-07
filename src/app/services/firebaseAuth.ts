import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import { HAS_FIREBASE_CONFIG } from "../lib/config";
import { getFirebaseAuthInstance } from "../lib/firebase";
import { withCountryCode } from "../lib/storefrontUtils";

const extractFirebaseAuthErrorCode = (error: any) =>
  error?.code ||
  (typeof error?.message === "string" && /recaptcha\s+timeout/i.test(error.message)
    ? "auth/recaptcha-timeout"
    : "") ||
  (typeof error?.message === "string" ? error.message.match(/auth\/[a-z-]+/)?.[0] : "") ||
  "";

const resolveFirebaseAuthErrorMessage = (error: any) => {
  const errorCode = extractFirebaseAuthErrorCode(error);

  switch (errorCode) {
    case "auth/invalid-api-key":
      return "Firebase rejected the website API key. Restart the website after updating .env, and add localhost or your website domain in Firebase Authentication authorized domains.";
    case "auth/unauthorized-domain":
      return "This website domain is not authorized in Firebase Authentication. Add localhost and your live website domain in Firebase console.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is not enabled in Firebase Authentication for this project.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
      return "The automatic security check failed. Refresh the page and try sending the OTP again.";
    case "auth/recaptcha-timeout":
      return "The automatic reCAPTCHA security check timed out. Refresh the page, turn off strict privacy/ad-block extensions for this site, and try sending the OTP again.";
    case "auth/localhost-not-supported":
      return "Firebase phone auth on web does not support real SMS verification from localhost. Use your live website domain for real OTPs, or switch localhost to Firebase test phone numbers.";
    case "auth/too-many-requests":
      return "Too many OTP attempts were made. Please wait a few minutes and try again.";
    case "auth/code-expired":
      return "This OTP has expired. Request a fresh OTP and try again.";
    case "auth/invalid-verification-code":
      return "The OTP you entered is incorrect. Please check the 6-digit code and try again.";
    case "auth/missing-verification-code":
      return "Enter the 6-digit OTP to continue.";
    default:
      return error?.message || "Firebase authentication is unavailable right now.";
  }
};

const createFirebaseAuthError = (error: any) => {
  const friendlyError = new Error(resolveFirebaseAuthErrorMessage(error)) as Error & {
    rawCode?: string;
    rawMessage?: string;
  };

  friendlyError.rawCode = extractFirebaseAuthErrorCode(error);
  friendlyError.rawMessage = typeof error?.message === "string" ? error.message : "";

  return friendlyError;
};

type RecaptchaContainer = HTMLElement & {
  __verifier?: RecaptchaVerifier;
  __widgetId?: number;
  __challengeId?: string;
};

const ensureFirebaseAuth = () => {
  if (!HAS_FIREBASE_CONFIG) {
    throw new Error("Firebase config is missing for phone sign-in.");
  }

  return getFirebaseAuthInstance();
};

export const resetPhoneOtpChallenge = (recaptchaContainerId: string) => {
  const container = document.getElementById(recaptchaContainerId) as RecaptchaContainer | null;

  if (!container) return;

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && container.contains(activeElement)) {
    activeElement.blur();
  }

  try {
    container.__verifier?.clear?.();
  } catch {
    // Ignore cleanup failures from stale verifier instances.
  }

  delete container.__verifier;
  delete container.__widgetId;
  delete container.__challengeId;
  container.innerHTML = "";
};

const getRecaptchaVerifier = (recaptchaContainerId: string) => {
  const auth = ensureFirebaseAuth();
  const container = document.getElementById(recaptchaContainerId) as RecaptchaContainer | null;

  if (!container) {
    throw new Error("Security check container not found.");
  }

  if (!container.__verifier) {
    if (container.childElementCount > 0) {
      container.innerHTML = "";
    }

    const challenge = document.createElement("div");
    challenge.id = `${recaptchaContainerId}-challenge-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    container.appendChild(challenge);
    container.__challengeId = challenge.id;
    container.__verifier = new RecaptchaVerifier(auth, challenge.id, {
      size: "invisible",
    });
  }

  return {
    auth,
    verifier: container.__verifier,
  };
};

export interface PhoneOtpRequest {
  phoneNumber: string;
  recaptchaContainerId: string;
}

export interface PhoneOtpResult {
  verificationId: string;
}

export const sendPhoneOtp = async ({
  phoneNumber,
  recaptchaContainerId,
}: PhoneOtpRequest): Promise<PhoneOtpResult> => {
  try {
    const { auth, verifier } = getRecaptchaVerifier(recaptchaContainerId);
    await signOut(auth).catch(() => undefined);
    const container = document.getElementById(recaptchaContainerId) as RecaptchaContainer | null;
    if (container && container.__widgetId == null) {
      container.__widgetId = await verifier.render();
    }

    const confirmation = await signInWithPhoneNumber(auth, withCountryCode(phoneNumber), verifier);
    return {
      verificationId: confirmation.verificationId,
    };
  } catch (error: any) {
    resetPhoneOtpChallenge(recaptchaContainerId);
    throw createFirebaseAuthError(error);
  }
};

export const confirmPhoneOtp = async (verificationId: string, otpCode: string) => {
  try {
    const auth = ensureFirebaseAuth();
    const credential = PhoneAuthProvider.credential(verificationId, otpCode);
    const result = await signInWithCredential(auth, credential);
    const firebaseUser = result?.user;

    if (!firebaseUser) {
      throw new Error("Unable to verify OTP. Please try again.");
    }

    const firebaseIdToken = await firebaseUser.getIdToken(true);
    await signOut(auth).catch(() => undefined);
    return firebaseIdToken;
  } catch (error: any) {
    throw createFirebaseAuthError(error);
  }
};
