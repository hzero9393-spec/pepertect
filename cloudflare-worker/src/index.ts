/**
 * Upstox Realtime Worker (simplified, no hibernation API)
 *
 * Architecture:
 * - Single Durable Object "UpstoxFeed" maintains ONE persistent WebSocket
 *   connection to Upstox market data feed (v3).
 * - Browser clients connect to this Worker via WebSocket.
 * - Clients send `subscribe` / `unsubscribe` messages with instrument keys.
 * - Worker broadcasts each Upstox tick to all subscribed clients.
 */

export interface Env {
  UPSTOX_FEED: DurableObjectNamespace;
  UPSTOX_API_KEY: string;
  UPSTOX_API_SECRET: string;
  UPSTOX_ACCESS_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------
function corsHeaders(env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '*');
  return {
    'Access-Control-Allow-Origin': allowed.split(',')[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// ---------------------------------------------------------------------------
// Main Worker entrypoint
// ---------------------------------------------------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    if (url.pathname === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (upgrade !== 'websocket') {
        return new Response('Expected Upgrade: websocket', {
          status: 426,
          headers: corsHeaders(env),
        });
      }
      const id = env.UPSTOX_FEED.idFromName('global');
      const stub = env.UPSTOX_FEED.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === '/refresh-token' && request.method === 'POST') {
      const body = await request.json() as { token: string };
      if (!body.token) {
        return new Response(JSON.stringify({ error: 'token required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
        });
      }
      const id = env.UPSTOX_FEED.idFromName('global');
      const stub = env.UPSTOX_FEED.get(id);
      const result = await stub.fetch(new Request('https://do/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ token: body.token }),
      }));
      return new Response(await result.text(), {
        status: result.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    if (url.pathname === '/stats') {
      const id = env.UPSTOX_FEED.idFromName('global');
      const stub = env.UPSTOX_FEED.get(id);
      const result = await stub.fetch(new Request('https://do/stats'));
      return new Response(await result.text(), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    if (url.pathname === '/debug') {
      const id = env.UPSTOX_FEED.idFromName('global');
      const stub = env.UPSTOX_FEED.get(id);
      const result = await stub.fetch(new Request('https://do/debug'));
      return new Response(await result.text(), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
      });
    }

    // ----- HTTP proxy endpoints (REST → Upstox API) -----
    // These allow the Next.js app to fetch live data from the worker using
    // the token stored on the worker, removing the need to share env vars.
    if (url.pathname === '/ltp' && request.method === 'GET') {
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/market-quote/ltp', url.searchParams, corsHeaders(env));
    }
    if (url.pathname === '/quotes' && request.method === 'GET') {
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/market-quote/quotes', url.searchParams, corsHeaders(env));
    }
    if (url.pathname === '/ohlc' && request.method === 'GET') {
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/market-quote/ohlc', url.searchParams, corsHeaders(env));
    }
    if (url.pathname === '/full-quote' && request.method === 'GET') {
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/market-quote/quotes', url.searchParams, corsHeaders(env));
    }
    if (url.pathname === '/option-chain' && request.method === 'GET') {
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/option/chain', url.searchParams, corsHeaders(env));
    }
    if (url.pathname === '/historical' && request.method === 'GET') {
      // Forward to historical candle endpoint, but the path includes instrument_key
      // e.g. /historical?instrument_key=NSE_EQ|INE002A01018&interval=1d&from=...&to=...
      const ik = url.searchParams.get('instrument_key') || '';
      const interval = url.searchParams.get('interval') || '1d';
      const from = url.searchParams.get('from') || '';
      const to = url.searchParams.get('to') || '';
      const target = `https://api.upstox.com/v2/historical-candle/${ik}/${interval}/${from}/${to}`;
      return proxyToUpstox(request, env, target, null, corsHeaders(env));
    }
    if (url.pathname === '/profile' && request.method === 'GET') {
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/user/profile', null, corsHeaders(env));
    }
    if (url.pathname === '/instruments' && request.method === 'GET') {
      // Forwarded as-is — instruments API doesn't need auth, but we proxy for consistency
      return proxyToUpstox(request, env, 'https://api.upstox.com/v2/instruments/' + (url.search || ''), null, corsHeaders(env));
    }

    return new Response('Upstox Realtime Worker. Endpoints: /ws /health /stats /debug /ltp /quotes /ohlc /option-chain /historical /profile /instruments /refresh-token', {
      headers: { 'Content-Type': 'text/plain', ...corsHeaders(env) },
    });
  },
};

// ---------------------------------------------------------------------------
// HTTP proxy: forward request to Upstox REST API with the worker's token
// ---------------------------------------------------------------------------
async function proxyToUpstox(
  request: Request,
  env: Env,
  url: string,
  searchParams: URLSearchParams | null,
  cors: Record<string, string>
): Promise<Response> {
  // Get current token from the Durable Object (in-memory) or fall back to env var
  const doId = env.UPSTOX_FEED.idFromName('global');
  const stub = env.UPSTOX_FEED.get(doId);
  const tokenRes = await stub.fetch(new Request('https://do/get-token'));
  const tokenJson = await tokenRes.json() as { token: string | null };
  const token = tokenJson.token || env.UPSTOX_ACCESS_TOKEN;

  if (!token) {
    return new Response(JSON.stringify({
      status: 'error',
      errors: [{ errorCode: 'NO_TOKEN', message: 'Worker has no Upstox access token. POST /refresh-token first.' }],
    }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });
  }

  const finalUrl = searchParams ? `${url}?${searchParams.toString()}` : url;
  try {
    const res = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json', ...cors },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({
      status: 'error',
      errors: [{ errorCode: 'WORKER_FETCH_FAILED', message: e?.message || String(e) }],
    }), { status: 502, headers: { 'Content-Type': 'application/json', ...cors } });
  }
}

