'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, cn } from '@/lib/utils';
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Gauge,
  BarChart3,
  Target,
  Sparkles,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
import { findExpiry, type ExpiryIndex } from '@/lib/expiry-calendar';

// ---- Types (mirror OptionChainPage) ----------------------------------------

interface OptionLeg {
  lastPrice: number;
  oi: number;
  volume: number;
  iv: number;
  change: number;
  changePct: number;
  intrinsic: number;
}

interface StrikeRow {
  strikePrice: number;
  itm: 'CE' | 'PE' | null;
  ce: OptionLeg;
  pe: OptionLeg;
}

interface ChainResponse {
  symbol: string;
  display: string;
  exchange: string;
  spot: number;
  atm: number;
  step: number;
  lotSize: number;
  expiry: string;
  expiryLabel?: string | null;
  expiryType?: 'WEEKLY' | 'MONTHLY' | null;
  expiries: string[];
  dte: number;
  strikes: StrikeRow[];
}

const INDICES = [
  { symbol: 'NIFTY',     display: 'NIFTY 50'    },
  { symbol: 'SENSEX',    display: 'SENSEX'      },
  { symbol: 'BANKNIFTY', display: 'BANK NIFTY'  },
  { symbol: 'FINNIFTY',  display: 'FIN NIFTY'   },
] as const;

function normalizeSymbol(s: string | null): string {
  if (!s) return 'NIFTY';
  const up = s.toUpperCase();
  if (up === 'NIFTYFS' || up === 'FINNIFTY') return 'FINNIFTY';
  if (INDICES.some((i) => i.symbol === up)) return up;
  return 'NIFTY';
}

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatOi(oi: number): string {
  if (oi >= 1e7) return (oi / 1e7).toFixed(2) + 'Cr';
  if (oi >= 1e5) return (oi / 1e5).toFixed(2) + 'L';
  if (oi >= 1e3) return (oi / 1e3).toFixed(1) + 'K';
  return String(oi);
}

function getExpiryLabel(date: string): string | null {
  const indices: ExpiryIndex[] = ['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'];
  for (const idx of indices) {
    const entry = findExpiry(idx, date);
    if (entry) return entry.label ?? null;
  }
  return null;
}

type Side = 'CE' | 'PE';

// ---- Component -------------------------------------------------------------

