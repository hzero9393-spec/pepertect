import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

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

    // Update user tier
    await db.user.update({
      where: { id: auth.userId },
      data: { tier: 'PREMIUM', virtualCapital: 1000000 },
    });

    // Update portfolio
    await db.portfolio.update({
      where: { userId: auth.userId },
      data: {
        totalBalance: 1000000,
        availableMargin: 1000000,
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
          amount: 900000,
          balance: 1000000,
          description: 'Premium upgrade - Capital boosted to ₹10L',
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
