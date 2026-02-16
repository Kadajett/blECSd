/**
 * Terminfo namespace.
 *
 * Functions for querying terminal capabilities via terminfo/termcap database.
 *
 * @example
 * ```typescript
 * import { terminfo } from 'blecsd/terminal';
 *
 * // Create tput instance
 * const tput = terminfo.createTput({
 *   terminal: 'xterm-256color',
 *   extended: true,
 * });
 *
 * // Get terminal capabilities
 * const clearScreen = tput.clear();
 * const moveCursor = tput.cup(10, 5); // Move to row 10, col 5
 * const setFg = tput.setaf(1); // Set foreground to red
 *
 * // Use default tput instance
 * const defaultTput = terminfo.getDefaultTput();
 * console.log('Supports colors:', defaultTput.colors());
 *
 * // Get default xterm data
 * const xtermData = terminfo.getDefaultXtermData();
 * ```
 */

import { createTput, getDefaultTput, getDefaultXtermData, resetDefaultTput } from '../terminfo';

/**
 * Terminfo namespace.
 */
export const terminfo = Object.freeze({
	createTput,
	getDefaultTput,
	getDefaultXtermData,
	resetDefaultTput,
});

export type TerminfoModule = typeof terminfo;
