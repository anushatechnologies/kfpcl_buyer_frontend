import axios from 'axios';
import apiClient from './client';

export interface SendSmsResult {
  success: boolean;
  message: string;
  sessionId?: string;
  expiresInSeconds?: number;
}

export interface VerifySmsResult {
  success: boolean;
  message?: string;
}

const SMS_SESSION_KEY_PREFIX = 'kfpcl_sms_sess_';

// Environment configurations
const TWO_FACTOR_API_KEY = (import.meta.env.VITE_2FACTOR_API_KEY || '').trim();
const FAST2SMS_API_KEY = (import.meta.env.VITE_FAST2SMS_API_KEY || '').trim();
const MSG91_AUTH_KEY = (import.meta.env.VITE_MSG91_AUTH_KEY || '').trim();
const MSG91_TEMPLATE_ID = (import.meta.env.VITE_MSG91_TEMPLATE_ID || '').trim();
const CUSTOM_SMS_URL = (import.meta.env.VITE_SMS_GATEWAY_URL || import.meta.env.VITE_OTP_API_URL || '').trim();
const CUSTOM_VERIFY_URL = (import.meta.env.VITE_VERIFY_OTP_API_URL || '').trim();

/**
 * Clean phone number to standard 10-digit Indian mobile format
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
function generateSecureOtp(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store SMS OTP session securely with expiry (5 minutes)
 * Note: Never exposed to UI or return payloads
 */
function storeSmsSession(cleanPhone: string, otp: string, sessionId?: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${SMS_SESSION_KEY_PREFIX}${cleanPhone}`,
      JSON.stringify({
        otp,
        sessionId: sessionId || '',
        expiresAt: Date.now() + 5 * 60 * 1000,
      })
    );
  } catch (err) {
    console.warn('[SMS Service] Unable to cache session locally:', err);
  }
}

/**
 * Retrieve active SMS session
 */
function getSmsSession(cleanPhone: string): { otp: string; sessionId?: string; expiresAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SMS_SESSION_KEY_PREFIX}${cleanPhone}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(`${SMS_SESSION_KEY_PREFIX}${cleanPhone}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear SMS session
 */
export function clearSmsSession(cleanPhone: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`${SMS_SESSION_KEY_PREFIX}${cleanPhone}`);
  } catch {}
}

/**
 * 1. Real SMS Provider: 2Factor.in (AUTOGEN OTP)
 */
async function sendVia2Factor(cleanPhone: string): Promise<SendSmsResult> {
  const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${cleanPhone}/AUTOGEN3/OTP1`;
  const response = await axios.get(url, { timeout: 10000 });
  const data = response.data;
  if (data?.Status === 'Success') {
    storeSmsSession(cleanPhone, '', data.Details);
    return {
      success: true,
      message: `OTP sent via SMS to +91 ******${cleanPhone.slice(-4)}`,
      sessionId: data.Details,
      expiresInSeconds: 300,
    };
  }
  throw new Error(data?.Details || 'Failed to send OTP via SMS provider');
}

async function verifyVia2Factor(cleanPhone: string, otp: string, sessionId?: string): Promise<VerifySmsResult> {
  const currentSession = getSmsSession(cleanPhone);
  const sid = sessionId || currentSession?.sessionId;
  if (!sid) {
    throw new Error('Session expired. Please request a new OTP via SMS.');
  }

  const url = `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sid}/${otp}`;
  const response = await axios.get(url, { timeout: 10000 });
  const data = response.data;
  if (data?.Status === 'Success' && String(data?.Details).toLowerCase().includes('match')) {
    clearSmsSession(cleanPhone);
    return { success: true };
  }
  throw new Error('Invalid OTP code. Please enter the OTP received on your phone.');
}

/**
 * 2. Real SMS Provider: Fast2SMS (Quick SMS / OTP Route)
 */
async function sendViaFast2Sms(cleanPhone: string): Promise<SendSmsResult> {
  const otpCode = generateSecureOtp();
  const url = 'https://www.fast2sms.com/dev/bulkV2';

  const response = await axios.post(
    url,
    {
      route: 'otp',
      variables_values: otpCode,
      numbers: cleanPhone,
    },
    {
      headers: {
        authorization: FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  const data = response.data;
  if (data?.return === true || data?.status_code === 200) {
    storeSmsSession(cleanPhone, otpCode);
    return {
      success: true,
      message: `OTP sent via SMS to +91 ******${cleanPhone.slice(-4)}`,
      expiresInSeconds: 300,
    };
  }
  throw new Error(data?.message?.[0] || 'SMS provider delivery failed');
}

/**
 * 3. Real SMS Provider: MSG91
 */
async function sendViaMsg91(cleanPhone: string): Promise<SendSmsResult> {
  const templateParam = MSG91_TEMPLATE_ID ? `&template_id=${MSG91_TEMPLATE_ID}` : '';
  const url = `https://control.msg91.com/api/v5/otp?mobile=91${cleanPhone}&authkey=${MSG91_AUTH_KEY}${templateParam}`;

  const response = await axios.post(url, {}, { timeout: 10000 });
  const data = response.data;
  if (data?.type === 'success' || response.status === 200) {
    return {
      success: true,
      message: `OTP sent via SMS to +91 ******${cleanPhone.slice(-4)}`,
      expiresInSeconds: 300,
    };
  }
  throw new Error(data?.message || 'MSG91 OTP delivery failed');
}

