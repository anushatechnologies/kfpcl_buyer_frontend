import { create } from "zustand";
import { SESSION_CLEARED_EVENT, SESSION_UPDATED_EVENT, clearStoredSession, readStoredSession, writeStoredSession } from "../lib/session";
import type { CustomerProfile, CustomerSession } from "../types/storefront";
import { useAuthStore as useLegacyAuthStore } from "@/store/authStore";
import { authApi } from "@/api/auth.api";

function syncToLegacyStore(session: CustomerSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (!session?.accessToken) {
      useLegacyAuthStore.getState().clearAuth();
      localStorage.removeItem("kfpcl_token");
      return;
    }

    localStorage.setItem("kfpcl_token", session.accessToken);
    const userRole = session.roles?.toLowerCase?.() === "seller" ? "seller" : "buyer";
    useLegacyAuthStore.getState().setUser(
      {
        id: String(session.customerId || 1),
        name: session.name || (session.phoneNumber ? `User ${session.phoneNumber.slice(-4)}` : "Customer"),
        email: session.email || `${session.phoneNumber}@kfpcl.com`,
        phone: session.phoneNumber,
        role: userRole as any,
        isVerified: true,
        gstVerified: false,
        createdAt: new Date().toISOString(),
        company: {
          id: `company-${session.customerId || 1}`,
          name: "KFPCL Buyer",
          address: { street: "", city: "", state: "", pincode: "", country: "India" },
          industry: "Agriculture",
        },
      },
      session.accessToken
    );
  } catch (e) {
    console.error("Auth sync error:", e);
  }
}

function getInitialSession(): CustomerSession | null {
  const session = readStoredSession();
  if (session) return session;

  if (typeof window !== "undefined") {
    try {
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
    if (session) {
      syncToLegacyStore(session);
      set({ session });
    } else {
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
      } else {
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
    syncToLegacyStore(session);
    useAuthStore.setState({
      session,
    });
  });
}
