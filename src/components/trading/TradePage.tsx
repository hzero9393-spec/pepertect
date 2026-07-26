'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, PremiumBadge, LiveDot } from '@/components/shared/common';
import { formatNumber, getPnlColor, cn } from '@/lib/utils';
import { hasFeature } from '@/lib/tier';
import { BarChart3, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import type { Order, Trade, Stock } from '@/types';

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('symbol')) setSymbol(params.get('symbol') as string);
    if (params.get('side')) setSide(params.get('side') as 'BUY' | 'SELL');
  }, []);

  // Fetch the live stock info whenever symbol changes (so user sees price)
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
    const t = setTimeout(fetchStock, 200); // debounce
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

  const orderValue = (parseInt(quantity) || 0) * (liveStock?.ltp ?? (parseFloat(price) || 0));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Order Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base font-semibold">Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Symbol */}
              <div className="space-y-1.5">
                <Label className="text-xs">Symbol</Label>
                <Input
                  placeholder="e.g. RELIANCE"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="h-11 text-base font-mono"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {POPULAR_STOCKS.slice(0, 8).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSymbol(s)}
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-mono transition-colors',
                        symbol === s
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'bg-bg-surface-alt text-text-secondary hover:bg-brand-primary/10 hover:text-brand-primary'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live price strip — only when symbol is valid */}
              {liveStock && (
                <div className="rounded-lg border border-border-default bg-bg-base p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <LiveDot isLive={(liveStock.changePct ?? 0) >= 0} />
                      <span className="text-[10px] font-medium text-text-secondary">LIVE</span>
                    </div>
                    <a
                      href={`/stock/${liveStock.symbol}`}
                      className="text-[10px] text-brand-primary hover:underline"
                    >
                      View overview →
                    </a>
                  </div>
                  <div className="mt-1.5 flex items-end justify-between">
                    <p className="font-mono text-2xl font-bold tabular-nums text-text-primary">
                      ₹{formatNumber(liveStock.ltp ?? 0)}
                    </p>
                    <p
                      className={cn(
                        'font-mono text-sm font-semibold tabular-nums',
                        getPnlColor(liveStock.changePct ?? 0)
                      )}
                    >
                      {(liveStock.change ?? 0) >= 0 ? '+' : ''}
                      {formatNumber(liveStock.change ?? 0)} ({(liveStock.changePct ?? 0) >= 0 ? '+' : ''}{(liveStock.changePct ?? 0).toFixed(2)}%)
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-text-secondary">O </span>
                      <span className="font-mono text-text-primary">{formatNumber(liveStock.open ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">H </span>
                      <span className="font-mono text-profit-green">{formatNumber(liveStock.high ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">L </span>
                      <span className="font-mono text-loss-red">{formatNumber(liveStock.low ?? 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Segment — fixed: badge above label, not inside button */}
              <div className="space-y-1.5">
                <Label className="text-xs">Segment</Label>
                <div className="flex gap-2">
                  {(['EQUITY', 'FUTURES', 'OPTIONS'] as const).map((seg) => {
                    const locked = seg !== 'EQUITY' && !hasFeature(user?.tier || 'FREE', seg === 'FUTURES' ? 'futures_trading' : 'options_trading');
                    const isActive = segment === seg && !locked;
                    return (
                      <button
                        key={seg}
                        onClick={() => !locked && setSegment(seg)}
                        className={cn(
                          'flex-1 rounded-md py-2 px-1 text-xs font-medium transition-colors relative',
                          isActive
                            ? 'bg-brand-primary text-white'
                            : locked
                            ? 'bg-bg-surface-alt text-text-secondary/60 cursor-not-allowed'
                            : 'bg-bg-surface-alt text-text-secondary hover:bg-border-default'
                        )}
                        disabled={locked}
                      >
                        {locked && (
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                            <PremiumBadge size="sm" />
                          </span>
                        )}
                        {seg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSide('BUY')}
                  className={cn(
                    'flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
                    side === 'BUY' ? 'bg-profit-green text-white' : 'bg-bg-surface-alt text-text-secondary'
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                  BUY
                </button>
                <button
                  onClick={() => setSide('SELL')}
                  className={cn(
                    'flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
                    side === 'SELL' ? 'bg-loss-red text-white' : 'bg-bg-surface-alt text-text-secondary'
                  )}
                >
                  <ArrowDown className="h-4 w-4" />
                  SELL
                </button>
              </div>

              {/* Order Type */}
              <div className="flex gap-2">
                {(['MARKET', 'LIMIT', 'SL'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={cn(
                      'flex-1 rounded-md py-2 text-xs font-medium transition-colors',
                      orderType === t
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30'
                        : 'bg-bg-surface-alt text-text-secondary'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Quantity & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-11 text-base font-mono"
                  />
                </div>
                {orderType !== 'MARKET' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price (₹)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-11 text-base font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Estimated order value */}
              {orderValue > 0 && symbol && (
                <div className="flex items-center justify-between rounded-md border border-border-default bg-bg-base px-3 py-2 text-xs">
                  <span className="text-text-secondary">Estimated Value</span>
                  <span className="font-mono font-semibold tabular-nums text-text-primary">
                    ₹{formatNumber(orderValue)}
                  </span>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleOrder}
                disabled={submitting || !symbol || !quantity}
                className={cn(
                  'w-full h-12 font-semibold text-white transition-colors',
                  side === 'BUY' ? 'bg-profit-green hover:bg-profit-green/90' : 'bg-loss-red hover:bg-loss-red/90'
                )}
              >
                {submitting ? 'Placing Order...' : `${side} ${symbol || 'Stock'}`}
              </Button>

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
            </CardContent>
          </Card>
        </div>

        {/* Order History / Trades */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4 border-b border-border-default -mb-3">
              <button
                onClick={() => setActiveTab('orders')}
                className={cn(
                  'font-heading text-sm sm:text-base font-semibold py-3 border-b-2 -mb-px transition-colors',
                  activeTab === 'orders'
                    ? 'border-brand-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                Orders
                {orders.length > 0 && (
                  <span className="ml-1.5 rounded bg-bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                    {orders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={cn(
                  'font-heading text-sm sm:text-base font-semibold py-3 border-b-2 -mb-px transition-colors',
                  activeTab === 'trades'
                    ? 'border-brand-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                Trade History
                {trades.length > 0 && (
                  <span className="ml-1.5 rounded bg-bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                    {trades.length}
                  </span>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'orders' ? (
              loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-surface-alt" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="py-10">
                  <EmptyState
                    icon={BarChart3}
                    title="No orders yet"
                    description="Place your first trade to get started"
                  />
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-default text-xs text-text-secondary">
                          <th className="pb-2 text-left font-medium">Symbol</th>
                          <th className="pb-2 text-left font-medium">Side</th>
                          <th className="pb-2 text-left font-medium">Type</th>
                          <th className="pb-2 text-right font-medium">Qty</th>
                          <th className="pb-2 text-right font-medium">Price</th>
                          <th className="pb-2 text-right font-medium">Status</th>
                          <th className="pb-2 text-right font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((ord) => (
                          <tr key={ord.id} className="border-b border-border-default/50 hover:bg-bg-surface-alt/50">
                            <td className="py-2">
                              <a
                                href={`/stock/${ord.symbol}`}
                                className="font-mono font-medium text-text-primary hover:text-brand-primary"
                              >
                                {ord.symbol}
                              </a>
                            </td>
                            <td className={cn('py-2 font-medium', ord.side === 'BUY' ? 'text-profit-green' : 'text-loss-red')}>
                              {ord.side}
                            </td>
                            <td className="py-2 text-text-secondary">{ord.orderType}</td>
                            <td className="py-2 text-right font-mono">{ord.quantity}</td>
                            <td className="py-2 text-right font-mono">{formatNumber(ord.filledPrice ?? ord.price ?? 0)}</td>
                            <td className="py-2 text-right">
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-xs font-medium',
                                  ord.status === 'FILLED'
                                    ? 'bg-profit-green/10 text-profit-green'
                                    : ord.status === 'PENDING'
                                    ? 'bg-warning-amber/10 text-warning-amber'
                                    : 'bg-loss-red/10 text-loss-red'
                                )}
                              >
                                {ord.status}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              {ord.status === 'PENDING' && (
                                <button onClick={() => handleCancel(ord.id)} className="text-xs text-loss-red hover:underline">
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-2">
                    {orders.map((ord) => (
                      <div key={ord.id} className="rounded-lg border border-border-default p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/stock/${ord.symbol}`}
                              className="font-mono text-sm font-semibold text-text-primary"
                            >
                              {ord.symbol}
                            </a>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                ord.side === 'BUY'
                                  ? 'bg-profit-green/10 text-profit-green'
                                  : 'bg-loss-red/10 text-loss-red'
                              )}
                            >
                              {ord.side}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-medium',
                              ord.status === 'FILLED'
                                ? 'bg-profit-green/10 text-profit-green'
                                : ord.status === 'PENDING'
                                ? 'bg-warning-amber/10 text-warning-amber'
                                : 'bg-loss-red/10 text-loss-red'
                            )}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">{ord.orderType} · {ord.quantity} qty</span>
                          <span className="font-mono font-medium text-text-primary">
                            ₹{formatNumber(ord.filledPrice ?? ord.price ?? 0)}
                          </span>
                        </div>
                        {ord.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(ord.id)}
                            className="mt-2 w-full rounded-md border border-border-default py-1.5 text-xs font-medium text-loss-red hover:bg-loss-red/10"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )
            ) : loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-surface-alt" />
                ))}
              </div>
            ) : trades.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={BarChart3} title="No trades yet" description="Your completed trades will appear here" />
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-default text-xs text-text-secondary">
                        <th className="pb-2 text-left font-medium">Symbol</th>
                        <th className="pb-2 text-left font-medium">Side</th>
                        <th className="pb-2 text-left font-medium">Type</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t) => (
                        <tr key={t.id} className="border-b border-border-default/50 hover:bg-bg-surface-alt/50">
                          <td className="py-2">
                            <a
                              href={`/stock/${t.symbol}`}
                              className="font-mono font-medium text-text-primary hover:text-brand-primary"
                            >
                              {t.symbol}
                            </a>
                          </td>
                          <td className={cn('py-2 font-medium', t.side === 'BUY' ? 'text-profit-green' : 'text-loss-red')}>
                            {t.side}
                          </td>
                          <td className="py-2 text-text-secondary">{t.type}</td>
                          <td className="py-2 text-right font-mono">{t.quantity}</td>
                          <td className="py-2 text-right font-mono">{formatNumber(t.price)}</td>
                          <td className={cn('py-2 text-right font-mono', getPnlColor(t.pnl))}>
                            {t.pnl >= 0 ? '+' : ''}{formatNumber(t.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {trades.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border-default p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/stock/${t.symbol}`}
                            className="font-mono text-sm font-semibold text-text-primary"
                          >
                            {t.symbol}
                          </a>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-medium',
                              t.side === 'BUY'
                                ? 'bg-profit-green/10 text-profit-green'
                                : 'bg-loss-red/10 text-loss-red'
                            )}
                          >
                            {t.side}
                          </span>
                        </div>
                        <span className={cn('font-mono text-sm font-semibold', getPnlColor(t.pnl))}>
                          {t.pnl >= 0 ? '+' : ''}₹{formatNumber(t.pnl)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">{t.type} · {t.quantity} qty</span>
                        <span className="font-mono text-text-secondary">@ ₹{formatNumber(t.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
