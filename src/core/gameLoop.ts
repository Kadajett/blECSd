/**
 * Game loop with input priority and lifecycle management.
 * @module core/gameLoop
 */

import type { Scheduler } from './scheduler';
import { createScheduler } from './scheduler';
import type { System, World } from './types';

/**
 * Hook function called at specific points in the game loop.
 * @param world - The current ECS world
 * @param deltaTime - Time since last frame in seconds
 */
export type LoopHook = (world: World, deltaTime: number) => void;

/**
 * Configuration for fixed timestep mode.
 *
 * Fixed timestep runs game logic at a consistent rate, independent of
 * rendering frame rate. This is essential for:
 * - Deterministic physics simulations
 * - Network synchronization
 * - Replays and recording
 *
 * @example
 * ```typescript
 * const loop = createGameLoop(world, {
 *   fixedTimestepMode: {
 *     tickRate: 60,           // 60 physics updates per second
 *     maxUpdatesPerFrame: 5,  // Prevent spiral of death
 *     interpolate: true,      // Smooth rendering between ticks
 *   },
 * });
 * ```
 */
export interface FixedTimestepConfig {
	/**
	 * Number of fixed updates per second.
	 * Common values: 30, 60, 120 (higher = more precision, more CPU)
	 * @default 60
	 */
	readonly tickRate: number;

	/**
	 * Maximum fixed updates to run per frame.
	 * Prevents "spiral of death" when game can't keep up.
	 * If exceeded, game will run slower than real-time.
	 * @default 5
	 */
	readonly maxUpdatesPerFrame: number;

	/**
	 * Whether to interpolate render state between fixed updates.
	 * When true, rendering will be smooth even at low tick rates.
	 * When false, rendering shows the last completed tick state.
	 * @default true
	 */
	readonly interpolate: boolean;
}

/**
 * Configuration options for the game loop.
 */
export interface GameLoopOptions {
	/**
	 * Target frames per second. 0 means uncapped (as fast as possible).
	 * @default 60
	 */
	targetFPS?: number;

	/**
	 * Whether to use fixed timestep for physics stability.
	 * When true, deltaTime will be capped to prevent spiral of death.
	 * @default true
	 * @deprecated Use fixedTimestepMode for true fixed timestep with interpolation
	 */
	fixedTimestep?: boolean;

	/**
	 * Maximum delta time in seconds. Prevents large time jumps.
	 * @default 0.1 (100ms)
	 */
	maxDeltaTime?: number;

	/**
	 * Fixed timestep mode configuration.
	 * When set, the loop will use true fixed timestep with optional interpolation.
	 * INPUT is still processed every frame for responsiveness.
	 */
	fixedTimestepMode?: FixedTimestepConfig;
}

/**
 * Hook function for fixed timestep updates.
 * @param world - The current ECS world
 * @param fixedDeltaTime - Fixed delta time (always the same)
 * @param tickNumber - The current tick number since loop start
 */
export type FixedUpdateHook = (world: World, fixedDeltaTime: number, tickNumber: number) => void;

/**
 * Hook function for interpolated rendering.
 * @param world - The current ECS world
 * @param alpha - Interpolation factor (0-1) between previous and current tick
 */
export type InterpolateHook = (world: World, alpha: number) => void;

/**
 * Lifecycle hooks for the game loop.
 */
export interface GameLoopHooks {
	onBeforeInput?: LoopHook;
	onAfterInput?: LoopHook;
	onBeforeUpdate?: LoopHook;
	onAfterUpdate?: LoopHook;
	onBeforeRender?: LoopHook;
	onAfterRender?: LoopHook;
	onStart?: () => void;
	onStop?: () => void;
	onPause?: () => void;
	onResume?: () => void;
	onBeforeFixedUpdate?: FixedUpdateHook;
	onAfterFixedUpdate?: FixedUpdateHook;
	onInterpolate?: InterpolateHook;
}

/**
 * Statistics about the game loop performance.
 */
export interface LoopStats {
	fps: number;
	frameTime: number;
	frameCount: number;
	runningTime: number;
	tickCount: number;
	ticksPerSecond: number;
	interpolationAlpha: number;
	skippedUpdates: number;
}

/**
 * Game loop state enum.
 */
