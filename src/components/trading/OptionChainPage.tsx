'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, cn } from '@/lib/utils';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
import {
  findExpiry,
  getUpcomingExpiries,
  type ExpiryIndex,
} from '@/lib/expiry-calendar';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { INDEX_TO_UPSTOX_KEY } from '@/lib/upstox-instruments';
import { LimitOrderModal } from '@/components/trading/LimitOrderModal';
import { Zap, ShoppingCart } from 'lucide-react';

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

// ---- Strike search parser --------------------------------------------------
// Parses inputs like:
//   "24500 CE"            → { strike: 24500, side: 'CE' }
//   "24500 PE"            → { strike: 24500, side: 'PE' }
//   "24500 CALL"          → { strike: 24500, side: 'CE' }
//   "24500 PUT"           → { strike: 24500, side: 'PE' }
//   "NIFTY 24500 CE"      → { symbol: 'NIFTY', strike: 24500, side: 'CE' }
//   "24400"               → { strike: 24400, side: null } (show both CE+PE for all expiries)
//   "24400 CE 2026-07-30" → { strike: 24400, side: 'CE', expiry: '2026-07-30' } (open directly)
interface ParsedStrikeQuery {
  symbol?: string;
  strike: number;
  side: 'CE' | 'PE' | null;
  expiry?: string;
}
function parseStrikeQuery(input: string, activeSymbol: string): ParsedStrikeQuery | null {
  const raw = input.trim().toUpperCase();
  if (!raw) return null;

  // Detect optional explicit symbol prefix (NIFTY/SENSEX/BANKNIFTY/FINNIFTY)
  let working = raw;
  let symbol: string | undefined;
  for (const idx of ['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'] as const) {
    if (working.startsWith(idx + ' ')) {
      symbol = idx;
      working = working.slice(idx.length).trim();
      break;
    }
  }

  // Extract optional explicit expiry date (YYYY-MM-DD)
  let expiry: string | undefined;
  const dateMatch = working.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    expiry = dateMatch[1];
    working = working.replace(dateMatch[1], '').trim();
  }

  // Extract side keyword (CE/PE/CALL/PUT)
  let side: 'CE' | 'PE' | null = null;
  if (/\b(CE|CALL)\b/.test(working)) {
    side = 'CE';
    working = working.replace(/\b(CE|CALL)\b/, '').trim();
  } else if (/\b(PE|PUT)\b/.test(working)) {
    side = 'PE';
    working = working.replace(/\b(PE|PUT)\b/, '').trim();
  }

  // Whatever remains should be the strike price
  const strikeMatch = working.match(/\d{3,6}/);
  if (!strikeMatch) return null;
  const strike = parseInt(strikeMatch[0], 10);
  if (strike < 50 || strike > 200000) return null;

  return { symbol: symbol ?? activeSymbol, strike, side, expiry };
}

