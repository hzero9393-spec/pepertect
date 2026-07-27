'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, formatINR, cn } from '@/lib/utils';
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
  CheckCircle2,
  XCircle,
  Wallet,
  Sigma,
  Crosshair,
  DollarSign,
  Star,
} from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
import { findExpiry, type ExpiryIndex } from '@/lib/expiry-calendar';
import { addOptionStrikeToGroup } from '@/lib/multi-watchlist';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { INDEX_TO_UPSTOX_KEY } from '@/lib/upstox-instruments';

// ---- Types (mirror OptionChainPage) ----------------------------------------

interface OptionLeg {
  lastPrice: number;
  oi: number;
  volume: number;
  iv: number;
  change: number;
  changePct: number;
  intrinsic: number;
  instrumentKey?: string | null;
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
  realData?: boolean;
  upstoxKey?: string;
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

// ---- Greeks estimation (Black-Scholes approximation) ----------------------
// For paper trading — these are rough estimates for display, not execution.
function estimateGreeks(leg: OptionLeg, strike: number, spot: number, dte: number, side: Side) {
  const T = Math.max(dte / 365, 1 / 365); // years to expiry (min 1 day)
  const sigma = Math.max(leg.iv / 100, 0.05);
  const r = 0.06; // risk-free rate ~6%

  // Intrinsic
  const intrinsic = side === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  const timeValue = Math.max(0, leg.lastPrice - intrinsic);

  // Simple moneyness factor
  const moneyness = side === 'CE' ? spot / strike : strike / spot;
  const logM = Math.log(Math.max(moneyness, 0.01));

  // Approximate d1 (simplified)
  const d1 = (logM + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));

  // N(x) — standard normal CDF approximation
  const N = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
  function erf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }

  const pdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  let delta: number, gamma: number, theta: number, vega: number;
  if (side === 'CE') {
    delta = N(d1);
    gamma = pdf(d1) / (spot * sigma * Math.sqrt(T));
    theta = (-(spot * pdf(d1) * sigma) / (2 * Math.sqrt(T)) - r * strike * Math.exp(-r * T) * N(d1 - sigma * Math.sqrt(T))) / 365;
    vega = spot * Math.sqrt(T) * pdf(d1) / 100;
  } else {
    delta = N(d1) - 1;
    gamma = pdf(d1) / (spot * sigma * Math.sqrt(T));
    theta = (-(spot * pdf(d1) * sigma) / (2 * Math.sqrt(T)) + r * strike * Math.exp(-r * T) * N(sigma * Math.sqrt(T) - d1)) / 365;
    vega = spot * Math.sqrt(T) * pdf(d1) / 100;
  }

  return {
    delta: parseFloat(delta.toFixed(3)),
    gamma: parseFloat(gamma.toFixed(5)),
    theta: parseFloat(theta.toFixed(2)),
    vega: parseFloat(vega.toFixed(2)),
    timeValue: parseFloat(timeValue.toFixed(2)),
    intrinsic: parseFloat(intrinsic.toFixed(2)),
  };
}

// ---- Component -------------------------------------------------------------

