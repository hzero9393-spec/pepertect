import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  panNumber: string | null
  avatar: string | null
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  subscription: 'FREE' | 'PREMIUM'
  virtualBalance: number
  marginUsed: number
  totalTrades: number
  winRate: number
  totalPnl: number
  rank: number | null
  isEmailVerified: boolean
  isPhoneVerified: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  oauthProvider: string | null
  oauthId: string | null
  _count?: {
    trades: number
    orders: number
    positions: number
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitializing: boolean

  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  setAuth: (user, token) => {
    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('pepertect_token', token)
    }
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  setUser: (user) => {
    set({ user })
  },

  logout: () => {
    // Clear token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pepertect_token')
    }
    set({ user: null, token: null, isAuthenticated: false })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  initialize: async () => {
    try {
      // Get token from localStorage
      let token: string | null = null
      if (typeof window !== 'undefined') {
        token = localStorage.getItem('pepertect_token')
      }

      if (!token) {
        set({ isInitializing: false, isAuthenticated: false })
        return
      }

      // Verify token with backend
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        set({
          user: data.user,
          token,
          isAuthenticated: true,
          isInitializing: false,
        })
      } else {
        // Token is invalid, clear it
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pepertect_token')
        }
        set({ isInitializing: false, isAuthenticated: false, user: null, token: null })
      }
    } catch {
      set({ isInitializing: false, isAuthenticated: false })
    }
  },
}))
