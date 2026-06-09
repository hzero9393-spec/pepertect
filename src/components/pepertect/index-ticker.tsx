'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatPercent } from '@/lib/format'
import { useAppStore } from '@/lib/store'

interface IndexData {
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
}

interface MarketStatus {
  status: string
  message: string
  istTime: string
}

export function IndexTicker() {
  const [indices, setIndices] = useState<IndexData[]>([])
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)
  const { navigateToIndex } = useAppStore()

  useEffect(() => {
    async function fetchData() {
      try {
        const [indicesRes, statusRes] = await Promise.all([
          fetch('/api/indices'),
          fetch('/api/market/status'),
        ])
        const indicesData = await indicesRes.json()
        const statusData = await statusRes.json()
        if (indicesData.success) setIndices(indicesData.data)
        if (statusData.success) setMarketStatus(statusData.data)
      } catch {
        setIndices([
          { symbol: 'NIFTY', name: 'NIFTY 50', currentPrice: 19500, change: 125.30, changePercent: 0.65 },
          { symbol: 'BANKNIFTY', name: 'BANK NIFTY', currentPrice: 44250, change: -210.45, changePercent: -0.47 },
          { symbol: 'SENSEX', name: 'SENSEX', currentPrice: 65200, change: 340.20, changePercent: 0.52 },
        ])
        setMarketStatus({ status: 'CLOSED', message: 'Market closed', istTime: new Date().toISOString() })
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const isOpen = marketStatus?.status === 'OPEN'
  const statusLabel = marketStatus?.status || 'CLOSED'

  return (
    <div className="fixed left-0 right-0 top-[56px] z-20 md:left-[220px]">
      <div
        className="border-b"
        style={{
          background: '#fafafa',
          borderColor: '#f0f0f0',
          height: '36px',
        }}
      >
        <div className="flex items-center h-full px-3 gap-0 overflow-x-auto custom-scrollbar">
          {/* Market Status */}
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r mr-2" style={{ borderColor: '#f0f0f0' }}>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: isOpen ? 'rgba(0,208,156,0.08)' : 'rgba(235,91,60,0.08)',
                color: isOpen ? '#00D09C' : '#eb5b3c',
              }}
            >
              <span className="relative flex size-1.5">
                {isOpen && (
                  <span className="absolute inline-flex size-1.5 animate-ping rounded-full opacity-75" style={{ background: '#00D09C' }} />
                )}
                <span
                  className="relative inline-flex size-1.5 rounded-full"
                  style={{ background: isOpen ? '#00D09C' : '#eb5b3c' }}
                />
              </span>
              {statusLabel}
            </span>
          </div>

          {/* Index Ticker - Clickable to open index detail */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {indices.map((idx) => {
              const isPositive = idx.change >= 0
              return (
                <button
                  key={idx.symbol}
                  type="button"
                  className="flex items-center gap-1.5 shrink-0 cursor-pointer hover:bg-white px-2.5 py-1 rounded-md transition-colors"
                  onClick={() => navigateToIndex(idx.symbol)}
                >
                  <span className="text-[11px] font-semibold" style={{ color: '#4a4a4a' }}>
                    {idx.symbol}
                  </span>
                  <span className="text-[12px] font-semibold font-tabular" style={{ color: '#1a1a1a' }}>
                    {idx.currentPrice.toLocaleString('en-IN')}
                  </span>
                  <span
                    className="flex items-center gap-0.5 text-[11px] font-semibold font-tabular"
                    style={{ color: isPositive ? '#00B386' : '#eb5b3c' }}
                  >
                    {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {isPositive ? '+' : ''}{formatPercent(idx.changePercent)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
