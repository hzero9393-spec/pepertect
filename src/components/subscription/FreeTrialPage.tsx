'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn, formatINR } from '@/lib/utils';
import {
  Gift, Clock, CheckCircle2, Sparkles, Zap, TrendingUp, BookOpen,
  ArrowRight, Loader2, AlertTriangle, Crown, ChevronLeft, ShieldCheck,
  Smartphone, Download,
} from 'lucide-react';

interface TrialStatus {
  eligible: boolean;
  active: boolean;
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  startedAt: string | null;
  endsAt: string | null;
  plan: string;
  planPrice: number;
  durationDays: number;
  message: string;
}

const PREMIUM_FEATURES = [
  { icon: Zap,           title: 'Unlimited Trades',          desc: 'No daily limit on orders, baskets, or option-chain trades.' },
  { icon: TrendingUp,    title: 'Advanced Analytics',        desc: 'Full P&L breakdown, sector exposure, risk metrics & win-rate analysis.' },
  { icon: BookOpen,      title: 'Premium Learning Paths',    desc: 'Unlock advanced modules: Options Greeks, Hedging, Algo Basics.' },
  { icon: ShieldCheck,   title: 'Priority Support',          desc: '24×7 priority ticket response + live chat during market hours.' },
  { icon: Crown,         title: 'F&O Multi-Leg Strategies',  desc: 'Iron Condor, Butterfly, Calendar Spreads with 1-click execution.' },
  { icon: Sparkles,      title: 'AI Trade Insights',         desc: 'Pattern recognition + sentiment-driven trade ideas on every stock.' },
];

const FAQS = [
  {
    q: 'Is the trial really free?',
    a: 'Yes — your card is never charged. The trial gives you full PREMIUM access for 30 days. After that, you can upgrade to PREMIUM for ₹299/month or continue with the FREE plan.',
  },
  {
    q: 'What happens to my positions when the trial ends?',
    a: 'All open positions stay in your portfolio. You can still close them anytime. Only new PREMIUM-only features (like multi-leg baskets) become unavailable until you upgrade.',
  },
  {
    q: 'Can I restart the trial later?',
    a: 'No — the 30-day free trial is available once per account. Once it ends, you can subscribe to PREMIUM for ₹299/month to keep all features.',
  },
  {
    q: 'Will my virtual capital reset when the trial starts?',
    a: 'No. Your existing ₹1,00,000 virtual capital and any open positions are preserved. The trial only unlocks PREMIUM features; it does not touch your trading data.',
  },
];

