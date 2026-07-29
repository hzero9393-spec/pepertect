'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, ShieldAlert, TrendingDown, Check, AlertTriangle, Info } from 'lucide-react';
import { cn, formatINR } from '@/lib/utils';

interface SLTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    symbol: string;
    side: string; // LONG or SHORT
    avgPrice: number;
    currentPrice?: number;
    stopLoss?: number | null;
    target?: number | null;
  };
  onUpdate: (stopLoss: number | null, target: number | null) => Promise<void>;
}

export function SLTargetModal({ isOpen, onClose, position, onUpdate }: SLTargetModalProps) {
  const [stopLoss, setStopLoss] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && position) {
      setStopLoss(position.stopLoss ? String(position.stopLoss) : '');
      setTarget(position.target ? String(position.target) : '');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, position]);

  // Validate values
  const validateValue = (value: string, type: 'SL' | 'TARGET'): string | null => {
    if (!value) return null; // Empty is allowed (means remove)
    
    const num = Number(value);
    const avgPrice = position.avgPrice;

    if (isNaN(num) || num <= 0) {
      return `${type} must be greater than 0`;
    }

    if (position.side === 'LONG') {
      if (type === 'SL' && num >= avgPrice) {
        return `Stop Loss must be below avg price (₹${avgPrice.toFixed(2)})`;
      }
      if (type === 'TARGET' && num <= avgPrice) {
        return `Target must be above avg price (₹${avgPrice.toFixed(2)})`;
      }
    } else {
      // SHORT position
      if (type === 'SL' && num <= avgPrice) {
        return `Stop Loss must be above avg price (₹${avgPrice.toFixed(2)})`;
      }
      if (type === 'TARGET' && num >= avgPrice) {
        return `Target must be below avg price (₹${avgPrice.toFixed(2)})`;
      }
    }

    return null;
  };

  // Calculate risk/reward
  const slNum = stopLoss ? Number(stopLoss) : null;
  const tgtNum = target ? Number(target) : null;
  
  const potentialLoss = slNum ? Math.abs(slNum - position.avgPrice) : null;
  const potentialProfit = tgtNum ? Math.abs(tgtNum - position.avgPrice) : null;
  const riskRewardRatio = (potentialLoss && potentialProfit && potentialLoss > 0) 
    ? (potentialProfit / potentialLoss).toFixed(2) 
    : null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Validate both fields
    const slError = stopLoss ? validateValue(stopLoss, 'SL') : null;
    const tgtError = target ? validateValue(target, 'TARGET') : null;

    if (slError || tgtError) {
      setError(slError || tgtError || 'Invalid values');
      return;
    }

    setLoading(true);
    
    try {
      await onUpdate(
        stopLoss ? Number(stopLoss) : null,
        target ? Number(target) : null
      );
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (!position) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand-primary/5 to-accent-gold/5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  position.side === 'LONG' ? "bg-profit-green/10" : "bg-loss-red/10"
                )}>
                  <Target className={cn(
                    "h-5 w-5",
                    position.side === 'LONG' ? "text-profit-green" : "text-loss-red"
                  )} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Set Stop Loss & Target</h3>
                  <p className="text-xs text-text-secondary">
                    {position.symbol} · {position.side} · Entry: ₹{position.avgPrice.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-bg-surface-alt transition-colors"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            </div>

            {/* Success State */}
            {success ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-profit-green/10 mb-4">
                  <Check className="h-8 w-8 text-profit-green" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">Updated Successfully!</h3>
                <p className="text-sm text-text-secondary mt-1">Your Stop Loss & Target have been saved</p>
              </motion.div>
            ) : (
              /* Form */
              <div className="p-4 space-y-4">
                {/* Info Banner */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-info-purple/10 border border-info-purple/20">
                  <Info className="h-4 w-4 text-info-purple mt-0.5 shrink-0" />
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {position.side === 'LONG' ? (
                      <>For <strong className="text-text-primary">LONG</strong> positions: Stop Loss should be <strong className="text-loss-red">below</strong> entry price, Target should be <strong className="text-profit-green">above</strong>.</>
                    ) : (
                      <>For <strong className="text-text-primary">SHORT</strong> positions: Stop Loss should be <strong className="text-loss-red">above</strong> entry price, Target should be <strong className="text-profit-green">below</strong>.</>
                    )}
                  </p>
                </div>

                {/* Stop Loss Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <ShieldAlert className="h-4 w-4 text-loss-red" />
                    Stop Loss (SL)
                    <span className="text-[10px] font-normal text-text-tertiary">· Auto square-off at this price</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono text-sm">₹</span>
                    <input
                      type="number"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                      placeholder={`Below ${position.side === 'LONG' ? '' : 'above'} ₹${position.avgPrice.toFixed(2)}`}
                      step="0.05"
                      className={cn(
                        "w-full h-11 pl-7 pr-4 rounded-xl border bg-bg-surface-alt font-mono text-sm transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary",
                        stopLoss && validateValue(stopLoss, 'SL')
                          ? "border-loss-red bg-loss-red/5"
                          : "border-border hover:border-border/80"
                      )}
                    />
                  </div>
                  {stopLoss && validateValue(stopLoss, 'SL') && (
                    <p className="text-[11px] text-loss-red flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {validateValue(stopLoss, 'SL')}
                    </p>
                  )}
                  {potentialLoss && !validateValue(stopLoss || '', 'SL') && (
                    <p className="text-[11px] text-text-tertiary">
                      Max Risk: <span className="text-loss-red font-medium">-₹{potentialLoss.toFixed(2)}</span> per unit
                    </p>
                  )}
                </div>

                {/* Target Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <TrendingDown className="h-4 w-4 text-profit-green rotate-180" />
                    Target
                    <span className="text-[10px] font-normal text-text-tertiary">· Auto square-off at this price</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-mono text-sm">₹</span>
                    <input
                      type="number"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                      placeholder={`Above ${position.side === 'LONG' ? '' : 'below'} ₹${position.avgPrice.toFixed(2)}`}
                      step="0.05"
                      className={cn(
                        "w-full h-11 pl-7 pr-4 rounded-xl border bg-bg-surface-alt font-mono text-sm transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary",
                        target && validateValue(target, 'TARGET')
                          ? "border-loss-red bg-loss-red/5"
                          : "border-border hover:border-border/80"
                      )}
                    />
                  </div>
                  {target && validateValue(target, 'TARGET') && (
                    <p className="text-[11px] text-loss-red flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {validateValue(target, 'TARGET')}
                    </p>
                  )}
                  {potentialProfit && !validateValue(target || '', 'TARGET') && (
                    <p className="text-[11px] text-text-tertiary">
                      Max Profit: <span className="text-profit-green font-medium">+₹{potentialProfit.toFixed(2)}</span> per unit
                    </p>
                  )}
                </div>

                {/* Risk/Reward Summary */}
                {(riskRewardRatio || potentialLoss || potentialProfit) && (
                  <div className="p-3 rounded-xl bg-bg-surface-alt border border-border">
                    <p className="text-xs font-semibold text-text-primary mb-2">Risk / Reward Analysis</p>
                    <div className="grid grid-cols-2 gap-3">
                      {potentialLoss && (
                        <div>
                          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Risk</p>
                          <p className="text-sm font-bold text-loss-red">₹{potentialLoss.toFixed(2)}</p>
                        </div>
                      )}
                      {potentialProfit && (
                        <div>
                          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Reward</p>
                          <p className="text-sm font-bold text-profit-green">₹{potentialProfit.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    {riskRewardRatio && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[11px] text-text-secondary">
                          R:R Ratio: <span className={cn(
                            "font-bold",
                            Number(riskRewardRatio) >= 1 ? "text-profit-green" : "text-loss-red"
                          )}>1:{riskRewardRatio}</span>
                          {Number(riskRewardRatio) >= 1 ? " ✅" : " ⚠️"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-xl bg-loss-red/10 border border-loss-red/20">
                    <p className="text-sm text-loss-red flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {error}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStopLoss('');
                      setTarget('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-surface-alt transition-colors"
                  >
                    Clear Both
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      "bg-brand-primary text-white hover:bg-brand-primary-hover",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      loading && "animate-pulse"
                    )}
                  >
                    {loading ? 'Saving...' : 'Save SL & Target'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
