'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Flame, Loader2, ArrowUp, ArrowDown, RefreshCw,
} from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';

interface Mover {
  symbol: string;
  name: string;
  sector: string;
  ltp: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MoversResponse {
  gainers: Mover[];
  losers: Mover[];
  asOf: string;
  totalScanned: number;
}

export function MoversPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<MoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');

  const fetchMovers = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/market/movers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Movers fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovers();
    // Auto-refresh every 30s so the page feels live
    const id = setInterval(() => fetchMovers(true), 30000);
    return () => clearInterval(id);
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-bg-surface" />
        <div className="grid gap-3 grid-cols-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];
  const list = activeTab === 'gainers' ? gainers : losers;
  const asOf = data?.asOf ? new Date(data.asOf) : null;

  return (
    <div className="space-y-5">
      {/* ============== HEADER ============== */}
      <div className="card-soft p-4 relative overflow-hidden">
        <div className="absolute -right-3 -top-3 opacity-30 pointer-events-none">
          <Flame className="h-20 w-20 text-accent-gold" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent-gold" />
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Top Gainers &amp; Losers
            </h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Today's top 20 gainers and 20 losers scanned across {data?.totalScanned ?? 430}+ stocks.
            {asOf && (
              <span className="ml-1 text-text-tertiary">
                · Updated {asOf.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ============== TAB SWITCH ============== */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab('gainers')}
          className="seg-tab"
          data-active={activeTab === 'gainers'}
        >
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Top Gainers
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-tint-green px-1 text-[10px] font-bold text-profit-green">
              {gainers.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('losers')}
          className="seg-tab"
          data-active={activeTab === 'losers'}
        >
          <span className="inline-flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            Top Losers
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-tint-red px-1 text-[10px] font-bold text-loss-red">
              {losers.length}
            </span>
          </span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => fetchMovers(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* ============== STATS BANNER ============== */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-soft p-3 border-l-4 border-l-profit-green">
          <p className="text-[11px] text-text-secondary">Top Gainer</p>
          {gainers[0] ? (
            <>
              <p className="font-mono text-sm font-bold text-text-primary mt-0.5">{gainers[0].symbol}</p>
              <p className="text-[11px] text-profit-green font-medium">
                +{gainers[0].changePct.toFixed(2)}% · ₹{formatNumber(gainers[0].ltp, 2)}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-text-tertiary mt-0.5">No data</p>
          )}
        </div>
        <div className="card-soft p-3 border-l-4 border-l-loss-red">
          <p className="text-[11px] text-text-secondary">Top Loser</p>
          {losers[0] ? (
            <>
              <p className="font-mono text-sm font-bold text-text-primary mt-0.5">{losers[0].symbol}</p>
              <p className="text-[11px] text-loss-red font-medium">
                {losers[0].changePct.toFixed(2)}% · ₹{formatNumber(losers[0].ltp, 2)}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-text-tertiary mt-0.5">No data</p>
          )}
        </div>
      </div>

      {/* ============== LIST ============== */}
      <div>
        <h3 className="font-heading text-base font-semibold text-text-primary px-1 mb-2">
          {activeTab === 'gainers' ? 'Top 20 Gainers' : 'Top 20 Losers'}
        </h3>
        <div className="card-soft p-2">
          {list.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-surface-alt mb-3">
                {activeTab === 'gainers' ? (
                  <TrendingUp className="h-7 w-7 text-text-secondary" />
                ) : (
                  <TrendingDown className="h-7 w-7 text-text-secondary" />
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">No {activeTab} found</p>
              <p className="text-xs text-text-secondary mt-0.5">Try refreshing</p>
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((m, idx) => {
                const positive = m.changePct >= 0;
                return (
                  <a
                    key={m.symbol}
                    href={`/stock/${m.symbol}`}
                    className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-bg-surface-alt"
                  >
                    {/* Rank badge */}
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        activeTab === 'gainers'
                          ? 'bg-tint-green text-profit-green'
                          : 'bg-tint-red text-loss-red'
                      )}
                    >
                      {idx + 1}
                    </div>

                    <StockLogo symbol={m.symbol} size="sm" rounded="md" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-text-primary truncate">{m.symbol}</p>
                        <span className="pill bg-bg-surface-alt text-text-secondary text-[10px]">{m.sector}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate">{m.name}</p>
                    </div>

                    <div className="text-right shrink-0 min-w-[90px]">
                      <p className="font-mono text-sm font-bold tabular-nums text-text-primary">
                        ₹{formatNumber(m.ltp, 2)}
                      </p>
                      <p
                        className={cn(
                          'font-mono text-[11px] tabular-nums inline-flex items-center gap-0.5',
                          positive ? 'text-profit-green' : 'text-loss-red'
                        )}
                      >
                        {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {positive ? '+' : ''}{m.changePct.toFixed(2)}%
                      </p>
                    </div>

                    {/* Trade button */}
                    <a
                      href={`/trade?symbol=${m.symbol}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 hidden sm:inline-flex items-center rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-text-primary hover:bg-bg-surface-alt"
                    >
                      Trade
                    </a>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============== DISCLAIMER ============== */}
      <div className="rounded-xl bg-bg-surface border border-border p-3">
        <p className="text-[11px] text-text-tertiary leading-relaxed">
          <strong className="text-text-secondary">Note:</strong> Prices and changes are simulated for paper trading.
          The list refreshes every 30 seconds and is stable for the current trading day.
          Tap any stock to view its detailed chart, or use the Trade button to place an order.
        </p>
      </div>
    </div>
  );
}