export function OptionStrikeOverviewPage() {
  const { token } = useAuthStore();

  // Read ?symbol=, ?expiry=, ?strike= from URL once on mount
  const [initialParams] = useState(() => {
    if (typeof window === 'undefined') return { symbol: 'NIFTY', expiry: '', strike: 0 };
    const url = new URL(window.location.href);
    return {
      symbol: normalizeSymbol(url.searchParams.get('symbol')),
      expiry: url.searchParams.get('expiry') || '',
      strike: parseFloat(url.searchParams.get('strike') || '0'),
    };
  });

  const [data, setData] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('CE');

  const { symbol, expiry: initialExpiry, strike: targetStrike } = initialParams;
  const [expiry, setExpiry] = useState<string | null>(initialExpiry || null);

  const fetchChain = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ symbol });
      if (expiry) params.set('expiry', expiry);
      const res = await fetch(`/api/market/option-chain?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (!expiry && json.data.expiries?.length) {
          setExpiry(json.data.expiries[0]);
        }
      } else {
        setError(json.error || 'Failed to load option chain');
      }
    } catch (err) {
      console.error('Strike overview fetch error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, symbol, expiry]);

  useEffect(() => {
    fetchChain();
  }, [fetchChain]);

  // Find the strike row that matches the requested strike
  const strikeRow = useMemo(() => {
    if (!data || !targetStrike) return null;
    return (
      data.strikes.find((r) => r.strikePrice === targetStrike) ||
      // fall back to nearest strike if exact match missing
      data.strikes.reduce<StrikeRow | null>((best, r) => {
        if (!best) return r;
        return Math.abs(r.strikePrice - targetStrike) < Math.abs(best.strikePrice - targetStrike)
          ? r
          : best;
      }, null)
    );
  }, [data, targetStrike]);

  const idxInfo = INDICES.find((i) => i.symbol === symbol) ?? INDICES[0];

  // Moneyness calculations
  const spot = data?.spot ?? 0;
  const moneyness = useMemo(() => {
    if (!strikeRow) return null;
    const k = strikeRow.strikePrice;
    return {
      callItm: spot >= k,
      putItm: spot <= k,
      callDistance: spot - k,
      putDistance: k - spot,
    };
  }, [strikeRow, spot]);

  // Active leg
  const activeLeg: OptionLeg | null = strikeRow ? (side === 'CE' ? strikeRow.ce : strikeRow.pe) : null;
  const activeItm = strikeRow ? (side === 'CE' ? strikeRow.itm === 'CE' : strikeRow.itm === 'PE') : false;
  const legUp = (activeLeg?.change ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* ============== BACK + BREADCRUMB ============== */}
      <a
        href={`/optionchain?symbol=${encodeURIComponent(symbol)}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {idxInfo.display} Option Chain
      </a>

      {/* ============== HEADER ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start gap-3">
          <StockLogo symbol={symbol} size="xl" isIndex rounded="lg" className="ring-1 ring-border shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {idxInfo.display}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary truncate mt-0.5">
              Strike Overview · {data?.exchange ?? 'NSE'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="pill bg-tint-blue text-brand-primary inline-flex items-center gap-1">
                <Target className="h-3 w-3" />
                Strike {targetStrike || '—'}
              </span>
              {data?.expiryType && (
                <span
                  className={cn(
                    'pill text-[10px] font-bold',
                    data.expiryType === 'MONTHLY'
                      ? 'bg-tint-purple text-info-purple'
                      : 'bg-tint-blue text-brand-primary'
                  )}
                >
                  {data.expiryType === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY'}
                </span>
              )}
              {data?.expiry && (
                <span className="pill bg-bg-surface-alt text-text-secondary">
                  <Clock className="h-3 w-3 mr-0.5" />
                  {formatExpiry(data.expiry)}
                  {data.expiryLabel ? ` · ${data.expiryLabel}` : ''}
                </span>
              )}
              {data && (
                <span className="pill bg-bg-surface-alt text-text-secondary">
                  <Layers className="h-3 w-3 mr-0.5" />
                  Lot {data.lotSize}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-text-tertiary">Spot</p>
            <p className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-text-primary">
              {formatNumber(spot, 2)}
            </p>
            {data && (
              <p className="text-[11px] text-text-tertiary mt-0.5">
                {data.dte}d to expiry
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ============== LOADING / ERROR ============== */}
      {loading ? (
        <div className="card-soft p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading strike data…</span>
        </div>
      ) : error ? (
        <div className="card-soft p-6 flex flex-col items-center text-center">
          <p className="text-sm font-medium text-loss-red mb-1">{error}</p>
          <button
            onClick={fetchChain}
            className="mt-3 text-xs font-semibold text-brand-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : !strikeRow ? (
        <div className="card-soft p-6 flex flex-col items-center text-center">
          <Target className="h-10 w-10 text-text-secondary mb-2" />
          <p className="text-sm text-text-secondary">Strike {targetStrike} not found in this expiry</p>
        </div>
      ) : (
        <>
          {/* ============== SIDE SWITCHER (CE / PE) ============== */}
          <div className="card-soft p-2">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setSide('CE')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors',
                  side === 'CE'
                    ? 'bg-profit-green/15 text-profit-green ring-1 ring-profit-green/30'
                    : 'text-text-secondary hover:bg-bg-surface-alt'
                )}
              >
                <TrendingUp className="h-4 w-4" />
                CALL {strikeRow.strikePrice}
                {strikeRow.itm === 'CE' && (
                  <span className="pill bg-profit-green/20 text-profit-green text-[9px]">ITM</span>
                )}
              </button>
              <button
                onClick={() => setSide('PE')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors',
                  side === 'PE'
                    ? 'bg-loss-red/15 text-loss-red ring-1 ring-loss-red/30'
                    : 'text-text-secondary hover:bg-bg-surface-alt'
                )}
              >
                <TrendingDown className="h-4 w-4" />
                PUT {strikeRow.strikePrice}
                {strikeRow.itm === 'PE' && (
                  <span className="pill bg-loss-red/20 text-loss-red text-[9px]">ITM</span>
                )}
              </button>
            </div>
          </div>

          {/* ============== ACTIVE LEG LTP + CHANGE ============== */}
          {activeLeg && (
            <div className="card-soft p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                    {side === 'CE' ? 'CALL' : 'PUT'} · LTP
                  </p>
                  <p className="mt-1 font-mono text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
                    ₹{formatNumber(activeLeg.lastPrice, 2)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold tabular-nums',
                        legUp ? 'text-profit-green' : 'text-loss-red'
                      )}
                    >
                      {legUp ? '+' : ''}{formatNumber(activeLeg.change, 2)} ({legUp ? '+' : ''}{activeLeg.changePct.toFixed(2)}%)
                    </span>
                    {legUp ? (
                      <TrendingUp className="h-3.5 w-3.5 text-profit-green" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-loss-red" />
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-xl px-3 py-2 text-center',
                    activeItm ? 'bg-tint-green text-profit-green' : 'bg-bg-surface-alt text-text-secondary'
                  )}
                >
                  <p className="text-[10px] uppercase font-semibold tracking-wide">{activeItm ? 'In The Money' : 'Out of Money'}</p>
                  <p className="font-mono text-sm font-bold mt-0.5">
                    {side === 'CE'
                      ? `${moneyness?.callDistance && moneyness.callDistance >= 0 ? '+' : ''}${formatNumber(moneyness?.callDistance ?? 0, 2)} pts`
                      : `${moneyness?.putDistance && moneyness.putDistance >= 0 ? '+' : ''}${formatNumber(moneyness?.putDistance ?? 0, 2)} pts`}
                  </p>
                </div>
              </div>

              {/* Stat grid */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-3">
                <StatCell label="Open Interest" value={formatOi(activeLeg.oi)} icon={Layers} tint="bg-tint-blue" color="text-brand-primary" />
                <StatCell label="Volume" value={formatOi(activeLeg.volume)} icon={BarChart3} tint="bg-tint-purple" color="text-info-purple" />
                <StatCell label="Implied Vol" value={activeLeg.iv.toFixed(1) + '%'} icon={Gauge} tint="bg-tint-yellow" color="text-accent-gold" />
                <StatCell label="Intrinsic" value={`₹${formatNumber(activeLeg.intrinsic, 2)}`} icon={Sparkles} tint="bg-tint-green" color="text-profit-green" />
              </div>
            </div>
          )}

          {/* ============== MONEYNESS VISUALIZATION ============== */}
          {moneyness && data && (
            <div className="card-soft p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm font-semibold text-text-primary">Moneyness vs Spot</h3>
                <span className="text-[11px] text-text-tertiary">Spot ₹{formatNumber(spot, 2)} · Strike {strikeRow.strikePrice}</span>
              </div>

              {/* Number line */}
              <div className="relative h-16 mt-2">
                {/* Track */}
                <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-loss-red/30 via-bg-surface-alt to-profit-green/30" />
                {/* Strike marker */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-brand-primary ring-4 ring-brand-primary/20" />
                  <p className="text-[10px] font-bold text-brand-primary mt-1 whitespace-nowrap">Strike {strikeRow.strikePrice}</p>
                </div>
                {/* Spot marker — positioned left or right of strike based on moneyness */}
                <div
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all',
                    spot >= strikeRow.strikePrice ? 'right-[15%]' : 'left-[15%]'
                  )}
                >
                  <p className="text-[10px] font-bold text-text-secondary mb-0.5 whitespace-nowrap">Spot ₹{formatNumber(spot, 2)}</p>
                  <div className="h-3 w-3 rounded-full bg-text-primary ring-2 ring-border" />
                </div>
              </div>

              {/* Explanation */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className={cn('rounded-lg p-2.5 border', strikeRow.itm === 'CE' ? 'border-profit-green/30 bg-profit-green/[0.06]' : 'border-border bg-bg-surface-alt')}>
                  <p className="text-[10px] uppercase font-semibold text-text-tertiary">CALL</p>
                  <p className={cn('font-mono text-sm font-bold mt-0.5', strikeRow.itm === 'CE' ? 'text-profit-green' : 'text-text-secondary')}>
                    {strikeRow.itm === 'CE' ? 'ITM' : 'OTM'}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {spot >= strikeRow.strikePrice ? 'Spot ≥ Strike' : 'Spot < Strike'}
                  </p>
                </div>
                <div className={cn('rounded-lg p-2.5 border', strikeRow.itm === 'PE' ? 'border-loss-red/30 bg-loss-red/[0.06]' : 'border-border bg-bg-surface-alt')}>
                  <p className="text-[10px] uppercase font-semibold text-text-tertiary">PUT</p>
                  <p className={cn('font-mono text-sm font-bold mt-0.5', strikeRow.itm === 'PE' ? 'text-loss-red' : 'text-text-secondary')}>
                    {strikeRow.itm === 'PE' ? 'ITM' : 'OTM'}
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">
                    {spot <= strikeRow.strikePrice ? 'Spot ≤ Strike' : 'Spot > Strike'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============== SIDE-BY-SIDE CE vs PE ============== */}
          {strikeRow && (
            <div className="card-soft p-4">
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">CE vs PE Comparison</h3>
              <div className="grid grid-cols-2 gap-3">
                <ComparisonColumn
                  title="CALL"
                  leg={strikeRow.ce}
                  isItm={strikeRow.itm === 'CE'}
                  accent="profit-green"
                />
                <ComparisonColumn
                  title="PUT"
                  leg={strikeRow.pe}
                  isItm={strikeRow.itm === 'PE'}
                  accent="loss-red"
                />
              </div>
            </div>
          )}

          {/* ============== TRADE CTA ============== */}
          {activeLeg && (
            <a
              href={`/trade?symbol=${encodeURIComponent(symbol)}&type=OPTION&side=${side}&strike=${strikeRow.strikePrice}&expiry=${encodeURIComponent(data?.expiry ?? '')}`}
              className="card-soft p-4 flex items-center justify-between hover:bg-bg-surface-alt transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="icon-tile bg-brand-primary/10">
                  <Activity className="h-5 w-5 text-brand-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-text-primary">Trade this {side === 'CE' ? 'Call' : 'Put'} Option</p>
                  <p className="text-[11px] text-text-secondary">Place a paper order at ₹{formatNumber(activeLeg.lastPrice, 2)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </a>
          )}
        </>
      )}
    </div>
  );
}

