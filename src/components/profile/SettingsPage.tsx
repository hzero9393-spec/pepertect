'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Sun, Moon, Shield, LogOut, Trash2, Bell, Monitor, Volume2,
  Download, Link2, ChevronDown, Eye, Sparkles, RefreshCcw,
} from 'lucide-react';

/* ============================================================
   Toggle Switch (inline helper)
   ============================================================ */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors duration-200',
        checked ? 'bg-brand-primary' : 'bg-border',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      aria-label="Toggle"
      aria-pressed={checked}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked && 'translate-x-5'
      )} />
    </button>
  );
}

/* ============================================================
   Setting Row
   ============================================================ */
function SettingRow({
  label,
  description,
  children,
  last,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between py-3 border-b border-border', last && 'border-0')}>
      <div className="pr-4">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   Section Card
   ============================================================ */
function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-bg-surface border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="icon-tile-sm bg-bg-surface-alt">
          <Icon className="h-4 w-4 text-text-secondary" />
        </div>
        <h3 className="font-heading text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   SettingsPage
   ============================================================ */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuthStore();
  const mounted = typeof window !== 'undefined';

  // --- Display settings (localStorage) ---
  const [compactMode, setCompactMode] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('pepertect_compact_mode');
    if (stored === 'true') setCompactMode(true);
  }, []);
  const handleCompactMode = (v: boolean) => {
    setCompactMode(v);
    localStorage.setItem('pepertect_compact_mode', String(v));
  };

  // --- Trading preferences (localStorage) ---
  const [defaultOrderType, setDefaultOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [confirmBeforeTrade, setConfirmBeforeTrade] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);

  useEffect(() => {
    const orderType = localStorage.getItem('pepertect_default_order_type');
    if (orderType === 'LIMIT' || orderType === 'MARKET') setDefaultOrderType(orderType);
    const confirm = localStorage.getItem('pepertect_confirm_trade');
    if (confirm === 'false') setConfirmBeforeTrade(false);
    const sound = localStorage.getItem('pepertect_sound_alerts');
    if (sound === 'true') setSoundAlerts(true);
  }, []);

  const handleOrderType = (type: 'MARKET' | 'LIMIT') => {
    setDefaultOrderType(type);
    localStorage.setItem('pepertect_default_order_type', type);
  };

  const handleConfirmTrade = (v: boolean) => {
    setConfirmBeforeTrade(v);
    localStorage.setItem('pepertect_confirm_trade', String(v));
  };

  const handleSoundAlerts = (v: boolean) => {
    setSoundAlerts(v);
    localStorage.setItem('pepertect_sound_alerts', String(v));
  };

  // --- Notification preferences (localStorage) ---
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(true);

  useEffect(() => {
    const push = localStorage.getItem('pepertect_push_notifications');
    if (push === 'false') setPushNotifications(false);
    const email = localStorage.getItem('pepertect_email_alerts');
    if (email === 'true') setEmailAlerts(true);
    const price = localStorage.getItem('pepertect_price_alerts');
    if (price === 'false') setPriceAlerts(false);
  }, []);

  const handlePushNotifications = (v: boolean) => {
    setPushNotifications(v);
    localStorage.setItem('pepertect_push_notifications', String(v));
  };

  const handleEmailAlerts = (v: boolean) => {
    setEmailAlerts(v);
    localStorage.setItem('pepertect_email_alerts', String(v));
  };

  const handlePriceAlerts = (v: boolean) => {
    setPriceAlerts(v);
    localStorage.setItem('pepertect_price_alerts', String(v));
  };

  // --- Danger Zone ---
  const [resetting, setResetting] = useState(false);
  const handleResetPortfolio = async () => {
    setResetting(true);
    try {
      const token = useAuthStore.getState().token;
      await fetch('/api/portfolio/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // silent
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="page-enter space-y-4 max-w-2xl">

      {/* ============== 1. DISPLAY SECTION ============== */}
      <SectionCard title="Display" icon={Monitor}>
        {/* Theme toggle */}
        <SettingRow
          label="Theme"
          description="Switch between light and dark mode"
        >
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => mounted && setTheme('light')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors',
                theme === 'light'
                  ? 'bg-brand-primary text-white'
                  : 'text-text-secondary hover:bg-bg-surface-alt'
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => mounted && setTheme('dark')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors',
                theme === 'dark'
                  ? 'bg-brand-primary text-white'
                  : 'text-text-secondary hover:bg-bg-surface-alt'
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
          </div>
        </SettingRow>

        {/* Compact Mode */}
        <SettingRow
          label="Compact Mode"
          description="Reduce spacing and padding for denser layout"
          last
        >
          <Toggle checked={compactMode} onChange={handleCompactMode} />
        </SettingRow>
      </SectionCard>

      {/* ============== 2. TRADING PREFERENCES ============== */}
      <SectionCard title="Trading Preferences" icon={Sparkles}>
        {/* Default Order Type */}
        <SettingRow
          label="Default Order Type"
          description="Pre-select order type when placing trades"
        >
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleOrderType('MARKET')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold transition-colors',
                defaultOrderType === 'MARKET'
                  ? 'bg-brand-primary text-white'
                  : 'text-text-secondary hover:bg-bg-surface-alt'
              )}
            >
              MARKET
            </button>
            <button
              type="button"
              onClick={() => handleOrderType('LIMIT')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold transition-colors',
                defaultOrderType === 'LIMIT'
                  ? 'bg-brand-primary text-white'
                  : 'text-text-secondary hover:bg-bg-surface-alt'
              )}
            >
              LIMIT
            </button>
          </div>
        </SettingRow>

        {/* Confirm Before Trade */}
        <SettingRow
          label="Confirm Before Trade"
          description="Show confirmation dialog before executing trades"
        >
          <Toggle checked={confirmBeforeTrade} onChange={handleConfirmTrade} />
        </SettingRow>

        {/* Sound Alerts */}
        <SettingRow
          label="Sound Alerts"
          description="Play sound for trade executions and price alerts"
          last
        >
          <Toggle checked={soundAlerts} onChange={handleSoundAlerts} />
        </SettingRow>
      </SectionCard>

      {/* ============== 3. NOTIFICATIONS SECTION ============== */}
      <SectionCard title="Notifications" icon={Bell}>
        <SettingRow
          label="Push Notifications"
          description="Get notified about trades and alerts"
        >
          <Toggle checked={pushNotifications} onChange={handlePushNotifications} />
        </SettingRow>

        <SettingRow
          label="Email Alerts"
          description="Receive email notifications for important updates"
        >
          <Toggle checked={emailAlerts} onChange={handleEmailAlerts} />
        </SettingRow>

        <SettingRow
          label="Price Alerts"
          description="Get alerts when watchlist items hit target prices"
          last
        >
          <Toggle checked={priceAlerts} onChange={handlePriceAlerts} />
        </SettingRow>
      </SectionCard>

      {/* ============== 4. ACCOUNT SECTION ============== */}
      <SectionCard title="Account" icon={Shield}>
        {/* Account Type */}
        <SettingRow
          label="Account Type"
          description={user?.email || ''}
        >
          <span className={cn(
            'pill',
            user?.tier === 'PREMIUM'
              ? 'bg-accent-gold/20 text-accent-gold'
              : 'bg-bg-surface-alt text-text-secondary'
          )}>
            {user?.tier || 'FREE'}
          </span>
        </SettingRow>

        {/* Connected Accounts */}
        <SettingRow
          label="Connected Accounts"
          description="Manage linked broker and social accounts"
        >
          <div className="flex items-center gap-1.5">
          
            <span className="text-xs text-text-secondary">Paper Trading</span>
            <Link2 className="h-3.5 w-3.5 text-text-tertiary" />
          </div>
        </SettingRow>

        {/* Download My Data */}
        <SettingRow
          label="Download My Data"
          description="Export your trade history and account data"
        >
          <button
            type="button"
            onClick={() => {
              const data = JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'pepertect-data.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-surface-alt transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </SettingRow>

        {/* Logout */}
        <SettingRow
          label="Logout"
          description="Sign out of your account"
          last
        >
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-loss-red/30 px-3 py-1.5 text-xs font-semibold text-loss-red hover:bg-tint-red transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </SettingRow>
      </SectionCard>

      {/* ============== 5. DANGER ZONE ============== */}
      <div className="rounded-xl bg-bg-surface border border-loss-red/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="icon-tile-sm bg-tint-red">
            <Trash2 className="h-4 w-4 text-loss-red" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-loss-red">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="pr-4">
            <p className="text-sm font-medium text-text-primary">Reset Portfolio</p>
            <p className="text-xs text-text-secondary mt-0.5">Reset all positions, orders, and balance</p>
          </div>
          <button
            type="button"
            onClick={handleResetPortfolio}
            disabled={resetting}
            className="flex items-center gap-1.5 rounded-lg border border-loss-red/30 px-3 py-1.5 text-xs font-semibold text-loss-red hover:bg-tint-red transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={cn('h-3.5 w-3.5', resetting && 'animate-spin')} />
            {resetting ? 'Resetting...' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
}
