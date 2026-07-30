'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOrders } from '@/hooks/useApi';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { getUpstoxKey } from '@/lib/upstox-instruments';
import { toast } from '@/hooks/use-toast';
import type { Order } from '@/types';

/**
 * Monitors PENDING limit orders and auto-executes them when the live
 * market price hits the limit price.
 *
 * - Subscribes to live quotes for all pending limit order instruments
 * - BUY LIMIT: executes when ltp <= order.price
 * - SELL LIMIT: executes when ltp >= order.price
 * - Auto-cancels remaining pending limit orders at market close (3:30 PM IST)
 *
 * Usage (drop into any authenticated layout/page):
 *   useLimitOrderMonitor();
 */
export function useLimitOrderMonitor() {
  const token = useAuthStore((s) => s.token);
  const { data: orders } = useOrders();
  const { quotes, subscribe, unsubscribe } = useLiveQuote();

  // Track order IDs already sent for execution (avoid duplicate API calls)
  const executedRef = useRef<Set<string>>(new Set());
  // Track order IDs already cancelled at market close
  const cancelledRef = useRef<Set<string>>(new Set());

  // ── Resolve Upstox instrument key for an order ──
  const resolveKey = useCallback((order: Order): string | null => {
    // If the order (or API response) carries an instrumentKey, use it.
    // The Order Prisma model does not have this field yet, but we guard
    // against it being added in the future via a type-safe cast.
    const maybeKey = (order as Order & { instrumentKey?: string }).instrumentKey;
    if (maybeKey) return maybeKey;

    if (order.segment === 'EQUITY') {
      const key = getUpstoxKey(order.symbol);
      if (!key) {
        console.warn(
          `[LimitOrderMonitor] No Upstox key for equity symbol "${order.symbol}" — skipping order ${order.id}`
        );
      }
      return key;
    }

    // OPTIONS / FUTURES require an instrumentKey (e.g. NSE_FO|63811).
    // Without it we cannot subscribe to the exact strike contract.
    console.warn(
      `[LimitOrderMonitor] OPTIONS/FUTURES order ${order.id} (${order.symbol}) has no instrumentKey — skipping`
    );
    return null;
  }, []);

  // ── Execute a pending limit order via API ──
  const executeOrder = useCallback(
    async (order: Order, ltp: number) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/orders/${order.id}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ltp }),
        });
        const json = await res.json();
        if (json.success) {
          toast({
            title: `✅ Limit order executed!`,
            description: `${order.symbol} ${order.side} at ₹${ltp.toFixed(2)}`,
          });
        } else {
          console.error(`[LimitOrderMonitor] Execute failed for ${order.id}:`, json.error);
        }
      } catch (err) {
        console.error(`[LimitOrderMonitor] Network error executing order ${order.id}:`, err);
      }
    },
    [token]
  );

  // ── Cancel a pending order via API ──
  const cancelOrder = useCallback(
    async (order: Order, reason: string) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/orders/${order.id}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          toast({
            title: `⏰ ${order.symbol} cancelled — ${reason}`,
          });
        } else {
          console.error(`[LimitOrderMonitor] Cancel failed for ${order.id}:`, json.error);
        }
      } catch (err) {
        console.error(`[LimitOrderMonitor] Network error cancelling order ${order.id}:`, err);
      }
    },
    [token]
  );

  // ── Filter pending limit orders ──
  const pendingLimitOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(
      (o) => o.status === 'PENDING' && o.orderType === 'LIMIT'
    );
  }, [orders]);

  // ── Clear the executed set when orders data changes ──
  useEffect(() => {
    executedRef.current.clear();
  }, [orders]);

  // ── Build a map of instrumentKey → orders for quick lookup ──
  const keyToOrders = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of pendingLimitOrders) {
      if (!order.price || order.price <= 0) continue;
      const key = resolveKey(order);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(order);
      map.set(key, arr);
    }
    return map;
  }, [pendingLimitOrders, resolveKey]);

  // ── Subscribe / unsubscribe to instrument keys ──
  const subscribedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentKeys = new Set(keyToOrders.keys());
    const prevKeys = subscribedKeysRef.current;

    // Subscribe new keys
    const toSubscribe: string[] = [];
    for (const k of currentKeys) {
      if (!prevKeys.has(k)) toSubscribe.push(k);
    }
    if (toSubscribe.length > 0) subscribe(toSubscribe);

    // Unsubscribe old keys no longer needed
    const toUnsubscribe: string[] = [];
    for (const k of prevKeys) {
      if (!currentKeys.has(k)) toUnsubscribe.push(k);
    }
    if (toUnsubscribe.length > 0) unsubscribe(toUnsubscribe);

    subscribedKeysRef.current = currentKeys;

    return () => {
      if (toSubscribe.length > 0) unsubscribe(toSubscribe);
    };
  }, [keyToOrders, subscribe, unsubscribe]);

  // ── Check quotes on every tick and execute if conditions are met ──
  useEffect(() => {
    if (!pendingLimitOrders.length) return;

    for (const [instrumentKey, ordersForKey] of keyToOrders) {
      const tick = quotes[instrumentKey];
      if (!tick || !tick.ltp || tick.ltp <= 0) continue;

      const ltp = tick.ltp;

      for (const order of ordersForKey) {
        if (executedRef.current.has(order.id)) continue;
        if (!order.price || order.price <= 0) continue;

        let shouldExecute = false;

        if (order.side === 'BUY' && ltp <= order.price) {
          shouldExecute = true;
        } else if (order.side === 'SELL' && ltp >= order.price) {
          shouldExecute = true;
        }

        if (shouldExecute) {
          executedRef.current.add(order.id);
          executeOrder(order, ltp);
        }
      }
    }
  }, [quotes, keyToOrders, pendingLimitOrders, executeOrder]);

  // ── Market-close auto-cancel: 3:30 PM IST on weekdays ──
  useEffect(() => {
    if (!pendingLimitOrders.length) return;

    function checkMarketClose() {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const ist = new Date(utc + istOffset);

      const day = ist.getDay();
      const hours = ist.getHours();
      const minutes = ist.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      const MARKET_CLOSE = 15 * 60 + 30; // 3:30 PM = 930 minutes

      // Only cancel on weekdays after market close
      if (day >= 1 && day <= 5 && currentMinutes >= MARKET_CLOSE) {
        for (const order of pendingLimitOrders) {
          if (!cancelledRef.current.has(order.id)) {
            cancelledRef.current.add(order.id);
            cancelOrder(order, 'market closed');
          }
        }
      }
    }

    // Check immediately
    checkMarketClose();

    // Check every 30 seconds during the window around market close
    const id = setInterval(checkMarketClose, 30_000);
    return () => clearInterval(id);
  }, [pendingLimitOrders, cancelOrder]);
}
