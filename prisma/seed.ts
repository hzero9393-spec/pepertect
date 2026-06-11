import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Override env vars with .env file (shell env may have stale DATABASE_URL)
config({ override: true })

// Create PrismaClient with Turso/libSQL adapter if available
function createSeedClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl && tursoAuthToken) {
    console.log('🔌 Using Turso/libSQL adapter for seeding...')
    // Prisma v7 adapter factory pattern - pass config directly
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })

    return new PrismaClient({
      adapter,
    })
  }

  // Fallback to standard PrismaClient (for local SQLite)
  console.log('🔌 Using standard PrismaClient for seeding...')
  return new PrismaClient()
}

const prisma = createSeedClient()

async function main() {
  console.log('🌱 Seeding Pepertect database...')

  // Clean up existing data (order matters due to relations)
  console.log('🧹 Cleaning existing data...')
  await prisma.learningModule.deleteMany()
  await prisma.learningPath.deleteMany()
  await prisma.challengeParticipation.deleteMany()
  await prisma.challenge.deleteMany()
  await prisma.marketBreadth.deleteMany()
  await prisma.fnOBanEntry.deleteMany()
  await prisma.marketHoliday.deleteMany()
  await prisma.sector.deleteMany()
  await prisma.option.deleteMany()
  await prisma.future.deleteMany()
  await prisma.stockHistory.deleteMany()
  await prisma.stock.deleteMany()
  await prisma.indexHistory.deleteMany()
  await prisma.index.deleteMany()

  // ============================================================
  // SEED INDICES
  // ============================================================
  console.log('📊 Seeding indices...')
  const indicesData = [
    {
      symbol: 'NIFTY',
      name: 'NIFTY 50',
      lotSize: 50,
      expiryDay: 'Thursday',
      tickSize: 0.05,
      strikeInterval: 50,
      currentPrice: 19500,
      open: 19420,
      high: 19580,
      low: 19380,
      previousClose: 19395,
      change: 105,
      changePercent: 0.54,
      volume: 245000000,
    },
    {
      symbol: 'BANKNIFTY',
      name: 'BANK NIFTY',
      lotSize: 25,
      expiryDay: 'Wednesday',
      tickSize: 0.05,
      strikeInterval: 100,
      currentPrice: 44250,
      open: 44100,
      high: 44450,
      low: 44050,
      previousClose: 44080,
      change: 170,
      changePercent: 0.39,
      volume: 185000000,
    },
    {
      symbol: 'SENSEX',
      name: 'S&P BSE SENSEX',
      lotSize: 15,
      expiryDay: 'Thursday',
      tickSize: 0.05,
      strikeInterval: 100,
      currentPrice: 65200,
      open: 65050,
      high: 65450,
      low: 64900,
      previousClose: 64980,
      change: 220,
      changePercent: 0.34,
      volume: 95000000,
    },
    {
      symbol: 'FINNIFTY',
      name: 'NIFTY FINANCIAL SERVICES',
      lotSize: 40,
      expiryDay: 'Tuesday',
      tickSize: 0.05,
      strikeInterval: 50,
      currentPrice: 20150,
      open: 20080,
      high: 20220,
      low: 20020,
      previousClose: 20050,
      change: 100,
      changePercent: 0.5,
      volume: 72000000,
    },
    {
      symbol: 'MIDCPNIFTY',
      name: 'NIFTY MIDCAP SELECT',
      lotSize: 75,
      expiryDay: 'Thursday',
      tickSize: 0.05,
      strikeInterval: 50,
      currentPrice: 12500,
      open: 12450,
      high: 12580,
      low: 12420,
      previousClose: 12460,
      change: 40,
      changePercent: 0.32,
      volume: 58000000,
    },
  ]
  const indices: Record<string, string> = {}
  for (const data of indicesData) {
    const idx = await prisma.index.create({ data })
    indices[data.symbol] = idx.id
    console.log(`  ✓ ${data.symbol}: ₹${data.currentPrice}`)
  }

  // ============================================================
  // SEED STOCKS
  // ============================================================
  console.log('📈 Seeding stocks...')
  const stocksData = [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', currentPrice: 2450, lotSize: 250, change: 32.5, changePercent: 1.34, isin: 'INE002A01018', industry: 'Refineries', marketCap: 1660000, peRatio: 27.8, dividendYield: 0.35, faceValue: 10, week52High: 2650, week52Low: 2020, open: 2420, high: 2475, low: 2410, previousClose: 2417.5, volume: 12500000 },
    { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', currentPrice: 3560, lotSize: 150, change: -28.4, changePercent: -0.79, isin: 'INE467B01029', industry: 'IT Services', marketCap: 1300000, peRatio: 32.5, dividendYield: 1.25, faceValue: 1, week52High: 3890, week52Low: 3050, open: 3585, high: 3600, low: 3540, previousClose: 3588.4, volume: 4200000 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', currentPrice: 1680, lotSize: 300, change: 14.2, changePercent: 0.85, isin: 'INE040A01034', industry: 'Banks', marketCap: 1280000, peRatio: 21.2, dividendYield: 1.1, faceValue: 1, week52High: 1790, week52Low: 1430, open: 1670, high: 1695, low: 1665, previousClose: 1665.8, volume: 8700000 },
    { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', currentPrice: 1520, lotSize: 200, change: 18.6, changePercent: 1.24, isin: 'INE009A01021', industry: 'IT Services', marketCap: 632000, peRatio: 28.4, dividendYield: 2.3, faceValue: 5, week52High: 1680, week52Low: 1310, open: 1505, high: 1535, low: 1500, previousClose: 1501.4, volume: 9500000 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', currentPrice: 1245, lotSize: 275, change: 8.75, changePercent: 0.71, isin: 'INE090A01021', industry: 'Banks', marketCap: 875000, peRatio: 19.8, dividendYield: 0.85, faceValue: 2, week52High: 1340, week52Low: 1020, open: 1240, high: 1258, low: 1235, previousClose: 1236.25, volume: 11200000 },
    { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', currentPrice: 620, lotSize: 350, change: -5.3, changePercent: -0.85, isin: 'INE062A01020', industry: 'Banks', marketCap: 554000, peRatio: 10.2, dividendYield: 1.55, faceValue: 1, week52High: 690, week52Low: 520, open: 628, high: 632, low: 615, previousClose: 625.3, volume: 18500000 },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', currentPrice: 1580, lotSize: 400, change: 22.1, changePercent: 1.42, isin: 'INE397D01024', industry: 'Telecom Services', marketCap: 920000, peRatio: 75.5, dividendYield: 0.35, faceValue: 5, week52High: 1680, week52Low: 1250, open: 1560, high: 1595, low: 1555, previousClose: 1557.9, volume: 6800000 },
    { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', currentPrice: 465, lotSize: 500, change: 3.2, changePercent: 0.69, isin: 'INE054A01016', industry: 'Cigarettes', marketCap: 580000, peRatio: 26.8, dividendYield: 3.1, faceValue: 1, week52High: 510, week52Low: 395, open: 463, high: 470, low: 461, previousClose: 461.8, volume: 22000000 },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', currentPrice: 2520, lotSize: 100, change: -15.8, changePercent: -0.62, isin: 'INE030A01027', industry: 'Household Products', marketCap: 592000, peRatio: 58.3, dividendYield: 1.45, faceValue: 1, week52High: 2780, week52Low: 2220, open: 2535, high: 2545, low: 2510, previousClose: 2535.8, volume: 3200000 },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Construction', currentPrice: 3540, lotSize: 125, change: 45.2, changePercent: 1.29, isin: 'INE018A01030', industry: 'Engineering', marketCap: 486000, peRatio: 35.6, dividendYield: 0.95, faceValue: 2, week52High: 3720, week52Low: 2650, open: 3500, high: 3570, low: 3490, previousClose: 3494.8, volume: 4500000 },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', currentPrice: 1140, lotSize: 300, change: -8.6, changePercent: -0.75, isin: 'INE238A01034', industry: 'Banks', marketCap: 352000, peRatio: 14.5, dividendYield: 0.6, faceValue: 2, week52High: 1250, week52Low: 940, open: 1150, high: 1158, low: 1132, previousClose: 1148.6, volume: 14200000 },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', currentPrice: 1780, lotSize: 200, change: 12.4, changePercent: 0.7, isin: 'INE237A01028', industry: 'Banks', marketCap: 354000, peRatio: 22.1, dividendYield: 0.1, faceValue: 5, week52High: 1950, week52Low: 1520, open: 1770, high: 1795, low: 1765, previousClose: 1767.6, volume: 5800000 },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Auto', currentPrice: 12450, lotSize: 150, change: 185, changePercent: 1.51, isin: 'INE585B01010', industry: 'Automobiles', marketCap: 388000, peRatio: 30.2, dividendYield: 0.55, faceValue: 5, week52High: 13200, week52Low: 9850, open: 12300, high: 12550, low: 12280, previousClose: 12265, volume: 1800000 },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Auto', currentPrice: 980, lotSize: 400, change: 14.5, changePercent: 1.5, isin: 'INE155A01022', industry: 'Automobiles', marketCap: 362000, peRatio: 8.5, dividendYield: 1.2, faceValue: 2, week52High: 1080, week52Low: 680, open: 968, high: 992, low: 964, previousClose: 965.5, volume: 25000000 },
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metal', currentPrice: 152, lotSize: 500, change: -2.8, changePercent: -1.81, isin: 'INE081A01010', industry: 'Iron & Steel', marketCap: 186000, peRatio: 12.4, dividendYield: 2.1, faceValue: 1, week52High: 175, week52Low: 118, open: 155, high: 156, low: 150, previousClose: 154.8, volume: 35000000 },
    { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', currentPrice: 415, lotSize: 300, change: -3.6, changePercent: -0.86, isin: 'INE075A01011', industry: 'IT Services', marketCap: 216000, peRatio: 22.5, dividendYield: 0.2, faceValue: 2, week52High: 480, week52Low: 355, open: 420, high: 422, low: 412, previousClose: 418.6, volume: 15000000 },
    { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', currentPrice: 1640, lotSize: 200, change: 24.5, changePercent: 1.52, isin: 'INE860A01027', industry: 'IT Services', marketCap: 445000, peRatio: 26.3, dividendYield: 3.1, faceValue: 2, week52High: 1750, week52Low: 1320, open: 1620, high: 1655, low: 1615, previousClose: 1615.5, volume: 6200000 },
    { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Paint', currentPrice: 2890, lotSize: 150, change: -22.5, changePercent: -0.77, isin: 'INE021A01026', industry: 'Paints', marketCap: 277000, peRatio: 55.2, dividendYield: 1.15, faceValue: 1, week52High: 3250, week52Low: 2550, open: 2910, high: 2925, low: 2875, previousClose: 2912.5, volume: 2800000 },
    { symbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG', currentPrice: 2540, lotSize: 50, change: 8.5, changePercent: 0.34, isin: 'INE239A01016', industry: 'Food Products', marketCap: 245000, peRatio: 72.5, dividendYield: 0.85, faceValue: 10, week52High: 2750, week52Low: 2200, open: 2535, high: 2555, low: 2530, previousClose: 2531.5, volume: 1200000 },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Energy', currentPrice: 265, lotSize: 500, change: 4.2, changePercent: 1.61, isin: 'INE213A01029', industry: 'Oil Exploration', marketCap: 334000, peRatio: 8.2, dividendYield: 3.8, faceValue: 5, week52High: 310, week52Low: 210, open: 261, high: 268, low: 260, previousClose: 260.8, volume: 28000000 },
  ]

  for (const data of stocksData) {
    await prisma.stock.create({
      data: {
        ...data,
        exchange: 'NSE',
        isFuturesAvailable: true,
        isOptionsAvailable: true,
        circuitLimit: 20,
        strikeInterval: Math.round(data.currentPrice / 50) * 5 || 10,
        isActive: true,
      },
    })
    console.log(`  ✓ ${data.symbol}: ₹${data.currentPrice} (${data.changePercent > 0 ? '+' : ''}${data.changePercent}%)`)
  }

  // ============================================================
  // SEED SECTORS
  // ============================================================
  console.log('🏭 Seeding sectors...')
  const sectorsData = [
    { name: 'Banking', indexSymbol: 'BANKNIFTY', todayChange: 0.52, topStockSymbol: 'HDFCBANK', topStockChange: 0.85 },
    { name: 'IT', indexSymbol: 'NIFTYIT', todayChange: 0.28, topStockSymbol: 'INFY', topStockChange: 1.24 },
    { name: 'Pharma', indexSymbol: 'NIFTYPHARMA', todayChange: -0.35, topStockSymbol: 'SUNPHARMA', topStockChange: 1.2 },
    { name: 'Auto', indexSymbol: 'NIFTYAUTO', todayChange: 1.05, topStockSymbol: 'MARUTI', topStockChange: 1.51 },
    { name: 'FMCG', indexSymbol: 'NIFTYFMCG', todayChange: 0.12, topStockSymbol: 'ITC', topStockChange: 0.69 },
    { name: 'Metal', indexSymbol: 'NIFTYMETAL', todayChange: -0.85, topStockSymbol: 'TATASTEEL', topStockChange: -1.81 },
    { name: 'Energy', indexSymbol: 'NIFTYENERGY', todayChange: 1.22, topStockSymbol: 'RELIANCE', topStockChange: 1.34 },
    { name: 'Realty', indexSymbol: 'NIFTYREALTY', todayChange: 0.68, topStockSymbol: 'DLF', topStockChange: 2.1 },
  ]

  for (const data of sectorsData) {
    await prisma.sector.create({ data })
    console.log(`  ✓ ${data.name}: ${data.todayChange > 0 ? '+' : ''}${data.todayChange}%`)
  }

  // ============================================================
  // SEED MARKET HOLIDAYS
  // ============================================================
  console.log('📅 Seeding market holidays...')
  const holidaysData = [
    { name: 'Republic Day', date: new Date('2026-01-26'), isMuhurat: false },
    { name: 'Mahashivratri', date: new Date('2026-02-16'), isMuhurat: false },
    { name: 'Holi', date: new Date('2026-03-04'), isMuhurat: false },
    { name: 'Id-Ul-Fitr (Eid)', date: new Date('2026-03-22'), isMuhurat: false },
    { name: 'Shri Mahavir Jayanti', date: new Date('2026-04-30'), isMuhurat: false },
    { name: 'Good Friday', date: new Date('2026-04-03'), isMuhurat: false },
    { name: 'Independence Day', date: new Date('2026-08-15'), isMuhurat: false },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), isMuhurat: false },
    { name: 'Dussehra', date: new Date('2026-10-20'), isMuhurat: false },
    { name: 'Diwali - Muhurat Trading', date: new Date('2026-11-08'), isMuhurat: true, muhuratStart: '18:15', muhuratEnd: '19:15' },
    { name: 'Guru Nanak Jayanti', date: new Date('2026-11-15'), isMuhurat: false },
    { name: 'Christmas', date: new Date('2026-12-25'), isMuhurat: false },
  ]

  for (const data of holidaysData) {
    await prisma.marketHoliday.create({ data })
    console.log(`  ✓ ${data.name}: ${data.date.toISOString().split('T')[0]}${data.isMuhurat ? ' (Muhurat)' : ''}`)
  }

  // ============================================================
  // SEED F&O BAN ENTRIES
  // ============================================================
  console.log('🚫 Seeding F&O ban entries...')
  const banEntries = [
    { stockSymbol: 'DELTACORP', stockName: 'Delta Corp Ltd', banStartDate: new Date('2025-03-01'), reason: 'Open interest crosses 95% of MWPL' },
    { stockSymbol: 'GNFC', stockName: 'Gujarat Narmada Valley Fertilizers & Chemicals Ltd', banStartDate: new Date('2025-03-03'), reason: 'Open interest crosses 95% of MWPL' },
  ]

  for (const data of banEntries) {
    await prisma.fnOBanEntry.create({ data })
    console.log(`  ✓ ${data.stockSymbol}: ${data.reason}`)
  }

  // Update the stock entries to mark as banned
  await prisma.stock.update({
    where: { symbol: 'DELTACORP' },
    data: { isFnoBan: true, banStartDate: new Date('2025-03-01') },
  }).catch(() => {
    console.log('  ⚠ DELTACORP stock not in stock list (expected for ban-only entries)')
  })
  await prisma.stock.update({
    where: { symbol: 'GNFC' },
    data: { isFnoBan: true, banStartDate: new Date('2025-03-03') },
  }).catch(() => {
    console.log('  ⚠ GNFC stock not in stock list (expected for ban-only entries)')
  })

  // ============================================================
  // SEED OPTIONS DATA (NIFTY Option Chain)
  // ============================================================
  console.log('🔲 Seeding NIFTY option chain...')
  const spotPrice = 19500
  const strikeInterval = 50
  const expiryDate = new Date('2025-03-27') // Nearest Thursday

  // Generate strikes from 19000 to 20000 (21 strikes)
  const strikes: number[] = []
  for (let s = 19000; s <= 20000; s += strikeInterval) {
    strikes.push(s)
  }

  // Helper: Approximate option pricing
  function approximateOptionPrice(
    strike: number,
    spot: number,
    type: 'CE' | 'PE',
    daysToExpiry: number = 5,
    iv: number = 14
  ): { ltp: number; delta: number; theta: number; gamma: number; vega: number } {
    const intrinsic = type === 'CE' ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0)
    const timeValue = Math.max(
      spot * (iv / 100) * Math.sqrt(daysToExpiry / 365) * 0.4 * Math.exp(-Math.pow(Math.log(spot / strike), 2) / 2),
      1
    )
    const ltp = Math.round((intrinsic + timeValue) * 100) / 100

    // Approximate Greeks
    const moneyness = spot / strike
    const isITM = type === 'CE' ? strike < spot : strike > spot
    const delta = type === 'CE'
      ? Math.round(Math.min(1, Math.max(0, 0.5 + (moneyness - 1) * 2.5)) * 100) / 100
      : Math.round(Math.min(0, Math.max(-1, -0.5 + (moneyness - 1) * 2.5)) * 100) / 100
    const gamma = Math.round(Math.max(0.001, 0.005 * (1 - Math.abs(moneyness - 1) * 3)) * 10000) / 10000
    const theta = Math.round(-ltp * (iv / 100) * (1 / 365) * (isITM ? 0.5 : 1.5) * 100) / 100
    const vega = Math.round(ltp * 0.1 * Math.sqrt(daysToExpiry / 365) * 100) / 100

    return { ltp: Math.max(ltp, 0.05), delta, theta, gamma, vega }
  }

  const daysToExpiry = 5

  for (const strike of strikes) {
    for (const optionType of ['CE', 'PE'] as const) {
      const isITM = optionType === 'CE' ? strike < spotPrice : strike > spotPrice
      const distance = Math.abs(strike - spotPrice)
      const { ltp, delta, theta, gamma, vega } = approximateOptionPrice(strike, spotPrice, optionType, daysToExpiry)

      // OI tends to be higher at round numbers and ATM
      const baseOI = Math.round((150000 - distance * 8) + Math.random() * 30000)
      const oiChange = Math.round((Math.random() - 0.4) * 20000)
      const volume = Math.round(baseOI * (0.3 + Math.random() * 0.5))
      const iv = Math.round((14 + (distance / spotPrice) * 100 * 0.5 + Math.random() * 3) * 100) / 100

      const previousClose = Math.max(ltp * (0.9 + Math.random() * 0.2), 0.05)
      const change = Math.round((ltp - previousClose) * 100) / 100
      const changePercent = previousClose > 0 ? Math.round((change / previousClose) * 10000) / 100 : 0

      await prisma.option.create({
        data: {
          underlying: 'NIFTY',
          underlyingType: 'INDEX',
          underlyingPrice: spotPrice,
          expiryDate,
          expiryType: 'WEEKLY',
          strikePrice: strike,
          optionType,
          ltp,
          previousClose: Math.round(previousClose * 100) / 100,
          change,
          changePercent,
          openInterest: Math.max(baseOI, 1000),
          oiChange,
          oiChangePercent: Math.round((oiChange / Math.max(baseOI, 1)) * 10000) / 100,
          volume,
          impliedVolatility: iv,
          delta,
          gamma,
          theta,
          vega,
          inTheMoney: isITM,
          isActive: true,
        },
      })
    }
    console.log(`  ✓ Strike ${strike}: CE & PE created`)
  }

  // ============================================================
  // SEED FUTURES DATA
  // ============================================================
  console.log('📉 Seeding futures...')
  const futuresData = [
    {
      underlying: 'NIFTY',
      underlyingType: 'INDEX' as const,
      expiryDate: new Date('2025-03-27'),
      expiryType: 'MONTHLY' as const,
      lotSize: 50,
      ltp: 19545,
      open: 19460,
      high: 19610,
      low: 19420,
      previousClose: 19425,
      change: 120,
      changePercent: 0.62,
      openInterest: 12500000,
      oiChange: 850000,
      volume: 32500000,
      basis: 45,
      marginPercent: 8.5,
    },
    {
      underlying: 'BANKNIFTY',
      underlyingType: 'INDEX' as const,
      expiryDate: new Date('2025-03-26'),
      expiryType: 'MONTHLY' as const,
      lotSize: 25,
      ltp: 44320,
      open: 44150,
      high: 44520,
      low: 44100,
      previousClose: 44150,
      change: 170,
      changePercent: 0.39,
      openInterest: 8200000,
      oiChange: 420000,
      volume: 22500000,
      basis: 70,
      marginPercent: 9.2,
    },
    {
      underlying: 'SENSEX',
      underlyingType: 'INDEX' as const,
      expiryDate: new Date('2025-03-27'),
      expiryType: 'MONTHLY' as const,
      lotSize: 15,
      ltp: 65280,
      open: 65100,
      high: 65530,
      low: 64950,
      previousClose: 65020,
      change: 260,
      changePercent: 0.4,
      openInterest: 2100000,
      oiChange: 125000,
      volume: 8500000,
      basis: 80,
      marginPercent: 8.8,
    },
    {
      underlying: 'FINNIFTY',
      underlyingType: 'INDEX' as const,
      expiryDate: new Date('2025-03-25'),
      expiryType: 'MONTHLY' as const,
      lotSize: 40,
      ltp: 20210,
      open: 20100,
      high: 20280,
      low: 20040,
      previousClose: 20060,
      change: 150,
      changePercent: 0.75,
      openInterest: 3500000,
      oiChange: 180000,
      volume: 12000000,
      basis: 60,
      marginPercent: 9.5,
    },
    {
      underlying: 'MIDCPNIFTY',
      underlyingType: 'INDEX' as const,
      expiryDate: new Date('2025-03-27'),
      expiryType: 'MONTHLY' as const,
      lotSize: 75,
      ltp: 12550,
      open: 12470,
      high: 12610,
      low: 12440,
      previousClose: 12470,
      change: 80,
      changePercent: 0.64,
      openInterest: 2800000,
      oiChange: 150000,
      volume: 9500000,
      basis: 50,
      marginPercent: 10.0,
    },
  ]

  for (const data of futuresData) {
    await prisma.future.create({ data })
    console.log(`  ✓ ${data.underlying} Future: ₹${data.ltp} (basis: ₹${data.basis})`)
  }

  // ============================================================
  // SEED CHALLENGES
  // ============================================================
  console.log('🏆 Seeding challenges...')
  const challengesData = [
    {
      title: '30-Day Profit Sprint',
      description: 'Achieve the highest portfolio return in 30 days. Trade any segment - Equity, F&O, or Options. Only absolute returns matter. Risk it all or play it safe - your strategy, your call!',
      challengeType: 'RETURN_SPRINT' as const,
      targetMetric: 'return%',
      targetValue: 15,
      prize: '₹10,000 Virtual Premium Credits',
      prizeValue: 10000,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-31'),
      maxParticipants: 5000,
      currentParticipants: 2347,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Risk Manager Pro',
      description: 'Achieve the best risk-adjusted return over 14 days. Your Sharpe Ratio will determine your ranking. High returns with low drawdowns win this challenge.',
      challengeType: 'RISK_MANAGER' as const,
      targetMetric: 'max_drawdown',
      targetValue: -5,
      prize: '₹5,000 Virtual Premium Credits + Badge',
      prizeValue: 5000,
      startDate: new Date('2025-03-10'),
      endDate: new Date('2025-03-24'),
      maxParticipants: 3000,
      currentParticipants: 1256,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Volume Master',
      description: 'Execute the most number of trades across all segments in 7 days. Quantity meets quality - each profitable trade earns bonus points.',
      challengeType: 'VOLUME_MASTER' as const,
      targetMetric: 'volume',
      targetValue: 100,
      prize: '₹3,000 Virtual Premium Credits',
      prizeValue: 3000,
      startDate: new Date('2025-03-20'),
      endDate: new Date('2025-03-27'),
      maxParticipants: 10000,
      currentParticipants: 4521,
      status: 'UPCOMING' as const,
    },
  ]

  for (const data of challengesData) {
    await prisma.challenge.create({ data })
    console.log(`  ✓ ${data.title} (${data.status})`)
  }

  // ============================================================
  // SEED LEARNING PATHS
  // ============================================================
  console.log('📚 Seeding learning paths & modules...')

  // Beginner Trading (8 modules)
  const beginnerPath = await prisma.learningPath.create({
    data: {
      title: 'Beginner Trading',
      description: 'Start your trading journey with the fundamentals of Indian stock markets, from account setup to your first trade.',
      category: 'Beginner',
      totalModules: 8,
      estimatedHours: 12,
      difficulty: 'Beginner',
      accentColor: '#10b981',
      order: 1,
    },
  })

  const beginnerModules = [
    { title: 'Understanding the Indian Stock Market', description: 'Learn about NSE, BSE, and how the Indian market ecosystem works', duration: 45, order: 1 },
    { title: 'Demat & Trading Accounts', description: 'How to open and manage your Demat and trading accounts', duration: 30, order: 2 },
    { title: 'Market Timings & Sessions', description: 'Pre-open, normal trading, and post-close sessions explained', duration: 25, order: 3 },
    { title: 'Order Types - Market, Limit, SL', description: 'Master different order types and when to use each one', duration: 40, order: 4 },
    { title: 'Understanding Candlestick Charts', description: 'Read and interpret basic candlestick patterns', duration: 60, order: 5 },
    { title: 'Support & Resistance Levels', description: 'Identify key price levels where markets react', duration: 50, order: 6 },
    { title: 'Volume & Its Significance', description: 'How volume confirms price moves and signals reversals', duration: 35, order: 7 },
    { title: 'Placing Your First Paper Trade', description: 'Step-by-step guide to executing your first trade on Pepertect', duration: 45, order: 8 },
  ]

  for (const mod of beginnerModules) {
    await prisma.learningModule.create({
      data: {
        pathId: beginnerPath.id,
        title: mod.title,
        description: mod.description,
        duration: mod.duration,
        order: mod.order,
      },
    })
  }
  console.log(`  ✓ Beginner Trading: ${beginnerModules.length} modules`)

  // Technical Analysis (12 modules)
  const techPath = await prisma.learningPath.create({
    data: {
      title: 'Technical Analysis',
      description: 'Deep dive into chart patterns, indicators, and technical tools used by professional traders in Indian markets.',
      category: 'Technical Analysis',
      totalModules: 12,
      estimatedHours: 20,
      difficulty: 'Intermediate',
      accentColor: '#f59e0b',
      order: 2,
    },
  })

  const techModules = [
    { title: 'Chart Types & Timeframes', description: 'Line, bar, and candlestick charts across multiple timeframes', duration: 40, order: 1 },
    { title: 'Moving Averages (SMA & EMA)', description: 'Trend identification using simple and exponential moving averages', duration: 55, order: 2 },
    { title: 'RSI - Relative Strength Index', description: 'Overbought/oversold detection and divergence trading', duration: 50, order: 3 },
    { title: 'MACD - Moving Average Convergence Divergence', description: 'Momentum trading with MACD crossovers and histograms', duration: 55, order: 4 },
    { title: 'Bollinger Bands', description: 'Volatility-based trading using Bollinger Bands squeeze and expansion', duration: 45, order: 5 },
    { title: 'Chart Patterns - Reversal', description: 'Head & Shoulders, Double Top/Bottom, and other reversal patterns', duration: 60, order: 6 },
    { title: 'Chart Patterns - Continuation', description: 'Flags, Pennants, Triangles, and continuation setups', duration: 60, order: 7 },
    { title: 'Fibonacci Retracements', description: 'Using Fibonacci levels for entry, exit, and stop-loss placement', duration: 50, order: 8 },
    { title: 'Volume Profile & VWAP', description: 'Institutional trading levels using volume analysis', duration: 55, order: 9 },
    { title: 'Option Chain Analysis', description: 'Reading NIFTY and BANKNIFTY option chains for market direction', duration: 65, order: 10 },
    { title: 'Open Interest Analysis', description: 'OI buildup, unwinding, and their impact on price action', duration: 50, order: 11 },
    { title: 'Building a Trading System', description: 'Combining indicators into a rule-based trading system', duration: 70, order: 12 },
  ]

  for (const mod of techModules) {
    await prisma.learningModule.create({
      data: {
        pathId: techPath.id,
        title: mod.title,
        description: mod.description,
        duration: mod.duration,
        order: mod.order,
      },
    })
  }
  console.log(`  ✓ Technical Analysis: ${techModules.length} modules`)

  // Risk Management (6 modules)
  const riskPath = await prisma.learningPath.create({
    data: {
      title: 'Risk Management',
      description: 'Learn to protect your capital with position sizing, stop-loss strategies, and portfolio risk management techniques.',
      category: 'Risk Management',
      totalModules: 6,
      estimatedHours: 8,
      difficulty: 'Advanced',
      accentColor: '#ef4444',
      order: 3,
    },
  })

  const riskModules = [
    { title: 'Position Sizing & Capital Allocation', description: 'How much capital to risk per trade - the 1-2% rule', duration: 45, order: 1 },
    { title: 'Stop-Loss Strategies', description: 'Fixed, trailing, and technical stop-loss placement methods', duration: 50, order: 2 },
    { title: 'Risk-Reward Ratio', description: 'Calculating and maintaining favorable risk-reward ratios', duration: 40, order: 3 },
    { title: 'Margin & Leverage Management', description: 'Understanding SPAN margin, exposure margin, and leverage risks', duration: 55, order: 4 },
    { title: 'Portfolio Diversification', description: 'Correlation, sector allocation, and hedging strategies', duration: 45, order: 5 },
    { title: 'Trading Psychology & Discipline', description: 'Emotional control, FOMO, revenge trading, and maintaining discipline', duration: 50, order: 6 },
  ]

  for (const mod of riskModules) {
    await prisma.learningModule.create({
      data: {
        pathId: riskPath.id,
        title: mod.title,
        description: mod.description,
        duration: mod.duration,
        order: mod.order,
      },
    })
  }
  console.log(`  ✓ Risk Management: ${riskModules.length} modules`)

  // ============================================================
  // SEED MARKET BREADTH
  // ============================================================
  console.log('📊 Seeding market breadth...')
  await prisma.marketBreadth.create({
    data: {
      date: new Date(),
      advances: 1245,
      declines: 725,
      unchanged: 40,
      week52Highs: 85,
      week52Lows: 12,
      upperCircuit: 28,
      lowerCircuit: 5,
    },
  })
  console.log('  ✓ Market breadth for today seeded')

  // ============================================================
  // DONE
  // ============================================================
  console.log('\n✅ Pepertect database seeded successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Indices:      5`)
  console.log(`  Stocks:       20`)
  console.log(`  Sectors:      8`)
  console.log(`  Holidays:     12`)
  console.log(`  F&O Bans:     2`)
  console.log(`  Options:      ${strikes.length * 2} (NIFTY chain)`)
  console.log(`  Futures:      5`)
  console.log(`  Challenges:   3`)
  console.log(`  Learning:     3 paths (${beginnerModules.length + techModules.length + riskModules.length} modules)`)
  console.log(`  Breadth:      1`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
