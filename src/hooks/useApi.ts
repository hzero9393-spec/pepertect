'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Portfolio, Position, IndexData, Order, Trade, Notification } from '@/types';

/* ────────────── generic fetch helper ────────────── */
async function apiFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

/* ────────────── query-key factories ────────────── */
export const queryKeys = {
  portfolio: ['portfolio'] as const,
  positions: ['positions'] as const,
  orders: ['orders'] as const,
  trades: (yesterday?: boolean) => ['trades', { yesterday }] as const,
  indices: ['indices'] as const,
  stocks: ['stocks'] as const,
  notifications: ['notifications'] as const,
  watchlist: ['watchlist'] as const,
};

/* ────────────── Portfolio ────────────── */
export function usePortfolio() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () => apiFetch<Portfolio>('/api/portfolio', token!),
    enabled: !!token,
    staleTime: 10 * 1000, // 10s — balance doesn't change every second
  });
}

/* ────────────── Positions ────────────── */
export function usePositions(options?: { refetchInterval?: number }) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.positions,
    queryFn: () => apiFetch<Position[]>('/api/positions', token!),
    enabled: !!token,
    staleTime: 5 * 1000,
    refetchInterval: options?.refetchInterval,
  });
}

/* ────────────── Orders ────────────── */
export function useOrders(limit = 50) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => apiFetch<Order[]>(`/api/orders?limit=${limit}`, token!),
    enabled: !!token,
    staleTime: 10 * 1000,
  });
}

/* ────────────── Trades ────────────── */
export function useTrades(yesterday?: boolean) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.trades(yesterday),
    queryFn: () => apiFetch<Trade[]>(`/api/trades${yesterday ? '?yesterday=true' : ''}`, token!),
    enabled: !!token,
    staleTime: 10 * 1000,
  });
}

/* ────────────── Market Indices ────────────── */
export function useIndices() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.indices,
    queryFn: () => apiFetch<IndexData[]>('/api/market/indices', token!),
    enabled: !!token,
    staleTime: 30 * 1000, // indices data stays fresh longer
  });
}

/* ────────────── Stocks ────────────── */
export function useStocks() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.stocks,
    queryFn: () => apiFetch<any[]>('/api/market/stocks', token!),
    enabled: !!token,
    staleTime: 60 * 1000, // stock universe rarely changes
  });
}

/* ────────────── Notifications ────────────── */
export function useNotifications() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error('Failed to fetch notifications');
      return { notifications: (json.data || []) as Notification[], unreadCount: (json.unreadCount || 0) as number };
    },
    enabled: !!token,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000, // poll every 30s (was 15s)
  });
}

/* ────────────── Watchlist ────────────── */
export function useWatchlist() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: () => apiFetch<any[]>('/api/watchlist', token!),
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

/* ────────────── Mutations ────────────── */
export function useMarkNotificationRead() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useDeleteAllNotifications() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/delete-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
