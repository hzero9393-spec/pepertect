'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLiveQuote, type LiveTick } from '@/hooks/useLiveQuote';
import { getUpstoxKey } from '@/lib/upstox-instruments';

/**
 * LivePriceText — auto-subscribes to a single instrument key and renders
 * the live LTP with optional change/changePct coloring and a small "LIVE"
 * pulse badge when ticks are flowing.
 *
 * Usage:
 *   <LivePriceText symbol="RELIANCE" />                              // just LTP
 *   <LivePriceText symbol="RELIANCE" showChange />                   // LTP + change%
 *   <LivePriceText symbol="NIFTY" fallbackPrice={idx.lastPrice} />   // with fallback
 *   <LivePriceText instrumentKey="NSE_INDEX|Nifty 50" showChange />
 */
export function LivePriceText({
  symbol,
  instrumentKey,
  fallbackPrice,
  fallbackChangePct,
  showChange = false,
  showLiveBadge = false,
  className,
  priceClassName,
  changeClassName,
  prefix = '₹',
  decimals = 2,
  size = 'md',
}: {
  symbol?: string;
  instrumentKey?: string;
  fallbackPrice?: number;
  fallbackChangePct?: number;
  showChange?: boolean;
  showLiveBadge?: boolean;
  className?: string;
  priceClassName?: string;
  changeClassName?: string;
  prefix?: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const key = instrumentKey ?? (symbol ? getUpstoxKey(symbol) : null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!key) return;
    subscribe([key]);
    subscribedRef.current = true;
    return () => {
      if (subscribedRef.current) {
        unsubscribe([key]);
        subscribedRef.current = false;
      }
    };
  }, [key, subscribe, unsubscribe]);

  const tick: LiveTick | undefined = key ? quotes[key] : undefined;
  const ltp = tick?.ltp ?? fallbackPrice ?? 0;
  const changePct = tick?.changePct ?? fallbackChangePct ?? 0;
  const isUp = (tick?.change ?? 0) >= 0;
  const isLive = !!tick?.timestamp && Date.now() - tick.timestamp < 30000;

  const sizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }[size];

  const fmt = (n: number) => {
    return n.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'font-mono tabular-nums font-semibold transition-colors',
          sizeClass,
          tick ? 'text-text-primary' : 'text-text-secondary',
          priceClassName
        )}
      >
        {prefix}{fmt(ltp)}
      </span>
      {showChange && (
        <span
          className={cn(
            'font-mono text-[10px] tabular-nums font-medium',
            isUp ? 'text-profit-green' : 'text-loss-red',
            changeClassName
          )}
        >
          {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
        </span>
      )}
      {showLiveBadge && isLive && (
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse" />
      )}
    </span>
  );
}

/**
 * LiveChangeBadge — shows ▲/▼ + changePct in a pill, auto-subscribed.
 */
export function LiveChangeBadge({
  symbol,
  instrumentKey,
  fallbackChangePct,
  className,
}: {
  symbol?: string;
  instrumentKey?: string;
  fallbackChangePct?: number;
  className?: string;
}) {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const key = instrumentKey ?? (symbol ? getUpstoxKey(symbol) : null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!key) return;
    subscribe([key]);
    subscribedRef.current = true;
    return () => {
      if (subscribedRef.current) {
        unsubscribe([key]);
        subscribedRef.current = false;
      }
    };
  }, [key, subscribe, unsubscribe]);

  const tick = key ? quotes[key] : undefined;
  const changePct = tick?.changePct ?? fallbackChangePct ?? 0;
  const isUp = (tick?.change ?? 0) >= 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums',
        isUp ? 'bg-profit-green/10 text-profit-green' : 'bg-loss-red/10 text-loss-red',
        className
      )}
    >
      {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
    </span>
  );
}

/**
 * LiveTickPulse — small green/red dot showing if ticks are flowing.
 * Returns null until first tick arrives, then shows a pulsing dot.
 */
export function LiveTickPulse({
  symbol,
  instrumentKey,
  className,
}: {
  symbol?: string;
  instrumentKey?: string;
  className?: string;
}) {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const key = instrumentKey ?? (symbol ? getUpstoxKey(symbol) : null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!key) return;
    subscribe([key]);
    subscribedRef.current = true;
    return () => {
      if (subscribedRef.current) {
        unsubscribe([key]);
        subscribedRef.current = false;
      }
    };
  }, [key, subscribe, unsubscribe]);

  const tick = key ? quotes[key] : undefined;
  const isUp = (tick?.change ?? 0) >= 0;
  const isLive = !!tick?.timestamp && Date.now() - tick.timestamp < 30000;

  if (!isLive) return null;
  return (
    <span
      className={cn(
        'inline-flex h-1.5 w-1.5 rounded-full animate-pulse',
        isUp ? 'bg-profit-green' : 'bg-loss-red',
        className
      )}
    />
  );
}

/**
 * useLivePrice — convenience hook returning the live tick for a symbol.
 * Mirrors useLiveTick but with a stable reference and explicit fallback.
 */
export function useLivePrice(
  symbol: string | null | undefined,
  fallback?: { ltp?: number; change?: number; changePct?: number; open?: number; high?: number; low?: number; close?: number; volume?: number; oi?: number }
): LiveTick | undefined {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const key = symbol ? getUpstoxKey(symbol) : null;
  const subscribedRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastKeyRef.current && lastKeyRef.current !== key) {
      unsubscribe([lastKeyRef.current]);
      subscribedRef.current = false;
    }
    if (key) {
      subscribe([key]);
      subscribedRef.current = true;
      lastKeyRef.current = key;
    } else {
      lastKeyRef.current = null;
    }
    return () => {
      if (subscribedRef.current && lastKeyRef.current) {
        unsubscribe([lastKeyRef.current]);
        subscribedRef.current = false;
      }
    };
  }, [key, subscribe, unsubscribe]);

  const tick = key ? quotes[key] : undefined;
  if (!tick && fallback) {
    return {
      instrumentKey: key ?? symbol ?? '',
      ltp: fallback.ltp,
      change: fallback.change,
      changePct: fallback.changePct,
      open: fallback.open,
      high: fallback.high,
      low: fallback.low,
      close: fallback.close,
      volume: fallback.volume,
      oi: fallback.oi,
      timestamp: 0,
    };
  }
  return tick;
}
