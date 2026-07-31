'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/common';
import { formatNumber, cn } from '@/lib/utils';
import { Search, TrendingUp, TrendingDown, ChevronDown, Loader2 } from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
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

export function MarketPage() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  // ─── React Query hooks (cached, deduplicated) ───
  const { data: stocks = [], isLoading: loading } = useStocks();
  const { data: indices = [] } = useIndices();

  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  // ─── Data fetched via React Query hooks above ───

  /* Filter by search — when searching, ignore pagination and show all matches */
  const filtered = useMemo(() => {
    if (!search) return stocks;
    const q = search.toLowerCase();
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [stocks, search]);

  /* Visible slice — only paginated when not searching */
  const visibleStocks = search ? filtered : filtered.slice(0, visibleCount);
  const hasMore = !search && filtered.length > visibleCount;

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
          return (
            <a
              key={idx.id}
              href={`/stock/${idx.symbol}`}
              className="flex shrink-0 items-center gap-2 sm:gap-3 rounded-lg border border-border-default bg-bg-surface px-3 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-bg-surface-alt hover:border-brand-primary/30"
            >
              <StockLogo symbol={idx.symbol} size="sm" isIndex rounded="md" />
              <div>
                <p className="font-heading text-xs sm:text-sm font-semibold text-text-primary">{idx.symbol}</p>
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
                      className="rounded-lg border border-border-default bg-bg-base p-3 sm:p-4 transition-colors hover:bg-bg-surface-alt hover:border-brand-primary/30"
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
                        <p className={cn(
                          'font-mono text-base sm:text-lg font-bold tabular-nums',
                          tick ? 'text-text-primary' : 'text-text-secondary'
                        )}>
                          ₹{formatNumber(ltp ?? 0)}
                          {tick && (
                            <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse align-middle" />
                          )}
                        </p>
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
