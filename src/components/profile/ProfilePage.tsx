'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/useAuthStore';
import { getInitials, formatINR, cn } from '@/lib/utils';
import {
  Mail, Phone, Shield, Trophy, Target, Lock, Bell, Globe, LogOut, ChevronRight,
  Camera, Copy, Check, ShieldCheck, BadgeCheck,
  TrendingUp, X, Loader2, AlertTriangle,
  Trash2, Download, Smartphone, BarChart3, ChevronDown,
  RefreshCcw, UserX,
} from 'lucide-react';
import type { Portfolio } from '@/types';

export function ProfilePage() {
  const { user, token, login, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [language, setLanguage] = useState('en');

  // Collapsible section state
  const [securityOpen, setSecurityOpen] = useState(true);
  const [preferencesOpen, setPreferencesOpen] = useState(true);
  const [dangerOpen, setDangerOpen] = useState(false);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);

  // Logout All modal state
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAllSubmitting, setLogoutAllSubmitting] = useState(false);
  const [logoutAllResult, setLogoutAllResult] = useState<{ success: boolean; message: string } | null>(null);

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

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }
    if (file.size > 500 * 1024) {
      setAvatarError('Image must be under 500KB. Please use a smaller image.');
      return;
    }

    setAvatarUploading(true);
    try {
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

  // ---- Logout All ----
  const handleLogoutAll = async () => {
    setLogoutAllSubmitting(true);
    setLogoutAllResult(null);
    try {
      const res = await fetch('/api/user/logout-all?includeCurrent=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogoutAllResult({ success: true, message: data.message || 'Account removed from all devices.' });
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

  // ---- Reset portfolio ----
  const [resetting, setResetting] = useState(false);
  const handleResetPortfolio = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/portfolio/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio(null);
      }
    } catch {
      // silent
    } finally {
      setResetting(false);
    }
  };

  const userId = user?.id ? `TRD${String(user.id).slice(-6).padStart(6, '0')}` : 'TRD000000';
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'July 2025';

  const totalPnl = portfolio?.totalPnl ?? 0;
  const totalTrades = portfolio?.totalTrades ?? 0;
  const winRate = portfolio?.winRate ?? 0;

  return (
    <div className="page-enter space-y-4">

      {/* ============== 1. PROFILE CARD ============== */}
      <div className="rounded-2xl bg-bg-surface border border-border p-5 md:p-6">
        <div className="flex flex-col items-center text-center">
          {/* Centered Avatar with camera overlay */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary text-white text-2xl font-bold overflow-hidden">
              {avatarUrl ? (
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
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
              aria-label="Change profile picture"
              type="button"
            >
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* Avatar error / remove link */}
          {avatarError && (
            <p className="mt-2 text-xs text-loss-red font-medium">{avatarError}</p>
          )}
          {avatarUrl && !avatarUploading && (
            <button
              onClick={handleAvatarRemove}
              className="mt-1.5 text-[11px] text-text-tertiary hover:text-loss-red font-medium"
            >
              Remove photo
            </button>
          )}

          {/* Name */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <h2 className="text-xl font-bold text-text-primary">
              {user?.name || 'Demo User'}
            </h2>
            <BadgeCheck className="h-5 w-5 text-profit-green shrink-0" />
            {twoFactorEnabled && (
              <span title="2FA enabled">
                <ShieldCheck className="h-4 w-4 text-profit-green shrink-0" />
              </span>
            )}
          </div>

          {/* Email */}
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

          {/* User ID */}
          <button
            onClick={() => copyToClipboard(userId, 'uid')}
            className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            <span className="font-mono">{userId}</span>
            {copiedField === 'uid' ? (
              <Check className="h-3 w-3 text-profit-green" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>

          {/* Member Since */}
          <p className="mt-1.5 text-xs text-text-tertiary">Joined {joinDate}</p>

          {/* Account Tier Badge */}
          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
            <span className="pill bg-tint-blue text-brand-primary">Free Account</span>
            <span className="pill bg-bg-surface-alt text-text-secondary">{user?.role || 'USER'}</span>
            <span className="pill bg-tint-green text-profit-green inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              KYC Verified
            </span>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => setEditOpen(!editOpen)}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-alt transition-colors"
          >
            Edit Profile
          </button>
        </div>

        {/* Edit form (collapsible) */}
        <AnimatePresence>
          {editOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============== 2. ACCOUNT STATS ============== */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={BarChart3}
          tint="bg-tint-blue"
          color="text-brand-primary"
          label="Total Trades"
          value={String(totalTrades)}
        />
        <StatCard
          icon={Target}
          tint="bg-tint-green"
          color="text-profit-green"
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
        />
        <StatCard
          icon={Trophy}
          tint="bg-tint-yellow"
          color="text-accent-gold"
          label="Best Trade"
          value="—"
        />
        <StatCard
          icon={TrendingUp}
          tint="bg-tint-purple"
          color={cn(totalPnl >= 0 ? 'text-profit-green' : 'text-loss-red')}
          label="Total P&L"
          value={formatINR(totalPnl)}
        />
      </div>

      {/* ============== 3. SECURITY SECTION ============== */}
      <CollapsibleSection
        icon={Shield}
        title="Security"
        open={securityOpen}
        onToggle={() => setSecurityOpen(!securityOpen)}
      >
        <SettingRow
          icon={ShieldCheck}
          label="Two-Factor Authentication"
          value={twoFactorEnabled ? 'Enabled' : 'Disabled'}
          valueColor={twoFactorEnabled ? 'text-profit-green' : 'text-text-secondary'}
          href="/settings/2fa"
        />
        <SettingRow
          icon={Lock}
          label="Change Password"
          href="/settings/change-password"
        />
        <SettingRow
          icon={Lock}
          label="Login Activity"
          href="/settings/login-activity"
        />
        <button
          type="button"
          onClick={() => setLogoutAllOpen(true)}
          className="flex items-center gap-3 px-1 py-3 border-t border-border w-full text-left"
        >
          <div className="icon-tile-sm bg-tint-red">
            <LogOut className="h-4 w-4 text-loss-red" />
          </div>
          <span className="text-sm font-medium text-loss-red">Logout All Devices</span>
          <ChevronRight className="ml-auto h-4 w-4 text-loss-red" />
        </button>
      </CollapsibleSection>

      {/* ============== 4. PREFERENCES SECTION ============== */}
      <CollapsibleSection
        icon={Bell}
        title="Preferences"
        open={preferencesOpen}
        onToggle={() => setPreferencesOpen(!preferencesOpen)}
      >
        <SettingRow
          icon={Bell}
          label="Notification Settings"
          href="/settings/notifications"
        />
        <SettingRow
          icon={Globe}
          label="Language"
          value={(() => {
            const map: Record<string, string> = {
              en: 'English', hi: 'हिन्दी', mr: 'मराठी', ta: 'தமிழ்',
              te: 'తెలుగు', bn: 'বাংলা', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ',
            };
            return map[language] || 'English';
          })()}
          href="/settings/language"
        />
        <SettingRow
          icon={Phone}
          label="Remove from this device"
          value="Sign out only here"
          danger
          onClick={logout}
        />
      </CollapsibleSection>

      {/* ============== 5. DANGER ZONE ============== */}
      <CollapsibleSection
        icon={AlertTriangle}
        title="Danger Zone"
        open={dangerOpen}
        onToggle={() => setDangerOpen(!dangerOpen)}
        danger
      >
        <div className="px-1">
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              <div className="icon-tile-sm bg-tint-red">
                <UserX className="h-4 w-4 text-loss-red" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Delete Account</p>
                <p className="text-xs text-text-secondary">Permanently delete your account and all data</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          </div>
          <button
            type="button"
            onClick={handleResetPortfolio}
            disabled={resetting}
            className="flex items-center justify-between py-3 w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="icon-tile-sm bg-tint-red">
                <RefreshCcw className={cn('h-4 w-4 text-loss-red', resetting && 'animate-spin')} />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Reset Portfolio</p>
                <p className="text-xs text-text-secondary">Reset all positions, orders, and balance</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>
      </CollapsibleSection>

      {/* ============== INSTALL APP BUTTON ============== */}
      <InstallAppButton />

      {/* ============== LOGOUT ALL MODAL ============== */}
      {logoutAllOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !logoutAllSubmitting && setLogoutAllOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-bg-surface border border-border p-5 shadow-lg"
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

/* ============================================================
   Stat Card (for Account Stats grid)
   ============================================================ */
function StatCard({
  icon: Icon,
  tint,
  color,
  label,
  value,
}: {
  icon: React.ElementType;
  tint: string;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-4">
      <div className="flex items-center gap-2.5">
        <div className={cn('icon-tile-sm', tint)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        <p className="text-xs font-medium text-text-secondary">{label}</p>
      </div>
      <p className={cn('mt-2 font-mono text-lg font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}

/* ============================================================
   Collapsible Section
   ============================================================ */
function CollapsibleSection({
  icon: Icon,
  title,
  open,
  onToggle,
  danger,
  children,
}: {
  icon: React.ElementType;
  title: string;
  open: boolean;
  onToggle: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-xl bg-bg-surface border',
      danger ? 'border-loss-red/20' : 'border-border'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2.5 w-full px-4 py-3.5"
      >
        <div className={cn('icon-tile-sm', danger ? 'bg-tint-red' : 'bg-bg-surface-alt')}>
          <Icon className={cn('h-4 w-4', danger ? 'text-loss-red' : 'text-text-secondary')} />
        </div>
        <span className={cn('text-sm font-semibold', danger ? 'text-loss-red' : 'text-text-primary')}>
          {title}
        </span>
        <ChevronDown className={cn(
          'ml-auto h-4 w-4 text-text-tertiary transition-transform duration-200',
          open && 'rotate-180'
        )} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Setting Row (icon + label + value/ChevronRight)
   ============================================================ */
function SettingRow({
  icon: Icon,
  label,
  value,
  valueColor,
  href,
  danger,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  valueColor?: string;
  href?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <div className={cn(
      'flex items-center gap-3 py-3 border-b border-border last:border-0',
      danger && 'text-loss-red'
    )}>
      <div className={cn('icon-tile-sm', danger ? 'bg-tint-red' : 'bg-bg-surface-alt')}>
        <Icon className={cn('h-4 w-4', danger ? 'text-loss-red' : 'text-text-secondary')} />
      </div>
      <span className={cn('text-sm font-medium', danger ? 'text-loss-red' : 'text-text-primary')}>{label}</span>
      {value && (
        <span className={cn('ml-auto text-xs', valueColor || 'text-text-secondary')}>{value}</span>
      )}
      {!value && (
        <ChevronRight className={cn('ml-auto h-4 w-4', danger ? 'text-loss-red' : 'text-text-tertiary')} />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}

/* ============================================================
   Install App Button Component
   ============================================================ */
function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (localStorage.getItem('pepertect_app_installed')) {
      setInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pepertect_app_installed', 'true');
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const [showInstallModal, setShowInstallModal] = useState(false);

  const getPlatform = (): 'ios' | 'android' | 'desktop' => {
    if (isIOS) return 'ios';
    if (/Android/i.test(navigator.userAgent)) return 'android';
    return 'desktop';
  };
  const platform = getPlatform();

  const handleInstall = async () => {
    setInstalling(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pepertect_app_installed', 'true');
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
    setInstalling(false);
  };

  if (installed) {
    return (
      <div className="rounded-xl border border-profit-green/30 bg-tint-green/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-profit-green/20">
            <Check className="h-5 w-5 text-profit-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-profit-green">App Installed!</p>
            <p className="text-xs text-text-secondary">Pepertect is ready to use from your home screen</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-brand-primary/20 bg-gradient-to-r from-brand-primary/5 to-accent-gold/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10">
            <Smartphone className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Install Pepertect App</p>
            <p className="text-xs text-text-secondary">
              {isIOS ? 'Tap Share → "Add to Home Screen"' : 'Add to home screen for quick access'}
            </p>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {installing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Install
              </>
            )}
          </button>
        </div>
        {!deferredPrompt && !isIOS && (
          <p className="mt-2 text-[11px] text-text-tertiary text-center">
            💡 Click Install for step-by-step instructions
          </p>
        )}
      </div>

      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowInstallModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative p-5 pb-4 bg-gradient-to-r from-brand-primary to-brand-primary-hover text-white">
              <button
                onClick={() => setShowInstallModal(false)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Install Pepertect</h3>
                  <p className="text-sm text-white/80">Add to Home Screen</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {platform === 'ios' ? (
                <div className="p-4 rounded-xl bg-bg-surface-alt border border-border">
                  <p className="font-semibold text-sm text-text-primary mb-3">📱 iPhone / iPad Installation</p>
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                      <p className="text-sm text-text-secondary">Tap the <strong>Share</strong> button at the bottom of Safari</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                      <p className="text-sm text-text-secondary">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">3</span>
                      <p className="text-sm text-text-secondary">Tap <strong>"Add"</strong> to confirm</p>
                    </li>
                  </ol>
                </div>
              ) : platform === 'android' ? (
                <div className="p-4 rounded-xl bg-bg-surface-alt border border-border">
                  <p className="font-semibold text-sm text-text-primary mb-3">🤖 Android Installation</p>
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                      <p className="text-sm text-text-secondary">Open Pepertect in <strong>Chrome</strong></p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                      <p className="text-sm text-text-secondary">Tap <strong>⋮ menu</strong> → "Add to Home screen"</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">3</span>
                      <p className="text-sm text-text-secondary">Tap <strong>"Add"</strong> to install</p>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-bg-surface-alt border border-border">
                  <p className="font-semibold text-sm text-text-primary mb-3">💻 Desktop Installation</p>
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">1</span>
                      <p className="text-sm text-text-secondary">Open in <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Opera</strong></p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                      <p className="text-sm text-text-secondary">Click <strong>⬇️ Install icon</strong> in address bar</p>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">3</span>
                      <p className="text-sm text-text-secondary">Click <strong>"Install"</strong> to confirm</p>
                    </li>
                  </ol>
                </div>
              )}
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary-hover transition-colors"
              >
                Got it, thanks!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// Type declaration for BeforeInstallPromptEvent
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
