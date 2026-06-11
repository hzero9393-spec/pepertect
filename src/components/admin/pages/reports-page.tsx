'use client'

import { useState } from 'react'
import {
  Users, ArrowUpDown, IndianRupee, FileText, Loader2, FileDown, FileSpreadsheet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  adminApi, getAllMockUsers, getAllMockTrades
} from '@/components/admin/shared'

function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownloadPDF = async (type: string) => {
    setDownloading(type)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/reports?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success(`${type} report downloaded`)
    } catch {
      toast.error('Failed to download report')
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadCSV = async (type: string) => {
    setDownloading(`csv-${type}`)
    try {
      const allMockUsers = getAllMockUsers()
      const allMockTrades = getAllMockTrades()
      let data: any[] = []
      let headers: string[] = []
      if (type === 'users') {
        data = allMockUsers
        headers = ['Name', 'Email', 'Balance', 'Subscription', 'Status', 'Joined', 'Trades', 'P&L']
      } else if (type === 'trades') {
        data = allMockTrades
        headers = ['User', 'Symbol', 'Segment', 'Direction', 'Entry', 'Exit', 'P&L', 'Time']
      } else {
        data = allMockUsers.filter(u => u.subscription === 'PREMIUM')
        headers = ['Name', 'Email', 'Balance', 'Joined', 'Trades', 'P&L']
      }

      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => {
          if (type === 'users') return [row.name, row.email, row.virtualBalance, row.subscription, row.isActive ? 'Active' : 'Blocked', row.createdAt, row.totalTrades, row.totalPnl].join(',')
          if (type === 'trades') return [row.userName, row.symbol, row.segment, row.direction, row.entryPrice, row.exitPrice, row.pnl, row.createdAt].join(',')
          return [row.name, row.email, row.virtualBalance, row.createdAt, row.totalTrades, row.totalPnl].join(',')
        })
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success(`${type} CSV exported`)
    } catch {
      toast.error('Failed to export CSV')
    } finally {
      setDownloading(null)
    }
  }

  const reports = [
    {
      id: 'users', title: 'Users Report', desc: 'Complete user data with balance & trades',
      icon: Users, items: ['Name, Email & Phone', 'Virtual Balance & Margin', 'Total Trades & Win Rate', 'P&L & Subscription Plan'],
    },
    {
      id: 'trades', title: 'Trades Report', desc: 'Full trade history with user details',
      icon: ArrowUpDown, items: ['User Name & Email', 'Symbol & Segment', 'Buy/Sell Direction', 'Quantity, Price & P&L'],
    },
    {
      id: 'revenue', title: 'Revenue Report', desc: 'Premium subscription & revenue data',
      icon: IndianRupee, items: ['Free vs Premium Breakdown', 'Monthly Recurring Revenue', 'Annual Revenue Projection', 'Conversion Rate & Churn'],
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="bg-white border-[#e5e7eb] rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]">
            <FileText className="size-4 text-[#00D09C]" /> Export Center
          </CardTitle>
          <CardDescription className="text-xs text-[#6b7280]">Generate and download comprehensive reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reports.map((r) => {
              const Icon = r.icon
              return (
                <div key={r.id} className="flex flex-col rounded-xl border border-[#e5e7eb] bg-[#f7f8fc] p-5 hover:border-[#00D09C]/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-11 rounded-xl bg-[#00D09C]/10 flex items-center justify-center text-[#00D09C]">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1a1a1a] text-sm">{r.title}</h3>
                      <p className="text-[11px] text-[#6b7280]">{r.desc}</p>
                    </div>
                  </div>
                  <div className="flex-1 mb-4">
                    <ul className="space-y-1.5">
                      {r.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[#6b7280]">
                          <div className="size-1.5 rounded-full bg-[#00D09C]/50" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownloadPDF(r.id)}
                      disabled={downloading !== null}
                      className="flex-1 gap-1.5 bg-[#00D09C] hover:bg-[#00b888] text-white h-9 text-xs"
                    >
                      {downloading === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                      PDF
                    </Button>
                    <Button
                      onClick={() => handleDownloadCSV(r.id)}
                      disabled={downloading !== null}
                      variant="outline"
                      className="flex-1 gap-1.5 border-[#e5e7eb] text-[#1a1a1a] h-9 text-xs hover:bg-[#f0f2f5]"
                    >
                      {downloading === `csv-${r.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
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

export default ReportsPage
