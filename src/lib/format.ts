/**
 * Shared number formatting utilities for Pepertect
 * Groww-style clean, readable number display
 */

/** Format number as Indian Rupee with 2 decimal places: ₹1,23,456.78 */
export function formatINR(value: number): string {
  return '₹' + Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Format number as Indian Rupee without decimals: ₹1,23,456 */
export function formatINRWhole(value: number): string {
  return '₹' + Math.abs(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })
}

/** Format price without ₹ symbol: 1,23,456.78 */
export function formatPrice(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Format large numbers with L/Cr suffix: ₹1.2L, ₹3.5Cr */
export function formatLargeNumber(value: number): string {
  if (value >= 10000000) {
    return '₹' + (value / 10000000).toFixed(2) + 'Cr'
  }
  if (value >= 100000) {
    return '₹' + (value / 100000).toFixed(2) + 'L'
  }
  return formatINR(value)
}

/** Format volume: 1.2M, 500K, etc. */
export function formatVolume(vol: number): string {
  if (vol >= 10000000) return (vol / 10000000).toFixed(2) + ' Cr'
  if (vol >= 100000) return (vol / 100000).toFixed(2) + ' L'
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K'
  return vol.toString()
}

/** Format percentage: +2.45%, -1.12% */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/** Format P&L value: +₹1,245.50 or -₹845.20 */
export function formatPnL(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatINR(value)}`
}

/** Calculate brokerage (0.05% of total value, min ₹20, max ₹500 per order) — matches backend */
export function calculateBrokerage(totalValue: number): number {
  const brokeragePercent = 0.0005
  const minBrokerage = 20
  const maxBrokerage = 500
  const calculated = totalValue * brokeragePercent
  return Math.max(minBrokerage, Math.min(maxBrokerage, Math.round(calculated * 100) / 100))
}

/** Get P&L color class based on value */
export function getPnLColorClass(value: number): string {
  if (value > 0) return 'text-[#00B386]'
  if (value < 0) return 'text-[#EB5B3C]'
  return 'text-gray-500'
}

/** Get P&L background class based on value */
export function getPnLBgClass(value: number): string {
  if (value > 0) return 'bg-[rgba(0,179,134,0.1)]'
  if (value < 0) return 'bg-[rgba(235,91,60,0.1)]'
  return 'bg-gray-100'
}

/** Get P&L pill class */
export function getPnLPillClass(value: number): string {
  if (value > 0) return 'pill-profit'
  if (value < 0) return 'pill-loss'
  return 'bg-gray-100 text-gray-500'
}

/** Format a general number with Indian locale */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN')
}
