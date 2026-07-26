'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/common';
import { formatNumber, formatINR, getPnlColor, cn } from '@/lib/utils';
import { Briefcase, XCircle, Layers, TrendingUp, AlertTriangle, Loader2, CalendarDays, Shield, Crosshair, Zap } from 'lucide-react';
import type { Position, Trade } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { getUpstoxKey } from '@/lib/upstox-instruments';

/* Index symbols — used to classify positions as Index vs Stock */
const INDEX_SYMBOLS = new Set(['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY']);

/* Helper: classify a position as Index or Stock */
function isIndexPosition(p: Position | Trade): boolean {
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

export function PositionsPage() {
  const { token } = useAuthStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'index'>('stock');
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
    // Auto-refresh every 10s to update LTP/PnL (24h retention is enforced server-side)
    const id = setInterval(fetchPositions, 10000);
    return () => clearInterval(id);
  }, [token]);

  /* ---------- Subscribe to live quotes for all open positions ---------- */
  useEffect(() => {
    if (positions.length === 0) return;
    const newSyms: string[] = [];
    const newKeys: string[] = [];
    for (const p of positions) {
      if (subscribedSymsRef.current.has(p.symbol)) continue;
      const key = getUpstoxKey(p.symbol);
      if (key) {
        newSyms.push(p.symbol);
        newKeys.push(key);
      }
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
  }, [positions, subscribe, unsubscribe]);

  /* ---------- Auto-trigger SL / Target ---------- */
  // For each open position, check if live LTP has hit SL or Target.
  // If yes, call /api/positions/[id] to square off and log the auto-exit.
  const handleAutoSquareOff = async (pos: Position, reason: 'SL' | 'TARGET', ltp: number) => {
    if (exitedRef.current.has(pos.id)) return;
    exitedRef.current.add(pos.id);
    try {
      const res = await fetch(`/api/positions/${pos.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAutoExitLog((prev) =>
          [{ symbol: pos.symbol, reason, ltp, level: reason === 'SL' ? (pos.stopLoss ?? 0) : (pos.target ?? 0), ts: Date.now() }, ...prev].slice(0, 10)
        );
        setPositions((prev) => prev.filter((p) => p.id !== pos.id));
      } else {
        exitedRef.current.delete(pos.id); // allow retry
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
      const key = getUpstoxKey(p.symbol);
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
  }, [quotes, positions]);

  const handleSquareOff = async (posId: string) => {
    try {
      const res = await fetch(`/api/positions/${posId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
    // Sequentially square off to avoid race conditions on portfolio margin
    for (const p of targets) {
      try {
        const res = await fetch(`/api/positions/${p.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
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

  const totalInvested = filteredPositions.reduce((sum, p) => sum + p.investedAmt, 0);
  const totalPnl = filteredPositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalQty = filteredPositions.reduce((s, p) => s + p.quantity, 0);

  /* ---------- Today's P&L (realized + unrealized) for the active tab ---------- */
  const todayStats = useMemo(() => {
    const todayRealized = trades
      .filter((t) => isToday(t.createdAt) && (activeTab === 'index' ? isIndexPosition(t) : !isIndexPosition(t)))
      .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const todayUnrealized = filteredPositions
      .filter((p) => isToday(p.openedAt))
      .reduce((sum, p) => sum + (p.pnl || 0), 0);
    return {
      realized: todayRealized,
      unrealized: todayUnrealized,
      total: todayRealized + todayUnrealized,
    };
  }, [trades, filteredPositions, activeTab]);

  /* ---------- All-time totals for the active tab (extra context) ---------- */
  const allTimeRealized = useMemo(() => {
    return trades
      .filter((t) => (activeTab === 'index' ? isIndexPosition(t) : !isIndexPosition(t)))
      .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  }, [trades, activeTab]);

  return (
    <div className="space-y-6">
      {/* ============== TAB SWITCHER: Stock | Index ============== */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('stock')}
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
          onClick={() => setActiveTab('index')}
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

      {/* ============== TODAY'S P&L HERO CARD ============== */}
      <div className="card-soft p-4 relative overflow-hidden">
        <div className="absolute -right-2 -top-2 opacity-50 pointer-events-none">
          <CalendarDays className="h-20 w-20 text-brand-primary/20" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Today's P&L · {activeTab === 'stock' ? 'Stock' : 'Index'}
            </p>
          </div>
          <p className={`mt-2 font-mono text-3xl sm:text-4xl font-bold tabular-nums ${getPnlColor(todayStats.total)}`}>
            {todayStats.total >= 0 ? '+' : '−'}{formatINR(Math.abs(todayStats.total))}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Realized:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(todayStats.realized)}`}>
                {todayStats.realized >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(todayStats.realized), 2)}
              </span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">Unrealized:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(todayStats.unrealized)}`}>
                {todayStats.unrealized >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(todayStats.unrealized), 2)}
              </span>
            </div>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary">All-time realized:</span>
              <span className={`font-mono font-semibold tabular-nums ${getPnlColor(allTimeRealized)}`}>
                {allTimeRealized >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(allTimeRealized), 2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============== SUMMARY GRID ============== */}
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
          : <span>Live LTP refreshes every 10s · Connect Upstox for real-time SL/TGT triggers.</span>}
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

      {/* Positions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">
            {activeTab === 'stock' ? 'Stock Positions' : 'Index Positions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
          ) : filteredPositions.length === 0 ? (
            <EmptyState
              icon={activeTab === 'stock' ? TrendingUp : Layers}
              title={activeTab === 'stock' ? 'No stock positions' : 'No index positions'}
              description={activeTab === 'stock' ? 'Place an equity order to see stock positions here' : 'Place an F&O order to see index positions here'}
              action={<a href="/trade"><Button size="sm">Start Trading</Button></a>}
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredPositions.map((pos) => {
                /* Look up live LTP from WebSocket quotes */
                const liveKey = getUpstoxKey(pos.symbol);
                const liveTick = liveKey ? quotes[liveKey] : undefined;
                const liveLtp = liveTick?.ltp ?? pos.currentPrice ?? pos.avgPrice;
                /* Recompute PnL with live LTP */
                const livePnl = (liveLtp - pos.avgPrice) * pos.quantity;
                const livePnlPct = pos.avgPrice > 0 ? ((liveLtp - pos.avgPrice) / pos.avgPrice) * 100 : 0;
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
