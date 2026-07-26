'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, getPnlColor, cn } from '@/lib/utils';
import { hasFeature } from '@/lib/tier';
import {
  ArrowUp, ArrowDown, Search, Settings, Check,
  LineChart as LineChartIcon, Layers, BarChart3,
  ChevronDown, Plus, Minus, Wallet, FileSearch,
} from 'lucide-react';
import type { Order, Trade, Stock } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';

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
  const [segment, setSegment] = useState<'EQUITY' | 'FUTURES' | 'OPTIONS'>('EQUITY');
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'trades'>('orders');
  const [liveStock, setLiveStock] = useState<Stock | null>(null);
  const [showMarginBreakdown, setShowMarginBreakdown] = useState(false);
  const [mainTab, setMainTab] = useState<'place' | 'basket'>('place');

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
        const [oRes, tRes] = await Promise.all([
          fetch('/api/orders', { headers }),
          fetch('/api/trades', { headers }),
        ]);
        const oData = await oRes.json();
        const tData = await tRes.json();
        if (oData.success) setOrders(oData.data);
        if (tData.success) setTrades(tData.data);
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
    setSubmitting(true);
    setMessage('');
    try {
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Order ${data.data.status} — ${side} ${quantity} ${symbol.toUpperCase()}`);
        setQuantity('1');
        setPrice('');
        const oRes = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
        const oData = await oRes.json();
        if (oData.success) setOrders(oData.data);
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
  const refPrice = liveStock?.ltp ?? (parseFloat(price) || 0);
  const orderValue = qty * refPrice;
  const availableBalance = user?.virtualCapital ?? 100000;

  return (
    <div className="space-y-4">
      {/* ============== TOP TABS: Place Order | Basket | Settings ============== */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setMainTab('place')}
          className={cn('seg-tab', mainTab === 'place' && '[data-active=true]')}
          data-active={mainTab === 'place'}
        >
          Place Order
        </button>
        <button
          onClick={() => setMainTab('basket')}
          className={cn('seg-tab relative', mainTab === 'basket' && '[data-active=true]')}
          data-active={mainTab === 'basket'}
        >
          Basket
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-loss-red px-1 text-[10px] font-bold text-white">
            2
          </span>
        </button>
        <div className="flex-1" />
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg-surface-alt"
          aria-label="Order settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {mainTab === 'basket' && (
        <div className="card-soft p-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-purple mb-3">
            <Layers className="h-7 w-7 text-info-purple" />
          </div>
          <h3 className="font-heading text-base font-semibold text-text-primary">Basket trading coming soon</h3>
          <p className="text-sm text-text-secondary mt-1">Place multiple orders in a single click.</p>
          <button
            onClick={() => setMainTab('place')}
            className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            Back to Place Order
          </button>
        </div>
      )}

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

            {/* Live stock strip */}
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
                    <p className="font-mono text-base font-bold tabular-nums text-text-primary">
                      ₹{formatNumber(liveStock.ltp ?? 0)}
                    </p>
                    <p
                      className={cn(
                        'font-mono text-xs tabular-nums',
                        (liveStock.changePct ?? 0) >= 0 ? 'text-profit-green' : 'text-loss-red'
                      )}
                    >
                      {(liveStock.change ?? 0) >= 0 ? '+' : ''}{formatNumber(liveStock.change ?? 0)} ({(liveStock.changePct ?? 0) >= 0 ? '+' : ''}{(liveStock.changePct ?? 0).toFixed(2)}%)
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
                      onClick={() => !locked && setSegment(seg)}
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
                  <span className="text-xs font-semibold text-profit-green font-mono">₹{formatNumber(availableBalance, 2)}</span>
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

          {/* ============== ORDERS / TRADE HISTORY ============== */}
          <div className="card-soft">
            {/* Sub-tabs */}
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
              <div className="flex-1" />
              <button className="flex items-center gap-1 text-xs text-text-secondary py-2 px-2 hover:text-text-primary">
                <span>All</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <div className="p-3">
              {activeTab === 'orders' ? (
                loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-surface-alt" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-10 flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-blue mb-3">
                      <FileSearch className="h-7 w-7 text-brand-primary" />
                    </div>
                    <p className="font-heading text-sm font-semibold text-text-primary">No open orders</p>
                    <p className="text-xs text-text-secondary mt-0.5">Place an order to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 8).map((ord) => (
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
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5">{ord.orderType} · {ord.quantity} qty</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                            ₹{formatNumber(ord.filledPrice ?? ord.price ?? 0, 2)}
                          </p>
                          <p
                            className={cn(
                              'text-[11px] font-medium',
                              ord.status === 'FILLED'
                                ? 'text-profit-green'
                                : ord.status === 'PENDING'
                                ? 'text-accent-gold'
                                : 'text-loss-red'
                            )}
                          >
                            {ord.status}
                          </p>
                        </div>
                        {ord.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(ord.id)}
                            className="ml-2 text-[11px] font-medium text-loss-red hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-surface-alt" />
                  ))}
                </div>
              ) : trades.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint-purple mb-3">
                    <BarChart3 className="h-7 w-7 text-info-purple" />
                  </div>
                  <p className="font-heading text-sm font-semibold text-text-primary">No trades yet</p>
                  <p className="text-xs text-text-secondary mt-0.5">Your completed trades will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trades.slice(0, 8).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-border p-2.5"
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
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">{t.quantity} qty @ ₹{formatNumber(t.price, 2)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('font-mono text-sm font-semibold tabular-nums', getPnlColor(t.pnl))}>
                          {t.pnl >= 0 ? '+' : ''}₹{formatNumber(t.pnl, 2)}
                        </p>
                        <p className="text-[11px] text-text-secondary">{t.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
