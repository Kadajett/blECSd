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

import { Animation, hasAnimation } from '../components/animation';
import { Border, hasBorder } from '../components/border';
import { Collider } from '../components/collision';
import { Content } from '../components/content';
import { Dimensions } from '../components/dimensions';
import { Focusable, isFocused } from '../components/focusable';
import { getChildren, getParent, Hierarchy } from '../components/hierarchy';
import { Interactive, isHovered, isPressed } from '../components/interactive';
import { Padding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable, unpackColor } from '../components/renderable';
import { Scrollable } from '../components/scrollable';
import { Shadow } from '../components/shadow';
import { Velocity } from '../components/velocity';
import { getAllEntities, hasComponent } from '../core/ecs';
import { getEntityData, hasEntityData } from '../core/entityData';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Component information for inspection.
 */
export interface ComponentInfo {
	readonly name: string;
	readonly data: Record<string, unknown>;
}

/**
 * Entity inspection result.
 */
export interface EntityInspection {
	readonly entity: Entity;
	readonly name: string | null;
	readonly components: readonly ComponentInfo[];
	readonly parent: Entity | null;
	readonly children: readonly Entity[];
}

/**
 * World inspection result.
 */
export interface WorldInspection {
	readonly entityCount: number;
	readonly componentCounts: Record<string, number>;
	readonly hierarchyRoots: readonly Entity[];
}

// =============================================================================
// STATE
// =============================================================================

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/**
 * Known components for inspection.
 */
const KNOWN_COMPONENTS: readonly { component: unknown; name: string }[] = [
	{ component: Position, name: 'Position' },
	{ component: Dimensions, name: 'Dimensions' },
	{ component: Renderable, name: 'Renderable' },
	{ component: Content, name: 'Content' },
	{ component: Border, name: 'Border' },
	{ component: Padding, name: 'Padding' },
	{ component: Hierarchy, name: 'Hierarchy' },
	{ component: Interactive, name: 'Interactive' },
	{ component: Focusable, name: 'Focusable' },
	{ component: Scrollable, name: 'Scrollable' },
	{ component: Velocity, name: 'Velocity' },
	{ component: Animation, name: 'Animation' },
	{ component: Collider, name: 'Collider' },
	{ component: Shadow, name: 'Shadow' },
];

// =============================================================================
// ENTITY INSPECTION
// =============================================================================

/**
 * Gets component data for an entity.
 */
function getComponentData(
	world: World,
	eid: Entity,
	component: unknown,
	name: string,
): ComponentInfo | null {
	if (!hasComponent(world, eid, component)) {
		return null;
	}

	const data: Record<string, unknown> = {};
	const comp = component as Record<string, unknown>;

	// Read all array properties
	for (const [key, value] of Object.entries(comp)) {
		if (ArrayBuffer.isView(value) || Array.isArray(value)) {
			const arr = value as { [index: number]: unknown };
			data[key] = arr[eid];
		}
	}

	return { name, data };
}

/**
 * Inspects an entity and returns detailed information about its components.
 *
 * @param world - The ECS world
 * @param eid - The entity to inspect
 * @returns Entity inspection data
 *
 * @example
 * ```typescript
 * import { inspectEntity } from 'blecsd/debug';
 *
 * const entity = addEntity(world);
 * setPosition(world, entity, 10, 20);
 *
 * const info = inspectEntity(world, entity);
 * console.log(info.components);
 * // [{ name: 'Position', data: { x: 10, y: 20, z: 0, absolute: 0 } }]
 * ```
 */
export function inspectEntity(world: World, eid: Entity): EntityInspection {
	const components: ComponentInfo[] = [];

	// Check all known components
	for (const { component, name } of KNOWN_COMPONENTS) {
		const info = getComponentData(world, eid, component, name);
		if (info) {
			components.push(info);
		}
	}

	// Get hierarchy info
	const parent = hasComponent(world, eid, Hierarchy) ? getParent(world, eid) : null;
	const children = hasComponent(world, eid, Hierarchy) ? getChildren(world, eid) : [];

	// Get entity name if available
	const name = hasEntityData(eid, 'name') ? (getEntityData<string>(eid, 'name') ?? null) : null;

	return {
		entity: eid,
		name,
		components,
		parent: parent === 0 ? null : parent,
		children,
	};
}

/**
 * Formats an entity inspection as a human-readable string.
 *
 * @param inspection - The entity inspection data
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * import { inspectEntity, formatEntityInspection } from 'blecsd/debug';
 *
 * const info = inspectEntity(world, entity);
 * console.log(formatEntityInspection(info));
 * // Entity 1 (MyBox)
 * // ├─ Position: x=10, y=20, z=0
 * // ├─ Dimensions: width=40, height=10
 * // └─ Renderable: visible=1
 * ```
 */
