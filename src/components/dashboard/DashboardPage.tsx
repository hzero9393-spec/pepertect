'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatINR, formatNumber, cn, getInitials, formatOrderStatus } from '@/lib/utils';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import {
  TrendingUp, TrendingDown, Trophy, Target,
  BarChart3, ArrowUpRight, ArrowDownRight, Clock, 
  Activity, Zap, AlertCircle, Sparkles, Crown,
} from 'lucide-react';
import type { Portfolio, Position, IndexData, Order } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';
import { Sparkline } from '@/components/shared/Sparkline';
import { FreeTrialWidget } from '@/components/shared/FreeTrialWidget';
import { getUpstoxKey } from '@/lib/upstox-instruments';
import { resolveOptionInstrumentKeys } from '@/lib/option-instrument-resolver';
import { UpstoxReconnectBanner } from '@/components/UpstoxReconnectBanner';

// ─── Constants ──────────────────────────────────────────────
const INDEX_TO_UPSTOX_KEY: Record<string, string> = {
  NIFTY: 'NSE_INDEX|Nifty 50',
  SENSEX: 'BSE_INDEX|SENSEX',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank',
  FINNIFTY: 'NSE_INDEX|Nifty Fin Service',
  NIFTYFS: 'NSE_INDEX|Nifty Fin Service',
};

// Market hours for Indian stock market
const MARKET_OPEN = '09:15';
const MARKET_CLOSE = '15:30';

// ─── Helper Functions ───────────────────────────────────────
function getMiniSeries(symbol: string, positive: boolean): number[] {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  const out: number[] = [];
  let v = 50;
  for (let i = 0; i < 16; i++) {
    const noise = (Math.abs(Math.sin(h + i)) * 14) - 7;
    const trend = positive ? 1.4 : -1.4;
    v = Math.max(5, Math.min(95, v + noise + trend));
    out.push(v);
  }
  return out;
}

// Generate intraday equity curve data points (simulated for demo)
function generateEquityCurveData(pnl: number, isPositive: boolean): number[] {
  const points: number[] = [];
  let value = 50;
  const volatility = Math.min(Math.abs(pnl) / 100, 5);
  const trend = isPositive ? 1 : -1;
  
  for (let i = 0; i < 30; i++) {
    const progress = i / 30;
    const randomWalk = (Math.random() - 0.5) * volatility * 3;
    const drift = trend * progress * Math.abs(pnl) / 50;
    value = Math.max(10, Math.min(90, value + randomWalk + drift));
    points.push(value);
  }
  return points;
}

