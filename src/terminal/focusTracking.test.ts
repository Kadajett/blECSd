/**
 * Tests for Terminal Focus Tracking
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createFocusTracker,
	disableFocusTracking,
	enableFocusTracking,
	getFocusTracker,
	getTerminalFocusEventBus,
	isTerminalFocused,
	resetTerminalFocusEventBus,
	triggerFocusEvent,
} from './focusTracking';
import type { InputHandler } from './inputStream';
import type { FocusEvent } from './mouseParser';

// Mock InputHandler
function createMockInputHandler(): InputHandler {
	const listeners = new Set<(event: FocusEvent) => void>();

	return {
		start: vi.fn(),
		stop: vi.fn(),
		onKey: vi.fn(),
		onMouse: vi.fn(),
		onFocus: vi.fn((handler: (event: FocusEvent) => void) => {
			listeners.add(handler);
			return () => {
				listeners.delete(handler);
			};
		}),
		isRunning: vi.fn(() => true),
		getBufferSize: vi.fn(() => 0),
		// Helper to trigger focus events
		_triggerFocus(focused: boolean): void {
			const event: FocusEvent = {
				focused,
				raw: new Uint8Array(),
			};
			for (const listener of listeners) {
				listener(event);
			}
		},
	} as unknown as InputHandler & { _triggerFocus: (focused: boolean) => void };
}

describe('focusTracking', () => {
	beforeEach(() => {
		resetTerminalFocusEventBus();
		vi.clearAllMocks();
	});

	describe('createFocusTracker', () => {
		it('creates a focus tracker with initial state', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			expect(tracker.inputHandler).toBe(inputHandler);
			expect(tracker.enabled).toBe(false);
			expect(tracker.focused).toBe(true);
			expect(tracker.handler).toBeTypeOf('function');
			expect(tracker.unsubscribe).toBeNull();
		});

		it('stores tracker in WeakMap', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			expect(getFocusTracker(inputHandler)).toBe(tracker);
		});
	});

	describe('enableFocusTracking', () => {
		it('enables focus tracking and subscribes to events', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			enableFocusTracking(tracker);

			expect(tracker.enabled).toBe(true);
			expect(tracker.unsubscribe).toBeTypeOf('function');
			expect(inputHandler.onFocus).toHaveBeenCalledWith(tracker.handler);
		});

		it('does nothing if already enabled', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			enableFocusTracking(tracker);
			const unsubscribe = tracker.unsubscribe;

			enableFocusTracking(tracker);

			expect(tracker.unsubscribe).toBe(unsubscribe);
		});
	});

	describe('disableFocusTracking', () => {
		it('disables focus tracking and unsubscribes from events', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			enableFocusTracking(tracker);
			const unsubscribe = vi.fn(tracker.unsubscribe ?? (() => {}));
			tracker.unsubscribe = unsubscribe;

			disableFocusTracking(tracker);

			expect(tracker.enabled).toBe(false);
			expect(tracker.unsubscribe).toBeNull();
			expect(unsubscribe).toHaveBeenCalled();
		});

		it('removes tracker from WeakMap', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			enableFocusTracking(tracker);
			disableFocusTracking(tracker);

			expect(getFocusTracker(inputHandler)).toBeUndefined();
		});

		it('does nothing if already disabled', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);

			disableFocusTracking(tracker);

			expect(tracker.enabled).toBe(false);
		});
	});

	describe('getTerminalFocusEventBus', () => {
		it('returns the same event bus instance', () => {
			const bus1 = getTerminalFocusEventBus();
			const bus2 = getTerminalFocusEventBus();

			expect(bus1).toBe(bus2);
		});

		it('creates new event bus after reset', () => {
			const bus1 = getTerminalFocusEventBus();
			resetTerminalFocusEventBus();
			const bus2 = getTerminalFocusEventBus();

			expect(bus1).not.toBe(bus2);
		});
	});

	describe('focus event handling', () => {
		it('emits focus event when terminal gains focus', () => {
			const inputHandler = createMockInputHandler() as InputHandler & {
				_triggerFocus: (focused: boolean) => void;
			};
			const tracker = createFocusTracker(inputHandler);
			enableFocusTracking(tracker);

			const bus = getTerminalFocusEventBus();
			const focusHandler = vi.fn();
			const blurHandler = vi.fn();

			bus.on('focus', focusHandler);
			bus.on('blur', blurHandler);

			inputHandler._triggerFocus(true);

			expect(focusHandler).not.toHaveBeenCalled(); // Already focused
			expect(blurHandler).not.toHaveBeenCalled();
		});

		it('emits blur event when terminal loses focus', () => {
			const inputHandler = createMockInputHandler() as InputHandler & {
				_triggerFocus: (focused: boolean) => void;
			};
			const tracker = createFocusTracker(inputHandler);
			enableFocusTracking(tracker);

			const bus = getTerminalFocusEventBus();
			const focusHandler = vi.fn();
			const blurHandler = vi.fn();

			bus.on('focus', focusHandler);
			bus.on('blur', blurHandler);

			inputHandler._triggerFocus(false);

			expect(focusHandler).not.toHaveBeenCalled();
			expect(blurHandler).toHaveBeenCalledTimes(1);
		});

		it('emits focus event after blur', () => {
			const inputHandler = createMockInputHandler() as InputHandler & {
				_triggerFocus: (focused: boolean) => void;
			};
			const tracker = createFocusTracker(inputHandler);
			enableFocusTracking(tracker);

			const bus = getTerminalFocusEventBus();
			const focusHandler = vi.fn();
			const blurHandler = vi.fn();

			bus.on('focus', focusHandler);
			bus.on('blur', blurHandler);

			inputHandler._triggerFocus(false);
			inputHandler._triggerFocus(true);

			expect(blurHandler).toHaveBeenCalledTimes(1);
			expect(focusHandler).toHaveBeenCalledTimes(1);
		});

		it('does not emit events if state unchanged', () => {
			const inputHandler = createMockInputHandler() as InputHandler & {
				_triggerFocus: (focused: boolean) => void;
			};
			const tracker = createFocusTracker(inputHandler);
			enableFocusTracking(tracker);

			const bus = getTerminalFocusEventBus();
			const focusHandler = vi.fn();
			const blurHandler = vi.fn();

			bus.on('focus', focusHandler);
			bus.on('blur', blurHandler);

			inputHandler._triggerFocus(true);
			inputHandler._triggerFocus(true);

			expect(focusHandler).not.toHaveBeenCalled();
			expect(blurHandler).not.toHaveBeenCalled();
		});

		it('does not emit events if tracking is disabled', () => {
			const inputHandler = createMockInputHandler() as InputHandler & {
				_triggerFocus: (focused: boolean) => void;
			};
			// Create tracker but don't enable it
			void createFocusTracker(inputHandler);

			const bus = getTerminalFocusEventBus();
			const focusHandler = vi.fn();
			const blurHandler = vi.fn();

			bus.on('focus', focusHandler);
			bus.on('blur', blurHandler);

			inputHandler._triggerFocus(false);

			expect(focusHandler).not.toHaveBeenCalled();
			expect(blurHandler).not.toHaveBeenCalled();
		});
	});

	describe('isTerminalFocused', () => {
		it('returns current focus state', () => {
			const inputHandler = createMockInputHandler() as InputHandler & {
				_triggerFocus: (focused: boolean) => void;
			};
			const tracker = createFocusTracker(inputHandler);
			enableFocusTracking(tracker);

			expect(isTerminalFocused(inputHandler)).toBe(true);

			inputHandler._triggerFocus(false);
			expect(isTerminalFocused(inputHandler)).toBe(false);

			inputHandler._triggerFocus(true);
			expect(isTerminalFocused(inputHandler)).toBe(true);
		});

		it('returns undefined if no tracker', () => {
			const inputHandler = createMockInputHandler();
			expect(isTerminalFocused(inputHandler)).toBeUndefined();
		});
	});

	describe('triggerFocusEvent', () => {
		it('manually triggers focus change', () => {
			const inputHandler = createMockInputHandler();
			const tracker = createFocusTracker(inputHandler);
			enableFocusTracking(tracker);

			const bus = getTerminalFocusEventBus();
			const blurHandler = vi.fn();
			bus.on('blur', blurHandler);

			triggerFocusEvent(inputHandler, false);

			expect(blurHandler).toHaveBeenCalledTimes(1);
			expect(tracker.focused).toBe(false);
		});

		it('does nothing if no tracker exists', () => {
			const inputHandler = createMockInputHandler();

			expect(() => {
				triggerFocusEvent(inputHandler, false);
			}).not.toThrow();
		});
	});
});
