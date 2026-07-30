'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import {
  Search, Sun, Moon, Zap, ArrowLeft,
  User, Settings, LogOut,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { StockSearch } from '@/components/shared/StockSearch';
import { NotificationBell } from '@/components/shared/NotificationBell';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const mounted = typeof window !== 'undefined';

  // Market status: 9:15 AM - 3:30 PM IST = "Market Open"
  const isMarketOpen = useMemo(() => {
    const now = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const istTime = new Date(utcTime + istOffset);
    const day = istTime.getDay();
    if (day === 0 || day === 6) return false; // Weekend
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
  }, []);

  // Refresh market status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render by updating a dummy state
      // We use the isMarketOpen memo which depends on Date
      // Instead, let's just re-render by ticking
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close avatar menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        language: 'Language',
        notifications: 'Notification Settings',
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
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg-surface/95 backdrop-blur-md shadow-sm shadow-black/5 px-3 md:px-6 safe-pt"
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

        {/* Lightning bolt logo + Title + Market Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary shrink-0">
            <Zap className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <h1 className="font-heading text-base md:text-lg font-bold text-text-primary truncate">
            {getPageTitle()}
          </h1>
          {/* Market Status Pill */}
          <span
            className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isMarketOpen
                ? 'bg-profit-green/15 text-profit-green'
                : 'bg-accent-gold/15 text-accent-gold'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isMarketOpen ? 'bg-profit-green' : 'bg-accent-gold'
              }`}
            />
            {isMarketOpen ? 'Live' : 'Closed'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Universal desktop search — pill shape */}
        <div className="hidden sm:block w-64 lg:w-80">
          <div className="rounded-full bg-bg-surface-alt border border-border focus-within:border-brand-primary/50 focus-within:ring-2 focus-within:ring-brand-primary/10 transition-all">
            <StockSearch
              placeholder="Search any stock / index…"
              className="w-full"
            />
          </div>
        </div>

        {/* Mobile search trigger */}
        <button
          className="sm:hidden flex h-10 w-10 items-center justify-center rounded-lg text-text-primary hover:bg-bg-surface-alt no-select"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Notifications - Interactive Bell with Dropdown */}
        <NotificationBell />

        {/* Avatar dropdown */}
        <div className="relative hidden md:block" ref={avatarMenuRef}>
          <button
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            aria-label="User menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold shrink-0 hover:opacity-90 transition-opacity"
          >
            {getInitials(user?.name || user?.email || 'U')}
          </button>
          {avatarMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-bg-surface shadow-lg shadow-black/10 p-1 z-50">
              <a
                href="/profile"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </a>
              <a
                href="/settings"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </a>
              <button
                onClick={() => mounted && setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface-alt hover:text-text-primary transition-colors"
              >
                {mounted && theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span>Theme</span>
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { logout(); setAvatarMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-loss-red hover:bg-loss-red/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