export function FreeTrialPage() {
  const { token, user, login } = useAuthStore();
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Real-time countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/trial-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch (err) {
      console.error('Trial fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  // Real-time countdown timer - updates every second
  useEffect(() => {
    if (!status?.active || !status.endsAt) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(status.endsAt!).getTime();
      const diff = Math.max(0, endTime - now);

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        // Refresh status to show expired
        fetchStatus();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    // Initial call
    updateTimeLeft();
    
    // Update every second
    intervalRef.current = setInterval(updateTimeLeft, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status?.active, status?.endsAt]);

  const startTrial = async () => {
    setStarting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/user/trial-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
        setSuccessMsg(data.message || 'Free trial started!');
        // Update local user tier to PREMIUM
        if (user) login({ ...user, tier: 'PREMIUM' }, token!);
        // Refresh status
        setTimeout(() => fetchStatus(), 500);
      } else {
        setError(data.error || 'Failed to start trial');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // Install app handler
  const handleInstallApp = async () => {
    // Check if beforeinstallprompt event is available
    const deferredPrompt = (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pepertect_app_installed', 'true');
      }
    } else {
      // Fallback: Show instructions or redirect
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('To install: Tap the Share button, then "Add to Home Screen"');
      } else {
        alert('Look for the install icon in your browser\'s address bar to install this app.');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-bg-surface" />
        <div className="h-48 animate-pulse rounded-2xl bg-bg-surface" />
        <div className="h-48 animate-pulse rounded-2xl bg-bg-surface" />
      </div>
    );
  }

  const totalHoursLeft = status ? status.daysLeft * 24 + status.hoursLeft : 0;
  const progressPct = status
    ? status.active
      ? Math.max(0, Math.min(100, ((30 * 24 - totalHoursLeft) / (30 * 24)) * 100))
      : status.expired
      ? 100
      : 0
    : 0;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* ============== BACK LINK ============== */}
      <a
        href="/profile"
        className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Profile
      </a>

      {/* ============== HERO CARD WITH LIVE TIMER ============== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary via-brand-primary to-blue-700 text-white p-6 shadow-xl">
        {/* Decorative shapes */}
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-accent-gold/20 blur-2xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Gift className="h-3.5 w-3.5" />
            LIMITED TIME OFFER
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold mt-3 leading-tight">
            30 Days Free<br />
            <span className="text-accent-gold">PREMIUM Plan</span>
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/90 max-w-md">
            Get full access to every PREMIUM feature — no card required, no auto-charge.
            Cancel anytime; your virtual capital and positions stay safe.
          </p>

          {/* Status block with REAL-TIME COUNTDOWN */}
          <div className="mt-5 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            {status?.active ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-profit-green animate-pulse" />
                  <span className="text-sm font-semibold">Trial Active — Counting Down</span>
                </div>
                
                {/* REAL-TIME COUNTDOWN TIMER: 25d / 14h / 32m / 18s format */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 py-2">
                  <TimeUnit value={timeLeft.days} label="days" />
                  <span className="text-2xl font-bold text-white/50">/</span>
                  <TimeUnit value={timeLeft.hours} label="hrs" />
                  <span className="text-2xl font-bold text-white/50">/</span>
                  <TimeUnit value={timeLeft.minutes} label="min" />
                  <span className="text-2xl font-bold text-white/50">/</span>
                  <TimeUnit value={timeLeft.seconds} label="sec" pulse />
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2 w-full rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-gold to-profit-green transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/80 text-center">
                  Started {status.startedAt ? new Date(status.startedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  {' · '}Ends {status.endsAt ? new Date(status.endsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </>
            ) : status?.expired ? (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent-gold" />
                  <span className="text-sm font-semibold">Trial Expired</span>
                </div>
                <p className="mt-2 text-sm text-white/90">
                  Your free trial ended on{' '}
                  {status.endsAt ? new Date(status.endsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}.
                </p>
                <a
                  href="/subscription"
                  className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white text-brand-primary font-bold text-sm px-4 hover:bg-white/90 transition-colors"
                >
                  Upgrade to PREMIUM
                  <ArrowRight className="h-4 w-4" />
                </a>
              </>
            ) : status?.eligible ? (
              <>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-gold" />
                  <span className="text-sm font-semibold">You&rsquo;re eligible!</span>
                </div>
                <p className="mt-2 text-sm text-white/90">
                  Start your 30-day free trial now and unlock all PREMIUM features instantly.
                </p>
                <a
                  href="/onboarding"
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent-gold text-brand-primary font-bold text-sm px-5 hover:bg-accent-gold/90 transition-colors"
                >
                  <Gift className="h-4 w-4" />
                  Start Free Trial
                </a>
              </>
            ) : (
              <p className="text-sm text-white/90">{status?.message || 'Loading...'}</p>
            )}
          </div>
        </div>
      </div>

      {/* ============== SUCCESS / ERROR MESSAGES ============== */}
      {successMsg && (
        <div className="card-soft p-3 bg-tint-green border border-profit-green/30 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-profit-green shrink-0" />
          <p className="text-sm font-medium text-profit-green">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="card-soft p-3 bg-tint-red border border-loss-red/30 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-loss-red shrink-0" />
          <p className="text-sm font-medium text-loss-red">{error}</p>
        </div>
      )}

      {/* ============== INSTALL APP CARD (when trial active) ============== */}
      {status?.active && (
        <div className="card-soft p-5 bg-gradient-to-br from-tint-blue to-bg-surface border border-brand-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
              <Smartphone className="h-6 w-6 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-sm font-bold text-text-primary">Install Pepertect App</h3>
              <p className="text-xs text-text-secondary mt-0.5">Get full-screen experience & faster access</p>
            </div>
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover transition-colors active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              Install
            </button>
          </div>
        </div>
      )}

      {/* ============== PRICE COMPARISON ============== */}
      <div>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-3">Plan Comparison</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* FREE */}
          <div className="card-soft p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-text-primary">FREE</h3>
              <span className="pill bg-bg-surface-alt text-text-secondary">Current</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-text-primary">₹0<span className="text-xs font-medium text-text-tertiary">/mo</span></p>
            <ul className="mt-4 space-y-2">
              <FeatureRow ok label="₹1,00,000 Virtual Capital" />
              <FeatureRow ok label="Up to 5 trades / day" />
              <FeatureRow ok label="Basic charts (1D / 1W / 1M)" />
              <FeatureRow ok={false} label="Advanced analytics" />
              <FeatureRow ok={false} label="Multi-leg baskets" />
              <FeatureRow ok={false} label="Premium learning paths" />
            </ul>
          </div>

          {/* PREMIUM (Trial) */}
          <div className="card-soft p-5 ring-2 ring-brand-primary relative">
            <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-accent-gold px-2.5 py-0.5 text-[10px] font-bold text-brand-primary uppercase tracking-wide">
              <Sparkles className="h-3 w-3" />
              Free for 30 days
            </span>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-text-primary">PREMIUM</h3>
              {status?.active && (
                <span className="pill bg-tint-green text-profit-green inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-text-primary">
              {formatINR(status?.planPrice ?? 299)}
              <span className="text-xs font-medium text-text-tertiary">/mo</span>
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">Free for first 30 days, then ₹299/month</p>
            <ul className="mt-4 space-y-2">
              <FeatureRow ok label="₹1,00,000 Virtual Capital" />
              <FeatureRow ok label="Unlimited daily trades" />
              <FeatureRow ok label="Advanced charts (5Y + indicators)" />
              <FeatureRow ok label="Advanced analytics + risk metrics" />
              <FeatureRow ok label="Multi-leg baskets (Iron Condor, etc.)" />
              <FeatureRow ok label="Premium learning paths + AI insights" />
            </ul>
          </div>
        </div>
      </div>

      {/* ============== FEATURES LIST ============== */}
      <div>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-3">What&rsquo;s included in PREMIUM</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {PREMIUM_FEATURES.map((f) => (
            <div key={f.title} className="card-soft p-4 flex items-start gap-3">
              <div className="icon-tile-sm bg-tint-blue shrink-0">
                <f.icon className="h-4 w-4 text-brand-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{f.title}</p>
                <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============== FAQ ============== */}
      <div>
        <h2 className="font-heading text-lg font-bold text-text-primary mb-3">Frequently asked questions</h2>
        <div className="card-soft p-1">
          {FAQS.map((faq, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className={cn(
                'w-full text-left px-4 py-3.5 transition-colors hover:bg-bg-surface-alt',
                i !== FAQS.length - 1 && 'border-b border-border'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">{faq.q}</p>
                <span className={cn('text-text-tertiary transition-transform', openFaq === i && 'rotate-180')}>
                  ▾
                </span>
              </div>
              {openFaq === i && (
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">{faq.a}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============== FOOTER CTA ============== */}
      {status?.eligible && (
        <div className="card-soft p-5 bg-gradient-to-br from-tint-blue to-bg-surface border border-brand-primary/20 text-center">
          <Clock className="h-7 w-7 text-brand-primary mx-auto" />
          <p className="mt-2 font-heading text-base font-bold text-text-primary">
            Your 30 days of free PREMIUM is waiting.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            No credit card. No auto-charge. Cancel anytime.
          </p>
          <a
            href="/onboarding"
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-primary text-white font-bold text-sm px-6 hover:bg-brand-primary-hover transition-colors"
          >
            <Gift className="h-4 w-4" />
            Activate Free Trial
          </a>
        </div>
      )}
    </div>
  );
}

/* ========== TIME UNIT COMPONENT FOR COUNTDOWN ========== */
function TimeUnit({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "flex min-w-[52px] sm:min-w-[60px] items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm px-2 py-1.5 sm:px-3",
        pulse && "animate-pulse"
      )}>
        <span className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-white">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-white/70 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function FeatureRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-profit-green shrink-0 mt-0.5" />
      ) : (
        <span className="h-4 w-4 shrink-0 mt-0.5 flex items-center justify-center text-text-tertiary">✕</span>
      )}
      <span className={cn(ok ? 'text-text-primary' : 'text-text-tertiary line-through')}>{label}</span>
    </li>
  );
}

// Type for install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
