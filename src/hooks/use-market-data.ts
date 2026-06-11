'use client'

// ─── Real-Time Market Data Hook ────────────────────────────────────────
// PRIMARY: WebSocket (socket.io) for real-time push from server
// FALLBACK: REST Polling when WebSocket is disconnected
// Supports: Stock quotes, Index quotes, Option Chain data

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// ─── Types ────────────────────────────────────────────────────────────

export interface WsStockQuote {
  symbol: string
  last_price: number
  net_change: number
  ohlc: {
    open: number
    high: number
    low: number
    close: number
  }
  volume: number | null
  oi: number | null
}

export interface WsIndexQuote {
  symbol: string
  last_price: number
  net_change: number
  ohlc: {
    open: number
    high: number
    low: number
    close: number
  }
  volume: number | null
}

export interface WsOptionChainStrike {
  strikePrice: number
  ce: {
    ltp: number
    change: number
    volume: number
    oi: number
    oiChange: number
    iv: number
    delta: number
    bidPrice: number
    askPrice: number
  } | null
  pe: {
    ltp: number
    change: number
    volume: number
    oi: number
    oiChange: number
    iv: number
    delta: number
    bidPrice: number
    askPrice: number
  } | null
}

export interface WsOptionChainUpdate {
  underlying: string
  expiry: string
  spot: number
  pcr: number
  maxPain: number
  chain: WsOptionChainStrike[]
  expiries: string[]
  nearestExpiry: string
  isRealData: boolean
  dataSource: string
  timestamp: number
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

// ─── Market Data Manager (Singleton) ─────────────────────────────────
// Uses WebSocket as primary, REST polling as fallback

type StockUpdateHandler = (data: Record<string, WsStockQuote>) => void
type IndexUpdateHandler = (data: Record<string, WsIndexQuote>) => void
type OptionChainHandler = (data: WsOptionChainUpdate) => void
type StatusHandler = (status: ConnectionStatus) => void

class MarketDataManager {
  private static instance: MarketDataManager | null = null

  // ─── WebSocket State ─────────────────────────────────────────────
  private socket: Socket | null = null
  private wsConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 20
  private isConnecting = false

  // ─── Polling Fallback State ──────────────────────────────────────
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private optionChainTimers = new Map<string, ReturnType<typeof setInterval>>()
  private pollingActive = false

  // ─── Subscribers ─────────────────────────────────────────────────
  private stockHandlers = new Set<StockUpdateHandler>()
  private indexHandlers = new Set<IndexUpdateHandler>()
  private statusHandlers = new Set<StatusHandler>()
  private optionChainHandlers = new Map<string, Set<OptionChainHandler>>()

  // ─── Data Cache ──────────────────────────────────────────────────
  private latestStocks: Record<string, WsStockQuote> = {}
  private latestIndices: Record<string, WsIndexQuote> = {}
  private latestOptionChain = new Map<string, WsOptionChainUpdate>()

  // ─── Market Status ───────────────────────────────────────────────
  private _status: ConnectionStatus = 'disconnected'
  private _marketClosed = false

  // ─── Option Chain Subscriptions ──────────────────────────────────
  private subscribedOptionChains = new Map<string, { underlying: string; expiry?: string }>()

  static getInstance(): MarketDataManager {
    if (!MarketDataManager.instance) {
      MarketDataManager.instance = new MarketDataManager()
    }
    return MarketDataManager.instance
  }

  get status(): ConnectionStatus {
    return this._status
  }

  get stocks(): Record<string, WsStockQuote> {
    return this.latestStocks
  }

  get indices(): Record<string, WsIndexQuote> {
    return this.latestIndices
  }

  get marketClosed(): boolean {
    return this._marketClosed
  }

  // ─── Connect ──────────────────────────────────────────────────────

  connect() {
    if (this.wsConnected || this.isConnecting) return

    this._status = 'connecting'
    this.notifyStatusHandlers()
    this.isConnecting = true

    this.connectWebSocket()
  }

  disconnect() {
    // Disconnect WebSocket
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.wsConnected = false
    this.isConnecting = false

    // Stop polling
    this.stopPolling()

    // Clear option chain timers
    for (const timer of this.optionChainTimers.values()) {
      clearInterval(timer)
    }
    this.optionChainTimers.clear()

    this._status = 'disconnected'
    this._marketClosed = false
    this.notifyStatusHandlers()
  }

  // ─── WebSocket Connection ─────────────────────────────────────────

