/**
 * 2026 NSE + BSE expiry calendar — full list, per-index.
 *
 * Source: User-provided 2026 calendar (NSE/BSE public notifications).
 *
 * Index → expiry schedule:
 *   NIFTY 50            → every Tuesday (weekly) + last Tuesday (monthly)
 *   SENSEX              → every Thursday (weekly) + last Thursday (monthly)
 *   BANKNIFTY           → only last Tuesday of month (monthly only, no weekly)
 *   FINNIFTY            → only last Tuesday of month (monthly only, no weekly)
 *   NIFTY NEXT 50       → only last Tuesday of month (monthly only) [alias of FINNIFTY slot]
 *
 * Holiday rule: if the scheduled expiry is a trading holiday, expiry shifts
 * to the previous working day. Those shifts are pre-baked into the dates
 * below (marked with the original holiday in a comment).
 *
 * Format: 'YYYY-MM-DD' (ISO). All dates are sorted chronologically within
 * each index's array.
 */

export type ExpiryIndex = 'NIFTY' | 'SENSEX' | 'BANKNIFTY' | 'FINNIFTY';

interface ExpiryEntry {
  date: string;       // YYYY-MM-DD
  type: 'WEEKLY' | 'MONTHLY';
  label?: string;     // e.g. "Jan W1", "Jan Monthly"
}

