'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Gift, Clock, Sparkles, ArrowRight, Loader2, CheckCircle2, Crown,
  XCircle, Info,
} from 'lucide-react';

interface TrialStatus {
  eligible: boolean;
  active: boolean;
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  startedAt: string | null;
  endsAt: string | null;
  plan: string;
  planPrice: number;
  durationDays: number;
  message: string;
  trialUsed?: boolean; // NEW: track if trial was already used
}

interface Props {
  /** 'card' = standalone card with full content; 'banner' = compact horizontal banner */
  variant?: 'card' | 'banner';
  className?: string;
}

/**
 * FreeTrialWidget — shows the user's current trial status with a CTA.
 *
 * - If eligible (never started): prominent "Start Free Trial" CTA card.
 * - If active: countdown card with days/hours remaining + "View Details".
 * - If expired: subtle "Trial ended" banner linking to /subscription.
 * - If trial already used (trialUsed=true): shows "Already Activated" message.
 * - If user already has PREMIUM (paid): renders null (no trial messaging).
 */
export function FreeTrialWidget({ variant = 'card', className }: Props) {
  const { token, user, login } = useAuthStore();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/trial-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch (err) {
      console.error('Trial widget fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const startTrial = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/user/trial-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
        if (user) login({ ...user, tier: 'PREMIUM' }, token!);
        setTimeout(() => fetchStatus(), 500);
      } else {
        // Check if error is "already used"
        if (data.error?.includes('already') || data.error?.includes('used')) {
          setStatus(prev => prev ? { ...prev, eligible: false, expired: true, trialUsed: true, message: data.error } : null);
        }
        setError(data.error || 'Failed to start trial');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    if (variant === 'banner') return null;
    return (
      <div className={cn('card-soft p-4 animate-pulse', className)}>
        <div className="h-4 w-32 rounded bg-bg-surface-alt mb-2" />
        <div className="h-3 w-48 rounded bg-bg-surface-alt" />
      </div>
    );
  }

  // If user is already on PREMIUM (paid) or not eligible for any trial messaging — hide.
  if (!status || (!status.eligible && !status.active && !status.expired)) return null;

  // ------- BANNER VARIANT -------
  if (variant === 'banner') {
    if (status.active) {
      return (
        <a
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-primary/10 to-accent-gold/10 border border-brand-primary/20 px-4 py-2.5 hover:from-brand-primary/15 hover:to-accent-gold/15 transition-colors',
            className
          )}
        >
          <Clock className="h-4 w-4 text-brand-primary shrink-0" />
          <p className="text-xs font-medium text-text-primary flex-1 min-w-0 truncate">
            <span className="text-brand-primary font-semibold">Premium Trial Active:</span>{' '}
            {status.daysLeft}d {status.hoursLeft}h left
          </p>
          <ArrowRight className="h-3.5 w-3.5 text-brand-primary shrink-0" />
        </a>
      );
    }
    
    // Trial already used - show subtle message
    if (status.trialUsed || (status.expired && !status.eligible)) {
      return (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-bg-surface-alt border border-border px-4 py-2.5',
            className
          )}
        >
          <CheckCircle2 className="h-4 w-4 text-text-tertiary shrink-0" />
          <p className="text-xs font-medium text-text-tertiary flex-1 min-w-0 truncate">
            Free Trial Already Used
          </p>
        </div>
      );
    }
    
    if (status.expired) {
      return (
        <a
          href="/subscription"
          className={cn(
            'flex items-center gap-3 rounded-xl bg-tint-red/50 border border-loss-red/20 px-4 py-2.5 hover:bg-tint-red transition-colors',
            className
          )}
        >
          <Crown className="h-4 w-4 text-loss-red shrink-0" />
          <p className="text-xs font-medium text-text-primary flex-1 min-w-0 truncate">
            Trial ended — <span className="text-loss-red font-semibold">Upgrade to PREMIUM</span>
          </p>
          <ArrowRight className="h-3.5 w-3.5 text-loss-red shrink-0" />
        </a>
      );
    }
    
    // eligible — navigate to onboarding flow
    return (
      <a
        href="/onboarding"
        className={cn(
          'flex items-center gap-3 w-full rounded-xl bg-gradient-to-r from-accent-gold/20 to-brand-primary/10 border border-accent-gold/30 px-4 py-2.5 hover:from-accent-gold/30 hover:to-brand-primary/15 transition-colors',
          className
        )}
      >
        <Gift className="h-4 w-4 text-accent-gold shrink-0" />
        <p className="text-xs font-medium text-text-primary flex-1 min-w-0 truncate">
          <span className="text-accent-gold font-semibold">30 Days Free PREMIUM</span>{' '}
          — claim now
        </p>
        <ArrowRight className="h-3.5 w-3.5 text-accent-gold shrink-0" />
      </a>
    );
  }

  // ------- CARD VARIANT -------
  
  // TRIAL ALREADY USED - show message (NOT eligible, NOT active, but has history)
  if (status.trialUsed || (status.expired && status.startedAt)) {
    return (
      <div className={cn('card-soft p-4 bg-bg-surface-alt border border-border', className)}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-text-tertiary" />
          <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">Trial Used</span>
        </div>
        <p className="font-heading text-sm font-bold text-text-primary mb-1">
          Free Trial Already Activated
        </p>
        <p className="text-xs text-text-secondary mb-3">
          You've already used your one-time free trial. Upgrade to PREMIUM to continue enjoying all features!
        </p>
        <a
          href="/subscription"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-primary text-white text-xs font-bold px-4 hover:bg-brand-primary-hover transition-colors"
        >
          <Crown className="h-3.5 w-3.5" />
          Upgrade Now
        </a>
      </div>
    );
  }
  
  if (status.active) {
    const totalHoursLeft = status.daysLeft * 24 + status.hoursLeft;
    const progressPct = Math.max(0, Math.min(100, ((30 * 24 - totalHoursLeft) / (30 * 24)) * 100));
    return (
      <div className={cn('card-soft p-4 relative overflow-hidden', className)}>
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-tint-blue blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-profit-green animate-pulse" />
            <span className="text-xs font-semibold text-profit-green uppercase tracking-wide">
              Premium Trial Active
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-heading text-2xl font-bold tabular-nums text-text-primary">{status.daysLeft}</span>
            <span className="text-xs text-text-secondary">days</span>
            <span className="font-heading text-xl font-bold tabular-nums text-text-primary ml-2">{status.hoursLeft}</span>
            <span className="text-xs text-text-secondary">hours left</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-bg-surface-alt overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-primary to-accent-gold transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-profit-green/10 border border-profit-green/20">
            <p className="text-[11px] text-profit-green font-medium flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Enjoying all Premium features! Upgrade before trial ends to keep access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.expired) {
    return (
      <div className={cn('card-soft p-4 bg-tint-red/30 border border-loss-red/20', className)}>
        <Crown className="h-6 w-6 text-loss-red" />
        <p className="mt-2 font-heading text-sm font-bold text-text-primary">Trial Ended</p>
        <p className="mt-1 text-xs text-text-secondary">
          Your 30-day free PREMIUM trial has ended. Upgrade to keep all features.
        </p>
        <a
          href="/subscription"
          className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-loss-red text-white text-xs font-bold px-3 hover:bg-loss-red/90 transition-colors"
        >
          Upgrade Now <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // eligible - show Start Free Trial
  return (
    <div className={cn('card-soft p-4 bg-gradient-to-br from-accent-gold/10 to-brand-primary/5 border border-accent-gold/30 relative overflow-hidden', className)}>
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-gold/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-accent-gold" />
          <span className="text-xs font-semibold text-accent-gold uppercase tracking-wide">Limited Offer</span>
        </div>
        <p className="mt-2 font-heading text-base font-bold text-text-primary">
          30 Days of PREMIUM — Free
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          Unlock unlimited trades, advanced analytics, and AI insights. One-time offer, no card required.
        </p>
        {error && <p className="mt-2 text-xs text-loss-red font-medium">{error}</p>}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={startTrial}
            disabled={starting}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-white text-xs font-bold px-4 transition-colors",
              starting 
                ? "bg-brand-primary/50 cursor-not-allowed" 
                : "bg-brand-primary hover:bg-brand-primary-hover"
            )}
          >
            {starting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Activate Free Trial
              </>
            )}
          </button>
          <a
            href="/free-trial"
            className="inline-flex h-9 items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            Learn more <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
