import { NextResponse } from 'next/server';
import { UPSTOX_WORKER_URL } from '@/lib/upstox';
import { prisma } from '@/lib/db';
import { ADMIN_USER_ID } from '@/lib/upstox';

/**
 * POST /api/upstox/worker-reconnect
 * 
 * Server-side endpoint to trigger WebSocket reconnection on Cloudflare Worker.
 * 
 * This is called by the frontend when:
 * - WebSocket disconnects and auto-reconnect fails
 * - Token needs to be refreshed on worker
 * - Admin triggers manual reconnect
 * 
 * Flow:
 * 1. Get latest access token from DB or env
 * 2. Push new token to Worker via /refresh-token
 * 3. Worker will auto-reconnect to Upstox with new token
 */
export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

  try {
    const workerUrl = UPSTOX_WORKER_URL || 'https://upstox-realtime.hzero9393.workers.dev';
    
    // Step 1: Get access token (from DB first, then env fallback)
    let accessToken: string | null = null;
    
    // Try DB first
    if (ADMIN_USER_ID) {
      try {
        const tokenRow = await prisma.upstoxToken.findUnique({
          where: { userId: ADMIN_USER_ID },
        });
        if (tokenRow?.accessToken && tokenRow.isActive) {
          // Check if token is expired
          const expiresAt = new Date(tokenRow.expiresAt).getTime();
          if (expiresAt > Date.now()) {
            accessToken = tokenRow.accessToken;
            log(`Got token from DB, expires: ${tokenRow.expiresAt}`);
          } else {
            log('DB token expired');
          }
        }
      } catch (e: any) {
        log(`DB lookup failed: ${e.message}`);
      }
    }

    // Fallback to env var
    if (!accessToken) {
      accessToken = process.env.UPSTOX_ACCESS_TOKEN || null;
      if (accessToken) {
        log('Using env var token as fallback');
      }
    }

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token available',
        action: 'oauth_required',
        logs,
      }, { status: 400 });
    }

    // Step 2: Check current worker status
    let workerStats: any = null;
    try {
      const statsRes = await fetch(`${workerUrl}/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (statsRes.ok) {
        workerStats = await statsRes.json();
        log(`Worker status: upstoxReady=${workerStats.upstoxReady}, clients=${workerStats.clientCount}`);
        
        // If already connected, no need to reconnect
        if (workerStats.upstoxReady) {
          return NextResponse.json({
            success: true,
            message: 'WebSocket already connected',
            action: 'none',
            data: workerStats,
            logs,
          });
        }
      }
    } catch (e: any) {
      log(`Worker stats check failed: ${e.message}`);
    }

    // Step 3: Push token to worker (this triggers reconnection)
    log('Pushing token to worker...');
    let pushSuccess = false;
    try {
      const pushRes = await fetch(`${workerUrl}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
        signal: AbortSignal.timeout(10000),
      });
      
      pushSuccess = pushRes.ok;
      log(`Token push result: ${pushSuccess ? 'success' : `failed (${pushRes.status})`}`);
      
      if (!pushRes.ok) {
        const errText = await pushRes.text();
        log(`Push error response: ${errText.substring(0, 200)}`);
      }
    } catch (e: any) {
      log(`Token push failed: ${e.message}`);
    }

    // Step 4: Wait for worker to connect (2-3 seconds)
    log('Waiting for worker to establish connection...');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Step 5: Verify connection
    let finalStatus = false;
    try {
      const verifyRes = await fetch(`${workerUrl}/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        finalStatus = verifyData.upstoxReady === true;
        log(`Final verification: upstoxReady=${finalStatus}`);
        
        return NextResponse.json({
          success: finalStatus || pushSuccess,
          message: finalStatus 
            ? '✅ WebSocket reconnected successfully!'
            : pushSuccess 
              ? 'Token pushed, connecting...'
              : '❌ Reconnection failed',
          action: finalStatus ? 'reconnected' : pushSuccess ? 'pending' : 'failed',
          data: {
            ...verifyData,
            tokenPushed: pushSuccess,
          },
          logs,
        });
      }
    } catch (e: any) {
      log(`Verification failed: ${e.message}`);
    }

    return NextResponse.json({
      success: pushSuccess,
      message: pushSuccess ? 'Token pushed, please check status' : 'Failed to reconnect',
      action: pushSuccess ? 'pushed' : 'failed',
      data: { tokenPushed: pushSuccess },
      logs,
    });

  } catch (error: any) {
    log(`Exception: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      logs,
    }, { status: 500 });
  }
}

/**
 * GET /api/upstox/worker-reconnect
 * Returns current worker status (for checking without triggering reconnect)
 */
export async function GET() {
  try {
    const workerUrl = UPSTOX_WORKER_URL || 'https://upstox-realtime.hzero9393.workers.dev';
    
    const [healthRes, statsRes] = await Promise.allSettled([
      fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${workerUrl}/stats`, { signal: AbortSignal.timeout(5000) }),
    ]);

    let healthData: any = null;
    let statsData: any = null;

    if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
      healthData = await healthRes.value.json();
    }
    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
      statsData = await statsRes.value.json();
    }

    return NextResponse.json({
      success: true,
      data: {
        workerReachable: healthData?.ok === true,
        upstoxReady: statsData?.upstoxReady === true,
        upstoxConnecting: statsData?.upstoxConnecting === true,
        clientCount: statsData?.clientCount || 0,
        subscribedCount: statsData?.subscribedCount || 0,
        hasToken: statsData?.hasToken === true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message,
      data: {
        workerReachable: false,
        upstoxReady: false,
      },
    });
  }
}
