'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, cn } from '@/lib/utils';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
import {
  findExpiry,
  type ExpiryIndex,
} from '@/lib/expiry-calendar';

/**
 * Look up the human-readable label (e.g. "Jan W1", "Mar Monthly") for an
 * expiry date across all 4 indices. Returns the first match or null.
 *
 * We try all 4 indices because the option-chain page can switch symbols
 * dynamically — we don't want to thread the active symbol through every
 * dropdown render.
 */
function getExpiryLabel(date: string): string | null {
  const indices: ExpiryIndex[] = ['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'];
  for (const idx of indices) {
    const entry = findExpiry(idx, date);
    if (entry) return entry.label ?? null;
  }
  return null;
}

// ---- Types ---------------------------------------------------------------

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

// ---- Static index list (only 4 supported, per user request) -------------

const INDICES = [
  { symbol: 'NIFTY',     display: 'NIFTY 50',     short: 'NIFTY'     },
  { symbol: 'SENSEX',    display: 'SENSEX',       short: 'SENSEX'    },
  { symbol: 'BANKNIFTY', display: 'BANK NIFTY',   short: 'BANKNIFTY' },
  { symbol: 'FINNIFTY',  display: 'FIN NIFTY',    short: 'FINNIFTY'  },
] as const;

// Normalize symbol coming from URL (?symbol=NIFTYFS) → FINNIFTY
function normalizeSymbol(s: string | null): string {
  if (!s) return 'NIFTY';
  const up = s.toUpperCase();
  if (up === 'NIFTYFS' || up === 'FINNIFTY') return 'FINNIFTY';
  if (INDICES.some((i) => i.symbol === up)) return up;
  return 'NIFTY';
}

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatOi(oi: number): string {
  if (oi >= 1e7) return (oi / 1e7).toFixed(2) + 'Cr';
  if (oi >= 1e5) return (oi / 1e5).toFixed(2) + 'L';
  if (oi >= 1e3) return (oi / 1e3).toFixed(1) + 'K';
  return String(oi);
}

// ---- Component -----------------------------------------------------------

