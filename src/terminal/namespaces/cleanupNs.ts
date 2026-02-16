/**
 * Cleanup and signal handling namespace.
 *
 * Functions for managing terminal cleanup on exit, registering cleanup handlers,
 * and handling process signals gracefully.
 *
 * @example
 * ```typescript
 * import { cleanupNs } from 'blecsd/terminal';
 *
 * // Register cleanup handlers
 * const cleanup = () => {
 *   // Restore terminal state
 *   program.showCursor();
 *   program.normalBuffer();
 * };
 * cleanupNs.registerForCleanup(cleanup);
 *
 * // Handle exit events
 * cleanupNs.onExit((info) => {
 *   console.log(`Exiting: ${info.reason}`);
 * });
 *
 * // Use cleanup manager directly
 * const manager = cleanupNs.CleanupManager;
 * ```
 */

import { CleanupManager, onExit, registerForCleanup, unregisterFromCleanup } from '../cleanup';

/**
 * Cleanup and signal handling namespace.
 */
export const cleanupNs = Object.freeze({
	CleanupManager: Object.freeze(CleanupManager),
	onExit,
	registerForCleanup,
	unregisterFromCleanup,
});

export type CleanupNsModule = typeof cleanupNs;
