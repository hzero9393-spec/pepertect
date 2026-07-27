'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.user, data.token);
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@pepertect.com', password: 'demo12345' }),
      });
      const data = await res.json();

      if (data.success) {
        login(data.user, data.token);
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'demo@pepertect.com', password: 'demo12345', name: 'Demo Trader' }),
        });
        const regData = await regRes.json();
        if (regData.success) {
          login(regData.user, regData.token);
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else {
          setError('Demo account unavailable. Please register.');
        }
      }
    } catch {
      setError('Network error');
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
        text: 'signin_with',
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
        setError(data.error || 'Google sign-in failed');
      }
    } catch {
      setError('Network error during Google sign-in');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-lg shadow-brand-primary/20">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary">Sign in to Pepertect to continue trading</p>
        </div>

        {/* Google Sign-In — primary action */}
        {googleLoading ? (
          <div className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-bg-surface py-3 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in with Google…
          </div>
        ) : (
          <div ref={googleBtnRef} />
        )}

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">or sign in with email</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleLogin} className="space-y-3">
          {error && (
            <div className="rounded-lg border border-loss-red/20 bg-loss-red/5 px-3 py-2.5 text-sm text-loss-red">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-text-secondary">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
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
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-text-secondary">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 h-11 rounded-lg border-border bg-bg-surface text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-primary/20"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
            ) : (
              <>Sign In <ArrowRight className="ml-1.5 h-4 w-4" /></>
            )}
          </Button>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || googleLoading}
            className="w-full py-2.5 rounded-lg border border-dashed border-border text-xs font-medium text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary transition-colors"
          >
            Try Demo Account — No signup required
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-brand-primary hover:underline font-semibold">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  );
}
