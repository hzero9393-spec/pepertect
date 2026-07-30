import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { getOrCreateGamification, updateStreak, calculateLevel } from '@/app/api/learning/route';

// Seeded question pool for daily challenges (deterministic per date)
const QUESTION_POOL = [
  // Market Basics
  [
    { q: 'Nifty 50 mein kitne companies hain?', opts: ['30', '50', '100', '200'], a: 1, e: 'Nifty 50 = India ke top 50 companies by market cap.' },
    { q: 'Bull market ka matlab kya hai?', opts: ['Market falling', 'Market rising', 'Market stable', 'Market closed'], a: 1, e: 'Bull market = prices going up, investor confidence high.' },
    { q: 'Bear market ka matlab?', opts: ['Market rising 20%+', 'Market falling 20%+', 'Sideways market', 'Volatile market'], a: 1, e: 'Bear market = market falls 20%+ from peak — pessimism high.' },
    { q: 'Market cap kya hai?', opts: ['Company ka profit', 'Share price × Total shares', 'Company ka revenue', 'Dividend amount'], a: 1, e: 'Market Cap = Current share price × total outstanding shares.' },
    { q: 'Blue chip stocks kya hain?', opts: ['Penny stocks', 'Large, established, stable companies', 'New IPO stocks', 'Bankrupt companies'], a: 1, e: 'Blue chip = large cap, stable, dividend-paying companies like Reliance, TCS.' },
  ],
  // Technical
  [
    { q: 'RSI ka full form?', opts: ['Relative Strength Index', 'Real Stock Indicator', 'Random Signal Index', 'Rate of Stock Index'], a: 0, e: 'RSI = Relative Strength Index. Momentum oscillator 0-100 range.' },
    { q: 'MACD mein signal line kya hai?', opts: ['Price line', '9-period EMA of MACD line', 'Volume line', 'Trend line'], a: 1, e: 'MACD signal line = 9-period EMA of MACD line. Crossovers = buy/sell signals.' },
    { q: 'Candlestick mein green body matlab?', opts: ['Price fell', 'Closing > Opening (bullish)', 'No change', 'Opening > Closing'], a: 1, e: 'Green/white candle = close > open = bullish. Red/black = close < open = bearish.' },
    { q: 'Support level kya hai?', opts: ['Price ceiling', 'Price floor where buying interest increases', 'Random level', 'Average price'], a: 1, e: 'Support = price level where demand is strong enough to prevent further decline.' },
    { q: 'Volume ka badhna price ke saath confirm karta hai?', opts: ['Never', 'Yes — high volume = strong move', 'No relation', 'Only for intraday'], a: 1, e: 'Price + Volume = confirmed move. High volume breakout = more reliable.' },
  ],
  // Options
  [
    { q: 'Call option buyer ka max loss?', opts: ['Unlimited', 'Premium paid', 'Strike price', 'Lot size'], a: 1, e: 'Call buyer max loss = premium paid. Max profit = unlimited (theoretically).' },
    { q: 'Put option buyer bullish hai ya bearish?', opts: ['Bullish', 'Bearish — expects price to fall', 'Neutral', 'Random'], a: 1, e: 'Put buyer = bearish view. Profits when underlying price falls below strike.' },
    { q: 'ATM option kya hai?', opts: ['Above market', 'Strike = Current market price', 'Below market', 'Expired option'], a: 1, e: 'ATM = At The Money. Strike price ≈ current market price of underlying.' },
    { q: 'Theta kya represent karta hai?', opts: ['Price sensitivity', 'Time decay', 'Volatility sensitivity', 'Interest rate impact'], a: 1, e: 'Theta = time decay. Options lose value as expiry approaches.' },
    { q: 'Lot size kya hai?', opts: ['Number of options', 'Minimum tradeable quantity', 'Commission rate', 'Account balance'], a: 1, e: 'Lot size = minimum number of shares per contract (e.g., Nifty = 65, BankNifty = 30, FinNifty = 60).' },
  ],
  // Risk Management
  [
    { q: '1:2 Risk-Reward ratio ka matlab?', opts: ['Risk 2x reward', 'Risk 1, Reward 2 — for every ₹1 risk, expect ₹2 profit', '50% win rate', 'No risk'], a: 1, e: '1:2 RR = for ₹100 risk, target ₹200 profit. Positive expectancy with 40%+ win rate.' },
    { q: 'Position sizing kyun important hai?', opts: ['Not important', 'Same % per trade = consistent risk, no single trade wipes account', 'Only for big accounts', 'Only for options'], a: 1, e: 'Position sizing = risk same per trade. 1-2% of capital per trade is standard.' },
    { q: 'Stop loss kitna tight rakhna chahiye?', opts: ['As tight as possible', 'Based on technical levels, not arbitrary', '10% always', 'No SL'], a: 1, e: 'SL should be at logical technical level (support/resistance), not a random %.' },
    { q: 'Portfolio diversification ka main benefit?', opts: ['Higher returns guarantee', 'Risk spread across assets — one bad trade doesn\'t destroy portfolio', 'More trades', 'Lower brokerage'], a: 1, e: 'Diversification = spread risk. Different assets move differently = smoother equity curve.' },
    { q: 'Overtrading se kya hota hai?', opts: ['More profit', 'Higher costs, emotional fatigue, worse decisions', 'Better learning', 'No effect'], a: 1, e: 'Overtrading = too many trades = high brokerage + emotional decisions = worse P&L.' },
  ],
  // Market Knowledge
  [
    { q: 'SEBI ka full form?', opts: ['Securities and Exchange Board of India', 'Stock Exchange Board of India', 'Securities Exchange Bureau of India', 'Stock Exchange Bureau of India'], a: 0, e: 'SEBI = Securities and Exchange Board of India. Regulator for Indian securities market.' },
    { q: 'IPO ka full form?', opts: ['Initial Public Offering', 'Internal Profit Offering', 'Indian Public Order', 'Investment Portfolio Option'], a: 0, e: 'IPO = Initial Public Offering. First time a company sells shares to public.' },
    { q: 'Circuit breaker kya hai?', opts: ['Electric device', 'Trading halt when index moves too much', 'Price limit on stocks', 'Broker tool'], a: 1, e: 'Circuit breaker = market-wide trading halt if index moves 10/15/20% in a day.' },
    { q: 'Demat account kya hai?', opts: ['Bank account', 'Account to hold shares electronically', 'Trading account', 'Loan account'], a: 1, e: 'Demat = Dematerialized. Holds shares in electronic form.' },
    { q: 'T+1 settlement ka matlab?', opts: ['Trade + 1 day settlement', 'Same day settlement', '1 week settlement', '1 month settlement'], a: 0, e: 'T+1 = Trade day + 1 business day. Shares/money settle in 1 day after trade.' },
  ],
];

