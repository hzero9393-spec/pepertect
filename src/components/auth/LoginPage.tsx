'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

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

  /* ---------- Google Sign-In (GSI) ---------- */
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

  const handleGoogleCredentialResponse = useCallback(async (response: { credential: string }) => {
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
  }, [login]);

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
  }, [googleScriptLoaded, handleGoogleCredentialResponse]);

  const triggerGoogleLogin = () => {
    if (typeof window !== 'undefined') {
      // @ts-expect-error google is injected by the GSI script
      window.google?.accounts?.id?.prompt();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-lg shadow-brand-primary/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-xs text-text-secondary">Sign in to Pepertect to continue trading</p>
        </div>

        {/* Custom Google Sign-In Button */}
        <button
          type="button"
          onClick={triggerGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-surface-alt hover:shadow-sm active:scale-[0.98] disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">or continue with email</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleLogin} className="space-y-3">
          {error && (
            <div className="rounded-lg border border-loss-red/20 bg-loss-red/5 px-3 py-2 text-xs text-loss-red">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-medium text-text-secondary">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 h-10 rounded-lg border-border bg-bg-surface text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[11px] font-medium text-text-secondary">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 h-10 rounded-lg border-border bg-bg-surface text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-primary/20 active:scale-[0.98]"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Signing in...</>
            ) : (
              <>Sign In <ArrowRight className="ml-1 h-3.5 w-3.5" /></>
            )}
          </Button>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || googleLoading}
            className="w-full py-2 rounded-lg border border-dashed border-border text-[11px] font-medium text-text-tertiary hover:bg-bg-surface-alt hover:text-text-primary transition-colors"
          >
            Try Demo Account — No signup required
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-text-secondary">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-brand-primary hover:underline font-semibold">
            Sign up free
          </a>
        </p>
      </div>
    </div>
  );
}
