/**
 * Game loop with input priority and lifecycle management.
 * @module core/gameLoop
 */

import { Scheduler } from './scheduler';
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
	 *
	 * @example
	 * ```typescript
	 * const loop = createGameLoop(world, {
	 *   fixedTimestepMode: {
	 *     tickRate: 60,
	 *     maxUpdatesPerFrame: 5,
	 *     interpolate: true,
	 *   },
	 * });
	 * ```
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
	/**
	 * Called before input processing.
	 */
	onBeforeInput?: LoopHook;

	/**
	 * Called after input processing, before update.
	 */
	onAfterInput?: LoopHook;

	/**
	 * Called before update phase.
	 */
	onBeforeUpdate?: LoopHook;

	/**
	 * Called after update phase, before physics.
	 */
	onAfterUpdate?: LoopHook;

	/**
	 * Called before render phase.
	 */
	onBeforeRender?: LoopHook;

	/**
	 * Called after render phase.
	 */
	onAfterRender?: LoopHook;

	/**
	 * Called when the loop starts.
	 */
	onStart?: () => void;

	/**
	 * Called when the loop stops.
	 */
	onStop?: () => void;

	/**
	 * Called when the loop is paused.
	 */
	onPause?: () => void;

	/**
	 * Called when the loop resumes from pause.
	 */
	onResume?: () => void;

	/**
	 * Called before each fixed timestep update.
	 * Only used when fixedTimestepMode is enabled.
	 */
	onBeforeFixedUpdate?: FixedUpdateHook;

	/**
	 * Called after each fixed timestep update.
	 * Only used when fixedTimestepMode is enabled.
	 */
	onAfterFixedUpdate?: FixedUpdateHook;

	/**
	 * Called before render with interpolation alpha.
	 * Only used when fixedTimestepMode.interpolate is true.
	 * Use this to interpolate positions for smooth rendering.
	 */
	onInterpolate?: InterpolateHook;
}

/**
 * Statistics about the game loop performance.
 */
export interface LoopStats {
	/**
	 * Current frames per second.
	 */
	fps: number;

	/**
	 * Current frame time in milliseconds.
	 */
	frameTime: number;

	/**
	 * Total frames rendered since start.
	 */
	frameCount: number;

	/**
	 * Total time the loop has been running in seconds.
	 */
	runningTime: number;

	/**
	 * Total fixed updates since start.
	 * Only meaningful when fixedTimestepMode is enabled.
	 */
	tickCount: number;

	/**
	 * Fixed updates per second (actual rate).
	 * Only meaningful when fixedTimestepMode is enabled.
	 */
	ticksPerSecond: number;

	/**
	 * Current interpolation alpha (0-1).
	 * Represents how far between the last tick and the next tick we are.
	 * Only meaningful when fixedTimestepMode.interpolate is true.
	 */
	interpolationAlpha: number;

	/**
	 * Number of fixed updates that were skipped this frame due to maxUpdatesPerFrame.
	 * Non-zero value indicates the game can't keep up with the tick rate.
	 */
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
 * High-precision time function for Node.js.
 */
function getTime(): number {
	const [seconds, nanoseconds] = process.hrtime();
	return seconds + nanoseconds / 1e9;
}

/**
 * Game loop class that manages the main update cycle.
 *
 * The GameLoop wraps a Scheduler and provides:
 * - Lifecycle management (start/stop/pause/resume)
 * - Hook points for custom logic at specific phases
 * - FPS limiting and frame timing
 * - Performance statistics
 *
 * HARD REQUIREMENT: Input is ALWAYS processed first every frame.
 * This ensures responsive controls regardless of other system load.
 *
 * @example
 * ```typescript
 * import { createGameLoop, createWorld, LoopPhase } from 'blecsd';
 *
 * const world = createWorld();
 * const loop = createGameLoop(world, {
 *   targetFPS: 60,
 *   hooks: {
 *     onBeforeRender: (world, dt) => {
 *       console.log(`Frame time: ${dt * 1000}ms`);
 *     },
 *   },
 * });
 *
 * // Register systems
 * loop.registerSystem(LoopPhase.UPDATE, movementSystem);
 * loop.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // Start the loop
 * loop.start();
 *
 * // Later: stop the loop
 * loop.stop();
 * ```
 */
export class GameLoop {
	private world: World;
	private scheduler: Scheduler;
	private state: LoopState = LoopState.STOPPED;
	private hooks: GameLoopHooks;
	private options: Required<Omit<GameLoopOptions, 'fixedTimestepMode'>> & {
		fixedTimestepMode: FixedTimestepConfig | undefined;
	};

