'use client';

import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import {
  Search, Sun, Moon, Bell, Menu, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Header() {
  const { toggleSidebar, searchOpen, setSearchOpen, setSearchQuery } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const mounted = typeof window !== 'undefined';

  if (!isAuthenticated) return null;

  const getPageTitle = () => {
    const path = pathname === '/' ? 'dashboard' : pathname.replace('/', '');
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
    };
    return titles[path] || 'Pepertect';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border-default bg-bg-surface/80 px-4 backdrop-blur-sm">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title */}
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-brand-primary md:hidden" />
        <h1 className="font-heading text-lg font-semibold text-text-primary">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden sm:flex items-center relative max-w-xs">
        <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
        <Input
          placeholder="Search stocks..."
          className="h-9 w-full pl-9 bg-bg-surface-alt border-border-default text-sm"
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
        />
      </div>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="h-9 w-9"
      >
        {mounted && theme === 'dark' ? (
          <Sun className="h-4 w-4 text-text-secondary" />
        ) : (
          <Moon className="h-4 w-4 text-text-secondary" />
        )}
      </Button>

      {/* Notifications */}
      <a href="/notifications">
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4 text-text-secondary" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-loss-red text-[10px] font-bold text-white">
            3
          </span>
        </Button>
      </a>
    </header>
  );
}