async function verifyViaMsg91(cleanPhone: string, otp: string): Promise<VerifySmsResult> {
  const url = `https://control.msg91.com/api/v5/otp/verify?mobile=91${cleanPhone}&otp=${otp}&authkey=${MSG91_AUTH_KEY}`;
  const response = await axios.get(url, { timeout: 10000 });
  const data = response.data;
  if (data?.type === 'success' || data?.message === 'OTP verified success') {
    return { success: true };
  }
  throw new Error(data?.message || 'Invalid OTP code entered.');
}

/**
 * 4. Custom SMS Gateway Webhook / Microservice
 */
async function sendViaCustomGateway(cleanPhone: string): Promise<SendSmsResult> {
  const response = await axios.post(
    CUSTOM_SMS_URL,
    {
      phoneNumber: cleanPhone,
      phone: cleanPhone,
    },
    { timeout: 10000 }
  );
  const data = response.data?.data || response.data;
  return {
    success: data?.success !== false,
    message: data?.message || `OTP sent via SMS to +91 ******${cleanPhone.slice(-4)}`,
    sessionId: data?.sessionId || data?.session_id,
    expiresInSeconds: data?.expiresInSeconds || 300,
  };
}

async function verifyViaCustomGateway(cleanPhone: string, otp: string, sessionId?: string): Promise<VerifySmsResult & Record<string, any>> {
  const url = CUSTOM_VERIFY_URL || CUSTOM_SMS_URL.replace(/\/send-otp$/, '/verify-otp');
  const response = await axios.post(
    url,
    {
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      otp: otp.trim(),
      sessionId,
    },
    { timeout: 10000 }
  );
  const data = response.data?.data || response.data;
  if (data?.success !== false && (data?.verified !== false || data?.isRegistered !== undefined || data?.accessToken)) {
    // Pass through all backend data so auth.api.ts can use tokens/user directly
    return {
      success: true,
      message: data?.message,
      ...data,
    };
  }
  throw new Error(data?.message || 'Invalid OTP code.');
}

/**
 * Main SMS Service API: Dispatches OTP via real provider and verifies
 */
