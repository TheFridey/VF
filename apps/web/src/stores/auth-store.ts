/**
 * Auth store — user profile only, NO tokens in localStorage.
 *
 * Tokens (access_token, refresh_token) are HttpOnly cookies set by the backend.
 * The browser sends them automatically on every request — JS cannot read them,
 * which eliminates the XSS token-theft attack surface entirely.
 *
 * This store persists only the user profile object for UI use (display name,
 * role, email-verified flag, etc). It does NOT store any credential material.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  profile?: {
    displayName: string;
    profileImageUrl?: string;
    bio?: string;
    gender?: string;
    dateOfBirth?: string;
    location?: string;
  };
  veteranDetails?: {
    branch?: string;
    rank?: string;
    mos?: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  setUser: (user: User | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      _hasHydrated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-user',  // renamed key — old 'auth-storage' had tokens in it
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // Only persist the user profile — NO tokens
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.user;
          state.isLoading = false;
          state.setHasHydrated(true);
        }
      },
    }
  )
);
