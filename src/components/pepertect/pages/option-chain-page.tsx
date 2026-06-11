'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Minus,
  Plus,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  Search,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatVolume } from '@/lib/format'
import { useAuthStore } from '@/lib/auth-store'
import { useTradeSuccess } from '@/components/pepertect/trade-success-popup'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'
import { useOptionChain } from '@/hooks/use-market-data'
import type { WsOptionChainUpdate, ConnectionStatus } from '@/hooks/use-market-data'
import { STOCK_DATABASE, INDEX_CONFIGS, FNO_STOCKS } from '@/lib/stock-database'
import type { StockInfo } from '@/lib/stock-database'

// ─── Types ───────────────────────────────────────────────────────────

interface OptionRow {
  strike: number
  ceOI: number
  ceVolume: number
  ceLTP: number
  ceChngPct: number
  ceIV: number
  ceDelta: number
  ceGamma: number
  ceTheta: number
  ceVega: number
  peIV: number
  peDelta: number
  peGamma: number
  peTheta: number
  peVega: number
  peChngPct: number
  peLTP: number
  peVolume: number
  peOI: number
}

interface BanItem {
  id: string
  symbol: string
  name: string
  banStartDate: string
  banEndDate: string
  reason: string
  isActive: boolean
}

// Instrument is now a union of index names + any F&O stock symbol
type IndexInstrument = 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY' | 'SENSEX' | 'MIDCPNIFTY'
type Instrument = IndexInstrument | string

interface ExpiryItem {
  dateStr: string
  label: string
}

// ─── Config ──────────────────────────────────────────────────────────

const INDEX_INSTRUMENTS: IndexInstrument[] = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX']

const INSTRUMENT_CONFIG: Record<IndexInstrument, { lotSize: number }> = {
  NIFTY: { lotSize: 50 },
  BANKNIFTY: { lotSize: 15 },
  FINNIFTY: { lotSize: 40 },
  SENSEX: { lotSize: 20 },
  MIDCPNIFTY: { lotSize: 75 },
}

/** Get lot size for any instrument (index or stock) */
function getLotSize(inst: Instrument): number {
  const idx = inst as IndexInstrument
  if (INSTRUMENT_CONFIG[idx]) return INSTRUMENT_CONFIG[idx].lotSize
  const stock = STOCK_DATABASE[inst]
  if (stock?.isFno) return stock.lotSize
  return 50 // fallback
}

