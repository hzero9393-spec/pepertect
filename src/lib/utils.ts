import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Indian number formatting (Lakh / Crore)
export function formatINR(num: number): string {
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return sign + '₹' + (abs / 10000000).toFixed(2) + ' Cr';
  }
  if (abs >= 100000) {
    return sign + '₹' + (abs / 100000).toFixed(2) + ' L';
  }
  return sign + '₹' + abs.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

export function formatPnl(num: number): { text: string; color: string } {
  const sign = num >= 0 ? '+' : '';
  return {
    text: sign + formatNumber(num),
    color: num >= 0 ? 'text-profit-green' : 'text-loss-red',
  };
}

export function getPnlColor(value: number): string {
  return value >= 0 ? 'text-profit-green' : 'text-loss-red';
}

export function getPnlBgColor(value: number): string {
  return value >= 0 ? 'bg-profit-green/10' : 'bg-loss-red/10';
}

// Delay utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate initials from name
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
