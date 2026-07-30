'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { formatNumber, cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface LimitOrderModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  side: 'BUY' | 'SELL';
  segment: 'EQUITY' | 'FUTURES' | 'OPTIONS';
  marketPrice: number;
  optionType?: 'CE' | 'PE' | null;
  strikePrice?: number | null;
  expiry?: string | null;
  instrumentKey?: string | null;
  lotSize?: number;
  onSuccess?: () => void;
}

export function LimitOrderModal({
  open,
  onClose,
  symbol,
  side,
  segment,
  marketPrice,
  optionType,
  strikePrice,
  expiry,
  instrumentKey,
  lotSize = 1,
  onSuccess,
}: LimitOrderModalProps) {
  const { token } = useAuthStore();
  const [limitPrice, setLimitPrice] = useState(marketPrice.toFixed(2));
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const limitPriceNum = parseFloat(limitPrice) || 0;
  const totalValue = limitPriceNum * quantity * lotSize;

  // Build the label for options (e.g. "NIFTY 23500 CE")
  const optionLabel =
    segment === 'OPTIONS' && strikePrice && optionType
      ? `${symbol} ${strikePrice} ${optionType}`
      : symbol;

  const handleSubmit = async () => {
    if (!token || limitPriceNum <= 0 || quantity <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          segment,
          side,
          orderType: 'LIMIT',
          quantity: quantity * (segment === 'OPTIONS' ? lotSize : 1),
          price: limitPriceNum,
          optionType: optionType ?? null,
          strikePrice: strikePrice ?? null,
          expiry: expiry ?? null,
          instrumentKey: instrumentKey ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: `✅ Limit order placed!`,
          description: `Waiting for ₹${formatNumber(limitPriceNum, 2)}`,
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: 'Order failed',
          description: data.error || 'Could not place limit order',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not reach server',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const incrementQty = () => setQuantity((q) => q + 1);
  const decrementQty = () => setQuantity((q) => Math.max(1, q - 1));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-y-0 translate-x-0 max-w-full sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md rounded-t-2xl sm:rounded-lg p-0 overflow-hidden">
        {/* Header */}
        <div className={cn(
          'px-5 pt-5 pb-4 border-b border-border',
          side === 'BUY' ? 'bg-tint-green/30' : 'bg-tint-red/30'
        )}>
          <div className="flex items-center justify-between">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-base font-bold text-text-primary">
                {optionLabel}{' '}
                <span className={cn(
                  'font-mono',
                  side === 'BUY' ? 'text-profit-green' : 'text-loss-red'
                )}>
                  {side} LIMIT
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-text-secondary">
                Trade executes when price reaches your limit
              </DialogDescription>
            </DialogHeader>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface-alt hover:bg-bg-surface transition-colors"
            >
              <X className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Market Price */}
          <div className="flex items-center justify-between rounded-lg bg-bg-surface-alt px-4 py-3">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Market Price
            </span>
            <span className="font-mono text-lg font-bold text-text-primary">
              ₹{formatNumber(marketPrice, 2)}
            </span>
          </div>

          {/* Limit Price Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Limit Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-text-tertiary">
                ₹
              </span>
              <Input
                type="number"
                step="0.05"
                min="0"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="pl-7 h-12 font-mono text-base font-semibold text-text-primary border-border focus:border-brand-primary"
              />
            </div>
            <p className="text-[10px] text-text-tertiary">
              Trade executes when price reaches this level
            </p>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Quantity {segment === 'OPTIONS' ? `(lots × ${lotSize} = ${(quantity * lotSize).toLocaleString()} shares)` : '(shares)'}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={decrementQty}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-surface hover:bg-bg-surface-alt transition-colors"
              >
                <Minus className="h-4 w-4 text-text-secondary" />
              </button>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (v > 0) setQuantity(v);
                }}
                className="h-10 flex-1 text-center font-mono text-base font-semibold text-text-primary border-border focus:border-brand-primary"
              />
              <button
                onClick={incrementQty}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-surface hover:bg-bg-surface-alt transition-colors"
              >
                <Plus className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
          </div>

          {/* Total Value */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Total Value
            </span>
            <span className="font-mono text-lg font-bold text-text-primary">
              ₹{formatNumber(totalValue, 2)}
            </span>
          </div>
        </div>

        {/* Footer — Submit button */}
        <div className="p-5 pt-0">
          <Button
            onClick={handleSubmit}
            disabled={submitting || limitPriceNum <= 0 || quantity <= 0}
            className={cn(
              'w-full h-12 text-sm font-bold rounded-xl transition-all',
              side === 'BUY'
                ? 'bg-profit-green hover:bg-profit-green/90 text-white'
                : 'bg-loss-red hover:bg-loss-red/90 text-white',
              (submitting || limitPriceNum <= 0) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Place Limit Order · ${side} ${optionLabel}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
