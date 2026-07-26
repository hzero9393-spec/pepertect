'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, cn } from '@/lib/utils';
import {
  ArrowUp,
  ArrowDown,
  Search,
  Plus,
  Trash2,
  Layers,
  Wallet,
  Loader2,
  CheckCircle2,
  XCircle,
  Minus,
} from 'lucide-react';
import type { Stock } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';

const POPULAR_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN',
  'BHARTIARTL', 'ITC', 'HINDUNILVR', 'KOTAKBANK', 'LT', 'AXISBANK',
  'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'WIPRO', 'HCLTECH', 'SUNPHARMA',
  'TITAN', 'ADANIENT',
];

const MOCK_LTP: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
  HINDUNILVR: 2534.10, KOTAKBANK: 1789.30, LT: 3542.65, AXISBANK: 1168.40,
  BAJFINANCE: 7234.50, MARUTI: 12450.80, TATAMOTORS: 978.35, WIPRO: 572.60,
  HCLTECH: 1712.40, SUNPHARMA: 1824.15, TITAN: 3568.90, ADANIENT: 2890.45,
};

interface BasketLeg {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

let legCounter = 0;
function newLegId(): string {
  legCounter += 1;
  return `leg-${Date.now()}-${legCounter}`;
}

export function BasketPage() {
  const { user, token } = useAuthStore();
  const [legs, setLegs] = useState<BasketLeg[]>([
    {
      id: newLegId(),
      symbol: 'RELIANCE',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 10,
    },
    {
      id: newLegId(),
      symbol: 'TCS',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 5,
    },
  ]);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [portfolioBalance, setPortfolioBalance] = useState<number>(user?.virtualCapital ?? 100000);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    created?: Array<{ id: string; symbol: string; side: string; status: string }>;
    failed?: Array<{ symbol: string; error: string }>;
  } | null>(null);

  // Search for stocks
  useEffect(() => {
    if (!searchSymbol || !token) {
      setSearchResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/market/search?q=${encodeURIComponent(searchSymbol)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
        );
        const data = await res.json();
        if (data.success) setSearchResults(data.data?.slice(0, 6) ?? []);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [searchSymbol, token]);

  // Fetch portfolio for available balance display
  useEffect(() => {
    if (!token) return;
    fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPortfolioBalance(d.data.availableMargin ?? user?.virtualCapital ?? 100000);
      })
      .catch(() => {});
  }, [token, user]);

  const addLeg = (symbol: string) => {
    setLegs((prev) => [
      ...prev,
      {
        id: newLegId(),
        symbol: symbol.toUpperCase(),
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1,
      },
    ]);
    setSearchSymbol('');
    setSearchResults([]);
  };

