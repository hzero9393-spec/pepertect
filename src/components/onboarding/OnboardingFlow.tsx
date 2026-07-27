'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Sparkles, Phone, User, TrendingUp,
  BarChart3, Target, Wallet, Trophy, ShieldAlert, Zap, Lock,
  IndianRupee, Check, Rocket, PartyPopper, Volume2, VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ============================================================
   CONSTANTS & TYPES
   ============================================================ */

const TOTAL_STEPS = 7;

interface OnboardingData {
  name: string;
  phone: string;
  experience: string;
  tradingStyle: string;
  market: string;
  capital: number;
  goal: string;
  riskLevel: string;
}

const INITIAL_DATA: OnboardingData = {
  name: '',
  phone: '',
  experience: '',
  tradingStyle: '',
  market: '',
  capital: 100000,
  goal: '',
  riskLevel: '',
};

const STEP_CONFIG = [
  { title: 'What should we call you?', subtitle: 'Let\'s personalize your experience', icon: User },
  { title: 'What\'s your trading experience?', subtitle: 'We\'ll tailor content to your level', icon: TrendingUp },
  { title: 'How do you trade?', subtitle: 'Your style defines your dashboard', icon: BarChart3 },
  { title: 'Choose your primary market', subtitle: 'We\'ll add it to your watchlist', icon: Target },
  { title: 'Choose your starting capital', subtitle: 'Virtual money, real learning', icon: Wallet },
  { title: 'What\'s your goal?', subtitle: 'We\'ll customize your journey', icon: Trophy },
  { title: 'What\'s your risk level?', subtitle: 'Trade within your comfort zone', icon: ShieldAlert },
];

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just getting started', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', desc: '1-3 years of trading', emoji: '📈' },
  { value: 'advanced', label: 'Advanced', desc: 'Pro-level trader', emoji: '🏆' },
];

const TRADING_STYLE_OPTIONS = [
  { value: 'intraday', label: 'Intraday', desc: 'Same day buy & sell', emoji: '⚡' },
  { value: 'swing', label: 'Swing', desc: 'Hold for days/weeks', emoji: '🌊' },
  { value: 'options', label: 'Options', desc: 'Premium strategies', emoji: '🎯' },
  { value: 'longterm', label: 'Long-term', desc: 'Invest & hold', emoji: '🏦' },
];

const MARKET_OPTIONS = [
  { value: 'NIFTY 50', label: 'NIFTY 50', desc: 'Broad market index', emoji: '🇮🇳' },
  { value: 'BANK NIFTY', label: 'BANK NIFTY', desc: 'Banking sector index', emoji: '🏦' },
  { value: 'FINNIFTY', label: 'FINNIFTY', desc: 'Financial services', emoji: '💰' },
  { value: 'SENSEX', label: 'SENSEX', desc: 'BSE benchmark', emoji: '📊' },
];

const CAPITAL_OPTIONS = [
  { value: 100000, label: '₹1,00,000', desc: 'Starter pack', emoji: '🪙' },
  { value: 500000, label: '₹5,00,000', desc: 'Trader pack', emoji: '💎' },
  { value: 1000000, label: '₹10,00,000', desc: 'Pro pack', emoji: '👑' },
];

const GOAL_OPTIONS = [
  { value: 'learn', label: 'Learn Trading', desc: 'Master the markets', emoji: '📚' },
  { value: 'practice', label: 'Practice Strategies', desc: 'Refine your edge', emoji: '🎯' },
  { value: 'compete', label: 'Compete with Traders', desc: 'Climb the leaderboard', emoji: '🏆' },
  { value: 'prepare', label: 'Prepare for Real', desc: 'Transition to live', emoji: '🚀' },
];

const RISK_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Conservative & safe', emoji: '🛡️' },
  { value: 'medium', label: 'Medium', desc: 'Balanced approach', emoji: '⚖️' },
  { value: 'high', label: 'High', desc: 'Aggressive growth', emoji: '🔥' },
];

/* ============================================================
   SOUND ENGINE — Web Audio API (no external files)
   ============================================================ */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  click() {
    this.playTone(800, 0.08, 'sine', 0.06);
  }

  select() {
    this.playTone(523, 0.1, 'sine', 0.07);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.07), 60);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.07), 120);
  }

  tick() {
    this.playTone(1200 + Math.random() * 400, 0.03, 'sine', 0.03);
  }

  success() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.1), i * 150);
    });
    // Soft shimmer
    setTimeout(() => {
      this.playTone(2093, 0.8, 'sine', 0.04);
    }, 600);
  }

  milestone() {
    this.playTone(1047, 0.5, 'sine', 0.12);
    setTimeout(() => this.playTone(1319, 0.5, 'sine', 0.12), 100);
    setTimeout(() => this.playTone(1568, 0.8, 'sine', 0.12), 200);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted() { return this.muted; }
}