// ─── Main Component ─────────────────────────────────────────
export function DashboardPage() {
  const { user, token } = useAuthStore();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Current time state for live updates
  const [currentTime, setCurrentTime] = useState(new Date());

  // Trial status for hiding upgrade buttons
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [trialStatus, setTrialStatus] = useState<'active' | 'expired' | 'none'>('none');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Tier-based fallback capital
  const tierFallback = user?.tier === 'PREMIUM' ? 100000 : 10000;

  // Live quotes via WebSocket
  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  // Option instrument resolution
  const [optionKeyMap, setOptionKeyMap] = useState<Map<string, string | null>>(new Map());
  
  useEffect(() => {
    const optPositions = positions.filter(
      (p) =>
        p.status === 'OPEN' &&
        p.segment === 'OPTIONS' &&
        p.strikePrice != null &&
        p.optionType &&
        p.expiry &&
        !p.instrumentKey
    );
    if (optPositions.length === 0) {
      setOptionKeyMap(new Map());
      return;
    }
    let cancelled = false;
    resolveOptionInstrumentKeys(
      optPositions.map((p) => ({
        id: p.id,
        symbol: p.symbol,
        strikePrice: Number(p.strikePrice),
        optionType: p.optionType as 'CE' | 'PE',
        expiry: p.expiry as string,
      }))
    )
      .then((m) => { if (!cancelled) setOptionKeyMap(m); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [positions]);

  function getLiveKeyForPosition(p: Position): string | null {
    if (p.instrumentKey) return p.instrumentKey;
    if (p.segment === 'OPTIONS' && p.strikePrice != null && p.optionType && p.expiry) {
      return optionKeyMap.get(p.id) ?? null;
    }
    return getUpstoxKey(p.symbol) || INDEX_TO_UPSTOX_KEY[p.symbol] || null;
  }

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const i of indices) {
      const k = INDEX_TO_UPSTOX_KEY[i.symbol];
      if (k) keys.add(k);
    }
    for (const p of positions) {
      if (p.status !== 'OPEN') continue;
      const k = getLiveKeyForPosition(p);
      if (k) keys.add(k);
    }
    return Array.from(keys);
  }, [indices, positions, optionKeyMap]);

  // Subscribe to live quotes
  useEffect(() => {
    if (allKeys.length === 0) return;
    const newKeys = allKeys.filter((k) => !subscribedRef.current.has(k));
    const stale = Array.from(subscribedRef.current).filter((k) => !allKeys.includes(k));
    if (newKeys.length > 0) {
      subscribe(newKeys);
      newKeys.forEach((k) => subscribedRef.current.add(k));
    }
    if (stale.length > 0) {
      unsubscribe(stale);
      stale.forEach((k) => subscribedRef.current.delete(k));
    }
  }, [allKeys, subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0) {
        unsubscribe(Array.from(subscribedRef.current));
        subscribedRef.current.clear();
      }
    };
  }, [unsubscribe]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [pRes, posRes, idxRes, ordRes] = await Promise.all([
          fetch('/api/portfolio', { headers }),
          fetch('/api/positions', { headers }),
          fetch('/api/market/indices', { headers }),
          fetch('/api/orders', { headers }),
        ]);
        const pData = await pRes.json();
        const posData = await posRes.json();
        const idxData = await idxRes.json();
        const ordData = await ordRes.json();

        if (pData.success) setPortfolio(pData.data);
        if (posData.success) setPositions(posData.data);
        if (idxData.success) setIndices(idxData.data);
        if (ordData.success) setRecentOrders(ordData.data.slice(0, 20)); // Get more orders for analysis
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Fetch trial status
  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/user/trial-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success && d.data) {
          if (d.data.active && d.data.endsAt) {
            setTrialStatus('active');
            setTrialEndsAt(new Date(d.data.endsAt));
          } else if (d.data.expired) {
            setTrialStatus('expired');
          }
        }
      } catch { /* silent fail */ }
    };
    fetchTrialStatus();
  }, [token]);

  // Trial countdown timer
  useEffect(() => {
    if (!trialEndsAt) return;
    const updateTimer = () => {
      const now = new Date();
      const diff = trialEndsAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setTrialStatus('expired');
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  // Live clock update every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Upgrade visibility logic
  const shouldShowUpgrade = useMemo(() => {
    if (user?.tier === 'PREMIUM') return false;
    if (trialStatus !== 'active') return true;
    return timeLeft.days < 2;
  }, [user?.tier, trialStatus, timeLeft.days]);

  // ─── TODAY'S METRICS CALCULATIONS ────────────────────────
  const totalPnl = portfolio?.totalPnl ?? 0;
  const totalPnlPositive = totalPnl >= 0;
  const winRate = portfolio?.winRate ?? 0;
  const wins = portfolio?.winningTrades ?? 0;
  const totalTrades = portfolio?.totalTrades ?? 0;
  const losses = Math.max(0, totalTrades - wins);
  const invested = portfolio?.investedAmount ?? 0;
  const realizedPnl = portfolio?.realizedPnl ?? 0;
  const unrealizedPnl = totalPnl - realizedPnl;
  
  // Calculate best and worst trades from recent orders
  const bestTrade = useMemo(() => {
    if (!recentOrders.length) return null;
    const completed = recentOrders.filter(o => o.status === 'FILLED' && o.pnl !== undefined && o.pnl !== null);
    if (!completed.length) return null;
    return completed.reduce((best, order) => 
      (order.pnl ?? 0) > (best?.pnl ?? 0) ? order : best, completed[0]);
  }, [recentOrders]);

  const worstTrade = useMemo(() => {
    if (!recentOrders.length) return null;
    const completed = recentOrders.filter(o => o.status === 'FILLED' && o.pnl !== undefined && o.pnl !== null);
    if (!completed.length) return null;
    return completed.reduce((worst, order) => 
      (order.pnl ?? 0) < (worst?.pnl ?? 0) ? order : worst, completed[0]);
  }, [recentOrders]);

  const activePositionsCount = positions.filter(p => p.status === 'OPEN').length;

  // Format current time
  const formattedTime = currentTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
  
  const formattedDate = currentTime.toLocaleDateString('en-IN', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  // Check if market is open
  const marketOpen = (() => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const currentTimeNum = hour * 100 + minute;
    return currentTimeNum >= 915 && currentTimeNum <= 1530;
  })();

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-bg-surface" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-bg-surface" />
        </div>
        {/* P&L hero skeleton */}
        <div className="h-36 animate-pulse rounded-xl bg-bg-surface" />
        {/* Metrics grid skeleton */}
        <div className="grid gap-3 grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── HEADER BAR ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-lg font-bold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-secondary mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Market Status */}
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
            marketOpen 
              ? "bg-profit-green/10 text-profit-green" 
              : "bg-bg-surface-alt text-text-tertiary"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              marketOpen ? "bg-profit-green animate-pulse" : "bg-text-tertiary"
            )} />
            {marketOpen ? "Market Open" : "Market Closed"}
          </span>
          {/* Live Time */}
          <span className="font-mono text-sm font-medium text-text-secondary tabular-nums">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Upstox reconnect banner */}
      <UpstoxReconnectBanner status={wsStatus} />

      {/* Free Trial Widget (only for non-trial users) */}
      {(user?.tier !== 'PREMIUM' && user?.subscriptionTier !== 'TRIAL') && <FreeTrialWidget variant="card" />}

      {/* ══════════════════════════════════════════════════ */}
      {/* TODAY'S P&L HERO CARD                              */}
      {/* ══════════════════════════════════════════════════ */}
      <div className={cn(
        "relative overflow-hidden rounded-xl border p-5",
        totalPnlPositive 
          ? "border-profit-green/20 bg-profit-green/[0.03]" 
          : "border-loss-red/20 bg-loss-red/[0.03]"
      )}>
        <div className="relative z-10">
          {/* Label row */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Today&apos;s P&L
            </span>
            {trialStatus === 'active' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-gold/10 text-[10px] font-semibold text-accent-gold">
                <Sparkles className="h-3 w-3" />
                Trial Active
              </span>
            )}
          </div>

          {/* Main P&L Value */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className={cn(
              "font-mono text-4xl font-bold tabular-nums leading-none",
              totalPnlPositive ? "text-profit-green" : "text-loss-red"
            )}>
              {totalPnlPositive ? '+' : ''}{formatINR(totalPnl)}
            </span>
            <span className={cn(
              "text-sm font-medium",
              totalPnlPositive ? "text-profit-green" : "text-loss-red"
            )}>
              ({totalPnl >= 0 ? '+' : ''}{invested > 0 ? ((totalPnl / invested) * 100).toFixed(2) : '0.00'}%)
            </span>
          </div>

          {/* P&L Breakdown */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Realized</p>
              <p className={cn("font-mono text-sm font-semibold tabular-nums", realizedPnl >= 0 ? "text-profit-green" : "text-loss-red")}>
                {realizedPnl >= 0 ? '+' : ''}{formatINR(realizedPnl)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Unrealized</p>
              <p className={cn("font-mono text-sm font-semibold tabular-nums", unrealizedPnl >= 0 ? "text-profit-green" : "text-loss-red")}>
                {unrealizedPnl >= 0 ? '+' : ''}{formatINR(unrealizedPnl)}
              </p>
            </div>
            <div className="ml-auto">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Virtual Capital</p>
              <p className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                {formatINR(portfolio?.totalBalance ?? tierFallback)}
              </p>
            </div>
          </div>
        </div>

        {/* Background decoration - subtle */}
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none",
          totalPnlPositive ? "bg-profit-green" : "bg-loss-red"
        )} />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* PRIMARY METRICS GRID (Today's Stats)               */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Trades Today */}
        <MetricCard
          label="Total Trades"
          value={<span className="font-mono text-2xl font-bold text-text-primary">{totalTrades}</span>}
          subtext="Executed today"
          icon={Activity}
          iconColor="text-brand-primary"
        />
        
        {/* Winning Trades */}
        <MetricCard
          label="Winning Trades"
          value={<span className="font-mono text-2xl font-bold text-profit-green">{wins}</span>}
          subtext={`${winRate.toFixed(1)}% win rate`}
          icon={TrendingUp}
          iconColor="text-profit-green"
        />
        
        {/* Losing Trades */}
        <MetricCard
          label="Losing Trades"
          value={<span className="font-mono text-2xl font-bold text-loss-red">{losses}</span>}
          subtext={totalTrades > 0 ? `${((losses / totalTrades) * 100).toFixed(1)}% loss rate` : '-'}
          icon={TrendingDown}
          iconColor="text-loss-red"
        />
        
        {/* Win Rate */}
        <MetricCard
          label="Win Rate"
          value={
            <span className={cn(
              "font-mono text-2xl font-bold",
              winRate >= 50 ? "text-profit-green" : winRate >= 30 ? "text-accent-gold" : "text-loss-red"
            )}>
              {winRate.toFixed(1)}%
            </span>
          }
          subtext={`${wins}W / ${losses}L`}
          icon={Trophy}
          iconColor={winRate >= 50 ? "text-profit-green" : winRate >= 30 ? "text-accent-gold" : "text-loss-red"}
        />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* INTRADAY EQUITY CURVE */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-semibold text-text-primary">Intraday P&L</span>
          </div>
          <span className="text-[10px] text-text-tertiary font-mono">
            {MARKET_OPEN} → {formattedTime.split(' ')[0]}
          </span>
        </div>
        
        {/* Simple equity curve visualization */}
        <div className="h-32 flex items-end gap-0.5 px-2">
          {generateEquityCurveData(totalPnl, totalPnlPositive).map((value, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t transition-all duration-300 min-h-[2px]",
                totalPnlPositive 
                  ? "bg-profit-green/70 hover:bg-profit-green" 
                  : "bg-loss-red/70 hover:bg-loss-red"
              )}
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-2">
          <span className="text-[9px] text-text-tertiary font-mono">{MARKET_OPEN}</span>
          <span className="text-[9px] text-text-tertiary font-mono">Now</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* SECONDARY METRICS (Trade Insights)                 */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3">
        {/* Best Trade */}
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUpRight className="h-3.5 w-3.5 text-profit-green" />
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Best Trade</span>
          </div>
          {bestTrade ? (
            <>
              <p className="font-mono text-base font-bold text-profit-green tabular-nums">
                +{formatINR(bestTrade.pnl ?? 0)}
              </p>
              <p className="text-[10px] text-text-tertiary truncate mt-1">{bestTrade.symbol}</p>
            </>
          ) : (
            <p className="text-xs text-text-tertiary">No trades yet</p>
          )}
        </div>

        {/* Worst Trade */}
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDownRight className="h-3.5 w-3.5 text-loss-red" />
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Worst Trade</span>
          </div>
          {worstTrade ? (
            <>
              <p className="font-mono text-base font-bold text-loss-red tabular-nums">
                {formatINR(worstTrade.pnl ?? 0)}
              </p>
              <p className="text-[10px] text-text-tertiary truncate mt-1">{worstTrade.symbol}</p>
            </>
          ) : (
            <p className="text-xs text-text-tertiary">No trades yet</p>
          )}
        </div>

        {/* Active Positions */}
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="h-3.5 w-3.5 text-brand-primary" />
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Active Positions</span>
          </div>
          <p className="font-mono text-base font-bold text-text-primary tabular-nums">
            {activePositionsCount}
          </p>
          <p className="text-[10px] text-text-tertiary mt-1">Open trades</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* MARKET INDICES                                     */}
      {/* ══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Market Indices</h3>
          <a href="/market" className="text-xs font-semibold text-brand-primary hover:underline">
            View All
          </a>
        </div>
        <div className="divide-y divide-border/50 rounded-xl border border-border bg-background overflow-hidden">
          {indices.slice(0, 4).map((idx) => {
            const upstoxKey = INDEX_TO_UPSTOX_KEY[idx.symbol];
            const liveTick = upstoxKey ? quotes[upstoxKey] : undefined;
            const livePrice = liveTick?.ltp ?? idx.lastPrice;
            const liveChangePct = liveTick?.changePct ?? idx.changePct;
            const positive = (liveTick?.change ?? idx.change) >= 0;
            
            return (
              <a
                key={idx.id}
                href={`/stock/${idx.symbol}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-bg-surface-alt first:rounded-t-xl last:rounded-b-xl"
              >
                <StockLogo symbol={idx.symbol} size="sm" isIndex rounded="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-semibold text-text-primary">{idx.name}</p>
                  <p className="text-[11px] text-text-secondary">{idx.exchange}</p>
                </div>
                <Sparkline data={getMiniSeries(idx.symbol, positive)} positive={positive} size="sm" />
                <div className="text-right shrink-0 ml-2">
                  <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                    {formatNumber(livePrice, 2)}
                  </p>
                  <p className={cn(
                    "font-mono text-[11px] tabular-nums",
                    positive ? "text-profit-green" : "text-loss-red"
                  )}>
                    {positive ? '+' : ''}{liveChangePct.toFixed(2)}%
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* OPEN POSITIONS PREVIEW                               */}
      {/* ══════════════════════════════════════════════════ */}
      {positions.filter(p => p.status === 'OPEN').length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="font-heading text-sm font-semibold text-text-primary">Open Positions</h3>
            <a href="/positions" className="text-xs font-semibold text-brand-primary hover:underline">
              View All ({activePositionsCount})
            </a>
          </div>
          <div className="divide-y divide-border/50 rounded-xl border border-border bg-background overflow-hidden max-h-64 overflow-y-auto">
            {positions.filter(p => p.status === 'OPEN').slice(0, 5).map((pos) => {
              const liveKey = getLiveKeyForPosition(pos);
              const tick = liveKey ? quotes[liveKey] : undefined;
              const liveLtp = tick?.ltp ?? pos.currentPrice ?? pos.avgPrice;
              const livePnl = (liveLtp - pos.avgPrice) * pos.quantity * (pos.side === 'LONG' ? 1 : -1);
              const positive = livePnl >= 0;
              
              return (
                <a
                  key={pos.id}
                  href={`/stock/${pos.symbol}`}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-bg-surface-alt"
                >
                  <StockLogo symbol={pos.symbol} size="md" rounded="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-text-primary">{pos.symbol}</p>
                      <span className={cn(
                        "pill text-[9px]",
                        pos.side === 'BUY' ? "bg-tint-green text-profit-green" : "bg-tint-red text-loss-red"
                      )}>
                        {pos.side}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {pos.quantity} qty @ ₹{formatNumber(pos.avgPrice, 2)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                      ₹{formatNumber(liveLtp * pos.quantity, 0)}
                    </p>
                    <p className={cn(
                      "font-mono text-[11px] tabular-nums",
                      positive ? "text-profit-green" : "text-loss-red"
                    )}>
                      {positive ? '+' : ''}₹{formatNumber(livePnl, 0)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions when no positions */}
      {positions.filter(p => p.status === 'OPEN').length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
          <Zap className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
          <p className="text-sm font-medium text-text-primary">No positions yet today</p>
          <p className="text-xs text-text-secondary mt-1">Start trading to see your performance here</p>
          <a href="/trade" className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover transition-colors">
            Place Order
          </a>
        </div>
      )}

      {/* Upgrade CTA (only when should show) */}
      {shouldShowUpgrade && (
        <a
          href="/subscription"
          className="block rounded-xl border border-brand-primary/20 bg-brand-primary/[0.03] p-4 hover:bg-brand-primary/[0.06] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-brand-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">Upgrade to Premium</p>
              <p className="text-[11px] text-text-secondary">Get ₹10L virtual capital & advanced features</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-brand-primary" />
          </div>
        </a>
      )}

      {/* Trial Active Notice */}
      {trialStatus === 'active' && !shouldShowUpgrade && (
        <div className="rounded-xl border border-accent-gold/20 bg-accent-gold/[0.03] p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-accent-gold shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary">Premium Trial Active</p>
            <p className="font-mono text-xs text-text-secondary tabular-nums">
              {String(timeLeft.days).padStart(2, '0')}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s remaining
            </p>
          </div>
          <span className="flex h-2 w-2 rounded-full bg-profit-green animate-pulse shrink-0" />
        </div>
      )}
    </div>
  );
}

// ─── Metric Card Component (Clean, Minimal) ───────────────
function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = "text-text-secondary",
}: {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4", iconColor)} />}
      </div>
      <p className="mt-1">{value}</p>
      {subtext && <p className="text-[10px] text-text-tertiary mt-0.5">{subtext}</p>}
    </div>
  );
}
