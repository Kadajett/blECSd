/**
 * Tests for Terminal Resize Handling
 */

import { createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getScreenSize, resetScreenSingleton } from '../components/screen';
import { createScreenEntity } from '../core/entities';
import type { World } from '../core/types';
import { clearOutputBuffer, getOutputBuffer, setOutputBuffer } from '../systems/outputSystem';
import {
	createResizeHandler,
	disableResizeHandling,
	enableResizeHandling,
	getResizeEventBus,
	getResizeHandler,
	resetResizeEventBus,
	setupSigwinchHandler,
	triggerResize,
} from './resize';
import { createDoubleBuffer } from './screen/doubleBuffer';

// Mock Program class
function createMockProgram() {
	const handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();

	return {
		on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			if (!handlers.has(event)) {
				handlers.set(event, new Set());
			}
			handlers.get(event)?.add(handler);
		}),
		off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
			handlers.get(event)?.delete(handler);
		}),
		emit: (event: string, ...args: unknown[]) => {
			const eventHandlers = handlers.get(event);
			if (eventHandlers) {
				for (const handler of eventHandlers) {
					handler(...args);
				}
			}
		},
	};
}

describe('resize', () => {
	let world: World;
	let screen: number;

	beforeEach(() => {
		world = createWorld() as World;
		resetScreenSingleton(world);
		resetResizeEventBus();
		clearOutputBuffer();
		screen = createScreenEntity(world, { width: 80, height: 24 });
	});

	describe('getResizeEventBus', () => {
		it('returns an event bus', () => {
			const bus = getResizeEventBus();
			expect(bus).toBeDefined();
			expect(bus.on).toBeTypeOf('function');
			expect(bus.emit).toBeTypeOf('function');
		});

		it('returns the same bus on multiple calls', () => {
			const bus1 = getResizeEventBus();
			const bus2 = getResizeEventBus();
			expect(bus1).toBe(bus2);
		});
	});

	describe('resetResizeEventBus', () => {
		it('creates a new bus', () => {
			const bus1 = getResizeEventBus();
			resetResizeEventBus();
			const bus2 = getResizeEventBus();
			expect(bus1).not.toBe(bus2);
		});
	});

	describe('createResizeHandler', () => {
		it('creates a handler state', () => {
			const state = createResizeHandler(world);
			expect(state).toBeDefined();
			expect(state.world).toBe(world);
			expect(state.lastWidth).toBe(80);
			expect(state.lastHeight).toBe(24);
			expect(state.handler).toBeTypeOf('function');
		});

		it('initializes dimensions from screen', () => {
			// Create a new world with different dimensions
			const world2 = createWorld() as World;
			resetScreenSingleton(world2);
			createScreenEntity(world2, { width: 120, height: 40 });

			const state = createResizeHandler(world2);
			expect(state.lastWidth).toBe(120);
			expect(state.lastHeight).toBe(40);
		});

		it('uses defaults when no screen exists', () => {
			const world2 = createWorld() as World;
			const state = createResizeHandler(world2);
			expect(state.lastWidth).toBe(80);
			expect(state.lastHeight).toBe(24);
		});
	});

	describe('enableResizeHandling / disableResizeHandling', () => {
		it('enables resize handling on program', () => {
			const program = createMockProgram();
			const state = createResizeHandler(world);

			enableResizeHandling(program as never, state);

			expect(program.on).toHaveBeenCalledWith('resize', state.handler);
		});

		it('disables resize handling on program', () => {
			const program = createMockProgram();
			const state = createResizeHandler(world);

			enableResizeHandling(program as never, state);
			disableResizeHandling(program as never, state);

			expect(program.off).toHaveBeenCalledWith('resize', state.handler);
		});
	});

	describe('getResizeHandler', () => {
		it('returns undefined when no handler exists', () => {
			const world2 = createWorld() as World;
			expect(getResizeHandler(world2)).toBeUndefined();
		});

		it('returns handler state after creation', () => {
			const state = createResizeHandler(world);
			expect(getResizeHandler(world)).toBe(state);
		});

		it('returns undefined after disable', () => {
			const program = createMockProgram();
			const state = createResizeHandler(world);
			enableResizeHandling(program as never, state);
			disableResizeHandling(program as never, state);

			expect(getResizeHandler(world)).toBeUndefined();
		});
	});

	describe('triggerResize', () => {
		it('updates screen dimensions', () => {
			createResizeHandler(world);

			triggerResize(world, 100, 30);

			const size = getScreenSize(world, screen);
			expect(size?.width).toBe(100);
			expect(size?.height).toBe(30);
		});

		it('updates state dimensions', () => {
			const state = createResizeHandler(world);

			triggerResize(world, 100, 30);

			expect(state.lastWidth).toBe(100);
			expect(state.lastHeight).toBe(30);
		});

		it('emits resize event', () => {
			createResizeHandler(world);
			const handler = vi.fn();
			getResizeEventBus().on('resize', handler);

			triggerResize(world, 100, 30);

			expect(handler).toHaveBeenCalledWith({
				width: 100,
				height: 30,
				previousWidth: 80,
				previousHeight: 24,
			});
		});

		it('does not emit when dimensions unchanged', () => {
			createResizeHandler(world);
			const handler = vi.fn();
			getResizeEventBus().on('resize', handler);

			triggerResize(world, 80, 24);

			expect(handler).not.toHaveBeenCalled();
		});

		it('resizes double buffer', () => {
			const db = createDoubleBuffer(80, 24);
			setOutputBuffer(db);
			createResizeHandler(world);

			triggerResize(world, 100, 30);

			const newDb = getOutputBuffer();
			expect(newDb?.width).toBe(100);
			expect(newDb?.height).toBe(30);
		});

		it('works without existing handler state', () => {
			// Don't create handler first
			const handler = vi.fn();
			getResizeEventBus().on('resize', handler);

			triggerResize(world, 100, 30);

			const size = getScreenSize(world, screen);
			expect(size?.width).toBe(100);
			expect(size?.height).toBe(30);
			expect(handler).toHaveBeenCalled();
		});
	});

	describe('program resize event integration', () => {
		it('handles resize events from program', () => {
			const program = createMockProgram();
			const state = createResizeHandler(world);
			enableResizeHandling(program as never, state);

			const handler = vi.fn();
			getResizeEventBus().on('resize', handler);

			// Simulate program resize event
			program.emit('resize', { cols: 120, rows: 40 });

			expect(handler).toHaveBeenCalledWith({
				width: 120,
				height: 40,
				previousWidth: 80,
				previousHeight: 24,
			});
		});

		it('updates screen on program resize', () => {
			const program = createMockProgram();
			const state = createResizeHandler(world);
			enableResizeHandling(program as never, state);

			program.emit('resize', { cols: 120, rows: 40 });

			const size = getScreenSize(world, screen);
			expect(size?.width).toBe(120);
			expect(size?.height).toBe(40);
		});
	});

	describe('setupSigwinchHandler', () => {
		it('returns a cleanup function', () => {
			const cleanup = setupSigwinchHandler(world);
			expect(cleanup).toBeTypeOf('function');
			cleanup(); // Clean up
		});

		it('registers SIGWINCH handler', () => {
			const processSpy = vi.spyOn(process, 'on');

			const cleanup = setupSigwinchHandler(world);

			expect(processSpy).toHaveBeenCalledWith('SIGWINCH', expect.any(Function));

			cleanup();
			processSpy.mockRestore();
		});

		it('removes SIGWINCH handler on cleanup', () => {
			const processOffSpy = vi.spyOn(process, 'off');

			const cleanup = setupSigwinchHandler(world);
			cleanup();

			expect(processOffSpy).toHaveBeenCalledWith('SIGWINCH', expect.any(Function));
			processOffSpy.mockRestore();
		});
	});
});