// ---------------------------------------------------------------------------
// Durable Object — maintains ONE Upstox WebSocket + N browser clients
// ---------------------------------------------------------------------------
export class UpstoxFeed {
  // Bump this when forcing DO to reload with new code
  static VERSION = 'v3-decoder-fix';
  
  private state: DurableObjectState;
  private env: Env;

  // Upstox upstream WebSocket
  private upstoxWs: WebSocket | null = null;
  private upstoxReady = false;
  private upstoxConnecting = false;
  private currentToken: string | null = null;

  // Subscribed instrument keys (aggregate across all browser clients)
  private subscribedKeys: Set<string> = new Set();

  // Browser clients: ws -> set of instrument keys they care about
  private clients: Map<WebSocket, Set<string>> = new Map();

  // Heartbeat
  private lastUpstoxMessage = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Debug log buffer (most recent first)
  private debugLogs: Array<{ ts: number; level: string; msg: string }> = [];

  private log(level: string, msg: string) {
    const entry = { ts: Date.now(), level, msg };
    this.debugLogs.unshift(entry);
    if (this.debugLogs.length > 100) this.debugLogs.pop();
    if (level === 'error') console.error(`[UpstoxFeed] ${msg}`);
    else console.log(`[UpstoxFeed] ${msg}`);
  }

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleBrowserClient(request);
    }

    if (url.pathname === '/refresh-token' && request.method === 'POST') {
      const body = await request.json() as { token: string };
      this.currentToken = body.token;
      this.disconnectUpstox();
      this.connectUpstox();
      return new Response(JSON.stringify({ ok: true, msg: 'Token updated, reconnecting' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/stats') {
      return new Response(JSON.stringify({
        upstoxReady: this.upstoxReady,
        upstoxConnecting: this.upstoxConnecting,
        subscribedKeys: Array.from(this.subscribedKeys),
        subscribedCount: this.subscribedKeys.size,
        clientCount: this.clients.size,
        hasToken: !!(this.currentToken || this.env.UPSTOX_ACCESS_TOKEN),
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/debug') {
      return new Response(JSON.stringify({
        version: UpstoxFeed.VERSION,
        stats: {
          upstoxReady: this.upstoxReady,
          upstoxConnecting: this.upstoxConnecting,
          clientCount: this.clients.size,
          subscribedCount: this.subscribedKeys.size,
          hasToken: !!(this.currentToken || this.env.UPSTOX_ACCESS_TOKEN),
          tickCount: this.tickCount,
          binaryMsgCount: this.binaryMsgCount,
          failedDecodeCount: this.failedDecodeCount,
        },
        logs: this.debugLogs.slice(0, 30),
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/get-token' && request.method === 'GET') {
      const token = this.currentToken || this.env.UPSTOX_ACCESS_TOKEN || null;
      return new Response(JSON.stringify({ token }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404 });
  }

  // -------------------------------------------------------------------------
  // Browser client handling
  // -------------------------------------------------------------------------
  private handleBrowserClient(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // IMPORTANT: do NOT use acceptWebSocket (hibernation API) — we keep
    // the connection alive in the request context instead.
    server.accept();

    this.clients.set(server, new Set());

    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
          this.handleSubscribe(server, msg.symbols as string[]);
        } else if (msg.type === 'unsubscribe' && Array.isArray(msg.symbols)) {
          this.handleUnsubscribe(server, msg.symbols as string[]);
        } else if (msg.type === 'ping') {
          server.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch (e) {
        server.send(JSON.stringify({ type: 'error', msg: 'Invalid message' }));
      }
    });

    server.addEventListener('close', () => {
      this.handleClientDisconnect(server);
    });

    server.addEventListener('error', () => {
      this.handleClientDisconnect(server);
    });

    server.send(JSON.stringify({
      type: 'hello',
      msg: 'Connected to Upstox realtime feed',
      upstoxReady: this.upstoxReady,
    }));

    // Trigger Upstox connect if not already
    if (!this.upstoxWs && !this.upstoxConnecting) {
      this.connectUpstox();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleSubscribe(ws: WebSocket, symbols: string[]) {
    const clientSet = this.clients.get(ws);
    if (!clientSet) return;
    const newKeys: string[] = [];
    for (const s of symbols) {
      clientSet.add(s);
      if (!this.subscribedKeys.has(s)) {
        this.subscribedKeys.add(s);
        newKeys.push(s);
      }
    }
    if (newKeys.length > 0) {
      this.sendUpstoxSubscribe(newKeys);
    }
    ws.send(JSON.stringify({ type: 'subscribed', symbols, count: clientSet.size }));
  }

  private handleUnsubscribe(ws: WebSocket, symbols: string[]) {
    const clientSet = this.clients.get(ws);
    if (!clientSet) return;
    for (const s of symbols) {
      clientSet.delete(s);
    }
    const toRemove: string[] = [];
    for (const s of symbols) {
      let stillNeeded = false;
      for (const [, set] of this.clients) {
        if (set.has(s)) { stillNeeded = true; break; }
      }
      if (!stillNeeded) {
        this.subscribedKeys.delete(s);
        toRemove.push(s);
      }
    }
    if (toRemove.length > 0) {
      this.sendUpstoxUnsubscribe(toRemove);
    }
    ws.send(JSON.stringify({ type: 'unsubscribed', symbols }));
  }

  private handleClientDisconnect(ws: WebSocket) {
    const clientSet = this.clients.get(ws);
    if (!clientSet) return;
    const toRemove: string[] = [];
    for (const s of clientSet) {
      let stillNeeded = false;
      for (const [otherWs, set] of this.clients) {
        if (otherWs !== ws && set.has(s)) { stillNeeded = true; break; }
      }
      if (!stillNeeded) {
        this.subscribedKeys.delete(s);
        toRemove.push(s);
      }
    }
    this.clients.delete(ws);
    if (toRemove.length > 0) {
      this.sendUpstoxUnsubscribe(toRemove);
    }
  }

  // -------------------------------------------------------------------------
  // Upstox WebSocket connection
  // -------------------------------------------------------------------------
  private async connectUpstox() {
    if (this.upstoxConnecting || this.upstoxWs) return;
    this.upstoxConnecting = true;

    try {
      const token = this.currentToken || this.env.UPSTOX_ACCESS_TOKEN;
      if (!token) {
        this.log('error', 'No access token available');
        this.upstoxConnecting = false;
        return;
      }

      this.log('info', 'Authorizing with Upstox...');

      const authRes = await fetch('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        this.log('error', `Auth failed: ${authRes.status} ${errText.substring(0, 200)}`);
        this.broadcast({ type: 'error', msg: 'Upstox auth failed', status: authRes.status, detail: errText });
        this.upstoxConnecting = false;
        this.scheduleReconnect(30000);
        return;
      }

      const authData = await authRes.json() as { data: { authorizedRedirectUri: string } };
      const wsUrl = authData.data.authorizedRedirectUri;
      this.log('info', `Got Upstox WS URL: ${wsUrl.substring(0, 100)}...`);

      // Cloudflare Workers DOES NOT support `new WebSocket(url)` for outbound
      // connections — the constructor exists but events never fire. The only
      // supported pattern is `fetch()` with an `Upgrade: websocket` header,
      // which returns a Response with a `.webSocket` property.
      // The wss:// URL must be converted to https:// for fetch().
      let upstoxWs: WebSocket | null = null;

      const httpsUrl = wsUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
      this.log('info', `fetch(${httpsUrl.substring(0, 80)}...) with Upgrade: websocket`);

      try {
        const upgradeRes = await fetch(httpsUrl, {
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
          },
        });
        if (upgradeRes.webSocket) {
          upstoxWs = upgradeRes.webSocket;
          this.log('info', 'WebSocket upgrade accepted by Cloudflare');
        } else {
          this.log('error', `No webSocket in response: status=${upgradeRes.status}`);
          // Fallback: try direct new WebSocket (rarely works on CF Workers,
          // but worth trying as a last resort)
          try {
            upstoxWs = new WebSocket(wsUrl);
            this.log('info', 'Fallback: trying new WebSocket(wssUrl)');
          } catch (e1) {
            this.log('error', `Fallback new WebSocket() failed: ${String(e1).substring(0, 200)}`);
          }
        }
      } catch (e) {
        this.log('error', `fetch() upgrade failed: ${String(e).substring(0, 200)}`);
        // Last-resort fallback
        try {
          upstoxWs = new WebSocket(wsUrl);
          this.log('info', 'Last-resort: trying new WebSocket(wssUrl)');
        } catch (e1) {
          this.log('error', `Last-resort new WebSocket() failed: ${String(e1).substring(0, 200)}`);
        }
      }

      if (!upstoxWs) {
        this.broadcast({ type: 'error', msg: 'All WebSocket connection strategies failed' });
        this.upstoxConnecting = false;
        this.scheduleReconnect(15000);
        return;
      }

      this.upstoxWs = upstoxWs;

      // Cloudflare requires accepting the outbound WebSocket before events fire
      try { upstoxWs.accept(); } catch {}

      // For outbound WebSockets via fetch() on Cloudflare Workers, the `open`
      // event may never fire (the WS is already open by the time we get the
      // response). To be safe, we mark ready immediately and also register
      // an `open` listener that re-applies subscriptions idempotently.
      const markReady = () => {
        if (this.upstoxReady) return;
        this.log('info', '✅ Connected to Upstox');
        this.upstoxReady = true;
        this.upstoxConnecting = false;
        this.lastUpstoxMessage = Date.now();
        this.startHeartbeat();
        this.broadcast({ type: 'upstox_connected' });
        // Re-subscribe to all previously wanted keys
        if (this.subscribedKeys.size > 0) {
          this.sendUpstoxSubscribe(Array.from(this.subscribedKeys));
        }
      };
      // Call markReady() on next tick — gives event listeners time to register
      // but doesn't wait for an `open` event that may never fire on CF Workers.
      setTimeout(markReady, 0);

      upstoxWs.addEventListener('open', markReady);

      upstoxWs.addEventListener('message', (event: MessageEvent) => {
        this.lastUpstoxMessage = Date.now();
        this.handleUpstoxMessage(event.data);
      });

      upstoxWs.addEventListener('close', () => {
        this.log('info', 'Upstox WS closed');
        this.upstoxReady = false;
        this.upstoxWs = null;
        this.upstoxConnecting = false;
        this.stopHeartbeat();
        this.broadcast({ type: 'upstox_disconnected' });
        this.scheduleReconnect(3000);
      });

      upstoxWs.addEventListener('error', (err: Event) => {
        this.log('error', `WS error: ${String(err).substring(0, 200)}`);
        this.upstoxReady = false;
      });
    } catch (e) {
      this.log('error', `Connect failed: ${String(e).substring(0, 300)}`);
      this.upstoxConnecting = false;
      this.scheduleReconnect(5000);
    }
  }

  private scheduleReconnect(delayMs: number) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectUpstox();
    }, delayMs);
  }

  private disconnectUpstox() {
    if (this.upstoxWs) {
      try { this.upstoxWs.close(); } catch {}
      this.upstoxWs = null;
    }
    this.upstoxReady = false;
    this.upstoxConnecting = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private tickCount = 0;
  private lastTickLogTime = 0;
  private binaryMsgCount = 0;
  private gzipMsgCount = 0;
  private failedDecodeCount = 0;

  private handleUpstoxMessage(raw: ArrayBuffer | string) {
    // Try JSON first (for control messages)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        this.broadcast({ type: 'upstox_control', data: parsed });
        return;
      } catch {}
    }

    this.binaryMsgCount++;
    const bytes = new Uint8Array(raw as ArrayBuffer);
    if (bytes.length > 0 && bytes[0] === 1) {
      this.gzipMsgCount++;
    }

    // Binary protobuf decode
    try {
      const tick = decodeUpstoxTick(raw);
      if (tick) {
        this.tickCount++;
        // Log every 30s with stats — don't spam logs
        const now = Date.now();
        if (now - this.lastTickLogTime > 30000) {
          this.log('info', `Tick stats: total=${this.tickCount} binary=${this.binaryMsgCount} gzip=${this.gzipMsgCount} failed=${this.failedDecodeCount}`);
          this.lastTickLogTime = now;
        }
        this.broadcastTick(tick);
      } else {
        this.failedDecodeCount++;
        // Log first few failed decodes for debugging
        if (this.failedDecodeCount <= 3) {
          const preview = Array.from(bytes.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          this.log('warn', `Decode failed (#${this.failedDecodeCount}): len=${bytes.length} first_byte=${bytes[0]} preview=${preview}`);
        }
      }
    } catch (e) {
      this.failedDecodeCount++;
    }
  }

  private sendUpstoxSubscribe(keys: string[]) {
    if (!this.upstoxWs || !this.upstoxReady) {
      this.log('info', `Skipping subscribe — Upstox not ready (${keys.length} keys queued)`);
      return;
    }
    const msg = {
      guid: 'pepertect-feed',
      method: 'sub',
      data: {
        mode: 'full',
        instrumentKeys: keys,
      },
    };
    try {
      this.upstoxWs.send(JSON.stringify(msg));
      this.log('info', `Subscribed to ${keys.length} instruments`);
    } catch (e) {
      this.log('error', `Subscribe failed: ${String(e).substring(0, 200)}`);
    }
  }

  private sendUpstoxUnsubscribe(keys: string[]) {
    if (!this.upstoxWs || !this.upstoxReady) return;
    const msg = {
      guid: 'pepertect-feed',
      method: 'unsub',
      data: {
        instrumentKeys: keys,
      },
    };
    try {
      this.upstoxWs.send(JSON.stringify(msg));
    } catch (e) {
      this.log('error', `Unsubscribe failed: ${String(e).substring(0, 200)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Broadcast to browser clients
  // -------------------------------------------------------------------------
  private broadcast(msg: any) {
    const text = JSON.stringify(msg);
    for (const [ws] of this.clients) {
      try { ws.send(text); } catch {}
    }
  }

  private broadcastTick(tick: UpstoxTick) {
    // Upstox sometimes returns instrumentKey in colon-form (e.g. "NSE_INDEX:Nifty 50")
    // but our clients subscribe using pipe-form (e.g. "NSE_INDEX|Nifty 50").
    // Normalize so the right clients receive the tick.
    if (tick.instrumentKey) {
      tick.instrumentKey = tick.instrumentKey.replace(/:/g, '|');
    }
    // Debug: log the first few tick instrumentKeys to verify format
    if (this.tickCount <= 5) {
      this.log('info', `Tick #${this.tickCount} key=${tick.instrumentKey} ltp=${tick.ltp}`);
    }
    const text = JSON.stringify({
      type: 'tick',
      data: tick,
    });
    for (const [ws, symbols] of this.clients) {
      if (symbols.has(tick.instrumentKey)) {
        try { ws.send(text); } catch {}
      }
    }
  }

  // -------------------------------------------------------------------------
  // Heartbeat — reconnect if Upstox goes silent for >60s
  // -------------------------------------------------------------------------
  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      const sinceLastMsg = Date.now() - this.lastUpstoxMessage;
      if (sinceLastMsg > 60000) {
        this.log('warn', 'No messages for 60s, reconnecting...');
        this.disconnectUpstox();
        this.connectUpstox();
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Upstox tick type
// ---------------------------------------------------------------------------
interface UpstoxTick {
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

// ---------------------------------------------------------------------------
// Binary decoder for Upstox v3 protobuf feed
//
// Upstox sends binary messages in this structure (empirically determined):
//   FeedResponse {
//     uint32 type    = 1;  // 1 = init/ack, 2 = control, 3 = tick data
//     uint64 guid    = 3;  // session ID or timestamp
//     bytes  data    = 4;  // wraps LiveTickData or control payload
//   }
//
// Inside the `data` field for tick messages, we have LiveTickData:
//   1  = instrumentKey (string)
//   2  = ltp            (int32, in paise → divide by 100 for rupees)
//   3  = ltq            (last traded quantity)
//   4  = volume
//   5  = oi
//   6  = avgTradePrice  (in paise)
//   7  = ohlc.open      (in paise)
//   8  = ohlc.high      (in paise)
//   9  = ohlc.low       (in paise)
//   10 = ohlc.close     (in paise)
//   11 = totalBuyQty
//   12 = totalSellQty
//   13 = atp            (avg trade price, in paise)
//   14 = change         (net change, in paise)
//   15 = changePct      (in basis points × 100 → divide by 100 for percent)
//   16 = lastTradeTime  (epoch ms)
//   17 = lowerCircuitLimit (in paise)
//   18 = upperCircuitLimit (in paise)
//   19 = bid            (in paise)
//   20 = ask            (in paise)
//   21 = bidQty
//   22 = askQty
//   23 = oiDayHigh
//   24 = oiDayLow
//   25 = ltt            (last trade time, alt field)
// ---------------------------------------------------------------------------
function decodeUpstoxTick(raw: ArrayBuffer | string): UpstoxTick | null {
  if (typeof raw === 'string') return null;
  const bytes = new Uint8Array(raw);
  if (bytes.length < 2) return null;

  // Try decoding as FeedResponse wrapper first.
  // If the first byte is 0x08 (field 1, wireType 0 = varint), this is a
  // FeedResponse wrapper. If it's 0x0a (field 1, wireType 2 = string/bytes),
  // it's a direct LiveTickData.
  const firstByte = bytes[0];

  // 0x08 = field 1, wireType 0 (varint) → FeedResponse wrapper
  if (firstByte === 0x08) {
    const feed = parseFeedResponse(bytes);
    if (!feed) return null;
    // Only decode the data payload for live-tick messages.
    // Per Upstox proto: type values are 1=init, 2=ack, 3=unsub_ack,
    // 4=system_status, 5=live_data, 6=invalid.
    // We only care about type=5 (live tick data).
    if (feed.type === 5 && feed.data && feed.data.length > 0) {
      return parseProtobufTick(feed.data);
    }
    return null;
  }

  // 0x0a = field 1, wireType 2 (length-delimited) → direct LiveTickData
  if (firstByte === 0x0a) {
    return parseProtobufTick(bytes);
  }

  // Unknown format — try as direct protobuf
  return parseProtobufTick(bytes);
}

interface FeedResponse {
  type?: number;
  guid?: number;
  data?: Uint8Array;
}

function parseFeedResponse(buf: Uint8Array): FeedResponse | null {
  const resp: FeedResponse = {};
  let i = 0;
  try {
    while (i < buf.length) {
      const { value: tag, bytesRead: tb } = readVarint(buf, i);
      i += tb;
      const fieldNum = Number(tag >> 3n);
      const wireType = Number(tag & 0x07n);

      if (wireType === 0) {
        const { value, bytesRead } = readVarint(buf, i);
        i += bytesRead;
        if (fieldNum === 1) resp.type = Number(value);
        else if (fieldNum === 3) resp.guid = Number(value);
      } else if (wireType === 2) {
        const { value: len, bytesRead } = readVarint(buf, i);
        i += bytesRead;
        const data = buf.slice(i, i + Number(len));
        i += Number(len);
        if (fieldNum === 4) resp.data = data;
      } else if (wireType === 5) {
        i += 4;
      } else if (wireType === 1) {
        i += 8;
      } else {
        break;
      }
    }
  } catch {
    return null;
  }
  return resp;
}

function parseProtobufTick(buf: Uint8Array): UpstoxTick | null {
  const tick: any = {};
  let i = 0;
  try {
    while (i < buf.length) {
      const { value: tag, bytesRead: tb } = readVarint(buf, i);
      i += tb;
      const fieldNum = Number(tag >> 3n);
      const wireType = Number(tag & 0x07n);

      if (wireType === 0) {
        // Varint
        const { value, bytesRead } = readVarint(buf, i);
        i += bytesRead;
        mapField(tick, fieldNum, Number(value));
      } else if (wireType === 2) {
        // Length-delimited (string or bytes)
        const { value: len, bytesRead } = readVarint(buf, i);
        i += bytesRead;
        const strBytes = buf.slice(i, i + Number(len));
        i += Number(len);
        mapStringField(tick, fieldNum, strBytes);
      } else if (wireType === 5) {
        // 32-bit
        i += 4;
      } else if (wireType === 1) {
        // 64-bit
        i += 8;
      } else {
        break;
      }
    }
  } catch {
    return null;
  }
  if (!tick.instrumentKey) return null;
  // Validate instrumentKey format — must look like "NSE_INDEX|Nifty 50" or
  // "NSE_EQ|INE002A01018" or "NSE_FO|63811". Reject garbage from misdecoded
  // init/ack messages (e.g., "BSE_INDEX" alone, or strings with control chars).
  const validKey = /^(NSE|BSE)_(INDEX|EQ|FO|CD|COM)\|[A-Za-z0-9 _\-]+$/i.test(tick.instrumentKey);
  if (!validKey) {
    // Log rejected keys for debugging (limited to first 5)
    if (rejectionLogCount < 5) {
      rejectionLogCount++;
      console.log(`[decoder] Rejected key: ${JSON.stringify(tick.instrumentKey).slice(0, 100)}`);
    }
    return null;
  }
  return tick;
}

let rejectionLogCount = 0;

function readVarint(buf: Uint8Array, offset: number): { value: bigint; bytesRead: number } {
  let result = 0n;
  let shift = 0n;
  let i = offset;
  while (i < buf.length) {
    const b = buf[i];
    result |= BigInt(b & 0x7f) << shift;
    i++;
    if ((b & 0x80) === 0) break;
    shift += 7n;
  }
  return { value: result, bytesRead: i - offset };
}

function mapField(tick: any, fieldNum: number, value: number) {
  // Per Upstox official proto schema
  switch (fieldNum) {
    case 2:  tick.ltp = value / 100; break;             // Last traded price (paise → rupees)
    case 3:  tick.ltq = value; break;                    // Last traded quantity
    case 4:  tick.volume = value; break;
    case 5:  tick.oi = value; break;
    case 6:  tick.avgTradePrice = value / 100; break;
    case 7:  tick.open = value / 100; break;             // OHLC open (paise → rupees)
    case 8:  tick.high = value / 100; break;             // OHLC high
    case 9:  tick.low = value / 100; break;              // OHLC low
    case 10: tick.close = value / 100; break;            // OHLC close
    case 11: tick.totalBuyQty = value; break;
    case 12: tick.totalSellQty = value; break;
    case 13: tick.atp = value / 100; break;
    case 14: tick.change = value / 100; break;           // Net change (paise → rupees)
    case 15: tick.changePct = value / 100; break;        // Change % (basis points × 100 → percent)
    case 16: tick.timestamp = value; break;
    case 17: tick.lowerCircuitLimit = value / 100; break;
    case 18: tick.upperCircuitLimit = value / 100; break;
    case 19: tick.bid = value / 100; break;
    case 20: tick.ask = value / 100; break;
    case 21: tick.bidQty = value; break;
    case 22: tick.askQty = value; break;
    case 23: tick.oiDayHigh = value; break;
    case 24: tick.oiDayLow = value; break;
    case 25: tick.ltt = value; break;
    default: break;
  }
}

function mapStringField(tick: any, fieldNum: number, bytes: Uint8Array) {
  // Field 1 is the instrument key string per the official Upstox proto
  if (fieldNum === 1) {
    try {
      tick.instrumentKey = new TextDecoder().decode(bytes);
    } catch {}
  }
}