function getQuestionsForDate(dateStr: string) {
  // Deterministic: use date hash to pick question sets
  const hash = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const set1Idx = hash % QUESTION_POOL.length;
  const set2Idx = (hash * 7 + 3) % QUESTION_POOL.length;
  const set3Idx = (hash * 13 + 7) % QUESTION_POOL.length;
  
  return [
    QUESTION_POOL[set1Idx][(hash) % 5],
    QUESTION_POOL[set1Idx][(hash + 1) % 5],
    QUESTION_POOL[set2Idx][(hash + 2) % 5],
    QUESTION_POOL[set2Idx][(hash + 3) % 5],
    QUESTION_POOL[set3Idx][(hash + 4) % 5],
  ].filter(Boolean).slice(0, 5);
}

const TOPICS = ['Market Basics', 'Technical Analysis', 'Options Trading', 'Risk Management', 'Market Knowledge', 'Indian Market Rules', 'Candlestick Patterns', 'Indicators'];

function getTopicForDate(dateStr: string) {
  const hash = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TOPICS[hash % TOPICS.length];
}

// GET — today's daily challenge
export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if already attempted
    const existing = await db.dailyChallenge.findUnique({ where: { date: today } });
    let challengeId = existing?.id;

    if (!existing) {
      const questions = getQuestionsForDate(today);
      const topic = getTopicForDate(today);
      const created = await db.dailyChallenge.create({
        data: {
          date: today,
          questions: JSON.stringify(questions.map(q => ({
            type: 'single_choice',
            question: q.q,
            options: q.opts,
            correct: q.a,
            explanation: q.e,
          }))),
          topic,
        },
      });
      challengeId = created.id;
    }

    // Check if user already attempted
    if (challengeId) {
      const attempt = await db.dailyChallengeAttempt.findUnique({
        where: { userId_challengeId: { userId: auth.userId, challengeId } },
      });
      if (attempt) {
        return NextResponse.json({
          success: true,
          data: {
            alreadyAttempted: true,
            score: attempt.score,
            correct: attempt.correct,
            total: attempt.total,
            xpEarned: attempt.xpEarned,
            coinsEarned: attempt.coinsEarned,
          },
        });
      }
    }

    // Return the challenge questions
    const challenge = await db.dailyChallenge.findUnique({ where: { date: today } });
    return NextResponse.json({
      success: true,
      data: {
        alreadyAttempted: false,
        topic: challenge?.topic,
        questions: challenge?.questions ? JSON.parse(challenge.questions) : [],
      },
    });
  } catch (error) {
    console.error('Daily challenge fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch daily challenge' }, { status: 500 });
  }
}

