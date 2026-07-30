'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { formatNumber, formatINR, getPnlColor, cn } from '@/lib/utils';
import { Briefcase, XCircle, Layers, TrendingUp, AlertTriangle, Loader2, CalendarDays, Shield, Crosshair, Zap, ChevronDown, History, Target, Edit3 } from 'lucide-react';
import React from 'react';
import type { Position, Trade } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { getUpstoxKey } from '@/lib/upstox-instruments';
import { resolveOptionInstrumentKeys } from '@/lib/option-instrument-resolver';
import { UpstoxReconnectBanner } from '@/components/UpstoxReconnectBanner';
import { SLTargetModal } from '@/components/positions/SLTargetModal';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { AnimatedTabContent } from '@/components/shared/AnimatedTabContent';
import { useLimitOrderMonitor } from '@/hooks/useLimitOrderMonitor';
import { useOrders } from '@/hooks/useApi';
import { toast } from '@/hooks/use-toast';
import type { Position, Trade, Order } from '@/types';

/* Index symbols — used to classify positions as Index vs Stock */
const INDEX_SYMBOLS = new Set(['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY']);

/* Helper: classify a position as Index or Stock */
function isIndexPosition(p: Position | Trade | Order): boolean {
  return INDEX_SYMBOLS.has(p.symbol.toUpperCase()) || p.segment !== 'EQUITY';
}