  private getWebSocketUrl(): string | undefined {
    // Priority: 1) NEXT_PUBLIC_WS_URL env var (Railway/Render), 2) Caddy gateway (sandbox), 3) undefined (polling only)
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (wsUrl) {
      // Railway/Render deployment: wss://xxx.up.railway.app
      return wsUrl
    }
    // Sandbox environment: use Caddy gateway with XTransformPort
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return undefined // Will use '/?XTransformPort=3003' below
    }
    // Production without WS: polling fallback
    return undefined
  }

  private connectWebSocket() {
    if (this.socket) {
      this.socket.disconnect()
    }

    try {
      const wsUrl = this.getWebSocketUrl()

      // Determine the socket connection URL
      let socketUrl: string | undefined
      let socketPath: string | undefined

      if (wsUrl) {
        // External WebSocket server (Railway/Render)
        socketUrl = wsUrl
        socketPath = '/socket.io'
      } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        // Sandbox environment: connect through Caddy gateway
        socketUrl = undefined // Same origin
        socketPath = '/?XTransformPort=3003'
      } else {
        // Production without WS configured: skip WebSocket, use polling
        console.log('[Market WS] No WebSocket URL configured, using polling fallback')
        this.startPolling()
        return
      }

      this.socket = io(socketUrl || '/', {
        path: socketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        forceNew: false,
      })

      this.socket.on('connect', () => {
        console.log('[Market WS] Connected to WebSocket server')
        this.wsConnected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        this._status = 'connected'
        this.notifyStatusHandlers()

        // Stop polling fallback - WebSocket is working
        this.stopPolling()

        // Re-subscribe to option chains
        for (const [, sub] of this.subscribedOptionChains) {
          this.socket!.emit('subscribe-option-chain', {
            underlying: sub.underlying,
            expiry: sub.expiry,
          })
        }
      })

      this.socket.on('disconnect', (reason) => {
        console.warn('[Market WS] Disconnected:', reason)
        this.wsConnected = false

        // Start polling fallback
        this.startPolling()
      })

      this.socket.on('connect_error', (err) => {
        console.warn('[Market WS] Connection error:', err.message)
        this.wsConnected = false
        this.isConnecting = false

        // Start polling fallback
        this.startPolling()
      })

      // ─── Market Data Events ──────────────────────────────────────

      this.socket.on('market-data', (data: {
        indices: Record<string, {
          last_price: number
          net_change: number
          ohlc: { open: number; high: number; low: number; close: number }
          volume: number | null
        }>
        stocks: Record<string, {
          last_price: number
          net_change: number
          ohlc: { open: number; high: number; low: number; close: number }
          volume: number | null
          oi: number | null
        }>
        timestamp: number
        source?: string
      }) => {
        this.processMarketData(data)
      })

      this.socket.on('market-status', (data: {
        status: string
        message: string
        istTime: string
      }) => {
        const isClosed = data.status !== 'OPEN' && data.status !== 'PRE-OPEN'
        if (this._marketClosed !== isClosed) {
          this._marketClosed = isClosed
          this.notifyStatusHandlers()
        }
      })

      this.socket.on('option-chain', (payload: {
        underlying: string
        expiry?: string
        data: Record<string, unknown>
      }) => {
        this.processOptionChainData(payload.underlying, payload.expiry, payload.data)
      })

    } catch (err) {
      console.error('[Market WS] Failed to create socket:', err)
      this.isConnecting = false
      this.startPolling()
    }
  }

  // ─── Process Market Data ──────────────────────────────────────────

  private processMarketData(data: {
    indices: Record<string, {
      last_price: number
      net_change: number
      ohlc: { open: number; high: number; low: number; close: number }
      volume: number | null
    }>
    stocks: Record<string, {
      last_price: number
      net_change: number
      ohlc: { open: number; high: number; low: number; close: number }
      volume: number | null
      oi: number | null
    }>
    timestamp: number
    source?: string
  }) {
    // Transform indices
    const newIndices: Record<string, WsIndexQuote> = {}
    if (data.indices && typeof data.indices === 'object') {
      for (const [symbol, d] of Object.entries(data.indices)) {
        newIndices[symbol] = {
          symbol,
          last_price: d.last_price ?? 0,
          net_change: d.net_change ?? 0,
          ohlc: d.ohlc ?? { open: 0, high: 0, low: 0, close: 0 },
          volume: d.volume ?? null,
        }
      }
    }

    // Transform stocks
    const newStocks: Record<string, WsStockQuote> = {}
    if (data.stocks && typeof data.stocks === 'object') {
      for (const [symbol, d] of Object.entries(data.stocks)) {
        newStocks[symbol] = {
          symbol,
          last_price: d.last_price ?? 0,
          net_change: d.net_change ?? 0,
          ohlc: d.ohlc ?? { open: 0, high: 0, low: 0, close: 0 },
          volume: d.volume ?? null,
          oi: d.oi ?? null,
        }
      }
    }

    this.latestIndices = newIndices
    this.latestStocks = newStocks

    // Notify subscribers (skip if market closed to prevent flicker)
    if (!this._marketClosed) {
      this.stockHandlers.forEach(handler => {
        try { handler(this.latestStocks) } catch (e) { /* silent */ }
      })
      this.indexHandlers.forEach(handler => {
        try { handler(this.latestIndices) } catch (e) { /* silent */ }
      })
    }
  }

  // ─── Process Option Chain Data ────────────────────────────────────

  private processOptionChainData(underlying: string, expiry: string | undefined, data: Record<string, unknown>) {
    const chain: WsOptionChainStrike[] = ((data.chain as Record<string, unknown>[]) || []).map(
      (item: Record<string, unknown>) => {
        const ce = item.ce as Record<string, unknown> | null
        const pe = item.pe as Record<string, unknown> | null

        return {
          strikePrice: (item.strikePrice as number) ?? 0,
          ce: ce ? {
            ltp: (ce.ltp as number) ?? 0,
            change: (ce.change as number) ?? 0,
            volume: (ce.volume as number) ?? (ce.openInterest as number) ?? 0,
            oi: (ce.oi as number) ?? (ce.openInterest as number) ?? 0,
            oiChange: (ce.oiChange as number) ?? 0,
            iv: (ce.iv as number) ?? (ce.impliedVolatility as number) ?? 0,
            delta: (ce.delta as number) ?? 0,
            bidPrice: (ce.bidPrice as number) ?? 0,
            askPrice: (ce.askPrice as number) ?? 0,
          } : null,
          pe: pe ? {
            ltp: (pe.ltp as number) ?? 0,
            change: (pe.change as number) ?? 0,
            volume: (pe.volume as number) ?? (pe.openInterest as number) ?? 0,
            oi: (pe.oi as number) ?? (pe.openInterest as number) ?? 0,
            oiChange: (pe.oiChange as number) ?? 0,
            iv: (pe.iv as number) ?? (pe.impliedVolatility as number) ?? 0,
            delta: (pe.delta as number) ?? 0,
            bidPrice: (pe.bidPrice as number) ?? 0,
            askPrice: (pe.askPrice as number) ?? 0,
          } : null,
        }
      }
    )

    const update: WsOptionChainUpdate = {
      underlying,
      expiry: expiry ?? (data.nearestExpiry as string) ?? '',
      spot: (data.spot as number) ?? 0,
      pcr: (data.pcr as number) ?? 0,
      maxPain: (data.maxPain as number) ?? 0,
      chain,
      expiries: (data.expiries as string[]) ?? [],
      nearestExpiry: (data.nearestExpiry as string) ?? '',
      isRealData: (data.isRealData as boolean) ?? false,
      dataSource: (data.dataSource as string) ?? 'unknown',
      timestamp: Date.now(),
    }

    const key = expiry ? `${underlying}::${expiry}` : underlying
    this.latestOptionChain.set(key, update)

    const handlers = this.optionChainHandlers.get(underlying)
    if (handlers) {
      handlers.forEach(handler => {
        try { handler(update) } catch (e) { /* silent */ }
      })
    }
  }

  // ─── Polling Fallback ─────────────────────────────────────────────

  private startPolling() {
    if (this.pollingActive) return
    this.pollingActive = true
    this._status = 'connecting'
    this.notifyStatusHandlers()

    // Check market status
    this.checkMarketStatusPolling()

    // Fetch immediately
    void this.fetchMarketLivePolling()

    // Poll every 1 second (WS will stop this when reconnected)
    this.pollTimer = setInterval(() => {
      void this.fetchMarketLivePolling()
    }, 1000)

    // Market status check every 60s
    this.marketStatusTimer = setInterval(() => {
      void this.checkMarketStatusPolling()
    }, 60000)

    console.log('[Market Data] Started polling fallback (1s interval)')
  }

  private stopPolling() {
    if (!this.pollingActive) return
    this.pollingActive = false

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.marketStatusTimer) {
      clearInterval(this.marketStatusTimer)
      this.marketStatusTimer = null
    }

    console.log('[Market Data] Stopped polling fallback (WebSocket connected)')
  }

  private marketStatusTimer: ReturnType<typeof setInterval> | null = null

  private async checkMarketStatusPolling() {
    try {
      const res = await fetch('/api/market/status', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const json = await res.json()
        const status = json.data?.status
        this._marketClosed = status !== 'OPEN' && status !== 'PRE-OPEN'
      }
    } catch {
      this._marketClosed = true
    }
  }

  private async fetchMarketLivePolling() {
    try {
      const res = await fetch('/api/market/live', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      if (!json.success || !json.data) throw new Error('Invalid response')

      this.processMarketData(json.data)

      if (this._status !== 'connected') {
        this._status = 'connected'
        this.notifyStatusHandlers()
      }
    } catch (err) {
      console.warn('[Market Data] Polling error:', err)
    }
  }

  // ─── Option Chain Subscription ────────────────────────────────────

  subscribeOptionChain(underlying: string, expiry?: string) {
    const key = expiry ? `${underlying}::${expiry}` : underlying

    if (this.subscribedOptionChains.has(key)) return

    this.subscribedOptionChains.set(key, { underlying, expiry })

    // Subscribe via WebSocket if connected
    if (this.wsConnected && this.socket) {
      this.socket.emit('subscribe-option-chain', { underlying, expiry })
    } else {
      // Fallback: start REST polling for option chain
      void this.fetchOptionChainPolling(underlying, expiry)
      const timer = setInterval(() => {
        void this.fetchOptionChainPolling(underlying, expiry)
      }, 3000)
      this.optionChainTimers.set(key, timer)
    }

    // Send cached data immediately if available
    const cached = this.latestOptionChain.get(key)
    if (cached) {
      const handlers = this.optionChainHandlers.get(underlying)
      if (handlers) {
        handlers.forEach(handler => {
          try { handler(cached) } catch (e) { /* silent */ }
        })
      }
    }
  }

  unsubscribeOptionChain(underlying: string, expiry?: string) {
    const key = expiry ? `${underlying}::${expiry}` : underlying

    this.subscribedOptionChains.delete(key)
    this.latestOptionChain.delete(key)

    // Unsubscribe via WebSocket if connected
    if (this.wsConnected && this.socket) {
      this.socket.emit('unsubscribe-option-chain', { underlying, expiry })
    }

    // Stop polling timer if active
    const timer = this.optionChainTimers.get(key)
    if (timer) {
      clearInterval(timer)
      this.optionChainTimers.delete(key)
    }
  }

  private async fetchOptionChainPolling(underlying: string, expiry?: string) {
    try {
      let url = `/api/options/chain/${encodeURIComponent(underlying)}`
      if (expiry) url += `?expiry=${encodeURIComponent(expiry)}`

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      if (!json.success || !json.data) throw new Error('Invalid option chain response')

      this.processOptionChainData(underlying, expiry, json.data)
    } catch (err) {
      console.warn(`[Market Data] Option chain polling error for ${underlying}:`, err)
    }
  }

  // ─── Subscriber Management ────────────────────────────────────────

  onStockUpdate(handler: StockUpdateHandler) {
    this.stockHandlers.add(handler)
    if (Object.keys(this.latestStocks).length > 0) {
      handler(this.latestStocks)
    }
    return () => this.stockHandlers.delete(handler)
  }

  onIndexUpdate(handler: IndexUpdateHandler) {
    this.indexHandlers.add(handler)
    if (Object.keys(this.latestIndices).length > 0) {
      handler(this.latestIndices)
    }
    return () => this.indexHandlers.delete(handler)
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler)
    handler(this._status)
    return () => this.statusHandlers.delete(handler)
  }

  onOptionChainUpdate(underlying: string, handler: OptionChainHandler) {
    if (!this.optionChainHandlers.has(underlying)) {
      this.optionChainHandlers.set(underlying, new Set())
    }
    this.optionChainHandlers.get(underlying)!.add(handler)
    return () => {
      const handlers = this.optionChainHandlers.get(underlying)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.optionChainHandlers.delete(underlying)
        }
      }
    }
  }

  requestRefresh() {
    if (this.wsConnected && this.socket) {
      this.socket.emit('request-refresh')
    } else {
      void this.fetchMarketLivePolling()
    }
  }

  private notifyStatusHandlers() {
    this.statusHandlers.forEach(handler => {
      try { handler(this._status) } catch (e) { /* silent */ }
    })
  }
}

