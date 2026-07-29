import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import {
  getOrCreateGamification, updateStreak, checkAndAwardBadges, calculateLevel,
} from '@/app/api/learning/route';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const modules = await db.module.findMany({
      where: { learningPathId: id },
      orderBy: { order: 'asc' },
      include: {
        challenges: true,
        progress: { where: { userId: auth.userId } },
      },
    });

    const result = modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      videoUrl: m.videoUrl,
      duration: m.duration,
      xpReward: m.xpReward,
      order: m.order,
      challenge: m.challenges[0]
        ? {
            id: m.challenges[0].id,
            title: m.challenges[0].title,
            type: m.challenges[0].type,
            questions: m.challenges[0].questions ? JSON.parse(m.challenges[0].questions) : [],
            passingScore: m.challenges[0].passingScore,
            xpReward: m.challenges[0].xpReward,
            coinReward: m.challenges[0].coinReward,
          }
        : null,
      status: m.progress[0]?.status || 'NOT_STARTED',
      score: m.progress[0]?.score ?? null,
      videoProgress: m.progress[0]?.videoProgress ?? 0,
      videoTimestamp: m.progress[0]?.videoTimestamp ?? 0,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Fetch challenges error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch challenges' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const body = await req.json();
    const { moduleId, answers } = body;

    // Find the challenge for this module
    const module = await db.module.findUnique({
      where: { id: moduleId, learningPathId: id },
      include: { challenges: true },
    });

    if (!module || !module.challenges[0]) {
      return NextResponse.json({ success: false, error: 'Module or challenge not found' }, { status: 404 });
    }

    const challenge = module.challenges[0];
    const questions: Array<{ correct: number }> = challenge.questions
      ? JSON.parse(challenge.questions)
      : [];

    // Calculate score
    let correct = 0;
    const total = questions.length;
    if (answers && Array.isArray(answers)) {
      answers.forEach((ans: number, idx: number) => {
        if (idx < questions.length && ans === questions[idx].correct) correct++;
      });
    }
    const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = scorePct >= (challenge.passingScore || 70);
    const perfect = correct === total && total > 0;

    // XP & coins
    let xpEarned = 0;
    let coinsEarned = 0;
    if (passed) {
      xpEarned = challenge.xpReward || 15;
      coinsEarned = perfect ? (challenge.coinReward || 10) : 5;
    }

    // Update progress
    await db.userProgress.upsert({
      where: { userId_moduleId: { userId: auth.userId, moduleId } },
      update: {
        status: passed ? 'COMPLETED' : 'IN_PROGRESS',
        score: scorePct,
        completedAt: passed ? new Date() : undefined,
      },
      create: {
        userId: auth.userId,
        moduleId,
        status: passed ? 'COMPLETED' : 'IN_PROGRESS',
        score: scorePct,
        completedAt: passed ? new Date() : undefined,
      },
    });

    // Record quiz attempt
    await db.quizAttempt.create({
      data: {
        userId: auth.userId,
        challengeId: challenge.id,
        score: scorePct,
        correct,
        total,
        xpEarned,
        coinsEarned,
      },
    });

    // Update gamification
    if (passed) {
      const gam = await getOrCreateGamification(auth.userId);
      const { newStreak, newLongest, updatedLastActivity } = await updateStreak(auth.userId, gam);
      const newXP = gam.xp + xpEarned + module.xpReward;
      const newLevel = calculateLevel(newXP);
      const newCoins = gam.coins + coinsEarned;

      await db.userGamification.update({
        where: { userId: auth.userId },
        data: {
          xp: newXP,
          level: newLevel,
          coins: newCoins,
          streak: newStreak,
          longestStreak: newLongest,
          lastActivity: updatedLastActivity,
          lessonsCompleted: gam.lessonsCompleted + 1,
          quizzesPassed: gam.quizzesPassed + 1,
          perfectQuizzes: gam.perfectQuizzes + (perfect ? 1 : 0),
        },
      });

      // Check badges
      const updatedGam = { ...gam, xp: newXP, streak: newStreak, longestStreak: newLongest, perfectQuizzes: gam.perfectQuizzes + (perfect ? 1 : 0) };
      const { SEED_BADGES } = await import('@/app/api/learning/route');
      const newBadges = await checkAndAwardBadges(auth.userId, updatedGam, SEED_BADGES);
      // Award XP for badges
      for (const badgeName of newBadges) {
        const badge = SEED_BADGES.find(b => b.name === badgeName);
        if (badge?.xpReward) {
          await db.userGamification.update({
            where: { userId: auth.userId },
            data: { xp: { increment: badge.xpReward } },
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          correct, total, scorePct, passed, perfect,
          xpEarned: xpEarned + module.xpReward,
          coinsEarned,
          newLevel,
          newBadges,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { correct, total, scorePct, passed: false, perfect: false, xpEarned: 0, coinsEarned: 0 },
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit quiz' }, { status: 500 });
  }
}