export function OptionStrikeOverviewPage() {
  const { token, user } = useAuthStore();

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
  const [portfolioBalance, setPortfolioBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('CE');

  const { symbol, expiry: initialExpiry, strike: targetStrike } = initialParams;
  const [expiry, setExpiry] = useState<string | null>(initialExpiry || null);

  /* Live WebSocket quotes — subscribe to underlying index + selected strike's CE/PE */
  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  // Subscribe to live ticks for underlying index + the CE/PE legs of the strike row
  useEffect(() => {
    if (!data) return;
    const underlyingKey = data.upstoxKey || INDEX_TO_UPSTOX_KEY[symbol];
    const wanted = new Set<string>();
    if (underlyingKey) wanted.add(underlyingKey);
    const sr = data.strikes.find((r) => r.strikePrice === targetStrike) ||
      data.strikes.reduce<StrikeRow | null>((best, r) => {
        if (!best) return r;
        return Math.abs(r.strikePrice - targetStrike) < Math.abs(best.strikePrice - targetStrike) ? r : best;
      }, null);
    if (sr?.ce?.instrumentKey) wanted.add(sr.ce.instrumentKey);
    if (sr?.pe?.instrumentKey) wanted.add(sr.pe.instrumentKey);
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
  }, [data, symbol, targetStrike, subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0) {
        unsubscribe(Array.from(subscribedRef.current));
        subscribedRef.current.clear();
      }
    };
  }, [unsubscribe]);

  /* Inline order placement state */
  const [lots, setLots] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<{ ok: boolean; message: string } | null>(null);
  /* When true, shows a full-screen overlay "Opening position…" and redirects
   * to /positions after a short delay so the user sees their new position
   * with the live strike price updating in real-time. */
  const [redirecting, setRedirecting] = useState(false);

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

  // Fetch real portfolio balance so user sees their actual available margin
  const fetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.success && typeof j.data?.availableMargin === 'number') {
        setPortfolioBalance(j.data.availableMargin);
      }
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchChain(); }, [fetchChain]);
  useEffect(() => { fetchBalance(); }, [fetchBalance]);

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

  // Live spot price — prefer WebSocket tick, fall back to API spot
  const underlyingKey = data?.upstoxKey || INDEX_TO_UPSTOX_KEY[symbol];
  const underlyingTick = underlyingKey ? quotes[underlyingKey] : undefined;
  const spot = underlyingTick?.ltp ?? data?.spot ?? 0;
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

  // Active leg — overlay live tick on top of API data
  const baseActiveLeg: OptionLeg | null = strikeRow ? (side === 'CE' ? strikeRow.ce : strikeRow.pe) : null;
  const activeLegInstrumentKey = baseActiveLeg?.instrumentKey;
  const activeLegTick = activeLegInstrumentKey ? quotes[activeLegInstrumentKey] : undefined;
  const activeLeg: OptionLeg | null = baseActiveLeg
    ? {
        ...baseActiveLeg,
        lastPrice: activeLegTick?.ltp ?? baseActiveLeg.lastPrice,
        oi: activeLegTick?.oi ?? baseActiveLeg.oi,
        volume: activeLegTick?.volume ?? baseActiveLeg.volume,
        change: activeLegTick?.change ?? baseActiveLeg.change,
        changePct: activeLegTick?.changePct ?? baseActiveLeg.changePct,
      }
    : null;
  const activeItm = strikeRow ? (side === 'CE' ? strikeRow.itm === 'CE' : strikeRow.itm === 'PE') : false;
  const legUp = (activeLeg?.change ?? 0) >= 0;
  const legLive = !!activeLegTick?.timestamp && Date.now() - activeLegTick.timestamp < 30000;

  // Greeks for the active leg
  const greeks = useMemo(() => {
    if (!activeLeg || !strikeRow || !data) return null;
    return estimateGreeks(activeLeg, strikeRow.strikePrice, spot, data.dte, side);
  }, [activeLeg, strikeRow, spot, data, side]);

  // Breakeven: for a long CALL = strike + premium; for a long PUT = strike - premium
  const breakeven = useMemo(() => {
    if (!activeLeg || !strikeRow) return null;
    return side === 'CE'
      ? strikeRow.strikePrice + activeLeg.lastPrice
      : strikeRow.strikePrice - activeLeg.lastPrice;
  }, [activeLeg, strikeRow, side]);

  // Order value (1 lot = lotSize qty)
  const lotSize = data?.lotSize ?? 1;
  const orderQty = lots * lotSize;
  const orderValue = (activeLeg?.lastPrice ?? 0) * orderQty;
  const insufficientMargin = portfolioBalance != null && orderValue > portfolioBalance;

  /* ---------- Inline order placement (no redirect to /trade) ----------
     IMPORTANT: we pass `price: activeLeg.lastPrice` so the server fills the
     order at the actual option premium. Without this, the orders API would
     fall back to MOCK_LTP[symbol]=1000 (NIFTY isn't in the mock map),
     inflating the orderValue 50x and wrongly rejecting it as insufficient
     margin. */
  const placeOrder = async (orderSide: 'BUY' | 'SELL') => {
    if (!activeLeg || !strikeRow || !data) return;
    if (insufficientMargin && orderSide === 'BUY') {
      setOrderResult({ ok: false, message: 'Insufficient margin for this order' });
      return;
    }
    setPlacing(true);
    setOrderResult(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol,
          segment: 'OPTIONS',
          side: orderSide,
          type: 'MARKET',
          quantity: orderQty,
          price: activeLeg.lastPrice, // option premium — required for OPTIONS
          optionType: side,
          strikePrice: strikeRow.strikePrice,
          expiry: data.expiry,
          /* Pass the strike's actual Upstox instrument_key so the server
           * stores it on the Position row. PositionsPage then subscribes to
           * live ticks for this EXACT strike (no option-chain re-fetch). */
          instrumentKey: activeLeg.instrumentKey ?? null,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setOrderResult({
          ok: true,
          message: `${orderSide} ${orderQty} qty ${side} ${strikeRow.strikePrice} ${idxInfo.display} @ ₹${activeLeg.lastPrice.toFixed(2)} — FILLED`,
        });
        // Refresh balance + chain after a beat
        setTimeout(() => { fetchBalance(); fetchChain(); }, 400);

        /* ---------- Post-order redirect (BUY only) ----------
         * For BUY orders, redirect to /positions/index so the user immediately
         * sees their new OPTIONS position with the entry price = the actual
         * option premium they paid (e.g. ₹109 in the user's example), and
         * the live strike price streaming in real-time for the EXACT strike
         * (e.g. NIFTY 23500 CE — not any other strike).
         * SELL orders square off an existing position — show inline success
         * but stay on the page so the user can keep trading the chain.
         * 5x SPEED: was 400ms — reduced to 150ms for instant redirect. */
        if (orderSide === 'BUY') {
          setRedirecting(true);
          setTimeout(() => {
            window.location.href = '/positions/index';
          }, 150);
        }
      } else {
        setOrderResult({ ok: false, message: j.error || 'Order failed' });
      }
    } catch {
      setOrderResult({ ok: false, message: 'Network error' });
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- Add to watchlist (saves into the default "Option Strikes" group) ---------- */
  const [watchlistAdded, setWatchlistAdded] = useState(false);
  const handleAddToWatchlist = () => {
    if (!user?.id || !strikeRow || !data) return;
    const ok = addOptionStrikeToGroup(
      user.id,
      'option-strikes',
      symbol,
      strikeRow.strikePrice,
      side,
      data.expiry,
    );
    setWatchlistAdded(ok);
    setTimeout(() => setWatchlistAdded(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* ============== REDIRECTING OVERLAY (after BUY order) ============== */}
      {redirecting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card-soft p-6 flex flex-col items-center gap-3 max-w-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tint-green">
              <CheckCircle2 className="h-6 w-6 text-profit-green" />
            </div>
            <p className="text-sm font-semibold text-text-primary text-center">
              Position Opened
            </p>
            <p className="text-xs text-text-secondary text-center">
              Entry: ₹{activeLeg?.lastPrice.toFixed(2)} · Redirecting to Positions…
            </p>
            <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
          </div>
        </div>
      )}
      {/* ============== BACK + BREADCRUMB ============== */}
      <a
        href={`/optionchain?symbol=${encodeURIComponent(symbol)}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {idxInfo.display} Option Chain
      </a>

      {/* ============== COMPACT HEADER ============== */}
      <div className="card-soft p-3">
        <div className="flex items-center gap-3">
          <StockLogo symbol={symbol} size="md" isIndex rounded="md" className="ring-1 ring-border shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-base font-bold text-text-primary tracking-tight">
                {idxInfo.display}
              </h1>
              <span className="pill bg-tint-blue text-brand-primary text-[10px] font-bold inline-flex items-center gap-0.5">
                <Target className="h-2.5 w-2.5" />
                {targetStrike || '—'}
              </span>
              <span className="pill bg-bg-surface-alt text-text-secondary text-[10px] font-semibold">
                {side}
              </span>
              {data?.expiryType && (
                <span className={cn(
                  'pill text-[9px] font-bold',
                  data.expiryType === 'MONTHLY'
                    ? 'bg-tint-purple text-info-purple'
                    : 'bg-tint-blue text-brand-primary'
                )}>
                  {data.expiryType === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
              {data?.expiry && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-tint-purple/40 px-1.5 py-0.5 text-[10px] font-bold text-info-purple">
                  <Clock className="h-2.5 w-2.5" />
                  EXP {formatExpiry(data.expiry)}
                </span>
              )}
              {data?.expiryLabel && (
                <span className="text-[10px] font-medium text-text-tertiary">{data.expiryLabel}</span>
              )}
              {data && (
                <span className="inline-flex items-center gap-0.5 text-text-tertiary">
                  <Layers className="h-2.5 w-2.5" />
                  Lot {data.lotSize}
                </span>
              )}
              {data && (
                <span className="text-text-tertiary">· {data.dte}d to expiry</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-text-tertiary uppercase">Spot</p>
            <p className={cn(
              'font-mono text-base font-bold tabular-nums',
              underlyingTick ? 'text-text-primary' : 'text-text-secondary'
            )}>
              {formatNumber(spot, 2)}
              {underlyingTick && (
                <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse align-middle" />
              )}
            </p>
            {underlyingTick && (
              <p className={cn(
                'font-mono text-[10px] tabular-nums font-semibold',
                (underlyingTick.change ?? 0) >= 0 ? 'text-profit-green' : 'text-loss-red'
              )}>
                {(underlyingTick.change ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(underlyingTick.change ?? 0).toFixed(2)} ({(underlyingTick.changePct ?? 0).toFixed(2)}%)
              </p>
            )}
            <button
              onClick={handleAddToWatchlist}
              className={cn(
                'mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                watchlistAdded
                  ? 'bg-profit-green/15 text-profit-green'
                  : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface hover:text-text-primary'
              )}
              title="Save this strike to your Option Strikes watchlist"
            >
              <Star className={cn('h-3 w-3', watchlistAdded && 'fill-current')} />
              {watchlistAdded ? 'Added' : 'Watchlist'}
            </button>
          </div>
        </div>
      </div>

      {/* ============== LOADING / ERROR ============== */}
      {loading ? (
        <div className="card-soft p-6 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
          <span className="ml-2 text-xs text-text-secondary">Loading strike data…</span>
        </div>
      ) : error ? (
        <div className="card-soft p-4 flex flex-col items-center text-center">
          <p className="text-xs font-medium text-loss-red mb-1">{error}</p>
          <button
            onClick={fetchChain}
            className="mt-2 text-[11px] font-semibold text-brand-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : !strikeRow ? (
        <div className="card-soft p-4 flex flex-col items-center text-center">
          <Target className="h-8 w-8 text-text-secondary mb-2" />
          <p className="text-xs text-text-secondary">Strike {targetStrike} not found in this expiry</p>
        </div>
      ) : (
        <>
          {/* ============== SIDE SWITCHER (CE / PE) — COMPACT ============== */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setSide('CE')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors',
                side === 'CE'
                  ? 'bg-profit-green/15 text-profit-green ring-1 ring-profit-green/30'
                  : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface'
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              CALL {strikeRow.strikePrice}
              {strikeRow.itm === 'CE' && (
                <span className="pill bg-profit-green/20 text-profit-green text-[8px] px-1 py-0">ITM</span>
              )}
            </button>
            <button
              onClick={() => setSide('PE')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors',
                side === 'PE'
                  ? 'bg-loss-red/15 text-loss-red ring-1 ring-loss-red/30'
                  : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface'
              )}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              PUT {strikeRow.strikePrice}
              {strikeRow.itm === 'PE' && (
                <span className="pill bg-loss-red/20 text-loss-red text-[8px] px-1 py-0">ITM</span>
              )}
            </button>
          </div>

          {/* ============== LTP + STATS (compact) ============== */}
          {activeLeg && (
            <div className="card-soft p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-tertiary inline-flex items-center gap-1.5">
                    {side === 'CE' ? 'CALL' : 'PUT'} · LTP
                    {legLive && (
                      <span className="inline-flex items-center gap-0.5 text-profit-green text-[9px] font-bold">
                        <span className="inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </p>
                  <p className={cn(
                    'mt-0.5 font-mono text-2xl font-bold tabular-nums',
                    legLive ? 'text-text-primary' : 'text-text-secondary'
                  )}>
                    ₹{formatNumber(activeLeg.lastPrice, 2)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className={cn(
                      'font-mono text-xs font-semibold tabular-nums',
                      legUp ? 'text-profit-green' : 'text-loss-red'
                    )}>
                      {legUp ? '+' : ''}{formatNumber(activeLeg.change, 2)} ({legUp ? '+' : ''}{activeLeg.changePct.toFixed(2)}%)
                    </span>
                    {legUp ? (
                      <TrendingUp className="h-3 w-3 text-profit-green" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-loss-red" />
                    )}
                  </div>
                </div>
                <div className={cn(
                  'rounded-lg px-2.5 py-1.5 text-center',
                  activeItm ? 'bg-tint-green text-profit-green' : 'bg-bg-surface-alt text-text-secondary'
                )}>
                  <p className="text-[9px] uppercase font-semibold tracking-wide">{activeItm ? 'In The Money' : 'Out of Money'}</p>
                  <p className="font-mono text-xs font-bold mt-0.5">
                    {side === 'CE'
                      ? `${moneyness?.callDistance && moneyness.callDistance >= 0 ? '+' : ''}${formatNumber(moneyness?.callDistance ?? 0, 2)} pts`
                      : `${moneyness?.putDistance && moneyness.putDistance >= 0 ? '+' : ''}${formatNumber(moneyness?.putDistance ?? 0, 2)} pts`}
                  </p>
                </div>
              </div>

              {/* Compact stat grid — 4 cols */}
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-2">
                <MiniStat label="OI" value={formatOi(activeLeg.oi)} icon={Layers} tint="text-brand-primary" />
                <MiniStat label="Vol" value={formatOi(activeLeg.volume)} icon={BarChart3} tint="text-info-purple" />
                <MiniStat label="IV" value={activeLeg.iv.toFixed(1) + '%'} icon={Gauge} tint="text-accent-gold" />
                <MiniStat label="Intrinsic" value={`₹${formatNumber(activeLeg.intrinsic, 2)}`} icon={Sparkles} tint="text-profit-green" />
              </div>
            </div>
          )}

          {/* ============== GREEKS (compact) ============== */}
          {greeks && (
            <div className="card-soft p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-xs font-semibold text-text-primary inline-flex items-center gap-1.5">
                  <Sigma className="h-3.5 w-3.5 text-info-purple" />
                  Option Greeks
                </h3>
                <span className="text-[10px] text-text-tertiary">Estimated · {data?.dte ?? 0}d to expiry</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <GreekStat label="Delta" value={greeks.delta.toFixed(3)} hint={side === 'CE' ? '↑ spot → ↑ premium' : '↑ spot → ↓ premium'} />
                <GreekStat label="Gamma" value={greeks.gamma.toFixed(4)} hint="Δ rate of change" />
                <GreekStat label="Theta" value={greeks.theta.toFixed(2)} hint="₹/day decay" tone={greeks.theta < 0 ? 'neg' : 'pos'} />
                <GreekStat label="Vega" value={greeks.vega.toFixed(2)} hint="₹/1% IV" />
              </div>
            </div>
          )}

          {/* ============== BREAKEVEN + PAYOFF ============== */}
          {activeLeg && breakeven != null && (
            <div className="card-soft p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-xs font-semibold text-text-primary inline-flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5 text-brand-primary" />
                  Breakeven &amp; Payoff
                </h3>
                <span className="text-[10px] text-text-tertiary">Long {side} · 1 lot</span>
              </div>

              {/* 3 key numbers */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg border border-border bg-bg-surface p-2 text-center">
                  <p className="text-[9px] uppercase font-medium text-text-tertiary">Premium Paid</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-text-primary">₹{formatNumber(activeLeg.lastPrice, 2)}</p>
                </div>
                <div className="rounded-lg border border-brand-primary/30 bg-tint-blue p-2 text-center">
                  <p className="text-[9px] uppercase font-medium text-brand-primary">Breakeven</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-brand-primary">{formatNumber(breakeven, 2)}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-surface p-2 text-center">
                  <p className="text-[9px] uppercase font-medium text-text-tertiary">Max Loss</p>
                  <p className="mt-0.5 font-mono text-xs font-bold text-loss-red">₹{formatNumber(activeLeg.lastPrice * lotSize, 2)}</p>
                </div>
              </div>

              {/* Mini payoff diagram */}
              <PayoffDiagram strike={strikeRow.strikePrice} premium={activeLeg.lastPrice} spot={spot} side={side} />
            </div>
          )}

          {/* ============== MONEYNESS STRIP ============== */}
          {moneyness && data && (
            <div className="card-soft p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-xs font-semibold text-text-primary">Moneyness</h3>
                <span className="text-[10px] text-text-tertiary">Spot ₹{formatNumber(spot, 2)} · Strike {strikeRow.strikePrice}</span>
              </div>
              {/* Compact number line */}
              <div className="relative h-10">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-loss-red/30 via-bg-surface-alt to-profit-green/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-brand-primary ring-2 ring-brand-primary/20" />
                </div>
                <div className={cn(
                  'absolute top-1/2 -translate-y-1/2 flex flex-col items-center',
                  spot >= strikeRow.strikePrice ? 'right-[15%]' : 'left-[15%]'
                )}>
                  <div className="h-2.5 w-2.5 rounded-full bg-text-primary ring-2 ring-border" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span className="text-text-tertiary">Strike {strikeRow.strikePrice}</span>
                <span className="font-semibold text-text-secondary">Spot ₹{formatNumber(spot, 2)}</span>
              </div>

              {/* Compact CE/PE status row */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className={cn('rounded-md p-1.5 text-center border', strikeRow.itm === 'CE' ? 'border-profit-green/30 bg-profit-green/[0.06]' : 'border-border bg-bg-surface')}>
                  <span className="text-[9px] uppercase font-semibold text-text-tertiary">CALL </span>
                  <span className={cn('text-[10px] font-bold ml-1', strikeRow.itm === 'CE' ? 'text-profit-green' : 'text-text-secondary')}>
                    {strikeRow.itm === 'CE' ? 'ITM' : 'OTM'}
                  </span>
                </div>
                <div className={cn('rounded-md p-1.5 text-center border', strikeRow.itm === 'PE' ? 'border-loss-red/30 bg-loss-red/[0.06]' : 'border-border bg-bg-surface')}>
                  <span className="text-[9px] uppercase font-semibold text-text-tertiary">PUT </span>
                  <span className={cn('text-[10px] font-bold ml-1', strikeRow.itm === 'PE' ? 'text-loss-red' : 'text-text-secondary')}>
                    {strikeRow.itm === 'PE' ? 'ITM' : 'OTM'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============== CE vs PE COMPARISON (compact) — clickable to switch side ============== */}
          {strikeRow && (
            <div className="card-soft p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading text-xs font-semibold text-text-primary">CE vs PE Snapshot</h3>
                <span className="text-[10px] text-text-tertiary">Tap a side to switch</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CompactLeg
                  title="CALL"
                  leg={strikeRow.ce}
                  isItm={strikeRow.itm === 'CE'}
                  accent="profit-green"
                  isActive={side === 'CE'}
                  onClick={() => setSide('CE')}
                />
                <CompactLeg
                  title="PUT"
                  leg={strikeRow.pe}
                  isItm={strikeRow.itm === 'PE'}
                  accent="loss-red"
                  isActive={side === 'PE'}
                  onClick={() => setSide('PE')}
                />
              </div>
            </div>
          )}

          {/* ============== INLINE ORDER PANEL ============== */}
          {activeLeg && data && (
            <div className="card-soft p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xs font-semibold text-text-primary inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-brand-primary" />
                    Place Order · {side === 'CE' ? 'CALL' : 'PUT'} {strikeRow.strikePrice}
                  </h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    {idxInfo.display} · Lot {data.lotSize} · LTP ₹{formatNumber(activeLeg.lastPrice, 2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase font-medium text-text-tertiary">Available</p>
                  <p className="font-mono text-xs font-bold text-text-primary">
                    {portfolioBalance == null ? '—' : formatINR(portfolioBalance)}
                  </p>
                </div>
              </div>

              {/* Lots selector */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-text-secondary shrink-0">Lots</label>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-surface-alt">
                  <button
                    onClick={() => setLots(Math.max(1, lots - 1))}
                    className="px-2 py-1 text-xs font-bold text-text-secondary hover:text-text-primary"
                    aria-label="Decrease lots"
                  >−</button>
                  <span className="px-2 font-mono text-xs font-bold text-text-primary min-w-[28px] text-center">{lots}</span>
                  <button
                    onClick={() => setLots(lots + 1)}
                    className="px-2 py-1 text-xs font-bold text-text-secondary hover:text-text-primary"
                    aria-label="Increase lots"
                  >+</button>
                </div>
                <span className="text-[10px] text-text-tertiary">
                  = {orderQty} qty
                </span>
                <div className="flex-1" />
                <div className="text-right">
                  <span className="text-[10px] text-text-tertiary">Order Value: </span>
                  <span className={cn(
                    'font-mono text-xs font-bold',
                    insufficientMargin ? 'text-loss-red' : 'text-text-primary'
                  )}>
                    ₹{formatNumber(orderValue, 2)}
                  </span>
                </div>
              </div>

              {insufficientMargin && (
                <div className="rounded-md bg-tint-red/40 border border-loss-red/30 px-2 py-1.5 text-[10px] text-loss-red font-medium">
                  Insufficient margin. Reduce lots or check balance.
                </div>
              )}

              {/* BUY & SELL buttons — call /api/orders directly, NO redirect to /trade */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => placeOrder('BUY')}
                  disabled={placing || insufficientMargin}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-lg py-2.5 font-bold transition-colors',
                    'bg-profit-green hover:bg-profit-green/90 text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {placing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span className="text-sm">BUY {side}</span>
                      <span className="text-[10px] font-medium opacity-90">
                        ₹{formatNumber(activeLeg.lastPrice, 2)} · {lots} lot{lots !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => placeOrder('SELL')}
                  disabled={placing}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-lg py-2.5 font-bold transition-colors',
                    'bg-loss-red hover:bg-loss-red/90 text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {placing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span className="text-sm">SELL {side}</span>
                      <span className="text-[10px] font-medium opacity-90">
                        ₹{formatNumber(activeLeg.lastPrice, 2)} · {lots} lot{lots !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Inline order result */}
              {orderResult && (
                <div className={cn(
                  'rounded-lg p-2.5 flex items-start gap-2',
                  orderResult.ok ? 'bg-tint-green/40 border border-profit-green/30' : 'bg-tint-red/40 border border-loss-red/30'
                )}>
                  {orderResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-profit-green shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-loss-red shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'text-xs font-semibold',
                      orderResult.ok ? 'text-profit-green' : 'text-loss-red'
                    )}>
                      {orderResult.ok ? 'Order Placed' : 'Order Failed'}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-0.5">{orderResult.message}</p>
                  </div>
                  <button
                    onClick={() => setOrderResult(null)}
                    className="text-[10px] font-medium text-text-tertiary hover:text-text-primary shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <p className="text-[9px] text-text-tertiary text-center">
                Paper trade · Virtual money · No real exchange execution
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Sub-components (compact) ----------------------------------------------

function MiniStat({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tint: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-surface p-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-medium text-text-tertiary uppercase">{label}</p>
        <Icon className={cn('h-2.5 w-2.5', tint)} />
      </div>
      <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

function GreekStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'pos' | 'neg';
}) {
  const toneClass = tone === 'neg' ? 'text-loss-red' : tone === 'pos' ? 'text-profit-green' : 'text-text-primary';
  return (
    <div className="rounded-md border border-border bg-bg-surface p-1.5 text-center">
      <p className="text-[9px] font-medium text-text-tertiary uppercase">{label}</p>
      <p className={cn('mt-0.5 font-mono text-xs font-bold tabular-nums', toneClass)}>{value}</p>
      <p className="text-[8px] text-text-tertiary mt-0.5 truncate">{hint}</p>
    </div>
  );
}

function CompactLeg({
  title,
  leg,
  isItm,
  accent,
  isActive = false,
  onClick,
}: {
  title: string;
  leg: OptionLeg;
  isItm: boolean;
  accent: 'profit-green' | 'loss-red';
  isActive?: boolean;
  onClick?: () => void;
}) {
  const up = leg.change >= 0;
  const accentText = accent === 'profit-green' ? 'text-profit-green' : 'text-loss-red';
  const accentBg = accent === 'profit-green' ? 'bg-profit-green/[0.06]' : 'bg-loss-red/[0.06]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border p-2 text-left transition-all',
        isItm ? `border-${accent}/30 ${accentBg}` : 'border-border bg-bg-surface',
        isActive && `ring-2 ring-${accent}/40 shadow-sm`,
        onClick && 'cursor-pointer hover:border-brand-primary/40'
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn('text-[10px] font-bold', accentText)}>{title}</p>
        <div className="flex items-center gap-1">
          {isActive && (
            <span className="pill bg-brand-primary/15 text-brand-primary text-[8px] font-bold px-1 py-0">
              VIEWING
            </span>
          )}
          {isItm && <span className={cn('pill text-[8px] font-bold px-1 py-0', accent === 'profit-green' ? 'bg-profit-green/20 text-profit-green' : 'bg-loss-red/20 text-loss-red')}>ITM</span>}
        </div>
      </div>
      <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-text-primary">₹{formatNumber(leg.lastPrice, 2)}</p>
      <p className={cn('text-[10px] font-semibold', up ? 'text-profit-green' : 'text-loss-red')}>
        {up ? '+' : ''}{leg.changePct.toFixed(2)}%
      </p>
      <div className="mt-1 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-text-tertiary">OI</span>
          <span className="font-mono text-text-secondary">{formatOi(leg.oi)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">IV</span>
          <span className="font-mono text-text-secondary">{leg.iv.toFixed(1)}%</span>
        </div>
      </div>
    </button>
  );
}

/* ---------- Mini payoff diagram (long call/put) ----------
   Renders a simple SVG payoff curve for a long position in this option. */
function PayoffDiagram({
  strike,
  premium,
  spot,
  side,
}: {
  strike: number;
  premium: number;
  spot: number;
  side: Side;
}) {
  // Build payoff points across a price range: ±15% of strike
  const lo = strike * 0.85;
  const hi = strike * 1.15;
  const steps = 40;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const price = lo + ((hi - lo) * i) / steps;
    const payoff =
      side === 'CE'
        ? Math.max(0, price - strike) - premium
        : Math.max(0, strike - price) - premium;
    pts.push({ x: price, y: payoff });
  }
  const maxY = Math.max(...pts.map((p) => Math.abs(p.y))) || premium;
  // SVG coords
  const w = 320;
  const h = 90;
  const pad = 8;
  const xScale = (x: number) => pad + ((x - lo) / (hi - lo)) * (w - 2 * pad);
  const yScale = (y: number) => h / 2 - (y / maxY) * (h / 2 - pad);
  const pathD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
    .join(' ');
  const zeroY = yScale(0);
  const spotX = xScale(Math.min(Math.max(spot, lo), hi));
  const strikeX = xScale(strike);
  const breakeven = side === 'CE' ? strike + premium : strike - premium;
  const beX = xScale(Math.min(Math.max(breakeven, lo), hi));
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[90px]" preserveAspectRatio="none">
        {/* Zero line */}
        <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="currentColor" strokeWidth="0.5" className="text-border" />
        {/* Strike vertical */}
        <line x1={strikeX} y1={pad} x2={strikeX} y2={h - pad} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" className="text-text-tertiary" />
        {/* Spot vertical */}
        <line x1={spotX} y1={pad} x2={spotX} y2={h - pad} stroke="currentColor" strokeWidth="0.5" className="text-brand-primary/60" />
        {/* Breakeven vertical */}
        <line x1={beX} y1={pad} x2={beX} y2={h - pad} stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" className="text-accent-gold/60" />
        {/* Payoff curve */}
        <path d={pathD} fill="none" stroke={side === 'CE' ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Spot dot */}
        <circle cx={spotX} cy={zeroY} r="2" fill="#2563EB" />
      </svg>
      <div className="flex items-center justify-between text-[9px] mt-0.5 px-1">
        <span className="text-text-tertiary font-mono">{formatNumber(lo, 0)}</span>
        <span className="text-text-tertiary">Spot ↓ blue · Strike ↓ dashed · BE ↓ gold</span>
        <span className="text-text-tertiary font-mono">{formatNumber(hi, 0)}</span>
      </div>
    </div>
  );
}
