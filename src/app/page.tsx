'use client';

// Re-export the catch-all page so that '/' also renders the SPA.
// The catch-all at src/app/[...slug]/page.tsx handles all real routing client-side.
export { default } from './[...slug]/page';
