'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  Sun, Moon, ArrowRight, ArrowLeft, X, Check,
  BookOpen, BarChart3, Zap, GraduationCap, Target,
  Layers, Trophy, TrendingUp, Activity,
  LineChart, Wallet, Shield, ChevronRight,
  Sparkles, Clock, Volume2, VolumeX, PartyPopper, Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ================================================================
   TYPES
   ================================================================ */
interface OnboardingData {
  experience: string;
  goal: string;
  capital: number;
  markets: string[];
}

/* ================================================================
   CONSTANTS
   ================================================================ */
const TOTAL_STEPS = 6;

const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
  0: { title: 'Welcome', subtitle: '' },
  1: { title: 'Experience', subtitle: 'Your trading background' },
  2: { title: 'Goal', subtitle: 'What brings you here' },
  3: { title: 'Capital', subtitle: 'Virtual starting balance' },
  4: { title: 'Markets', subtitle: 'What you want to trade' },
  5: { title: 'Review', subtitle: 'Confirm and activate' },
};

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to markets', icon: BookOpen },
  { value: 'intermediate', label: 'Intermediate', desc: '1-3 years trading', icon: BarChart3 },
  { value: 'advanced', label: 'Advanced', desc: 'Seasoned trader', icon: Zap },
];

const GOAL_OPTIONS = [
  { value: 'learn', label: 'Learn Trading', desc: 'Master the fundamentals', icon: GraduationCap },
  { value: 'practice', label: 'Practice Strategies', desc: 'Refine your edge', icon: Target },
  { value: 'options', label: 'Test Options & F&O', desc: 'Derivatives & Greeks', icon: Layers },
  { value: 'compete', label: 'Compete in Leaderboards', desc: 'Challenge other traders', icon: Trophy },
];

const CAPITAL_OPTIONS = [
  { value: 100000, label: '₹1,00,000', sub: 'Standard (Recommended)', popular: true },
  { value: 500000, label: '₹5,00,000', sub: 'Trader', popular: false },
  { value: 1000000, label: '₹10,00,000', sub: 'Pro', popular: false },
];

const MARKET_OPTIONS = [
  { value: 'stocks', label: 'Stocks', desc: 'NSE Equity', icon: TrendingUp },
  { value: 'options', label: 'Options', desc: 'Calls & Puts', icon: Activity },
  { value: 'futures', label: 'Futures', desc: 'Index & Stock', icon: LineChart },
];

const REWARD_FEATURES = [
  'Unlimited paper trades',
  'Advanced P&L analytics',
  'Options chain with Greeks',
  'Premium learning paths',
  'Priority support',
];

/* ================================================================
   ANIMATION VARIANTS
   ================================================================ */
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 220 : -220, opacity: 0 }),
  center: {
    x: 0, opacity: 1,
    transition: { x: { type: 'spring', stiffness: 320, damping: 32 }, opacity: { duration: 0.18 } },
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 220 : -220, opacity: 0,
    transition: { x: { type: 'spring', stiffness: 320, damping: 32 }, opacity: { duration: 0.12 } },
  }),
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
};

/* ================================================================
   SOUND ENGINE — Web Audio API (subtle, professional)
   ================================================================ */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private getCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }
  get muted() { return this._muted; }
  toggleMute() { this._muted = !this._muted; return this._muted; }

  click() {
    if (this._muted) return;
    const c = this.getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(440, t + 0.06);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.start(t); o.stop(t + 0.06);
  }

  select() {
    if (this._muted) return;
    const c = this.getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(523, t);
    o.frequency.setValueAtTime(784, t + 0.07);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t); o.stop(t + 0.18);
  }

  success() {
    if (this._muted) return;
    const c = this.getCtx(), t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + i * 0.12);
      g.gain.setValueAtTime(0, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0.08, t + i * 0.12 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35);
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.35);
    });
  }

  tick() {
    if (this._muted) return;
    const c = this.getCtx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(1100, t);
    g.gain.setValueAtTime(0.02, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    o.start(t); o.stop(t + 0.025);
  }
}

