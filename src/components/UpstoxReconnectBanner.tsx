'use client';

import { ConnectionStatus } from '@/hooks/useLiveQuote';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * UpstoxReconnectBanner — shown ONLY to ADMIN when the Upstox access token is invalid/expired.
 *
 * IMPORTANT: In shared-token mode (UPSTOX_ADMIN_USER_ID is set), only the ADMIN user
 * needs to see this banner and reconnect. Regular users should NEVER see this because:
 *   - They don't have their own Upstox account connected
 *   - They can't do anything about the admin token expiry
 *   - Showing this popup confuses them ("Mujhe kyu connect karna hai?")
 *
 * Shown when: status === 'token_invalid' AND user is ADMIN
 * Hidden for: All other statuses OR non-admin users
 */
export function UpstoxReconnectBanner({ status }: { status: ConnectionStatus }) {
  // Hide immediately if status is not token_invalid
  if (status !== 'token_invalid') return null;

  // Get current user info from auth store
  const { user } = useAuthStore();

  // CRITICAL: Only show reconnect banner to ADMIN users
  // In shared-token mode, regular users don't have (and don't need) Upstox access
  const isAdmin = user?.role === 'ADMIN' || user?.email === 'hzero9393@gmail.com' || user?.email === 'test@pepertect.com';

  if (!isAdmin) {
    // Non-admin user: silently hide, no popup needed
    // The app will still work via REST polling fallback (every 10s)
    return null;
  }

  // Admin user: show the reconnect banner so they can refresh the shared token
  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg shadow-red-500/20">
        {/* Left: icon + message */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">⚠️ Admin: Upstox Token Expired</p>
            <p className="text-xs text-white/80 hidden sm:block">
              Shared token expired — all users affected! Click "Reconnect" to refresh.
            </p>
          </div>
        </div>

        {/* Right: reconnect button */}
        <a
          href="/api/upstox/connect"
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-red-600 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-white/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reconnect
        </a>
      </div>
    </div>
  );
}
