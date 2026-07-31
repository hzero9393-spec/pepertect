'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Zap, ArrowRight, TrendingUp, Shield, GraduationCap, CandlestickChart,
  Layers, Eye, BarChart3, Clock, Lock, Sparkles, Check, X, ChevronDown,
  Activity, Wallet, LineChart, Target, Newspaper, Bell,
} from 'lucide-react';

/* ============================================================
   Pepertect Public Landing Page — 3D / Video-style
   - 10 full-screen tour slides auto-scroll every 3 seconds
   - Each slide features live "video-type" animations:
     * Real-time ticking stock prices (green/red flash)
     * Profit counters animating up/down
     * Self-drawing SVG chart lines
     * AI cursor auto-controlling UI (Gemini/WhatsApp-ad style)
   - White + blue Apple.com-inspired 3D depth backgrounds
   - Floating glass orbs, grid overlay, perspective tilt
   - Skip button (top-right) jumps directly to the main CTA section
   ============================================================ */

const TOUR_SLIDE_COUNT = 10;
const SLIDE_INTERVAL_MS = 3000;
const PAUSE_AFTER_INTERACTION_MS = 6000;

export function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const ctaRef = useRef<HTMLElement | null>(null);
  const skipTargetRef = useRef<HTMLDivElement | null>(null);
  const pausedUntilRef = useRef<number>(0);

  /* ---------- Auto-scroll timer ---------- */
  useEffect(() => {
    if (isPaused) return;
    if (currentSlide >= TOUR_SLIDE_COUNT) return;
    const timer = setTimeout(() => {
      const next = currentSlide + 1;
      if (next >= TOUR_SLIDE_COUNT) {
        skipTargetRef.current?.scrollIntoView({ behavior: 'smooth' });
        setCurrentSlide(TOUR_SLIDE_COUNT);
      } else {
        const target = slideRefs.current[next];
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setCurrentSlide(next);
      }
    }, SLIDE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [currentSlide, isPaused]);

  /* ---------- Track which slide is in view ---------- */
  useEffect(() => {
    // Small delay to ensure refs are populated after lazy load
    const initTimer = setTimeout(() => {
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
        { threshold: 0.3 }
      );
      slideRefs.current.forEach((el) => el && observer.observe(el));
      if (ctaRef.current) observer.observe(ctaRef.current);
      // Store observer for cleanup
      return () => observer.disconnect();
    }, 100);
    return () => clearTimeout(initTimer);
  }, []);

  /* ---------- Pause on user interaction ---------- */
  useEffect(() => {
    const handleInteraction = () => {
      pausedUntilRef.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
      setIsPaused(true);
    };
    const handleResume = () => {
      if (Date.now() >= pausedUntilRef.current) {
        setIsPaused(false);
      } else {
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

  /* ---------- Mouse parallax tilt (3D feel) ---------- */
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouseTilt({ x, y });
    };
    window.addEventListener('mousemove', handle, { passive: true });
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  /* ---------- Skip button ---------- */
  const handleSkip = useCallback(() => {
    pausedUntilRef.current = Date.now() + 999999;
    setIsPaused(true);
    setCurrentSlide(TOUR_SLIDE_COUNT);
    skipTargetRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const setSlideRef = (idx: number) => (el: HTMLElement | null) => {
    slideRefs.current[idx] = el;
  };

  return (
    <div className="bg-bg-base text-text-primary">
      {/* ===================== TOP PROGRESS BAR + SKIP ===================== */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 sm:px-6 safe-pt">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setCurrentSlide(0);
            pausedUntilRef.current = 0;
            setIsPaused(false);
          }}
          className="flex items-center gap-2 rounded-full lp-glass px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary">
            <Zap className="h-3.5 w-3.5 text-white" fill="currentColor" />
          </div>
          <span className="font-heading text-sm font-bold">Pepertect</span>
        </a>

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
                    ? 'w-8 lp-dot-active'
                    : i < currentSlide
                    ? 'w-3 bg-brand-primary/50'
                    : 'w-3 bg-text-tertiary/30 hover:bg-text-tertiary/50'
                }`}
              />
            ))}
          </div>
        )}

        {currentSlide >= TOUR_SLIDE_COUNT ? (
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="hidden sm:inline-flex items-center rounded-full lp-glass px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-sm hover:bg-bg-surface-alt transition-colors no-select"
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
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 rounded-full lp-glass px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold shadow-sm hover:bg-bg-surface-alt transition-colors no-select"
            >
              Skip
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Pause indicator */}
      {isPaused && currentSlide < TOUR_SLIDE_COUNT && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full lp-glass px-4 py-1.5 text-xs text-text-secondary shadow-md no-select">
          Paused — scroll to explore, or wait to resume
        </div>
      )}

      {/* ===================== TOUR SLIDES ===================== */}
      {/* Slide 1 — Hero Welcome (3D perspective) */}
      <TourSlide index={0} setRef={setSlideRef(0)} bg="hero" center tilt={mouseTilt}>
        <div className="lp-3d-stage">
          <div
            className="lp-3d-card lp-fade-scale"
            style={{
              transform: `rotateY(${mouseTilt.x * 6}deg) rotateX(${-mouseTilt.y * 4}deg)`,
            }}
          >
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="mb-6 flex items-center gap-2 rounded-full lp-glass lp-live-chip px-4 py-2">
                <div className="live-dot-green" />
                <span className="text-sm font-medium text-brand-primary">NSE Paper Trading Platform</span>
              </div>

              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-primary shadow-lg shadow-brand-primary/30 sm:h-24 sm:w-24">
                <Zap className="h-10 w-10 text-white sm:h-12 sm:w-12" fill="currentColor" />
              </div>

              <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Welcome to <span className="lp-hero-text">Pepertect</span>
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
          </div>
        </div>
      </TourSlide>

      {/* Slide 2 — Real-Time Market Data (live ticking prices) */}
      <TourSlide index={1} setRef={setSlideRef(1)} bg="light">
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
          visual={<LiveTickerVisual />}
        />
      </TourSlide>

      {/* Slide 3 — Trade Any Asset Class (AI cursor fills order ticket) */}
      <TourSlide index={2} setRef={setSlideRef(2)} bg="surface">
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
          visual={<OrderTicketVisual />}
        />
      </TourSlide>

      {/* Slide 4 — Option Chain with Greeks (live LTP flash + ATM pulse) */}
      <TourSlide index={3} setRef={setSlideRef(3)} bg="light">
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
          visual={<OptionChainLiveVisual />}
        />
      </TourSlide>

      {/* Slide 5 — Zero Risk Practice (capital counter animates) */}
      <TourSlide index={4} setRef={setSlideRef(4)} bg="surface">
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
          visual={<PortfolioGrowthVisual />}
        />
      </TourSlide>

      {/* Slide 6 — Basket Orders (AI cursor executes 3 legs one-by-one) */}
      <TourSlide index={5} setRef={setSlideRef(5)} bg="light">
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
          visual={<BasketExecutionVisual />}
        />
      </TourSlide>

      {/* Slide 7 — Smart Watchlist (live prices + sparklines) */}
      <TourSlide index={6} setRef={setSlideRef(6)} bg="surface">
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
          visual={<WatchlistLiveVisual />}
        />
      </TourSlide>

      {/* Slide 8 — Portfolio Analytics (self-drawing chart + count-up) */}
      <TourSlide index={7} setRef={setSlideRef(7)} bg="light">
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
          visual={<AnalyticsDrawVisual />}
        />
      </TourSlide>

      {/* Slide 9 — Structured Learning (progress bars fill) */}
      <TourSlide index={8} setRef={setSlideRef(8)} bg="surface">
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
          visual={<LearningPathVisual />}
        />
      </TourSlide>

      {/* Slide 10 — Start in Seconds (3D perspective) */}
      <TourSlide index={9} setRef={setSlideRef(9)} bg="hero" center tilt={mouseTilt}>
        <div className="lp-3d-stage">
          <div
            className="lp-3d-card lp-fade-scale"
            style={{
              transform: `rotateY(${mouseTilt.x * 6}deg) rotateX(${-mouseTilt.y * 4}deg)`,
            }}
          >
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-profit-green/10 text-profit-green sm:h-20 sm:w-20">
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>

              <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Start in <span className="lp-hero-text">Seconds</span>
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
          </div>
        </div>
      </TourSlide>

      {/* ===================== MAIN CTA SECTION (post-tour) ===================== */}
      <section
        ref={(el) => {
          ctaRef.current = el;
          skipTargetRef.current = el;
        }}
        data-slide-index={TOUR_SLIDE_COUNT}
        className="relative scroll-mt-0 lp-bg-hero"
      >
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-grid-overlay" />
          <div className="relative w-full px-4 py-16 sm:px-6 sm:py-24 lg:px-12 xl:px-20 safe-pt">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 sm:mb-6 flex items-center gap-2 rounded-full lp-glass lp-live-chip px-3 py-1.5 sm:px-4 sm:py-2">
                <div className="live-dot-green" />
                <span className="text-xs sm:text-sm font-medium text-brand-primary">NSE Paper Trading Platform</span>
              </div>

              <h1 className="max-w-4xl font-heading text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-7xl">
                Master Trading
                <span className="block lp-hero-text">Without the Risk</span>
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
   TourSlide — full-screen wrapper with 3D depth background
   ============================================================ */
function TourSlide({
  index,
  setRef,
  bg,
  center,
  tilt,
  children,
}: {
  index: number;
  setRef: (el: HTMLElement | null) => void;
  bg: 'hero' | 'light' | 'surface';
  center?: boolean;
  tilt?: { x: number; y: number };
  children: React.ReactNode;
}) {
  const bgClass =
    bg === 'hero'
      ? 'lp-bg-hero'
      : bg === 'surface'
      ? 'lp-bg-surface'
      : 'lp-bg-light';

  return (
    <section
      ref={setRef}
      data-slide-index={index}
      className={`relative min-h-screen w-full ${bgClass} flex items-center justify-center scroll-mt-0 overflow-hidden`}
    >
      {/* 3D depth: floating glass orbs + grid overlay */}
      <div
        className="lp-orb lp-orb-1"
        style={{
          transform: `translate3d(${(tilt?.x || 0) * 30}px, ${(tilt?.y || 0) * 30}px, 0)`,
        }}
      />
      <div
        className="lp-orb lp-orb-2"
        style={{
          transform: `translate3d(${(tilt?.x || 0) * -40}px, ${(tilt?.y || 0) * -20}px, 0)`,
        }}
      />
      {bg === 'hero' && <div className="lp-orb lp-orb-3" />}
      <div className="lp-grid-overlay" />

      <div
        className={`relative w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-12 xl:px-20 safe-pt safe-pb ${
          center ? 'mx-auto max-w-5xl' : 'w-full'
        }`}
      >
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   SlideLayout — split layout: text on one side, animated visual on the other
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
      <div className="order-2 lg:order-1 lp-fade-up">
        <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${colorClasses} shadow-sm`}>
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
      <div className="order-1 lg:order-2 lp-fade-scale">
        {visual}
      </div>
    </div>
  );
}

/* ============================================================
   Helper: AnimatedCounter — counts from `from` to `to` over `duration` ms
   ============================================================ */
function AnimatedCounter({
  from,
  to,
  duration,
  format,
  className,
  loop = true,
  loopPause = 1200,
}: {
  from: number;
  to: number;
  duration: number;
  format: (n: number) => string;
  className?: string;
  loop?: boolean;
  loopPause?: number;
}) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    let raf = 0;
    let startTime = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else if (loop) {
        timeoutId = setTimeout(() => {
          startTime = 0;
          setValue(from);
          raf = requestAnimationFrame(animate);
        }, loopPause);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
    };
  }, [from, to, duration, loop, loopPause]);

  return <span className={className}>{format(value)}</span>;
}