/* ================================================================
   ANIMATED COUNTER — 0 → target over duration (easeOutExpo)
   ================================================================ */
function AnimatedCounter({ target, duration = 3000, onComplete, onTick }: {
  target: number; duration?: number; onComplete?: () => void; onTick?: () => void;
}) {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  useEffect(() => {
    startRef.current = null;
    doneRef.current = false;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      const cur = Math.floor(eased * target);
      setVal(cur);
      if (onTick && cur > 0 && cur < target && cur % 5000 < 500) onTick();
      if (p < 1) { rafRef.current = requestAnimationFrame(step); }
      else { setVal(target); if (!doneRef.current) { doneRef.current = true; onComplete?.(); } }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span className="tabular-nums">{val.toLocaleString('en-IN')}</span>;
}

/* ================================================================
   CONFETTI CELEBRATION COMPONENT
   ================================================================ */
function ConfettiCelebration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            backgroundColor: ['#2563EB', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'][i % 5],
          }}
          initial={{ y: -10, rotate: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 20,
            rotate: 360 + Math.random() * 360,
            opacity: 0,
          }}
          transition={{
            duration: 2 + Math.random() * 1.5,
            delay: Math.random() * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================
   MAIN ONBOARDING FLOW
   ================================================================ */
export function OnboardingFlow() {
  const { token, user, login } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const soundRef = useRef(new SoundEngine());

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    experience: '', goal: '', capital: 100000, markets: ['stocks'],
  });
  const [checked, setChecked] = useState(false);
  const [activating, setActivating] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  /* ---------- Auth + trial eligibility check ---------- */
  const [trialCheckDone, setTrialCheckDone] = useState(false);
  const [trialCheckError, setTrialCheckError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!token) { window.location.href = '/login'; return; }
    (async () => {
      try {
        const res = await fetch('/api/user/trial-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success && d.data) {
          // If trial is ACTIVE - go to dashboard (user already going through or completed)
          if (d.data.active) { 
            window.location.href = '/dashboard'; 
            return; 
          }
          // If trial was USED before (expired + trialUsed flag) - go to subscription
          if (d.data.trialUsed || (d.data.expired && d.data.startedAt)) { 
            window.location.href = '/subscription'; 
            return; 
          }
          // If eligible (new user) - show onboarding flow
          if (d.data.eligible) {
            setChecked(true);
            setTrialCheckDone(true);
            return;
          }
          // For any other case (edge cases), show onboarding
          setChecked(true);
          setTrialCheckDone(true);
        } else {
          // API error - show onboarding anyway
          setChecked(true);
          setTrialCheckDone(true);
        }
      } catch { 
        // Network error - show onboarding anyway
        setChecked(true);
        setTrialCheckDone(true);
      }
    })();
  }, [token]);

  /* ---------- Step navigation ---------- */
  const goNext = useCallback(() => {
    soundRef.current.click();
    if (step < TOTAL_STEPS - 1) { setDir(1); setStep(s => s + 1); }
  }, [step]);

  const goBack = useCallback(() => {
    soundRef.current.click();
    setActivationError(null);
    if (step > 0) { setDir(-1); setStep(s => s - 1); }
  }, [step]);

  const selectAutoAdvance = useCallback((field: keyof OnboardingData, value: string | string[]) => {
    soundRef.current.select();
    setData(prev => ({ ...prev, [field]: value }));
    setTimeout(() => {
      setDir(1);
      setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
    }, 450);
  }, []);

  /* ---------- Submit & activate ---------- */
  const handleActivate = useCallback(async () => {
    if (!token) return;
    setActivationError(null);
    setActivating(true);
    try {
      // Call the onboarding complete API
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: data.experience,
          goal: data.goal,
          capital: data.capital,
          markets: data.markets,
        }),
      });
      const result = await res.json();
      
      if (result.success) {
        /* Update local state */
        if (user) {
          login(
            { ...user, tier: 'PREMIUM', virtualCapital: data.capital },
            token,
          );
        }
        setShowReward(true);
        setTimeout(() => soundRef.current.success(), 400);
      } else {
        // Handle specific error types with user-friendly messages
        if (result.error === 'TRIAL_ALREADY_USED' || result.message?.includes('already used')) {
          setActivationError('This free trial offer has already been used on your account. You can upgrade to Premium to continue enjoying all features!');
        } else if (result.error === 'ALREADY_ACTIVE' || result.message?.includes('already active')) {
          setActivationError('You already have an active free trial! Enjoy your Premium features.');
          // Redirect to dashboard after short delay
          setTimeout(() => window.location.href = '/dashboard', 2000);
        } else {
          setActivationError(result.error || result.message || 'Failed to activate trial. Please try again.');
        }
      }
    } catch (err) {
      console.error('Activation error:', err);
      setActivationError('Network error. Please check your connection and try again.');
    } finally {
      setActivating(false);
    }
  }, [token, user, login, data]);

  /* ---------- Redirect after reward ---------- */
  const goToDashboard = useCallback(() => {
    window.location.href = '/dashboard';
  }, []);

  /* ---------- Don't render until eligibility check done ---------- */
  if (!checked || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-[2.5px] border-brand-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Preparing your setup...</p>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  /* ============================
     RENDER
     ============================ */
  return (
    <div className="relative flex min-h-screen flex-col bg-bg-base">
      {/* ====== HEADER ====== */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 sm:px-8">
        <a href="/dashboard" className="flex items-center gap-2 text-text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-heading text-base font-bold">Pepertect</span>
        </a>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { soundRef.current.click(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => soundRef.current.click() || (window.location.href = '/dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ====== PROGRESS BAR ====== */}
      <div className="px-5 sm:px-8">
        <div className="h-1 w-full rounded-full bg-bg-surface-alt overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => { if (i < step) { soundRef.current.click(); setDir(1); setStep(i); } }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step ? 'w-6 bg-brand-primary' : i < step ? 'w-1.5 bg-brand-primary/40' : 'w-1.5 bg-bg-surface-alt',
                )}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-[11px] text-text-tertiary font-medium">
            {step + 1} / {TOTAL_STEPS}
          </p>
        </div>
      </div>

      {/* ====== STEP CONTENT ====== */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {step === 0 && <WelcomeStep onContinue={goNext} />}
              {step === 1 && <ExperienceStep value={data.experience} onSelect={(v) => selectAutoAdvance('experience', v)} />}
              {step === 2 && <GoalStep value={data.goal} onSelect={(v) => selectAutoAdvance('goal', v)} />}
              {step === 3 && <CapitalStep value={data.capital} onSelect={(v) => { soundRef.current.select(); setData(p => ({ ...p, capital: v })); }} onContinue={goNext} />}
              {step === 4 && <MarketStep values={data.markets} onToggle={(v) => { soundRef.current.select(); setData(p => ({ ...p, markets: p.markets.includes(v) ? p.markets.filter(m => m !== v) : [...p.markets, v] })); }} onContinue={goNext} />}
              {step === 5 && <ConfirmStep data={data} onActivate={handleActivate} activating={activating} error={activationError} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ====== FOOTER NAVIGATION (only for steps without inline buttons) ====== */}
      {step > 0 && step < TOTAL_STEPS - 1 && step !== 3 && step !== 4 && (
        <footer className="flex items-center justify-between px-5 pb-8 pt-4 sm:px-8">
          <button
            onClick={goBack}
            className="flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={goNext}
            disabled={step === 1 && !data.experience}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      )}

      {/* ====== REWARD OVERLAY WITH COUNTING ANIMATION ====== */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 40%, #3B82F6 100%)',
            }}
          >
            {/* Confetti celebration */}
            <ConfettiCelebration />

            {/* Subtle floating orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse" />
              <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
              className="relative w-full max-w-md rounded-3xl border border-white/20 p-8 text-center text-white"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                boxShadow: '0 24px 80px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {/* 🎉 Celebration Icon */}
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                className="flex justify-center mb-4"
              >
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg shadow-yellow-500/30">
                    <PartyPopper className="h-10 w-10 text-white" />
                  </div>
                  {/* Sparkles around icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="absolute -top-1 -right-1"
                  >
                    ✨
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                    className="absolute -bottom-1 -left-1"
                  >
                    🎊
                  </motion.div>
                </div>
              </motion.div>

              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="font-heading text-2xl sm:text-3xl font-bold"
              >
                Congratulations! 🎉
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-2 text-sm text-blue-100"
              >
                Your Free Trial is Activated!
              </motion.p>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-1 text-xs text-blue-200/80"
              >
                Virtual Balance Credited Successfully
              </motion.p>

              {/* Counter Animation - 0 → ₹Target */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-6 mb-2 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20"
              >
                <p className="text-xs text-blue-200 mb-2">Your Virtual Trading Balance</p>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-xl text-yellow-300 font-bold">₹</span>
                  <span className="font-heading text-4xl sm:text-5xl font-bold tabular-nums text-white">
                    <AnimatedCounter
                      target={data.capital}
                      duration={2500}
                      onTick={() => soundRef.current.tick()}
                    />
                  </span>
                </div>
                <p className="text-[10px] text-blue-200/60 mt-2">Credited instantly • No real money required</p>
              </motion.div>

              {/* Features list */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                transition={{ delay: 1.2 }}
                className="mt-6 space-y-2.5 text-left"
              >
                {REWARD_FEATURES.map((feat) => (
                  <motion.div
                    key={feat}
                    variants={staggerItem}
                    className="flex items-center gap-2.5"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm text-blue-50">{feat}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Plan badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2, duration: 0.4 }}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent-gold/30 to-brand-primary/30 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/20"
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span>PREMIUM Plan Active — Free for 30 Days</span>
              </motion.div>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3, duration: 0.4 }}
                onClick={goToDashboard}
                className="mt-6 w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-brand-primary font-bold text-sm hover:bg-blue-50 transition-all active:scale-[0.97] shadow-lg shadow-black/10"
              >
                Start Trading Now
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   STEP: WELCOME
   ================================================================ */
function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  const soundRef = useRef(new SoundEngine());

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center">
      {/* Icon */}
      <motion.div variants={fadeScale} className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-tint-blue">
        <TrendingUp className="h-8 w-8 text-brand-primary" />
      </motion.div>

      {/* Title */}
      <motion.h1 variants={staggerItem} className="font-heading text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
        Start Your Trading Journey
      </motion.h1>
      <motion.p variants={staggerItem} className="mt-2.5 text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
        Practice with real market data — completely risk free. Get ₹1,00,000 virtual capital and 30 days of premium features.
      </motion.p>

      {/* Benefits card */}
      <motion.div variants={staggerItem} className="mt-8 card-soft p-5 text-left space-y-3">
        {[
          { icon: Wallet, text: '₹1,00,000 virtual starting capital' },
          { icon: BarChart3, text: 'Real-time NSE market data' },
          { icon: Shield, text: 'No real money at risk' },
          { icon: Clock, text: '30-day free PREMIUM access' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint-blue">
              <item.icon className="h-4 w-4 text-brand-primary" />
            </div>
            <span className="text-sm text-text-primary">{item.text}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div variants={staggerItem} className="mt-8">
        <button
          onClick={() => { soundRef.current.click(); onContinue(); }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 text-sm font-semibold text-white hover:bg-brand-primary-hover transition-all active:scale-[0.97] shadow-lg shadow-brand-primary/25"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>

      <motion.p variants={staggerItem} className="mt-4 text-[11px] text-text-tertiary">
        Takes less than 2 minutes
      </motion.p>
    </motion.div>
  );
}

/* ================================================================
   STEP: EXPERIENCE (auto-advance)
   ================================================================ */
function ExperienceStep({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-text-primary">
        What&rsquo;s your trading experience?
      </h2>
      <p className="mt-1 text-sm text-text-secondary">We&rsquo;ll customize your dashboard</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-6 space-y-3">
        {EXPERIENCE_OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            variants={staggerItem}
            whileHover={{ scale: 1.015, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors duration-200',
              value === opt.value
                ? 'border-brand-primary bg-tint-blue'
                : 'border-border bg-bg-surface hover:border-brand-primary/30',
            )}
          >
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              value === opt.value ? 'bg-brand-primary' : 'bg-tint-blue',
            )}>
              <opt.icon className={cn('h-5 w-5', value === opt.value ? 'text-white' : 'text-brand-primary')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', value === opt.value ? 'text-brand-primary' : 'text-text-primary')}>
                {opt.label}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">{opt.desc}</p>
            </div>
            {value === opt.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary"
              >
                <Check className="h-3.5 w-3.5 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

/* ================================================================
   STEP: GOAL (auto-advance)
   ================================================================ */
function GoalStep({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-text-primary">
        What&rsquo;s your primary goal?
      </h2>
      <p className="mt-1 text-sm text-text-secondary">What brings you here today</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            variants={staggerItem}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'flex flex-col items-center gap-3 p-5 rounded-xl border-2 text-center transition-colors duration-200',
              value === opt.value
                ? 'border-brand-primary bg-tint-blue'
                : 'border-border bg-bg-surface hover:border-brand-primary/30',
            )}
          >
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
              value === opt.value ? 'bg-brand-primary' : 'bg-tint-blue',
            )}>
              <opt.icon className={cn('h-5 w-5', value === opt.value ? 'text-white' : 'text-brand-primary')} />
            </div>
            <div>
              <p className={cn('text-sm font-semibold', value === opt.value ? 'text-brand-primary' : 'text-text-primary')}>
                {opt.label}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">{opt.desc}</p>
            </div>
            {value === opt.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary"
              >
                <Check className="h-3 w-3 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

/* ================================================================
   STEP: CAPITAL (manual advance with continue button)
   ================================================================ */
function CapitalStep({ value, onSelect, onContinue }: {
  value: number; onSelect: (v: number) => void; onContinue: () => void;
}) {
  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-text-primary">
        Choose your starting capital
      </h2>
      <p className="mt-1 text-sm text-text-secondary">Your virtual trading balance</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-6 space-y-3">
        {CAPITAL_OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            variants={staggerItem}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors duration-200 relative',
              value === opt.value
                ? 'border-brand-primary bg-tint-blue'
                : 'border-border bg-bg-surface hover:border-brand-primary/30',
            )}
          >
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
              value === opt.value ? 'bg-brand-primary' : 'bg-tint-blue',
            )}>
              <Wallet className={cn('h-5 w-5', value === opt.value ? 'text-white' : 'text-brand-primary')} />
            </div>
            <div className="flex-1">
              <p className={cn('font-mono text-lg font-bold tabular-nums', value === opt.value ? 'text-brand-primary' : 'text-text-primary')}>
                {opt.label}
              </p>
              <p className="text-xs text-text-secondary">{opt.sub}</p>
            </div>
            {value === opt.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary"
              >
                <Check className="h-3.5 w-3.5 text-white" />
              </motion.div>
            )}
            {opt.popular && value !== opt.value && (
              <span className="absolute -top-2 right-3 rounded-full bg-brand-primary px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                Popular
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onContinue}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover transition-colors active:scale-[0.97]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   STEP: MARKET INTEREST (multi-select)
   ================================================================ */
function MarketStep({ values, onToggle, onContinue }: {
  values: string[]; onToggle: (v: string) => void; onContinue: () => void;
}) {
  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-text-primary">
        What would you like to explore?
      </h2>
      <p className="mt-1 text-sm text-text-secondary">Select one or more markets</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MARKET_OPTIONS.map((opt) => {
          const selected = values.includes(opt.value);
          return (
            <motion.button
              key={opt.value}
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggle(opt.value)}
              className={cn(
                'flex flex-col items-center gap-3 p-5 rounded-xl border-2 text-center transition-colors duration-200',
                selected
                  ? 'border-brand-primary bg-tint-blue'
                  : 'border-border bg-bg-surface hover:border-brand-primary/30',
              )}
            >
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                selected ? 'bg-brand-primary' : 'bg-tint-blue',
              )}>
                <opt.icon className={cn('h-5 w-5', selected ? 'text-white' : 'text-brand-primary')} />
              </div>
              <div>
                <p className={cn('text-sm font-semibold', selected ? 'text-brand-primary' : 'text-text-primary')}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">{opt.desc}</p>
              </div>
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary"
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onContinue}
          disabled={values.length === 0}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover transition-colors active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   STEP: CONFIRMATION (with error display)
   ================================================================ */
function ConfirmStep({ data, onActivate, activating, error }: {
  data: OnboardingData;
  onActivate: () => void;
  activating: boolean;
  error: string | null;
}) {
  const expLabel = EXPERIENCE_OPTIONS.find(o => o.value === data.experience)?.label ?? data.experience;
  const goalLabel = GOAL_OPTIONS.find(o => o.value === data.goal)?.label ?? data.goal;
  const marketLabels = data.markets.map(m => MARKET_OPTIONS.find(o => o.value === m)?.label ?? m);

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-text-primary">
        Review &amp; Activate
      </h2>
      <p className="mt-1 text-sm text-text-secondary">Your free trial is one click away</p>

      {/* Summary card */}
      <div className="mt-6 card-soft p-5 space-y-4">
        <SummaryRow icon={BookOpen} label="Experience" value={expLabel} />
        <SummaryRow icon={Target} label="Goal" value={goalLabel} />
        <SummaryRow icon={Wallet} label="Capital" value={`₹${data.capital.toLocaleString('en-IN')}`} />
        <SummaryRow icon={TrendingUp} label="Markets" value={marketLabels.join(', ')} />
      </div>

      {/* Plan details */}
      <div className="mt-4 rounded-xl bg-gradient-to-r from-tint-blue to-tint-purple p-4 border border-brand-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-brand-primary" />
          <span className="text-sm font-semibold text-text-primary">30-Day Free PREMIUM Trial</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Full access to all premium features. No credit card required.
          Your virtual balance of <strong className="text-profit-green">₹{data.capital.toLocaleString('en-IN')}</strong> will be credited instantly.
          After 30 days, you can continue with the free plan or upgrade.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg border border-loss-red/30 bg-loss-red/5 px-4 py-3"
        >
          <p className="text-xs text-loss-red font-medium">{error}</p>
        </motion.div>
      )}

      {/* Activate button */}
      <div className="mt-6">
        <button
          onClick={onActivate}
          disabled={activating}
          className="w-full inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white font-bold text-base hover:shadow-xl hover:shadow-brand-primary/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:hover:shadow-none"
        >
          {activating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="h-5 w-5 rounded-full border-2.5 border-white border-t-transparent"
              />
              Activating...
            </>
          ) : (
            <>
              <Gift className="h-5 w-5" />
              Activate Free Trial
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-text-tertiary">
        By activating, you agree to our Terms of Service
      </p>
    </div>
  );
}

/* ================================================================
   SHARED: SUMMARY ROW
   ================================================================ */
function SummaryRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint-blue">
          <Icon className="h-4 w-4 text-brand-primary" />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}
