'use client';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/hooks/useApi';
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
  href?: string;
  activeMatchers?: string[];
}

const TRADING_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'market', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: BarChart3 },
  { id: 'optionchain', label: 'Option Chain', icon: ListTree },
  { id: 'positions', label: 'Positions', icon: Briefcase, href: '/positions', activeMatchers: ['/positions', '/position'] },
];

const ANALYSIS_ITEMS: NavItem[] = [
  { id: 'trade-history', label: 'Trade History', icon: History, href: '/trade-history' },
  { id: 'history', label: 'Wallet History', icon: Wallet },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
];

const MORE_ITEMS: NavItem[] = [
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { user, logout, isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  // Use shared React Query hook — reads from the same cache as Dashboard
  const { data: portfolio } = usePortfolio();

  if (!isAuthenticated) return null;

  const activePath = pathname === '/' ? 'dashboard' : pathname.replace('/', '').split('/')[0];

  const renderNavItem = (item: NavItem) => {
    const itemHref = item.href ?? `/${item.id}`;
    const isActive = activePath === item.id ||
      (item.activeMatchers?.some((m) => pathname.startsWith(m)) ?? false);
    const Icon = item.icon;
    return (
      <a
        key={item.id}
        href={itemHref}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'border-l-[3px] border-l-brand-primary bg-brand-primary/10 text-brand-primary'
            : 'border-l-[3px] border-l-transparent text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary'
        )}
        title={!sidebarOpen ? item.label : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {sidebarOpen && (
          <span className="truncate">{item.label}</span>
        )}
        {!sidebarOpen && (
          <span className="pointer-events-none absolute left-full ml-2 rounded-md bg-text-primary px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">{item.label}</span>
        )}
      </a>
    );
  };

  const renderSection = (title: string, items: NavItem[], isFirst: boolean) => (
    <div key={title}>
      {isFirst ? null : <div className="border-t border-border mt-3" />}
      {sidebarOpen && (
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{title}</p>
      )}
      {!sidebarOpen && (
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{title}</p>
      )}
      {items.map(renderNavItem)}
    </div>
  );

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
        {renderSection('TRADING', TRADING_ITEMS, true)}
        {renderSection('ANALYSIS', ANALYSIS_ITEMS, false)}
        {renderSection('MORE', MORE_ITEMS, false)}
      </nav>

      {/* Bottom section: P&L + User info */}
      {sidebarOpen && user && (
        <div className="border-t border-border-default p-3 space-y-3">
          {/* Day P&L mini widget */}
          <div className="px-3 pb-2">
            <p className="text-[10px] text-text-tertiary font-medium">Day P&L</p>
            <p className="text-sm font-bold text-profit-green font-mono">+₹0.00</p>
          </div>

          {/* Balance Card */}
          <div className="rounded-xl bg-gradient-to-r from-brand-primary/10 to-accent-gold/10 p-3 border border-brand-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <WalletIcon className="h-4 w-4 text-brand-primary" />
              <span className="text-[11px] font-medium text-text-secondary">Available Margin</span>
            </div>
            <p className="font-heading text-lg font-bold text-text-primary tabular-nums">
              {portfolio?.availableMargin != null ? formatINR(Number(portfolio.availableMargin)) : '₹--'}
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
