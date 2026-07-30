import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

// ── Quiz question helper ──────────────────────────────────────────
function q(question: string, options: string[], correct: number, explanation: string) {
  return { type: 'single_choice' as const, question, options, correct, explanation };
}

// ── 10 Beginner Learning Paths with modules, videos, quizzes ──────
const SEED_PATHS = [
  // ─── 1. Stock Market Basics ────────────────────────────────────
  {
    title: 'Stock Market Basics',
    description: 'Share market ke basic concepts seekho — NSE, BSE, indices, aur trading ka foundation. Perfect for absolute beginners!',
    level: 'BEGINNER',
    category: 'Stock Market Basics',
    icon: '📊',
    order: 1,
    isPremium: false,
    modules: [
      {
        title: 'What is NSE/BSE?',
        description: 'India ke do major stock exchanges — NSE aur BSE kya hai aur kaise kaam karte hain?',
        videoUrl: 'https://www.youtube.com/embed/WtvGJ8DkpG8',
        duration: 12,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'NSE/BSE Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('NSE ka full form kya hai?', ['National Stock Exchange', 'New Stock Exchange', 'National Shares Exchange', 'New Shares Exchange'], 0, 'NSE stands for National Stock Exchange, jo 1992 mein establish hua tha.'),
            q('BSE kab establish hua tha?', ['1992', '1875', '2000', '1985'], 1, 'BSE (Bombay Stock Exchange) Asia ka sabse purana stock exchange hai — 1875 mein shuru hua.'),
            q('Sensex ka full form kya hai?', ['Sensitive Index', 'Stock Exchange Sensitive Index', 'Sensex Index', 'Share Sensitive Index'], 0, 'Sensex = Sensitive Index, jo BSE ke 30 top companies ko track karta hai.'),
            q('India mein sabse zyada trading volume kis exchange pe hota hai?', ['BSE', 'NSE', 'MCX', 'NCDEX'], 1, 'NSE India mein sabse zyada trading volume handle karta hai, especially equity segment mein.'),
          ]),
        },
      },
      {
        title: 'Indices & Sectors',
        description: 'Nifty 50, Sensex, aur different sectoral indices kya hote hain? Samjho market ka pulse.',
        videoUrl: 'https://www.youtube.com/embed/GaQ5zN9rTBI',
        duration: 15,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'Indices & Sectors Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Nifty 50 mein kitne companies hote hain?', ['30', '50', '100', '500'], 1, 'Nifty 50 mein exactly 50 companies hoti hain jo NSE ki top listed companies hain.'),
            q('NIFTY BANK kaunsa index track karta hai?', ['Top 50 banks', 'Top 12 banking stocks', 'All banks in India', 'RBI rates'], 1, 'NIFTY BANK 12 banking stocks ko track karta hai — SBI, HDFC Bank, ICICI Bank, etc.'),
            q('Sectoral index ka matlab kya hai?', ['Only IT companies', 'Particular sector ke stocks', 'All company types', 'Government companies only'], 1, 'Sectoral index ek specific sector ke stocks ko track karta hai — jaise NIFTY IT, NIFTY PHARMA.'),
          ]),
        },
      },
      {
        title: 'Market Hours & Sessions',
        description: 'Indian stock market kab khulta hai aur band hota hai? Pre-market, regular, aur post-market sessions samjho.',
        videoUrl: 'https://www.youtube.com/embed/wMn-v7IYXP0',
        duration: 10,
        xpReward: 10,
        order: 3,
        challenge: {
          title: 'Market Hours Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 10,
          coinReward: 10,
          questions: JSON.stringify([
            q('Indian stock market regular session kab se kab tak hota hai?', ['9:00 AM - 3:30 PM', '9:15 AM - 3:30 PM', '10:00 AM - 4:00 PM', '9:30 AM - 3:00 PM'], 1, 'Regular trading session 9:15 AM se 3:30 PM tak hota hai, Monday to Friday.'),
            q('Pre-open session kab hota hai?', ['9:00 AM - 9:15 AM', '8:00 AM - 9:00 AM', '9:15 AM - 9:30 AM', '9:00 AM - 9:30 AM'], 0, 'Pre-open session 9:00-9:08 (order collection), 9:08-9:12 (order matching), 9:12-9:15 (buffer).'),
            q('Muhurat Trading kab hota hai?', ['Every Monday', 'Diwali day', 'New Year', 'Holi'], 1, 'Muhurat Trading Diwali ke din hota hai — ek special 1-hour trading session for auspicious beginning.'),
          ]),
        },
      },
      {
        title: 'Order Types',
        description: 'Market order, Limit order, Stop Loss order — sab types samjho aur kab kiska use karna hai.',
        videoUrl: 'https://www.youtube.com/embed/NF1pXOcTW50',
        duration: 15,
        xpReward: 15,
        order: 4,
        challenge: {
          title: 'Order Types Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Market order mein kya hota hai?', ['Fixed price pe execute', 'Current market price pe execute', 'Next day execute', 'Auction mein execute'], 1, 'Market order current available price pe immediately execute ho jata hai.'),
            q('Limit order ka advantage kya hai?', ['Instant execution', 'Price control — aapka desired price', 'No brokerage', 'Guaranteed execution'], 1, 'Limit order mein aap apni desired price set karte ho — order tabhi execute hoga jab price us level pe aayega.'),
            q('Stop Loss order kya hai?', ['Profit book karne ke liye', 'Loss limit karne ke liye', 'Both A and B', 'None of the above'], 2, 'Stop Loss order loss limit karne ke liye use hota hai, lekin trailing SL se profit bhi protect hota hai.'),
          ]),
        },
      },
      {
        title: 'Trading Account Setup',
        description: 'Demat account aur Trading account kaise banaye? Zerodha, Upstox, Groww — best brokers ka comparison.',
        videoUrl: 'https://www.youtube.com/embed/5P8sCxMq6QY',
        duration: 18,
        xpReward: 15,
        order: 5,
        challenge: {
          title: 'Trading Account Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Demat account mein kya store hota hai?', ['Cash', 'Shares/securities in electronic form', 'Gold', 'Fixed deposits'], 1, 'Demat account mein aapke shares aur securities electronic form mein store hote hain — jaise bank account mein cash.'),
            q('Trading account aur Demat account mein kya difference hai?', ['Dono same hain', 'Trading = buy/sell, Demat = storage', 'Trading = storage, Demat = buy/sell', 'No difference'], 1, 'Trading account se aap order place karte ho, Demat account mein shares store hote hain.'),
            q('DP kya hai?', ['Deposit Person', 'Depository Participant', 'Data Provider', 'Daily Profit'], 1, 'DP = Depository Participant — jo aapke Demat account maintain karta hai, jaise Zerodha, HDFC Sec, etc.'),
          ]),
        },
      },
      {
        title: 'Brokerage & Charges',
        description: 'Brokerage, STT, transaction charges, GST — trading ke sab charges samjho. Pata karo kitna charges lagta hai.',
        videoUrl: 'https://www.youtube.com/embed/rQazXhJjKPg',
        duration: 14,
        xpReward: 15,
        order: 6,
        challenge: {
          title: 'Brokerage Charges Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('STT ka full form kya hai?', ['Stock Transaction Tax', 'Securities Transaction Tax', 'Share Trading Tax', 'Securities Transfer Tax'], 1, 'STT = Securities Transaction Tax, jo har buy/sell transaction pe lagta hai.'),
            q('Delivery trades pe STT kitna lagta hai?', ['0.025%', '0.1%', '0.0125%', '0.05%'], 1, 'Equity delivery pe STT 0.1% hai (both buy + sell side), jo sabse bada charge hai.'),
            q('Intraday trading pe STT kitna lagta hai?', ['0.1%', '0.025%', '0.05%', '0.0125%'], 1, 'Intraday pe STT sirf sell side pe 0.025% lagta hai — delivery se bahut kam.'),
          ]),
        },
      },
    ],
  },
  // ─── 2. Chart Reading Fundamentals ─────────────────────────────
  {
    title: 'Chart Reading Fundamentals',
    description: 'Charts padhna seekho — candlesticks, OHLC, volume analysis. Ye sab basic hain jo har trader ko aana chahiye!',
    level: 'BEGINNER',
    category: 'Technical Analysis',
    icon: '📈',
    order: 2,
    isPremium: false,
    modules: [
      {
        title: 'Candlestick Basics',
        description: 'Candlestick kya hota hai? Green aur red candle ka matlab. Body, wick, shadow samjho.',
        videoUrl: 'https://www.youtube.com/embed/rGIWJXl8Mmc',
        duration: 14,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'Candlestick Basics Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Green candle ka matlab kya hai?', ['Price gir gayi', 'Price badh gayi', 'No change', 'Market closed'], 1, 'Green (ya bullish) candle ka matlab hai ki closing price opening price se zyada hai — price badhi.'),
            q('Candlestick ke wick (shadow) ka kya matlab hai?', ['Body ka hissa', 'High aur Low price', 'Volume', 'Time period'], 1, 'Upper wick high price dikhati hai, lower wick low price — ye price range dikhata hai.'),
            q('Doji candle ka matlab kya hai?', ['Strong trend', 'Indecision/confusion', 'Bullish reversal', 'Bearish reversal'], 1, 'Doji mein open aur close almost same hote hain — ye market confusion ya indecision dikhata hai.'),
          ]),
        },
      },
      {
        title: 'OHLC Explained',
        description: 'Open, High, Low, Close — chart ke 4 important data points detail mein samjho.',
        videoUrl: 'https://www.youtube.com/embed/AQkMh9UuR34',
        duration: 12,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'OHLC Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('OHLC mein "O" ka matlab kya hai?', ['Outcome', 'Open', 'Option', 'Order'], 1, 'O = Open price — wo price jis pe market ya candle shuru hui.'),
            q('Agar candle red hai toh Close kahan hota hai?', ['Open ke upar', 'Open ke neeche', 'Same as Open', 'Mid point'], 1, 'Red (bearish) candle mein Close price Open price se neeche hota hai — price giri.'),
            q('High aur Low kya represent karte hain?', ['Volume', 'Highest aur lowest price of the period', 'Open aur Close', 'Average price'], 1, 'High = us period ka highest price, Low = lowest price. Ye volatility dikhata hai.'),
          ]),
        },
      },
      {
        title: 'Volume Analysis',
        description: 'Volume kya hai? High volume aur low volume mein kya difference hai? Volume ka price ke saath relation.',
        videoUrl: 'https://www.youtube.com/embed/8N7VP_L2jO0',
        duration: 13,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'Volume Analysis Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('High volume pe price upar ja raha hai toh ye kya signal hai?', ['Weakness', 'Strong bullish move', 'Distribution', 'No signal'], 1, 'Price upar + High volume = strong buying interest — bullish confirmation signal.'),
            q('Volume bars neeche chart mein kahan dikhte hain?', ['Price ke saath', 'Separate section mein neeche', 'Overlay pe', 'Top mein'], 1, 'Volume bars chart ke neeche ek separate section mein dikhte hain — usually green/red bars.'),
            q('Low volume pe breakout hua toh?', ['Strong signal hai', 'Weak/false breakout ho sakta hai', 'Always genuine hai', 'Volume se koi lena dena nahi'], 1, 'Low volume pe breakout suspicious hota hai — false breakout ka chance zyada hota hai.'),
          ]),
        },
      },
      {
        title: 'Timeframes',
        description: '1 min, 5 min, 15 min, 1 hour, daily — different timeframes ka use aur unka matlab.',
        videoUrl: 'https://www.youtube.com/embed/bJMWLcJBGHs',
        duration: 11,
        xpReward: 12,
        order: 4,
        challenge: {
          title: 'Timeframes Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Scalper kaunsa timeframe use karta hai?', ['Daily', '1-5 min', 'Weekly', 'Monthly'], 1, 'Scalper 1-5 minute timeframes use karta hai — jaldi jaldi trades leta hai, chhote moves pe.'),
            q('Swing trader kaunsa timeframe use karta hai?', ['1 min', '15 min - 4 hour', '1 min - 15 min', 'Monthly'], 1, 'Swing trader 15 min se 4 hour tak ke timeframes use karta hai — 2-5 din ke trades ke liye.'),
            q('Multi-timeframe analysis kya hai?', ['Sirf ek timeframe dekhna', 'Multiple timeframes pe trend confirm karna', 'No timeframes', 'Random timeframes'], 1, 'Multi-timeframe analysis mein aap bigger timeframe pe trend dekhte ho aur chhote timeframe pe entry lete ho.'),
          ]),
        },
      },
      {
        title: 'Chart Types',
        description: 'Line chart, bar chart, candlestick chart, Heikin Ashi — different chart types aur unke use cases.',
        videoUrl: 'https://www.youtube.com/embed/6N9RpfKmLJY',
        duration: 13,
        xpReward: 15,
        order: 5,
        challenge: {
          title: 'Chart Types Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Line chart kya dikhata hai?', ['OHLC data', 'Sirf closing prices connected', 'Volume', 'Open interest'], 1, 'Line chart sirf closing prices ko connect karta hai — simple but useful for trend identification.'),
            q('Heikin Ashi candle kya hai?', ['Normal candle', 'Smoothed/averaged candle for trend', 'Volume candle', 'Renko type'], 1, 'Heikin Ashi candle average price use karta hai — trend ko smoothly dikhata hai, noise kam hota hai.'),
            q('Professional traders kaunsa chart sabse zyada use karte hain?', ['Line chart', 'Candlestick chart', 'Pie chart', 'Bar chart only'], 1, 'Candlestick chart sabse popular hai kyunki ye OHLC + pattern recognition dono dikhata hai.'),
          ]),
        },
      },
      {
        title: 'Real Chart Practice',
        description: 'Ab real charts pe practice karo! TradingView mein charts kaise read karte hain — live practice session.',
        videoUrl: 'https://www.youtube.com/embed/KvPZpJbJxnQ',
        duration: 20,
        xpReward: 20,
        order: 6,
        challenge: {
          title: 'Chart Practice Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 20,
          coinReward: 15,
          questions: JSON.stringify([
            q('TradingView mein kaunsa indicator sabse commonly use hota hai?', ['Only custom indicators', 'RSI aur Moving Averages', 'No indicators', 'Only paid indicators'], 1, 'RSI aur Moving Averages sabse commonly used indicators hain TradingView pe.'),
            q('Chart pe trendline kaise draw karte hain?', ['Random points connect', 'Minimum 2 swing high/low points connect', 'Only horizontal lines', 'Vertical lines'], 1, 'Trendline minimum 2 swing points ko connect karti hai — jyada points touch honge, utni strong line.'),
            q('Screen time kyun zaroori hai chart reading ke liye?', ['Timepass ke liye', 'Pattern recognition develop hota hai', 'It\'s not important', 'Only for pros'], 1, 'Zyada screen time = zyada pattern recognition. Charts ka "language" samajhne mein time lagta hai.'),
          ]),
        },
      },
    ],
  },
  // ─── 3. First Trade ───────────────────────────────────────────
  {
    title: 'First Trade',
    description: 'Apna pehla trade kaise karein? Market order vs Limit order, Bid-Ask, quantity — sab practical things!',
    level: 'BEGINNER',
    category: 'Practical Trading',
    icon: '🎯',
    order: 3,
    isPremium: false,
    modules: [
      {
        title: 'Market vs Limit Order',
        description: 'Market order aur Limit order mein kya difference hai? Kab kiska use karna chahiye?',
        videoUrl: 'https://www.youtube.com/embed/aUmK3sYxWXk',
        duration: 12,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'Market vs Limit Order Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Market order ka biggest disadvantage kya hai?', ['Cheap hai', 'Price control nahi hota — slippage possible', 'Bahut slow hai', 'Sirf experts use kar sakte'], 1, 'Market order mein aap price control nahi kar sakte — volatile market mein slippage ho sakta hai.'),
            q('Limit order mein agar price match nahi hua toh?', ['Order cancel ho jata hai end of day', 'Next day bhi pending rehta hai (till expiry)', 'Instant execute', 'Broker manually karega'], 1, 'Limit order price match hone tak pending rehta hai — intraday orders market close pe cancel.'),
            q('Scalping mein kaunsa order better hai?', ['Limit order', 'Market order', 'Both same', 'No order'], 1, 'Scalping mein speed important hai — market order instant execution deta hai.'),
          ]),
        },
      },
      {
        title: 'Buy/Sell Mechanics',
        description: 'Buy kaise karein, sell kaise karein? Long aur short position ka matlab. Delivery vs Intraday.',
        videoUrl: 'https://www.youtube.com/embed/JBK74IYpIaQ',
        duration: 14,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'Buy/Sell Mechanics Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Long position ka matlab kya hai?', ['Stock bechna', 'Stock khareedna (price upar jaane pe profit)', 'No position', 'Options buy karna'], 1, 'Long position = pehle buy, baad mein sell. Price upar jaane pe profit hota hai.'),
            q('Short selling kya hai?', ['Short time pe sell', 'Pehle sell (borrowed shares), baad mein buy back', 'Sirf intraday', 'Delivery sell'], 1, 'Short selling = pehle sell karo (borrowed shares), price gire toh buy back karke profit kamao.'),
            q('Intraday trade ka matlab kya hai?', ['Same day mein buy aur sell', 'Next day sell', 'Hold for months', 'Weekly trade'], 0, 'Intraday = same trading day mein entry aur exit. No delivery, no overnight holding.'),
          ]),
        },
      },
      {
        title: 'Understanding Bid-Ask',
        description: 'Bid price aur Ask price kya hai? Spread kya hota hai? Ye concepts samjho trading ke liye.',
        videoUrl: 'https://www.youtube.com/embed/t9Okx4aGkYI',
        duration: 11,
        xpReward: 12,
        order: 3,
        challenge: {
          title: 'Bid-Ask Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Bid price kya hai?', ['Highest price koi dena ready hai', 'Lowest price koi bechna ready hai', 'Average price', 'Last traded price'], 0, 'Bid = highest price jo koi buyer dena ready hai. Ye buying demand dikhata hai.'),
            q('Ask price kya hai?', ['Buyers ka price', 'Lowest price koi seller bechna ready hai', 'Highest price', 'Opening price'], 1, 'Ask (or Offer) = lowest price jo koi seller accept karne ko ready hai.'),
            q('Bid-Ask spread kyun important hai?', ['No importance', 'Narrow spread = liquid stock, wide = illiquid', 'Sirf options mein', 'Only for day traders'], 1, 'Narrow spread = high liquidity (easy buy/sell), Wide spread = illiquid (difficult to trade).'),
          ]),
        },
      },
      {
        title: 'Lot Size & Quantity',
        description: 'Equity mein shares kaise count hote hain? Lot size kya hai F&O mein? Minimum order quantity.',
        videoUrl: 'https://www.youtube.com/embed/nvlN2VTHe8s',
        duration: 10,
        xpReward: 12,
        order: 4,
        challenge: {
          title: 'Lot Size Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Equity delivery mein minimum kitne shares buy kar sakte hain?', ['100', '10', '1', 'Lot size'], 2, 'Equity mein aap sirf 1 share bhi buy kar sakte hain — koi minimum nahi.'),
            q('Nifty Options mein lot size kitna hai?', ['25', '50', '100', '75'], 0, 'Nifty options ka lot size 25 hai (updated from 50). Har order minimum 25 units ka hoga.'),
            q('Lot size kyun zaroori hai F&O mein?', ['No reason', 'Standardization aur margin calculation', 'Only for brokers', 'Government rule'], 1, 'Lot size standardize karta hai contract size aur margin calculation easy hota hai.'),
          ]),
        },
      },
      {
        title: 'Order Placement Practice',
        description: 'Trading platform pe order kaise place karein? Step by step guide — Zerodha/Upstox pe live demo.',
        videoUrl: 'https://www.youtube.com/embed/HBY2W7ZvYeQ',
        duration: 16,
        xpReward: 15,
        order: 5,
        challenge: {
          title: 'Order Placement Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Order placement se pehle kya check karna chahiye?', ['Nothing', 'Stock name, quantity, price, order type', 'Only price', 'Only quantity'], 1, 'Hamesha stock name, quantity, price (for limit), aur order type verify karein pehle.'),
            q('GTT (Good Till Triggered) order kya hai?', ['Same as normal order', 'Conditional order jo trigger pe execute hota hai', 'Cancelled order', 'Market order'], 1, 'GTT order aap conditions set karne deta hai — price trigger hone pe order automatically place hota hai.'),
            q('AMO (After Market Order) kya hai?', ['Pre-market order', 'Market band hone ke baad place kiya gaya order — next day execute', 'Cancelled order', 'Instant order'], 1, 'AMO market hours ke baad place hota hai aur next trading day pe execute hota hai.'),
          ]),
        },
      },
      {
        title: 'Trade Confirmation',
        description: 'Order execute hone ke baad kya hota hai? Contract note, P&L calculation, aur trade confirmation samjho.',
        videoUrl: 'https://www.youtube.com/embed/BKORP2pHBxI',
        duration: 12,
        xpReward: 12,
        order: 6,
        challenge: {
          title: 'Trade Confirmation Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Contract note kya hai?', ['Just a receipt', 'Official trade confirmation with all details and charges', 'Broker ka advertisement', 'Tax document'], 1, 'Contract note official document hai jo trade details, price, quantity, charges sab dikhata hai.'),
            q('Trade ke baad P&L kaise calculate karein?', ['Random guess', '(Sell Price - Buy Price) × Quantity - Charges', 'Only price difference', 'Broker batayega'], 1, 'P&L = (Sell - Buy) × Qty - Brokerage - Charges. Simple formula but important.'),
            q('Order book mein filled order ka status kya dikhta hai?', ['Pending', 'Filled/Complete', 'Rejected', 'Open'], 1, 'Filled status ka matlab hai order successfully execute ho gaya — ya toh fully ya partially.'),
          ]),
        },
      },
    ],
  },
  // ─── 4. Money Management ──────────────────────────────────────
  {
    title: 'Money Management',
    description: 'Paisa manage karna seekho — capital allocation, risk management, position sizing. Ye sabse important skill hai!',
    level: 'BEGINNER',
    category: 'Risk Management',
    icon: '💰',
    order: 4,
    isPremium: false,
    modules: [
      {
        title: 'Capital Allocation',
        description: 'Apne total capital ko kaise divide karein? Kitna trading ke liye, kitna savings mein rakhein.',
        videoUrl: 'https://www.youtube.com/embed/GjJnMjzj3qA',
        duration: 14,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'Capital Allocation Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Trading capital ko total savings ka kitna percent rakhna chahiye (beginners ke liye)?', ['100%', '50-70%', '10-20%', '5%'], 2, 'Beginners ko sirf 10-20% capital trading mein daalna chahiye — baaki safe mein.'),
            q('Emergency fund kya hai?', ['Trading ke liye paisa', '3-6 months expenses ka fund jo trading se alag hai', 'Bonus money', 'Broker ka paisa'], 1, 'Emergency fund 3-6 months ki expenses cover karta hai — ye trading se kabhi touch nahi karna.'),
            q('Over-leveraging ka kya risk hai?', ['No risk', 'Small loss bhi bada loss ban sakta hai', 'More profit guaranteed', 'Better returns'], 1, 'Over-leveraging mein chhoti loss bhi account wipe out kar sakti hai — always margin carefully use karo.'),
          ]),
        },
      },
      {
        title: 'Risk Per Trade',
        description: 'Har trade pe kitna risk lena chahiye? 1% rule, 2% rule — risk management ka foundation.',
        videoUrl: 'https://www.youtube.com/embed/qmHkQ1Jqc50',
        duration: 12,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'Risk Per Trade Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('1% rule kya kehta hai?', ['1% profit minimum', 'Per trade max 1% capital risk', '1% daily return', '1% investment only'], 1, '1% rule = har trade pe maximum 1% of total capital risk. Agar ₹1L capital, toh max ₹1000 loss per trade.'),
            q('₹1,00,000 capital hai toh 2% rule mein max loss per trade kitna hoga?', ['₹2000', '₹1000', '₹5000', '₹200'], 0, '2% of ₹1,00,000 = ₹2,000. Ye maximum loss hai jo aap ek trade pe afford kar sakte ho.'),
            q('Risk management follow na karne ka biggest drawback kya hai?', ['Nothing', 'Account wipe out ho sakta hai', 'More profit', 'No effect'], 1, 'Bina risk management ke, ek badi losing streak account ko zero kar sakti hai.'),
          ]),
        },
      },
      {
        title: 'Position Sizing',
        description: 'Kitne shares buy karein? Position sizing formula aur practical examples.',
        videoUrl: 'https://www.youtube.com/embed/P7iQ3cXfMBg',
        duration: 13,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'Position Sizing Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Position sizing ka formula kya hai? (simplified)', ['Capital × 100', 'Risk Amount ÷ (Entry Price - Stop Loss)', 'Random quantity', 'Capital ÷ Stock Price'], 1, 'Shares = Risk Amount ÷ (Entry - SL). Example: ₹1000 risk, ₹10 SL per share = 100 shares.'),
            q('₹500 capital risk hai, SL ₹5 per share hai — kitne shares buy kar sakte hain?', ['50', '100', '500', '25'], 1, '500 ÷ 5 = 100 shares. Simple division — risk ko per share risk se divide karo.'),
            q('Position sizing kyun zaroori hai?', ['Optional hai', 'Consistent risk management ke liye', 'Only for big accounts', 'No reason'], 1, 'Position sizing ensure karta hai ki har trade pe consistent risk ho — emotional decisions kam ho.'),
          ]),
        },
      },
      {
        title: 'Portfolio Diversification',
        description: 'Sab eggs ek basket mein mat rakhho! Diversification kya hai aur kaise karein?',
        videoUrl: 'https://www.youtube.com/embed/hW4JqJnISBc',
        duration: 11,
        xpReward: 12,
        order: 4,
        challenge: {
          title: 'Diversification Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Portfolio diversification ka main goal kya hai?', ['Maximum returns', 'Risk kam karna', 'One stock pe focus', 'Tax saving'], 1, 'Diversification ka goal risk reduce karna hai — ek sector/stock mein loss doosre se cover ho.'),
            q('Over-diversification ka kya problem hai?', ['No problem', 'Returns dilute ho jate hain, tracking mushkil hota hai', 'More profit', 'Better risk'], 1, 'Zyada diversification = average returns, tracking difficult. 8-15 stocks ideal hai.'),
            q('Beginner portfolio mein kitne stocks hone chahiye (approx)?', ['1-2', '5-10', '50+', '100'], 1, '5-10 stocks beginners ke liye ideal hai — manageable aur adequately diversified.'),
          ]),
        },
      },
      {
        title: 'Risk-Reward Ratio',
        description: '1:2, 1:3 risk-reward kya hai? Har trade pe minimum risk-reward maintain karna seekho.',
        videoUrl: 'https://www.youtube.com/embed/8qK5R2PnOXs',
        duration: 13,
        xpReward: 15,
        order: 5,
        challenge: {
          title: 'Risk-Reward Ratio Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('1:2 risk-reward ratio ka matlab kya hai?', ['1 risk, 2 reward', '2 risk, 1 reward', 'Equal risk reward', 'No risk'], 0, '1:2 = ₹1 risk ke against ₹2 potential reward. Minimum 1:2 maintain karna chahiye.'),
            q('Agar SL ₹10 hai aur target ₹30 hai toh risk-reward ratio kya hai?', ['1:2', '1:3', '1:1', '3:1'], 0, 'Risk = ₹10, Reward = ₹30 - ₹10 = ₹20. Ratio = 10:20 = 1:2.'),
            q('50% win rate aur 1:2 R:R se long term mein result kya hoga?', ['Loss', 'Profitable — edge hai', 'Break even', 'Cannot determine'], 1, '50% win rate + 1:2 R:R = positive expectancy. Har loss ₹1, har win ₹2 = net positive.'),
          ]),
        },
      },
    ],
  },
  // ─── 5. Indian Market Rules ───────────────────────────────────
  {
    title: 'Indian Market Rules',
    description: 'SEBI rules, circuit breaker, T+1 settlement — Indian market ke special rules aur regulations samjho.',
    level: 'BEGINNER',
    category: 'Market Rules',
    icon: '⚖️',
    order: 5,
    isPremium: false,
    modules: [
      {
        title: 'SEBI Regulations',
        description: 'SEBI kya hai? Investor protection rules, margin requirements, aur trading rules.',
        videoUrl: 'https://www.youtube.com/embed/MYGu3StOBXw',
        duration: 14,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'SEBI Regulations Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('SEBI ka full form kya hai?', ['Securities and Exchange Board of India', 'Stock Exchange Board of India', 'Securities Exchange Board Institution', 'Stock and Exchange Board India'], 0, 'SEBI = Securities and Exchange Board of India — 1992 mein establish hua, market regulator.'),
            q('SEBI ka main role kya hai?', ['Trading karna', 'Market regulate karna, investor protect karna', 'Companies run karna', 'Banking'], 1, 'SEBI ka role hai Indian securities market regulate karna aur investors ka protection karna.'),
            q('SEBI ke rules follow na karne pe kya ho sakta hai?', ['Nothing', 'Penalty, ban, legal action', 'Reward', 'No consequence'], 1, 'SEBI rules violate karne pe penalty, trading ban, aur legal action ho sakta hai.'),
          ]),
        },
      },
      {
        title: 'Nifty & BankNifty',
        description: 'Nifty 50 aur Bank Nifty ke baare mein detail mein jaano — calculation, rebalancing, aur trading.',
        videoUrl: 'https://www.youtube.com/embed/zGhC3JpP2U0',
        duration: 13,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'Nifty & BankNifty Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Nifty 50 free-float market cap weighted index hai — iska matlab?', ['All shares counted', 'Only publicly traded shares counted', 'Equal weight', 'Government decided'], 1, 'Free-float = sirf publicly available shares counted hote hain, promoter shares nahi.'),
            q('Bank Nifty mein kitne stocks hain?', ['50', '12', '30', '10'], 1, 'Bank Nifty mein 12 banking stocks hain — SBI, HDFC Bank, ICICI Bank, etc.'),
            q('Nifty kab rebalance hota hai?', ['Daily', 'Monthly', 'Semi-annually (June & December)', 'Yearly'], 2, 'Nifty semi-annually rebalance hota hai — June aur December mein. Performance ke basis pe.'),
          ]),
        },
      },
      {
        title: 'Sectoral Indices',
        description: 'Nifty IT, Nifty Pharma, Nifty Auto — sectoral indices samjho aur unka trading significance.',
        videoUrl: 'https://www.youtube.com/embed/c5WFiFMPbOM',
        duration: 11,
        xpReward: 12,
        order: 3,
        challenge: {
          title: 'Sectoral Indices Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Nifty IT index kaunsa sector track karta hai?', ['Banking', 'Information Technology', 'Infrastructure', 'Insurance'], 1, 'Nifty IT IT/Technology sector ke stocks track karta hai — TCS, Infosys, Wipro, etc.'),
            q('Sector rotation kya hai?', ['Sectors change names', 'Money flows from one sector to another', 'Only one sector trades', 'No concept'], 1, 'Sector rotation = market cycle mein different sectors pe turn aata hai — money shift hota hai.'),
            q('Sectoral index dekhne se kya fayda hota hai?', ['No benefit', 'Sector ka overall trend pata chalta hai', 'Individual stock prediction', 'Tax benefit'], 1, 'Sectoral index se sector ka overall health pata chalta hai — helps in stock selection.'),
          ]),
        },
      },
      {
        title: 'IPO Basics',
        description: 'IPO kya hai? Kaise apply karein? Allotment process aur listing gains samjho.',
        videoUrl: 'https://www.youtube.com/embed/RnFkZXGq7eM',
        duration: 15,
        xpReward: 15,
        order: 4,
        challenge: {
          title: 'IPO Basics Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('IPO ka full form kya hai?', ['Initial Public Offering', 'Indian Public Offering', 'Initial Private Offering', 'International Public Offering'], 0, 'IPO = Initial Public Offering — jab koi company pehli baar public mein shares offer karti hai.'),
            q('IPO allotment kaise hota hai?', ['First come first serve', 'Lottery-based (for oversubscribed)', 'Everyone gets', 'Broker decides'], 1, 'Oversubscribed IPO mein lottery-based allotment hota hai — sabko shares nahi milte.'),
            q('Listing day pe IPO shares kahan trade hote hain?', ['Only BSE', 'Only NSE', 'Both NSE and BSE', 'MCX'], 2, 'IPO shares generally dono NSE aur BSE pe list hote hain — same day pe trading start.'),
          ]),
        },
      },
      {
        title: 'Circuit Breaker & Price Bands',
        description: 'Market mein circuit breaker kya hai? Upper/lower circuit, price bands — sab samjho.',
        videoUrl: 'https://www.youtube.com/embed/t7CL3MK_YEM',
        duration: 12,
        xpReward: 12,
        order: 5,
        challenge: {
          title: 'Circuit Breaker Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Upper circuit ka matlab kya hai?', ['Market band', 'Price max limit hit — only buyers, no sellers', 'Price min limit', 'Auction'], 1, 'Upper circuit = price daily limit (5/10/15/20%) pe pahunch gaya — sirf buy orders, no sellers.'),
            q('Market-wide circuit breaker kab lagta hai?', ['Daily', 'Jab index 10/15/20% gir jaaye', 'Every hour', 'Never'], 1, 'Index 10% gire toh 45min halt, 15% gire toh 1hr halt, 20% gire toh full day halt.'),
            q('Stock price band kya hai?', ['Fixed price', 'Daily max % move limit for a stock', 'Annual limit', 'No limit'], 1, 'Price bands = ek stock ka max daily % move. Different stocks ke different bands hote hain.'),
          ]),
        },
      },
    ],
  },
  // ─── 6. Candlestick Patterns ──────────────────────────────────
  {
    title: 'Candlestick Patterns',
    description: 'Doji, Hammer, Engulfing, Morning Star — important candlestick patterns seekho aur trading mein use karo!',
    level: 'BEGINNER',
    category: 'Technical Analysis',
    icon: '🕯️',
    order: 6,
    isPremium: false,
    modules: [
      {
        title: 'Doji',
        description: 'Doji candle ki types — Standard Doji, Dragonfly Doji, Gravestone Doji. Ye pattern kya signal deta hai?',
        videoUrl: 'https://www.youtube.com/embed/E8sXmO6CEeQ',
        duration: 12,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'Doji Pattern Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Doji candle ka open aur close kaisa hota hai?', ['Bahut different', 'Almost same', 'Open always high', 'Close always low'], 1, 'Doji mein open aur close almost equal hote hain — isliye candle ki body bahut chhoti ya dot jaisi hoti hai.'),
            q('Dragonfly Doji kya signal deta hai?', ['Bearish reversal', 'Bullish reversal (long lower shadow)', 'Continuation', 'No signal'], 1, 'Dragonfly Doji mein long lower shadow hota hai — buyers ne price push back kiya, bullish signal.'),
            q('Gravestone Doji kaisa dikhta hai?', ['Long lower shadow', 'Long upper shadow — looks like gravestone', 'No shadow', 'Equal shadows'], 1, 'Gravestone Doji mein long upper shadow hoti hai — sellers ne price neeche dhakel diya, bearish signal.'),
          ]),
        },
      },
      {
        title: 'Hammer & Hanging Man',
        description: 'Hammer aur Hanging Man pattern — dono similar dikhte hain par context alag hai. Seekho kaise identify karein.',
        videoUrl: 'https://www.youtube.com/embed/9Xx0CL6qPqU',
        duration: 13,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'Hammer Pattern Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Hammer pattern kahan banta hai?', ['Uptrend ke baad', 'Downtrend ke baad (bottom pe)', 'Sideways mein', 'Anytime'], 1, 'Hammer downtrend ke baad bottom pe banta hai — bullish reversal signal deta hai.'),
            q('Hammer aur Hanging Man mein kya same hota hai?', ['Context', 'Appearance — both have small body, long lower shadow', 'Signal', 'Volume'], 1, 'Dono ka appearance same hai — chhoti body, long lower shadow. Bas context alag hai.'),
            q('Hanging Man kahan banta hai?', ['Bottom pe', 'Uptrend ke baad (top pe)', 'Sideways', 'Opening pe'], 1, 'Hanging Man uptrend ke baad top pe banta hai — bearish reversal signal.'),
          ]),
        },
      },
      {
        title: 'Engulfing Patterns',
        description: 'Bullish Engulfing aur Bearish Engulfing — strong reversal patterns jo confirmation dete hain.',
        videoUrl: 'https://www.youtube.com/embed/MKxQmZKuJcU',
        duration: 14,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'Engulfing Pattern Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Bullish Engulfing mein doosri candle pehli ko kaise cover karti hai?', ['Partially', 'Completely — real body engulf', 'Not at all', 'Only wicks'], 1, 'Bullish Engulfing mein second (green) candle ki body first (red) candle ki body poora cover karti hai.'),
            q('Bullish Engulfing kab strong signal hota hai?', ['Anytime', 'After a downtrend + high volume', 'Uptrend mein', 'Low volume pe'], 1, 'Downtrend ke baad + high volume pe Bullish Engulfing bahut strong bullish reversal signal hai.'),
            q('Bearish Engulfing kahan confirm hota hai?', ['Bottom pe', 'Uptrend ke baad top pe — red candle engulfs green', 'Mid trend', 'Anywhere'], 1, 'Uptrend ke baad top pe — red candle previous green candle ko completely engulf karti hai.'),
          ]),
        },
      },
      {
        title: 'Morning/Evening Star',
        description: '3-candle reversal patterns — Morning Star (bullish) aur Evening Star (bearish) detail mein samjho.',
        videoUrl: 'https://www.youtube.com/embed/8fR5mXrVgZw',
        duration: 13,
        xpReward: 15,
        order: 4,
        challenge: {
          title: 'Morning/Evening Star Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Morning Star mein 3 candles ka pattern kya hai?', ['Big red → small candle → big green', 'Big green → small → big red', 'Three green candles', 'Three red candles'], 0, 'Morning Star = big red (downtrend) → small indecision candle → big green (reversal confirmation).'),
            q('Evening Star kya signal deta hai?', ['Bullish', 'Bearish reversal — uptrend ke baad', 'Continuation', 'No signal'], 1, 'Evening Star uptrend ke baad bearish reversal signal deta hai — big green → small → big red.'),
            q('Morning/Evening Star mein middle candle ka kya role hai?', ['No role', 'Indecision/consolidation — transition candle', 'Main signal', 'Volume indicator'], 1, 'Middle candle (star) indecision dikhata hai — ye transition phase hai beech mein.'),
          ]),
        },
      },
      {
        title: 'Three White Soldiers',
        description: 'Three consecutive long-bodied green candles — strong bullish reversal pattern. Detail mein samjho.',
        videoUrl: 'https://www.youtube.com/embed/KxV2J8FhF3Q',
        duration: 11,
        xpReward: 12,
        order: 5,
        challenge: {
          title: 'Three White Soldiers Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Three White Soldiers mein teen candles kaunsi hoti hain?', ['Red-Red-Red', 'Green-Green-Green with long bodies', 'Red-Green-Red', 'Mixed colors'], 1, 'Three White Soldiers = 3 consecutive long-bodied bullish (green) candles.'),
            q('Ye pattern kahan sabse effective hota hai?', ['Uptrend mein', 'Downtrend ke baad (at bottom)', 'Sideways', 'High volume pe always'], 1, 'Downtrend ke baad bottom pe ye pattern strong bullish reversal signal deta hai.'),
            q('Agar second candle pe gap up nahi hua toh?', ['Pattern invalid', 'Still valid but weaker signal', 'Stronger signal', 'No change'], 1, 'Gap up ideal hai par bina gap ke bhi pattern valid hota hai — bas thoda weaker signal.'),
          ]),
        },
      },
      {
        title: 'Harami Patterns',
        description: 'Bullish Harami aur Bearish Harami — inside bar pattern jo trend reversal ka hint deta hai.',
        videoUrl: 'https://www.youtube.com/embed/XxVfQ4FyQDE',
        duration: 12,
        xpReward: 15,
        order: 6,
        challenge: {
          title: 'Harami Pattern Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Harami mein second candle kahan hoti hai?', ['Outside first candle', 'Inside first candle\'s body', 'Same size', 'Above first candle'], 1, 'Harami mein second candle ki body first candle ki body ke andar (inside) hoti hai.'),
            q('"Harami" ka matlab kya hai (Japanese mein)?', ['Big', 'Pregnant — small candle inside big candle', 'Evil', 'Strong'], 1, 'Harami = "pregnant" — chhoti candle badi candle ke andar hai, jaise baby mother ke andar.'),
            q('Bullish Harami kab banta hai?', ['Uptrend ke baad', 'Downtrend ke baad — big red followed by small green inside', 'Anytime', 'Only on Mondays'], 1, 'Bullish Harami downtrend ke baad banta hai — big red + small green inside = potential bullish reversal.'),
          ]),
        },
      },
    ],
  },
  // ─── 7. Moving Averages ───────────────────────────────────────
  {
    title: 'Moving Averages',
    description: 'SMA, EMA, Golden Cross, Death Cross — Moving Averages se trend identify karna seekho!',
    level: 'BEGINNER',
    category: 'Technical Analysis',
    icon: '📉',
    order: 7,
    isPremium: false,
    modules: [
      {
        title: 'SMA Basics',
        description: 'Simple Moving Average kya hai? 20 SMA, 50 SMA, 200 SMA — calculation aur use cases.',
        videoUrl: 'https://www.youtube.com/embed/9hQmG4wfpZM',
        duration: 14,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'SMA Basics Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('SMA ka full form kya hai?', ['Simple Moving Average', 'Stock Moving Average', 'Smooth Moving Average', 'Standard Moving Average'], 0, 'SMA = Simple Moving Average — simple average of closing prices over a period.'),
            q('20 SMA kya represent karta hai?', ['20 days ka volume', 'Last 20 candles ki average closing price', '20 stocks', '20 minutes'], 1, '20 SMA = last 20 periods (days/hours) ki average closing price — short term trend indicator.'),
            q('Price 200 SMA ke upar hai toh ye kya signal hai?', ['Bearish', 'Bullish — long term uptrend', 'Neutral', 'Sell signal'], 1, '200 SMA ke upar price = long term bullish trend. Institutional investors 200 SMA follow karte hain.'),
          ]),
        },
      },
      {
        title: 'EMA Explained',
        description: 'Exponential Moving Average kya hai? SMA aur EMA mein kya difference hai? EMA kyun faster hota hai?',
        videoUrl: 'https://www.youtube.com/embed/nGLJtknMyGE',
        duration: 13,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'EMA Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('EMA aur SMA mein main difference kya hai?', ['No difference', 'EMA recent prices ko zyada weight deta hai', 'SMA better hai always', 'EMA sirf intraday ke liye'], 1, 'EMA = Exponential MA, recent prices ko zyada weight deta hai — faster reaction to price changes.'),
            q('EMA kyun "faster" hota hai SMA se?', ['Calculation chhota hota hai', 'Recent data ko zyada importance deta hai', 'Slow hota hai actually', 'No reason'], 1, 'EMA exponential weighting use karta hai — recent prices ko zyada weight, isliye faster response.'),
            q('Scalpers kaunsa MA prefer karte hain?', ['200 EMA', '9 EMA ya 21 EMA', 'Only SMA', 'No MA'], 1, 'Scalpers short EMAs (9, 21) prefer karte hain — fast signals chahiye hote hain.'),
          ]),
        },
      },
      {
        title: 'Golden Cross/Death Cross',
        description: 'Golden Cross (50 MA crosses 200 MA above) aur Death Cross (below) — major trend signals.',
        videoUrl: 'https://www.youtube.com/embed/mQNG8qYiKzE',
        duration: 12,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'Golden/Death Cross Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Golden Cross kya hota hai?', ['50 MA 200 MA ke neeche se upar cross kare', '50 MA 200 MA ke upar se neeche', 'Both MAs same', 'No crossover'], 0, 'Golden Cross = 50 MA crosses 200 MA from below → strong bullish signal.'),
            q('Death Cross ka kya matlab hai?', ['Bullish reversal', 'Bearish signal — 50 MA crosses below 200 MA', 'No signal', 'Neutral'], 1, 'Death Cross = 50 MA 200 MA ke neeche cross kare → bearish, potential downtrend.'),
            q('Golden Cross ke baad kya expected hai?', ['Immediate crash', 'Potential long-term uptrend', 'Nothing changes', 'Sideways movement'], 1, 'Golden Cross long-term uptrend ka signal hai — par confirmation aur volume bhi dekhna chahiye.'),
          ]),
        },
      },
      {
        title: 'MA Crossovers Trading',
        description: 'Moving Average crossovers se entry/exit signals kaise lein? Practical trading strategy.',
        videoUrl: 'https://www.youtube.com/embed/YNdYF9PvxJU',
        duration: 14,
        xpReward: 15,
        order: 4,
        challenge: {
          title: 'MA Crossover Trading Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('9 EMA 21 EMA ke upar cross kare toh ye kya signal hai?', ['Sell', 'Buy — short term bullish crossover', 'Hold', 'No signal'], 1, 'Fast MA (9) slow MA (21) ke upar cross = bullish crossover → buy signal.'),
            q('MA crossover strategy mein false signals kaise kam karein?', ['Ignore all signals', 'Higher timeframe confirm karo + volume dekho', 'More MAs add karo', 'No way'], 1, 'Higher timeframe pe confirmation + volume check se false signals reduce hote hain.'),
            q('MA crossover se exit kaise lein?', ['Random', 'Opposite crossover pe (death cross for long)', 'Fixed target', 'No exit'], 1, 'Long position ka exit jab fast MA slow MA ke neeche cross kare — opposite signal.'),
          ]),
        },
      },
      {
        title: 'Multi-MA Strategy',
        description: 'Ek saath multiple moving averages use karna — 20, 50, 200 EMA combination strategy.',
        videoUrl: 'https://www.youtube.com/embed/pBMBaCpqjYk',
        duration: 15,
        xpReward: 18,
        order: 5,
        challenge: {
          title: 'Multi-MA Strategy Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 18,
          coinReward: 10,
          questions: JSON.stringify([
            q('Multi-MA strategy mein "ribbon" kya hota hai?', ['Single MA', 'Multiple MAs ek saath plotted — ribbon jaisa dikhta hai', 'Volume indicator', 'Chart pattern'], 1, 'MA Ribbon = multiple MAs (like 10,20,30,50,100) ek saath plotted — expanding = trending.'),
            q('Price sabhi MAs ke upar hai toh kya signal hai?', ['Sell', 'Strong bullish trend', 'Neutral', 'Bearish'], 1, 'Price all MAs ke upar = very strong bullish trend — MAs support ban rahe hain.'),
            q('MA Ribbon expanding hona kya dikhata hai?', ['Sideways market', 'Strong trend (expansion = momentum)', 'Reversal', 'Nothing'], 1, 'MA ribbon expand = trend gaining momentum. Contract = trend weakening, potential reversal.'),
          ]),
        },
      },
    ],
  },
  // ─── 8. RSI & MACD ───────────────────────────────────────────
  {
    title: 'RSI & MACD',
    description: 'RSI aur MACD — do sabse popular momentum indicators. Overbought/Oversold aur divergence seekho!',
    level: 'BEGINNER',
    category: 'Technical Analysis',
    icon: '📊',
    order: 8,
    isPremium: false,
    modules: [
      {
        title: 'RSI Overbought/Oversold',
        description: 'RSI kya hai? 70 ke upar = overbought, 30 ke neeche = oversold. Basic RSI trading.',
        videoUrl: 'https://www.youtube.com/embed/VLjVHkXPGMA',
        duration: 14,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'RSI Overbought/Oversold Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('RSI ka full form kya hai?', ['Relative Strength Index', 'Random Signal Indicator', 'Rate of Stock Index', 'Return on Stock Investment'], 0, 'RSI = Relative Strength Index — momentum oscillator jo 0-100 ke beech measure karta hai.'),
            q('RSI 70 ke upar hai toh kya maana jaata hai?', ['Oversold', 'Overbought — potential correction', 'Neutral', 'Buy signal'], 1, 'RSI > 70 = Overbought, market zyada bullish ho chuka hai — correction possible.'),
            q('RSI 30 ke neeche hai toh kya signal hai?', ['Sell', 'Oversold — potential bounce up', 'Neutral', 'No signal'], 1, 'RSI < 30 = Oversold, selling zyada ho chuki hai — bounce up ka chance.'),
          ]),
        },
      },
      {
        title: 'RSI Divergence',
        description: 'RSI Divergence kya hai? Bullish aur Bearish divergence — strongest RSI signals!',
        videoUrl: 'https://www.youtube.com/embed/eN3NjL8QpQ4',
        duration: 13,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'RSI Divergence Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Bullish divergence kya hai?', ['Price up, RSI up', 'Price lower low, RSI higher low — reversal signal', 'Price down, RSI down', 'No pattern'], 1, 'Bullish divergence = price neeche ja raha but RSI neeche nahi — selling pressure kam ho rahi, reversal possible.'),
            q('Divergence kaunsa RSI signal sabse strong mana jaata hai?', ['Overbought/Oversold', 'Divergence — especially on daily+ timeframe', 'Centerline cross', 'No signal'], 1, 'Divergence sabse strong RSI signal hai — especially larger timeframes pe. Indicator aur price alag direction ja rahe.'),
            q('Bearish divergence kaisa hota hai?', ['Price higher high, RSI lower high', 'Price lower low, RSI higher low', 'Both same', 'No divergence'], 0, 'Bearish divergence = price new high bana raha but RSI nahi — momentum kam ho raha, potential fall.'),
          ]),
        },
      },
      {
        title: 'MACD Basics',
        description: 'MACD kya hai? MACD line, Signal line, Histogram — sab components samjho.',
        videoUrl: 'https://www.youtube.com/embed/MUPxVFAkSbc',
        duration: 14,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'MACD Basics Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('MACD ka full form kya hai?', ['Moving Average Convergence Divergence', 'Momentum Average Convergence Divergence', 'Market Analysis Change Direction', 'Moving Average Change Direction'], 0, 'MACD = Moving Average Convergence Divergence — trend-following momentum indicator.'),
            q('MACD line kaise banti hai?', ['12 EMA - 26 EMA', '26 EMA - 12 EMA', '9 EMA', '50 EMA - 200 EMA'], 0, 'MACD Line = 12 EMA minus 26 EMA. Positive = bullish momentum, Negative = bearish.'),
            q('MACD Histogram kya dikhata hai?', ['Volume', 'MACD Line - Signal Line ka difference', 'Price', 'Nothing useful'], 1, 'Histogram = MACD Line minus Signal Line. Growing histogram = increasing momentum.'),
          ]),
        },
      },
      {
        title: 'MACD Signal Crossover',
        description: 'MACD line aur Signal line ka crossover — buy/sell signals kaise lein?',
        videoUrl: 'https://www.youtube.com/embed/qKuNmBNJyN8',
        duration: 12,
        xpReward: 15,
        order: 4,
        challenge: {
          title: 'MACD Crossover Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('MACD line Signal line ke upar cross kare toh?', ['Sell signal', 'Buy signal — bullish crossover', 'No signal', 'Exit signal'], 1, 'MACD > Signal = bullish crossover → buy signal. Momentum shifting upward.'),
            q('Zero line crossover kya signal deta hai?', ['No signal', 'Trend direction change — above zero = bullish, below = bearish', 'Volume change', 'Nothing'], 1, 'MACD zero line cross = trend direction change. Above zero = bullish trend, below = bearish.'),
            q('MACD crossover false signal kab ho sakta hai?', ['Strong trend mein', 'Sideways/low volatility market mein', 'High volume pe', 'Never'], 1, 'Sideways market mein MACD frequent crossovers deta hai — mostly false signals. Trend following indicator hai.'),
          ]),
        },
      },
      {
        title: 'RSI+MACD Combined',
        description: 'RSI aur MACD ko combine karke better signals kaise lein? Confluence trading strategy.',
        videoUrl: 'https://www.youtube.com/embed/DTvqLwGZ3xE',
        duration: 15,
        xpReward: 18,
        order: 5,
        challenge: {
          title: 'RSI+MACD Combined Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 18,
          coinReward: 15,
          questions: JSON.stringify([
            q('RSI aur MACD dono buy signal de rahe hain toh?', ['Ignore', 'Strong buy signal — confluence', 'Sell karo', 'Wait'], 1, 'Dono indicators same direction = confluence — signal bahut strong hota hai.'),
            q('RSI 35 hai (oversold) + MACD bullish crossover — kya karein?', ['Sell', 'Strong buy — both confirming bullish reversal', 'Wait for more', 'Do nothing'], 1, 'RSI oversold + MACD bullish crossover = double confirmation of bullish reversal. Best entry.'),
            q('Indicator confluence ka kya fayda hai?', ['No benefit', 'False signals reduce, win rate improve', 'More signals', 'No change'], 1, 'Confluence se false signals reduce hote hain aur win rate improve hota hai.'),
          ]),
        },
      },
    ],
  },
  // ─── 9. Support & Resistance ──────────────────────────────────
  {
    title: 'Support & Resistance',
    description: 'Support aur Resistance levels kya hain? Trendlines, breakout, pullback — price action ka foundation!',
    level: 'BEGINNER',
    category: 'Technical Analysis',
    icon: '🏗️',
    order: 9,
    isPremium: false,
    modules: [
      {
        title: 'What is Support/Resistance',
        description: 'Support = demand zone (price neeche nahi jaati), Resistance = supply zone (price upar nahi jaati).',
        videoUrl: 'https://www.youtube.com/embed/RKxzXpWfFKA',
        duration: 13,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'Support/Resistance Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Support kya hai?', ['Price jo upar nahi jaati', 'Level jahan buying interest aata hai — price neeche nahi jaati', 'Only a line', 'Volume level'], 1, 'Support = demand zone, jahan buyers active hote hain. Price is level tak aake bounce karti hai.'),
            q('Resistance kya hai?', ['Price neeche nahi jaati', 'Level jahan selling pressure aata hai — price upar nahi jaati', 'Support ka duplicate', 'Nothing'], 1, 'Resistance = supply zone, jahan sellers active hote hain. Price upar jaane ki koshish mein reject hoti hai.'),
            q('Jab support toot jaata hai toh kya hota hai?', ['Nothing', 'Support resistance ban jaata hai (role reversal)', 'Market band', 'Always buy'], 1, 'Broken support becomes new resistance — ye role reversal kehlaata hai. Very important concept.'),
          ]),
        },
      },
      {
        title: 'Drawing Trendlines',
        description: 'Trendlines kaise draw karein? Minimum 2 points, 3rd touch for confirmation.',
        videoUrl: 'https://www.youtube.com/embed/4Ew8r8Jb7Xs',
        duration: 14,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'Trendlines Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Uptrend line kaise draw karte hain?', ['High points connect', 'Low points (higher lows) connect', 'Random points', 'Only close prices'], 1, 'Uptrend line = higher lows ko connect karna. Har next low pehle se upar hota hai.'),
            q('Trendline ko kitne points se confirm karte hain?', ['1 point', 'Minimum 2 points, 3rd touch = strong confirmation', '5 points', '10 points'], 1, '2 points se line banti hai, 3rd touch se confirmation milta hai. Zyada touches = stronger line.'),
            q('Trendline break kya signal deta hai?', ['No signal', 'Trend change / reversal ka potential signal', 'Continue same trend', 'Buy immediately'], 1, 'Trendline break = existing trend weak ho raha hai, potential trend change. Volume bhi check karo.'),
          ]),
        },
      },
      {
        title: 'Breakout Trading',
        description: 'Support/Resistance breakouts kaise trade karein? Breakout confirmation aur fake breakouts.',
        videoUrl: 'https://www.youtube.com/embed/6b9gBVuKxEw',
        duration: 14,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'Breakout Trading Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Breakout confirm karne ke liye kya chahiye?', ['Nothing', 'Close above resistance + high volume', 'Only price touch', 'Any candle'], 1, 'Breakout confirmation = price resistance ke upar close + high volume. Intraday wick se nahi.'),
            q('Fake breakout kya hota hai?', ['Real breakout', 'Price crosses level but quickly comes back', 'No such thing', 'Same as breakout'], 1, 'Fake breakout = price level cross karta hai but sustain nahi kar pata, wapas aata hai. Trap ho jaate hain traders.'),
            q('Breakout ke baad target kaise set karein?', ['Random', 'Measured move — level ka height = expected move', 'No target', 'Fixed ₹100'], 1, 'Measured move: resistance level ki height (= range) ko breakout point pe add karo — that\'s the target.'),
          ]),
        },
      },
      {
        title: 'Pullback Strategy',
        description: 'Breakout ke baad pullback pe entry lena — better risk-reward ratio ke saath.',
        videoUrl: 'https://www.youtube.com/embed/qV2JzCJYjXw',
        duration: 13,
        xpReward: 15,
        order: 4,
        challenge: {
          title: 'Pullback Strategy Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Pullback entry ka kya advantage hai?', ['No advantage', 'Better entry price, better risk-reward, less false breakout risk', 'More risk', 'Slow entry'], 1, 'Pullback pe entry = better price, tight SL (old resistance becomes support), better R:R ratio.'),
            q('Breakout ke baad typical pullback kahan aata hai?', ['Random level', 'Previous resistance (now support) pe', 'Anytime', 'Never'], 1, 'Price generally purani resistance pe pullback deti hai — jo ab support ban chuki hai.'),
            q('Pullback trade mein SL kahan rakhein?', ['Random', 'Just below the support (previous resistance)', 'Very far', 'No SL'], 1, 'SL just below support — agar price support toot de toh trade invalid. Small SL = better R:R.'),
          ]),
        },
      },
      {
        title: 'Round Number Psychology',
        description: '₹1000, ₹5000, ₹10000 — round numbers pe kya hota hai? Psychological support/resistance.',
        videoUrl: 'https://www.youtube.com/embed/xuGm8WpP3yE',
        duration: 11,
        xpReward: 12,
        order: 5,
        challenge: {
          title: 'Round Number Psychology Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Round numbers (₹1000, ₹5000) kyun important hain?', ['Math ke liye', 'Psychological — traders mentally yahan react karte hain', 'No importance', 'Government sets'], 1, 'Round numbers pe mass psychology ka effect hota hai — buyers/sellers yahan orders place karte hain.'),
            q('Stock ₹995 se ₹1000 cross karne mein kya challenge hota hai?', ['None', 'Psychological barrier — sellers active hote hain round number pe', 'Easy cross', 'Only for big stocks'], 1, '₹1000 psychological barrier hai — many limit orders yahan hote hain, crossing difficult ho sakta hai.'),
            q('Round numbers kaunse traders follow karte hain?', ['No one', 'Retail aur institutional dono — human psychology universal hai', 'Only beginners', 'Only institutions'], 1, 'Round number psychology universal hai — retail, institutional, everyone reacts to them.'),
          ]),
        },
      },
    ],
  },
  // ─── 10. Paper Trading Mastery ────────────────────────────────
  {
    title: 'Paper Trading Mastery',
    description: 'Virtual trading mein expertise kamao! Real strategies ko bina risk ke test karo — consistency build karo.',
    level: 'BEGINNER',
    category: 'Practical Trading',
    icon: '🎮',
    order: 10,
    isPremium: false,
    modules: [
      {
        title: 'Virtual Trading Basics',
        description: 'Paper trading kya hai? Real market data, virtual money — bina risk ke real practice.',
        videoUrl: 'https://www.youtube.com/embed/kj5R9mVkqxw',
        duration: 12,
        xpReward: 15,
        order: 1,
        challenge: {
          title: 'Virtual Trading Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Paper trading kya hai?', ['Real money se trading', 'Virtual money se real market data pe trading', 'Only for fun', 'Gambling'], 1, 'Paper trading = virtual money + real market data. Risk zero, learning maximum.'),
            q('Paper trading ka sabse bada advantage kya hai?', ['Real profit', 'Zero financial risk — strategies test kar sakte ho', 'No advantage', 'Only for beginners'], 1, 'Biggest advantage = zero risk. Aap apni strategies test kar sakte ho bina paisa khone ke.'),
            q('Paper trading mein sabse important kya follow karna chahiye?', ['No rules', 'Same rules as real trading — discipline, SL, position sizing', 'Take huge risks', 'No SL needed'], 1, 'Paper trading mein bhi real trading jaisa discipline rakhna chahiye — warna real trading mein problem hogi.'),
          ]),
        },
      },
      {
        title: 'Tracking P&L',
        description: 'Profit aur Loss kaise track karein? Trade journal, win rate, average win/loss.',
        videoUrl: 'https://www.youtube.com/embed/G1D2lYj5BXQ',
        duration: 13,
        xpReward: 15,
        order: 2,
        challenge: {
          title: 'P&L Tracking Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Trade journal mein kya record karna chahiye?', ['Nothing', 'Entry/exit price, reason, emotion, P&L, screenshot', 'Only P&L', 'Only entry price'], 1, 'Complete trade journal = entry/exit, reason, emotion state, P&L, chart screenshot. Future improvement ke liye.'),
            q('Win rate kya hai?', ['Total trades', 'Winning trades ÷ Total trades × 100', 'Loss percentage', 'Average profit'], 1, 'Win rate = winning trades / total trades. 50% win rate with 1:2 R:R = profitable system.'),
            q('Average win:average loss ratio important kyun hai?', ['Not important', 'Even with low win rate, good ratio can be profitable', 'Only win rate matters', 'No reason'], 1, 'Agar average win 2x average loss hai, toh 40% win rate se bhi profitable ho sakte ho.'),
          ]),
        },
      },
      {
        title: 'Setting Stop Loss',
        description: 'Stop Loss kyun zaroori hai? Different SL methods — fixed %, support-based, ATR-based.',
        videoUrl: 'https://www.youtube.com/embed/z9YqVhJzYOE',
        duration: 14,
        xpReward: 15,
        order: 3,
        challenge: {
          title: 'Stop Loss Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 15,
          coinReward: 10,
          questions: JSON.stringify([
            q('Stop Loss kyun zaroori hai?', ['Optional hai', 'Capital protection — bada loss se bachata hai', 'Only for beginners', 'Broker force karta hai'], 1, 'SL capital ko protect karta hai — bina SL ke ek bada loss account wipe out kar sakta hai.'),
            q('Support-based SL kahan rakhte hain?', ['Random', 'Just below the support level', 'Very far', 'No SL'], 1, 'Support-based SL = just below the support. Agar support breaks, trade invalid — SL trigger.'),
            q('Trailing Stop Loss kya hai?', ['Fixed SL', 'SL ko price ke saath move karna — profits lock karta hai', 'No SL', 'Daily change SL'], 1, 'Trailing SL price ke saath move karta hai — as price goes up, SL goes up. Profit lock hota hai.'),
          ]),
        },
      },
      {
        title: 'Using Paper Trades to Learn',
        description: 'Paper trading se maximum learning kaise karein? Mistakes se seekhne ka process.',
        videoUrl: 'https://www.youtube.com/embed/LvDmR5S9tME',
        duration: 12,
        xpReward: 12,
        order: 4,
        challenge: {
          title: 'Learning from Paper Trading Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 12,
          coinReward: 10,
          questions: JSON.stringify([
            q('Paper trading mein mistakes kyun bhare hain?', ['Traders careless hain', 'No real money risk = emotions nahi, discipline chhod dete hain', 'Market is different', 'Virtual money fake hai'], 1, 'Bina real risk ke emotions nahi aate — traders overtrade, no SL, bad habits develop hote hain.'),
            q('Paper trading se real trading pe kab shift karein?', ['1 din baad', 'Jab consistent profit 2-3 months tak aa raha ho', 'Kabhi nahi', 'Random'], 1, '2-3 months consistent profit + proper discipline + good win rate — tab real trading start karo.'),
            q('Paper trading mein overtrading ka kya solution hai?', ['No solution', 'Daily trade limit set karo, same rules follow karo', 'More trades', 'Ignore'], 1, 'Daily max trades limit + same rules as real trading = paper trading ka maximum benefit.'),
          ]),
        },
      },
      {
        title: 'Building Consistency',
        description: 'Consistent returns kaise banayein? Process follow karo, results automatic aayenge.',
        videoUrl: 'https://www.youtube.com/embed/MfN5sK1tBRY',
        duration: 14,
        xpReward: 18,
        order: 5,
        challenge: {
          title: 'Building Consistency Quiz',
          type: 'QUIZ',
          passingScore: 70,
          xpReward: 18,
          coinReward: 15,
          questions: JSON.stringify([
            q('Consistency trading mein kyun important hai?', ['Not important', 'One big win nahi chahiye — consistent small wins = long term profit', 'Only big wins matter', 'Random is fine'], 1, 'Consistency > one big win. Regular small profits compound hote hain — ye real trading ka goal hai.'),
            q('Trading plan mein kya hona chahiye?', ['Nothing specific', 'Entry rules, exit rules, risk management, market conditions', 'Only entry', 'Only profit target'], 1, 'Complete trading plan = entry/exit rules, risk rules, which markets to trade, timeframes, etc.'),
            q('Agar 5 consecutive losses hain toh?', ['Revenge trading', 'Stop, review plan, stick to rules — don\'t overcompensate', 'Double the size', 'Quit trading'], 1, '5 losses = stop, review, stick to plan. Revenge trading = bigger losses. Discipline is everything.'),
          ]),
        },
      },
    ],
  },
];

