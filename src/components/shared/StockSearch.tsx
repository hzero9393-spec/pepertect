'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn, formatNumber } from '@/lib/utils';
import { Search, X, Loader2, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { StockLogo, isIndexSymbol } from '@/components/shared/StockLogo';

interface SearchResult {
  id?: string;
  symbol: string;
  name: string;
  sector?: string | null;
  ltp?: number;
  change?: number;
  changePct?: number;
  exchange?: string;
}

interface Props {
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Optional className for the wrapper */
  className?: string;
  /** Optional callback when a result is selected (in addition to navigation) */
  onSelect?: (result: SearchResult) => void;
  /** Show a compact pill version (for tight spaces) */
  variant?: 'default' | 'compact';
}

/**
 * StockSearch — Universal search box used across the app.
 *
 * Behaviour:
 *  - Debounced search against /api/market/search (which now also lazy-seeds
 *    the 430+ stock universe on first call).
 *  - Results dropdown shows stock logo, symbol, name, sector + LTP/change.
 *  - Clicking a result navigates to /stock/<symbol> — which renders the
 *    StockDetailPage with the option chain overview, strikes, OI, etc.
 *  - Indices (NIFTY, BANKNIFTY, etc.) route to the same /stock/<symbol> page
 *    where the "View Option Chain" CTA appears.
 *  - Keyboard navigation: ArrowUp/ArrowDown/Enter/Esc.
 */
export function StockSearch({
  placeholder = 'Search stocks, indices, F&O...',
  autoFocus = false,
  className,
  onSelect,
  variant = 'default',
}: Props) {
  const { token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/market/search?q=${encodeURIComponent(query.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
          setHighlighted(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, token]);

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const selectResult = useCallback((r: SearchResult) => {
    if (onSelect) {
      onSelect(r);
      setOpen(false);
      setQuery('');
      return;
    }
    // Default: navigate to the stock detail page (which shows option chain overview)
    if (typeof window !== 'undefined') {
      window.location.href = `/stock/${encodeURIComponent(r.symbol)}`;
    }
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[highlighted];
      if (r) selectResult(r);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative', variant === 'compact' && 'max-w-[200px]', className)}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-bg-surface px-3 transition-all',
          variant === 'compact' ? 'h-9' : 'h-11',
          open && 'ring-2 ring-brand-primary/30 border-brand-primary/40'
        )}
      >
        <Search className={cn('text-text-tertiary shrink-0', variant === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none min-w-0"
          aria-label="Search stocks"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 text-brand-primary animate-spin shrink-0" />}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="text-text-tertiary hover:text-text-primary shrink-0"
            aria-label="Clear search"
          >
            <X className={cn(variant === 'compact' ? 'h-3 w-3' : 'h-4 w-4')} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && query.trim() && (
        <div className="absolute z-50 mt-2 w-full max-w-md card-soft p-1 max-h-[60vh] overflow-y-auto shadow-xl">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center">
              <Search className="h-6 w-6 text-text-tertiary mx-auto mb-1" />
              <p className="text-sm font-medium text-text-secondary">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-text-tertiary mt-0.5">Try a different symbol or company name.</p>
            </div>
          ) : (
            results.map((r, idx) => {
              const positive = (r.changePct ?? 0) >= 0;
              const isIdx = isIndexSymbol(r.symbol);
              return (
                <button
                  key={`${r.symbol}-${idx}`}
                  onClick={() => selectResult(r)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors',
                    highlighted === idx ? 'bg-bg-surface-alt' : 'hover:bg-bg-surface-alt/50'
                  )}
                >
                  <StockLogo
                    symbol={r.symbol}
                    size={variant === 'compact' ? 'xs' : 'sm'}
                    isIndex={isIdx}
                    rounded="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono text-sm font-semibold text-text-primary truncate">{r.symbol}</p>
                      {isIdx && (
                        <span className="pill bg-tint-blue text-brand-primary text-[9px] px-1.5 py-0">INDEX</span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary truncate">
                      {r.name}
                      {r.sector ? ` · ${r.sector}` : ''}
                    </p>
                  </div>
                  {typeof r.ltp === 'number' && r.ltp > 0 && (
                    <div className="text-right shrink-0 min-w-[70px]">
                      <p className="font-mono text-xs font-semibold tabular-nums text-text-primary">
                        ₹{formatNumber(r.ltp, 2)}
                      </p>
                      {typeof r.changePct === 'number' && (
                        <p className={cn(
                          'font-mono text-[10px] tabular-nums inline-flex items-center gap-0.5',
                          positive ? 'text-profit-green' : 'text-loss-red'
                        )}>
                          {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {positive ? '+' : ''}{r.changePct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
