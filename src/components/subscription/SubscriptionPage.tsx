'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumBadge } from '@/components/shared/common';
import { formatINR } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Check, Zap, Crown, X, Sparkles, Clock, Gift } from 'lucide-react';
import type { Subscription } from '@/types';

const FEATURES = [
  { key: 'Equity Trading', free: true, premium: true },
  { key: 'Virtual Capital', free: '₹1,00,000', premium: '₹10,00,000' },
  { key: 'Watchlist Limit', free: '10 items', premium: 'Unlimited' },
  { key: 'Futures Trading', free: false, premium: true },
  { key: 'Options Trading', free: false, premium: true },
  { key: 'Option Chain & Greeks', free: false, premium: true },
  { key: 'Real-time Prices', free: false, premium: true },
  { key: 'Advanced Reports', free: false, premium: true },
  { key: 'All Learning Modules', free: false, premium: true },
  { key: 'Trading Challenges', free: false, premium: true },
  { key: 'Priority Support', free: false, premium: true },
];

export function SubscriptionPage() {
  const { user, token } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Trial status state
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [trialStatus, setTrialStatus] = useState<'active' | 'expired' | 'none'>('none');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        // Fetch subscription info
        const res = await fetch('/api/subscription', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setSubscription(data.data);

        // Fetch trial status
        const trialRes = await fetch('/api/user/trial-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const trialData = await trialRes.json();
        if (trialData.success && trialData.data) {
          if (trialData.data.active && trialData.data.endsAt) {
            setTrialStatus('active');
            setTrialEndsAt(new Date(trialData.data.endsAt));
          } else if (trialData.data.expired) {
            setTrialStatus('expired');
          }
        }
      } catch { /* ignore */ }
    };
    fetchData();
  }, [token]);

  // Countdown timer for trial
  useEffect(() => {
    if (!trialEndsAt) return;
    const updateTimer = () => {
      const now = new Date();
      const diff = trialEndsAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setTrialStatus('expired');
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'PREMIUM' }),
      });
      const data = await res.json();
      if (data.success) {
        // Mock: directly verify payment
        const verifyRes = await fetch('/api/subscription/verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: data.data.orderId, orderId: data.data.orderId }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          useAuthStore.getState().updateTier('PREMIUM');
          useAuthStore.getState().updateBalance(1000000);
          setSubscription(verifyData.data);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const isPremium = user?.tier === 'PREMIUM' || subscription?.plan === 'PREMIUM';
  const isTrialActive = trialStatus === 'active';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-text-primary">Choose Your Plan</h2>
        <p className="text-sm text-text-secondary mt-1">Start free, upgrade when you need more power</p>
      </div>

      {/* Active Trial Banner */}
      {isTrialActive && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-accent-gold/30 bg-gradient-to-r from-accent-gold/10 via-brand-primary/5 to-accent-gold/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-gold to-brand-primary">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-sm font-bold text-text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-gold" />
                Premium Trial Active
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                You are currently enjoying all PREMIUM features for FREE!
              </p>
              {/* Mini countdown */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/60 dark:bg-bg-surface/80 backdrop-blur-sm">
                <Clock className="h-3 w-3 text-text-tertiary" />
                <span className="font-mono text-[11px] font-semibold text-text-primary">
                  {String(timeLeft.days).padStart(2, '0')}d {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-text-tertiary">remaining</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 max-w-2xl mx-auto md:grid-cols-2">
        {/* Free Plan */}
        <Card className={isPremium || isTrialActive ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Free</CardTitle>
            <CardDescription>Perfect for beginners</CardDescription>
            <div className="mt-3">
              <span className="font-heading text-4xl font-bold text-text-primary">₹0</span>
              <span className="text-text-secondary text-sm"> /forever</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                {f.free === true ? <Check className="h-4 w-4 text-profit-green shrink-0" /> :
                 f.free === false ? <X className="h-4 w-4 text-text-secondary/50 shrink-0" /> :
                 <span className="text-xs">·</span>}
                <span className="text-text-primary">{f.key}</span>
                {typeof f.free === 'string' && <span className="ml-auto text-text-secondary text-xs">{f.free}</span>}
              </div>
            ))}
            {!isPremium && !isTrialActive && (
              <div className="pt-2 text-center">
                <Badge className="bg-bg-surface-alt text-text-secondary">Current Plan</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={cn(
          "relative overflow-hidden",
          isPremium 
            ? "border-2 border-brand-primary" 
            : isTrialActive 
              ? "border-2 border-accent-gold ring-4 ring-accent-gold/20" 
              : "border-accent-gold"
        )}>
          {/* ACTIVE Badge for Trial Users */}
          {isTrialActive && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-accent-gold via-brand-primary to-accent-gold text-white text-center py-1.5 text-[10px] font-bold uppercase tracking-widest">
              ✨ Currently Active — Free Trial
            </div>
          )}
          
          <CardHeader className={isTrialActive ? "pt-8" : ""}>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg">Premium</CardTitle>
              <div className="flex items-center gap-1.5">
                {isTrialActive ? (
                  <Badge className="bg-gradient-to-r from-accent-gold to-brand-primary text-white text-[9px] px-2 py-0.5">
                    <Sparkles className="h-3 w-3 mr-1" />
                    TRIAL
                  </Badge>
                ) : (
                  <PremiumBadge />
                )}
              </div>
            </div>
            <CardDescription>For serious traders</CardDescription>
            <div className="mt-3">
              <span className="font-heading text-4xl font-bold text-text-primary">₹299</span>
              <span className="text-text-secondary text-sm"> /month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                {f.premium === true ? <Check className="h-4 w-4 text-profit-green shrink-0" /> :
                 <span className="text-xs">·</span>}
                <span className="text-text-primary">{f.key}</span>
                {typeof f.premium === 'string' && <span className="ml-auto text-text-secondary text-xs font-mono">{f.premium}</span>}
              </div>
            ))}
            
            {/* Button Logic */}
            {isTrialActive ? (
              /* Trial Active - Show "Enjoying Free" button */
              <Button
                className="w-full mt-2 bg-gradient-to-r from-accent-gold to-brand-primary hover:from-accent-gold/90 hover:to-brand-primary/90 text-white font-semibold cursor-default"
                disabled
              >
                <Crown className="h-4 w-4 mr-1" />
                Enjoying Free Trial ({timeLeft.days}d left)
              </Button>
            ) : (
              /* Normal Upgrade Button */
              <Button
                className="w-full mt-2 bg-accent-gold hover:bg-accent-gold/90 text-white font-semibold"
                disabled={isPremium || loading}
                onClick={handleUpgrade}
              >
                {loading ? 'Processing...' : isPremium ? '✓ Active' : 'Upgrade Now'}
              </Button>
            )}
            
            {/* Show upgrade prompt when trial ending soon (< 2 days) */}
            {isTrialActive && timeLeft.days < 2 && (
              <div className="mt-2 p-2 rounded-lg bg-tint-red/20 border border-loss-red/30 text-center">
                <p className="text-[10px] font-semibold text-loss-red">
                  ⚠️ Trial ends soon! Upgrade to continue enjoying Premium features.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trial Expired - Special CTA */}
      {trialStatus === 'expired' && !isPremium && (
        <div className="max-w-2xl mx-auto mt-4 rounded-2xl border border-loss-red/30 bg-gradient-to-br from-loss-red/10 via-bg-surface to-tint-red/5 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tint-red">
              <Clock className="h-6 w-6 text-loss-red" />
            </div>
          </div>
          <h3 className="font-heading text-lg font-bold text-text-primary">Your Free Trial Has Ended</h3>
          <p className="text-sm text-text-secondary mt-1 mb-4">
            You enjoyed 30 days of Premium features! Upgrade now to continue accessing all premium tools.
          </p>
          <Button
            className="bg-loss-red hover:bg-loss-red/90 text-white font-semibold px-8"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upgrade Now — ₹299/month'}
          </Button>
        </div>
      )}
    </div>
  );
}
