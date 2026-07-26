'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Zap, ArrowRight, TrendingUp, Shield, GraduationCap, CandlestickChart,
  Layers, Eye, BarChart3, Clock, Lock, Sparkles, Check, X, ChevronDown,
  Activity, Wallet, LineChart, Target, Newspaper, Bell,
} from 'lucide-react';

/* ============================================================
   Pepertect Public Landing Page
   - 10 full-screen tour slides auto-scroll every 3 seconds
   - Skip button (top-right) jumps directly to the main CTA section
   - After slide 10, auto-scroll stops at the CTA section
   - Manual scroll / wheel / touch pauses the timer for 6s
   - Full-screen on desktop (no max-width cap on the tour slides)
   ============================================================ */

const TOUR_SLIDE_COUNT = 10;
const SLIDE_INTERVAL_MS = 3000;
const PAUSE_AFTER_INTERACTION_MS = 6000;

export function LandingPage() {
  // currentSlide: 0..TOUR_SLIDE_COUNT-1 = tour slides; TOUR_SLIDE_COUNT = main CTA section
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const ctaRef = useRef<HTMLElement | null>(null);
  const skipTargetRef = useRef<HTMLDivElement | null>(null);
  const pausedUntilRef = useRef<number>(0);

  /* ---------- Auto-scroll timer ---------- */
  useEffect(() => {
    if (isPaused) return;
    if (currentSlide >= TOUR_SLIDE_COUNT) return; // reached CTA — stop

    const timer = setTimeout(() => {
      const next = currentSlide + 1;
      if (next >= TOUR_SLIDE_COUNT) {
        // Advance to CTA section
        skipTargetRef.current?.scrollIntoView({ behavior: 'smooth' });
        setCurrentSlide(TOUR_SLIDE_COUNT);
      } else {
        slideRefs.current[next]?.scrollIntoView({ behavior: 'smooth' });
        setCurrentSlide(next);
      }
    }, SLIDE_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [currentSlide, isPaused]);

  /* ---------- Track which slide is in view (manual scroll sync) ---------- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idxAttr = entry.target.getAttribute('data-slide-index');
          if (idxAttr == null) return;
          const idx = parseInt(idxAttr, 10);
          if (!Number.isNaN(idx)) {
            setCurrentSlide((prev) => (prev === idx ? prev : idx));
          }
        });
      },
      { threshold: 0.55 }
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => observer.disconnect();
  }, []);

  /* ---------- Pause on user interaction (wheel / touch / keydown) ---------- */
  useEffect(() => {
    const handleInteraction = () => {
      pausedUntilRef.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
      setIsPaused(true);
    };
    const handleResume = () => {
      if (Date.now() >= pausedUntilRef.current) {
        setIsPaused(false);
      } else {
        // Schedule a re-check
        const remaining = pausedUntilRef.current - Date.now();
        setTimeout(() => {
          if (Date.now() >= pausedUntilRef.current) setIsPaused(false);
        }, remaining + 50);
      }
    };

    window.addEventListener('wheel', handleInteraction, { passive: true });
    window.addEventListener('touchmove', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('scroll', handleResume, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('scroll', handleResume);
    };
  }, []);

  /* ---------- Skip button ---------- */
  const handleSkip = useCallback(() => {
    pausedUntilRef.current = Date.now() + 999999; // effectively paused
    setIsPaused(true);
    setCurrentSlide(TOUR_SLIDE_COUNT);
    skipTargetRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---------- Slide registration helper ---------- */
  const setSlideRef = (idx: number) => (el: HTMLElement | null) => {
    slideRefs.current[idx] = el;
  };

  return (
    <div className="bg-bg-base text-text-primary">
      {/* ===================== TOP PROGRESS BAR + SKIP ===================== */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 sm:px-6 safe-pt">
        {/* Brand — always visible */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setCurrentSlide(0);
            pausedUntilRef.current = 0;
            setIsPaused(false);
          }}
          className="flex items-center gap-2 rounded-full bg-bg-surface/80 backdrop-blur-md border border-border-default px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary">
            <Zap className="h-3.5 w-3.5 text-white" fill="currentColor" />
          </div>
          <span className="font-heading text-sm font-bold">Pepertect</span>
        </a>

        {/* Progress dots — only visible during tour */}
        {currentSlide < TOUR_SLIDE_COUNT && (
          <div className="hidden sm:flex flex-1 items-center justify-center gap-1.5">
            {Array.from({ length: TOUR_SLIDE_COUNT + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i < TOUR_SLIDE_COUNT) {
                    slideRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
                    setCurrentSlide(i);
                    pausedUntilRef.current = 0;
                    setIsPaused(false);
                  } else {
                    handleSkip();
                  }
                }}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? 'w-8 bg-brand-primary'
                    : i < currentSlide
                    ? 'w-3 bg-brand-primary/50'
                    : 'w-3 bg-text-tertiary/30 hover:bg-text-tertiary/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* On CTA section, show Sign In / Get Started shortcuts instead of Skip */}
        {currentSlide >= TOUR_SLIDE_COUNT ? (
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="hidden sm:inline-flex items-center rounded-full bg-bg-surface/90 backdrop-blur-md border border-border-default px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-sm hover:bg-bg-surface-alt transition-colors no-select"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover transition-colors no-select"
            >
              Start Free
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <>
            <div className="flex-1 sm:flex-none" />
            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 rounded-full bg-bg-surface/90 backdrop-blur-md border border-border-default px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm hover:bg-bg-surface-alt transition-colors no-select"
            >
              Skip
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Pause indicator */}
      {isPaused && currentSlide < TOUR_SLIDE_COUNT && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full bg-bg-surface/90 backdrop-blur-md border border-border-default px-4 py-1.5 text-xs text-text-secondary shadow-md no-select">
          Paused — scroll to explore, or wait to resume
        </div>
      )}

      {/* ===================== TOUR SLIDES ===================== */}
      {/* Slide 1 — Hero Welcome */}
      <TourSlide
        index={0}
        setRef={setSlideRef(0)}
        bg="hero"
        center
      >
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-2 rounded-full bg-brand-primary/10 px-4 py-2">
            <div className="live-dot-green" />
            <span className="text-sm font-medium text-brand-primary">NSE Paper Trading Platform</span>
          </div>

          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-primary shadow-lg shadow-brand-primary/30 sm:h-24 sm:w-24">
            <Zap className="h-10 w-10 text-white sm:h-12 sm:w-12" fill="currentColor" />
          </div>

          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Welcome to <span className="text-brand-primary">Pepertect</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg lg:text-xl text-text-secondary leading-relaxed">
            India's modern paper-trading platform. Practice equity, futures &amp; options
            with virtual capital — real-time NSE data, advanced analytics, and structured
            learning paths, all in one place.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-profit-green" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-profit-green" /> ₹1,00,000 virtual capital
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-profit-green" /> Real-time NSE prices
            </span>
          </div>
        </div>
      </TourSlide>

      {/* Slide 2 — Real-Time Market Data */}
      <TourSlide
        index={1}
        setRef={setSlideRef(1)}
        bg="light"
      >
        <SlideLayout
          icon={<TrendingUp className="h-7 w-7" />}
          iconColor="blue"
          eyebrow="Live Market Data"
          title="Real-Time NSE Prices"
          subtitle="Live quotes for equities, futures, and options — refreshed every few seconds, with historical charts, market depth, and intraday moves."
          bullets={[
            'Equities, F&O, and index quotes',
            'Intraday & historical candle charts',
            'Market depth (top 5 bid/ask)',
            'Index movers and sector heatmaps',
          ]}
          visual={<TickerTapeVisual />}
        />
      </TourSlide>

      {/* Slide 3 — Trade Any Asset Class */}
      <TourSlide
        index={2}
        setRef={setSlideRef(2)}
        bg="surface"
      >
        <SlideLayout
          icon={<CandlestickChart className="h-7 w-7" />}
          iconColor="purple"
          eyebrow="Multi-Asset Trading"
          title="Trade Equities, Futures & Options"
          subtitle="One order ticket for every asset class. Market, limit, and SL orders with quantity stepper and live margin preview."
          bullets={[
            'Equity delivery & intraday',
            'Stock & index futures',
            'Stock & index options',
            'Bracket and cover orders',
          ]}
          visual={<AssetClassVisual />}
        />
      </TourSlide>

      {/* Slide 4 — Option Chain with Greeks */}
      <TourSlide
        index={3}
        setRef={setSlideRef(3)}
        bg="light"
      >
        <SlideLayout
          icon={<Layers className="h-7 w-7" />}
          iconColor="cyan"
          eyebrow="Option Chain"
          title="Option Chain with Greeks"
          subtitle="Full CE/PE chain for NIFTY 50, SENSEX, BANK NIFTY, and FIN NIFTY — with OI, volume, IV, LTP, and ATM highlighting."
          bullets={[
            '4 indices: NIFTY, SENSEX, BANKNIFTY, FINNIFTY',
            'OI, volume, IV, LTP per strike',
            'ATM highlight & ITM shading',
            'Weekly expiry switcher',
          ]}
          visual={<OptionChainVisual />}
        />
      </TourSlide>

      {/* Slide 5 — Zero Risk Practice */}
      <TourSlide
        index={4}
        setRef={setSlideRef(4)}
        bg="surface"
      >
        <SlideLayout
          icon={<Shield className="h-7 w-7" />}
          iconColor="green"
          eyebrow="Risk-Free Practice"
          title="Zero Risk. Real Practice."
          subtitle="Trade with virtual capital in a simulated environment. Test strategies, learn from mistakes, and build confidence before going live."
          bullets={[
            '₹1,00,000 virtual capital on Free tier',
            '₹10,00,000 virtual capital on Premium',
            'Real-time fills at live market prices',
            'Reset your capital anytime',
          ]}
          visual={<PortfolioVisual />}
        />
      </TourSlide>

      {/* Slide 6 — Basket Orders */}
      <TourSlide
        index={5}
        setRef={setSlideRef(5)}
        bg="light"
      >
        <SlideLayout
          icon={<Layers className="h-7 w-7" />}
          iconColor="orange"
          eyebrow="Multi-Leg Strategies"
          title="Basket Orders"
          subtitle="Place multiple legs in a single click. Build spreads, pairs, and custom baskets — executed atomically with one tap."
          bullets={[
            'Multi-leg basket execution',
            'Pre-built strategy templates',
            'Per-leg quantity & order type',
            'One-tap confirm & execute',
          ]}
          visual={<BasketVisual />}
        />
      </TourSlide>

      {/* Slide 7 — Smart Watchlist */}
      <TourSlide
        index={6}
        setRef={setSlideRef(6)}
        bg="surface"
      >
        <SlideLayout
          icon={<Eye className="h-7 w-7" />}
          iconColor="blue"
          eyebrow="Track Your Stocks"
          title="Smart Watchlist"
          subtitle="Track up to 10 stocks on Free tier (unlimited on Premium). Live prices, day change, sparkline charts, and quick-trade shortcuts."
          bullets={[
            '10 watchlist slots (Free)',
            'Unlimited slots (Premium)',
            'Live price + day change',
            'Inline sparkline charts',
          ]}
          visual={<WatchlistVisual />}
        />
      </TourSlide>

      {/* Slide 8 — Portfolio Analytics */}
      <TourSlide
        index={7}
        setRef={setSlideRef(7)}
        bg="light"
      >
        <SlideLayout
          icon={<BarChart3 className="h-7 w-7" />}
          iconColor="green"
          eyebrow="Performance Tracking"
          title="Portfolio Analytics"
          subtitle="Realized & unrealized P&L, day P&L, exposure breakdown, and trade history — all updated live as the market moves."
          bullets={[
            'Realized & unrealized P&L',
            'Day P&L and total returns',
            'Holdings breakdown by sector',
            'Downloadable trade history',
          ]}
          visual={<AnalyticsVisual />}
        />
      </TourSlide>

      {/* Slide 9 — Structured Learning */}
      <TourSlide
        index={8}
        setRef={setSlideRef(8)}
        bg="surface"
      >
        <SlideLayout
          icon={<GraduationCap className="h-7 w-7" />}
          iconColor="purple"
          eyebrow="Learning Paths"
          title="Structured Learning Modules"
          subtitle="Beginner to advanced modules covering technical analysis, options strategies, risk management, and trading psychology — with quizzes and challenges."
          bullets={[
            'Technical analysis basics',
            'Options strategies (spreads, straddles)',
            'Risk management frameworks',
            'Interactive quizzes & challenges',
          ]}
          visual={<LearningVisual />}
        />
      </TourSlide>

      {/* Slide 10 — Start in Seconds */}
      <TourSlide
        index={9}
        setRef={setSlideRef(9)}
        bg="hero"
        center
      >
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-profit-green/10 text-profit-green sm:h-20 sm:w-20">
            <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>

          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Start in <span className="text-brand-primary">Seconds</span>
          </h2>

          <p className="mt-5 max-w-xl text-base sm:text-lg text-text-secondary">
            Create your free account, get ₹1,00,000 virtual capital, and place your first
            paper trade in under a minute. No credit card. No risk. Just learning.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 w-full max-w-2xl">
            <QuickStat icon={<Clock className="h-5 w-5" />} label="Setup time" value="< 60s" />
            <QuickStat icon={<Wallet className="h-5 w-5" />} label="Virtual capital" value="₹1,00,000" />
            <QuickStat icon={<Lock className="h-5 w-5" />} label="Credit card" value="Not needed" />
            <QuickStat icon={<Activity className="h-5 w-5" />} label="Risk level" value="Zero" />
          </div>

          <p className="mt-8 text-xs text-text-tertiary animate-pulse">
            Scroll down to get started ↓
          </p>
        </div>
      </TourSlide>

      {/* ===================== MAIN CTA SECTION (post-tour) ===================== */}
      <section
        ref={(el) => {
          ctaRef.current = el;
          skipTargetRef.current = el;
        }}
        data-slide-index={TOUR_SLIDE_COUNT}
        className="relative scroll-mt-0"
      >
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent" />
          <div className="relative w-full px-4 py-16 sm:px-6 sm:py-24 lg:px-12 xl:px-20 safe-pt">
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
        <section className="w-full px-4 py-12 sm:px-6 sm:py-20 lg:px-12 xl:px-20">
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
          <div className="w-full px-4 py-12 sm:px-6 sm:py-20 lg:px-12 xl:px-20">
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
          <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20">
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
      </section>
    </div>
  );
}

/* ============================================================
   TourSlide — full-screen wrapper for each tour slide
   ============================================================ */
function TourSlide({
  index,
  setRef,
  bg,
  center,
  children,
}: {
  index: number;
  setRef: (el: HTMLElement | null) => void;
  bg: 'hero' | 'light' | 'surface';
  center?: boolean;
  children: React.ReactNode;
}) {
  const bgClass =
    bg === 'hero'
      ? 'bg-gradient-to-br from-brand-primary/5 via-bg-base to-bg-base'
      : bg === 'surface'
      ? 'bg-bg-surface'
      : 'bg-bg-base';

  return (
    <section
      ref={setRef}
      data-slide-index={index}
      className={`relative min-h-screen w-full ${bgClass} flex items-center justify-center scroll-mt-0`}
    >
      <div
        className={`w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-12 xl:px-20 safe-pt safe-pb ${
          center ? 'mx-auto max-w-5xl' : 'w-full'
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   SlideLayout — split layout: text on one side, visual on the other
   ============================================================ */
function SlideLayout({
  icon,
  iconColor,
  eyebrow,
  title,
  subtitle,
  bullets,
  visual,
}: {
  icon: React.ReactNode;
  iconColor: 'blue' | 'green' | 'purple' | 'cyan' | 'orange';
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  visual: React.ReactNode;
}) {
  const colorClasses = {
    blue: 'bg-tint-blue text-brand-primary',
    green: 'bg-tint-green text-profit-green',
    purple: 'bg-tint-purple text-info-purple',
    cyan: 'bg-tint-cyan text-info-cyan',
    orange: 'bg-tint-orange text-accent-gold',
  }[iconColor];

  return (
    <div className="grid gap-8 lg:gap-12 lg:grid-cols-2 lg:items-center">
      {/* Text */}
      <div className="order-2 lg:order-1">
        <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${colorClasses}`}>
          {icon}
        </div>
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-brand-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mt-4 text-base sm:text-lg text-text-secondary leading-relaxed">
          {subtitle}
        </p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm sm:text-base text-text-primary">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-profit-green" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Visual */}
      <div className="order-1 lg:order-2">
        {visual}
      </div>
    </div>
  );
}

/* ============================================================
   Visuals — mock UI previews for each tour slide
   ============================================================ */

function TickerTapeVisual() {
  const tickers = [
    { sym: 'NIFTY 50', price: '24,318.20', chg: '+0.62%', up: true },
    { sym: 'SENSEX', price: '80,109.85', chg: '+0.48%', up: true },
    { sym: 'BANKNIFTY', price: '52,402.10', chg: '-0.21%', up: false },
    { sym: 'RELIANCE', price: '₹2,945.30', chg: '+1.20%', up: true },
    { sym: 'TCS', price: '₹4,108.75', chg: '-0.35%', up: false },
    { sym: 'HDFCBANK', price: '₹1,712.40', chg: '+0.82%', up: true },
    { sym: 'INFY', price: '₹1,845.60', chg: '+0.45%', up: true },
  ];
  return (
    <div className="card-soft p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="live-dot-green" />
          <span className="text-xs font-semibold text-text-secondary">LIVE · NSE</span>
        </div>
        <span className="text-xs text-text-tertiary">12:45:32 IST</span>
      </div>
      <div className="space-y-2">
        {tickers.map((t) => (
          <div
            key={t.sym}
            className="flex items-center justify-between rounded-lg bg-bg-surface-alt px-3 py-2.5"
          >
            <span className="font-mono text-xs sm:text-sm font-semibold text-text-primary">{t.sym}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs sm:text-sm text-text-primary">{t.price}</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  t.up ? 'text-profit-green' : 'text-loss-red'
                }`}
              >
                {t.up ? '▲' : '▼'} {t.chg}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetClassVisual() {
  const assets = [
    { name: 'Equity', desc: 'Delivery & intraday', icon: <TrendingUp className="h-5 w-5" />, color: 'blue' },
    { name: 'Futures', desc: 'Stock & index', icon: <CandlestickChart className="h-5 w-5" />, color: 'purple' },
    { name: 'Options', desc: 'CE & PE contracts', icon: <Layers className="h-5 w-5" />, color: 'cyan' },
    { name: 'Basket', desc: 'Multi-leg orders', icon: <Wallet className="h-5 w-5" />, color: 'orange' },
  ];
  const colorMap: Record<string, string> = {
    blue: 'bg-tint-blue text-brand-primary',
    purple: 'bg-tint-purple text-info-purple',
    cyan: 'bg-tint-cyan text-info-cyan',
    orange: 'bg-tint-orange text-accent-gold',
  };
  return (
    <div className="card-soft p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-3">
        {assets.map((a) => (
          <div key={a.name} className="rounded-xl border border-border-default p-4 bg-bg-surface">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[a.color]}`}>
              {a.icon}
            </div>
            <p className="font-heading text-sm font-bold text-text-primary">{a.name}</p>
            <p className="text-xs text-text-secondary">{a.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-bg-surface-alt p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Order Type</span>
          <span className="font-mono font-semibold text-text-primary">MARKET</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-text-secondary">Qty</span>
          <span className="font-mono font-semibold text-text-primary">100</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-text-secondary">Margin</span>
          <span className="font-mono font-semibold text-brand-primary">₹2,94,530</span>
        </div>
      </div>
    </div>
  );
}

function OptionChainVisual() {
  const strikes = [
    { k: '24,300', ceLtp: '185.40', peLtp: '142.10', atm: false },
    { k: '24,350', ceLtp: '156.80', peLtp: '163.45', atm: false },
    { k: '24,400', ceLtp: '128.20', peLtp: '184.95', atm: true },
    { k: '24,450', ceLtp: '102.50', peLtp: '209.30', atm: false },
    { k: '24,500', ceLtp: '78.40', peLtp: '235.10', atm: false },
  ];
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-heading text-sm font-bold text-text-primary">NIFTY 50</p>
          <p className="text-xs text-text-secondary">Expiry: 28 Nov</p>
        </div>
        <span className="rounded bg-tint-blue px-2 py-0.5 text-[10px] font-bold text-brand-primary">CE / PE</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 text-xs">
        <span className="text-text-tertiary text-center font-semibold">CALL LTP</span>
        <span className="text-text-tertiary text-center font-semibold px-3">STRIKE</span>
        <span className="text-text-tertiary text-center font-semibold">PUT LTP</span>
        {strikes.map((s) => (
          <StrikeRow key={s.k} {...s} />
        ))}
      </div>
    </div>
  );
}

function StrikeRow({ k, ceLtp, peLtp, atm }: { k: string; ceLtp: string; peLtp: string; atm: boolean }) {
  return (
    <>
      <div
        className={`rounded px-2 py-1.5 text-center font-mono text-xs ${
          atm ? 'bg-tint-green text-profit-green font-bold' : 'bg-tint-red/40 text-loss-red'
        }`}
      >
        {ceLtp}
      </div>
      <div
        className={`rounded px-3 py-1.5 text-center font-mono text-xs font-bold ${
          atm ? 'bg-brand-primary text-white' : 'bg-bg-surface-alt text-text-primary'
        }`}
      >
        {k}
      </div>
      <div
        className={`rounded px-2 py-1.5 text-center font-mono text-xs ${
          atm ? 'bg-tint-green text-profit-green font-bold' : 'bg-tint-green/40 text-profit-green'
        }`}
      >
        {peLtp}
      </div>
    </>
  );
}

function PortfolioVisual() {
  return (
    <div className="card-soft p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-text-secondary">Virtual Capital</p>
          <p className="font-heading text-2xl font-bold text-text-primary">₹1,00,000.00</p>
        </div>
        <div className="rounded-lg bg-tint-green px-3 py-1.5">
          <p className="text-[10px] text-profit-green font-semibold">AVAILABLE</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-bg-surface-alt p-3">
          <p className="text-[10px] text-text-secondary">Invested</p>
          <p className="font-mono text-sm font-bold text-text-primary">₹48,250</p>
        </div>
        <div className="rounded-lg bg-bg-surface-alt p-3">
          <p className="text-[10px] text-text-secondary">Day P&L</p>
          <p className="font-mono text-sm font-bold text-profit-green">+₹1,240</p>
        </div>
      </div>
      <div className="h-20 rounded-lg bg-gradient-to-r from-tint-green/40 to-tint-blue/30 flex items-end px-3 pb-2">
        <div className="flex items-end gap-1.5 w-full h-full">
          {[40, 55, 50, 65, 70, 60, 80, 75, 90, 85].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-brand-primary/60"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BasketVisual() {
  const legs = [
    { sym: 'NIFTY 24NOV 24400 CE', qty: '+100', side: 'BUY', color: 'green' },
    { sym: 'NIFTY 24NOV 24400 PE', qty: '+100', side: 'BUY', color: 'green' },
    { sym: 'NIFTY 24NOV 24500 CE', qty: '-100', side: 'SELL', color: 'red' },
  ];
  return (
    <div className="card-soft p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading text-sm font-bold text-text-primary">Long Straddle + Hedge</p>
        <span className="rounded bg-tint-orange px-2 py-0.5 text-[10px] font-bold text-accent-gold">BASKET</span>
      </div>
      <div className="space-y-2">
        {legs.map((l, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-bg-surface-alt px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-text-primary truncate">{l.sym}</p>
              <p className="text-[10px] text-text-tertiary">Leg {i + 1}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs text-text-primary">{l.qty}</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  l.color === 'green'
                    ? 'bg-tint-green text-profit-green'
                    : 'bg-tint-red text-loss-red'
                }`}
              >
                {l.side}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-lg bg-brand-primary py-2.5 text-sm font-bold text-white">
        Execute Basket (3 legs)
      </button>
    </div>
  );
}

function WatchlistVisual() {
  const items = [
    { sym: 'RELIANCE', price: '₹2,945', chg: '+1.20%', up: true },
    { sym: 'TCS', price: '₹4,108', chg: '-0.35%', up: false },
    { sym: 'HDFCBANK', price: '₹1,712', chg: '+0.82%', up: true },
    { sym: 'INFY', price: '₹1,845', chg: '+0.45%', up: true },
  ];
  return (
    <div className="card-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading text-sm font-bold text-text-primary">My Watchlist</p>
        <span className="text-[10px] text-text-tertiary">4 / 10 slots</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.sym}
            className="flex items-center justify-between rounded-lg border border-border-default px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-[10px] font-bold text-brand-primary">
                {it.sym.slice(0, 2)}
              </div>
              <span className="font-mono text-xs font-semibold text-text-primary">{it.sym}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <svg width="50" height="20" viewBox="0 0 50 20" className={it.up ? 'text-profit-green' : 'text-loss-red'}>
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  points={it.up ? '0,15 10,12 20,10 30,7 40,5 50,3' : '0,3 10,5 20,8 30,11 40,14 50,17'}
                />
              </svg>
              <div className="text-right">
                <p className="font-mono text-xs text-text-primary">{it.price}</p>
                <p className={`font-mono text-[10px] ${it.up ? 'text-profit-green' : 'text-loss-red'}`}>{it.chg}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div className="card-soft p-5 sm:p-6">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] text-text-secondary">Total P&L</p>
          <p className="font-mono text-base font-bold text-profit-green">+₹12,450</p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">Realized</p>
          <p className="font-mono text-base font-bold text-text-primary">₹4,820</p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">Unrealized</p>
          <p className="font-mono text-base font-bold text-profit-green">+₹7,630</p>
        </div>
      </div>
      <div className="h-32 relative rounded-lg bg-bg-surface-alt p-3">
        <svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--profit-green)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--profit-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 60 L 20 55 L 40 50 L 60 45 L 80 40 L 100 35 L 120 30 L 140 25 L 160 20 L 180 15 L 200 10 L 200 80 L 0 80 Z"
            fill="url(#plGrad)"
          />
          <path
            d="M 0 60 L 20 55 L 40 50 L 60 45 L 80 40 L 100 35 L 120 30 L 140 25 L 160 20 L 180 15 L 200 10"
            fill="none"
            stroke="var(--profit-green)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-text-secondary">Last 30 days</span>
        <span className="flex items-center gap-1 text-profit-green font-semibold">
          <LineChart className="h-3 w-3" /> +12.4%
        </span>
      </div>
    </div>
  );
}

function LearningVisual() {
  const modules = [
    { name: 'Technical Analysis 101', progress: 75, icon: <BarChart3 className="h-4 w-4" />, color: 'blue' },
    { name: 'Options Strategies', progress: 40, icon: <Layers className="h-4 w-4" />, color: 'purple' },
    { name: 'Risk Management', progress: 100, icon: <Target className="h-4 w-4" />, color: 'green' },
    { name: 'Trading Psychology', progress: 20, icon: <Newspaper className="h-4 w-4" />, color: 'orange' },
  ];
  const colorMap: Record<string, string> = {
    blue: 'bg-tint-blue text-brand-primary',
    purple: 'bg-tint-purple text-info-purple',
    green: 'bg-tint-green text-profit-green',
    orange: 'bg-tint-orange text-accent-gold',
  };
  return (
    <div className="card-soft p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-heading text-sm font-bold text-text-primary">Your Learning Path</p>
        <span className="rounded bg-tint-blue px-2 py-0.5 text-[10px] font-bold text-brand-primary">BEGINNER</span>
      </div>
      <div className="space-y-3">
        {modules.map((m) => (
          <div key={m.name}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[m.color]}`}>
                {m.icon}
              </div>
              <span className="text-xs font-medium text-text-primary flex-1 truncate">{m.name}</span>
              <span className="font-mono text-[10px] text-text-tertiary">{m.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-surface-alt overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-primary"
                style={{ width: `${m.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Small helpers
   ============================================================ */
function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-surface p-3 text-center">
      <div className="mx-auto mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-tint-blue text-brand-primary">
        {icon}
      </div>
      <p className="text-[10px] text-text-tertiary">{label}</p>
      <p className="font-mono text-xs sm:text-sm font-bold text-text-primary">{value}</p>
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
