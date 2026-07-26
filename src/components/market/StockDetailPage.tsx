'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LiveDot } from '@/components/shared/common';
import { formatNumber, getPnlColor, cn } from '@/lib/utils';
import {
  ArrowUp,
  ArrowDown,
  BarChart3,
  Eye,
  EyeOff,
  Star,
  StarOff,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  DollarSign,
  Clock,
} from 'lucide-react';
import type { Stock } from '@/types';

interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

type Timeframe = '1D' | '1W' | '1M' | '3M';

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M'];

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
  return { yearLow, yearHigh, mcap, peRatio, divYield, beta };
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
        `/api/market/stock/${symbol}/chart?tf=${timeframe}`,
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
    setInWatchlist(!prevState); // optimistic
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
        if (!data.success) {
          setInWatchlist(prevState); // revert
        }
      }
    } catch (err) {
      setInWatchlist(prevState); // revert
      console.error('Watchlist toggle error:', err);
    } finally {
      setWatchlistToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-bg-surface" />
        <div className="h-72 animate-pulse rounded-lg bg-bg-surface" />
        <div className="h-48 animate-pulse rounded-lg bg-bg-surface" />
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl',
              isUp ? 'bg-profit-green/10' : 'bg-loss-red/10'
            )}
          >
            {isUp ? (
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-profit-green" />
            ) : (
              <TrendingDown className="h-6 w-6 sm:h-7 sm:w-7 text-loss-red" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {stock.symbol}
            </h1>
            <p className="text-sm text-text-secondary truncate mt-0.5">
              {stock.name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="rounded-md bg-bg-surface-alt px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                {stock.exchange || 'NSE'}
              </span>
              {stock.sector && (
                <span className="rounded-md bg-bg-surface-alt px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {stock.sector}
                </span>
              )}
              <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 text-[10px] font-medium text-brand-primary">
                {stock.segment || 'EQUITY'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleWatchlist}
            disabled={watchlistToggling}
            className={cn(
              'h-10 px-3',
              inWatchlist
                ? 'border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20'
                : 'text-text-secondary'
            )}
            aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Star className={cn('h-4 w-4 mr-1.5', inWatchlist && 'fill-accent-gold')} />
            <span className="text-xs font-medium">
              {inWatchlist ? 'Watching' : 'Watch'}
            </span>
          </Button>
          <a href={`/trade?symbol=${stock.symbol}`} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto h-10 px-4 bg-profit-green hover:bg-profit-green/90 text-white font-semibold">
              BUY
            </Button>
          </a>
          <a href={`/trade?symbol=${stock.symbol}&side=SELL`} className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto h-10 px-4 bg-loss-red hover:bg-loss-red/90 text-white font-semibold">
              SELL
            </Button>
          </a>
        </div>
      </div>

      {/* Price + Chart */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          {/* Price row */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
              ₹{formatNumber(ltp)}
            </p>
            <div className="flex items-center gap-1.5 pb-1">
              <LiveDot isLive={isUp} />
              <span
                className={cn(
                  'font-mono text-base sm:text-lg font-semibold tabular-nums',
                  getPnlColor(changePct)
                )}
              >
                {isUp ? '+' : ''}{formatNumber(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
              {isUp ? (
                <ArrowUp className="h-4 w-4 text-profit-green" />
              ) : (
                <ArrowDown className="h-4 w-4 text-loss-red" />
              )}
            </div>
            <span className="ml-auto text-[10px] text-text-secondary">
              <Clock className="inline h-3 w-3 mr-1" />
              As of {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Timeframe selector */}
          <div className="mt-4 flex items-center gap-1 border-b border-border-default">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  timeframe === tf
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Candlestick chart */}
          <div className="mt-4">
            {chartLoading ? (
              <div className="h-56 sm:h-72 animate-pulse rounded-lg bg-bg-surface-alt" />
            ) : candles.length === 0 ? (
              <div className="flex h-56 sm:h-72 items-center justify-center rounded-lg border border-dashed border-border-default">
                <p className="text-sm text-text-secondary">No chart data available</p>
              </div>
            ) : (
              <CandlestickChart candles={candles} isUp={isUp} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* OHLC + Volume grid */}
      <div className="grid gap-4 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-text-secondary" />
              Price Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatBox label="Open"  value={`₹${formatNumber(stock.open ?? 0)}`} />
              <StatBox label="High"  value={`₹${formatNumber(stock.high ?? 0)}`} accent="text-profit-green" />
              <StatBox label="Low"   value={`₹${formatNumber(stock.low ?? 0)}`}  accent="text-loss-red" />
              <StatBox label="Prev Close" value={`₹${formatNumber(stock.close ?? 0)}`} />
              <StatBox label="Volume"   value={formatNumber(stock.volume ?? 0, 0)} />
              <StatBox label="Lot Size" value={String(stock.lotSize)} />
              <StatBox label="52W High" value={`₹${formatNumber(extra.yearHigh)}`} accent="text-profit-green" />
              <StatBox label="52W Low"  value={`₹${formatNumber(extra.yearLow)}`}  accent="text-loss-red" />
            </div>

            {/* 52W range slider */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-[10px] text-text-secondary mb-1.5">
                <span>52-Week Range</span>
                <span className="font-mono">
                  ₹{formatNumber(extra.yearLow)} — ₹{formatNumber(extra.yearHigh)}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-bg-surface-alt overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-loss-red via-warning-amber to-profit-green"
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
            </div>
          </CardContent>
        </Card>

        {/* Fundamentals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-text-secondary" />
              Fundamentals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <FundamentalRow
                icon={DollarSign}
                label="Market Cap"
                value={`₹${formatNumber(extra.mcap, 0)} Cr`}
              />
              <FundamentalRow
                icon={BarChart3}
                label="P/E Ratio"
                value={extra.peRatio.toFixed(2)}
              />
              <FundamentalRow
                icon={TrendingUp}
                label="Div Yield"
                value={`${extra.divYield.toFixed(2)}%`}
              />
              <FundamentalRow
                icon={Activity}
                label="Beta (1Y)"
                value={extra.beta.toFixed(2)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-base p-2.5 sm:p-3">
      <p className="text-[10px] sm:text-xs text-text-secondary">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-sm sm:text-base font-semibold tabular-nums',
          accent || 'text-text-primary'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FundamentalRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-secondary" />
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
        {value}
      </span>
    </div>
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

  // 5 horizontal gridlines
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const p = yMin + (yRange * i) / 4;
    return { y: y(p), price: p };
  });

  // Area path under close prices
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
            <stop
              offset="0%"
              stopColor={isUp ? '#10b981' : '#ef4444'}
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor={isUp ? '#10b981' : '#ef4444'}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Gridlines + Y-axis labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={g.y}
              x2={padding.left + innerW}
              y2={g.y}
              stroke="currentColor"
              className="text-border-default"
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

        {/* Area fill under line */}
        <path d={areaFill} fill="url(#areaFill)" />

        {/* Candles */}
        {candles.map((c, i) => {
          const cx = x(i);
          const up = c.c >= c.o;
          const color = up ? '#10b981' : '#ef4444';
          const bodyTop = y(Math.max(c.o, c.c));
          const bodyBot = y(Math.min(c.o, c.c));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={cx}
                y1={y(c.h)}
                x2={cx}
                y2={y(c.l)}
                stroke={color}
                strokeWidth="1"
              />
              {/* Body */}
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

        {/* Last price marker */}
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
