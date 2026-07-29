import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { getOrCreateGamification, calculateLevel } from '@/app/api/learning/route';

// GET — gamification stats
export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const gam = await getOrCreateGamification(auth.userId);
    const level = calculateLevel(gam.xp);

    // XP needed for next level
    const THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000];
    const currentThreshold = THRESHOLDS[Math.min(level - 1, THRESHOLDS.length - 1)] ?? 0;
    const nextThreshold = THRESHOLDS[Math.min(level, THRESHOLDS.length - 1)] ?? THRESHOLDS[THRESHOLDS.length - 1] + 5000;
    const xpInLevel = gam.xp - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;
    const xpProgress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;

    // Earned badges
    const userBadges = await db.userBadge.findMany({
      where: { userId: auth.userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });

    // Leaderboard rank
    const rankResult = await db.$queryRaw<Array<{ rank: bigint }>>`
      SELECT ROW_NUMBER() OVER (ORDER BY xp DESC)::bigint as rank
      FROM user_gamification
      WHERE "userId" = ${auth.userId}
    `;
    const rank = rankResult[0]?.rank ? Number(rankResult[0].rank) : null;

    return NextResponse.json({
      success: true,
      data: {
        xp: gam.xp,
        level,
        coins: gam.coins,
        streak: gam.streak,
        longestStreak: gam.longestStreak,
        streakFreeze: gam.streakFreeze,
        lessonsCompleted: gam.lessonsCompleted,
        quizzesPassed: gam.quizzesPassed,
        perfectQuizzes: gam.perfectQuizzes,
        xpProgress,
        xpInLevel,
        xpNeeded,
        totalBadges: userBadges.length,
        rank,
        lastActivity: gam.lastActivity,
        badges: userBadges.map(ub => ({
          id: ub.badge.id,
          name: ub.badge.name,
          description: ub.badge.description,
          icon: ub.badge.icon,
          category: ub.badge.category,
          earnedAt: ub.earnedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Gamification fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch gamification' }, { status: 500 });
  }
}

// POST — use streak freeze
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { action } = body;

    if (action !== 'use_freeze') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const gam = await getOrCreateGamification(auth.userId);

    if (gam.streakFreeze <= 0) {
      return NextResponse.json({ success: false, error: 'No streak freezes available. Earn more by completing daily challenges!' }, { status: 400 });
    }

    if (gam.coins < 50) {
      return NextResponse.json({ success: false, error: 'Not enough coins. Need 50 coins for streak freeze.' }, { status: 400 });
    }

    const updated = await db.userGamification.update({
      where: { userId: auth.userId },
      data: {
        streakFreeze: gam.streakFreeze - 1,
        coins: gam.coins - 50,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        streakFreeze: updated.streakFreeze,
        coins: updated.coins,
        streak: updated.streak,
        message: 'Streak freeze activated! Your streak is protected for 1 day.',
      },
    });
  } catch (error) {
    console.error('Streak freeze error:', error);
    return NextResponse.json({ success: false, error: 'Failed to use streak freeze' }, { status: 500 });
  }
}
