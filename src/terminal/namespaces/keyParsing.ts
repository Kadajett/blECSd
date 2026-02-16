/**
 * Key parsing namespace.
 *
 * Functions for parsing keyboard input sequences into structured key events.
 *
 * @example
 * ```typescript
 * import { keyParsing } from 'blecsd/terminal';
 *
 * // Parse key sequence from buffer
 * const buffer = Buffer.from('\x1b[A'); // Up arrow
 * const event = keyParsing.parseKeySequence(buffer.toString());
 * if (event) {
 *   console.log(`Key: ${event.name}, Ctrl: ${event.ctrl}, Alt: ${event.meta}`);
 * }
 *
 * // Parse from buffer directly
 * const events = keyParsing.parseKeyBuffer(buffer);
 * for (const event of events) {
 *   if (!keyParsing.isMouseSequence(buffer)) {
 *     // Handle key event
 *   }
 * }
 * ```
 */

import { isMouseSequence, parseKeyBuffer, parseKeySequence } from '../keyParser';

/**
 * Key parsing namespace.
 */
export const keyParsing = Object.freeze({
	isMouseSequence,
	parseKeyBuffer,
	parseKeySequence,
});

export type KeyParsingModule = typeof keyParsing;
