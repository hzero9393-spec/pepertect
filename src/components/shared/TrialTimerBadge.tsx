'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Clock, Sparkles, Crown, Gift, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/* ================================================================
   TYPES
   ================================================================ */

interface TrialStatus {
  eligible: boolean;
  active: boolean;
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  startedAt: string | null;
  endsAt: string | null;
  trialUsed?: boolean;
}

/* ================================================================
   TRIAL TIMER BADGE COMPONENT
   ================================================================ */

/**
 * TrialTimerBadge — Shows trial status in header/navigation.
 * 
 * States:
 * - ELIGIBLE: "Start Free Trial" CTA
 * - ACTIVE: Countdown timer (Xd Xh left)
 * - EXPIRED/USED: "Upgrade" link
 */
export function TrialTimerBadge({ className }: { className?: string }) {
  const { token, isAuthenticated } = useAuthStore();
  
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- Fetch trial status ---------- */
  const fetchStatus = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/trial-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('[TrialTimerBadge] Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchStatus();
    
    // Refresh every hour for active trials (to update countdown)
    const interval = status?.active ? setInterval(fetchStatus, 60 * 60 * 1000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [fetchStatus, status?.active]);

  /* ---------- Loading state ---------- */
  if (!isAuthenticated || loading) return null;
  if (!status) return null;

  /* ---------- ELIGIBLE: Show CTA ---------- */
  if (status.eligible) {
    return (
      <Link
        href="/onboarding"
        className={cn(
          'hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-gold/20 to-brand-primary/10 border border-accent-gold/30 px-3 py-1.5 text-xs font-semibold text-accent-gold hover:from-accent-gold/30 hover:to-brand-primary/15 transition-all',
          className
        )}
      >
        <Gift className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Start Free Trial</span>
        <span className="md:hidden">Trial</span>
      </Link>
    );
  }

  /* ---------- ACTIVE: Show countdown ---------- */
  if (status.active) {
    return (
      <Link
        href="/free-trial"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg bg-profit-green/10 border border-profit-green/20 px-3 py-1.5 text-xs font-medium transition-all hover:bg-profit-green/15',
          className
        )}
        title={`Trial ends: ${new Date(status.endsAt || '').toLocaleDateString()}`}
      >
        <Clock className="h-3.5 w-3.5 text-profit-green" />
        <span className="text-profit-green font-semibold tabular-nums">
          {status.daysLeft}d {status.hoursLeft}h
        </span>
        <Sparkles className="h-3 w-3 text-profit-green" />
      </Link>
    );
  }

  /* ---------- EXPIRED/USED: Show upgrade ---------- */
  if (status.expired || status.trialUsed) {
    return (
      <Link
        href="/subscription"
        className={cn(
          'hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-tint-red/50 border border-loss-red/20 px-3 py-1.5 text-xs font-medium text-loss-red hover:bg-tint-red transition-all',
          className
        )}
      >
        <Crown className="h-3.5 w-3.5" />
        <span>Upgrade</span>
      </Link>
    );
  }

  // Default: don't render anything
  return null;
}

/* ================================================================
   MOBILE TRIAL TIMER (compact version for mobile nav)
   ================================================================ */

export function MobileTrialIndicator() {
  const { token, isAuthenticated } = useAuthStore();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    
    const fetch = async () => {
      try {
        const res = await fetch('/api/user/trial-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success?.data) {
          setActive(data.data.active);
          setEligible(data.data.eligible);
          setDaysLeft(data.data.active ? data.data.daysLeft : null);
        }
      } catch {}
    };
    fetch();
  }, [token, isAuthenticated]);

  if (!isAuthenticated) return null;

  // Show green dot for active trial
  if (active && daysLeft !== null) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-profit-green/10">
        <span className="h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse" />
        <span className="text-[10px] font-medium text-profit-green">{daysLeft}d</span>
      </div>
    );
  }

  // Show gift icon for eligible users
  if (eligible) {
    return (
      <Link href="/onboarding" className="flex items-center justify-center p-1.5 rounded-lg bg-accent-gold/20">
        <Gift className="h-4 w-4 text-accent-gold" />
      </Link>
    );
  }

  return null;
}
