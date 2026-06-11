'use client'

import { useState, useEffect } from 'react'
import {
  Users, TrendingUp, IndianRupee, BarChart3, Target, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  type AdminUser, type Trade, adminApi, formatINR,
  mockUserGrowth, mockDailyTrades, mockRevenueTrend,
  mockWinRate, mockTradeFreq, mockTopStocks, mockPeakHours, mockConversionFunnel,
  StatCard, getAllMockUsers, getAllMockTrades, getAllMockPositions
} from '@/components/admin/shared'

function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await adminApi('/analytics')
        const data = await res.json()
        setAnalytics(data)
      } catch {
        // Use mock data
        setAnalytics({ source: 'mock' })
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-28 border border-[#e5e7eb] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value="1,310" sub="All time" color="#3B82F6" />
        <StatCard icon={TrendingUp} label="Avg P&L" value="₹12,450" sub="Per user" color="#00D09C" />
        <StatCard icon={IndianRupee} label="Revenue" value={formatINR(88200)} sub="Monthly" color="#F59E0B" />
        <StatCard icon={Activity} label="Trades Today" value="4,850" sub="+18% vs yesterday" color="#8B5CF6" />
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Win Rate Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockWinRate.map((item) => (
                <div key={item.range} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#6b7280]">{item.range}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#00D09C]" style={{ width: `${Math.max(4, (item.users / 300) * 100)}px` }} />
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{item.users}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Trade Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockTradeFreq.map((item) => (
                <div key={item.range} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#6b7280]">{item.range}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#3B82F6]" style={{ width: `${Math.max(4, (item.users / 450) * 100)}px` }} />
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{item.users}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Stocks & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Most Traded Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockTopStocks.map((item, i) => (
                <div key={item.symbol} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#9ca3af] w-4">{i + 1}</span>
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{item.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#F59E0B]" style={{ width: `${Math.max(4, (item.trades / 2000) * 100)}px` }} />
                    <span className="text-xs font-mono text-[#6b7280]">{item.trades.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Peak Trading Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockPeakHours.map((item) => (
                <div key={item.hour} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#6b7280]">{item.hour}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#8B5CF6]" style={{ width: `${Math.max(4, (item.trades / 350) * 100)}px` }} />
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{item.trades}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockConversionFunnel.map((item, i) => {
              const prevValue = i > 0 ? mockConversionFunnel[i - 1].value : item.value
              const dropPercent = i > 0 ? (((prevValue - item.value) / prevValue) * 100).toFixed(1) : '0'
              return (
                <div key={item.stage} className="flex items-center gap-4">
                  <span className="text-xs text-[#6b7280] w-28">{item.stage}</span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="h-2 rounded-full bg-[#00D09C]" style={{ width: `${Math.max(4, (item.value / 1400) * 100)}%` }} />
                    <span className="text-xs font-mono font-bold text-[#1a1a1a]">{item.value.toLocaleString()}</span>
                  </div>
                  {i > 0 && (
                    <Badge variant="outline" className="text-[10px] border-[#eb5b3c]/30 bg-[#eb5b3c]/10 text-[#d44a2d]">
                      -{dropPercent}%
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnalyticsPage
