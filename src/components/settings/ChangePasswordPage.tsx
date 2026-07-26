'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Lock,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export function ChangePasswordPage() {
  const { token } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (next !== confirm) {
      setResult({ success: false, message: 'New password and confirm password do not match' });
      return;
    }
    if (next.length < 8) {
      setResult({ success: false, message: 'New password must be at least 8 characters' });
      return;
    }
    if (current === next) {
      setResult({ success: false, message: 'New password must be different from current password' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: 'Password changed successfully.' });
        setCurrent('');
        setNext('');
        setConfirm('');
      } else {
        setResult({ success: false, message: data.error || 'Failed to change password' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
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
          <h1 className="font-heading text-xl font-bold text-text-primary">Change Password</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Update your account password
          </p>
        </div>
      </div>

      {/* Info card */}
      <div className="card-soft p-3 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-profit-green shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary">
          Choose a strong password (8+ characters, mix of letters, numbers, and symbols).
          After changing your password, other active sessions will remain logged in —
          use &ldquo;Logout All&rdquo; to end them.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card-soft p-4 space-y-4">
        <PasswordField
          label="Current Password"
          value={current}
          onChange={setCurrent}
          show={showCurrent}
          onToggleShow={() => setShowCurrent(!showCurrent)}
          icon={Lock}
          autoComplete="current-password"
        />
        <PasswordField
          label="New Password"
          value={next}
          onChange={setNext}
          show={showNext}
          onToggleShow={() => setShowNext(!showNext)}
          icon={Lock}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          show={showConfirm}
          onToggleShow={() => setShowConfirm(!showConfirm)}
          icon={Lock}
          autoComplete="new-password"
        />

        {result && (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg p-3 text-sm',
              result.success ? 'bg-tint-green text-profit-green' : 'bg-tint-red text-loss-red'
            )}
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{result.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !current || !next || !confirm}
          className={cn(
            'w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors',
            submitting || !current || !next || !confirm
              ? 'bg-brand-primary/50 cursor-not-allowed'
              : 'bg-brand-primary hover:bg-brand-primary/90'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  icon: Icon,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  icon: React.ElementType;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      <div className="mt-1 relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full h-11 pl-9 pr-10 rounded-lg border border-border bg-bg-surface-alt text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-surface-alt"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
