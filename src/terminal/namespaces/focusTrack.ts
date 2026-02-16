/**
 * Focus tracking namespace.
 *
 * Functions for tracking terminal window focus state using the focus
 * reporting escape sequences.
 *
 * @example
 * ```typescript
 * import { focusTrack } from 'blecsd/terminal';
 *
 * // Create focus tracker
 * const tracker = focusTrack.createFocusTracker(program);
 *
 * // Enable focus tracking
 * focusTrack.enableFocusTracking(program);
 *
 * // Check focus state
 * if (focusTrack.isTerminalFocused()) {
 *   console.log('Terminal has focus');
 * }
 *
 * // Listen to focus events
 * const eventBus = focusTrack.getTerminalFocusEventBus();
 * eventBus.on('focus', () => console.log('Terminal focused'));
 * eventBus.on('blur', () => console.log('Terminal blurred'));
 *
 * // Disable when done
 * focusTrack.disableFocusTracking(program);
 * ```
 */

import {
	createFocusTracker,
	disableFocusTracking,
	enableFocusTracking,
	getFocusTracker,
	getTerminalFocusEventBus,
	isTerminalFocused,
	resetTerminalFocusEventBus,
	triggerFocusEvent,
} from '../focusTracking';

/**
 * Focus tracking namespace.
 */
export const focusTrack = Object.freeze({
	createFocusTracker,
	disableFocusTracking,
	enableFocusTracking,
	getFocusTracker,
	getTerminalFocusEventBus,
	isTerminalFocused,
	resetTerminalFocusEventBus,
	triggerFocusEvent,
});

export type FocusTrackModule = typeof focusTrack;
