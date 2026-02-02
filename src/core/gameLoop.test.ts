import { createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createGameLoop,
	GameLoop,
	isLoopPaused,
	isLoopRunning,
	LoopState,
} from './gameLoop';
import { LoopPhase } from './types';
import type { System, World } from './types';

describe('GameLoop', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createGameLoop', () => {
		it('should create a game loop with default options', () => {
			const loop = createGameLoop(world);

			expect(loop).toBeInstanceOf(GameLoop);
			expect(loop.getState()).toBe(LoopState.STOPPED);
			expect(loop.getTargetFPS()).toBe(60);
		});

		it('should create a game loop with custom options', () => {
			const loop = createGameLoop(world, { targetFPS: 30 });

			expect(loop.getTargetFPS()).toBe(30);
		});

		it('should create a game loop with hooks', () => {
			const onStart = vi.fn();
			const loop = createGameLoop(world, {}, { onStart });

			loop.start();
			expect(onStart).toHaveBeenCalledTimes(1);
			loop.stop();
		});
	});

	describe('lifecycle methods', () => {
		it('should start the loop', () => {
			const loop = createGameLoop(world);

			loop.start();
			expect(loop.isRunning()).toBe(true);
			expect(loop.getState()).toBe(LoopState.RUNNING);
			loop.stop();
		});

		it('should stop the loop', () => {
			const loop = createGameLoop(world);

			loop.start();
			loop.stop();
			expect(loop.isStopped()).toBe(true);
			expect(loop.getState()).toBe(LoopState.STOPPED);
		});

		it('should pause the loop', () => {
			const loop = createGameLoop(world);

			loop.start();
			loop.pause();
			expect(loop.isPaused()).toBe(true);
			expect(loop.getState()).toBe(LoopState.PAUSED);
			loop.stop();
		});

		it('should resume from pause', () => {
			const loop = createGameLoop(world);

			loop.start();
			loop.pause();
			loop.resume();
			expect(loop.isRunning()).toBe(true);
			loop.stop();
		});

		it('should not start if already running', () => {
			const onStart = vi.fn();
			const loop = createGameLoop(world, {}, { onStart });

			loop.start();
			loop.start(); // Second start should be ignored
			expect(onStart).toHaveBeenCalledTimes(1);
			loop.stop();
		});

		it('should not stop if already stopped', () => {
			const onStop = vi.fn();
			const loop = createGameLoop(world, {}, { onStop });

			loop.start();
			loop.stop();
			loop.stop(); // Second stop should be ignored
			expect(onStop).toHaveBeenCalledTimes(1);
		});

		it('should not pause if not running', () => {
			const onPause = vi.fn();
			const loop = createGameLoop(world, {}, { onPause });

			loop.pause(); // Should be ignored when stopped
			expect(onPause).not.toHaveBeenCalled();
		});

		it('should not resume if not paused', () => {
			const onResume = vi.fn();
			const loop = createGameLoop(world, {}, { onResume });

			loop.start();
			loop.resume(); // Should be ignored when running
			expect(onResume).not.toHaveBeenCalled();
			loop.stop();
		});
	});

	describe('hooks', () => {
		it('should call onStart hook when starting', () => {
			const onStart = vi.fn();
			const loop = createGameLoop(world, {}, { onStart });

			loop.start();
			expect(onStart).toHaveBeenCalledTimes(1);
			loop.stop();
		});

		it('should call onStop hook when stopping', () => {
			const onStop = vi.fn();
			const loop = createGameLoop(world, {}, { onStop });

			loop.start();
			loop.stop();
			expect(onStop).toHaveBeenCalledTimes(1);
		});

		it('should call onPause hook when pausing', () => {
			const onPause = vi.fn();
			const loop = createGameLoop(world, {}, { onPause });

			loop.start();
			loop.pause();
			expect(onPause).toHaveBeenCalledTimes(1);
			loop.stop();
		});

		it('should call onResume hook when resuming', () => {
			const onResume = vi.fn();
			const loop = createGameLoop(world, {}, { onResume });

			loop.start();
			loop.pause();
			loop.resume();
			expect(onResume).toHaveBeenCalledTimes(1);
			loop.stop();
		});

		it('should call frame hooks on step', () => {
			const onBeforeInput = vi.fn();
			const onAfterInput = vi.fn();
			const onBeforeUpdate = vi.fn();
			const onAfterUpdate = vi.fn();
			const onBeforeRender = vi.fn();
			const onAfterRender = vi.fn();

			const loop = createGameLoop(
				world,
				{},
				{
					onBeforeInput,
					onAfterInput,
					onBeforeUpdate,
					onAfterUpdate,
					onBeforeRender,
					onAfterRender,
				},
			);

			loop.step(1 / 60);

			expect(onBeforeInput).toHaveBeenCalledTimes(1);
			expect(onAfterInput).toHaveBeenCalledTimes(1);
			expect(onBeforeUpdate).toHaveBeenCalledTimes(1);
			expect(onAfterUpdate).toHaveBeenCalledTimes(1);
			expect(onBeforeRender).toHaveBeenCalledTimes(1);
			expect(onAfterRender).toHaveBeenCalledTimes(1);
		});

		it('should pass world and deltaTime to frame hooks', () => {
			const onBeforeInput = vi.fn();
			const loop = createGameLoop(world, {}, { onBeforeInput });

			loop.step(0.016);

			expect(onBeforeInput).toHaveBeenCalledWith(world, 0.016);
		});

		it('should allow updating hooks', () => {
			const onStart1 = vi.fn();
			const onStart2 = vi.fn();
			const loop = createGameLoop(world, {}, { onStart: onStart1 });

			loop.setHooks({ onStart: onStart2 });
			loop.start();

			expect(onStart1).not.toHaveBeenCalled();
			expect(onStart2).toHaveBeenCalledTimes(1);
			loop.stop();
		});
	});

	describe('step', () => {
		it('should execute a single frame with provided deltaTime', () => {
			const loop = createGameLoop(world);
			const systemFn = vi.fn((w: World) => w);

			loop.registerSystem(LoopPhase.UPDATE, systemFn);
			loop.step(0.016);

			expect(systemFn).toHaveBeenCalledTimes(1);
		});

		it('should increment frame count', () => {
			const loop = createGameLoop(world);

			expect(loop.getStats().frameCount).toBe(0);
			loop.step(0.016);
			expect(loop.getStats().frameCount).toBe(1);
			loop.step(0.016);
			expect(loop.getStats().frameCount).toBe(2);
		});

		it('should cap deltaTime to maxDeltaTime', () => {
			const onBeforeInput = vi.fn();
			const loop = createGameLoop(world, { maxDeltaTime: 0.1 }, { onBeforeInput });

			loop.step(0.5); // Way over max

			expect(onBeforeInput).toHaveBeenCalledWith(world, 0.1);
		});
	});

	describe('system registration', () => {
		it('should register systems to the scheduler', () => {
			const loop = createGameLoop(world);
			const system: System = (w) => w;

			loop.registerSystem(LoopPhase.UPDATE, system);

			expect(loop.getScheduler().hasSystem(system)).toBe(true);
		});

		it('should unregister systems from the scheduler', () => {
			const loop = createGameLoop(world);
			const system: System = (w) => w;

			loop.registerSystem(LoopPhase.UPDATE, system);
			loop.unregisterSystem(system);

			expect(loop.getScheduler().hasSystem(system)).toBe(false);
		});

		it('should register input systems', () => {
			const loop = createGameLoop(world);
			const inputSystem: System = (w) => w;

			loop.registerInputSystem(inputSystem);

			const inputSystems = loop.getScheduler().getSystemsForPhase(LoopPhase.INPUT);
			expect(inputSystems).toContain(inputSystem);
		});

		it('should run systems in order during step', () => {
			const loop = createGameLoop(world);
			const callOrder: string[] = [];

			const inputSystem: System = (w) => {
				callOrder.push('input');
				return w;
			};
			const updateSystem: System = (w) => {
				callOrder.push('update');
				return w;
			};
			const renderSystem: System = (w) => {
				callOrder.push('render');
				return w;
			};

			loop.registerInputSystem(inputSystem);
			loop.registerSystem(LoopPhase.UPDATE, updateSystem);
			loop.registerSystem(LoopPhase.RENDER, renderSystem);

			loop.step(0.016);

			expect(callOrder).toEqual(['input', 'update', 'render']);
		});
	});

	describe('world management', () => {
		it('should return the current world', () => {
			const loop = createGameLoop(world);

			expect(loop.getWorld()).toBe(world);
		});

		it('should allow setting world when stopped', () => {
			const loop = createGameLoop(world);
			const newWorld = createWorld();

			loop.setWorld(newWorld);

			expect(loop.getWorld()).toBe(newWorld);
		});

		it('should throw when setting world while running', () => {
			const loop = createGameLoop(world);
			const newWorld = createWorld();

			loop.start();

			expect(() => loop.setWorld(newWorld)).toThrow('Cannot change world while loop is running');
			loop.stop();
		});

		it('should throw when setting world while paused', () => {
			const loop = createGameLoop(world);
			const newWorld = createWorld();

			loop.start();
			loop.pause();

			expect(() => loop.setWorld(newWorld)).toThrow('Cannot change world while loop is running');
			loop.stop();
		});
	});

	describe('FPS management', () => {
		it('should get target FPS', () => {
			const loop = createGameLoop(world, { targetFPS: 30 });

			expect(loop.getTargetFPS()).toBe(30);
		});

		it('should set target FPS', () => {
			const loop = createGameLoop(world);

			loop.setTargetFPS(120);

			expect(loop.getTargetFPS()).toBe(120);
		});

		it('should allow uncapped FPS (0)', () => {
			const loop = createGameLoop(world, { targetFPS: 0 });

			expect(loop.getTargetFPS()).toBe(0);
		});
	});

	describe('stats', () => {
		it('should report frame count', () => {
			const loop = createGameLoop(world);

			loop.step(0.016);
			loop.step(0.016);
			loop.step(0.016);

			expect(loop.getStats().frameCount).toBe(3);
		});

		it('should report frame time', () => {
			const loop = createGameLoop(world);

			loop.step(0.016);

			expect(loop.getStats().frameTime).toBeCloseTo(16, 0);
		});

		it('should reset frame count on start from stopped', () => {
			const loop = createGameLoop(world);

			loop.step(0.016);
			loop.step(0.016);
			expect(loop.getStats().frameCount).toBe(2);

			loop.start();
			expect(loop.getStats().frameCount).toBe(0);
			loop.stop();
		});
	});

	describe('helper functions', () => {
		it('isLoopRunning should return true for running loop', () => {
			const loop = createGameLoop(world);

			loop.start();
			expect(isLoopRunning(loop)).toBe(true);
			loop.stop();
		});

		it('isLoopRunning should return false for stopped loop', () => {
			const loop = createGameLoop(world);

			expect(isLoopRunning(loop)).toBe(false);
		});

		it('isLoopRunning should return false for undefined', () => {
			expect(isLoopRunning(undefined)).toBe(false);
		});

		it('isLoopPaused should return true for paused loop', () => {
			const loop = createGameLoop(world);

			loop.start();
			loop.pause();
			expect(isLoopPaused(loop)).toBe(true);
			loop.stop();
		});

		it('isLoopPaused should return false for running loop', () => {
			const loop = createGameLoop(world);

			loop.start();
			expect(isLoopPaused(loop)).toBe(false);
			loop.stop();
		});

		it('isLoopPaused should return false for undefined', () => {
			expect(isLoopPaused(undefined)).toBe(false);
		});
	});

	describe('scheduler access', () => {
		it('should expose the scheduler', () => {
			const loop = createGameLoop(world);

			const scheduler = loop.getScheduler();
			expect(scheduler).toBeDefined();
			expect(typeof scheduler.registerSystem).toBe('function');
		});
	});

	describe('input priority', () => {
		it('should always run input systems before other systems', () => {
			const loop = createGameLoop(world);
			const callOrder: number[] = [];

			// Register in wrong order to verify input runs first
			loop.registerSystem(LoopPhase.RENDER, () => {
				callOrder.push(3);
				return world;
			});
			loop.registerSystem(LoopPhase.UPDATE, () => {
				callOrder.push(2);
				return world;
			});
			loop.registerInputSystem(() => {
				callOrder.push(1);
				return world;
			});

			loop.step(0.016);

			expect(callOrder[0]).toBe(1); // Input always first
		});
	});
});