  const updateLeg = (id: string, patch: Partial<BasketLeg>) => {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLeg = (id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const clearAll = () => setLegs([]);

  // Compute totals
  const totals = useMemo(() => {
    let buyValue = 0;
    let sellValue = 0;
    let buyCount = 0;
    let sellCount = 0;
    for (const leg of legs) {
      const ltp = MOCK_LTP[leg.symbol] ?? (leg.price ?? 0);
      const value = ltp * leg.quantity;
      if (leg.side === 'BUY') {
        buyValue += value;
        buyCount += 1;
      } else {
        sellValue += value;
        sellCount += 1;
      }
    }
    return {
      buyValue,
      sellValue,
      netValue: buyValue - sellValue,
      buyCount,
      sellCount,
      totalLegs: legs.length,
    };
  }, [legs]);

  const insufficientMargin = totals.netValue > portfolioBalance;

  const handleSubmit = async () => {
    if (legs.length === 0) return;
    if (insufficientMargin) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/orders/basket', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: legs.map((l) => ({
            symbol: l.symbol.toUpperCase(),
            side: l.side,
            orderType: l.orderType,
            quantity: l.quantity,
            price: l.orderType === 'LIMIT' ? l.price : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          message: data.message || 'Basket placed successfully',
          created: data.data?.created,
          failed: data.data?.failed,
        });
        // Clear legs on success
        if ((data.data?.failed?.length ?? 0) === 0) {
          setLegs([]);
        } else {
          // Keep only failed legs in the basket so user can retry
          const failedSymbols = new Set((data.data?.failed ?? []).map((f) => f.symbol));
          setLegs((prev) => prev.filter((l) => failedSymbols.has(l.symbol.toUpperCase())));
        }
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to place basket',
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ============== HEADER ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-tint-purple shrink-0">
            <Layers className="h-7 w-7 text-info-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              Basket Order
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Place multiple stock orders in a single click · Max 20 legs
            </p>
          </div>
          {legs.length > 0 && (
            <button
              onClick={clearAll}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-surface-alt hover:text-loss-red"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat
            label="Total Legs"
            value={String(totals.totalLegs)}
            subtext={`${totals.buyCount} BUY · ${totals.sellCount} SELL`}
            tint="bg-tint-blue"
            color="text-brand-primary"
          />
          <SummaryStat
            label="Buy Value"
            value={`₹${formatNumber(totals.buyValue, 2)}`}
            subtext={`${totals.buyCount} leg(s)`}
            tint="bg-tint-green"
            color="text-profit-green"
          />
          <SummaryStat
            label="Sell Value"
            value={`₹${formatNumber(totals.sellValue, 2)}`}
            subtext={`${totals.sellCount} leg(s)`}
            tint="bg-tint-red"
            color="text-loss-red"
          />
          <SummaryStat
            label="Net Required"
            value={`₹${formatNumber(Math.max(0, totals.netValue), 2)}`}
            subtext={
              insufficientMargin
                ? '⚠ Insufficient margin'
                : `of ₹${formatNumber(portfolioBalance, 0)} available`
            }
            tint={insufficientMargin ? 'bg-tint-red' : 'bg-tint-yellow'}
            color={insufficientMargin ? 'text-loss-red' : 'text-accent-gold'}
          />
        </div>
      </div>

      {/* ============== ADD LEG ============== */}
      <div className="card-soft p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">Add Leg</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Search company or paste symbol (e.g. RELIANCE)"
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
            className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-mono font-medium text-text-primary placeholder:font-sans placeholder:font-normal placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-lg border border-border bg-bg-surface overflow-hidden">
            {searchResults.map((s) => (
              <button
                key={s.id}
                onClick={() => addLeg(s.symbol)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bg-surface-alt transition-colors text-left border-b border-border last:border-b-0"
              >
                <StockLogo symbol={s.symbol} size="sm" rounded="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold text-text-primary">{s.symbol}</p>
                  <p className="text-xs text-text-secondary truncate">{s.name}</p>
                </div>
                <Plus className="h-4 w-4 text-brand-primary shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Quick add chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
          {POPULAR_STOCKS.slice(0, 12).map((s) => (
            <button
              key={s}
              onClick={() => addLeg(s)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border border-border text-text-secondary hover:border-brand-primary hover:text-brand-primary hover:bg-tint-blue transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* ============== BASKET LEGS ============== */}
      <div className="card-soft p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">
            Basket Legs ({legs.length})
          </h3>
        </div>

        {legs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-surface-alt mb-3">
              <Layers className="h-7 w-7 text-text-secondary" />
            </div>
            <p className="text-sm font-medium text-text-primary">Your basket is empty</p>
            <p className="text-xs text-text-secondary mt-1">
              Search above or tap a popular stock to add your first leg.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {legs.map((leg) => (
              <BasketLegRow
                key={leg.id}
                leg={leg}
                onUpdate={(patch) => updateLeg(leg.id, patch)}
                onRemove={() => removeLeg(leg.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============== RESULT BANNER ============== */}
      {result && (
        <div
          className={cn(
            'card-soft p-5 border-l-4 relative overflow-hidden',
            result.success ? 'border-l-profit-green' : 'border-l-loss-red'
          )}
        >
          {/* Decorative gradient wash for success */}
          {result.success && (result.failed?.length ?? 0) === 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-tint-green/30 via-transparent to-tint-blue/20 pointer-events-none" />
          )}
          <div className="relative flex items-start gap-3">
            {result.success ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tint-green shrink-0">
                <CheckCircle2 className="h-6 w-6 text-profit-green" />
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tint-red shrink-0">
                <XCircle className="h-6 w-6 text-loss-red" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-base font-bold text-text-primary">
                {result.success
                  ? `${result.created?.length ?? 0}/${(result.created?.length ?? 0) + (result.failed?.length ?? 0)} leg(s) placed successfully`
                  : 'Basket failed'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {result.success && (result.failed?.length ?? 0) === 0
                  ? 'All orders executed. View them in the Orders tab.'
                  : result.success
                    ? `${result.failed?.length ?? 0} leg(s) could not be placed — see details below.`
                    : result.message}
              </p>

              {/* Compact summary chips when all succeeded */}
              {result.success && (result.failed?.length ?? 0) === 0 && result.created && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(() => {
                    const buyCount = result.created!.filter((c) => c.side === 'BUY').length;
                    const sellCount = result.created!.filter((c) => c.side === 'SELL').length;
                    return (
                      <>
                        {buyCount > 0 && (
                          <span className="pill bg-tint-green text-profit-green font-semibold">
                            ▲ {buyCount} BUY
                          </span>
                        )}
                        {sellCount > 0 && (
                          <span className="pill bg-tint-red text-loss-red font-semibold">
                            ▼ {sellCount} SELL
                          </span>
                        )}
                        <span className="pill bg-bg-surface-alt text-text-secondary font-semibold">
                          {result.created!.length} filled
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Failed legs — only shown when there are failures */}
              {result.failed && result.failed.length > 0 && (
                <div className="mt-3 rounded-lg border border-loss-red/30 bg-loss-red/[0.06] p-2.5 space-y-1">
                  <p className="text-[11px] font-semibold text-loss-red uppercase tracking-wide">
                    Failed legs ({result.failed.length})
                  </p>
                  {result.failed.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-text-primary">{f.symbol}</span>
                      <span className="text-loss-red">— {f.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-text-tertiary hover:text-text-primary hover:bg-bg-surface-alt"
            >
              Dismiss
            </button>
          </div>

          {/* Quick action: view orders */}
          {result.success && (result.failed?.length ?? 0) === 0 && (
            <a
              href="/trade"
              className="relative mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-surface-alt transition-colors"
            >
              View Orders →
            </a>
          )}
        </div>
      )}

      {/* ============== PLACE BASKET CTA (sticky on mobile) ============== */}
      {legs.length > 0 && (
        <div className="card-soft p-3 sticky bottom-[80px] z-10 md:static">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2">
              <Wallet className="h-4 w-4 text-text-secondary" />
              <span className="text-xs text-text-secondary">Net: ₹{formatNumber(Math.max(0, totals.netValue), 2)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || insufficientMargin}
              className={cn(
                'flex-1 h-12 rounded-lg text-white font-bold uppercase text-sm flex items-center justify-center gap-2 transition-colors',
                insufficientMargin
                  ? 'bg-loss-red/50 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary/90'
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing {legs.length} Order(s)...
                </>
              ) : insufficientMargin ? (
                'Insufficient Margin'
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Place {legs.length} Order(s)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  subtext,
  tint,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  tint: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-base p-3">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium text-text-secondary">{label}</p>
        <div className={cn('icon-tile-sm', tint)}>
          <Wallet className={cn('h-3.5 w-3.5', color)} />
        </div>
      </div>
      <p className="mt-1 font-mono text-base font-bold tabular-nums text-text-primary">{value}</p>
      {subtext && <p className="text-[10px] text-text-tertiary mt-0.5">{subtext}</p>}
    </div>
  );
}

function BasketLegRow({
  leg,
  onUpdate,
  onRemove,
}: {
  leg: BasketLeg;
  onUpdate: (patch: Partial<BasketLeg>) => void;
  onRemove: () => void;
}) {
  const ltp = MOCK_LTP[leg.symbol] ?? 0;
  const value = ltp * leg.quantity;

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <StockLogo symbol={leg.symbol} size="md" rounded="md" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-text-primary">{leg.symbol}</p>
          <p className="text-[11px] text-text-secondary">
            LTP ₹{formatNumber(ltp, 2)} · Value ₹{formatNumber(value, 2)}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-tint-red hover:text-loss-red transition-colors shrink-0"
          aria-label="Remove leg"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Side toggle */}
        <div>
          <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Side</label>
          <div className="mt-1 flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => onUpdate({ side: 'BUY' })}
              className={cn(
                'flex-1 h-9 text-xs font-bold flex items-center justify-center gap-1 transition-colors',
                leg.side === 'BUY'
                  ? 'bg-profit-green text-white'
                  : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface-alt/70'
              )}
            >
              <ArrowUp className="h-3 w-3" />
              BUY
            </button>
            <button
              onClick={() => onUpdate({ side: 'SELL' })}
              className={cn(
                'flex-1 h-9 text-xs font-bold flex items-center justify-center gap-1 transition-colors',
                leg.side === 'SELL'
                  ? 'bg-loss-red text-white'
                  : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface-alt/70'
              )}
            >
              <ArrowDown className="h-3 w-3" />
              SELL
            </button>
          </div>
        </div>

        {/* Order type */}
        <div>
          <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Type</label>
          <select
            value={leg.orderType}
            onChange={(e) => onUpdate({ orderType: e.target.value as 'MARKET' | 'LIMIT' })}
            className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-bg-surface-alt text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            <option value="MARKET">MARKET</option>
            <option value="LIMIT">LIMIT</option>
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Qty</label>
          <div className="mt-1 flex items-center rounded-lg border border-border bg-bg-surface-alt overflow-hidden">
            <button
              onClick={() => onUpdate({ quantity: Math.max(1, leg.quantity - 1) })}
              className="h-9 w-9 flex items-center justify-center text-text-secondary hover:bg-bg-surface-alt/70 shrink-0"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              value={leg.quantity}
              min={1}
              onChange={(e) => onUpdate({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full h-9 text-center bg-transparent text-sm font-mono font-semibold text-text-primary focus:outline-none"
            />
            <button
              onClick={() => onUpdate({ quantity: leg.quantity + 1 })}
              className="h-9 w-9 flex items-center justify-center text-text-secondary hover:bg-bg-surface-alt/70 shrink-0"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Price (only for LIMIT) */}
        <div>
          <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
            Price {leg.orderType === 'MARKET' && '(LTP)'}
          </label>
          <input
            type="number"
            value={leg.orderType === 'MARKET' ? ltp : (leg.price ?? ltp)}
            disabled={leg.orderType === 'MARKET'}
            onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
            className="mt-1 w-full h-9 px-2 rounded-lg border border-border bg-bg-surface-alt text-xs font-mono font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
