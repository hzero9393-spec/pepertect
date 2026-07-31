'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Zap, Loader2, Mail, ArrowRight, ArrowLeft, CheckCircle2,
  Shield, RefreshCw, Fingerprint,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isDisposableEmail } from '@/lib/temp-email-domains';

type AuthStep = 'email' | 'otp' | 'success';

/* ── Google SVG Icon ── */
function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ── Google OAuth Redirect ── */
function buildGoogleAuthUrl(state: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = typeof window !== 'undefined' ? window.location.origin + '/api/auth/google/callback' : '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function LoginPage() {
  const { login } = useAuthStore();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const otpInputRef = useRef<HTMLDivElement>(null);

  /* ── Countdown timers ── */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  /* Global rate limit cooldown (e.g. 60s after Supabase rate limit) */
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setTimeout(() => setRateLimitCooldown((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCooldown]);

  /* ── Auto-focus OTP input ── */
  useEffect(() => {
    if (step === 'otp') {
      // Small delay so the DOM updates first
      setTimeout(() => {
        otpInputRef.current?.querySelector('input')?.focus();
      }, 100);
    }
  }, [step]);

  /* ── Handle Google OAuth callback errors ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get('error');
    if (googleError) {
      setError(`Google sign-in was cancelled or failed: ${googleError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ── Mask email for display ── */
  const maskEmail = (e: string) => {
    const [user, domain] = e.split('@');
    if (!domain) return e;
    const visible = user.slice(0, 2);
    const hidden = '*'.repeat(Math.max(user.length - 2, 3));
    return `${visible}${hidden}@${domain}`;
  };

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    if (isDisposableEmail(email)) {
      setError('Disposable emails are not allowed. Please use a real email.');
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // We handle OTP manually, not magic link redirect
        },
      });

      if (otpError) {
        if (otpError.message.includes('rate limit') || otpError.code === 'over_email_send_rate_limit') {
          const cooldown = 60;
          setRateLimitCooldown(cooldown);
          setError(`Too many OTP requests. Please wait ${cooldown} seconds before trying again.`);
        } else {
          setError(otpError.message);
        }
        return;
      }

      // OTP sent successfully — move to verification step
      setMaskedEmail(maskEmail(email));
      setStep('otp');
      setOtp('');
      setResendTimer(60);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = useCallback(
    async (otpValue: string) => {
      if (otpValue.length !== 6) return;
      setError('');
      setLoading(true);

      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: email.toLowerCase().trim(),
          token: otpValue,
          type: 'email',
        });

        if (verifyError || !data.session) {
          setError('Invalid OTP. Please check and try again.');
          setLoading(false);
          return;
        }

        // Supabase session verified — now link with our backend
        const res = await fetch('/api/auth/supabase-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const result = await res.json();

        if (result.success && result.user) {
          login(result.user, result.token);
          setStep('success');
          // Auto-redirect after showing success
          setTimeout(() => {
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }, 800);
        } else {
          setError(result.error || 'Failed to create session. Please try again.');
          setLoading(false);
        }
      } catch {
        setError('Network error. Please try again.');
        setLoading(false);
      }
    },
    [email, login]
  );

  /* ── OTP change handler ── */
  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      handleVerifyOtp(value);
    }
  };

  /* ── Resend OTP ── */
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
      });

      if (otpError) {
        if (otpError.message.includes('rate limit') || otpError.code === 'over_email_send_rate_limit') {
          const cooldown = 60;
          setRateLimitCooldown(cooldown);
          setError(`Too many OTP requests. Please wait ${cooldown} seconds before trying again.`);
        } else {
          setError(otpError.message);
        }
        return;
      }
      setResendTimer(60);
      setOtp('');
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth Redirect Flow ── */
  const triggerGoogleLogin = () => {
    const state = 'login_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    window.location.href = buildGoogleAuthUrl(state);
  };

  /* ── Go back to email step ── */
  const goBack = () => {
    setStep('email');
    setOtp('');
    setError('');
    setResendTimer(0);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-lg shadow-brand-primary/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          {step === 'email' && (
            <>
              <h1 className="font-heading text-xl font-bold text-text-primary">Welcome to Pepertect</h1>
              <p className="text-xs text-text-secondary">Sign in with your email — no password needed</p>
            </>
          )}
          {step === 'otp' && (
            <>
              <h1 className="font-heading text-xl font-bold text-text-primary">Check your email</h1>
              <p className="text-xs text-text-secondary">
                We sent a 6-digit code to <span className="font-semibold text-text-primary">{maskedEmail}</span>
              </p>
            </>
          )}
          {step === 'success' && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-profit-green/10">
                <CheckCircle2 className="h-8 w-8 text-profit-green" />
              </div>
              <h1 className="font-heading text-xl font-bold text-text-primary">You&apos;re in!</h1>
              <p className="text-xs text-text-secondary">Redirecting to dashboard...</p>
            </>
          )}
        </div>

        {/* Google Sign-In Button - not shown during OTP/success steps */}
        {step === 'email' && (
          <>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); triggerGoogleLogin(); }}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-surface-alt hover:shadow-sm active:scale-[0.98]"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </a>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">or sign in with email</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-loss-red/20 bg-loss-red/5 px-3.5 py-2.5 text-xs text-loss-red font-medium flex items-start gap-2">
            <span className="shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </span>
            {error}
          </div>
        )}

        {/* ═══ Step 1: Email Form ═══ */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-medium text-text-secondary">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 h-11 rounded-lg border-border bg-bg-surface text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-primary/20 active:scale-[0.98]"
              disabled={loading || rateLimitCooldown > 0}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending OTP...</>
              ) : rateLimitCooldown > 0 ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wait {rateLimitCooldown}s...</>
              ) : (
                <>Send Login Code <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>

            {/* Security note */}
            <div className="flex items-center gap-2 justify-center pt-1">
              <Shield className="h-3 w-3 text-text-tertiary" />
              <span className="text-[10px] text-text-tertiary">
                Secure login — no password stored. OTP expires in 5 minutes.
              </span>
            </div>
          </form>
        )}

        {/* ═══ Step 2: OTP Verification ═══ */}
        {step === 'otp' && (
          <div className="space-y-5">
            {/* OTP Input */}
            <div ref={otpInputRef} className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                disabled={loading}
                containerClassName="gap-2"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 rounded-lg text-lg font-semibold border-border" />
                  <InputOTPSlot index={1} className="h-12 w-12 rounded-lg text-lg font-semibold border-border" />
                  <InputOTPSlot index={2} className="h-12 w-12 rounded-lg text-lg font-semibold border-border" />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-12 rounded-lg text-lg font-semibold border-border" />
                  <InputOTPSlot index={4} className="h-12 w-12 rounded-lg text-lg font-semibold border-border" />
                  <InputOTPSlot index={5} className="h-12 w-12 rounded-lg text-lg font-semibold border-border" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                <span className="text-xs text-text-secondary">Verifying...</span>
              </div>
            )}

            {/* Resend + Back */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-3 w-3" />
                Change email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || loading}
                className="flex items-center gap-1 text-xs text-brand-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendTimer > 0 ? (
                  `Resend in ${resendTimer}s`
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Resend code
                  </>
                )}
              </button>
            </div>

            {/* Help text */}
            <p className="text-center text-[10px] text-text-tertiary leading-relaxed">
              Didn&apos;t receive the code? Check your spam folder or{' '}
              <button onClick={handleResendOtp} disabled={resendTimer > 0 || loading} className="text-brand-primary hover:underline disabled:opacity-50">
                try again
              </button>
            </p>
          </div>
        )}

        {/* ═══ Step 3: Success (auto-redirects) ═══ */}
        {step === 'success' && (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          </div>
        )}

        {/* Footer — only on email step */}
        {step === 'email' && (
          <p className="text-center text-xs text-text-secondary">
            By continuing, you agree to our{' '}
            <a href="/legal/terms" className="text-brand-primary hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/legal/privacy" className="text-brand-primary hover:underline">Privacy Policy</a>
          </p>
        )}
      </div>
    </div>
  );
}
