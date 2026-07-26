'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatINR, formatNumber, cn } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Loader2,
  Filter,
  Download,
  Info,
} from 'lucide-react';

/* ---------------- Types ---------------- */
interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'TRADE_SETTLEMENT';
  amount: number;
  balance: number;
  description: string;
  reference?: string | null;
  createdAt: string;
}

interface Summary {
  totalCredit: number;
  totalDebit: number;
  net: number;
  currentBalance: number;
}

type FilterType = 'ALL' | 'CREDIT' | 'DEBIT';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CREDIT', label: 'Credit' },
  { key: 'DEBIT', label: 'Debit' },
];

/* ---------------- Helpers ---------------- */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeDay(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(iso);
  that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return that.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ---------------- Component ---------------- */
export function TransactionHistoryPage() {
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setTransactions(data.data);
          setSummary(data.summary ?? null);
        }
      } catch (err) {
        console.error('Transaction history fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  // Group by day for a ledger-style display
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = relativeDay(tx.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* ============== HEADER ============== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Wallet History
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Every credit &amp; debit in your virtual wallet — full ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/portfolio"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-surface-alt"
          >
            <Wallet className="h-3.5 w-3.5" />
            Portfolio
          </a>
        </div>
      </div>

      {/* ============== SUMMARY CARDS ============== */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <SummaryCard
          icon={Wallet}
          tint="bg-tint-blue"
          color="text-brand-primary"
          label="Current Balance"
          value={formatINR(summary?.currentBalance ?? 0)}
        />
        <SummaryCard
          icon={ArrowDownLeft}
          tint="bg-tint-green"
          color="text-profit-green"
          label="Total Credited"
          value={
            <span className="text-profit-green">
              +{formatINR(summary?.totalCredit ?? 0)}
            </span>
          }
        />
        <SummaryCard
          icon={ArrowUpRight}
          tint="bg-tint-red"
          color="text-loss-red"
          label="Total Debited"
          value={
            <span className="text-loss-red">
              −{formatINR(summary?.totalDebit ?? 0)}
            </span>
          }
        />
        <SummaryCard
          icon={(summary?.net ?? 0) >= 0 ? TrendingUp : TrendingDown}
          tint={(summary?.net ?? 0) >= 0 ? 'bg-tint-green' : 'bg-tint-red'}
          color={(summary?.net ?? 0) >= 0 ? 'text-profit-green' : 'text-loss-red'}
          label="Net Flow"
          value={
            <span className={(summary?.net ?? 0) >= 0 ? 'text-profit-green' : 'text-loss-red'}>
              {(summary?.net ?? 0) >= 0 ? '+' : '−'}
              {formatINR(Math.abs(summary?.net ?? 0))}
            </span>
          }
        />
      </div>

      {/* ============== FILTER PILLS ============== */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-text-secondary" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              filter === f.key
                ? 'bg-brand-primary text-white'
                : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface'
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[11px] text-text-tertiary hidden sm:inline">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ============== LEDGER ============== */}
      {loading ? (
        <div className="card-soft p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading ledger…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-soft p-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-surface-alt mb-3">
            <Receipt className="h-7 w-7 text-text-secondary" />
          </div>
          <p className="font-heading text-sm font-semibold text-text-primary">No transactions yet</p>
          <p className="text-xs text-text-secondary mt-1 max-w-sm">
            Your wallet activity will appear here once you place trades. Every buy (debit) and sell / exit (credit) is recorded.
          </p>
          <a
            href="/trade"
            className="mt-4 rounded-lg bg-brand-primary text-white px-4 py-2 text-xs font-semibold hover:bg-brand-primary-hover inline-flex items-center gap-1.5"
          >
            Start Trading →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dayLabel, txns]) => {
            const dayNet = txns.reduce(
              (sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount),
              0
            );
            return (
              <div key={dayLabel} className="card-soft overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-surface-alt">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    {dayLabel}
                  </p>
                  <p
                    className={cn(
                      'font-mono text-[11px] font-semibold tabular-nums',
                      dayNet >= 0 ? 'text-profit-green' : 'text-loss-red'
                    )}
                  >
                    {dayNet >= 0 ? '+' : '−'}₹{formatNumber(Math.abs(dayNet), 2)}
                  </p>
                </div>
                {/* Day transactions */}
                <div className="divide-y divide-border">
                  {txns.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-bg-surface-alt transition-colors"
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                            isCredit ? 'bg-tint-green' : 'bg-tint-red'
                          )}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="h-4 w-4 text-profit-green" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-loss-red" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary leading-snug">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">
                            {formatDateTime(tx.createdAt)} · {tx.type}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={cn(
                              'font-mono text-sm font-bold tabular-nums',
                              isCredit ? 'text-profit-green' : 'text-loss-red'
                            )}
                          >
                            {isCredit ? '+' : '−'}₹{formatNumber(tx.amount, 2)}
                          </p>
                          <p className="font-mono text-[10px] text-text-tertiary mt-0.5 tabular-nums">
                            Bal ₹{formatNumber(tx.balance, 2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============== INFO BANNER ============== */}
      <div className="rounded-lg border border-border bg-bg-surface p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-secondary leading-relaxed">
          Ledger shows every wallet movement: <span className="text-profit-green font-semibold">Credit (green)</span> = money in (sells, exits, initial capital).{' '}
          <span className="text-loss-red font-semibold">Debit (red)</span> = money out (buys, brokerage). Running balance is shown after each entry.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Sub-component ---------------- */
function SummaryCard({
  icon: Icon,
  tint,
  color,
  label,
  value,
}: {
  icon: React.ElementType;
  tint: string;
  color: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="card-soft p-3.5">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium text-text-secondary">{label}</p>
        <div className={cn('icon-tile-sm', tint)}>
          <Icon className={cn('h-3.5 w-3.5', color)} />
        </div>
      </div>
      <p className="mt-1.5 font-mono text-base sm:text-lg font-bold tabular-nums text-text-primary">
        {value}
      </p>
    </div>
  );
}
