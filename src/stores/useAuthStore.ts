import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tier } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateTier: (tier: Tier) => void;
  updateBalance: (capital: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      login: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        // Hard-navigate to the public landing page so the user sees the marketing site
        // immediately after logout (instead of staying on a now-broken authenticated URL).
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      },
      setLoading: (isLoading) => set({ isLoading }),
      updateTier: (tier) => set((state) => ({ user: state.user ? { ...state.user, tier } : null })),
      updateBalance: (virtualCapital) => set((state) => ({ user: state.user ? { ...state.user, virtualCapital } : null })),
    }),
    {
      name: 'pepertect-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
