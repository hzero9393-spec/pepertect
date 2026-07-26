'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, getPnlColor, cn } from '@/lib/utils';
import {
  ArrowUp,
  ArrowDown,
  BarChart3,
  Star,
  TrendingUp,
  Activity,
  Layers,
  DollarSign,
  Clock,
  Share2,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import type { Stock } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';

interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

// Mock 52-week range & market cap — deterministic per symbol
function getExtraStats(symbol: string, ltp: number) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  const rng = (n: number) => Math.abs(Math.sin(h + n) * 10000) % 1;
  const yearLow  = parseFloat((ltp * (0.65 + rng(1) * 0.15)).toFixed(2));
  const yearHigh = parseFloat((ltp * (1.20 + rng(2) * 0.25)).toFixed(2));
  const sharesOut = Math.floor(1e7 + rng(3) * 5e9);
  const mcap = parseFloat((ltp * sharesOut / 1e7).toFixed(2)); // in ₹ Cr
  const peRatio = parseFloat((15 + rng(4) * 35).toFixed(2));
  const divYield = parseFloat((rng(5) * 3.5).toFixed(2));
  const beta = parseFloat((0.6 + rng(6) * 1.3).toFixed(2));
  // Mock period returns
  const returns: Record<string, number> = {
    '1D': ((rng(7) - 0.5) * 4),
    '1W': ((rng(8) - 0.4) * 6),
    '1M': ((rng(9) - 0.3) * 12),
    '3M': ((rng(10) - 0.2) * 25),
    '1Y': ((rng(11) - 0.1) * 50),
    '5Y': (rng(12) * 100),
  };
  return { yearLow, yearHigh, mcap, peRatio, divYield, beta, returns };
}

