import { create } from 'zustand';
import type { WatchlistItem } from '@/types';

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  setItems: (items: WatchlistItem[]) => void;
  addItem: (item: WatchlistItem) => void;
  removeItem: (symbol: string) => void;
  updatePrice: (symbol: string, ltp: number, change: number, changePct: number) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useWatchlistStore = create<WatchlistState>()((set) => ({
  items: [],
  isLoading: false,
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (symbol) => set((state) => ({ items: state.items.filter((i) => i.symbol !== symbol) })),
  updatePrice: (symbol, ltp, change, changePct) =>
    set((state) => ({
      items: state.items.map((item) => (item.symbol === symbol ? { ...item, ltp, change, changePct } : item)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ items: [] }),
}));
