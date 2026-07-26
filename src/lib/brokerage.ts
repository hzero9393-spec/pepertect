const BROKERAGE_PERCENT = parseFloat(process.env.BROKERAGE_PERCENT || '0.03');
const MIN_BROKERAGE = parseFloat(process.env.MIN_BROKERAGE || '20');
const MAX_BROKERAGE = parseFloat(process.env.MAX_BROKERAGE || '100');

export function calculateBrokerage(orderValue: number): number {
  const calculated = orderValue * BROKERAGE_PERCENT / 100;
  return Math.max(MIN_BROKERAGE, Math.min(MAX_BROKERAGE, calculated));
}
