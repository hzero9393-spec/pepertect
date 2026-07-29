'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, BarChart3, Briefcase, Eye,
  GraduationCap, HelpCircle, Settings, User,
  ChevronLeft, ChevronRight, LogOut, Zap, ListTree, Wallet, History,
  Wallet as WalletIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, formatINR } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string; // overrides the default `/${id}` href (e.g. '/position/stock')
  activeMatchers?: string[]; // additional path prefixes that should mark this item active
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'market', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: BarChart3 },
  { id: 'optionchain', label: 'Option Chain', icon: ListTree },
  { id: 'positions', label: 'Positions', icon: Briefcase, href: '/positions', activeMatchers: ['/positions', '/position'] },
  { id: 'trade-history', label: 'Trade History', icon: History, href: '/trade-history' },
  { id: 'history', label: 'Wallet History', icon: Wallet },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'learning', label: 'Learn', icon: GraduationCap },
  { id: 'support', label: 'Support', icon: HelpCircle },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { user, logout, isAuthenticated, token } = useAuthStore();
  const pathname = usePathname();
  const [availableMargin, setAvailableMargin] = useState<number | null>(null);

  // Fetch user's available margin for display
  useEffect(() => {
    if (!token || !isAuthenticated) return;
    
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/portfolio', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data) {
          setAvailableMargin(Number(data.data.availableMargin) || null);
        }
      } catch {
        // Silent fail
      }
    };

    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [token, isAuthenticated]);

  if (!isAuthenticated) return null;

  const activePath = pathname === '/' ? 'dashboard' : pathname.replace('/', '').split('/')[0];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden md:flex h-screen flex-col border-r border-border-default bg-bg-surface transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border-default px-4">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-primary" />
            <span className="font-heading text-lg font-bold text-text-primary">Pepertect</span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-bg-surface-alt',
            !sidebarOpen && 'mx-auto'
          )}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          // Active if: (a) first URL segment matches item.id, OR (b) pathname
          // starts with any of item.activeMatchers (e.g. /position/stock and
          // /position/index both highlight the "Positions" nav item).
          const itemHref = item.href ?? `/${item.id}`;
          const isActive = activePath === item.id ||
            (item.activeMatchers?.some((m) => pathname.startsWith(m)) ?? false);
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={itemHref}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && (
                <span className="truncate">{item.label}</span>
              )}

            </a>
          );
        })}
      </nav>

      {/* User section with Balance */}
      {sidebarOpen && user && (
        <div className="border-t border-border-default p-3 space-y-3">
          {/* Balance Card */}
          <div className="rounded-xl bg-gradient-to-r from-brand-primary/10 to-accent-gold/10 p-3 border border-brand-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <WalletIcon className="h-4 w-4 text-brand-primary" />
              <span className="text-[11px] font-medium text-text-secondary">Available Margin</span>
            </div>
            <p className="font-heading text-lg font-bold text-text-primary tabular-nums">
              {availableMargin !== null ? formatINR(availableMargin) : '₹--'}
            </p>
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-primary text-xs text-white">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{user.name || 'User'}</p>
              <p className="truncate text-xs text-text-secondary">Free Account</p>
            </div>
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt hover:text-loss-red"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Collapsed User Section (no balance visible) */}
      {!sidebarOpen && user && (
        <div className="border-t border-border-default p-2">
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-primary text-xs text-white">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={logout}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt hover:text-loss-red"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
