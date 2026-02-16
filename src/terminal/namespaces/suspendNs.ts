/**
 * Suspend/resume handling namespace.
 *
 * Functions for handling terminal suspend (Ctrl+Z) and resume operations,
 * restoring terminal state after backgrounding.
 *
 * @example
 * ```typescript
 * import { suspendNs } from 'blecsd/terminal';
 *
 * // Create suspend manager
 * const manager = suspendNs.createSuspendManager(program, {
 *   onSuspend: () => {
 *     console.log('Process suspending...');
 *     // Save state
 *   },
 *   onResume: () => {
 *     console.log('Process resumed!');
 *     // Restore terminal state, redraw UI
 *   },
 * });
 *
 * // Manually suspend
 * suspendNs.suspend(manager);
 *
 * // Access suspend sequences
 * const sequences = suspendNs.suspendSequences;
 * console.log(sequences.suspend); // SIGTSTP escape
 * console.log(sequences.resume);  // Resume escape
 * ```
 */

import { createSuspendManager, suspend, suspendSequences } from '../suspend';

/**
 * Suspend/resume handling namespace.
 */
export const suspendNs = Object.freeze({
	createSuspendManager,
	suspend,
	suspendSequences: Object.freeze(suspendSequences),
});

export type SuspendNsModule = typeof suspendNs;