export function StockDetailPage() {
  const { token } = useAuthStore();
  const [stock, setStock] = useState<Stock | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistToggling, setWatchlistToggling] = useState(false);

  const symbol = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    return path.split('/stock/')[1] || '';
  }, []);

  const fetchStock = useCallback(async () => {
    if (!symbol || !token) return;
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
  }, [symbol, token]);

  const fetchChart = useCallback(async () => {
    if (!symbol || !token) return;
    setChartLoading(true);
    try {
      const res = await fetch(
        `/api/market/stock/${symbol}/chart?tf=${timeframe === '5Y' || timeframe === '1Y' ? '3M' : timeframe}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setCandles(data.data);
    } catch (err) {
      console.error('Chart fetch error:', err);
    } finally {
      setChartLoading(false);
    }
  }, [symbol, token, timeframe]);

  const fetchWatchlistStatus = useCallback(async () => {
    if (!symbol || !token) return;
    try {
      const res = await fetch(
        `/api/watchlist/has?symbol=${symbol}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setInWatchlist(data.data.inWatchlist);
    } catch (err) {
      console.error('Watchlist status error:', err);
    }
  }, [symbol, token]);

  useEffect(() => {
    fetchStock();
    fetchWatchlistStatus();
  }, [fetchStock, fetchWatchlistStatus]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const toggleWatchlist = async () => {
    if (!symbol || !token) return;
    setWatchlistToggling(true);
    const prevState = inWatchlist;
    setInWatchlist(!prevState);
    try {
      if (prevState) {
        await fetch(`/api/watchlist/${symbol}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol }),
        });
        const data = await res.json();
        if (!data.success) setInWatchlist(prevState);
      }
    } catch (err) {
      setInWatchlist(prevState);
      console.error('Watchlist toggle error:', err);
    } finally {
      setWatchlistToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-bg-surface" />
        <div className="h-72 animate-pulse rounded-2xl bg-bg-surface" />
        <div className="h-48 animate-pulse rounded-2xl bg-bg-surface" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-12 w-12 text-text-secondary mb-3" />
        <p className="text-text-secondary">Stock not found</p>
        <a href="/market" className="mt-3 text-sm text-brand-primary hover:underline">
          Browse all stocks
        </a>
      </div>
    );
  }

  const ltp = stock.ltp ?? 0;
  const change = stock.change ?? 0;
  const changePct = stock.changePct ?? 0;
  const isUp = changePct >= 0;
  const extra = getExtraStats(stock.symbol, ltp);

  return (
    <div className="space-y-4">
      {/* ============== BACK BUTTON (mobile) ============== */}
      <a
        href="/market"
        className="md:hidden inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </a>

      {/* ============== STOCK IDENTITY + PRIMARY CTA ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start gap-3">
          <StockLogo
            symbol={stock.symbol}
            size="xl"
            rounded="lg"
            className="ring-1 ring-border shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {stock.symbol}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary truncate mt-0.5">
              {stock.name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="pill bg-tint-blue text-brand-primary inline-flex items-center gap-1">
                <span className="text-[10px]">🇮🇳</span>
                {stock.exchange || 'NSE'}
              </span>
              {stock.sector && (
                <span className="pill bg-bg-surface-alt text-text-secondary">{stock.sector}</span>
              )}
              <span className="pill bg-tint-green text-profit-green">Large Cap</span>
            </div>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg-surface-alt shrink-0"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Watchlist + BUY/SELL row */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={toggleWatchlist}
            disabled={watchlistToggling}
            className={cn(
              'flex h-11 items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-sm font-semibold transition-colors',
              inWatchlist
                ? 'border-accent-gold bg-tint-yellow text-accent-gold'
                : 'border-brand-primary bg-bg-surface text-brand-primary hover:bg-tint-blue'
            )}
            aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {inWatchlist ? (
              <Star className="h-4 w-4 fill-accent-gold" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{inWatchlist ? 'Watching' : 'Watchlist'}</span>
          </button>
          <a href={`/trade?symbol=${stock.symbol}`} className="flex-1">
            <button className="w-full h-11 rounded-lg bg-profit-green text-white font-bold uppercase text-sm flex items-center justify-center gap-1.5 hover:bg-profit-green/90">
              <ArrowUp className="h-4 w-4" />
              BUY
            </button>
          </a>
          <a href={`/trade?symbol=${stock.symbol}&side=SELL`} className="flex-1">
            <button className="w-full h-11 rounded-lg bg-loss-red text-white font-bold uppercase text-sm flex items-center justify-center gap-1.5 hover:bg-loss-red/90">
              <ArrowDown className="h-4 w-4" />
              SELL
            </button>
          </a>
        </div>
      </div>

      {/* ============== PRICE CARD (with sparkline + OHLC) ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-end gap-3">
              <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
                ₹{formatNumber(ltp)}
              </p>
              {/* Mini sparkline next to price */}
              <SparklineInline positive={isUp} symbol={stock.symbol} />
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  'font-mono text-sm font-semibold tabular-nums',
                  getPnlColor(changePct)
                )}
              >
                {isUp ? '+' : ''}{formatNumber(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
              {isUp ? (
                <ArrowUp className="h-3.5 w-3.5 text-profit-green" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-loss-red" />
              )}
            </div>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              <Clock className="inline h-3 w-3 mr-0.5" />
              As of {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} •{' '}
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* OHLC grid 2x3 */}
        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 border-t border-border pt-3">
          <OhlcCell label="Open"  value={`₹${formatNumber(stock.open ?? 0)}`} />
          <OhlcCell label="High"  value={`₹${formatNumber(stock.high ?? 0)}`} accent="text-profit-green" />
          <OhlcCell label="Low"   value={`₹${formatNumber(stock.low ?? 0)}`} accent="text-loss-red" />
          <OhlcCell label="Close" value={`₹${formatNumber(stock.close ?? 0)}`} />
          <OhlcCell label="Volume" value={formatNumber(stock.volume ?? 0, 0)} />
          <OhlcCell label="Lot Size" value={String(stock.lotSize ?? 1)} />
        </div>
      </div>

      {/* ============== CHART CARD ============== */}
      <div className="card-soft p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Price Chart</h3>
          <div className="flex items-center gap-1">
            <button className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt" aria-label="Chart type">
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Time period tabs */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                timeframe === tf
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        {/* Chart */}
        <div className="mt-3">
          {chartLoading ? (
            <div className="h-56 sm:h-64 animate-pulse rounded-lg bg-bg-surface-alt" />
          ) : candles.length === 0 ? (
            <div className="flex h-56 sm:h-64 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-text-secondary">No chart data available</p>
            </div>
          ) : (
            <CandlestickChart candles={candles} isUp={isUp} />
          )}
        </div>
      </div>

      {/* ============== PERFORMANCE ROW ============== */}
      <div className="card-soft p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">Performance</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {TIMEFRAMES.map((tf) => {
            const r = extra.returns[tf] ?? 0;
            const positive = r >= 0;
            return (
              <div
                key={tf}
                className="shrink-0 rounded-xl border border-border bg-bg-base p-3 min-w-[78px] text-center"
              >
                <p className="text-[10px] font-medium text-text-secondary">{tf}</p>
                <p
                  className={cn(
                    'mt-1 font-mono text-sm font-bold tabular-nums',
                    positive ? 'text-profit-green' : 'text-loss-red'
                  )}
                >
                  {positive ? '+' : ''}{r.toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============== FUNDAMENTALS ============== */}
      <div className="card-soft p-4">
        <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">Fundamentals</h3>
        <div className="grid grid-cols-3 gap-3">
          <FundamentalCell
            icon={DollarSign}
            label="Market Cap"
            value={`₹${formatNumber(extra.mcap, 0)} Cr`}
          />
          <FundamentalCell
            icon={BarChart3}
            label="P/E Ratio"
            value={extra.peRatio.toFixed(2)}
          />
          <FundamentalCell
            icon={TrendingUp}
            label="52W Range"
            value={`₹${formatNumber(extra.yearLow, 0)} — ₹${formatNumber(extra.yearHigh, 0)}`}
            small
          />
        </div>

        {/* 52W range slider */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-text-secondary mb-1.5">
            <span>52-Week Range</span>
          </div>
          <div className="relative h-2 rounded-full bg-bg-surface-alt overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-loss-red via-accent-gold to-profit-green"
              style={{ width: '100%' }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-brand-primary shadow"
              style={{
                left: `calc(${
                  Math.min(
                    100,
                    Math.max(
                      0,
                      ((ltp - extra.yearLow) / (extra.yearHigh - extra.yearLow || 1)) * 100
                    )
                  )
                }% - 7px)`,
              }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-text-secondary font-mono">
            <span>₹{formatNumber(extra.yearLow)}</span>
            <span>₹{formatNumber(extra.yearHigh)}</span>
          </div>
        </div>
      </div>

      {/* ============== SECONDARY BUY/SELL (sticky bottom on mobile) ============== */}
      <div className="card-soft p-3 sticky bottom-[80px] z-10 md:static">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary hidden sm:inline">Depth</span>
          <a href={`/trade?symbol=${stock.symbol}`} className="flex-1">
            <button className="w-full h-11 rounded-lg bg-profit-green text-white font-bold uppercase text-sm flex items-center justify-center gap-1.5 hover:bg-profit-green/90">
              <ArrowUp className="h-4 w-4" />
              BUY
            </button>
          </a>
          <a href={`/trade?symbol=${stock.symbol}&side=SELL`} className="flex-1">
            <button className="w-full h-11 rounded-lg bg-loss-red text-white font-bold uppercase text-sm flex items-center justify-center gap-1.5 hover:bg-loss-red/90">
              <ArrowDown className="h-4 w-4" />
              SELL
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

function OhlcCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p
        className={cn(
          'mt-0.5 font-mono text-sm font-semibold tabular-nums',
          accent || 'text-text-primary'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FundamentalCell({
  icon: Icon,
  label,
  value,
  small,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-base p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-text-secondary" />
        <p className="text-[10px] text-text-secondary">{label}</p>
      </div>
      <p
        className={cn(
          'font-mono font-semibold tabular-nums text-text-primary',
          small ? 'text-[11px] leading-tight' : 'text-sm'
        )}
      >
        {value}
      </p>
    </div>
  );
}

// Tiny inline sparkline next to the price
function SparklineInline({ positive, symbol }: { positive: boolean; symbol: string }) {
  // Deterministic mini-series
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  const data: number[] = [];
  let v = 50;
  for (let i = 0; i < 12; i++) {
    const noise = (Math.abs(Math.sin(h + i)) * 12) - 6;
    const trend = positive ? 1.5 : -1.5;
    v = Math.max(5, Math.min(95, v + noise + trend));
    data.push(v);
  }
  const width = 80;
  const height = 36;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = innerW / (data.length - 1);
  const points = data.map((vv, i) => {
    const x = pad + i * stepX;
    const y = pad + innerH - ((vv - min) / range) * innerH;
    return [x, y] as const;
  });
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const cx = (px + x) / 2;
    const cy = (py + y) / 2;
    d += ` Q ${px} ${py} ${cx} ${cy}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  const color = positive ? '#10B981' : '#EF4444';
  const areaPath = `${d} L ${last[0]} ${height - pad} L ${pad} ${height - pad} Z`;
  const fillId = `psi-${positive ? 'g' : 'r'}-${h}`;
  return (
    <svg
      className="hidden sm:block shrink-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path d={d} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- Candlestick Chart (pure SVG, no external deps) ----------

function CandlestickChart({ candles, isUp }: { candles: Candle[]; isUp: boolean }) {
  const width = 800;
  const height = 280;
  const padding = { top: 14, right: 56, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const prices = candles.flatMap((c) => [c.h, c.l]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = range * 0.08;
  const yMin = min - pad;
  const yMax = max + pad;
  const yRange = yMax - yMin;

  const candleW = Math.max(3, (innerW / candles.length) * 0.7);
  const step = innerW / candles.length;

  const y = (p: number) => padding.top + ((yMax - p) / yRange) * innerH;
  const x = (i: number) => padding.left + i * step + step / 2;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const p = yMin + (yRange * i) / 4;
    return { y: y(p), price: p };
  });

  const areaPath = candles
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(c.c).toFixed(1)}`)
    .join(' ');
  const areaFill =
    `${areaPath} L ${x(candles.length - 1).toFixed(1)} ${(padding.top + innerH).toFixed(1)} ` +
    `L ${x(0).toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  return (
    <div className="w-full overflow-hidden rounded-lg bg-bg-base">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-56 sm:h-72"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.y}
              x2={padding.left + innerW}
              y2={g.y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 4"
              strokeWidth="0.5"
            />
            <text
              x={padding.left + innerW + 6}
              y={g.y + 3}
              textAnchor="start"
              className="fill-text-secondary"
              style={{ fontSize: '9px' }}
            >
              {formatNumber(g.price, 0)}
            </text>
          </g>
        ))}
        <path d={areaFill} fill="url(#areaFill)" />
        {candles.map((c, i) => {
          const cx = x(i);
          const up = c.c >= c.o;
          const color = up ? '#10b981' : '#ef4444';
          const bodyTop = y(Math.max(c.o, c.c));
          const bodyBot = y(Math.min(c.o, c.c));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={cx} y1={y(c.h)} x2={cx} y2={y(c.l)} stroke={color} strokeWidth="1" />
              <rect
                x={cx - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={color}
                opacity={up ? 0.85 : 0.95}
                rx="0.5"
              />
            </g>
          );
        })}
        {candles.length > 0 && (
          <g>
            <line
              x1={padding.left}
              y1={y(candles[candles.length - 1].c)}
              x2={padding.left + innerW}
              y2={y(candles[candles.length - 1].c)}
              stroke={isUp ? '#10b981' : '#ef4444'}
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
            <rect
              x={padding.left + innerW + 2}
              y={y(candles[candles.length - 1].c) - 8}
              width={50}
              height={16}
              rx="2"
              fill={isUp ? '#10b981' : '#ef4444'}
            />
            <text
              x={padding.left + innerW + 27}
              y={y(candles[candles.length - 1].c) + 3}
              textAnchor="middle"
              fill="white"
              style={{ fontSize: '9px', fontWeight: 700 }}
            >
              ₹{formatNumber(candles[candles.length - 1].c, 0)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
