/**
 * Program namespace.
 *
 * Functions for creating and managing terminal program instances that
 * handle low-level terminal I/O and state.
 *
 * @example
 * ```typescript
 * import { program } from 'blecsd/terminal';
 *
 * // Create program instance
 * const prog = program.createProgram({
 *   input: process.stdin,
 *   output: process.stdout,
 *   enableMouse: true,
 *   enableKeys: true,
 * });
 *
 * // Listen to events
 * prog.on('key', (event) => {
 *   console.log(`Key: ${event.key}`);
 * });
 *
 * prog.on('mouse', (event) => {
 *   console.log(`Mouse: ${event.x}, ${event.y}`);
 * });
 *
 * prog.on('resize', (event) => {
 *   console.log(`Resized to ${event.cols}x${event.rows}`);
 * });
 *
 * // Clean up
 * prog.destroy();
 * ```
 */

import { createProgram } from '../program';

/**
 * Program namespace.
 */
export const program = Object.freeze({
	createProgram,
});

export type ProgramModule = typeof program;
