import type { CustomerSession } from "../types/storefront";
import { API_BASE_URL } from "./config";

const SESSION_KEY = "kfpcl.customer.session";
const SESSION_COOKIE = "kfpcl_customer_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const SESSION_CLEARED_EVENT = "kfpcl:session-cleared";
export const SESSION_UPDATED_EVENT = "kfpcl:session-updated";

let refreshPromise: Promise<CustomerSession | null> | null = null;

const parseSession = (raw: string | null): CustomerSession | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }
};

export const readStoredSession = (): CustomerSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const cookieMatch = document.cookie
      .split(/;\s*/)
      .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`));

    if (cookieMatch) {
      const rawValue = cookieMatch.slice(`${SESSION_COOKIE}=`.length);
      const session = parseSession(decodeURIComponent(rawValue));
      if (session) return session;
    }

    const legacySession = parseSession(window.localStorage.getItem(SESSION_KEY));
    if (legacySession) {
      const serialized = JSON.stringify(legacySession);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
      return legacySession;
    }
  } catch (e) {
    console.error("Error reading stored session:", e);
  }

  return null;
};

export const writeStoredSession = (session: CustomerSession) => {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(session);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  window.localStorage.setItem(SESSION_KEY, serialized);
  if (session.accessToken) {
    window.localStorage.setItem("kfpcl_token", session.accessToken);
  }
  if (session.refreshToken) {
    window.localStorage.setItem("kfpcl_refresh_token", session.refreshToken);
  }
  if (session.email) {
    window.localStorage.setItem("kfpcl_user_email", session.email);
  }
  if (session.phoneNumber) {
    window.localStorage.setItem("kfpcl_user_phone", session.phoneNumber);
  }
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
};

export const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem("kfpcl_token");
  window.localStorage.removeItem("kfpcl_refresh_token");
  window.localStorage.removeItem("kfpcl_user_email");
  window.localStorage.removeItem("kfpcl_user_phone");
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
};

export const isSessionNearExpiry = (session?: CustomerSession | null, bufferMs = 2 * 60 * 1000) => {
  if (!session?.expiresAt) return false;
  return Date.now() >= session.expiresAt - bufferMs;
};

export const refreshCustomerSession = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = refreshCustomerSessionOnce().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const refreshCustomerSessionOnce = async (): Promise<CustomerSession | null> => {
  const current = readStoredSession();
  const refreshToken = current?.refreshToken || (typeof window !== "undefined" ? window.localStorage.getItem("kfpcl_refresh_token") : null);

  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredSession();
      return null;
    }

    const payload = await response.json();
    const data = payload?.data || payload;
    const newAccessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken || refreshToken;

    if (!newAccessToken) return null;

    const updatedSession: CustomerSession = {
      ...current,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      customerId: current?.customerId || Number(data?.user?.id) || 1,
      phoneNumber: current?.phoneNumber || data?.user?.phoneNumber || "",
      name: current?.name || data?.user?.fullName || "",
      email: current?.email || data?.user?.email || "",
      roles: current?.roles || data?.user?.roles || "buyer",
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    writeStoredSession(updatedSession);
    return updatedSession;
  } catch {
    return null;
  }
};

export const getActiveAccessToken = async () => {
  let session = readStoredSession();
  if (!session) return null;

  if (isSessionNearExpiry(session)) {
    session = await refreshCustomerSession();
  }

  return session?.accessToken || null;
};
