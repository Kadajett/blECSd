/**
 * Suspend/resume handling namespace.
 *
 * Functions for handling terminal suspend (Ctrl+Z) and resume operations,
 * restoring terminal state after backgrounding.
 *
 * @example
 * ```typescript
 * import { suspend } from 'blecsd/terminal';
 *
 * // Create suspend manager
 * const manager = suspend.createSuspendManager(program, {
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
 * suspend.suspend(manager);
 *
 * // Access suspend sequences
 * const sequences = suspend.suspendSequences;
 * console.log(sequences.suspend); // SIGTSTP escape
 * console.log(sequences.resume);  // Resume escape
 * ```
 */

import { createSuspendManager, suspend as suspendFn, suspendSequences } from '../suspend';

/**
 * Suspend/resume handling namespace.
 */
export const suspend = Object.freeze({
	createSuspendManager,
	suspend: suspendFn,
	suspendSequences: Object.freeze(suspendSequences),
});

export type SuspendModule = typeof suspend;