	// Timing
	private lastTime = 0;
	private frameInterval: number;

	// Stats
	private frameCount = 0;
	private startTime = 0;
	private lastFPSUpdate = 0;
	private framesThisSecond = 0;
	private currentFPS = 0;
	private currentFrameTime = 0;

	// Fixed timestep state
	private accumulator = 0;
	private fixedDeltaTime = 1 / 60;
	private tickCount = 0;
	private ticksThisSecond = 0;
	private currentTicksPerSecond = 0;
	private currentAlpha = 0;
	private currentSkippedUpdates = 0;

	// Loop control
	private immediateId: ReturnType<typeof setImmediate> | null = null;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Creates a new game loop.
	 *
	 * @param world - The ECS world to process
	 * @param options - Loop configuration options
	 * @param hooks - Lifecycle hooks
	 */
	constructor(world: World, options: GameLoopOptions = {}, hooks: GameLoopHooks = {}) {
		this.world = world;
		this.scheduler = new Scheduler();
		this.hooks = hooks;

		this.options = {
			targetFPS: options.targetFPS ?? 60,
			fixedTimestep: options.fixedTimestep ?? true,
			maxDeltaTime: options.maxDeltaTime ?? 0.1,
			fixedTimestepMode: options.fixedTimestepMode,
		};

		this.frameInterval = this.options.targetFPS > 0 ? 1 / this.options.targetFPS : 0;

		// Configure fixed timestep mode if provided
		if (this.options.fixedTimestepMode) {
			this.fixedDeltaTime = 1 / this.options.fixedTimestepMode.tickRate;
		}
	}

	/**
	 * Gets the current loop state.
	 */
	getState(): LoopState {
		return this.state;
	}

	/**
	 * Checks if the loop is currently running.
	 */
	isRunning(): boolean {
		return this.state === LoopState.RUNNING;
	}

	/**
	 * Checks if the loop is currently paused.
	 */
	isPaused(): boolean {
		return this.state === LoopState.PAUSED;
	}

	/**
	 * Checks if the loop is stopped.
	 */
	isStopped(): boolean {
		return this.state === LoopState.STOPPED;
	}

	/**
	 * Gets current performance statistics.
	 */
	getStats(): LoopStats {
		return {
			fps: this.currentFPS,
			frameTime: this.currentFrameTime,
			frameCount: this.frameCount,
			runningTime: this.state !== LoopState.STOPPED ? getTime() - this.startTime : 0,
			tickCount: this.tickCount,
			ticksPerSecond: this.currentTicksPerSecond,
			interpolationAlpha: this.currentAlpha,
			skippedUpdates: this.currentSkippedUpdates,
		};
	}

	/**
	 * Gets the current interpolation alpha (0-1).
	 * Useful for interpolating visual state between fixed updates.
	 *
	 * @returns The interpolation factor, or 0 if not in fixed timestep mode
	 *
	 * @example
	 * ```typescript
	 * // In render system
	 * const alpha = loop.getInterpolationAlpha();
	 * const renderX = prevX + (currentX - prevX) * alpha;
	 * ```
	 */
	getInterpolationAlpha(): number {
		return this.currentAlpha;
	}

	/**
	 * Gets the fixed timestep configuration.
	 *
	 * @returns The fixed timestep config, or undefined if not enabled
	 */
	getFixedTimestepConfig(): FixedTimestepConfig | undefined {
		return this.options.fixedTimestepMode;
	}

	/**
	 * Checks if fixed timestep mode is enabled.
	 */
	isFixedTimestepMode(): boolean {
		return this.options.fixedTimestepMode !== undefined;
	}

