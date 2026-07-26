'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, PremiumBadge } from '@/components/shared/common';
import { formatINR, formatNumber, getPnlColor } from '@/lib/utils';
import { hasFeature } from '@/lib/tier';
import { Search, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { WatchlistItem } from '@/types';

export function WatchlistPage() {
  const { user, token } = useAuthStore();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const fetchWatchlist = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (err) {
      console.error('Watchlist fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWatchlist(); }, [token]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/market/search?q=${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch { /* ignore */ }
    setSearching(false);
  };

  const handleAdd = async (symbol: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (data.success) {
        fetchWatchlist();
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setError(data.error);
      }
    } catch { /* ignore */ }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await fetch(`/api/watchlist/${symbol}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWatchlist();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      {/* Add to watchlist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Add Stock</CardTitle>
          <p className="text-xs text-text-secondary">
            {user?.tier === 'FREE' ? `${items.length}/10 items (Free limit)` : 'Unlimited items (Premium)'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              placeholder="Search stocks to add..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-lg border border-border-default bg-bg-surface max-h-48 overflow-y-auto custom-scrollbar">
              {searchResults.map((s) => (
                <button
                  key={s.symbol}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-bg-surface-alt"
                  onClick={() => handleAdd(s.symbol)}
                >
                  <div>
                    <span className="font-medium text-text-primary">{s.symbol}</span>
                    <span className="ml-2 text-text-secondary">{s.name}</span>
                  </div>
                  <Plus className="h-4 w-4 text-brand-primary" />
                </button>
              ))}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-loss-red">{error}</p>}
        </CardContent>
      </Card>

      {/* Watchlist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">My Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Watchlist is empty"
              description="Add stocks to your watchlist to track their prices"
              action={
                <Button variant="outline" size="sm" onClick={() => document.querySelector('input')?.focus()}>
                  Add Stocks
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border-default p-3 gap-2">
                  <a href={`/stock/${item.symbol}`} className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
                    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md ${item.changePct >= 0 ? 'bg-profit-green/10' : 'bg-loss-red/10'}`}>
                      {item.changePct >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-profit-green" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-loss-red" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-text-primary truncate">{item.symbol}</p>
                      <p className="text-xs text-text-secondary truncate clamp-1">{item.name}</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold tabular-nums text-text-primary">
                        ₹{formatNumber(item.ltp)}
                      </p>
                      <p className={`font-mono text-xs tabular-nums ${getPnlColor(item.changePct)}`}>
                        {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-loss-red/10 hover:text-loss-red"
                      aria-label={`Remove ${item.symbol} from watchlist`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
