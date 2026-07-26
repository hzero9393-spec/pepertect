import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { PREMIUM_VIRTUAL_CAPITAL } from '@/lib/tier';

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { paymentId, orderId } = body;

    // Mock payment verification - in production verify with Razorpay
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Update subscription
    await db.subscription.updateMany({
      where: { userId: auth.userId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });

    const subscription = await db.subscription.create({
      data: {
        userId: auth.userId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
        autoRenew: false,
      },
    });

    // Snapshot existing portfolio so we can compute the capital uplift
    const prevPortfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    const prevBalance = Number(prevPortfolio?.totalBalance ?? 0);
    const prevInvested = Number(prevPortfolio?.investedAmount ?? 0);
    // Realized P&L carried over: prevBalance + prevInvested = initial capital + realized P&L
    // New premium capital = ₹1,00,000. Preserve realized P&L by adding it on top.
    const realizedPnl = prevBalance + prevInvested - getPreviousCapital(prevPortfolio);
    const newCapital = PREMIUM_VIRTUAL_CAPITAL + realizedPnl;
    const uplift = newCapital - prevBalance;

    // Update user tier
    await db.user.update({
      where: { id: auth.userId },
      data: { tier: 'PREMIUM', virtualCapital: PREMIUM_VIRTUAL_CAPITAL },
    });

    // Update portfolio — boost balance to premium capital while preserving realized P&L
    await db.portfolio.update({
      where: { userId: auth.userId },
      data: {
        totalBalance: newCapital,
        availableMargin: { increment: uplift },
      },
    });

    // Create payment record
    await db.payment.create({
      data: {
        subscriptionId: subscription.id,
        razorpayPaymentId: paymentId || 'pay_mock_' + Date.now(),
        amount: 299,
        status: 'SUCCESS',
        orderId,
      },
    });

    // Create transaction
    const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    if (portfolio) {
      await db.transaction.create({
        data: {
          portfolioId: portfolio.id,
          type: 'CREDIT',
          amount: uplift,
          balance: Number(portfolio.totalBalance),
          description: 'Premium upgrade — Capital boosted to ₹1,00,000',
          reference: subscription.id,
        },
      });
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 500 });
  }
}

/**
 * Best-effort guess of the user's previous plan capital so we can preserve
 * realized P&L across the upgrade. Falls back to FREE_VIRTUAL_CAPITAL if
 * we can't determine it (e.g.very first upgrade before any trade).
 */
function getPreviousCapital(p: { totalBalance: { toString(): string } | bigint | number } | null): number {
  if (!p) return 10000;
  const bal = Number(p.totalBalance.toString());
  // Heuristic: if balance ≥ 50k assume they were already premium
  return bal >= 50000 ? 100000 : 10000;
}
