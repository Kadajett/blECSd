/**
 * Input stream handler namespace.
 *
 * Functions for creating and managing input stream handlers that parse
 * raw terminal input into keyboard, mouse, and focus events.
 *
 * @example
 * ```typescript
 * import { inputStreamNs } from 'blecsd/terminal';
 *
 * // Create input handler
 * const handler = inputStreamNs.createInputHandler(program, {
 *   enableMouse: true,
 *   enableFocus: true,
 *   enablePaste: true,
 * });
 *
 * // Subscribe to key events
 * const unsubscribe = handler.onKey((event) => {
 *   console.log(`Key pressed: ${event.key}`);
 *   if (event.ctrl && event.key === 'c') {
 *     process.exit(0);
 *   }
 * });
 *
 * // Subscribe to mouse events
 * handler.onMouse((event) => {
 *   console.log(`Mouse: ${event.x}, ${event.y}, button: ${event.button}`);
 * });
 *
 * // Subscribe to focus events
 * handler.onFocus((event) => {
 *   console.log(`Terminal ${event.focused ? 'focused' : 'blurred'}`);
 * });
 *
 * // Unsubscribe when done
 * unsubscribe();
 * ```
 */

import { createInputHandler } from '../inputStream';

/**
 * Input stream handler namespace.
 */
export const inputStreamNs = Object.freeze({
	createInputHandler,
});

export type InputStreamNsModule = typeof inputStreamNs;
