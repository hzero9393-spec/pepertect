'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePositions } from '@/hooks/useApi';
import {
  LayoutDashboard, TrendingUp, Briefcase, Eye, BarChart3,
} from 'lucide-react';

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  activeMatchers?: string[];
}

// Order: Home, Markets, [Trade FAB], Positions, Watchlist
const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'market', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: BarChart3 },
  { id: 'positions', label: 'Positions', icon: Briefcase, href: '/positions', activeMatchers: ['/positions', '/position'] },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { data: positions } = usePositions();
  const activePath = pathname === '/' ? 'dashboard' : pathname.replace('/', '').split('/')[0];

  // Don't render the bottom nav on public pages
  if (!isAuthenticated) return null;

  const positionCount = positions?.length ?? 0;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden bottom-nav no-select'
      )}
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex h-16 items-stretch justify-around">
        {MOBILE_NAV_ITEMS.map((item) => {
          const itemHref = item.href ?? `/${item.id}`;
          const isActive = activePath === item.id ||
            (item.activeMatchers?.some((m) => pathname.startsWith(m)) ?? false);
          const Icon = item.icon;

          // Center "Trade" tab — elevated FAB
          if (item.id === 'trade') {
            return (
              <a
                key={item.id}
                href={itemHref}
                className="flex flex-1 flex-col items-center justify-end pb-1.5 animate-pulse"
                aria-current={isActive ? 'page' : undefined}
                aria-label="Trade"
              >
                <div className="fab-trade" style={{ width: '48px', height: '48px', boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)' }} aria-hidden>
                  <Icon className="h-6 w-6" strokeWidth={2.4} />
                </div>
                <span
                  className={cn(
                    'mt-1 text-[10px] font-medium',
                    isActive ? 'text-brand-primary font-semibold' : 'text-text-secondary'
                  )}
                >
                  {item.label}
                </span>
              </a>
            );
          }

          return (
            <a
              key={item.id}
              href={itemHref}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-95',
                isActive
                  ? 'text-brand-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-brand-primary" />
                )}
                {/* Positions badge */}
                {item.id === 'positions' && positionCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-loss-red text-[9px] font-bold text-white">{positionCount}</span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
