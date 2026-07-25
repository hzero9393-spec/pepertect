import { create } from 'zustand';
import type { Stock, IndexData, OptionChainRow } from '@/types';

interface MarketState {
  stocks: Stock[];
  indices: IndexData[];
  selectedStock: Stock | null;
  optionChainData: OptionChainRow[];
  searchResults: Stock[];
  isLoading: boolean;
  setStocks: (stocks: Stock[]) => void;
  setIndices: (indices: IndexData[]) => void;
  setSelectedStock: (stock: Stock | null) => void;
  setOptionChainData: (data: OptionChainRow[]) => void;
  setSearchResults: (results: Stock[]) => void;
  updateStockPrice: (symbol: string, ltp: number, change: number, changePct: number) => void;
  updateIndexPrice: (symbol: string, lastPrice: number, change: number, changePct: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  stocks: [],
  indices: [],
  selectedStock: null,
  optionChainData: [],
  searchResults: [],
  isLoading: false,
  setStocks: (stocks) => set({ stocks }),
  setIndices: (indices) => set({ indices }),
  setSelectedStock: (selectedStock) => set({ selectedStock }),
  setOptionChainData: (optionChainData) => set({ optionChainData }),
  setSearchResults: (searchResults) => set({ searchResults }),
  updateStockPrice: (symbol, ltp, change, changePct) =>
    set((state) => ({
      stocks: state.stocks.map((s) => (s.symbol === symbol ? { ...s, ltp, change, changePct } : s)),
    })),
  updateIndexPrice: (symbol, lastPrice, change, changePct) =>
    set((state) => ({
      indices: state.indices.map((idx) => (idx.symbol === symbol ? { ...idx, lastPrice, change, changePct } : idx)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