/* Helper: was this trade executed today? */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function PositionsPage({ initialTab = 'stock' }: { initialTab?: 'stock' | 'index' }) {
  const { token } = useAuthStore();
  /* Active monitor for auto-executing pending limit orders */
  useLimitOrderMonitor();
  /* Fetch orders for pending limit orders section */
  const { data: ordersData } = useOrders();
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'index'>(initialTab);
  const [exitingAll, setExitingAll] = useState(false);
  const [confirmExitAll, setConfirmExitAll] = useState(false);
  /* ---------- Live quotes via WebSocket ---------- */
  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  /* Track which symbols we've already subscribed to (avoids re-subscribe loops) */
  const subscribedSymsRef = useRef<Set<string>>(new Set());
  /* Track which positions have been auto-exited (avoid double-trigger) */
  const exitedRef = useRef<Set<string>>(new Set());
  /* Track the last shown auto-exit toast for each position */
  const [autoExitLog, setAutoExitLog] = useState<Array<{ symbol: string; reason: string; ltp: number; level: number; ts: number }>>([]);
  /* ---------- SL/Target Modal State ---------- */
  const [slTargetModalOpen, setSlTargetModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  /* ── Swipe gesture + slide animation for Stock/Index tab navigation ── */
  const [slideDir, setSlideDir] = useState(0);
  const switchTab = (tab: 'stock' | 'index') => {
    setSlideDir(tab === 'index' ? 1 : -1);
    setActiveTab(tab);
  };
  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => { if (activeTab === 'stock') switchTab('index'); },
    onSwipeRight: () => { if (activeTab === 'index') switchTab('stock'); },
  });

  /* ---------- Resolved instrument keys for OPTIONS positions ----------
   * For an OPTIONS position, `getUpstoxKey(pos.symbol)` returns the underlying
   * INDEX key (e.g. NSE_INDEX|Nifty 50) — NOT the strike's instrument key.
   * Subscribing to the index spot price gives a wildly wrong "live LTP" for
   * an option position (e.g. NIFTY spot ~24,000 instead of NIFTY 32900 CE
   * premium ~₹100). We resolve the actual strike instrument_key by fetching
   * the option chain for (symbol + expiry) on mount, then subscribe to that.
   */
  const [optionKeyMap, setOptionKeyMap] = useState<Map<string, string | null>>(new Map());
  /* True while we're resolving option keys (briefly shown as a loader) */
  const [resolvingOptionKeys, setResolvingOptionKeys] = useState(false);

  useEffect(() => {
    const fetchPositions = async () => {
      if (!token) return;
      try {
        const [posRes, tradeRes] = await Promise.all([
          fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/trades', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const posData = await posRes.json();
        const tradeData = await tradeRes.json();
        if (posData.success) setPositions(posData.data);
        if (tradeData.success) setTrades(tradeData.data);
      } catch (err) {
        console.error('Positions fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPositions();
    // NOTE: This 15s interval ONLY refreshes position STATUS (open/closed).
    // It does NOT affect P&L calculation — P&L updates in REAL-TIME via
    // WebSocket ticks (~800ms) using the direct render computation above.
    const id = setInterval(fetchPositions, 15000);
    return () => clearInterval(id);
  }, [token]);

  /* ---------- Resolve instrument keys for OPTIONS positions ----------
   * When positions change, fetch option chains to map each OPTIONS position
   * to its actual Upstox instrument_key (e.g. NSE_FO|63811 for a real
   * NIFTY strike). EQUITY positions skip this — they use getUpstoxKey(symbol).
   *
   * OPTIMIZATION: Positions created AFTER the instrumentKey field was added
   * to the schema already have their key stored — we skip the option-chain
   * fetch entirely for those. Only legacy positions (or rare edge cases where
   * the client didn't pass instrumentKey) need to be resolved. */
  useEffect(() => {
    if (positions.length === 0) return;
    const optionPositions = positions.filter(
      (p) =>
        p.segment === 'OPTIONS' &&
        p.strikePrice != null &&
        p.optionType &&
        p.expiry &&
        /* Skip positions that already have a stored instrumentKey — they
         * were created with the new code path and don't need resolution. */
        !p.instrumentKey
    );
    if (optionPositions.length === 0) {
      setOptionKeyMap(new Map());
      setResolvingOptionKeys(false);
      return;
    }
    let cancelled = false;
    setResolvingOptionKeys(true);
    resolveOptionInstrumentKeys(
      optionPositions.map((p) => ({
        id: p.id,
        symbol: p.symbol,
        strikePrice: Number(p.strikePrice),
        optionType: p.optionType as 'CE' | 'PE',
        expiry: p.expiry as string,
      }))
    )
      .then((map) => {
        if (!cancelled) setOptionKeyMap(map);
      })
      .catch((err) => console.error('resolveOptionInstrumentKeys failed:', err))
      .finally(() => {
        if (!cancelled) setResolvingOptionKeys(false);
      });
    return () => {
      cancelled = true;
    };
  }, [positions]);

  /* ---------- Helper: resolve the live-tick instrument key for a position ----------
   * Returns the right Upstox key to subscribe to:
   *   - EQUITY → getUpstoxKey(symbol) e.g. "NSE_EQ|INE002A01018"
   *   - OPTIONS/FUTURES → pos.instrumentKey (stored at order time) if present,
   *                       else fall back to resolved strike key from option chain.
   *                       If neither is available yet, returns null so we don't
   *                       accidentally subscribe to the underlying index spot
   *                       price (which would show absurd P&L). */
  function getLiveKeyForPosition(p: Position): string | null {
    // For OPTIONS/FUTURES: prefer the stored instrumentKey (instant — no fetch).
    if (p.segment === 'OPTIONS' || p.segment === 'FUTURES') {
      if (p.instrumentKey) return p.instrumentKey;
      // Fall back to resolved key from option chain (legacy positions).
      if (p.segment === 'OPTIONS' && p.strikePrice != null && p.optionType && p.expiry) {
        const resolved = optionKeyMap.get(p.id);
        if (resolved) return resolved;
      }
      // While resolving, return null so we don't accidentally subscribe to the
      // underlying index spot price (which would show absurd P&L).
      return null;
    }
    // EQUITY: use stored key if present, else resolve from symbol.
    return p.instrumentKey ?? getUpstoxKey(p.symbol);
  }

  /* ---------- Subscribe to live quotes for all open positions ---------- */
  useEffect(() => {
    if (positions.length === 0) return;
    const newSyms: string[] = [];
    const newKeys: string[] = [];
    for (const p of positions) {
      // Build a stable subscription-id per position so we can avoid re-subscribing.
      // For OPTIONS we wait until optionKeyMap has resolved the strike's key.
      const key = getLiveKeyForPosition(p);
      if (!key) continue;
      const subId = `${p.id}::${key}`;
      if (subscribedSymsRef.current.has(subId)) continue;
      newSyms.push(subId);
      newKeys.push(key);
    }
    if (newKeys.length > 0) {
      subscribe(newKeys);
      newSyms.forEach((s) => subscribedSymsRef.current.add(s));
    }
    // Cleanup on unmount: unsubscribe all
    return () => {
      if (newKeys.length > 0) {
        unsubscribe(newKeys);
        newSyms.forEach((s) => subscribedSymsRef.current.delete(s));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, optionKeyMap, subscribe, unsubscribe]);

    /* ---------- Open SL/Target Modal ---------- */
  const openSLTargetModal = (pos: Position) => {
    setSelectedPosition(pos);
    setSlTargetModalOpen(true);
  };

  const handleUpdateSLTarget = async (stopLoss: number | null, target: number | null) => {
    if (!selectedPosition) return;
    
    const res = await fetch(`/api/positions/${selectedPosition.id}/sl-target`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stopLoss, target }),
    });
    
    const data = await res.json();
    if (data.success) {
      // Update local state
      setPositions(prev => prev.map(p => 
        p.id === selectedPosition.id 
          ? { ...p, stopLoss: stopLoss ?? undefined, target: target ?? undefined }
          : p
      ));
    } else {
      throw new Error(data.error || 'Failed to update');
    }
  };

  /* ---------- Auto-trigger SL / Target ---------- */
  // For each open position, check if live LTP has hit SL or Target.
  // If yes, call /api/positions/[id]/sl-target (POST) which:
  //  1. Sets proper exitReason (SL_HIT / TARGET_HIT)
  //  2. Creates Trade record
  //  3. Updates portfolio balance + P&L
  //  4. Sends notification (SL hit or Target achieved)
  // We pass currentPrice so the server executes at the SL/Target price.
  const handleAutoSquareOff = async (pos: Position, reason: 'SL' | 'TARGET', ltp: number) => {
    if (exitedRef.current.has(pos.id)) return;
    exitedRef.current.add(pos.id);
    try {
      // Use the dedicated SL/Target check endpoint — it handles everything:
      // auto square-off, portfolio update, trade record, and notification
      const res = await fetch(`/api/positions/${pos.id}/sl-target`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPrice: ltp }),
      });
      const data = await res.json();
      if (data.success && data.triggered) {
        // Show toast notification for SL/Target hit
        toast({
          title: data.reason === 'SL_HIT' ? '⚠️ Stop Loss Triggered!' : '🎯 Target Achieved!',
          description: `${pos.symbol}: ${data.reason === 'SL_HIT' ? 'SL' : 'Target'} hit at ₹${(data.exitPrice ?? ltp).toFixed(2)} · P&L ${data.pnl >= 0 ? '+' : ''}₹${(data.pnl ?? 0).toFixed(2)}`,
          variant: data.reason === 'SL_HIT' ? 'destructive' : 'default',
          duration: 5000,
        });
        setAutoExitLog((prev) =>
          [{ symbol: pos.symbol, reason, ltp, level: reason === 'SL' ? (pos.stopLoss ?? 0) : (pos.target ?? 0), ts: Date.now() }, ...prev].slice(0, 10)
        );
        setPositions((prev) => prev.filter((p) => p.id !== pos.id));
      } else {
        exitedRef.current.delete(pos.id); // allow retry if no trigger
      }
    } catch {
      exitedRef.current.delete(pos.id);
    }
  };

  // Watch live quotes for SL/TGT triggers
  useEffect(() => {
    if (positions.length === 0) return;
    for (const p of positions) {
      if (!p.stopLoss && !p.target) continue;
      const key = getLiveKeyForPosition(p);
      if (!key) continue;
      const tick = quotes[key];
      if (!tick || tick.ltp == null) continue;
      const ltp = tick.ltp;
      // For LONG positions: SL triggers when LTP ≤ stopLoss, TGT when LTP ≥ target
      if (p.stopLoss && ltp <= p.stopLoss) {
        handleAutoSquareOff(p, 'SL', ltp);
      } else if (p.target && ltp >= p.target) {
        handleAutoSquareOff(p, 'TARGET', ltp);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, positions, optionKeyMap]);

  const handleSquareOff = async (posId: string) => {
    // Look up the LIVE LTP for this position from the WebSocket quotes store.
    // We send it as `exitPrice` in the POST body so the server uses the real
    // market price at square-off time — NOT MOCK_LTP[symbol] (which was stale
    // and missing for NIFTY, causing sell price = 0 → huge fake loss).
    const pos = positions.find((p) => p.id === posId);
    const liveKey = pos ? getLiveKeyForPosition(pos) : null;
    const liveTick = liveKey ? quotes[liveKey] : undefined;
    const exitPrice = liveTick?.ltp ?? pos?.avgPrice; // fallback to avgPrice if no live tick yet
    try {
      const res = await fetch(`/api/positions/${posId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Position squared off successfully`);
        setPositions(positions.filter((p) => p.id !== posId));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to square off');
      }
    } catch {
      setMessage('Network error');
    }
  };

  /* ---------- Exit All (visible tab only) ---------- */
  const handleExitAll = async () => {
    const targets = filteredPositions;
    if (targets.length === 0) return;
    setExitingAll(true);
    let okCount = 0;
    let failCount = 0;
    // Sequentially square off to avoid race conditions on portfolio margin.
    // For each position, send the LIVE LTP as exitPrice so the server uses
    // the real market price (not stale MOCK_LTP).
    for (const p of targets) {
      const liveKey = getLiveKeyForPosition(p);
      const liveTick = liveKey ? quotes[liveKey] : undefined;
      const exitPrice = liveTick?.ltp ?? p.avgPrice;
      try {
        const res = await fetch(`/api/positions/${p.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ exitPrice }),
        });
        const data = await res.json();
        if (data.success) {
          okCount++;
          setPositions((prev) => prev.filter((x) => x.id !== p.id));
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    setExitingAll(false);
    setConfirmExitAll(false);
    setMessage(
      failCount === 0
        ? `Successfully exited ${okCount} position${okCount !== 1 ? 's' : ''}`
        : `Exited ${okCount}, failed ${failCount}`
    );
    setTimeout(() => setMessage(''), 4000);
  };

  /* ---------- Filter by active tab ---------- */
  const stockPositions = positions.filter((p) => !isIndexPosition(p));
  const indexPositions = positions.filter((p) => isIndexPosition(p));
  const filteredPositions = activeTab === 'stock' ? stockPositions : indexPositions;

  /* ---------- Live LTP per position (from WebSocket) ----------
   * Build a map of { positionId: liveLtp } using the same key-resolution
   * logic as getLiveKeyForPosition. This is used to compute REAL-TIME
   * unrealized P&L for the hero card — instead of using the stale `p.pnl`
   * field returned by the API (which used to be computed from a hard-coded
   * MOCK_LTP table that was months out of date, e.g. RELIANCE 1882.75 vs
   * real ~1278 → showed +₹1,207 the moment a trade was placed).
   *
   * If no live tick is available yet (still resolving or WS not connected),
   * we fall back to pos.avgPrice → P&L = 0, which is the correct
   * paper-trading UX until the real LTP arrives. */
  const liveLtpByPosId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of positions) {
      const key = getLiveKeyForPosition(p);
      const tick = key ? quotes[key] : undefined;
      const ltp = tick?.ltp ?? p.avgPrice;
      map.set(p.id, ltp);
    }
    return map;
  }, [positions, quotes, optionKeyMap]);

  /* ---------- LIVE total invested / P&L for the active tab (REAL-TIME) ----------
   * Computed on every render using live WebSocket LTP — no memo, no delay. */
  const totalInvested = filteredPositions.reduce((sum, p) => sum + p.investedAmt, 0);
  // Use LIVE LTP (from WebSocket) — computed directly on each render
  let totalPnlLive = 0;
  try {
    for (const p of filteredPositions) {
      const key = getLiveKeyForPosition(p);
      const tick = key ? quotes[key] : undefined;
      const liveLtp = tick?.ltp ?? p.avgPrice;
      totalPnlLive += (liveLtp - p.avgPrice) * p.quantity * (p.side === 'LONG' ? 1 : -1);
    }
  } catch (e) { /* ignore */ }
  const totalPnl = totalPnlLive;
  const totalQty = filteredPositions.reduce((s, p) => s + p.quantity, 0);

  /* ---------- LIVE Today's P&L (realized + unrealized) for active tab (REAL-TIME) ----------
   * Computed on every render — updates instantly when WebSocket ticks arrive. */
  const todayRealizedTab = trades
    .filter((t) => isToday(t.createdAt) && (activeTab === 'index' ? isIndexPosition(t) : !isIndexPosition(t)))
    .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);

  let todayUnrealizedTab = 0;
  try {
    for (const p of filteredPositions) {
      if (!isToday(p.openedAt)) continue;
      if (p.status !== 'OPEN') continue;
      const key = getLiveKeyForPosition(p);
      const tick = key ? quotes[key] : undefined;
      const liveLtp = tick?.ltp ?? p.avgPrice;
      todayUnrealizedTab += (liveLtp - p.avgPrice) * p.quantity * (p.side === 'LONG' ? 1 : -1);
    }
  } catch (e) { /* ignore */ }

  const todayStats = {
    realized: todayRealizedTab,
    unrealized: todayUnrealizedTab,
    total: todayRealizedTab + todayUnrealizedTab,
  };

  /* ---------- LIVE COMBINED Today's P&L (stock + index, REAL-TIME) ----------
   * CRITICAL: Computed on EVERY RENDER (not useMemo) to guarantee instant
   * updates when WebSocket quotes change. The `quotes` object from useLiveQuote
   * triggers re-renders via setVersion() on every tick (~800ms), so this
   * code runs with fresh LTP values every time — NO 15s delay!
   *
   * User requirement: "today p&l same ho stock and index dono ka jaise
   * stock main 1200 profite hua or index main 500 loss toh total today
   * p&l 700 ho". So we compute a combined total across BOTH tabs using
   * live WebSocket LTP for each open position. */
  // Compute realized P&L from today's closed trades (changes less frequently)
  const todayRealizedAll = trades
    .filter((t) => isToday(t.createdAt))
    .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);

  // Compute unrealized P&L from OPEN positions using LIVE WebSocket LTP
  // This runs on EVERY render — updates in real-time as ticks arrive
  let todayUnrealizedAll = 0;
  let stockUnrealizedLive = 0;
  let indexUnrealizedLive = 0;

  try {
    for (const p of positions) {
      if (!p || !isToday(p.openedAt)) continue;
      if (p.status !== 'OPEN') continue;
      // Get live LTP from WebSocket quotes (same as DashboardPage approach)
      const key = getLiveKeyForPosition(p);
      const tick = key ? quotes[key] : undefined;
      const liveLtp = tick?.ltp ?? p.avgPrice;
      const pnl = (liveLtp - p.avgPrice) * p.quantity * (p.side === 'LONG' ? 1 : -1);
      todayUnrealizedAll += pnl;
      // Separate Stock vs Index
      if (isIndexPosition(p)) {
        indexUnrealizedLive += pnl;
      } else {
        stockUnrealizedLive += pnl;
      }
    }
  } catch (e) { /* ignore calc errors */ }

  // Combined today stats object (recreated on each render with fresh values)
  const combinedTodayStats = {
    realized: todayRealizedAll,
    unrealized: todayUnrealizedAll,
    total: todayRealizedAll + todayUnrealizedAll,
    stockUnrealized: stockUnrealizedLive,
    indexUnrealized: indexUnrealizedLive,
  };

  /* ---------- All-time realized P&L ---------- */
  // Per-tab (kept for backward compat if needed elsewhere).
  const allTimeRealized = useMemo(() => {
    return trades
      .filter((t) => (activeTab === 'index' ? isIndexPosition(t) : !isIndexPosition(t)))
      .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  }, [trades, activeTab]);

  // Combined (Stock + Index) — shown in the single P&L hero card.
  const allTimeRealizedCombined = useMemo(() => {
    return trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  }, [trades]);

  // Filtered trades for current tab (Stock or Index)
  const tabTrades = useMemo(() => {
    return trades.filter((t) => (activeTab === 'index' ? isIndexPosition(t) : !isIndexPosition(t)));
  }, [trades, activeTab]);

  return (
    <div className="space-y-6">
      {/* Upstox reconnect banner (shown when token is expired) */}
      <UpstoxReconnectBanner status={wsStatus} />

      {/* ============== TAB SWITCHER: Stock | Index ============== */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => switchTab('stock')}
          className="seg-tab"
          data-active={activeTab === 'stock'}
        >
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Stock Trades
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
              {stockPositions.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => switchTab('index')}
          className="seg-tab"
          data-active={activeTab === 'index'}
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Index Trades
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
              {indexPositions.length}
            </span>
          </span>
        </button>
        <div className="flex-1" />
        {/* Exit All button (only visible when there are open positions in this tab) */}
        {filteredPositions.length > 0 && !confirmExitAll && (
          <Button
            variant="outline"
            size="sm"
            className="text-loss-red border-loss-red/30 hover:bg-loss-red/10 h-9"
            onClick={() => setConfirmExitAll(true)}
          >
            <XCircle className="mr-1 h-3 w-3" /> Exit All ({filteredPositions.length})
          </Button>
        )}
      </div>

      {/* ============== SWIPABLE CONTENT ============== */}
      <div ref={swipeRef} className="min-h-[50vh]">
      <AnimatedTabContent activeKey={activeTab} direction={slideDir}>
      {/* Exit All confirmation bar */}
      {confirmExitAll && (
        <div className="rounded-lg border border-loss-red/30 bg-tint-red p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-loss-red shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              Exit all {filteredPositions.length} {activeTab === 'stock' ? 'stock' : 'index'} positions?
            </p>
            <p className="text-xs text-text-secondary">
              This will square off every open position in this tab at current market price. Action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setConfirmExitAll(false)}
            disabled={exitingAll}
            className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-bg-surface-alt"
          >
            Cancel
          </button>
          <button
            onClick={handleExitAll}
            disabled={exitingAll}
            className="h-9 px-4 rounded-lg bg-loss-red hover:bg-loss-red/90 text-white text-xs font-bold flex items-center gap-1.5"
          >
            {exitingAll ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Exiting...
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Yes, Exit All
              </>
            )}
          </button>
        </div>
      )}

      {/* ============== TODAY'S P&L HERO CARD (combined Stock + Index, real-time) ==============
       * User requirement: "sirf ek today p&l banane ko do nahi" — only ONE P&L card.
       * Also: "stock and index dono ka profite loss ek main hi dekhe same time" —
       * combined Stock + Index P&L in one card.
       * This card shows the COMBINED total across both tabs in real-time using
       * live WebSocket LTP for each open position. No separate per-tab card. */}
      <div className="card-soft p-4 relative overflow-hidden border-2 border-brand-primary/30">
        <div className="absolute -right-2 -top-2 opacity-40 pointer-events-none">
          <Layers className="h-20 w-20 text-brand-primary/20" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Today's P&L · Stock + Index
            </p>
            {wsStatus === 'upstox_connected' && (
              <span className="inline-flex items-center gap-0.5 ml-auto text-[9px] font-bold uppercase text-profit-green">
                <span className="inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className={`mt-2 font-mono text-4xl sm:text-5xl font-bold tabular-nums ${getPnlColor(combinedTodayStats.total)}`}>
            {combinedTodayStats.total >= 0 ? '+' : '−'}{formatINR(Math.abs(combinedTodayStats.total))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Stock:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(combinedTodayStats.stockUnrealized)}`}>
                {combinedTodayStats.stockUnrealized >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(combinedTodayStats.stockUnrealized), 2)}
              </span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Index:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(combinedTodayStats.indexUnrealized)}`}>
                {combinedTodayStats.indexUnrealized >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(combinedTodayStats.indexUnrealized), 2)}
              </span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Realized:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(combinedTodayStats.realized)}`}>
                {combinedTodayStats.realized >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(combinedTodayStats.realized), 2)}
              </span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">All-time realized:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(allTimeRealizedCombined)}`}>
                {allTimeRealizedCombined >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(allTimeRealizedCombined), 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============== SUMMARY GRID (per-tab stats) ============== */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Open {activeTab === 'stock' ? 'Stock' : 'Index'} Positions</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{filteredPositions.length}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Total Invested</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{formatINR(totalInvested)}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Unrealized P&amp;L</p>
          <p className={`mt-1 font-mono text-xl font-bold ${getPnlColor(totalPnl)}`}>
            {totalPnl >= 0 ? '+' : ''}{formatINR(totalPnl)}
          </p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Total Quantity</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{totalQty}</p>
        </div>
      </div>

      {/* 24h retention notice */}
      <div className="rounded-lg bg-tint-blue/60 border border-brand-primary/20 px-3 py-2 text-xs text-text-secondary flex items-center gap-2">
        <span className={cn('inline-flex h-1.5 w-1.5 rounded-full', wsStatus === 'upstox_connected' ? 'bg-profit-green animate-pulse' : 'bg-text-tertiary')} />
        {wsStatus === 'upstox_connected'
          ? <span>Live LTP streaming via Upstox WebSocket · Stop Loss & Target auto-triggered when hit.</span>
          : <span>Live LTP refreshes automatically · Market data updates in real-time.</span>}
      </div>

      {/* ---------- Auto-exit log (recent SL/TGT triggers) ---------- */}
      {autoExitLog.length > 0 && (
        <div className="rounded-lg border border-accent-gold/30 bg-tint-yellow/40 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-accent-gold" />
            <p className="text-xs font-semibold text-text-primary">Auto-Exit Activity</p>
          </div>
          {autoExitLog.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span className={cn('pill text-[9px]', entry.reason === 'SL' ? 'bg-tint-red text-loss-red' : 'bg-tint-green text-profit-green')}>
                {entry.reason === 'SL' ? 'SL HIT' : 'TGT HIT'}
              </span>
              <span className="font-mono font-semibold text-text-primary">{entry.symbol}</span>
              <span>@ ₹{formatNumber(entry.ltp, 2)}</span>
              <span className="text-text-tertiary">({entry.reason === 'SL' ? '≤' : '≥'} ₹{formatNumber(entry.level, 2)})</span>
              <span className="ml-auto text-text-tertiary">{new Date(entry.ts).toLocaleTimeString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p className={`text-sm text-center font-medium ${message.includes('success') || message.includes('Exited') || message.includes('Successfully') ? 'text-profit-green' : 'text-loss-red'}`}>{message}</p>
      )}

      {/* ============== TRADE HISTORY LINK ============== */}
      <a href="/trade-history" className="block group">
        <div className="card-soft p-3 sm:p-4 flex items-center justify-between transition-all hover:bg-bg-surface-alt/60">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-tint-purple">
              <History className="h-3.5 w-3.5 text-info-purple" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-semibold text-text-primary">Trade History</h3>
              <p className="text-[10px] text-text-secondary">{tabTrades.length} trade{tabTrades.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[11px] font-semibold">View All</span>
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </div>
        </div>
      </a>

      {/* ============== PENDING LIMIT ORDERS (Pending Positions) ============== */}
      {ordersData && ordersData.filter((o) => o.status === 'PENDING' && o.orderType === 'LIMIT').length > 0 && (
        <PendingLimitPositions orders={ordersData} quotes={quotes} token={token} />
      )}

      {/* ============== POSITIONS ============== */}
      <div className="card-soft p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              activeTab === 'stock' ? 'bg-tint-blue' : 'bg-tint-purple'
            )}>
              {activeTab === 'stock' ? <TrendingUp className="h-3.5 w-3.5 text-brand-primary" /> : <Layers className="h-3.5 w-3.5 text-info-purple" />}
            </div>
            <h3 className="font-heading text-sm font-semibold text-text-primary">
              {activeTab === 'stock' ? 'Stock Positions' : 'Index Positions'}
            </h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
              {filteredPositions.length}
            </span>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
        ) : filteredPositions.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-surface-alt mb-2">
              {activeTab === 'stock' ? <TrendingUp className="h-5 w-5 text-text-tertiary" /> : <Layers className="h-5 w-5 text-text-tertiary" />}
            </div>
            <p className="text-sm font-medium text-text-primary">
              {activeTab === 'stock' ? 'No stock positions' : 'No index positions'}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {activeTab === 'stock' ? 'Place an equity order to see positions here' : 'Place an F&O order to see positions here'}
            </p>
          </div>
        ) : (
            <div className="space-y-2 sm:space-y-3">
              {resolvingOptionKeys && (
                <div className="rounded-md bg-tint-blue/40 border border-brand-primary/20 px-3 py-1.5 text-[11px] text-text-secondary flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Resolving live option-strike instrument keys…
                </div>
              )}
              {filteredPositions.map((pos) => {
                /* Look up live LTP from WebSocket quotes.
                 * For OPTIONS positions we use the resolved strike instrument_key
                 * (e.g. NSE_FO|63811) — NOT the underlying index spot price.
                 * For EQUITY positions we use the symbol's instrument_key.
                 * If we don't yet have a live tick (still resolving, or WS not
                 * connected), we fall back to pos.currentPrice (which the API
                 * now sets to avgPrice for OPTIONS — so P&L shows as 0 until
                 * the live tick arrives, instead of showing absurd spot-based P&L).
                 */
                const liveKey = getLiveKeyForPosition(pos);
                const liveTick = liveKey ? quotes[liveKey] : undefined;
                // CRITICAL: Use live WebSocket LTP. Fall back to avgPrice (not
                // pos.currentPrice) so P&L = 0 until the live tick arrives —
                // matches the hero card and avoids the absurd +₹1,207 P&L bug
                // that was caused by stale hard-coded MOCK_LTP values.
                const liveLtp = liveTick?.ltp ?? pos.avgPrice;
                // Account for LONG vs SHORT — SHORT positions profit when price falls.
                const dirMult = pos.side === 'LONG' ? 1 : -1;
                const livePnl = (liveLtp - pos.avgPrice) * pos.quantity * dirMult;
                const livePnlPct = pos.avgPrice > 0 ? ((liveLtp - pos.avgPrice) / pos.avgPrice) * 100 * dirMult : 0;
                /* SL/TGT proximity check (for visual cue) */
                const slDist = pos.stopLoss ? Math.abs(liveLtp - pos.stopLoss) / liveLtp * 100 : null;
                const tgtDist = pos.target ? Math.abs(pos.target - liveLtp) / liveLtp * 100 : null;
                const slNear = slDist != null && slDist < 1.5;
                const tgtNear = tgtDist != null && tgtDist < 1.5;
                return (
                <div key={pos.id} className={cn('rounded-lg border bg-bg-base p-3 sm:p-4 transition-colors', slNear ? 'border-loss-red/50' : tgtNear ? 'border-profit-green/50' : 'border-border-default')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <StockLogo symbol={pos.symbol} size="md" rounded="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={`/stock/${pos.symbol}`} className="font-heading text-sm sm:text-base font-semibold text-text-primary hover:text-brand-primary">{pos.symbol}</a>
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            isIndexPosition(pos) ? 'bg-tint-purple text-info-purple' : 'bg-tint-blue text-brand-primary'
                          )}>
                            {isIndexPosition(pos) ? 'INDEX' : 'STOCK'}
                          </span>
                          <span className="rounded bg-bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">{pos.segment}</span>
                          {pos.optionType && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${pos.optionType === 'CE' ? 'bg-profit-green/10 text-profit-green' : 'bg-loss-red/10 text-loss-red'}`}>{pos.optionType}</span>}
                          {pos.strikePrice != null && pos.strikePrice > 0 && (
                            <span className="font-mono text-[10px] text-text-tertiary">Strike: {pos.strikePrice}</span>
                          )}
                          {liveTick && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-profit-green">
                              <span className="inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                          <span>{pos.side} · {pos.quantity} qty</span>
                          <span>Avg: ₹{formatNumber(pos.avgPrice)}</span>
                          <span className="font-mono">LTP: <span className={cn('font-semibold tabular-nums', liveTick ? 'text-text-primary' : 'text-text-secondary')}>₹{formatNumber(liveLtp, 2)}</span></span>
                        </div>
                        {/* SL / TGT badges */}
                        {(pos.stopLoss || pos.target) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {pos.stopLoss && (
                              <span className={cn(
                                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border',
                                slNear ? 'bg-tint-red text-loss-red border-loss-red/40' : 'bg-bg-surface-alt text-text-secondary border-border'
                              )} title={`Stop Loss · ${slDist != null ? slDist.toFixed(2) + '% away' : ''}`}>
                                <Shield className="h-2.5 w-2.5" />
                                SL ₹{formatNumber(pos.stopLoss, 2)}
                              </span>
                            )}
                            {pos.target && (
                              <span className={cn(
                                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border',
                                tgtNear ? 'bg-tint-green text-profit-green border-profit-green/40' : 'bg-bg-surface-alt text-text-secondary border-border'
                              )} title={`Target · ${tgtDist != null ? tgtDist.toFixed(2) + '% away' : ''}`}>
                                <Crosshair className="h-2.5 w-2.5" />
                                TGT ₹{formatNumber(pos.target, 2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="text-right">
                        <p className={`font-mono text-sm sm:text-base font-bold tabular-nums ${getPnlColor(livePnl)}`}>
                          {livePnl >= 0 ? '+' : ''}₹{formatNumber(livePnl)}
                        </p>
                        <p className={`font-mono text-xs tabular-nums ${getPnlColor(livePnlPct)}`}>
                          {livePnlPct >= 0 ? '+' : ''}{livePnlPct.toFixed(2)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Edit SL/Target Button */}
                        <button
                          onClick={() => openSLTargetModal(pos)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            "border hover:shadow-sm active:scale-95",
                            (pos.stopLoss || pos.target)
                              ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20"
                              : "bg-bg-surface-alt border-border text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                          )}
                          title="Set or Edit Stop Loss & Target"
                        >
                          <Target className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{pos.stopLoss || pos.target ? 'Edit' : 'Set'} SL/TGT</span>
                          <span className="sm:hidden">{pos.stopLoss || pos.target ? 'Edit' : 'Set'}</span>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-loss-red border-loss-red/30 hover:bg-loss-red/10 h-9"
                          onClick={() => handleSquareOff(pos.id)}
                        >
                          <XCircle className="mr-1 h-3 w-3" /> Exit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
      </div>

      {/* ============== START TRADING CTA (bottom) ============== */}
      <a href="/trade" className="block">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-bold text-white hover:bg-brand-primary-hover transition-colors shadow-lg shadow-brand-primary/20">
          <Zap className="h-4 w-4" />
          Start Trading
        </div>
      </a>

      {/* ============== SL/TARGET MODAL ============== */}
      {selectedPosition && (
        <SLTargetModal
          isOpen={slTargetModalOpen}
          onClose={() => {
            setSlTargetModalOpen(false);
            setSelectedPosition(null);
          }}
          position={{
            id: selectedPosition.id,
            symbol: selectedPosition.symbol,
            side: selectedPosition.side,
            avgPrice: selectedPosition.avgPrice,
            currentPrice: liveLtpByPosId.get(selectedPosition.id),
            stopLoss: selectedPosition.stopLoss ?? null,
            target: selectedPosition.target ?? null,
          }}
          onUpdate={handleUpdateSLTarget}
        />
      )}
      </AnimatedTabContent>
      </div>{/* end swipable content */}
    </div>
  );
}

/* ============================================================
   PendingLimitPositions — shows pending limit orders as "Pending Positions"
   ============================================================ */
function PendingLimitPositions({
  orders,
  quotes,
  token,
}: {
  orders: Order[];
  quotes: Record<string, any>;
  token: string | null;
}) {
  const pendingLimits = orders.filter(
    (o) => o.status === 'PENDING' && o.orderType === 'LIMIT'
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const handleEditSave = async (orderId: string) => {
    const newPrice = parseFloat(editPrice);
    if (!newPrice || newPrice <= 0 || !token) return;
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price: newPrice }),
      });
      setEditingId(null);
      setEditPrice('');
      toast({ title: 'Limit price updated', description: `New target: ₹${formatNumber(newPrice, 2)}` });
    } catch {
      /* ignore */
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: 'Limit order cancelled' });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="card-soft p-3 sm:p-4 mb-4 border-2 border-accent-gold/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-gold/20">
          <Zap className="h-3.5 w-3.5 text-accent-gold" />
        </div>
        <h3 className="font-heading text-sm font-semibold text-text-primary">
          Pending Positions
        </h3>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-gold/20 px-1 text-[10px] font-bold text-accent-gold">
          {pendingLimits.length}
        </span>
      </div>
      <div className="space-y-2">
        {pendingLimits.map((ord) => {
          const label =
            ord.segment === 'OPTIONS' && ord.strikePrice && ord.optionType
              ? `${ord.symbol} ${ord.strikePrice} ${ord.optionType}`
              : ord.symbol;
          const limitPrice = ord.price ?? 0;

          // Try to get live LTP
          const upstoxKey = getUpstoxKey(ord.symbol);
          const liveTick = upstoxKey ? quotes[upstoxKey] : undefined;
          const liveLtp = liveTick?.ltp ?? 0;

          let progressPct = 0;
          if (liveLtp > 0 && limitPrice > 0) {
            if (ord.side === 'BUY') {
              progressPct = Math.min(100, Math.max(0, ((liveLtp - limitPrice) / liveLtp) * 100));
            } else {
              progressPct = Math.min(100, Math.max(0, ((limitPrice - liveLtp) / limitPrice) * 100));
            }
          }

          return (
            <div
              key={ord.id}
              className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <StockLogo symbol={ord.symbol} size="sm" rounded="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-mono text-sm font-semibold text-text-primary">{label}</p>
                    <span className={cn(
                      'pill text-[9px]',
                      ord.side === 'BUY' ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red'
                    )}>
                      {ord.side}
                    </span>
                    <span className="pill text-[9px] bg-accent-gold/20 text-accent-gold">PENDING</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-tertiary">Target:</span>
                  <span className="font-mono text-xs font-bold text-accent-gold">₹{formatNumber(limitPrice, 2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-tertiary">LTP:</span>
                  <span className={cn(
                    'font-mono text-xs font-semibold',
                    liveLtp > 0 ? 'text-text-primary' : 'text-text-tertiary'
                  )}>
                    {liveLtp > 0 ? `₹${formatNumber(liveLtp, 2)}` : '—'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="h-1 rounded-full bg-bg-surface-alt overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      progressPct > 80 ? 'bg-profit-green' : 'bg-accent-gold/60'
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              {editingId === ord.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary">New limit:</span>
                  <input
                    type="number"
                    step="0.05"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-7 w-24 px-2 rounded-md border border-border bg-bg-surface text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleEditSave(ord.id)}
                    className="h-7 px-3 rounded-md bg-brand-primary text-white text-[10px] font-bold hover:bg-brand-primary/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="h-7 px-2 rounded-md border border-border text-[10px] font-medium text-text-secondary hover:bg-bg-surface-alt"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(ord.id);
                      setEditPrice(String(limitPrice));
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-brand-primary hover:bg-tint-blue transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleCancel(ord.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-loss-red hover:bg-tint-red transition-colors"
                  >
                    <XCircle className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
