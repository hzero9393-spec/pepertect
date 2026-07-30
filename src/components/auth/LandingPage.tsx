'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Zap,
  ArrowRight,
  Play,
  Users,
  Wallet,
  Activity,
  Layers,
  PieChart,
  Shield,
  GraduationCap,
  Eye,
  Star,
  BarChart3,
} from 'lucide-react';

/* ============================================================
   Pepertect Landing Page — Clean Fintech Style
   4 scrollable sections: Hero, Features, Social Proof, Final CTA
   ============================================================ */

/* ---------- IntersectionObserver fade-in hook ---------- */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FadeInSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, transform: 'translateY(20px)', transition: 'opacity 0.6s ease-out, transform 0.6s ease-out' }}
    >
      {children}
    </div>
  );
}

/* ---------- Data ---------- */
const FEATURES = [
  {
    icon: Activity,
    title: 'Real-time Market Data',
    description: 'Live prices from NSE with WebSocket streaming for instant updates',
  },
  {
    icon: Layers,
    title: 'Option Chain with Greeks',
    description: 'Full option chain with Delta, Gamma, Theta, Vega for informed decisions',
  },
  {
    icon: PieChart,
    title: 'Portfolio Analytics',
    description: 'Track your P&L, sector allocation, and trading performance',
  },
  {
    icon: Shield,
    title: 'Paper Trading',
    description: 'Practice strategies with virtual capital before risking real money',
  },
  {
    icon: GraduationCap,
    title: 'Learning Academy',
    description: 'Structured courses from basics to advanced options strategies',
  },
  {
    icon: Eye,
    title: 'Smart Watchlists',
    description: 'Track your favorite stocks and option strikes in custom groups',
  },
];

const TESTIMONIALS = [
  {
    name: 'Rahul M.',
    initials: 'RM',
    quote:
      'Pepertect helped me understand options trading without losing a single rupee. The option chain with Greeks is a game changer.',
  },
  {
    name: 'Priya S.',
    initials: 'PS',
    quote:
      'I practiced for 3 months here before opening my real Demat account. The virtual trading experience is incredibly realistic.',
  },
  {
    name: 'Arjun K.',
    initials: 'AK',
    quote:
      'The learning modules + paper trading combination is perfect. I went from zero knowledge to trading strangles confidently.',
  },
];

const STAT_BADGES = [
  { icon: Users, label: '10,000+ Traders' },
  { icon: Wallet, label: '₹1L Virtual Capital' },
  { icon: BarChart3, label: 'Real NSE Data' },
];

/* ============================================================ */

