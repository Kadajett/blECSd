/**
 * Resize handling namespace.
 *
 * Functions for managing terminal resize events and SIGWINCH signal handling.
 *
 * @example
 * ```typescript
 * import { resizeNs } from 'blecsd/terminal';
 *
 * // Create resize handler
 * const handler = resizeNs.createResizeHandler(program);
 *
 * // Enable resize handling
 * resizeNs.enableResizeHandling(handler);
 *
 * // Listen to resize events
 * const eventBus = resizeNs.getResizeEventBus();
 * eventBus.on('resize', (event) => {
 *   console.log(`Terminal resized to ${event.cols}x${event.rows}`);
 *   // Redraw UI
 * });
 *
 * // Manually trigger resize
 * resizeNs.triggerResize(handler);
 *
 * // Disable resize handling
 * resizeNs.disableResizeHandling(handler);
 * ```
 */

import {
	createResizeHandler,
	disableResizeHandling,
	enableResizeHandling,
	getResizeEventBus,
	getResizeHandler,
	resetResizeEventBus,
	setupSigwinchHandler,
	triggerResize,
} from '../resize';

/**
 * Resize handling namespace.
 */
export const resizeNs = Object.freeze({
	createResizeHandler,
	disableResizeHandling,
	enableResizeHandling,
	getResizeEventBus,
	getResizeHandler,
	resetResizeEventBus,
	setupSigwinchHandler,
	triggerResize,
});

export type ResizeNsModule = typeof resizeNs;
