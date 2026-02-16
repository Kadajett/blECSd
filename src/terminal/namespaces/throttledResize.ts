/**
 * Throttled resize namespace.
 *
 * Functions for throttling and debouncing terminal resize events
 * to avoid expensive redraws on every SIGWINCH.
 *
 * @example
 * ```typescript
 * import { throttledResize } from 'blecsd/terminal';
 *
 * // Create throttled resize handler (max 10 resizes per second)
 * const throttled = throttledResize.createThrottledResize((cols, rows) => {
 *   console.log(`Redrawing UI at ${cols}x${rows}`);
 *   // Expensive redraw operation
 * }, {
 *   throttleMs: 100,
 * });
 *
 * // Create debounced resize handler (wait 200ms after last resize)
 * const debounced = throttledResize.debounceResize((cols, rows) => {
 *   console.log(`Final size: ${cols}x${rows}`);
 *   // Expensive layout calculation
 * }, 200);
 *
 * // Use with resize events
 * process.stdout.on('resize', () => {
 *   throttled.resize(process.stdout.columns, process.stdout.rows);
 * });
 * ```
 */

import { createThrottledResize, debounceResize, throttleResize } from '../throttledResize';

/**
 * Throttled resize namespace.
 */
export const throttledResize = Object.freeze({
	createThrottledResize,
	debounceResize,
	throttleResize,
});

export type ThrottledResizeModule = typeof throttledResize;
