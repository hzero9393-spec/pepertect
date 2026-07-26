'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import {
  Search, Sun, Moon, Bell, Menu, Zap, X, ArrowLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn, getInitials } from '@/lib/utils';
import { MobileDrawer } from '@/components/layout/MobileDrawer';

export function Header() {
  const { setSearchQuery, searchQuery } = useAppStore();
  const { isAuthenticated, user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mounted = typeof window !== 'undefined';

  if (!isAuthenticated) return null;

  const getPageTitle = () => {
    const path = pathname === '/' ? 'dashboard' : pathname.replace('/', '').split('/')[0];
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      market: 'Markets',
      trade: 'Trade',
      positions: 'Positions',
      watchlist: 'Watchlist',
      learning: 'Learning',
      subscription: 'Pricing',
      support: 'Support',
      profile: 'Profile',
      settings: 'Settings',
      notifications: 'Notifications',
      stock: 'Stock',
    };
    return titles[path] || 'Pepertect';
  };

  // Mobile search overlay
  if (mobileSearchOpen) {
    return (
      <>
        <header
          className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg-surface px-3 safe-pt"
          style={{ paddingTop: 'var(--safe-top)', height: 'calc(3.5rem + var(--safe-top))' }}
        >
          <button
            onClick={() => {
              setMobileSearchOpen(false);
              setSearchQuery('');
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt"
            aria-label="Close search"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center relative">
            <Search className="absolute left-3 h-4 w-4 text-text-secondary pointer-events-none" />
            <Input
              autoFocus
              placeholder="Search stocks..."
              className="h-10 w-full pl-9 pr-9 bg-bg-surface-alt border-border text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>
      </>
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

        {/* Desktop search */}
        <div className="hidden sm:flex items-center relative max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary pointer-events-none" />
          <Input
            placeholder="Search stocks..."
            className="h-9 w-full pl-9 bg-bg-surface-alt border-border text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Notifications */}
        <a
          href="/notifications"
          aria-label="Notifications"
          className="relative flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-lg text-text-primary hover:bg-bg-surface-alt no-select"
        >
          <Bell className="h-5 w-5 md:h-[18px] md:w-[18px]" />
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-loss-red text-[10px] font-bold text-white">
            3
          </span>
        </a>

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
