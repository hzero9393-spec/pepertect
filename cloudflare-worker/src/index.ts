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

    return new Response('Upstox Realtime Worker. Use /ws for WebSocket.', {
      headers: { 'Content-Type': 'text/plain', ...corsHeaders(env) },
    });
  },
};

// ---------------------------------------------------------------------------
// Durable Object — maintains ONE Upstox WebSocket + N browser clients
// ---------------------------------------------------------------------------
export class UpstoxFeed {
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
        stats: {
          upstoxReady: this.upstoxReady,
          upstoxConnecting: this.upstoxConnecting,
          clientCount: this.clients.size,
          subscribedCount: this.subscribedKeys.size,
          hasToken: !!(this.currentToken || this.env.UPSTOX_ACCESS_TOKEN),
        },
        logs: this.debugLogs.slice(0, 30),
      }), { headers: { 'Content-Type': 'application/json' } });
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

      // Try multiple connection strategies since Cloudflare Workers has quirks
      // with outbound WebSocket connections.
      let upstoxWs: WebSocket | null = null;

      // Strategy 1: Direct WebSocket constructor with wss:// URL
      try {
        this.log('info', 'Strategy 1: Trying new WebSocket(wssUrl)...');
        upstoxWs = new WebSocket(wsUrl);
      } catch (e1) {
        this.log('error', `Strategy 1 failed: ${String(e1).substring(0, 200)}`);

        // Strategy 2: fetch() with https:// URL + Upgrade header
        try {
          const httpsUrl = wsUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
          this.log('info', `Strategy 2: Trying fetch(${httpsUrl.substring(0, 80)}...) with Upgrade`);
          const upgradeRes = await fetch(httpsUrl, {
            headers: { 'Upgrade': 'websocket' },
          });
          if (upgradeRes.webSocket) {
            upstoxWs = upgradeRes.webSocket;
            this.log('info', 'Strategy 2 succeeded');
          } else {
            this.log('error', `Strategy 2: no webSocket in response: ${upgradeRes.status}`);
          }
        } catch (e2) {
          this.log('error', `Strategy 2 failed: ${String(e2).substring(0, 200)}`);
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

      upstoxWs.addEventListener('open', () => {
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
      });

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

  private handleUpstoxMessage(raw: ArrayBuffer | string) {
    // Try JSON first (for control messages)
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        this.broadcast({ type: 'upstox_control', data: parsed });
        return;
      } catch {}
    }

    // Binary protobuf decode
    try {
      const tick = decodeUpstoxTick(raw);
      if (tick) {
        this.broadcastTick(tick);
      }
    } catch (e) {
      // ignore decode errors
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
// ---------------------------------------------------------------------------
function decodeUpstoxTick(raw: ArrayBuffer | string): UpstoxTick | null {
  if (typeof raw === 'string') return null;
  const bytes = new Uint8Array(raw);
  if (bytes.length < 2) return null;

  let payload: Uint8Array;
  try {
    if (bytes[0] === 1) {
      // gzip-compressed (skip for now — Upstox usually sends uncompressed for live ticks)
      return null;
    } else {
      payload = bytes.slice(1);
    }
  } catch {
    return null;
  }

  return parseProtobufTick(payload);
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
        const { value, bytesRead } = readVarint(buf, i);
        i += bytesRead;
        mapField(tick, fieldNum, Number(value));
      } else if (wireType === 2) {
        const { value: len, bytesRead } = readVarint(buf, i);
        i += bytesRead;
        const strBytes = buf.slice(i, i + Number(len));
        i += Number(len);
        mapStringField(tick, fieldNum, strBytes);
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
  if (!tick.instrumentKey) return null;
  return tick;
}

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
  switch (fieldNum) {
    case 1: tick.ltp = value / 100; break;
    case 2: tick.volume = value; break;
    case 3: tick.oi = value; break;
    case 4: tick.change = value / 100; break;
    case 5: tick.changePct = value / 100; break;
    case 6: tick.open = value / 100; break;
    case 7: tick.high = value / 100; break;
    case 8: tick.low = value / 100; break;
    case 9: tick.close = value / 100; break;
    case 10: tick.bid = value / 100; break;
    case 11: tick.ask = value / 100; break;
    case 12: tick.timestamp = value; break;
    default: break;
  }
}

function mapStringField(tick: any, fieldNum: number, bytes: Uint8Array) {
  if (fieldNum === 1 || fieldNum === 21) {
    try {
      tick.instrumentKey = new TextDecoder().decode(bytes);
    } catch {}
  }
}