// ── Badges to seed ──────────────────────────────────────────────
const SEED_BADGES = [
  { name: 'First Lesson Completed', description: 'Pehla lesson complete kiya! 🎉 Shuruat achhi hai!', icon: '📚', category: 'LESSON', xpReward: 50 },
  { name: '3-Day Streak', description: '3 din continuously seekha — lagbhag habit ban raha hai!', icon: '🔥', category: 'STREAK', xpReward: 100 },
  { name: '7-Day Streak', description: '7 din streak! Ab toh serious learner ban gaye ho!', icon: '🔥', category: 'STREAK', xpReward: 250 },
  { name: '30-Day Streak', description: '30 din streak! Legendary dedication — diamond learner! 💎', icon: '💎', category: 'STREAK', xpReward: 1000 },
  { name: 'Quiz Master', description: '10 perfect scores (100%) in quizzes! Genius level! 🧠', icon: '🎯', category: 'QUIZ', xpReward: 500 },
  { name: 'Course Completer', description: 'Pura ek course complete kiya! Commitment dikhaaya!', icon: '📈', category: 'ACHIEVEMENT', xpReward: 300 },
  { name: 'Math Genius', description: 'Position sizing aur calculation quizzes mein perfect! Calculator-free! 🧮', icon: '🧮', category: 'QUIZ', xpReward: 200 },
  { name: 'Top Learner', description: 'Leaderboard pe top 10 mein aaye! Elite club! 🏆', icon: '🏆', category: 'SPECIAL', xpReward: 500 },
  { name: '1000 XP Club', description: '1000 XP cross kar liya! Dedicated learner hai tu! 💰', icon: '💰', category: 'ACHIEVEMENT', xpReward: 100 },
  { name: 'Speed Demon', description: 'Daily quiz 60 seconds mein complete kiya! Flash speed! ⚡', icon: '⚡', category: 'QUIZ', xpReward: 200 },
];

