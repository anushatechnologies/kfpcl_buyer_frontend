import { create } from "zustand";
import { SESSION_CLEARED_EVENT, SESSION_UPDATED_EVENT, clearStoredSession, readStoredSession, writeStoredSession, setSuppressSessionEvents } from "../lib/session";
import type { CustomerProfile, CustomerSession } from "../types/storefront";
import { useAuthStore as useLegacyAuthStore } from "@/store/authStore";
import { authApi } from "@/api/auth.api";

let isSyncingToLegacy = false;

function syncToLegacyStore(session: CustomerSession | null) {
  if (typeof window === "undefined" || isSyncingToLegacy) return;
  try {
    isSyncingToLegacy = true;
    const currentLegacyState = useLegacyAuthStore.getState();

    if (!session?.accessToken) {
      if (currentLegacyState.isAuthenticated) {
        useLegacyAuthStore.getState().clearAuth();
      }
      localStorage.removeItem("kfpcl_token");
      return;
    }

    if (
      currentLegacyState.isAuthenticated &&
      currentLegacyState.token === session.accessToken &&
      currentLegacyState.user?.id === String(session.customerId || 1)
    ) {
      return;
    }

    localStorage.setItem("kfpcl_token", session.accessToken);
    const userRole = session.roles?.toLowerCase?.() === "seller" ? "seller" : "buyer";

    // Suppress SESSION_UPDATED_EVENT while syncing to prevent infinite loop:
    // writeStoredSession → SESSION_UPDATED_EVENT → syncToLegacyStore → setUser → writeStoredSession
    setSuppressSessionEvents(true);
    try {
      useLegacyAuthStore.getState().setUser(
        {
          id: String(session.customerId || 1),
          name: session.name || (session.phoneNumber ? "User " + session.phoneNumber.slice(-4) : "Customer"),
          email: session.email || (session.phoneNumber + "@kfpcl.com"),
          phone: session.phoneNumber,
          role: userRole as any,
          isVerified: true,
          gstVerified: false,
          createdAt: new Date().toISOString(),
          company: {
            id: "company-" + (session.customerId || 1),
            name: "KFPCL Buyer",
            address: { street: "", city: "", state: "", pincode: "", country: "India" },
            industry: "Agriculture",
          },
        },
        session.accessToken
      );
    } finally {
      setSuppressSessionEvents(false);
    }
  } catch (e) {
    console.error("Auth sync error:", e);
  } finally {
    isSyncingToLegacy = false;
  }
}

function getInitialSession(): CustomerSession | null {
  const session = readStoredSession();
  if (session && session.accessToken) return session;

  if (typeof window !== "undefined") {
    try {
      const directToken =
        localStorage.getItem("accessToken") || localStorage.getItem("kfpcl_token");
      if (directToken && directToken !== "undefined" && directToken !== "null" && directToken.trim()) {
        const recovered = readStoredSession();
        if (recovered && recovered.accessToken) return recovered;
      }

      const legacyState = useLegacyAuthStore.getState();
      if (legacyState?.isAuthenticated && legacyState?.user && legacyState?.token) {
        return {
          accessToken: legacyState.token,
          customerId: Number(legacyState.user.id) || 1,
          phoneNumber: legacyState.user.phone || "",
          name: legacyState.user.name,
          email: legacyState.user.email,
          roles: legacyState.user.role,
        };
      }
    } catch {}
  }
  return null;
}

interface AuthStore {
  session: CustomerSession | null;
  profile: CustomerProfile | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setSession: (session: CustomerSession) => void;
  updateProfile: (profile: CustomerProfile) => void;
  hydrateFromStorage: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: getInitialSession(),
  profile: null,
  isAuthModalOpen: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  setSession: (session) => {
    writeStoredSession(session);
    syncToLegacyStore(session);
    set({
      session,
      isAuthModalOpen: false,
    });
  },

  updateProfile: (profile) =>
    set((state) => {
      const nextSession = state.session
        ? {
            ...state.session,
            name: profile.name || state.session.name,
            email: profile.email || state.session.email,
            walletBalance: profile.walletBalance ?? state.session.walletBalance,
          }
        : state.session;

      if (nextSession) {
        writeStoredSession(nextSession);
        syncToLegacyStore(nextSession);
      }

      return {
        profile,
        session: nextSession,
      };
    }),

  hydrateFromStorage: () => {
    const session = readStoredSession();
    if (session && session.accessToken) {
      syncToLegacyStore(session);
      set({ session });
      return;
    }

    const legacyState = useLegacyAuthStore.getState();
    if (legacyState.isAuthenticated && legacyState.user && legacyState.token) {
      const inferredSession: CustomerSession = {
        accessToken: legacyState.token,
        customerId: Number(legacyState.user.id) || 1,
        phoneNumber: legacyState.user.phone || "",
        name: legacyState.user.name,
        email: legacyState.user.email,
        roles: legacyState.user.role,
      };
      writeStoredSession(inferredSession);
      set({ session: inferredSession });
      return;
    }

    if (typeof window !== "undefined") {
      const directToken =
        localStorage.getItem("accessToken") || localStorage.getItem("kfpcl_token");
      if (!directToken || directToken === "undefined" || directToken === "null") {
        set({ session: null });
      }
    }
  },

  logout: async () => {
    const refreshToken = get().session?.refreshToken;
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (e) {
      console.warn("Backend logout warning:", e);
    }
    clearStoredSession();
    syncToLegacyStore(null);
    set({
      session: null,
      profile: null,
      isAuthModalOpen: false,
    });
  },
}));

if (typeof window !== "undefined") {
  window.addEventListener(SESSION_CLEARED_EVENT, () => {
    syncToLegacyStore(null);
    useAuthStore.setState({
      session: null,
      profile: null,
    });
  });

  window.addEventListener(SESSION_UPDATED_EVENT, () => {
    const session = readStoredSession() || getInitialSession();
    if (session) {
      syncToLegacyStore(session);
    }
    useAuthStore.setState({ session });
  });
}
