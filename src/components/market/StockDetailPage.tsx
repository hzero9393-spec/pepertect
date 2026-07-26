'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LiveDot } from '@/components/shared/common';
import { formatNumber, getPnlColor } from '@/lib/utils';
import { ArrowUp, ArrowDown, BarChart3, Eye, Plus } from 'lucide-react';
import type { Stock } from '@/types';

export function StockDetailPage() {
  const { token } = useAuthStore();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const symbol = path.split('/stock/')[1];
    if (!symbol || !token) return;

    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/market/stock/${symbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStock(data.data);
      } catch (err) {
        console.error('Stock fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [token]);

  if (loading) {
    return <div className="space-y-4"><div className="h-48 animate-pulse rounded-lg bg-bg-surface" /><div className="h-64 animate-pulse rounded-lg bg-bg-surface" /></div>;
  }

  if (!stock) {
    return <div className="flex items-center justify-center py-20"><p className="text-text-secondary">Stock not found</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stock header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
            <BarChart3 className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-text-primary">{stock.symbol}</h2>
            <p className="text-sm text-text-secondary">{stock.name} · {stock.exchange} · {stock.sector}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/trade?symbol=${stock.symbol}`}>
            <Button className="bg-profit-green hover:bg-profit-green/90 text-white font-semibold">BUY</Button>
          </a>
          <a href={`/trade?symbol=${stock.symbol}&side=SELL`}>
            <Button className="bg-loss-red hover:bg-loss-red/90 text-white font-semibold">SELL</Button>
          </a>
          <Button variant="outline" size="sm">
            <Eye className="mr-1 h-4 w-4" /> Watch
          </Button>
        </div>
      </div>

      {/* Price card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <p className="font-mono text-4xl font-bold tabular-nums text-text-primary">
              {formatNumber(stock.ltp ?? 0)}
            </p>
            <div className="flex items-center gap-1">
              <LiveDot isLive={(stock.changePct ?? 0) >= 0} />
              <span className={`font-mono text-lg font-semibold tabular-nums ${getPnlColor(stock.changePct ?? 0)}`}>
                {(stock.change ?? 0) >= 0 ? '+' : ''}{formatNumber(stock.change ?? 0)} ({(stock.changePct ?? 0) >= 0 ? '+' : ''}{(stock.changePct ?? 0).toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-secondary">Open</p>
              <p className="font-mono text-sm font-medium tabular-nums text-text-primary">{formatNumber(stock.open ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">High</p>
              <p className="font-mono text-sm font-medium tabular-nums text-text-primary">{formatNumber(stock.high ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Low</p>
              <p className="font-mono text-sm font-medium tabular-nums text-text-primary">{formatNumber(stock.low ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Close</p>
              <p className="font-mono text-sm font-medium tabular-nums text-text-primary">{formatNumber(stock.close ?? 0)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-secondary">Volume</p>
              <p className="font-mono text-sm tabular-nums text-text-primary">{formatNumber(stock.volume ?? 0, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Lot Size</p>
              <p className="font-mono text-sm tabular-nums text-text-primary">{stock.lotSize}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder chart area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-base">
            <p className="text-sm text-text-secondary">Chart visualization (historical data)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
