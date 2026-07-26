'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * StockLogo — displays a real company logo with a polished colored-initials
 * fallback. Used everywhere a stock is shown.
 *
 * - For known NSE stocks we attempt to load the real logo from icon.horse
 *   (a free service that returns the highest-quality favicon available).
 * - If the image fails (offline, unknown domain, blocked) we show a colored
 *   circular avatar with the stock's initials.
 * - For market indices (NIFTY, SENSEX, etc.) we skip the image attempt and
 *   show a gradient avatar with a single letter — indices aren't companies.
 */

// ---- Domain map for NSE stocks (for logo lookup via icon.horse) ----
// Domains chosen for highest-quality favicon (verified: 48-256px PNGs).
const STOCK_DOMAINS: Record<string, string> = {
  RELIANCE: 'reliance.com',
  TCS: 'tcs.com',
  INFY: 'infosys.com',
  HDFCBANK: 'hdfcbank.com',
  ICICIBANK: 'icicibank.com',
  SBIN: 'onlinesbi.sbi',
  BHARTIARTL: 'airtel.com',
  ITC: 'itcportal.com',
  HINDUNILVR: 'hindunilvr.com',
  KOTAKBANK: 'kotak.com',
  LT: 'larsentoubro.com',
  AXISBANK: 'axisbank.com',
  BAJFINANCE: 'bajajfinserv.in',
  MARUTI: 'marutisuzuki.com',
  TATAMOTORS: 'tatamotors.com',
  WIPRO: 'wipro.com',
  HCLTECH: 'hcltech.com',
  SUNPHARMA: 'sunpharma.com',
  TITAN: 'titancompany.in',
  ADANIENT: 'adani.com',
  // Extra NSE stocks that might get added later
  TATASTEEL: 'tatasteel.com',
  ASIANPAINT: 'asianpaints.com',
  ULTRACEMCO: 'ultratechcement.com',
  NESTLEIND: 'nestle.in',
  POWERGRID: 'powergrid.in',
  NTPC: 'ntpc.co.in',
  ONGC: 'ongcindia.com',
  COALINDIA: 'coalindia.in',
  IOC: 'iocl.com',
  BPCL: 'bharatpetroleum.in',
  JSWSTEEL: 'jsw.in',
  HDFCLIFE: 'hdfclife.com',
  SBILIFE: 'sbilife.co.in',
  INDUSINDBK: 'indusind.com',
  TECHM: 'techmahindra.com',
  DIVISLAB: 'divislabs.com',
  DRREDDY: 'drreddys.com',
  CIPLA: 'cipla.com',
  BRITANNIA: 'britannia.co.in',
  EICHERMOT: 'eichertrucksandbuses.com',
  GRASIM: 'grasim.com',
  HEROMOTOCO: 'heromotocorp.com',
  BAJAJFINSV: 'bajajfinserv.in',
  BAJAJAUTO: 'bajajauto.com',
  ADANIPORTS: 'adaniports.com',
  'M&M': 'mahindra.com',
  MM: 'mahindra.com',
  ZOMATO: 'zomato.com',
  DMART: 'dmart.in',
  PAYTM: 'paytm.com',
  NYKAA: 'nykaa.com',
  PNB: 'pnbindia.in',
  BANKBARODA: 'bankofbaroda.in',
  CANBK: 'canarabank.com',
  IDEA: 'ideacellular.com',
  PFC: 'pfcindia.com',
  RECLTD: 'recindia.nic.in',
  GAIL: 'gailonline.com',
  AMBUJACEM: 'ambujacement.com',
  SHREECEM: 'shreecement.com',
  ACC: 'acclimited.com',
  JINDALSTEL: 'jindalsteelpower.com',
  VEDL: 'vedantaresources.com',
  HINDALCO: 'hindalco.com',
  TATAPOWER: 'tatapower.com',
  TATACONSUM: 'tataconsumer.com',
  BERGEPAINT: 'bergerpaints.com',
  DABUR: 'dabur.com',
  MARICO: 'marico.com',
  GODREJCP: 'godrejcp.com',
  COLPAL: 'colgatepalmolive.co.in',
  PIDILITIND: 'pidilite.com',
  HAVELLS: 'havells.com',
  BATAINDIA: 'bata.com',
  MCDOWELL: 'ubl.com',
  UBL: 'ubl.com',
  TORNTPHARM: 'torrentpharma.com',
  LUPIN: 'lupin.com',
  AUROPHARMA: 'aurobindo.com',
  BIOCON: 'biocon.com',
  SYNGENE: 'syngeneinternational.com',
  CADILAHC: 'zyduslife.com',
  PAGEIND: 'pageindustries.com',
  BOSCHLTD: 'bosch.in',
  MOTHERSON: 'motherson.com',
  BANDHANBNK: 'bandhanbank.com',
  FEDERALBNK: 'federalbank.co.in',
};

// Indices — never use Clearbit (they aren't companies). Use the 4 custom
// index logo files in /public/indices/ that the brand team supplied. If a
// particular index doesn't have a dedicated logo, fall back to the
// single-letter gradient avatar.
const INDEX_SYMBOLS = new Set([
  'NIFTY', 'SENSEX', 'BANKNIFTY', 'NIFTYFS', 'NIFTYIT',
  'NIFTYBANK', 'NIFTYNEXT50', 'NIFTYMIDCAP', 'NIFTYSMLCAP',
  'INDIAVIX', 'NIFTYPSE', 'NIFTYPHARMA', 'NIFTYAUTO', 'NIFTYMETAL',
  'NIFTYFMCG', 'NIFTYENERGY', 'NIFTYREALTY', 'NIFTYMEDIA',
  'FINNIFTY',
]);

