'use client'

import { create } from 'zustand'

interface WatchlistState {
  /** Set of uppercase symbols currently in the user's watchlist */
  symbols: Set<string>
  /** Whether the watchlist data has been loaded at least once */
  loaded: boolean
  /** Whether a watchlist operation is in progress */
  loading: boolean

  /** Set the full watchlist symbols (from API response) */
  setSymbols: (symbols: string[]) => void
  /** Add a symbol to the local cache (optimistic update) */
  addSymbol: (symbol: string) => void
  /** Remove a symbol from the local cache (optimistic update) */
  removeSymbol: (symbol: string) => void
  /** Check if a symbol is in the watchlist */
  isInWatchlist: (symbol: string) => boolean
  /** Mark as loaded */
  setLoaded: (loaded: boolean) => void
  /** Set loading */
  setLoading: (loading: boolean) => void
  /** Clear all (on logout) */
  clear: () => void
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  symbols: new Set<string>(),
  loaded: false,
  loading: false,

  setSymbols: (symbols: string[]) => {
    set({ symbols: new Set(symbols.map(s => s.toUpperCase())), loaded: true })
  },

  addSymbol: (symbol: string) => {
    const upper = symbol.toUpperCase()
    const current = get().symbols
    if (!current.has(upper)) {
      const next = new Set(current)
      next.add(upper)
      set({ symbols: next })
    }
  },

  removeSymbol: (symbol: string) => {
    const upper = symbol.toUpperCase()
    const current = get().symbols
    if (current.has(upper)) {
      const next = new Set(current)
      next.delete(upper)
      set({ symbols: next })
    }
  },

  isInWatchlist: (symbol: string) => {
    return get().symbols.has(symbol.toUpperCase())
  },

  setLoaded: (loaded: boolean) => set({ loaded }),
  setLoading: (loading: boolean) => set({ loading }),

  clear: () => set({ symbols: new Set<string>(), loaded: false, loading: false }),
}))
