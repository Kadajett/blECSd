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
 * // Create program
 * const program = program.createProgram({
 *   input: process.stdin,
 *   output: process.stdout,
 *   enableMouse: true,
 *   enableKeys: true,
 * });
 *
 * // Listen to events
 * program.on('key', (event) => {
 *   console.log(`Key: ${event.key}`);
 * });
 *
 * program.on('mouse', (event) => {
 *   console.log(`Mouse: ${event.x}, ${event.y}`);
 * });
 *
 * program.on('resize', (event) => {
 *   console.log(`Resized to ${event.cols}x${event.rows}`);
 * });
 *
 * // Clean up
 * program.destroy();
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
