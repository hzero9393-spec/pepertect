'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { getInitials, formatINR, cn } from '@/lib/utils';
import {
  Mail, Phone, Calendar, Shield, Wallet, PieChart, Activity,
  Trophy, Target, Lock, Bell, Globe, LogOut, ChevronRight,
  Camera, Copy, Check, Monitor, ShieldCheck, BadgeCheck,
  Clock, Store, Grid as GridIcon,
  TrendingUp, Moon, Sun, X, Loader2, AlertTriangle,
  RotateCcw, Trash2, Gift,
} from 'lucide-react';
import type { Portfolio } from '@/types';
import { StockSearch } from '@/components/shared/StockSearch';
import { FreeTrialWidget } from '@/components/shared/FreeTrialWidget';

export function ProfilePage() {
  const { user, token, login, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [language, setLanguage] = useState('en');

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);

  // Logout All modal state
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAllSubmitting, setLogoutAllSubmitting] = useState(false);
  const [logoutAllResult, setLogoutAllResult] = useState<{ success: boolean; message: string } | null>(null);

  // Reset Data modal state
  const [resetDataOpen, setResetDataOpen] = useState(false);
  const [resetDataSubmitting, setResetDataSubmitting] = useState(false);
  const [resetDataResult, setResetDataResult] = useState<{ success: boolean; message: string } | null>(null);

  const mounted = typeof window !== 'undefined';

  useEffect(() => {
    if (!token) return;
    fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setPortfolio(d.data); })
      .catch(() => {});
    // Fetch preferences for 2FA status + language display
    fetch('/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTwoFactorEnabled(d.data.twoFactorEnabled);
          setLanguage(d.data.language);
        }
      })
      .catch(() => {});
  }, [token]);

  // Sync avatar URL from user store when user changes
  useEffect(() => {
    setAvatarUrl(user?.avatar ?? null);
  }, [user?.avatar]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (data.success) {
        login({ ...user!, name }, token!);
        setMessage('Profile updated successfully');
        setEditOpen(false);
      }
    } catch {
      setMessage('Failed to update profile');
    }
    setSaving(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  // ---- Avatar upload ----
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }
    // Validate size (max 500KB to stay under data URL column limit)
    if (file.size > 500 * 1024) {
      setAvatarError('Image must be under 500KB. Please use a smaller image.');
      return;
    }

    setAvatarUploading(true);
    try {
      // Convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: dataUrl }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic local update + sync to auth store
        setAvatarUrl(dataUrl);
        if (user) login({ ...user, avatar: dataUrl }, token!);
      } else {
        setAvatarError(data.error || 'Failed to upload avatar');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setAvatarError('Network error during upload');
    } finally {
      setAvatarUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAvatarUrl(null);
        if (user) login({ ...user, avatar: null }, token!);
      } else {
        setAvatarError(data.error || 'Failed to remove avatar');
      }
    } catch {
      setAvatarError('Network error');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ---- Logout All (removes account from ALL devices including current) ----
  const handleLogoutAll = async () => {
    setLogoutAllSubmitting(true);
    setLogoutAllResult(null);
    try {
      // includeCurrent=true → deletes ALL sessions (including this one),
      // then we redirect to the landing page.
      const res = await fetch('/api/user/logout-all?includeCurrent=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogoutAllResult({ success: true, message: data.message || 'Account removed from all devices.' });
        // Clear local auth state and redirect to landing page after brief pause
        setTimeout(() => {
          logout();
          window.location.href = '/';
        }, 1500);
      } else {
        setLogoutAllResult({ success: false, message: data.error || 'Failed to remove account from devices' });
      }
    } catch {
      setLogoutAllResult({ success: false, message: 'Network error' });
    } finally {
      setLogoutAllSubmitting(false);
    }
  };

  // ---- Reset Trading Data (deletes all orders/positions/trades, resets portfolio) ----
  const handleResetData = async () => {
    setResetDataSubmitting(true);
    setResetDataResult(null);
    try {
      const res = await fetch('/api/user/reset-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (data.success) {
        setResetDataResult({
          success: true,
          message: data.message || 'All trading data has been reset to defaults.',
        });
        // Refresh portfolio after a brief pause
        setTimeout(() => {
          fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { if (d.success) setPortfolio(d.data); })
            .catch(() => {});
          setResetDataOpen(false);
        }, 1800);
      } else {
        setResetDataResult({ success: false, message: data.error || 'Failed to reset data' });
      }
    } catch {
      setResetDataResult({ success: false, message: 'Network error' });
    } finally {
      setResetDataSubmitting(false);
    }
  };

  const userId = user?.id ? `TRD${String(user.id).slice(-6).padStart(6, '0')}` : 'TRD000000';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'Jul 2026';
  const lastLogin = 'Today, 12:30 PM';

  const totalPnl = portfolio?.totalPnl ?? 0;
  const usedMargin = portfolio?.investedAmount ?? 0;
  const availableMargin = portfolio?.availableMargin ?? (user?.virtualCapital ?? 100000);
  const totalTrades = portfolio?.totalTrades ?? 0;
  const wins = portfolio?.winningTrades ?? 0;
  const losses = Math.max(0, totalTrades - wins);
  const winRate = portfolio?.winRate ?? 0;
  const totalPnlPct = usedMargin > 0 ? (totalPnl / usedMargin) * 100 : 0;

  const languageLabel = (() => {
    const map: Record<string, string> = {
      en: 'English', hi: 'हिन्दी', mr: 'मराठी', ta: 'தமிழ்',
      te: 'తెలుగు', bn: 'বাংলা', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ',
    };
    return map[language] || 'English';
  })();

  return (
    <div className="space-y-4">
      {/* ============== UNIVERSAL SEARCH ============== */}
      <StockSearch placeholder="Search any stock / index — click to view option chain" />

      {/* ============== FREE TRIAL WIDGET ============== */}
      <FreeTrialWidget variant="card" />

      {/* ============== PROFILE HEADER CARD ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with camera overlay (now functional) */}
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary text-white text-2xl font-bold overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={user?.name || 'avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(user?.name || user?.email || 'U')
              )}
            </div>
            <button
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-border shadow-sm hover:bg-bg-surface-alt transition-colors disabled:opacity-50"
              aria-label="Change profile picture"
              type="button"
            >
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 text-brand-primary animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-text-secondary" />
              )}
            </button>
            {/* Hidden file input — triggered by camera button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading text-xl font-bold text-text-primary truncate">
                {user?.name || 'Demo User'}
              </h2>
              <BadgeCheck className="h-5 w-5 text-profit-green shrink-0" />
              {twoFactorEnabled && (
                <span title="2FA enabled">
                  <ShieldCheck className="h-4 w-4 text-profit-green shrink-0" />
                </span>
              )}
            </div>

            {/* Email + copy */}
            <button
              onClick={() => copyToClipboard(user?.email || '', 'email')}
              className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user?.email || 'demo@pepertect.com'}</span>
              {copiedField === 'email' ? (
                <Check className="h-3 w-3 text-profit-green" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>

            {/* User ID + copy */}
            <button
              onClick={() => copyToClipboard(userId, 'uid')}
              className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              <span className="font-mono">{userId}</span>
              {copiedField === 'uid' ? (
                <Check className="h-3 w-3 text-profit-green" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="pill bg-tint-blue text-brand-primary">
                {user?.tier === 'PREMIUM' ? 'PREMIUM Plan' : 'FREE Plan'}
              </span>
              <span className="pill bg-bg-surface-alt text-text-secondary">{user?.role || 'USER'}</span>
              <span className="pill bg-tint-green text-profit-green inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                KYC Verified
              </span>
            </div>
          </div>

          <button
            onClick={() => setEditOpen(!editOpen)}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface-alt"
          >
            Edit Profile
          </button>
        </div>

        {/* Avatar error / remove link */}
        {avatarError && (
          <p className="mt-2 text-xs text-loss-red font-medium">{avatarError}</p>
        )}
        {avatarUrl && !avatarUploading && (
          <button
            onClick={handleAvatarRemove}
            className="mt-2 text-[11px] text-text-tertiary hover:text-loss-red font-medium"
          >
            Remove photo
          </button>
        )}

        {/* Edit form (collapsible) */}
        {editOpen && (
          <div className="mt-4 border-t border-border pt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-bg-surface-alt text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {message && (
              <p className={cn('text-xs text-center font-medium', message.includes('success') ? 'text-profit-green' : 'text-loss-red')}>
                {message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ============== FREE TRIAL QUICK LINK ============== */}
      <div>
        <a
          href="/free-trial"
          className="card-soft p-4 flex items-center gap-3 hover:shadow-md transition-shadow bg-gradient-to-br from-accent-gold/10 to-brand-primary/5 border border-accent-gold/30"
        >
          <div className="icon-tile bg-tint-yellow">
            <Gift className="h-5 w-5 text-accent-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-bold text-text-primary">30 Days Free PREMIUM Trial</p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              View trial status, plan details &amp; start your free trial →
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-accent-gold shrink-0" />
        </a>
      </div>

      {/* ============== ACCOUNT DETAILS ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Account Details</h3>
        <div className="card-soft p-1">
          <DetailRow icon={Store} label="Broker" value="Paper Trading" />
          <DetailRow icon={Globe} label="Timezone" value="IST (UTC +5:30)" />
          <DetailRow icon={GridIcon} label="Account Type" value="Demo" />
          <DetailRow icon={Clock} label="Last Login" value={lastLogin} />
          <DetailRow icon={Globe} label="Currency" value="INR" />
          <DetailRow icon={Calendar} label="Member Since" value={memberSince} last />
        </div>
      </div>

      {/* ============== QUICK ACTIONS (all wired to real pages) ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction
            icon={Lock}
            label="Change Password"
            href="/settings/change-password"
            tint="bg-tint-blue"
            color="text-brand-primary"
          />
          <QuickAction
            icon={Shield}
            label={twoFactorEnabled ? '2FA Enabled' : 'Enable 2FA'}
            href="/settings/2fa"
            tint={twoFactorEnabled ? 'bg-tint-green' : 'bg-tint-green'}
            color="text-profit-green"
            badge={twoFactorEnabled ? 'Active' : 'Recommended'}
          />
          <QuickAction
            icon={Monitor}
            label="Login Activity"
            href="/settings/login-activity"
            tint="bg-tint-purple"
            color="text-info-purple"
          />
          <QuickActionButton
            icon={LogOut}
            label="Logout All Devices"
            tint="bg-tint-red"
            color="text-loss-red"
            onClick={() => setLogoutAllOpen(true)}
          />
        </div>
      </div>

      {/* ============== PREFERENCES ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Preferences</h3>
        <div className="card-soft p-1">
          <PreferenceToggle
            icon={theme === 'dark' ? Moon : Sun}
            label="Dark Mode"
            on={theme === 'dark'}
            onToggle={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <PreferenceRow
            icon={Bell}
            label="Notification Settings"
            href="/settings/notifications"
          />
          <PreferenceRow
            icon={Globe}
            label="Language"
            value={languageLabel}
            href="/settings/language"
          />
          <PreferenceRow
            icon={Trash2}
            label="Reset Trading Data"
            value="Clear all positions, orders & trades"
            href="#"
            danger
            onClick={() => setResetDataOpen(true)}
          />
          <PreferenceRow
            icon={Monitor}
            label="Remove from this device"
            value="Sign out only here"
            href="#"
            danger
            onClick={logout}
          />
          <PreferenceRow
            icon={LogOut}
            label="Logout All Devices"
            href="#"
            danger
            onClick={() => setLogoutAllOpen(true)}
            last
          />
        </div>
      </div>

      {/* ============== RESET DATA MODAL ============== */}
      {resetDataOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !resetDataSubmitting && setResetDataOpen(false)}
        >
          <div
            className="w-full max-w-sm card-soft p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="icon-tile-sm bg-tint-red">
                  <RotateCcw className="h-4 w-4 text-loss-red" />
                </div>
                <h3 className="font-heading text-base font-bold text-text-primary">
                  Reset Trading Data?
                </h3>
              </div>
              <button
                onClick={() => !resetDataSubmitting && setResetDataOpen(false)}
                className="text-text-tertiary hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              This will permanently delete <strong className="text-text-primary">all your trades, orders,
              positions, and watchlist</strong>, and reset your portfolio balance back to{' '}
              <strong className="text-text-primary">₹1,00,000</strong>. This action cannot be undone.
            </p>
            <div className="rounded-lg bg-tint-yellow/40 border border-accent-gold/30 p-2.5 mb-3">
              <p className="text-xs text-accent-gold font-medium flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Your account, subscription, learning progress, and avatar will NOT be affected.
              </p>
            </div>
            {resetDataResult && (
              <div
                className={cn(
                  'mb-3 rounded-lg p-2.5 text-xs font-medium',
                  resetDataResult.success
                    ? 'bg-tint-green text-profit-green'
                    : 'bg-tint-red text-loss-red'
                )}
              >
                {resetDataResult.message}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setResetDataOpen(false)}
                disabled={resetDataSubmitting}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text-secondary hover:bg-bg-surface-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                disabled={resetDataSubmitting}
                className={cn(
                  'flex-1 h-10 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-1.5',
                  resetDataSubmitting
                    ? 'bg-loss-red/50 cursor-not-allowed'
                    : 'bg-loss-red hover:bg-loss-red/90'
                )}
              >
                {resetDataSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reset Everything
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== LOGOUT ALL MODAL ============== */}
      {logoutAllOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !logoutAllSubmitting && setLogoutAllOpen(false)}
        >
          <div
            className="w-full max-w-sm card-soft p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="icon-tile-sm bg-tint-red">
                  <AlertTriangle className="h-4 w-4 text-loss-red" />
                </div>
                <h3 className="font-heading text-base font-bold text-text-primary">
                  Logout All Sessions?
                </h3>
              </div>
              <button
                onClick={() => !logoutAllSubmitting && setLogoutAllOpen(false)}
                className="text-text-tertiary hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              This will sign out <strong className="text-text-primary">every device</strong> that&rsquo;s
              currently logged into your account — including this one. You&rsquo;ll need to log in again
              on each device to access your account.
            </p>
            {logoutAllResult && (
              <div
                className={cn(
                  'mb-3 rounded-lg p-2.5 text-xs font-medium',
                  logoutAllResult.success
                    ? 'bg-tint-green text-profit-green'
                    : 'bg-tint-red text-loss-red'
                )}
              >
                {logoutAllResult.message}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setLogoutAllOpen(false)}
                disabled={logoutAllSubmitting}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold text-text-secondary hover:bg-bg-surface-alt"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutAll}
                disabled={logoutAllSubmitting}
                className={cn(
                  'flex-1 h-10 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-1.5',
                  logoutAllSubmitting
                    ? 'bg-loss-red/50 cursor-not-allowed'
                    : 'bg-loss-red hover:bg-loss-red/90'
                )}
              >
                {logoutAllSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Logout All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryMini({
  icon: Icon,
  tint,
  color,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType;
  tint: string;
  color: string;
  label: string;
  value: React.ReactNode;
  subtext?: string;
}) {
  return (
    <div className="card-soft p-3">
      <div className="flex items-center gap-2">
        <div className={cn('icon-tile-sm', tint)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <p className="text-[11px] font-medium text-text-secondary">{label}</p>
      </div>
      <p className="mt-2 font-mono text-base font-bold tabular-nums text-text-primary">{value}</p>
      {subtext && <p className="text-[10px] text-text-tertiary mt-0.5">{subtext}</p>}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-3', !last && 'border-b border-border')}>
      <div className="icon-tile-sm bg-bg-surface-alt">
        <Icon className="h-4 w-4 text-text-secondary" />
      </div>
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="ml-auto text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  tint,
  color,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  tint: string;
  color: string;
  badge?: string;
}) {
  return (
    <a href={href} className="card-soft p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
      <div className={cn('icon-tile', tint)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <span className="text-[11px] font-medium text-text-primary text-center leading-tight">{label}</span>
      {badge && <span className="text-[9px] font-semibold text-profit-green">{badge}</span>}
    </a>
  );
}

// Same shape as QuickAction but rendered as a <button> (for actions that don't navigate).
function QuickActionButton({
  icon: Icon,
  label,
  tint,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  tint: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-soft p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
      type="button"
    >
      <div className={cn('icon-tile', tint)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <span className="text-[11px] font-medium text-text-primary text-center leading-tight">{label}</span>
    </button>
  );
}

function PreferenceToggle({
  icon: Icon,
  label,
  on,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
      <div className="icon-tile-sm bg-bg-surface-alt">
        <Icon className="h-4 w-4 text-text-secondary" />
      </div>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <button
        className="toggle-track ml-auto"
        data-on={on}
        onClick={onToggle}
        aria-label={`Toggle ${label}`}
        aria-pressed={on}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

function PreferenceRow({
  icon: Icon,
  label,
  value,
  href,
  danger,
  onClick,
  last,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  href: string;
  danger?: boolean;
  onClick?: () => void;
  last?: boolean;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-3',
        !last && 'border-b border-border',
        danger ? 'text-loss-red' : 'text-text-primary'
      )}
    >
      <div className={cn('icon-tile-sm', danger ? 'bg-tint-red' : 'bg-bg-surface-alt')}>
        <Icon className={cn('h-4 w-4', danger ? 'text-loss-red' : 'text-text-secondary')} />
      </div>
      <span className={cn('text-sm font-medium', danger ? 'text-loss-red' : 'text-text-primary')}>{label}</span>
      {value && <span className="ml-auto text-xs text-text-secondary">{value}</span>}
      {!value && <ChevronRight className={cn('ml-auto h-4 w-4', danger ? 'text-loss-red' : 'text-text-tertiary')} />}
    </a>
  );
}
