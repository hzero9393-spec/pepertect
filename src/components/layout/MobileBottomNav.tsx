'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, Briefcase, Eye, BarChart3,
} from 'lucide-react';

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'market', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: BarChart3 },
  { id: 'positions', label: 'Positions', icon: Briefcase },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const activePath = pathname === '/' ? 'dashboard' : pathname.replace('/', '').split('/')[0];

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'border-t border-border-default bg-bg-surface/95 backdrop-blur-lg',
        'no-select'
      )}
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex h-16 items-stretch justify-around">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = activePath === item.id;
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={`/${item.id}`}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                isActive
                  ? 'text-brand-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} strokeWidth={isActive ? 2.5 : 2} />
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
