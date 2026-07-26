import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

/**
 * GET /api/transactions
 * Returns the user's wallet ledger — every credit (deposit, sell, exit)
 * and debit (buy) with the running balance after each entry.
 *
 * Optional query params:
 *   ?type=CREDIT|DEBIT   — filter by transaction type
 *   ?limit=50            — max items (default 100, capped at 200)
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const typeFilter = url.searchParams.get('type'); // 'CREDIT' | 'DEBIT' | null
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);

    // Make sure the user has a portfolio; create one if missing so the ledger
    // is never empty for a fresh user.
    let portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    if (!portfolio) {
      // Defer to /api/portfolio to create with the correct tier-based capital.
      // Returning an empty list is safe — the next portfolio fetch will seed it.
      return NextResponse.json({ success: true, data: [] });
    }

    const where: { portfolioId: string; type?: string } = { portfolioId: portfolio.id };
    if (typeFilter === 'CREDIT' || typeFilter === 'DEBIT') {
      where.type = typeFilter;
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const mapped = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balance: Number(t.balance),
      description: t.description ?? '',
      reference: t.reference ?? null,
      createdAt: t.createdAt,
    }));

    // Summary totals (over the FULL history, not just the page returned)
    const allTxns = await db.transaction.findMany({ where: { portfolioId: portfolio.id } });
    const totalCredit = allTxns
      .filter((t) => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalDebit = allTxns
      .filter((t) => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return NextResponse.json({
      success: true,
      data: mapped,
      summary: {
        totalCredit: parseFloat(totalCredit.toFixed(2)),
        totalDebit: parseFloat(totalDebit.toFixed(2)),
        net: parseFloat((totalCredit - totalDebit).toFixed(2)),
        currentBalance: Number(portfolio.totalBalance),
      },
    });
  } catch (error) {
    console.error('Fetch transactions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
