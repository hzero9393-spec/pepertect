'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, PremiumBadge } from '@/components/shared/common';
import { formatINR, formatNumber, getPnlColor } from '@/lib/utils';
import { hasFeature } from '@/lib/tier';
import { BarChart3, Search, Plus, Trash2 } from 'lucide-react';
import type { Order, Position, Trade } from '@/types';

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

  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('symbol')) setSymbol(params.get('symbol')!);
    if (params.get('side')) setSide(params.get('side') as 'BUY' | 'SELL');
  }, []);

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
        setSymbol('');
        setQuantity('1');
        setPrice('');
        // Refresh
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
      setOrders(orders.map((o) => o.id === orderId ? { ...o, status: 'CANCELLED' as const } : o));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Form */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base font-semibold">Place Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Symbol */}
            <div className="space-y-1.5">
              <Label className="text-xs">Symbol</Label>
              <Input placeholder="e.g. RELIANCE" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
              <div className="flex flex-wrap gap-1 mt-1">
                {POPULAR_STOCKS.slice(0, 8).map((s) => (
                  <button key={s} onClick={() => setSymbol(s)} className="rounded bg-bg-surface-alt px-2 py-0.5 text-[10px] font-mono text-text-secondary hover:bg-brand-primary/10 hover:text-brand-primary">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment */}
            <div className="space-y-1.5">
              <Label className="text-xs">Segment</Label>
              <div className="flex gap-2">
                {(['EQUITY', 'FUTURES', 'OPTIONS'] as const).map((seg) => {
                  const locked = seg !== 'EQUITY' && !hasFeature(user?.tier || 'FREE', seg === 'FUTURES' ? 'futures_trading' : 'options_trading');
                  return (
                    <button
                      key={seg}
                      onClick={() => !locked && setSegment(seg)}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                        segment === seg ? 'bg-brand-primary text-white' :
                        locked ? 'bg-bg-surface-alt text-text-secondary/50 cursor-not-allowed' :
                        'bg-bg-surface-alt text-text-secondary hover:bg-border-default'
                      }`}
                      disabled={locked}
                    >
                      {locked && <PremiumBadge size="sm" />}
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
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${side === 'BUY' ? 'bg-profit-green text-white' : 'bg-bg-surface-alt text-text-secondary'}`}
              >
                BUY
              </button>
              <button
                onClick={() => setSide('SELL')}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${side === 'SELL' ? 'bg-loss-red text-white' : 'bg-bg-surface-alt text-text-secondary'}`}
              >
                SELL
              </button>
            </div>

            {/* Order Type */}
            <div className="flex gap-2">
              {(['MARKET', 'LIMIT', 'SL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${orderType === t ? 'bg-brand-primary/10 text-brand-primary' : 'bg-bg-surface-alt text-text-secondary'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              {orderType !== 'MARKET' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Price (₹)</Label>
                  <Input type="number" step="0.05" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleOrder}
              disabled={submitting || !symbol || !quantity}
              className={`w-full font-semibold text-white ${side === 'BUY' ? 'bg-profit-green hover:bg-profit-green/90' : 'bg-loss-red hover:bg-loss-red/90'}`}
            >
              {submitting ? 'Placing Order...' : `${side} ${symbol || 'Stock'}`}
            </Button>

            {message && (
              <p className={`text-sm text-center ${message.includes('failed') || message.includes('error') ? 'text-loss-red' : 'text-profit-green'}`}>
                {message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Order History / Trades */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('orders')}
                className={`font-heading text-base font-semibold ${activeTab === 'orders' ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                className={`font-heading text-base font-semibold ${activeTab === 'trades' ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                Trade History
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'orders' ? (
              orders.length === 0 ? (
                <EmptyState icon={BarChart3} title="No orders yet" description="Place your first trade to get started" />
              ) : (
                <div className="overflow-x-auto">
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
                        <tr key={ord.id} className="border-b border-border-default/50">
                          <td className="py-2 font-mono font-medium text-text-primary">{ord.symbol}</td>
                          <td className={`py-2 font-medium ${ord.side === 'BUY' ? 'text-profit-green' : 'text-loss-red'}`}>{ord.side}</td>
                          <td className="py-2 text-text-secondary">{ord.orderType}</td>
                          <td className="py-2 text-right font-mono">{ord.quantity}</td>
                          <td className="py-2 text-right font-mono">{formatNumber(ord.filledPrice ?? ord.price ?? 0)}</td>
                          <td className="py-2 text-right">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              ord.status === 'FILLED' ? 'bg-profit-green/10 text-profit-green' :
                              ord.status === 'PENDING' ? 'bg-warning-amber/10 text-warning-amber' :
                              'bg-loss-red/10 text-loss-red'
                            }`}>{ord.status}</span>
                          </td>
                          <td className="py-2 text-right">
                            {ord.status === 'PENDING' && (
                              <button onClick={() => handleCancel(ord.id)} className="text-xs text-loss-red hover:underline">Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              trades.length === 0 ? (
                <EmptyState icon={BarChart3} title="No trades yet" description="Your completed trades will appear here" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-default text-xs text-text-secondary">
                        <th className="pb-2 text-left font-medium">Symbol</th>
                        <th className="pb-2 text-left font-medium">Side</th>
                        <th className="pb-2 text-left font-medium">Type</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t) => (
                        <tr key={t.id} className="border-b border-border-default/50">
                          <td className="py-2 font-mono font-medium text-text-primary">{t.symbol}</td>
                          <td className={`py-2 font-medium ${t.side === 'BUY' ? 'text-profit-green' : 'text-loss-red'}`}>{t.side}</td>
                          <td className="py-2 text-text-secondary">{t.type}</td>
                          <td className="py-2 text-right font-mono">{t.quantity}</td>
                          <td className="py-2 text-right font-mono">{formatNumber(t.price)}</td>
                          <td className={`py-2 text-right font-mono ${getPnlColor(t.pnl)}`}>
                            {t.pnl >= 0 ? '+' : ''}{formatNumber(t.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