// ─── React Hooks ──────────────────────────────────────────────────────

/**
 * Hook to get real-time stock quotes via WebSocket (with polling fallback)
 */
export function useStockData() {
  const [stocks, setStocks] = useState<Record<string, WsStockQuote>>({})
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [marketClosed, setMarketClosed] = useState(false)

  const prevPricesRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const manager = MarketDataManager.getInstance()
    manager.connect()

    const unsubStocks = manager.onStockUpdate((data) => {
      if (manager.marketClosed) return

      let hasChanges = false
      const newPrices: Record<string, number> = {}
      for (const [symbol, quote] of Object.entries(data)) {
        const newPrice = quote.last_price
        newPrices[symbol] = newPrice
        if (prevPricesRef.current[symbol] !== newPrice) {
          hasChanges = true
        }
      }
      if (!hasChanges) {
        const prevKeys = Object.keys(prevPricesRef.current)
        const newKeys = Object.keys(newPrices)
        if (prevKeys.length !== newKeys.length) {
          hasChanges = true
        }
      }
      if (hasChanges) {
        prevPricesRef.current = newPrices
        setStocks(data)
      }
    })

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s)
      setMarketClosed(manager.marketClosed)
    })

    return () => {
      unsubStocks()
      unsubStatus()
    }
  }, [])

  return { stocks, status, marketClosed }
}

