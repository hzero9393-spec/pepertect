'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Shield,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  KeyRound,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';

type Stage = 'loading' | 'enabled' | 'setup' | 'verify';

interface SetupData {
  secret: string;
  qrDataUrl: string;
  otpauthUrl: string;
}

export function TwoFactorPage() {
  const { token } = useAuthStore();
  const [stage, setStage] = useState<Stage>('loading');
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [disableResult, setDisableResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Check current 2FA status on mount
  useEffect(() => {
    if (!token) return;
    fetch('/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStage(d.data.twoFactorEnabled ? 'enabled' : 'setup');
        } else {
          setStage('setup');
        }
      })
      .catch(() => setStage('setup'));
  }, [token]);

  const startSetup = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSetup(data.data);
        setStage('verify');
      } else {
        setResult({ success: false, message: data.error || 'Failed to start 2FA setup' });
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();
      if (data.success) {
        setStage('enabled');
        setCode('');
        setSetup(null);
      } else {
        setResult({ success: false, message: data.error || 'Verification failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const disable2FA = async () => {
    setDisabling(true);
    setDisableResult(null);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableCode }),
      });
      const data = await res.json();
      if (data.success) {
        setStage('setup');
        setDisableCode('');
        setDisableResult(null);
      } else {
        setDisableResult({ success: false, message: data.error || 'Failed to disable 2FA' });
      }
    } catch {
      setDisableResult({ success: false, message: 'Network error' });
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (!setup?.secret) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <a
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt"
          aria-label="Back to profile"
        >
          <ChevronLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary">Two-Factor Authentication</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {stage === 'loading' && (
        <div className="card-soft p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading 2FA status...</span>
        </div>
      )}

      {stage === 'enabled' && (
        <>
          <div className="card-soft p-4 bg-tint-green">
            <div className="flex items-start gap-3">
              <div className="icon-tile bg-profit-green/20">
                <Shield className="h-5 w-5 text-profit-green" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-profit-green">
                  2FA is enabled
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Your account is protected with two-factor authentication.
                  You&rsquo;ll be asked for a verification code on every login.
                </p>
              </div>
            </div>
          </div>

          {/* Disable 2FA */}
          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
              Disable 2FA
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Enter a current 6-digit code from your authenticator app to confirm.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="flex-1 h-11 px-3 rounded-lg border border-border bg-bg-surface-alt text-center font-mono text-lg tracking-[0.5em] font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <button
                onClick={disable2FA}
                disabled={disabling || disableCode.length !== 6}
                className={cn(
                  'rounded-lg px-4 h-11 text-sm font-bold transition-colors',
                  disabling || disableCode.length !== 6
                    ? 'bg-loss-red/40 text-white cursor-not-allowed'
                    : 'bg-loss-red text-white hover:bg-loss-red/90'
                )}
              >
                {disabling ? 'Disabling...' : 'Disable'}
              </button>
            </div>
            {disableResult && (
              <p className={cn(
                'mt-2 text-xs font-medium',
                disableResult.success ? 'text-profit-green' : 'text-loss-red'
              )}>
                {disableResult.message}
              </p>
            )}
          </div>
        </>
      )}

      {stage === 'setup' && (
        <>
          <div className="card-soft p-4">
            <div className="flex items-start gap-3">
              <div className="icon-tile bg-tint-blue">
                <Shield className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-base font-bold text-text-primary">
                  Protect your account
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  2FA adds a second step to your login. Even if someone gets your
                  password, they won&rsquo;t be able to sign in without your phone.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <SetupStep icon={Smartphone} num={1} text="Install Google Authenticator, Authy, or 1Password on your phone" />
              <SetupStep icon={QrCode} num={2} text="Scan the QR code with your authenticator app" />
              <SetupStep icon={KeyRound} num={3} text="Enter the 6-digit code from your app to confirm" />
            </div>

            <button
              onClick={startSetup}
              disabled={submitting}
              className="mt-4 w-full h-11 rounded-lg bg-brand-primary text-white font-bold text-sm hover:bg-brand-primary/90 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating QR code...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Get Started
                </>
              )}
            </button>

            {result && (
              <p className={cn(
                'mt-2 text-xs font-medium text-center',
                result.success ? 'text-profit-green' : 'text-loss-red'
              )}>
                {result.message}
              </p>
            )}
          </div>
        </>
      )}

      {stage === 'verify' && setup && (
        <>
          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-3">
              Step 1: Scan this QR code
            </h3>
            <div className="flex flex-col items-center">
              <div className="rounded-xl border-4 border-white p-2 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qrDataUrl}
                  alt="2FA QR code"
                  width={200}
                  height={200}
                  className="h-48 w-48"
                />
              </div>
              <p className="mt-3 text-xs text-text-secondary text-center max-w-xs">
                Open your authenticator app and scan this code, or enter the secret manually below.
              </p>
            </div>
          </div>

          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
              Can&rsquo;t scan? Enter this secret manually
            </h3>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface-alt p-3">
              <KeyRound className="h-4 w-4 text-text-tertiary shrink-0" />
              <code className="flex-1 font-mono text-sm text-text-primary break-all">
                {setup.secret}
              </code>
              <button
                onClick={copySecret}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt shrink-0"
                aria-label="Copy secret"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-profit-green" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="card-soft p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
              Step 2: Enter the 6-digit code from your app
            </h3>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full h-14 px-3 rounded-lg border border-border bg-bg-surface-alt text-center font-mono text-2xl tracking-[0.5em] font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            {result && (
              <p className={cn(
                'mt-2 text-xs font-medium',
                result.success ? 'text-profit-green' : 'text-loss-red'
              )}>
                {result.message}
              </p>
            )}
            <button
              onClick={verifyCode}
              disabled={submitting || code.length !== 6}
              className={cn(
                'mt-3 w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors',
                submitting || code.length !== 6
                  ? 'bg-brand-primary/40 cursor-not-allowed'
                  : 'bg-brand-primary hover:bg-brand-primary/90'
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verify & Enable
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SetupStep({
  icon: Icon,
  num,
  text,
}: {
  icon: React.ElementType;
  num: number;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold shrink-0">
        {num}
      </div>
      <div className="flex items-start gap-1.5 pt-0.5">
        <Icon className="h-3.5 w-3.5 text-text-secondary shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary">{text}</p>
      </div>
    </div>
  );
}
