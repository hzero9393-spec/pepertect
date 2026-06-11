'use client'

import { useState } from 'react'

// Stock logo CDN mapping — uses multiple sources for reliability
// Primary: Google Finance logos (fast, reliable for NSE stocks)
// Fallback: Initials circle
const LOGO_SOURCES = [
  // Google Finance style — works for most NSE stocks
  (symbol: string) => `https://www.google.com/finance/_/GoogleFinanceUi/data/batch.execute?rpcids=moiFVb&source-path=%2Fquote%2F${symbol}%3FNSE`,
]

// Known logo URLs for popular NSE stocks (fallback CDN mapping)
const KNOWN_LOGOS: Record<string, string> = {
  RELIANCE: 'https://logoapi.logomaster.ai/api/image/RELIANCE',
  TCS: 'https://logoapi.logomaster.ai/api/image/TCS',
  HDFCBANK: 'https://logoapi.logomaster.ai/api/image/HDFCBANK',
  INFY: 'https://logoapi.logomaster.ai/api/image/INFY',
  ICICIBANK: 'https://logoapi.logomaster.ai/api/image/ICICIBANK',
}

// Sector-based colors for fallback
const SECTOR_COLORS: Record<string, string> = {
  'Banking': '#00D09C',
  'IT': '#3B82F6',
  'Pharma': '#8B5CF6',
  'Auto': '#F59E0B',
  'FMCG': '#EC4899',
  'Energy': '#EF4444',
  'Metals': '#6B7280',
  'Financial Services': '#00D09C',
  'Telecom': '#14B8A6',
  'Cement': '#F97316',
  'Infrastructure': '#0EA5E9',
  'Insurance': '#6366F1',
  'Chemicals': '#A855F7',
  'Media': '#F43F5E',
  'Power': '#EAB308',
  'Real Estate': '#22C55E',
  'Consumer Goods': '#EC4899',
  'Healthcare': '#8B5CF6',
}

function getSectorColor(sector?: string): string {
  return SECTOR_COLORS[sector || ''] || '#6B7280'
}

function getInitials(symbol: string): string {
  // Take first 2 characters for most stocks
  // For some stocks, take meaningful initials
  if (symbol.length <= 2) return symbol.toUpperCase()

  // Common patterns: RELIANCE → RE, HDFCBANK → HB, TATAMOTORS → TM
  const knownInitials: Record<string, string> = {
    RELIANCE: 'RI',
    HDFCBANK: 'HB',
    ICICIBANK: 'IB',
    KOTAKBANK: 'KB',
    AXISBANK: 'AB',
    SBIN: 'SB',
    BHARTIARTL: 'BA',
    HINDUNILVR: 'HU',
    TATAMOTORS: 'TM',
    TATASTEEL: 'TS',
    TATACONSUM: 'TC',
    MARUTI: 'MS',
    SUNPHARMA: 'SP',
    BAJFINANCE: 'BF',
    BAJAJFINSV: 'BF',
    ASIANPAINT: 'AP',
    ULTRACEMCO: 'UC',
    HCLTECH: 'HC',
    NESTLEIND: 'NI',
    DRREDDY: 'DR',
    POWERGRID: 'PG',
    COALINDIA: 'CI',
    ADANIENT: 'AE',
    ADANIPORTS: 'AP',
    JSWSTEEL: 'JS',
    HINDALCO: 'HA',
    ONGC: 'OG',
    NTPC: 'NT',
    GRASIM: 'GS',
    BRITANNIA: 'BR',
    INDUSINDBK: 'II',
    HDFCLIFE: 'HL',
    SBILIFE: 'SL',
    TECHM: 'TM',
    WIPRO: 'WP',
    DIVISLAB: 'DL',
    CIPLA: 'CP',
    EICHERMOT: 'EM',
    HEROMOTOCO: 'HM',
    APOLLOHOSP: 'AH',
    ITC: 'IT',
    LT: 'LT',
    TITAN: 'TT',
    M_M: 'MM',
    INFY: 'IN',
    TCS: 'TC',
  }

  return knownInitials[symbol] || symbol.slice(0, 2).toUpperCase()
}

interface StockLogoProps {
  symbol: string
  name?: string
  sector?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function StockLogo({ symbol, name, sector, size = 'md', className = '' }: StockLogoProps) {
  const [imgError, setImgError] = useState(false)
  const [triedUrls, setTriedUrls] = useState(0)

  const sizeMap = {
    sm: 'size-7 text-[9px]',
    md: 'size-9 text-[10px]',
    lg: 'size-12 text-sm',
    xl: 'size-20 text-2xl',
  }

  const iconSizeMap = {
    sm: 'size-7',
    md: 'size-9',
    lg: 'size-12',
    xl: 'size-20',
  }

  const color = getSectorColor(sector)
  const initials = getInitials(symbol)

  // Try logo URL from known logos first, then generate one
  const logoUrl = triedUrls === 0 && KNOWN_LOGOS[symbol]
    ? KNOWN_LOGOS[symbol]
    : triedUrls === 0
      ? `https://storage.googleapis.com/nse-logo-bucket/${symbol}.png`
      : triedUrls === 1
        ? `https://logo.clearbit.com/${name?.toLowerCase().replace(/\s+/g, '')}.com`
        : null

  // Show initials fallback if all URLs failed or if no URL available
  if (imgError || !logoUrl) {
    return (
      <div
        className={`${iconSizeMap[size]} rounded-lg flex items-center justify-center font-bold shrink-0 ${className}`}
        style={{
          background: `linear-gradient(135deg, ${color}18, ${color}08)`,
          color: color,
          border: `1px solid ${color}15`,
        }}
        title={name || symbol}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={`${iconSizeMap[size]} rounded-lg overflow-hidden shrink-0 ${className}`}>
      <img
        src={logoUrl}
        alt={`${name || symbol} logo`}
        className="w-full h-full object-cover"
        onError={() => {
          if (triedUrls < 2) {
            setTriedUrls(prev => prev + 1)
          } else {
            setImgError(true)
          }
        }}
        loading="lazy"
      />
    </div>
  )
}

// Index logo component (for NIFTY, BANKNIFTY etc.)
export function IndexLogo({ symbol, size = 'md', className = '' }: { symbol: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = {
    sm: 'size-7 text-[8px]',
    md: 'size-9 text-[10px]',
    lg: 'size-12 text-sm',
  }

  const indexConfig: Record<string, { label: string; color: string; bg: string }> = {
    NIFTY: { label: 'N5', color: '#00D09C', bg: '#00D09C' },
    BANKNIFTY: { label: 'BN', color: '#3B82F6', bg: '#3B82F6' },
    FINNIFTY: { label: 'FN', color: '#8B5CF6', bg: '#8B5CF6' },
    SENSEX: { label: 'SX', color: '#F59E0B', bg: '#F59E0B' },
    MIDCPNIFTY: { label: 'MN', color: '#EC4899', bg: '#EC4899' },
  }

  const config = indexConfig[symbol] || { label: symbol.slice(0, 2), color: '#6B7280', bg: '#6B7280' }

  return (
    <div
      className={`${sizeMap[size]} rounded-lg flex items-center justify-center font-bold shrink-0 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${config.bg}20, ${config.bg}08)`,
        color: config.color,
        border: `1px solid ${config.color}15`,
      }}
      title={symbol}
    >
      {config.label}
    </div>
  )
}
