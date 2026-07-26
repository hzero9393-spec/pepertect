import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const placeOrderSchema = z.object({
  symbol: z.string().min(1),
  segment: z.enum(['EQUITY', 'FUTURES', 'OPTIONS']),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT', 'SL']),
  quantity: z.number().int().positive(),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  target: z.number().positive().optional(),
  optionType: z.enum(['CE', 'PE']).optional(),
  strikePrice: z.number().positive().optional(),
  expiry: z.string().optional(),
});

export const squareOffSchema = z.object({
  positionId: z.string(),
  triggerPrice: z.number().optional(),
  reason: z.enum(['MANUAL', 'STOP_LOSS', 'TARGET', 'EXPIRY']),
});

export const watchlistSchema = z.object({
  symbol: z.string().min(1),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  category: z.string().min(1),
  description: z.string().min(20, 'Description must be at least 20 characters'),
});
