'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { StatCard, LiveDot } from '@/components/shared/common';
import { formatINR, formatNumber } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wallet, TrendingUp, TrendingDown, Activity,
  BarChart3, Target, Trophy,
} from 'lucide-react';
import type { Portfolio, Position, IndexData, Order } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';

export function DashboardPage() {
  const { user, token } = useAuthStore();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (ordData.success) setRecentOrders(ordData.data.slice(0, 5));
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            Welcome back, {user?.name || 'Trader'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <LiveDot isLive={true} />
            <span className="text-sm text-text-secondary">Market Live</span>
            <span className="text-xs text-text-secondary">·</span>
            <span className="text-xs font-mono text-text-secondary">{user?.tier} Plan</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Total Balance"
          value={formatINR(portfolio?.totalBalance ?? 100000)}
          subtext="Virtual Capital"
          color="bg-brand-primary/10"
        />
        <StatCard
          icon={portfolio && portfolio.totalPnl >= 0 ? TrendingUp : TrendingDown}
          label="Total P&L"
          value={formatINR(portfolio?.totalPnl ?? 0)}
          subtext={`Realized: ${formatINR(portfolio?.realizedPnl ?? 0)}`}
          color={portfolio && portfolio.totalPnl >= 0 ? 'bg-profit-green/10' : 'bg-loss-red/10'}
        />
        <StatCard
          icon={Activity}
          label="Available Margin"
          value={formatINR(portfolio?.availableMargin ?? 100000)}
          subtext={`Invested: ${formatINR(portfolio?.investedAmount ?? 0)}`}
          color="bg-bg-surface-alt"
        />
        <StatCard
          icon={Trophy}
          label="Win Rate"
          value={`${portfolio?.winRate ?? 0}%`}
          subtext={`${portfolio?.totalTrades ?? 0} trades`}
          color="bg-accent-gold/10"
        />
      </div>

      {/* Indices & Positions */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Market Indices */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
              Market Indices
              <div className="live-dot-green" />
              <a href="/market" className="ml-auto text-xs text-brand-primary hover:underline">View All</a>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
              {indices.map((idx) => (
                <a
                  key={idx.id}
                  href={`/stock/${idx.symbol}`}
                  className="group flex items-center justify-between rounded-lg border border-border-default p-3 transition-colors hover:bg-bg-surface-alt hover:border-brand-primary/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StockLogo symbol={idx.symbol} size="sm" isIndex rounded="md" />
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-text-primary group-hover:text-brand-primary truncate">{idx.name}</p>
                      <p className="text-xs text-text-secondary">{idx.exchange}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-medium tabular-nums text-text-primary">
                      {formatNumber(idx.lastPrice)}
                    </p>
                    <p className={`font-mono text-xs tabular-nums ${idx.change >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                      {idx.change >= 0 ? '+' : ''}{formatNumber(idx.change)} ({idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%)
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Positions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base font-semibold">Open Positions</CardTitle>
              <a href="/positions" className="text-xs text-brand-primary hover:underline">View All</a>
            </div>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <BarChart3 className="h-8 w-8 text-text-secondary mb-2" />
                <p className="text-sm text-text-secondary">No open positions</p>
                <a href="/trade" className="mt-2 text-xs text-brand-primary hover:underline">Start Trading</a>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {positions.slice(0, 5).map((pos) => (
                  <a
                    key={pos.id}
                    href={`/stock/${pos.symbol}`}
                    className="flex items-center justify-between rounded-md border border-border-default p-2.5 transition-colors hover:bg-bg-surface-alt hover:border-brand-primary/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StockLogo symbol={pos.symbol} size="sm" rounded="md" />
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-text-primary">{pos.symbol}</p>
                        <p className="text-xs text-text-secondary">{pos.quantity} @ {formatNumber(pos.avgPrice)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono text-sm tabular-nums ${pos.pnl >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{formatNumber(pos.pnl)}
                      </p>
                      <p className={`text-xs tabular-nums ${pos.pnlPct >= 0 ? 'text-profit-green' : 'text-loss-red'}`}>
                        {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(1)}%
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base font-semibold">Recent Orders</CardTitle>
            <a href="/trade" className="text-xs text-brand-primary hover:underline">View All</a>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">No orders yet</p>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default text-xs text-text-secondary">
                      <th className="pb-2 text-left font-medium">Symbol</th>
                      <th className="pb-2 text-left font-medium">Side</th>
                      <th className="pb-2 text-left font-medium">Type</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Price</th>
                      <th className="pb-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((ord) => (
                      <tr key={ord.id} className="border-b border-border-default/50 hover:bg-bg-surface-alt/50">
                        <td className="py-2">
                          <a href={`/stock/${ord.symbol}`} className="flex items-center gap-2 font-mono font-medium text-text-primary hover:text-brand-primary">
                            <StockLogo symbol={ord.symbol} size="xs" rounded="sm" />
                            {ord.symbol}
                          </a>
                        </td>
                        <td className="py-2">
                          <span className={`font-medium ${ord.side === 'BUY' ? 'text-profit-green' : 'text-loss-red'}`}>
                            {ord.side}
                          </span>
                        </td>
                        <td className="py-2 text-text-secondary">{ord.orderType}</td>
                        <td className="py-2 text-right font-mono text-text-primary">{ord.quantity}</td>
                        <td className="py-2 text-right font-mono text-text-primary">{formatNumber(ord.filledPrice ?? ord.price ?? 0)}</td>
                        <td className="py-2 text-right">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            ord.status === 'FILLED' ? 'bg-profit-green/10 text-profit-green' :
                            ord.status === 'PENDING' ? 'bg-warning-amber/10 text-warning-amber' :
                            'bg-loss-red/10 text-loss-red'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="sm:hidden space-y-2">
                {recentOrders.map((ord) => (
                  <a
                    key={ord.id}
                    href={`/stock/${ord.symbol}`}
                    className="block rounded-lg border border-border-default p-3 transition-colors hover:bg-bg-surface-alt hover:border-brand-primary/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StockLogo symbol={ord.symbol} size="sm" rounded="sm" />
                        <span className="font-mono text-sm font-semibold text-text-primary">{ord.symbol}</span>
                        <span className={
                          ord.side === 'BUY'
                            ? 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-profit-green/10 text-profit-green'
                            : 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-loss-red/10 text-loss-red'
                        }>
                          {ord.side}
                        </span>
                      </div>
                      <span className={
                        ord.status === 'FILLED'
                          ? 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-profit-green/10 text-profit-green'
                          : ord.status === 'PENDING'
                          ? 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning-amber/10 text-warning-amber'
                          : 'rounded px-1.5 py-0.5 text-[10px] font-medium bg-loss-red/10 text-loss-red'
                      }>
                        {ord.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">{ord.orderType} · {ord.quantity} qty</span>
                      <span className="font-mono font-medium text-text-primary">
                        ₹{formatNumber(ord.filledPrice ?? ord.price ?? 0)}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
