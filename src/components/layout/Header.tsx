'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import {
  Search, Sun, Moon, Zap, ArrowLeft,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { StockSearch } from '@/components/shared/StockSearch';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { TrialTimerBadge } from '@/components/shared/TrialTimerBadge';

export function Header() {
  const { isAuthenticated, user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mounted = typeof window !== 'undefined';

  if (!isAuthenticated) return null;

  const getPageTitle = () => {
    const parts = pathname === '/' ? ['dashboard'] : pathname.replace('/', '').split('/');
    const segment = parts[0];
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      market: 'Markets',
      trade: 'Trade',
      optionchain: 'Option Chain',
      basket: 'Basket Order',
      positions: 'Positions',
      history: 'Wallet History',
      'wallet-history': 'Wallet History',
      watchlist: 'Watchlist',
      learning: 'Learning',
      subscription: 'Pricing',
      support: 'Support',
      profile: 'Profile',
      settings: 'Settings',
      notifications: 'Notifications',
      stock: 'Stock',
      portfolio: 'Portfolio',
    };
    // Settings sub-pages — show specific title
    if (segment === 'settings' && parts.length > 1) {
      const subTitles: Record<string, string> = {
        'change-password': 'Change Password',
        '2fa': 'Two-Factor Auth',
        'login-activity': 'Login Activity',
        'language': 'Language',
        'notifications': 'Notification Settings',
      };
      if (subTitles[parts[1]]) return subTitles[parts[1]];
    }
    return titles[segment] || 'Pepertect';
  };

  // Mobile search overlay — uses universal StockSearch
  if (mobileSearchOpen) {
    return (
      <header
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg-surface px-3 safe-pt"
        style={{ paddingTop: 'var(--safe-top)', height: 'calc(3.5rem + var(--safe-top))' }}
      >
        <button
          onClick={() => setMobileSearchOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt shrink-0"
          aria-label="Close search"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <StockSearch
            autoFocus
            placeholder="Search any stock / index…"
            className="w-full"
          />
        </div>
      </header>
    );
  }

  return (
    <>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <header
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg-surface/95 backdrop-blur-md px-3 md:px-6 safe-pt"
        style={{ paddingTop: 'var(--safe-top)', height: 'calc(3.5rem + var(--safe-top))' }}
      >
        {/* Mobile menu button */}
        <button
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg text-text-primary hover:bg-bg-surface-alt no-select"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Lightning bolt logo + Title (visible on all sizes) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary shrink-0">
            <Zap className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <h1 className="font-heading text-base md:text-lg font-bold text-text-primary truncate">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex-1" />

        {/* Universal desktop search — appears in header on every page */}
        <div className="hidden sm:block w-64 lg:w-80">
          <StockSearch
            placeholder="Search any stock / index…"
            className="w-full"
          />
        </div>

        {/* Mobile search trigger */}
        <button
          className="sm:hidden flex h-10 w-10 items-center justify-center rounded-lg text-text-primary hover:bg-bg-surface-alt no-select"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Theme toggle - desktop only */}
        <button
          onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface-alt no-select"
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifications - Interactive Bell with Dropdown */}
        <NotificationBell />

        {/* Trial Timer Badge - shows for eligible/active trial users */}
        <TrialTimerBadge />

        {/* User avatar (right side) */}
        <a
          href="/profile"
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold shrink-0 hover:opacity-90 transition-opacity"
        >
          {getInitials(user?.name || user?.email || 'U')}
        </a>
      </header>
    </>
  );
}
