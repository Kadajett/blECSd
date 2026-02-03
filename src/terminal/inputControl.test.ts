/**
 * Tests for Screen Input Control
 */

import { createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetScreenSingleton } from '../components/screen';
import { createScreenEntity } from '../core/entities';
import { lockAllKeys, resetKeyLockState, setIgnoredKeys } from '../core/keyLock';
import type { World } from '../core/types';
import { getEventQueue, resetInputState } from '../systems/inputSystem';
import {
	areKeysEnabled,
	createInputControl,
	destroyInputControl,
	disableInput,
	disableKeys,
	disableMouse,
	disableWorldInput,
	disableWorldKeys,
	disableWorldMouse,
	enableInput,
	enableKeys,
	enableMouse,
	enableWorldInput,
	enableWorldKeys,
	enableWorldMouse,
	getInputControl,
	getInputControlEventBus,
	getMouseMode,
	isInputEnabled,
	isMouseEnabled,
	MouseTrackingMode,
	resetInputControlEventBus,
	setMouseMode,
} from './inputControl';
import type { KeyEvent, MouseEvent } from './program';

// Mock Program
function createMockProgram() {
	const handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
	const written: string[] = [];

	const mock = {
		on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (!handlers.has(event)) {
				handlers.set(event, new Set());
			}
			handlers.get(event)?.add(handler);
			return mock;
		}),
		off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			handlers.get(event)?.delete(handler);
			return mock;
		}),
		emit: (event: string, ...args: unknown[]) => {
			const eventHandlers = handlers.get(event);
			if (eventHandlers) {
				for (const handler of eventHandlers) {
					handler(...args);
				}
			}
		},
		output: {
			write: vi.fn((data: string) => {
				written.push(data);
				return true;
			}),
		},
		getWritten: () => written,
		clearWritten: () => {
			written.length = 0;
		},
	};
	return mock;
}

function createKeyEvent(name: string): KeyEvent {
	return {
		name,
		sequence: name,
		ctrl: false,
		meta: false,
		shift: false,
	};
}

function createMouseEvent(
	x: number,
	y: number,
	action: MouseEvent['action'] = 'mousedown',
): MouseEvent {
	return {
		x,
		y,
		button: 0,
		action,
		ctrl: false,
		meta: false,
		shift: false,
	};
}

