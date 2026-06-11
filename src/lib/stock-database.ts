export interface StockInfo {
  symbol: string
  name: string
  sector: string
  industry: string
  isFno: boolean
  lotSize: number
  instrumentKey: string
}

export interface IndexConfig {
  name: string
  lotSize: number
  strikeInterval: number
  instrumentKey: string
}

// ─── STOCK DATABASE ────────────────────────────────────────────────────────────

export const STOCK_DATABASE: Record<string, StockInfo> = {
  // ── Banking ────────────────────────────────────────────────────────────────
  SBIN: { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', industry: 'Public Sector Banks', isFno: true, lotSize: 750, instrumentKey: 'NSE_EQ|INE062A01020' },
  HDFCBANK: { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 550, instrumentKey: 'NSE_EQ|INE040A01034' },
  KOTAKBANK: { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 400, instrumentKey: 'NSE_EQ|INE237A01028' },
  ICICIBANK: { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE090A01021' },
  AXISBANK: { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 900, instrumentKey: 'NSE_EQ|INE238A01034' },
  PNB: { symbol: 'PNB', name: 'Punjab National Bank', sector: 'Banking', industry: 'Public Sector Banks', isFno: true, lotSize: 4000, instrumentKey: 'NSE_EQ|INE160A01015' },
  BANKBARODA: { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Banking', industry: 'Public Sector Banks', isFno: true, lotSize: 2925, instrumentKey: 'NSE_EQ|INE028A01023' },
  CANBK: { symbol: 'CANBK', name: 'Canara Bank', sector: 'Banking', industry: 'Public Sector Banks', isFno: true, lotSize: 2800, instrumentKey: 'NSE_EQ|INE476A01014' },
  BANKINDIA: { symbol: 'BANKINDIA', name: 'Bank of India', sector: 'Banking', industry: 'Public Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE004A01021' },
  UNIONBANK: { symbol: 'UNIONBANK', name: 'Union Bank of India', sector: 'Banking', industry: 'Public Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE737C01016' },
  INDIANB: { symbol: 'INDIANB', name: 'Indian Bank', sector: 'Banking', industry: 'Public Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE569A01029' },
  IDBI: { symbol: 'IDBI', name: 'IDBI Bank Ltd', sector: 'Banking', industry: 'Public Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE087B01014' },
  SOUTHBANK: { symbol: 'SOUTHBANK', name: 'South Indian Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE058G01012' },
  KTKBANK: { symbol: 'KTKBANK', name: 'Karnataka Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE797A01012' },
  CUB: { symbol: 'CUB', name: 'City Union Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE585B01016' },
  DCBBANK: { symbol: 'DCBBANK', name: 'DCB Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE605D01014' },
  RBLBANK: { symbol: 'RBLBANK', name: 'RBL Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 2000, instrumentKey: 'NSE_EQ|INE874R01013' },
  INDUSINDBK: { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 600, instrumentKey: 'NSE_EQ|INE526A01015' },
  YESBANK: { symbol: 'YESBANK', name: 'Yes Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 7000, instrumentKey: 'NSE_EQ|INE528G01035' },
  IDFCFIRSTB: { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd', sector: 'Banking', industry: 'Private Sector Banks', isFno: true, lotSize: 5000, instrumentKey: 'NSE_EQ|INE092W01024' },
  IDFC: { symbol: 'IDFC', name: 'IDFC Ltd', sector: 'Banking', industry: 'Financial Services', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE047D01021' },

  // ── Finance ────────────────────────────────────────────────────────────────
  BAJFINANCE: { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Finance', industry: 'NBFC', isFno: true, lotSize: 125, instrumentKey: 'NSE_EQ|INE296A01024' },
  BAJAJFINSV: { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', sector: 'Finance', industry: 'Holdings & Investment', isFno: true, lotSize: 200, instrumentKey: 'NSE_EQ|INE298A01023' },
  BAJAJHLDNG: { symbol: 'BAJAJHLDNG', name: 'Bajaj Holdings & Investment Ltd', sector: 'Finance', industry: 'Holdings & Investment', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE298A01023' },
  SHRIRAMFIN: { symbol: 'SHRIRAMFIN', name: 'Shriram Transport Finance Co Ltd', sector: 'Finance', industry: 'NBFC', isFno: true, lotSize: 1200, instrumentKey: 'NSE_EQ|INE745A01023' },
  'M&MFIN': { symbol: 'M&MFIN', name: 'M&M Financial Services Ltd', sector: 'Finance', industry: 'NBFC', isFno: true, lotSize: 2500, instrumentKey: 'NSE_EQ|INE488C01012' },
  CHOLAFIN: { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment & Finance Co Ltd', sector: 'Finance', industry: 'NBFC', isFno: true, lotSize: 1250, instrumentKey: 'NSE_EQ|INE324A01012' },
  'L&TFH': { symbol: 'L&TFH', name: 'L&T Finance Holdings Ltd', sector: 'Finance', industry: 'NBFC', isFno: true, lotSize: 3000, instrumentKey: 'NSE_EQ|INE018C01026' },
  HDFCLIFE: { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', sector: 'Finance', industry: 'Life Insurance', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE744G01013' },
  SBILIFE: { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd', sector: 'Finance', industry: 'Life Insurance', isFno: true, lotSize: 550, instrumentKey: 'NSE_EQ|INE123B01016' },
  LICI: { symbol: 'LICI', name: 'Life Insurance Corporation of India', sector: 'Finance', industry: 'Life Insurance', isFno: true, lotSize: 1500, instrumentKey: 'NSE_EQ|INE051L01022' },

  // ── IT ─────────────────────────────────────────────────────────────────────
  TCS: { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', industry: 'IT Services', isFno: true, lotSize: 150, instrumentKey: 'NSE_EQ|INE467B01029' },
  INFY: { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', industry: 'IT Services', isFno: true, lotSize: 300, instrumentKey: 'NSE_EQ|INE009A01021' },
  WIPRO: { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', industry: 'IT Services', isFno: true, lotSize: 1500, instrumentKey: 'NSE_EQ|INE075A01022' },
  HCLTECH: { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', industry: 'IT Services', isFno: true, lotSize: 350, instrumentKey: 'NSE_EQ|INE860A01027' },
  TECHM: { symbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'IT', industry: 'IT Services', isFno: true, lotSize: 600, instrumentKey: 'NSE_EQ|INE669C01020' },

  // ── Oil & Gas ──────────────────────────────────────────────────────────────
  RELIANCE: { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Oil & Gas', industry: 'Refineries', isFno: true, lotSize: 250, instrumentKey: 'NSE_EQ|INE002A01018' },
  ONGC: { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Oil & Gas', industry: 'Oil Exploration', isFno: true, lotSize: 3000, instrumentKey: 'NSE_EQ|INE213A01029' },
  BPCL: { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Oil & Gas', industry: 'Refineries', isFno: true, lotSize: 900, instrumentKey: 'NSE_EQ|INE029A01011' },
  IOC: { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', sector: 'Oil & Gas', industry: 'Refineries', isFno: true, lotSize: 3000, instrumentKey: 'NSE_EQ|INE241A01010' },
  HINDPETRO: { symbol: 'HINDPETRO', name: 'Hindustan Petroleum Corporation Ltd', sector: 'Oil & Gas', industry: 'Refineries', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE094A01023' },
  PETRONET: { symbol: 'PETRONET', name: 'Petronet LNG Ltd', sector: 'Oil & Gas', industry: 'Gas Distribution', isFno: true, lotSize: 2400, instrumentKey: 'NSE_EQ|INE267F01011' },
  GAIL: { symbol: 'GAIL', name: 'GAIL (India) Ltd', sector: 'Oil & Gas', industry: 'Gas Distribution', isFno: true, lotSize: 3600, instrumentKey: 'NSE_EQ|INE129B01018' },
  OIL: { symbol: 'OIL', name: 'Oil India Ltd', sector: 'Oil & Gas', industry: 'Oil Exploration', isFno: true, lotSize: 3150, instrumentKey: 'NSE_EQ|INE274J01014' },
  ADANIGAS: { symbol: 'ADANIGAS', name: 'Adani Total Gas Ltd', sector: 'Oil & Gas', industry: 'Gas Distribution', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE894U01014' },
  IGL: { symbol: 'IGL', name: 'Indraprastha Gas Ltd', sector: 'Oil & Gas', industry: 'Gas Distribution', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE206C01011' },
  MGL: { symbol: 'MGL', name: 'Mahanagar Gas Ltd', sector: 'Oil & Gas', industry: 'Gas Distribution', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE023R01011' },
  GUJGASLTD: { symbol: 'GUJGASLTD', name: 'Gujarat Gas Ltd', sector: 'Oil & Gas', industry: 'Gas Distribution', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE057G01012' },

  // ── Energy ─────────────────────────────────────────────────────────────────
  NTPC: { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy', industry: 'Power Generation', isFno: true, lotSize: 2400, instrumentKey: 'NSE_EQ|INE733A01031' },
  POWERGRID: { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', sector: 'Energy', industry: 'Power Transmission', isFno: true, lotSize: 2400, instrumentKey: 'NSE_EQ|INE752E01010' },
  ADANIPOWER: { symbol: 'ADANIPOWER', name: 'Adani Power Ltd', sector: 'Energy', industry: 'Power Generation', isFno: true, lotSize: 3000, instrumentKey: 'NSE_EQ|INE414E01016' },
  JSWENERGY: { symbol: 'JSWENERGY', name: 'JSW Energy Ltd', sector: 'Energy', industry: 'Power Generation', isFno: true, lotSize: 2100, instrumentKey: 'NSE_EQ|INE149I01012' },
  SUZLON: { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', sector: 'Energy', industry: 'Renewable Energy', isFno: true, lotSize: 3000, instrumentKey: 'NSE_EQ|INE040D01025' },
  ADANIGREEN: { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd', sector: 'Energy', industry: 'Renewable Energy', isFno: true, lotSize: 1500, instrumentKey: 'NSE_EQ|INE455U01013' },
  ADANITRANS: { symbol: 'ADANITRANS', name: 'Adani Transmission Ltd', sector: 'Energy', industry: 'Power Transmission', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE925H01016' },
  NHPC: { symbol: 'NHPC', name: 'NHPC Ltd', sector: 'Energy', industry: 'Power Generation', isFno: true, lotSize: 9000, instrumentKey: 'NSE_EQ|UNKNOWN_NHPC' },
  TATAPOWER: { symbol: 'TATAPOWER', name: 'Tata Power Co Ltd', sector: 'Energy', industry: 'Power Generation', isFno: true, lotSize: 3750, instrumentKey: 'NSE_EQ|UNKNOWN_TATAPOWER' },

  // ── FMCG ───────────────────────────────────────────────────────────────────
  ITC: { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', industry: 'FMCG', isFno: true, lotSize: 1600, instrumentKey: 'NSE_EQ|INE154A01025' },
  HINDUNILVR: { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', industry: 'FMCG', isFno: true, lotSize: 300, instrumentKey: 'NSE_EQ|INE030A01027' },
  BRITANNIA: { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', sector: 'FMCG', industry: 'Packaged Foods', isFno: true, lotSize: 100, instrumentKey: 'NSE_EQ|INE216A01030' },
  NESTLEIND: { symbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG', industry: 'Packaged Foods', isFno: true, lotSize: 100, instrumentKey: 'NSE_EQ|INE239A01042' },
  DABUR: { symbol: 'DABUR', name: 'Dabur India Ltd', sector: 'FMCG', industry: 'FMCG', isFno: true, lotSize: 2300, instrumentKey: 'NSE_EQ|INE017A01026' },
  GODREJCP: { symbol: 'GODREJCP', name: 'Godrej Consumer Products Ltd', sector: 'FMCG', industry: 'FMCG', isFno: true, lotSize: 1050, instrumentKey: 'NSE_EQ|INE193C01024' },
  COLPAL: { symbol: 'COLPAL', name: 'Colgate-Palmolive (India) Ltd', sector: 'FMCG', industry: 'FMCG', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE259A01012' },
  PGHH: { symbol: 'PGHH', name: 'Procter & Gamble Hygiene and Health Care Ltd', sector: 'FMCG', industry: 'FMCG', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE186B01014' },
  EMAMILTD: { symbol: 'EMAMILTD', name: 'Emami Ltd', sector: 'FMCG', industry: 'FMCG', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE365B01014' },
  MARICO: { symbol: 'MARICO', name: 'Marico Ltd', sector: 'FMCG', industry: 'FMCG', isFno: true, lotSize: 1850, instrumentKey: 'NSE_EQ|INE196A01026' },
  VBL: { symbol: 'VBL', name: 'Varun Beverages Ltd', sector: 'FMCG', industry: 'Beverages', isFno: true, lotSize: 500, instrumentKey: 'NSE_EQ|INE749L01014' },

  // ── Paints ─────────────────────────────────────────────────────────────────
  ASIANPAINT: { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Paints', industry: 'Paints & Coatings', isFno: true, lotSize: 200, instrumentKey: 'NSE_EQ|INE021A01026' },
  BERGERPAINT: { symbol: 'BERGERPAINT', name: 'Berger Paints India Ltd', sector: 'Paints', industry: 'Paints & Coatings', isFno: true, lotSize: 600, instrumentKey: 'NSE_EQ|INE453B01014' },
  AKZOINDIA: { symbol: 'AKZOINDIA', name: 'Akzo Nobel India Ltd', sector: 'Paints', industry: 'Paints & Coatings', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE036A01018' },
  SHALPAINTS: { symbol: 'SHALPAINTS', name: 'Shalimar Paints Ltd', sector: 'Paints', industry: 'Paints & Coatings', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE269C01017' },
  KANSAINER: { symbol: 'KANSAINER', name: 'Kansai Nerolac Paints Ltd', sector: 'Paints', industry: 'Paints & Coatings', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE549B01012' },

  // ── Metals ─────────────────────────────────────────────────────────────────
  TATASTEEL: { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metals', industry: 'Steel', isFno: true, lotSize: 2125, instrumentKey: 'NSE_EQ|INE081A01024' },
  JSWSTEEL: { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metals', industry: 'Steel', isFno: true, lotSize: 1500, instrumentKey: 'NSE_EQ|INE019A01033' },
  HINDALCO: { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', sector: 'Metals', industry: 'Aluminium', isFno: true, lotSize: 1400, instrumentKey: 'NSE_EQ|INE038A01020' },
  SAIL: { symbol: 'SAIL', name: 'Steel Authority of India Ltd', sector: 'Metals', industry: 'Steel', isFno: true, lotSize: 6000, instrumentKey: 'NSE_EQ|INE114A01011' },
  VEDL: { symbol: 'VEDL', name: 'Vedanta Ltd', sector: 'Metals', industry: 'Diversified Metals', isFno: true, lotSize: 2250, instrumentKey: 'NSE_EQ|INE205A01024' },
  NMDC: { symbol: 'NMDC', name: 'NMDC Ltd', sector: 'Metals', industry: 'Mining', isFno: true, lotSize: 4500, instrumentKey: 'NSE_EQ|INE462B01014' },
  MOIL: { symbol: 'MOIL', name: 'MOIL Ltd', sector: 'Metals', industry: 'Mining', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE563B01012' },
  JSL: { symbol: 'JSL', name: 'Jindal Stainless Ltd', sector: 'Metals', industry: 'Steel', isFno: true, lotSize: 2250, instrumentKey: 'NSE_EQ|INE247B01021' },
  HINDZINC: { symbol: 'HINDZINC', name: 'Hindustan Zinc Ltd', sector: 'Metals', industry: 'Zinc', isFno: true, lotSize: 2800, instrumentKey: 'NSE_EQ|INE073A01018' },
  JINDALSTEL: { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd', sector: 'Metals', industry: 'Steel', isFno: true, lotSize: 2000, instrumentKey: 'NSE_EQ|INE204B01017' },
  NATIONALUM: { symbol: 'NATIONALUM', name: 'National Aluminium Company Ltd', sector: 'Metals', industry: 'Aluminium', isFno: true, lotSize: 5250, instrumentKey: 'NSE_EQ|INE139B01012' },
  HINDCOPPER: { symbol: 'HINDCOPPER', name: 'Hindustan Copper Ltd', sector: 'Metals', industry: 'Copper', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE531B01012' },
  APLAPOLLO: { symbol: 'APLAPOLLO', name: 'APL Apollo Tubes Ltd', sector: 'Metals', industry: 'Steel Tubes', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE279M01012' },
  RATNAMANI: { symbol: 'RATNAMANI', name: 'Ratnamani Metals & Tubes Ltd', sector: 'Metals', industry: 'Steel Tubes', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE078C01015' },

  // ── Automobile ─────────────────────────────────────────────────────────────
  MARUTI: { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobile', industry: 'Passenger Cars', isFno: true, lotSize: 50, instrumentKey: 'NSE_EQ|INE585B01010' },
  TATAMOTORS: { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Automobile', industry: 'Automobiles', isFno: true, lotSize: 1425, instrumentKey: 'NSE_EQ|INE155A01022' },
  'M&M': { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', sector: 'Automobile', industry: 'Automobiles', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE101A01026' },
  HEROMOTOCO: { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', sector: 'Automobile', industry: '2/3 Wheelers', isFno: true, lotSize: 150, instrumentKey: 'NSE_EQ|INE158A01026' },
  EICHERMOT: { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', sector: 'Automobile', industry: 'Automobiles', isFno: true, lotSize: 50, instrumentKey: 'NSE_EQ|INE066B01021' },
  'BAJAJ-AUTO': { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', sector: 'Automobile', industry: '2/3 Wheelers', isFno: true, lotSize: 125, instrumentKey: 'NSE_EQ|INE269A01018' },
  TVSMOTOR: { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd', sector: 'Automobile', industry: '2/3 Wheelers', isFno: true, lotSize: 1200, instrumentKey: 'NSE_EQ|INE467D01014' },
  ASHOKLEY: { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd', sector: 'Automobile', industry: 'Commercial Vehicles', isFno: true, lotSize: 2250, instrumentKey: 'NSE_EQ|INE269A01026' },

  // ── Auto Parts ─────────────────────────────────────────────────────────────
  MOTHERSON: { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International Ltd', sector: 'Auto Parts', industry: 'Auto Components', isFno: true, lotSize: 3500, instrumentKey: 'NSE_EQ|INE769A01021' },
  EXIDEIND: { symbol: 'EXIDEIND', name: 'Exide Industries Ltd', sector: 'Auto Parts', industry: 'Batteries', isFno: true, lotSize: 2100, instrumentKey: 'NSE_EQ|INE049C01016' },
  AMARAJABAT: { symbol: 'AMARAJABAT', name: 'Amara Raja Batteries Ltd', sector: 'Auto Parts', industry: 'Batteries', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE874A01012' },
  BOSCHLTD: { symbol: 'BOSCHLTD', name: 'Bosch Ltd', sector: 'Auto Parts', industry: 'Auto Components', isFno: true, lotSize: 30, instrumentKey: 'NSE_EQ|INE354A01012' },
  MRF: { symbol: 'MRF', name: 'MRF Ltd', sector: 'Auto Parts', industry: 'Tyres', isFno: true, lotSize: 25, instrumentKey: 'NSE_EQ|INE883A01011' },
  APOLLOTYRE: { symbol: 'APOLLOTYRE', name: 'Apollo Tyres Ltd', sector: 'Auto Parts', industry: 'Tyres', isFno: true, lotSize: 2250, instrumentKey: 'NSE_EQ|INE439A01019' },
  CEATLTD: { symbol: 'CEATLTD', name: 'CEAT Ltd', sector: 'Auto Parts', industry: 'Tyres', isFno: true, lotSize: 200, instrumentKey: 'NSE_EQ|INE485A01015' },
  JKTYRE: { symbol: 'JKTYRE', name: 'JK Tyre & Industries Ltd', sector: 'Auto Parts', industry: 'Tyres', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE541C01012' },
  BHARATFORG: { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', sector: 'Auto Parts', industry: 'Auto Components', isFno: true, lotSize: 1400, instrumentKey: 'NSE_EQ|INE481A01018' },

  // ── Textiles ───────────────────────────────────────────────────────────────
  ALOKINDS: { symbol: 'ALOKINDS', name: 'Alok Industries Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 6000, instrumentKey: 'NSE_EQ|INE060H01015' },
  CENTURYTEX: { symbol: 'CENTURYTEX', name: 'Century Textiles and Industries Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 2800, instrumentKey: 'NSE_EQ|INE047A01020' },
  TRIDENT: { symbol: 'TRIDENT', name: 'Trident Ltd', sector: 'Textiles', industry: 'Textiles', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE338B01012' },
  VARDHMAN: { symbol: 'VARDHMAN', name: 'Vardhman Textiles Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 125, instrumentKey: 'NSE_EQ|INE510C01018' },
  ARVIND: { symbol: 'ARVIND', name: 'Arvind Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 5200, instrumentKey: 'NSE_EQ|INE077A01017' },
  RAYMOND: { symbol: 'RAYMOND', name: 'Raymond Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 1500, instrumentKey: 'NSE_EQ|INE126A01016' },
  PAGEIND: { symbol: 'PAGEIND', name: 'Page Industries Ltd', sector: 'Textiles', industry: 'Apparel', isFno: true, lotSize: 50, instrumentKey: 'NSE_EQ|INE176H01011' },
  KPRMILL: { symbol: 'KPRMILL', name: 'KPR Mill Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 200, instrumentKey: 'NSE_EQ|INE150K01012' },
  LUXIND: { symbol: 'LUXIND', name: 'Lux Industries Ltd', sector: 'Textiles', industry: 'Apparel', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE660H01012' },
  WELSPUNIND: { symbol: 'WELSPUNIND', name: 'Welspun India Ltd', sector: 'Textiles', industry: 'Textiles', isFno: true, lotSize: 3500, instrumentKey: 'NSE_EQ|INE180B01023' },

  // ── Retail ─────────────────────────────────────────────────────────────────
  TRENT: { symbol: 'TRENT', name: 'Trent Ltd', sector: 'Retail', industry: 'Retail', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE849A01017' },
  ABFRL: { symbol: 'ABFRL', name: 'Aditya Birla Fashion and Retail Ltd', sector: 'Retail', industry: 'Retail', isFno: true, lotSize: 1400, instrumentKey: 'NSE_EQ|INE065L01013' },
  DMART: { symbol: 'DMART', name: 'Avenue Supermarts Ltd', sector: 'Retail', industry: 'Retail', isFno: true, lotSize: 250, instrumentKey: 'NSE_EQ|INE407L01015' },

  // ── Cement ─────────────────────────────────────────────────────────────────
  ULTRACEMCO: { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', sector: 'Cement', industry: 'Cement', isFno: true, lotSize: 100, instrumentKey: 'NSE_EQ|INE237A01028' },
  SHREECEM: { symbol: 'SHREECEM', name: 'Shree Cement Ltd', sector: 'Cement', industry: 'Cement', isFno: true, lotSize: 50, instrumentKey: 'NSE_EQ|INE070A01013' },
  GRASIM: { symbol: 'GRASIM', name: 'Grasim Industries Ltd', sector: 'Cement', industry: 'Cement', isFno: true, lotSize: 750, instrumentKey: 'NSE_EQ|INE049A01031' },

  // ── Telecom ────────────────────────────────────────────────────────────────
  BHARTIARTL: { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', industry: 'Telecom Services', isFno: true, lotSize: 475, instrumentKey: 'NSE_EQ|INE738A01025' },
  IDEA: { symbol: 'IDEA', name: 'Vodafone Idea Ltd', sector: 'Telecom', industry: 'Telecom Services', isFno: true, lotSize: 7000, instrumentKey: 'NSE_EQ|INE324A01026' },

  // ── Infrastructure ─────────────────────────────────────────────────────────
  LT: { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Infrastructure', industry: 'Construction', isFno: true, lotSize: 150, instrumentKey: 'NSE_EQ|INE018A01030' },
  ADANIENT: { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', sector: 'Infrastructure', industry: 'Conglomerate', isFno: true, lotSize: 500, instrumentKey: 'NSE_EQ|INE423A01024' },
  ADANIPORTS: { symbol: 'ADANIPORTS', name: 'Adani Ports & Special Economic Zone Ltd', sector: 'Infrastructure', industry: 'Ports', isFno: true, lotSize: 1250, instrumentKey: 'NSE_EQ|INE742A01034' },
  GMRINFRA: { symbol: 'GMRINFRA', name: 'GMR Infrastructure Ltd', sector: 'Infrastructure', industry: 'Infrastructure', isFno: true, lotSize: 5000, instrumentKey: 'NSE_EQ|INE245B01014' },

  // ── Pharma ─────────────────────────────────────────────────────────────────
  SUNPHARMA: { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharma', industry: 'Pharmaceuticals', isFno: true, lotSize: 700, instrumentKey: 'NSE_EQ|INE044A01036' },
  DRREDDY: { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", sector: 'Pharma', industry: 'Pharmaceuticals', isFno: true, lotSize: 125, instrumentKey: 'NSE_EQ|INE088A01026' },
  CIPLA: { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharma', industry: 'Pharmaceuticals', isFno: true, lotSize: 650, instrumentKey: 'NSE_EQ|INE043A01027' },
  DIVISLAB: { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd", sector: 'Pharma', industry: 'Pharmaceuticals', isFno: true, lotSize: 200, instrumentKey: 'NSE_EQ|INE363B01018' },
  APOLLOHOSP: { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', sector: 'Pharma', industry: 'Hospitals', isFno: true, lotSize: 150, instrumentKey: 'NSE_EQ|INE437B01018' },

  // ── Consumer ───────────────────────────────────────────────────────────────
  TITAN: { symbol: 'TITAN', name: 'Titan Company Ltd', sector: 'Consumer', industry: 'Jewellery & Watches', isFno: true, lotSize: 175, instrumentKey: 'NSE_EQ|INE280A01028' },
  TATACONSUM: { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', sector: 'Consumer', industry: 'FMCG', isFno: true, lotSize: 1050, instrumentKey: 'NSE_EQ|INE123A01022' },
  JUBLFOOD: { symbol: 'JUBLFOOD', name: 'Jubilant FoodWorks Ltd', sector: 'Consumer', industry: 'QSR', isFno: true, lotSize: 250, instrumentKey: 'NSE_EQ|INE396G01014' },
  WESTLIFE: { symbol: 'WESTLIFE', name: 'Westlife Development Ltd', sector: 'Consumer', industry: 'QSR', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE306C01013' },
  DEVYANI: { symbol: 'DEVYANI', name: 'Devyani International Ltd', sector: 'Consumer', industry: 'QSR', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE01T601012' },
  SAPPHIRE: { symbol: 'SAPPHIRE', name: 'Sapphire Foods India Ltd', sector: 'Consumer', industry: 'QSR', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE01SY01014' },
  BARBEQUE: { symbol: 'BARBEQUE', name: 'Barbeque Nation Hospitality Ltd', sector: 'Consumer', industry: 'Food Services', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE01Q501017' },
  SPECIALLTY: { symbol: 'SPECIALLTY', name: 'Speciality Restaurants Ltd', sector: 'Consumer', industry: 'Food Services', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE937L01013' },
  INDIGOPNT: { symbol: 'INDIGOPNT', name: 'Indigo Paints Ltd', sector: 'Consumer', industry: 'Paints', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE01S801013' },
  RBA: { symbol: 'RBA', name: 'Restaurant Brands Asia Ltd', sector: 'Consumer', industry: 'QSR', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE00Y501014' },
  FORCEMOT: { symbol: 'FORCEMOT', name: 'Force Motors Ltd', sector: 'Consumer', industry: 'Automobiles', isFno: true, lotSize: 3500, instrumentKey: 'NSE_EQ|INE157A01016' },
  GODAWARI: { symbol: 'GODAWARI', name: 'Godawari Power & Ispat Ltd', sector: 'Consumer', industry: 'Steel', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE705C01014' },
  LLOYDSME: { symbol: 'LLOYDSME', name: 'Lloyds Metals & Energy Ltd', sector: 'Consumer', industry: 'Metals & Mining', isFno: false, lotSize: 1, instrumentKey: 'NSE_EQ|INE939L01014' },

  // ── Defence ────────────────────────────────────────────────────────────────
  HAL: { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', sector: 'Defence', industry: 'Aerospace & Defence', isFno: true, lotSize: 550, instrumentKey: 'NSE_EQ|INE095F01014' },

  // ── Mining ─────────────────────────────────────────────────────────────────
  COALINDIA: { symbol: 'COALINDIA', name: 'Coal India Ltd', sector: 'Mining', industry: 'Mining', isFno: true, lotSize: 1800, instrumentKey: 'NSE_EQ|INE522A01034' },
}

// ─── F&O ELIGIBLE STOCKS ────────────────────────────────────────────────────────

export const FNO_STOCKS: string[] = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN',
  'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK', 'BAJFINANCE',
  'ASIANPAINT', 'MARUTI', 'SUNPHARMA', 'TATAMOTORS', 'WIPRO', 'HCLTECH',
  'ULTRACEMCO', 'TITAN', 'NESTLEIND', 'NTPC', 'POWERGRID', 'ONGC',
  'TATASTEEL', 'ADANIENT', 'ADANIPORTS', 'JSWSTEEL', 'COALINDIA', 'BPCL',
  'HINDALCO', 'GRASIM', 'TECHM', 'BAJAJFINSV', 'DRREDDY', 'CIPLA',
  'EICHERMOT', 'TATACONSUM', 'HEROMOTOCO', 'M&M', 'APOLLOHOSP', 'DIVISLAB',
  'BRITANNIA', 'INDUSINDBK', 'HDFCLIFE', 'SBILIFE', 'LICI', 'PNB',
  'BANKBARODA', 'CANBK', 'IDFCFIRSTB', 'SHRIRAMFIN', 'M&MFIN', 'CHOLAFIN',
  'L&TFH', 'ADANIPOWER', 'JSWENERGY', 'SUZLON', 'ADANIGREEN', 'GAIL',
  'PETRONET', 'IOC', 'SAIL', 'NMDC', 'VEDL', 'JINDALSTEL', 'BAJAJ-AUTO',
  'TVSMOTOR', 'ASHOKLEY', 'MOTHERSON', 'MRF', 'APOLLOTYRE', 'BHARATFORG',
  'BERGERPAINT', 'IDEA', 'GMRINFRA', 'TRENT', 'ABFRL', 'DMART', 'HAL',
  'GODREJCP', 'DABUR', 'COLPAL', 'MARICO', 'VBL', 'JUBLFOOD', 'RBLBANK',
  'YESBANK', 'OIL', 'JSL', 'HINDZINC', 'NATIONALUM', 'EXIDEIND',
  'AMARAJABAT', 'CEATLTD', 'ALOKINDS', 'CENTURYTEX', 'VARDHMAN', 'PAGEIND',
  'KPRMILL', 'ARVIND', 'RAYMOND', 'WELSPUNIND', 'SHREECEM', 'FORCEMOT',
  'BOSCHLTD', 'AKZOINDIA', 'TATAPOWER', 'NHPC',
]

// ─── SECTORS ────────────────────────────────────────────────────────────────────

export const SECTORS: string[] = [
  'Banking',
  'Finance',
  'IT',
  'Oil & Gas',
  'Energy',
  'FMCG',
  'Paints',
  'Metals',
  'Automobile',
  'Auto Parts',
  'Textiles',
  'Retail',
  'Cement',
  'Telecom',
  'Infrastructure',
  'Pharma',
  'Consumer',
  'Defence',
  'Mining',
]

// ─── INDEX CONFIGS ──────────────────────────────────────────────────────────────

export const INDEX_CONFIGS: Record<string, IndexConfig> = {
  NIFTY: {
    name: 'Nifty 50',
    lotSize: 25,
    strikeInterval: 50,
    instrumentKey: 'NSE_INDEX|Nifty 50',
  },
  BANKNIFTY: {
    name: 'Bank Nifty',
    lotSize: 15,
    strikeInterval: 100,
    instrumentKey: 'NSE_INDEX|Nifty Bank',
  },
  FINNIFTY: {
    name: 'Fin Nifty',
    lotSize: 25,
    strikeInterval: 50,
    instrumentKey: 'NSE_INDEX|Nifty Fin Service',
  },
  SENSEX: {
    name: 'Sensex',
    lotSize: 10,
    strikeInterval: 100,
    instrumentKey: 'BSE_INDEX|SENSEX',
  },
  MIDCPNIFTY: {
    name: 'Midcap Nifty',
    lotSize: 50,
    strikeInterval: 25,
    instrumentKey: 'NSE_INDEX|NIFTY MIDCAP 150',
  },
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────────

/**
 * Search stocks by query string with optional sector and F&O filters.
 * Results are sorted by relevance: exact match → starts-with → contains.
 */
export function searchStocks(
  query: string,
  sector?: string,
  fnoOnly?: boolean
): StockInfo[] {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const allStocks = Object.values(STOCK_DATABASE)

  // Filter by sector and F&O if specified
  let filtered = allStocks
  if (sector) {
    filtered = filtered.filter((s) => s.sector === sector)
  }
  if (fnoOnly) {
    filtered = filtered.filter((s) => s.isFno)
  }

  // Categorize matches
  const exactMatches: StockInfo[] = []
  const startsWithMatches: StockInfo[] = []
  const containsMatches: StockInfo[] = []

  for (const stock of filtered) {
    const symbolLower = stock.symbol.toLowerCase()
    const nameLower = stock.name.toLowerCase()

    if (symbolLower === q || nameLower === q) {
      exactMatches.push(stock)
    } else if (symbolLower.startsWith(q) || nameLower.startsWith(q)) {
      startsWithMatches.push(stock)
    } else if (symbolLower.includes(q) || nameLower.includes(q)) {
      containsMatches.push(stock)
    }
  }

  return [...exactMatches, ...startsWithMatches, ...containsMatches]
}

/**
 * Get all stocks belonging to a specific sector.
 */
export function getStocksBySector(sector: string): StockInfo[] {
  return Object.values(STOCK_DATABASE).filter((s) => s.sector === sector)
}

/**
 * Get all F&O eligible stocks.
 */
export function getFnoStocks(): StockInfo[] {
  return Object.values(STOCK_DATABASE).filter((s) => s.isFno)
}
