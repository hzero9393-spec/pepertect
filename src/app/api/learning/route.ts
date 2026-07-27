import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

const MOCK_LEARNING_PATHS = [
  {
    id: 'lp-1', title: 'Stock Market Basics', description: 'Learn the fundamentals of stock markets, exchanges, and how trading works.', level: 'BEGINNER', order: 1, isPremium: false,
    modules: [
      { id: 'm-1', title: 'What is the Stock Market?', description: 'Understanding exchanges, indices, and market participants', content: '## What is the Stock Market?\n\nA stock market is a platform where buyers and sellers trade shares of publicly listed companies...', order: 1, duration: 15 },
      { id: 'm-2', title: 'Understanding NSE & BSE', description: 'India\'s primary stock exchanges', content: '## NSE & BSE\n\nThe National Stock Exchange (NSE) and Bombay Stock Exchange (BSE) are India\'s two major stock exchanges...', order: 2, duration: 20 },
      { id: 'm-3', title: 'How to Read Stock Charts', description: 'Candlestick patterns and basic chart reading', content: '## Reading Stock Charts\n\nCandlestick charts show four key data points: Open, High, Low, Close...', order: 3, duration: 25 },
    ],
  },
  {
    id: 'lp-2', title: 'Technical Analysis', description: 'Master chart patterns, indicators, and technical trading strategies.', level: 'INTERMEDIATE', order: 2, isPremium: true,
    modules: [
      { id: 'm-4', title: 'Moving Averages', description: 'SMA, EMA and their trading signals', content: '## Moving Averages\n\nMoving averages smooth out price data to create a single flowing line...', order: 1, duration: 20 },
      { id: 'm-5', title: 'RSI & MACD', description: 'Momentum indicators for trading', content: '## RSI & MACD\n\nThe Relative Strength Index (RSI) measures the speed and magnitude of price changes...', order: 2, duration: 25 },
    ],
  },
  {
    id: 'lp-3', title: 'Options Trading', description: 'Deep dive into options theory, Greeks, and strategies.', level: 'ADVANCED', order: 3, isPremium: true,
    modules: [
      { id: 'm-6', title: 'Options Fundamentals', description: 'Calls, puts, and premium pricing', content: '## Options Fundamentals\n\nAn option is a derivative contract giving the buyer the right, but not the obligation...', order: 1, duration: 30 },
      { id: 'm-7', title: 'Understanding Greeks', description: 'Delta, Gamma, Theta, Vega and their impact', content: '## The Greeks\n\nGreeks are measures of sensitivity of option prices to various factors...', order: 2, duration: 35 },
    ],
  },
];

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const paths = await db.learningPath.findMany({
      include: { modules: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });

    if (paths.length === 0) {
      // Seed mock data
      for (const path of MOCK_LEARNING_PATHS) {
        await db.learningPath.create({
          data: {
            title: path.title,
            description: path.description,
            level: path.level,
            order: path.order,
            isPremium: path.isPremium,
            modules: {
              create: path.modules.map((m) => ({
                title: m.title,
                description: m.description,
                content: m.content,
                order: m.order,
                duration: m.duration,
              })),
            },
          },
        });
      }
      const seeded = await db.learningPath.findMany({
        include: { modules: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      });
      return NextResponse.json({ success: true, data: seeded });
    }

    return NextResponse.json({ success: true, data: paths });
  } catch (error) {
    console.error('Fetch learning paths error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch learning paths' }, { status: 500 });
  }
}
