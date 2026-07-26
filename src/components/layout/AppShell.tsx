'use client';

import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show full-screen for unauthenticated users (landing/login/register)
  if (!isAuthenticated && !isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <Sidebar />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        )}
      >
        <Header />
        <main
          className="flex-1 px-4 py-4 pb-mobile-nav md:px-6 md:py-6 md:pb-6"
          style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom) + var(--mobile-nav-height))' }}
        >
          <div className="mx-auto max-w-3xl lg:max-w-5xl">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
