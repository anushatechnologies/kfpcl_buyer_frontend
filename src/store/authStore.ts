'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import { writeStoredSession, clearStoredSession, readStoredSession, setSuppressSessionEvents } from '@/app/lib/session';

export interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string, refreshToken?: string) => void;
  setAuthFromBackend: (backendUser: any, accessToken: string, refreshToken: string) => void;
  updateUser: (partialUser: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setUser: (user, token, refreshToken) => {
        const refToken = refreshToken || get().refreshToken || null;
        set({ user, token, refreshToken: refToken, isAuthenticated: true });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('kfpcl_token', token);
            if (refToken) {
              localStorage.setItem('kfpcl_refresh_token', refToken);
            }
            if (user.email) {
              localStorage.setItem('kfpcl_user_email', user.email);
            }
            if (user.phone) {
              localStorage.setItem('kfpcl_user_phone', user.phone);
            }

            const currentSession = readStoredSession();
            if (!currentSession || currentSession.accessToken !== token) {
              // Suppress SESSION_UPDATED_EVENT to prevent infinite sync loop
              setSuppressSessionEvents(true);
              try {
                writeStoredSession({
                  accessToken: token,
                  refreshToken: refToken || undefined,
                  customerId: Number(user.id) || 1,
                  phoneNumber: user.phone || '',
                  name: user.name,
                  email: user.email,
                  roles: user.role,
                  expiresAt: Date.now() + 15 * 60 * 1000,
                });
              } finally {
                setSuppressSessionEvents(false);
              }
            }
          } catch (e) {
            console.error('Session sync error:', e);
          }
        }
      },

      setAuthFromBackend: (backendUser: any, accessToken: string, refreshToken: string) => {
        const mappedUser: User = {
          id: String(backendUser?.id || `user-${Date.now()}`),
          name: backendUser?.fullName || backendUser?.name || 'Buyer',
          email: backendUser?.email || '',
          phone: backendUser?.phoneNumber || backendUser?.phone || '',
          role: 'buyer',
          isVerified: Boolean(backendUser?.isVerified ?? true),
          gstVerified: false,
          company: {
            id: `company-${backendUser?.id || Date.now()}`,
            name: backendUser?.companyName || '',
            address: {
              street: '',
              city: backendUser?.city || '',
              state: backendUser?.state || '',
              pincode: '',
              country: 'India',
            },
            industry: backendUser?.businessType || 'General Wholesale',
          },
          createdAt: backendUser?.createdAt || new Date().toISOString(),
        };

        get().setUser(mappedUser, accessToken, refreshToken);
      },

      updateUser: (partialUser) => {
        set((state) => {
          const updatedUser = state.user ? { ...state.user, ...partialUser } : null;
          if (updatedUser && state.token) {
            writeStoredSession({
              accessToken: state.token,
              refreshToken: state.refreshToken || undefined,
              customerId: Number(updatedUser.id) || 1,
              phoneNumber: updatedUser.phone || '',
              name: updatedUser.name,
              email: updatedUser.email,
              roles: updatedUser.role,
            });
          }
          return { user: updatedUser };
        });
      },

      clearAuth: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        clearStoredSession();
      },
    }),
    {
      name: 'kfpcl-auth',
    }
  )
);
