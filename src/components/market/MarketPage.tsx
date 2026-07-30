'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/common';
import { formatNumber, cn } from '@/lib/utils';
import { Search, TrendingUp, TrendingDown, ChevronDown, Loader2, Activity } from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
import { Sparkline } from '@/components/shared/Sparkline';
import type { Stock, IndexData } from '@/types';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { useStocks, useIndices } from '@/hooks/useApi';
import { getUpstoxKey, INDEX_TO_UPSTOX_KEY } from '@/lib/upstox-instruments';

/* Pagination config:
   - Initial page size: 30 stocks
   - Each "View More" click: +20 stocks
   - When searching, show all matches (no pagination) */
const INITIAL_PAGE_SIZE = 30;
const PAGE_INCREMENT = 20;

type FilterType = 'all' | 'gainers' | 'losers' | 'active';
const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gainers', label: 'Gainers' },
  { key: 'losers', label: 'Losers' },
  { key: 'active', label: 'Most Active' },
];

/* Generate deterministic mini-series for an index sparkline */
function getMiniSeries(symbol: string, positive: boolean): number[] {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  const data: number[] = [];
  let v = 50;
  for (let i = 0; i < 12; i++) {
    const noise = (Math.abs(Math.sin(h + i)) * 12) - 6;
    const trend = positive ? 1.5 : -1.5;
    v = Math.max(5, Math.min(95, v + noise + trend));
    data.push(v);
  }
  return data;
}

