'use client';

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { getUpstoxKey } from '@/lib/upstox-instruments';

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
 * Per-key change detection: Each hook instance only re-renders when the
 * specific keys it subscribes to actually change. Ticks for other symbols
 * are ignored by that consumer's React reconciliation.
 *
 * Usage:
 *   // Auto-subscribe via keys param (preferred):
 *   const { quotes, status } = useLiveQuote(['NSE_EQ|INE002A01018']);
 *   const reliance = quotes['NSE_EQ|INE002A01018'];
 *
 *   // Manual subscribe (backward compat):
 *   const { quotes, subscribe, unsubscribe, status } = useLiveQuote();
 *   useEffect(() => { subscribe(['NSE_EQ|INE002A01018']); return () => unsubscribe([...]); }, []);
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
  | 'polling'
  | 'token_invalid';

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
// Track consecutive 401 (token invalid) responses. After 2 consecutive 401s,
// switch to long-interval polling (30s) and emit 'token_invalid' status so the UI
// can show a "Reconnect Upstox" banner.
let consecutiveAuthErrors = 0;
const AUTH_ERROR_THRESHOLD = 2;
const AUTH_ERROR_BACKOFF = 30000; // 30s poll interval when token is invalid
// Track the last time we received a tick via WebSocket. If WS reports "open"
// but no ticks have arrived within 15s, we (re)start REST polling so the UI
// still gets fresh data. This handles the case where the Cloudflare Worker's
// outbound WS to Upstox connects but receives no ticks.
let lastWsTickTime = 0;
let wsHealthCheckTimer: ReturnType<typeof setInterval> | null = null;

// Server-side reconnection: if client-side reconnect fails N times, call server API
// to push fresh token to worker and trigger reconnection from server side.
let consecutiveReconnectFailures = 0;
const MAX_CLIENT_RECONNECT_FAILURES = 3; // After 3 failures, try server-side reconnect
let serverReconnecting = false;
let serverReconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Per-key change detection infrastructure
// ---------------------------------------------------------------------------

/** Stable empty object returned when no keys are subscribed. */
const EMPTY_QUOTES: Record<string, LiveTick> = {};

/**
 * Registry: maps each quotesListener callback to the set of instrument keys
 * that listener instance cares about. Used for future per-key notification
 * optimization (e.g. only calling listeners whose keys actually changed).
 *
 * WeakMap allows automatic cleanup when a listener callback is garbage-collected.
 */
const interestedKeysMap = new WeakMap<() => void, Set<string>>();

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
      const json = await res.json().catch(() => null);
      if (!json?.success || !json?.data) {
        // Detect token invalid (401) from response body or HTTP status
        const isTokenInvalid = res.status === 401 ||
          (json?.error && typeof json.error === 'string' && (json.error.includes('Invalid token') || json.error.includes('401')));
        if (isTokenInvalid) {
          consecutiveAuthErrors++;
          if (consecutiveAuthErrors >= AUTH_ERROR_THRESHOLD && lastStatus !== 'token_invalid') {
            console.warn('[useLiveQuote] Token invalid (multiple 401s), entering slow poll mode');
            setStatus('token_invalid');
            // Back off to 30s polling
            if (pollingTimer) {
              clearInterval(pollingTimer);
              pollingTimer = setInterval(pollOnce, AUTH_ERROR_BACKOFF);
            }
            // Auto-trigger server-side token refresh
            fetch('/api/upstox/refresh-token', { cache: 'no-store' })
              .then(r => r.json())
              .then(data => {
                if (data.refreshed) {
                  console.log('[useLiveQuote] Token auto-refreshed, resetting auth errors');
                  consecutiveAuthErrors = 0;
                  // Switch back to fast polling
                  if (pollingTimer) {
                    clearInterval(pollingTimer);
                    pollingTimer = setInterval(pollOnce, 800);
                  }
                  if (lastStatus === 'token_invalid') setStatus('polling');
                }
              })
              .catch(() => { /* ignore */ });
          }
        }
        continue;
      }
      // Reset auth error counter on success
      consecutiveAuthErrors = 0;
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

  wsSingleton.addEventListener('open', () => {
    // Reset failure counters on successful connection
    consecutiveReconnectFailures = 0;
    reconnectAttempts = 0;
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

  // Track consecutive failures for server-side reconnect trigger
  if (reconnectAttempts > 2) {
    consecutiveReconnectFailures++;

    // If too many client-side failures, trigger server-side reconnect
    if (consecutiveReconnectFailures >= MAX_CLIENT_RECONNECT_FAILURES && !serverReconnecting) {
      console.warn('[useLiveQuote] Too many reconnect failures, triggering server-side reconnect');
      triggerServerReconnect();
      return;
    }
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureWs();
  }, delay);
}

