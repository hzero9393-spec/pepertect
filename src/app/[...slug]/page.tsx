'use client';

import { useEffect, useState, useSyncExternalStore, lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { AppShell } from '@/components/layout/AppShell';
import { PageErrorBoundary } from '@/components/shared/PageErrorBoundary';

// ────────────────────────────────────────────────────────────────────────
// Code-splitting: every page is lazy-loaded so the initial bundle only
// ships the shell + the currently-active page.  This alone cuts JS
// payload by ~60-70 % and shaves seconds off first-paint / navigation.
// ────────────────────────────────────────────────────────────────────────
const DashboardPage         = lazy(() => import('@/components/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MarketPage            = lazy(() => import('@/components/market/MarketPage').then(m => ({ default: m.MarketPage })));
const MoversPage            = lazy(() => import('@/components/market/MoversPage').then(m => ({ default: m.MoversPage })));
const TradePage             = lazy(() => import('@/components/trading/TradePage').then(m => ({ default: m.TradePage })));
const OptionChainPage       = lazy(() => import('@/components/trading/OptionChainPage').then(m => ({ default: m.OptionChainPage })));
const OptionStrikeOverviewPage = lazy(() => import('@/components/trading/OptionStrikeOverviewPage').then(m => ({ default: m.OptionStrikeOverviewPage })));
const BasketPage            = lazy(() => import('@/components/trading/BasketPage').then(m => ({ default: m.BasketPage })));
const PositionsPage         = lazy(() => import('@/components/portfolio/PositionsPage').then(m => ({ default: m.PositionsPage })));
const WatchlistPage         = lazy(() => import('@/components/market/WatchlistPage').then(m => ({ default: m.WatchlistPage })));
const LearningPage          = lazy(() => import('@/components/learning/LearningPage').then(m => ({ default: m.LearningPage })));
const PortfolioPage         = lazy(() => import('@/components/portfolio/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const TransactionHistoryPage = lazy(() => import('@/components/portfolio/TransactionHistoryPage').then(m => ({ default: m.TransactionHistoryPage })));
const TradeHistoryPage      = lazy(() => import('@/components/portfolio/TradeHistoryPage').then(m => ({ default: m.TradeHistoryPage })));
const SupportPage           = lazy(() => import('@/components/support/SupportPage').then(m => ({ default: m.SupportPage })));
const NewTicketPage         = lazy(() => import('@/components/support/NewTicketPage').then(m => ({ default: m.NewTicketPage })));
const HelpCenterPage        = lazy(() => import('@/components/support/HelpCenterPage').then(m => ({ default: m.HelpCenterPage })));
const LiveChatPage          = lazy(() => import('@/components/support/LiveChatPage').then(m => ({ default: m.LiveChatPage })));
const ProfilePage           = lazy(() => import('@/components/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage          = lazy(() => import('@/components/profile/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationsPage     = lazy(() => import('@/components/shared/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ChangePasswordPage    = lazy(() => import('@/components/settings/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
const TwoFactorPage         = lazy(() => import('@/components/settings/TwoFactorPage').then(m => ({ default: m.TwoFactorPage })));
const LoginActivityPage     = lazy(() => import('@/components/settings/LoginActivityPage').then(m => ({ default: m.LoginActivityPage })));
const NotificationSettingsPage = lazy(() => import('@/components/settings/NotificationSettingsPage').then(m => ({ default: m.NotificationSettingsPage })));
const LanguagePage          = lazy(() => import('@/components/settings/LanguagePage').then(m => ({ default: m.LanguagePage })));
const LandingPage           = lazy(() => import('@/components/auth/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage             = lazy(() => import('@/components/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage          = lazy(() => import('@/components/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const StockDetailPage       = lazy(() => import('@/components/market/StockDetailPage').then(m => ({ default: m.StockDetailPage })));
const LegalPage             = lazy(() => import('@/components/legal/LegalPage').then(m => ({ default: m.LegalPage })));

// LEGAL_DOCS is used for URL resolution — it's a small static object
// so a normal import is fine (adds ~1KB to initial bundle).
import { LEGAL_DOCS } from '@/components/legal/legal-docs';

const PAGE_MAP: Record<string, ComponentType> = {
  dashboard: DashboardPage,
  market: MarketPage,
  movers: MoversPage,
  trade: TradePage,
  optionchain: OptionChainPage,
  basket: BasketPage,
  positions: PositionsPage,
  watchlist: WatchlistPage,
  learning: LearningPage,
  portfolio: PortfolioPage,
  history: TransactionHistoryPage,
  'wallet-history': TransactionHistoryPage,
  'trade-history': TradeHistoryPage,
  support: SupportPage,
  profile: ProfilePage,
  settings: SettingsPage,
  notifications: NotificationsPage,
  landing: LandingPage,
  login: LoginPage,
  register: RegisterPage,
};

// Settings sub-pages
const SETTINGS_PAGE_MAP: Record<string, ComponentType> = {
  'change-password': ChangePasswordPage,
  '2fa': TwoFactorPage,
  'login-activity': LoginActivityPage,
  'notifications': NotificationSettingsPage,
  'language': LanguagePage,
};

function resolvePage(pathname: string): ComponentType | null {
  if (pathname === '/') {
    return LandingPage;
  }
  const parts = pathname.replace('/', '').split('/');
  const segment = parts[0];
  if (segment === 'stock') return StockDetailPage;
  if (segment === 'optionchain' && parts.length > 1 && parts[1] === 'strike') {
    return OptionStrikeOverviewPage;
  }
  if (segment === 'positions') {
    if (parts.length > 1 && parts[1] === 'index') {
      return () => <Suspense fallback={<PageSkeleton />}><PositionsPage initialTab="index" /></Suspense>;
    }
    return () => <Suspense fallback={<PageSkeleton />}><PositionsPage initialTab="stock" /></Suspense>;
  }
  if (segment === 'position' && parts.length > 1 && parts[1] === 'index') {
    return () => <Suspense fallback={<PageSkeleton />}><PositionsPage initialTab="index" /></Suspense>;
  }
  if (segment === 'position' && parts.length > 1 && parts[1] === 'stock') {
    return () => <Suspense fallback={<PageSkeleton />}><PositionsPage initialTab="stock" /></Suspense>;
  }
  if (segment === 'support' && parts.length > 1 && parts[1]) {
    const SUPPORT_PAGE_MAP: Record<string, ComponentType> = {
      'new-ticket': NewTicketPage,
      'help-center': HelpCenterPage,
      'live-chat': LiveChatPage,
    };
    const subPage = SUPPORT_PAGE_MAP[parts[1]];
    if (subPage) return subPage;
  }
  if (segment === 'settings' && parts.length > 1 && parts[1]) {
    const subPage = SETTINGS_PAGE_MAP[parts[1]];
    if (subPage) return subPage;
  }
  if (segment === 'legal' && parts.length > 1 && parts[1]) {
    const doc = LEGAL_DOCS[parts[1]];
    if (doc) return () => <Suspense fallback={<PageSkeleton />}><LegalPage doc={doc} /></Suspense>;
  }
  if (segment !== 'positions') {
    return PAGE_MAP[segment] ?? null;
  }
  return null;
}

/* Minimal skeleton shown while lazy-loaded pages download */
function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-bg-surface-alt" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-bg-surface-alt" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-bg-surface-alt" />
    </div>
  );
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

    // Handle Google OAuth callback redirect (token in URL params)
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('token');
    if (authToken) {
      const { login } = useAuthStore.getState();
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            login(data.user, authToken);
          }
        })
        .catch(() => {});
      window.history.replaceState({}, '', window.location.pathname);
    }

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
  const isAuthPage =
    ['landing', 'login', 'register'].includes(segment) ||
    (segment === '' && !isAuthenticated);

  if (isAuthPage) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-bg-base">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        }
      >
        <Page />
      </Suspense>
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>
        <PageErrorBoundary>
          <Page />
        </PageErrorBoundary>
      </Suspense>
    </AppShell>
  );
}
