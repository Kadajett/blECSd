/**
 * Resize handling namespace.
 *
 * Functions for managing terminal resize events and SIGWINCH signal handling.
 *
 * @example
 * ```typescript
 * import { resize } from 'blecsd/terminal';
 *
 * // Create resize handler
 * const handler = resize.createResizeHandler(program);
 *
 * // Enable resize handling
 * resize.enableResizeHandling(handler);
 *
 * // Listen to resize events
 * const eventBus = resize.getResizeEventBus();
 * eventBus.on('resize', (event) => {
 *   console.log(`Terminal resized to ${event.cols}x${event.rows}`);
 *   // Redraw UI
 * });
 *
 * // Manually trigger resize
 * resize.triggerResize(handler);
 *
 * // Disable resize handling
 * resize.disableResizeHandling(handler);
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
export const resize = Object.freeze({
	createResizeHandler,
	disableResizeHandling,
	enableResizeHandling,
	getResizeEventBus,
	getResizeHandler,
	resetResizeEventBus,
	setupSigwinchHandler,
	triggerResize,
});

export type ResizeModule = typeof resize;
