'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
      // Try demo login
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
        // Create demo account
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
    // Load Google Identity Services script
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
    script.onerror = () => console.error('Failed to load Google Identity Services');
    document.head.appendChild(script);
  }, []);

  // Render Google button after script loads
  useEffect(() => {
    if (!googleScriptLoaded || !googleBtnRef.current || typeof window === 'undefined') return;
    // @ts-expect-error google is injected by the GSI script
    if (window.google?.accounts?.id) {
      // Clear previous button content
      googleBtnRef.current.innerHTML = '';
      // @ts-expect-error google is injected by the GSI script
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        logo_alignment: 'center',
      });
    }
  }, [googleScriptLoaded]);

  // Initialize Google One Tap (handled via callback)
  useEffect(() => {
    if (!googleScriptLoaded || typeof window === 'undefined') return;
    // @ts-expect-error google is injected by the GSI script
    if (window.google?.accounts?.id) {
      // Set up the credential callback for Google One Tap
      // @ts-expect-error google is injected by the GSI script
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        callback: handleGoogleCredentialResponse,
      });
      // Optionally prompt for One Tap (commented out — only render button)
      // window.google.accounts.id.prompt();
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
            <Zap className="h-6 w-6 text-brand-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Pepertect account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-loss-red">{error}</p>
            )}

            <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white" disabled={loading || googleLoading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={loading || googleLoading}
            >
              Try Demo Account
            </Button>
          </form>

          {/* Google Sign-In divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-bg-surface px-2 text-text-tertiary">or continue with</span>
            </div>
          </div>

          {/* Google Sign-In button */}
          {googleLoading ? (
            <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in with Google…
            </div>
          ) : (
            <div ref={googleBtnRef} className="flex justify-center" />
          )}

          <p className="mt-4 text-center text-sm text-text-secondary">
            Don&apos;t have an account?{' '}
            <a href="/register" className="text-brand-primary hover:underline font-medium">
              Sign up free
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
