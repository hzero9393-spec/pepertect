import { create } from 'zustand'

export type PageId = 
  | 'dashboard'
  | 'trading'      // Stock trading screen
  | 'stockOverview' // Stock detail/overview page
  | 'indexDetail'  // Index detail page with chart + stats
  | 'positions'    // Positions with Index/Stock tabs
  | 'orders'       // Orders with Index/Stock tabs
  | 'portfolio'    // Portfolio overview
  | 'reports'      // Reports/analytics
  | 'watchlist'    // Watchlist page
  | 'optionChain'  // Option chain (accessible from index detail)
  | 'futures'      // Futures trading
  | 'learning'     // Learn section
  | 'profile'      // Profile/settings
  | 'activeDevices' // Active devices/sessions detail
  | 'helpSupport'   // Help & Support detail page
  // Footer pages
  | 'privacy-policy'
  | 'terms-of-service'
  | 'support'
  | 'contact-us'
  | 'faq'
  | 'disclaimer'
  | 'about-us'
  | 'refund-policy'

interface AppState {
  currentPage: PageId
  sidebarOpen: boolean
  watchlistSidebarOpen: boolean
  selectedStockSymbol: string | null
  selectedIndexSymbol: string | null
  setCurrentPage: (page: PageId) => void
  setSidebarOpen: (open: boolean) => void
  setWatchlistSidebarOpen: (open: boolean) => void
  setSelectedStockSymbol: (symbol: string | null) => void
  setSelectedIndexSymbol: (symbol: string | null) => void
  navigateToStock: (symbol: string) => void
  navigateToIndex: (symbol: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: false,
  watchlistSidebarOpen: false,
  selectedStockSymbol: null,
  selectedIndexSymbol: null,
  setCurrentPage: (page) => set({ currentPage: page, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setWatchlistSidebarOpen: (open) => set({ watchlistSidebarOpen: open }),
  setSelectedStockSymbol: (symbol) => set({ selectedStockSymbol: symbol }),
  setSelectedIndexSymbol: (symbol) => set({ selectedIndexSymbol: symbol }),
  navigateToStock: (symbol) => set({ selectedStockSymbol: symbol, currentPage: 'stockOverview', sidebarOpen: false }),
  navigateToIndex: (symbol) => set({ selectedIndexSymbol: symbol, currentPage: 'indexDetail', sidebarOpen: false }),
}))