// ---- Sub-components --------------------------------------------------------

function StatCell({
  label,
  value,
  icon: Icon,
  tint,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tint: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">{label}</p>
        <div className={cn('icon-tile-sm', tint)}>
          <Icon className={cn('h-3 w-3', color)} />
        </div>
      </div>
      <p className="mt-1 font-mono text-sm sm:text-base font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

function ComparisonColumn({
  title,
  leg,
  isItm,
  accent,
}: {
  title: string;
  leg: OptionLeg;
  isItm: boolean;
  accent: 'profit-green' | 'loss-red';
}) {
  const up = leg.change >= 0;
  const accentText = accent === 'profit-green' ? 'text-profit-green' : 'text-loss-red';
  const accentBg = accent === 'profit-green' ? 'bg-profit-green/[0.06]' : 'bg-loss-red/[0.06]';
  return (
    <div className={cn('rounded-lg border p-3', isItm ? `border-${accent}/30 ${accentBg}` : 'border-border bg-bg-surface')}>
      <div className="flex items-center justify-between">
        <p className={cn('text-xs font-bold', accentText)}>{title}</p>
        {isItm && <span className={cn('pill text-[9px] font-bold', accent === 'profit-green' ? 'bg-profit-green/20 text-profit-green' : 'bg-loss-red/20 text-loss-red')}>ITM</span>}
      </div>
      <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-text-primary">₹{formatNumber(leg.lastPrice, 2)}</p>
      <p className={cn('text-[11px] font-semibold', up ? 'text-profit-green' : 'text-loss-red')}>
        {up ? '+' : ''}{leg.changePct.toFixed(2)}%
      </p>
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-text-tertiary">OI</span>
          <span className="font-mono text-text-secondary">{formatOi(leg.oi)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Vol</span>
          <span className="font-mono text-text-secondary">{formatOi(leg.volume)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">IV</span>
          <span className="font-mono text-text-secondary">{leg.iv.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
