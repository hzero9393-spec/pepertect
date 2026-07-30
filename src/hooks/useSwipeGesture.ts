'use client';

import { useEffect, useRef } from 'react';

export function useSwipeGesture(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  keyboardEnabled?: boolean;
}): React.RefObject<HTMLDivElement | null> {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    keyboardEnabled = true,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isTracking = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
      isTracking.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking.current) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX.current);
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Prevent default scrolling when a horizontal swipe is detected
      if (deltaX > deltaY) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking.current) return;
      isTracking.current = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      const elapsed = Date.now() - touchStartTime.current;

      if (elapsed > maxSwipeTime) return;

      // Determine if horizontal or vertical swipe based on the dominant axis
      if (absDeltaX > absDeltaY && absDeltaX >= minSwipeDistance) {
        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      } else if (absDeltaY > absDeltaX && absDeltaY >= minSwipeDistance) {
        if (deltaY < 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      touchStartX.current = e.clientX;
      touchStartY.current = e.clientY;
      touchStartTime.current = Date.now();
      isTracking.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isTracking.current) return;
      isTracking.current = false;

      const deltaX = e.clientX - touchStartX.current;
      const deltaY = e.clientY - touchStartY.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      const elapsed = Date.now() - touchStartTime.current;

      if (elapsed > maxSwipeTime) return;

      if (absDeltaX > absDeltaY && absDeltaX >= minSwipeDistance) {
        if (deltaX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      } else if (absDeltaY > absDeltaX && absDeltaY >= minSwipeDistance) {
        if (deltaY < 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardEnabled) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onSwipeLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSwipeRight?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onSwipeUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          onSwipeDown?.();
          break;
      }
    };

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse events (desktop drag)
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Keyboard events
    if (keyboardEnabled) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (keyboardEnabled) {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance,
    maxSwipeTime,
    keyboardEnabled,
  ]);

  return containerRef;
}
