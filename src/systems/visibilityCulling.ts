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
 * Entity position cache for incremental updates.
 */
export interface PositionCache {
	/** Previous x position per entity */
	readonly prevX: Map<number, number>;
	/** Previous y position per entity */
	readonly prevY: Map<number, number>;
	/** Previous width per entity */
	readonly prevW: Map<number, number>;
	/** Previous height per entity */
	readonly prevH: Map<number, number>;
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
		prevX: new Map(),
		prevY: new Map(),
		prevW: new Map(),
		prevH: new Map(),
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
	const id = eid as number;
	const px = cache.prevX.get(id);
	const py = cache.prevY.get(id);
	const pw = cache.prevW.get(id);
	const ph = cache.prevH.get(id);

	if (px === x && py === y && pw === w && ph === h) {
		return false;
	}

	// Entity moved - update in grid
	insertEntity(grid, eid, x, y, w, h);

	// Update cache
	cache.prevX.set(id, x);
	cache.prevY.set(id, y);
	cache.prevW.set(id, w);
	cache.prevH.set(id, h);

	return true;
}

/**
 * Removes an entity from the position cache.
 *
 * @param cache - Position cache
 * @param eid - Entity to remove
 */
export function removeFromCache(cache: PositionCache, eid: Entity): void {
	const id = eid as number;
	cache.prevX.delete(id);
	cache.prevY.delete(id);
	cache.prevW.delete(id);
	cache.prevH.delete(id);
}

/**
 * Clears the entire position cache.
 *
 * @param cache - Position cache to clear
 */
export function clearPositionCache(cache: PositionCache): void {
	cache.prevX.clear();
	cache.prevY.clear();
	cache.prevW.clear();
	cache.prevH.clear();
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

/**
 * Performs full visibility culling: queries the spatial hash and returns
 * a categorized result of visible vs culled entities.
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
	const visible = Array.from(visibleSet) as Entity[];

	return {
		visible,
		total: totalEntities,
		culled: totalEntities - visible.length,
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
