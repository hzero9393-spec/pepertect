'use client';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, BarChart3, Briefcase, Eye,
  GraduationCap, CreditCard, HelpCircle, Settings, User,
  ChevronLeft, ChevronRight, LogOut, Zap, ListTree, Wallet,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  premium?: boolean;
  href?: string; // overrides the default `/${id}` href (e.g. '/position/stock')
  activeMatchers?: string[]; // additional path prefixes that should mark this item active
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'market', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: BarChart3 },
  { id: 'optionchain', label: 'Option Chain', icon: ListTree },
  { id: 'positions', label: 'Positions', icon: Briefcase, href: '/position/stock', activeMatchers: ['/position', '/positions'] },
  { id: 'history', label: 'Wallet History', icon: Wallet },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'learning', label: 'Learn', icon: GraduationCap, premium: true },
  { id: 'subscription', label: 'Pricing', icon: CreditCard },
  { id: 'support', label: 'Support', icon: HelpCircle },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { user, logout, isAuthenticated } = useAuthStore();
  const pathname = usePathname();

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
              {sidebarOpen && item.premium && (
                <span className="ml-auto rounded bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-gold">
                  PRO
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* User section */}
      {sidebarOpen && user && (
        <div className="border-t border-border-default p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-primary text-xs text-white">
                {getInitials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{user.name || 'User'}</p>
              <p className="truncate text-xs text-text-secondary">{user.tier} Plan</p>
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
    </aside>
  );
}
