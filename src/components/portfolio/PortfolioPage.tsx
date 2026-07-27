'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn, formatINR, formatNumber } from '@/lib/utils';
import {
  Wallet, TrendingUp, TrendingDown, Activity, Trophy, PieChart,
  BarChart3, Target, AlertCircle, Briefcase, Receipt, Layers,
  Download, Filter, ChevronRight, Clock, ArrowUpRight, ArrowDownRight,
  Percent, DollarSign, Sparkles, BookOpen,
} from 'lucide-react';
import type { Portfolio, Position, IndexData, Order, Trade } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';
import { FreeTrialWidget } from '@/components/shared/FreeTrialWidget';
import { Sparkline } from '@/components/shared/Sparkline';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { getUpstoxKey, INDEX_TO_UPSTOX_KEY } from '@/lib/upstox-instruments';

// Deterministic mini-series for sparklines based on symbol
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

interface SectorAllocation {
  sector: string;
  value: number;
  pct: number;
  color: string;
}

const SECTOR_COLORS = [
  'bg-brand-primary', 'bg-profit-green', 'bg-accent-gold', 'bg-info-purple',
  'bg-loss-red', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500',
];

export function PortfolioPage() {
  const { token } = useAuthStore();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'holdings' | 'analytics' | 'history'>('holdings');

  /* Live WebSocket quotes for all open positions */
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [pRes, posRes, tRes, oRes] = await Promise.all([
          fetch('/api/portfolio', { headers }),
          fetch('/api/positions', { headers }),
          fetch('/api/trades', { headers }),
          fetch('/api/orders', { headers }),
        ]);
        const pData = await pRes.json();
        const posData = await posRes.json();
        const tData = await tRes.json();
        const oData = await oRes.json();
        if (pData.success) setPortfolio(pData.data);
        if (posData.success) setPositions(posData.data);
        if (tData.success) setRecentTrades((tData.data || []).slice(0, 20));
        if (oData.success) setRecentOrders((oData.data || []).slice(0, 10));
      } catch (err) {
        console.error('Portfolio fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Subscribe to live ticks for all open position symbols
  useEffect(() => {
    const wanted = new Set<string>();
    for (const p of positions) {
      if (p.status !== 'OPEN') continue;
      const k = getUpstoxKey(p.symbol) || INDEX_TO_UPSTOX_KEY[p.symbol];
      if (k) wanted.add(k);
    }
    const newKeys = Array.from(wanted).filter((k) => !subscribedRef.current.has(k));
    const stale = Array.from(subscribedRef.current).filter((k) => !wanted.has(k));
    if (newKeys.length > 0) {
      subscribe(newKeys);
      newKeys.forEach((k) => subscribedRef.current.add(k));
    }
    if (stale.length > 0) {
      unsubscribe(stale);
      stale.forEach((k) => subscribedRef.current.delete(k));
    }
  }, [positions, subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0) {
        unsubscribe(Array.from(subscribedRef.current));
        subscribedRef.current.clear();
      }
    };
  }, [unsubscribe]);

  /* Compute live total P&L using live ticks — falls back to API pnl */
  const livePnl = useMemo(() => {
    let total = 0;
    let anyLive = false;
    for (const p of positions) {
      if (p.status !== 'OPEN') continue;
      const k = getUpstoxKey(p.symbol) || INDEX_TO_UPSTOX_KEY[p.symbol];
      const tick = k ? quotes[k] : undefined;
      const ltp = tick?.ltp ?? p.currentPrice ?? p.avgPrice;
      if (tick) anyLive = true;
      const pnl = (ltp - p.avgPrice) * p.quantity * (p.side === 'LONG' ? 1 : -1);
      total += pnl;
    }
    return { total, anyLive };
  }, [positions, quotes]);

  // Sector allocation derived from open positions
  const sectorAlloc: SectorAllocation[] = useMemo(() => {
    if (positions.length === 0) return [];
    const map = new Map<string, number>();
    for (const p of positions) {
      const val = (p.currentPrice || p.avgPrice) * p.quantity;
      const sector = (p as any).sector || 'Other';
      map.set(sector, (map.get(sector) || 0) + val);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([sector, value], i) => ({
        sector,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-2xl bg-bg-surface" />
        <div className="grid gap-3 grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  // Real portfolio values from /api/portfolio — no DEMO fallbacks.
  // If the portfolio hasn't loaded yet, the loading skeleton above handles it.
  const totalBalance = portfolio?.totalBalance ?? 0;
  const invested = portfolio?.investedAmount ?? 0;
  const available = portfolio?.availableMargin ?? 0;
  const totalPnl = portfolio?.totalPnl ?? 0;
  const realized = portfolio?.realizedPnl ?? 0;
  const unrealized = portfolio?.unrealizedPnl ?? 0;
  const totalPnlPct = invested > 0 ? (totalPnl / invested) * 100 : 0;
  const totalPnlPositive = totalPnl >= 0;
  const winRate = portfolio?.winRate ?? 0;
  const totalTrades = portfolio?.totalTrades ?? 0;
  const wins = portfolio?.winningTrades ?? 0;
  const losses = Math.max(0, totalTrades - wins);
  const openPositionsCount = positions.length;

  // Risk metrics (mock-derived for demo)
  const largestPosition = positions.length > 0
    ? positions.reduce((max, p) => {
      const val = (p.currentPrice || p.avgPrice) * p.quantity;
      return val > max.val ? { val, pos: p } : max;
    }, { val: 0, pos: positions[0] })
    : null;
  const largestPositionPct = largestPosition && invested > 0
    ? (largestPosition.val / invested) * 100
    : 0;
  const diversificationScore = Math.min(100, openPositionsCount * 12);

  return (
    <div className="space-y-5">
      {/* ============== HEADER ============== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Portfolio Analytics</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Track holdings, P&L, sector exposure & performance
          </p>
        </div>
      </div>

      {/* ============== FREE TRIAL BANNER ============== */}
      <FreeTrialWidget variant="banner" />

      {/* ============== TOP METRICS GRID ============== */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Wallet}
          iconBg="bg-tint-blue"
          iconColor="text-brand-primary"
          label="Total Balance"
          value={formatINR(totalBalance)}
          subtext="Virtual Capital"
        />
        <MetricCard
          icon={totalPnlPositive ? TrendingUp : TrendingDown}
          iconBg={totalPnlPositive ? 'bg-tint-green' : 'bg-tint-red'}
          iconColor={totalPnlPositive ? 'text-profit-green' : 'text-loss-red'}
          label={livePnl.anyLive ? 'Total P&L · LIVE' : 'Total P&L'}
          value={
            <span className={totalPnlPositive ? 'text-profit-green' : 'text-loss-red'}>
              {totalPnlPositive ? '+' : ''}{formatINR(livePnl.anyLive ? (realized + livePnl.total) : totalPnl)}
              {livePnl.anyLive && (
                <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse align-middle" />
              )}
            </span>
          }
          subtext={`${totalPnlPositive ? '+' : ''}${totalPnlPct.toFixed(2)}% return`}
        />
        <MetricCard
          icon={Activity}
          iconBg="bg-tint-purple"
          iconColor="text-info-purple"
          label="Invested"
          value={formatINR(invested)}
          subtext={`Available: ${formatINR(available)}`}
        />
        <MetricCard
          icon={Trophy}
          iconBg="bg-tint-yellow"
          iconColor="text-accent-gold"
          label="Win Rate"
          value={<span className="text-brand-primary">{winRate.toFixed(1)}%</span>}
          subtext={`${wins}W · ${losses}L · ${totalTrades} trades`}
        />
      </div>

      {/* ============== TABS ============== */}
      <div className="card-soft p-1 flex gap-1 overflow-x-auto">
        {[
          { id: 'holdings', label: 'Holdings', icon: Briefcase },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'history', label: 'History', icon: Clock },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              'flex-1 min-w-fit flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === t.id
                ? 'bg-brand-primary text-white'
                : 'text-text-secondary hover:bg-bg-surface-alt'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ============== HOLDINGS TAB ============== */}
      {activeTab === 'holdings' && (
        <div className="space-y-4">
          {/* P&L breakdown card */}
          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">P&L Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              <PnlBlock
                label="Realized P&L"
                value={realized}
                hint="From closed trades"
              />
              <PnlBlock
                label="Unrealized P&L"
                value={unrealized}
                hint="From open positions"
              />
              <PnlBlock
                label="Total P&L"
                value={totalPnl}
                hint={`${totalPnlPositive ? '+' : ''}${totalPnlPct.toFixed(2)}% return`}
                bold
              />
            </div>
          </div>

          {/* Open positions table */}
          <div className="card-soft p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                Open Holdings ({openPositionsCount})
              </h3>
              {openPositionsCount > 0 && (
                <a
                  href="/positions"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
                >
                  Manage Positions <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
            {openPositionsCount === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-alt mb-2">
                  <Briefcase className="h-6 w-6 text-text-secondary" />
                </div>
                <p className="text-sm font-medium text-text-primary">No open positions yet</p>
                <p className="text-xs text-text-secondary mt-1 max-w-xs">
                  Place your first trade to see your holdings, P&L, and sector allocation here.
                </p>
                <a
                  href="/trade"
                  className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold px-4 hover:bg-brand-primary-hover transition-colors"
                >
                  Start Trading
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wide">
                      <th className="px-3 py-2">Instrument</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Avg Price</th>
                      <th className="px-3 py-2 text-right">Current</th>
                      <th className="px-3 py-2 text-right">Value</th>
                      <th className="px-3 py-2 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      // Live tick lookup
                      const liveKey = getUpstoxKey(pos.symbol) || INDEX_TO_UPSTOX_KEY[pos.symbol];
                      const tick = liveKey ? quotes[liveKey] : undefined;
                      const liveLtp = tick?.ltp ?? pos.currentPrice ?? pos.avgPrice;
                      const livePnlRow = (liveLtp - pos.avgPrice) * pos.quantity * (pos.side === 'LONG' ? 1 : -1);
                      const livePnlPct = pos.avgPrice > 0
                        ? (livePnlRow / (pos.avgPrice * pos.quantity)) * 100
                        : 0;
                      const positive = livePnlRow >= 0;
                      const value = liveLtp * pos.quantity;
                      const isLive = !!tick?.timestamp && Date.now() - tick.timestamp < 30000;
                      return (
                        <tr
                          key={pos.id}
                          className="border-t border-border hover:bg-bg-surface-alt/50 transition-colors"
                        >
                          <td className="px-3 py-3">
                            <a href={`/stock/${pos.symbol}`} className="flex items-center gap-2">
                              <StockLogo symbol={pos.symbol} size="sm" rounded="md" />
                              <div className="min-w-0">
                                <p className="font-mono text-sm font-semibold text-text-primary truncate">
                                  {pos.symbol}
                                  {isLive && (
                                    <span className="ml-1 inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse align-middle" />
                                  )}
                                </p>
                                <p className="text-[10px] text-text-tertiary">{pos.segment}</p>
                              </div>
                            </a>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-text-primary">{pos.quantity}</td>
                          <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-text-secondary">₹{formatNumber(pos.avgPrice, 2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-text-primary">₹{formatNumber(liveLtp, 2)}</td>
                          <td className="px-3 py-3 text-right font-mono text-sm font-semibold tabular-nums text-text-primary">₹{formatNumber(value, 0)}</td>
                          <td className={cn('px-3 py-3 text-right font-mono text-sm font-semibold tabular-nums', positive ? 'text-profit-green' : 'text-loss-red')}>
                            {positive ? '+' : ''}₹{formatNumber(livePnlRow, 2)}
                            <div className={cn('text-[10px]', positive ? 'text-profit-green' : 'text-loss-red')}>
                              {positive ? '+' : ''}{livePnlPct.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============== ANALYTICS TAB ============== */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Sector allocation */}
          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-brand-primary" />
              Sector Allocation
            </h3>
            {sectorAlloc.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">
                Open positions to see your sector exposure breakdown.
              </p>
            ) : (
              <>
                {/* Stacked bar */}
                <div className="h-3 w-full rounded-full overflow-hidden bg-bg-surface-alt flex">
                  {sectorAlloc.map((s, i) => (
                    <div
                      key={s.sector}
                      className={cn('h-full transition-all', s.color)}
                      style={{ width: `${s.pct}%` }}
                      title={`${s.sector}: ${s.pct.toFixed(1)}%`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {sectorAlloc.map((s) => (
                    <div key={s.sector} className="flex items-center gap-2 text-xs">
                      <span className={cn('h-2.5 w-2.5 rounded-sm shrink-0', s.color)} />
                      <span className="text-text-secondary truncate flex-1">{s.sector}</span>
                      <span className="font-mono font-semibold text-text-primary tabular-nums">{s.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Risk metrics */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="card-soft p-4">
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-accent-gold" />
                Risk Metrics
              </h3>
              <div className="space-y-3">
                <RiskRow
                  label="Diversification"
                  value={`${diversificationScore.toFixed(0)}/100`}
                  hint={`${openPositionsCount} position${openPositionsCount === 1 ? '' : 's'}`}
                  progress={diversificationScore}
                  color="bg-profit-green"
                />
                <RiskRow
                  label="Largest Position"
                  value={largestPosition ? `${largestPositionPct.toFixed(1)}%` : '—'}
                  hint={largestPosition ? largestPosition.pos.symbol : 'No open positions'}
                  progress={largestPositionPct}
                  color="bg-accent-gold"
                />
                <RiskRow
                  label="Capital Deployed"
                  value={`${totalBalance > 0 ? ((invested / totalBalance) * 100).toFixed(1) : '0'}%`}
                  hint={`${formatINR(invested)} of ${formatINR(totalBalance)}`}
                  progress={totalBalance > 0 ? (invested / totalBalance) * 100 : 0}
                  color="bg-brand-primary"
                />
                <RiskRow
                  label="Cash Available"
                  value={`${totalBalance > 0 ? ((available / totalBalance) * 100).toFixed(1) : '0'}%`}
                  hint={formatINR(available)}
                  progress={totalBalance > 0 ? (available / totalBalance) * 100 : 0}
                  color="bg-info-purple"
                />
              </div>
            </div>

            <div className="card-soft p-4">
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent-gold" />
                Performance
              </h3>
              <div className="space-y-3">
                <StatRow icon={Receipt} label="Total Trades" value={String(totalTrades)} />
                <StatRow
                  icon={TrendingUp}
                  label="Winning Trades"
                  value={`${wins} (${totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(0) : 0}%)`}
                  valueClass="text-profit-green"
                />
                <StatRow
                  icon={TrendingDown}
                  label="Losing Trades"
                  value={`${losses} (${totalTrades > 0 ? ((losses / totalTrades) * 100).toFixed(0) : 0}%)`}
                  valueClass="text-loss-red"
                />
                <StatRow icon={Percent} label="Win Rate" value={`${winRate.toFixed(1)}%`} />
                <StatRow
                  icon={DollarSign}
                  label="Avg Trade Size"
                  value={totalTrades > 0 ? formatINR(invested / totalTrades) : '—'}
                />
              </div>
            </div>
          </div>

          {/* Top movers (mock) */}
          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-primary" />
              Top Performing Holdings
            </h3>
            {positions.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No holdings yet.</p>
            ) : (
              <div className="space-y-2">
                {[...positions]
                  .sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0))
                  .slice(0, 5)
                  .map((pos) => {
                    const positive = (pos.pnlPct ?? 0) >= 0;
                    return (
                      <a
                        key={pos.id}
                        href={`/stock/${pos.symbol}`}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-bg-surface-alt transition-colors"
                      >
                        <StockLogo symbol={pos.symbol} size="sm" rounded="md" />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold text-text-primary">{pos.symbol}</p>
                          <p className="text-[11px] text-text-secondary">{pos.quantity} qty · ₹{formatNumber(pos.avgPrice, 2)}</p>
                        </div>
                        <Sparkline data={getMiniSeries(pos.symbol, positive)} positive={positive} />
                        <div className={cn('text-right shrink-0 min-w-[80px]', positive ? 'text-profit-green' : 'text-loss-red')}>
                          <p className="font-mono text-sm font-semibold tabular-nums">
                            {positive ? '+' : ''}{(pos.pnlPct ?? 0).toFixed(2)}%
                          </p>
                          <p className="font-mono text-[10px] tabular-nums">
                            {positive ? '+' : ''}₹{formatNumber(pos.pnl, 2)}
                          </p>
                        </div>
                      </a>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============== HISTORY TAB ============== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Recent trades */}
          <div className="card-soft p-3">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 px-1">Recent Trades</h3>
            {recentTrades.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">No trades yet.</p>
            ) : (
              <div className="space-y-1">
                {recentTrades.map((t) => {
                  const positive = (t.pnl ?? 0) >= 0;
                  const isBuy = t.side === 'BUY';
                  return (
                    <a
                      key={t.id}
                      href={`/stock/${t.symbol}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-bg-surface-alt transition-colors"
                    >
                      <StockLogo symbol={t.symbol} size="sm" rounded="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-sm font-semibold text-text-primary">{t.symbol}</p>
                          <span className={cn('pill', isBuy ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red')}>
                            {t.side}
                          </span>
                          <span className="text-[10px] text-text-tertiary">{t.type}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {t.quantity} qty @ ₹{formatNumber(t.price, 2)}
                          {t.optionType ? ` · ${t.optionType}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                          ₹{formatNumber(t.price * t.quantity, 0)}
                        </p>
                        {t.type === 'CLOSE' && (
                          <p className={cn('font-mono text-[10px] tabular-nums', positive ? 'text-profit-green' : 'text-loss-red')}>
                            {positive ? '+' : ''}₹{formatNumber(t.pnl, 2)}
                          </p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div className="card-soft p-3">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3 px-1">Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">No orders placed yet.</p>
            ) : (
              <div className="space-y-1">
                {recentOrders.map((o) => {
                  const isBuy = o.side === 'BUY';
                  return (
                    <a
                      key={o.id}
                      href={`/stock/${o.symbol}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-bg-surface-alt transition-colors"
                    >
                      <StockLogo symbol={o.symbol} size="sm" rounded="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-sm font-semibold text-text-primary">{o.symbol}</p>
                          <span className={cn('pill', isBuy ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red')}>
                            {o.side}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          {o.orderType} · {o.quantity} qty @ ₹{formatNumber(o.filledPrice ?? o.price ?? 0, 2)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn(
                          'pill',
                          o.status === 'FILLED' ? 'bg-tint-green text-profit-green'
                          : o.status === 'PENDING' ? 'bg-tint-yellow text-accent-gold'
                          : 'bg-tint-red text-loss-red'
                        )}>
                          {o.status}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  subtext?: string;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-medium text-text-secondary">{label}</p>
        <div className={cn('icon-tile', iconBg)}>
          <Icon className={cn('h-[18px] w-[18px]', iconColor)} />
        </div>
      </div>
      <p className="mt-2 font-mono text-xl font-bold tabular-nums text-text-primary">{value}</p>
      {subtext && <p className="mt-0.5 text-[11px] text-text-tertiary">{subtext}</p>}
    </div>
  );
}

function PnlBlock({
  label,
  value,
  hint,
  bold,
}: {
  label: string;
  value: number;
  hint?: string;
  bold?: boolean;
}) {
  const positive = value >= 0;
  return (
    <div className={cn('rounded-lg p-3 text-center', bold ? 'bg-bg-surface-alt' : 'bg-bg-surface/50')}>
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">{label}</p>
      <p className={cn(
        'mt-1 font-mono tabular-nums',
        bold ? 'text-lg font-bold' : 'text-base font-semibold',
        positive ? 'text-profit-green' : 'text-loss-red'
      )}>
        {positive ? '+' : ''}{formatINR(value)}
      </p>
      {hint && <p className="text-[10px] text-text-tertiary mt-0.5">{hint}</p>}
    </div>
  );
}

function RiskRow({
  label,
  value,
  hint,
  progress,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  progress: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <p className="font-mono text-xs font-bold tabular-nums text-text-primary">{value}</p>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-bg-surface-alt overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      {hint && <p className="text-[10px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
      <span className="text-xs text-text-secondary flex-1">{label}</span>
      <span className={cn('font-mono text-xs font-bold tabular-nums', valueClass || 'text-text-primary')}>{value}</span>
    </div>
  );
}
