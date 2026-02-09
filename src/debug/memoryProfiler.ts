/**
 * Memory Profiling and Leak Detection
 *
 * Tracks entity and component allocations to catch memory issues during
 * development. Provides allocation counting, periodic snapshots, and
 * leak detection for common patterns.
 *
 * @module debug/memoryProfiler
 */

import { z } from 'zod';
import { getAllEntities, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Memory snapshot at a point in time.
 */
export interface MemorySnapshot {
	/** Timestamp of the snapshot */
	readonly timestamp: number;
	/** Total entity count */
	readonly entityCount: number;
	/** Component counts by name */
	readonly componentCounts: Record<string, number>;
	/** Node.js heap used in bytes */
	readonly heapUsed: number;
	/** Node.js heap total in bytes */
	readonly heapTotal: number;
	/** Node.js RSS in bytes */
	readonly rss: number;
	/** External memory in bytes */
	readonly external: number;
}

/**
 * Memory diff between two snapshots.
 */
export interface MemoryDiff {
	/** Time elapsed between snapshots in ms */
	readonly elapsed: number;
	/** Entity count change */
	readonly entityCountDelta: number;
	/** Component count changes by name */
	readonly componentDeltas: Record<string, number>;
	/** Heap used change in bytes */
	readonly heapUsedDelta: number;
	/** RSS change in bytes */
	readonly rssDelta: number;
	/** Possible leaks detected */
	readonly possibleLeaks: readonly LeakWarning[];
}

/**
 * Warning about a potential memory leak.
 */
export interface LeakWarning {
	/** Type of leak */
	readonly type: 'entity' | 'component' | 'heap';
	/** Description of the warning */
	readonly message: string;
	/** Growth rate (units per second) */
	readonly growthRate: number;
}

/**
 * Allocation tracker state.
 */
export interface AllocationTracker {
	/** Total entities allocated since tracking started */
	readonly totalAllocated: number;
	/** Total entities deallocated since tracking started */
	readonly totalDeallocated: number;
	/** Current entity count */
	readonly currentCount: number;
	/** Per-component allocation counts */
	readonly componentAllocations: Record<string, number>;
}

/**
 * Memory profiler configuration.
 */
export interface MemoryProfilerConfig {
	/** Interval between automatic snapshots in ms (0 = disabled) */
	readonly snapshotInterval: number;
	/** Maximum number of snapshots to keep */
	readonly maxSnapshots: number;
	/** Growth rate threshold for leak detection (entities per second) */
	readonly entityLeakThreshold: number;
	/** Heap growth threshold for leak detection (bytes per second) */
	readonly heapLeakThreshold: number;
	/** Components to track (all if empty) */
	readonly trackedComponents: readonly { component: unknown; name: string }[];
}

/**
 * Zod schema for MemoryProfilerConfig validation.
 *
 * @example
 * ```typescript
 * import { MemoryProfilerConfigSchema } from 'blecsd';
 *
 * const config = MemoryProfilerConfigSchema.parse({
 *   snapshotInterval: 1000,
 *   maxSnapshots: 10,
 *   entityLeakThreshold: 100,
 *   heapLeakThreshold: 1024 * 1024,
 *   trackedComponents: [],
 * });
 * ```
 */
export const MemoryProfilerConfigSchema = z.object({
	snapshotInterval: z.number().nonnegative(),
	maxSnapshots: z.number().int().positive(),
	entityLeakThreshold: z.number().nonnegative(),
	heapLeakThreshold: z.number().nonnegative(),
	trackedComponents: z.array(z.object({ component: z.unknown(), name: z.string() })).readonly(),
});

/**
 * Memory profiler state.
 */
export interface MemoryProfiler {
	/** Take a snapshot */
	snapshot(world: World): MemorySnapshot;
	/** Compare two snapshots */
	diff(older: MemorySnapshot, newer: MemorySnapshot): MemoryDiff;
	/** Get all snapshots */
	getSnapshots(): readonly MemorySnapshot[];
	/** Get the latest snapshot */
	getLatestSnapshot(): MemorySnapshot | null;
	/** Get a memory report string */
	getReport(world: World): string;
	/** Start automatic snapshotting */
	startAutoSnapshot(world: World): void;
	/** Stop automatic snapshotting */
	stopAutoSnapshot(): void;
	/** Reset all data */
	reset(): void;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: MemoryProfilerConfig = {
	snapshotInterval: 5000,
	maxSnapshots: 100,
	entityLeakThreshold: 10,
	heapLeakThreshold: 1024 * 1024,
	trackedComponents: [],
};

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Creates a memory profiler for tracking allocations and detecting leaks.
 *
 * @param config - Optional configuration
 * @returns Memory profiler instance
 *
 * @example
 * ```typescript
 * import { createMemoryProfiler } from 'blecsd';
 *
 * const profiler = createMemoryProfiler({
 *   snapshotInterval: 5000,
 *   trackedComponents: [
 *     { component: Position, name: 'Position' },
 *     { component: Renderable, name: 'Renderable' },
 *   ],
 * });
 *
 * // Take manual snapshots
 * const snap1 = profiler.snapshot(world);
 * // ... do work ...
 * const snap2 = profiler.snapshot(world);
 *
 * // Check for leaks
 * const diff = profiler.diff(snap1, snap2);
 * if (diff.possibleLeaks.length > 0) {
 *   console.warn('Possible leaks:', diff.possibleLeaks);
 * }
 *
 * // Get a formatted report
 * console.log(profiler.getReport(world));
 * ```
 */
export function createMemoryProfiler(config?: Partial<MemoryProfilerConfig>): MemoryProfiler {
	const cfg: MemoryProfilerConfig = { ...DEFAULT_CONFIG, ...config };

	const snapshots: MemorySnapshot[] = [];
	let autoTimer: ReturnType<typeof setInterval> | null = null;

	function takeSnapshot(world: World): MemorySnapshot {
		const entities = getAllEntities(world) as Entity[];
		const componentCounts: Record<string, number> = {};

		for (const { component, name } of cfg.trackedComponents) {
			let count = 0;
			for (const eid of entities) {
				if (hasComponent(world, eid, component)) {
					count++;
				}
			}
			componentCounts[name] = count;
		}

		const memUsage = process.memoryUsage();

		const snap: MemorySnapshot = {
			timestamp: Date.now(),
			entityCount: entities.length,
			componentCounts,
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			rss: memUsage.rss,
			external: memUsage.external,
		};

		snapshots.push(snap);
		while (snapshots.length > cfg.maxSnapshots) {
			snapshots.shift();
		}

		return snap;
	}

	function computeComponentDeltas(
		older: MemorySnapshot,
		newer: MemorySnapshot,
	): Record<string, number> {
		const componentDeltas: Record<string, number> = {};
		const allKeys = new Set([
			...Object.keys(older.componentCounts),
			...Object.keys(newer.componentCounts),
		]);
		for (const key of allKeys) {
			componentDeltas[key] = (newer.componentCounts[key] ?? 0) - (older.componentCounts[key] ?? 0);
		}
		return componentDeltas;
	}

	function detectEntityLeaks(
		entityCountDelta: number,
		elapsedSec: number,
		older: MemorySnapshot,
		newer: MemorySnapshot,
	): LeakWarning | null {
		const entityGrowthRate = entityCountDelta / elapsedSec;
		if (entityGrowthRate <= cfg.entityLeakThreshold) return null;

		return {
			type: 'entity',
			message: `Entity count growing at ${entityGrowthRate.toFixed(1)}/sec (${older.entityCount} -> ${newer.entityCount})`,
			growthRate: entityGrowthRate,
		};
	}

	function detectHeapLeaks(heapUsedDelta: number, elapsedSec: number): LeakWarning | null {
		const heapGrowthRate = heapUsedDelta / elapsedSec;
		if (heapGrowthRate <= cfg.heapLeakThreshold) return null;

		return {
			type: 'heap',
			message: `Heap growing at ${(heapGrowthRate / 1024).toFixed(1)}KB/sec`,
			growthRate: heapGrowthRate,
		};
	}

	function detectComponentLeaks(
		componentDeltas: Record<string, number>,
		elapsedSec: number,
	): LeakWarning[] {
		const leaks: LeakWarning[] = [];
		for (const [name, delta] of Object.entries(componentDeltas)) {
			const componentGrowthRate = delta / elapsedSec;
			if (componentGrowthRate > cfg.entityLeakThreshold) {
				leaks.push({
					type: 'component',
					message: `${name} component growing at ${componentGrowthRate.toFixed(1)}/sec`,
					growthRate: componentGrowthRate,
				});
			}
		}
		return leaks;
	}

	function computeDiff(older: MemorySnapshot, newer: MemorySnapshot): MemoryDiff {
		const elapsed = newer.timestamp - older.timestamp;
		const elapsedSec = elapsed / 1000;

		const entityCountDelta = newer.entityCount - older.entityCount;
		const heapUsedDelta = newer.heapUsed - older.heapUsed;
		const rssDelta = newer.rss - older.rss;

		const componentDeltas = computeComponentDeltas(older, newer);

		// Leak detection
		const possibleLeaks: LeakWarning[] = [];

		if (elapsedSec > 0) {
			const entityLeak = detectEntityLeaks(entityCountDelta, elapsedSec, older, newer);
			if (entityLeak) possibleLeaks.push(entityLeak);

			const heapLeak = detectHeapLeaks(heapUsedDelta, elapsedSec);
			if (heapLeak) possibleLeaks.push(heapLeak);

			const componentLeaks = detectComponentLeaks(componentDeltas, elapsedSec);
			possibleLeaks.push(...componentLeaks);
		}

		return {
			elapsed,
			entityCountDelta,
			componentDeltas,
			heapUsedDelta,
			rssDelta,
			possibleLeaks,
		};
	}

	function formatBytes(bytes: number): string {
		if (Math.abs(bytes) < 1024) return `${bytes}B`;
		if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	}

	function addBasicMetrics(lines: string[], current: MemorySnapshot): void {
		lines.push('Memory Profile Report');
		lines.push('═'.repeat(40));
		lines.push(`Entities: ${current.entityCount}`);
		lines.push(`Heap Used: ${formatBytes(current.heapUsed)}`);
		lines.push(`Heap Total: ${formatBytes(current.heapTotal)}`);
		lines.push(`RSS: ${formatBytes(current.rss)}`);
		lines.push(`External: ${formatBytes(current.external)}`);
	}

	function addComponentCounts(lines: string[], current: MemorySnapshot): void {
		if (Object.keys(current.componentCounts).length === 0) return;

		lines.push('');
		lines.push('Component Counts:');
		for (const [name, count] of Object.entries(current.componentCounts)) {
			lines.push(`  ${name}: ${count}`);
		}
	}

	function addTrendsAndLeaks(lines: string[], current: MemorySnapshot): void {
		if (snapshots.length < 2) return;

		const oldest = snapshots[0];
		if (!oldest) return;

		const diff = computeDiff(oldest, current);
		lines.push('');
		lines.push(`Trends (over ${(diff.elapsed / 1000).toFixed(0)}s):`);
		lines.push(`  Entity delta: ${diff.entityCountDelta > 0 ? '+' : ''}${diff.entityCountDelta}`);
		lines.push(
			`  Heap delta: ${diff.heapUsedDelta > 0 ? '+' : ''}${formatBytes(diff.heapUsedDelta)}`,
		);

		if (diff.possibleLeaks.length > 0) {
			lines.push('');
			lines.push('WARNINGS:');
			for (const leak of diff.possibleLeaks) {
				lines.push(`  [${leak.type}] ${leak.message}`);
			}
		}
	}

	return {
		snapshot(world: World): MemorySnapshot {
			return takeSnapshot(world);
		},

		diff(older: MemorySnapshot, newer: MemorySnapshot): MemoryDiff {
			return computeDiff(older, newer);
		},

		getSnapshots(): readonly MemorySnapshot[] {
			return snapshots;
		},

		getLatestSnapshot(): MemorySnapshot | null {
			return snapshots.length > 0 ? (snapshots[snapshots.length - 1] ?? null) : null;
		},

		getReport(world: World): string {
			const current = takeSnapshot(world);
			const lines: string[] = [];

			addBasicMetrics(lines, current);
			addComponentCounts(lines, current);
			addTrendsAndLeaks(lines, current);

			return lines.join('\n');
		},

		startAutoSnapshot(world: World): void {
			if (autoTimer !== null) return;
			if (cfg.snapshotInterval <= 0) return;

			takeSnapshot(world);
			autoTimer = setInterval(() => {
				takeSnapshot(world);
			}, cfg.snapshotInterval);
		},

		stopAutoSnapshot(): void {
			if (autoTimer !== null) {
				clearInterval(autoTimer);
				autoTimer = null;
			}
		},

		reset(): void {
			snapshots.length = 0;
			if (autoTimer !== null) {
				clearInterval(autoTimer);
				autoTimer = null;
			}
		},
	};
}
