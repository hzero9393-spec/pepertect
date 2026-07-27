'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, ExternalLink, Check, Loader2, Mail, Lock, User, ArrowRight, ArrowLeft, Shield, Fingerprint } from 'lucide-react';
import { isDisposableEmail } from '@/lib/temp-email-domains';

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

/* ── OTP Input Component ── */
function OtpInput({ length = 6, onComplete }: { length?: number; onComplete: (otp: string) => void }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newValues = [...values];
    newValues[idx] = digit;
    setValues(newValues);

    // Auto-focus next
    if (digit && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }

    // Check if complete
    if (newValues.every(v => v !== '') && digit) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length > 0) {
      const newValues = [...values];
      for (let i = 0; i < pasted.length && i < length; i++) {
        newValues[i] = pasted[i];
      }
      setValues(newValues);
      if (pasted.length >= length) {
        onComplete(pasted);
        inputs.current[length - 1]?.focus();
      } else {
        inputs.current[pasted.length]?.focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="flex h-12 w-11 items-center justify-center rounded-lg border-2 border-border bg-bg-surface text-center font-mono text-lg font-bold text-text-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/30 transition-all"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

/* ── Generate fingerprint lazily ── */
function useFingerprint() {
  const [fp, setFp] = useState('');

  useEffect(() => {
    import('@/lib/fingerprint').then(({ generateFingerprint }) => {
      setFp(generateFingerprint());
    });
  }, []);

  return fp;
}

/* ══════════════════════════════════════════════════════════════
 * RegisterPage — Multi-step with OTP verification
 * Steps: 1=Email, 2=OTP, 3=Details, 4=Done
 * ══════════════════════════════════════════════════════════════ */
export function RegisterPage() {
  const { login } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Step 1: Email
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Step 2: OTP
  const [verifyToken, setVerifyToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Step 3: Account details
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const fingerprint = useFingerprint();

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [otpCooldown]);

  /* ── Debug OTP (shown during testing until email template is configured) ── */
  const [debugOtp, setDebugOtp] = useState('');

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async () => {
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    if (isDisposableEmail(email)) { setError('Disposable emails are not allowed. Please use a real email.'); return; }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        // Show debug OTP if available (for testing — remove in production)
        if (data._debug) setDebugOtp(data._debug);
        setOtpSent(true);
        setStep(2);
        setOtpCooldown(60);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpCooldown(60);
        setError('');
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = useCallback(async (otp: string) => {
    if (otp.length < 6) return;
    setError('');
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyToken(data.verifyToken);
        setStep(3);
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch {
      setError('Network error');
    } finally {
      setOtpLoading(false);
    }
  }, [email]);

  /* ── Step 3: Complete Registration ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!acceptedTerms || !acceptedPrivacy) { setError('Please accept Terms and Privacy Policy'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, name,
          acceptedTerms, acceptedPrivacy,
          verifyToken,
          fingerprint: fingerprint || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.user, data.token);
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth Redirect Flow (no GSI popup issues) ── */
  const triggerGoogleSignUp = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const redirectUri = window.location.origin + '/api/auth/google/callback';
    const state = 'register_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Handle Google OAuth callback errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get('error');
    if (googleError) {
      setError(`Google sign-up was cancelled or failed: ${googleError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ── Progress bar ── */
  const progressSteps = [
    { num: 1, label: 'Email' },
    { num: 2, label: 'Verify' },
    { num: 3, label: 'Details' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-6">
      <div className="w-full max-w-[400px] space-y-5">
        {/* Logo */}
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-lg shadow-brand-primary/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Create Account</h1>
          <p className="text-[11px] text-text-secondary">Start paper trading with virtual capital</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1">
          {progressSteps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                step >= s.num ? 'bg-brand-primary text-white' : 'bg-bg-surface-alt text-text-tertiary'
              }`}>
                {step > s.num ? <Check className="h-3 w-3" /> : s.num}
              </div>
              {i < progressSteps.length - 1 && (
                <div className={`h-px w-6 transition-colors ${step > s.num ? 'bg-brand-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Google Button (redirect flow — no popup issues) */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); triggerGoogleSignUp(); }}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-surface-alt hover:shadow-sm active:scale-[0.98]"
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </a>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">or sign up with email</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-loss-red/20 bg-loss-red/5 px-3 py-2 text-xs text-loss-red">
            {error}
          </div>
        )}

        {/* ═══════════ STEP 1: EMAIL ═══════════ */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-text-secondary">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  className="pl-9 h-10 rounded-lg border-border bg-bg-surface text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleSendOtp}
              disabled={loading || !email.includes('@')}
              className="w-full h-10 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-primary/20 active:scale-[0.98]"
            >
              {loading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Sending OTP...</> : <>Send Verification Code <ArrowRight className="ml-1 h-3.5 w-3.5" /></>}
            </Button>
          </div>
        )}

        {/* ═══════════ STEP 2: OTP ═══════════ */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Debug OTP banner (testing — remove in production) */}
            {debugOtp && (
              <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-4 py-3 text-center">
                <p className="text-[10px] text-text-tertiary mb-1">Your verification code (testing):</p>
                <p className="text-2xl font-bold font-mono tracking-[8px] text-brand-primary">{debugOtp}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-text-secondary">
                We sent a 6-digit code to <span className="font-semibold text-text-primary">{email}</span>
              </p>
            </div>

            <OtpInput onComplete={handleVerifyOtp} />

            {otpLoading && (
              <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
                <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Change email
              </button>
              <button
                onClick={handleResendOtp}
                disabled={otpCooldown > 0}
                className="text-[11px] font-medium text-brand-primary hover:underline disabled:text-text-tertiary disabled:no-underline"
              >
                {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: ACCOUNT DETAILS ═══════════ */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-2.5">
            {/* Verified badge */}
            <div className="flex items-center gap-1.5 rounded-lg bg-profit-green/10 border border-profit-green/20 px-3 py-2">
              <Shield className="h-3 w-3 text-profit-green" />
              <span className="text-[11px] font-medium text-profit-green">Email verified</span>
              <span className="text-[10px] text-text-tertiary ml-auto">{email}</span>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-text-secondary">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="pl-9 h-10 rounded-lg border-border bg-bg-surface text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-text-secondary">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <Input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required className="pl-9 h-10 rounded-lg border-border bg-bg-surface text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-text-secondary">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <Input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="pl-9 h-10 rounded-lg border-border bg-bg-surface text-sm" />
              </div>
            </div>

            {/* Compact Legal checkboxes */}
            <div className="flex items-center gap-3 px-0.5 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setAcceptedTerms(v => !v)}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                    acceptedTerms ? 'bg-brand-primary border-brand-primary text-white' : 'border-border bg-bg-base'
                  }`}
                >
                  {acceptedTerms && <Check className="h-2 w-2" strokeWidth={3} />}
                </button>
                <span className="text-[10px] text-text-secondary leading-tight">
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">Terms</a>
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setAcceptedPrivacy(v => !v)}
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                    acceptedPrivacy ? 'bg-brand-primary border-brand-primary text-white' : 'border-border bg-bg-base'
                  }`}
                >
                  {acceptedPrivacy && <Check className="h-2 w-2" strokeWidth={3} />}
                </button>
                <span className="text-[10px] text-text-secondary leading-tight">
                  <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">Privacy Policy</a>
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-primary/20 active:scale-[0.98]"
              disabled={loading || !acceptedTerms || !acceptedPrivacy}
            >
              {loading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Creating Account...</> : <>Create Account <ArrowRight className="ml-1 h-3.5 w-3.5" /></>}
            </Button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <a href="/login" className="text-brand-primary hover:underline font-semibold">Sign in</a>
        </p>
      </div>
    </div>
  );
}