	/**
	 * Gets the underlying scheduler for system registration.
	 */
	getScheduler(): Scheduler {
		return this.scheduler;
	}

	/**
	 * Gets the current world.
	 */
	getWorld(): World {
		return this.world;
	}

	/**
	 * Sets a new world for the loop.
	 * Can only be done while stopped.
	 *
	 * @param world - The new world to use
	 * @throws Error if loop is running
	 */
	setWorld(world: World): void {
		if (this.state !== LoopState.STOPPED) {
			throw new Error('Cannot change world while loop is running');
		}
		this.world = world;
	}

	/**
	 * Updates the target FPS.
	 *
	 * @param fps - New target FPS (0 for uncapped)
	 */
	setTargetFPS(fps: number): void {
		this.options.targetFPS = fps;
		this.frameInterval = fps > 0 ? 1 / fps : 0;
	}

	/**
	 * Gets the target FPS.
	 */
	getTargetFPS(): number {
		return this.options.targetFPS;
	}

	/**
	 * Registers a system with the scheduler.
	 * Convenience method that delegates to the underlying scheduler.
	 *
	 * @param phase - The loop phase to register the system in
	 * @param system - The system function
	 * @param priority - Priority within the phase (lower = earlier)
	 */
	registerSystem(phase: number, system: System, priority = 0): void {
		this.scheduler.registerSystem(phase, system, priority);
	}

	/**
	 * Unregisters a system from the scheduler.
	 *
	 * @param system - The system to unregister
	 */
	unregisterSystem(system: System): void {
		this.scheduler.unregisterSystem(system);
	}

	/**
	 * Registers an input system (internal use).
	 *
	 * @param system - The input system
	 * @param priority - Priority within input phase
	 * @internal
	 */
	registerInputSystem(system: System, priority = 0): void {
		this.scheduler.registerInputSystem(system, priority);
	}

	/**
	 * Updates the lifecycle hooks.
	 *
	 * @param hooks - New hooks to set (merged with existing)
	 */
	setHooks(hooks: GameLoopHooks): void {
		this.hooks = { ...this.hooks, ...hooks };
	}

	/**
	 * Starts the game loop.
	 * Does nothing if already running.
	 */
	start(): void {
		if (this.state === LoopState.RUNNING) {
			return;
		}

		const wasStoppedOrNew = this.state === LoopState.STOPPED;

		this.state = LoopState.RUNNING;
		this.lastTime = getTime();

		if (wasStoppedOrNew) {
			this.frameCount = 0;
			this.startTime = this.lastTime;
			this.lastFPSUpdate = this.lastTime;
			this.framesThisSecond = 0;
			// Reset fixed timestep state
			this.accumulator = 0;
			this.tickCount = 0;
			this.ticksThisSecond = 0;
			this.currentTicksPerSecond = 0;
			this.currentAlpha = 0;
			this.currentSkippedUpdates = 0;
			this.hooks.onStart?.();
		} else {
			// Resuming from pause
			this.hooks.onResume?.();
		}

		this.scheduleNextFrame();
	}

	/**
	 * Stops the game loop completely.
	 * Resets all statistics.
	 */
	stop(): void {
		if (this.state === LoopState.STOPPED) {
			return;
		}

		this.cancelScheduledFrame();
		this.state = LoopState.STOPPED;
		this.hooks.onStop?.();
	}

	/**
	 * Pauses the game loop.
	 * Can be resumed with start() or resume().
	 */
	pause(): void {
		if (this.state !== LoopState.RUNNING) {
			return;
		}

		this.cancelScheduledFrame();
		this.state = LoopState.PAUSED;
		this.hooks.onPause?.();
	}

	/**
	 * Resumes the game loop from pause.
	 * Alias for start() when paused.
	 */
	resume(): void {
		if (this.state !== LoopState.PAUSED) {
			return;
		}

		this.start();
	}

	/**
	 * Runs a single frame manually.
	 * Useful for testing or step-through debugging.
	 *
	 * @param deltaTime - Delta time to use (default: calculated from last frame)
	 */
	step(deltaTime?: number): void {
		const now = getTime();
		const dt = deltaTime ?? (this.lastTime > 0 ? now - this.lastTime : 1 / 60);
		this.lastTime = now;

		const cappedDt = Math.min(dt, this.options.maxDeltaTime);

		if (this.options.fixedTimestepMode) {
			this.executeFixedTimestepFrame(cappedDt);
		} else {
			this.executeFrame(cappedDt);
		}

		this.currentFrameTime = cappedDt * 1000;
	}