/** Check if instrument is an index */
function isIndex(inst: Instrument): inst is IndexInstrument {
  return inst in INSTRUMENT_CONFIG
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatOI(value: number): string {
  if (value >= 100000) return (value / 100000).toFixed(2) + ' L'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
  return value.toLocaleString('en-IN')
}

function formatStrike(value: number): string {
  return value.toLocaleString('en-IN')
}

function formatPrice(value: number): string {
  return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function findATMStrike(rows: OptionRow[], spot: number): number {
  if (rows.length === 0) return 0
  let closest = rows[0].strike
  let minDiff = Math.abs(rows[0].strike - spot)
  for (const row of rows) {
    const diff = Math.abs(row.strike - spot)
    if (diff < minDiff) {
      minDiff = diff
      closest = row.strike
    }
  }
  return closest
}

/** Transform WebSocket option chain data into OptionRow[] */
function transformWsData(wsData: WsOptionChainUpdate): OptionRow[] {
  const rows: OptionRow[] = []

  for (const item of wsData.chain) {
    const ce = item.ce
    const pe = item.pe

    rows.push({
      strike: item.strikePrice,
      ceOI: ce?.oi || 0,
      ceVolume: Math.round(ce?.volume || 0),
      ceLTP: ce?.ltp || 0,
      ceChngPct: ce?.change || 0,
      ceIV: ce?.iv || 0,
      ceDelta: ce?.delta || 0,
      ceGamma: 0, // WS doesn't provide gamma directly
      ceTheta: 0, // WS doesn't provide theta directly
      ceVega: 0,  // WS doesn't provide vega directly
      peIV: pe?.iv || 0,
      peDelta: pe?.delta || 0,
      peGamma: 0,
      peTheta: 0,
      peVega: 0,
      peChngPct: pe?.change || 0,
      peLTP: pe?.ltp || 0,
      peVolume: Math.round(pe?.volume || 0),
      peOI: pe?.oi || 0,
    })
  }

  rows.sort((a, b) => a.strike - b.strike)
  return rows
}

// ─── F&O Stock Search Dropdown ───────────────────────────────────────

function FnoStockSearch({
  selectedSymbol,
  onSelect,
}: {
  selectedSymbol: string | null
  onSelect: (symbol: string) => void
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // F&O stock info list, memoized
  const fnoStockList = useMemo(() => {
    return FNO_STOCKS
      .map(sym => STOCK_DATABASE[sym])
      .filter(Boolean) as StockInfo[]
  }, [])

  // Filter stocks by query
  const filteredStocks = useMemo(() => {
    if (!query.trim()) return fnoStockList.slice(0, 20) // show first 20 when empty
    const q = query.toLowerCase().trim()
    return fnoStockList.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [query, fnoStockList])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedStock = selectedSymbol ? STOCK_DATABASE[selectedSymbol] : null

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 cursor-text',
          isOpen && 'ring-2 ring-[#1a1a2e]/20 border-[#1a1a2e]'
        )}
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        <Search className="size-4 text-[#9ca3af] shrink-0" />
        {selectedStock && !isOpen ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-bold text-[#1a1a2e]">{selectedStock.symbol}</span>
            <span className="text-xs text-[#6b7280] truncate">{selectedStock.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-[#e5e7eb] text-[#6b7280]">
              {selectedStock.sector}
            </Badge>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search F&O stocks..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#9ca3af] text-[#1a1a2e]"
          />
        )}
        {(isOpen || selectedSymbol) && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setQuery('')
              setIsOpen(false)
            }}
            className="shrink-0 p-0.5 rounded hover:bg-[#f3f4f6] transition-colors"
          >
            <X className="size-3.5 text-[#9ca3af]" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {filteredStocks.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#9ca3af] text-center">No stocks found</div>
          ) : (
            filteredStocks.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => {
                  onSelect(stock.symbol)
                  setQuery('')
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 hover:bg-[#f5f7fa] transition-colors text-left',
                  selectedSymbol === stock.symbol && 'bg-[#1a1a2e]/5'
                )}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1a2e]">{stock.symbol}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-[#e5e7eb] text-[#6b7280]">
                      {stock.sector}
                    </Badge>
                  </div>
                  <span className="text-xs text-[#6b7280] truncate">{stock.name}</span>
                </div>
                <span className="text-[10px] text-[#9ca3af] shrink-0">Lot: {stock.lotSize}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton Row ────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-2 py-2"><div className="h-3 bg-[#f3f4f6] rounded w-12 ml-auto" /></td>
      <td className="px-2 py-2"><div className="h-3 bg-[#f3f4f6] rounded w-10 ml-auto" /></td>
      <td className="px-2 py-2"><div className="h-3 bg-[#f3f4f6] rounded w-12 ml-auto" /></td>
      <td className="px-2 py-2 text-center"><div className="h-3 bg-[#e5e7eb] rounded w-14 mx-auto" /></td>
      <td className="px-2 py-2"><div className="h-3 bg-[#f3f4f6] rounded w-12" /></td>
      <td className="px-2 py-2"><div className="h-3 bg-[#f3f4f6] rounded w-10" /></td>
      <td className="px-2 py-2"><div className="h-3 bg-[#f3f4f6] rounded w-12" /></td>
    </tr>
  )
}

// ─── Quick Trade Modal ───────────────────────────────────────────────

function QuickTradeModal({
  open,
  onClose,
  row,
  side,
  instrument,
}: {
  open: boolean
  onClose: () => void
  row: OptionRow | null
  side: 'CE' | 'PE'
  instrument: Instrument
}) {
  const { token } = useAuthStore()
  const { showTradeSuccess } = useTradeSuccess()
  const [lots, setLots] = useState(1)
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [placing, setPlacing] = useState(false)

  // Reset lots when modal opens with new row
  useEffect(() => {
    if (open) setLots(1)
  }, [open])

  if (!row) return null

  const ltp = side === 'CE' ? row.ceLTP : row.peLTP
  const chgPct = side === 'CE' ? row.ceChngPct : row.peChngPct
  const lotSize = getLotSize(instrument)
  const totalQty = lots * lotSize
  const marginRequired = Math.round(ltp * totalQty * 1.2)

  const handlePlaceOrder = async () => {
    if (!token) {
      toast.error('Please login to trade')
      return
    }
    setPlacing(true)
    try {
      const res = await fetch('/api/trade/place', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: instrument,
          direction,
          orderType: 'MARKET',
          segment: 'OPTIONS',
          productType: 'INTRADAY',
          quantity: totalQty,
          lots,
          optionType: side,
          strikePrice: row.strike,
          price: ltp,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        showTradeSuccess({
          symbol: instrument,
          type: direction,
          qty: totalQty,
          price: ltp,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          orderId: data.order?.id?.slice(-8).toUpperCase() || 'N/A',
          segment: 'OPTIONS',
          optionType: side,
          strikePrice: row.strike,
          totalValue: data.order?.totalValue,
          brokerage: data.order?.brokerage,
        })
        onClose()
      } else {
        toast.error(data.error || 'Failed to place order')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPlacing(false)
    }
  }

  // Display name for the instrument
  const displayName = isIndex(instrument)
    ? instrument
    : (STOCK_DATABASE[instrument]?.name || instrument)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-white border-[#e5e7eb] text-[#1a1a2e] p-0">
        {/* Header */}
        <div className={cn(
          'px-6 py-4 rounded-t-lg',
          side === 'CE' ? 'bg-[#00D09C]' : 'bg-[#EB5B3C]'
        )}>
          <DialogTitle className="flex items-center justify-between text-white">
            <div>
              <span className="text-sm font-medium opacity-80">{displayName}</span>
              <div className="text-xl font-bold">{side === 'CE' ? 'CALL' : 'PUT'} ₹{row.strike.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold">{formatPrice(ltp)}</div>
              <div className="text-sm font-semibold text-white/90">
                {chgPct >= 0 ? '+' : ''}{chgPct.toFixed(2)}%
              </div>
            </div>
          </DialogTitle>
        </div>

        <div className="p-6 space-y-4">
          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection('BUY')}
              className={cn(
                'py-3 rounded-lg font-bold text-sm transition-all',
                direction === 'BUY'
                  ? 'bg-[#00D09C] text-white shadow-md'
                  : 'bg-[#f5f7fa] text-[#6b7280] hover:bg-[#e5e7eb]'
              )}
            >
              BUY
            </button>
            <button
              onClick={() => setDirection('SELL')}
              className={cn(
                'py-3 rounded-lg font-bold text-sm transition-all',
                direction === 'SELL'
                  ? 'bg-[#EB5B3C] text-white shadow-md'
                  : 'bg-[#f5f7fa] text-[#6b7280] hover:bg-[#e5e7eb]'
              )}
            >
              SELL
            </button>
          </div>

          {/* Lots Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#6b7280] uppercase tracking-wider">Lots</label>
            <div className="flex items-center gap-3">
              <button
                className="size-10 rounded-lg border border-[#e5e7eb] flex items-center justify-center text-[#6b7280] hover:bg-[#f5f7fa] active:bg-[#e5e7eb] transition-colors"
                onClick={() => setLots(Math.max(1, lots - 1))}
              >
                <Minus className="size-4" />
              </button>
              <Input
                type="number"
                value={lots}
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center font-mono text-lg font-bold bg-white border-[#e5e7eb] h-10"
              />
              <button
                className="size-10 rounded-lg border border-[#e5e7eb] flex items-center justify-center text-[#6b7280] hover:bg-[#f5f7fa] active:bg-[#e5e7eb] transition-colors"
                onClick={() => setLots(lots + 1)}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-[#f9fafb] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Lot Size</span>
              <span className="font-mono font-medium">{lotSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Total Qty</span>
              <span className="font-mono font-medium">{totalQty}</span>
            </div>
            <div className="border-t border-[#e5e7eb] pt-2 flex justify-between">
              <span className="text-[#6b7280] font-medium">Approx. Margin</span>
              <span className="font-mono font-bold text-[#1a1a2e]">₹{marginRequired.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className={cn(
              'w-full py-3.5 rounded-lg font-bold text-white text-sm transition-all active:scale-[0.98]',
              direction === 'BUY'
                ? 'bg-[#00D09C] hover:bg-[#00b888]'
                : 'bg-[#EB5B3C] hover:bg-[#d44f33]'
            )}
          >
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Placing Order...
              </span>
            ) : (
              `${direction} ${lots} Lot${lots > 1 ? 's' : ''} × ${side} ₹${row.strike.toLocaleString('en-IN')}`
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function OptionChainPage() {
  // Core state
  const [instrument, setInstrument] = useState<Instrument>('NIFTY')
  const [selectedExpiry, setSelectedExpiry] = useState<string>('')
  const [expiries, setExpiries] = useState<ExpiryItem[]>([])
  const [data, setData] = useState<OptionRow[]>([])
  const [spotPrice, setSpotPrice] = useState<number>(0)
  const [pcr, setPcr] = useState<number>(0)
  const [maxPain, setMaxPain] = useState<number>(0)

  // UI state
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [showGreeks, setShowGreeks] = useState(false)
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false)

  // Trade modal
  const [selectedRow, setSelectedRow] = useState<OptionRow | null>(null)
  const [selectedSide, setSelectedSide] = useState<'CE' | 'PE'>('CE')
  const [modalOpen, setModalOpen] = useState(false)

  // Ban list
  const [banList, setBanList] = useState<BanItem[]>([])
  const [banListLoading, setBanListLoading] = useState(true)
  const [banListOpen, setBanListOpen] = useState(false)

  // ─── WebSocket Option Chain ─────────────────────────────────────
  const wsExpiry = selectedExpiry || undefined
  const { data: wsData, status: wsStatus } = useOptionChain(instrument, wsExpiry)
  const isWsConnected = wsStatus === 'connected'

  // Refs
  const isFetchingRef = useRef(false)
  const atmRef = useRef<HTMLTableRowElement>(null)
  const prevInstrumentRef = useRef<Instrument>(instrument)
  const prevExpiryRef = useRef<string>('')

  // ─── Fetch Expiries ────────────────────────────────────────────
  const fetchExpiries = useCallback(async (inst: Instrument) => {
    try {
      const res = await fetch(`/api/options/expiries/${inst}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const apiExpiries = json.data.expiries || json.data.all || []
          if (Array.isArray(apiExpiries) && apiExpiries.length > 0) {
            const mapped: ExpiryItem[] = apiExpiries.map((dateStr: string) => ({
              dateStr,
              label: formatDateLabel(dateStr),
            }))
            setExpiries(mapped)

            // Select nearest expiry
            const nearest = json.data.nearestExpiry || apiExpiries[0]
            setSelectedExpiry(nearest)
            return
          }
        }
      }
      // If API failed, set empty
      setExpiries([])
      setSelectedExpiry('')
    } catch {
      setExpiries([])
      setSelectedExpiry('')
    }
  }, [])

  // ─── Fetch Chain Data (REST fallback) ───────────────────────────
  const fetchChainData = useCallback(async (inst: Instrument, expiry: string, isInitial: boolean) => {
    if (isFetchingRef.current) return
    if (!expiry) return
    isFetchingRef.current = true

    try {
      const res = await fetch(`/api/options/chain/${inst}?expiry=${expiry}`)
      if (!res.ok) {
        if (isInitial) {
          setError('Failed to fetch data')
          setInitialLoading(false)
        }
        isFetchingRef.current = false
        return
      }

      const json = await res.json()
      if (!json.success || !json.data?.chain?.length) {
        if (isInitial) {
          setError(null)
          setData([])
          setInitialLoading(false)
          setHasFetchedOnce(true)
        }
        isFetchingRef.current = false
        return
      }

      const apiData = json.data

      // Validate spot price - never show 0
      const spot = apiData.spot || 0
      if (spot === 0 && isInitial) {
        setError('Invalid market data received')
        setInitialLoading(false)
        isFetchingRef.current = false
        return
      }

      // Update expiries from chain response if available
      if (apiData.expiries && Array.isArray(apiData.expiries) && apiData.expiries.length > 0) {
        const currentExpiryExists = apiData.expiries.includes(expiry)
        if (!currentExpiryExists && apiData.nearestExpiry) {
          // Auto-switch to nearest valid expiry
          setSelectedExpiry(apiData.nearestExpiry)
          const mapped: ExpiryItem[] = apiData.expiries.map((dateStr: string) => ({
            dateStr,
            label: formatDateLabel(dateStr),
          }))
          setExpiries(mapped)
          isFetchingRef.current = false
          return
        }
        // Merge expiries if we have more than current list
        setExpiries(prev => {
          const existingSet = new Set(prev.map(e => e.dateStr))
          const newItems: ExpiryItem[] = []
          for (const dateStr of apiData.expiries) {
            if (!existingSet.has(dateStr)) {
              newItems.push({ dateStr, label: formatDateLabel(dateStr) })
            }
          }
          if (newItems.length > 0) {
            return [...prev, ...newItems].sort((a, b) => a.dateStr.localeCompare(b.dateStr))
          }
          return prev
        })
      }

      // Parse chain data
      const rows: OptionRow[] = []
      for (const opt of apiData.chain as Record<string, unknown>[]) {
        const strike = opt.strikePrice as number

        // Handle nested CE/PE format from API
        const hasNestedCEPE = opt.ce !== undefined || opt.pe !== undefined

        if (hasNestedCEPE) {
          const ce = (opt.ce as Record<string, unknown>) || {}
          const pe = (opt.pe as Record<string, unknown>) || {}

          const ceGreeks = (ce.greeks as Record<string, unknown>) || {}
          const peGreeks = (pe.greeks as Record<string, unknown>) || {}

          rows.push({
            strike,
            ceOI: Number(ce.openInterest) || 0,
            ceVolume: Math.round(Number(ce.volume) || 0),
            ceLTP: Number(ce.ltp) || 0,
            ceChngPct: Number(ce.changePercent) || 0,
            ceIV: Number(ce.impliedVolatility) || Number(ce.iv) || 0,
            ceDelta: Number(ceGreeks.delta ?? ce.delta) || 0,
            ceGamma: Number(ceGreeks.gamma ?? ce.gamma) || 0,
            ceTheta: Number(ceGreeks.theta ?? ce.theta) || 0,
            ceVega: Number(ceGreeks.vega ?? ce.vega) || 0,
            peIV: Number(pe.impliedVolatility) || Number(pe.iv) || 0,
            peDelta: Number(peGreeks.delta ?? pe.delta) || 0,
            peGamma: Number(peGreeks.gamma ?? pe.gamma) || 0,
            peTheta: Number(peGreeks.theta ?? pe.theta) || 0,
            peVega: Number(peGreeks.vega ?? pe.vega) || 0,
            peChngPct: Number(pe.changePercent) || 0,
            peLTP: Number(pe.ltp) || 0,
            peVolume: Math.round(Number(pe.volume) || 0),
            peOI: Number(pe.openInterest) || 0,
          })
        } else {
          // DB format: separate CE/PE items
          const type = opt.optionType as string
          const existingRow = rows.find(r => r.strike === strike)

          const rowFields = {
            oi: Number(opt.openInterest) || 0,
            volume: Math.round(Number(opt.volume) || 0),
            ltp: Number(opt.ltp) || 0,
            chgPct: Number(opt.changePercent) || 0,
            iv: Number(opt.impliedVolatility) || 0,
            delta: Number(opt.delta) || 0,
            gamma: Number(opt.gamma) || 0,
            theta: Number(opt.theta) || 0,
            vega: Number(opt.vega) || 0,
          }

          if (existingRow) {
            if (type === 'CE') {
              existingRow.ceOI = rowFields.oi
              existingRow.ceVolume = rowFields.volume
              existingRow.ceLTP = rowFields.ltp
              existingRow.ceChngPct = rowFields.chgPct
              existingRow.ceIV = rowFields.iv
              existingRow.ceDelta = rowFields.delta
              existingRow.ceGamma = rowFields.gamma
              existingRow.ceTheta = rowFields.theta
              existingRow.ceVega = rowFields.vega
            } else {
              existingRow.peOI = rowFields.oi
              existingRow.peVolume = rowFields.volume
              existingRow.peLTP = rowFields.ltp
              existingRow.peChngPct = rowFields.chgPct
              existingRow.peIV = rowFields.iv
              existingRow.peDelta = rowFields.delta
              existingRow.peGamma = rowFields.gamma
              existingRow.peTheta = rowFields.theta
              existingRow.peVega = rowFields.vega
            }
          } else {
            const newRow: OptionRow = {
              strike,
              ceOI: 0, ceVolume: 0, ceLTP: 0, ceChngPct: 0, ceIV: 0,
              ceDelta: 0, ceGamma: 0, ceTheta: 0, ceVega: 0,
              peIV: 0, peDelta: 0, peGamma: 0, peTheta: 0, peVega: 0,
              peChngPct: 0, peLTP: 0, peVolume: 0, peOI: 0,
            }
            if (type === 'CE') {
              newRow.ceOI = rowFields.oi
              newRow.ceVolume = rowFields.volume
              newRow.ceLTP = rowFields.ltp
              newRow.ceChngPct = rowFields.chgPct
              newRow.ceIV = rowFields.iv
              newRow.ceDelta = rowFields.delta
              newRow.ceGamma = rowFields.gamma
              newRow.ceTheta = rowFields.theta
              newRow.ceVega = rowFields.vega
            } else {
              newRow.peOI = rowFields.oi
              newRow.peVolume = rowFields.volume
              newRow.peLTP = rowFields.ltp
              newRow.peChngPct = rowFields.chgPct
              newRow.peIV = rowFields.iv
              newRow.peDelta = rowFields.delta
              newRow.peGamma = rowFields.gamma
              newRow.peTheta = rowFields.theta
              newRow.peVega = rowFields.vega
            }
            rows.push(newRow)
          }
        }
      }

      rows.sort((a, b) => a.strike - b.strike)

      setSpotPrice(spot)
      setPcr(apiData.pcr || 0)
      setMaxPain(apiData.maxPain || 0)
      setData(rows)
      setError(null)
      setIsLive(true)
      setLastUpdated(new Date())
      setHasFetchedOnce(true)
      if (isInitial) setInitialLoading(false)
    } catch {
      if (isInitial) {
        setError('Failed to fetch data')
        setInitialLoading(false)
      }
    } finally {
      isFetchingRef.current = false
    }
  }, [])

  // ─── WebSocket data processing ──────────────────────────────────
  useEffect(() => {
    if (!wsData) return

    const rows = transformWsData(wsData)

    // Update expiries from WS data if available
    if (wsData.expiries && wsData.expiries.length > 0) {
      setExpiries(prev => {
        const existingSet = new Set(prev.map(e => e.dateStr))
        const newItems: ExpiryItem[] = []
        for (const dateStr of wsData.expiries) {
          if (!existingSet.has(dateStr)) {
            newItems.push({ dateStr, label: formatDateLabel(dateStr) })
          }
        }
        if (newItems.length > 0) {
          return [...prev, ...newItems].sort((a, b) => a.dateStr.localeCompare(b.dateStr))
        }
        return prev
      })

      // Auto-select nearest expiry if none selected
      if (!selectedExpiry && wsData.nearestExpiry) {
        setSelectedExpiry(wsData.nearestExpiry)
      }
    }

    setSpotPrice(wsData.spot || 0)
    setPcr(wsData.pcr || 0)
    setMaxPain(wsData.maxPain || 0)
    setData(rows)
    setError(null)
    setIsLive(true)
    setLastUpdated(new Date(wsData.timestamp || Date.now()))
    setHasFetchedOnce(true)
    if (initialLoading) setInitialLoading(false)
  }, [wsData, selectedExpiry, initialLoading])

  // ─── Fetch Ban List ────────────────────────────────────────────
  useEffect(() => {
    async function fetchBanList() {
      setBanListLoading(true)
      try {
        const res = await fetch('/api/options/ban-list')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.data)) {
            const activeBans = json.data.filter((item: BanItem) => item.isActive)
            setBanList(activeBans)
            if (activeBans.length > 0) setBanListOpen(true)
          }
        }
      } catch {
        // silently fail
      } finally {
        setBanListLoading(false)
      }
    }
    fetchBanList()
  }, [])

  // ─── Instrument Change: Fetch expiries ─────────────────────────
  useEffect(() => {
    setInitialLoading(true)
    setError(null)
    setData([])
    setSpotPrice(0)
    setHasFetchedOnce(false)
    setIsLive(false)
    prevInstrumentRef.current = instrument
    fetchExpiries(instrument)
  }, [instrument, fetchExpiries])

  // ─── REST Polling fallback (only when WS is disconnected) ─────
  useEffect(() => {
    // If WebSocket is connected, no need for REST polling
    if (isWsConnected) return
    if (!selectedExpiry) return

    let mounted = true

    const poll = async () => {
      if (!mounted) return
      const isInitial = !hasFetchedOnce
      await fetchChainData(instrument, selectedExpiry, isInitial)
    }

    // Initial fetch
    poll()

    // Poll every 2 seconds
    const interval = setInterval(poll, 2000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [instrument, selectedExpiry, fetchChainData, hasFetchedOnce, isWsConnected])

  // ─── Auto-scroll to ATM on data/expiry/instrument change ──────
  useEffect(() => {
    if (data.length > 0 && spotPrice > 0 && atmRef.current) {
      const shouldScroll =
        prevInstrumentRef.current !== instrument ||
        prevExpiryRef.current !== selectedExpiry ||
        !hasFetchedOnce

      if (shouldScroll || !prevExpiryRef.current) {
        setTimeout(() => {
          atmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 150)
      }
    }
    prevExpiryRef.current = selectedExpiry
  }, [data, spotPrice, instrument, selectedExpiry, hasFetchedOnce])

  // ─── Handlers ──────────────────────────────────────────────────

  const handleInstrumentChange = (inst: Instrument) => {
    if (inst === instrument) return
    setInstrument(inst)
  }

  const handleFnoStockSelect = (symbol: string) => {
    if (symbol === instrument) return
    setInstrument(symbol)
  }

  const handleExpiryChange = (dateStr: string) => {
    if (dateStr === selectedExpiry) return
    setSelectedExpiry(dateStr)
    setInitialLoading(true)
    setData([])
    setHasFetchedOnce(false)
  }

  const handleRowClick = (row: OptionRow, side: 'CE' | 'PE') => {
    setSelectedRow(row)
    setSelectedSide(side)
    setModalOpen(true)
  }

  const handleRetry = () => {
    setError(null)
    setInitialLoading(true)
    setHasFetchedOnce(false)
    fetchExpiries(instrument)
  }

  // ─── Derived values ────────────────────────────────────────────

  const atmStrike = spotPrice > 0 ? findATMStrike(data, spotPrice) : 0

  // ─── Column counts ─────────────────────────────────────────────

  const ceBaseCols = 3 // OI, LTP, Volume
  const ceGreeksCols = showGreeks ? 5 : 0 // IV, Delta, Gamma, Theta, Vega
  const ceColSpan = ceBaseCols + ceGreeksCols
  const peColSpan = ceColSpan

  // ─── Instrument display info ───────────────────────────────────
  const instrumentDisplayName = isIndex(instrument)
    ? (INDEX_CONFIGS[instrument]?.name || instrument)
    : (STOCK_DATABASE[instrument]?.name || instrument)
  const instrumentIsIndex = isIndex(instrument)

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="bg-[#f5f7fa] min-h-screen">
      <div className="p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto">

        {/* ── Top Info Bar ──────────────────────────────────────────── */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Current Instrument */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280] font-medium">
                {instrumentIsIndex ? 'Index' : 'Stock'}
              </span>
              <span className="font-mono font-bold text-[#1a1a2e] text-sm">
                {instrument}
              </span>
              {!instrumentIsIndex && STOCK_DATABASE[instrument] && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#e5e7eb] text-[#6b7280]">
                  {STOCK_DATABASE[instrument].sector}
                </Badge>
              )}
            </div>

            <div className="h-4 w-px bg-[#e5e7eb] hidden sm:block" />

            {/* Spot Price */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280] font-medium">Spot</span>
              <span className="font-mono font-bold text-[#1a1a2e] text-sm">
                {spotPrice > 0 ? formatPrice(spotPrice) : '—'}
              </span>
            </div>

            <div className="h-4 w-px bg-[#e5e7eb] hidden sm:block" />

            {/* PCR */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280] font-medium">PCR</span>
              <span className={cn(
                'font-mono font-bold text-sm',
                pcr > 1 ? 'text-[#00B386]' : pcr < 0.7 ? 'text-[#EB5B3C]' : 'text-[#1a1a2e]'
              )}>
                {pcr > 0 ? pcr.toFixed(2) : '—'}
              </span>
            </div>

            <div className="h-4 w-px bg-[#e5e7eb] hidden sm:block" />

            {/* Max Pain */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280] font-medium">Max Pain</span>
              <span className="font-mono font-bold text-[#1a1a2e] text-sm">
                {maxPain > 0 ? formatPrice(maxPain) : '—'}
              </span>
            </div>

            <div className="h-4 w-px bg-[#e5e7eb] hidden sm:block" />

            {/* Selected Expiry */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280] font-medium">Expiry</span>
              <span className="font-mono font-semibold text-[#1a1a2e] text-sm">
                {selectedExpiry ? formatDateLabel(selectedExpiry) : '—'}
              </span>
            </div>

            {/* LIVE Badge + WS Status */}
            <div className="flex items-center gap-2 ml-auto">
              {isLive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D09C]/10 text-[#00D09C]">
                  <span className="relative flex size-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D09C] opacity-75" />
                    <span className="relative inline-flex rounded-full size-1.5 bg-[#00D09C]" />
                  </span>
                  LIVE
                </span>
              )}
              {/* WebSocket connection indicator */}
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                isWsConnected
                  ? 'bg-[#00B386]/10 text-[#00B386]'
                  : 'bg-[#f59e0b]/10 text-[#f59e0b]'
              )}>
                {isWsConnected ? (
                  <><Wifi className="size-3" /> WS</>
                ) : (
                  <><WifiOff className="size-3" /> REST</>
                )}
              </span>
              {lastUpdated && (
                <span className="text-[10px] text-[#9ca3af] font-mono">
                  {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── F&O Stock Search ──────────────────────────────────────── */}
        <FnoStockSearch
          selectedSymbol={instrumentIsIndex ? null : instrument}
          onSelect={handleFnoStockSelect}
        />

        {/* ── Index Tabs ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {INDEX_INSTRUMENTS.map((inst) => (
            <button
              key={inst}
              onClick={() => handleInstrumentChange(inst)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
                instrument === inst
                  ? 'bg-[#1a1a2e] text-white shadow-sm'
                  : 'bg-white text-[#6b7280] border border-[#e5e7eb] hover:border-[#1a1a2e] hover:text-[#1a1a2e]'
              )}
            >
              {inst}
            </button>
          ))}
          {/* If a stock is selected, show it as a chip */}
          {!instrumentIsIndex && (
            <button
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap bg-[#1a1a2e] text-white shadow-sm flex items-center gap-1.5"
            >
              {instrument}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/30 text-white/80 hover:bg-white/10">
                {STOCK_DATABASE[instrument]?.sector || 'Stock'}
              </Badge>
            </button>
          )}
        </div>

        {/* ── Expiry Selector ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {expiries.map((exp) => (
            <button
              key={exp.dateStr}
              onClick={() => handleExpiryChange(exp.dateStr)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                selectedExpiry === exp.dateStr
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white text-[#6b7280] border border-[#e5e7eb] hover:border-[#1a1a2e]'
              )}
            >
              {exp.label}
            </button>
          ))}
          {expiries.length === 0 && !initialLoading && (
            <span className="text-xs text-[#9ca3af]">No expiries available</span>
          )}
        </div>

        {/* ── F&O Ban List ──────────────────────────────────────────── */}
        {!banListLoading && banList.length > 0 && (
          <Collapsible open={banListOpen} onOpenChange={setBanListOpen}>
            <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                      <ShieldAlert className="size-4 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1a1a2e]">F&O Ban List</span>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-xs font-semibold px-1.5 py-0">
                        {banList.length}
                      </Badge>
                    </div>
                  </div>
                  {banListOpen ? (
                    <ChevronUp className="size-4 text-amber-500" />
                  ) : (
                    <ChevronDown className="size-4 text-amber-500" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-amber-200">
                  <div className="max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
                      {banList.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-2.5 border-b border-amber-100 last:border-b-0 sm:border-r sm:border-amber-100 flex items-start gap-3"
                        >
                          <div className="flex size-6 items-center justify-center rounded bg-[#EB5B3C]/10 mt-0.5 shrink-0">
                            <ShieldAlert className="size-3 text-[#EB5B3C]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-[#1a1a2e]">{item.symbol}</span>
                              <span className="text-[10px] text-[#6b7280] truncate">{item.name}</span>
                            </div>
                            <div className="text-[10px] text-[#6b7280] mt-0.5 font-mono">
                              {new Date(item.banStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              {' → '}
                              {new Date(item.banEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* ── Greeks Toggle ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#6b7280]" />
            <span className="text-sm font-semibold text-[#1a1a2e]">Option Chain</span>
            <span className="text-xs text-[#6b7280]">· Click LTP to trade</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b7280] font-medium">Greeks</span>
            <Switch
              checked={showGreeks}
              onCheckedChange={setShowGreeks}
              className="data-[state=checked]:bg-[#00B386]"
            />
          </div>
        </div>

        {/* ── Option Chain Table ────────────────────────────────────── */}
        {initialLoading ? (
          /* Loading Skeleton */
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#1a1a2e] text-white">
                    <th colSpan={ceColSpan} className="text-center py-2.5 font-semibold text-xs tracking-wider">CALLS</th>
                    <th className="text-center py-2.5 bg-[#374151] font-bold text-xs border-x border-[#4b5563]">STRIKE</th>
                    <th colSpan={peColSpan} className="text-center py-2.5 font-semibold text-xs tracking-wider">PUTS</th>
                  </tr>
                  <tr className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[#6b7280]">
                    <th className="px-2 py-2 text-right font-medium">OI</th>
                    <th className="px-2 py-2 text-right font-medium">LTP</th>
                    {!showGreeks && <th className="px-2 py-2 text-right font-medium">Vol</th>}
                    {showGreeks && (
                      <>
                        <th className="px-2 py-2 text-right font-medium">IV</th>
                        <th className="px-2 py-2 text-right font-medium">Delta</th>
                        <th className="px-2 py-2 text-right font-medium">Gamma</th>
                        <th className="px-2 py-2 text-right font-medium">Theta</th>
                        <th className="px-2 py-2 text-right font-medium">Vega</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-center font-bold bg-[#f3f4f6] border-x border-[#e5e7eb] text-[#1a1a2e]">₹</th>
                    {showGreeks && (
                      <>
                        <th className="px-2 py-2 text-left font-medium">Vega</th>
                        <th className="px-2 py-2 text-left font-medium">Theta</th>
                        <th className="px-2 py-2 text-left font-medium">Gamma</th>
                        <th className="px-2 py-2 text-left font-medium">Delta</th>
                        <th className="px-2 py-2 text-left font-medium">IV</th>
                      </>
                    )}
                    {!showGreeks && <th className="px-2 py-2 text-left font-medium">Vol</th>}
                    <th className="px-2 py-2 text-left font-medium">LTP</th>
                    <th className="px-2 py-2 text-left font-medium">OI</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-white border border-[#e5e7eb] rounded-xl py-16 flex flex-col items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#EB5B3C]/10 mb-4">
              <RefreshCw className="size-5 text-[#EB5B3C]" />
            </div>
            <p className="text-[#1a1a2e] font-semibold text-sm">Failed to fetch data</p>
            <p className="text-[#6b7280] text-xs mt-1 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#2d2d4a] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : data.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-[#e5e7eb] rounded-xl py-16 flex flex-col items-center justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#f3f4f6] mb-4">
              <Activity className="size-5 text-[#d1d5db]" />
            </div>
            <p className="text-[#1a1a2e] font-semibold text-sm">No options data available for {instrument}</p>
            <p className="text-[#6b7280] text-xs mt-1 mb-4">Try selecting a different expiry or instrument</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-semibold hover:bg-[#2d2d4a] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          /* Data Table */
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  {/* Section Headers */}
                  <tr className="bg-[#1a1a2e] text-white">
                    <th colSpan={ceColSpan} className="text-center py-2.5 font-semibold text-xs tracking-wider">
                      CALLS
                    </th>
                    <th className="text-center py-2.5 bg-[#374151] font-bold text-xs border-x border-[#4b5563]">
                      STRIKE
                    </th>
                    <th colSpan={peColSpan} className="text-center py-2.5 font-semibold text-xs tracking-wider">
                      PUTS
                    </th>
                  </tr>
                  {/* Column Headers */}
                  <tr className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[#6b7280]">
                    {/* CE columns */}
                    <th className="px-2 py-2 text-right font-medium">OI</th>
                    <th className="px-2 py-2 text-right font-medium">LTP</th>
                    {!showGreeks && <th className="px-2 py-2 text-right font-medium">Vol</th>}
                    {showGreeks && (
                      <>
                        <th className="px-2 py-2 text-right font-medium">IV</th>
                        <th className="px-2 py-2 text-right font-medium">Delta</th>
                        <th className="px-2 py-2 text-right font-medium">Gamma</th>
                        <th className="px-2 py-2 text-right font-medium">Theta</th>
                        <th className="px-2 py-2 text-right font-medium">Vega</th>
                      </>
                    )}
                    {/* Strike */}
                    <th className="px-2 py-2 text-center font-bold bg-[#f3f4f6] border-x border-[#e5e7eb] text-[#1a1a2e]">₹</th>
                    {/* PE columns */}
                    {showGreeks && (
                      <>
                        <th className="px-2 py-2 text-left font-medium">Vega</th>
                        <th className="px-2 py-2 text-left font-medium">Theta</th>
                        <th className="px-2 py-2 text-left font-medium">Gamma</th>
                        <th className="px-2 py-2 text-left font-medium">Delta</th>
                        <th className="px-2 py-2 text-left font-medium">IV</th>
                      </>
                    )}
                    {!showGreeks && <th className="px-2 py-2 text-left font-medium">Vol</th>}
                    <th className="px-2 py-2 text-left font-medium">LTP</th>
                    <th className="px-2 py-2 text-left font-medium">OI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const isATM = row.strike === atmStrike
                    const isCEITM = spotPrice > 0 && row.strike < spotPrice
                    const isPEITM = spotPrice > 0 && row.strike > spotPrice

                    return (
                      <tr
                        key={row.strike}
                        ref={isATM ? atmRef : undefined}
                        className={cn(
                          'border-b border-[#f3f4f6] hover:bg-[#f9fafb]/60 transition-colors',
                          isATM && 'bg-[#00D09C]/5',
                        )}
                      >
                        {/* CE Section */}
                        <td className={cn(
                          'px-2 py-1.5 text-right font-mono',
                          isCEITM && 'bg-[#00B386]/[0.03]'
                        )}>
                          {row.ceOI > 0 ? formatOI(row.ceOI) : '—'}
                        </td>
                        <td className={cn(
                          'px-2 py-1.5 text-right font-mono font-semibold cursor-pointer hover:underline',
                          isCEITM && 'bg-[#00B386]/[0.03]',
                          row.ceLTP > 0 ? 'text-[#00B386]' : 'text-[#9ca3af]'
                        )}
                          onClick={() => row.ceLTP > 0 && handleRowClick(row, 'CE')}
                        >
                          {row.ceLTP > 0 ? row.ceLTP.toFixed(2) : '—'}
                        </td>
                        {!showGreeks && (
                          <td className={cn(
                            'px-2 py-1.5 text-right font-mono text-[#6b7280]',
                            isCEITM && 'bg-[#00B386]/[0.03]'
                          )}>
                            {row.ceVolume > 0 ? formatVolume(row.ceVolume) : '—'}
                          </td>
                        )}
                        {showGreeks && (
                          <>
                            <td className={cn(
                              'px-2 py-1.5 text-right font-mono text-[#6b7280]',
                              isCEITM && 'bg-[#00B386]/[0.03]'
                            )}>
                              {row.ceIV > 0 ? row.ceIV.toFixed(1) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-right font-mono text-[#6b7280]',
                              isCEITM && 'bg-[#00B386]/[0.03]'
                            )}>
                              {row.ceDelta !== 0 ? row.ceDelta.toFixed(3) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-right font-mono text-[#6b7280]',
                              isCEITM && 'bg-[#00B386]/[0.03]'
                            )}>
                              {row.ceGamma !== 0 ? row.ceGamma.toFixed(4) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-right font-mono text-[#6b7280]',
                              isCEITM && 'bg-[#00B386]/[0.03]'
                            )}>
                              {row.ceTheta !== 0 ? row.ceTheta.toFixed(2) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-right font-mono text-[#6b7280]',
                              isCEITM && 'bg-[#00B386]/[0.03]'
                            )}>
                              {row.ceVega !== 0 ? row.ceVega.toFixed(2) : '—'}
                            </td>
                          </>
                        )}

                        {/* Strike Column */}
                        <td className={cn(
                          'px-2 py-1.5 text-center font-mono font-bold bg-[#f8f8f8] border-x border-[#e5e7eb]',
                          isATM && 'bg-[#00D09C]/10 text-[#00D09C]'
                        )}>
                          {formatStrike(row.strike)}
                        </td>

                        {/* PE Section */}
                        {showGreeks && (
                          <>
                            <td className={cn(
                              'px-2 py-1.5 text-left font-mono text-[#6b7280]',
                              isPEITM && 'bg-[#EB5B3C]/[0.03]'
                            )}>
                              {row.peVega !== 0 ? row.peVega.toFixed(2) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-left font-mono text-[#6b7280]',
                              isPEITM && 'bg-[#EB5B3C]/[0.03]'
                            )}>
                              {row.peTheta !== 0 ? row.peTheta.toFixed(2) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-left font-mono text-[#6b7280]',
                              isPEITM && 'bg-[#EB5B3C]/[0.03]'
                            )}>
                              {row.peGamma !== 0 ? row.peGamma.toFixed(4) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-left font-mono text-[#6b7280]',
                              isPEITM && 'bg-[#EB5B3C]/[0.03]'
                            )}>
                              {row.peDelta !== 0 ? row.peDelta.toFixed(3) : '—'}
                            </td>
                            <td className={cn(
                              'px-2 py-1.5 text-left font-mono text-[#6b7280]',
                              isPEITM && 'bg-[#EB5B3C]/[0.03]'
                            )}>
                              {row.peIV > 0 ? row.peIV.toFixed(1) : '—'}
                            </td>
                          </>
                        )}
                        {!showGreeks && (
                          <td className={cn(
                            'px-2 py-1.5 text-left font-mono text-[#6b7280]',
                            isPEITM && 'bg-[#EB5B3C]/[0.03]'
                          )}>
                            {row.peVolume > 0 ? formatVolume(row.peVolume) : '—'}
                          </td>
                        )}
                        <td className={cn(
                          'px-2 py-1.5 text-left font-mono font-semibold cursor-pointer hover:underline',
                          isPEITM && 'bg-[#EB5B3C]/[0.03]',
                          row.peLTP > 0 ? 'text-[#EB5B3C]' : 'text-[#9ca3af]'
                        )}
                          onClick={() => row.peLTP > 0 && handleRowClick(row, 'PE')}
                        >
                          {row.peLTP > 0 ? row.peLTP.toFixed(2) : '—'}
                        </td>
                        <td className={cn(
                          'px-2 py-1.5 text-left font-mono',
                          isPEITM && 'bg-[#EB5B3C]/[0.03]'
                        )}>
                          {row.peOI > 0 ? formatOI(row.peOI) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Trade Modal */}
      <QuickTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={selectedRow}
        side={selectedSide}
        instrument={instrument}
      />
    </div>
  )
}
