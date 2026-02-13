/**
 * System scheduler for ordered execution.
 * @module core/scheduler
 */

import { z } from 'zod';
import type { System, World } from './types';
import { LoopPhase } from './types';
import {
	createDefaultPackedQueryAdapter,
	DEFAULT_WORLD_ADAPTER,
	getWorldAdapter,
	isPackedQueryAdapter,
	setWorldAdapter,
	syncWorldAdapter,
} from './worldAdapter';

/**
 * Registered system entry.
 */
interface SystemEntry {
	system: System;
	priority: number;
}

/**
 * Per-phase timing data for a single frame.
 */
export interface PhaseTimingData {
	/** Phase identifier */
	readonly phase: LoopPhase;
	/** Time spent in this phase in milliseconds */
	duration: number;
	/** Number of systems executed in this phase */
	systemCount: number;
}

/**
 * Frame telemetry data collected during scheduler execution.
 */
export interface FrameTelemetry {
	/** Per-phase timing data */
	readonly phases: ReadonlyArray<PhaseTimingData>;
	/** Total frame time in milliseconds */
	totalFrameTime: number;
	/** Frame number (increments each run) */
	frameNumber: number;
	/** Time spent synchronizing world adapter data this frame */
	adapterSyncMs: number;
}

/**
 * Telemetry configuration options.
 */
export interface TelemetryConfig {
	/** Enable telemetry collection (default: false) */
	enabled: boolean;
	/** Maximum number of frames to keep in history (default: 0 = current frame only) */
	historySize?: number;
}

/**
 * Zod schema for TelemetryConfig validation.
 *
 * @example
 * ```typescript
 * import { TelemetryConfigSchema } from 'blecsd';
 *
 * const config = TelemetryConfigSchema.parse({
 *   enabled: true,
 *   historySize: 60,
 * });
 * ```
 */
export const TelemetryConfigSchema = z.object({
	enabled: z.boolean(),
	historySize: z.number().int().nonnegative().optional(),
});

/**
 * Frame budget configuration for adaptive performance.
 */
export interface AdaptiveFrameBudgetConfig {
	/** Enable frame budget enforcement (default: false) */
	enabled: boolean;
	/** Target frame time in milliseconds (default: 16.67ms for 60fps) */
	budgetMs?: number;
	/** Phases that can be skipped when over budget (default: [ANIMATION]) */
	skippablePhases?: ReadonlyArray<LoopPhase>;
}

/**
 * Zod schema for AdaptiveFrameBudgetConfig validation.
 *
 * @example
 * ```typescript
 * import { AdaptiveFrameBudgetConfigSchema, LoopPhase } from 'blecsd';
 *
 * const config = AdaptiveFrameBudgetConfigSchema.parse({
 *   enabled: true,
 *   budgetMs: 16.67,
 *   skippablePhases: [LoopPhase.ANIMATION],
 * });
 * ```
 */
export const AdaptiveFrameBudgetConfigSchema = z.object({
	enabled: z.boolean(),
	budgetMs: z.number().positive().optional(),
	skippablePhases: z.array(z.nativeEnum(LoopPhase)).readonly().optional(),
});

/**
 * Frame budget status for the current frame.
 */
export interface AdaptiveFrameBudgetStatus {
	/** Whether budget was exceeded this frame */
	exceeded: boolean;
	/** Phases that were skipped this frame */
	skippedPhases: ReadonlyArray<LoopPhase>;
	/** Time remaining in budget (negative if exceeded) */
	remainingMs: number;
}

/**
 * Current delta time for the frame.
 * Accessed via getDeltaTime() during system execution.
 */
let currentDeltaTime = 0;
const autoPackedAdapterEnabled = process.env.BLECSD_PACKED_ADAPTER === '1';
const worldsWithAutoPackedAdapter = new WeakSet<World>();

/**
 * Gets the current frame's delta time.
 * Call this from within a system to get the time elapsed since the last frame.
 *
 * @returns Delta time in seconds
 *
 * @example
 * ```typescript
 * import { getDeltaTime } from 'blecsd';
 *
 * const movementSystem: System = (world) => {
 *   const dt = getDeltaTime();
 *   // Use dt for frame-rate independent movement
 *   return world;
 * };
 * ```
 */
