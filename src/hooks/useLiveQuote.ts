'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Upstox realtime WebSocket client with REST polling fallback.
 *
 * Connects to the Cloudflare Worker at NEXT_PUBLIC_UPSTOX_WS_URL
 * (default: wss://upstox-realtime.hzero9393.workers.dev/ws).
 *
 * If the WebSocket is not connected within 4 seconds, or after a disconnect,
 * the hook transparently falls back to polling /api/market/live-quote every 5s
 * for all currently-subscribed instrument keys. The moment the WebSocket
 * reconnects, polling stops.
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
  | 'error'
  | 'polling';

const WS_URL =
  process.env.NEXT_PUBLIC_UPSTOX_WS_URL ||
  'wss://upstox-realtime.hzero9393.workers.dev/ws';

// Module-level singleton WebSocket so multiple components share one connection.
let wsSingleton: WebSocket | null = null;
let wsRefcount = 0;
const subscribers = new Map<string, Set<(tick: LiveTick) => void>>();
const statusListeners = new Set<(status: ConnectionStatus) => void>();
const quotesStore: Record<string, LiveTick> = {};
const quotesListeners = new Set<() => void>();
let lastStatus: ConnectionStatus = 'idle';
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let pendingSubscribes: Set<string> = new Set();
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let pollingActive = false;
let wsOpenTime = 0;
let lastPollTime = 0;
// Track the last time we received a tick via WebSocket. If WS reports "open"
// but no ticks have arrived within 15s, we (re)start REST polling so the UI
// still gets fresh data. This handles the case where the Cloudflare Worker's
// outbound WS to Upstox connects but receives no ticks.
let lastWsTickTime = 0;
let wsHealthCheckTimer: ReturnType<typeof setInterval> | null = null;

function setStatus(s: ConnectionStatus) {
  lastStatus = s;
  statusListeners.forEach((cb) => cb(s));
}

function emitQuotesChanged() {
  quotesListeners.forEach((cb) => cb());
}

function applyTick(tick: LiveTick) {
  if (!tick?.instrumentKey) return;
  const prev = quotesStore[tick.instrumentKey];
  if (prev && prev.ltp === tick.ltp && prev.timestamp === tick.timestamp) return;
  quotesStore[tick.instrumentKey] = { ...prev, ...tick };
  const set = subscribers.get(tick.instrumentKey);
  if (set) set.forEach((cb) => cb(tick));
  emitQuotesChanged();
}

// ---------------------------------------------------------------------------
// REST polling fallback — used when WebSocket is not connected
// ---------------------------------------------------------------------------
async function pollOnce() {
  if (subscribers.size === 0) return;
  const now = Date.now();
  // 5x faster: throttle 3s → 600ms (allows true 800ms polling cadence)
  if (now - lastPollTime < 600) return;
  lastPollTime = now;
  const keys = Array.from(subscribers.keys());
  // Batch in groups of 20 to avoid huge URL length
  for (let i = 0; i < keys.length; i += 20) {
    const batch = keys.slice(i, i + 20);
    const params = new URLSearchParams();
    params.set('instrument_keys', batch.join(','));
    params.set('full', '1');
    try {
      const res = await fetch(`/api/market/live-quote?${params.toString()}`);
      if (!res.ok) continue;
      const json = await res.json();
      if (!json?.success || !json?.data) continue;
      // Upstox returns data keyed by colon-form (e.g. "NSE_INDEX:Nifty 50")
      // but our subscription keys use pipe-form (e.g. "NSE_INDEX|Nifty 50").
      // The /api/market/live-quote route normalizes keys to pipe-form, but
      // as defense-in-depth we also try colon-form lookup here.
      for (const k of batch) {
        const colonKey = k.replace(/\|/g, ':');
        const d = json.data[k] ?? json.data[colonKey];
        if (!d) continue;
        const ltp = typeof d.last_price === 'number' ? d.last_price : undefined;
        const close = d.ohlc?.close;
        const change = typeof d.net_change === 'number'
          ? d.net_change
          : (ltp != null && close != null ? ltp - close : undefined);
        const changePct = (change != null && close && close > 0)
          ? (change / close) * 100
          : undefined;
        applyTick({
          instrumentKey: k,
          ltp,
          change,
          changePct,
          open: d.ohlc?.open,
          high: d.ohlc?.high,
          low: d.ohlc?.low,
          close,
          volume: d.volume,
          oi: d.oi,
          bid: d.bid,
          ask: d.ask,
          timestamp: Date.now(),
        });
      }
    } catch {
      // ignore — will retry next interval
    }
  }
}

function startPolling() {
  if (pollingActive) return;
  pollingActive = true;
  if (lastStatus !== 'error' && lastStatus !== 'closed') {
    setStatus('polling');
  }
  // Immediate poll
  pollOnce();
  // 5x faster: 4s → 800ms polling cadence for near-real-time updates.
  // Upstox Plus plan rate limit is ~25 req/s for LTP and ~10 req/s for quotes,
  // so a 800ms cadence with batches of 20 keys stays well within limits.
  pollingTimer = setInterval(pollOnce, 800);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  pollingActive = false;
}

function ensureWs() {
  if (wsSingleton && (wsSingleton.readyState === WebSocket.OPEN || wsSingleton.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStatus('connecting');
  try {
    wsSingleton = new WebSocket(WS_URL);
    wsOpenTime = Date.now();
  } catch (e) {
    console.error('[useLiveQuote] WebSocket ctor failed:', e);
    setStatus('error');
    scheduleReconnect();
    startPolling();
    return;
  }

  // If WS doesn't open within 2s, start polling fallback (don't wait).
  // 5x faster than the previous 4s grace period so users see live data ASAP.
  const fallbackStarter = setTimeout(() => {
    if (wsSingleton?.readyState !== WebSocket.OPEN) {
      if (!pollingActive) startPolling();
    }
  }, 2000);

  wsSingleton.addEventListener('open', () => {
    clearTimeout(fallbackStarter);
    setStatus('open');
    reconnectAttempts = 0;
    // NOTE: We intentionally do NOT call stopPolling() here.
    // The CF Worker's outbound WS to Upstox may report "open" but receive
    // zero ticks (known CF Workers limitation). We keep REST polling active
    // until we receive at least one real WS tick, then stop polling.
    // The health-check interval below handles this transition.
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
    // Start heartbeat (client → worker)
    if (!pingTimer) {
      pingTimer = setInterval(() => {
        if (wsSingleton?.readyState === WebSocket.OPEN) {
          wsSingleton.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    }
    // Start WS health check — if no ticks arrive within 15s of WS opening,
    // ensure REST polling is running (the WS may be silently broken).
    if (!wsHealthCheckTimer) {
      // Give WS a 6s head-start to deliver its first tick before checking
      wsHealthCheckTimer = setInterval(() => {
        if (!pollingActive && Date.now() - lastWsTickTime > 15000) {
          // WS is open but hasn't delivered a tick in 15s — start polling
          console.warn('[useLiveQuote] WS open but no ticks for 15s, starting REST polling fallback');
          startPolling();
        } else if (pollingActive && Date.now() - lastWsTickTime < 5000) {
          // WS is delivering ticks again — stop polling
          console.log('[useLiveQuote] WS ticks resumed, stopping REST polling');
          stopPolling();
          if (lastStatus === 'polling') setStatus('upstox_connected');
        }
      }, 6000);
    }
  });

  wsSingleton.addEventListener('message', (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'tick' && msg.data?.instrumentKey) {
        const tick = msg.data as LiveTick;
        lastWsTickTime = Date.now();
        applyTick(tick);
        // If polling is still running, stop it now — WS is delivering
        if (pollingActive) {
          stopPolling();
          if (lastStatus === 'polling') setStatus('upstox_connected');
        }
      } else if (msg.type === 'upstox_connected') {
        setStatus('upstox_connected');
      } else if (msg.type === 'upstox_disconnected') {
        setStatus('upstox_disconnected');
        // Upstox upstream disconnected — restart polling as a safety net
        if (!pollingActive) startPolling();
      } else if (msg.type === 'error') {
        console.warn('[useLiveQuote] Worker error:', msg);
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  wsSingleton.addEventListener('close', () => {
    clearTimeout(fallbackStarter);
    setStatus('closed');
    wsSingleton = null;
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (wsHealthCheckTimer) { clearInterval(wsHealthCheckTimer); wsHealthCheckTimer = null; }
    if (wsRefcount > 0) {
      scheduleReconnect();
      startPolling();
    }
  });

  wsSingleton.addEventListener('error', () => {
    setStatus('error');
    // The close handler will schedule reconnect + start polling
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
    // Also start polling immediately so user sees data while WS connects
    if (!pollingActive) {
      // Give WS a brief grace period; polling will start automatically after 4s if WS not open
      // But if user just subscribed and WS is closed, start polling now
      if (wsSingleton?.readyState !== WebSocket.CONNECTING) {
        startPolling();
      }
    }
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
        // Also clean up stored quote
        delete quotesStore[k];
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
  // useSyncExternalStore-like pattern: subscribe to changes via listeners
  const [, setVersion] = useState(0);
  const [status, setStatusState] = useState<ConnectionStatus>(lastStatus);
  const subscribedRef = useRef<Set<string>>(new Set());
  const cbRef = useRef<(tick: LiveTick) => void>(() => {});
  const mountedRef = useRef(true);

  // Force re-render whenever quotes change (but throttled)
  useEffect(() => {
    const listener = () => {
      if (mountedRef.current) setVersion((v) => v + 1);
    };
    quotesListeners.add(listener);
    return () => { quotesListeners.delete(listener); };
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    const listener = (s: ConnectionStatus) => {
      if (mountedRef.current) setStatusState(s);
    };
    statusListeners.add(listener);
    return () => { statusListeners.delete(listener); };
  }, []);

  // Update callback ref each render so we always have fresh closure
  cbRef.current = (tick: LiveTick) => {
    // Quotes are stored in module-level quotesStore; we just trigger re-render
    setVersion((v) => v + 1);
  };

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
    mountedRef.current = true;
    wsRefcount++;
    ensureWs();
    return () => {
      mountedRef.current = false;
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
        if (wsHealthCheckTimer) { clearInterval(wsHealthCheckTimer); wsHealthCheckTimer = null; }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        stopPolling();
      }
    };
  }, []);

  return {
    quotes: quotesStore,
    status,
    subscribe,
    unsubscribe,
    ready: status === 'upstox_connected' || status === 'open',
  };
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

/**
 * Convenience: subscribe by stock/index symbol (auto-resolves to Upstox key).
 * Returns the live tick for that symbol, or undefined.
 */
export function useLiveTick(symbol: string | null | undefined): LiveTick | undefined {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  // Lazy-import to avoid circular deps in some build setups
  const getUpstoxKey = (s: string) => {
    // We do a runtime require here so this hook can be used in any context
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@/lib/upstox-instruments');
      return mod.getUpstoxKey(s);
    } catch {
      return null;
    }
  };
  const key = symbol ? getUpstoxKey(symbol) : null;
  useEffect(() => {
    if (!key) return;
    subscribe([key]);
    return () => unsubscribe([key]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return key ? quotes[key] : undefined;
}