export enum LoopState {
	STOPPED = 0,
	RUNNING = 1,
	PAUSED = 2,
}

/**
 * GameLoop interface for type-safe access.
 */
export interface GameLoop {
	getState(): LoopState;
	isRunning(): boolean;
	isPaused(): boolean;
	isStopped(): boolean;
	getStats(): LoopStats;
	getInterpolationAlpha(): number;
	getFixedTimestepConfig(): FixedTimestepConfig | undefined;
	isFixedTimestepMode(): boolean;
	getScheduler(): Scheduler;
	getWorld(): World;
	setWorld(world: World): void;
	setTargetFPS(fps: number): void;
	getTargetFPS(): number;
	registerSystem(phase: number, system: System, priority?: number): void;
	unregisterSystem(system: System): void;
	registerInputSystem(system: System, priority?: number): void;
	setHooks(hooks: GameLoopHooks): void;
	start(): void;
	stop(): void;
	pause(): void;
	resume(): void;
	step(deltaTime?: number): void;
	stepFixed(): void;
}

/**
 * High-precision time function for Node.js.
 */
function getTime(): number {
	const [seconds, nanoseconds] = process.hrtime();
	return seconds + nanoseconds / 1e9;
}

/**
 * Creates a new game loop instance.
 *
 * The GameLoop wraps a Scheduler and provides:
 * - Lifecycle management (start/stop/pause/resume)
 * - Hook points for custom logic at specific phases
 * - FPS limiting and frame timing
 * - Performance statistics
 *
 * HARD REQUIREMENT: Input is ALWAYS processed first every frame.
 *
 * @param world - The ECS world to process
 * @param options - Loop configuration options
 * @param hooks - Lifecycle hooks
 * @returns A new GameLoop instance
 *
 * @example
 * ```typescript
 * import { createGameLoop, createWorld, LoopPhase } from 'blecsd';
 *
 * const world = createWorld();
 * const loop = createGameLoop(world, {
 *   targetFPS: 60,
 * }, {
 *   onStart: () => console.log('Game started!'),
 *   onStop: () => console.log('Game stopped!'),
 * });
 *
 * // Register systems
 * loop.registerSystem(LoopPhase.UPDATE, myUpdateSystem);
 *
 * // Start the game
 * loop.start();
 *
 * // Stop after 5 seconds
 * setTimeout(() => loop.stop(), 5000);
 * ```
 */
