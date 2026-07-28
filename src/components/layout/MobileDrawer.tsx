'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  X, Zap, LayoutDashboard, TrendingUp, BarChart3, Briefcase, Eye,
  GraduationCap, HelpCircle, Settings, User,
  LogOut, ChevronRight, Sun, Moon, ListTree, Wallet,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface DrawerItem {
  id: string;
  label: string;
  icon: React.ElementType;
  premium?: boolean;
  href?: string;
  activeMatchers?: string[];
}

const PRIMARY_ITEMS: DrawerItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'market', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: BarChart3 },
  { id: 'optionchain', label: 'Option Chain', icon: ListTree },
  { id: 'positions', label: 'Positions', icon: Briefcase, href: '/positions', activeMatchers: ['/positions', '/position'] },
  { id: 'history', label: 'Wallet History', icon: Wallet },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
];

const SECONDARY_ITEMS: DrawerItem[] = [
  { id: 'learning', label: 'Learning', icon: GraduationCap, premium: true },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

const ACCOUNT_ITEMS: DrawerItem[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const activePath = pathname === '/' ? 'dashboard' : pathname.replace('/', '').split('/')[0];

  const renderItem = (item: DrawerItem) => {
    const itemHref = item.href ?? `/${item.id}`;
    const isActive = activePath === item.id ||
      (item.activeMatchers?.some((m) => pathname.startsWith(m)) ?? false);
    const Icon = item.icon;
    return (
      <a
        key={item.id}
        href={itemHref}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-primary/10 text-brand-primary'
            : 'text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.premium && (
          <span className="rounded bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-gold">
            PRO
          </span>
        )}
        {isActive && <ChevronRight className="h-4 w-4" />}
      </a>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-[60] h-full w-[85vw] max-w-xs flex flex-col',
          'bg-bg-surface border-r border-border-default transition-transform duration-300 ease-out',
          'md:hidden will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
        style={{ paddingTop: 'var(--safe-top)' }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-4 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-primary" />
            <span className="font-heading text-lg font-bold text-text-primary">Pepertect</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt active:bg-bg-surface-alt/80 transition-colors touch-manipulation"
            aria-label="Close menu"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User profile card */}
        {user && (
          <div className="border-b border-border-default p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-brand-primary text-sm text-white">
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {user.name || user.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                    user.tier === 'PREMIUM'
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : 'bg-bg-surface-alt text-text-secondary'
                  )}>
                    {user.tier}
                  </span>
                  <span className="text-xs text-text-secondary">
                    ₹{Number(user.virtualCapital).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Trading
            </p>
            {PRIMARY_ITEMS.map(renderItem)}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              More
            </p>
            {SECONDARY_ITEMS.map(renderItem)}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Account
            </p>
            {ACCOUNT_ITEMS.map(renderItem)}
            {/* Theme toggle */}
            <button
              onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="h-5 w-5 shrink-0" />
              ) : (
                <Moon className="h-5 w-5 shrink-0" />
              )}
              <span className="flex-1 text-left">
                {mounted && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className="border-t border-border-default p-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-loss-red hover:bg-loss-red/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
