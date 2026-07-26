'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { MarketPage } from '@/components/market/MarketPage';
import { TradePage } from '@/components/trading/TradePage';
import { PositionsPage } from '@/components/portfolio/PositionsPage';
import { WatchlistPage } from '@/components/market/WatchlistPage';
import { LearningPage } from '@/components/learning/LearningPage';
import { SubscriptionPage } from '@/components/subscription/SubscriptionPage';
import { SupportPage } from '@/components/support/SupportPage';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { SettingsPage } from '@/components/profile/SettingsPage';
import { NotificationsPage } from '@/components/shared/NotificationsPage';
import { LandingPage } from '@/components/auth/LandingPage';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { StockDetailPage } from '@/components/market/StockDetailPage';

const PAGE_MAP: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  market: MarketPage,
  trade: TradePage,
  positions: PositionsPage,
  watchlist: WatchlistPage,
  learning: LearningPage,
  subscription: SubscriptionPage,
  support: SupportPage,
  profile: ProfilePage,
  settings: SettingsPage,
  notifications: NotificationsPage,
  landing: LandingPage,
  login: LoginPage,
  register: RegisterPage,
};

function resolvePage(pathname: string): React.ComponentType | null {
  if (pathname === '/') {
    return LandingPage;
  }
  const segment = pathname.replace('/', '').split('/')[0];
  if (segment === 'stock') return StockDetailPage;
  return PAGE_MAP[segment] ?? null;
}

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener('app:navigate', cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener('app:navigate', cb);
  };
}

export default function HomePage() {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname, () => '/');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);

  // Mount + SPA click interceptor
  useEffect(() => {
    setReady(true);

    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('/api/') || href.startsWith('#')) return;
      e.preventDefault();
      window.history.pushState({}, '', href);
      window.dispatchEvent(new Event('app:navigate'));
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Also listen for popstate to update route
  useEffect(() => {
    const handler = () => window.dispatchEvent(new Event('app:navigate'));
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">Loading Pepertect...</p>
        </div>
      </div>
    );
  }

  const Page = pathname === '/' && isAuthenticated ? DashboardPage : resolvePage(pathname);

  if (!Page) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-32">
          <h1 className="font-heading text-4xl font-bold text-text-primary">404</h1>
          <p className="mt-2 text-text-secondary">Page not found</p>
          <a href="/" className="mt-4 text-brand-primary hover:underline">Go Home</a>
        </div>
      </AppShell>
    );
  }

  const segment = pathname.replace('/', '').split('/')[0];
  const isAuthPage = ['landing', 'login', 'register'].includes(segment);

  if (isAuthPage) {
    return <Page />;
  }

  return (
    <AppShell>
      <Page />
    </AppShell>
  );
}
