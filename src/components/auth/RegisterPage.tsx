'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, FileText, ChevronDown, ChevronUp, ExternalLink, Check, Loader2 } from 'lucide-react';

export function RegisterPage() {
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* Legal acceptance — required before account creation */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showTermsPreview, setShowTermsPreview] = useState(false);
  const [showPrivacyPreview, setShowPrivacyPreview] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    /* Block registration until both legal checkboxes are checked */
    if (!acceptedTerms) {
      setError('Please accept the Terms & Conditions to continue');
      return;
    }
    if (!acceptedPrivacy) {
      setError('Please accept the Privacy Policy to continue');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, acceptedTerms, acceptedPrivacy }),
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

  /* ---------- Google Sign-In ---------- */
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      setGoogleScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleScriptLoaded || !googleBtnRef.current || typeof window === 'undefined') return;
    // @ts-expect-error google is injected by the GSI script
    if (window.google?.accounts?.id) {
      googleBtnRef.current.innerHTML = '';
      // @ts-expect-error google is injected by the GSI script
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signup_with',
        logo_alignment: 'center',
      });
    }
  }, [googleScriptLoaded]);

  useEffect(() => {
    if (!googleScriptLoaded || typeof window === 'undefined') return;
    // @ts-expect-error google is injected by the GSI script
    if (window.google?.accounts?.id) {
      // @ts-expect-error google is injected by the GSI script
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        callback: handleGoogleCredentialResponse,
      });
    }
  }, [googleScriptLoaded]);

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential }),
      });
      const data = await res.json();
      if (data.success) {
        login(data.user, data.token);
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setError(data.error || 'Google sign-up failed');
      }
    } catch {
      setError('Network error during Google sign-up');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
            <Zap className="h-6 w-6 text-brand-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Create Account</CardTitle>
          <CardDescription>Start paper trading with ₹1,00,000 virtual capital</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Sign-In — show at top for quick signup */}
          {googleLoading ? (
            <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account with Google…
            </div>
          ) : (
            <>
              <div ref={googleBtnRef} className="mb-4" />
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-bg-surface px-2 text-text-tertiary">or sign up with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input id="confirm" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            {/* ============== LEGAL ACCEPTANCE ============== */}
            <div className="rounded-md border border-border bg-bg-surface px-2.5 py-2 space-y-2">
              {/* Terms & Conditions */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setAcceptedTerms((v) => !v)}
                    className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                      acceptedTerms
                        ? 'bg-brand-primary border-brand-primary text-white'
                        : 'bg-bg-base border-border'
                    }`}
                    aria-label="Accept Terms & Conditions"
                  >
                    {acceptedTerms && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-text-primary leading-tight">
                      I accept the{' '}
                      <a
                        href="/legal/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Terms &amp; Conditions
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTermsPreview((v) => !v)}
                      className="ml-1.5 text-[10px] text-text-tertiary hover:text-text-secondary inline-flex items-center gap-0.5"
                    >
                      {showTermsPreview ? (
                        <>Hide <ChevronUp className="h-2.5 w-2.5" /></>
                      ) : (
                        <>Preview <ChevronDown className="h-2.5 w-2.5" /></>
                      )}
                    </button>
                  </div>
                </label>
                {showTermsPreview && (
                  <div className="mt-1.5 ml-5 max-h-28 overflow-y-auto rounded border border-border bg-bg-base p-2 text-[10px] text-text-secondary leading-relaxed">
                    <p className="font-semibold text-text-primary mb-0.5">Key points:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Pepertect is a paper trading platform — no real money is involved.</li>
                      <li>Virtual capital (₹1,00,000) has no monetary value and cannot be withdrawn.</li>
                      <li>You must be 18+ and provide accurate information.</li>
                      <li>One free trial per user — creating multiple accounts is prohibited.</li>
                      <li>We are not liable for any losses from real-market decisions you make.</li>
                    </ul>
                    <p className="mt-1.5">
                      <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                        Read full Terms →
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {/* Privacy Policy */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setAcceptedPrivacy((v) => !v)}
                    className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                      acceptedPrivacy
                        ? 'bg-brand-primary border-brand-primary text-white'
                        : 'bg-bg-base border-border'
                    }`}
                    aria-label="Accept Privacy Policy"
                  >
                    {acceptedPrivacy && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-text-primary leading-tight">
                      I accept the{' '}
                      <a
                        href="/legal/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Privacy Policy
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyPreview((v) => !v)}
                      className="ml-1.5 text-[10px] text-text-tertiary hover:text-text-secondary inline-flex items-center gap-0.5"
                    >
                      {showPrivacyPreview ? (
                        <>Hide <ChevronUp className="h-2.5 w-2.5" /></>
                      ) : (
                        <>Preview <ChevronDown className="h-2.5 w-2.5" /></>
                      )}
                    </button>
                  </div>
                </label>
                {showPrivacyPreview && (
                  <div className="mt-1.5 ml-5 max-h-28 overflow-y-auto rounded border border-border bg-bg-base p-2 text-[10px] text-text-secondary leading-relaxed">
                    <p className="font-semibold text-text-primary mb-0.5">Key points:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>We collect: name, email, hashed password, device info, virtual trades.</li>
                      <li>We never sell your data. We use it only to operate the platform.</li>
                      <li>Passwords are bcrypt-hashed — we never see your plain-text password.</li>
                      <li>You can delete your account anytime — data removed within 30 days.</li>
                      <li>Governed by India&apos;s DPDP Act, 2023.</li>
                    </ul>
                    <p className="mt-1.5">
                      <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                        Read full Privacy Policy →
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-loss-red">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white disabled:opacity-50"
              disabled={loading || googleLoading || !acceptedTerms || !acceptedPrivacy}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            {(!acceptedTerms || !acceptedPrivacy) && (
              <p className="text-[11px] text-text-tertiary text-center">
                Please accept both Terms and Privacy Policy to enable account creation
              </p>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <a href="/login" className="text-brand-primary hover:underline font-medium">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
