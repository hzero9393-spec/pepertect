'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/common';
import { formatNumber, formatINR, getPnlColor, cn } from '@/lib/utils';
import { Briefcase, XCircle, Layers, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import type { Position } from '@/types';
import { StockLogo } from '@/components/shared/StockLogo';

/* Index symbols — used to classify positions as Index vs Stock */
const INDEX_SYMBOLS = new Set(['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY']);

/* Helper: classify a position as Index or Stock */
function isIndexPosition(p: Position): boolean {
  return INDEX_SYMBOLS.has(p.symbol.toUpperCase()) || p.segment !== 'EQUITY';
}

export function PositionsPage() {
  const { token } = useAuthStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'index'>('stock');
  const [exitingAll, setExitingAll] = useState(false);
  const [confirmExitAll, setConfirmExitAll] = useState(false);

  useEffect(() => {
    const fetchPositions = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setPositions(data.data);
      } catch (err) {
        console.error('Positions fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPositions();
    // Auto-refresh every 10s to update LTP/PnL (24h retention is enforced server-side)
    const id = setInterval(fetchPositions, 10000);
    return () => clearInterval(id);
  }, [token]);

  const handleSquareOff = async (posId: string) => {
    try {
      const res = await fetch(`/api/positions/${posId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Position squared off successfully`);
        setPositions(positions.filter((p) => p.id !== posId));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to square off');
      }
    } catch {
      setMessage('Network error');
    }
  };

  /* ---------- Exit All (visible tab only) ---------- */
  const handleExitAll = async () => {
    const targets = filteredPositions;
    if (targets.length === 0) return;
    setExitingAll(true);
    let okCount = 0;
    let failCount = 0;
    // Sequentially square off to avoid race conditions on portfolio margin
    for (const p of targets) {
      try {
        const res = await fetch(`/api/positions/${p.id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          okCount++;
          setPositions((prev) => prev.filter((x) => x.id !== p.id));
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    setExitingAll(false);
    setConfirmExitAll(false);
    setMessage(
      failCount === 0
        ? `Successfully exited ${okCount} position${okCount !== 1 ? 's' : ''}`
        : `Exited ${okCount}, failed ${failCount}`
    );
    setTimeout(() => setMessage(''), 4000);
  };

  /* ---------- Filter by active tab ---------- */
  const stockPositions = positions.filter((p) => !isIndexPosition(p));
  const indexPositions = positions.filter((p) => isIndexPosition(p));
  const filteredPositions = activeTab === 'stock' ? stockPositions : indexPositions;

  const totalInvested = filteredPositions.reduce((sum, p) => sum + p.investedAmt, 0);
  const totalPnl = filteredPositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalQty = filteredPositions.reduce((s, p) => s + p.quantity, 0);

  return (
    <div className="space-y-6">
      {/* ============== TAB SWITCHER: Stock | Index ============== */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('stock')}
          className="seg-tab"
          data-active={activeTab === 'stock'}
        >
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Stock Trades
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
              {stockPositions.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab('index')}
          className="seg-tab"
          data-active={activeTab === 'index'}
        >
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Index Trades
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
              {indexPositions.length}
            </span>
          </span>
        </button>
        <div className="flex-1" />
        {/* Exit All button (only visible when there are open positions in this tab) */}
        {filteredPositions.length > 0 && !confirmExitAll && (
          <Button
            variant="outline"
            size="sm"
            className="text-loss-red border-loss-red/30 hover:bg-loss-red/10 h-9"
            onClick={() => setConfirmExitAll(true)}
          >
            <XCircle className="mr-1 h-3 w-3" /> Exit All ({filteredPositions.length})
          </Button>
        )}
      </div>

      {/* Exit All confirmation bar */}
      {confirmExitAll && (
        <div className="rounded-lg border border-loss-red/30 bg-tint-red p-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-loss-red shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              Exit all {filteredPositions.length} {activeTab === 'stock' ? 'stock' : 'index'} positions?
            </p>
            <p className="text-xs text-text-secondary">
              This will square off every open position in this tab at current market price. Action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setConfirmExitAll(false)}
            disabled={exitingAll}
            className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-bg-surface-alt"
          >
            Cancel
          </button>
          <button
            onClick={handleExitAll}
            disabled={exitingAll}
            className="h-9 px-4 rounded-lg bg-loss-red hover:bg-loss-red/90 text-white text-xs font-bold flex items-center gap-1.5"
          >
            {exitingAll ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Exiting...
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Yes, Exit All
              </>
            )}
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Open {activeTab === 'stock' ? 'Stock' : 'Index'} Positions</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{filteredPositions.length}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Total Invested</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{formatINR(totalInvested)}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Unrealized P&amp;L</p>
          <p className={`mt-1 font-mono text-xl font-bold ${getPnlColor(totalPnl)}`}>
            {totalPnl >= 0 ? '+' : ''}{formatINR(totalPnl)}
          </p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Total Quantity</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{totalQty}</p>
        </div>
      </div>

      {/* 24h retention notice */}
      <div className="rounded-lg bg-tint-blue/60 border border-brand-primary/20 px-3 py-2 text-xs text-text-secondary flex items-center gap-2">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
        Positions are auto-removed after 24 hours. Live LTP refreshes every 10 seconds.
      </div>

      {message && (
        <p className={`text-sm text-center font-medium ${message.includes('success') || message.includes('Exited') || message.includes('Successfully') ? 'text-profit-green' : 'text-loss-red'}`}>{message}</p>
      )}

      {/* Positions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">
            {activeTab === 'stock' ? 'Stock Positions' : 'Index Positions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
          ) : filteredPositions.length === 0 ? (
            <EmptyState
              icon={activeTab === 'stock' ? TrendingUp : Layers}
              title={activeTab === 'stock' ? 'No stock positions' : 'No index positions'}
              description={activeTab === 'stock' ? 'Place an equity order to see stock positions here' : 'Place an F&O order to see index positions here'}
              action={<a href="/trade"><Button size="sm">Start Trading</Button></a>}
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filteredPositions.map((pos) => (
                <div key={pos.id} className="rounded-lg border border-border-default bg-bg-base p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <StockLogo symbol={pos.symbol} size="md" rounded="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a href={`/stock/${pos.symbol}`} className="font-heading text-sm sm:text-base font-semibold text-text-primary hover:text-brand-primary">{pos.symbol}</a>
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            isIndexPosition(pos) ? 'bg-tint-purple text-info-purple' : 'bg-tint-blue text-brand-primary'
                          )}>
                            {isIndexPosition(pos) ? 'INDEX' : 'STOCK'}
                          </span>
                          <span className="rounded bg-bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">{pos.segment}</span>
                          {pos.optionType && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${pos.optionType === 'CE' ? 'bg-profit-green/10 text-profit-green' : 'bg-loss-red/10 text-loss-red'}`}>{pos.optionType}</span>}
                          {pos.strikePrice != null && pos.strikePrice > 0 && (
                            <span className="font-mono text-[10px] text-text-tertiary">Strike: {pos.strikePrice}</span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                          <span>{pos.side} · {pos.quantity} qty</span>
                          <span>Avg: ₹{formatNumber(pos.avgPrice)}</span>
                          {pos.currentPrice > 0 && <span>LTP: ₹{formatNumber(pos.currentPrice)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="text-right">
                        <p className={`font-mono text-sm sm:text-base font-bold tabular-nums ${getPnlColor(pos.pnl)}`}>
                          {pos.pnl >= 0 ? '+' : ''}₹{formatNumber(pos.pnl)}
                        </p>
                        <p className={`font-mono text-xs tabular-nums ${getPnlColor(pos.pnlPct)}`}>
                          {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-loss-red border-loss-red/30 hover:bg-loss-red/10 h-9"
                        onClick={() => handleSquareOff(pos.id)}
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Exit
                      </Button>
                    </div>
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