export function LandingPage() {
  const [email, setEmail] = useState('');

  /* ---------- Smooth scroll on html ---------- */
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  /* ---------- CTA handlers ---------- */
  const handleGetStarted = useCallback(() => {
    window.location.href = '/register';
  }, []);

  const handleWatchDemo = useCallback(() => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSubmitEmail = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (email.trim()) {
        window.location.href = '/register';
      }
    },
    [email],
  );

  return (
    <main className="min-h-screen flex flex-col">
      {/* ======================== SECTION 1: HERO ======================== */}
      <section className="relative min-h-screen flex items-center justify-center bg-bg-base overflow-hidden">
        {/* Subtle gradient overlay from bg-base to very faint brand-primary */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />

        {/* Large faded Zap decorative element — top-right */}
        <Zap className="absolute top-12 right-12 w-64 h-64 md:w-96 md:h-96 text-brand-primary opacity-[0.05] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-20 max-w-4xl mx-auto text-center">
          {/* Animated Zap icon with pulse glow */}
          <div className="relative mb-8">
            <div
              className="absolute inset-0 rounded-full bg-brand-primary/20 animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <div className="relative h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-tint-blue flex items-center justify-center">
              <Zap className="h-7 w-7 md:h-8 md:w-8 text-brand-primary" />
            </div>
          </div>

          {/* Main heading */}
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-text-primary leading-tight tracking-tight">
            Practice Trading Without
            <br className="hidden sm:block" /> Risking Real Money
          </h1>

          {/* Subheading */}
          <p className="mt-5 text-base md:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Master options, futures, and equity trading with ₹1,00,000 virtual capital. Real market
            data, zero risk.
          </p>

          {/* CTA button row */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={handleGetStarted}
              className="h-12 px-8 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm gap-2 shadow-lg shadow-brand-primary/25"
            >
              Start Trading Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleWatchDemo}
              className="h-12 px-8 rounded-xl border-border text-text-primary hover:bg-bg-surface-alt font-semibold text-sm gap-2"
            >
              <Play className="h-4 w-4" />
              Watch Demo
            </Button>
          </div>

          {/* Stat badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {STAT_BADGES.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <stat.icon className="h-4 w-4 text-text-tertiary" />
                <span className="text-xs text-text-secondary font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== SECTION 2: FEATURES GRID ======================== */}
      <section id="features" className="bg-bg-surface py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-12 md:mb-16">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary">
              Everything You Need to Trade Smarter
            </h2>
            <p className="mt-3 text-text-secondary">Professional tools designed for serious learners</p>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {FEATURES.map((feature) => (
              <FadeInSection key={feature.title}>
                <div className="rounded-xl border border-border bg-bg-surface p-5 md:p-6 hover:shadow-lg hover:shadow-brand-primary/5 hover:border-brand-primary/20 transition-all duration-300">
                  <div className="h-10 w-10 rounded-lg bg-tint-blue flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{feature.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== SECTION 3: SOCIAL PROOF ======================== */}
      <section className="bg-bg-base py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeInSection className="text-center mb-12 md:mb-16">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary">
              Join Thousands of Aspiring Traders
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {TESTIMONIALS.map((t) => (
              <FadeInSection key={t.name}>
                <div className="rounded-xl border border-border bg-bg-surface p-5 flex flex-col">
                  {/* 5 stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent-gold text-accent-gold" />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className="text-sm text-text-secondary italic leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  {/* Author */}
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-tint-blue flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-brand-primary">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                      <p className="text-xs text-text-tertiary">Paper Trader</p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== SECTION 4: FINAL CTA ======================== */}
      <section className="bg-bg-surface py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <FadeInSection>
            <div className="bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="font-heading text-2xl md:text-3xl font-bold">
                Ready to Start Your Trading Journey?
              </h2>
              <p className="mt-3 text-sm md:text-base text-white/80 max-w-md mx-auto">
                Join 10,000+ traders learning and practicing on Pepertect. No credit card needed.
              </p>

              {/* Email input + button */}
              <form
                onSubmit={handleSubmitEmail}
                className="mt-8 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-11 px-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm outline-none focus:border-white/40 transition-colors"
                  required
                />
                <Button
                  type="submit"
                  className="h-11 px-6 rounded-lg bg-white text-brand-primary font-bold text-sm hover:bg-white/90 whitespace-nowrap"
                >
                  Get Started Free
                </Button>
              </form>

              <p className="mt-4 text-xs text-white/70">Free forever. No credit card required.</p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ======================== FOOTER ======================== */}
      <footer className="border-t border-border bg-bg-surface py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-primary" />
            <span className="font-heading font-bold text-text-primary">Pepertect</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4 text-xs text-text-secondary" aria-label="Footer links">
            <a href="/terms" className="hover:text-text-primary transition-colors">
              Terms
            </a>
            <span className="text-border">|</span>
            <a href="/privacy" className="hover:text-text-primary transition-colors">
              Privacy
            </a>
            <span className="text-border">|</span>
            <a href="/disclaimer" className="hover:text-text-primary transition-colors">
              Disclaimer
            </a>
            <span className="text-border">|</span>
            <a href="/contact" className="hover:text-text-primary transition-colors">
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-text-tertiary">
            &copy; {new Date().getFullYear()} Pepertect. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
