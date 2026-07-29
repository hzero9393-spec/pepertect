import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all'; // weekly, monthly, all
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    let dateFilter = {};
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { lastActivity: { gte: weekAgo } };
    } else if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      dateFilter = { lastActivity: { gte: monthAgo } };
    }

    // Top learners by XP
    const leaders = await db.userGamification.findMany({
      where: dateFilter,
      orderBy: { xp: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    const leaderboard = leaders.map((l, idx) => ({
      rank: idx + 1,
      userId: l.user.id,
      name: l.user.name || 'Anonymous Trader',
      avatar: l.user.avatar,
      xp: l.xp,
      level: l.level,
      streak: l.streak,
      lessonsCompleted: l.lessonsCompleted,
      isCurrentUser: l.userId === auth.userId,
    }));

    // Current user rank
    const userGam = await db.userGamification.findUnique({ where: { userId: auth.userId } });
    let userRank: number | null = null;
    if (userGam) {
      const rankQuery = await db.$queryRaw<Array<{ rank: bigint }>>`
        SELECT ROW_NUMBER() OVER (ORDER BY xp DESC)::bigint as rank
        FROM user_gamification
        WHERE "userId" = ${auth.userId}
      `;
      userRank = rankQuery[0]?.rank ? Number(rankQuery[0].rank) : null;
    }

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        userRank,
        userXP: userGam?.xp ?? 0,
        userLevel: userGam?.level ?? 1,
        totalLearners: await db.userGamification.count(),
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
