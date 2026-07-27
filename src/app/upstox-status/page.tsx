'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function UpstoxStatusContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const success = sp.get('success') === '1';
  const error = sp.get('error');
  const hint = sp.get('hint');
  const email = sp.get('email');
  const expiresIn = sp.get('expires_in');
  const worker = sp.get('worker');
  const userId = sp.get('user_id');

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push('/dashboard'), 5000);
      return () => clearTimeout(t);
    }
  }, [success, router]);

  const isInvalidAuthCode = error && error.includes('UDAPI100057');

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        {success ? (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Upstox Connected!</h1>
            <p className="text-zinc-400 text-center mb-6">
              Your Upstox account{email ? ` (${email})` : ''} is now connected.
              Real-time market data is now live.
            </p>
            <div className="bg-zinc-950/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Token valid for:</span>
                <span className="font-mono">{expiresIn ? `${Math.floor(Number(expiresIn) / 3600)} hours` : '24 hours'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Worker status:</span>
                <span className={`font-mono ${worker === 'updated' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {worker === 'updated' ? '✓ Synced' : '⚠ Pending'}
                </span>
              </div>
              {userId && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Stored for user:</span>
                  <span className="font-mono text-zinc-300">{userId}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-600 text-center mt-4">
              Redirecting to dashboard in 5 seconds...
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
            >
              Go to Dashboard →
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Connection Failed</h1>
            <p className="text-zinc-400 text-center mb-4 text-sm break-words">
              {error === 'missing_code' && 'No authorization code received from Upstox.'}
              {error === 'no_user' && 'No user account found. Please log in first.'}
              {!['missing_code', 'no_user'].includes(error || '') && `Error: ${error}`}
            </p>

            {isInvalidAuthCode && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-xs text-yellow-300">
                <p className="font-semibold mb-1">⚠ Auth code expired / reused</p>
                <p className="text-yellow-200/80">
                  Upstox auth codes are <b>single-use</b> and expire in ~2 minutes.
                  This usually happens if you refreshed the page, pressed Back, or used the same URL twice.
                </p>
                {hint && <p className="mt-2 text-yellow-100/70">{hint}</p>}
              </div>
            )}

            <button
              onClick={() => router.push('/api/upstox/connect')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
            >
              Re-authorize (fresh login)
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 rounded-lg transition"
            >
              Back to Dashboard
            </button>

            <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-400">Troubleshooting:</p>
              <p>1. Open a <b>fresh tab</b> (not the same one)</p>
              <p>2. Visit <code className="text-zinc-300">/api/upstox/connect</code> directly</p>
              <p>3. Don't refresh, don't press Back</p>
              <p>4. Complete Upstox login + PIN within 2 minutes</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function UpstoxStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <UpstoxStatusContent />
    </Suspense>
  );
}