/**
 * Hook to get real-time index quotes via WebSocket (with polling fallback)
 */
export function useIndexData() {
  const [indices, setIndices] = useState<Record<string, WsIndexQuote>>({})
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [marketClosed, setMarketClosed] = useState(false)

  const prevPricesRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const manager = MarketDataManager.getInstance()
    manager.connect()

    const unsubIndices = manager.onIndexUpdate((data) => {
      if (manager.marketClosed) return

      let hasChanges = false
      const newPrices: Record<string, number> = {}
      for (const [symbol, quote] of Object.entries(data)) {
        const newPrice = quote.last_price
        newPrices[symbol] = newPrice
        if (prevPricesRef.current[symbol] !== newPrice) {
          hasChanges = true
        }
      }
      if (!hasChanges) {
        const prevKeys = Object.keys(prevPricesRef.current)
        const newKeys = Object.keys(newPrices)
        if (prevKeys.length !== newKeys.length) {
          hasChanges = true
        }
      }
      if (hasChanges) {
        prevPricesRef.current = newPrices
        setIndices(data)
      }
    })

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s)
      setMarketClosed(manager.marketClosed)
    })

    return () => {
      unsubIndices()
      unsubStatus()
    }
  }, [])

  return { indices, status, marketClosed }
}

/**
 * Hook to get a single stock's real-time quote via WebSocket (with polling fallback)
 */
