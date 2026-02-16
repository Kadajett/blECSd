/**
 * Mouse parsing namespace.
 *
 * Functions for parsing mouse input sequences into structured mouse events.
 *
 * @example
 * ```typescript
 * import { mouseParsing } from 'blecsd/terminal';
 *
 * // Parse mouse sequence
 * const buffer = Buffer.from('\x1b[<0;10;5M'); // SGR mouse event
 * if (mouseParsing.isMouseBuffer(buffer)) {
 *   const event = mouseParsing.parseMouseSequence(buffer.toString());
 *   if (event) {
 *     console.log(`Mouse: x=${event.x}, y=${event.y}, button=${event.button}`);
 *     console.log(`Action: ${event.action}, Shift: ${event.shift}`);
 *   }
 * }
 * ```
 */

import { isMouseBuffer, parseMouseSequence } from '../mouseParser';

/**
 * Mouse parsing namespace.
 */
export const mouseParsing = Object.freeze({
	isMouseBuffer,
	parseMouseSequence,
});

export type MouseParsingModule = typeof mouseParsing;