// ── Level thresholds ────────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000];

export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

// ── Helper: get or create gamification record ───────────────────
async function getOrCreateGamification(userId: string) {
  return db.userGamification.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      xp: 0,
      level: 1,
      coins: 0,
      streak: 0,
      longestStreak: 0,
      streakFreeze: 1,
      lessonsCompleted: 0,
      quizzesPassed: 0,
      perfectQuizzes: 0,
    },
  });
}

// ── Helper: update streak logic ─────────────────────────────────
async function updateStreak(userId: string, gam: Awaited<ReturnType<typeof getOrCreateGamification>>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastAct = gam.lastActivity ? new Date(gam.lastActivity) : null;
  if (lastAct) lastAct.setHours(0, 0, 0, 0);

  let newStreak = gam.streak;
  let newLongest = gam.longestStreak;
  let updatedLastActivity = gam.lastActivity;

  if (!lastAct || lastAct.getTime() < today.getTime()) {
    if (lastAct && lastAct.getTime() === yesterday.getTime()) {
      // Consecutive day — increment streak
      newStreak = gam.streak + 1;
    } else if (lastAct && lastAct.getTime() < yesterday.getTime()) {
      // Gap > 1 day — check streak freeze
      if (gam.streakFreeze > 0) {
        // Streak preserved (freeze not consumed here — only in explicit API call)
      } else {
        newStreak = 0; // Reset streak
      }
    } else {
      // First activity ever or same day
      newStreak = gam.streak === 0 ? 1 : gam.streak;
    }
    updatedLastActivity = new Date();
  }

  if (newStreak > newLongest) newLongest = newStreak;

  return { newStreak, newLongest, updatedLastActivity };
}

