/// <reference types="node" />

/**
 * Next.js Instrumentation Hook
 * 
 * This file runs when the Next.js server starts and stops.
 * We use it to initialize the schedule manager for cron-based workflows.
 */

import { startScheduler, stopScheduler } from '@/lib/scheduler';

export async function register() {
  // Start the scheduler when the server initializes
  // This runs once when the Next.js server starts (both dev and production)
  if (typeof window === 'undefined') {
    // Small delay to ensure database is ready
    setTimeout(() => {
      startScheduler().catch((err) => {
        console.error('[Instrumentation] Failed to start scheduler:', err);
      });
    }, 2000);
  }
}

export async function unregister() {
  // Stop all scheduled jobs when the server shuts down
  if (typeof window === 'undefined') {
    stopScheduler();
  }
}