/* ============================================================
   CONFETTI COMPONENT
   ============================================================ */

function Confetti() {
  const pieces = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      color: ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#8B5CF6', '#06B6D4', '#F97316'][Math.floor(Math.random() * 7)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            top: '-5%',
            left: `${p.x}%`,
            rotate: 0,
            opacity: 1,
            scale: 0,
          }}
          animate={{
            top: '110%',
            left: `${p.x + (Math.random() - 0.5) * 20}%`,
            rotate: p.rotation + 720,
            opacity: [1, 1, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOutCubic',
          }}
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.size > 8 ? '50%' : '2px',
            position: 'absolute',
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   PROGRESS BAR
   ============================================================ */

function ProgressBar({ currentStep, total }: { currentStep: number; total: number }) {
  const progress = currentStep === total ? 100 : ((currentStep - 1) / total) * 100;

  return (
    <div className="relative w-full px-0">
      {/* Step indicators */}
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <motion.div
              className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
                i + 1 <= currentStep
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'border-2 border-white/10 text-white/30'
              }`}
              animate={
                i + 1 === currentStep
                  ? { scale: [1, 1.15, 1], boxShadow: ['0 0 0px rgba(37,99,235,0)', '0 0 20px rgba(37,99,235,0.4)', '0 0 0px rgba(37,99,235,0)'] }
                  : {}
              }
              transition={{ duration: 0.6 }}
            >
              {i + 1 < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{i + 1}</span>
              )}
              {i + 1 === currentStep && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-blue-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
            {i === 0 && (
              <span className="text-[10px] text-white/40 hidden sm:block">Name</span>
            )}
            {i === 1 && (
              <span className="text-[10px] text-white/40 hidden sm:block">Level</span>
            )}
            {i === total - 1 && (
              <span className="text-[10px] text-white/40 hidden sm:block">Risk</span>
            )}
          </div>
        ))}
      </div>

      {/* Connecting line */}
      <div className="mx-auto mt-[-16px] h-[2px] max-w-xl">
        <div className="relative h-full bg-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SELECTION CARD — reusable option card with glow effect
   ============================================================ */

function SelectionCard({
  label,
  desc,
  emoji,
  selected,
  onClick,
  sound,
}: {
  label: string;
  desc: string;
  emoji: string;
  selected: boolean;
  onClick: () => void;
  sound: SoundEngine;
}) {
  return (
    <motion.button
      onClick={() => {
        sound.select();
        onClick();
      }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
        selected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      }`}
    >
      {/* Glow effect when selected */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-400/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Selection indicator */}
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all duration-300 ${
        selected ? 'bg-blue-500/20 scale-110' : 'bg-white/5'
      }`}>
        {emoji}
      </div>

      <div className="relative flex-1">
        <p className={`text-base font-semibold transition-colors duration-300 ${
          selected ? 'text-blue-300' : 'text-white/90'
        }`}>
          {label}
        </p>
        <p className="text-sm text-white/40">{desc}</p>
      </div>

      {/* Selected check */}
      <motion.div
        className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
          selected ? 'bg-blue-500' : 'border border-white/10'
        }`}
        animate={selected ? { scale: [0.8, 1.1, 1] } : {}}
      >
        {selected && <Check className="h-3.5 w-3.5 text-white" />}
      </motion.div>
    </motion.button>
  );
}

/* ============================================================
   ANIMATED COUNTER — for reward screen
   ============================================================ */

