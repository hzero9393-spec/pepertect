'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  type Trade, adminApi, formatINR, formatTimeAgo,
  LoadingSkeleton, EmptyState, SimplePagination, getAllMockTrades
} from '@/components/admin/shared'

function TradesPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    try {
      const segment = tab === 'index' ? 'INDEX' : tab === 'stock' ? 'STOCK' : ''
      const res = await adminApi(`/trades?page=${page}&limit=${limit}&search=${search}&segment=${segment}`)
      const data = await res.json()
      setTrades(data.trades || [])
      setTotal(data.total || 0)
    } catch {
      const allMockTrades = getAllMockTrades()
      let filtered = allMockTrades
      if (search) filtered = filtered.filter(t => t.userName.toLowerCase().includes(search.toLowerCase()) || t.symbol.toLowerCase().includes(search.toLowerCase()))
      if (tab === 'index') filtered = filtered.filter(t => t.segment === 'INDEX')
      if (tab === 'stock') filtered = filtered.filter(t => t.segment === 'STOCK')
      setTrades(filtered.slice((page - 1) * limit, page * limit))
      setTotal(filtered.length)
    } finally {
      setLoading(false)
    }
  }, [page, search, tab])

   
  useEffect(() => { fetchTrades() }, [fetchTrades])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Search + Filters */}
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9ca3af]" />
              <Input
                placeholder="Search by user or symbol..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="rounded-lg border-[#e5e7eb] bg-[#f0f2f5] text-[#1a1a1a] pl-10 h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs + Table */}
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }}>
            <TabsList className="bg-[#f0f2f5] mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#00D09C]/10 data-[state=active]:text-[#00D09C] text-xs">All Trades</TabsTrigger>
              <TabsTrigger value="index" className="data-[state=active]:bg-[#00D09C]/10 data-[state=active]:text-[#00D09C] text-xs">Index</TabsTrigger>
              <TabsTrigger value="stock" className="data-[state=active]:bg-[#00D09C]/10 data-[state=active]:text-[#00D09C] text-xs">Stock</TabsTrigger>
            </TabsList>

            {loading ? (
              <LoadingSkeleton rows={8} />
            ) : trades.length === 0 ? (
              <EmptyState icon={ArrowUpDown} title="No trades found" description="No trades match the current filters." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#e5e7eb] hover:bg-transparent">
                        <TableHead className="text-[#6b7280] text-xs">User</TableHead>
                        <TableHead className="text-[#6b7280] text-xs">Symbol</TableHead>
                        <TableHead className="text-[#6b7280] text-xs">Segment</TableHead>
                        <TableHead className="text-[#6b7280] text-xs">Direction</TableHead>
                        <TableHead className="text-right text-[#6b7280] text-xs">Entry Price</TableHead>
                        <TableHead className="text-right text-[#6b7280] text-xs">Exit Price</TableHead>
                        <TableHead className="text-right text-[#6b7280] text-xs">P&L</TableHead>
                        <TableHead className="text-right text-[#6b7280] text-xs">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades.map((trade) => (
                        <TableRow key={trade.id} className="border-[#f0f2f5] hover:bg-[#f7f8fc]">
                          <TableCell className="font-medium text-[#1a1a1a] text-xs">{trade.userName}</TableCell>
                          <TableCell className="font-mono text-xs text-[#1a1a1a]">{trade.symbol}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold border-[#e5e7eb] bg-[#f0f2f5] text-[#6b7280]">{trade.segment}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-semibold ${
                              trade.direction === 'BUY' ? 'border-[#00d09c]/30 bg-[#00d09c]/10 text-[#00a87d]'
                                : 'border-[#eb5b3c]/30 bg-[#eb5b3c]/10 text-[#d44a2d]'
                            }`}>{trade.direction}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-[#1a1a1a]">₹{trade.entryPrice.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-[#1a1a1a]">{trade.exitPrice ? `₹${trade.exitPrice.toLocaleString('en-IN')}` : '—'}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${(trade.pnl ?? 0) >= 0 ? 'text-[#00a87d]' : 'text-[#d44a2d]'}`}>
                            {trade.pnl !== undefined ? formatINR(trade.pnl) : '—'}
                          </TableCell>
                          <TableCell className="text-right text-[11px] text-[#9ca3af]">{formatTimeAgo(trade.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default TradesPage
