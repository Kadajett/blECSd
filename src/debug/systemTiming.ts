/**
 * System timing and performance tracking utilities.
 *
 * @module debug/systemTiming
 */

import type { World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Performance statistics.
 */
export interface PerformanceStats {
	/** Current frames per second */
	readonly fps: number;
	/** Current frame time in milliseconds */
	readonly frameTime: number;
	/** Total frames rendered */
	readonly frameCount: number;
	/** Total running time in seconds */
	readonly runningTime: number;
	/** Entity count */
	readonly entityCount: number;
	/** Memory usage in MB (if available) */
	readonly memoryUsageMB: number | null;
	/** System timing in milliseconds per system */
	readonly systemTimings: Record<string, number>;
}

/**
 * System timing entry.
 */
interface SystemTimingEntry {
	name: string;
	totalTime: number;
	callCount: number;
}

// =============================================================================
// STATE
// =============================================================================

/** Whether system timing is enabled */
let timingEnabled = false;

/** System timing data */
const systemTimings = new Map<string, SystemTimingEntry>();

/** Performance stats cache */
let cachedStats: PerformanceStats | null = null;
let lastStatsTime = 0;
const STATS_CACHE_MS = 100; // Update stats at most every 100ms

// =============================================================================
// SYSTEM TIMING
// =============================================================================

/**
 * Enables or disables system timing tracking.
 *
 * When enabled, system execution times are tracked and can be retrieved
 * via getPerformanceStats().
 *
 * @param enabled - Whether to enable timing
 *
 * @example
 * ```typescript
 * import { enableSystemTiming, getPerformanceStats } from 'blecsd/debug';
 *
 * // Enable timing
 * enableSystemTiming(true);
 *
 * // Run game loop...
 *
 * // Get stats
 * const stats = getPerformanceStats(world, loop);
 * console.log(stats.systemTimings);
 * ```
 */
export function enableSystemTiming(enabled: boolean): void {
	timingEnabled = enabled;
	if (!enabled) {
		systemTimings.clear();
	}
}

/**
 * Checks if system timing is enabled.
 */
export function isSystemTimingEnabled(): boolean {
	return timingEnabled;
}

/**
 * Records system execution time.
 * Called internally by timed system wrappers.
 *
 * @param systemName - Name of the system
 * @param timeMs - Execution time in milliseconds
 * @internal
 */
export function recordSystemTime(systemName: string, timeMs: number): void {
	if (!timingEnabled) return;

	const entry = systemTimings.get(systemName);
	if (entry) {
		entry.totalTime += timeMs;
		entry.callCount++;
	} else {
		systemTimings.set(systemName, {
			name: systemName,
			totalTime: timeMs,
			callCount: 1,
		});
	}
}

/**
 * Wraps a system function with timing instrumentation.
 *
 * @param name - Name for the system (used in timing reports)
 * @param system - The system function to wrap
 * @returns Wrapped system that records execution time
 *
 * @example
 * ```typescript
 * import { timedSystem } from 'blecsd/debug';
 *
 * const movementSystem = timedSystem('movement', (world) => {
 *   // movement logic
 *   return world;
 * });
 *
 * // Register the timed system
 * loop.registerSystem(LoopPhase.UPDATE, movementSystem);
 * ```
 */
export function timedSystem<T extends (world: World) => World>(name: string, system: T): T {
	const wrapped = ((world: World) => {
		if (!timingEnabled) {
			return system(world);
		}

		const start = performance.now();
		const result = system(world);
		const elapsed = performance.now() - start;

		recordSystemTime(name, elapsed);
		return result;
	}) as T;

	return wrapped;
}

/**
 * Gets the current system timing data.
 * Returns average time per call for each system.
 *
 * @returns Map of system name to average time in milliseconds
 */
export function getSystemTimings(): Record<string, number> {
	const result: Record<string, number> = {};

	for (const [name, entry] of systemTimings) {
		result[name] = entry.callCount > 0 ? entry.totalTime / entry.callCount : 0;
	}

	return result;
}

/**
 * Resets all system timing data.
 */
export function resetSystemTimings(): void {
	systemTimings.clear();
}

/**
 * Resets the performance stats cache.
 * Useful for testing.
 * @internal
 */
export function resetPerformanceStatsCache(): void {
	cachedStats = null;
	lastStatsTime = 0;
}

// =============================================================================
// PERFORMANCE STATS
// =============================================================================

/**
 * Gets current performance statistics.
 *
 * @param _world - The ECS world (unused, kept for API compatibility)
 * @param entityCount - Entity count from the world
 * @param loop - Optional game loop for frame stats
 * @returns Performance statistics
 *
 * @example
 * ```typescript
 * import { getPerformanceStats } from 'blecsd/debug';
 *
 * const stats = getPerformanceStats(world, entityCount, loop);
 * console.log(`FPS: ${stats.fps}`);
 * console.log(`Entities: ${stats.entityCount}`);
 * console.log(`Memory: ${stats.memoryUsageMB?.toFixed(1)}MB`);
 * ```
 */
export function getPerformanceStats(
	_world: World,
	entityCount: number,
	loop?: {
		getStats(): { fps: number; frameTime: number; frameCount: number; runningTime: number };
	},
): PerformanceStats {
	const now = performance.now();

	// Use cached stats if recent enough
	if (cachedStats && now - lastStatsTime < STATS_CACHE_MS) {
		return cachedStats;
	}

	// Get loop stats
	const loopStats = loop?.getStats() ?? {
		fps: 0,
		frameTime: 0,
		frameCount: 0,
		runningTime: 0,
	};

	// Get memory usage (Node.js only)
	let memoryUsageMB: number | null = null;
	if (typeof process !== 'undefined' && process.memoryUsage) {
		const usage = process.memoryUsage();
		memoryUsageMB = usage.heapUsed / (1024 * 1024);
	}

	// Get system timings
	const timings = getSystemTimings();

	cachedStats = {
		fps: loopStats.fps,
		frameTime: loopStats.frameTime,
		frameCount: loopStats.frameCount,
		runningTime: loopStats.runningTime,
		entityCount,
		memoryUsageMB,
		systemTimings: timings,
	};
	lastStatsTime = now;

	return cachedStats;
}
