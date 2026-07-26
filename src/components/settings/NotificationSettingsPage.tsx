'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Bell,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  GraduationCap,
  CreditCard,
  ShieldAlert,
  Gift,
  CalendarCheck,
} from 'lucide-react';

interface NotifPrefs {
  trade_executions: boolean;
  order_updates: boolean;
  price_alerts: boolean;
  market_open: boolean;
  market_close: boolean;
  learning_updates: boolean;
  subscription_renewal: boolean;
  security_alerts: boolean;
  promotional: boolean;
  weekly_digest: boolean;
}

const PREFS_META: Array<{
  key: keyof NotifPrefs;
  label: string;
  description: string;
  icon: React.ElementType;
  tint: string;
  color: string;
}> = [
  { key: 'trade_executions',  label: 'Trade Executions',   description: 'When your orders are filled',           icon: ShoppingBag,  tint: 'bg-tint-green',  color: 'text-profit-green' },
  { key: 'order_updates',     label: 'Order Updates',       description: 'Pending, partial, cancelled orders',    icon: TrendingUp,   tint: 'bg-tint-blue',   color: 'text-brand-primary' },
  { key: 'price_alerts',      label: 'Price Alerts',        description: 'When watchlist stocks cross your targets', icon: DollarSign,  tint: 'bg-tint-yellow', color: 'text-accent-gold' },
  { key: 'market_open',       label: 'Market Open',         description: '9:15 AM IST — pre-market bell',         icon: CalendarCheck, tint: 'bg-tint-cyan',   color: 'text-info-cyan' },
  { key: 'market_close',      label: 'Market Close',        description: '3:30 PM IST — daily close',             icon: CalendarCheck, tint: 'bg-tint-purple', color: 'text-info-purple' },
  { key: 'learning_updates',  label: 'Learning Updates',    description: 'New modules, paths, and challenges',    icon: GraduationCap, tint: 'bg-tint-purple', color: 'text-info-purple' },
  { key: 'subscription_renewal', label: 'Subscription Renewal', description: 'Premium plan renewals and expiry', icon: CreditCard,   tint: 'bg-tint-blue',   color: 'text-brand-primary' },
  { key: 'security_alerts',   label: 'Security Alerts',     description: 'Login attempts, password changes',      icon: ShieldAlert,  tint: 'bg-tint-red',    color: 'text-loss-red' },
  { key: 'promotional',       label: 'Promotional',         description: 'Offers, discounts, and announcements',  icon: Gift,         tint: 'bg-tint-yellow', color: 'text-accent-gold' },
  { key: 'weekly_digest',     label: 'Weekly Digest',       description: 'Sunday summary of your week',           icon: CalendarCheck, tint: 'bg-tint-cyan',   color: 'text-info-cyan' },
];

export function NotificationSettingsPage() {
  const { token } = useAuthStore();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/preferences', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPrefs(d.data.notifications);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const togglePref = (key: keyof NotifPrefs) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    setSavedMessage(false);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: prefs }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 2500);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
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
          <h1 className="font-heading text-xl font-bold text-text-primary">Notification Settings</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Choose what you want to be notified about
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card-soft p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading...</span>
        </div>
      ) : prefs ? (
        <>
          <div className="card-soft p-3 flex items-start gap-2">
            <Bell className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              Notifications are delivered to your notification center. We&rsquo;ll never
              spam you — your settings are respected.
            </p>
          </div>

          <div className="card-soft p-0 overflow-hidden">
            <div className="divide-y divide-border">
              {PREFS_META.map((meta) => {
                const Icon = meta.icon;
                const value = prefs[meta.key];
                return (
                  <div key={meta.key} className="p-3 sm:p-4 flex items-center gap-3">
                    <div className={cn('icon-tile-sm', meta.tint)}>
                      <Icon className={cn('h-4 w-4', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{meta.label}</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">{meta.description}</p>
                    </div>
                    <button
                      className="toggle-track"
                      data-on={value}
                      onClick={() => togglePref(meta.key)}
                      aria-label={`Toggle ${meta.label}`}
                      aria-pressed={value}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors',
              saving ? 'bg-brand-primary/50 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary/90'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : savedMessage ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </>
      ) : (
        <div className="card-soft p-4 text-sm text-loss-red">
          Failed to load notification settings.
        </div>
      )}
    </div>
  );
}
