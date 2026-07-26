'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { getInitials, formatINR, formatNumber, cn } from '@/lib/utils';
import {
  Mail, Phone, Calendar, Shield, Wallet, PieChart, Activity,
  Trophy, Target, Lock, Bell, Globe, LogOut, ChevronRight,
  Camera, Copy, Check, Monitor, ShieldCheck, BadgeCheck,
  MapPin, Clock, Store, Grid as GridIcon,
  TrendingUp, Moon, Sun,
} from 'lucide-react';
import type { Portfolio } from '@/types';

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
  const mounted = typeof window !== 'undefined';

  useEffect(() => {
    if (!token) return;
    fetch('/api/portfolio', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setPortfolio(d.data); })
      .catch(() => {});
  }, [token]);

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

  return (
    <div className="space-y-4">
      {/* ============== PROFILE HEADER CARD ============== */}
      <div className="card-soft p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with camera overlay */}
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary text-white text-2xl font-bold">
              {getInitials(user?.name || user?.email || 'U')}
            </div>
            <button
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-border shadow-sm"
              aria-label="Change photo"
            >
              <Camera className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading text-xl font-bold text-text-primary truncate">
                {user?.name || 'Demo User'}
              </h2>
              <BadgeCheck className="h-5 w-5 text-profit-green shrink-0" />
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

      {/* ============== ACCOUNT SUMMARY 2x3 ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Account Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <SummaryMini
            icon={Wallet}
            tint="bg-tint-green"
            color="text-profit-green"
            label="Virtual Capital"
            value={formatINR(user?.virtualCapital ?? 100000)}
          />
          <SummaryMini
            icon={PieChart}
            tint="bg-tint-red"
            color="text-loss-red"
            label="Used Margin"
            value={formatINR(usedMargin)}
          />
          <SummaryMini
            icon={Activity}
            tint="bg-tint-purple"
            color="text-info-purple"
            label="Available Margin"
            value={formatINR(availableMargin)}
          />
          <SummaryMini
            icon={TrendingUp}
            tint="bg-tint-cyan"
            color={totalPnl >= 0 ? 'text-profit-green' : 'text-loss-red'}
            label="Total P&L"
            value={`${totalPnl >= 0 ? '+' : ''}${formatINR(totalPnl)}`}
            subtext={`${totalPnl >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`}
          />
          <SummaryMini
            icon={Trophy}
            tint="bg-tint-yellow"
            color="text-accent-gold"
            label="Total Trades"
            value={String(totalTrades)}
          />
          <SummaryMini
            icon={Target}
            tint="bg-tint-cyan"
            color="text-info-cyan"
            label="Win Rate"
            value={<span className="text-brand-primary">{winRate}%</span>}
            subtext={`${wins} Wins • ${losses} Losses`}
          />
        </div>
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

      {/* ============== QUICK ACTIONS ============== */}
      <div>
        <h3 className="font-heading text-sm font-semibold text-text-primary px-1 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={Lock} label="Change Password" href="/settings" tint="bg-tint-blue" color="text-brand-primary" />
          <QuickAction icon={Shield} label="Enable 2FA" href="/settings" tint="bg-tint-green" color="text-profit-green" badge="Recommended" />
          <QuickAction icon={Monitor} label="Login Activity" href="/settings" tint="bg-tint-purple" color="text-info-purple" />
          <QuickAction icon={LogOut} label="Logout All" href="#" tint="bg-tint-red" color="text-loss-red" />
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
          <PreferenceRow icon={Bell} label="Notification Settings" href="/notifications" />
          <PreferenceRow icon={Globe} label="Language" value="English" href="/settings" />
          <PreferenceRow icon={LogOut} label="Logout" href="#" danger onClick={logout} last />
        </div>
      </div>
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

// Local helpers to avoid extra imports
