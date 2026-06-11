'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useTradeSuccess } from '@/components/pepertect/trade-success-popup'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  X,
  BarChart3,
  GitBranch,
  Activity,
  Info,
  Clock,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Loader2,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR, formatNumber } from '@/lib/format'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────────────────────

interface IndexDetail {
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  volume: number
  week52High: number
  week52Low: number
  lotSize: number
  strikeInterval: number
  isRealData?: boolean
}

interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface OptionRow {
  strike: number
  ceOI: number
  ceOIChngPct: number
  ceLTP: number
  ceChngPct: number
  ceIV: number
  ceVolume: number
  peVolume: number
  peIV: number
  peChngPct: number
  peLTP: number
  peOIChngPct: number
  peOI: number
}

type RangeOption = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'

function formatDate(dateStr: string, range: RangeOption): string {
  const d = new Date(dateStr)
  if (range === '1D') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (range === '1W') return d.toLocaleDateString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
  if (range === '1M' || range === '3M') return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

// ─── Mock Option Chain Generator ────────────────────────────────────────────

function generateOptionChain(spotPrice: number, strikeInterval: number): OptionRow[] {
  const strikes: number[] = []
  const range = strikeInterval * 10
  const startStrike = Math.floor((spotPrice - range) / strikeInterval) * strikeInterval
  const endStrike = Math.ceil((spotPrice + range) / strikeInterval) * strikeInterval

  for (let s = startStrike; s <= endStrike; s += strikeInterval) {
    strikes.push(s)
  }

  return strikes.map((strike) => {
    const diffFromSpot = strike - spotPrice
    const isATM = Math.abs(diffFromSpot) < strikeInterval / 2
    const ceITM = strike < spotPrice
    const peITM = strike > spotPrice

    const ceIntrinsic = ceITM ? spotPrice - strike : 0
    const ceTimeValue = Math.max(50, (250 - Math.abs(diffFromSpot) * 0.3) * (isATM ? 1.2 : 1))
    const ceLTP = Math.max(0.05, ceIntrinsic + ceTimeValue * (0.6 + Math.random() * 0.8))
    const ceChngPct = (Math.random() - 0.5) * 20
    const ceIV = Math.max(5, 18 - diffFromSpot * 0.01 + Math.random() * 8)
    const ceOI = Math.max(0.5, (isATM ? 80 : 40 - Math.abs(diffFromSpot) * 0.04) * (0.5 + Math.random()))
    const ceOIChngPct = (Math.random() - 0.4) * 30
    const ceVolume = Math.max(100, ceOI * 1000 * (0.3 + Math.random() * 0.7))

    const peIntrinsic = peITM ? strike - spotPrice : 0
    const peTimeValue = Math.max(50, (250 - Math.abs(diffFromSpot) * 0.3) * (isATM ? 1.2 : 1))
    const peLTP = Math.max(0.05, peIntrinsic + peTimeValue * (0.6 + Math.random() * 0.8))
    const peChngPct = (Math.random() - 0.5) * 20
    const peIV = Math.max(5, 18 + diffFromSpot * 0.01 + Math.random() * 8)
    const peOI = Math.max(0.5, (isATM ? 85 : 45 - Math.abs(diffFromSpot) * 0.04) * (0.5 + Math.random()))
    const peOIChngPct = (Math.random() - 0.4) * 30
    const peVolume = Math.max(100, peOI * 1000 * (0.3 + Math.random() * 0.7))

    return {
      strike,
      ceOI: Number(ceOI.toFixed(1)),
      ceOIChngPct: Number(ceOIChngPct.toFixed(1)),
      ceLTP: Number(ceLTP.toFixed(2)),
      ceChngPct: Number(ceChngPct.toFixed(1)),
      ceIV: Number(ceIV.toFixed(1)),
      ceVolume: Math.round(ceVolume),
      peVolume: Math.round(peVolume),
      peIV: Number(peIV.toFixed(1)),
      peChngPct: Number(peChngPct.toFixed(1)),
      peLTP: Number(peLTP.toFixed(2)),
      peOIChngPct: Number(peOIChngPct.toFixed(1)),
      peOI: Number(peOI.toFixed(1)),
    }
  })
}

// getOIColorClass removed - simplified option chain

// ─── Chart Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, range }: { active?: boolean; payload?: Array<{ payload: CandleData }>; label?: string; range: RangeOption }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  const isUp = d.close >= d.open

  return (
    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-lg p-3 shadow-xl border border-[#e5e7eb]/20 text-xs">
      <div className="font-semibold text-[#1a1a1a] mb-1.5">{formatDate(d.date, range)}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-[#6b7280]">Open</span>
        <span className="font-mono font-tabular text-right">{d.open.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span className="text-[#6b7280]">High</span>
        <span className="font-mono font-tabular text-right">{d.high.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span className="text-[#6b7280]">Low</span>
        <span className="font-mono font-tabular text-right">{d.low.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span className="text-[#6b7280]">Close</span>
        <span className={cn('font-mono font-tabular text-right font-semibold', isUp ? 'text-[#00B386]' : 'text-[#EB5B3C]')}>
          {d.close.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </span>
        {d.volume > 0 && (
          <>
            <span className="text-[#6b7280]">Volume</span>
            <span className="font-mono font-tabular text-right">{formatNumber(d.volume)}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface IndexDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  symbol: string | null
}

export function IndexDetailDrawer({ open, onOpenChange, symbol }: IndexDetailDrawerProps) {
  const { token } = useAuthStore()

  // State
  const [detail, setDetail] = useState<IndexDetail | null>(null)
  const [chartData, setChartData] = useState<CandleData[]>([])
  const [range, setRange] = useState<RangeOption>('1M')
  const [detailLoading, setDetailLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chart')
  const [chartType, setChartType] = useState<'area' | 'candle'>('area')

  // Trade modal state
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [tradeRow, setTradeRow] = useState<OptionRow | null>(null)
  const [tradeSide, setTradeSide] = useState<'CE' | 'PE'>('CE')

  const handleOptionClick = (row: OptionRow, side: 'CE' | 'PE') => {
    setTradeRow(row)
    setTradeSide(side)
    setTradeModalOpen(true)
  }

  // Fetch index detail
  const fetchDetail = useCallback(async () => {
    if (!symbol) return
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/market/index-detail/${symbol}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setDetail(json.data)
      }
    } catch {
      // Keep previous data or null
    } finally {
      setDetailLoading(false)
    }
  }, [symbol])

  // Fetch chart data
  const fetchChart = useCallback(async () => {
    if (!symbol) return
    setChartLoading(true)
    try {
      const res = await fetch(`/api/market/index-chart/${symbol}?range=${range}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setChartData(json.data || [])
      }
    } catch {
      // Keep previous data
    } finally {
      setChartLoading(false)
    }
  }, [symbol, range])

  useEffect(() => {
    if (open && symbol) {
      fetchDetail()
      setActiveTab('chart')
    }
  }, [open, symbol, fetchDetail])

  useEffect(() => {
    if (open && symbol) {
      fetchChart()
    }
  }, [open, symbol, range, fetchChart])

  // Real option chain from API
  const [optionChainData, setOptionChainData] = useState<OptionRow[]>([])
  const [optionChainLoading, setOptionChainLoading] = useState(false)

  const fetchOptionChain = useCallback(async () => {
    if (!symbol) return
    setOptionChainLoading(true)
    try {
      const res = await fetch(`/api/options/chain/${symbol}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.chain?.length > 0) {
          const apiData = json.data
          const spot = apiData.spot || detail?.currentPrice || 0
          const strikeInterval = detail?.strikeInterval || 50
          
          // Group options by strike price
          const strikeMap = new Map<number, { ce?: Record<string, unknown>; pe?: Record<string, unknown> }>()
          for (const opt of apiData.chain as Record<string, unknown>[]) {
            const strike = opt.strikePrice as number
            if (!strikeMap.has(strike)) strikeMap.set(strike, {})
            const type = opt.optionType as string
            if (type === 'CE') strikeMap.get(strike)!.ce = opt
            else strikeMap.get(strike)!.pe = opt
          }
          
          const rows: OptionRow[] = []
          for (const [strike, data] of strikeMap) {
            const diffFromSpot = strike - spot
            const isATM = Math.abs(diffFromSpot) < strikeInterval / 2
            
            // If we have real data, use it; otherwise generate estimates
            const ceOI = (data.ce?.openInterest as number) || (isATM ? 80 : 40) * (0.5 + Math.random())
            const peOI = (data.pe?.openInterest as number) || (isATM ? 85 : 45) * (0.5 + Math.random())
            
            rows.push({
              strike,
              ceOI: Number(ceOI.toFixed(1)),
              ceOIChngPct: Number(((data.ce?.oiChangePercent as number) || (Math.random() - 0.4) * 30).toFixed(1)),
              ceLTP: Number(((data.ce?.ltp as number) || 0).toFixed(2)),
              ceChngPct: Number(((data.ce?.changePercent as number) || 0).toFixed(1)),
              ceIV: Number(((data.ce?.impliedVolatility as number) || 0).toFixed(1)),
              ceVolume: Math.round((data.ce?.volume as number) || 0),
              peVolume: Math.round((data.pe?.volume as number) || 0),
              peIV: Number(((data.pe?.impliedVolatility as number) || 0).toFixed(1)),
              peChngPct: Number(((data.pe?.changePercent as number) || 0).toFixed(1)),
              peLTP: Number(((data.pe?.ltp as number) || 0).toFixed(2)),
              peOIChngPct: Number(((data.pe?.oiChangePercent as number) || (Math.random() - 0.4) * 30).toFixed(1)),
              peOI: Number(peOI.toFixed(1)),
            })
          }
          
          rows.sort((a, b) => a.strike - b.strike)
          setOptionChainData(rows)
        } else {
          // Fallback to generated data if API returns empty
          if (detail) {
            setOptionChainData(generateOptionChain(detail.currentPrice, detail.strikeInterval))
          }
        }
      } else {
        // Fallback on error
        if (detail) {
          setOptionChainData(generateOptionChain(detail.currentPrice, detail.strikeInterval))
        }
      }
    } catch {
      // Fallback on network error
      if (detail) {
        setOptionChainData(generateOptionChain(detail.currentPrice, detail.strikeInterval))
      }
    } finally {
      setOptionChainLoading(false)
    }
  }, [symbol, detail])

  // Fetch option chain when drawer opens or when user switches to optionChain tab
  useEffect(() => {
    if (open && symbol && (activeTab === 'optionChain' || activeTab === 'chart')) {
      fetchOptionChain()
    }
  }, [open, symbol, activeTab, fetchOptionChain])

  const optionChain = optionChainData

  // Option chain stats
  const optionStats = useMemo(() => {
    if (optionChain.length === 0) return { pcr: 0, maxPain: 0, highestCEOI: optionChain[0], highestPEOI: optionChain[0] }
    const totalCEOI = optionChain.reduce((s, r) => s + r.ceOI, 0)
    const totalPEOI = optionChain.reduce((s, r) => s + r.peOI, 0)
    const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0
    const maxPainStrike = optionChain.reduce(
      (max, r) => {
        const pain = optionChain.reduce((acc, d) => {
          const cePain = d.strike < r.strike ? (r.strike - d.strike) * d.ceOI : 0
          const pePain = d.strike > r.strike ? (d.strike - r.strike) * d.peOI : 0
          return acc + cePain + pePain
        }, 0)
        return pain > max.pain ? { strike: r.strike, pain } : max
      },
      { strike: 0, pain: 0 }
    ).strike
    const highestCEOI = optionChain.reduce((max, r) => (r.ceOI > max.ceOI ? r : max), optionChain[0])
    const highestPEOI = optionChain.reduce((max, r) => (r.peOI > max.peOI ? r : max), optionChain[0])
    return { pcr, maxPain: maxPainStrike, highestCEOI, highestPEOI, totalCEOI, totalPEOI }
  }, [optionChain])

  // Chart data for Recharts
  const chartDataFormatted = useMemo(() => {
    return chartData.map((d) => ({
      ...d,
      dateLabel: formatDate(d.date, range),
      color: d.close >= d.open ? '#00B386' : '#eb5b3c',
    }))
  }, [chartData, range])

  // Chart min/max
  const chartMinMax = useMemo(() => {
    if (chartDataFormatted.length === 0) return { min: 0, max: 0 }
    const prices = chartDataFormatted.flatMap((d) => [d.high, d.low])
    return {
      min: Math.min(...prices) * 0.999,
      max: Math.max(...prices) * 1.001,
    }
  }, [chartDataFormatted])

  const isPositive = detail ? detail.change >= 0 : true
  const gradientId = `gradient-${symbol}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[680px] md:max-w-[780px] lg:max-w-[900px] p-0 gap-0 bg-[#f5f7fa] border-l border-[#e5e7eb]/20 overflow-y-auto [&>button]:hidden"
      >
        {/* Accessibility: Hidden but required by Radix Dialog */}
        <SheetTitle className="sr-only">{detail?.name || symbol || 'Index Detail'}</SheetTitle>
        <SheetDescription className="sr-only">Index detail view with chart, option chain, and statistics</SheetDescription>

        {/* ═══ Header ═════════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-30 bg-[#f5f7fa]/95 backdrop-blur-md border-b border-[#e5e7eb]/20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              {detailLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <>
                  <div className={cn(
                    'flex size-10 items-center justify-center rounded-xl',
                    isPositive ? 'bg-[#00B386]/10' : 'bg-[#EB5B3C]/10'
                  )}>
                    {isPositive ? (
                      <TrendingUp className="size-5 text-[#00B386]" />
                    ) : (
                      <TrendingDown className="size-5 text-[#EB5B3C]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#1a1a1a]">{detail?.name || symbol}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-bold font-mono-data font-tabular text-[#1a1a1a]">
                        {detail?.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </span>
                      <span className={cn(
                        'flex items-center gap-0.5 text-sm font-semibold',
                        isPositive ? 'text-[#00B386]' : 'text-[#EB5B3C]'
                      )}>
                        {isPositive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                        {isPositive ? '+' : ''}{detail?.change.toFixed(2)} ({isPositive ? '+' : ''}{detail?.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[#00D09C] border-[#00D09C]/30 hover:bg-[#00D09C]/10 hover:text-[#00D09C] font-semibold shrink-0"
              onClick={() => setActiveTab('optionChain')}
            >
              <GitBranch className="size-4" />
              Option Chain
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#6b7280] hover:text-[#1a1a1a] shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* ═══ Tabs ══════════════════════════════════════════════════════════ */}
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#ffffff] rounded-xl p-1 h-auto">
              <TabsTrigger
                value="chart"
                className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-[#00D09C] data-[state=active]:text-white transition-all"
              >
                <BarChart3 className="size-4 mr-1.5" />
                Chart
              </TabsTrigger>
              <TabsTrigger
                value="optionChain"
                className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-[#00D09C] data-[state=active]:text-white transition-all"
              >
                <GitBranch className="size-4 mr-1.5" />
                Option Chain
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-[#00D09C] data-[state=active]:text-white transition-all"
              >
                <Activity className="size-4 mr-1.5" />
                Statistics
              </TabsTrigger>
            </TabsList>

            {/* ═══ Chart Tab ════════════════════════════════════════════════ */}
            <TabsContent value="chart" className="mt-4 space-y-4">
              {/* Range Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'] as RangeOption[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        range === r
                          ? 'bg-[#00D09C] text-white shadow-sm'
                          : 'text-[#6b7280] hover:bg-[#ffffff] hover:text-[#1a1a1a]'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartType('area')}
                    className={cn(
                      'p-2 rounded-lg transition-all',
                      chartType === 'area' ? 'bg-[#f5f7fa] text-[#00D09C]' : 'text-[#6b7280] hover:text-[#1a1a1a]'
                    )}
                  >
                    <BarChart3 className="size-4" />
                  </button>
                  <button
                    onClick={() => setChartType('candle')}
                    className={cn(
                      'p-2 rounded-lg transition-all',
                      chartType === 'candle' ? 'bg-[#f5f7fa] text-[#00D09C]' : 'text-[#6b7280] hover:text-[#1a1a1a]'
                    )}
                  >
                    <GitBranch className="size-4" />
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-[#f5f7fa] rounded-xl p-4 border border-[#e5e7eb]/10">
                {chartLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="size-2 rounded-full bg-[#00D09C] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="size-2 rounded-full bg-[#00D09C] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="size-2 rounded-full bg-[#00D09C] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-[#6b7280]">Loading chart data...</span>
                    </div>
                  </div>
                ) : chartDataFormatted.length > 0 ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={chartDataFormatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isPositive ? '#00B386' : '#eb5b3c'} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={isPositive ? '#00B386' : '#eb5b3c'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                          <XAxis
                            dataKey="dateLabel"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: 'rgba(128,128,128,0.2)' }}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            domain={[chartMinMax.min, chartMinMax.max]}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            width={60}
                          />
                          <Tooltip content={<CustomTooltip range={range} />} />
                          <Area
                            type="monotone"
                            dataKey="close"
                            stroke={isPositive ? '#00B386' : '#eb5b3c'}
                            strokeWidth={2}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartDataFormatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                          <XAxis
                            dataKey="dateLabel"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: 'rgba(128,128,128,0.2)' }}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            domain={[chartMinMax.min, chartMinMax.max]}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            width={60}
                          />
                          <Tooltip content={<CustomTooltip range={range} />} />
                          <Bar
                            dataKey="close"
                            shape={(props: Record<string, unknown>) => {
                              const { x, y, width, height, payload } = props as { x: number; y: number; width: number; height: number; payload: CandleData }
                              const isUp = payload.close >= payload.open
                              return (
                                <rect
                                  x={x}
                                  y={y}
                                  width={Math.max(1, width as number)}
                                  height={height}
                                  fill={isUp ? '#00B386' : '#eb5b3c'}
                                  opacity={0.85}
                                  rx={1}
                                />
                              )
                            }}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-[#6b7280] text-sm">
                    No chart data available
                  </div>
                )}
              </div>

              {/* Quick Stats Below Chart */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Open" value={detail?.open ? formatINR(detail.open) : '--'} />
                <StatBox label="High" value={detail?.high ? formatINR(detail.high) : '--'} highlight />
                <StatBox label="Low" value={detail?.low ? formatINR(detail.low) : '--'} danger />
                <StatBox label="Prev Close" value={detail?.previousClose ? formatINR(detail.previousClose) : '--'} />
              </div>
            </TabsContent>

            {/* ═══ Option Chain Tab ═════════════════════════════════════════ */}
            <TabsContent value="optionChain" className="mt-4 space-y-3">
              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-xs bg-white border border-[#e5e7eb] rounded-lg p-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-[#6b7280]">Spot</span>
                  <span className="font-mono font-tabular font-bold text-[#1a1a1a]">{detail?.currentPrice.toLocaleString('en-IN') || '--'}</span>
                </div>
                <div className="h-3 w-px bg-[#e5e7eb]" />
                <div className="flex items-center gap-1">
                  <span className="text-[#6b7280]">PCR</span>
                  <span className={cn(
                    'font-mono font-tabular font-bold',
                    optionStats.pcr > 1 ? 'text-[#00B386]' : optionStats.pcr < 0.7 ? 'text-[#EB5B3C]' : 'text-[#1a1a1a]'
                  )}>
                    {optionStats.pcr.toFixed(2)}
                  </span>
                </div>
                <div className="h-3 w-px bg-[#e5e7eb]" />
                <div className="flex items-center gap-1">
                  <span className="text-[#6b7280]">Max Pain</span>
                  <span className="font-mono font-tabular font-bold text-[#1a1a1a]">{optionStats.maxPain.toLocaleString()}</span>
                </div>
              </div>

              {/* Loading State */}
              {optionChainLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="size-2 rounded-full bg-[#1a1a1a] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="size-2 rounded-full bg-[#1a1a1a] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="size-2 rounded-full bg-[#1a1a1a] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-[#6b7280]">Loading option chain...</span>
                  </div>
                </div>
              )}

              {/* Simplified Option Chain Table - Groww Style */}
              <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar max-h-[420px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1a1a1a] text-white">
                        <th colSpan={4} className="text-center py-2 font-semibold text-xs tracking-wider">
                          CALLS
                        </th>
                        <th className="text-center py-2 bg-[#374151] font-bold text-xs border-x border-[#4b5563]">
                          STRIKE
                        </th>
                        <th colSpan={4} className="text-center py-2 font-semibold text-xs tracking-wider">
                          PUTS
                        </th>
                      </tr>
                      <tr className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[#6b7280]">
                        <th className="px-1.5 py-1.5 text-right font-medium">OI(L)</th>
                        <th className="px-1.5 py-1.5 text-right font-medium">Vol</th>
                        <th className="px-1.5 py-1.5 text-right font-medium">LTP</th>
                        <th className="px-1.5 py-1.5 text-right font-medium">Chg%</th>
                        <th className="px-1.5 py-1.5 text-center font-bold bg-[#f3f4f6] border-x border-[#e5e7eb] text-[#1a1a1a]">₹</th>
                        <th className="px-1.5 py-1.5 text-left font-medium">Chg%</th>
                        <th className="px-1.5 py-1.5 text-left font-medium">LTP</th>
                        <th className="px-1.5 py-1.5 text-left font-medium">Vol</th>
                        <th className="px-1.5 py-1.5 text-left font-medium">OI(L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optionChain.map((row) => {
                        const isATM = detail && row.strike === Math.round(detail.currentPrice / detail.strikeInterval) * detail.strikeInterval
                        const ceITM = detail && row.strike < detail.currentPrice
                        const peITM = detail && row.strike > detail.currentPrice

                        return (
                          <tr
                            key={row.strike}
                            className={cn(
                              'border-b border-[#f3f4f6] transition-colors',
                              isATM && 'bg-[#1a1a1a]/5'
                            )}
                          >
                            {/* CE Side */}
                            <td className={cn('px-1.5 py-1 text-right font-mono font-tabular text-[#6b7280]', ceITM && 'bg-[#00B386]/6')}>
                              {row.ceOI.toFixed(1)}
                            </td>
                            <td className={cn('px-1.5 py-1 text-right font-mono font-tabular text-[#9ca3af]', ceITM && 'bg-[#00B386]/6')}>
                              {row.ceVolume > 0 ? `${(row.ceVolume / 1000).toFixed(0)}K` : '-'}
                            </td>
                            <td
                              className={cn(
                                'px-1.5 py-1 text-right font-mono font-tabular font-semibold text-[#1a1a1a] cursor-pointer hover:text-[#00B386] hover:underline',
                                ceITM && 'bg-[#00B386]/6'
                              )}
                              onClick={() => handleOptionClick(row, 'CE')}
                            >
                              {row.ceLTP.toFixed(2)}
                            </td>
                            <td className={cn(
                              'px-1.5 py-1 text-right font-mono',
                              row.ceChngPct > 0 ? 'text-[#00B386]' : row.ceChngPct < 0 ? 'text-[#EB5B3C]' : 'text-[#9ca3af]',
                              ceITM && 'bg-[#00B386]/6'
                            )}>
                              {row.ceChngPct > 0 ? '+' : ''}{row.ceChngPct.toFixed(1)}%
                            </td>

                            {/* Strike */}
                            <td className={cn(
                              'px-2 py-1 text-center font-mono font-tabular font-bold bg-[#f9fafb] border-x border-[#e5e7eb]',
                              isATM ? 'text-[#1a1a1a] bg-[#1a1a1a]/10' : 'text-[#1a1a1a]'
                            )}>
                              {row.strike.toLocaleString()}
                            </td>

                            {/* PE Side */}
                            <td className={cn(
                              'px-1.5 py-1 text-left font-mono',
                              row.peChngPct > 0 ? 'text-[#00B386]' : row.peChngPct < 0 ? 'text-[#EB5B3C]' : 'text-[#9ca3af]',
                              peITM && 'bg-[#EB5B3C]/6'
                            )}>
                              {row.peChngPct > 0 ? '+' : ''}{row.peChngPct.toFixed(1)}%
                            </td>
                            <td
                              className={cn(
                                'px-1.5 py-1 text-left font-mono font-tabular font-semibold text-[#1a1a1a] cursor-pointer hover:text-[#EB5B3C] hover:underline',
                                peITM && 'bg-[#EB5B3C]/6'
                              )}
                              onClick={() => handleOptionClick(row, 'PE')}
                            >
                              {row.peLTP.toFixed(2)}
                            </td>
                            <td className={cn('px-1.5 py-1 text-left font-mono font-tabular text-[#9ca3af]', peITM && 'bg-[#EB5B3C]/6')}>
                              {row.peVolume > 0 ? `${(row.peVolume / 1000).toFixed(0)}K` : '-'}
                            </td>
                            <td className={cn('px-1.5 py-1 text-left font-mono font-tabular text-[#6b7280]', peITM && 'bg-[#EB5B3C]/6')}>
                              {row.peOI.toFixed(1)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ═══ Statistics Tab ═══════════════════════════════════════════ */}
            <TabsContent value="stats" className="mt-4 space-y-4">
              {/* Key Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Open" value={detail?.open ? formatINR(detail.open) : '--'} />
                <StatCard label="Previous Close" value={detail?.previousClose ? formatINR(detail.previousClose) : '--'} />
                <StatCard label="Day High" value={detail?.high ? formatINR(detail.high) : '--'} highlight />
                <StatCard label="Day Low" value={detail?.low ? formatINR(detail.low) : '--'} danger />
                <StatCard label="52W High" value={detail?.week52High ? formatINR(detail.week52High) : '--'} highlight />
                <StatCard label="52W Low" value={detail?.week52Low ? formatINR(detail.week52Low) : '--'} danger />
                <StatCard label="Volume" value={detail?.volume ? formatNumber(detail.volume) : '--'} />
                <StatCard label="Lot Size" value={detail?.lotSize?.toString() || '--'} />
              </div>

              {/* Day Range Bar */}
              {detail && detail.low > 0 && detail.high > 0 && (
                <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl space-y-3">
                  <h4 className="text-sm font-semibold text-[#1a1a1a]">Day Range</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono font-tabular">
                      <span className="text-[#EB5B3C] font-semibold">{detail.low.toLocaleString('en-IN')}</span>
                      <span className="text-[#00B386] font-semibold">{detail.high.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ffffff] relative overflow-hidden">
                      {(() => {
                        const range = detail.high - detail.low
                        const currentPos = range > 0 ? ((detail.currentPrice - detail.low) / range) * 100 : 50
                        return (
                          <>
                            <div
                              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#eb5b3c] to-[#00B386] opacity-30"
                              style={{ width: '100%' }}
                            />
                            <div
                              className="absolute top-0 h-full w-1 bg-white rounded-full"
                              style={{ left: `${Math.min(100, Math.max(0, currentPos))}%` }}
                            />
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* 52 Week Range Bar */}
              {detail && detail.week52Low > 0 && detail.week52High > 0 && (
                <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl space-y-3">
                  <h4 className="text-sm font-semibold text-[#1a1a1a]">52 Week Range</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono font-tabular">
                      <span className="text-[#EB5B3C] font-semibold">{detail.week52Low.toLocaleString('en-IN')}</span>
                      <span className="text-[#00B386] font-semibold">{detail.week52High.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ffffff] relative overflow-hidden">
                      {(() => {
                        const range = detail.week52High - detail.week52Low
                        const currentPos = range > 0 ? ((detail.currentPrice - detail.week52Low) / range) * 100 : 50
                        return (
                          <>
                            <div
                              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#eb5b3c] via-[#00B386] to-[#00B386] opacity-30"
                              style={{ width: '100%' }}
                            />
                            <div
                              className="absolute top-0 h-full w-1.5 bg-white rounded-full"
                              style={{ left: `${Math.min(100, Math.max(0, currentPos))}%` }}
                            />
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl">
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3">Performance</h4>
                <div className="space-y-3">
                  {detail && (
                    <>
                      <PerformanceRow label="Today" change={detail.change} changePercent={detail.changePercent} />
                      <PerformanceRow label="From Open" change={detail.currentPrice - detail.open} changePercent={detail.open > 0 ? ((detail.currentPrice - detail.open) / detail.open) * 100 : 0} />
                      <PerformanceRow label="From 52W Low" change={detail.currentPrice - detail.week52Low} changePercent={detail.week52Low > 0 ? ((detail.currentPrice - detail.week52Low) / detail.week52Low) * 100 : 0} />
                      <PerformanceRow label="From 52W High" change={detail.currentPrice - detail.week52High} changePercent={detail.week52High > 0 ? ((detail.currentPrice - detail.week52High) / detail.week52High) * 100 : 0} />
                    </>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl">
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-2 flex items-center gap-2">
                  <Info className="size-4 text-[#00D09C]" />
                  Index Info
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Exchange</span>
                    <span className="font-semibold text-[#1a1a1a]">NSE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Currency</span>
                    <span className="font-semibold text-[#1a1a1a]">INR (₹)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Strike Interval</span>
                    <span className="font-semibold text-[#1a1a1a]">₹{detail?.strikeInterval || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Lot Size</span>
                    <span className="font-semibold text-[#1a1a1a]">{detail?.lotSize || '--'}</span>
                  </div>
                  {detail?.isRealData && (
                    <div className="flex justify-between">
                      <span className="text-[#6b7280]">Data Source</span>
                      <Badge className="bg-[#00B386]/10 text-[#00B386] text-[10px] font-semibold px-2 py-0.5 border-0">
                        LIVE
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Trade Modal for Option Chain */}
        <OptionTradeModal
          open={tradeModalOpen}
          onOpenChange={setTradeModalOpen}
          row={tradeRow}
          side={tradeSide}
          spotPrice={detail?.currentPrice ?? 0}
          instrument={(symbol as 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY' | 'SENSEX' | 'MIDCPNIFTY') ?? 'NIFTY'}
          lotSize={detail?.lotSize ?? 50}
        />

        {/* Bottom Spacing */}
        <div className="h-20" />
      </SheetContent>
    </Sheet>
  )
}

// ─── Option Trade Modal ──────────────────────────────────────────────────

function OptionTradeModal({
  open,
  onOpenChange,
  row,
  side,
  spotPrice,
  instrument,
  lotSize,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: OptionRow | null
  side: 'CE' | 'PE'
  spotPrice: number
  instrument: string
  lotSize: number
}) {
  const { token } = useAuthStore()
  const { showTradeSuccess } = useTradeSuccess()
  const [lots, setLots] = useState(1)
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [placing, setPlacing] = useState(false)

  if (!row) return null

  const ltp = side === 'CE' ? row.ceLTP : row.peLTP
  const totalQty = lots * lotSize
  const totalPremium = Math.round(ltp * totalQty * 100) / 100
  const brokerage = Math.max(20, Math.min(500, Math.round(totalPremium * 0.0005 * 100) / 100))
  const marginRequired = direction === 'BUY'
    ? totalPremium + brokerage
    : Math.round(totalPremium * 1.5 * 100) / 100

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
        // Show trade success popup
        const ltp = side === 'CE' ? row.ceLTP : row.peLTP
        showTradeSuccess({
          symbol: instrument,
          type: direction,
          qty: lots * lotSize,
          price: ltp,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          orderId: data.order?.id?.slice(-8).toUpperCase() || 'N/A',
          segment: 'OPTIONS',
          optionType: side,
          strikePrice: row.strike,
          totalValue: data.order?.totalValue,
          brokerage: data.order?.brokerage,
        })
        onOpenChange(false)
      } else {
        toast.error(data.error || 'Failed to place order')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-[#00D09C] font-bold">
              {side === 'CE' ? 'CALL' : 'PUT'} Option
            </span>
            <Badge variant="outline" className="font-mono">
              Strike ₹{row.strike.toLocaleString()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Option Info */}
          <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Spot Price</span>
              <span className="font-mono font-tabular font-semibold">₹{spotPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">LTP</span>
              <span className="font-mono font-tabular font-semibold">₹{ltp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">IV</span>
              <span className="font-mono font-tabular">{side === 'CE' ? row.ceIV : row.peIV}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">OI</span>
              <span className="font-mono font-tabular">{(side === 'CE' ? row.ceOI : row.peOI).toFixed(1)} L</span>
            </div>
          </div>

          {/* Buy/Sell Toggle */}
          <div className="flex gap-2">
            <Button
              onClick={() => setDirection('BUY')}
              className={cn(
                'flex-1 font-bold',
                direction === 'BUY' ? 'bg-[#00d09c] hover:bg-[#00b888] text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              BUY
            </Button>
            <Button
              onClick={() => setDirection('SELL')}
              className={cn(
                'flex-1 font-bold',
                direction === 'SELL' ? 'bg-[#eb5b3c] hover:bg-[#d44f33] text-white' : 'bg-muted text-muted-foreground'
              )}
            >
              SELL
            </Button>
          </div>

          {/* Lots Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#6b7280]">Lots</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-9" onClick={() => setLots(Math.max(1, lots - 1))}>
                <Minus className="size-3" />
              </Button>
              <Input type="number" value={lots} onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))} className="text-center font-mono" />
              <Button variant="outline" size="icon" className="size-9" onClick={() => setLots(lots + 1)}>
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {/* Calculated Fields */}
          <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Lot Size</span>
              <span className="font-mono font-tabular font-medium">{lotSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Total Qty</span>
              <span className="font-mono font-tabular font-medium">{totalQty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Premium</span>
              <span className="font-mono font-tabular font-medium">₹{totalPremium.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Brokerage</span>
              <span className="font-mono font-tabular font-medium">₹{brokerage.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb]/20 pt-2">
              <span className="text-[#6b7280] font-semibold">{direction === 'BUY' ? 'Total Cost' : 'Margin Required'}</span>
              <span className="font-mono font-tabular font-bold text-[#00D09C] text-base">₹{marginRequired.toLocaleString()}</span>
            </div>
          </div>

          <Button
            onClick={handlePlaceOrder}
            disabled={placing || ltp <= 0}
            className={cn(
              'w-full font-bold py-3',
              direction === 'BUY'
                ? 'bg-[#00d09c] hover:bg-[#00b888] text-white'
                : 'bg-[#eb5b3c] hover:bg-[#d44f33] text-white'
            )}
          >
            {placing ? (
              <><Loader2 className="size-4 mr-2 animate-spin" />Placing Order...</>
            ) : (
              `Place ${direction} Order`
            )}
          </Button>

          <p className="text-[10px] text-center text-[#6b7280] flex items-center justify-center gap-1">
            <Info className="size-3" />
            Paper trading — No real money involved
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function StatBox({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className="bg-[#f5f7fa] rounded-xl p-3 border border-[#e5e7eb]/10">
      <p className="text-[10px] font-semibold text-[#6b7280] tracking-wider uppercase mb-1">{label}</p>
      <p className={cn(
        'font-mono font-tabular font-semibold text-sm',
        highlight ? 'text-[#00B386]' : danger ? 'text-[#EB5B3C]' : 'text-[#1a1a1a]'
      )}>
        {value}
      </p>
    </div>
  )
}

function StatCard({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className="bg-[#ffffff] border border-[#e5e7eb] p-4 rounded-xl">
      <p className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase mb-1.5">{label}</p>
      <p className={cn(
        'font-mono font-tabular font-bold text-lg',
        highlight ? 'text-[#00B386]' : danger ? 'text-[#EB5B3C]' : 'text-[#1a1a1a]'
      )}>
        {value}
      </p>
    </div>
  )
}

function PerformanceRow({ label, change, changePercent }: { label: string; change: number; changePercent: number }) {
  const isPositive = change >= 0
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#6b7280]">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn(
          'font-mono font-tabular text-sm font-semibold',
          isPositive ? 'text-[#00B386]' : 'text-[#EB5B3C]'
        )}>
          {isPositive ? '+' : ''}{change.toFixed(2)}
        </span>
        <span className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold',
          isPositive
            ? 'bg-[#00B386]/10 text-[#00B386]'
            : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
        )}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}
