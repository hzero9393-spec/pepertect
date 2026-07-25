const ENFORCE = process.env.ENFORCE_MARKET_HOURS === 'true';
const OPEN_TIME = process.env.MARKET_OPEN_TIME || '09:15';
const CLOSE_TIME = process.env.MARKET_CLOSE_TIME || '15:30';

export function isMarketOpen(): boolean {
  if (!ENFORCE) return true;
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const [h, m] = [istTime.getHours(), istTime.getMinutes()];
  const [openH, openM] = OPEN_TIME.split(':').map(Number);
  const [closeH, closeM] = CLOSE_TIME.split(':').map(Number);
  const currentMins = h * 60 + m;
  return currentMins >= openH * 60 + openM && currentMins <= closeH * 60 + closeM;
}
