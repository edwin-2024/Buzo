/**
 * Configuration parameters for the Buzo seat reservation lifecycle.
 */

// Time a passenger has to complete checkout after selecting seats (10 minutes)
export const RESERVATION_HOLD_MINUTES = 10;
export const RESERVATION_HOLD_MS = RESERVATION_HOLD_MINUTES * 60 * 1000;

// Periodic cleanup interval for the background sweeper (runs every 30 seconds)
export const RESERVATION_SWEEPER_INTERVAL_MS = 30 * 1000;