	/**
	 * Runs a single fixed update manually.
	 * Only works when fixedTimestepMode is enabled.
	 * Useful for testing deterministic behavior.
	 *
	 * @throws Error if fixedTimestepMode is not enabled
	 *
	 * @example
	 * ```typescript
	 * const loop = createGameLoop(world, {
	 *   fixedTimestepMode: { tickRate: 60, maxUpdatesPerFrame: 5, interpolate: true },
	 * });
	 *
	 * // Run exactly one fixed update
	 * loop.stepFixed();
	 * ```
	 */
	stepFixed(): void {
		if (!this.options.fixedTimestepMode) {
			throw new Error('stepFixed() requires fixedTimestepMode to be enabled');
		}

		// Before fixed update hook
		this.hooks.onBeforeFixedUpdate?.(this.world, this.fixedDeltaTime, this.tickCount);

		// Before update hook (for compatibility)
		this.hooks.onBeforeUpdate?.(this.world, this.fixedDeltaTime);

		// Run fixed update phases
		this.world = this.scheduler.runFixedUpdatePhases(this.world, this.fixedDeltaTime);

		// After update hook (for compatibility)
		this.hooks.onAfterUpdate?.(this.world, this.fixedDeltaTime);

		// After fixed update hook
		this.hooks.onAfterFixedUpdate?.(this.world, this.fixedDeltaTime, this.tickCount);

		this.tickCount++;
	}

	/**
	 * Schedules the next frame using appropriate timing.
	 */
	private scheduleNextFrame(): void {
		if (this.options.targetFPS === 0) {
			// Uncapped: use setImmediate for fastest possible
			this.immediateId = setImmediate(() => this.tick());
		} else {
			// Calculate time until next frame
			const now = getTime();
			const elapsed = now - this.lastTime;
			const sleepTime = Math.max(0, this.frameInterval - elapsed);

			if (sleepTime > 0.001) {
				// More than 1ms: use setTimeout
				this.timeoutId = setTimeout(() => this.tick(), sleepTime * 1000);
			} else {
				// Very short: use setImmediate
				this.immediateId = setImmediate(() => this.tick());
			}
		}
	}

