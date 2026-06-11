export interface StockSeedData {
  symbol: string
  name: string
  sector: string
  currentPrice: number
  marketCap: number
  isin: string | null
  lotSize: number
  isFuturesAvailable: boolean
  isOptionsAvailable: boolean
}

export const ALL_STOCKS: StockSeedData[] = [
  // Banking
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', currentPrice: 977.70, marketCap: 902477, isin: 'INE062A01020', lotSize: 350, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', currentPrice: 747.05, marketCap: 1150281, isin: 'INE040A01034', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', currentPrice: 377.45, marketCap: 375431, isin: 'INE237A01028', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', currentPrice: 1245, marketCap: 875000, isin: 'INE090A01021', lotSize: 275, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', currentPrice: 1140, marketCap: 352000, isin: 'INE238A01034', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'YESBANK', name: 'Yes Bank Ltd', sector: 'Banking', currentPrice: 20, marketCap: 50000, isin: 'INE528G01035', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd', sector: 'Banking', currentPrice: 80, marketCap: 120000, isin: 'INE092W01024', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'UCOBANK', name: 'UCO Bank', sector: 'Banking', currentPrice: 26.39, marketCap: 33619, isin: 'INE693A01020', lotSize: 10000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'CENTRALBANK', name: 'Central Bank of India', sector: 'Banking', currentPrice: 30, marketCap: 25000, isin: 'INE594A01010', lotSize: 10000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'IOB', name: 'Indian Overseas Bank', sector: 'Banking', currentPrice: 20, marketCap: 24000, isin: 'INE569A01015', lotSize: 10000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'PNB', name: 'Punjab National Bank', sector: 'Banking', currentPrice: 80, marketCap: 95000, isin: 'INE160A01015', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Banking', currentPrice: 150, marketCap: 78000, isin: 'INE028A01023', lotSize: 4000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'CANBK', name: 'Canara Bank', sector: 'Banking', currentPrice: 400, marketCap: 72000, isin: 'INE476A01014', lotSize: 1500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BANKINDIA', name: 'Bank of India', sector: 'Banking', currentPrice: 90, marketCap: 40000, isin: 'INE004A01021', lotSize: 6000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'UNIONBANK', name: 'Union Bank of India', sector: 'Banking', currentPrice: 70, marketCap: 53000, isin: 'INE737C01016', lotSize: 7000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'INDIANB', name: 'Indian Bank', sector: 'Banking', currentPrice: 350, marketCap: 43000, isin: 'INE569A01029', lotSize: 2000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'IDBI', name: 'IDBI Bank Ltd', sector: 'Banking', currentPrice: 50, marketCap: 53000, isin: 'INE087B01014', lotSize: 10000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'SOUTHBANK', name: 'South Indian Bank Ltd', sector: 'Banking', currentPrice: 25, marketCap: 5000, isin: 'INE058G01012', lotSize: 10000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'KTKBANK', name: 'Karnataka Bank Ltd', sector: 'Banking', currentPrice: 200, marketCap: 7000, isin: 'INE797A01012', lotSize: 2000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'CUB', name: 'City Union Bank Ltd', sector: 'Banking', currentPrice: 150, marketCap: 7000, isin: 'INE585B01016', lotSize: 3000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'DCBBANK', name: 'DCB Bank Ltd', sector: 'Banking', currentPrice: 100, marketCap: 4000, isin: 'INE605D01014', lotSize: 5000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'RBLBANK', name: 'RBL Bank Ltd', sector: 'Banking', currentPrice: 200, marketCap: 12000, isin: 'INE874R01013', lotSize: 3000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', sector: 'Banking', currentPrice: 800, marketCap: 62000, isin: 'INE526A01015', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },

  // Finance / Insurance
  { symbol: 'LICI', name: 'Life Insurance Corporation of India', sector: 'Insurance', currentPrice: 399.90, marketCap: 505873, isin: 'INE051L01022', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', sector: 'Finance', currentPrice: 889.40, marketCap: 553736, isin: 'INE296A01024', lotSize: 250, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'IDFC', name: 'IDFC Ltd', sector: 'Finance', currentPrice: 80, marketCap: 12000, isin: 'INE047D01021', lotSize: 5000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'BAJAJHLDNG', name: 'Bajaj Holdings & Investment Ltd', sector: 'Finance', currentPrice: 800, marketCap: 44000, isin: 'INE298A01023', lotSize: 400, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Transport Finance Co Ltd', sector: 'Finance', currentPrice: 900, marketCap: 32000, isin: 'INE745A01023', lotSize: 400, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'M&MFIN', name: 'M&M Financial Services Ltd', sector: 'Finance', currentPrice: 200, marketCap: 24000, isin: 'INE488C01012', lotSize: 3000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment & Finance Co Ltd', sector: 'Finance', currentPrice: 800, marketCap: 16000, isin: 'INE324A01012', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'L&TFH', name: 'L&T Finance Holdings Ltd', sector: 'Finance', currentPrice: 100, marketCap: 25000, isin: 'INE018C01026', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },

  // Energy
  { symbol: 'NTPC', name: 'NTPC Ltd', sector: 'Energy', currentPrice: 361.65, marketCap: 350680, isin: 'INE733A01031', lotSize: 600, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ADANIPOWER', name: 'Adani Power Ltd', sector: 'Energy', currentPrice: 232.60, marketCap: 448562, isin: 'INE414E01016', lotSize: 1000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'JSWENERGY', name: 'JSW Energy Ltd', sector: 'Energy', currentPrice: 831.90, marketCap: 1279843, isin: 'INE149I01012', lotSize: 400, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', sector: 'Energy', currentPrice: 222, marketCap: 205000, isin: 'INE752E01010', lotSize: 1200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', sector: 'Energy', currentPrice: 25, marketCap: 35000, isin: 'INE040D01025', lotSize: 15000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd', sector: 'Energy', currentPrice: 800, marketCap: 124000, isin: 'INE455U01013', lotSize: 400, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'ADANITRANS', name: 'Adani Transmission Ltd', sector: 'Energy', currentPrice: 800, marketCap: 88000, isin: 'INE925H01016', lotSize: 400, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy', currentPrice: 2500, marketCap: 1660000, isin: 'INE002A01018', lotSize: 250, isFuturesAvailable: true, isOptionsAvailable: true },

  // FMCG
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', currentPrice: 280.70, marketCap: 351702, isin: 'INE154A01025', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', sector: 'FMCG', currentPrice: 800, marketCap: 31000, isin: 'INE216A01030', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG', currentPrice: 20000, marketCap: 193000, isin: 'INE239A01042', lotSize: 50, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', currentPrice: 2500, marketCap: 592000, isin: 'INE030A01027', lotSize: 100, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'GODREJCP', name: 'Godrej Consumer Products Ltd', sector: 'FMCG', currentPrice: 1000, marketCap: 26000, isin: 'INE193C01024', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'DABUR', name: 'Dabur India Ltd', sector: 'FMCG', currentPrice: 600, marketCap: 105000, isin: 'INE017A01026', lotSize: 400, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'COLPAL', name: 'Colgate-Palmolive (India) Ltd', sector: 'FMCG', currentPrice: 1500, marketCap: 41000, isin: 'INE259A01012', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'PGHH', name: 'Procter & Gamble Hygiene and Health Care Ltd', sector: 'FMCG', currentPrice: 15000, marketCap: 50000, isin: 'INE186B01014', lotSize: 25, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'EMAMILTD', name: 'Emami Ltd', sector: 'FMCG', currentPrice: 500, marketCap: 22000, isin: 'INE365B01014', lotSize: 400, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'MARICO', name: 'Marico Ltd', sector: 'FMCG', currentPrice: 500, marketCap: 65000, isin: 'INE196A01026', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', sector: 'FMCG', currentPrice: 800, marketCap: 74000, isin: 'INE123A01022', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'VBL', name: 'Varun Beverages Ltd', sector: 'FMCG', currentPrice: 800, marketCap: 105000, isin: 'INE749L01014', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'JUBLFOOD', name: 'Jubilant FoodWorks Ltd', sector: 'FMCG', currentPrice: 400, marketCap: 26000, isin: 'INE396G01014', lotSize: 600, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'WESTLIFE', name: 'Westlife Development Ltd', sector: 'FMCG', currentPrice: 500, marketCap: 7000, isin: 'INE306C01013', lotSize: 1000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'RBA', name: 'Restaurant Brands Asia Ltd', sector: 'FMCG', currentPrice: 100, marketCap: 4000, isin: 'INE00Y501014', lotSize: 6000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'DEVYANI', name: 'Devyani International Ltd', sector: 'FMCG', currentPrice: 100, marketCap: 12000, isin: 'INE01T601012', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'SAPPHIRE', name: 'Sapphire Foods India Ltd', sector: 'FMCG', currentPrice: 300, marketCap: 19000, isin: 'INE01SY01014', lotSize: 1400, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'BARBEQUE', name: 'Barbeque Nation Hospitality Ltd', sector: 'FMCG', currentPrice: 500, marketCap: 4000, isin: 'INE01Q501017', lotSize: 700, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'ADANIGAS', name: 'Adani Total Gas Ltd', sector: 'Energy', currentPrice: 800, marketCap: 88000, isin: 'INE894U01014', lotSize: 400, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'AWL', name: 'Adani Wilmar Ltd', sector: 'FMCG', currentPrice: 300, marketCap: 35000, isin: 'INE984H01012', lotSize: 1100, isFuturesAvailable: true, isOptionsAvailable: true },

  // Oil & Gas
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', sector: 'Oil & Gas', currentPrice: 300, marketCap: 65000, isin: 'INE029A01011', lotSize: 900, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HINDPETRO', name: 'Hindustan Petroleum Corporation Ltd', sector: 'Oil & Gas', currentPrice: 200, marketCap: 40000, isin: 'INE094A01023', lotSize: 1800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', sector: 'Oil & Gas', currentPrice: 150, marketCap: 334000, isin: 'INE213A01029', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'OIL', name: 'Oil India Ltd', sector: 'Oil & Gas', currentPrice: 300, marketCap: 32000, isin: 'INE274J01014', lotSize: 800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd', sector: 'Oil & Gas', currentPrice: 100, marketCap: 45000, isin: 'INE129B01018', lotSize: 4000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'PETRONET', name: 'Petronet LNG Ltd', sector: 'Oil & Gas', currentPrice: 200, marketCap: 30000, isin: 'INE267F01011', lotSize: 1800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'GUJGASLTD', name: 'Gujarat Gas Ltd', sector: 'Oil & Gas', currentPrice: 500, marketCap: 35000, isin: 'INE057G01012', lotSize: 600, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'IGL', name: 'Indraprastha Gas Ltd', sector: 'Oil & Gas', currentPrice: 400, marketCap: 28000, isin: 'INE206C01011', lotSize: 800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'MGL', name: 'Mahanagar Gas Ltd', sector: 'Oil & Gas', currentPrice: 800, marketCap: 8000, isin: 'INE023R01011', lotSize: 300, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', sector: 'Oil & Gas', currentPrice: 138.57, marketCap: 130000, isin: 'INE241A01010', lotSize: 3000, isFuturesAvailable: true, isOptionsAvailable: true },

  // Metals
  { symbol: 'JSL', name: 'Jindal Stainless Ltd', sector: 'Metals', currentPrice: 945, marketCap: 95000, isin: 'INE247B01021', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', sector: 'Metals', currentPrice: 933.05, marketCap: 206779, isin: 'INE038A01020', lotSize: 350, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', sector: 'Metals', currentPrice: 700, marketCap: 170000, isin: 'INE019A01033', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', sector: 'Metals', currentPrice: 800, marketCap: 186000, isin: 'INE081A01010', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd', sector: 'Metals', currentPrice: 100, marketCap: 43000, isin: 'INE114A01011', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'NMDC', name: 'NMDC Ltd', sector: 'Metals', currentPrice: 150, marketCap: 44000, isin: 'INE462B01014', lotSize: 3000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'MOIL', name: 'MOIL Ltd', sector: 'Metals', currentPrice: 300, marketCap: 6500, isin: 'INE563B01012', lotSize: 1500, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'VEDL', name: 'Vedanta Ltd', sector: 'Metals', currentPrice: 300, marketCap: 112000, isin: 'INE205A01024', lotSize: 1000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HINDZINC', name: 'Hindustan Zinc Ltd', sector: 'Metals', currentPrice: 300, marketCap: 126000, isin: 'INE073A01018', lotSize: 1000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd', sector: 'Metals', currentPrice: 500, marketCap: 50000, isin: 'INE204B01017', lotSize: 800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'NATIONALUM', name: 'National Aluminium Company Ltd', sector: 'Metals', currentPrice: 150, marketCap: 27500, isin: 'INE139B01012', lotSize: 4500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HINDCOPPER', name: 'Hindustan Copper Ltd', sector: 'Metals', currentPrice: 100, marketCap: 9000, isin: 'INE531B01012', lotSize: 5000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'APLAPOLLO', name: 'APL Apollo Tubes Ltd', sector: 'Metals', currentPrice: 1000, marketCap: 25000, isin: 'INE279M01012', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'RATNAMANI', name: 'Ratnamani Metals & Tubes Ltd', sector: 'Metals', currentPrice: 1500, marketCap: 8500, isin: 'INE078C01015', lotSize: 200, isFuturesAvailable: false, isOptionsAvailable: false },

  // Automobile
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', sector: 'Automobile', currentPrice: 320.50, marketCap: 362000, isin: 'INE155A01022', lotSize: 400, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', sector: 'Automobile', currentPrice: 800, marketCap: 230000, isin: 'INE269A01018', lotSize: 150, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', sector: 'Automobile', currentPrice: 250, marketCap: 50000, isin: 'INE158A01026', lotSize: 600, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', sector: 'Automobile', currentPrice: 900, marketCap: 49000, isin: 'INE066B01021', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd', sector: 'Automobile', currentPrice: 500, marketCap: 24000, isin: 'INE467D01014', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobile', currentPrice: 800, marketCap: 388000, isin: 'INE585B01010', lotSize: 150, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', sector: 'Automobile', currentPrice: 700, marketCap: 87000, isin: 'INE101A01026', lotSize: 250, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd', sector: 'Automobile', currentPrice: 150, marketCap: 44000, isin: 'INE269A01026', lotSize: 2000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'FORCEMOT', name: 'Force Motors Ltd', sector: 'Automobile', currentPrice: 800, marketCap: 10000, isin: 'INE157A01016', lotSize: 300, isFuturesAvailable: false, isOptionsAvailable: false },

  // Auto Parts
  { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International Ltd', sector: 'Auto Parts', currentPrice: 100, marketCap: 52000, isin: 'INE769A01021', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'EXIDEIND', name: 'Exide Industries Ltd', sector: 'Auto Parts', currentPrice: 200, marketCap: 17000, isin: 'INE049C01016', lotSize: 1200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'AMARAJABAT', name: 'Amara Raja Batteries Ltd', sector: 'Auto Parts', currentPrice: 800, marketCap: 15000, isin: 'INE874A01012', lotSize: 400, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BOSCHLTD', name: 'Bosch Ltd', sector: 'Auto Parts', currentPrice: 900, marketCap: 28000, isin: 'INE354A01012', lotSize: 150, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'MRF', name: 'MRF Ltd', sector: 'Auto Parts', currentPrice: 900, marketCap: 38000, isin: 'INE883A01011', lotSize: 50, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'APOLLOTYRE', name: 'Apollo Tyres Ltd', sector: 'Auto Parts', currentPrice: 350, marketCap: 21000, isin: 'INE439A01019', lotSize: 800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'CEATLTD', name: 'CEAT Ltd', sector: 'Auto Parts', currentPrice: 150, marketCap: 6000, isin: 'INE485A01015', lotSize: 2000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'JKTYRE', name: 'JK Tyre & Industries Ltd', sector: 'Auto Parts', currentPrice: 100, marketCap: 2500, isin: 'INE541C01012', lotSize: 4000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'BHARATFORG', name: 'Bharat Forge Ltd', sector: 'Auto Parts', currentPrice: 500, marketCap: 23000, isin: 'INE481A01018', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },

  // Paints
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Paint', currentPrice: 3000, marketCap: 277000, isin: 'INE021A01026', lotSize: 100, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BERGERPAINT', name: 'Berger Paints India Ltd', sector: 'Paint', currentPrice: 500, marketCap: 24000, isin: 'INE453B01014', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'AKZOINDIA', name: 'Akzo Nobel India Ltd', sector: 'Paint', currentPrice: 2500, marketCap: 11000, isin: 'INE036A01018', lotSize: 100, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'KANSAINER', name: 'Kansai Nerolac Paints Ltd', sector: 'Paint', currentPrice: 300, marketCap: 14000, isin: 'INE549B01012', lotSize: 800, isFuturesAvailable: false, isOptionsAvailable: false },

  // Telecom
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', currentPrice: 800, marketCap: 920000, isin: 'INE738A01025', lotSize: 400, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'IDEA', name: 'Vodafone Idea Ltd', sector: 'Telecom', currentPrice: 14, marketCap: 55000, isin: 'INE324A01026', lotSize: 20000, isFuturesAvailable: true, isOptionsAvailable: true },

  // Infrastructure
  { symbol: 'GMRINFRA', name: 'GMR Infrastructure Ltd', sector: 'Infrastructure', currentPrice: 40, marketCap: 25000, isin: 'INE245B01014', lotSize: 10000, isFuturesAvailable: true, isOptionsAvailable: true },

  // Textiles
  { symbol: 'ALOKINDS', name: 'Alok Industries Ltd', sector: 'Textiles', currentPrice: 25, marketCap: 12000, isin: 'INE060H01015', lotSize: 20000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'CENTURYTEX', name: 'Century Textiles and Industries Ltd', sector: 'Textiles', currentPrice: 500, marketCap: 5500, isin: 'INE047A01020', lotSize: 700, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'TRIDENT', name: 'Trident Ltd', sector: 'Textiles', currentPrice: 50, marketCap: 5000, isin: 'INE338B01012', lotSize: 8000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'VARDHMAN', name: 'Vardhman Textiles Ltd', sector: 'Textiles', currentPrice: 100, marketCap: 3000, isin: 'INE510C01018', lotSize: 4000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'ARVIND', name: 'Arvind Ltd', sector: 'Textiles', currentPrice: 100, marketCap: 3000, isin: 'INE077A01017', lotSize: 5000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'RAYMOND', name: 'Raymond Ltd', sector: 'Textiles', currentPrice: 500, marketCap: 3500, isin: 'INE126A01016', lotSize: 800, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'PAGEIND', name: 'Page Industries Ltd', sector: 'Textiles', currentPrice: 40000, marketCap: 44000, isin: 'INE176H01011', lotSize: 10, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'KPRMILL', name: 'KPR Mill Ltd', sector: 'Textiles', currentPrice: 500, marketCap: 4000, isin: 'INE150K01012', lotSize: 600, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'LUXIND', name: 'Lux Industries Ltd', sector: 'Textiles', currentPrice: 1000, marketCap: 3000, isin: 'INE660H01012', lotSize: 200, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'WELSPUNIND', name: 'Welspun India Ltd', sector: 'Textiles', currentPrice: 100, marketCap: 10000, isin: 'INE180B01023', lotSize: 5000, isFuturesAvailable: true, isOptionsAvailable: true },

  // Retail
  { symbol: 'TRENT', name: 'Trent Ltd', sector: 'Retail', currentPrice: 1500, marketCap: 53000, isin: 'INE849A01017', lotSize: 150, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ABFRL', name: 'Aditya Birla Fashion and Retail Ltd', sector: 'Retail', currentPrice: 200, marketCap: 19000, isin: 'INE065L01013', lotSize: 2000, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd', sector: 'Retail', currentPrice: 4000, marketCap: 255000, isin: 'INE407L01015', lotSize: 75, isFuturesAvailable: true, isOptionsAvailable: true },

  // Cement
  { symbol: 'SHREECEM', name: 'Shree Cement Ltd', sector: 'Cement', currentPrice: 800, marketCap: 80000, isin: 'INE070A01013', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },

  // Aerospace & Defence
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd', sector: 'Aerospace', currentPrice: 900, marketCap: 300000, isin: 'INE095F01014', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },

  // Mining
  { symbol: 'COALINDIA', name: 'Coal India Ltd', sector: 'Mining', currentPrice: 423, marketCap: 261000, isin: 'INE522A01034', lotSize: 700, isFuturesAvailable: true, isOptionsAvailable: true },

  // IT
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', currentPrice: 3560, marketCap: 1300000, isin: 'INE467B01029', lotSize: 150, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', currentPrice: 1520, marketCap: 632000, isin: 'INE009A01021', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT', currentPrice: 415, marketCap: 216000, isin: 'INE075A01022', lotSize: 300, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', sector: 'IT', currentPrice: 1640, marketCap: 445000, isin: 'INE860A01027', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', sector: 'IT', currentPrice: 1500, marketCap: 145000, isin: 'INE669C01020', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },

  // Construction
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Construction', currentPrice: 3540, marketCap: 486000, isin: 'INE018A01030', lotSize: 125, isFuturesAvailable: true, isOptionsAvailable: true },

  // Pharma
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', sector: 'Pharma', currentPrice: 1800, marketCap: 430000, isin: 'INE044A01036', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", sector: 'Pharma', currentPrice: 6500, marketCap: 108000, isin: 'INE088A01026', lotSize: 50, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'CIPLA', name: 'Cipla Ltd', sector: 'Pharma', currentPrice: 1500, marketCap: 120000, isin: 'INE043A01027', lotSize: 250, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd", sector: 'Pharma', currentPrice: 5000, marketCap: 66000, isin: 'INE363B01018', lotSize: 50, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', sector: 'Healthcare', currentPrice: 6000, marketCap: 85000, isin: 'INE437B01018', lotSize: 50, isFuturesAvailable: true, isOptionsAvailable: true },

  // Others (Nifty 50)
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', sector: 'Conglomerate', currentPrice: 2500, marketCap: 285000, isin: 'INE423A01024', lotSize: 250, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & Special Economic Zone Ltd', sector: 'Infrastructure', currentPrice: 1200, marketCap: 260000, isin: 'INE742A01034', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', sector: 'Cement', currentPrice: 10000, marketCap: 289000, isin: 'INE237A01028', lotSize: 50, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'TITAN', name: 'Titan Company Ltd', sector: 'Consumer', currentPrice: 3500, marketCap: 310000, isin: 'INE280A01028', lotSize: 100, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', sector: 'Cement', currentPrice: 2500, marketCap: 165000, isin: 'INE049A01031', lotSize: 150, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', sector: 'Finance', currentPrice: 1600, marketCap: 255000, isin: 'INE298A01023', lotSize: 125, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', sector: 'Insurance', currentPrice: 650, marketCap: 139000, isin: 'INE744G01013', lotSize: 500, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd', sector: 'Insurance', currentPrice: 1500, marketCap: 150000, isin: 'INE123B01016', lotSize: 200, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'TATAMTRDVR', name: 'Tata Motors Ltd - DVR', sector: 'Automobile', currentPrice: 200, marketCap: 10000, isin: 'INE155A01030', lotSize: 2000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'GODAWARI', name: 'Godawari Power & Ispat Ltd', sector: 'Metals', currentPrice: 500, marketCap: 7000, isin: 'INE705C01014', lotSize: 600, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'LLOYDSME', name: 'Lloyds Metals & Energy Ltd', sector: 'Metals', currentPrice: 500, marketCap: 20000, isin: 'INE939L01014', lotSize: 800, isFuturesAvailable: true, isOptionsAvailable: true },
  { symbol: 'SPECIALLTY', name: 'Speciality Restaurants Ltd', sector: 'FMCG', currentPrice: 100, marketCap: 900, isin: 'INE937L01013', lotSize: 6000, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'INDIGOPNT', name: 'Indigo Paints Ltd', sector: 'Paint', currentPrice: 1000, marketCap: 4800, isin: 'INE01S801013', lotSize: 200, isFuturesAvailable: false, isOptionsAvailable: false },
  { symbol: 'SHALPAINTS', name: 'Shalimar Paints Ltd', sector: 'Paint', currentPrice: 100, marketCap: 800, isin: 'INE269C01017', lotSize: 8000, isFuturesAvailable: false, isOptionsAvailable: false },
]