export function formatEntityInspection(inspection: EntityInspection): string {
	const lines: string[] = [];

	// Header
	const nameStr = inspection.name ? ` (${inspection.name})` : '';
	lines.push(`Entity ${inspection.entity}${nameStr}`);

	// Parent/Children
	if (inspection.parent !== null) {
		lines.push(`├─ Parent: ${inspection.parent}`);
	}
	if (inspection.children.length > 0) {
		lines.push(`├─ Children: [${inspection.children.join(', ')}]`);
	}

	// Components
	const componentCount = inspection.components.length;
	inspection.components.forEach((comp, index) => {
		const isLast = index === componentCount - 1;
		const prefix = isLast ? '└─' : '├─';
		const dataStr = Object.entries(comp.data)
			.map(([key, value]) => {
				if (typeof value === 'number') {
					// Format colors as hex
					if (key === 'fg' || key === 'bg') {
						const { r, g, b, a } = unpackColor(value >>> 0);
						const toHex = (n: number): string => n.toString(16).padStart(2, '0');
						return `${key}=#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
					}
					// Format floats nicely
					if (!Number.isInteger(value)) {
						return `${key}=${value.toFixed(2)}`;
					}
				}
				return `${key}=${value}`;
			})
			.join(', ');
		lines.push(`${prefix} ${comp.name}: ${dataStr}`);
	});

	return lines.join('\n');
}

// =============================================================================
// WORLD INSPECTION
// =============================================================================

/**
 * Inspects the world and returns statistics about entities and components.
 *
 * @param world - The ECS world to inspect
 * @returns World inspection data
 *
 * @example
 * ```typescript
 * import { inspectWorld } from 'blecsd/debug';
 *
 * const info = inspectWorld(world);
 * console.log(`Entities: ${info.entityCount}`);
 * console.log(`Position components: ${info.componentCounts['Position']}`);
 * ```
 */
export function inspectWorld(world: World): WorldInspection {
	const entities = getAllEntities(world) as Entity[];
	const componentCounts: Record<string, number> = {};
	const hierarchyRoots: Entity[] = [];

	// Initialize counts
	for (const { name } of KNOWN_COMPONENTS) {
		componentCounts[name] = 0;
	}

	// Count components and find hierarchy roots
	for (const eid of entities) {
		// Count each component type
		for (const { component, name } of KNOWN_COMPONENTS) {
			if (hasComponent(world, eid, component)) {
				const currentCount = componentCounts[name] ?? 0;
				componentCounts[name] = currentCount + 1;
			}
		}

		// Find hierarchy roots (entities with no parent or parent=0)
		if (hasComponent(world, eid, Hierarchy)) {
			const parent = getParent(world, eid);
			if (parent === 0) {
				hierarchyRoots.push(eid);
			}
		}
	}

	return {
		entityCount: entities.length,
		componentCounts,
		hierarchyRoots,
	};
}

/**
 * Formats a world inspection as a human-readable string.
 *
 * @param inspection - The world inspection data
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * import { inspectWorld, formatWorldInspection } from 'blecsd/debug';
 *
 * const info = inspectWorld(world);
 * console.log(formatWorldInspection(info));
 * // World Statistics
 * // ────────────────
 * // Entities: 42
 * // Components:
 * //   Position: 38
 * //   Dimensions: 35
 * //   ...
 * ```
 */
export function formatWorldInspection(inspection: WorldInspection): string {
	const lines: string[] = [];

	lines.push('World Statistics');
	lines.push('────────────────');
	lines.push(`Entities: ${inspection.entityCount}`);
	lines.push('');
	lines.push('Components:');

	// Sort by count descending
	const sortedCounts = Object.entries(inspection.componentCounts)
		.filter(([, count]) => count > 0)
		.sort(([, a], [, b]) => b - a);

	for (const [name, count] of sortedCounts) {
		const percentage = ((count / inspection.entityCount) * 100).toFixed(0);
		lines.push(`  ${name}: ${count} (${percentage}%)`);
	}

	if (inspection.hierarchyRoots.length > 0) {
		lines.push('');
		lines.push(`Hierarchy Roots: [${inspection.hierarchyRoots.join(', ')}]`);
	}

	return lines.join('\n');
}

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

/** Collects state flags for entity summary. */
function collectEntityFlags(world: World, eid: Entity): string[] {
	const flags: string[] = [];
	if (hasComponent(world, eid, Focusable) && isFocused(world, eid)) flags.push('focused');
	if (hasComponent(world, eid, Interactive)) {
		if (isHovered(world, eid)) flags.push('hovered');
		if (isPressed(world, eid)) flags.push('pressed');
	}
	if (hasAnimation(world, eid)) flags.push('animated');
	if (hasBorder(world, eid)) flags.push('bordered');
	return flags;
}

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
	const name = hasEntityData(eid, 'name') ? getEntityData<string>(eid, 'name') : null;
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
	const inspection = inspectEntity(world, eid);
	const formatted = formatEntityInspection(inspection);
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
	const inspection = inspectWorld(world);
	const formatted = formatWorldInspection(inspection);
	console.log(`[DEBUG] ${formatted}`);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { KNOWN_COMPONENTS };

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
