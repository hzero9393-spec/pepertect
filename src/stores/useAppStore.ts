import { create } from 'zustand';
import type { MarketStatus } from '@/types';

interface AppState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  marketStatus: MarketStatus;
  searchQuery: string;
  searchOpen: boolean;
  activeTab: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMarketStatus: (status: MarketStatus) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: true,
  theme: 'light',
  marketStatus: 'CLOSED',
  searchQuery: '',
  searchOpen: false,
  activeTab: 'dashboard',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setMarketStatus: (marketStatus) => set({ marketStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