// Real index logo files shipped in /public/indices/.
// FINNIFTY and NIFTYFS are aliases for the same index.
const INDEX_LOGO_FILES: Record<string, string> = {
  NIFTY: '/indices/nifty.png',
  SENSEX: '/indices/sensex.png',
  BANKNIFTY: '/indices/banknifty.png',
  FINNIFTY: '/indices/finnifty.jpeg',
  NIFTYFS: '/indices/finnifty.jpeg',
};

// Curated color palette — works in both light and dark mode.
// Each entry: [bg, text] Tailwind classes.
const AVATAR_COLORS: [string, string][] = [
  ['bg-blue-500/15', 'text-blue-600 dark:text-blue-400'],
  ['bg-indigo-500/15', 'text-indigo-600 dark:text-indigo-400'],
  ['bg-violet-500/15', 'text-violet-600 dark:text-violet-400'],
  ['bg-purple-500/15', 'text-purple-600 dark:text-purple-400'],
  ['bg-fuchsia-500/15', 'text-fuchsia-600 dark:text-fuchsia-400'],
  ['bg-pink-500/15', 'text-pink-600 dark:text-pink-400'],
  ['bg-rose-500/15', 'text-rose-600 dark:text-rose-400'],
  ['bg-red-500/15', 'text-red-600 dark:text-red-400'],
  ['bg-orange-500/15', 'text-orange-600 dark:text-orange-400'],
  ['bg-amber-500/15', 'text-amber-600 dark:text-amber-400'],
  ['bg-yellow-500/15', 'text-yellow-600 dark:text-yellow-400'],
  ['bg-lime-500/15', 'text-lime-600 dark:text-lime-400'],
  ['bg-green-500/15', 'text-green-600 dark:text-green-400'],
  ['bg-emerald-500/15', 'text-emerald-600 dark:text-emerald-400'],
  ['bg-teal-500/15', 'text-teal-600 dark:text-teal-400'],
  ['bg-cyan-500/15', 'text-cyan-600 dark:text-cyan-400'],
  ['bg-sky-500/15', 'text-sky-600 dark:text-sky-400'],
];

// Deterministic hash so a given symbol always gets the same color.
function hashSymbol(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getInitials(symbol: string): string {
  if (!symbol) return '?';
  const s = symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (s.length <= 2) return s;
  if (s.length <= 4) return s.slice(0, 2);
  // For longer symbols, take first letter + last letter — gives variety.
  return s[0] + s[s.length - 1];
}

function getColors(symbol: string): [string, string] {
  return AVATAR_COLORS[hashSymbol(symbol) % AVATAR_COLORS.length];
}

export type StockLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<StockLogoSize, { box: string; text: string }> = {
  xs: { box: 'h-6 w-6', text: 'text-[9px]' },
  sm: { box: 'h-8 w-8', text: 'text-[10px]' },
  md: { box: 'h-10 w-10', text: 'text-xs' },
  lg: { box: 'h-12 w-12', text: 'text-sm' },
  xl: { box: 'h-14 w-14', text: 'text-base' },
};

interface StockLogoProps {
  symbol: string;
  size?: StockLogoSize;
  className?: string;
  /** Optional — when true, the avatar background uses a gradient (for indices). */
  isIndex?: boolean;
  /** Optional — round vs square corners. Default: rounded-md */
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function StockLogo({
  symbol,
  size = 'sm',
  className,
  isIndex = false,
  rounded = 'md',
}: StockLogoProps) {
  const sym = (symbol || '').toUpperCase();
  const domain = STOCK_DOMAINS[sym];
  const isIdx = isIndex || INDEX_SYMBOLS.has(sym);
  const indexLogoFile = isIdx ? INDEX_LOGO_FILES[sym] : undefined;

  // For indices, never attempt Clearbit — only attempt our local logo files.
  // For stocks with no known domain, also skip the image attempt.
  const shouldTryImage = (!isIdx && !!domain) || !!indexLogoFile;
  const imgSrc = indexLogoFile
    ? indexLogoFile
    : domain
    ? `https://icon.horse/icon/${domain}`
    : null;

  const [imgError, setImgError] = useState(false);
  // Reset error state when symbol changes (component may be reused in lists)
  useEffect(() => {
    setImgError(false);
  }, [sym]);

  const sizeClass = SIZE_MAP[size];
  const roundedClass = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  const [bgColor, textColor] = getColors(sym);
  const initials = isIdx ? sym[0] || '?' : getInitials(sym);

  // If we don't try the image, or if the image already errored, render the avatar.
  if (!shouldTryImage || imgError || !imgSrc) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center font-bold font-heading select-none',
          sizeClass.box,
          roundedClass,
          isIdx
            ? 'bg-gradient-to-br from-brand-primary/20 to-accent-gold/20 text-brand-primary'
            : bgColor,
          textColor,
          className
        )}
        aria-label={sym}
        title={sym}
      >
        <span className={sizeClass.text}>{initials}</span>
      </div>
    );
  }

  // Render the real logo image with a hidden avatar underneath as fallback.
  // On image error, we swap to the avatar by setting imgError=true.
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden',
        sizeClass.box,
        roundedClass,
        isIdx ? 'bg-white' : 'bg-bg-surface-alt',
        className
      )}
      aria-label={sym}
      title={sym}
    >
      <img
        src={imgSrc}
        alt={`${sym} logo`}
        loading="lazy"
        onError={() => setImgError(true)}
        className={cn(
          'h-full w-full object-contain',
          isIdx ? 'p-0.5' : 'p-1'
        )}
      />
    </div>
  );
}

// Convenience helper — used anywhere to detect if a symbol is an index.
export function isIndexSymbol(symbol: string): boolean {
  return INDEX_SYMBOLS.has((symbol || '').toUpperCase());
}
