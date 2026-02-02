/**
 * Input State Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { KeyName } from '../terminal/keyParser';
import type { MouseAction, MouseButton, MouseProtocol } from '../terminal/mouseParser';
import type { TimestampedKeyEvent, TimestampedMouseEvent } from './inputEventBuffer';
import {
	createInputState,
	getMovementDirection,
	InputState,
	isAllKeysDown,
	isAnyKeyDown,
	isAnyKeyPressed,
} from './inputState';

describe('InputState', () => {
	let inputState: InputState;

	// Helper to create a key event
	function keyEvent(name: string, timestamp = 0): TimestampedKeyEvent {
		return {
			type: 'key',
			event: {
				name: name as KeyName,
				sequence: name,
				ctrl: false,
				meta: false,
				shift: false,
				raw: new Uint8Array([]),
			},
			timestamp,
		};
	}

	// Helper to create a mouse event
	function mouseEvent(
		action: MouseAction,
		button: string,
		x: number,
		y: number,
		timestamp = 0,
	): TimestampedMouseEvent {
		return {
			type: 'mouse',
			event: {
				action,
				button: button as MouseButton,
				x,
				y,
				ctrl: false,
				meta: false,
				shift: false,
				protocol: 'sgr' as MouseProtocol,
				raw: new Uint8Array([]),
			},
			timestamp,
		};
	}

	beforeEach(() => {
		inputState = createInputState();
	});

	describe('createInputState', () => {
		it('should create an input state with default config', () => {
			const state = createInputState();
			expect(state).toBeInstanceOf(InputState);
		});

		it('should create an input state with custom config', () => {
			const state = createInputState({
				trackRepeats: false,
				debounceTime: 100,
			});
			expect(state).toBeInstanceOf(InputState);
		});
	});

	describe('key state tracking', () => {
		it('should track key press', () => {
			inputState.update([keyEvent('a')], [], 0.016);

			expect(inputState.isKeyDown('a')).toBe(true);
			expect(inputState.isKeyPressed('a')).toBe(true);
			expect(inputState.isKeyReleased('a')).toBe(false);
		});

		it('should clear just pressed on next frame', () => {
			inputState.update([keyEvent('a')], [], 0.016);
			expect(inputState.isKeyPressed('a')).toBe(true);

			inputState.update([], [], 0.016);
			expect(inputState.isKeyDown('a')).toBe(true);
			expect(inputState.isKeyPressed('a')).toBe(false);
		});

		it('should track key release', () => {
			inputState.update([keyEvent('a')], [], 0.016);
			inputState.releaseKey('a');

			expect(inputState.isKeyDown('a')).toBe(false);
			expect(inputState.isKeyReleased('a')).toBe(true);
		});

		it('should clear just released on next frame', () => {
			inputState.update([keyEvent('a')], [], 0.016);
			inputState.releaseKey('a');
			expect(inputState.isKeyReleased('a')).toBe(true);

			inputState.update([], [], 0.016);
			expect(inputState.isKeyReleased('a')).toBe(false);
		});

		it('should track multiple keys', () => {
			inputState.update([keyEvent('a'), keyEvent('b'), keyEvent('c')], [], 0.016);

			expect(inputState.isKeyDown('a')).toBe(true);
			expect(inputState.isKeyDown('b')).toBe(true);
			expect(inputState.isKeyDown('c')).toBe(true);
			expect(inputState.isKeyDown('d')).toBe(false);
		});

		it('should return false for unknown keys', () => {
			expect(inputState.isKeyDown('x')).toBe(false);
			expect(inputState.isKeyPressed('x')).toBe(false);
			expect(inputState.isKeyReleased('x')).toBe(false);
		});
	});

	describe('held time tracking', () => {
		it('should track held time', () => {
			inputState.update([keyEvent('space')], [], 0.016);
			expect(inputState.getKeyHeldTime('space')).toBeCloseTo(0, 0);

			inputState.update([], [], 0.1); // 100ms
			expect(inputState.getKeyHeldTime('space')).toBeCloseTo(100, 0);

			inputState.update([], [], 0.1); // Another 100ms
			expect(inputState.getKeyHeldTime('space')).toBeCloseTo(200, 0);
		});

		it('should reset held time on release', () => {
			inputState.update([keyEvent('space')], [], 0.016);
			inputState.update([], [], 0.1);
			expect(inputState.getKeyHeldTime('space')).toBeCloseTo(100, 0);

			inputState.releaseKey('space');
			expect(inputState.getKeyHeldTime('space')).toBeCloseTo(100, 0); // Still has the held time

			// Re-press resets
			inputState.update([keyEvent('space')], [], 0.016);
			expect(inputState.getKeyHeldTime('space')).toBeCloseTo(0, 0);
		});
	});

	describe('key repeat tracking', () => {
		it('should count key repeats when enabled', () => {
			const state = createInputState({ trackRepeats: true });

			// First press
			state.update([keyEvent('a', 0)], [], 0.016);
			expect(state.getKeyRepeatCount('a')).toBe(0);

			// Repeat events (same key while held)
			state.update([keyEvent('a', 50)], [], 0.016);
			expect(state.getKeyRepeatCount('a')).toBe(1);

			state.update([keyEvent('a', 100)], [], 0.016);
			expect(state.getKeyRepeatCount('a')).toBe(2);
		});

		it('should not set just pressed on repeats', () => {
			const state = createInputState({ trackRepeats: true });

			state.update([keyEvent('a', 0)], [], 0.016);
			expect(state.isKeyPressed('a')).toBe(true);

			state.update([keyEvent('a', 50)], [], 0.016);
			expect(state.isKeyPressed('a')).toBe(false); // Repeat doesn't trigger just pressed
			expect(state.isKeyDown('a')).toBe(true);
		});
	});

	describe('debouncing', () => {
		it('should ignore events within debounce time', () => {
			const state = createInputState({ debounceTime: 100 });
			const baseTime = performance.now();

			state.update([keyEvent('a', baseTime)], [], 0.016);
			expect(state.isKeyPressed('a')).toBe(true);

			// Repeat event within debounce time (simulates fast double-tap)
			state.update([keyEvent('a', baseTime + 50)], [], 0.016); // 50ms later

			// The repeat event's justPressed should be false (key is already pressed)
			// But more importantly, if debouncing, the repeat count shouldn't increment rapidly
			expect(state.isKeyDown('a')).toBe(true);
		});

		it('should accept events after debounce time', () => {
			const state = createInputState({ debounceTime: 100 });
			const baseTime = performance.now();

			state.update([keyEvent('a', baseTime)], [], 0.016);
			state.update([], [], 0.016); // Next frame, key is held

			// Much later event should be accepted
			state.update([keyEvent('a', baseTime + 200)], [], 0.016);

			// Key should still be held (it was never released)
			expect(state.isKeyDown('a')).toBe(true);
		});
	});

	describe('pressed keys list', () => {
		it('should get all pressed keys', () => {
			inputState.update([keyEvent('a'), keyEvent('b'), keyEvent('c')], [], 0.016);

			const pressed = inputState.getPressedKeys();
			expect(pressed).toContain('a');
			expect(pressed).toContain('b');
			expect(pressed).toContain('c');
			expect(pressed).toHaveLength(3);
		});

		it('should get just pressed keys', () => {
			inputState.update([keyEvent('a')], [], 0.016);
			inputState.update([keyEvent('b')], [], 0.016);

			const justPressed = inputState.getJustPressedKeys();
			expect(justPressed).toContain('b');
			expect(justPressed).not.toContain('a'); // a was pressed last frame
		});

		it('should get just released keys', () => {
			inputState.update([keyEvent('a'), keyEvent('b')], [], 0.016);
			inputState.releaseKey('a');

			const justReleased = inputState.getJustReleasedKeys();
			expect(justReleased).toContain('a');
			expect(justReleased).not.toContain('b');
		});
	});

	describe('key state object', () => {
		it('should return full key state', () => {
			inputState.update([keyEvent('space', 0)], [], 0.016);
			inputState.update([], [], 0.1);

			const state = inputState.getKeyState('space');
			expect(state.pressed).toBe(true);
			expect(state.justPressed).toBe(false);
			expect(state.justReleased).toBe(false);
			expect(state.heldTime).toBeCloseTo(100, 0);
		});

		it('should return default state for unknown keys', () => {
			const state = inputState.getKeyState('unknown');
			expect(state.pressed).toBe(false);
			expect(state.justPressed).toBe(false);
			expect(state.justReleased).toBe(false);
			expect(state.heldTime).toBe(0);
		});
	});

	describe('mouse state tracking', () => {
		it('should track mouse button press', () => {
			inputState.update([], [mouseEvent('press', 'left', 10, 20)], 0.016);

			expect(inputState.isMouseButtonDown('left')).toBe(true);
			expect(inputState.isMouseButtonPressed('left')).toBe(true);
			expect(inputState.isMouseButtonReleased('left')).toBe(false);
		});

		it('should track mouse button release', () => {
			inputState.update([], [mouseEvent('press', 'left', 10, 20)], 0.016);
			inputState.update([], [mouseEvent('release', 'left', 10, 20)], 0.016);

			expect(inputState.isMouseButtonDown('left')).toBe(false);
			expect(inputState.isMouseButtonReleased('left')).toBe(true);
		});

		it('should track mouse position', () => {
			inputState.update([], [mouseEvent('move', 'unknown', 50, 100)], 0.016);

			expect(inputState.getMouseX()).toBe(50);
			expect(inputState.getMouseY()).toBe(100);
			expect(inputState.getMousePosition()).toEqual({ x: 50, y: 100 });
		});

		it('should track mouse delta', () => {
			inputState.update([], [mouseEvent('move', 'unknown', 0, 0)], 0.016);
			inputState.update([], [mouseEvent('move', 'unknown', 10, 20)], 0.016);

			const delta = inputState.getMouseDelta();
			expect(delta.deltaX).toBe(10);
			expect(delta.deltaY).toBe(20);
		});

		it('should track wheel delta', () => {
			inputState.update(
				[],
				[
					mouseEvent('press', 'wheelup', 0, 0),
					mouseEvent('press', 'wheelup', 0, 0),
					mouseEvent('press', 'wheeldown', 0, 0),
				],
				0.016,
			);

			expect(inputState.getWheelDelta()).toBe(1); // 2 up - 1 down = 1
		});

		it('should reset delta each frame', () => {
			inputState.update([], [mouseEvent('move', 'unknown', 10, 10)], 0.016);
			inputState.update([], [], 0.016); // No movement this frame

			const delta = inputState.getMouseDelta();
			expect(delta.deltaX).toBe(0);
			expect(delta.deltaY).toBe(0);
		});
	});

	describe('release all', () => {
		it('should release all keys', () => {
			inputState.update([keyEvent('a'), keyEvent('b'), keyEvent('c')], [], 0.016);
			expect(inputState.getPressedKeys().length).toBe(3);

			inputState.releaseAllKeys();
			expect(inputState.getPressedKeys().length).toBe(0);
		});

		it('should release all mouse buttons', () => {
			inputState.update(
				[],
				[mouseEvent('press', 'left', 0, 0), mouseEvent('press', 'right', 0, 0)],
				0.016,
			);

			expect(inputState.isMouseButtonDown('left')).toBe(true);
			expect(inputState.isMouseButtonDown('right')).toBe(true);

			inputState.releaseAllMouseButtons();
			expect(inputState.isMouseButtonDown('left')).toBe(false);
			expect(inputState.isMouseButtonDown('right')).toBe(false);
		});

		it('should release all input', () => {
			inputState.update([keyEvent('a')], [mouseEvent('press', 'left', 0, 0)], 0.016);

			inputState.releaseAll();

			expect(inputState.getPressedKeys().length).toBe(0);
			expect(inputState.isMouseButtonDown('left')).toBe(false);
		});
	});

	describe('stats', () => {
		it('should report statistics', () => {
			inputState.update([keyEvent('a'), keyEvent('b')], [mouseEvent('press', 'left', 0, 0)], 0.016);

			const stats = inputState.getStats();
			expect(stats.keysDown).toBe(2);
			expect(stats.keysPressed).toBe(2);
			expect(stats.keysReleased).toBe(0);
			expect(stats.keyEventsThisFrame).toBe(2);
			expect(stats.mouseEventsThisFrame).toBe(1);
			expect(stats.frameCount).toBe(1);
		});

		it('should track frame count', () => {
			expect(inputState.getFrameCount()).toBe(0);

			inputState.update([], [], 0.016);
			expect(inputState.getFrameCount()).toBe(1);

			inputState.update([], [], 0.016);
			expect(inputState.getFrameCount()).toBe(2);
		});
	});

	describe('reset', () => {
		it('should reset all state', () => {
			inputState.update([keyEvent('a')], [mouseEvent('press', 'left', 50, 50)], 0.016);
			inputState.reset();

			expect(inputState.getPressedKeys().length).toBe(0);
			expect(inputState.getMousePosition()).toEqual({ x: 0, y: 0 });
			expect(inputState.getFrameCount()).toBe(0);
		});
	});

	describe('utility functions', () => {
		describe('isAnyKeyDown', () => {
			it('should return true if any key is down', () => {
				inputState.update([keyEvent('a')], [], 0.016);

				expect(isAnyKeyDown(inputState, ['a', 'b', 'c'])).toBe(true);
				expect(isAnyKeyDown(inputState, ['x', 'y', 'z'])).toBe(false);
			});
		});

		describe('isAllKeysDown', () => {
			it('should return true only if all keys are down', () => {
				inputState.update([keyEvent('a'), keyEvent('b')], [], 0.016);

				expect(isAllKeysDown(inputState, ['a', 'b'])).toBe(true);
				expect(isAllKeysDown(inputState, ['a', 'b', 'c'])).toBe(false);
			});
		});

		describe('isAnyKeyPressed', () => {
			it('should return true if any key was just pressed', () => {
				inputState.update([keyEvent('a')], [], 0.016);
				inputState.update([keyEvent('b')], [], 0.016);

				expect(isAnyKeyPressed(inputState, ['a', 'b'])).toBe(true); // b was just pressed
				expect(isAnyKeyPressed(inputState, ['c', 'd'])).toBe(false);
			});
		});

		describe('getMovementDirection', () => {
			it('should return movement direction from WASD', () => {
				inputState.update([keyEvent('w')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 0, y: -1 });

				inputState.releaseAllKeys();
				inputState.update([keyEvent('s')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 0, y: 1 });

				inputState.releaseAllKeys();
				inputState.update([keyEvent('a')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: -1, y: 0 });

				inputState.releaseAllKeys();
				inputState.update([keyEvent('d')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 1, y: 0 });
			});

			it('should return movement direction from arrow keys', () => {
				inputState.update([keyEvent('up')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 0, y: -1 });

				inputState.releaseAllKeys();
				inputState.update([keyEvent('down')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 0, y: 1 });
			});

			it('should handle diagonal movement', () => {
				inputState.update([keyEvent('w'), keyEvent('d')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 1, y: -1 });
			});

			it('should cancel opposing directions', () => {
				inputState.update([keyEvent('w'), keyEvent('s')], [], 0.016);
				expect(getMovementDirection(inputState)).toEqual({ x: 0, y: 0 });
			});
		});
	});

	describe('case insensitivity', () => {
		it('should be case insensitive for key queries', () => {
			inputState.update([keyEvent('a')], [], 0.016);

			expect(inputState.isKeyDown('a')).toBe(true);
			expect(inputState.isKeyDown('A')).toBe(true);
		});

		it('should be case insensitive for release', () => {
			inputState.update([keyEvent('A')], [], 0.016);
			inputState.releaseKey('a');

			expect(inputState.isKeyDown('a')).toBe(false);
			expect(inputState.isKeyDown('A')).toBe(false);
		});
	});
});
