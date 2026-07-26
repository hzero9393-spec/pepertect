'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import {
  Monitor,
  ChevronLeft,
  Smartphone,
  LogIn,
  LogOut,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Globe,
  Clock,
  MapPin,
} from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  details: unknown;
  createdAt: string;
}

interface SessionEntry {
  id: string;
  device: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface LoginData {
  logs: ActivityEntry[];
  sessions: SessionEntry[];
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string; tint: string }> = {
  LOGIN:          { label: 'Logged in',       icon: LogIn,         color: 'text-profit-green', tint: 'bg-tint-green' },
  LOGOUT:         { label: 'Logged out',      icon: LogOut,        color: 'text-text-secondary', tint: 'bg-bg-surface-alt' },
  LOGOUT_ALL:     { label: 'Ended all sessions', icon: LogOut,     color: 'text-loss-red', tint: 'bg-tint-red' },
  PASSWORD_CHANGE:{ label: 'Password changed', icon: KeyRound,     color: 'text-brand-primary', tint: 'bg-tint-blue' },
  '2FA_ENABLE':   { label: '2FA enabled',     icon: ShieldCheck,   color: 'text-profit-green', tint: 'bg-tint-green' },
  '2FA_DISABLE':  { label: '2FA disabled',    icon: ShieldAlert,   color: 'text-loss-red', tint: 'bg-tint-red' },
};

function parseUserAgent(ua: string | null): { device: string; browser: string; os: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|OPR)\/[\d.]+/);
  const osMatch = ua.match(/(Windows NT [\d.]+|Mac OS X [\d_]+|Android [\d.]+|iPhone OS [\d_]+|Linux)/);
  let device = 'Desktop';
  if (/iPhone|iPad|Android.*Mobile/i.test(ua)) device = 'Mobile';
  else if (/iPad|Android(?!.*Mobile)/i.test(ua)) device = 'Tablet';
  return {
    device,
    browser: browserMatch ? browserMatch[1].replace('OPR', 'Opera') : 'Unknown',
    os: osMatch ? osMatch[1].replace(/_/g, '.').replace('NT ', '') : 'Unknown',
  };
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function LoginActivityPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<LoginData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/user/login-activity', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || 'Failed to load login activity');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
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
          <h1 className="font-heading text-xl font-bold text-text-primary">Login Activity</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Recent sign-ins and account activity
          </p>
        </div>
      </div>

      {loading && (
        <div className="card-soft p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          <span className="ml-2 text-sm text-text-secondary">Loading activity...</span>
        </div>
      )}

      {error && (
        <div className="card-soft p-4 bg-tint-red text-loss-red text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Active sessions */}
          {data.sessions.length > 0 && (
            <div className="card-soft p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-heading text-sm font-semibold text-text-primary">
                  Active Sessions ({data.sessions.length})
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Devices currently signed in to your account
                </p>
              </div>
              <div className="divide-y divide-border">
                {data.sessions.map((s) => {
                  const info = parseUserAgent(s.device);
                  const Icon = info.device === 'Mobile' || info.device === 'Tablet' ? Smartphone : Monitor;
                  return (
                    <div key={s.id} className="p-4 flex items-start gap-3">
                      <div className="icon-tile-sm bg-tint-blue">
                        <Icon className="h-4 w-4 text-brand-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {info.browser} on {info.os}
                          </p>
                          <span className="pill bg-tint-green text-profit-green">Active</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {info.device}
                          </span>
                          {s.ip && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {s.ip}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started {timeAgo(s.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent activity log */}
          <div className="card-soft p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                Recent Activity
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Last {data.logs.length} account events
              </p>
            </div>
            {data.logs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-alt mb-2">
                  <Shield className="h-6 w-6 text-text-secondary" />
                </div>
                <p className="text-sm font-medium text-text-primary">No activity yet</p>
                <p className="text-xs text-text-secondary mt-1">
                  Your account activity will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.logs.map((log) => {
                  const meta = ACTION_META[log.action] || {
                    label: log.action,
                    icon: Shield,
                    color: 'text-text-secondary',
                    tint: 'bg-bg-surface-alt',
                  };
                  const Icon = meta.icon;
                  const info = parseUserAgent(log.userAgent);
                  return (
                    <div key={log.id} className="p-3 sm:p-4 flex items-start gap-3">
                      <div className={cn('icon-tile-sm', meta.tint)}>
                        <Icon className={cn('h-4 w-4', meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('text-sm font-semibold', meta.color)}>
                            {meta.label}
                          </p>
                          <span className="text-[11px] text-text-tertiary">·</span>
                          <span className="text-[11px] text-text-secondary">{timeAgo(log.createdAt)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                          {log.userAgent && (
                            <span className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {info.browser} · {info.os}
                            </span>
                          )}
                          {log.ip && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {log.ip}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
