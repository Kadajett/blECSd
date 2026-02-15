/**
 * Debug utilities for development and debugging.
 *
 * These utilities help with:
 * - Inspecting entity state
 * - Viewing world statistics
 * - Performance monitoring
 * - Visual debugging
 *
 * @module debug
 */

import { Dimensions } from '../components/dimensions';
import { Position } from '../components/position';
import { getAllEntities, hasComponent } from '../core/ecs';
import { getEntityData, hasEntityData } from '../core/entityData';
import type { Entity, World } from '../core/types';

// Import core inspection functions from internal module
import {
	formatEntityInspection as _formatEntityInspection,
	formatWorldInspection as _formatWorldInspection,
	inspectEntity as _inspectEntity,
	inspectWorld as _inspectWorld,
	KNOWN_COMPONENTS as _KNOWN_COMPONENTS,
	type ComponentInfo,
	collectEntityFlags,
	type EntityInspection,
	type WorldInspection,
} from './inspect';

// =============================================================================
// RE-EXPORTED TYPES AND FUNCTIONS
// =============================================================================

export type { ComponentInfo, EntityInspection, WorldInspection };
export {
	_formatEntityInspection as formatEntityInspection,
	_formatWorldInspection as formatWorldInspection,
	_inspectEntity as inspectEntity,
	_inspectWorld as inspectWorld,
	_KNOWN_COMPONENTS as KNOWN_COMPONENTS,
};

// =============================================================================
// SYSTEM TIMING (re-exported from systemTiming module)
// =============================================================================

// Import and re-export system timing functionality
import {
	enableSystemTiming as _enableSystemTiming,
	getPerformanceStats as _getPerformanceStats,
	getSystemTimings as _getSystemTimings,
	isSystemTimingEnabled as _isSystemTimingEnabled,
	recordSystemTime as _recordSystemTime,
	resetPerformanceStatsCache as _resetPerformanceStatsCache,
	resetSystemTimings as _resetSystemTimings,
	timedSystem as _timedSystem,
	type PerformanceStats,
} from './systemTiming';

export type { PerformanceStats };
export {
	_enableSystemTiming as enableSystemTiming,
	_getSystemTimings as getSystemTimings,
	_isSystemTimingEnabled as isSystemTimingEnabled,
	_recordSystemTime as recordSystemTime,
	_resetPerformanceStatsCache as resetPerformanceStatsCache,
	_resetSystemTimings as resetSystemTimings,
	_timedSystem as timedSystem,
};

/**
 * Gets current performance statistics.
 *
 * Wrapper around systemTiming.getPerformanceStats that automatically
 * gets the entity count from the world.
 *
 * @param world - The ECS world
 * @param loop - Optional game loop for frame stats
 * @returns Performance statistics
 *
 * @example
 * ```typescript
 * import { getPerformanceStats } from 'blecsd/debug';
 *
 * const stats = getPerformanceStats(world, loop);
 * console.log(`FPS: ${stats.fps}`);
 * console.log(`Entities: ${stats.entityCount}`);
 * console.log(`Memory: ${stats.memoryUsageMB?.toFixed(1)}MB`);
 * ```
 */
export function getPerformanceStats(
	world: World,
	loop?: {
		getStats(): { fps: number; frameTime: number; frameCount: number; runningTime: number };
	},
): PerformanceStats {
	// Get entity count from world
	const entities = getAllEntities(world);
	const entityCount = entities.length;

	// Delegate to systemTiming module
	return _getPerformanceStats(world, entityCount, loop);
}

// =============================================================================
// DEBUG BOUNDS
// =============================================================================

/**
 * Debug bounds drawing state.
 */
interface DebugBoundsState {
	enabled: boolean;
	showHitboxes: boolean;
	showPadding: boolean;
	showMargins: boolean;
	color: number;
}

const debugBoundsState: DebugBoundsState = {
	enabled: false,
	showHitboxes: true,
	showPadding: false,
	showMargins: false,
	color: 0xff00ff00, // Green
};

/**
 * Enables or disables debug bounds visualization.
 *
 * When enabled, entity hitboxes and bounds are drawn as colored outlines.
 * This is useful for debugging layout and collision issues.
 *
 * @param enabled - Whether to enable debug bounds
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import { enableDebugBounds } from 'blecsd/debug';
 *
 * // Enable with default settings
 * enableDebugBounds(true);
 *
 * // Enable with custom color
 * enableDebugBounds(true, { color: 0xffff0000 }); // Red
 * ```
 */
export function enableDebugBounds(
	enabled: boolean,
	options?: {
		showHitboxes?: boolean;
		showPadding?: boolean;
		showMargins?: boolean;
		color?: number;
	},
): void {
	debugBoundsState.enabled = enabled;
	if (options) {
		debugBoundsState.showHitboxes = options.showHitboxes ?? debugBoundsState.showHitboxes;
		debugBoundsState.showPadding = options.showPadding ?? debugBoundsState.showPadding;
		debugBoundsState.showMargins = options.showMargins ?? debugBoundsState.showMargins;
		debugBoundsState.color = options.color ?? debugBoundsState.color;
	}
}