export function createGameLoop(
	initialWorld: World,
	options: GameLoopOptions = {},
	initialHooks: GameLoopHooks = {},
): GameLoop {
	let world = initialWorld;
	const scheduler = createScheduler();
	let hooks = { ...initialHooks };
	let state: LoopState = LoopState.STOPPED;

	const resolvedOptions = {
		targetFPS: options.targetFPS ?? 60,
		fixedTimestep: options.fixedTimestep ?? true,
		maxDeltaTime: options.maxDeltaTime ?? 0.1,
		fixedTimestepMode: options.fixedTimestepMode as FixedTimestepConfig | undefined,
	};

	// Timing
	let lastTime = 0;
	let frameInterval = resolvedOptions.targetFPS > 0 ? 1 / resolvedOptions.targetFPS : 0;

	// Stats
	let frameCount = 0;
	let startTime = 0;
	let lastFPSUpdate = 0;
	let framesThisSecond = 0;
	let currentFPS = 0;
	let currentFrameTime = 0;

	// Fixed timestep state
	let accumulator = 0;
	const fixedDeltaTime = resolvedOptions.fixedTimestepMode
		? 1 / resolvedOptions.fixedTimestepMode.tickRate
		: 1 / 60;
	let tickCount = 0;
	let ticksThisSecond = 0;
	let currentTicksPerSecond = 0;
	let currentAlpha = 0;
	let currentSkippedUpdates = 0;

	// Loop control
	let immediateId: ReturnType<typeof setImmediate> | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function scheduleNextFrame(): void {
		if (resolvedOptions.targetFPS === 0) {
			immediateId = setImmediate(() => tick());
		} else {
			const now = getTime();
			const elapsed = now - lastTime;
			const sleepTime = Math.max(0, frameInterval - elapsed);

			if (sleepTime > 0.001) {
				timeoutId = setTimeout(() => tick(), sleepTime * 1000);
			} else {
				immediateId = setImmediate(() => tick());
			}
		}
	}

	function cancelScheduledFrame(): void {
		if (immediateId !== null) {
			clearImmediate(immediateId);
			immediateId = null;
		}
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function executeFrame(deltaTime: number): void {
		hooks.onBeforeInput?.(world, deltaTime);
		world = scheduler.run(world, deltaTime);
		hooks.onAfterInput?.(world, deltaTime);
		hooks.onBeforeUpdate?.(world, deltaTime);
		hooks.onAfterUpdate?.(world, deltaTime);
		hooks.onBeforeRender?.(world, deltaTime);
		hooks.onAfterRender?.(world, deltaTime);
		frameCount++;
	}

	function executeFixedTimestepFrame(deltaTime: number): void {
		const config = resolvedOptions.fixedTimestepMode;
		if (!config) {
			return;
		}

		// CRITICAL: Always process input first, every frame, for responsiveness
		hooks.onBeforeInput?.(world, deltaTime);
		world = scheduler.runInputOnly(world, deltaTime);
		hooks.onAfterInput?.(world, deltaTime);

		// Accumulate time
		accumulator += deltaTime;

		// Track skipped updates
		currentSkippedUpdates = 0;
		let updates = 0;

		// Run fixed updates
		while (accumulator >= fixedDeltaTime) {
			if (updates >= config.maxUpdatesPerFrame) {
				const skipped = Math.floor(accumulator / fixedDeltaTime);
				currentSkippedUpdates = skipped;
				accumulator = accumulator % fixedDeltaTime;
				break;
			}

			hooks.onBeforeFixedUpdate?.(world, fixedDeltaTime, tickCount);
			hooks.onBeforeUpdate?.(world, fixedDeltaTime);
			world = scheduler.runFixedUpdatePhases(world, fixedDeltaTime);
			hooks.onAfterUpdate?.(world, fixedDeltaTime);
			hooks.onAfterFixedUpdate?.(world, fixedDeltaTime, tickCount);

			accumulator -= fixedDeltaTime;
			tickCount++;
			ticksThisSecond++;
			updates++;
		}

		// Calculate interpolation alpha
		currentAlpha = config.interpolate ? accumulator / fixedDeltaTime : 0;

		if (config.interpolate && hooks.onInterpolate) {
			hooks.onInterpolate(world, currentAlpha);
		}

		hooks.onBeforeRender?.(world, deltaTime);
		world = scheduler.runRenderPhases(world, deltaTime);
		hooks.onAfterRender?.(world, deltaTime);

		frameCount++;
	}

	function updateStats(now: number, deltaTime: number): void {
		currentFrameTime = deltaTime * 1000;
		framesThisSecond++;

		if (now - lastFPSUpdate >= 1) {
			currentFPS = framesThisSecond;
			currentTicksPerSecond = ticksThisSecond;
			framesThisSecond = 0;
			ticksThisSecond = 0;
			lastFPSUpdate = now;
		}
	}

	function tick(): void {
		if (state !== LoopState.RUNNING) {
			return;
		}

		const now = getTime();
		let deltaTime = now - lastTime;
		lastTime = now;

		if (deltaTime > resolvedOptions.maxDeltaTime) {
			deltaTime = resolvedOptions.maxDeltaTime;
		}

		if (resolvedOptions.fixedTimestepMode) {
			executeFixedTimestepFrame(deltaTime);
		} else {
			executeFrame(deltaTime);
		}

		updateStats(now, deltaTime);
		scheduleNextFrame();
	}

	const loop: GameLoop = {
		getState(): LoopState {
			return state;
		},

		isRunning(): boolean {
			return state === LoopState.RUNNING;
		},

		isPaused(): boolean {
			return state === LoopState.PAUSED;
		},

		isStopped(): boolean {
			return state === LoopState.STOPPED;
		},

		getStats(): LoopStats {
			return {
				fps: currentFPS,
				frameTime: currentFrameTime,
				frameCount,
				runningTime: state !== LoopState.STOPPED ? getTime() - startTime : 0,
				tickCount,
				ticksPerSecond: currentTicksPerSecond,
				interpolationAlpha: currentAlpha,
				skippedUpdates: currentSkippedUpdates,
			};
		},

		getInterpolationAlpha(): number {
			return currentAlpha;
		},

		getFixedTimestepConfig(): FixedTimestepConfig | undefined {
			return resolvedOptions.fixedTimestepMode;
		},

		isFixedTimestepMode(): boolean {
			return resolvedOptions.fixedTimestepMode !== undefined;
		},

		getScheduler(): Scheduler {
			return scheduler;
		},

		getWorld(): World {
			return world;
		},

		setWorld(newWorld: World): void {
			if (state !== LoopState.STOPPED) {
				throw new Error('Cannot change world while loop is running');
			}
			world = newWorld;
		},

		setTargetFPS(fps: number): void {
			resolvedOptions.targetFPS = fps;
			frameInterval = fps > 0 ? 1 / fps : 0;
		},

		getTargetFPS(): number {
			return resolvedOptions.targetFPS;
		},

		registerSystem(phase: number, system: System, priority = 0): void {
			scheduler.registerSystem(phase, system, priority);
		},

		unregisterSystem(system: System): void {
			scheduler.unregisterSystem(system);
		},

		registerInputSystem(system: System, priority = 0): void {
			scheduler.registerInputSystem(system, priority);
		},

		setHooks(newHooks: GameLoopHooks): void {
			hooks = { ...hooks, ...newHooks };
		},

		start(): void {
			if (state === LoopState.RUNNING) {
				return;
			}

			const wasStoppedOrNew = state === LoopState.STOPPED;

			state = LoopState.RUNNING;
			lastTime = getTime();

			if (wasStoppedOrNew) {
				frameCount = 0;
				startTime = lastTime;
				lastFPSUpdate = lastTime;
				framesThisSecond = 0;
				accumulator = 0;
				tickCount = 0;
				ticksThisSecond = 0;
				currentTicksPerSecond = 0;
				currentAlpha = 0;
				currentSkippedUpdates = 0;
				hooks.onStart?.();
			} else {
				hooks.onResume?.();
			}

			scheduleNextFrame();
		},

		stop(): void {
			if (state === LoopState.STOPPED) {
				return;
			}

			cancelScheduledFrame();
			state = LoopState.STOPPED;
			hooks.onStop?.();
		},

		pause(): void {
			if (state !== LoopState.RUNNING) {
				return;
			}

			cancelScheduledFrame();
			state = LoopState.PAUSED;
			hooks.onPause?.();
		},

		resume(): void {
			if (state !== LoopState.PAUSED) {
				return;
			}

			loop.start();
		},

		step(deltaTime?: number): void {
			const now = getTime();
			const dt = deltaTime ?? (lastTime > 0 ? now - lastTime : 1 / 60);
			lastTime = now;

			const cappedDt = Math.min(dt, resolvedOptions.maxDeltaTime);

			if (resolvedOptions.fixedTimestepMode) {
				executeFixedTimestepFrame(cappedDt);
			} else {
				executeFrame(cappedDt);
			}

			currentFrameTime = cappedDt * 1000;
		},

		stepFixed(): void {
			if (!resolvedOptions.fixedTimestepMode) {
				throw new Error('stepFixed() requires fixedTimestepMode to be enabled');
			}

			hooks.onBeforeFixedUpdate?.(world, fixedDeltaTime, tickCount);
			hooks.onBeforeUpdate?.(world, fixedDeltaTime);
			world = scheduler.runFixedUpdatePhases(world, fixedDeltaTime);
			hooks.onAfterUpdate?.(world, fixedDeltaTime);
			hooks.onAfterFixedUpdate?.(world, fixedDeltaTime, tickCount);

			tickCount++;
		},
	};

	return loop;
}

/**
 * Checks if a game loop exists and is running.
 *
 * @param loop - The game loop to check (may be undefined)
 * @returns true if loop exists and is running
 */
export function isLoopRunning(loop: GameLoop | undefined): boolean {
	return loop?.isRunning() ?? false;
}

/**
 * Checks if a game loop exists and is paused.
 *
 * @param loop - The game loop to check (may be undefined)
 * @returns true if loop exists and is paused
 */
export function isLoopPaused(loop: GameLoop | undefined): boolean {
	return loop?.isPaused() ?? false;
}
