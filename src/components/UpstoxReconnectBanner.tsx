'use client';

import { ConnectionStatus } from '@/hooks/useLiveQuote';

/**
 * UpstoxReconnectBanner — shown when the Upstox access token is invalid/expired.
 * The user must click "Reconnect Upstox" to initiate a new OAuth flow.
 *
 * Shown when status === 'token_invalid' (detected by consecutive 401 responses in
 * the polling fallback). Hidden for all other statuses.
 *
 * Props:
 *   status — ConnectionStatus from useLiveQuote()
 */
export function UpstoxReconnectBanner({ status }: { status: ConnectionStatus }) {
  if (status !== 'token_invalid') return null;

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
            <p className="font-semibold text-sm">Upstox Token Expired — No Live Data</p>
            <p className="text-xs text-white/80 hidden sm:block">
              Real-time market data is paused. Click &quot;Reconnect&quot; to re-authorize your Upstox account.
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
