'use client';

import { Badge } from '@/components/ui/badge';

export function LiveDot({ isLive = true }: { isLive?: boolean }) {
  return <div className={isLive ? 'live-dot-green' : 'live-dot-red'} />;
}

export function LiveLabel({ label, isLive = true }: { label: string; isLive?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <LiveDot isLive={isLive} />
      <span className="text-xs font-medium text-text-secondary">{label}</span>
    </div>
  );
}

export function PremiumBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <Badge
      className={
        size === 'sm'
          ? 'bg-accent-gold/20 text-accent-gold text-[10px] px-1.5 py-0.5 font-semibold'
          : 'bg-accent-gold/20 text-accent-gold text-xs px-2 py-0.5 font-semibold'
      }
    >
      PREMIUM
    </Badge>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-surface-alt">
        <Icon className="h-8 w-8 text-text-secondary" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PnlDisplay({ value, className }: { value: number; className?: string }) {
  const color = value >= 0 ? 'text-profit-green' : 'text-loss-red';
  const sign = value >= 0 ? '+' : '';
  const formatted = `${sign}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return <span className={cn('font-mono tabular-nums', color, className)}>{formatted}</span>;
}

import { cn } from '@/lib/utils';

export function StatCard({ label, value, subtext, icon: Icon, color }: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', color || 'bg-bg-surface-alt')}>
          <Icon className="h-4 w-4 text-text-secondary" />
        </div>
      </div>
      <p className="mt-2 font-mono text-xl font-bold tabular-nums text-text-primary">{value}</p>
      {subtext && <p className="mt-1 text-xs text-text-secondary">{subtext}</p>}
    </div>
  );
}