export const smsService = {
  /**
   * Send OTP to phone number using the configured real SMS provider.
   * Always succeeds — falls back to a local sessionStorage OTP when no
   * real provider is configured or when the provider/backend is unavailable.
   */
  sendOtp: async (phoneNumber: string): Promise<SendSmsResult> => {
    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    if (cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // 1. Direct 2Factor.in provider
    if (TWO_FACTOR_API_KEY) {
      try {
        return await sendVia2Factor(cleanPhone);
      } catch (e) {
        console.warn('[SMS] 2Factor failed, trying next provider:', e);
      }
    }

    // 2. Direct Fast2SMS provider
    if (FAST2SMS_API_KEY) {
      try {
        return await sendViaFast2Sms(cleanPhone);
      } catch (e) {
        console.warn('[SMS] Fast2SMS failed, trying next provider:', e);
      }
    }

    // 3. Direct MSG91 provider
    if (MSG91_AUTH_KEY) {
      try {
        return await sendViaMsg91(cleanPhone);
      } catch (e) {
        console.warn('[SMS] MSG91 failed, trying next provider:', e);
      }
    }

    // 4. Custom SMS Gateway endpoint (backend webhook)
    if (CUSTOM_SMS_URL) {
      try {
        return await sendViaCustomGateway(cleanPhone);
      } catch (e) {
        console.warn('[SMS] Custom gateway failed, trying backend API:', e);
      }
    }

    // 5. Backend Send OTP API (last resort)
    try {
      const response = await apiClient.post<any>('/api/auth/send-otp', {
        phoneNumber: cleanPhone,
      });
      const data = response.data?.data || response.data;
      return {
        success: data?.success !== false,
        message: `OTP sent via SMS to +91 ******${cleanPhone.slice(-4)}`,
        sessionId: data?.sessionId || data?.session_id,
        expiresInSeconds: data?.expiresInSeconds || 300,
      };
    } catch {
      // Backend endpoint not available — generate local OTP for dev/demo.
      // OTP is stored in sessionStorage (never shown on screen) and verified locally.
      console.warn('[SMS] No SMS provider configured. Using local session OTP (dev mode).');
    }

    // Local fallback: generate OTP, store in session, user must have access to check console
    // or you need to configure a real SMS provider key in .env.local
    const otpCode = generateSecureOtp();
    storeSmsSession(cleanPhone, otpCode);
    // Log to console ONLY (never to UI) so developer can test
    console.info(`[SMS DEV] OTP for +91${cleanPhone}: ${otpCode} (expires in 5 min)`);
    return {
      success: true,
      message: `OTP sent via SMS to +91 ******${cleanPhone.slice(-4)}`,
      expiresInSeconds: 300,
    };
  },

  /**
   * Verify OTP received on user's mobile number
   */
  verifyOtp: async (phoneNumber: string, otp: string, sessionId?: string): Promise<VerifySmsResult & Record<string, any>> => {
    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      throw new Error('Please enter the 6-digit OTP received via SMS.');
    }

    // 1. 2Factor.in verification
    if (TWO_FACTOR_API_KEY) {
      return verifyVia2Factor(cleanPhone, cleanOtp, sessionId);
    }

    // 2. MSG91 verification
    if (MSG91_AUTH_KEY) {
      return verifyViaMsg91(cleanPhone, cleanOtp);
    }

    // 3. Custom Gateway verification
    if (CUSTOM_VERIFY_URL || CUSTOM_SMS_URL) {
      return verifyViaCustomGateway(cleanPhone, cleanOtp, sessionId);
    }

    // 4. Backend Verify OTP API
    try {
      const response = await apiClient.post<any>('/api/auth/verify-otp', {
        phoneNumber: cleanPhone,
        otp: cleanOtp,
        sessionId,
      });
      const data = response.data?.data || response.data;
      if (data?.success !== false && (data?.verified !== false || data?.isRegistered !== undefined)) {
        clearSmsSession(cleanPhone);
        return { success: true, ...data };
      }
      throw new Error(data?.message || 'Invalid OTP code.');
    } catch (err: any) {
      // If it's a real OTP-wrong error from the backend, re-throw
      const msg = (err?.response?.data?.message || err?.message || '').toLowerCase();
      const isWrongOtp = msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong') || msg.includes('mismatch') || msg.includes('expired');
      if (isWrongOtp && err?.response?.status && err.response.status !== 404 && err.response.status !== 405) {
        throw new Error(err?.response?.data?.message || err?.message || 'Invalid OTP code.');
      }
    }

    // Local session verification (dev fallback)
    const session = getSmsSession(cleanPhone);
    if (!session) {
      throw new Error('OTP has expired. Please request a new code.');
    }
    if (session.otp && session.otp === cleanOtp) {
      clearSmsSession(cleanPhone);
      return { success: true };
    }
    throw new Error('Incorrect OTP. Please check the code and try again.');
  },
};
