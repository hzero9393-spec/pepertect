'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  X, Gift, Sparkles, Zap, Trophy, TrendingUp, ArrowRight,
  Clock, Shield, CheckCircle2, PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/* ================================================================
   CONSTANTS
   ================================================================ */

// localStorage key to track if user dismissed popup permanently
const DISMISS_KEY = 'pepertect-trial-popup-dismissed';
// Session-based key (resets on browser close)
const SESSION_DISMISS_KEY = 'pepertect-trial-popup-session-dismissed';

/* ================================================================
   FEATURES LIST (shown in popup)
   ================================================================ */

const TRIAL_FEATURES = [
  { icon: Zap, text: 'Unlimited paper trades' },
  { icon: TrendingUp, text: 'Real-time market data' },
  { icon: Trophy, text: 'Options & F&O trading' },
  { icon: Shield, text: 'Advanced P&L analytics' },
  { icon: Sparkles, text: 'Premium learning paths' },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

/**
 * FirstTimeTrialPopup — Modal popup for NEW users who haven't activated free trial.
 *
 * Behavior:
 * - Shows ONLY when user is authenticated AND trial is ELIGIBLE (never used)
 * - One-time display: Once dismissed or trial activated, never shows again
 * - "Maybe Later" dismisses for current session only
 * - "Activate Now" redirects to /onboarding flow
 */
export function FirstTimeTrialPopup() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAuthStore();
  
  const [showPopup, setShowPopup] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  /* ---------- Check eligibility with retry ---------- */
  const checkEligibility = useCallback(async (retryNum = 0) => {
    if (!token || !isAuthenticated) {
      setChecking(false);
      return;
    }

    // Check if permanently dismissed (user clicked "Don't show again")
    const permanentlyDismissed = typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true';
    if (permanentlyDismissed) {
      console.log('[FirstTimeTrialPopup] Permanently dismissed');
      setChecking(false);
      return;
    }

    // Check session dismissal
    const sessionDismissed = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
    if (sessionDismissed) {
      console.log('[FirstTimeTrialPopup] Session dismissed');
      setChecking(false);
      return;
    }

    try {
      console.log(`[FirstTimeTrialPopup] Checking eligibility (attempt ${retryNum + 1})...`);
      const res = await fetch('/api/user/trial-status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store', // Don't cache - always get fresh data
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('[FirstTimeTrialPopup] API response:', data);
      
      if (data.success && data.data?.eligible) {
        console.log('[FirstTimeTrialPopup] User is ELIGIBLE - showing popup');
        setEligible(true);
        // Show immediately without delay for better UX
        setShowPopup(true);
      } else if (data.success && data.data) {
        // User has active/used trial - don't show popup
        console.log('[FirstTimeTrialPopup] Not eligible:', data.data.message || 'reason unknown');
        setEligible(false);
      } else {
        // Unexpected response format
        console.warn('[FirstTimeTrialPopup] Unexpected response:', data);
      }
    } catch (err) {
      console.error(`[FirstTimeTrialPopup] Eligibility check failed (attempt ${retryNum + 1}):`, err);
      
      // Retry logic for network errors
      if (retryNum < MAX_RETRIES - 1) {
        const delay = (retryNum + 1) * 1000; // 1s, 2s, 3s delays
        console.log(`[FirstTimeTrialPopup] Retrying in ${delay}ms...`);
        setTimeout(() => checkEligibility(retryNum + 1), delay);
        return; // Don't set checking=false yet
      }
    } finally {
      if (retryNum >= MAX_RETRIES - 1 || eligible) {
        setChecking(false);
      }
    }
  }, [token, isAuthenticated, eligible]);

  useEffect(() => {
    // Small initial delay to ensure auth store is ready
    const timer = setTimeout(() => {
      checkEligibility(0);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [checkEligibility]);

  /* ---------- Handlers ---------- */
  
  const handleActivate = () => {
    // Mark as dismissed so it doesn't show again on redirect back
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
    setShowPopup(false);
    router.push('/onboarding');
  };

  const handleMaybeLater = () => {
    // Only dismiss for this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    }
    handleClose();
  };

  const handleDontShowAgain = () => {
    // Permanently dismiss
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
    handleClose();
  };

  const handleClose = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      setShowPopup(false);
      setDismissed(true);
    }, 300);
  };

  /* ---------- Loading / Hidden states ---------- */
  
  // Show nothing while checking or not authenticated
  if (!isAuthenticated || isLoading || checking) return null;
  if (!showPopup || dismissed || !eligible) return null;

  /* ========== RENDER ========== */
  return (
    <AnimatePresence>
      {!dismissed && showPopup && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={handleMaybeLater}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ 
              type: 'spring', 
              stiffness: 380, 
              damping: 28,
              ...(animatingOut ? { duration: 0.2 } : {})
            }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div 
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-bg-base border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ====== GRADIENT HEADER ====== */}
              <div className="relative overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary-hover to-accent-gold px-6 pt-8 pb-12">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-accent-gold/20 blur-xl" />
                
                {/* Close button */}
                <button
                  onClick={handleMaybeLater}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Badge */}
                <div className="relative flex items-center gap-1.5 self-start rounded-full bg-white/15 px-3 py-1 mb-4">
                  <PartyPopper className="h-3.5 w-3.5 text-accent-gold" />
                  <span className="text-xs font-semibold text-white">Limited Time Offer</span>
                </div>

                {/* Title */}
                <h2 className="relative font-heading text-2xl font-bold text-white">
                  Start Your Free Trial!
                </h2>
                <p className="relative mt-2 text-sm text-white/80">
                  Get instant access to PREMIUM features with ₹1,00,000 virtual capital.
                </p>
              </div>

              {/* ====== CONTENT CARD (overlaps header) ====== */}
              <div className="relative px-6 -mt-6 pb-6">
                <div className="rounded-xl bg-bg-surface border border-border p-5 shadow-lg">
                  {/* Capital highlight */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Gift className="h-5 w-5 text-accent-gold" />
                    <span className="font-mono text-2xl font-bold text-profit-green">₹1,00,000</span>
                    <span className="text-sm text-text-secondary">Virtual Money</span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2.5 mb-5">
                    {TRIAL_FEATURES.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-profit-green/10">
                          <Icon className="h-3 w-3 text-profit-green" />
                        </div>
                        <span className="text-sm text-text-primary">{text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Timer badge */}
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-tint-blue px-4 py-2.5 mb-5">
                    <Clock className="h-4 w-4 text-brand-primary" />
                    <span className="text-sm font-semibold text-text-primary">
                      <span className="text-brand-primary">30 Days</span> Free Access
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-profit-green" />
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-2.5">
                    <button
                      onClick={handleActivate}
                      className={cn(
                        'w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl',
                        'bg-gradient-to-r from-brand-primary to-brand-primary-hover',
                        'text-white font-bold text-sm',
                        'hover:shadow-lg hover:shadow-brand-primary/30',
                        'transition-all active:scale-[0.98]'
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      Activate Free Trial Now
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handleMaybeLater}
                      className={cn(
                        'w-full h-9 text-sm font-medium text-text-secondary',
                        'hover:text-text-primary transition-colors'
                      )}
                    >
                      Maybe Later
                    </button>
                  </div>
                </div>

                {/* Footer text */}
                <p className="mt-4 text-center text-[11px] text-text-tertiary">
                  No credit card required · Cancel anytime ·{' '}
                  <button
                    onClick={handleDontShowAgain}
                    className="underline hover:text-text-secondary"
                  >
                    Don&apos;t show again
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   HOOK: Use trial popup trigger (for manual triggering)
   ================================================================ */

export function useFirstTimeTrialPopup() {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const sessionDismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
    setCanShow(!dismissed && !sessionDismissed);
  }, []);

  const resetPopup = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DISMISS_KEY);
    sessionStorage.removeItem(SESSION_DISMISS_KEY);
    setCanShow(true);
  }, []);

  const dismissPopup = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DISMISS_KEY, 'true');
    setCanShow(false);
  }, []);

  return { canShow, resetPopup, dismissPopup };
}
