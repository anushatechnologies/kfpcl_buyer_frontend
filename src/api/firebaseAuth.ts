/**
 * Firebase Phone Authentication Service
 * Sends real OTP via Firebase to the user's mobile number.
 * OTP is delivered by Firebase through SMS — never shown on screen.
 */

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';
import { getFirebaseAuthInstance } from '@/app/lib/firebase';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

/**
 * Initialize invisible reCAPTCHA on a container element.
 * Call this once before sending OTP.
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  const auth: Auth = getFirebaseAuthInstance();

  // Clear previous verifier if it exists
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (_) {
      // ignore
    }
    recaptchaVerifier = null;
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved — OTP will be sent
    },
    'expired-callback': () => {
      // Reset verifier when reCAPTCHA expires
      recaptchaVerifier = null;
    },
  });

  return recaptchaVerifier;
}

/**
 * Send OTP via Firebase Phone Auth.
 * @param phoneNumber - 10-digit Indian mobile number (without country code)
 * @param containerId - DOM element ID for invisible reCAPTCHA anchor
 */
export async function firebaseSendOtp(
  phoneNumber: string,
  containerId: string = 'firebase-recaptcha-container'
): Promise<{ success: true; message: string }> {
  const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const e164Phone = `+91${cleanPhone}`; // Indian numbers

  const verifier = setupRecaptcha(containerId);
  confirmationResult = await signInWithPhoneNumber(getFirebaseAuthInstance(), e164Phone, verifier);

  return {
    success: true,
    message: `OTP sent to +91 ******${cleanPhone.slice(-4)} via SMS`,
  };
}

/**
 * Verify the OTP entered by the user via Firebase.
 * Returns the Firebase UID and ID token on success.
 */
export async function firebaseVerifyOtp(otp: string): Promise<{
  success: true;
  uid: string;
  idToken: string;
  phoneNumber: string;
}> {
  if (!confirmationResult) {
    throw new Error('No OTP session found. Please request a new OTP.');
  }

  const cleanOtp = otp.trim();
  if (!cleanOtp || cleanOtp.length < 6) {
    throw new Error('Please enter the complete 6-digit OTP.');
  }

  try {
    const credential = await confirmationResult.confirm(cleanOtp);
    const user = credential.user;
    const idToken = await user.getIdToken();

    // Clear after successful verification
    confirmationResult = null;

    return {
      success: true,
      uid: user.uid,
      idToken,
      phoneNumber: user.phoneNumber || '',
    };
  } catch (err: any) {
    const code: string = err?.code || '';
    if (code === 'auth/invalid-verification-code') {
      throw new Error('Incorrect OTP. Please check the code sent to your phone.');
    }
    if (code === 'auth/code-expired') {
      throw new Error('OTP has expired. Please request a new code.');
    }
    if (code === 'auth/session-expired') {
      throw new Error('Session expired. Please request a new OTP.');
    }
    throw new Error(err?.message || 'OTP verification failed. Please try again.');
  }
}

/**
 * Reset the Firebase OTP session (e.g. when user changes phone number)
 */
export function resetFirebaseSession() {
  confirmationResult = null;
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (_) {
      // ignore
    }
    recaptchaVerifier = null;
  }
}