// ---------- NIFTY 50 — Tuesdays (weekly + last Tuesday monthly) ----------
const NIFTY_EXPIRIES_2026: ExpiryEntry[] = [
  { date: '2026-01-06', type: 'WEEKLY',  label: 'Jan W1' },
  { date: '2026-01-13', type: 'WEEKLY',  label: 'Jan W2' },
  { date: '2026-01-20', type: 'WEEKLY',  label: 'Jan W3' },
  { date: '2026-01-27', type: 'MONTHLY', label: 'Jan Monthly' },
  { date: '2026-02-03', type: 'WEEKLY',  label: 'Feb W1' },
  { date: '2026-02-10', type: 'WEEKLY',  label: 'Feb W2' },
  { date: '2026-02-17', type: 'WEEKLY',  label: 'Feb W3' },
  { date: '2026-02-24', type: 'MONTHLY', label: 'Feb Monthly' },
  // March: 3rd is Holi → shifted to Mon 2 Mar
  { date: '2026-03-02', type: 'WEEKLY',  label: 'Mar W1' },
  { date: '2026-03-10', type: 'WEEKLY',  label: 'Mar W2' },
  { date: '2026-03-17', type: 'WEEKLY',  label: 'Mar W3' },
  { date: '2026-03-24', type: 'WEEKLY',  label: 'Mar W4' },
  // 31 Mar is Mahavir Jayanti → shifted to Mon 30 Mar
  { date: '2026-03-30', type: 'MONTHLY', label: 'Mar Monthly' },
  { date: '2026-04-07', type: 'WEEKLY',  label: 'Apr W1' },
  // 14 Apr is Ambedkar Jayanti → shifted to Mon 13 Apr
  { date: '2026-04-13', type: 'WEEKLY',  label: 'Apr W2' },
  { date: '2026-04-21', type: 'WEEKLY',  label: 'Apr W3' },
  { date: '2026-04-28', type: 'MONTHLY', label: 'Apr Monthly' },
  { date: '2026-05-05', type: 'WEEKLY',  label: 'May W1' },
  { date: '2026-05-12', type: 'WEEKLY',  label: 'May W2' },
  { date: '2026-05-19', type: 'WEEKLY',  label: 'May W3' },
  { date: '2026-05-26', type: 'MONTHLY', label: 'May Monthly' },
  { date: '2026-06-02', type: 'WEEKLY',  label: 'Jun W1' },
  { date: '2026-06-09', type: 'WEEKLY',  label: 'Jun W2' },
  { date: '2026-06-16', type: 'WEEKLY',  label: 'Jun W3' },
  { date: '2026-06-23', type: 'WEEKLY',  label: 'Jun W4' },
  { date: '2026-06-30', type: 'MONTHLY', label: 'Jun Monthly' },
  { date: '2026-07-07', type: 'WEEKLY',  label: 'Jul W1' },
  { date: '2026-07-14', type: 'WEEKLY',  label: 'Jul W2' },
  { date: '2026-07-21', type: 'WEEKLY',  label: 'Jul W3' },
  { date: '2026-07-28', type: 'MONTHLY', label: 'Jul Monthly' },
  { date: '2026-08-04', type: 'WEEKLY',  label: 'Aug W1' },
  { date: '2026-08-11', type: 'WEEKLY',  label: 'Aug W2' },
  { date: '2026-08-18', type: 'WEEKLY',  label: 'Aug W3' },
  { date: '2026-08-25', type: 'MONTHLY', label: 'Aug Monthly' },
  { date: '2026-09-01', type: 'WEEKLY',  label: 'Sep W1' },
  { date: '2026-09-08', type: 'WEEKLY',  label: 'Sep W2' },
  { date: '2026-09-15', type: 'WEEKLY',  label: 'Sep W3' },
  { date: '2026-09-22', type: 'WEEKLY',  label: 'Sep W4' },
  { date: '2026-09-29', type: 'MONTHLY', label: 'Sep Monthly' },
  { date: '2026-10-06', type: 'WEEKLY',  label: 'Oct W1' },
  { date: '2026-10-13', type: 'WEEKLY',  label: 'Oct W2' },
  // 20 Oct is Dussehra → shifted to Mon 19 Oct
  { date: '2026-10-19', type: 'WEEKLY',  label: 'Oct W3' },
  { date: '2026-10-27', type: 'MONTHLY', label: 'Oct Monthly' },
  { date: '2026-11-03', type: 'WEEKLY',  label: 'Nov W1' },
  // 10 Nov is Diwali → shifted to Mon 9 Nov
  { date: '2026-11-09', type: 'WEEKLY',  label: 'Nov W2' },
  { date: '2026-11-17', type: 'WEEKLY',  label: 'Nov W3' },
  // 24 Nov is Guru Nanak Jayanti → shifted to Mon 23 Nov (also Monthly)
  { date: '2026-11-23', type: 'MONTHLY', label: 'Nov Monthly' },
  { date: '2026-12-01', type: 'WEEKLY',  label: 'Dec W1' },
  { date: '2026-12-08', type: 'WEEKLY',  label: 'Dec W2' },
  { date: '2026-12-15', type: 'WEEKLY',  label: 'Dec W3' },
  { date: '2026-12-22', type: 'WEEKLY',  label: 'Dec W4' },
  { date: '2026-12-29', type: 'MONTHLY', label: 'Dec Monthly' },
];