// ---- In-memory cache for option chain data (stale-while-revalidate) ----
const chainCache = new Map<string, { data: ChainResponse; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

// ---- Component -----------------------------------------------------------

/* Data passed to order choice popup */
interface OrderChoiceData {
  strikePrice: number;
  optionType: 'CE' | 'PE';
  lastPrice: number;
  instrumentKey?: string | null;
}

export function OptionChainPage() {
  const { token } = useAuthStore();
  /* Order choice popup + limit order modal state */
  const [choiceAnchor, setChoiceAnchor] = useState<{ x: number; y: number } | null>(null);
  const [choiceData, setChoiceData] = useState<OrderChoiceData | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitModalSide, setLimitModalSide] = useState<'BUY' | 'SELL'>('BUY');
  const [limitModalPrice, setLimitModalPrice] = useState(0);

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

  /* Live WebSocket quotes — subscribes to underlying index + all CE/PE
     instrument keys in the chain. The hook handles its own polling fallback
     when WebSocket isn't connected. */
  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  // Re-subscribe whenever the chain data changes (new strikes loaded)
  useEffect(() => {
    if (!data) return;
    const underlyingKey = data.upstoxKey || INDEX_TO_UPSTOX_KEY[symbol];
    const wanted = new Set<string>();
    if (underlyingKey) wanted.add(underlyingKey);
    for (const row of data.strikes) {
      if (row.ce?.instrumentKey) wanted.add(row.ce.instrumentKey);
      if (row.pe?.instrumentKey) wanted.add(row.pe.instrumentKey);
    }
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
  }, [data, symbol, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0) {
        unsubscribe(Array.from(subscribedRef.current));
        subscribedRef.current.clear();
      }
    };
  }, [unsubscribe]);

  // Compute live spot price from underlying index tick
  const underlyingKey = data?.upstoxKey || INDEX_TO_UPSTOX_KEY[symbol];
  const underlyingTick = underlyingKey ? quotes[underlyingKey] : undefined;
  const liveSpot = underlyingTick?.ltp ?? data?.spot ?? 0;

  /* ---------- Strike search state ----------
     When the user types e.g. "24500 CE" (without an explicit expiry date),
     we show a dropdown listing all 4 upcoming expiries for that strike+side.
     Clicking an expiry navigates to the strike overview page. */
  const [strikeQuery, setStrikeQuery] = useState('');
  const [strikeDropdown, setStrikeDropdown] = useState<
    Array<{ expiry: string; label: string | null; symbol: string; strike: number; side: 'CE' | 'PE' }>
  >([]);
  const parsed = useMemo(
    () => parseStrikeQuery(strikeQuery, symbol),
    [strikeQuery, symbol]
  );

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

    // Check cache first (stale-while-revalidate)
    const cacheKey = `${symbol}:${expiry || ''}`;
    const cached = chainCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      if (!expiry && cached.data.expiries?.length) setExpiry(cached.data.expiries[0]);
      setLoading(false);
      return;
    }

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
        chainCache.set(cacheKey, { data: json.data, ts: Date.now() });
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

  /* ---------- Strike search dropdown logic ----------
     When the user types a recognisable strike + side (e.g. "24500 CE"),
     we compute all 4 upcoming expiries for the (symbol, strike, side) tuple
     and show them as a dropdown. If the user includes an explicit expiry
     date in the query, we navigate directly. */
  useEffect(() => {
    if (!parsed) {
      setStrikeDropdown([]);
      return;
    }
    // If query already pins an expiry date, jump straight to the overview page.
    if (parsed.expiry && parsed.side) {
      const url = `/optionchain/strike?symbol=${encodeURIComponent(parsed.symbol!)}&expiry=${encodeURIComponent(parsed.expiry)}&strike=${parsed.strike}`;
      window.location.href = url;
      setStrikeQuery('');
      return;
    }
    // If no side is specified, list both CE and PE for each expiry.
    const idx: ExpiryIndex = (['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'].includes(parsed.symbol!)
      ? parsed.symbol!
      : 'NIFTY') as ExpiryIndex;
    const upcoming = getUpcomingExpiries(idx, 4);
    const sides: Array<'CE' | 'PE'> = parsed.side ? [parsed.side] : ['CE', 'PE'];
    const rows = [] as Array<{ expiry: string; label: string | null; symbol: string; strike: number; side: 'CE' | 'PE' }>;
    for (const exp of upcoming) {
      for (const side of sides) {
        rows.push({
          expiry: exp.date,
          label: exp.label ?? null,
          symbol: parsed.symbol!,
          strike: parsed.strike,
          side,
        });
      }
    }
    setStrikeDropdown(rows);
  }, [parsed]);

  const strikeOverviewHref = (s: string, exp: string, strike: number) =>
    `/optionchain/strike?symbol=${encodeURIComponent(s)}&expiry=${encodeURIComponent(exp)}&strike=${strike}`;

  const spot = (liveSpot || data?.spot) ?? 0;
  const atm = data?.atm ?? 0;
  const spotPositive = (underlyingTick?.change ?? 0) >= 0;

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

  /* ---------- Click handler: show Market/Limit order choice ---------- */
  const handlePriceClick = useCallback(
    (e: React.MouseEvent, strikePrice: number, optionType: 'CE' | 'PE', lastPrice: number, instrumentKey?: string | null) => {
      setChoiceData({ strikePrice, optionType, lastPrice, instrumentKey: instrumentKey ?? null });
      setChoiceAnchor({ x: e.clientX, y: e.clientY });
    },
    []
  );

  /* Close choice popup on outside click */
  useEffect(() => {
    if (!choiceAnchor) return;
    const close = () => { setChoiceAnchor(null); setChoiceData(null); };
    const timer = setTimeout(() => {
      document.addEventListener('click', close, { once: true });
    }, 50);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [choiceAnchor]);

  /* Open limit order modal from choice popup */
  const openLimitOrder = (side: 'BUY' | 'SELL') => {
    if (!choiceData || !data) return;
    setLimitModalSide(side);
    setLimitModalPrice(choiceData.lastPrice);
    setChoiceAnchor(null);
    setLimitModalOpen(true);
  };

  /* Navigate to trade page for market order */
  const goToMarketOrder = () => {
    if (!choiceData || !data) return;
    window.location.href = `/trade?symbol=${encodeURIComponent(data.symbol)}&segment=OPTIONS&optionType=${choiceData.optionType}&strikePrice=${choiceData.strikePrice}&expiry=${encodeURIComponent(data.expiry)}&instrumentKey=${encodeURIComponent(choiceData.instrumentKey || '')}`;
    setChoiceAnchor(null);
  };

  return (
    <div className="space-y-3">
      {/* ============== STRIKE SEARCH BAR ============== */}
      <div className="card-soft p-3 relative">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-text-secondary shrink-0" />
          <input
            type="text"
            value={strikeQuery}
            onChange={(e) => setStrikeQuery(e.target.value)}
            placeholder={`Search any strike e.g. "24500 CE" or "24500 PE" — shows all 4 expiries`}
            className="flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          {strikeQuery && (
            <button
              onClick={() => setStrikeQuery('')}
              className="text-text-tertiary hover:text-text-primary shrink-0"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[10px] text-text-tertiary">
          Tip: type strike + side (e.g. <span className="font-mono font-semibold text-text-secondary">24600 CE</span>) — without an expiry we list all 4 upcoming expiries for that strike.
        </p>

        {/* Dropdown of matching strikes across all expiries */}
        {strikeDropdown.length > 0 && (
          <div className="mt-2 rounded-lg border border-border bg-bg-surface max-h-72 overflow-y-auto custom-scrollbar">
            <div className="px-3 py-1.5 bg-bg-surface-alt text-[10px] uppercase tracking-wide font-semibold text-text-tertiary sticky top-0">
              {parsed?.side
                ? `${parsed.strike} ${parsed.side} · ${parsed.symbol} · ${strikeDropdown.length} expiries`
                : `${parsed?.strike} · ${parsed?.symbol} · CE + PE · ${strikeDropdown.length} rows`}
            </div>
            {strikeDropdown.map((row) => (
              <a
                key={`${row.expiry}-${row.side}`}
                href={strikeOverviewHref(row.symbol, row.expiry, row.strike)}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-bg-surface-alt transition-colors border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'pill text-[10px] font-bold px-1.5 py-0.5',
                    row.side === 'CE'
                      ? 'bg-profit-green/15 text-profit-green'
                      : 'bg-loss-red/15 text-loss-red'
                  )}>
                    {row.side === 'CE' ? 'CALL' : 'PUT'} {row.strike}
                  </span>
                  <span className="text-xs font-semibold text-text-primary">
                    {formatExpiry(row.expiry)}
                  </span>
                  {row.label && (
                    <span className="text-[10px] text-text-tertiary">· {row.label}</span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-brand-primary shrink-0">
                  Open →
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {loading && !data ? (
        <>
          {/* ============== HEADER SKELETON ============== */}
          <div className="card-soft p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg bg-bg-surface-alt animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 rounded bg-bg-surface-alt animate-pulse" />
                <div className="h-3 w-24 rounded bg-bg-surface-alt animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-bg-surface-alt animate-pulse" />
                  <div className="h-5 w-20 rounded-full bg-bg-surface-alt animate-pulse" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="h-7 w-24 rounded bg-bg-surface-alt animate-pulse ml-auto" />
                <div className="h-3 w-16 rounded bg-bg-surface-alt animate-pulse ml-auto" />
              </div>
            </div>
            {/* Tab skeleton */}
            <div className="mt-4 flex gap-1 border-b border-border pb-0">
              {['w-16', 'w-14', 'w-20', 'w-16'].map((w, i) => (
                <div key={i} className={`h-8 ${w} rounded-t bg-bg-surface-alt animate-pulse`} />
              ))}
            </div>
          </div>
          {/* ============== SUMMARY STRIP SKELETON ============== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-soft p-3 space-y-2">
                <div className="h-3 w-16 rounded bg-bg-surface-alt animate-pulse" />
                <div className="h-5 w-20 rounded bg-bg-surface-alt animate-pulse" />
                <div className="h-2 w-12 rounded bg-bg-surface-alt animate-pulse" />
              </div>
            ))}
          </div>
          {/* ============== EXPIRY SELECTOR SKELETON ============== */}
          <div className="card-soft p-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-12 rounded bg-bg-surface-alt animate-pulse" />
              <div className="h-7 w-40 rounded-md bg-bg-surface-alt animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-bg-surface-alt animate-pulse" />
            </div>
          </div>
          {/* ============== TABLE SKELETON ============== */}
          <div className="card-soft p-0 overflow-hidden">
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-8 w-full rounded bg-bg-surface-alt animate-pulse" />
              ))}
            </div>
          </div>
        </>
      ) : error ? (
        <div className="card-soft overflow-hidden">
          <div className="flex flex-col items-center py-16 text-center px-4">
            <p className="text-sm font-medium text-loss-red mb-1">{error}</p>
            <button
              onClick={fetchChain}
              className="mt-3 text-xs font-semibold text-brand-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
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
                <p className={cn(
                  'font-mono text-2xl sm:text-3xl font-bold tabular-nums',
                  underlyingTick ? 'text-text-primary' : 'text-text-secondary'
                )}>
                  {formatNumber(spot, 2)}
                  {underlyingTick && (
                    <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-profit-green animate-pulse align-middle" />
                  )}
                </p>
                {underlyingTick && (
                  <p className={cn(
                    'font-mono text-[11px] tabular-nums font-semibold mt-0.5',
                    spotPositive ? 'text-profit-green' : 'text-loss-red'
                  )}>
                    {spotPositive ? '▲' : '▼'} {Math.abs(underlyingTick.change ?? 0).toFixed(2)} ({(underlyingTick.changePct ?? 0).toFixed(2)}%)
                  </p>
                )}
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  <Clock className="inline h-3 w-3 mr-0.5" />
                  {data
                    ? `${data.dte}d to expiry`
                    : 'Loading…'}
                </p>
                {(data?.realData || underlyingTick) && (
                  <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded-full bg-tint-green text-profit-green text-[9px] font-bold uppercase tracking-wide">
                    <span className="inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse" />
                    Live Upstox
                  </span>
                )}
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
            {!data ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-text-secondary">No data available</p>
              </div>
            ) : (
              <>
                <OptionChainTable data={data} quotes={quotes} liveSpot={liveSpot} onPriceClick={handlePriceClick} />

                {/* Order choice popup */}
                {choiceAnchor && choiceData && (
                  <div
                    className="fixed z-[60] rounded-xl border border-border bg-bg-surface shadow-xl p-2 space-y-1 w-48"
                    style={{
                      left: Math.min(choiceAnchor.x, window.innerWidth - 200),
                      top: Math.min(choiceAnchor.y + 8, window.innerHeight - 160),
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={goToMarketOrder}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-bg-surface-alt transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-tint-blue">
                        <ShoppingCart className="h-3.5 w-3.5 text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text-primary">Market Order</p>
                        <p className="text-[10px] text-text-tertiary">Execute at current price</p>
                      </div>
                    </button>
                    <button
                      onClick={() => openLimitOrder('BUY')}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-bg-surface-alt transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-tint-green">
                        <Zap className="h-3.5 w-3.5 text-profit-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-profit-green">Buy Limit</p>
                        <p className="text-[10px] text-text-tertiary">When price drops to ₹{formatNumber(choiceData.lastPrice, 2)}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => openLimitOrder('SELL')}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-bg-surface-alt transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-tint-red">
                        <Zap className="h-3.5 w-3.5 text-loss-red" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-loss-red">Sell Limit</p>
                      <p className="text-[10px] text-text-tertiary">When price rises to ₹{formatNumber(choiceData.lastPrice, 2)}</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Limit Order Modal */}
              {data && choiceData && (
                <LimitOrderModal
                  open={limitModalOpen}
                  onClose={() => setLimitModalOpen(false)}
                  symbol={data.symbol}
                  side={limitModalSide}
                  segment="OPTIONS"
                  marketPrice={limitModalPrice}
                  optionType={choiceData.optionType}
                  strikePrice={choiceData.strikePrice}
                  expiry={data.expiry}
                  instrumentKey={choiceData.instrumentKey}
                  lotSize={data.lotSize}
                  onSuccess={() => { /* Optionally refresh chain */ }}
                />
              )}
              </>
            )}
          </div>
        </>
      )}
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

function OptionChainTable({
  data,
  quotes,
  liveSpot,
  onPriceClick,
}: {
  data: ChainResponse;
  quotes: Record<string, any>;
  liveSpot?: number;
  onPriceClick: (e: React.MouseEvent, strikePrice: number, optionType: 'CE' | 'PE', lastPrice: number, instrumentKey?: string | null) => void;
}) {
  const { strikes, atm, symbol, expiry } = data;
  const atmRowRef = useRef<HTMLTableRowElement | null>(null);
  const scrolledRef = useRef(false);
  const [viewMode, setViewMode] = useState<'LTP' | 'OI'>('LTP');

  /* Auto-scroll the ATM strike into view once on initial render.
     We use a flag so that switching expiry re-triggers the scroll. */
  useEffect(() => {
    if (atmRowRef.current && !scrolledRef.current) {
      atmRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolledRef.current = true;
    }
  }, [atm]);

  // Reset scroll flag when expiry changes
  useEffect(() => {
    scrolledRef.current = false;
  }, [expiry]);

  // Build the strike overview URL — clicking the strike price opens a focused page
  const strikeHref = (strike: number) =>
    `/optionchain/strike?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}&strike=${strike}`;

  // Recompute ITM/OTM using live spot if available
  const effectiveSpot = liveSpot && liveSpot > 0 ? liveSpot : data.spot;

  // Find where the spot price line should be inserted (between which two strikes)
  const spotLineInsertIndex = strikes.findIndex((row) => row.strikePrice > effectiveSpot);

  return (
    <div className="overflow-x-auto">
      {/* LTP / OI Toggle */}
      <div className="relative flex items-center justify-center py-2.5 border-b border-border bg-bg-surface-alt">
        <span className="text-[11px] font-medium text-text-tertiary mr-2">View:</span>
        <div className="relative inline-flex items-center bg-bg-surface rounded-full p-0.5">
          <span
            className={cn(
              'absolute inset-y-0.5 rounded-full bg-brand-primary/20 transition-all duration-300 ease-out',
              viewMode === 'LTP' ? 'left-0.5 w-[calc(50%-2px)]' : 'left-[calc(50%+1px)] w-[calc(50%-2px)]'
            )}
          />
          <button
            onClick={() => setViewMode('LTP')}
            className={cn(
              'relative z-10 px-4 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors duration-200',
              viewMode === 'LTP'
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            LTP
          </button>
          <button
            onClick={() => setViewMode('OI')}
            className={cn(
              'relative z-10 px-4 py-1 rounded-full text-[11px] font-bold tracking-wide transition-colors duration-200',
              viewMode === 'OI'
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            OI
          </button>
        </div>
      </div>

      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="bg-bg-surface-alt text-text-secondary border-b border-border">
            {/* CALL side */}
            <th colSpan={2} className="px-2 sm:px-3 py-2 text-center text-profit-green font-semibold border-r border-border">
              CALLS
            </th>
            <th rowSpan={2} className="px-2 sm:px-3 py-2 text-center font-semibold text-text-primary border-r border-border">
              STRIKE
            </th>
            {/* PUT side */}
            <th colSpan={2} className="px-2 sm:px-3 py-2 text-center text-loss-red font-semibold">
              PUTS
            </th>
          </tr>
          <tr className="bg-bg-surface-alt text-text-tertiary border-b border-border text-[10px] sm:text-[11px] uppercase tracking-wide">
            {viewMode === 'LTP' ? (
              <>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">IV</th>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium border-r border-border">LTP</th>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">LTP</th>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">IV</th>
              </>
            ) : (
              <>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">OI</th>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium border-r border-border">Vol</th>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">Vol</th>
                <th className="px-1.5 sm:px-2 py-1.5 text-right font-medium">OI</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {strikes.map((row, idx) => {
            // Recompute ITM status from live spot
            const diff = effectiveSpot - row.strikePrice;
            const itm = diff > 0 ? 'CE' : diff < 0 ? 'PE' : null;
            const isAtm = row.strikePrice === atm;
            const isCeItm = itm === 'CE';
            const isPeItm = itm === 'PE';

            // Live ticks for CE / PE
            const ceTick = row.ce.instrumentKey ? quotes[row.ce.instrumentKey] : undefined;
            const peTick = row.pe.instrumentKey ? quotes[row.pe.instrumentKey] : undefined;
            const ceLtp = ceTick?.ltp ?? row.ce.lastPrice;
            const peLtp = peTick?.ltp ?? row.pe.lastPrice;
            const ceOi = ceTick?.oi ?? row.ce.oi;
            const peOi = peTick?.oi ?? row.pe.oi;
            const ceVol = ceTick?.volume ?? row.ce.volume;
            const peVol = peTick?.volume ?? row.pe.volume;
            const ceChange = ceTick?.change ?? row.ce.change;
            const peChange = peTick?.change ?? row.pe.change;
            const ceUp = ceChange >= 0;
            const peUp = peChange >= 0;
            const ceLive = !!ceTick?.timestamp && Date.now() - ceTick.timestamp < 30000;
            const peLive = !!peTick?.timestamp && Date.now() - peTick.timestamp < 30000;

            // Insert spot price row before this strike if applicable
            const showSpotLine = spotLineInsertIndex === idx && spotLineInsertIndex > 0;

            return (
              <React.Fragment key={row.strikePrice}>
                {/* ---- SPOT PRICE HORIZONTAL LINE ---- */}
                {showSpotLine && (
                  <tr className="bg-bg-surface-alt/80">
                    <td colSpan={5} className="relative px-0 py-0">
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-1">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-bg-surface border border-brand-primary/20 text-[10px] sm:text-[11px] font-bold text-brand-primary tracking-wide whitespace-nowrap shadow-sm">
                          <span className="inline-flex h-1 w-1 rounded-full bg-brand-primary animate-pulse" />
                          Spot {formatNumber(effectiveSpot, 2)}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />
                      </div>
                    </td>
                  </tr>
                )}
                <tr
                  ref={isAtm ? atmRowRef : undefined}
                  className={cn(
                    'border-b border-border/40 transition-colors hover:bg-bg-surface-alt/40',
                    isAtm && 'bg-brand-primary/[0.06] ring-1 ring-inset ring-brand-primary/20'
                  )}
                >
                  {/* CALL side — columns change based on viewMode */}
                  {viewMode === 'LTP' ? (
                    <>
                      {/* IV */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                        isCeItm && 'bg-profit-green/[0.06]'
                      )}>
                        {row.ce.iv.toFixed(1)}
                      </td>
                      {/* LTP — clickable */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums font-semibold border-r border-border',
                        isCeItm ? 'text-profit-green bg-profit-green/[0.06]' : 'text-text-primary'
                      )}>
                        <button
                          onClick={(e) => onPriceClick(e, row.strikePrice, 'CE', ceLtp, row.ce.instrumentKey)}
                          className="inline-flex items-center hover:opacity-80 transition-opacity rounded px-1 py-0.5 -mx-1 cursor-pointer"
                          title="Tap to place order"
                        >
                          <span className={cn(ceUp ? 'text-profit-green' : 'text-loss-red', 'text-[10px] mr-1')}>
                            {ceUp ? '▲' : '▼'}
                          </span>
                          {formatNumber(ceLtp, 2)}
                          {ceLive && (
                            <span className="ml-0.5 inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse align-middle" />
                          )}
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* OI */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                        isCeItm && 'bg-profit-green/[0.06]'
                      )}>
                        {formatOi(ceOi)}
                      </td>
                      {/* Volume */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-tertiary border-r border-border',
                        isCeItm && 'bg-profit-green/[0.06]'
                      )}>
                        {formatOi(ceVol)}
                      </td>
                    </>
                  )}

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

                  {/* PUT side — columns change based on viewMode */}
                  {viewMode === 'LTP' ? (
                    <>
                      {/* LTP — clickable */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums font-semibold',
                        isPeItm ? 'text-loss-red bg-loss-red/[0.06]' : 'text-text-primary'
                      )}>
                        <button
                          onClick={(e) => onPriceClick(e, row.strikePrice, 'PE', peLtp, row.pe.instrumentKey)}
                          className="inline-flex items-center hover:opacity-80 transition-opacity rounded px-1 py-0.5 -mx-1 cursor-pointer"
                          title="Tap to place order"
                        >
                          {formatNumber(peLtp, 2)}
                          <span className={cn(peUp ? 'text-profit-green' : 'text-loss-red', 'text-[10px] ml-1')}>
                            {peUp ? '▲' : '▼'}
                          </span>
                          {peLive && (
                            <span className="ml-0.5 inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse align-middle" />
                          )}
                        </button>
                      </td>
                      {/* IV */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                        isPeItm && 'bg-loss-red/[0.06]'
                      )}>
                        {row.pe.iv.toFixed(1)}
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Volume */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-tertiary',
                        isPeItm && 'bg-loss-red/[0.06]'
                      )}>
                        {formatOi(peVol)}
                      </td>
                      {/* OI */}
                      <td className={cn(
                        'px-1.5 sm:px-2 py-2 text-right font-mono tabular-nums text-text-secondary',
                        isPeItm && 'bg-loss-red/[0.06]'
                      )}>
                        {formatOi(peOi)}
                      </td>
                    </>
                  )}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
