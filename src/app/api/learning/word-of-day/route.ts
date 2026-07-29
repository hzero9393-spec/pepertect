import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

const WORD_POOL = [
  { word: 'Alpha', meaning: 'Excess return of investment vs market benchmark. Agar Nifty 10% up hai aur tumhara portfolio 15% up hai, toh 5% alpha hai!', example: 'Warren Buffett ki alpha consistently positive rehti hai — market se better perform karta hai.', category: 'Performance' },
  { word: 'Beta', meaning: 'Stock ka volatility measure relative to market. Beta 1 = market jaisa, >1 = zyada volatile, <1 = kam volatile.', example: 'Reliance ka beta 1.2 hai matlab market 10% up → Reliance ~12% up expect hoga.', category: 'Risk' },
  { word: 'Delta', meaning: 'Option price sensitivity to underlying price change. Call option ka delta 0-1 hota hai.', example: 'Nifty CE ka delta 0.5 hai → Nifty ₹10 up → premium ₹5 up expect karo.', category: 'Greeks' },
  { word: 'Gamma', meaning: 'Rate of change of Delta. High gamma = Delta bahut fast change hota hai price ke saath.', example: 'ATM options ka gamma sabse zyada hota hai — expiry ke paas.', category: 'Greeks' },
  { word: 'Theta', meaning: 'Time decay — har din option ki value kitni kam hoti hai. Buyer ke liye negative, seller ke liye positive.', example: 'Thursday ko Friday expiry wala option khareedna — theta bahut high hoga!', category: 'Greeks' },
  { word: 'Vega', meaning: 'Option price sensitivity to volatility change. Volatility badhne pe option premium badhta hai.', example: 'Earnings se pehle option ka vega badh jata hai — volatility high hoti hai.', category: 'Greeks' },
  { word: 'Contango', meaning: 'Future price > spot price. Normal market condition jahan future mein premium hai.', example: 'Crude oil future ₹7500 hai aur spot ₹7300 — contango situation.', category: 'Derivatives' },
  { word: 'Backwardation', meaning: 'Future price < spot price. Demand immediate delivery mein zyada hai.', example: 'Gold spot ₹65000, future ₹63000 — backwardation. Scarcity ka signal.', category: 'Derivatives' },
  { word: 'Implied Volatility', meaning: 'Market ka expectation of future volatility. Options pricing se derived hota hai.', example: 'IV 40% = market expects 40% annualized movement. High IV = expensive options.', category: 'Volatility' },
  { word: 'Open Interest', meaning: 'Total outstanding derivative contracts. Badhne pe = new money, kam hone pe = money exit.', example: 'Nifty CE OI badh raha hai + price up → strong bullish view build ho raha hai.', category: 'Derivatives' },
  { word: 'Market Order', meaning: 'Immediate execution at best available price. Guaranteed fill, no price control.', example: 'Market order lagaya → ₹100.5 pe fill hua. Slippage possible.', category: 'Order Types' },
  { word: 'Limit Order', meaning: 'Execute at specified price or better. No guarantee of fill.', example: '₹100 limit buy → sirf ₹100 ya usse neeche pe fill hoga.', category: 'Order Types' },
  { word: 'Stop Loss', meaning: 'Pre-set price to auto-exit trade. Capital protection ka sabse important tool.', example: 'BUY at ₹100, SL ₹95. Agar price ₹95 pe aaye → auto sell.', category: 'Risk Management' },
  { word: 'Circuit Breaker', meaning: 'Market-wide trading halt when index moves 10/15/20%. Extreme panic control.', example: 'Nifty 10% fall → 15 min trading halt. 15% fall → 45 min halt.', category: 'Market Rules' },
  { word: 'IPO', meaning: 'Initial Public Offering — company pehli baar public ko shares bechti hai.', example: 'Zomato IPO 2021 mein aaya tha — massive demand, 38x subscription.', category: 'Market Events' },
  { word: 'Dividend', meaning: 'Company dwara shareholders ko profit distribution. Cash ya bonus shares form mein.', example: 'Reliance ne ₹8/share dividend diya — shareholder ke bank account mein directly.', category: 'Corporate Actions' },
  { word: 'Margin', meaning: 'Broker se li hui temporary credit for trading. Futures/options mein compulsory.', example: 'Nifty futures lot size 25, margin ~₹15,000. Ye blocked amount hai.', category: 'Trading' },
  { word: 'Lot Size', meaning: 'Minimum tradeable quantity in derivatives. Nifty=25, BankNifty=15, FinNifty=25.', example: '1 Nifty option = 25 units. Premium ₹100 → total ₹2,500 value.', category: 'Derivatives' },
  { word: 'Intrinsic Value', meaning: 'Real value of option if exercised today. Call: max(0, spot-strike).', example: 'Nifty 24500, CE 24400 → IV = ₹100. PE 24400 → IV = 0 (OTM).', category: 'Options' },
  { word: 'Time Value', meaning: 'Extra premium above intrinsic value due to time left to expiry.', example: 'Option premium ₹150, IV ₹100 → TV = ₹50. Expiry ke paas TV 0 hota hai.', category: 'Options' },
  { word: 'Support', meaning: 'Price level where buying pressure increases. Price generally bounces up from here.', example: 'RELIANCE ₹2800 pe 3 baar bounce kiya → strong support level hai.', category: 'Technical Analysis' },
  { word: 'Resistance', meaning: 'Price level where selling pressure increases. Price generally reverses down from here.', example: 'NIFTY 25000 pe 4 baar reject hua → strong resistance hai.', category: 'Technical Analysis' },
  { word: 'Breakout', meaning: 'Price crossing a significant support/resistance level with high volume. New trend start.', example: 'Nifty 25000 resistance todh diya with high volume → bullish breakout!', category: 'Technical Analysis' },
  { word: 'Short Selling', meaning: 'Pehle sell karo (borrowed shares), baad mein buy karo (return). Profit when price falls.', example: '₹100 pe short sell → price ₹90 pe buy → ₹10 profit per share.', category: 'Trading' },
  { word: 'SIP', meaning: 'Systematic Investment Plan — fixed amount har month invest karo. Disciplined investing.', example: '₹5000/month SIP in Nifty 50 ETF — 10 years mein compound magic.', category: 'Investing' },
  { word: 'ETF', meaning: 'Exchange Traded Fund — basket of stocks traded like a single share on exchange.', example: 'NiftyBeES = Nifty 50 ETF. Ek trade mein 50 stocks ka exposure.', category: 'Investing' },
  { word: 'P/E Ratio', meaning: 'Price to Earnings. Kitne mein ₹1 earning khareed rahe ho. Lower = cheaper valuation.', example: 'Share ₹100, EPS ₹10 → P/E 10. Industry average 15 se kam = undervalued?', category: 'Fundamental' },
  { word: 'Volume', meaning: 'Total shares/contracts traded in a period. High volume = strong conviction move.', example: 'Breakout with 3x average volume = very strong. Fake breakout = low volume.', category: 'Market Data' },
  { word: 'Bid-Ask Spread', meaning: 'Difference between buy (bid) and sell (ask) price. Smaller = more liquid stock.', example: 'Bid ₹99.5, Ask ₹100 → spread ₹0.5. Liquid stock = tight spread.', category: 'Trading' },
];

function getWordForDate(dateStr: string) {
  const hash = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return WORD_POOL[hash % WORD_POOL.length];
}

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const today = new Date().toISOString().split('T')[0];
    const word = getWordForDate(today);

    return NextResponse.json({
      success: true,
      data: {
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        category: word.category,
        date: today,
      },
    });
  } catch (error) {
    console.error('Word of day error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch word of day' }, { status: 500 });
  }
}
