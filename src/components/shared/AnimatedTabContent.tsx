'use client';

import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface AnimatedTabContentProps {
  /** Unique key identifying the active tab — changing this triggers the animation */
  activeKey: string | number;
  /** Slide direction: 1 = forward (next tab), -1 = backward (prev tab) */
  direction: number;
  children: ReactNode;
  className?: string;
}

/**
 * Slide animation variants driven by the `direction` custom value.
 *
 * direction = 1  (going forward)  → new content enters from RIGHT, old exits LEFT
 * direction = -1 (going backward) → new content enters from LEFT, old exits RIGHT
 */
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    pointerEvents: 'none' as const,
  }),
  center: {
    x: 0,
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    pointerEvents: 'none' as const,
  }),
};

/**
 * Wraps tab content with a smooth horizontal slide animation.
 * Change `activeKey` to trigger a transition; set `direction` to
 * control slide direction.
 *
 * Uses `AnimatePresence` with `mode="wait"` so the exiting panel
 * finishes before the entering one starts — no overlap, clean swap.
 */
export function AnimatedTabContent({
  activeKey,
  direction,
  children,
  className,
}: AnimatedTabContentProps) {
  return (
    <div className={className} style={{ overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={activeKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 350, damping: 35, mass: 0.8 },
            opacity: { duration: 0.15 },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