/* ============================================================
   Helper: AICursor — moves through predefined targets with click ripples
   ============================================================ */
function AICursor({
  steps,
  containerRef,
}: {
  steps: { x: number; y: number; click?: boolean }[];
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [clicks, setClicks] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    if (stepIdx >= steps.length) {
      const reset = setTimeout(() => setStepIdx(0), 1500);
      return () => clearTimeout(reset);
    }
    const step = steps[stepIdx];
    const moveTime = 800;
    const clickTime = step.click ? 250 : 0;
    const waitTime = 350;
    const total = moveTime + clickTime + waitTime;

    const t = setTimeout(() => {
      if (step.click) {
        const id = Date.now() + Math.random();
        setClicks((prev) => [...prev, { x: step.x, y: step.y, id }]);
        setTimeout(() => {
          setClicks((prev) => prev.filter((c) => c.id !== id));
        }, 600);
      }
      setStepIdx((prev) => prev + 1);
    }, total);

    return () => clearTimeout(t);
  }, [stepIdx, steps]);

  const current = steps[Math.min(stepIdx, steps.length - 1)] || { x: 0, y: 0 };

  return (
    <>
      <div
        className="lp-ai-cursor"
        style={{
          transform: `translate(${current.x}px, ${current.y}px)`,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5 3l4 16 2-7 7-2-13-7z"
            fill="#2563EB"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {clicks.map((c) => (
        <div
          key={c.id}
          className="lp-click-ripple"
          style={{
            left: c.x - 20,
            top: c.y - 20,
          }}
        />
      ))}
    </>
  );
}

/* ============================================================
   Visual 1 — LiveTickerVisual
   Real-time ticking stock prices with green/red flash on each tick
   ============================================================ */
function LiveTickerVisual() {
  const initial = [
    { sym: 'NIFTY 50', price: 24318.2, base: 24318.2, isIndex: true },
    { sym: 'SENSEX', price: 80109.85, base: 80109.85, isIndex: true },
    { sym: 'BANKNIFTY', price: 52402.1, base: 52402.1, isIndex: true },
    { sym: 'RELIANCE', price: 2945.3, base: 2945.3, isIndex: false },
    { sym: 'TCS', price: 4108.75, base: 4108.75, isIndex: false },
    { sym: 'HDFCBANK', price: 1712.4, base: 1712.4, isIndex: false },
    { sym: 'INFY', price: 1845.6, base: 1845.6, isIndex: false },
  ];
  const [data, setData] = useState(initial);
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | undefined>>({});

  useEffect(() => {
    const id = setInterval(() => {
      const newFlashes: Record<string, 'up' | 'down' | undefined> = {};
      setData((prev) =>
        prev.map((t) => {
          const delta = (Math.random() - 0.5) * 0.004 * t.base;
          const newPrice = t.price + delta;
          const up = newPrice > t.price;
          newFlashes[t.sym] = up ? 'up' : 'down';
          return { ...t, price: newPrice, up };
        })
      );
      setFlashes(newFlashes);
      setTimeout(() => setFlashes({}), 600);
    }, 700);
    return () => clearInterval(id);
  }, []);

  const fmt = (t: { price: number; isIndex: boolean }) => {
    const formatted = t.price.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return t.isIndex ? formatted : `₹${formatted}`;
  };

  const chgPct = (t: { price: number; base: number }) =>
    (((t.price - t.base) / t.base) * 100).toFixed(2);

  return (
    <div className="lp-glass p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 lp-live-chip rounded-full bg-tint-green px-3 py-1">
          <div className="live-dot-green" />
          <span className="text-xs font-semibold text-profit-green">LIVE · NSE</span>
        </div>
        <span className="text-xs text-text-tertiary font-mono">12:45:32 IST</span>
      </div>
      <div className="space-y-2">
        {data.map((t) => {
          const flash = flashes[t.sym];
          return (
            <div
              key={t.sym}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                flash === 'up' ? 'lp-flash-up' : flash === 'down' ? 'lp-flash-down' : 'bg-bg-surface-alt'
              }`}
            >
              <span className="font-mono text-xs sm:text-sm font-semibold text-text-primary">{t.sym}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-xs sm:text-sm lp-num-glow ${
                    flash ? 'is-ticking' : ''
                  } text-text-primary`}
                >
                  {fmt(t)}
                </span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    t.price >= t.base ? 'text-profit-green' : 'text-loss-red'
                  }`}
                >
                  {t.price >= t.base ? '▲' : '▼'} {Math.abs(parseFloat(chgPct(t))).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Visual 2 — OrderTicketVisual
   AI cursor moves through order ticket: pick asset → enter qty → preview margin → BUY
   ============================================================ */
function OrderTicketVisual() {
  const assets = [
    { name: 'Equity', icon: <TrendingUp className="h-5 w-5" />, color: 'bg-tint-blue text-brand-primary' },
    { name: 'Futures', icon: <CandlestickChart className="h-5 w-5" />, color: 'bg-tint-purple text-info-purple' },
    { name: 'Options', icon: <Layers className="h-5 w-5" />, color: 'bg-tint-cyan text-info-cyan' },
    { name: 'Basket', icon: <Wallet className="h-5 w-5" />, color: 'bg-tint-orange text-accent-gold' },
  ];
  const [selectedAsset, setSelectedAsset] = useState(0);
  const [qty, setQty] = useState(0);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [showMargin, setShowMargin] = useState(false);
  const [buyClicked, setBuyClicked] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Step-based animation
  useEffect(() => {
    const sequence = [
      { delay: 600, action: () => { setSelectedAsset(0); } },
      { delay: 1400, action: () => { setSelectedAsset(1); } },
      { delay: 2200, action: () => { setSelectedAsset(0); } },
      { delay: 2800, action: () => { setQty(0); } },
      { delay: 3000, action: () => { setQty(50); } },
      { delay: 3400, action: () => { setQty(100); } },
      { delay: 4000, action: () => { setOrderType('MARKET'); } },
      { delay: 4600, action: () => { setShowMargin(true); } },
      { delay: 5400, action: () => { setBuyClicked(true); } },
      { delay: 6200, action: () => {
        setBuyClicked(false);
        setShowMargin(false);
        setQty(0);
        setSelectedAsset(0);
      } },
    ];
    const timers = sequence.map((s) => setTimeout(s.action, s.delay));
    // Loop
    const loop = setInterval(() => {
      setSelectedAsset(0);
      setQty(0);
      setShowMargin(false);
      setBuyClicked(false);
    }, 7000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  const margin = qty * 2945.3;

  return (
    <div ref={containerRef} className="lp-glass p-5 sm:p-6 relative overflow-hidden">
      {/* AI cursor */}
      <AICursor
        containerRef={containerRef}
        steps={[
          { x: 60, y: 90, click: true },     // click Equity
          { x: 220, y: 90, click: false },   // hover Futures
          { x: 60, y: 90, click: true },     // back to Equity
          { x: 200, y: 200, click: true },   // click qty stepper
          { x: 200, y: 200, click: true },   // click again
          { x: 320, y: 240, click: true },   // select MARKET
          { x: 280, y: 320, click: false },  // hover margin preview
          { x: 240, y: 380, click: true },   // click BUY button
        ]}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        {assets.map((a, i) => (
          <div
            key={a.name}
            className={`rounded-xl border p-3 transition-all duration-300 ${
              selectedAsset === i
                ? 'border-brand-primary bg-brand-primary/5 shadow-md scale-105'
                : 'border-border-default bg-bg-surface'
            }`}
          >
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${a.color}`}>
              {a.icon}
            </div>
            <p className="font-heading text-sm font-bold text-text-primary">{a.name}</p>
            <p className="text-[10px] text-text-secondary">
              {i === 0 ? 'Delivery & intraday' : i === 1 ? 'Stock & index' : i === 2 ? 'CE & PE' : 'Multi-leg'}
            </p>
          </div>
        ))}
      </div>

      {/* Order form */}
      <div className="rounded-xl bg-bg-surface-alt p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Symbol</span>
          <span className="font-mono font-semibold text-text-primary">RELIANCE</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Quantity</span>
          <span className="font-mono font-bold text-brand-primary text-base lp-num-glow is-ticking">
            {qty}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Order Type</span>
          <span className="flex gap-1.5">
            {(['MARKET', 'LIMIT'] as const).map((t) => (
              <span
                key={t}
                className={`rounded px-2 py-0.5 font-mono font-semibold transition-all ${
                  orderType === t
                    ? 'bg-brand-primary text-white'
                    : 'bg-bg-surface text-text-secondary'
                }`}
              >
                {t}
              </span>
            ))}
          </span>
        </div>
        <div
          className={`flex items-center justify-between text-xs transition-all duration-500 ${
            showMargin ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <span className="text-text-secondary">Margin Required</span>
          <span className="font-mono font-semibold text-brand-primary">
            ₹{margin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      <button
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-300 ${
          buyClicked
            ? 'bg-profit-green scale-95 shadow-lg'
            : 'bg-brand-primary hover:bg-brand-primary-hover'
        }`}
      >
        {buyClicked ? '✓ Order Placed' : 'BUY · RELIANCE'}
      </button>
    </div>
  );
}

