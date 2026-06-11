'use client'

import { useState, useEffect, useCallback } from 'react'
import { Crosshair, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  type Position, adminApi, formatINR,
  LoadingSkeleton, EmptyState, SimplePagination, getAllMockPositions
} from '@/components/admin/shared'

function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const limit = 20

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi(`/positions?page=${page}&limit=${limit}&search=${search}`)
      const data = await res.json()
      setPositions(data.positions || [])
      setTotal(data.total || 0)
    } catch {
      const allMockPositions = getAllMockPositions()
      let filtered = allMockPositions
      if (search) filtered = filtered.filter(p => p.userName.toLowerCase().includes(search.toLowerCase()) || p.symbol.toLowerCase().includes(search.toLowerCase()))
      setPositions(filtered.slice((page - 1) * limit, page * limit))
      setTotal(filtered.length)
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [page, search])

  useEffect(() => {
     
    fetchPositions()
    const interval = setInterval(fetchPositions, 30000)
    return () => clearInterval(interval)
  }, [fetchPositions])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Search + Auto Refresh Indicator */}
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
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <div className="flex size-2 rounded-full bg-[#00D09C] animate-pulse" />
              <span>Auto-refreshing</span>
              <span className="text-[#9ca3af]">· Last: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions Table */}
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#1a1a1a]">Live Positions ({total.toLocaleString('en-IN')})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton rows={8} />
          ) : positions.length === 0 ? (
            <EmptyState icon={Crosshair} title="No open positions" description="There are currently no open positions on the platform." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#e5e7eb] hover:bg-transparent">
                      <TableHead className="text-[#6b7280] text-xs">User</TableHead>
                      <TableHead className="text-[#6b7280] text-xs">Symbol</TableHead>
                      <TableHead className="text-[#6b7280] text-xs">Direction</TableHead>
                      <TableHead className="text-right text-[#6b7280] text-xs">Entry Price</TableHead>
                      <TableHead className="text-right text-[#6b7280] text-xs">Current Price</TableHead>
                      <TableHead className="text-[#6b7280] text-xs">Segment</TableHead>
                      <TableHead className="text-right text-[#6b7280] text-xs">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((pos) => {
                      const pnlPositive = pos.pnl >= 0
                      return (
                        <TableRow key={pos.id} className="border-[#f0f2f5] hover:bg-[#f7f8fc]">
                          <TableCell className="font-medium text-[#1a1a1a] text-xs">{pos.userName}</TableCell>
                          <TableCell className="font-mono text-xs text-[#1a1a1a]">{pos.symbol}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-semibold ${
                              pos.direction === 'BUY' ? 'border-[#00d09c]/30 bg-[#00d09c]/10 text-[#00a87d]'
                                : 'border-[#eb5b3c]/30 bg-[#eb5b3c]/10 text-[#d44a2d]'
                            }`}>{pos.direction}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-[#1a1a1a]">₹{pos.entryPrice.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-[#1a1a1a]">₹{pos.currentPrice.toLocaleString('en-IN')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold border-[#e5e7eb] bg-[#f0f2f5] text-[#6b7280]">{pos.segment}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono text-xs font-semibold ${pnlPositive ? 'text-[#00a87d]' : 'text-[#d44a2d]'}`}>
                            <span className="inline-flex items-center gap-0.5">
                              {pnlPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                              {formatINR(Math.abs(pos.pnl))}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PositionsPage
