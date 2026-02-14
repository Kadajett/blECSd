/**
 * Visibility Culling: Efficient entity visibility determination using spatial indexing
 *
 * Uses the spatial hash grid for O(1) visibility queries, determining which
 * entities overlap the current viewport. Supports incremental updates for
 * moving entities.
 *
 * @module systems/visibilityCulling
 */

import { Dimensions } from '../components/dimensions';
import { Position } from '../components/position';
import { hasComponent, query } from '../core/ecs';
import type { Entity, System, World } from '../core/types';
import { type ComponentStore, createComponentStore } from '../utils/componentStorage';
import { insertEntity, queryArea, type SpatialHashGrid } from './spatialHash';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Viewport definition for culling.
 */
export interface Viewport {
	/** Viewport left edge */
	readonly x: number;
	/** Viewport top edge */
	readonly y: number;
	/** Viewport width */
	readonly width: number;
	/** Viewport height */
	readonly height: number;
}

/**
 * Visibility culling result.
 */
export interface CullingResult {
	/** Entities visible in the viewport */
	readonly visible: readonly Entity[];
	/** Total entities considered */
	readonly total: number;
	/** Number of entities culled (not visible) */
	readonly culled: number;
}

/**
 * Cached bounds for a single entity in the position cache.
 */
export interface CachedBounds {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Entity position cache for incremental updates.
 * Uses a single ComponentStore instead of 4 separate Maps,
 * reducing hash lookups from 4 to 1 per entity per frame.
 */
export interface PositionCache {
	/** Previous bounds per entity */
	readonly bounds: ComponentStore<CachedBounds>;
}

// =============================================================================
// POSITION CACHE
// =============================================================================

/**
 * Creates a position cache for tracking entity movement.
 *
 * @returns Empty position cache
 *
 * @example
 * ```typescript
 * import { createPositionCache } from 'blecsd';
 *
 * const cache = createPositionCache();
 * ```
 */
export function createPositionCache(): PositionCache {
	return {
		bounds: createComponentStore<CachedBounds>({ iterable: false }),
	};
}

/**
 * Updates a single entity in the spatial hash only if it has moved.
 * Returns true if the entity was updated.
 *
 * @param grid - Spatial hash grid
 * @param cache - Position cache
 * @param eid - Entity to check
 * @param x - Current x position
 * @param y - Current y position
 * @param w - Current width
 * @param h - Current height
 * @returns True if entity was updated in the grid
 */
export function updateEntityIfMoved(
	grid: SpatialHashGrid,
	cache: PositionCache,
	eid: Entity,
	x: number,
	y: number,
	w: number,
	h: number,
): boolean {
	const prev = cache.bounds.get(eid);

	if (prev && prev.x === x && prev.y === y && prev.w === w && prev.h === h) {
		return false;
	}

	// Entity moved - update in grid
	insertEntity(grid, eid, x, y, w, h);

	// Update cache in-place when possible to avoid allocation
	if (prev) {
		prev.x = x;
		prev.y = y;
		prev.w = w;
		prev.h = h;
	} else {
		cache.bounds.set(eid, { x, y, w, h });
	}

	return true;
}

/**
 * Removes an entity from the position cache.
 *
 * @param cache - Position cache
 * @param eid - Entity to remove
 */
export function removeFromCache(cache: PositionCache, eid: Entity): void {
	cache.bounds.delete(eid);
}

/**
 * Clears the entire position cache.
 *
 * @param cache - Position cache to clear
 */
export function clearPositionCache(cache: PositionCache): void {
	cache.bounds.clear();
}

// =============================================================================
// VISIBILITY CULLING
// =============================================================================

/**
 * Queries which entities are visible within the given viewport.
 *
 * @param grid - Spatial hash grid with entities inserted
 * @param viewport - Viewport to check visibility against
 * @returns Set of entity IDs visible in the viewport
 *
 * @example
 * ```typescript
 * import { createSpatialHash, queryVisibleEntities } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 8 });
 * // ... insert entities ...
 *
 * const visible = queryVisibleEntities(grid, {
 *   x: 0, y: 0, width: 80, height: 24,
 * });
 * ```
 */
export function queryVisibleEntities(
	grid: SpatialHashGrid,
	viewport: Viewport,
): ReadonlySet<number> {
	return queryArea(grid, viewport.x, viewport.y, viewport.width, viewport.height);
}

// Module-level scratch array for visibility culling
// Reused across frames to avoid per-frame allocation
const scratchVisible: Entity[] = [];

/**
 * Performs full visibility culling: queries the spatial hash and returns
 * a categorized result of visible vs culled entities.
 *
 * PERF: Reuses module-level scratch array to avoid per-frame allocation.
 * The visible array in the result is only valid until the next call.
 *
 * @param grid - Spatial hash grid
 * @param viewport - Current viewport
 * @param totalEntities - Total entity count for stats
 * @returns Culling result with visible entities and statistics
 *
 * @example
 * ```typescript
 * const result = performCulling(grid, viewport, 10000);
 * console.log(`Visible: ${result.visible.length}, Culled: ${result.culled}`);
 * ```
 */
export function performCulling(
	grid: SpatialHashGrid,
	viewport: Viewport,
	totalEntities: number,
): CullingResult {
	const visibleSet = queryVisibleEntities(grid, viewport);

	// PERF: Reuse scratch array instead of Array.from()
	scratchVisible.length = 0;
	for (const eid of visibleSet) {
		scratchVisible.push(eid);
	}

	return {
		visible: scratchVisible,
		total: totalEntities,
		culled: totalEntities - scratchVisible.length,
	};
}

/**
 * Creates an incremental spatial hash update system.
 *
 * Instead of rebuilding the entire grid each frame, this system only
 * updates entities that have moved. Much faster for scenes where most
 * entities are static.
 *
 * @param grid - Spatial hash grid to update
 * @param cache - Position cache for change detection
 * @returns System function
 *
 * @example
 * ```typescript
 * import { createSpatialHash, createPositionCache, createIncrementalSpatialSystem } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 4 });
 * const cache = createPositionCache();
 * const system = createIncrementalSpatialSystem(grid, cache);
 *
 * // Register in scheduler
 * scheduler.registerSystem(LoopPhase.EARLY_UPDATE, system);
 * ```
 */
export function createIncrementalSpatialSystem(
	grid: SpatialHashGrid,
	cache: PositionCache,
): System {
	return (world: World): World => {
		const entities = query(world, [Position]) as unknown as readonly Entity[];

		for (const eid of entities) {
			const x = Position.x[eid] as number;
			const y = Position.y[eid] as number;
			let w = 1;
			let h = 1;

			if (hasComponent(world, eid, Dimensions)) {
				w = Dimensions.width[eid] as number;
				h = Dimensions.height[eid] as number;
			}

			updateEntityIfMoved(grid, cache, eid, x, y, w, h);
		}

		return world;
	};
}

/**
 * Creates a visibility culling system that marks entities as visible/not visible.
 *
 * @param grid - Spatial hash grid
 * @param getViewport - Function to get the current viewport
 * @returns System function
 *
 * @example
 * ```typescript
 * const cullSystem = createVisibilityCullingSystem(grid, () => ({
 *   x: scrollX, y: scrollY,
 *   width: terminalCols, height: terminalRows,
 * }));
 * ```
 */
export function createVisibilityCullingSystem(
	grid: SpatialHashGrid,
	getViewport: () => Viewport,
): System {
	return (world: World): World => {
		const viewport = getViewport();
		queryVisibleEntities(grid, viewport);
		return world;
	};
}
