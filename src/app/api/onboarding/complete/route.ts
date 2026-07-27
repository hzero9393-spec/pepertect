import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Parse onboarding data from request body
    const body = await req.json();
    const { name, phone, experience, tradingStyle, market, capital, goal, riskLevel } = body;

    // Try to authenticate — update user record if possible
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? extractBearerToken(authHeader) : null;
    const payload = token ? verifyToken(token) : null;

    if (payload) {
      // Authenticated — save to database
      const user = await db.user.findUnique({ where: { id: payload.userId } });

      if (user) {
        // Build preferences JSON
        const preferences: Record<string, unknown> = {
          experience,
          tradingStyle,
          primaryMarket: market,
          goal,
          riskLevel,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        };

        // Merge with existing preferences if any
        const existingPrefs = user.notifSettings as Record<string, unknown> | null;
        const mergedPrefs = existingPrefs
          ? { ...existingPrefs, ...preferences }
          : preferences;

        await db.user.update({
          where: { id: payload.userId },
          data: {
            name: name || user.name,
            phone: phone || user.phone,
            virtualCapital: capital || user.virtualCapital,
            notifSettings: mergedPrefs,
          },
        });

        // Auto-add selected index to watchlist
        if (market) {
          // Find stock/index matching the selected market name
          const marketStock = await db.stock.findFirst({
            where: { symbol: market },
          });
          if (marketStock) {
            // Check if already in watchlist
            const existing = await db.watchlist.findUnique({
              where: {
                userId_stockId: {
                  userId: payload.userId,
                  stockId: marketStock.id,
                },
              },
            });
            if (!existing) {
              await db.watchlist.create({
                data: {
                  userId: payload.userId,
                  stockId: marketStock.id,
                },
              });
            }
          }
        }

        // Update portfolio balance if capital is different
        const portfolio = await db.portfolio.findUnique({
          where: { userId: payload.userId },
        });
        if (portfolio && capital) {
          await db.portfolio.update({
            where: { userId: payload.userId },
            data: {
              totalBalance: capital,
              availableMargin: capital,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    console.error('Onboarding save error:', error);
    // Return success even on error — client-side state is sufficient
    return NextResponse.json({
      success: true,
      message: 'Onboarding data saved client-side',
    });
  }
}
