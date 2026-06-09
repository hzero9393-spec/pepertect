'use client'

import { useState, useEffect } from 'react'
import {
  Users, Crown, UserCheck, Activity, TrendingUp, IndianRupee, ArrowUpDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type DashboardData, type AdminUser, type Trade, type Position,
  adminApi, formatINR, formatTimeAgo,
  mockUserGrowth, mockDailyTrades, mockRevenueTrend,
  generateMockUsers, generateMockTrades
} from '@/components/admin/shared'

// ─── Stat Card Component (local to avoid heavy shared imports) ────────────────
function StatCard({ icon: Icon, label, value, sub, color = '#00D09C' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <Card className="bg-white border-[#e5e7eb] rounded-xl hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-[#6b7280]">{label}</p>
        <p className="font-mono text-xl font-bold text-[#1a1a1a] mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-[#9ca3af] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminApi('/dashboard')
        const d = await res.json()
        setData(d)
      } catch {
        try {
          const allMockTrades = generateMockTrades(120)
          setData({
            totalUsers: 1310,
            activeUsers: 856,
            paidUsers: 234,
            freeUsers: 1076,
            conversionRate: 17.9,
            totalRevenue: 88200,
            totalTrades: 5432,
            userGrowth: mockUserGrowth,
            recentTrades: allMockTrades.slice(0, 10),
            recentActivity: [
              { user: 'Arjun Mehta', action: 'Bought', symbol: 'NIFTY 23500 CE', time: '2m ago' },
              { user: 'Priya Sharma', action: 'Sold', symbol: 'RELIANCE', time: '5m ago' },
              { user: 'Rahul Verma', action: 'Bought', symbol: 'BANKNIFTY 50000 PE', time: '8m ago' },
              { user: 'Sneha Patel', action: 'Subscribed', symbol: 'Premium Plan', time: '12m ago' },
              { user: 'Vikram Singh', action: 'Sold', symbol: 'TCS', time: '15m ago' },
            ],
          })
        } catch {
          setData({
            totalUsers: 0, activeUsers: 0, paidUsers: 0, freeUsers: 0,
            conversionRate: 0, totalRevenue: 0, totalTrades: 0,
            userGrowth: [], recentTrades: [], recentActivity: [],
          })
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const growthData = data.userGrowth?.length ? data.userGrowth : mockUserGrowth

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers.toLocaleString('en-IN')} sub="+12 this week" />
        <StatCard icon={Activity} label="Active Users" value={data.activeUsers.toLocaleString('en-IN')} sub="Weekly active" />
        <StatCard icon={Crown} label="Paid Users" value={data.paidUsers.toLocaleString('en-IN')} sub={`${data.conversionRate}% conversion`} />
        <StatCard icon={UserCheck} label="Free Users" value={data.freeUsers.toLocaleString('en-IN')} sub="On free plan" />
        <StatCard icon={TrendingUp} label="Conversion" value={`${data.conversionRate}%`} sub="Free → Paid" />
        <StatCard icon={IndianRupee} label="Revenue" value={formatINR(data.totalRevenue)} sub="Total collected" />
        <StatCard icon={ArrowUpDown} label="Total Trades" value={data.totalTrades.toLocaleString('en-IN')} sub="All time" />
      </div>

      {/* Data Summary Cards (simple bar displays) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {growthData.slice(-6).map((item) => (
                <div key={item.month} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#6b7280]">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#00D09C]" style={{ width: `${Math.max(4, (item.count / 1400) * 100)}px` }} />
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{item.count.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Daily Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockDailyTrades.map((item) => (
                <div key={item.day} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#6b7280]">{item.day}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#00D09C]" style={{ width: `${Math.max(4, (item.trades / 250) * 100)}px` }} />
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{item.trades}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e5e7eb] rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockRevenueTrend.slice(-6).map((item) => (
                <div key={item.month} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#6b7280]">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-[#00D09C]" style={{ width: `${Math.max(4, (item.revenue / 90000) * 100)}px` }} />
                    <span className="text-xs font-mono font-semibold text-[#1a1a1a]">{formatINR(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-[#e5e7eb] rounded-xl lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#e5e7eb] hover:bg-transparent">
                  <TableHead className="text-[#6b7280] text-xs">User</TableHead>
                  <TableHead className="text-[#6b7280] text-xs">Symbol</TableHead>
                  <TableHead className="text-[#6b7280] text-xs">Direction</TableHead>
                  <TableHead className="text-right text-[#6b7280] text-xs">P&L</TableHead>
                  <TableHead className="text-right text-[#6b7280] text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recentTrades || []).map((t, i) => (
                  <TableRow key={t.id || i} className="border-[#f0f2f5] hover:bg-[#f7f8fc]">
                    <TableCell className="font-medium text-[#1a1a1a] text-xs">{t.userName}</TableCell>
                    <TableCell className="font-mono text-xs text-[#1a1a1a]">{t.symbol}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${
                        t.direction === 'BUY' ? 'border-[#00d09c]/30 bg-[#00d09c]/10 text-[#00a87d]'
                          : 'border-[#eb5b3c]/30 bg-[#eb5b3c]/10 text-[#d44a2d]'
                      }`}>{t.direction}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${(t.pnl ?? 0) >= 0 ? 'text-[#00a87d]' : 'text-[#d44a2d]'}`}>
                      {t.pnl !== undefined ? formatINR(t.pnl) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-[#9ca3af]">{formatTimeAgo(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e5e7eb] rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data.recentActivity || [
                { user: 'Arjun Mehta', action: 'Bought', symbol: 'NIFTY 23500 CE', time: '2m ago' },
                { user: 'Priya Sharma', action: 'Sold', symbol: 'RELIANCE', time: '5m ago' },
                { user: 'Rahul Verma', action: 'Bought', symbol: 'BANKNIFTY 50000 PE', time: '8m ago' },
                { user: 'Sneha Patel', action: 'Subscribed', symbol: 'Premium Plan', time: '12m ago' },
                { user: 'Vikram Singh', action: 'Sold', symbol: 'TCS', time: '15m ago' },
                { user: 'Ananya Iyer', action: 'Bought', symbol: 'HDFCBANK', time: '22m ago' },
              ]).map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#f0f2f5] text-[#6b7280] shrink-0">
                    <Activity className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#1a1a1a]">
                      <span className="font-medium">{item.user}</span>{' '}
                      <span className="text-[#6b7280]">{item.action}</span>
                    </p>
                    <p className="text-[11px] font-mono text-[#6b7280] truncate">{item.symbol}</p>
                  </div>
                  <span className="text-[11px] text-[#9ca3af] shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
