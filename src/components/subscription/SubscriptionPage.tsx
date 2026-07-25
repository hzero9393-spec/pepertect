'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumBadge } from '@/components/shared/common';
import { formatINR } from '@/lib/utils';
import { Check, Zap, Crown, X } from 'lucide-react';
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

  useEffect(() => {
    const fetchSub = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/subscription', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setSubscription(data.data);
      } catch { /* ignore */ }
    };
    fetchSub();
  }, [token]);

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-bold text-text-primary">Choose Your Plan</h2>
        <p className="text-sm text-text-secondary mt-1">Start free, upgrade when you need more power</p>
      </div>

      <div className="grid gap-6 max-w-2xl mx-auto md:grid-cols-2">
        {/* Free Plan */}
        <Card className={isPremium ? 'opacity-60' : ''}>
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
            {!isPremium && (
              <div className="pt-2 text-center">
                <Badge className="bg-brand-primary/10 text-brand-primary">Current Plan</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`border-2 ${isPremium ? 'border-brand-primary' : 'border-accent-gold'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg">Premium</CardTitle>
              <PremiumBadge />
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
            <Button
              className="w-full mt-2 bg-accent-gold hover:bg-accent-gold/90 text-white font-semibold"
              disabled={isPremium || loading}
              onClick={handleUpgrade}
            >
              {loading ? 'Processing...' : isPremium ? '✓ Active' : 'Upgrade Now'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