export function useStockQuote(symbol: string) {
  const [quote, setQuote] = useState<WsStockQuote | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  useEffect(() => {
    const manager = MarketDataManager.getInstance()
    manager.connect()

    const unsubStocks = manager.onStockUpdate((data) => {
      const stockQuote = data[symbol]
      if (stockQuote) {
        setQuote(stockQuote)
      }
    })

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s)
    })

    return () => {
      unsubStocks()
      unsubStatus()
    }
  }, [symbol])

  return { quote, status }
}

/**
 * Hook to get real-time option chain data via WebSocket (with polling fallback)
 */
export function useOptionChain(underlying: string, expiry?: string) {
  const [data, setData] = useState<WsOptionChainUpdate | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  useEffect(() => {
    if (!underlying) return

    const manager = MarketDataManager.getInstance()
    manager.connect()

    manager.subscribeOptionChain(underlying, expiry)

    const unsubHandler = manager.onOptionChainUpdate(underlying, (update) => {
      if (expiry && update.expiry && update.expiry !== expiry) return
      setData(update)
    })

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s)
    })

    return () => {
      manager.unsubscribeOptionChain(underlying, expiry)
      unsubHandler()
      unsubStatus()
    }
  }, [underlying, expiry])

  return { data, status }
}

/**
 * Hook to get connection status only
 */
export function useMarketDataStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  useEffect(() => {
    const manager = MarketDataManager.getInstance()
    manager.connect()

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s)
    })

    return () => {
      unsubStatus()
    }
  }, [])

  return status
}

// Export the singleton for direct access (backward compat)
export { MarketDataManager as MarketDataPoller }
export { MarketDataManager as MarketDataSocket }