// ---------- SENSEX — Thursdays (weekly + last Thursday monthly) ----------
const SENSEX_EXPIRIES_2026: ExpiryEntry[] = [
  { date: '2026-01-01', type: 'WEEKLY',  label: 'Jan W1' },
  { date: '2026-01-08', type: 'WEEKLY',  label: 'Jan W2' },
  // 15 Jan holiday → shifted to Wed 14 Jan
  { date: '2026-01-14', type: 'WEEKLY',  label: 'Jan W3' },
  { date: '2026-01-22', type: 'WEEKLY',  label: 'Jan W4' },
  { date: '2026-01-29', type: 'MONTHLY', label: 'Jan Monthly' },
  { date: '2026-02-05', type: 'WEEKLY',  label: 'Feb W1' },
  { date: '2026-02-12', type: 'WEEKLY',  label: 'Feb W2' },
  { date: '2026-02-19', type: 'WEEKLY',  label: 'Feb W3' },
  { date: '2026-02-26', type: 'MONTHLY', label: 'Feb Monthly' },
  { date: '2026-03-05', type: 'WEEKLY',  label: 'Mar W1' },
  { date: '2026-03-12', type: 'WEEKLY',  label: 'Mar W2' },
  { date: '2026-03-19', type: 'WEEKLY',  label: 'Mar W3' },
  // 26 Mar is Ram Navami → shifted to Wed 25 Mar (also Monthly)
  { date: '2026-03-25', type: 'MONTHLY', label: 'Mar Monthly' },
  { date: '2026-04-02', type: 'WEEKLY',  label: 'Apr W1' },
  { date: '2026-04-09', type: 'WEEKLY',  label: 'Apr W2' },
  { date: '2026-04-16', type: 'WEEKLY',  label: 'Apr W3' },
  { date: '2026-04-23', type: 'WEEKLY',  label: 'Apr W4' },
  { date: '2026-04-30', type: 'MONTHLY', label: 'Apr Monthly' },
  { date: '2026-05-07', type: 'WEEKLY',  label: 'May W1' },
  { date: '2026-05-14', type: 'WEEKLY',  label: 'May W2' },
  { date: '2026-05-21', type: 'WEEKLY',  label: 'May W3' },
  // 28 May is Bakrid → shifted to Wed 27 May (also Monthly)
  { date: '2026-05-27', type: 'MONTHLY', label: 'May Monthly' },
  { date: '2026-06-04', type: 'WEEKLY',  label: 'Jun W1' },
  { date: '2026-06-11', type: 'WEEKLY',  label: 'Jun W2' },
  { date: '2026-06-18', type: 'WEEKLY',  label: 'Jun W3' },
  { date: '2026-06-25', type: 'MONTHLY', label: 'Jun Monthly' },
  { date: '2026-07-02', type: 'WEEKLY',  label: 'Jul W1' },
  { date: '2026-07-09', type: 'WEEKLY',  label: 'Jul W2' },
  { date: '2026-07-16', type: 'WEEKLY',  label: 'Jul W3' },
  { date: '2026-07-23', type: 'WEEKLY',  label: 'Jul W4' },
  { date: '2026-07-30', type: 'MONTHLY', label: 'Jul Monthly' },
  { date: '2026-08-06', type: 'WEEKLY',  label: 'Aug W1' },
  { date: '2026-08-13', type: 'WEEKLY',  label: 'Aug W2' },
  { date: '2026-08-20', type: 'WEEKLY',  label: 'Aug W3' },
  { date: '2026-08-27', type: 'MONTHLY', label: 'Aug Monthly' },
  { date: '2026-09-03', type: 'WEEKLY',  label: 'Sep W1' },
  { date: '2026-09-10', type: 'WEEKLY',  label: 'Sep W2' },
  { date: '2026-09-17', type: 'WEEKLY',  label: 'Sep W3' },
  { date: '2026-09-24', type: 'MONTHLY', label: 'Sep Monthly' },
  { date: '2026-10-01', type: 'WEEKLY',  label: 'Oct W1' },
  { date: '2026-10-08', type: 'WEEKLY',  label: 'Oct W2' },
  { date: '2026-10-15', type: 'WEEKLY',  label: 'Oct W3' },
  { date: '2026-10-22', type: 'WEEKLY',  label: 'Oct W4' },
  { date: '2026-10-29', type: 'MONTHLY', label: 'Oct Monthly' },
  { date: '2026-11-05', type: 'WEEKLY',  label: 'Nov W1' },
  { date: '2026-11-12', type: 'WEEKLY',  label: 'Nov W2' },
  { date: '2026-11-19', type: 'WEEKLY',  label: 'Nov W3' },
  { date: '2026-11-26', type: 'MONTHLY', label: 'Nov Monthly' },
  { date: '2026-12-03', type: 'WEEKLY',  label: 'Dec W1' },
  { date: '2026-12-10', type: 'WEEKLY',  label: 'Dec W2' },
  { date: '2026-12-17', type: 'WEEKLY',  label: 'Dec W3' },
  { date: '2026-12-24', type: 'WEEKLY',  label: 'Dec W4' },
  { date: '2026-12-31', type: 'MONTHLY', label: 'Dec Monthly' },
];

