'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatINR, formatNumber, cn, getInitials, formatOrderStatus } from '@/lib/utils';
import { getVirtualCapitalForTier } from '@/lib/tier';
import {
  Wallet, TrendingUp, TrendingDown, Activity, Trophy,
  BarChart3, ArrowRight, Plus, Briefcase, Receipt, Zap, Flame, History,
} from 'lucide-react';
import type { Portfolio, Position, IndexData, Order } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';
import { Sparkline } from '@/components/shared/Sparkline';
import { FreeTrialWidget } from '@/components/shared/FreeTrialWidget';

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

export function DashboardPage() {
  const { user, token } = useAuthStore();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Tier-based fallback capital — used only when portfolio fetch hasn't returned yet
  const tierFallback = user?.tier === 'PREMIUM' ? 100000 : 10000;

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

  const totalPnl = portfolio?.totalPnl ?? 0;
  const totalPnlPositive = totalPnl >= 0;
  const winRate = portfolio?.winRate ?? 0;
  const wins = portfolio?.winningTrades ?? 0;
  const totalTrades = portfolio?.totalTrades ?? 0;
  const losses = Math.max(0, totalTrades - wins);
  const invested = portfolio?.investedAmount ?? 0;
  const totalPnlPct = invested > 0 ? (totalPnl / invested) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* ============== FREE TRIAL WIDGET ============== */}
      <FreeTrialWidget variant="card" />

      {/* ============== HERO CARD ============== */}
      <div className="card-soft hero-gradient p-5 relative overflow-hidden">
        {/* Decorative chart graphic (top-right) */}
        <svg
          className="absolute -right-2 -top-2 opacity-60 pointer-events-none"
          width="120"
          height="80"
          viewBox="0 0 120 80"
          fill="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M5 60 L20 50 L35 55 L50 35 L65 40 L80 20 L95 25 L110 10 L110 75 L5 75 Z"
            fill="url(#heroChartGrad)"
          />
          <path
            d="M5 60 L20 50 L35 55 L50 35 L65 40 L80 20 L95 25 L110 10"
            stroke="#2563EB"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bars */}
          <rect x="15" y="60" width="6" height="14" rx="1" fill="#2563EB" opacity="0.4" />
          <rect x="45" y="50" width="6" height="24" rx="1" fill="#2563EB" opacity="0.4" />
          <rect x="75" y="35" width="6" height="39" rx="1" fill="#2563EB" opacity="0.4" />
        </svg>

        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary">
              {user?.tier === 'PREMIUM' ? 'PREMIUM Plan' : 'FREE Plan'}
            </span>
            <span className="text-text-tertiary">·</span>
            <div className="flex items-center gap-1.5">
              <span className="live-dot-green" />
              <span className="text-xs font-medium text-text-secondary">Market Live</span>
            </div>
          </div>
          <h2 className="font-heading text-2xl font-bold text-text-primary mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'Trader'}
          </h2>
          <div className="mt-2 flex items-center gap-1.5">
            <a
              href="/subscription"
              className="text-sm font-semibold text-brand-primary hover:underline inline-flex items-center gap-1"
            >
              Upgrade <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ============== METRICS GRID 2x2 ============== */}
      <div className="grid gap-3 grid-cols-2">
        {/* Total Balance */}
        <MetricCard
          icon={Wallet}
          iconBg="bg-tint-blue"
          iconColor="text-brand-primary"
          label="Total Balance"
          value={formatINR(portfolio?.totalBalance ?? tierFallback)}
          subtext="Virtual Capital"
        />
        {/* Total P&L */}
        <MetricCard
          icon={totalPnlPositive ? TrendingUp : TrendingDown}
          iconBg={totalPnlPositive ? 'bg-tint-green' : 'bg-tint-red'}
          iconColor={totalPnlPositive ? 'text-profit-green' : 'text-loss-red'}
          label="Total P&L"
          value={
            <span className={totalPnlPositive ? 'text-profit-green' : 'text-loss-red'}>
              {totalPnlPositive ? '+' : ''}{formatINR(totalPnl)}
            </span>
          }
          subtext={`${totalPnlPositive ? '+' : ''}${totalPnlPct.toFixed(2)}% · Realized ${formatINR(portfolio?.realizedPnl ?? 0)}`}
        />
        {/* Available Margin */}
        <MetricCard
          icon={Activity}
          iconBg="bg-tint-purple"
          iconColor="text-info-purple"
          label="Available Margin"
          value={formatINR(portfolio?.availableMargin ?? tierFallback)}
          subtext={`Invested: ${formatINR(portfolio?.investedAmount ?? 0)}`}
        />
        {/* Win Rate */}
        <MetricCard
          icon={Trophy}
          iconBg="bg-tint-yellow"
          iconColor="text-accent-gold"
          label="Win Rate"
          value={
            <span className="text-brand-primary">{winRate}%</span>
          }
          subtext={`${wins} Wins • ${losses} Losses`}
        />
      </div>

      {/* ============== MARKET INDICES ============== */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-heading text-base font-semibold text-text-primary">Market Indices</h3>
          <a href="/market" className="text-xs font-semibold text-brand-primary hover:underline">
            View All
          </a>
        </div>
        <div className="card-soft p-2">
          <div className="space-y-1">
            {indices.map((idx) => {
              const positive = idx.change >= 0;
              return (
                <a
                  key={idx.id}
                  href={`/stock/${idx.symbol}`}
                  className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-bg-surface-alt"
                >
                  <StockLogo symbol={idx.symbol} size="sm" isIndex rounded="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-semibold text-text-primary truncate">{idx.name}</p>
                    <p className="text-[11px] text-text-secondary">{idx.exchange}</p>
                  </div>
                  <Sparkline data={getMiniSeries(idx.symbol, positive)} positive={positive} />
                  <div className="text-right shrink-0 min-w-[78px]">
                    <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                      {formatNumber(idx.lastPrice, 2)}
                    </p>
                    <p
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        positive ? 'text-profit-green' : 'text-loss-red'
                      )}
                    >
                      {positive ? '+' : ''}{idx.changePct.toFixed(2)}%
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============== OPEN POSITIONS ============== */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-heading text-base font-semibold text-text-primary">Open Positions</h3>
          <a href="/positions" className="text-xs font-semibold text-brand-primary hover:underline">
            View All
          </a>
        </div>
        <div className="card-soft p-3">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-alt mb-2">
                <Briefcase className="h-6 w-6 text-text-secondary" />
              </div>
              <p className="text-sm font-medium text-text-primary">No open positions</p>
              <a href="/trade" className="mt-2 text-xs font-semibold text-brand-primary hover:underline">
                Start Trading
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {positions.slice(0, 3).map((pos) => {
                const positive = pos.pnl >= 0;
                return (
                  <a
                    key={pos.id}
                    href={`/stock/${pos.symbol}`}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-bg-surface-alt"
                  >
                    <StockLogo symbol={pos.symbol} size="md" rounded="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-text-primary">{pos.symbol}</p>
                        <span className="pill bg-tint-green text-profit-green">BUY</span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        NSE · {pos.quantity} Shares · ₹{formatNumber(pos.currentPrice ?? pos.avgPrice, 2)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-bold tabular-nums text-text-primary">
                        ₹{formatNumber(pos.currentPrice * pos.quantity, 2)}
                      </p>
                      <p className={cn('font-mono text-[11px] tabular-nums', positive ? 'text-profit-green' : 'text-loss-red')}>
                        {positive ? '+' : ''}₹{formatNumber(pos.pnl, 2)} ({positive ? '+' : ''}{pos.pnlPct?.toFixed(2) ?? '0.00'}%)
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============== TOP MOVERS BANNER ============== */}
      <a
        href="/movers"
        className="block rounded-2xl border border-border bg-gradient-to-br from-tint-green/40 via-bg-surface to-tint-red/40 p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface-alt shrink-0">
              <Flame className="h-6 w-6 text-accent-gold" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-sm font-bold text-text-primary">
                Top Gainers &amp; Losers
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                Today's top 20 gainers and 20 losers across 430+ stocks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="pill bg-tint-green text-profit-green">+Gainers</span>
            <span className="pill bg-tint-red text-loss-red">-Losers</span>
            <ArrowRight className="h-4 w-4 text-text-secondary" />
          </div>
        </div>
      </a>

      {/* ============== QUICK ACTIONS ============== */}
      <div>
        <h3 className="font-heading text-base font-semibold text-text-primary px-1 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={Plus} label="Place Order" href="/trade" tint="bg-tint-blue" color="text-brand-primary" />
          <QuickAction icon={Briefcase} label="Positions" href="/positions" tint="bg-tint-green" color="text-profit-green" />
          <QuickAction icon={History} label="Wallet History" href="/history" tint="bg-tint-purple" color="text-info-purple" />
          <QuickAction icon={Wallet} label="Funds" href="/portfolio" tint="bg-tint-yellow" color="text-accent-gold" />
        </div>
      </div>

      {/* ============== RECENT ORDERS ============== */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="font-heading text-base font-semibold text-text-primary">Recent Orders</h3>
            <a href="/trade" className="text-xs font-semibold text-brand-primary hover:underline">
              View All
            </a>
          </div>
          <div className="card-soft p-3">
            <div className="space-y-2">
              {recentOrders.map((ord) => (
                <a
                  key={ord.id}
                  href={`/stock/${ord.symbol}`}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-bg-surface-alt transition-colors"
                >
                  <StockLogo symbol={ord.symbol} size="sm" rounded="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-text-primary">{ord.symbol}</p>
                      <span
                        className={cn(
                          'pill',
                          ord.side === 'BUY' ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red'
                        )}
                      >
                        {ord.side}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {ord.orderType} · {ord.quantity} qty
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                      ₹{formatNumber(ord.filledPrice ?? ord.price ?? 0, 2)}
                    </p>
                    {(() => {
                      const si = formatOrderStatus(ord.status);
                      return (
                        <p className={cn('text-[11px] font-medium', si.color)}>
                          {si.label}
                        </p>
                      );
                    })()}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

function QuickAction({
  icon: Icon,
  label,
  href,
  tint,
  color,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  tint: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className="card-soft p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
    >
      <div className={cn('icon-tile', tint)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <span className="text-[11px] font-medium text-text-primary text-center leading-tight">{label}</span>
    </a>
  );
}