export function getDeltaTime(): number {
	return currentDeltaTime;
}

/**
 * Scheduler interface for managing and executing systems in order.
 *
 * Systems are organized into phases that run in a fixed order.
 * Within each phase, systems run by priority (lower = earlier).
 *
 * The INPUT phase is protected and cannot be modified by users
 * to ensure input is always processed first.
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 *
 * scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
 * scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export interface Scheduler {
	registerSystem(phase: LoopPhase, system: System, priority?: number): void;
	registerInputSystem(system: System, priority?: number): void;
	unregisterSystem(system: System): void;
	unregisterInputSystem(system: System): void;
	run(world: World, deltaTime: number): World;
	runInputOnly(world: World, deltaTime: number): World;
	runFixedUpdatePhases(world: World, fixedDeltaTime: number): World;
	runRenderPhases(world: World, deltaTime: number): World;
	getSystemsForPhase(phase: LoopPhase): System[];
	getSystemCount(phase: LoopPhase): number;
	getTotalSystemCount(): number;
	hasSystem(system: System): boolean;
	clearPhase(phase: LoopPhase): void;
	clearAllSystems(): void;
	enableTelemetry(config?: TelemetryConfig): void;
	disableTelemetry(): void;
	getTelemetry(): FrameTelemetry | null;
	getTelemetryHistory(): ReadonlyArray<FrameTelemetry>;
	isTelemetryEnabled(): boolean;
	enableFrameBudget(config?: AdaptiveFrameBudgetConfig): void;
	disableFrameBudget(): void;
	getAdaptiveFrameBudgetStatus(): AdaptiveFrameBudgetStatus | null;
	isFrameBudgetEnabled(): boolean;
}

function sortPhase(systems: SystemEntry[]): void {
	systems.sort((a, b) => a.priority - b.priority);
}

/**
 * Creates a new scheduler instance.
 *
 * @returns A new Scheduler instance
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 *
 * // Register systems
 * scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
 * scheduler.registerSystem(LoopPhase.ANIMATION, physicsSystem);
 * scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // Run in game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export function createScheduler(): Scheduler {
	const phases = new Map<LoopPhase, SystemEntry[]>();
	const inputSystems: SystemEntry[] = [];

	// Telemetry state
	let telemetryEnabled = false;
	let telemetryHistorySize = 0;
	const telemetryHistory: FrameTelemetry[] = [];
	let currentTelemetry: FrameTelemetry | null = null;
	let frameCounter = 0;

	// Frame budget state
	let frameBudgetEnabled = false;
	let frameBudgetMs = 16.67; // 60fps by default
	let skippablePhases: Set<LoopPhase> = new Set([LoopPhase.ANIMATION]);
	let currentBudgetStatus: AdaptiveFrameBudgetStatus | null = null;

	// Initialize all phases
	for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
		phases.set(phase, []);
	}

	function maybeEnableAutoPackedAdapter(world: World): void {
		if (!autoPackedAdapterEnabled) {
			return;
		}
		if (worldsWithAutoPackedAdapter.has(world)) {
			return;
		}
		if (getWorldAdapter(world) !== DEFAULT_WORLD_ADAPTER) {
			worldsWithAutoPackedAdapter.add(world);
			return;
		}

		setWorldAdapter(world, createDefaultPackedQueryAdapter());
		worldsWithAutoPackedAdapter.add(world);
	}

	/**
	 * Creates a new telemetry frame data structure.
	 * @internal
	 */
	function createTelemetryFrame(): FrameTelemetry {
		const phaseData: PhaseTimingData[] = [];
		for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
			phaseData.push({
				phase,
				duration: 0,
				systemCount: 0,
			});
		}
		return {
			phases: phaseData,
			totalFrameTime: 0,
			frameNumber: frameCounter++,
			adapterSyncMs: 0,
		};
	}

	/**
	 * Records telemetry for a phase.
	 * @internal
	 */
	function recordPhase(phase: LoopPhase, duration: number, systemCount: number): void {
		if (!telemetryEnabled || !currentTelemetry) {
			return;
		}
		const phaseData = currentTelemetry.phases[phase] as PhaseTimingData | undefined;
		if (phaseData) {
			phaseData.duration = duration;
			phaseData.systemCount = systemCount;
		}
	}

	/**
	 * Finalizes the current frame telemetry.
	 * @internal
	 */
	function finalizeTelemetry(): void {
		if (!telemetryEnabled || !currentTelemetry) {
			return;
		}

		// Calculate total frame time
		let total = 0;
		for (const phaseData of currentTelemetry.phases) {
			total += phaseData.duration;
		}
		currentTelemetry.totalFrameTime = total;

		// Add to history if enabled
		if (telemetryHistorySize > 0) {
			telemetryHistory.push(currentTelemetry);
			// Keep only the last N frames
			while (telemetryHistory.length > telemetryHistorySize) {
				telemetryHistory.shift();
			}
		}
	}

	return {
		/**
		 * Registers a system for a specific phase.
		 * Systems are sorted by priority within their phase (lower = earlier).
		 *
		 * Note: The INPUT phase is protected and cannot be modified by users.
		 * Use registerInputSystem() for internal input systems only.
		 *
		 * @param phase - The loop phase to register the system in
		 * @param system - The system function to register
		 * @param priority - Priority within the phase (default: 0, lower = earlier)
		 * @throws Error if attempting to register to the INPUT phase
		 */
		registerSystem(phase: LoopPhase, system: System, priority = 0): void {
			if (phase === LoopPhase.INPUT) {
				throw new Error(
					'Cannot register systems to INPUT phase. INPUT phase is protected and always runs first.',
				);
			}

			const systems = phases.get(phase);
			if (!systems) {
				return;
			}

			systems.push({ system, priority });
			sortPhase(systems);
		},

		/**
		 * Registers an internal input system.
		 * This is only for internal library use to process input.
		 *
		 * @param system - The input system function
		 * @param priority - Priority within input phase (default: 0)
		 * @internal
		 */
		registerInputSystem(system: System, priority = 0): void {
			inputSystems.push({ system, priority });
			sortPhase(inputSystems);
		},

		/**
		 * Unregisters a system from all phases.
		 *
		 * @param system - The system function to unregister
		 */
		unregisterSystem(system: System): void {
			for (const [phase, systems] of phases) {
				if (phase === LoopPhase.INPUT) {
					continue; // Skip protected INPUT phase
				}
				const index = systems.findIndex((entry) => entry.system === system);
				if (index !== -1) {
					systems.splice(index, 1);
				}
			}
		},

		/**
		 * Unregisters an internal input system.
		 *
		 * @param system - The input system to unregister
		 * @internal
		 */
		unregisterInputSystem(system: System): void {
			const index = inputSystems.findIndex((entry) => entry.system === system);
			if (index !== -1) {
				inputSystems.splice(index, 1);
			}
		},

		/**
		 * Runs all systems in phase order.
		 * INPUT phase always runs first, followed by other phases in order.
		 *
		 * @param world - The ECS world to process
		 * @param deltaTime - Time elapsed since last frame in seconds
		 * @returns The world after all systems have processed it
		 */
		run(world: World, deltaTime: number): World {
			currentDeltaTime = deltaTime;

			// Initialize telemetry for this frame
			if (telemetryEnabled) {
				currentTelemetry = createTelemetryFrame();
			}

			// Initialize frame budget status
			const frameStartTime = frameBudgetEnabled || telemetryEnabled ? performance.now() : 0;
			const skippedPhases: LoopPhase[] = [];
			let budgetExceeded = false;

			let currentWorld = world;
			maybeEnableAutoPackedAdapter(currentWorld);
			const adapter = getWorldAdapter(currentWorld);
			const packedAdapter = isPackedQueryAdapter(adapter) ? adapter : null;
			const shouldSyncInput = packedAdapter?.syncMode !== 'render_only';
			const syncAdapter = (): void => {
				if (!packedAdapter) {
					return;
				}
				if (!telemetryEnabled || !currentTelemetry) {
					syncWorldAdapter(currentWorld);
					return;
				}
				const syncStart = performance.now();
				syncWorldAdapter(currentWorld);
				currentTelemetry.adapterSyncMs += performance.now() - syncStart;
			};
			const shouldSyncPhase = (phase: LoopPhase): boolean => {
				if (!packedAdapter) {
					return false;
				}
				if (packedAdapter.syncMode === 'all') {
					return true;
				}
				return phase === LoopPhase.RENDER;
			};

			// Always run INPUT systems first (internal)
			// Note: Input systems run before the INPUT phase, so we include them in INPUT phase timing
			const inputStart = telemetryEnabled || frameBudgetEnabled ? performance.now() : 0;
			if (shouldSyncInput) {
				syncAdapter();
			}
			for (const entry of inputSystems) {
				currentWorld = entry.system(currentWorld);
			}

			// Run all phases in order
			for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
				const systems = phases.get(phase);
				if (!systems) {
					// Record empty phase
					if (phase === LoopPhase.INPUT && telemetryEnabled) {
						const inputEnd = performance.now();
						recordPhase(phase, inputEnd - inputStart, inputSystems.length);
					} else if (telemetryEnabled) {
						recordPhase(phase, 0, 0);
					}
					continue;
				}

				// Check frame budget before executing phase
				if (frameBudgetEnabled && budgetExceeded && skippablePhases.has(phase)) {
					// Skip this phase due to budget exceeded
					skippedPhases.push(phase);
					if (telemetryEnabled) {
						recordPhase(phase, 0, 0);
					}
					continue;
				}

				// Measure phase timing
				const phaseStart =
					phase === LoopPhase.INPUT
						? inputStart
						: telemetryEnabled || frameBudgetEnabled
							? performance.now()
							: 0;

				if (shouldSyncPhase(phase)) {
					syncAdapter();
				}
				for (const entry of systems) {
					currentWorld = entry.system(currentWorld);
				}

				const phaseEnd = telemetryEnabled || frameBudgetEnabled ? performance.now() : 0;

				if (telemetryEnabled) {
					const systemCount =
						phase === LoopPhase.INPUT ? inputSystems.length + systems.length : systems.length;
					recordPhase(phase, phaseEnd - phaseStart, systemCount);
				}

				// Check if we've exceeded frame budget after this phase
				if (frameBudgetEnabled && !budgetExceeded) {
					const elapsed = phaseEnd - frameStartTime;
					if (elapsed > frameBudgetMs) {
						budgetExceeded = true;
					}
				}
			}

			// Finalize telemetry
			if (telemetryEnabled) {
				finalizeTelemetry();
			}

			// Finalize frame budget status
			if (frameBudgetEnabled) {
				const frameEndTime = performance.now();
				const totalTime = frameEndTime - frameStartTime;
				currentBudgetStatus = {
					exceeded: budgetExceeded,
					skippedPhases,
					remainingMs: frameBudgetMs - totalTime,
				};
			}

			return currentWorld;
		},

		/**
		 * Runs only input systems.
		 * Used in fixed timestep mode to process input every frame.
		 *
		 * @param world - The ECS world to process
		 * @param deltaTime - Time elapsed since last frame
		 * @returns The world after input processing
		 * @internal
		 */
		runInputOnly(world: World, deltaTime: number): World {
			currentDeltaTime = deltaTime;
			let currentWorld = world;
			maybeEnableAutoPackedAdapter(currentWorld);
			const adapter = getWorldAdapter(currentWorld);
			const packedAdapter = isPackedQueryAdapter(adapter) ? adapter : null;
			const shouldSync = packedAdapter?.syncMode !== 'render_only';

			// Run internal input systems
			if (shouldSync) {
				syncWorldAdapter(currentWorld);
			}
			for (const entry of inputSystems) {
				currentWorld = entry.system(currentWorld);
			}

			// Run INPUT phase systems
			const inputPhaseSystems = phases.get(LoopPhase.INPUT);
			if (inputPhaseSystems) {
				if (shouldSync) {
					syncWorldAdapter(currentWorld);
				}
				for (const entry of inputPhaseSystems) {
					currentWorld = entry.system(currentWorld);
				}
			}

			return currentWorld;
		},

		/**
		 * Runs fixed update phases: EARLY_UPDATE, UPDATE, LATE_UPDATE, PHYSICS.
		 * Used in fixed timestep mode for deterministic updates.
		 *
		 * @param world - The ECS world to process
		 * @param fixedDeltaTime - Fixed delta time (always the same)
		 * @returns The world after fixed updates
		 * @internal
		 */
		runFixedUpdatePhases(world: World, fixedDeltaTime: number): World {
			currentDeltaTime = fixedDeltaTime;
			let currentWorld = world;
			maybeEnableAutoPackedAdapter(currentWorld);
			const adapter = getWorldAdapter(currentWorld);
			const packedAdapter = isPackedQueryAdapter(adapter) ? adapter : null;
			const shouldSync = !!packedAdapter && packedAdapter.syncMode === 'all';

			// Run fixed update phases in order
			const fixedPhases = [
				LoopPhase.EARLY_UPDATE,
				LoopPhase.UPDATE,
				LoopPhase.LATE_UPDATE,
				LoopPhase.ANIMATION,
			];

			for (const phase of fixedPhases) {
				const systems = phases.get(phase);
				if (!systems) {
					continue;
				}

				if (shouldSync) {
					syncWorldAdapter(currentWorld);
				}
				for (const entry of systems) {
					currentWorld = entry.system(currentWorld);
				}
			}

			return currentWorld;
		},

		/**
		 * Runs render phases: LAYOUT, RENDER, POST_RENDER.
		 * Used in fixed timestep mode for rendering (can run at variable rate).
		 *
		 * @param world - The ECS world to process
		 * @param deltaTime - Real delta time (variable)
		 * @returns The world after rendering
		 * @internal
		 */
		runRenderPhases(world: World, deltaTime: number): World {
			currentDeltaTime = deltaTime;
			let currentWorld = world;
			maybeEnableAutoPackedAdapter(currentWorld);
			const adapter = getWorldAdapter(currentWorld);
			const packedAdapter = isPackedQueryAdapter(adapter) ? adapter : null;
			const shouldSyncPhase = (phase: LoopPhase): boolean => {
				if (!packedAdapter) {
					return false;
				}
				if (packedAdapter.syncMode === 'all') {
					return true;
				}
				return phase === LoopPhase.RENDER;
			};

			// Run render phases in order
			const renderPhases = [LoopPhase.LAYOUT, LoopPhase.RENDER, LoopPhase.POST_RENDER];

			for (const phase of renderPhases) {
				const systems = phases.get(phase);
				if (!systems) {
					continue;
				}

				if (shouldSyncPhase(phase)) {
					syncWorldAdapter(currentWorld);
				}
				for (const entry of systems) {
					currentWorld = entry.system(currentWorld);
				}
			}

			return currentWorld;
		},

		/**
		 * Gets all systems registered for a specific phase.
		 * Returns a copy of the systems array.
		 *
		 * @param phase - The loop phase to get systems for
		 * @returns Array of systems in priority order
		 */
		getSystemsForPhase(phase: LoopPhase): System[] {
			if (phase === LoopPhase.INPUT) {
				return inputSystems.map((entry) => entry.system);
			}

			const systems = phases.get(phase);
			if (!systems) {
				return [];
			}

			return systems.map((entry) => entry.system);
		},

		/**
		 * Gets the count of systems in a specific phase.
		 *
		 * @param phase - The loop phase to count systems for
		 * @returns Number of systems in the phase
		 */
		getSystemCount(phase: LoopPhase): number {
			if (phase === LoopPhase.INPUT) {
				return inputSystems.length;
			}

			const systems = phases.get(phase);
			return systems ? systems.length : 0;
		},

		/**
		 * Gets the total number of systems across all phases.
		 *
		 * @returns Total system count
		 */
		getTotalSystemCount(): number {
			let total = inputSystems.length;
			for (const systems of phases.values()) {
				total += systems.length;
			}
			return total;
		},

		/**
		 * Checks if a system is registered in any phase.
		 *
		 * @param system - The system to check
		 * @returns true if the system is registered
		 */
		hasSystem(system: System): boolean {
			// Check input systems
			if (inputSystems.some((entry) => entry.system === system)) {
				return true;
			}

			// Check all phases
			for (const systems of phases.values()) {
				if (systems.some((entry) => entry.system === system)) {
					return true;
				}
			}

			return false;
		},

		/**
		 * Clears all systems from a specific phase.
		 * Cannot clear the INPUT phase.
		 *
		 * @param phase - The phase to clear
		 * @throws Error if attempting to clear the INPUT phase
		 */
		clearPhase(phase: LoopPhase): void {
			if (phase === LoopPhase.INPUT) {
				throw new Error('Cannot clear INPUT phase. INPUT phase is protected.');
			}

			const systems = phases.get(phase);
			if (systems) {
				systems.length = 0;
			}
		},

		/**
		 * Clears all systems from all phases except INPUT.
		 */
		clearAllSystems(): void {
			for (const [phase, systems] of phases) {
				if (phase !== LoopPhase.INPUT) {
					systems.length = 0;
				}
			}
		},

		/**
		 * Enables telemetry collection for per-phase frame timing.
		 * When enabled, the scheduler will track how long each phase takes to execute.
		 *
		 * @param config - Telemetry configuration options
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 *
		 * // Enable telemetry with history
		 * scheduler.enableTelemetry({ enabled: true, historySize: 60 });
		 *
		 * // Run frames
		 * scheduler.run(world, deltaTime);
		 *
		 * // Check telemetry
		 * const telemetry = scheduler.getTelemetry();
		 * if (telemetry) {
		 *   console.log(`Frame ${telemetry.frameNumber}: ${telemetry.totalFrameTime}ms`);
		 *   for (const phase of telemetry.phases) {
		 *     console.log(`  Phase ${phase.phase}: ${phase.duration}ms (${phase.systemCount} systems)`);
		 *   }
		 * }
		 * ```
		 */
		enableTelemetry(config: TelemetryConfig = { enabled: true }): void {
			telemetryEnabled = config.enabled;
			telemetryHistorySize = config.historySize ?? 0;
			if (!telemetryEnabled) {
				telemetryHistory.length = 0;
				currentTelemetry = null;
			}
		},

		/**
		 * Disables telemetry collection and clears history.
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * scheduler.enableTelemetry();
		 *
		 * // ... run frames ...
		 *
		 * scheduler.disableTelemetry();
		 * ```
		 */
		disableTelemetry(): void {
			telemetryEnabled = false;
			telemetryHistory.length = 0;
			currentTelemetry = null;
		},

		/**
		 * Gets the telemetry data for the most recent frame.
		 * Returns null if telemetry is disabled or no frames have been run yet.
		 *
		 * @returns The most recent frame telemetry or null
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * scheduler.enableTelemetry();
		 *
		 * scheduler.run(world, deltaTime);
		 *
		 * const telemetry = scheduler.getTelemetry();
		 * if (telemetry) {
		 *   console.log(`Total frame time: ${telemetry.totalFrameTime}ms`);
		 * }
		 * ```
		 */
		getTelemetry(): FrameTelemetry | null {
			return currentTelemetry;
		},

		/**
		 * Gets the telemetry history for recent frames.
		 * Returns an empty array if history is disabled or no frames have been recorded.
		 *
		 * @returns Array of frame telemetry data (most recent last)
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * scheduler.enableTelemetry({ enabled: true, historySize: 60 });
		 *
		 * // ... run multiple frames ...
		 *
		 * const history = scheduler.getTelemetryHistory();
		 * const avgFrameTime = history.reduce((sum, t) => sum + t.totalFrameTime, 0) / history.length;
		 * console.log(`Average frame time over ${history.length} frames: ${avgFrameTime}ms`);
		 * ```
		 */
		getTelemetryHistory(): ReadonlyArray<FrameTelemetry> {
			return telemetryHistory;
		},

		/**
		 * Checks if telemetry is currently enabled.
		 *
		 * @returns true if telemetry is enabled
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * console.log(scheduler.isTelemetryEnabled()); // false
		 *
		 * scheduler.enableTelemetry();
		 * console.log(scheduler.isTelemetryEnabled()); // true
		 * ```
		 */
		isTelemetryEnabled(): boolean {
			return telemetryEnabled;
		},

		/**
		 * Enables adaptive frame budget enforcement.
		 * When enabled, skippable phases will be skipped if the frame is taking too long.
		 *
		 * @param config - Frame budget configuration
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler, LoopPhase } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 *
		 * // Enable frame budget with 16ms target (60fps)
		 * scheduler.enableFrameBudget({
		 *   enabled: true,
		 *   budgetMs: 16.67,
		 *   skippablePhases: [LoopPhase.ANIMATION]
		 * });
		 *
		 * // Run frames
		 * scheduler.run(world, deltaTime);
		 *
		 * // Check if phases were skipped
		 * const status = scheduler.getAdaptiveFrameBudgetStatus();
		 * if (status?.exceeded) {
		 *   console.log(`Frame budget exceeded. Skipped phases: ${status.skippedPhases}`);
		 * }
		 * ```
		 */
		enableFrameBudget(config: AdaptiveFrameBudgetConfig = { enabled: true }): void {
			frameBudgetEnabled = config.enabled;
			frameBudgetMs = config.budgetMs ?? 16.67;

			if (config.skippablePhases) {
				skippablePhases = new Set(config.skippablePhases);
			} else {
				skippablePhases = new Set([LoopPhase.ANIMATION]);
			}

			// INPUT phase is NEVER skippable
			skippablePhases.delete(LoopPhase.INPUT);

			if (!frameBudgetEnabled) {
				currentBudgetStatus = null;
			}
		},

		/**
		 * Disables frame budget enforcement.
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * scheduler.enableFrameBudget();
		 *
		 * // ... run frames ...
		 *
		 * scheduler.disableFrameBudget();
		 * ```
		 */
		disableFrameBudget(): void {
			frameBudgetEnabled = false;
			currentBudgetStatus = null;
		},

		/**
		 * Gets the frame budget status for the most recent frame.
		 * Returns null if frame budget is disabled or no frames have been run yet.
		 *
		 * @returns The frame budget status or null
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * scheduler.enableFrameBudget({ enabled: true, budgetMs: 16.67 });
		 *
		 * scheduler.run(world, deltaTime);
		 *
		 * const status = scheduler.getAdaptiveFrameBudgetStatus();
		 * if (status) {
		 *   console.log(`Budget exceeded: ${status.exceeded}`);
		 *   console.log(`Skipped phases: ${status.skippedPhases.length}`);
		 *   console.log(`Remaining budget: ${status.remainingMs.toFixed(2)}ms`);
		 * }
		 * ```
		 */
		getAdaptiveFrameBudgetStatus(): AdaptiveFrameBudgetStatus | null {
			return currentBudgetStatus;
		},

		/**
		 * Checks if frame budget enforcement is currently enabled.
		 *
		 * @returns true if frame budget is enabled
		 *
		 * @example
		 * ```typescript
		 * import { createScheduler } from 'blecsd';
		 *
		 * const scheduler = createScheduler();
		 * console.log(scheduler.isFrameBudgetEnabled()); // false
		 *
		 * scheduler.enableFrameBudget();
		 * console.log(scheduler.isFrameBudgetEnabled()); // true
		 * ```
		 */
		isFrameBudgetEnabled(): boolean {
			return frameBudgetEnabled;
		},
	};
}