// Server-side reconnection: calls API to push new token to worker
async function triggerServerReconnect() {
  if (serverReconnecting) return;
  serverReconnecting = true;
  console.log('[useLiveQuote] Triggering server-side worker reconnect...');

  try {
    const res = await fetch('/api/upstox/worker-reconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    console.log('[useLiveQuote] Server reconnect result:', data);

    if (data.success) {
      // Reset counters on success
      consecutiveReconnectFailures = 0;
      reconnectAttempts = 0;

      // Try connecting again after a short delay
      serverReconnectTimer = setTimeout(() => {
        serverReconnecting = false;
        // Close existing WS if any to force fresh connection
        if (wsSingleton) {
          try { wsSingleton.close(); } catch {}
          wsSingleton = null;
        }
        ensureWs();
      }, 2000);
    } else {
      console.error('[useLiveQuote] Server reconnect failed:', data.error);
      // Reset flag so we can try again later
      serverReconnectTimer = setTimeout(() => {
        serverReconnecting = false;
      }, 30000); // Wait 30s before next server attempt
    }
  } catch (e) {
    console.error('[useLiveQuote] Server reconnect error:', e);
    serverReconnectTimer = setTimeout(() => {
      serverReconnecting = false;
    }, 30000);
  }
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

// ---------------------------------------------------------------------------
// React hook — per-key change detection via useSyncExternalStore
// ---------------------------------------------------------------------------

export interface UseLiveQuoteResult {
  quotes: Record<string, LiveTick>;
  status: ConnectionStatus;
  subscribe: (keys: string[]) => void;
  unsubscribe: (keys: string[]) => void;
  ready: boolean;
}

/**
 * Subscribe to live quotes for the given instrument keys.
 *
 * @param keys - Optional array of instrument keys to auto-subscribe. When
 *   provided, the hook automatically subscribes on mount and unsubscribes on
 *   unmount. The component only re-renders when one of THESE keys changes.
 *   If omitted, use the returned `subscribe`/`unsubscribe` methods manually.
 */
export function useLiveQuote(keys?: string[]): UseLiveQuoteResult {
  // --- Refs for per-key change detection ---
  const caredKeysRef = useRef<Set<string>>(new Set(keys ?? []));
  const cachedSnapshotRef = useRef<Record<string, LiveTick> | null>(null);
  const onStoreChangeRef = useRef<() => void>(() => {});
  const mountedRef = useRef(true);
  const subscribedRef = useRef<Set<string>>(new Set());
  // Stable no-op tick callback — each hook instance gets its own stable ref
  // so subscribeKeys/unsubscribeKeys can add/remove it from per-key sets.
  // Re-rendering is now driven by useSyncExternalStore, not by this callback.
  const stableTickCb = useRef<(_tick: LiveTick) => void>(() => {});
  const [status, setStatusState] = useState<ConnectionStatus>(lastStatus);

  // --- useSyncExternalStore: per-key change detection ---
  //
  // getSnapshot compares the current quotesStore timestamps for this
  // consumer's cared keys against the cached snapshot. If none changed,
  // it returns the SAME object reference, which tells React to skip
  // the re-render. If any changed, it builds a new derived snapshot
  // containing only this consumer's keys.
  const getSnapshot = useCallback((): Record<string, LiveTick> => {
    const cared = caredKeysRef.current;
    if (cared.size === 0) return EMPTY_QUOTES;

    const cached = cachedSnapshotRef.current;
    if (cached) {
      // Check if any cared key's timestamp changed
      let changed = false;
      for (const k of cared) {
        if (cached[k]?.timestamp !== quotesStore[k]?.timestamp) {
          changed = true;
          break;
        }
      }
      if (!changed) return cached;
    }

    // Build new derived snapshot with only the cared keys
    const snapshot: Record<string, LiveTick> = {};
    for (const k of cared) {
      if (quotesStore[k]) snapshot[k] = quotesStore[k];
    }
    cachedSnapshotRef.current = snapshot;
    return snapshot;
  }, []);

  // subscribe function for useSyncExternalStore.
  // Registers this consumer's onStoreChange with the global quotesListeners
  // and tracks which keys it cares about in the interestedKeysMap.
  const subscribeToStore = useCallback((onStoreChange: () => void) => {
    onStoreChangeRef.current = onStoreChange;
    interestedKeysMap.set(onStoreChange, new Set(caredKeysRef.current));
    quotesListeners.add(onStoreChange);
    return () => {
      quotesListeners.delete(onStoreChange);
      interestedKeysMap.delete(onStoreChange);
    };
  }, []);

  // Stable server snapshot for SSR hydration
  const getServerSnapshot = useCallback((): Record<string, LiveTick> => EMPTY_QUOTES, []);

  const quotes = useSyncExternalStore(subscribeToStore, getSnapshot, getServerSnapshot);

  // --- Helper: update the interestedKeysMap when cared keys change ---
  const updateInterestedKeys = useCallback(() => {
    const cb = onStoreChangeRef.current;
    if (cb) {
      interestedKeysMap.set(cb, new Set(caredKeysRef.current));
    }
  }, []);

  // --- Auto-subscribe when keys param changes ---
  useEffect(() => {
    const keyArr = keys ?? [];
    if (keyArr.length === 0) return;
    const fresh = keyArr.filter((k) => !subscribedRef.current.has(k));
    if (fresh.length === 0) return;
    fresh.forEach((k) => {
      subscribedRef.current.add(k);
      caredKeysRef.current.add(k);
    });
    // Invalidate snapshot cache so getSnapshot rebuilds with new keys
    cachedSnapshotRef.current = null;
    subscribeKeys(fresh, stableTickCb.current);
    updateInterestedKeys();
    // Trigger React to re-evaluate the snapshot
    onStoreChangeRef.current();
  }, [keys]);

  // --- Subscribe to status changes (unchanged from original) ---
  useEffect(() => {
    const listener = (s: ConnectionStatus) => {
      if (mountedRef.current) setStatusState(s);
    };
    statusListeners.add(listener);
    return () => { statusListeners.delete(listener); };
  }, []);

  // --- Keep WS alive while mounted (unchanged from original) ---
  useEffect(() => {
    mountedRef.current = true;
    wsRefcount++;
    ensureWs();
    return () => {
      mountedRef.current = false;
      wsRefcount--;
      // Unsubscribe all keys this hook instance subscribed to
      const all = Array.from(subscribedRef.current);
      if (all.length > 0) {
        unsubscribeKeys(all, stableTickCb.current);
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

  // --- Manual subscribe (backward compatible) ---
  const subscribe = useCallback((newKeys: string[]) => {
    const fresh = newKeys.filter((k) => !subscribedRef.current.has(k));
    if (fresh.length === 0) return;
    fresh.forEach((k) => {
      subscribedRef.current.add(k);
      caredKeysRef.current.add(k);
    });
    // Invalidate snapshot cache so getSnapshot rebuilds with new keys
    cachedSnapshotRef.current = null;
    subscribeKeys(fresh, stableTickCb.current);
    updateInterestedKeys();
    // Trigger React to re-evaluate the snapshot
    onStoreChangeRef.current();
  }, [updateInterestedKeys]);

  // --- Manual unsubscribe (backward compatible) ---
  const unsubscribe = useCallback((rmKeys: string[]) => {
    rmKeys.forEach((k) => subscribedRef.current.delete(k));
    rmKeys.forEach((k) => caredKeysRef.current.delete(k));
    // Invalidate snapshot cache so getSnapshot rebuilds without removed keys
    cachedSnapshotRef.current = null;
    unsubscribeKeys(rmKeys, stableTickCb.current);
    updateInterestedKeys();
    // Trigger React to re-evaluate the snapshot
    onStoreChangeRef.current();
  }, [updateInterestedKeys]);

  return {
    quotes,
    status,
    subscribe,
    unsubscribe,
    ready: status === 'upstox_connected' || status === 'open' || status === 'polling',
  };
}

// Convenience: auto-subscribe on mount via keys param
export function useLiveQuotesFor(instrumentKeys: string[]): Record<string, LiveTick> {
  const { quotes } = useLiveQuote(instrumentKeys);
  return quotes;
}

/**
 * Convenience: subscribe by stock/index symbol (auto-resolves to Upstox key).
 * Returns the live tick for that symbol, or undefined.
 */
export function useLiveTick(symbol: string | null | undefined): LiveTick | undefined {
  const key = symbol ? getUpstoxKey(symbol) : null;
  const { quotes } = useLiveQuote(key ? [key] : []);
  return key ? quotes[key] : undefined;
}
