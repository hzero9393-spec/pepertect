'use client';

import { ReactNode } from 'react';

interface AnimatedTabContentProps {
  /** Unique key identifying the active tab */
  activeKey: string | number;
  /** Slide direction: 1 = forward, -1 = backward */
  direction: number;
  children: ReactNode;
  className?: string;
}

/**
 * Instant tab swap with CSS-only fade (no framer-motion dependency).
 * Renders immediately — no 200-300ms wait delay.
 */
export function AnimatedTabContent({
  activeKey,
  children,
  className,
}: AnimatedTabContentProps) {
  return (
    <div className={className}>
      <div key={activeKey} className="animate-in fade-in duration-150">
        {children}
      </div>
    </div>
  );
}
