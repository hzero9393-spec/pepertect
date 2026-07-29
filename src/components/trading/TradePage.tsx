'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, getPnlColor, formatOrderStatus, cn } from '@/lib/utils';
import { hasFeature } from '@/lib/tier';
import {
  ArrowUp, ArrowDown, Search, Settings, Check,
  LineChart as LineChartIcon, Layers, BarChart3,
  ChevronDown, Plus, Minus, Wallet, FileSearch, Loader2, Shield,
} from 'lucide-react';
import type { Order, Trade, Stock } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';
import { BasketPage } from '@/components/trading/BasketPage';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { getUpstoxKey } from '@/lib/upstox-instruments';
import { UpstoxReconnectBanner } from '@/components/UpstoxReconnectBanner';

const POPULAR_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN',
  'BHARTIARTL', 'ITC', 'HINDUNILVR', 'KOTAKBANK', 'LT', 'AXISBANK',
  'BAJFINANCE', 'MARUTI', 'TATAMOTORS', 'WIPRO', 'HCLTECH', 'SUNPHARMA',
  'TITAN', 'ADANIENT',
];

export function TradePage() {
  const { user, token } = useAuthStore();
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL'>('MARKET');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  /* Stop-loss and target — attached to the opened position so the PositionsPage
     can auto-square-off when LTP hits either level (paper-trading SL/TGT). */
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [showSLTarget, setShowSLTarget] = useState(false);
  const [segment, setSegment] = useState<'EQUITY' | 'FUTURES' | 'OPTIONS'>('EQUITY');
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'trades'>('orders');
  const [liveStock, setLiveStock] = useState<Stock | null>(null);
  const [showMarginBreakdown, setShowMarginBreakdown] = useState(false);
  /* Real portfolio balance — fetched from /api/portfolio so the user sees
     their actual available margin, not a hard-coded DEMO value. */
  const [portfolioBalance, setPortfolioBalance] = useState<number | null>(null);
  /* 3-way tab: place | basket | orders */
  const [mainTab, setMainTab] = useState<'place' | 'basket' | 'orders'>('place');
  /* Redirect state — when set, will redirect to /positions after delay */
  const [redirecting, setRedirecting] = useState(false);
  /* Settings panel — opens when user clicks the gear icon in the tab bar */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /* Session-only order defaults (controlled by the Settings panel) */
  const [defaultOrderType, setDefaultOrderType] = useState<'MARKET' | 'LIMIT' | 'SL'>('MARKET');
  const [defaultQty, setDefaultQty] = useState(1);
  const [confirmBefore, setConfirmBefore] = useState(false);

  /* Live WebSocket tick — subscribes to the selected symbol */
  const { quotes, subscribe, unsubscribe, status: wsStatus } = useLiveQuote();
  const subscribedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const k = symbol ? getUpstoxKey(symbol.toUpperCase()) : null;
    if (subscribedKeyRef.current && subscribedKeyRef.current !== k) {
      unsubscribe([subscribedKeyRef.current]);
      subscribedKeyRef.current = null;
    }
    if (k) {
      subscribe([k]);
      subscribedKeyRef.current = k;
    }
    return () => {
      if (subscribedKeyRef.current) {
        unsubscribe([subscribedKeyRef.current]);
        subscribedKeyRef.current = null;
      }
    };
  }, [symbol, subscribe, unsubscribe]);
  const liveTick = symbol ? quotes[getUpstoxKey(symbol.toUpperCase()) ?? ''] : undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('symbol')) setSymbol(params.get('symbol') as string);
    if (params.get('side')) setSide(params.get('side') as 'BUY' | 'SELL');
  }, []);

  // Fetch the live stock info whenever symbol changes
  useEffect(() => {
    if (!symbol || !token) {
      setLiveStock(null);
      return;
    }
    const ctrl = new AbortController();
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/market/stock/${symbol.toUpperCase()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (data.success) setLiveStock(data.data);
        else setLiveStock(null);
      } catch {
        /* ignore */
      }
    };
    const t = setTimeout(fetchStock, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [symbol, token]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [oRes, tRes, pRes] = await Promise.all([
          fetch('/api/orders', { headers }),
          fetch('/api/trades', { headers }),
          fetch('/api/portfolio', { headers }),
        ]);
        const oData = await oRes.json();
        const tData = await tRes.json();
        const pData = await pRes.json();
        if (oData.success) setOrders(oData.data);
        if (tData.success) setTrades(tData.data);
        if (pData.success && typeof pData.data?.availableMargin === 'number') {
          setPortfolioBalance(pData.data.availableMargin);
        }
      } catch (err) {
        console.error('Trade data error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleOrder = async () => {
    if (!symbol || !quantity) return;
    /* Optional confirmation dialog (controlled by Settings panel) */
    if (confirmBefore) {
      const ok = window.confirm(
        `Confirm ${side} order:\n\n${quantity} ${symbol.toUpperCase()} @ ${orderType}${orderType !== 'MARKET' && price ? ` (₹${price})` : ''}\n\nApprox. value: ₹${(qty * refPrice).toLocaleString('en-IN')}`
      );
      if (!ok) return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      /* Resolve the Upstox instrument_key for this stock so the server can
       * store it on the Position row. PositionsPage then subscribes to live
       * ticks for this EXACT instrument — no lookup needed. */
      const upstoxKey = getUpstoxKey(symbol.toUpperCase()) ?? null;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          segment,
          side,
          type: orderType,
          quantity: parseInt(quantity),
          price: orderType !== 'MARKET' ? parseFloat(price) : undefined,
          /* For MARKET EQUITY orders, pass the live LTP as the fill price so
           * the position's avgPrice = actual market price at execution time
           * (not a stale MOCK_LTP value). This matches the user's expectation
           * that "entry price = the market price I saw when I clicked BUY". */
          ...(orderType === 'MARKET' && liveTick?.ltp ? { price: liveTick.ltp } : {}),
          instrumentKey: upstoxKey,
          /* Stop-loss / target — only sent for BUY (opening a position).
             Server stores them on the Position row; PositionsPage reads them
             and triggers square-off when LTP hits either level. */
          stopLoss: side === 'BUY' && stopLoss ? parseFloat(stopLoss) : undefined,
          target: side === 'BUY' && target ? parseFloat(target) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const statusInfo = formatOrderStatus(data.data.status);
        setMessage(`${statusInfo.label} — ${side} ${quantity} ${symbol.toUpperCase()}`);
        setQuantity('1');
        setPrice('');
        setStopLoss('');
        setTarget('');
        setShowSLTarget(false);
        const oRes = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
        const oData = await oRes.json();
        if (oData.success) setOrders(oData.data);
        // Refresh the real portfolio balance so the user sees the updated margin
        try {
          const pRes2 = await fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } });
          const pData2 = await pRes2.json();
          if (pData2.success && typeof pData2.data?.availableMargin === 'number') {
            setPortfolioBalance(pData2.data.availableMargin);
          }
        } catch { /* ignore */ }

        /* ---------- Post-order flow (5x faster) ----------
           1. Switch to "Orders" tab so user sees their order at the top
           2. After 150ms (was 400ms), redirect to /positions page so the
           *    user immediately sees their new position with the entry
           *    price = the actual market price they paid, and the live
           *    stock price streaming in real-time. */
        setMainTab('orders');
        setActiveTab('orders');
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = '/positions';
        }, 150);
      } else {
        setMessage(data.error || 'Order failed');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' as const } : o)));
    } catch {
      /* ignore */
    }
  };

  const qty = parseInt(quantity) || 0;
  const refPrice = liveTick?.ltp ?? liveStock?.ltp ?? (parseFloat(price) || 0);
  const orderValue = qty * refPrice;
  // Real available margin from /api/portfolio — never falls back to a hard-coded
  // DEMO value. If the fetch hasn't completed yet, show "—" instead.
  const availableBalance = portfolioBalance;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* Upstox reconnect banner (shown when token is expired) */}
      <UpstoxReconnectBanner status={wsStatus} />

      {/* ============== REDIRECTING OVERLAY ============== */}
      {redirecting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card-soft p-6 flex flex-col items-center gap-3 max-w-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tint-blue">
              <Loader2 className="h-6 w-6 text-brand-primary animate-spin" />
            </div>
            <p className="font-heading text-sm font-bold text-text-primary">Order Placed!</p>
            <p className="text-xs text-text-secondary text-center">
              Taking you to your positions in a moment…
            </p>
          </div>
        </div>
      )}

      {/* ============== TOP TABS: Place Order | Basket | Orders ============== */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => setMainTab('place')}
          className="seg-tab"
          data-active={mainTab === 'place'}
        >
          Place Order
        </button>
        <button
          onClick={() => setMainTab('basket')}
          className="seg-tab"
          data-active={mainTab === 'basket'}
        >
          Basket
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
            Multi
          </span>
        </button>
        <button
          onClick={() => setMainTab('orders')}
          className="seg-tab"
          data-active={mainTab === 'orders'}
        >
          Orders
          <span className={cn(
            'ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
            pendingCount > 0 ? 'bg-accent-gold/20 text-accent-gold' : 'bg-bg-surface-alt text-text-secondary'
          )}>
            {orders.length}
          </span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg-surface-alt transition-colors',
            settingsOpen && 'bg-tint-blue text-brand-primary border-brand-primary/30'
          )}
          aria-label="Order settings"
          title="Order settings"
        >
          <Settings className={cn('h-4 w-4', settingsOpen && 'rotate-90 transition-transform')} />
        </button>
      </div>

      {/* Settings panel — toggles for price display, default order type, etc. */}
      {settingsOpen && (
        <div className="card-soft p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-heading text-sm font-semibold text-text-primary">Order Settings</p>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Close
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-primary">Default order type</p>
                <p className="text-[11px] text-text-secondary">Pre-selected when you open Place Order</p>
              </div>
              <select
                value={defaultOrderType}
                onChange={(e) => {
                  const v = e.target.value as 'MARKET' | 'LIMIT' | 'SL';
                  setDefaultOrderType(v);
                  setOrderType(v);
                }}
                className="bg-bg-surface-alt border border-border rounded-md px-2 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
                <option value="SL">SL (Stop-Loss)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-primary">Default quantity</p>
                <p className="text-[11px] text-text-secondary">Starting qty when placing a new order</p>
              </div>
              <input
                type="number"
                min={1}
                value={defaultQty}
                onChange={(e) => {
                  const v = Math.max(1, parseInt(e.target.value) || 1);
                  setDefaultQty(v);
                  setQuantity(String(v));
                }}
                className="w-20 bg-bg-surface-alt border border-border rounded-md px-2 py-1.5 text-xs font-semibold font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-primary">Confirm before placing</p>
                <p className="text-[11px] text-text-secondary">Show a review dialog before submitting</p>
              </div>
              <button
                onClick={() => setConfirmBefore(!confirmBefore)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  confirmBefore ? 'bg-brand-primary' : 'bg-bg-surface-alt'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    confirmBefore ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-text-tertiary pt-2 border-t border-border">
            Settings apply for this session only and reset when you reload the page.
          </p>
        </div>
      )}

      {/* 24h retention notice — only on Orders tab */}
      {mainTab === 'orders' && (
        <div className="rounded-lg bg-tint-blue/60 border border-brand-primary/20 px-3 py-2 text-xs text-text-secondary flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
          Orders from the last 24 hours are shown. Older orders are automatically removed.
        </div>
      )}

      {mainTab === 'basket' && <BasketPage />}

      {mainTab === 'place' && (
        <>
          {/* ============== ORDER ENTRY CARD ============== */}
          <div className="card-soft p-4 space-y-4">
            {/* Symbol search */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Symbol</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search company or paste symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-mono font-medium text-text-primary placeholder:font-sans placeholder:font-normal placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              {/* Horizontal scrolling chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
                {POPULAR_STOCKS.slice(0, 12).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSymbol(s)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border',
                      symbol === s
                        ? 'border-brand-primary bg-tint-blue text-brand-primary'
                        : 'border-border bg-bg-surface text-text-secondary hover:bg-bg-surface-alt'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Live stock strip — uses WebSocket live tick if available */}
            {liveStock && (
              <div className="rounded-xl border border-border bg-bg-base p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StockLogo symbol={liveStock.symbol} size="sm" rounded="md" />
                    <div>
                      <p className="font-mono text-sm font-semibold text-text-primary">{liveStock.symbol}</p>
                      <p className="text-[11px] text-text-secondary truncate max-w-[150px]">{liveStock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-mono text-base font-bold tabular-nums',
                      liveTick ? 'text-text-primary' : 'text-text-secondary'
                    )}>
                      ₹{formatNumber(liveTick?.ltp ?? liveStock.ltp ?? 0)}
                      {liveTick && (
                        <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse align-middle" />
                      )}
                    </p>
                    <p
                      className={cn(
                        'font-mono text-xs tabular-nums',
                        ((liveTick?.change ?? liveStock.change) ?? 0) >= 0 ? 'text-profit-green' : 'text-loss-red'
                      )}
                    >
                      {((liveTick?.change ?? liveStock.change) ?? 0) >= 0 ? '+' : ''}{formatNumber((liveTick?.change ?? liveStock.change) ?? 0)} ({((liveTick?.changePct ?? liveStock.changePct) ?? 0) >= 0 ? '+' : ''}{((liveTick?.changePct ?? liveStock.changePct) ?? 0).toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Segment cards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Segment</label>
              <div className="grid grid-cols-3 gap-2">
                {(['EQUITY', 'FUTURES', 'OPTIONS'] as const).map((seg) => {
                  const locked = seg !== 'EQUITY' && !hasFeature(user?.tier || 'FREE', seg === 'FUTURES' ? 'futures_trading' : 'options_trading');
                  const isActive = segment === seg;
                  const Icon = seg === 'EQUITY' ? LineChartIcon : seg === 'FUTURES' ? BarChart3 : Layers;
                  return (
                    <button
                      key={seg}
                      onClick={() => {
                        if (locked) return;
                        /* OPTIONS segment — redirect to Option Chain page
                           (user wants this behavior so they can pick strikes visually).
                           If no symbol entered yet, default to NIFTY. */
                        if (seg === 'OPTIONS') {
                          const sym = (symbol || 'NIFTY').toUpperCase();
                          window.location.href = `/optionchain?symbol=${encodeURIComponent(sym)}`;
                          return;
                        }
                        setSegment(seg);
                      }}
                      className={cn(
                        'relative rounded-xl p-3 text-left border-2 transition-all',
                        isActive
                          ? 'border-brand-primary bg-tint-blue'
                          : locked
                          ? 'border-border bg-bg-surface-alt opacity-70 cursor-not-allowed'
                          : 'border-border bg-bg-surface hover:border-brand-primary/30'
                      )}
                      disabled={locked}
                    >
                      {isActive && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </span>
                      )}
                      {locked && (
                        <span className="absolute top-1.5 right-1.5 pill bg-tint-yellow-strong text-accent-gold">
                          PREMIUM
                        </span>
                      )}
                      <Icon
                        className={cn(
                          'h-5 w-5 mb-1.5',
                          isActive ? 'text-brand-primary' : locked ? 'text-text-tertiary' : 'text-profit-green'
                        )}
                      />
                      <p className={cn('text-xs font-semibold', isActive ? 'text-brand-primary' : 'text-text-primary')}>
                        {seg.charAt(0) + seg.slice(1).toLowerCase()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Order Type</label>
              <div className="flex gap-2">
                {(['MARKET', 'LIMIT', 'SL'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-xs font-semibold transition-colors border',
                      orderType === t
                        ? 'border-brand-primary bg-tint-blue text-brand-primary'
                        : 'border-border bg-bg-surface text-text-secondary hover:bg-bg-surface-alt'
                    )}
                  >
                    {t === 'SL' ? 'SL' : t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity stepper */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="qty-stepper">
                  <button
                    onClick={() => setQuantity(String(Math.max(1, qty - 1)))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <button
                    onClick={() => setQuantity(String(qty + 1))}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-text-secondary">Lot Size: 1</span>
                <div className="flex-1 text-right">
                  <span className="text-xs text-text-secondary">Available Balance: </span>
                  <span className="text-xs font-semibold text-profit-green font-mono">
                    {availableBalance == null ? '—' : `₹${formatNumber(availableBalance, 2)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Price (if LIMIT or SL) */}
            {orderType !== 'MARKET' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary">
                  {orderType === 'SL' ? 'Trigger Price (₹)' : 'Price (₹)'}
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-mono font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
            )}

            {/* ============== Stop Loss / Target (collapsible) ============== */}
            {side === 'BUY' && (
              <div className="space-y-2" key="sl-target-container">
                <button
                  type="button"
                  onClick={() => setShowSLTarget(!showSLTarget)}
                  className="w-full flex items-center justify-between rounded-lg border border-border bg-bg-base px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-surface-alt transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Stop Loss / Target
                    {(stopLoss || target) && (
                      <span className="pill bg-tint-green text-profit-green text-[9px]">SET</span>
                    )}
                  </span>
                  <span className="text-text-tertiary text-[10px]">
                    {showSLTarget ? 'Hide ▲' : 'Show ▼'}
                  </span>
                </button>
                {showSLTarget && (
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg border border-border bg-bg-surface-alt/50" key="sl-target-inputs">
                    <div>
                      <label className="text-[10px] font-semibold text-loss-red flex items-center gap-1" htmlFor="trade-sl-input">
                        <ArrowDown className="h-2.5 w-2.5" /> Stop Loss (₹)
                      </label>
                      <input
                        id="trade-sl-input"
                        key="sl-input-stable"
                        type="number"
                        step="0.05"
                        placeholder="Auto exit if LTP ≤"
                        value={stopLoss || ''}
                        onChange={(e) => setStopLoss(e.target.value)}
                        onBlur={(e) => { if (e.target.value) setStopLoss(e.target.value); }}
                        className="w-full mt-1 h-9 px-2 rounded-md border border-loss-red/30 bg-bg-surface text-xs font-mono font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-loss-red/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-profit-green flex items-center gap-1" htmlFor="trade-target-input">
                        <ArrowUp className="h-2.5 w-2.5" /> Target (₹)
                      </label>
                      <input
                        id="trade-target-input"
                        key="target-input-stable"
                        type="number"
                        step="0.05"
                        placeholder="Auto exit if LTP ≥"
                        value={target || ''}
                        onChange={(e) => setTarget(e.target.value)}
                        onBlur={(e) => { if (e.target.value) setTarget(e.target.value); }}
                        className="w-full mt-1 h-9 px-2 rounded-md border border-profit-green/30 bg-bg-surface text-xs font-mono font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-profit-green/20"
                      />
                    </div>
                    <p className="col-span-2 text-[10px] text-text-tertiary leading-tight">
                      When live market price hits your SL or Target, the position will be auto-squared off (paper trading only).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Buy/Sell buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setSide('BUY')}
                className={cn(
                  'flex-1 h-12 rounded-lg text-sm font-bold uppercase transition-colors flex items-center justify-center gap-1.5',
                  side === 'BUY'
                    ? 'bg-profit-green text-white shadow-md shadow-profit-green/30'
                    : 'bg-bg-surface-alt text-text-secondary border border-border'
                )}
              >
                <ArrowUp className="h-4 w-4" />
                BUY
              </button>
              <button
                onClick={() => setSide('SELL')}
                className={cn(
                  'flex-1 h-12 rounded-lg text-sm font-bold uppercase transition-colors flex items-center justify-center gap-1.5',
                  side === 'SELL'
                    ? 'bg-loss-red text-white shadow-md shadow-loss-red/30'
                    : 'bg-bg-surface-alt text-text-secondary border border-border'
                )}
              >
                <ArrowDown className="h-4 w-4" />
                SELL
              </button>
            </div>

            {/* Required Margin (expandable) */}
            <button
              onClick={() => setShowMarginBreakdown(!showMarginBreakdown)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-bg-base px-3 py-2.5 text-xs"
            >
              <span className="text-text-secondary flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-profit-green" />
                Required Margin <span className="text-text-tertiary">(Approx.)</span>
              </span>
              <span className="font-mono font-semibold text-text-primary">
                ₹{formatNumber(orderValue || (liveStock?.ltp ?? 0), 2)}
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-text-tertiary transition-transform', showMarginBreakdown && 'rotate-180')} />
            </button>
            {showMarginBreakdown && (
              <div className="rounded-lg bg-bg-base border border-border p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Order Value</span>
                  <span className="font-mono text-text-primary">₹{formatNumber(orderValue, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Margin Multiplier</span>
                  <span className="font-mono text-text-primary">1x (Equity Intraday)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Charges (Est.)</span>
                  <span className="font-mono text-text-primary">₹0.00</span>
                </div>
              </div>
            )}

            {/* REVIEW CTA */}
            <button
              onClick={handleOrder}
              disabled={submitting || !symbol || !quantity}
              className={cn(
                'w-full h-12 rounded-lg text-sm font-bold uppercase text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                side === 'BUY'
                  ? 'bg-profit-green hover:bg-profit-green/90'
                  : 'bg-loss-red hover:bg-loss-red/90'
              )}
            >
              {submitting ? 'Placing Order...' : `Review ${side} Order`}
              <ArrowUp className={cn('h-4 w-4', side === 'SELL' && 'rotate-180')} />
            </button>

            {message && (
              <p
                className={cn(
                  'text-sm text-center font-medium',
                  message.includes('failed') || message.includes('error')
                    ? 'text-loss-red'
                    : 'text-profit-green'
                )}
              >
                {message}
              </p>
            )}
          </div>
        </>
      )}

      {/* ============== ORDERS TAB — full 24h order & trade history ============== */}
      {mainTab === 'orders' && (
        <div className="card-soft">
          {/* Sub-tabs: Orders | Trade History */}
          <div className="flex items-center gap-1 border-b border-border px-3">
            <button
              onClick={() => setActiveTab('orders')}
              className="seg-tab"
              data-active={activeTab === 'orders'}
            >
              Orders
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className="seg-tab"
              data-active={activeTab === 'trades'}
            >
              Trade History
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
                {trades.length}
              </span>
            </button>
          </div>

          <div className="p-3">
            {activeTab === 'orders' ? (
              <OrdersList
                orders={orders}
                loading={loading}
                onCancel={handleCancel}
              />
            ) : (
              <TradesList trades={trades} loading={loading} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   OrdersList — status filter pills (All/Pending/Filled/Cancelled) + 24h list
   ============================================================ */
function OrdersList({
  orders,
  loading,
  onCancel,
}: {
  orders: Order[];
  loading: boolean;
  onCancel: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'FILLED' | 'CANCELLED'>('ALL');

  const filtered = statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-surface-alt" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-blue mb-3">
          <FileSearch className="h-7 w-7 text-brand-primary" />
        </div>
        <p className="font-heading text-sm font-semibold text-text-primary">No orders in the last 24h</p>
        <p className="text-xs text-text-secondary mt-0.5">Place an order to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 mb-3">
        {(['ALL', 'PENDING', 'FILLED', 'CANCELLED'] as const).map((s) => {
          const count = s === 'ALL' ? orders.length : orders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors border',
                statusFilter === s
                  ? 'border-brand-primary bg-tint-blue text-brand-primary'
                  : 'border-border bg-bg-surface text-text-secondary hover:bg-bg-surface-alt'
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-secondary">
          No {statusFilter.toLowerCase()} orders in the last 24h
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ord) => (
            <div
              key={ord.id}
              className="flex items-center gap-3 rounded-xl border border-border p-2.5"
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
                  <span className="pill bg-bg-surface-alt text-text-secondary">{ord.segment}</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {ord.orderType} · {ord.quantity} qty
                  {ord.createdAt && (
                    <span className="ml-2 text-text-tertiary">
                      {new Date(ord.createdAt).toLocaleString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  )}
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
              {ord.status === 'PENDING' && (
                <button
                  onClick={() => onCancel(ord.id)}
                  className="ml-2 text-[11px] font-medium text-loss-red hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ============================================================
   TradesList — closed/executed trades with P&L + detail expand
   ============================================================ */
function TradesList({ trades, loading }: { trades: Trade[]; loading: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-surface-alt" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-purple mb-3">
          <BarChart3 className="h-7 w-7 text-info-purple" />
        </div>
        <p className="font-heading text-sm font-semibold text-text-primary">No trades yet</p>
        <p className="text-xs text-text-secondary mt-0.5">Your completed trades will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((t) => {
        const isExpanded = expandedId === t.id;
        const profitPct = t.price > 0 ? ((t.pnl / (t.price * t.quantity)) * 100) : 0;
        return (
          <div
            key={t.id}
            className={cn(
              'rounded-xl border transition-all overflow-hidden',
              isExpanded ? 'border-brand-primary/40 ring-1 ring-brand-primary/20' : 'border-border'
            )}
          >
            {/* Clickable summary row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-bg-surface-alt/50 transition-colors"
            >
              <StockLogo symbol={t.symbol} size="sm" rounded="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-text-primary">{t.symbol}</p>
                  <span
                    className={cn(
                      'pill',
                      t.side === 'BUY' ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red'
                    )}
                  >
                    {t.side}
                  </span>
                  <span className="pill bg-bg-surface-alt text-text-secondary">{t.type}</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">{t.quantity} qty @ ₹{formatNumber(t.price, 2)}</p>
              </div>
              {/* Profit/Loss display */}
              <div className="text-right shrink-0">
                <p className={cn('font-mono text-sm font-semibold tabular-nums', getPnlColor(t.pnl))}>
                  {t.pnl >= 0 ? '+' : ''}₹{formatNumber(t.pnl, 2)}
                </p>
                <p className={cn('font-mono text-[10px] tabular-nums font-medium', getPnlColor(t.pnl))}>
                  {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                </p>
              </div>
              {/* Expand arrow */}
              <ChevronDown className={cn(
                'h-4 w-4 text-text-tertiary transition-transform shrink-0',
                isExpanded && 'rotate-180'
              )} />
            </button>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="border-t border-border bg-bg-surface/50 px-3 py-3 space-y-3">
                {/* P&L Summary bar */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-bg-surface-alt p-2">
                    <p className="text-[10px] text-text-tertiary font-medium">P&L</p>
                    <p className={cn('font-mono text-sm font-bold tabular-nums mt-0.5', getPnlColor(t.pnl))}>
                      {t.pnl >= 0 ? '+' : ''}₹{formatNumber(t.pnl, 2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-surface-alt p-2">
                    <p className="text-[10px] text-text-tertiary font-medium">Return %</p>
                    <p className={cn('font-mono text-sm font-bold tabular-nums mt-0.5', getPnlColor(t.pnl))}>
                      {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg-surface-alt p-2">
                    <p className="text-[10px] text-text-tertiary font-medium">Brokerage</p>
                    <p className="font-mono text-sm font-bold tabular-nums text-loss-red mt-0.5">
                      ₹{formatNumber(t.brokerage, 2)}
                    </p>
                  </div>
                </div>
                {/* Detail rows */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <DetailRow label="Symbol" value={t.symbol} />
                  <DetailRow label="Side" value={t.side} color={t.side === 'BUY' ? 'text-profit-green' : 'text-loss-red'} />
                  <DetailRow label="Type" value={t.type} />
                  <DetailRow label="Segment" value={t.segment} />
                  <DetailRow label="Quantity" value={String(t.quantity)} />
                  <DetailRow label="Price" value={`₹${formatNumber(t.price, 2)}`} />
                  {t.strikePrice && <DetailRow label="Strike" value={`₹${formatNumber(t.strikePrice, 0)}`} />}
                  {t.optionType && <DetailRow label="Option" value={t.optionType} />}
                  {t.expiry && <DetailRow label="Expiry" value={t.expiry} />}
                  <DetailRow label="Date" value={new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-tertiary">{label}</span>
      <span className={cn('font-mono font-semibold text-text-primary', color)}>{value}</span>
    </div>
  );
}