describe('inputControl', () => {
	let world: World;
	let program: ReturnType<typeof createMockProgram>;

	beforeEach(() => {
		world = createWorld() as World;
		resetScreenSingleton(world);
		createScreenEntity(world, { width: 80, height: 24 });
		program = createMockProgram();
		resetInputControlEventBus();
		resetInputState();
		resetKeyLockState();
	});

	describe('createInputControl', () => {
		it('creates input control state', () => {
			const state = createInputControl(world, program as never);

			expect(state).toBeDefined();
			expect(state.world).toBe(world);
			expect(state.program).toBe(program);
			expect(state.keysEnabled).toBe(false);
			expect(state.mouseEnabled).toBe(false);
		});

		it('stores state for retrieval', () => {
			const state = createInputControl(world, program as never);
			expect(getInputControl(world)).toBe(state);
		});

		it('applies initial options', () => {
			const state = createInputControl(world, program as never, {
				keys: true,
				mouse: true,
				mouseMode: MouseTrackingMode.ANY,
			});

			expect(state.keysEnabled).toBe(true);
			expect(state.mouseEnabled).toBe(true);
			expect(state.mouseMode).toBe(MouseTrackingMode.ANY);
		});
	});

	describe('getInputControl', () => {
		it('returns undefined for unknown world', () => {
			const world2 = createWorld() as World;
			expect(getInputControl(world2)).toBeUndefined();
		});

		it('returns state after creation', () => {
			const state = createInputControl(world, program as never);
			expect(getInputControl(world)).toBe(state);
		});
	});

	describe('destroyInputControl', () => {
		it('disables all input', () => {
			const state = createInputControl(world, program as never);
			enableInput(state);

			destroyInputControl(state);

			expect(state.keysEnabled).toBe(false);
			expect(state.mouseEnabled).toBe(false);
		});

		it('removes state from tracking', () => {
			const state = createInputControl(world, program as never);
			destroyInputControl(state);

			expect(getInputControl(world)).toBeUndefined();
		});
	});

	describe('keyboard control', () => {
		describe('enableKeys', () => {
			it('enables keyboard input', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);

				expect(areKeysEnabled(state)).toBe(true);
				expect(program.on).toHaveBeenCalledWith('key', expect.any(Function));
			});

			it('is idempotent', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);
				enableKeys(state);

				expect(program.on).toHaveBeenCalledTimes(1);
			});
		});

		describe('disableKeys', () => {
			it('disables keyboard input', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);
				disableKeys(state);

				expect(areKeysEnabled(state)).toBe(false);
				expect(program.off).toHaveBeenCalledWith('key', expect.any(Function));
			});

			it('handles not enabled case', () => {
				const state = createInputControl(world, program as never);
				disableKeys(state);

				expect(program.off).not.toHaveBeenCalled();
			});
		});

		describe('areKeysEnabled', () => {
			it('returns false by default', () => {
				const state = createInputControl(world, program as never);
				expect(areKeysEnabled(state)).toBe(false);
			});

			it('returns true after enable', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);
				expect(areKeysEnabled(state)).toBe(true);
			});
		});

		describe('key event handling', () => {
			it('queues key events', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);

				program.emit('key', createKeyEvent('a'));

				const queue = getEventQueue();
				expect(queue.length).toBe(1);
				expect(queue[0]).toMatchObject({ type: 'key', event: { name: 'a' } });
			});

			it('respects key lock', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);

				lockAllKeys();
				setIgnoredKeys(['escape']);

				program.emit('key', createKeyEvent('a'));
				expect(getEventQueue().length).toBe(0);

				program.emit('key', createKeyEvent('escape'));
				expect(getEventQueue().length).toBe(1);
			});

			it('emits to event bus', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);

				const handler = vi.fn();
				getInputControlEventBus().on('key', handler);

				program.emit('key', createKeyEvent('enter'));

				expect(handler).toHaveBeenCalledWith(expect.objectContaining({ name: 'enter' }));
			});
		});
	});

	describe('mouse control', () => {
		describe('enableMouse', () => {
			it('enables mouse input', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);

				expect(isMouseEnabled(state)).toBe(true);
				expect(program.on).toHaveBeenCalledWith('mouse', expect.any(Function));
			});

			it('writes mouse enable sequence', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);

				expect(program.output.write).toHaveBeenCalled();
			});

			it('is idempotent', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);
				enableMouse(state);

				expect(program.on).toHaveBeenCalledTimes(1);
			});
		});

		describe('disableMouse', () => {
			it('disables mouse input', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);
				disableMouse(state);

				expect(isMouseEnabled(state)).toBe(false);
				expect(program.off).toHaveBeenCalledWith('mouse', expect.any(Function));
			});

			it('writes mouse disable sequence', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);
				program.clearWritten();

				disableMouse(state);

				expect(program.output.write).toHaveBeenCalled();
			});
		});

		describe('isMouseEnabled', () => {
			it('returns false by default', () => {
				const state = createInputControl(world, program as never);
				expect(isMouseEnabled(state)).toBe(false);
			});

			it('returns true after enable', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);
				expect(isMouseEnabled(state)).toBe(true);
			});
		});

		describe('mouse modes', () => {
			it('defaults to NORMAL mode', () => {
				const state = createInputControl(world, program as never);
				expect(getMouseMode(state)).toBe(MouseTrackingMode.NORMAL);
			});

			it('can set mode on enable', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state, MouseTrackingMode.SGR);

				expect(getMouseMode(state)).toBe(MouseTrackingMode.SGR);
			});

			it('setMouseMode re-enables with new mode', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state, MouseTrackingMode.NORMAL);

				setMouseMode(state, MouseTrackingMode.ANY);

				expect(getMouseMode(state)).toBe(MouseTrackingMode.ANY);
				expect(isMouseEnabled(state)).toBe(true);
			});
		});

		describe('mouse event handling', () => {
			it('queues mouse events', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);

				program.emit('mouse', createMouseEvent(10, 20, 'mousedown'));

				const queue = getEventQueue();
				expect(queue.length).toBe(1);
				expect(queue[0]).toMatchObject({
					type: 'mouse',
					event: { x: 10, y: 20, action: 'press' },
				});
			});

			it('emits to event bus', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);

				const handler = vi.fn();
				getInputControlEventBus().on('mouse', handler);

				program.emit('mouse', createMouseEvent(5, 10));

				expect(handler).toHaveBeenCalledWith(expect.objectContaining({ x: 5, y: 10 }));
			});
		});
	});

	describe('combined control', () => {
		describe('enableInput', () => {
			it('enables both keyboard and mouse', () => {
				const state = createInputControl(world, program as never);
				enableInput(state);

				expect(areKeysEnabled(state)).toBe(true);
				expect(isMouseEnabled(state)).toBe(true);
			});

			it('accepts mouse mode', () => {
				const state = createInputControl(world, program as never);
				enableInput(state, MouseTrackingMode.BUTTON);

				expect(getMouseMode(state)).toBe(MouseTrackingMode.BUTTON);
			});
		});

		describe('disableInput', () => {
			it('disables both keyboard and mouse', () => {
				const state = createInputControl(world, program as never);
				enableInput(state);
				disableInput(state);

				expect(areKeysEnabled(state)).toBe(false);
				expect(isMouseEnabled(state)).toBe(false);
			});
		});

		describe('isInputEnabled', () => {
			it('returns false when nothing enabled', () => {
				const state = createInputControl(world, program as never);
				expect(isInputEnabled(state)).toBe(false);
			});

			it('returns true when keys enabled', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);
				expect(isInputEnabled(state)).toBe(true);
			});

			it('returns true when mouse enabled', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);
				expect(isInputEnabled(state)).toBe(true);
			});
		});
	});

	describe('world-level convenience', () => {
		describe('enableWorldKeys', () => {
			it('enables keys for world', () => {
				const state = createInputControl(world, program as never);
				const result = enableWorldKeys(world);

				expect(result).toBe(true);
				expect(areKeysEnabled(state)).toBe(true);
			});

			it('returns false for unknown world', () => {
				const world2 = createWorld() as World;
				const result = enableWorldKeys(world2);
				expect(result).toBe(false);
			});
		});

		describe('disableWorldKeys', () => {
			it('disables keys for world', () => {
				const state = createInputControl(world, program as never);
				enableKeys(state);

				const result = disableWorldKeys(world);

				expect(result).toBe(true);
				expect(areKeysEnabled(state)).toBe(false);
			});
		});

		describe('enableWorldMouse', () => {
			it('enables mouse for world', () => {
				const state = createInputControl(world, program as never);
				const result = enableWorldMouse(world);

				expect(result).toBe(true);
				expect(isMouseEnabled(state)).toBe(true);
			});

			it('accepts mouse mode', () => {
				const state = createInputControl(world, program as never);
				enableWorldMouse(world, MouseTrackingMode.ANY);

				expect(getMouseMode(state)).toBe(MouseTrackingMode.ANY);
			});
		});

		describe('disableWorldMouse', () => {
			it('disables mouse for world', () => {
				const state = createInputControl(world, program as never);
				enableMouse(state);

				const result = disableWorldMouse(world);

				expect(result).toBe(true);
				expect(isMouseEnabled(state)).toBe(false);
			});
		});

		describe('enableWorldInput', () => {
			it('enables all input for world', () => {
				const state = createInputControl(world, program as never);
				const result = enableWorldInput(world);

				expect(result).toBe(true);
				expect(isInputEnabled(state)).toBe(true);
			});
		});

		describe('disableWorldInput', () => {
			it('disables all input for world', () => {
				const state = createInputControl(world, program as never);
				enableInput(state);

				const result = disableWorldInput(world);

				expect(result).toBe(true);
				expect(isInputEnabled(state)).toBe(false);
			});
		});
	});

	describe('event bus', () => {
		describe('getInputControlEventBus', () => {
			it('returns event bus', () => {
				const bus = getInputControlEventBus();
				expect(bus).toBeDefined();
				expect(bus.on).toBeTypeOf('function');
			});

			it('returns same bus on multiple calls', () => {
				const bus1 = getInputControlEventBus();
				const bus2 = getInputControlEventBus();
				expect(bus1).toBe(bus2);
			});
		});

		describe('resetInputControlEventBus', () => {
			it('creates new bus', () => {
				const bus1 = getInputControlEventBus();
				resetInputControlEventBus();
				const bus2 = getInputControlEventBus();
				expect(bus1).not.toBe(bus2);
			});
		});

		it('emits keysEnabled event', () => {
			const state = createInputControl(world, program as never);
			const handler = vi.fn();
			getInputControlEventBus().on('keysEnabled', handler);

			enableKeys(state);

			expect(handler).toHaveBeenCalled();
		});

		it('emits keysDisabled event', () => {
			const state = createInputControl(world, program as never);
			enableKeys(state);

			const handler = vi.fn();
			getInputControlEventBus().on('keysDisabled', handler);

			disableKeys(state);

			expect(handler).toHaveBeenCalled();
		});

		it('emits mouseEnabled event', () => {
			const state = createInputControl(world, program as never);
			const handler = vi.fn();
			getInputControlEventBus().on('mouseEnabled', handler);

			enableMouse(state, MouseTrackingMode.SGR);

			expect(handler).toHaveBeenCalledWith(MouseTrackingMode.SGR);
		});

		it('emits mouseDisabled event', () => {
			const state = createInputControl(world, program as never);
			enableMouse(state);

			const handler = vi.fn();
			getInputControlEventBus().on('mouseDisabled', handler);

			disableMouse(state);

			expect(handler).toHaveBeenCalled();
		});
	});

	describe('MouseTrackingMode constants', () => {
		it('has correct values', () => {
			expect(MouseTrackingMode.OFF).toBe(0);
			expect(MouseTrackingMode.NORMAL).toBe(1);
			expect(MouseTrackingMode.BUTTON).toBe(2);
			expect(MouseTrackingMode.ANY).toBe(3);
			expect(MouseTrackingMode.SGR).toBe(4);
		});
	});
});