export function OptionChainPage() {
  const { token } = useAuthStore();

  // Read ?symbol= from URL once on mount.
  const [initialSymbol] = useState(() => {
    if (typeof window === 'undefined') return 'NIFTY';
    const url = new URL(window.location.href);
    return normalizeSymbol(url.searchParams.get('symbol'));
  });

  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [data, setData] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for SPA navigation events — if user clicks an <a href="/optionchain?symbol=X">
  // while already on this page, pathname stays the same but query string changes,
  // so we need to re-read the symbol from the URL ourselves.
  useEffect(() => {
    const updateFromUrl = () => {
      const url = new URL(window.location.href);
      const newSymbol = normalizeSymbol(url.searchParams.get('symbol'));
      setSymbol((prev) => (prev !== newSymbol ? newSymbol : prev));
    };
    window.addEventListener('app:navigate', updateFromUrl);
    window.addEventListener('popstate', updateFromUrl);
    return () => {
      window.removeEventListener('app:navigate', updateFromUrl);
      window.removeEventListener('popstate', updateFromUrl);
    };
  }, []);

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
        // Initialize expiry from server response if not yet set
        if (!expiry && json.data.expiries?.length) {
          setExpiry(json.data.expiries[0]);
        }
      } else {
        setError(json.error || 'Failed to load option chain');
      }
    } catch (err) {
      console.error('Option chain fetch error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, symbol, expiry]);

  useEffect(() => {
    fetchChain();
  }, [fetchChain]);

  // Update URL when symbol changes (so refresh / share keeps state)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', symbol);
    window.history.replaceState({}, '', url.toString());
  }, [symbol]);

  const spot = data?.spot ?? 0;
  const atm = data?.atm ?? 0;
  const spotPositive = (data?.spot ?? 0) >= (data?.spot ?? 0); // placeholder, real change shown below

  // Approximate change vs previous close — derive from seed-stable spot
  // The API doesn't return yesterday's close, so we just show the spot + ATM.
  const idxInfo = INDICES.find((i) => i.symbol === symbol)!;

  // Summary stats
  const totalCallOi = useMemo(
    () => data?.strikes.reduce((s, r) => s + r.ce.oi, 0) ?? 0,
    [data]
  );
  const totalPutOi = useMemo(
    () => data?.strikes.reduce((s, r) => s + r.pe.oi, 0) ?? 0,
    [data]
  );
  const pcr = totalPutOi > 0 ? totalCallOi / totalPutOi : 0;

  return (
    <div className="space-y-4">
      {/* ============== HEADER ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start gap-3">
          <StockLogo symbol={symbol} size="xl" isIndex rounded="lg" className="ring-1 ring-border shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {idxInfo.display}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary truncate mt-0.5">
              Option Chain · {data?.exchange ?? 'NSE'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="pill bg-tint-blue text-brand-primary inline-flex items-center gap-1">
                <span className="text-[10px]">🇮🇳</span>
                {data?.exchange ?? 'NSE'}
              </span>
              <span className="pill bg-tint-purple text-info-purple inline-flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Lot: {data?.lotSize ?? 0}
              </span>
              <span className="pill bg-bg-surface-alt text-text-secondary">
                Strike Step: {data?.step ?? 0}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-text-primary">
              {formatNumber(spot, 2)}
            </p>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              <Clock className="inline h-3 w-3 mr-0.5" />
              {data
                ? `${data.dte}d to expiry`
                : 'Loading…'}
            </p>
          </div>
        </div>

        {/* Index switcher tabs */}
        <div className="mt-4 flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
          {INDICES.map((idx) => {
            const isActive = idx.symbol === symbol;
            return (
              <button
                key={idx.symbol}
                onClick={() => {
                  setSymbol(idx.symbol);
                  setExpiry(null);
                }}
                className={cn(
                  'px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                {idx.display}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============== SUMMARY STRIP ============== */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCell
            label="ATM Strike"
            value={`₹${formatNumber(data.atm, 0)}`}
            subtext={`Step ${data.step}`}
            icon={Activity}
            tint="bg-tint-blue"
            color="text-brand-primary"
          />
          <SummaryCell
            label="Spot Price"
            value={`₹${formatNumber(spot, 2)}`}
            subtext={`${data.exchange}`}
            icon={spotPositive ? TrendingUp : TrendingDown}
            tint="bg-tint-green"
            color="text-profit-green"
          />
          <SummaryCell
            label="Total Call OI"
            value={formatOi(totalCallOi)}
            subtext="Calls"
            icon={TrendingUp}
            tint="bg-tint-green"
            color="text-profit-green"
          />
          <SummaryCell
            label="PCR"
            value={pcr.toFixed(2)}
            subtext={pcr < 1 ? 'Bullish bias' : 'Bearish bias'}
            icon={Layers}
            tint={pcr < 1 ? 'bg-tint-green' : 'bg-tint-red'}
            color={pcr < 1 ? 'text-profit-green' : 'text-loss-red'}
          />
        </div>
      )}

      {/* ============== EXPIRY SELECTOR ============== */}
      {data && data.expiries.length > 0 && (
        <div className="card-soft p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-text-secondary">Expiry:</span>
              <div className="relative">
                <select
                  value={expiry ?? data.expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="appearance-none bg-bg-surface-alt border border-border rounded-md pl-3 pr-8 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  {data.expiries.map((exp) => {
                    // Look up label via the calendar (mirrors API logic on client)
                    const label = getExpiryLabel(exp);
                    return (
                      <option key={exp} value={exp}>
                        {formatExpiry(exp)}{label ? ` · ${label}` : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
              </div>
              {/* Current selection badge — WEEKLY / MONTHLY */}
              {data.expiryType && (
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
              {data.expiryLabel && (
                <span className="text-[11px] text-text-tertiary hidden sm:inline">
                  {data.expiryLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-tertiary hidden sm:block">
              {data.dte} day{data.dte === 1 ? '' : 's'} to expiry
            </p>
          </div>
        </div>
      )}

      {/* ============== OPTION CHAIN TABLE ============== */}
      <div className="card-soft p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            <span className="ml-2 text-sm text-text-secondary">Loading option chain…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 text-center px-4">
            <p className="text-sm font-medium text-loss-red mb-1">{error}</p>
            <button
              onClick={fetchChain}
              className="mt-3 text-xs font-semibold text-brand-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-text-secondary">No data available</p>
          </div>
        ) : (
          <OptionChainTable data={data} />
        )}
      </div>
    </div>
  );
}

// ---------- Sub-components ------------------------------------------------

function SummaryCell({
  label,
  value,
  subtext,
  icon: Icon,
  tint,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  tint: string;
  color: string;
}) {
  return (
    <div className="card-soft p-3">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium text-text-secondary">{label}</p>
        <div className={cn('icon-tile-sm', tint)}>
          <Icon className={cn('h-3.5 w-3.5', color)} />
        </div>
      </div>
      <p className="mt-1 font-mono text-base sm:text-lg font-bold tabular-nums text-text-primary">
        {value}
      </p>
      {subtext && <p className="text-[10px] text-text-tertiary mt-0.5">{subtext}</p>}
    </div>
  );
}

function OptionChainTable({ data }: { data: ChainResponse }) {
  const { strikes, atm, symbol, expiry } = data;

  // Build the strike overview URL — clicking the strike price opens a focused page
  const strikeHref = (strike: number) =>
    `/optionchain/strike?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}&strike=${strike}`;

  return (
    <div className="overflow-x-auto">
      {/* Desktop / wide-tablet view: 7-column CALL | Strike | PUT layout */}
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-bg-surface-alt text-text-secondary border-b border-border">
            {/* CALL side */}
            <th colSpan={4} className="px-2 sm:px-3 py-2 text-center text-profit-green font-semibold border-r border-border">
              CALLS
            </th>
            <th rowSpan={2} className="px-2 sm:px-3 py-2 text-center font-semibold text-text-primary border-r border-border">
              STRIKE
            </th>
            {/* PUT side */}
            <th colSpan={4} className="px-2 sm:px-3 py-2 text-center text-loss-red font-semibold">
              PUTS
            </th>
          </tr>
          <tr className="bg-bg-surface-alt text-text-tertiary border-b border-border text-[10px] sm:text-[11px] uppercase tracking-wide">
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">OI</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">Vol</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">IV</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium border-r border-border">LTP</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">LTP</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">IV</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">Vol</th>
            <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">OI</th>
          </tr>
        </thead>
        <tbody>
          {strikes.map((row) => {
            const isAtm = row.strikePrice === atm;
            const isCeItm = row.itm === 'CE';
            const isPeItm = row.itm === 'PE';
            const ceUp = row.ce.change >= 0;
            const peUp = row.pe.change >= 0;

            return (
              <tr
                key={row.strikePrice}
                className={cn(
                  'border-b border-border/60 transition-colors hover:bg-bg-surface-alt/50',
                  isAtm && 'bg-tint-blue/40'
                )}
              >
                {/* CALL side */}
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                  isCeItm && 'bg-profit-green/[0.06]'
                )}>
                  {formatOi(row.ce.oi)}
                </td>
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-tertiary',
                  isCeItm && 'bg-profit-green/[0.06]'
                )}>
                  {formatOi(row.ce.volume)}
                </td>
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                  isCeItm && 'bg-profit-green/[0.06]'
                )}>
                  {row.ce.iv.toFixed(1)}
                </td>
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums font-semibold border-r border-border',
                  isCeItm ? 'text-profit-green bg-profit-green/[0.06]' : 'text-text-primary'
                )}>
                  <span className={cn(ceUp ? 'text-profit-green' : 'text-loss-red', 'text-[10px] mr-1')}>
                    {ceUp ? '▲' : '▼'}
                  </span>
                  {formatNumber(row.ce.lastPrice, 2)}
                </td>

                {/* STRIKE — clickable, opens strike overview page */}
                <td className={cn(
                  'px-2 sm:px-3 py-2 text-center font-mono tabular-nums font-bold border-r border-border',
                  isAtm ? 'text-brand-primary bg-tint-blue' : 'text-text-primary'
                )}>
                  <a
                    href={strikeHref(row.strikePrice)}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                    aria-label={`View ${row.strikePrice} strike overview`}
                    title="View strike overview"
                  >
                    {row.strikePrice}
                    {isAtm && (
                      <span className="text-[9px] font-semibold text-brand-primary bg-brand-primary/10 px-1 py-0.5 rounded">
                        ATM
                      </span>
                    )}
                  </a>
                </td>

                {/* PUT side */}
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums font-semibold',
                  isPeItm ? 'text-loss-red bg-loss-red/[0.06]' : 'text-text-primary'
                )}>
                  {formatNumber(row.pe.lastPrice, 2)}
                  <span className={cn(peUp ? 'text-profit-green' : 'text-loss-red', 'text-[10px] ml-1')}>
                    {peUp ? '▲' : '▼'}
                  </span>
                </td>
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                  isPeItm && 'bg-loss-red/[0.06]'
                )}>
                  {row.pe.iv.toFixed(1)}
                </td>
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-tertiary',
                  isPeItm && 'bg-loss-red/[0.06]'
                )}>
                  {formatOi(row.pe.volume)}
                </td>
                <td className={cn(
                  'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                  isPeItm && 'bg-loss-red/[0.06]'
                )}>
                  {formatOi(row.pe.oi)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
