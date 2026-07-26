'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/common';
import { formatNumber, formatINR, getPnlColor } from '@/lib/utils';
import { Briefcase, XCircle } from 'lucide-react';
import type { Position } from '@/types';

export function PositionsPage() {
  const { token } = useAuthStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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
      } else {
        setMessage(data.error || 'Failed to square off');
      }
    } catch {
      setMessage('Network error');
    }
  };

  const totalInvested = positions.reduce((sum, p) => sum + p.investedAmt, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Open Positions</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{positions.length}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Total Invested</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{formatINR(totalInvested)}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Unrealized P&L</p>
          <p className={`mt-1 font-mono text-xl font-bold ${getPnlColor(totalPnl)}`}>
            {totalPnl >= 0 ? '+' : ''}{formatINR(totalPnl)}
          </p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-surface p-4">
          <p className="text-xs text-text-secondary">Total Quantity</p>
          <p className="mt-1 font-mono text-xl font-bold text-text-primary">{positions.reduce((s, p) => s + p.quantity, 0)}</p>
        </div>
      </div>

      {message && (
        <p className={`text-sm text-center ${message.includes('success') ? 'text-profit-green' : 'text-loss-red'}`}>{message}</p>
      )}

      {/* Positions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-semibold">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-surface-alt" />)}</div>
          ) : positions.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No open positions"
              description="Start trading to see your positions here"
              action={<a href="/trade"><Button size="sm">Start Trading</Button></a>}
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {positions.map((pos) => (
                <div key={pos.id} className="rounded-lg border border-border-default bg-bg-base p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`/stock/${pos.symbol}`} className="font-heading text-sm sm:text-base font-semibold text-text-primary hover:text-brand-primary">{pos.symbol}</a>
                        <span className="rounded bg-bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">{pos.segment}</span>
                        {pos.optionType && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${pos.optionType === 'CE' ? 'bg-profit-green/10 text-profit-green' : 'bg-loss-red/10 text-loss-red'}`}>{pos.optionType}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                        <span>{pos.side} · {pos.quantity} qty</span>
                        <span>Avg: ₹{formatNumber(pos.avgPrice)}</span>
                        {pos.currentPrice > 0 && <span>LTP: ₹{formatNumber(pos.currentPrice)}</span>}
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
