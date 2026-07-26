'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import {
  Search, Sun, Moon, Bell, Menu, Zap, X, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MobileDrawer } from '@/components/layout/MobileDrawer';

export function Header() {
  const { setSearchQuery, searchQuery } = useAppStore();
  const { isAuthenticated } = useAuthStore();
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-default bg-bg-surface px-3 safe-pt"
                style={{ paddingTop: 'var(--safe-top)' }}>
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
              className="h-10 w-full pl-9 pr-9 bg-bg-surface-alt border-border-default text-base"
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
        className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-default bg-bg-surface/80 px-3 backdrop-blur-sm md:px-6"
        style={{ paddingTop: 'var(--safe-top)', height: 'calc(3.5rem + var(--safe-top))' }}
      >
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo + Title */}
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="h-5 w-5 text-brand-primary md:hidden shrink-0" />
          <h1 className="font-heading text-base md:text-lg font-semibold text-text-primary truncate">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex-1" />

        {/* Desktop search */}
        <div className="hidden sm:flex items-center relative max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary pointer-events-none" />
          <Input
            placeholder="Search stocks..."
            className="h-9 w-full pl-9 bg-bg-surface-alt border-border-default text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Mobile search trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-10 w-10"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme toggle - desktop only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9 hidden md:inline-flex"
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? (
            <Sun className="h-4 w-4 text-text-secondary" />
          ) : (
            <Moon className="h-4 w-4 text-text-secondary" />
          )}
        </Button>

        {/* Notifications */}
        <a href="/notifications" aria-label="Notifications">
          <Button variant="ghost" size="icon" className="relative h-10 w-10 md:h-9 md:w-9">
            <Bell className="h-5 w-5 md:h-4 md:w-4 text-text-secondary" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-loss-red text-[10px] font-bold text-white">
              3
            </span>
          </Button>
        </a>
      </header>
    </>
  );
}
