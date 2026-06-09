'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Crosshair,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR, formatINRWhole } from '@/lib/format'

// ─── Types ───────────────────────────────────────────────────────

interface PositionData {
  id: string
  segment: string
  productType: string
  tradeDirection: string
  symbol: string
  optionType?: string | null
  strikePrice?: number | null
  expiryDate?: string | null
  quantity: number
  entryPrice: number
  currentPrice: number
  totalInvested: number
  currentValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  realizedPnl?: number | null
  exitPrice?: number | null
  closedAt?: string | null
  marginUsed: number
  lots: number
  lotSize: number
  isOpen: boolean
  createdAt: string
}

function formatDuration(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const diffMs = end - start
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '< 1m'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  const remMin = diffMin % 60
  if (diffHr < 24) return `${diffHr}h ${remMin}m`
  const diffDay = Math.floor(diffHr / 24)
  const remHr = diffHr % 24
  return `${diffDay}d ${remHr}h`
}

// ─── Component ───────────────────────────────────────────────────

export function PositionsPage() {
  const { token } = useAuthStore()
  const { setCurrentPage } = useAppStore()
  const [positions, setPositions] = useState<PositionData[]>([])
  const [loading, setLoading] = useState(true)
  const [squaringOff, setSquaringOff] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('open')

  // ─── Fetch Positions ──────────────────────────────────────
  const fetchPositions = useCallback(async () => {
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch('/api/trade/positions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setPositions(json.data || [])
      } else {
        setPositions([])
      }
    } catch {
      setPositions([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPositions()
    // Auto-refresh every 30 seconds (reduced from 5s to cut DB load)
    const interval = setInterval(fetchPositions, 30000)
    return () => clearInterval(interval)
  }, [fetchPositions])

  // ─── Square Off ───────────────────────────────────────────
  const handleSquareOff = async (positionId: string, symbol: string) => {
    if (!token) return
    setSquaringOff(positionId)
    try {
      const res = await fetch('/api/trade/square-off', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positionId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const pnlStr = data.closedPosition
          ? `P&L: ${data.closedPosition.realizedPnl >= 0 ? '+' : ''}₹${Math.abs(data.closedPosition.realizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : ''
        toast.success(`✅ ${symbol} squared off successfully!`, {
          description: pnlStr,
        })
        // Optimistic update: remove from local state immediately
        setPositions(prev => prev.filter(p => p.id !== positionId))
        // Background refresh
        fetchPositions()
      } else {
        toast.error(data.error || 'Failed to square off position')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSquaringOff(null)
    }
  }

  // ─── Split positions by open/closed ──────────────────────
  const openPositions = useMemo(() =>
    positions.filter(p => p.isOpen !== false),
    [positions]
  )

  const closedPositions = useMemo(() =>
    positions.filter(p => p.isOpen === false),
    [positions]
  )

  // ─── Stats ────────────────────────────────────────────────
  const totalPnl = openPositions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0)
  const totalInvested = openPositions.reduce((s, p) => s + (p.totalInvested || 0), 0)
  const totalMargin = openPositions.reduce((s, p) => s + (p.marginUsed || 0), 0)
  const isProfit = totalPnl >= 0

  const stats = [
    { label: 'Open Positions', value: String(openPositions.length), icon: Crosshair, borderColor: 'border-l-[#00D09C]', iconBg: 'bg-[#00D09C]/10', iconColor: 'text-[#00D09C]' },
    { label: 'Total Invested', value: formatINRWhole(totalInvested), icon: IndianRupee, borderColor: 'border-l-[#6b7280]', iconBg: 'bg-[#6b7280]/10', iconColor: 'text-[#6b7280]' },
    { label: 'Unrealized P&L', value: `${isProfit ? '+' : '-'}${formatINR(Math.abs(totalPnl))}`, icon: isProfit ? TrendingUp : AlertTriangle, borderColor: isProfit ? 'border-l-[#00d09c]' : 'border-l-[#eb5b3c]', iconBg: isProfit ? 'bg-[#00B386]/10' : 'bg-[#EB5B3C]/10', iconColor: isProfit ? 'text-[#00B386]' : 'text-[#EB5B3C]' },
    { label: 'Margin Used', value: formatINRWhole(totalMargin), icon: IndianRupee, borderColor: 'border-l-[#00D09C]', iconBg: 'bg-[#00D09C]/10', iconColor: 'text-[#00D09C]' },
  ]

  // ─── Open Position Table ─────────────────────────────────
  const OpenPositionTable = () => {
    if (openPositions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-16 rounded-full bg-[#f5f7fa] flex items-center justify-center mb-4">
            <Crosshair className="size-7 text-[#6b7280]/40" />
          </div>
          <p className="text-[#1a1a1a] font-semibold text-sm">No open positions</p>
          <p className="text-[#6b7280] text-xs mt-1.5">
            Place a trade to see your positions here
          </p>
          <Button
            size="sm"
            className="mt-5 gap-1.5 bg-[#00D09C] hover:bg-[#00b88a] text-white font-semibold rounded-lg"
            onClick={() => setCurrentPage('trading')}
          >
            <TrendingUp className="size-3.5" />
            Start Trading
          </Button>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#e5e7eb]">
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb]">Symbol</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb]">Type</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb]">Segment</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">Qty</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">Entry Price</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">LTP</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">P&amp;L</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e5e7eb]">
            <AnimatePresence>
              {openPositions.map((pos) => {
                const isLong = pos.tradeDirection === 'BUY'
                const isPositive = pos.unrealizedPnl >= 0

                return (
                  <motion.tr
                    key={pos.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="hover:bg-[#f8f9fb] transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[#1a1a1a]">{pos.symbol}</span>
                        {pos.segment === 'OPTIONS' && pos.strikePrice && (
                          <span className="text-[10px] uppercase text-[#6b7280]">
                            {pos.strikePrice} {pos.optionType}
                          </span>
                        )}
                        {pos.segment === 'FUTURES' && (
                          <span className="text-[10px] text-[#6b7280]">FUT</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isLong
                            ? 'bg-[#00B386]/10 text-[#00B386]'
                            : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
                        {isLong ? 'BUY' : 'SELL'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#6b7280] py-4">{pos.segment}</TableCell>
                    <TableCell className="font-mono-data font-tabular text-sm text-right text-[#1a1a1a] py-4">{pos.quantity}</TableCell>
                    <TableCell className="font-mono-data font-tabular text-sm text-right text-[#6b7280] py-4">
                      {formatINR(pos.entryPrice)}
                    </TableCell>
                    <TableCell className="font-mono-data font-tabular text-sm text-right text-[#1a1a1a] py-4">
                      {formatINR(pos.currentPrice)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        isPositive
                          ? 'bg-[#00B386]/10 text-[#00B386]'
                          : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                      }`}>
                        {isPositive ? '+' : '-'}{formatINR(Math.abs(pos.unrealizedPnl))}
                      </span>
                      <div className={`text-[10px] font-medium mt-0.5 ${isPositive ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
                        {isPositive ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg border-[#00D09C]/40 px-3 py-1.5 text-[11px] font-semibold text-[#00D09C] bg-transparent hover:bg-[#00D09C] hover:text-white hover:border-[#00D09C] active:scale-95 transition-all"
                        disabled={squaringOff === pos.id}
                        onClick={() => handleSquareOff(pos.id, pos.symbol)}
                      >
                        {squaringOff === pos.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          'Square Off'
                        )}
                      </Button>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    )
  }

  // ─── Closed Position Table ────────────────────────────────
  const ClosedPositionTable = () => {
    if (closedPositions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-16 rounded-full bg-[#f5f7fa] flex items-center justify-center mb-4">
            <Clock className="size-7 text-[#6b7280]/40" />
          </div>
          <p className="text-[#1a1a1a] font-semibold text-sm">No closed positions</p>
          <p className="text-[#6b7280] text-xs mt-1.5">
            Your closed trades will appear here
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#e5e7eb]">
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb]">Symbol</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb]">Type</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">Entry Price</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">Exit Price</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb] text-right">P&amp;L Realized</TableHead>
              <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase py-3 bg-[#f8f9fb]">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e5e7eb]">
            {closedPositions.map((pos) => {
              const isLong = pos.tradeDirection === 'BUY'
              const isPositive = (pos.realizedPnl ?? 0) >= 0
              const realizedPnl = pos.realizedPnl ?? 0

              return (
                <TableRow
                  key={pos.id}
                  className="hover:bg-[#f8f9fb] transition-colors"
                >
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-[#1a1a1a]">{pos.symbol}</span>
                      {pos.segment === 'OPTIONS' && pos.strikePrice && (
                        <span className="text-[10px] uppercase text-[#6b7280]">
                          {pos.strikePrice} {pos.optionType}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        isLong
                          ? 'bg-[#00B386]/10 text-[#00B386]'
                          : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                      }`}
                    >
                      {isLong ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
                      {isLong ? 'BUY' : 'SELL'}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono-data font-tabular text-sm text-right text-[#6b7280] py-4">
                    {formatINR(pos.entryPrice)}
                  </TableCell>
                  <TableCell className="font-mono-data font-tabular text-sm text-right text-[#1a1a1a] py-4">
                    {pos.exitPrice ? formatINR(pos.exitPrice) : '—'}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                      isPositive
                        ? 'bg-[#00B386]/10 text-[#00B386]'
                        : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                    }`}>
                      {isPositive ? '+' : '-'}{formatINR(Math.abs(realizedPnl))}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-[#6b7280] py-4">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDuration(pos.createdAt, pos.closedAt)}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] tracking-tight">
          Positions
        </h1>
        <p className="text-[#6b7280] mt-1 text-sm">
          Track and manage your open and closed trades with real-time P&amp;L updates.
        </p>
      </motion.div>

      {/* ── Stats Grid ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={`bg-white border border-[#e5e7eb] border-l-4 ${stat.borderColor} rounded-xl shadow-sm`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                    {stat.label}
                  </p>
                  <div className={`size-7 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                    <Icon className={`size-3.5 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-lg font-bold font-mono-data font-tabular text-[#1a1a1a]">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* ── Positions Table with Tabs ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-5">
                <TabsList className="bg-[#f5f7fa] border border-[#e5e7eb] p-1 rounded-lg">
                  <TabsTrigger
                    value="open"
                    className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-[#00D09C] data-[state=active]:text-white data-[state=active]:shadow-sm text-[#6b7280] transition-all"
                  >
                    Open Positions
                    <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{openPositions.length}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="closed"
                    className="text-xs font-semibold px-4 py-1.5 rounded-md data-[state=active]:bg-[#00D09C] data-[state=active]:text-white data-[state=active]:shadow-sm text-[#6b7280] transition-all"
                  >
                    Closed Positions
                    <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{closedPositions.length}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-20 bg-[#f0f0f5]" />
                      <Skeleton className="h-4 w-16 bg-[#f0f0f5]" />
                      <Skeleton className="h-4 w-16 bg-[#f0f0f5]" />
                      <Skeleton className="h-4 w-20 bg-[#f0f0f5]" />
                      <Skeleton className="h-4 w-20 bg-[#f0f0f5]" />
                      <Skeleton className="h-4 w-20 bg-[#f0f0f5]" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <TabsContent value="open" className="mt-0">
                    <OpenPositionTable />
                  </TabsContent>
                  <TabsContent value="closed" className="mt-0">
                    <ClosedPositionTable />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