/**
 * Checks if debug bounds are enabled.
 */
export function isDebugBoundsEnabled(): boolean {
	return debugBoundsState.enabled;
}

/**
 * Gets debug bounds configuration.
 */
export function getDebugBoundsConfig(): Readonly<DebugBoundsState> {
	return { ...debugBoundsState };
}

/**
 * Gets entities that should have debug bounds drawn.
 * Returns entities with Position and Dimensions components.
 *
 * @param world - The ECS world
 * @returns Array of entities to draw bounds for
 */
export function getDebugBoundsEntities(world: World): Entity[] {
	if (!debugBoundsState.enabled) {
		return [];
	}

	const entities = getAllEntities(world) as Entity[];
	return entities.filter(
		(eid) => hasComponent(world, eid, Position) && hasComponent(world, eid, Dimensions),
	);
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Gets a debug summary of an entity as a single line.
 *
 * @param world - The ECS world
 * @param eid - The entity to summarize
 * @returns Single-line summary string
 *
 * @example
 * ```typescript
 * import { getEntitySummary } from 'blecsd/debug';
 *
 * console.log(getEntitySummary(world, entity));
 * // "Entity 1 (MyBox) @ 10,20 [40x10] focused hovered"
 * ```
 */
export function getEntitySummary(world: World, eid: Entity): string {
	const parts: string[] = [];

	// Entity ID and name
	const name = hasEntityData(world, eid, 'name') ? getEntityData<string>(world, eid, 'name') : null;
	parts.push(`Entity ${eid}${name ? ` (${name})` : ''}`);

	// Position
	if (hasComponent(world, eid, Position)) {
		const x = Math.round(Position.x[eid] ?? 0);
		const y = Math.round(Position.y[eid] ?? 0);
		parts.push(`@ ${x},${y}`);
	}

	// Dimensions
	if (hasComponent(world, eid, Dimensions)) {
		parts.push(`[${Dimensions.width[eid]}x${Dimensions.height[eid]}]`);
	}

	// State flags
	const flags = collectEntityFlags(world, eid);
	if (flags.length > 0) parts.push(flags.join(' '));

	return parts.join(' ');
}

/**
 * Logs an entity to the console with formatting.
 *
 * @param world - The ECS world
 * @param eid - The entity to log
 *
 * @example
 * ```typescript
 * import { logEntity } from 'blecsd/debug';
 *
 * logEntity(world, entity);
 * // [DEBUG] Entity 1 (MyBox)
 * // ├─ Position: x=10, y=20, z=0
 * // └─ Dimensions: width=40, height=10
 * ```
 */
export function logEntity(world: World, eid: Entity): void {
	const inspection = _inspectEntity(world, eid);
	const formatted = _formatEntityInspection(inspection);
	console.log(`[DEBUG] ${formatted}`);
}

/**
 * Logs world statistics to the console.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { logWorld } from 'blecsd/debug';
 *
 * logWorld(world);
 * // [DEBUG] World Statistics
 * // ────────────────
 * // Entities: 42
 * // ...
 * ```
 */
export function logWorld(world: World): void {
	const inspection = _inspectWorld(world);
	const formatted = _formatWorldInspection(inspection);
	console.log(`[DEBUG] ${formatted}`);
}

// =============================================================================
// EXPORTS
// =============================================================================

// Debug console
export type { ConsoleLogLevel, DebugConsole, DebugConsoleConfig, LogEntry } from './console';
export { createDebugConsole, DebugConsoleConfigSchema, debugLog } from './console';
// Debug toggle
export type { DebugToggle, DebugToggleConfig, DebugToggleState } from './debugToggle';
export { createDebugToggle, DebugToggleConfigSchema } from './debugToggle';
// ECS Inspector (note: inspectEntity and inspectWorld are already exported above)
export {
	dumpEntity,
	dumpWorld,
	findEntitiesWithComponent,
	findEntitiesWithComponents,
	getComponentField,
	isEntityActive,
	listEntities,
	listEntityComponents,
} from './ecsInspector';
// Memory profiler
export type {
	AllocationTracker,
	LeakWarning,
	MemoryDiff,
	MemoryProfiler,
	MemoryProfilerConfig,
	MemorySnapshot,
} from './memoryProfiler';
export { createMemoryProfiler } from './memoryProfiler';
// Debug overlay
export type {
	DebugOverlay,
	DebugOverlayConfig,
	FrameRateGraph,
	MiniProfiler,
} from './overlay';
export {
	createDebugOverlay,
	createFrameRateGraph,
	createInputLogger,
	createMiniProfiler,
} from './overlay';
// Slow frame detector
export type {
	SlowFrameConfig,
	SlowFrameDetector,
	SlowFrameStats,
} from './slowFrame';
export {
	createSlowFrameDetector,
	renderSlowFrameWarning,
	SlowFrameConfigSchema,
} from './slowFrame';