// POST — submit daily challenge
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const today = new Date().toISOString().split('T')[0];
    const body = await req.json();
    const { answers, timeTaken } = body;

    const challenge = await db.dailyChallenge.findUnique({ where: { date: today } });
    if (!challenge) {
      return NextResponse.json({ success: false, error: 'No challenge today' }, { status: 404 });
    }

    // Check if already attempted
    const existingAttempt = await db.dailyChallengeAttempt.findUnique({
      where: { userId_challengeId: { userId: auth.userId, challengeId: challenge.id } },
    });
    if (existingAttempt) {
      return NextResponse.json({ success: false, error: 'Already attempted today. Come back tomorrow!' }, { status: 400 });
    }

    const questions: Array<{ correct: number }> = challenge.questions ? JSON.parse(challenge.questions) : [];
    let correct = 0;
    const total = questions.length;
    if (answers && Array.isArray(answers)) {
      answers.forEach((ans: number, idx: number) => {
        if (idx < questions.length && ans === questions[idx].correct) correct++;
      });
    }
    const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const perfect = correct === total;

    // XP & coins
    const xpEarned = scorePct >= 60 ? 50 + correct * 10 : 0;
    const coinsEarned = perfect ? 100 : (scorePct >= 60 ? 50 : 0);

    // Record attempt
    await db.dailyChallengeAttempt.create({
      data: {
        userId: auth.userId,
        challengeId: challenge.id,
        score: scorePct,
        correct,
        total,
        xpEarned,
        coinsEarned,
        timeTaken: timeTaken ?? null,
      },
    });

    // Update gamification
    if (xpEarned > 0) {
      const gam = await db.userGamification.upsert({
        where: { userId: auth.userId },
        update: { xp: { increment: xpEarned }, coins: { increment: coinsEarned } },
        create: { userId: auth.userId, xp: xpEarned, coins: coinsEarned },
      });
      const newLevel = calculateLevel(gam.xp + xpEarned);
      if (newLevel > calculateLevel(gam.xp)) {
        await db.userGamification.update({ where: { userId: auth.userId }, data: { level: newLevel } });
      }
    }

    return NextResponse.json({
      success: true,
      data: { correct, total, scorePct, perfect, xpEarned, coinsEarned },
    });
  } catch (error) {
    console.error('Daily challenge submit error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit daily challenge' }, { status: 500 });
  }
}