/* ============================================================
   Visual 3 — OptionChainLiveVisual
   5 strikes, LTP ticks every 700ms with green/red flash, ATM pulse ring
   ============================================================ */
function OptionChainLiveVisual() {
  const initial = [
    { k: '24,300', ceLtp: 185.4, ceBase: 185.4, peLtp: 142.1, peBase: 142.1, atm: false },
    { k: '24,350', ceLtp: 156.8, ceBase: 156.8, peLtp: 163.45, peBase: 163.45, atm: false },
    { k: '24,400', ceLtp: 128.2, ceBase: 128.2, peLtp: 184.95, peBase: 184.95, atm: true },
    { k: '24,450', ceLtp: 102.5, ceBase: 102.5, peLtp: 209.3, peBase: 209.3, atm: false },
    { k: '24,500', ceLtp: 78.4, ceBase: 78.4, peLtp: 235.1, peBase: 235.1, atm: false },
  ];
  const [strikes, setStrikes] = useState(initial);
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | undefined>>({});

  useEffect(() => {
    const id = setInterval(() => {
      const newFlashes: Record<string, 'up' | 'down' | undefined> = {};
      setStrikes((prev) =>
        prev.map((s) => {
          const ceDelta = (Math.random() - 0.5) * 4;
          const peDelta = (Math.random() - 0.5) * 4;
          newFlashes[`${s.k}-ce`] = ceDelta > 0 ? 'up' : 'down';
          newFlashes[`${s.k}-pe`] = peDelta > 0 ? 'up' : 'down';
          return { ...s, ceLtp: Math.max(1, s.ceLtp + ceDelta), peLtp: Math.max(1, s.peLtp + peDelta) };
        })
      );
      setFlashes(newFlashes);
      setTimeout(() => setFlashes({}), 600);
    }, 800);
    return () => clearInterval(id);
  }, []);

  const fmtLtp = (n: number) => n.toFixed(2);

  return (
    <div className="lp-glass p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-heading text-sm font-bold text-text-primary">NIFTY 50</p>
          <p className="text-xs text-text-secondary">Expiry: 28 Nov</p>
        </div>
        <span className="rounded bg-tint-blue px-2 py-0.5 text-[10px] font-bold text-brand-primary lp-live-chip">
          LIVE · CE / PE
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 text-xs">
        <span className="text-text-tertiary text-center font-semibold pb-1">CALL LTP</span>
        <span className="text-text-tertiary text-center font-semibold px-3 pb-1">STRIKE</span>
        <span className="text-text-tertiary text-center font-semibold pb-1">PUT LTP</span>
        {strikes.map((s) => (
          <StrikeRowLive key={s.k} s={s} flashes={flashes} fmtLtp={fmtLtp} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-text-tertiary">
        <span>IV · Δ · OI shown per strike</span>
        <span className="flex items-center gap-1 text-brand-primary">
          <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
          Updating live
        </span>
      </div>
    </div>
  );
}

function StrikeRowLive({
  s,
  flashes,
  fmtLtp,
}: {
  s: { k: string; ceLtp: number; peLtp: number; atm: boolean };
  flashes: Record<string, 'up' | 'down' | undefined>;
  fmtLtp: (n: number) => string;
}) {
  const ceFlash = flashes[`${s.k}-ce`];
  const peFlash = flashes[`${s.k}-pe`];
  return (
    <>
      <div
        className={`rounded px-2 py-1.5 text-center font-mono text-xs transition-colors ${
          s.atm
            ? 'bg-tint-green text-profit-green font-bold'
            : ceFlash === 'up'
            ? 'lp-flash-up text-profit-green'
            : ceFlash === 'down'
            ? 'lp-flash-down text-loss-red'
            : 'bg-tint-red/40 text-loss-red'
        }`}
      >
        {fmtLtp(s.ceLtp)}
      </div>
      <div
        className={`rounded px-3 py-1.5 text-center font-mono text-xs font-bold ${
          s.atm ? 'lp-pulse-ring bg-brand-primary text-white' : 'bg-bg-surface-alt text-text-primary'
        }`}
      >
        {s.k}
      </div>
      <div
        className={`rounded px-2 py-1.5 text-center font-mono text-xs transition-colors ${
          s.atm
            ? 'bg-tint-green text-profit-green font-bold'
            : peFlash === 'up'
            ? 'lp-flash-up text-profit-green'
            : peFlash === 'down'
            ? 'lp-flash-down text-loss-red'
            : 'bg-tint-green/40 text-profit-green'
        }`}
      >
        {fmtLtp(s.peLtp)}
      </div>
    </>
  );
}

/* ============================================================
   Visual 4 — PortfolioGrowthVisual
   Capital counter animates 1,00,000 → 1,12,450, Day P&L counts up, bars grow
   ============================================================ */
function PortfolioGrowthVisual() {
  const bars = [40, 55, 50, 65, 70, 60, 80, 75, 90, 85];
  const [barHeights, setBarHeights] = useState<number[]>(bars.map(() => 0));

  useEffect(() => {
    const timers = bars.map((h, i) =>
      setTimeout(() => {
        setBarHeights((prev) => {
          const next = [...prev];
          next[i] = h;
          return next;
        });
      }, 200 + i * 180)
    );
    const loop = setInterval(() => {
      setBarHeights(bars.map(() => 0));
      bars.forEach((h, i) => {
        setTimeout(() => {
          setBarHeights((prev) => {
            const next = [...prev];
            next[i] = h;
            return next;
          });
        }, i * 180);
      });
    }, 5000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  return (
    <div className="lp-glass p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-text-secondary">Virtual Capital</p>
          <AnimatedCounter
            from={100000}
            to={112450}
            duration={2400}
            format={(n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            className="font-heading text-2xl font-bold lp-hero-text"
          />
        </div>
        <div className="rounded-lg bg-tint-green px-3 py-1.5 lp-live-chip">
          <p className="text-[10px] text-profit-green font-semibold">GROWING</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-bg-surface-alt p-3">
          <p className="text-[10px] text-text-secondary">Invested</p>
          <AnimatedCounter
            from={0}
            to={48250}
            duration={2200}
            format={(n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            className="font-mono text-sm font-bold text-text-primary"
          />
        </div>
        <div className="rounded-lg bg-tint-green/30 p-3">
          <p className="text-[10px] text-text-secondary">Day P&amp;L</p>
          <AnimatedCounter
            from={0}
            to={1240}
            duration={2400}
            format={(n) => `+₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            className="font-mono text-sm font-bold text-profit-green lp-num-glow is-ticking"
          />
        </div>
      </div>
      <div className="h-20 rounded-lg bg-gradient-to-r from-tint-green/40 to-tint-blue/30 flex items-end px-3 pb-2">
        <div className="flex items-end gap-1.5 w-full h-full">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-brand-primary to-brand-primary/60 lp-progress-fill"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-text-tertiary">
        <span>Last 10 sessions</span>
        <span className="flex items-center gap-1 text-profit-green font-semibold">
          <TrendingUp className="h-3 w-3" /> +12.45%
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Visual 5 — BasketExecutionVisual
   3 legs, AI cursor clicks Execute, progress fills per leg one-by-one, success checks
   ============================================================ */
function BasketExecutionVisual() {
  const legs = [
    { sym: 'NIFTY 24NOV 24400 CE', qty: '+100', side: 'BUY', color: 'green' },
    { sym: 'NIFTY 24NOV 24400 PE', qty: '+100', side: 'BUY', color: 'green' },
    { sym: 'NIFTY 24NOV 24500 CE', qty: '-100', side: 'SELL', color: 'red' },
  ];
  const [progress, setProgress] = useState<number[]>([0, 0, 0]);
  const [statuses, setStatuses] = useState<('pending' | 'executing' | 'done')[]>(['pending', 'pending', 'pending']);
  const [executeClicked, setExecuteClicked] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sequence = () => {
      setExecuteClicked(false);
      setProgress([0, 0, 0]);
      setStatuses(['pending', 'pending', 'pending']);

      setTimeout(() => setExecuteClicked(true), 800);

      legs.forEach((_, i) => {
        setTimeout(() => {
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = 'executing';
            return next;
          });
          setProgress((prev) => {
            const next = [...prev];
            next[i] = 50;
            return next;
          });
        }, 1400 + i * 800);
        setTimeout(() => {
          setProgress((prev) => {
            const next = [...prev];
            next[i] = 100;
            return next;
          });
          setStatuses((prev) => {
            const next = [...prev];
            next[i] = 'done';
            return next;
          });
        }, 1800 + i * 800);
      });
    };

    sequence();
    const loop = setInterval(sequence, 6000);
    return () => clearInterval(loop);
  }, []);

  return (
    <div ref={containerRef} className="lp-glass p-5 sm:p-6 relative overflow-hidden">
      <AICursor
        containerRef={containerRef}
        steps={[
          { x: 60, y: 30, click: false },
          { x: 240, y: 380, click: true },
          { x: 60, y: 110, click: false },
          { x: 60, y: 180, click: false },
          { x: 60, y: 250, click: false },
        ]}
      />

      <div className="flex items-center justify-between mb-3">
        <p className="font-heading text-sm font-bold text-text-primary">Long Straddle + Hedge</p>
        <span className="rounded bg-tint-orange px-2 py-0.5 text-[10px] font-bold text-accent-gold lp-live-chip">BASKET</span>
      </div>
      <div className="space-y-2">
        {legs.map((l, i) => (
          <div
            key={i}
            className={`rounded-lg bg-bg-surface-alt px-3 py-2.5 transition-all duration-300 ${
              statuses[i] === 'executing' ? 'ring-2 ring-brand-primary/40' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-text-primary truncate">{l.sym}</p>
                <p className="text-[10px] text-text-tertiary">Leg {i + 1}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs text-text-primary">{l.qty}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    l.color === 'green' ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red'
                  }`}
                >
                  {l.side}
                </span>
                {statuses[i] === 'done' && (
                  <Check className="h-4 w-4 text-profit-green" />
                )}
                {statuses[i] === 'executing' && (
                  <div className="h-4 w-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
                )}
              </div>
            </div>
            <div className="mt-2 h-1 rounded-full bg-bg-surface overflow-hidden">
              <div
                className="h-full bg-brand-primary lp-progress-fill"
                style={{ width: `${progress[i]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-300 ${
          executeClicked ? 'bg-brand-primary scale-95 shadow-lg' : 'bg-brand-primary hover:bg-brand-primary-hover'
        }`}
      >
        {progress.every((p) => p === 100)
          ? '✓ Basket Executed (3/3)'
          : executeClicked
          ? 'Executing…'
          : 'Execute Basket (3 legs)'}
      </button>
    </div>
  );
}

/* ============================================================
   Visual 6 — WatchlistLiveVisual
   4 watchlist items with prices ticking + sparklines redrawing
   ============================================================ */
function WatchlistLiveVisual() {
  const initial = [
    { sym: 'RELIANCE', price: 2945, base: 2945, points: [15, 12, 10, 7, 5, 3] },
    { sym: 'TCS', price: 4108, base: 4108, points: [3, 5, 8, 11, 14, 17] },
    { sym: 'HDFCBANK', price: 1712, base: 1712, points: [10, 8, 12, 6, 9, 4] },
    { sym: 'INFY', price: 1845, base: 1845, points: [8, 10, 7, 12, 9, 5] },
  ];
  const [items, setItems] = useState(initial);
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | undefined>>({});

  useEffect(() => {
    const id = setInterval(() => {
      const newFlashes: Record<string, 'up' | 'down' | undefined> = {};
      setItems((prev) =>
        prev.map((it) => {
          const delta = (Math.random() - 0.5) * 6;
          const newPrice = Math.max(1, it.price + delta);
          newFlashes[it.sym] = delta > 0 ? 'up' : 'down';
          // shift sparkline points
          const newPoints = [...it.points.slice(1), Math.max(2, Math.min(18, it.points[it.points.length - 1] + (Math.random() - 0.5) * 6))];
          return { ...it, price: newPrice, points: newPoints };
        })
      );
      setFlashes(newFlashes);
      setTimeout(() => setFlashes({}), 600);
    }, 900);
    return () => clearInterval(id);
  }, []);

  const fmtPrice = (n: number, sym: string) =>
    sym === 'TCS' || sym === 'RELIANCE'
      ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
      : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="lp-glass p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading text-sm font-bold text-text-primary">My Watchlist</p>
        <span className="text-[10px] text-text-tertiary lp-live-chip rounded-full bg-tint-green px-2 py-0.5">
          4 / 10 · LIVE
        </span>
      </div>
      <div className="space-y-2">
        {items.map((it) => {
          const flash = flashes[it.sym];
          const up = it.price >= it.base;
          const chgPct = (((it.price - it.base) / it.base) * 100).toFixed(2);
          const pointsStr = it.points.map((p, i) => `${(i / (it.points.length - 1)) * 50},${p}`).join(' ');
          return (
            <div
              key={it.sym}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                flash === 'up' ? 'lp-flash-up' : flash === 'down' ? 'lp-flash-down' : 'border-border-default bg-bg-surface'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-brand-primary/10 flex items-center justify-center text-[10px] font-bold text-brand-primary">
                  {it.sym.slice(0, 2)}
                </div>
                <span className="font-mono text-xs font-semibold text-text-primary">{it.sym}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <svg width="50" height="20" viewBox="0 0 50 20" className={up ? 'text-profit-green' : 'text-loss-red'}>
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    points={pointsStr}
                    className="lp-sparkline"
                  />
                </svg>
                <div className="text-right">
                  <p className={`font-mono text-xs lp-num-glow ${flash ? 'is-ticking' : ''} text-text-primary`}>
                    {fmtPrice(it.price, it.sym)}
                  </p>
                  <p className={`font-mono text-[10px] ${up ? 'text-profit-green' : 'text-loss-red'}`}>
                    {up ? '▲' : '▼'} {Math.abs(parseFloat(chgPct)).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Visual 7 — AnalyticsDrawVisual
   SVG chart line draws itself, P&L counters animate, +12.4% badge counts up
   ============================================================ */
function AnalyticsDrawVisual() {
  const [drawKey, setDrawKey] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDrawKey((k) => k + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const linePath = 'M 0 60 L 20 55 L 40 50 L 60 45 L 80 40 L 100 35 L 120 30 L 140 25 L 160 20 L 180 15 L 200 10';
  const areaPath = `${linePath} L 200 80 L 0 80 Z`;

  return (
    <div className="lp-glass p-5 sm:p-6">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] text-text-secondary">Total P&amp;L</p>
          <AnimatedCounter
            from={0}
            to={12450}
            duration={2200}
            format={(n) => `+₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            className="font-mono text-base font-bold text-profit-green lp-num-glow is-ticking"
          />
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">Realized</p>
          <AnimatedCounter
            from={0}
            to={4820}
            duration={2400}
            format={(n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            className="font-mono text-base font-bold text-text-primary"
          />
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">Unrealized</p>
          <AnimatedCounter
            from={0}
            to={7630}
            duration={2600}
            format={(n) => `+₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            className="font-mono text-base font-bold text-profit-green"
          />
        </div>
      </div>
      <div className="h-32 relative rounded-lg bg-bg-surface-alt p-3 overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="none" key={drawKey}>
          <defs>
            <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--profit-green)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--profit-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#plGrad)" opacity="0.7" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--profit-green)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lp-draw-line"
          />
          {/* Animated dot at the end */}
          <circle cx="200" cy="10" r="3" fill="var(--profit-green)" className="lp-draw-line">
            <animate attributeName="opacity" values="0;0;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </svg>
        {/* Floating tooltip */}
        <div className="absolute right-3 top-3 rounded-lg bg-bg-surface border border-border-default px-2 py-1 shadow-md">
          <p className="text-[9px] text-text-tertiary">Day 30</p>
          <p className="font-mono text-[10px] font-bold text-profit-green">+₹12,450</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-text-secondary">Last 30 days</span>
        <span className="flex items-center gap-1 text-profit-green font-semibold">
          <LineChart className="h-3 w-3" />
          <AnimatedCounter
            from={0}
            to={12.4}
            duration={2200}
            format={(n) => `+${n.toFixed(1)}%`}
            className="font-mono"
          />
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Visual 8 — LearningPathVisual
   Progress bars fill from 0 → target, AI cursor hovers between modules
   ============================================================ */
function LearningPathVisual() {
  const modules = [
    { name: 'Technical Analysis 101', target: 75, icon: <BarChart3 className="h-4 w-4" />, color: 'blue' },
    { name: 'Options Strategies', target: 40, icon: <Layers className="h-4 w-4" />, color: 'purple' },
    { name: 'Risk Management', target: 100, icon: <Target className="h-4 w-4" />, color: 'green' },
    { name: 'Trading Psychology', target: 20, icon: <Newspaper className="h-4 w-4" />, color: 'orange' },
  ];
  const [progress, setProgress] = useState<number[]>([0, 0, 0, 0]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const sequence = () => {
      setProgress([0, 0, 0, 0]);
      modules.forEach((m, i) => {
        setTimeout(() => {
          setActiveIdx(i);
          setProgress((prev) => {
            const next = [...prev];
            next[i] = m.target;
            return next;
          });
        }, 200 + i * 700);
      });
    };
    sequence();
    const loop = setInterval(sequence, 5000);
    return () => clearInterval(loop);
  }, []);

  const colorMap: Record<string, string> = {
    blue: 'bg-tint-blue text-brand-primary',
    purple: 'bg-tint-purple text-info-purple',
    green: 'bg-tint-green text-profit-green',
    orange: 'bg-tint-orange text-accent-gold',
  };

  return (
    <div className="lp-glass p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-heading text-sm font-bold text-text-primary">Your Learning Path</p>
        <span className="rounded bg-tint-blue px-2 py-0.5 text-[10px] font-bold text-brand-primary lp-live-chip">BEGINNER</span>
      </div>
      <div className="space-y-3">
        {modules.map((m, i) => (
          <div
            key={m.name}
            className={`rounded-lg p-2 transition-all duration-300 ${
              activeIdx === i ? 'bg-brand-primary/5 scale-[1.02] ring-1 ring-brand-primary/20' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[m.color]}`}>
                {m.icon}
              </div>
              <span className="text-xs font-medium text-text-primary flex-1 truncate">{m.name}</span>
              <span className="font-mono text-[10px] text-text-tertiary">{progress[i]}%</span>
              {progress[i] === m.target && m.target === 100 && (
                <Check className="h-3.5 w-3.5 text-profit-green" />
              )}
            </div>
            <div className="h-1.5 rounded-full bg-bg-surface-alt overflow-hidden">
              <div
                className={`h-full rounded-full lp-progress-fill ${
                  m.color === 'blue' ? 'bg-brand-primary' :
                  m.color === 'purple' ? 'bg-info-purple' :
                  m.color === 'green' ? 'bg-profit-green' :
                  'bg-accent-gold'
                }`}
                style={{ width: `${progress[i]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-bg-surface-alt px-3 py-2">
        <span className="text-[10px] text-text-secondary">Overall Progress</span>
        <AnimatedCounter
          from={0}
          to={58}
          duration={2400}
          format={(n) => `${Math.round(n)}% complete`}
          className="font-mono text-xs font-bold text-brand-primary"
        />
      </div>
    </div>
  );
}

/* ============================================================
   Small helpers
   ============================================================ */
function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl lp-glass p-3 text-center">
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
    <div className="rounded-lg border border-border-default bg-bg-surface p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <h3 className="font-heading text-base sm:text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
    </div>
  );
}
