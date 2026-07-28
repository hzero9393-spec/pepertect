'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn, formatINR } from '@/lib/utils';
import {
  Clock, Sparkles, Crown, Gift, Check, ArrowRight, Zap,
  CalendarDays, Timer, ChevronRight, Star, TrendingUp, Shield,
} from 'lucide-react';

interface TrialStatus {
  eligible: boolean;
  active: boolean;
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft?: number;
  secondsLeft?: number;
  startedAt: string | null;
  endsAt: string | null;
  plan: string;
  planPrice: number;
  durationDays: number;
  message: string;
  trialUsed?: boolean;
}

export default function FreeTrialPage() {
  const { token, user, login } = useAuthStore();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch trial status
  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/trial-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
        
        // If active, start countdown
        if (data.data.active && data.data.endsAt) {
          const endDate = new Date(data.data.endsAt).getTime();
          updateCountdown(endDate);
          
          // Clear existing interval
          if (intervalRef.current) clearInterval(intervalRef.current);
          
          // Update every second
          intervalRef.current = setInterval(() => updateCountdown(endDate), 1000);
        }
      }
    } catch (err) {
      console.error('Error fetching trial status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update countdown timer
  const updateCountdown = (endTime: number) => {
    const now = Date.now();
    const diff = Math.max(0, endTime - now);
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diff % (60 * 1000)) / 1000);

    setCountdown({ days, hours, minutes, seconds });

    // If countdown finished, clear interval and refresh status
    if (diff <= 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      fetchStatus(); // Refresh to get updated status
    }
  };

  useEffect(() => {
    fetchStatus();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token]);

  // Start trial for eligible users
  const startTrial = async () => {
    if (!token) return;
    
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
        
        // Start countdown if trial activated
        if (data.data.endsAt) {
          const endDate = new Date(data.data.endsAt).getTime();
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => updateCountdown(endDate), 1000);
          updateCountdown(endDate);
        }
      }
    } catch (err) {
      console.error('Error starting trial:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-primary/10 via-bg-surface to-accent-gold/5 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-text-primary">Pepertect</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Active Trial State - Show Countdown */}
        {status?.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Hero Card with Countdown */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-primary/5 via-bg-surface to-accent-gold/5 p-6 sm:p-8">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
              
              <div className="relative">
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-profit-green/10 border border-profit-green/20 mb-6">
                  <span className="h-2 w-2 rounded-full bg-profit-green animate-pulse" />
                  <span className="text-xs font-semibold text-profit-green uppercase tracking-wide">Premium Trial Active</span>
                </div>

                {/* Title */}
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                  Your Free Trial is Running! 🎉
                </h1>
                <p className="text-sm text-text-secondary mb-8 max-w-lg">
                  Enjoy all Premium features. Make the most of your remaining trial time.
                </p>

                {/* Countdown Timer */}
                <div className="bg-bg-base/80 backdrop-blur-sm rounded-2xl border border-border p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Timer className="h-5 w-5 text-brand-primary" />
                    <span className="text-sm font-semibold text-text-primary">Time Remaining</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 sm:gap-4">
                    {/* Days */}
                    <div className="bg-bg-surface rounded-xl p-3 sm:p-4 text-center border border-border">
                      <div className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
                        {String(countdown.days).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">Days</div>
                    </div>
                    
                    {/* Hours */}
                    <div className="bg-bg-surface rounded-xl p-3 sm:p-4 text-center border border-border">
                      <div className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">Hours</div>
                    </div>
                    
                    {/* Minutes */}
                    <div className="bg-bg-surface rounded-xl p-3 sm:p-4 text-center border border-border">
                      <div className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-text-primary">
                        {String(countdown.minutes).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">Minutes</div>
                    </div>
                    
                    {/* Seconds */}
                    <div className="bg-bg-surface rounded-xl p-3 sm:p-4 text-center border border-border">
                      <div className="font-heading text-3xl sm:text-4xl font-bold tabular-nums text-brand-primary">
                        {String(countdown.seconds).padStart(2, '0')}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">Seconds</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
                      <span>Trial Progress</span>
                      <span>{30 - countdown.days}d / 30d completed</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-bg-surface-alt overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand-primary to-accent-gold"
                        initial={{ width: 0 }}
                        animate={{ width: `${((30 - countdown.days + countdown.hours / 24) / 30) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: TrendingUp, title: 'Unlimited Trades', desc: 'No restrictions on trades' },
                { icon: Shield, title: 'Advanced Analytics', desc: 'Full P&L insights' },
                { icon: Star, title: 'Options & F&O', desc: 'Full derivatives access' },
                { icon: CalendarDays, title: 'Real-time Data', desc: 'Live market prices' },
                { icon: Gift, title: 'Learning Paths', desc: 'Premium courses' },
                { icon: Crown, title: 'Priority Support', desc: 'Fast response times' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-bg-surface hover:bg-bg-surface-alt transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint-blue">
                    <feature.icon className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{feature.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Upgrade CTA */}
            <div className="rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">Don't lose access to Premium!</p>
                <p className="text-xs text-text-secondary mt-0.5">Upgrade before trial ends to keep all features.</p>
              </div>
              <a
                href="/subscription"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-gold text-white text-sm font-semibold hover:bg-accent-gold/90 transition-colors whitespace-nowrap"
              >
                <Crown className="h-4 w-4" />
                Upgrade Now
              </a>
            </div>
          </motion.div>
        )}

        {/* Eligible State - Show Start CTA */}
        {status?.eligible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent-gold/10 via-bg-surface to-brand-primary/5 p-6 sm:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 mb-6">
                  <Gift className="h-4 w-4 text-accent-gold" />
                  <span className="text-xs font-semibold text-accent-gold uppercase tracking-wide">Limited Time Offer</span>
                </div>

                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                  Start Your Free Premium Trial
                </h1>
                <p className="text-sm text-text-secondary mb-6 max-w-lg">
                  Get 30 days of full Premium access — completely free. No credit card required.
                </p>

                <button
                  onClick={startTrial}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-all active:scale-[0.98] shadow-lg shadow-brand-primary/25"
                >
                  <Sparkles className="h-5 w-5" />
                  Activate Free Trial
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-xs text-text-tertiary mt-4 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-profit-green" />
                  One-time offer per account • Instant activation
                </p>
              </div>
            </div>

            {/* What's Included */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Zap, title: '₹10,00,000 Virtual Capital', desc: 'Premium tier balance' },
                { icon: TrendingUp, title: 'Unlimited Paper Trades', desc: 'Practice without limits' },
                { icon: Shield, title: 'Options & Futures', desc: 'Full F&O market access' },
                { icon: Star, title: 'Advanced Analytics', desc: 'Detailed P&L tracking' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-surface">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-blue">
                    <feature.icon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{feature.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Expired/Trial Used State */}
        {(status?.expired || status?.trialUsed) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-border bg-bg-surface p-6 sm:p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-tint-red/20 mb-4">
                <Clock className="h-8 w-8 text-loss-red" />
              </div>
              
              <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
                Free Trial Ended
              </h1>
              <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                Your free trial has been used. Upgrade to Premium to continue enjoying all features!
              </p>

              <a
                href="/subscription"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-all"
              >
                <Crown className="h-5 w-5" />
                View Premium Plans
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
