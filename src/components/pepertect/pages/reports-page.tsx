'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Briefcase,
  Award,
  Crosshair,
  Landmark,
  LineChart,
  Activity,
  Download,
  FileText,
  Calendar,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { useAppStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatINR, formatINRWhole } from '@/lib/format'
import { DateFilter, DateFilterPreset, DateRange, getDateRange, isDateInRange } from '@/components/pepertect/date-filter'

// ─── Types ───────────────────────────────────────────────────────

interface TradeData {
  id: string
  userId: string
  segment: string
  productType: string
  tradeDirection: string
  symbol: string
  optionType?: string | null
  strikePrice?: number | null
  expiryDate?: string | null
  quantity: number
  fillPrice: number
  totalValue: number
  brokerage: number
  pnl: number | null
  pnlPercent: number | null
  executedAt: string
  squaredOffAt?: string | null
  createdAt: string
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

// ─── Component ───────────────────────────────────────────────────

export function ReportsPage() {
  const { token } = useAuthStore()
  const { setCurrentPage, dateFilterPreset, dateFilterRange, setDateFilter } = useAppStore()
  const [trades, setTrades] = useState<TradeData[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'last' | 'monthly' | 'full' | null }>({ open: false, type: null })

  // ─── Download Report Handler ────────────────────────────────
  const handleDownloadReport = useCallback(async (type: 'last' | 'monthly' | 'full') => {
    if (!token) {
      toast.error('Please login to download reports')
      setConfirmDialog({ open: false, type: null })
      return
    }
    setDownloadingReport(type)
    setConfirmDialog({ open: false, type: null })

    const reportLabel = type === 'last' ? 'Last Trade' : type === 'monthly' ? 'Monthly' : 'Full Trading'

    try {
      toast.loading(`Generating ${reportLabel} report...`, { id: 'pdf-download' })

      const res = await fetch(`/api/profile/report?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        let errorMsg = `Failed to generate ${reportLabel} report`
        try {
          const errorData = await res.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          // response wasn't JSON
          if (res.status === 401) errorMsg = 'Session expired. Please login again.'
          else if (res.status === 500) errorMsg = 'Server error. Please try again later.'
          else errorMsg = `Error ${res.status}: ${res.statusText}`
        }
        throw new Error(errorMsg)
      }

      // Verify we got a PDF response
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        throw new Error('Invalid response format. Expected PDF file.')
      }

      const blob = await res.blob()

      // Verify blob has content
      if (blob.size < 100) {
        throw new Error('Generated PDF is empty or corrupted. Please try again.')
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filenameMap: Record<string, string> = {
        last: `pepertect-last-trade-${new Date().toISOString().split('T')[0]}.pdf`,
        monthly: `pepertect-monthly-report-${new Date().toISOString().split('T')[0]}.pdf`,
        full: `pepertect-full-report-${new Date().toISOString().split('T')[0]}.pdf`,
      }
      a.download = filenameMap[type]
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()

      // Cleanup after a short delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 250)

      toast.dismiss('pdf-download')
      toast.success(`${reportLabel} report downloaded successfully!`, {
        description: `File: ${filenameMap[type]}`,
        duration: 4000,
      })
    } catch (err: unknown) {
      toast.dismiss('pdf-download')
      const errorMessage = err instanceof Error ? err.message : 'Failed to download report. Please try again.'
      toast.error(errorMessage, { duration: 6000 })
      console.error('[Report Download Error]', err)
    } finally {
      setDownloadingReport(null)
    }
  }, [token])

  // ─── Fetch All Data ───────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const tradesRes = await fetch('/api/trade/trades?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (tradesRes.ok) {
        const json = await tradesRes.json()
        setTrades(json.data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Computed Metrics ─────────────────────────────────────

  // ─── Date Filtered Data ─────────────────────────────────
  const activeDateRange = useMemo(() => getDateRange(dateFilterPreset, dateFilterRange), [dateFilterPreset, dateFilterRange])

  const filteredTrades = useMemo(() =>
    trades.filter(t => isDateInRange(t.executedAt, activeDateRange)),
    [trades, activeDateRange]
  )

  const handleDateFilterChange = useCallback((preset: DateFilterPreset, range?: DateRange) => {
    setDateFilter(preset, range)
  }, [setDateFilter])

  const closedTrades = useMemo(() =>
    filteredTrades.filter(t => t.pnl !== null && t.pnl !== undefined),
    [filteredTrades]
  )

  const totalPnl = useMemo(() =>
    closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    [closedTrades]
  )

  const winningTrades = useMemo(() =>
    closedTrades.filter(t => (t.pnl || 0) > 0),
    [closedTrades]
  )

  const losingTrades = useMemo(() =>
    closedTrades.filter(t => (t.pnl || 0) < 0),
    [closedTrades]
  )

  const winRate = useMemo(() => {
    if (closedTrades.length === 0) return 0
    return Math.round((winningTrades.length / closedTrades.length) * 10000) / 100
  }, [closedTrades, winningTrades])

  const avgPnlPerTrade = useMemo(() => {
    if (closedTrades.length === 0) return 0
    return Math.round((totalPnl / closedTrades.length) * 100) / 100
  }, [closedTrades, totalPnl])

  // ─── Stats Config ─────────────────────────────────────────

  const stats = [
    {
      label: 'Total Trades',
      value: String(filteredTrades.length),
      icon: Crosshair,
      borderColor: 'border-l-[#00D09C]',
      textColor: 'text-[#00D09C]',
      bgColor: 'bg-[#00D09C]/10',
      valueColor: 'text-[#1a1a1a]',
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: Target,
      borderColor: winRate >= 50 ? 'border-l-[#00d09c]' : 'border-l-[#eb5b3c]',
      textColor: winRate >= 50 ? 'text-[#00B386]' : 'text-[#EB5B3C]',
      bgColor: winRate >= 50 ? 'bg-[#00B386]/10' : 'bg-[#EB5B3C]/10',
      valueColor: winRate >= 50 ? 'text-[#00B386]' : 'text-[#EB5B3C]',
    },
    {
      label: 'Total P&L',
      value: totalPnl >= 0 ? `+${formatINR(Math.abs(totalPnl))}` : `-${formatINR(Math.abs(totalPnl))}`,
      icon: Landmark,
      borderColor: totalPnl >= 0 ? 'border-l-[#00d09c]' : 'border-l-[#eb5b3c]',
      textColor: totalPnl >= 0 ? 'text-[#00B386]' : 'text-[#EB5B3C]',
      bgColor: totalPnl >= 0 ? 'bg-[#00B386]/10' : 'bg-[#EB5B3C]/10',
      valueColor: totalPnl >= 0 ? 'text-[#00B386]' : 'text-[#EB5B3C]',
    },
    {
      label: 'Avg P&L / Trade',
      value: avgPnlPerTrade >= 0 ? `+${formatINR(Math.abs(avgPnlPerTrade))}` : `-${formatINR(Math.abs(avgPnlPerTrade))}`,
      icon: BarChart3,
      borderColor: avgPnlPerTrade >= 0 ? 'border-l-[#00d09c]' : 'border-l-[#eb5b3c]',
      textColor: avgPnlPerTrade >= 0 ? 'text-[#00B386]' : 'text-[#EB5B3C]',
      bgColor: avgPnlPerTrade >= 0 ? 'bg-[#00B386]/10' : 'bg-[#EB5B3C]/10',
      valueColor: avgPnlPerTrade >= 0 ? 'text-[#00B386]' : 'text-[#EB5B3C]',
    },
  ]

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2 bg-[#f0f0f5]" />
          <Skeleton className="h-4 w-72 bg-[#f0f0f5]" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white border border-[#e5e7eb] rounded-xl">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-20 mb-2 bg-[#f0f0f5]" />
                <Skeleton className="h-6 w-28 bg-[#f0f0f5]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl bg-[#f0f0f5]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] tracking-tight">
            Reports
          </h1>
          <p className="text-[#6b7280] mt-1 text-sm">
            Analyze your trading performance, P&L trends, and trade history.
          </p>
        </div>
        <DateFilter
          value={dateFilterPreset}
          onChange={handleDateFilterChange}
          customRange={dateFilterRange}
        />
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Card className={`bg-white border border-[#e5e7eb] rounded-xl shadow-sm border-l-4 ${stat.borderColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                      {stat.label}
                    </p>
                    <div className={`size-7 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`size-3.5 ${stat.textColor}`} />
                    </div>
                  </div>
                  <p className={`text-lg font-bold font-mono-data font-tabular ${stat.valueColor}`}>
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Empty State ─────────────────────────────────────────── */}
      {filteredTrades.length === 0 ? (
        <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="size-14 rounded-full bg-[#f5f7fa] flex items-center justify-center mb-4">
                <BarChart3 className="size-7 text-[#6b7280]/40" />
              </div>
              <p className="text-[#1a1a1a] font-semibold text-sm">No trades yet</p>
              <p className="text-[#6b7280] text-xs mt-1">
                Place your first trade to start tracking performance
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5 bg-[#00D09C] hover:bg-[#00b88a] text-white font-semibold rounded-lg"
                onClick={() => setCurrentPage('trading')}
              >
                <TrendingUp className="size-3.5" />
                Start Trading
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Date Filter Info ──────────────────────────────── */}
          {dateFilterPreset !== 'all' && (
            <div className="flex items-center gap-2 text-xs text-[#6b7280] bg-[#f8f9fb] px-3 py-2 rounded-lg border border-[#e5e7eb]/50">
              <Calendar className="size-3.5 text-[#00D09C]" />
              Showing {filteredTrades.length} of {trades.length} trades for{' '}
              <span className="font-semibold text-[#1a1a1a]">
                {dateFilterPreset === 'custom' && dateFilterRange
                  ? `${new Date(dateFilterRange.from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → ${new Date(dateFilterRange.to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                  : dateFilterPreset.charAt(0).toUpperCase() + dateFilterPreset.slice(1)}
              </span>
            </div>
          )}

          {/* ── P&L Chart Placeholder ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LineChart className="size-5 text-[#00D09C]" />
                    <div>
                      <CardTitle className="text-base font-semibold text-[#1a1a1a]">
                        P&amp;L Trend
                      </CardTitle>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Track your cumulative profit and loss over time
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold border-0 ${
                      totalPnl >= 0
                        ? 'bg-[#00B386]/10 text-[#00B386]'
                        : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                    }`}
                  >
                    {totalPnl >= 0 ? <ArrowUpRight className="size-3 mr-0.5" /> : <ArrowDownRight className="size-3 mr-0.5" />}
                    {totalPnl >= 0 ? '+' : '-'}{formatINR(Math.abs(totalPnl))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center bg-[#f8f9fb] rounded-xl border border-[#e5e7eb]/50">
                  <div className="size-16 rounded-full bg-[#00D09C]/8 flex items-center justify-center mb-4">
                    <Activity className="size-8 text-[#00D09C]/40" />
                  </div>
                  <p className="text-[#1a1a1a] font-semibold text-sm">Analytics not available yet</p>
                  <p className="text-[#6b7280] text-xs mt-1 max-w-xs">
                    Advanced P&L charts, trend analysis, and performance visualizations are being built. Stay tuned!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Win/Loss + Performance Breakdown ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win/Loss Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="size-5 text-[#00D09C]" />
                    <div>
                      <CardTitle className="text-base font-semibold text-[#1a1a1a]">
                        Win / Loss Summary
                      </CardTitle>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Breakdown of profitable vs losing trades
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {closedTrades.length > 0 ? (
                    <div className="space-y-5">
                      {/* Win Rate Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Win Rate</span>
                          <span className={`font-mono-data font-tabular text-sm font-bold ${winRate >= 50 ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
                            {winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f0f0f5]">
                          {winningTrades.length > 0 && (
                            <div
                              className="h-full bg-[#00d09c] rounded-l-full transition-all duration-700"
                              style={{ width: `${(winningTrades.length / closedTrades.length) * 100}%` }}
                            />
                          )}
                          {losingTrades.length > 0 && (
                            <div
                              className="h-full bg-[#eb5b3c] transition-all duration-700"
                              style={{ width: `${(losingTrades.length / closedTrades.length) * 100}%` }}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-[#00d09c]" />
                            <span className="text-[11px] text-[#6b7280]">Wins ({winningTrades.length})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-[#eb5b3c]" />
                            <span className="text-[11px] text-[#6b7280]">Losses ({losingTrades.length})</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-[#e5e7eb]" />

                      {/* Win Details */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-[#00B386]/10 flex items-center justify-center">
                              <TrendingUp className="size-4 text-[#00B386]" />
                            </div>
                            <span className="text-sm font-semibold text-[#1a1a1a]">Winning Trades</span>
                          </div>
                          <div className="text-right">
                            <p className="font-mono-data font-tabular text-sm font-semibold text-[#00B386]">
                              +{formatINR(winningTrades.reduce((s, t) => s + (t.pnl || 0), 0))}
                            </p>
                          </div>
                        </div>
                        {winningTrades.length > 0 && (
                          <div className="flex items-center justify-between pl-10">
                            <span className="text-xs text-[#6b7280]">Best Trade</span>
                            <span className="font-mono-data font-tabular text-xs font-semibold text-[#00B386]">
                              +{formatINR(Math.max(...winningTrades.map(t => t.pnl || 0)))}
                            </span>
                          </div>
                        )}
                        {winningTrades.length > 0 && (
                          <div className="flex items-center justify-between pl-10">
                            <span className="text-xs text-[#6b7280]">Avg Win</span>
                            <span className="font-mono-data font-tabular text-xs font-semibold text-[#00B386]">
                              +{formatINR(winningTrades.reduce((s, t) => s + (t.pnl || 0), 0) / winningTrades.length)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-[#e5e7eb]" />

                      {/* Loss Details */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-[#EB5B3C]/10 flex items-center justify-center">
                              <TrendingDown className="size-4 text-[#EB5B3C]" />
                            </div>
                            <span className="text-sm font-semibold text-[#1a1a1a]">Losing Trades</span>
                          </div>
                          <div className="text-right">
                            <p className="font-mono-data font-tabular text-sm font-semibold text-[#EB5B3C]">
                              -{formatINR(Math.abs(losingTrades.reduce((s, t) => s + (t.pnl || 0), 0)))}
                            </p>
                          </div>
                        </div>
                        {losingTrades.length > 0 && (
                          <div className="flex items-center justify-between pl-10">
                            <span className="text-xs text-[#6b7280]">Worst Trade</span>
                            <span className="font-mono-data font-tabular text-xs font-semibold text-[#EB5B3C]">
                              -{formatINR(Math.abs(Math.min(...losingTrades.map(t => t.pnl || 0))))}
                            </span>
                          </div>
                        )}
                        {losingTrades.length > 0 && (
                          <div className="flex items-center justify-between pl-10">
                            <span className="text-xs text-[#6b7280]">Avg Loss</span>
                            <span className="font-mono-data font-tabular text-xs font-semibold text-[#EB5B3C]">
                              -{formatINR(Math.abs(losingTrades.reduce((s, t) => s + (t.pnl || 0), 0) / losingTrades.length))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="size-14 rounded-full bg-[#f5f7fa] flex items-center justify-center mb-4">
                        <Target className="size-7 text-[#6b7280]/40" />
                      </div>
                      <p className="text-sm text-[#6b7280]">No closed trades to analyze</p>
                      <p className="text-xs text-[#6b7280]/60 mt-1">
                        Win/loss data appears after closing positions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Segment Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-[#00D09C]" />
                    <div>
                      <CardTitle className="text-base font-semibold text-[#1a1a1a]">
                        Segment Breakdown
                      </CardTitle>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Performance across Equity, Futures & Options
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const segmentData = [
                      { name: 'Equity', icon: Briefcase, color: '#00D09C', trades: filteredTrades.filter(t => t.segment === 'EQUITY' || t.segment === 'CASH') },
                      { name: 'Futures', icon: TrendingUp, color: '#00d09c', trades: filteredTrades.filter(t => t.segment === 'FUTURES') },
                      { name: 'Options', icon: Award, color: '#eb5b3c', trades: filteredTrades.filter(t => t.segment === 'OPTIONS') },
                    ]
                    // Always show all 3 segments, even with 0 trades

                    if (filteredTrades.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="size-14 rounded-full bg-[#f5f7fa] flex items-center justify-center mb-4">
                            <BarChart3 className="size-7 text-[#6b7280]/40" />
                          </div>
                          <p className="text-sm text-[#6b7280]">No segment data yet</p>
                          <p className="text-xs text-[#6b7280]/60 mt-1">
                            Trade in different segments to see breakdown
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-4">
                        {segmentData.map((segment) => {
                          const Icon = segment.icon
                          const segmentPnl = segment.trades.reduce((s, t) => s + (t.pnl || 0), 0)
                          const isProfit = segmentPnl >= 0
                          const closedCount = segment.trades.filter(t => t.pnl !== null).length
                          return (
                            <div
                              key={segment.name}
                              className="rounded-xl bg-[#f8f9fb] border border-[#e5e7eb]/50 p-4 hover:bg-[#f5f7fa] transition-colors"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="size-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${segment.color}12` }}
                                  >
                                    <Icon className="size-4" style={{ color: segment.color }} />
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-[#1a1a1a]">{segment.name}</span>
                                    <span className="ml-2 text-[10px] text-[#6b7280]">
                                      {segment.trades.length} trade{segment.trades.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                {closedCount > 0 && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold border-0 ${
                                      isProfit
                                        ? 'bg-[#00B386]/10 text-[#00B386]'
                                        : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                                    }`}
                                  >
                                    {isProfit ? '+' : ''}{segmentPnl >= 0 ? '+' : '-'}{formatINR(Math.abs(segmentPnl))}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                                    Total Trades
                                  </p>
                                  <p className="font-mono-data font-tabular text-sm font-semibold text-[#1a1a1a] mt-0.5">
                                    {segment.trades.length}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                                    Closed P&amp;L
                                  </p>
                                  <p className={`font-mono-data font-tabular text-sm font-semibold mt-0.5 ${closedCount === 0 ? 'text-[#6b7280]' : isProfit ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
                                    {closedCount === 0 ? '—' : `${isProfit ? '+' : '-'}${formatINR(Math.abs(segmentPnl))}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* ── Recent Trades Table ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="size-5 text-[#00D09C]" />
                    <div>
                      <CardTitle className="text-base font-semibold text-[#1a1a1a]">
                        Recent Trades
                      </CardTitle>
                      <p className="text-xs text-[#6b7280] mt-0.5">
                        Your latest trade executions with P&L details
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-[#00D09C]/10 text-[#00D09C] border-0 text-xs font-semibold">
                    {filteredTrades.length} Trade{filteredTrades.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-[#e5e7eb]">
                        <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Symbol</TableHead>
                        <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Side</TableHead>
                        <TableHead className="text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Segment</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Qty</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Fill Price</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Total Value</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">P&L</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-[#6b7280] tracking-wider uppercase bg-[#f8f9fb]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-[#e5e7eb]">
                      {filteredTrades.map((trade) => {
                        const isBuy = trade.tradeDirection === 'BUY'
                        const hasPnl = trade.pnl !== null && trade.pnl !== undefined
                        const isPositive = hasPnl && trade.pnl! >= 0
                        return (
                          <TableRow
                            key={trade.id}
                            className="hover:bg-[#f8f9fb] transition-colors"
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-[#00D09C]">{trade.symbol}</span>
                                {trade.segment === 'OPTIONS' && trade.strikePrice && (
                                  <span className="text-[10px] uppercase text-[#6b7280]">
                                    {trade.strikePrice} {trade.optionType}
                                  </span>
                                )}
                                {trade.segment === 'FUTURES' && (
                                  <span className="text-[10px] text-[#6b7280]">FUT</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] font-semibold border-0 gap-0.5 ${
                                  isBuy ? 'bg-[#00B386]/10 text-[#00B386]' : 'bg-[#EB5B3C]/10 text-[#EB5B3C]'
                                }`}
                              >
                                {isBuy ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
                                {isBuy ? 'Buy' : 'Sell'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-[#6b7280]">{trade.segment}</TableCell>
                            <TableCell className="font-mono-data font-tabular text-sm text-right text-[#1a1a1a]">{trade.quantity}</TableCell>
                            <TableCell className="font-mono-data font-tabular text-sm text-right text-[#6b7280]">
                              {formatINR(trade.fillPrice)}
                            </TableCell>
                            <TableCell className="font-mono-data font-tabular text-sm text-right text-[#1a1a1a]">
                              {formatINRWhole(trade.totalValue)}
                            </TableCell>
                            <TableCell className={`font-mono-data font-tabular text-sm font-semibold text-right ${
                              !hasPnl ? 'text-[#6b7280]' : isPositive ? 'text-[#00B386]' : 'text-[#EB5B3C]'
                            }`}>
                              {!hasPnl ? '—' : `${isPositive ? '+' : '-'}${formatINR(Math.abs(trade.pnl!))}`}
                            </TableCell>
                            <TableCell className="text-xs text-[#6b7280] text-right">
                              {formatDate(trade.executedAt)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Performance Summary Footer ─────────────────────────── */}
          {closedTrades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm border-l-4 border-l-[#00D09C]">
                <CardContent className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] mb-3">
                    Performance Summary
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                        Gross Profit
                      </p>
                      <p className="font-mono-data font-tabular text-sm font-bold text-[#00B386] mt-0.5">
                        +{formatINR(winningTrades.reduce((s, t) => s + (t.pnl || 0), 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                        Gross Loss
                      </p>
                      <p className="font-mono-data font-tabular text-sm font-bold text-[#EB5B3C] mt-0.5">
                        -{formatINR(Math.abs(losingTrades.reduce((s, t) => s + (t.pnl || 0), 0)))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                        Total Brokerage
                      </p>
                      <p className="font-mono-data font-tabular text-sm font-bold text-[#1a1a1a] mt-0.5">
                        {formatINR(filteredTrades.reduce((s, t) => s + t.brokerage, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                        Net P&amp;L
                      </p>
                      <p className={`font-mono-data font-tabular text-sm font-bold mt-0.5 ${totalPnl >= 0 ? 'text-[#00B386]' : 'text-[#EB5B3C]'}`}>
                        {totalPnl >= 0 ? '+' : '-'}{formatINR(Math.abs(totalPnl))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Download Reports Section ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Card className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Download className="size-5 text-[#00D09C]" />
                  <div>
                    <CardTitle className="text-base font-semibold text-[#1a1a1a]">
                      Download Reports
                    </CardTitle>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      Export your trading data as PDF reports
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Last Trade Report */}
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] p-5 hover:border-[#00D09C]/30 hover:bg-[#e6faf4]/30 transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-10 rounded-lg bg-[#00D09C]/10 flex items-center justify-center shrink-0 group-hover:bg-[#00D09C]/20 transition-colors">
                        <FileText className="size-5 text-[#00D09C]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a1a1a]">Last Trade Report</p>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">Your most recent trade</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2 bg-[#00D09C] hover:bg-[#00b88a] text-white font-semibold rounded-lg"
                      onClick={() => setConfirmDialog({ open: true, type: 'last' })}
                      disabled={downloadingReport !== null}
                    >
                      {downloadingReport === 'last' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {downloadingReport === 'last' ? 'Downloading...' : 'Download PDF'}
                    </Button>
                  </div>

                  {/* Monthly Report */}
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] p-5 hover:border-[#00D09C]/30 hover:bg-[#e6faf4]/30 transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-10 rounded-lg bg-[#00D09C]/10 flex items-center justify-center shrink-0 group-hover:bg-[#00D09C]/20 transition-colors">
                        <Calendar className="size-5 text-[#00D09C]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a1a1a]">Monthly Report</p>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">Last 30 days of trading</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2 bg-[#00D09C] hover:bg-[#00b88a] text-white font-semibold rounded-lg"
                      onClick={() => setConfirmDialog({ open: true, type: 'monthly' })}
                      disabled={downloadingReport !== null}
                    >
                      {downloadingReport === 'monthly' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {downloadingReport === 'monthly' ? 'Downloading...' : 'Download PDF'}
                    </Button>
                  </div>

                  {/* Full Trading Report */}
                  <div className="rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] p-5 hover:border-[#00D09C]/30 hover:bg-[#e6faf4]/30 transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-10 rounded-lg bg-[#00D09C]/10 flex items-center justify-center shrink-0 group-hover:bg-[#00D09C]/20 transition-colors">
                        <BarChart3 className="size-5 text-[#00D09C]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a1a1a]">Full Trading Report</p>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">All your trading data</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2 bg-[#00D09C] hover:bg-[#00b88a] text-white font-semibold rounded-lg"
                      onClick={() => setConfirmDialog({ open: true, type: 'full' })}
                      disabled={downloadingReport !== null}
                    >
                      {downloadingReport === 'full' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {downloadingReport === 'full' ? 'Downloading...' : 'Download PDF'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── Download Confirmation Dialog ──────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, type: open ? confirmDialog.type : null })}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a1a1a] flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#00D09C]/10 flex items-center justify-center">
                <FileText className="size-4 text-[#00D09C]" />
              </div>
              Download {confirmDialog.type === 'last' ? 'Last Trade' : confirmDialog.type === 'monthly' ? 'Monthly' : 'Full Trading'} Report
            </DialogTitle>
            <DialogDescription className="text-[#6b7280]">
              {confirmDialog.type === 'last'
                ? 'Generate a PDF report of your most recent trade.'
                : confirmDialog.type === 'monthly'
                ? 'Generate a PDF report of all trades from the last 30 days.'
                : 'Generate a comprehensive PDF of all your trading data.'}
            </DialogDescription>
          </DialogHeader>

          {/* Report Preview */}
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f8f9fb] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">
              Report includes:
            </p>
            <div className="space-y-2">
              {[
                { label: 'User profile & account details', included: true },
                { label: 'Trade details table with P&L', included: true },
                { label: 'Performance summary & stats', included: true },
                { label: 'Brokerage breakdown', included: true },
                { label: 'AI analysis & suggestions', included: confirmDialog.type !== 'last' || trades.length > 0 },
              ].filter(item => item.included).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="size-4 rounded-full bg-[#00D09C]/10 flex items-center justify-center shrink-0">
                    <svg className="size-2.5 text-[#00D09C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-[#1a1a1a]">{item.label}</span>
                </div>
              ))}
            </div>

            {confirmDialog.type && (
              <div className="pt-2 border-t border-[#e5e7eb]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Trade count:</span>
                  <span className="font-semibold text-[#1a1a1a]">
                    {confirmDialog.type === 'last' ? '1 trade' : confirmDialog.type === 'monthly' ? `Last 30 days` : `All trades`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#6b7280]">Format:</span>
                  <span className="font-semibold text-[#1a1a1a]">PDF Document</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-lg border-[#e5e7eb] text-[#6b7280] hover:bg-[#f5f7fa]"
              onClick={() => setConfirmDialog({ open: false, type: null })}
              disabled={downloadingReport !== null}
            >
              Cancel
            </Button>
            <Button
              className="gap-2 bg-[#00D09C] hover:bg-[#00b88a] text-white font-semibold rounded-lg min-w-[140px]"
              onClick={() => {
                if (confirmDialog.type) {
                  handleDownloadReport(confirmDialog.type)
                }
              }}
              disabled={downloadingReport !== null}
            >
              {downloadingReport !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
