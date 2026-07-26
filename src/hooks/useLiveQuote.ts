'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Upstox realtime WebSocket client.
 *
 * Connects to the Cloudflare Worker at NEXT_PUBLIC_UPSTOX_WS_URL
 * (default: wss://upstox-realtime.hzero9393.workers.dev/ws).
 *
 * Usage:
 *   const { quotes, status, subscribe, unsubscribe } = useLiveQuote();
 *   useEffect(() => { subscribe(['NSE_EQ|INE002A01018', 'NSE_INDEX|Nifty 50']); }, []);
 *   const reliance = quotes['NSE_EQ|INE002A01018'];
 *   // reliance.ltp, reliance.change, reliance.changePct, etc.
 */

export interface LiveTick {
  instrumentKey: string;
  ltp?: number;
  change?: number;
  changePct?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  oi?: number;
  bid?: number;
  ask?: number;
  timestamp?: number;
}

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'upstox_connected'
  | 'upstox_disconnected'
  | 'closed'
  | 'error';

const WS_URL =
  process.env.NEXT_PUBLIC_UPSTOX_WS_URL ||
  'wss://upstox-realtime.hzero9393.workers.dev/ws';

// Module-level singleton WebSocket so multiple components share one connection.
let wsSingleton: WebSocket | null = null;
let wsRefcount = 0;
const subscribers = new Map<string, Set<(tick: LiveTick) => void>>();
const statusListeners = new Set<(status: ConnectionStatus) => void>();
let lastStatus: ConnectionStatus = 'idle';
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let pendingSubscribes: Set<string> = new Set();

function setStatus(s: ConnectionStatus) {
  lastStatus = s;
  statusListeners.forEach((cb) => cb(s));
}

function ensureWs() {
  if (wsSingleton && (wsSingleton.readyState === WebSocket.OPEN || wsSingleton.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStatus('connecting');
  try {
    wsSingleton = new WebSocket(WS_URL);
  } catch (e) {
    console.error('[useLiveQuote] WebSocket ctor failed:', e);
    setStatus('error');
    scheduleReconnect();
    return;
  }

  wsSingleton.addEventListener('open', () => {
    setStatus('open');
    reconnectAttempts = 0;
    // Re-subscribe all keys
    if (subscribers.size > 0) {
      const keys = Array.from(subscribers.keys());
      wsSingleton?.send(JSON.stringify({ type: 'subscribe', symbols: keys }));
    }
    // Re-subscribe pending keys
    if (pendingSubscribes.size > 0) {
      const keys = Array.from(pendingSubscribes);
      pendingSubscribes.clear();
      wsSingleton?.send(JSON.stringify({ type: 'subscribe', symbols: keys }));
    }
    // Start heartbeat
    if (!pingTimer) {
      pingTimer = setInterval(() => {
        if (wsSingleton?.readyState === WebSocket.OPEN) {
          wsSingleton.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    }
  });

  wsSingleton.addEventListener('message', (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'tick' && msg.data?.instrumentKey) {
        const tick = msg.data as LiveTick;
        const set = subscribers.get(tick.instrumentKey);
        if (set) set.forEach((cb) => cb(tick));
      } else if (msg.type === 'upstox_connected') {
        setStatus('upstox_connected');
      } else if (msg.type === 'upstox_disconnected') {
        setStatus('upstox_disconnected');
      } else if (msg.type === 'error') {
        console.warn('[useLiveQuote] Worker error:', msg);
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  wsSingleton.addEventListener('close', () => {
    setStatus('closed');
    wsSingleton = null;
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (wsRefcount > 0) scheduleReconnect();
  });

  wsSingleton.addEventListener('error', () => {
    setStatus('error');
    // The close handler will schedule reconnect
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureWs();
  }, delay);
}

function subscribeKeys(keys: string[], cb: (tick: LiveTick) => void) {
  for (const k of keys) {
    if (!subscribers.has(k)) subscribers.set(k, new Set());
    subscribers.get(k)!.add(cb);
  }
  if (wsSingleton?.readyState === WebSocket.OPEN) {
    wsSingleton.send(JSON.stringify({ type: 'subscribe', symbols: keys }));
  } else {
    // Queue for when WS opens
    keys.forEach((k) => pendingSubscribes.add(k));
    ensureWs();
  }
}

function unsubscribeKeys(keys: string[], cb: (tick: LiveTick) => void) {
  const toRemove: string[] = [];
  for (const k of keys) {
    const set = subscribers.get(k);
    if (set) {
      set.delete(cb);
      if (set.size === 0) {
        subscribers.delete(k);
        toRemove.push(k);
      }
    }
  }
  if (toRemove.length > 0 && wsSingleton?.readyState === WebSocket.OPEN) {
    wsSingleton.send(JSON.stringify({ type: 'unsubscribe', symbols: toRemove }));
  }
}

export interface UseLiveQuoteResult {
  quotes: Record<string, LiveTick>;
  status: ConnectionStatus;
  subscribe: (keys: string[]) => void;
  unsubscribe: (keys: string[]) => void;
  ready: boolean;
}

export function useLiveQuote(): UseLiveQuoteResult {
  const [quotes, setQuotes] = useState<Record<string, LiveTick>>({});
  const [status, setStatusState] = useState<ConnectionStatus>(lastStatus);
  const subscribedRef = useRef<Set<string>>(new Set());
  const cbRef = useRef<(tick: LiveTick) => void>(() => {});

  // Update callback ref each render so we always have fresh closure
  cbRef.current = (tick: LiveTick) => {
    setQuotes((prev) => {
      if (prev[tick.instrumentKey]?.ltp === tick.ltp && prev[tick.instrumentKey]?.timestamp === tick.timestamp) {
        return prev; // no change
      }
      return { ...prev, [tick.instrumentKey]: tick };
    });
  };

  // Subscribe to status changes
  useEffect(() => {
    const listener = (s: ConnectionStatus) => setStatusState(s);
    statusListeners.add(listener);
    return () => { statusListeners.delete(listener); };
  }, []);

  const subscribe = useCallback((keys: string[]) => {
    const newKeys = keys.filter((k) => !subscribedRef.current.has(k));
    if (newKeys.length === 0) return;
    newKeys.forEach((k) => subscribedRef.current.add(k));
    subscribeKeys(newKeys, cbRef.current);
  }, []);

  const unsubscribe = useCallback((keys: string[]) => {
    keys.forEach((k) => subscribedRef.current.delete(k));
    unsubscribeKeys(keys, cbRef.current);
  }, []);

  // Keep WS alive while mounted
  useEffect(() => {
    wsRefcount++;
    ensureWs();
    return () => {
      wsRefcount--;
      // Unsubscribe all keys this hook subscribed to
      const all = Array.from(subscribedRef.current);
      if (all.length > 0) {
        unsubscribeKeys(all, cbRef.current);
        subscribedRef.current.clear();
      }
      if (wsRefcount === 0 && wsSingleton) {
        try { wsSingleton.close(); } catch {}
        wsSingleton = null;
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      }
    };
  }, []);

  return { quotes, status, subscribe, unsubscribe, ready: status === 'upstox_connected' || status === 'open' };
}

// Convenience: auto-subscribe on mount
export function useLiveQuotesFor(instrumentKeys: string[]): Record<string, LiveTick> {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const keyStr = instrumentKeys.join(',');
  useEffect(() => {
    if (instrumentKeys.length === 0) return;
    subscribe(instrumentKeys);
    return () => unsubscribe(instrumentKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyStr]);
  return quotes;
}
