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
  AlertTriangle,
  Gift,
  Star,
  Info,
  ShieldAlert,
  DollarSign,
} from 'lucide-react';

// These keys MUST match NOTIFICATION_TYPES in src/lib/notifications.ts
interface NotifPrefs {
  TRADE: boolean;           // Order executed, SL hit, Target achieved
  SYSTEM: boolean;         // Trial start/end, system messages
  PRICE_ALERT: boolean;   // Price level reached (future)
  SUBSCRIPTION: boolean;  // Payment, renewal, trial
  MILESTONE: boolean;     // Portfolio milestones
}

const DEFAULT_PREFS: NotifPrefs = {
  TRADE: true,
  SYSTEM: true,
  PRICE_ALERT: true,
  SUBSCRIPTION: true,
  MILESTONE: true,
};

const PREFS_META: Array<{
  key: keyof NotifPrefs;
  label: string;
  description: string;
  icon: React.ElementType;
  tint: string;
  color: string;
  examples: string;
}> = [
  { 
    key: 'TRADE', 
    label: 'Trade Alerts', 
    description: 'Orders executed, SL hit, Target achieved',
    icon: TrendingUp, 
    tint: 'bg-tint-green', 
    color: 'text-profit-green',
    examples: 'Buy/Sell executions, SL & Target triggers'
  },
  { 
    key: 'SYSTEM', 
    label: 'System Notifications', 
    description: 'Welcome messages, account updates',
    icon: Info, 
    tint: 'bg-tint-blue', 
    color: 'text-brand-primary',
    examples: 'Welcome, system announcements'
  },
  { 
    key: 'PRICE_ALERT', 
    label: 'Price Alerts', 
    description: 'When watchlist stocks cross your targets',
    icon: DollarSign, 
    tint: 'bg-tint-yellow', 
    color: 'text-accent-gold',
    examples: 'Price level alerts (coming soon)'
  },
  { 
    key: 'SUBSCRIPTION', 
    label: 'Subscription Updates', 
    description: 'Premium, trial status, renewals',
    icon: Gift, 
    tint: 'bg-tint-purple', 
    color: 'text-info-purple',
    examples: 'Trial started, expiry warnings'
  },
  { 
    key: 'MILESTONE', 
    label: 'Achievements', 
    description: 'Trading milestones & accomplishments',
    icon: Star, 
    tint: 'bg-tint-gold', 
    color: 'text-accent-gold',
    examples: 'P&L milestones, win streaks'
  },
];

export function NotificationSettingsPage() {
  const { token } = useAuthStore();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (!token) return;
    
    // Fetch from our dedicated notification-preferences endpoint
    fetch('/api/user/notification-preferences', { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.preferences) {
          // Map server prefs to our format (server uses same keys now)
          setPrefs({ ...DEFAULT_PREFS, ...d.preferences });
        } else {
          // Fallback to defaults
          setPrefs(DEFAULT_PREFS);
        }
      })
      .catch(() => setPrefs(DEFAULT_PREFS))
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
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
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

  // Count enabled
  const enabledCount = prefs ? Object.values(prefs).filter(Boolean).length : 0;

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
            {prefs && (
              <span className="ml-1.5 font-medium text-brand-primary">({enabledCount}/{Object.keys(DEFAULT_PREFS).length} enabled)</span>
            )}
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
          {/* Info Banner */}
          <div className="card-soft p-3 flex items-start gap-2">
            <Bell className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              Notifications appear in the bell icon in the header.{' '}
              <strong className="text-text-primary">Disabled types won&apos;t be created at all</strong> — 
              so you won&apos;t miss important alerts if you only enable what matters to you.
            </p>
          </div>

          {/* Preferences List */}
          <div className="card-soft p-0 overflow-hidden">
            <div className="divide-y divide-border">
              {PREFS_META.map((meta) => {
                const Icon = meta.icon;
                const value = prefs[meta.key];
                return (
                  <div 
                    key={meta.key} 
                    className={cn(
                      "p-3 sm:p-4 flex items-center gap-3 transition-colors",
                      !value && "opacity-60"
                    )}
                  >
                    <div className={cn('icon-tile-sm', meta.tint)}>
                      <Icon className={cn('h-4 w-4', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{meta.label}</p>
                        {!value && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary bg-bg-surface-alt px-1.5 py-0.5 rounded">
                            Off
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">{meta.description}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5 italic">{meta.examples}</p>
                    </div>
                    <button
                      onClick={() => togglePref(meta.key)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out",
                        value ? "bg-brand-primary" : "bg-bg-surface-alt border border-border"
                      )}
                      role="switch"
                      aria-checked={value}
                      aria-label={`Toggle ${meta.label}`}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          value ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setPrefs({ ...DEFAULT_PREFS })}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-surface-alt transition-colors"
            >
              Enable All
            </button>
            <button
              onClick={() => setPrefs({
                TRADE: false,
                SYSTEM: false,
                PRICE_ALERT: false,
                SUBSCRIPTION: false,
                MILESTONE: false,
              })}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-bg-surface-alt transition-colors"
            >
              Disable All
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors',
              saving ? 'bg-brand-primary/50 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20'
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
                Saved Successfully!
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </button>
        </>
      ) : (
        <div className="card-soft p-4 text-sm text-loss-red flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Failed to load notification settings. Please refresh.
        </div>
      )}
    </div>
  );
}