// ---------- BANKNIFTY — last Tuesday of month (monthly only) ----------
const BANKNIFTY_EXPIRIES_2026: ExpiryEntry[] = [
  { date: '2026-01-27', type: 'MONTHLY', label: 'Jan Monthly' },
  { date: '2026-02-24', type: 'MONTHLY', label: 'Feb Monthly' },
  { date: '2026-03-30', type: 'MONTHLY', label: 'Mar Monthly' }, // shifted from 31 Mar
  { date: '2026-04-28', type: 'MONTHLY', label: 'Apr Monthly' },
  { date: '2026-05-26', type: 'MONTHLY', label: 'May Monthly' },
  { date: '2026-06-30', type: 'MONTHLY', label: 'Jun Monthly' },
  { date: '2026-07-28', type: 'MONTHLY', label: 'Jul Monthly' },
  { date: '2026-08-25', type: 'MONTHLY', label: 'Aug Monthly' },
  { date: '2026-09-29', type: 'MONTHLY', label: 'Sep Monthly' },
  { date: '2026-10-27', type: 'MONTHLY', label: 'Oct Monthly' },
  { date: '2026-11-23', type: 'MONTHLY', label: 'Nov Monthly' }, // shifted from 24 Nov
  { date: '2026-12-29', type: 'MONTHLY', label: 'Dec Monthly' },
];

// ---------- FINNIFTY — last Tuesday of month (monthly only) ----------
// (Same dates as BANKNIFTY — both are last-Tuesday monthly on NSE)
const FINNIFTY_EXPIRIES_2026: ExpiryEntry[] = BANKNIFTY_EXPIRIES_2026;

// ---------- Lookup table ----------
const CALENDAR: Record<ExpiryIndex, ExpiryEntry[]> = {
  NIFTY: NIFTY_EXPIRIES_2026,
  SENSEX: SENSEX_EXPIRIES_2026,
  BANKNIFTY: BANKNIFTY_EXPIRIES_2026,
  FINNIFTY: FINNIFTY_EXPIRIES_2026,
};

/**
 * Returns the next N upcoming expiry dates for the given index,
 * starting from "today". Expiries that have already passed are
 * automatically excluded — so when one expires, the next one in the
 * calendar rolls into the list naturally.
 *
 * @param index  One of NIFTY / SENSEX / BANKNIFTY / FINNIFTY
 * @param count  Number of upcoming expiries to return (default 4)
 * @param refDate Reference date (default: today, useful for testing)
 */
export function getUpcomingExpiries(
  index: ExpiryIndex,
  count = 4,
  refDate: Date = new Date(),
): ExpiryEntry[] {
  const all = CALENDAR[index] ?? [];
  // Normalize refDate to midnight local time
  const ref = new Date(refDate);
  ref.setHours(0, 0, 0, 0);
  return all
    .filter((e) => {
      const d = new Date(e.date + 'T00:00:00');
      return d >= ref;
    })
    .slice(0, count);
}

/**
 * Returns ALL expiries for the given index in 2026 (for debugging / display).
 */
export function getAllExpiries(index: ExpiryIndex): ExpiryEntry[] {
  return CALENDAR[index] ?? [];
}

/**
 * Returns the ExpiryEntry for a given date string, or null if not in calendar.
 */
export function findExpiry(index: ExpiryIndex, date: string): ExpiryEntry | null {
  return CALENDAR[index]?.find((e) => e.date === date) ?? null;
}

/**
 * Format an ISO date (YYYY-MM-DD) as a friendly label.
 *   '2026-01-06' → '06 Jan 2026'
 */
export function formatExpiryDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Compute days-to-expiry from today.
 *   Returns 0 if expiry is today, negative if already expired.
 */
export function daysToExpiry(date: string, refDate: Date = new Date()): number {
  const ref = new Date(refDate);
  ref.setHours(0, 0, 0, 0);
  const d = new Date(date + 'T00:00:00');
  return Math.round((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
}
