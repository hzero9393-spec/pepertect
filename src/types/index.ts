// Pepertect Global Types

export type Tier = 'FREE' | 'PREMIUM';
export type Role = 'USER' | 'ADMIN';
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPEN' | 'CLOSED' | 'SQUAREDOFF';
export type Segment = 'EQUITY' | 'FUTURES' | 'OPTIONS';
export type OptionType = 'CE' | 'PE';
export type ExitReason = 'MANUAL' | 'SL_HIT' | 'TARGET_HIT' | 'EXPIRY';
export type SubscriptionPlan = 'FREE' | 'PREMIUM';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type LearningLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type ChallengeType = 'QUIZ' | 'TRADE_SIMULATION' | 'STRATEGY';
export type NotificationType = 'TRADE' | 'SYSTEM' | 'SUBSCRIPTION' | 'PRICE_ALERT';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'POST_MARKET';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  role: Role;
  tier: Tier;
  virtualCapital: number;
  isActive: boolean;
  createdAt: string;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  segment: string;
  sector: string | null;
  lotSize: number;
  tickSize: number;
  ltp?: number;
  change?: number;
  changePct?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface IndexData {
  id: string;
  name: string;
  symbol: string;
  exchange?: string;
  lastPrice: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface Order {
  id: string;
  userId: string;
  stockId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number | null;
  triggerPrice: number | null;
  status: OrderStatus;
  filledPrice: number | null;
  filledQty: number;
  segment: Segment;
  optionType: OptionType | null;
  strikePrice: number | null;
  expiry: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  userId: string;
  stockId: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  investedAmt: number;
  segment: Segment;
  optionType: OptionType | null;
  strikePrice: number | null;
  expiry: string | null;
  /* Upstox instrument_key for the EXACT instrument this position tracks.
   * For OPTIONS: the strike's CE/PE leg key (e.g. "NSE_FO|63811")
   * For EQUITY:  the stock's ISIN-based key (e.g. "NSE_EQ|INE002A01018")
   * Stored at order-placement time so the PositionsPage can subscribe to
   * live ticks for the exact instrument WITHOUT re-fetching the option chain. */
  instrumentKey: string | null;
  stopLoss: number | null;
  target: number | null;
  status: PositionStatus;
  exitPrice: number | null;
  exitReason: ExitReason | null;
  openedAt: string;
  closedAt: string | null;
}

export interface Trade {
  id: string;
  userId: string;
  stockId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  segment: Segment;
  optionType: OptionType | null;
  strikePrice: number | null;
  expiry: string | null;
  pnl: number;
  brokerage: number;
  type: 'OPEN' | 'CLOSE';
  createdAt: string;
}

export interface Portfolio {
  totalBalance: number;
  investedAmount: number;
  availableMargin: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dayPnl: number;
  todayRealizedPnl?: number;
  todayPnl?: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
}

export interface OptionContract {
  id: string;
  symbol: string;
  optionType: OptionType;
  strikePrice: number;
  expiry: string;
  lotSize: number;
  lastPrice: number;
  change: number;
  changePct: number;
  volume: number;
  oi: number;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
}

export interface OptionChainRow {
  strikePrice: number;
  ce: {
    lastPrice: number;
    oi: number;
    volume: number;
    iv: number | null;
    change: number;
    changePct: number;
  };
  pe: {
    lastPrice: number;
    oi: number;
    volume: number;
    iv: number | null;
    change: number;
    changePct: number;
  };
}

export interface WatchlistItem {
  id: string;
  stockId: string;
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePct: number;
  segment: string;
  addedAt: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  level: LearningLevel;
  order: number;
  isPremium: boolean;
  modules: Module[];
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  order: number;
  duration: number | null;
  status?: ProgressStatus;
  score?: number | null;
}

export interface Challenge {
  id: string;
  title: string;
  type: ChallengeType;
  questions: unknown;
  passingScore: number | null;
  reward: string | null;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  senderType: 'USER' | 'ADMIN';
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data: unknown;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: unknown;
  ip: string | null;
  createdAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Market depth / Level 1 data for socket
export interface MarketTick {
  symbol: string;
  ltp: number;
  change: number;
  changePct: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}
