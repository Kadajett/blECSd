/**
 * Tests for main game loop and system scheduler
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	createLoopState,
	createGameLoop,
	createSystem,
	createInputSystem,
	createLogicSystem,
	createAnimationSystem,
	createRenderSystem,
	isPlayablePhase,
	isAnimatingPhase,
	isTerminalPhase,
	getPhaseAfterDealing,
	getPhaseAfterScoring,
	DEFAULT_LOOP_CONFIG,
} from './game-loop';
import type { System, FrameContext } from './game-loop';

describe('createLoopState', () => {
	it('creates initial state', () => {
		const state = createLoopState();

		expect(state.running).toBe(false);
		expect(state.phase).toBe('DEALING');
		expect(state.frameCount).toBe(0);
		expect(state.totalTime).toBe(0);
		expect(state.fps).toBe(0);
	});

	it('accepts custom initial phase', () => {
		const state = createLoopState('PLAYING');
		expect(state.phase).toBe('PLAYING');
	});
});

describe('createGameLoop', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates a game loop', () => {
		const loop = createGameLoop([]);

		expect(loop.state.running).toBe(false);
		expect(loop.getGameState()).toBeNull();
	});

	it('starts and runs systems', async () => {
		const runOrder: string[] = [];

		const systems: System<{ count: number }>[] = [
			createInputSystem('input', (state) => {
				runOrder.push('input');
				return state;
			}),
			createLogicSystem('logic', (state) => {
				runOrder.push('logic');
				return { count: state.count + 1 };
			}),
		];

		const loop = createGameLoop(systems);
		loop.start({ count: 0 });

		// Let one frame run
		vi.advanceTimersByTime(20);

		loop.stop();

		expect(runOrder).toContain('input');
		expect(runOrder).toContain('logic');
		// Input should run before logic
		expect(runOrder.indexOf('input')).toBeLessThan(runOrder.indexOf('logic'));
	});

	it('maintains system phase order', async () => {
		const runOrder: string[] = [];

		const systems: System<{}>[] = [
			// Add in random order
			createRenderSystem('render', (state) => {
				runOrder.push('render');
				return state;
			}),
			createInputSystem('input', (state) => {
				runOrder.push('input');
				return state;
			}),
			createAnimationSystem('animation', (state) => {
				runOrder.push('animation');
				return state;
			}),
			createLogicSystem('logic', (state) => {
				runOrder.push('logic');
				return state;
			}),
		];

		const loop = createGameLoop(systems);
		loop.start({});

		vi.advanceTimersByTime(20);
		loop.stop();

		// Check order: INPUT -> GAME_LOGIC -> ANIMATION -> RENDER
		const inputIdx = runOrder.indexOf('input');
		const logicIdx = runOrder.indexOf('logic');
		const animIdx = runOrder.indexOf('animation');
		const renderIdx = runOrder.indexOf('render');

		expect(inputIdx).toBeLessThan(logicIdx);
		expect(logicIdx).toBeLessThan(animIdx);
		expect(animIdx).toBeLessThan(renderIdx);
	});

	it('provides frame context to systems', async () => {
		let capturedCtx: FrameContext | null = null;

		const systems: System<{}>[] = [
			createLogicSystem('capture', (state, ctx) => {
				capturedCtx = ctx;
				return state;
			}),
		];

		const loop = createGameLoop(systems);
		loop.start({});

		vi.advanceTimersByTime(20);
		loop.stop();

		expect(capturedCtx).not.toBeNull();
		expect(capturedCtx!.frameCount).toBeGreaterThan(0);
		expect(capturedCtx!.deltaTime).toBeGreaterThan(0);
		expect(capturedCtx!.phase).toBe('DEALING');
	});

	it('stops when stop is called', async () => {
		let frameCount = 0;

		const systems: System<{}>[] = [
			createLogicSystem('counter', (state) => {
				frameCount++;
				return state;
			}),
		];

		const loop = createGameLoop(systems);
		loop.start({});

		vi.advanceTimersByTime(50);
		loop.stop();
		const countAtStop = frameCount;

		vi.advanceTimersByTime(100);

		// No more frames should run
		expect(frameCount).toBe(countAtStop);
		expect(loop.state.running).toBe(false);
	});

	it('transitions between phases', () => {
		const loop = createGameLoop([]);

		expect(loop.state.phase).toBe('DEALING');

		loop.transitionTo('PLAYING');
		expect(loop.state.phase).toBe('PLAYING');

		loop.transitionTo('SCORING');
		expect(loop.state.phase).toBe('SCORING');
	});

	it('updates game state through systems', async () => {
		const systems: System<{ value: number }>[] = [
			createLogicSystem('increment', (state) => ({
				value: state.value + 1,
			})),
		];

		const loop = createGameLoop(systems);
		loop.start({ value: 0 });

		vi.advanceTimersByTime(100); // Several frames
		loop.stop();

		const finalState = loop.getGameState();
		expect(finalState).not.toBeNull();
		expect(finalState!.value).toBeGreaterThan(0);
	});
});

describe('createSystem', () => {
	it('creates system with correct properties', () => {
		const run = vi.fn((state: {}) => state);
		const system = createSystem('test', 'GAME_LOGIC', run);

		expect(system.name).toBe('test');
		expect(system.phase).toBe('GAME_LOGIC');
		expect(system.run).toBe(run);
	});
});

describe('system factory functions', () => {
	it('createInputSystem creates INPUT phase system', () => {
		const system = createInputSystem('test', (s) => s);
		expect(system.phase).toBe('INPUT');
	});

	it('createLogicSystem creates GAME_LOGIC phase system', () => {
		const system = createLogicSystem('test', (s) => s);
		expect(system.phase).toBe('GAME_LOGIC');
	});

	it('createAnimationSystem creates ANIMATION phase system', () => {
		const system = createAnimationSystem('test', (s) => s);
		expect(system.phase).toBe('ANIMATION');
	});

	it('createRenderSystem creates RENDER phase system', () => {
		const system = createRenderSystem('test', (s) => s);
		expect(system.phase).toBe('RENDER');
	});
});

describe('phase checks', () => {
	describe('isPlayablePhase', () => {
		it('returns true for PLAYING', () => {
			expect(isPlayablePhase('PLAYING')).toBe(true);
		});

		it('returns false for other phases', () => {
			expect(isPlayablePhase('DEALING')).toBe(false);
			expect(isPlayablePhase('SCORING')).toBe(false);
			expect(isPlayablePhase('SHOPPING')).toBe(false);
			expect(isPlayablePhase('GAME_OVER')).toBe(false);
		});
	});

	describe('isAnimatingPhase', () => {
		it('returns true for DEALING and SCORING', () => {
			expect(isAnimatingPhase('DEALING')).toBe(true);
			expect(isAnimatingPhase('SCORING')).toBe(true);
		});

		it('returns false for other phases', () => {
			expect(isAnimatingPhase('PLAYING')).toBe(false);
			expect(isAnimatingPhase('SHOPPING')).toBe(false);
		});
	});

	describe('isTerminalPhase', () => {
		it('returns true for GAME_OVER and VICTORY', () => {
			expect(isTerminalPhase('GAME_OVER')).toBe(true);
			expect(isTerminalPhase('VICTORY')).toBe(true);
		});

		it('returns false for other phases', () => {
			expect(isTerminalPhase('PLAYING')).toBe(false);
			expect(isTerminalPhase('DEALING')).toBe(false);
		});
	});
});

describe('phase transitions', () => {
	it('getPhaseAfterDealing returns PLAYING', () => {
		expect(getPhaseAfterDealing()).toBe('PLAYING');
	});

	describe('getPhaseAfterScoring', () => {
		it('returns SHOPPING when blind beaten', () => {
			expect(getPhaseAfterScoring(true, 3)).toBe('SHOPPING');
		});

		it('returns GAME_OVER when no hands remain', () => {
			expect(getPhaseAfterScoring(false, 0)).toBe('GAME_OVER');
		});

		it('returns PLAYING when hands remain and blind not beaten', () => {
			expect(getPhaseAfterScoring(false, 2)).toBe('PLAYING');
		});
	});
});

describe('DEFAULT_LOOP_CONFIG', () => {
	it('has sensible defaults', () => {
		expect(DEFAULT_LOOP_CONFIG.targetFps).toBe(60);
		expect(DEFAULT_LOOP_CONFIG.maxDeltaTime).toBeGreaterThan(0);
	});
});