function AnimatedCounter({
  target,
  duration = 2500,
  onComplete,
  sound,
}: {
  target: number;
  duration?: number;
  onComplete?: () => void;
  sound: SoundEngine;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickValue = useRef(0);
  const soundRef = useRef(sound);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const formatCurrency = (n: number) => {
    return '₹' + n.toLocaleString('en-IN');
  };

  useEffect(() => {
    startTime.current = null;
    lastTickValue.current = 0;

    const animateFn = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentValue = Math.round(eased * target);

      setDisplayValue(currentValue);

      // Tick sound every 5000 increment
      if (currentValue - lastTickValue.current >= 5000) {
        soundRef.current.tick();
        lastTickValue.current = currentValue;
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateFn);
      } else {
        soundRef.current.milestone();
        onCompleteRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(animateFn);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glow behind text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="h-20 w-64 rounded-full bg-green-500/20 blur-3xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <p className="relative font-mono text-6xl sm:text-7xl md:text-8xl font-bold text-green-400 tabular-nums drop-shadow-[0_0_30px_rgba(22,163,74,0.4)]">
        {formatCurrency(displayValue)}
      </p>
    </motion.div>
  );
}

/* ============================================================
   STEP RENDERERS
   ============================================================ */

function StepNamePhone({
  data,
  update,
  sound,
}: {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  sound: SoundEngine;
}) {
  return (
    <div className="w-full max-w-md space-y-6">
      {/* Name input */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-white/60">
          <User className="h-4 w-4" /> Full Name
        </label>
        <input
          type="text"
          placeholder="Enter your name"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-lg text-white placeholder-white/20 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Phone input */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-white/60">
          <Phone className="h-4 w-4" /> Phone Number
        </label>
        <div className="flex items-center gap-2">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white/50">
            +91
          </span>
          <input
            type="tel"
            placeholder="Enter 10-digit number"
            value={data.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              update({ phone: val });
            }}
            maxLength={10}
            className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-lg text-white placeholder-white/20 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Bonus hint */}
      <motion.div
        className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Sparkles className="h-5 w-5 text-amber-400" />
        <span className="text-sm text-amber-300/80">
          Get <strong className="text-amber-300">₹50,000 bonus</strong> on verification
        </span>
      </motion.div>
    </div>
  );
}

function StepOptions({
  options,
  value,
  onSelect,
  sound,
}: {
  options: { value: string; label: string; desc: string; emoji: string }[];
  value: string;
  onSelect: (v: string) => void;
  sound: SoundEngine;
}) {
  return (
    <div className="w-full max-w-md space-y-3">
      {options.map((opt) => (
        <SelectionCard
          key={opt.value}
          label={opt.label}
          desc={opt.desc}
          emoji={opt.emoji}
          selected={value === opt.value}
          onClick={() => onSelect(opt.value)}
          sound={sound}
        />
      ))}
    </div>
  );
}

function StepCapital({
  data,
  update,
  sound,
}: {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
  sound: SoundEngine;
}) {
  return (
    <div className="w-full max-w-md space-y-3">
      {CAPITAL_OPTIONS.map((opt) => (
        <SelectionCard
          key={opt.value}
          label={opt.label}
          desc={opt.desc}
          emoji={opt.emoji}
          selected={data.capital === opt.value}
          onClick={() => update({ capital: opt.value })}
          sound={sound}
        />
      ))}
    </div>
  );
}

/* ============================================================
   REWARD / FINAL SCREEN
   ============================================================ */

function RewardScreen({
  capital,
  onEnterDashboard,
  sound,
}: {
  capital: number;
  onEnterDashboard: () => void;
  sound: SoundEngine;
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [counterDone, setCounterDone] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // Start everything after mount
    const t1 = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(t1);
  }, []);

  const handleCounterComplete = useCallback(() => {
    setCounterDone(true);
  }, [sound]);

  const toggleSound = () => {
    const isMuted = sound.toggleMute();
    setMuted(isMuted);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F19] via-[#0B0F19] to-[#0B0F19]" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-green-500/15 blur-[120px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-[80px]"
        animate={{
          scale: [1, 1.5, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      />

      {/* Mute button */}
      <button
        onClick={toggleSound}
        className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 transition-colors hover:text-white/70"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Unlock icon */}
        <motion.div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Lock className="h-10 w-10 text-green-400" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mb-3 text-4xl sm:text-5xl font-bold text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Congratulations{' '}
          <span className="inline-block">
            🎉
            <motion.span
              className="inline-block"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 1 }}
            />
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          className="mb-10 text-lg text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          You&apos;ve unlocked <span className="font-semibold text-blue-400">PRO Plan (₹299)</span> —{' '}
          <span className="font-semibold text-green-400">FREE</span> this month
        </motion.p>

        {/* Animated counter */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-white/30">
            Your Virtual Capital
          </p>
          <AnimatedCounter
            target={capital}
            duration={2500}
            onComplete={handleCounterComplete}
            sound={sound}
          />
        </motion.div>

        {/* Pulse glow when done */}
        {counterDone && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.3, 0], scale: [0.5, 2, 2.5] }}
            transition={{ duration: 1.5 }}
          >
            <div className="h-64 w-64 rounded-full bg-green-400 blur-[100px]" />
          </motion.div>
        )}

        {/* Enter Dashboard CTA */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: counterDone ? 1 : 0.3, y: counterDone ? 0 : 30 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={() => {
              sound.click();
              onEnterDashboard();
            }}
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(37, 99, 235, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-blue-400"
            disabled={!counterDone}
          >
            <Rocket className="h-5 w-5" />
            Enter Dashboard
          </motion.button>
          <p className="text-sm text-white/30">
            Your <span className="text-green-400/60 font-medium">₹{capital.toLocaleString('en-IN')}</span> is ready to trade
          </p>
        </motion.div>
      </motion.div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

/* ============================================================
   MAIN ONBOARDING FLOW
   ============================================================ */

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.95,
  }),
};

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const soundEngine = useMemo(() => new SoundEngine(), []);
  const soundRef = useRef(soundEngine);
  useEffect(() => { soundRef.current = soundEngine; }, [soundEngine]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      soundRef.current.click();
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection(-1);
      soundRef.current.click();
      setStep((s) => s - 1);
    }
  }, [step]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return data.name.trim().length >= 2 && data.phone.length === 10;
      case 2: return data.experience !== '';
      case 3: return data.tradingStyle !== '';
      case 4: return data.market !== '';
      case 5: return data.capital > 0;
      case 6: return data.goal !== '';
      case 7: return data.riskLevel !== '';
      default: return false;
    }
  }, [data, step]);

  const handleComplete = useCallback(async () => {
    soundRef.current.click();
    setIsSubmitting(true);

    try {
      // Save to API
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Even if API fails, show reward (client-side state is enough)
    }

    setIsSubmitting(false);
    setShowReward(true);
    setTimeout(() => soundRef.current.success(), 300);
  }, [data]);

  const handleEnterDashboard = useCallback(() => {
    soundRef.current.click();
    // Navigate to dashboard
    window.location.href = '/dashboard';
  }, []);

  const StepIcon = STEP_CONFIG[step - 1]?.icon ?? Sparkles;

  // ─── If on reward screen ───
  if (showReward) {
    return (
      <RewardScreen
        capital={data.capital}
        onEnterDashboard={handleEnterDashboard}
        sound={soundEngine}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0B0F19]">
      {/* ─── Background effects ─── */}
      {/* Ambient gradient orb */}
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/[0.07] blur-[120px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ─── Top: Progress bar ─── */}
      <div className="relative z-10 px-6 pt-8 pb-4">
        <ProgressBar currentStep={step} total={TOTAL_STEPS} />
      </div>

      {/* ─── Main content area ─── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-lg">
          {/* Step header */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`header-${step}`}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="mb-10 text-center"
            >
              {/* Step icon */}
              <motion.div
                className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <StepIcon className="h-6 w-6 text-blue-400" />
              </motion.div>

              <h2 className="mb-2 text-2xl sm:text-3xl font-bold text-white">
                {STEP_CONFIG[step - 1]?.title}
              </h2>
              <p className="text-sm sm:text-base text-white/40">
                {STEP_CONFIG[step - 1]?.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Step body */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`body-${step}`}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              {step === 1 && (
                <StepNamePhone data={data} update={updateData} sound={soundEngine} />
              )}
              {step === 2 && (
                <StepOptions
                  options={EXPERIENCE_OPTIONS}
                  value={data.experience}
                  onSelect={(v) => {
                    updateData({ experience: v });
                    // Auto-advance on selection
                    setTimeout(goNext, 300);
                  }}
                  sound={soundEngine}
                />
              )}
              {step === 3 && (
                <StepOptions
                  options={TRADING_STYLE_OPTIONS}
                  value={data.tradingStyle}
                  onSelect={(v) => {
                    updateData({ tradingStyle: v });
                    setTimeout(goNext, 300);
                  }}
                  sound={soundEngine}
                />
              )}
              {step === 4 && (
                <StepOptions
                  options={MARKET_OPTIONS}
                  value={data.market}
                  onSelect={(v) => {
                    updateData({ market: v });
                    setTimeout(goNext, 300);
                  }}
                  sound={soundEngine}
                />
              )}
              {step === 5 && (
                <StepCapital data={data} update={updateData} sound={soundEngine} />
              )}
              {step === 6 && (
                <StepOptions
                  options={GOAL_OPTIONS}
                  value={data.goal}
                  onSelect={(v) => {
                    updateData({ goal: v });
                    setTimeout(goNext, 300);
                  }}
                  sound={soundEngine}
                />
              )}
              {step === 7 && (
                <StepOptions
                  options={RISK_OPTIONS}
                  value={data.riskLevel}
                  onSelect={(v) => {
                    updateData({ riskLevel: v });
                    setTimeout(goNext, 300);
                  }}
                  sound={soundEngine}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Bottom: Navigation buttons ─── */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.04] px-6 py-5">
        {/* Back button */}
        {step > 1 ? (
          <motion.button
            onClick={goBack}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </motion.button>
        ) : (
          <div className="w-16" />
        )}

        {/* Next / Complete button */}
        {step < TOTAL_STEPS ? (
          <Button
            onClick={goNext}
            disabled={!canProceed}
            className="group flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-30 disabled:shadow-none"
          >
            Continue
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={!canProceed || isSubmitting}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition-all hover:from-green-500 hover:to-green-400 disabled:opacity-30 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Setting up...
              </>
            ) : (
              <>
                <PartyPopper className="h-4 w-4" />
                Complete Setup
              </>
            )}
          </Button>
        )}
      </div>

      {/* ─── Step counter badge ─── */}
      <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
        <p className="text-xs text-white/20">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}
