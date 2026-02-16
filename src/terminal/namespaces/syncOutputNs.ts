/**
 * Synchronized output namespace.
 *
 * Functions for using synchronized output mode (DEC mode 2026) to eliminate
 * tearing and flicker during screen updates.
 *
 * @example
 * ```typescript
 * import { syncOutputNs } from 'blecsd/terminal';
 *
 * // Check if supported
 * if (syncOutputNs.isSyncOutputSupported()) {
 *   // Create synchronized output wrapper
 *   const syncOut = syncOutputNs.createSynchronizedOutput(program);
 *
 *   // Begin synchronized update
 *   syncOut.begin();
 *
 *   // Make multiple writes (batched atomically)
 *   program.write('Line 1\n');
 *   program.write('Line 2\n');
 *   program.write('Line 3\n');
 *
 *   // End synchronized update (flushes to terminal)
 *   syncOut.end();
 * }
 * ```
 */

import { createSynchronizedOutput, isSyncOutputSupported } from '../syncOutput';

/**
 * Synchronized output namespace.
 */
export const syncOutputNs = Object.freeze({
	createSynchronizedOutput,
	isSyncOutputSupported,
});

export type SyncOutputNsModule = typeof syncOutputNs;