	/**
	 * Cancels any scheduled frame.
	 */
	private cancelScheduledFrame(): void {
		if (this.immediateId !== null) {
			clearImmediate(this.immediateId);
			this.immediateId = null;
		}
		if (this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	/**
	 * Main tick function called each frame.
	 */
	private tick(): void {
		if (this.state !== LoopState.RUNNING) {
			return;
		}

		const now = getTime();
		let deltaTime = now - this.lastTime;
		this.lastTime = now;

		// Cap delta time to prevent spiral of death
		if (deltaTime > this.options.maxDeltaTime) {
			deltaTime = this.options.maxDeltaTime;
		}

		// Execute the frame
		if (this.options.fixedTimestepMode) {
			this.executeFixedTimestepFrame(deltaTime);
		} else {
			this.executeFrame(deltaTime);
		}

		// Update stats
		this.updateStats(now, deltaTime);

		// Schedule next frame
		this.scheduleNextFrame();
	}

	/**
	 * Executes a single frame with the given delta time.
	 * Used in variable timestep mode.
	 */
	private executeFrame(deltaTime: number): void {
		// Before input hook
		this.hooks.onBeforeInput?.(this.world, deltaTime);

		// Run scheduler (includes input phase first)
		this.world = this.scheduler.run(this.world, deltaTime);

		// After input hook (called after scheduler runs input)
		this.hooks.onAfterInput?.(this.world, deltaTime);

		// Note: The scheduler runs all phases including update/physics/render
		// These hooks are called at semantic boundaries for user convenience

		// Before update hook (semantically after input is done)
		this.hooks.onBeforeUpdate?.(this.world, deltaTime);

		// After update hook (before render conceptually)
		this.hooks.onAfterUpdate?.(this.world, deltaTime);

		// Before render hook
		this.hooks.onBeforeRender?.(this.world, deltaTime);

		// After render hook
		this.hooks.onAfterRender?.(this.world, deltaTime);

		this.frameCount++;
	}

	/**
	 * Executes a frame using fixed timestep mode.
	 *
	 * IMPORTANT: Input is ALWAYS processed every frame for responsiveness,
	 * regardless of fixed timestep rate.
	 *
	 * Fixed timestep loop:
	 * 1. Process input (every frame, not at fixed rate)
	 * 2. Accumulate real time
	 * 3. Run fixed updates at consistent rate
	 * 4. Calculate interpolation alpha
	 * 5. Render (optionally with interpolation)
	 */
	private executeFixedTimestepFrame(deltaTime: number): void {
		const config = this.options.fixedTimestepMode;
		if (!config) {
			return;
		}

		// CRITICAL: Always process input first, every frame, for responsiveness
		this.hooks.onBeforeInput?.(this.world, deltaTime);
		this.world = this.scheduler.runInputOnly(this.world, deltaTime);
		this.hooks.onAfterInput?.(this.world, deltaTime);

		// Accumulate time
		this.accumulator += deltaTime;

		// Track skipped updates
		this.currentSkippedUpdates = 0;
		let updates = 0;

		// Run fixed updates
		while (this.accumulator >= this.fixedDeltaTime) {
			// Check for spiral of death
			if (updates >= config.maxUpdatesPerFrame) {
				// Consume remaining accumulator to prevent spiral
				const skipped = Math.floor(this.accumulator / this.fixedDeltaTime);
				this.currentSkippedUpdates = skipped;
				this.accumulator = this.accumulator % this.fixedDeltaTime;
				break;
			}

			// Before fixed update hook
			this.hooks.onBeforeFixedUpdate?.(this.world, this.fixedDeltaTime, this.tickCount);

			// Before update hook (for compatibility)
			this.hooks.onBeforeUpdate?.(this.world, this.fixedDeltaTime);

			// Run fixed update phases (UPDATE, LATE_UPDATE, PHYSICS)
			this.world = this.scheduler.runFixedUpdatePhases(this.world, this.fixedDeltaTime);

			// After update hook (for compatibility)
			this.hooks.onAfterUpdate?.(this.world, this.fixedDeltaTime);

			// After fixed update hook
			this.hooks.onAfterFixedUpdate?.(this.world, this.fixedDeltaTime, this.tickCount);

			this.accumulator -= this.fixedDeltaTime;
			this.tickCount++;
			this.ticksThisSecond++;
			updates++;
		}

		// Calculate interpolation alpha
		this.currentAlpha = config.interpolate ? this.accumulator / this.fixedDeltaTime : 0;

		// Call interpolation hook if enabled
		if (config.interpolate && this.hooks.onInterpolate) {
			this.hooks.onInterpolate(this.world, this.currentAlpha);
		}

		// Before render hook
		this.hooks.onBeforeRender?.(this.world, deltaTime);

		// Run render phases (LAYOUT, RENDER, POST_RENDER)
		this.world = this.scheduler.runRenderPhases(this.world, deltaTime);

		// After render hook
		this.hooks.onAfterRender?.(this.world, deltaTime);

		this.frameCount++;
	}

	/**
	 * Updates performance statistics.
	 */
	private updateStats(now: number, deltaTime: number): void {
		this.currentFrameTime = deltaTime * 1000;
		this.framesThisSecond++;

		// Update FPS and ticks per second every second
		if (now - this.lastFPSUpdate >= 1) {
			this.currentFPS = this.framesThisSecond;
			this.currentTicksPerSecond = this.ticksThisSecond;
			this.framesThisSecond = 0;
			this.ticksThisSecond = 0;
			this.lastFPSUpdate = now;
		}
	}
}

/**
 * Creates a new game loop instance.
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
	world: World,
	options: GameLoopOptions = {},
	hooks: GameLoopHooks = {},
): GameLoop {
	return new GameLoop(world, options, hooks);
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
