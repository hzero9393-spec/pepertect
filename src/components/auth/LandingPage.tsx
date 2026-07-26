'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp, Shield, GraduationCap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 safe-pt">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 sm:mb-6 flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <div className="live-dot-green" />
              <span className="text-xs sm:text-sm font-medium text-brand-primary">NSE Paper Trading Platform</span>
            </div>

            <h1 className="max-w-4xl font-heading text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-7xl">
              Master Trading
              <span className="block text-brand-primary">Without the Risk</span>
            </h1>

            <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-text-secondary px-2">
              Practice equity, futures &amp; options trading with virtual capital.
              Real-time market data, advanced analytics, and structured learning paths
              — all in one platform.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:gap-4 sm:flex-row w-full sm:w-auto px-4 sm:px-0">
              <a href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-brand-primary hover:bg-brand-primary-hover px-6 sm:px-8 text-white font-semibold">
                  Start Trading Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full border-border-default px-6 sm:px-8">
                  Sign In
                </Button>
              </a>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-text-secondary">
              Start with ₹1,00,000 virtual capital · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="Real-Time Market Data"
            description="Live NSE prices for equities, futures, and options. Option chain with Greeks, historical charts, and market depth."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Zero Risk Practice"
            description="Trade with virtual capital in a simulated environment. Test strategies, learn from mistakes, build confidence before going live."
          />
          <FeatureCard
            icon={<GraduationCap className="h-6 w-6" />}
            title="Structured Learning"
            description="Beginner to advanced modules covering technical analysis, options strategies, risk management, and trading psychology."
          />
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border-default bg-bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary">Simple Pricing</h2>
            <p className="mt-2 text-text-secondary">Start free, upgrade when ready</p>
            <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 max-w-lg mx-auto md:grid-cols-2">
              <div className="rounded-lg border border-border-default bg-bg-base p-5 sm:p-6">
                <p className="text-sm font-medium text-text-secondary">Free</p>
                <p className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-text-primary">₹0</p>
                <p className="mt-1 text-xs text-text-secondary">forever</p>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary text-left">
                  <li>✓ Equity Trading</li>
                  <li>✓ ₹1L Virtual Capital</li>
                  <li>✓ 10 Watchlist Items</li>
                  <li>✗ Futures &amp; Options</li>
                  <li>✗ Advanced Analytics</li>
                </ul>
                <a href="/register">
                  <Button variant="outline" className="mt-6 w-full" size="sm">Get Started</Button>
                </a>
              </div>
              <div className="rounded-lg border-2 border-brand-primary bg-bg-base p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-brand-primary">Premium</p>
                  <span className="rounded bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-gold">BEST</span>
                </div>
                <p className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-text-primary">₹299</p>
                <p className="mt-1 text-xs text-text-secondary">/month</p>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary text-left">
                  <li>✓ Everything in Free</li>
                  <li>✓ ₹10L Virtual Capital</li>
                  <li>✓ Futures &amp; Options</li>
                  <li>✓ Option Chain &amp; Greeks</li>
                  <li>✓ All Learning Modules</li>
                </ul>
                <a href="/subscription">
                  <Button className="mt-6 w-full bg-brand-primary hover:bg-brand-primary-hover text-white" size="sm">
                    Upgrade Now
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-default bg-bg-surface py-6 sm:py-8 safe-pb">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-primary" />
              <span className="font-heading font-bold text-text-primary">Pepertect</span>
            </div>
            <p className="text-xs text-text-secondary text-center">
              Paper trading platform for educational purposes only. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-5 sm:p-6">
      <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <h3 className="font-heading text-base sm:text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
    </div>
  );
}
