'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { MarketPage } from '@/components/market/MarketPage';
import { MoversPage } from '@/components/market/MoversPage';
import { LegalPage } from '@/components/legal/LegalPage';
import { LEGAL_DOCS } from '@/components/legal/legal-docs';
import { TradePage } from '@/components/trading/TradePage';
import { OptionChainPage } from '@/components/trading/OptionChainPage';
import { OptionStrikeOverviewPage } from '@/components/trading/OptionStrikeOverviewPage';
import { BasketPage } from '@/components/trading/BasketPage';
import { PositionsPage } from '@/components/portfolio/PositionsPage';
import { WatchlistPage } from '@/components/market/WatchlistPage';
import { LearningPage } from '@/components/learning/LearningPage';
import { SubscriptionPage } from '@/components/subscription/SubscriptionPage';
import { FreeTrialPage } from '@/components/subscription/FreeTrialPage';
import { PortfolioPage } from '@/components/portfolio/PortfolioPage';
import { SupportPage } from '@/components/support/SupportPage';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { SettingsPage } from '@/components/profile/SettingsPage';
import { NotificationsPage } from '@/components/shared/NotificationsPage';
import { ChangePasswordPage } from '@/components/settings/ChangePasswordPage';
import { TwoFactorPage } from '@/components/settings/TwoFactorPage';
import { LoginActivityPage } from '@/components/settings/LoginActivityPage';
import { NotificationSettingsPage } from '@/components/settings/NotificationSettingsPage';
import { LanguagePage } from '@/components/settings/LanguagePage';
import { LandingPage } from '@/components/auth/LandingPage';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { StockDetailPage } from '@/components/market/StockDetailPage';

const PAGE_MAP: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  market: MarketPage,
  movers: MoversPage,
  trade: TradePage,
  optionchain: OptionChainPage,
  basket: BasketPage,
  positions: PositionsPage,
  watchlist: WatchlistPage,
  learning: LearningPage,
  subscription: SubscriptionPage,
  'free-trial': FreeTrialPage,
  portfolio: PortfolioPage,
  support: SupportPage,
  profile: ProfilePage,
  settings: SettingsPage,
  notifications: NotificationsPage,
  landing: LandingPage,
  login: LoginPage,
  register: RegisterPage,
};

// Settings sub-pages — handle /settings/change-password, /settings/2fa, etc.
const SETTINGS_PAGE_MAP: Record<string, React.ComponentType> = {
  'change-password': ChangePasswordPage,
  '2fa': TwoFactorPage,
  'login-activity': LoginActivityPage,
  'notifications': NotificationSettingsPage,
  'language': LanguagePage,
};

function resolvePage(pathname: string): React.ComponentType | null {
  if (pathname === '/') {
    return LandingPage;
  }
  const parts = pathname.replace('/', '').split('/');
  const segment = parts[0];
  if (segment === 'stock') return StockDetailPage;
  // Handle /optionchain/strike — focused single-strike overview page
  if (segment === 'optionchain' && parts.length > 1 && parts[1] === 'strike') {
    return OptionStrikeOverviewPage;
  }
  // Handle /settings/<sub-page> routes
  if (segment === 'settings' && parts.length > 1 && parts[1]) {
    const subPage = SETTINGS_PAGE_MAP[parts[1]];
    if (subPage) return subPage;
  }
  // Handle /legal/<doc> routes — render the matching legal document
  if (segment === 'legal' && parts.length > 1 && parts[1]) {
    const doc = LEGAL_DOCS[parts[1]];
    if (doc) return () => <LegalPage doc={doc} />;
  }
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
  // When unauthenticated, the root `/` (empty segment) is the public landing page —
  // render it full-screen without the AppShell sidebar/header wrapper.
  // When authenticated, `/` shows the Dashboard inside AppShell (handled above).
  const isAuthPage =
    ['landing', 'login', 'register'].includes(segment) ||
    (segment === '' && !isAuthenticated);

  if (isAuthPage) {
    return <Page />;
  }

  return (
    <AppShell>
      <Page />
    </AppShell>
  );
}
