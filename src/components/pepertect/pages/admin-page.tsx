'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Pie,
  PieChart,
  Cell,
} from 'recharts'
import {
  ShieldCheck,
  Users,
  Activity,
  IndianRupee,
  Crown,
  Clock,
  Plus,
  RotateCcw,
  Bell,
  Search,
  Edit,
  Ban,
  Trash2,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Settings2,
  X,
  ChevronDown,
  FileText,
  Download,
  Loader2,
  UserCircle,
  ArrowUpDown,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { GoogleOAuthSetup } from '@/components/pepertect/google-oauth-setup'

// ─── Mock Data ────────────────────────────────────────────────────────

const statsCards = [
  {
    label: 'Total Users',
    value: '1,248',
    sub: '+12 this week',
    icon: Users,
    color: 'bg-tp-primary/10 text-tp-primary',
  },
  {
    label: 'Active Traders',
    value: '856',
    sub: '68.6% of total',
    icon: Activity,
    color: 'bg-tp-secondary/10 text-tp-secondary',
  },
  {
    label: 'Total Trades Today',
    value: '5,432',
    sub: '+18% vs yesterday',
    icon: BarChart3,
    color: 'bg-tp-primary/10 text-tp-primary',
  },
  {
    label: 'Platform Volume',
    value: '₹45.2 Cr',
    sub: 'F&O + Equity',
    icon: IndianRupee,
    color: 'bg-tp-secondary/10 text-tp-secondary',
  },
  {
    label: 'Premium Users',
    value: '234',
    sub: '₹23,166/mo revenue',
    icon: Crown,
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    label: 'Avg Session',
    value: '18 min',
    sub: '+3 min this week',
    icon: Clock,
    color: 'bg-tp-primary/10 text-tp-primary',
  },
]

const recentActivity = [
  { user: 'Arjun Mehta', action: 'Bought', symbol: 'NIFTY 23500 CE', time: '2 min ago' },
  { user: 'Priya Sharma', action: 'Sold', symbol: 'RELIANCE', time: '5 min ago' },
  { user: 'Rahul Verma', action: 'Bought', symbol: 'BANKNIFTY 50000 PE', time: '8 min ago' },
  { user: 'Sneha Patel', action: 'Deposited', symbol: '₹50,000', time: '12 min ago' },
  { user: 'Vikram Singh', action: 'Sold', symbol: 'TCS', time: '15 min ago' },
]

const mockUsers = [
  { name: 'Arjun Mehta', email: 'arjun.mehta@email.com', balance: '₹2,45,000', trades: 342, pnl: '+₹45,200', pnlPositive: true, subscription: 'Premium', status: 'Active' },
  { name: 'Priya Sharma', email: 'priya.sharma@email.com', balance: '₹1,80,500', trades: 218, pnl: '+₹22,100', pnlPositive: true, subscription: 'Free', status: 'Active' },
  { name: 'Rahul Verma', email: 'rahul.verma@email.com', balance: '₹95,000', trades: 89, pnl: '-₹8,300', pnlPositive: false, subscription: 'Premium', status: 'Active' },
  { name: 'Sneha Patel', email: 'sneha.patel@email.com', balance: '₹3,12,000', trades: 567, pnl: '+₹1,12,400', pnlPositive: true, subscription: 'Premium', status: 'Active' },
  { name: 'Vikram Singh', email: 'vikram.singh@email.com', balance: '₹50,000', trades: 12, pnl: '-₹2,100', pnlPositive: false, subscription: 'Free', status: 'Inactive' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@email.com', balance: '₹4,20,000', trades: 891, pnl: '+₹2,34,500', pnlPositive: true, subscription: 'Premium', status: 'Active' },
  { name: 'Karan Deshmukh', email: 'karan.d@email.com', balance: '₹75,000', trades: 45, pnl: '-₹12,600', pnlPositive: false, subscription: 'Free', status: 'Suspended' },
  { name: 'Deepika Nair', email: 'deepika.n@email.com', balance: '₹1,55,000', trades: 156, pnl: '+₹18,900', pnlPositive: true, subscription: 'Free', status: 'Active' },
]

const indexSettings = [
  { name: 'NIFTY', enabled: true, lotSize: '50', expiryDay: 'Thursday', strikeInterval: '50' },
  { name: 'BANKNIFTY', enabled: true, lotSize: '25', expiryDay: 'Wednesday', strikeInterval: '100' },
  { name: 'FINNIFTY', enabled: true, lotSize: '40', expiryDay: 'Tuesday', strikeInterval: '50' },
  { name: 'SENSEX', enabled: true, lotSize: '20', expiryDay: 'Friday', strikeInterval: '100' },
  { name: 'MIDCPNIFTY', enabled: true, lotSize: '75', expiryDay: 'Monday', strikeInterval: '25' },
]

const bannedStocks = [
  { symbol: 'DELTACORP', banDate: '24 Feb 2025', reason: 'Open interest exceeds 95% MWPL' },
  { symbol: 'GNFC', banDate: '28 Feb 2025', reason: 'Open interest exceeds 95% MWPL' },
]

const circuitOverrides = [
  { symbol: 'RELIANCE', upperLimit: '15%', lowerLimit: '15%', effectiveFrom: '10 Mar 2025' },
  { symbol: 'TCS', upperLimit: '10%', lowerLimit: '10%', effectiveFrom: '10 Mar 2025' },
  { symbol: 'HDFCBANK', upperLimit: '12%', lowerLimit: '12%', effectiveFrom: '10 Mar 2025' },
]

const holidays2025 = [
  { name: 'Republic Day', date: '26 Jan 2025', day: 'Sunday', status: 'Closed' },
  { name: 'Mahashivratri', date: '26 Feb 2025', day: 'Wednesday', status: 'Closed' },
  { name: 'Holi', date: '14 Mar 2025', day: 'Friday', status: 'Closed' },
  { name: 'Id-Ul-Fitr (Ramzan Eid)', date: '31 Mar 2025', day: 'Monday', status: 'Closed' },
  { name: 'Shri Mahavir Jayanti', date: '10 Apr 2025', day: 'Thursday', status: 'Closed' },
  { name: 'Dr. Baba Saheb Ambedkar Jayanti', date: '14 Apr 2025', day: 'Monday', status: 'Closed' },
  { name: 'Good Friday', date: '18 Apr 2025', day: 'Friday', status: 'Closed' },
  { name: 'Eid ul-Adha (Bakri Id)', date: '07 Jun 2025', day: 'Saturday', status: 'Closed' },
  { name: 'Muharram', date: '07 Jul 2025', day: 'Monday', status: 'Closed' },
  { name: 'Independence Day', date: '15 Aug 2025', day: 'Friday', status: 'Closed' },
  { name: 'Mahatma Gandhi Jayanti', date: '02 Oct 2025', day: 'Thursday', status: 'Closed' },
  { name: 'Diwali (Laxmi Pujan)', date: '20 Oct 2025', day: 'Monday', status: 'Muhurat' },
]

const userGrowthData = [
  { month: 'Jan', users: 420 },
  { month: 'Feb', users: 510 },
  { month: 'Mar', users: 640 },
  { month: 'Apr', users: 720 },
  { month: 'May', users: 830 },
  { month: 'Jun', users: 950 },
  { month: 'Jul', users: 1050 },
  { month: 'Aug', users: 1100 },
  { month: 'Sep', users: 1160 },
  { month: 'Oct', users: 1200 },
  { month: 'Nov', users: 1230 },
  { month: 'Dec', users: 1248 },
]

const revenueData = [
  { name: 'Free', value: 1014, color: '#94a3b8' },
  { name: 'Premium', value: 234, color: '#0058be' },
]

const topTraders = [
  { name: 'Ananya Iyer', roi: '+78.5%', winRate: '72%', totalTrades: 891 },
  { name: 'Sneha Patel', roi: '+56.1%', winRate: '68%', totalTrades: 567 },
  { name: 'Arjun Mehta', roi: '+42.3%', winRate: '65%', totalTrades: 342 },
  { name: 'Priya Sharma', roi: '+24.8%', winRate: '61%', totalTrades: 218 },
  { name: 'Deepika Nair', roi: '+20.1%', winRate: '58%', totalTrades: 156 },
]

const platformMetrics = [
  { label: 'Avg Daily Trades', value: '4,850', icon: BarChart3 },
  { label: 'Most Traded Symbol', value: 'NIFTY', icon: TrendingUp },
  { label: 'Peak Concurrent Users', value: '312', icon: Users },
]

// ─── Chart Configs ────────────────────────────────────────────────────

const lineChartConfig: ChartConfig = {
  users: {
    label: 'Users',
    color: '#0058be',
  },
}

const revenueChartConfig: ChartConfig = {
  Free: {
    label: 'Free',
    color: '#94a3b8',
  },
  Premium: {
    label: 'Premium',
    color: '#0058be',
  },
}

// ─── Tab 1: Dashboard ─────────────────────────────────────────────────

function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="glass-card rounded-2xl border-0 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-4">
                <div className={`flex size-9 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="size-4" />
                </div>
                <p className="mt-3 text-xs font-medium text-tp-on-surface-variant">{stat.label}</p>
                <p className="font-mono-data text-lg font-bold text-tp-on-surface">{stat.value}</p>
                <p className="text-[11px] text-tp-on-surface-variant">{stat.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-tp-on-surface">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-tp-outline-variant/50 hover:bg-transparent">
                  <TableHead className="text-tp-on-surface-variant">User</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Action</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Symbol</TableHead>
                  <TableHead className="text-right text-tp-on-surface-variant">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((item, i) => (
                  <TableRow key={i} className="border-tp-outline-variant/30 transition-colors">
                    <TableCell className="font-medium text-tp-on-surface">{item.user}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold ${
                          item.action === 'Bought'
                            ? 'border-tp-secondary/30 bg-tp-secondary/10 text-tp-secondary'
                            : item.action === 'Sold'
                            ? 'border-tp-tertiary/30 bg-tp-tertiary/10 text-tp-tertiary'
                            : 'border-tp-primary/30 bg-tp-primary/10 text-tp-primary'
                        }`}
                      >
                        {item.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono-data text-sm text-tp-on-surface">{item.symbol}</TableCell>
                    <TableCell className="text-right text-xs text-tp-on-surface-variant">{item.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-tp-on-surface">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="spring-interaction gap-2 rounded-xl bg-tp-primary text-white hover:bg-tp-primary/90">
              <Plus className="size-4" />
              Add Mock Data
            </Button>
            <Button variant="outline" className="spring-interaction gap-2 rounded-xl border-tp-tertiary/30 text-tp-tertiary hover:bg-tp-tertiary/10">
              <RotateCcw className="size-4" />
              Reset All Portfolios
            </Button>
            <Button variant="outline" className="spring-interaction gap-2 rounded-xl border-tp-primary/30 text-tp-primary hover:bg-tp-primary/10">
              <Bell className="size-4" />
              Send Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 2: User Management ──────────────────────────────────────────

function UserManagement() {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Free', 'Premium', 'Active', 'Inactive']

  const filteredUsers = mockUsers.filter((user) => {
    if (filter === 'All') return true
    if (filter === 'Free') return user.subscription === 'Free'
    if (filter === 'Premium') return user.subscription === 'Premium'
    if (filter === 'Active') return user.status === 'Active'
    if (filter === 'Inactive') return user.status !== 'Active'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tp-on-surface-variant" />
              <Input
                placeholder="Search users by name or email..."
                className="rounded-xl border-tp-outline-variant/50 bg-tp-surface-container pl-10"
              />
            </div>
            <div className="glass-card inline-flex items-center gap-1 rounded-full p-1">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`tab-transition rounded-full px-3 py-1.5 text-xs font-semibold ${
                    filter === f
                      ? 'bg-tp-primary text-white shadow-sm'
                      : 'text-tp-on-surface-variant hover:bg-tp-surface-container'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-tp-on-surface">
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-tp-outline-variant/50 hover:bg-transparent">
                  <TableHead className="text-tp-on-surface-variant">Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-tp-on-surface-variant">Email</TableHead>
                  <TableHead className="text-right text-tp-on-surface-variant">Balance</TableHead>
                  <TableHead className="hidden md:table-cell text-right text-tp-on-surface-variant">Trades</TableHead>
                  <TableHead className="hidden md:table-cell text-right text-tp-on-surface-variant">P&L</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Plan</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Status</TableHead>
                  <TableHead className="text-right text-tp-on-surface-variant">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, i) => (
                  <TableRow key={i} className="border-tp-outline-variant/30 transition-colors">
                    <TableCell className="font-medium text-tp-on-surface">{user.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-tp-on-surface-variant">{user.email}</TableCell>
                    <TableCell className="text-right font-mono-data text-sm">{user.balance}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-mono-data text-sm">{user.trades}</TableCell>
                    <TableCell className={`hidden md:table-cell text-right font-mono-data text-sm font-semibold ${user.pnlPositive ? 'text-tp-secondary' : 'text-tp-tertiary'}`}>
                      {user.pnl}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-semibold ${
                        user.subscription === 'Premium'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                          : 'border-tp-outline-variant/50 bg-tp-surface-container text-tp-on-surface-variant'
                      }`}>
                        {user.subscription}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-semibold ${
                        user.status === 'Active'
                          ? 'border-tp-secondary/30 bg-tp-secondary/10 text-tp-secondary'
                          : user.status === 'Suspended'
                          ? 'border-tp-tertiary/30 bg-tp-tertiary/10 text-tp-tertiary'
                          : 'border-tp-outline-variant/50 bg-tp-surface-container text-tp-on-surface-variant'
                      }`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7 rounded-lg text-tp-on-surface-variant hover:bg-tp-primary/10 hover:text-tp-primary">
                          <Edit className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 rounded-lg text-tp-on-surface-variant hover:bg-tp-tertiary/10 hover:text-tp-tertiary">
                          <Ban className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 rounded-lg text-tp-on-surface-variant hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 3: Market Control ───────────────────────────────────────────

function MarketControl() {
  const [indices, setIndices] = useState(indexSettings)

  const toggleIndex = (index: number) => {
    setIndices((prev) =>
      prev.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item))
    )
  }

  return (
    <div className="space-y-6">
      {/* Indices Settings */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-tp-on-surface">
            <Settings2 className="size-4 text-tp-primary" />
            Indices Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {indices.map((idx, i) => (
              <div
                key={idx.name}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:gap-4 ${
                  idx.enabled ? 'border-tp-primary/20 bg-tp-primary/5' : 'border-tp-outline-variant/30 bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={idx.enabled}
                    onCheckedChange={() => toggleIndex(i)}
                  />
                  <span className={`font-mono-data font-bold ${idx.enabled ? 'text-tp-on-surface' : 'text-tp-on-surface-variant'}`}>
                    {idx.name}
                  </span>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-tp-on-surface-variant whitespace-nowrap">Lot Size</Label>
                    <Input
                      defaultValue={idx.lotSize}
                      className="h-8 w-20 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container font-mono-data text-sm"
                      disabled={!idx.enabled}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-tp-on-surface-variant whitespace-nowrap">Expiry</Label>
                    <Input
                      defaultValue={idx.expiryDay}
                      className="h-8 w-28 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container text-sm"
                      disabled={!idx.enabled}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-tp-on-surface-variant whitespace-nowrap">Strike Interval</Label>
                    <Input
                      defaultValue={idx.strikeInterval}
                      className="h-8 w-20 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container font-mono-data text-sm"
                      disabled={!idx.enabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* F&O Ban Management */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-tp-on-surface">
            <Ban className="size-4 text-tp-tertiary" />
            F&O Ban Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Banned Stocks */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-tp-outline-variant/50 hover:bg-transparent">
                  <TableHead className="text-tp-on-surface-variant">Symbol</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Ban Date</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Reason</TableHead>
                  <TableHead className="text-right text-tp-on-surface-variant">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bannedStocks.map((stock) => (
                  <TableRow key={stock.symbol} className="border-tp-outline-variant/30">
                    <TableCell className="font-mono-data font-bold text-tp-tertiary">{stock.symbol}</TableCell>
                    <TableCell className="text-sm text-tp-on-surface-variant">{stock.banDate}</TableCell>
                    <TableCell className="text-xs text-tp-on-surface-variant">{stock.reason}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1 text-tp-secondary hover:bg-tp-secondary/10 text-xs">
                        <X className="size-3" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add Stock to Ban */}
          <div className="rounded-xl border border-tp-outline-variant/30 p-4">
            <p className="mb-3 text-sm font-semibold text-tp-on-surface">Add Stock to Ban</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label className="text-xs text-tp-on-surface-variant">Symbol</Label>
                <Input placeholder="e.g. IDEA" className="mt-1 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container font-mono-data" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-tp-on-surface-variant">Date Range</Label>
                <div className="mt-1 flex gap-2">
                  <Input type="date" className="rounded-lg border-tp-outline-variant/50 bg-tp-surface-container text-sm" />
                  <Input type="date" className="rounded-lg border-tp-outline-variant/50 bg-tp-surface-container text-sm" />
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-tp-on-surface-variant">Reason</Label>
                <Input placeholder="MWPL exceeded" className="mt-1 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container text-sm" />
              </div>
              <Button className="spring-interaction gap-2 rounded-xl bg-tp-tertiary text-white hover:bg-tp-tertiary/90">
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Limits */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-tp-on-surface">
            <ChevronDown className="size-4 text-tp-primary" />
            Circuit Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-tp-on-surface-variant whitespace-nowrap">Default Index Circuit</Label>
              <Select defaultValue="10">
                <SelectTrigger className="w-24 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm text-tp-on-surface-variant whitespace-nowrap">Default Stock Circuit</Label>
              <Select defaultValue="20">
                <SelectTrigger className="w-24 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Overrides */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-tp-outline-variant/50 hover:bg-transparent">
                  <TableHead className="text-tp-on-surface-variant">Symbol</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Upper Limit</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Lower Limit</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Effective From</TableHead>
                  <TableHead className="text-right text-tp-on-surface-variant">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {circuitOverrides.map((item) => (
                  <TableRow key={item.symbol} className="border-tp-outline-variant/30">
                    <TableCell className="font-mono-data font-bold text-tp-on-surface">{item.symbol}</TableCell>
                    <TableCell className="font-mono-data text-sm text-tp-secondary">{item.upperLimit}</TableCell>
                    <TableCell className="font-mono-data text-sm text-tp-tertiary">{item.lowerLimit}</TableCell>
                    <TableCell className="text-sm text-tp-on-surface-variant">{item.effectiveFrom}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:bg-destructive/10 text-xs">
                        <Trash2 className="size-3" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 4: Holiday Calendar ─────────────────────────────────────────

function HolidayCalendar() {
  return (
    <div className="space-y-6">
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-tp-on-surface">
              <CalendarDays className="size-4 text-tp-primary" />
              Market Holidays 2025
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="spring-interaction gap-2 rounded-xl bg-tp-primary text-white hover:bg-tp-primary/90">
                  <Plus className="size-4" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Holiday</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label className="text-sm text-tp-on-surface-variant">Holiday Name</Label>
                    <Input placeholder="e.g. Diwali" className="mt-1 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container" />
                  </div>
                  <div>
                    <Label className="text-sm text-tp-on-surface-variant">Date</Label>
                    <Input type="date" className="mt-1 rounded-lg border-tp-outline-variant/50 bg-tp-surface-container" />
                  </div>
                  <div>
                    <Label className="text-sm text-tp-on-surface-variant">Market Status</Label>
                    <Select defaultValue="closed">
                      <SelectTrigger className="mt-1 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="muhurat">Muhurat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full rounded-xl bg-tp-primary text-white hover:bg-tp-primary/90">
                    Add Holiday
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-tp-outline-variant/50 hover:bg-transparent">
                  <TableHead className="text-tp-on-surface-variant">#</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Holiday Name</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Date</TableHead>
                  <TableHead className="hidden sm:table-cell text-tp-on-surface-variant">Day</TableHead>
                  <TableHead className="text-tp-on-surface-variant">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays2025.map((holiday, i) => (
                  <TableRow key={i} className="border-tp-outline-variant/30 transition-colors">
                    <TableCell className="font-mono-data text-sm text-tp-on-surface-variant">{i + 1}</TableCell>
                    <TableCell className="font-medium text-tp-on-surface">{holiday.name}</TableCell>
                    <TableCell className="font-mono-data text-sm text-tp-on-surface-variant">{holiday.date}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-tp-on-surface-variant">{holiday.day}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-semibold ${
                        holiday.status === 'Closed'
                          ? 'border-tp-tertiary/30 bg-tp-tertiary/10 text-tp-tertiary'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                      }`}>
                        {holiday.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 5: Analytics ────────────────────────────────────────────────

function AdminAnalytics() {
  return (
    <div className="space-y-6">
      {/* User Growth Chart */}
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-tp-on-surface">
            <TrendingUp className="size-4 text-tp-primary" />
            User Growth (2025)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineChartConfig} className="h-[300px] w-full">
            <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                width={45}
              />
              <RechartsTooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(241,243,245,1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#0058be"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0058be', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#0058be', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Subscription */}
        <Card className="glass-card rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-tp-on-surface">Revenue by Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="mx-auto h-[220px] w-full">
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`${value} users`, name]}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(241,243,245,1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ChartContainer>
            <div className="relative -mt-[140px] flex flex-col items-center pb-[60px]">
              <span className="font-mono-data text-2xl font-bold text-tp-on-surface">1,248</span>
              <span className="text-[11px] font-medium text-tp-on-surface-variant">Total Users</span>
            </div>
            <div className="mt-4 space-y-2">
              {revenueData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-tp-on-surface-variant">{item.name}</span>
                  </div>
                  <span className="font-mono-data text-sm font-semibold text-tp-on-surface">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Traders */}
        <Card className="glass-card rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-tp-on-surface">Top Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-tp-outline-variant/50 hover:bg-transparent">
                    <TableHead className="text-tp-on-surface-variant">#</TableHead>
                    <TableHead className="text-tp-on-surface-variant">Name</TableHead>
                    <TableHead className="text-right text-tp-on-surface-variant">ROI</TableHead>
                    <TableHead className="text-right text-tp-on-surface-variant">Win Rate</TableHead>
                    <TableHead className="hidden sm:table-cell text-right text-tp-on-surface-variant">Trades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTraders.map((trader, i) => (
                    <TableRow key={i} className="border-tp-outline-variant/30">
                      <TableCell>
                        <div className={`flex size-7 items-center justify-center rounded-full font-mono-data text-xs font-bold ${
                          i === 0 ? 'bg-amber-500/10 text-amber-600' :
                          i === 1 ? 'bg-gray-400/10 text-gray-500' :
                          i === 2 ? 'bg-orange-500/10 text-orange-600' :
                          'bg-tp-surface-container text-tp-on-surface-variant'
                        }`}>
                          {i + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-tp-on-surface">{trader.name}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm font-semibold text-tp-secondary">{trader.roi}</TableCell>
                      <TableCell className="text-right font-mono-data text-sm">{trader.winRate}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-mono-data text-sm text-tp-on-surface-variant">{trader.totalTrades}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {platformMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label} className="glass-card rounded-2xl border-0 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-tp-primary/10 text-tp-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-tp-on-surface-variant">{metric.label}</p>
                  <p className="font-mono-data text-xl font-bold text-tp-on-surface">{metric.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab 6: Reports ──────────────────────────────────────────────────

function AdminReports() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (type: 'users' | 'trades' | 'revenue') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pepertect_token') : null
    if (!token) {
      // For admin page, try getting from the admin auth
      const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      if (!adminToken) return
    }

    setDownloading(type)
    try {
      const authToken = localStorage.getItem('pepertect_token') || localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/reports?type=${type}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) throw new Error('Failed to download report')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filenameMap: Record<string, string> = {
        users: 'users-report.pdf',
        trades: 'trades-report.pdf',
        revenue: 'revenue-report.pdf',
      }
      a.download = filenameMap[type]
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      // silent error
    } finally {
      setDownloading(null)
    }
  }

  const reports = [
    {
      id: 'users' as const,
      title: 'Users Report',
      description: 'All user data including balance, trades, P&L',
      icon: UserCircle,
      iconBg: 'bg-tp-primary/10',
      iconColor: 'text-tp-primary',
      details: ['Name, Email, Phone', 'Virtual Balance & Margin', 'Total Trades & Win Rate', 'P&L & Subscription Plan', 'Account Status & Last Login'],
    },
    {
      id: 'trades' as const,
      title: 'Trades Report',
      description: 'Complete trade history with user details',
      icon: ArrowUpDown,
      iconBg: 'bg-tp-secondary/10',
      iconColor: 'text-tp-secondary',
      details: ['User Name & Email', 'Symbol & Segment', 'Buy/Sell Direction', 'Quantity & Fill Price', 'P&L per Trade', 'Execution Timestamp'],
    },
    {
      id: 'revenue' as const,
      title: 'Revenue Report',
      description: 'Premium subscription and revenue data',
      icon: Wallet,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      details: ['Free vs Premium Breakdown', 'Monthly Recurring Revenue', 'Annual Revenue Projection', 'Conversion Rate', 'Premium User List'],
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="glass-card rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-tp-on-surface">
            <FileText className="size-5 text-tp-primary" />
            Download Reports (PDF)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-tp-on-surface-variant mb-6">
            Generate and download comprehensive PDF reports for your platform data.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {reports.map((report) => {
              const Icon = report.icon
              const isDownloading = downloading === report.id
              return (
                <div
                  key={report.id}
                  className="flex flex-col rounded-2xl border border-tp-outline-variant/30 bg-tp-surface-container/50 p-5 transition-all hover:border-tp-primary/30 hover:shadow-md"
                >
                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`flex size-11 items-center justify-center rounded-xl ${report.iconBg} ${report.iconColor}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-tp-on-surface">{report.title}</h3>
                      <p className="text-xs text-tp-on-surface-variant">{report.description}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-tp-on-surface-variant mb-2">Includes</p>
                    <ul className="space-y-1.5">
                      {report.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-tp-on-surface-variant">
                          <div className="size-1.5 rounded-full bg-tp-primary/50 shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Download Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(report.id)}
                      disabled={downloading !== null}
                      className="flex-1 gap-2 rounded-xl bg-tp-primary text-white hover:bg-tp-primary/90 spring-interaction"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          Export PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={downloading !== null}
                      className="gap-2 rounded-xl border-tp-outline-variant/50 text-tp-on-surface-variant hover:bg-tp-surface-container"
                      onClick={() => handleDownload(report.id)}
                    >
                      <FileText className="size-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminPage() {
  return (
    <div className="min-h-screen bg-tp-surface">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-tp-primary text-white shadow-md">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-tp-on-surface sm:text-3xl">
                Admin Panel
              </h1>
              <p className="mt-0.5 text-sm text-tp-on-surface-variant">
                Manage users, market settings, and platform analytics
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="glass-card h-auto flex-wrap gap-1 rounded-2xl p-2">
            <TabsTrigger value="dashboard" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Users
            </TabsTrigger>
            <TabsTrigger value="market" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Market Control
            </TabsTrigger>
            <TabsTrigger value="holidays" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Holidays
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-tp-primary data-[state=active]:text-white">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          <TabsContent value="market">
            <MarketControl />
          </TabsContent>
          <TabsContent value="holidays">
            <HolidayCalendar />
          </TabsContent>
          <TabsContent value="reports">
            <AdminReports />
          </TabsContent>
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <GoogleOAuthSetup />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