export function MarketPage() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // ─── React Query hooks (cached, deduplicated) ───
  const { data: stocks = [], isLoading: loading } = useStocks();
  const { data: indices = [] } = useIndices();

  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  // ─── Data fetched via React Query hooks above ───

  /* Filter by search — when searching, ignore pagination and show all matches */
  const filtered = useMemo(() => {
    let result = stocks;
    if (search) {
      const q = search.toLowerCase();
      result = stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      );
    }
    // Apply tab filter
    if (filter === 'gainers') {
      result = result.filter((s) => (s.changePct ?? 0) > 0);
    } else if (filter === 'losers') {
      result = result.filter((s) => (s.changePct ?? 0) < 0);
    } else if (filter === 'active') {
      result = [...result].sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0)).slice(0, 20);
    }
    return result;
  }, [stocks, search, filter]);

  /* Visible slice — only paginated when not searching */
  const visibleStocks = search ? filtered : filtered.slice(0, visibleCount);
  const hasMore = !search && filtered.length > visibleCount;

  /* Market overview stats */
  const marketStats = useMemo(() => {
    const advances = stocks.filter((s) => (s.changePct ?? 0) > 0).length;
    const declines = stocks.filter((s) => (s.changePct ?? 0) < 0).length;
    const unchanged = stocks.length - advances - declines;
    return { advances, declines, unchanged };
  }, [stocks]);

  /* Subscribe to live ticks for visible stocks + all indices */
  useEffect(() => {
    const wanted = new Set<string>();
    // Always subscribe to indices
    for (const idx of indices) {
      const k = INDEX_TO_UPSTOX_KEY[idx.symbol] || getUpstoxKey(idx.symbol);
      if (k) wanted.add(k);
    }
    // Subscribe to visible stocks only (don't flood with 428 subscriptions)
    for (const s of visibleStocks) {
      const k = getUpstoxKey(s.symbol);
      if (k) wanted.add(k);
    }
    const newKeys = Array.from(wanted).filter((k) => !subscribedRef.current.has(k));
    const staleKeys = Array.from(subscribedRef.current).filter((k) => !wanted.has(k));
    if (newKeys.length > 0) {
      subscribe(newKeys);
      newKeys.forEach((k) => subscribedRef.current.add(k));
    }
    if (staleKeys.length > 0) {
      unsubscribe(staleKeys);
      staleKeys.forEach((k) => subscribedRef.current.delete(k));
    }
  }, [visibleStocks, indices, subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0) {
        unsubscribe(Array.from(subscribedRef.current));
        subscribedRef.current.clear();
      }
    };
  }, [unsubscribe]);

  const handleViewMore = () => {
    setLoadingMore(true);
    // Simulate small delay so user sees feedback (also lets the UI paint next batch)
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_INCREMENT);
      setLoadingMore(false);
    }, 200);
  };

  /* Reset pagination when search changes back to empty */
  useEffect(() => {
    if (search) setVisibleCount(INITIAL_PAGE_SIZE);
  }, [search]);

  const isLive = wsStatus === 'upstox_connected' || wsStatus === 'open' || wsStatus === 'polling';

  return (
    <div className="space-y-6">
      {/* Indices strip — horizontal scroll on mobile */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
        {indices.map((idx) => {
          const upstoxKey = INDEX_TO_UPSTOX_KEY[idx.symbol] || getUpstoxKey(idx.symbol);
          const tick = upstoxKey ? quotes[upstoxKey] : undefined;
          const price = tick?.ltp ?? idx.lastPrice ?? 0;
          const change = tick?.change ?? idx.change ?? 0;
          const changePct = tick?.changePct ?? idx.changePct ?? 0;
          const positive = change >= 0;
          const miniData = getMiniSeries(idx.symbol, positive);
          return (
            <a
              key={idx.id}
              href={`/stock/${idx.symbol}`}
              className="flex shrink-0 items-center gap-2 sm:gap-3 rounded-lg border border-border-default bg-bg-surface px-3 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-bg-surface-alt hover:border-brand-primary/30"
            >
              <StockLogo symbol={idx.symbol} size="sm" isIndex rounded="md" />
              <div>
                <p className="font-heading text-xs sm:text-sm font-semibold text-text-primary">
                  {idx.symbol} <span className="text-[9px] text-text-tertiary">NSE</span>
                </p>
                <p className={cn(
                  'font-mono text-base sm:text-lg font-bold tabular-nums',
                  tick ? 'text-text-primary' : 'text-text-secondary'
                )}>
                  {formatNumber(price)}
                  {tick && (
                    <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse align-middle" />
                  )}
                </p>
                <p className={`font-mono text-[10px] sm:text-xs tabular-nums ${positive ? 'text-profit-green' : 'text-loss-red'}`}>
                  {positive ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({positive ? '+' : ''}{changePct.toFixed(2)}%)
                </p>
                <Sparkline data={miniData} width={60} height={24} color={positive ? 'var(--profit-green)' : 'var(--loss-red)'} />
              </div>
            </a>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          placeholder="Search by symbol or name..."
          className="pl-9 h-11 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              filter === tab.key
                ? 'bg-brand-primary text-white'
                : 'bg-bg-surface-alt text-text-secondary hover:bg-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Market Overview — Advances / Declines / Unchanged */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-tint-green/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-profit-green" />
          </div>
          <p className="text-lg font-bold font-mono text-profit-green">{marketStats.advances}</p>
          <p className="text-[10px] text-text-secondary">Advances</p>
        </div>
        <div className="rounded-lg bg-tint-red/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-loss-red" />
          </div>
          <p className="text-lg font-bold font-mono text-loss-red">{marketStats.declines}</p>
          <p className="text-[10px] text-text-secondary">Declines</p>
        </div>
        <div className="rounded-lg bg-bg-surface-alt p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="h-3.5 w-3.5 text-text-tertiary" />
          </div>
          <p className="text-lg font-bold font-mono text-text-primary">{marketStats.unchanged}</p>
          <p className="text-[10px] text-text-secondary">Unchanged</p>
        </div>
      </div>

      {/* Stocks — 1 col mobile, 2 col tablet, 3 col desktop */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base font-semibold">
              Stocks
              {isLive && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-profit-green">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse" />
                  LIVE
                </span>
              )}
            </CardTitle>
            {!loading && (
              <span className="text-xs text-text-secondary">
                {search
                  ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
                  : `Showing ${visibleStocks.length} of ${stocks.length}`}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-20 sm:h-24 animate-pulse rounded-lg bg-bg-surface-alt" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No stocks found"
              description="Try searching with a different symbol or name"
            />
          ) : (
            <>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {visibleStocks.map((stock) => {
                  const upstoxKey = getUpstoxKey(stock.symbol);
                  const tick = upstoxKey ? quotes[upstoxKey] : undefined;
                  const ltp = tick?.ltp ?? stock.ltp ?? 0;
                  const changePct = tick?.changePct ?? stock.changePct ?? 0;
                  const positive = (tick?.change ?? stock.change ?? 0) >= 0;
                  return (
                    <a
                      key={stock.id}
                      href={`/stock/${stock.symbol}`}
                      className={cn(
                        'rounded-lg border border-border-default bg-bg-base p-3 sm:p-4 transition-all duration-200',
                        'hover:translate-y-[-2px] hover:shadow-md hover:shadow-brand-primary/5',
                        'hover:bg-bg-surface-alt hover:border-brand-primary/30',
                        'border-l-[3px]',
                        positive ? 'border-l-profit-green/50' : 'border-l-loss-red/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StockLogo symbol={stock.symbol} size="md" rounded="md" />
                          <div className="min-w-0">
                            <p className="font-heading text-sm font-semibold text-text-primary">{stock.symbol}</p>
                            <p className="text-xs text-text-secondary truncate clamp-1">{stock.name}</p>
                          </div>
                        </div>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${positive ? 'bg-profit-green/10' : 'bg-loss-red/10'}`}>
                          {positive ? (
                            <TrendingUp className="h-3.5 w-3.5 text-profit-green" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-loss-red" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-3 flex items-end justify-between">
                        <div>
                          <p className={cn(
                            'font-mono text-base sm:text-lg font-bold tabular-nums',
                            tick ? 'text-text-primary' : 'text-text-secondary'
                          )}>
                            ₹{formatNumber(ltp ?? 0)}
                            {tick && (
                              <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse align-middle" />
                            )}
                          </p>
                          <p className="text-[10px] text-text-tertiary font-mono">Vol: {formatNumber(stock.volume || 0)}</p>
                        </div>
                        <p className={`font-mono text-xs tabular-nums ${positive ? 'text-profit-green' : 'text-loss-red'}`}>
                          {positive ? '+' : ''}{changePct.toFixed(2)}%
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* View More button */}
              {hasMore && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <button
                    onClick={handleViewMore}
                    disabled={loadingMore}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-bg-surface-alt hover:border-brand-primary/30 transition-colors',
                      loadingMore && 'opacity-60 cursor-wait'
                    )}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        View More Stocks
                        <span className="ml-1 text-xs text-text-secondary">
                          (+{Math.min(PAGE_INCREMENT, stocks.length - visibleCount)} more)
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-text-tertiary">
                    {visibleStocks.length} of {stocks.length} stocks loaded
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
