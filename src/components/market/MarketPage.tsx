'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LiveDot, EmptyState } from '@/components/shared/common';
import { formatNumber } from '@/lib/utils';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import type { Stock, IndexData } from '@/types';

export function MarketPage() {
  const { token } = useAuthStore();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarket = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [sRes, iRes] = await Promise.all([
          fetch('/api/market/stocks', { headers }),
          fetch('/api/market/indices', { headers }),
        ]);
        const sData = await sRes.json();
        const iData = await iRes.json();
        if (sData.success) setStocks(sData.data);
        if (iData.success) setIndices(iData.data);
      } catch (err) {
        console.error('Market fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarket();
  }, [token]);

  const filtered = search
    ? stocks.filter((s) =>
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : stocks;

  return (
    <div className="space-y-6">
      {/* Indices strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {indices.map((idx) => (
          <div key={idx.id} className="flex shrink-0 items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-4 py-3">
            <LiveDot isLive={idx.change >= 0} />
            <div>
              <p className="font-heading text-sm font-semibold text-text-primary">{idx.symbol}</p>
              <p className="font-mono text-lg font-bold tabular-nums text-text-primary">
                {formatNumber(idx.lastPrice)}
              </p>
              <p className={`font-mono text-xs tabular-nums ${idx.change >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                {idx.change >= 0 ? '▲' : '▼'} {Math.abs(idx.change).toFixed(2)} ({idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%)
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          placeholder="Search by symbol or name..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stocks grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-bg-surface-alt" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No stocks found"
              description="Try searching with a different symbol or name"
            />
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((stock) => (
                <a
                  key={stock.id}
                  href={`/stock/${stock.symbol}`}
                  className="rounded-lg border border-border-default bg-bg-base p-4 transition-colors hover:bg-bg-surface-alt"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-sm font-semibold text-text-primary">{stock.symbol}</p>
                      <p className="text-xs text-text-secondary truncate max-w-[160px]">{stock.name}</p>
                    </div>
                    {stock.changePct !== undefined && stock.changePct !== 0 && (
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${stock.changePct >= 0 ? 'bg-profit-green/10' : 'bg-loss-red/10'}`}>
                        {stock.changePct >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-profit-green" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-loss-red" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="font-mono text-lg font-bold tabular-nums text-text-primary">
                      {formatNumber(stock.ltp ?? 0)}
                    </p>
                    <p className={`font-mono text-xs tabular-nums ${stock.changePct !== undefined && stock.changePct >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                      {stock.changePct !== undefined && (stock.changePct >= 0 ? '+' : '')}{stock.changePct?.toFixed(2)}%
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
