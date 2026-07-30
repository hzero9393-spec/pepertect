'use client';

import { useState, useMemo } from 'react';
import { useTrades } from '@/hooks/useApi';
import { formatNumber, formatINR, getPnlColor, cn } from '@/lib/utils';
import { History, TrendingUp, TrendingDown, BarChart3, ChevronDown, CalendarDays, ArrowUpDown, Clock, Tag, Receipt, Percent, Search, Zap } from 'lucide-react';
import type { Trade } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';

/* Index symbols — used to classify trades as Index vs Stock */
const INDEX_SYMBOLS = new Set(['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY']);

function isIndexTrade(t: Trade): boolean {
  return INDEX_SYMBOLS.has(t.symbol.toUpperCase()) || t.segment !== 'EQUITY';
}

/* ── Format date helper ── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function TradeHistoryPage() {
  // React Query — cached, deduplicated, instant on revisit
  const { data: trades = [], isLoading } = useTrades();
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'index'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'value'>('date');

  /* Filter by tab */
  const filteredTrades = useMemo(() => {
    let result = trades;
    if (activeTab === 'stock') result = result.filter(t => !isIndexTrade(t));
    if (activeTab === 'index') result = result.filter(t => isIndexTrade(t));
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      result = result.filter(t => t.symbol.toUpperCase().includes(q));
    }
    /* Sort */
    result = [...result].sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'pnl') return (Number(b.pnl) || 0) - (Number(a.pnl) || 0);
      const aVal = (Number(a.price) || 0) * (Number(a.quantity) || 0);
      const bVal = (Number(b.price) || 0) * (Number(b.quantity) || 0);
      return bVal - aVal;
    });
    return result;
  }, [trades, activeTab, searchQuery, sortBy]);

  /* Summary stats — single useMemo instead of 5 separate ones */
  const stats = useMemo(() => {
    let totalPnl = 0, totalInvested = 0, totalCharges = 0, wins = 0, losses = 0;
    for (const t of filteredTrades) {
      totalPnl += Number(t.pnl) || 0;
      totalInvested += (Number(t.price) || 0) * (Number(t.quantity) || 0);
      totalCharges += Number(t.brokerage) || 0;
      if ((Number(t.pnl) || 0) > 0) wins++;
      else if ((Number(t.pnl) || 0) < 0) losses++;
    }
    return { totalPnl, totalInvested, totalCharges, wins, losses, winRate: filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0 };
  }, [filteredTrades]);

  /* Group trades by date */
  const groupedTrades = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    filteredTrades.forEach(t => {
      const dateKey = t.createdAt ? formatDate(t.createdAt) : 'Unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTrades]);

  return (
    <div className="space-y-3 pb-4 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tint-blue">
            <History className="h-4.5 w-4.5 text-brand-primary" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-text-primary">Trade History</h1>
            <p className="text-[11px] text-text-secondary">{isLoading ? '…' : `${filteredTrades.length} trades`}</p>
          </div>
        </div>
        <a href="/trade" className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors active:scale-[0.97]">
          <Zap className="h-3 w-3" />
          Trade
        </a>
      </div>

      {/* ── Skeleton while loading ── */}
      {isLoading ? (
        <div className="space-y-3">
          {/* Summary skeleton */}
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-bg-surface p-3 animate-pulse space-y-2">
                <div className="h-3 w-16 rounded bg-bg-surface-alt" />
                <div className="h-5 w-24 rounded bg-bg-surface-alt" />
              </div>
            ))}
          </div>
          {/* Tabs skeleton */}
          <div className="flex gap-1 rounded-lg bg-bg-surface p-1 border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 h-7 rounded-md bg-bg-surface-alt animate-pulse" />
            ))}
          </div>
          {/* Search skeleton */}
          <div className="h-9 rounded-lg bg-bg-surface-alt animate-pulse" />
          {/* Trade card skeletons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-3 w-16 rounded bg-bg-surface-alt animate-pulse" />
              <div className="flex-1 h-px bg-border/50" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-bg-surface p-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-bg-surface-alt" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-bg-surface-alt" />
                    <div className="h-2.5 w-36 rounded bg-bg-surface-alt" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <div className="h-4 w-16 rounded bg-bg-surface-alt ml-auto" />
                    <div className="h-2.5 w-10 rounded bg-bg-surface-alt ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          {filteredTrades.length > 0 && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl border border-border bg-bg-surface p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className={cn('h-3 w-3', stats.totalPnl >= 0 ? 'text-profit-green' : 'text-loss-red')} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Total P&L</span>
                </div>
                <p className={cn('font-mono text-base font-bold tabular-nums tracking-tight', getPnlColor(stats.totalPnl))}>
                  {stats.totalPnl >= 0 ? '+' : ''}{formatINR(stats.totalPnl)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-bg-surface p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Percent className="h-3 w-3 text-info-purple" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Win Rate</span>
                </div>
                <p className="font-mono text-base font-bold tabular-nums tracking-tight text-text-primary">
                  {stats.winRate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-text-tertiary mt-0.5">{stats.wins}W / {stats.losses}L</p>
              </div>
              <div className="rounded-xl border border-border bg-bg-surface p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="h-3 w-3 text-brand-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Volume</span>
                </div>
                <p className="font-mono text-base font-bold tabular-nums tracking-tight text-text-primary">
                  {formatINR(stats.totalInvested)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-bg-surface p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt className="h-3 w-3 text-accent-gold" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Charges</span>
                </div>
                <p className="font-mono text-base font-bold tabular-nums tracking-tight text-text-primary">
                  {formatINR(stats.totalCharges)}
                </p>
              </div>
            </div>
          )}

          {/* ── Tabs + Controls ── */}
          <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100">
            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-bg-surface p-1 border border-border">
              {(['all', 'stock', 'index'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200',
                    activeTab === tab
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-alt'
                  )}
                >
                  {tab === 'all' ? 'All' : tab === 'stock' ? 'Stock' : 'Index'}
                </button>
              ))}
            </div>

            {/* Search + Sort bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-surface pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-primary/30 focus:border-brand-primary/40 transition-all"
                />
              </div>
              <button
                onClick={() => {
                  const next = sortBy === 'date' ? 'pnl' : sortBy === 'pnl' ? 'value' : 'date';
                  setSortBy(next);
                }}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-2.5 py-2 text-[11px] font-medium text-text-secondary hover:bg-bg-surface-alt transition-colors"
              >
                <ArrowUpDown className="h-3 w-3" />
                {sortBy === 'date' ? 'Date' : sortBy === 'pnl' ? 'P&L' : 'Value'}
              </button>
            </div>
          </div>

          {/* ── Trade List ── */}
          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-surface-alt mb-3">
                <History className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="font-heading text-sm font-semibold text-text-primary">No trades yet</p>
              <p className="text-[11px] text-text-secondary mt-1 max-w-[240px]">
                Start trading to see your trade history here
              </p>
              <a href="/trade" className="mt-3 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors">
                Start Trading
              </a>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150">
              {Object.entries(groupedTrades).map(([dateLabel, dayTrades], groupIdx) => (
                <div key={dateLabel} style={{ animationDelay: `${groupIdx * 80}ms` }}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <CalendarDays className="h-3 w-3 text-text-tertiary" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{dateLabel}</span>
                    <span className="text-[10px] text-text-tertiary">· {dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''}</span>
                    <div className="flex-1 border-t border-border/50" />
                    {(() => {
                      const dayPnl = dayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
                      return (
                        <span className={cn('font-mono text-[11px] font-bold tabular-nums', getPnlColor(dayPnl))}>
                          {dayPnl >= 0 ? '+' : ''}{formatINR(dayPnl)}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Trade cards */}
                  <div className="space-y-1.5">
                    {dayTrades.map((trade, idx) => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        isExpanded={expandedId === trade.id}
                        onToggle={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                        delay={idx * 50}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * TradeCard — expandable card with staggered animation
 * ══════════════════════════════════════════════════════════════════ */
function TradeCard({ trade, isExpanded, onToggle, delay }: {
  trade: Trade;
  isExpanded: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const pnl = Number(trade.pnl) || 0;
  const price = Number(trade.price) || 0;
  const qty = Number(trade.quantity) || 0;
  const invested = price * qty;
  const profitPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isBuy = trade.side === 'BUY';
  const isOpen = trade.type === 'OPEN';

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-1',
        isExpanded
          ? 'border-brand-primary/30 bg-bg-surface shadow-sm'
          : 'border-border hover:border-border hover:bg-bg-surface/50'
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
      onClick={onToggle}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer">
        {/* Symbol + Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StockLogo symbol={trade.symbol} size="sm" rounded="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-[13px] font-bold text-text-primary tracking-tight">{trade.symbol}</span>
              {/* BUY / SELL badge */}
              <span className={cn(
                'rounded px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide leading-none',
                isBuy ? 'bg-profit-green/10 text-profit-green' : 'bg-loss-red/10 text-loss-red'
              )}>
                {trade.side}
              </span>
              {/* OPEN / CLOSE badge */}
              <span className={cn(
                'rounded px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wide leading-none',
                isOpen ? 'bg-brand-primary/10 text-brand-primary' : 'bg-tint-orange text-accent-gold'
              )}>
                {trade.type}
              </span>
              {/* Option type */}
              {trade.optionType && (
                <span className={cn(
                  'rounded px-1.5 py-[1px] text-[9px] font-bold leading-none',
                  trade.optionType === 'CE' ? 'bg-profit-green/10 text-profit-green' : 'bg-loss-red/10 text-loss-red'
                )}>
                  {trade.optionType}
                </span>
              )}
              {trade.strikePrice != null && trade.strikePrice > 0 && (
                <span className="font-mono text-[9px] text-text-tertiary">₹{formatNumber(Number(trade.strikePrice))}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-secondary">
                <span className="font-mono">{qty}</span> × <span className="font-mono">₹{formatNumber(price, 2)}</span>
              </span>
              <span className="text-[10px] text-text-tertiary">·</span>
              <span className="text-[10px] text-text-tertiary">{formatDateTime(trade.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* P&L + Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={cn(
              'font-mono text-[13px] font-bold tabular-nums tracking-tight leading-tight',
              getPnlColor(pnl)
            )}>
              {pnl >= 0 ? '+' : ''}{formatINR(pnl)}
            </p>
            <p className={cn(
              'font-mono text-[9px] tabular-nums leading-tight',
              getPnlColor(profitPct)
            )}>
              {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
            </p>
          </div>
          <div className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300',
            isExpanded ? 'bg-brand-primary/10 rotate-180' : 'bg-bg-surface-alt'
          )}>
            <ChevronDown className="h-2.5 w-2.5 text-text-tertiary" />
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      <div className={cn(
        'grid transition-all duration-300 ease-out overflow-hidden',
        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-border/40 mx-3" />
          <div className="px-3 py-3 space-y-3">
            {/* Summary boxes */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-bg-base p-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary mb-1">P&L</p>
                <p className={cn('font-mono text-xs font-bold tabular-nums tracking-tight', getPnlColor(pnl))}>
                  {pnl >= 0 ? '+' : ''}{formatINR(pnl)}
                </p>
              </div>
              <div className="rounded-lg bg-bg-base p-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Return</p>
                <p className={cn('font-mono text-xs font-bold tabular-nums tracking-tight', getPnlColor(profitPct))}>
                  {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg bg-bg-base p-2 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Charges</p>
                <p className="font-mono text-xs font-bold tabular-nums tracking-tight text-text-primary">
                  ₹{formatNumber(Number(trade.brokerage) || 0)}
                </p>
              </div>
            </div>
            {/* Detail rows */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <InfoRow icon={<Tag className="h-2.5 w-2.5" />} label="Segment" value={trade.segment} />
              <InfoRow icon={<BarChart3 className="h-2.5 w-2.5" />} label="Side" value={trade.side} />
              <InfoRow icon={<BarChart3 className="h-2.5 w-2.5" />} label="Type" value={trade.type} />
              <InfoRow icon={<Tag className="h-2.5 w-2.5" />} label="Quantity" value={String(qty)} />
              <InfoRow icon={<Percent className="h-2.5 w-2.5" />} label="Price" value={`₹${formatNumber(price, 2)}`} />
              <InfoRow icon={<Receipt className="h-2.5 w-2.5" />} label="Invested" value={formatINR(invested)} />
              {trade.strikePrice != null && trade.strikePrice > 0 && (
                <InfoRow icon={<Tag className="h-2.5 w-2.5" />} label="Strike" value={`₹${formatNumber(Number(trade.strikePrice))}`} />
              )}
              {trade.optionType && (
                <InfoRow icon={<Tag className="h-2.5 w-2.5" />} label="Option" value={trade.optionType} />
              )}
              {trade.expiry && (
                <InfoRow icon={<CalendarDays className="h-2.5 w-2.5" />} label="Expiry" value={formatDate(trade.expiry)} />
              )}
              <InfoRow icon={<Clock className="h-2.5 w-2.5" />} label="Time" value={formatDateTime(trade.createdAt)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Small info row with icon ── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-[10px] text-text-secondary">{label}</span>
      <span className="ml-auto font-mono text-[10px] font-semibold text-text-primary">{value}</span>
    </div>
  );
}
