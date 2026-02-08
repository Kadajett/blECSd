/**
 * Terminal Focus Tracking
 *
 * Provides focus/blur event handling that detects when the terminal window
 * gains or loses focus using terminal focus reporting (CSI ? 1004 h/l).
 *
 * @module terminal/focusTracking
 *
 * @example
 * ```typescript
 * import {
 *   createInputHandler,
 *   createFocusTracker,
 *   enableFocusTracking,
 *   disableFocusTracking,
 *   getTerminalFocusEventBus,
 * } from 'blecsd';
 *
 * const inputHandler = createInputHandler(process.stdin);
 * const tracker = createFocusTracker(inputHandler);
 *
 * // Listen for focus events
 * getTerminalFocusEventBus().on('focus', () => {
 *   console.log('Terminal gained focus');
 * });
 *
 * getTerminalFocusEventBus().on('blur', () => {
 *   console.log('Terminal lost focus');
 * });
 *
 * // Enable focus tracking
 * enableFocusTracking(tracker);
 *
 * // When done
 * disableFocusTracking(tracker);
 * ```
 */

import { createEventBus, type EventBus } from '../core/events';
import { mouse } from './ansi';
import type { InputHandler } from './inputStream';
import type { FocusEvent } from './mouseParser';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Focus tracking event map for type-safe event handling.
 */
export interface FocusTrackingEventMap {
	/** Terminal window gained focus */
	focus: undefined;
	/** Terminal window lost focus */
	blur: undefined;
}

/**
 * Focus tracker state.
 */
export interface FocusTrackerState {
	/** The input handler */
	readonly inputHandler: InputHandler;
	/** Whether tracking is currently enabled */
	enabled: boolean;
	/** Current focus state (true = focused, false = blurred) */
	focused: boolean;
	/** The focus handler function (for removal) */
	readonly handler: (event: FocusEvent) => void;
	/** Unsubscribe function from input handler */
	unsubscribe: (() => void) | null;
}

// =============================================================================
// MODULE STATE
// =============================================================================

/** Event bus for focus tracking events */
let focusEventBus: EventBus<FocusTrackingEventMap> | null = null;

/** Active focus trackers by input handler */
const activeTrackers = new WeakMap<InputHandler, FocusTrackerState>();

// =============================================================================
// EVENT BUS
// =============================================================================

/**
 * Gets the focus event bus, creating if needed.
 *
 * @returns The focus event bus
 *
 * @example
 * ```typescript
 * const bus = getTerminalFocusEventBus();
 * bus.on('focus', () => {
 *   console.log('Terminal window gained focus');
 * });
 * bus.on('blur', () => {
 *   console.log('Terminal window lost focus');
 * });
 * ```
 */
export function getTerminalFocusEventBus(): EventBus<FocusTrackingEventMap> {
	if (!focusEventBus) {
		focusEventBus = createEventBus<FocusTrackingEventMap>();
	}
	return focusEventBus;
}

/**
 * Resets the focus event bus. Used for testing.
 * @internal
 */
export function resetTerminalFocusEventBus(): void {
	focusEventBus = null;
}

// =============================================================================
// FOCUS TRACKING
// =============================================================================

/**
 * Creates a focus tracker for the given input handler.
 *
 * The tracker will:
 * 1. Listen for focus events from the terminal
 * 2. Track current focus state
 * 3. Emit focus/blur events on the event bus
 *
 * @param inputHandler - The input handler
 * @returns A focus tracker state object
 *
 * @example
 * ```typescript
 * import { createFocusTracker, enableFocusTracking } from 'blecsd';
 *
 * const tracker = createFocusTracker(inputHandler);
 * enableFocusTracking(tracker);
 * ```
 */
export function createFocusTracker(inputHandler: InputHandler): FocusTrackerState {
	const handler = (event: FocusEvent): void => {
		handleFocusEvent(event, state);
	};

	const state: FocusTrackerState = {
		inputHandler,
		enabled: false,
		focused: true, // Assume focused initially
		handler,
		unsubscribe: null,
	};

	activeTrackers.set(inputHandler, state);
	return state;
}

/**
 * Internal focus event handling logic.
 */
function handleFocusEvent(event: FocusEvent, state: FocusTrackerState): void {
	if (!state.enabled) {
		return;
	}

	// Skip if focus state hasn't changed
	if (event.focused === state.focused) {
		return;
	}

	// Update state
	state.focused = event.focused;

	// Emit appropriate event
	const bus = getTerminalFocusEventBus();
	if (event.focused) {
		bus.emit('focus', undefined);
	} else {
		bus.emit('blur', undefined);
	}
}

/**
 * Enables focus tracking on an input handler.
 *
 * Sends the CSI ? 1004 h sequence to enable terminal focus reporting
 * and starts listening for focus events.
 *
 * @param state - The focus tracker state from createFocusTracker
 *
 * @example
 * ```typescript
 * const tracker = createFocusTracker(inputHandler);
 * enableFocusTracking(tracker);
 * ```
 */
export function enableFocusTracking(state: FocusTrackerState): void {
	if (state.enabled) {
		return;
	}

	// Enable terminal focus reporting
	const seq = mouse.enableFocus();
	process.stdout.write(seq);

	// Start listening for focus events
	state.unsubscribe = state.inputHandler.onFocus(state.handler);
	state.enabled = true;
}

/**
 * Disables focus tracking on an input handler.
 *
 * Sends the CSI ? 1004 l sequence to disable terminal focus reporting
 * and stops listening for focus events.
 *
 * @param state - The focus tracker state from createFocusTracker
 *
 * @example
 * ```typescript
 * disableFocusTracking(tracker);
 * ```
 */
export function disableFocusTracking(state: FocusTrackerState): void {
	if (!state.enabled) {
		return;
	}

	// Disable terminal focus reporting
	const seq = mouse.disableFocus();
	process.stdout.write(seq);

	// Stop listening for focus events
	if (state.unsubscribe) {
		state.unsubscribe();
		state.unsubscribe = null;
	}

	state.enabled = false;
	activeTrackers.delete(state.inputHandler);
}

/**
 * Gets the active focus tracker for an input handler.
 *
 * @param inputHandler - The input handler
 * @returns The focus tracker state, or undefined if not set up
 */
export function getFocusTracker(inputHandler: InputHandler): FocusTrackerState | undefined {
	return activeTrackers.get(inputHandler);
}

/**
 * Gets the current focus state for an input handler.
 *
 * @param inputHandler - The input handler
 * @returns true if focused, false if blurred, undefined if no tracker
 *
 * @example
 * ```typescript
 * const focused = isFocused(inputHandler);
 * if (focused) {
 *   console.log('Terminal is focused');
 * }
 * ```
 */
export function isTerminalFocused(inputHandler: InputHandler): boolean | undefined {
	const tracker = activeTrackers.get(inputHandler);
	return tracker?.focused;
}

/**
 * Manually triggers a focus event.
 * Useful for testing or when focus state is obtained externally.
 *
 * @param inputHandler - The input handler
 * @param focused - Whether the terminal is focused
 *
 * @example
 * ```typescript
 * // Simulate focus gained
 * triggerFocusEvent(inputHandler, true);
 *
 * // Simulate focus lost
 * triggerFocusEvent(inputHandler, false);
 * ```
 */
export function triggerFocusEvent(inputHandler: InputHandler, focused: boolean): void {
	const state = activeTrackers.get(inputHandler);
	if (state) {
		const event: FocusEvent = {
			focused,
			raw: new Uint8Array(),
		};
		handleFocusEvent(event, state);
	}
}
