'use client';

import { useEffect, useState } from 'react';

/**
 * Returns whether the NSE market is currently open and how long until close.
 *
 * Market hours: 9:15 AM – 3:30 PM IST, Monday – Friday.
 *
 * Usage:
 *   const { isMarketOpen, timeToClose } = useMarketStatus();
 */

export function useMarketStatus() {
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [timeToClose, setTimeToClose] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();

      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 19800000 ms
      const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const ist = new Date(utc + istOffset);

      const day = ist.getDay(); // 0 = Sun, 6 = Sat
      const hours = ist.getHours();
      const minutes = ist.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      // Market hours in minutes from midnight: 9:15 = 555, 15:30 = 930
      const MARKET_OPEN = 9 * 60 + 15;  // 555
      const MARKET_CLOSE = 15 * 60 + 30; // 930

      const isOpen = day >= 1 && day <= 5 && currentMinutes >= MARKET_OPEN && currentMinutes < MARKET_CLOSE;
      setIsMarketOpen(isOpen);

      if (isOpen) {
        const minutesRemaining = MARKET_CLOSE - currentMinutes;
        const h = Math.floor(minutesRemaining / 60);
        const m = minutesRemaining % 60;
        if (h > 0) {
          setTimeToClose(`${h}h ${m}m`);
        } else {
          setTimeToClose(`${m}m`);
        }
      } else {
        setTimeToClose(null);
      }
    }

    tick();
    const id = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(id);
  }, []);

  return { isMarketOpen, timeToClose };
}