// ── Helper: check and award badges ──────────────────────────────
async function checkAndAwardBadges(userId: string, gam: Awaited<ReturnType<typeof getOrCreateGamification>>, badges: typeof SEED_BADGES) {
  const earnedBadges: string[] = [];
  const allDbBadges = await db.badge.findMany();
  const badgeMap = new Map(allDbBadges.map(b => [b.name, b]));
  const userBadges = await db.userBadge.findMany({ where: { userId } });
  const earnedSet = new Set(userBadges.map(ub => ub.badgeId));

  // Check streak badges
  if (gam.streak >= 3) {
    const b = badgeMap.get('3-Day Streak');
    if (b && !earnedSet.has(b.id)) {
      await db.userBadge.create({ data: { userId, badgeId: b.id } });
      earnedBadges.push(b.name);
    }
  }
  if (gam.streak >= 7) {
    const b = badgeMap.get('7-Day Streak');
    if (b && !earnedSet.has(b.id)) {
      await db.userBadge.create({ data: { userId, badgeId: b.id } });
      earnedBadges.push(b.name);
    }
  }
  if (gam.streak >= 30) {
    const b = badgeMap.get('30-Day Streak');
    if (b && !earnedSet.has(b.id)) {
      await db.userBadge.create({ data: { userId, badgeId: b.id } });
      earnedBadges.push(b.name);
    }
  }

  // Check quiz badges
  if (gam.perfectQuizzes >= 10) {
    const b = badgeMap.get('Quiz Master');
    if (b && !earnedSet.has(b.id)) {
      await db.userBadge.create({ data: { userId, badgeId: b.id } });
      earnedBadges.push(b.name);
    }
  }

  // Check XP badge
  if (gam.xp >= 1000) {
    const b = badgeMap.get('1000 XP Club');
    if (b && !earnedSet.has(b.id)) {
      await db.userBadge.create({ data: { userId, badgeId: b.id } });
      earnedBadges.push(b.name);
    }
  }

  return earnedBadges;
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/learning — List all paths + seed if empty + gamification stats
// ═══════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // ── Seed learning paths if empty ──
    const pathCount = await db.learningPath.count();
    if (pathCount === 0) {
      for (const p of SEED_PATHS) {
        const totalXP = p.modules.reduce((sum, m) => sum + m.xpReward + (m.challenge?.xpReward || 0), 0);
        await db.learningPath.create({
          data: {
            title: p.title,
            description: p.description,
            level: p.level,
            category: p.category,
            icon: p.icon,
            order: p.order,
            isPremium: p.isPremium,
            totalXP,
            modules: {
              create: p.modules.map((m) => ({
                title: m.title,
                description: m.description,
                videoUrl: m.videoUrl,
                duration: m.duration,
                xpReward: m.xpReward,
                order: m.order,
                challenges: m.challenge
                  ? {
                      create: {
                        title: m.challenge.title,
                        type: m.challenge.type,
                        questions: m.challenge.questions,
                        passingScore: m.challenge.passingScore,
                        xpReward: m.challenge.xpReward,
                        coinReward: m.challenge.coinReward,
                      },
                    }
                  : undefined,
              })),
            },
          },
        });
      }
    }

    // ── Seed badges if empty ──
    const badgeCount = await db.badge.count();
    if (badgeCount === 0) {
      for (const b of SEED_BADGES) {
        await db.badge.create({ data: b });
      }
    }

    // ── Fetch paths with user progress ──
    const paths = await db.learningPath.findMany({
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            progress: { where: { userId: auth.userId } },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    const pathsWithProgress = paths.map((path) => {
      const totalModules = path.modules.length;
      const completedModules = path.modules.filter(
        (m) => m.progress[0]?.status === 'COMPLETED'
      ).length;

      return {
        ...path,
        modules: path.modules.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          videoUrl: m.videoUrl,
          duration: m.duration,
          xpReward: m.xpReward,
          order: m.order,
          status: m.progress[0]?.status || 'NOT_STARTED',
          score: m.progress[0]?.score ?? null,
          completedAt: m.progress[0]?.completedAt ?? null,
        })),
        totalModules,
        completedModules,
        progress: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
      };
    });

    // ── Gamification stats ──
    const gam = await getOrCreateGamification(auth.userId);
    const level = calculateLevel(gam.xp);
    const earnedBadgeCount = await db.userBadge.count({ where: { userId: auth.userId } });

    return NextResponse.json({
      success: true,
      data: {
        paths: pathsWithProgress,
        gamification: {
          xp: gam.xp,
          level,
          coins: gam.coins,
          streak: gam.streak,
          longestStreak: gam.longestStreak,
          streakFreeze: gam.streakFreeze,
          lessonsCompleted: gam.lessonsCompleted,
          quizzesPassed: gam.quizzesPassed,
          perfectQuizzes: gam.perfectQuizzes,
          badgesEarned: earnedBadgeCount,
          lastActivity: gam.lastActivity,
        },
      },
    });
  } catch (error) {
    console.error('Fetch learning paths error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch learning paths' }, { status: 500 });
  }
}

// Export helpers for other routes
export { getOrCreateGamification, updateStreak, checkAndAwardBadges, calculateLevel, LEVEL_THRESHOLDS, SEED_BADGES };
