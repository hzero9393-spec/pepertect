'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, ExternalLink, Check, Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';

export function RegisterPage() {
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

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

  /* ---------- Google Sign-Up ---------- */
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) { setGoogleScriptLoaded(true); return; }
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
        shape: 'rectangular',
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
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-6">
      <div className="w-full max-w-[420px] space-y-5">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-lg shadow-brand-primary/20">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Create Account</h1>
          <p className="text-sm text-text-secondary">Start paper trading with ₹1,00,000 virtual capital</p>
        </div>

        {/* Google Sign-Up — quick action */}
        {googleLoading ? (
          <div className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-bg-surface py-3 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account with Google…
          </div>
        ) : (
          <div ref={googleBtnRef} />
        )}

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">or sign up with email</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleRegister} className="space-y-3">
          {error && (
            <div className="rounded-lg border border-loss-red/20 bg-loss-red/5 px-3 py-2.5 text-sm text-loss-red">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-text-secondary">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="pl-9 h-11 rounded-lg border-border bg-bg-surface text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-text-secondary">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9 h-11 rounded-lg border-border bg-bg-surface text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-text-secondary">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input id="password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9 h-11 rounded-lg border-border bg-bg-surface text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-xs font-medium text-text-secondary">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input id="confirm" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-9 h-11 rounded-lg border-border bg-bg-surface text-sm" />
            </div>
          </div>

          {/* Compact Legal checkboxes */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 px-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setAcceptedTerms((v) => !v)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                  acceptedTerms ? 'bg-brand-primary border-brand-primary text-white' : 'border-border bg-bg-base'
                }`}
              >
                {acceptedTerms && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </button>
              <span className="text-[11px] text-text-secondary">
                I accept the{' '}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline inline-flex items-center gap-0.5">
                  Terms <ExternalLink className="h-2 w-2" />
                </a>
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setAcceptedPrivacy((v) => !v)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                  acceptedPrivacy ? 'bg-brand-primary border-brand-primary text-white' : 'border-border bg-bg-base'
                }`}
              >
                {acceptedPrivacy && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </button>
              <span className="text-[11px] text-text-secondary">
                I accept the{' '}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline inline-flex items-center gap-0.5">
                  Privacy Policy <ExternalLink className="h-2 w-2" />
                </a>
              </span>
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-primary/20"
            disabled={loading || googleLoading || !acceptedTerms || !acceptedPrivacy}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account…</>
            ) : (
              <>Create Account <ArrowRight className="ml-1.5 h-4 w-4" /></>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <a href="/login" className="text-brand-primary hover:underline font-semibold">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
