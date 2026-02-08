/**
 * Spatial hash grid for O(1) collision lookups.
 *
 * Partitions 2D space into a uniform grid where each cell tracks
 * which entities overlap it. Enables efficient broad-phase collision
 * detection by only checking entities in the same or adjacent cells.
 *
 * Supports incremental updates: tracks which entities have moved since
 * the last frame via a PackedStore dirty set, and only re-hashes those
 * entities. Falls back to full rebuild when the dirty fraction exceeds
 * a configurable threshold.
 *
 * @module systems/spatialHash
 */

import { z } from 'zod';
import { Collider } from '../components/collision';
import { Position } from '../components/position';
import { hasComponent, query } from '../core/ecs';
import { addToStore, clearStore, createPackedStore, type PackedStore } from '../core/storage';
import type { Entity, System, World } from '../core/types';
import { type ComponentStore, createComponentStore } from '../utils/componentStorage';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the spatial hash grid.
 */
export interface SpatialHashConfig {
	/** Width of each cell in world units (default: 8) */
	readonly cellSize: number;
	/** Initial number of cells in the grid (default: 256) */
	readonly initialCapacity: number;
}

/**
 * Zod schema for SpatialHashConfig validation.
 */
export const SpatialHashConfigSchema = z.object({
	cellSize: z.number().positive(),
	initialCapacity: z.number().int().positive(),
});

/**
 * A cell coordinate in the spatial hash grid.
 */
export interface CellCoord {
	readonly cx: number;
	readonly cy: number;
}

/**
 * Spatial hash grid data structure.
 */
export interface SpatialHashGrid {
	/** Cell size in world units */
	readonly cellSize: number;
	/** Map from cell key to set of entity IDs */
	readonly cells: Map<number, Set<number>>;
	/** Map from entity ID to set of cell keys it occupies */
	readonly entityCells: Map<number, Set<number>>;
}

/**
 * Statistics about the spatial hash grid.
 */
export interface SpatialHashStats {
	readonly cellCount: number;
	readonly entityCount: number;
	readonly averageEntitiesPerCell: number;
	readonly maxEntitiesInCell: number;
}

/**
 * Cached bounds for a single entity (position + collider offset + size).
 */
export interface PrevBounds {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Internal state for the incremental spatial hash system.
 * Tracks which entities need re-hashing via a PackedStore dirty set,
 * and caches previous positions for change detection.
 */
export interface SpatialHashSystemState {
	/** Dense packed store of dirty entity IDs for cache-friendly iteration */
	readonly dirtyEntities: PackedStore<number>;
	/** O(1) dedup: entity IDs currently in the dirty store */
	readonly dirtyLookup: Set<number>;
	/** Previous bounds per entity, backed by PackedStore for cache-friendly iteration */
	readonly prevBounds: ComponentStore<PrevBounds>;
	/** Whether the system has run at least once (first frame needs full rebuild) */
	initialized: boolean;
	/** Fraction of entities that must be dirty to trigger full rebuild (0.0-1.0) */
	dirtyThreshold: number;
}

// =============================================================================
// GRID CREATION
// =============================================================================

/** Default cell size */
export const DEFAULT_CELL_SIZE = 8;

/** Default dirty threshold: rebuild fully when >50% of entities moved */
const DEFAULT_DIRTY_THRESHOLD = 0.5;

/**
 * Creates a new spatial hash grid.
 *
 * @param config - Optional configuration
 * @returns A new spatial hash grid
 *
 * @example
 * ```typescript
 * import { createSpatialHash } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 4 });
 * ```
 */
export function createSpatialHash(config?: Partial<SpatialHashConfig>): SpatialHashGrid {
	const fullConfig = {
		cellSize: config?.cellSize ?? DEFAULT_CELL_SIZE,
		initialCapacity: config?.initialCapacity ?? 256,
	};
	// Validate configuration
	const validatedConfig = SpatialHashConfigSchema.parse(fullConfig);

	return {
		cellSize: validatedConfig.cellSize,
		cells: new Map(),
		entityCells: new Map(),
	};
}

// =============================================================================
// CELL KEY UTILITIES
// =============================================================================

/**
 * Computes a cell key from cell coordinates.
 * Uses a Cantor pairing function to hash 2D coords to a single integer.
 */
function cellKey(cx: number, cy: number): number {
	// Shift to handle negatives: map to positive space
	const ax = cx >= 0 ? cx * 2 : -cx * 2 - 1;
	const ay = cy >= 0 ? cy * 2 : -cy * 2 - 1;
	return ((ax + ay) * (ax + ay + 1)) / 2 + ay;
}

/**
 * Gets the cell coordinate for a world position.
 *
 * @param grid - The spatial hash grid
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @returns The cell coordinate
 *
 * @example
 * ```typescript
 * import { createSpatialHash, worldToCell } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 8 });
 * const cell = worldToCell(grid, 15, 23);
 * // cell = { cx: 1, cy: 2 }
 * ```
 */
export function worldToCell(grid: SpatialHashGrid, x: number, y: number): CellCoord {
	return {
		cx: Math.floor(x / grid.cellSize),
		cy: Math.floor(y / grid.cellSize),
	};
}

// =============================================================================
// ENTITY MANAGEMENT
// =============================================================================

/**
 * Inserts an entity into the spatial hash at the given position and size.
 *
 * @param grid - The spatial hash grid
 * @param eid - Entity ID
 * @param x - Entity X position
 * @param y - Entity Y position
 * @param width - Entity width (default: 1)
 * @param height - Entity height (default: 1)
 *
 * @example
 * ```typescript
 * import { createSpatialHash, insertEntity } from 'blecsd';
 *
 * const grid = createSpatialHash();
 * insertEntity(grid, entity, 10, 20, 2, 3);
 * ```
 */
export function insertEntity(
	grid: SpatialHashGrid,
	eid: Entity,
	x: number,
	y: number,
	width = 1,
	height = 1,
): void {
	removeEntityFromGrid(grid, eid);

	const entityId = eid as number;
	const occupiedCells = new Set<number>();

	const minCx = Math.floor(x / grid.cellSize);
	const minCy = Math.floor(y / grid.cellSize);
	const maxCx = Math.floor((x + width - 0.001) / grid.cellSize);
	const maxCy = Math.floor((y + height - 0.001) / grid.cellSize);

	for (let cx = minCx; cx <= maxCx; cx++) {
		for (let cy = minCy; cy <= maxCy; cy++) {
			const key = cellKey(cx, cy);
			occupiedCells.add(key);

			let cellEntities = grid.cells.get(key);
			if (!cellEntities) {
				cellEntities = new Set();
				grid.cells.set(key, cellEntities);
			}
			cellEntities.add(entityId);
		}
	}

	grid.entityCells.set(entityId, occupiedCells);
}

/**
 * Removes an entity from the spatial hash.
 *
 * @param grid - The spatial hash grid
 * @param eid - Entity ID to remove
 *
 * @example
 * ```typescript
 * import { removeEntityFromGrid } from 'blecsd';
 *
 * removeEntityFromGrid(grid, entity);
 * ```
 */
export function removeEntityFromGrid(grid: SpatialHashGrid, eid: Entity): void {
	const entityId = eid as number;
	const cells = grid.entityCells.get(entityId);
	if (!cells) {
		return;
	}

	for (const key of cells) {
		const cellEntities = grid.cells.get(key);
		if (cellEntities) {
			cellEntities.delete(entityId);
			if (cellEntities.size === 0) {
				grid.cells.delete(key);
			}
		}
	}

	grid.entityCells.delete(entityId);
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Gets all entities in the same cell(s) as the given position/area.
 * This is the core broad-phase query for collision detection.
 *
 * @param grid - The spatial hash grid
 * @param x - Query X position
 * @param y - Query Y position
 * @param width - Query width (default: 1)
 * @param height - Query height (default: 1)
 * @returns Set of entity IDs that may overlap the query area
 *
 * @example
 * ```typescript
 * import { createSpatialHash, queryArea } from 'blecsd';
 *
 * const nearby = queryArea(grid, playerX, playerY, 2, 2);
 * for (const eid of nearby) {
 *   // Check narrow-phase collision
 * }
 * ```
 */
export function queryArea(
	grid: SpatialHashGrid,
	x: number,
	y: number,
	width = 1,
	height = 1,
): ReadonlySet<number> {
	const result = new Set<number>();

	const minCx = Math.floor(x / grid.cellSize);
	const minCy = Math.floor(y / grid.cellSize);
	const maxCx = Math.floor((x + width - 0.001) / grid.cellSize);
	const maxCy = Math.floor((y + height - 0.001) / grid.cellSize);

	for (let cx = minCx; cx <= maxCx; cx++) {
		for (let cy = minCy; cy <= maxCy; cy++) {
			const key = cellKey(cx, cy);
			const cellEntities = grid.cells.get(key);
			if (cellEntities) {
				for (const eid of cellEntities) {
					result.add(eid);
				}
			}
		}
	}

	return result;
}

/**
 * Gets potential collision candidates for an entity.
 * Returns all entities in the same cells, excluding the entity itself.
 *
 * @param grid - The spatial hash grid
 * @param eid - Entity to find candidates for
 * @returns Set of entity IDs that may collide with the given entity
 *
 * @example
 * ```typescript
 * import { getNearbyEntities } from 'blecsd';
 *
 * const candidates = getNearbyEntities(grid, player);
 * for (const other of candidates) {
 *   // Narrow-phase collision check
 * }
 * ```
 */
export function getNearbyEntities(grid: SpatialHashGrid, eid: Entity): ReadonlySet<number> {
	const entityId = eid as number;
	const result = new Set<number>();

	const cells = grid.entityCells.get(entityId);
	if (!cells) {
		return result;
	}

	for (const key of cells) {
		const cellEntities = grid.cells.get(key);
		if (cellEntities) {
			for (const other of cellEntities) {
				if (other !== entityId) {
					result.add(other);
				}
			}
		}
	}

	return result;
}

/**
 * Gets all entities at a specific cell coordinate.
 *
 * @param grid - The spatial hash grid
 * @param cx - Cell X coordinate
 * @param cy - Cell Y coordinate
 * @returns Set of entity IDs in that cell
 *
 * @example
 * ```typescript
 * import { getEntitiesInCell } from 'blecsd';
 *
 * const entities = getEntitiesInCell(grid, 3, 5);
 * ```
 */
export function getEntitiesInCell(
	grid: SpatialHashGrid,
	cx: number,
	cy: number,
): ReadonlySet<number> {
	const key = cellKey(cx, cy);
	return grid.cells.get(key) ?? new Set();
}

/**
 * Gets all entities at a world position.
 *
 * @param grid - The spatial hash grid
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @returns Set of entity IDs at that position
 *
 * @example
 * ```typescript
 * import { getEntitiesAtPoint } from 'blecsd';
 *
 * const entities = getEntitiesAtPoint(grid, 10, 20);
 * ```
 */
export function getEntitiesAtPoint(
	grid: SpatialHashGrid,
	x: number,
	y: number,
): ReadonlySet<number> {
	const cx = Math.floor(x / grid.cellSize);
	const cy = Math.floor(y / grid.cellSize);
	return getEntitiesInCell(grid, cx, cy);
}

// =============================================================================
// GRID OPERATIONS
// =============================================================================

/**
 * Clears all entities from the spatial hash grid.
 *
 * @param grid - The spatial hash grid to clear
 *
 * @example
 * ```typescript
 * import { clearSpatialHash } from 'blecsd';
 *
 * clearSpatialHash(grid);
 * ```
 */
export function clearSpatialHash(grid: SpatialHashGrid): void {
	grid.cells.clear();
	grid.entityCells.clear();
}

/**
 * Gets statistics about the spatial hash grid.
 *
 * @param grid - The spatial hash grid
 * @returns Grid statistics
 *
 * @example
 * ```typescript
 * import { getSpatialHashStats } from 'blecsd';
 *
 * const stats = getSpatialHashStats(grid);
 * console.log(`Cells: ${stats.cellCount}, Entities: ${stats.entityCount}`);
 * ```
 */
export function getSpatialHashStats(grid: SpatialHashGrid): SpatialHashStats {
	let maxEntities = 0;
	let totalEntities = 0;

	for (const cellEntities of grid.cells.values()) {
		totalEntities += cellEntities.size;
		if (cellEntities.size > maxEntities) {
			maxEntities = cellEntities.size;
		}
	}

	const cellCount = grid.cells.size;

	return {
		cellCount,
		entityCount: grid.entityCells.size,
		averageEntitiesPerCell: cellCount > 0 ? totalEntities / cellCount : 0,
		maxEntitiesInCell: maxEntities,
	};
}

// =============================================================================
// REBUILD FROM WORLD
// =============================================================================

/**
 * Rebuilds the spatial hash from all entities with Position and Collider components.
 *
 * @param grid - The spatial hash grid to rebuild
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { createSpatialHash, rebuildSpatialHash } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 4 });
 * rebuildSpatialHash(grid, world);
 * ```
 */
export function rebuildSpatialHash(grid: SpatialHashGrid, world: World): void {
	clearSpatialHash(grid);

	const entities = query(world, [Position, Collider]) as unknown as readonly Entity[];

	for (const eid of entities) {
		const x = Position.x[eid] as number;
		const y = Position.y[eid] as number;
		const w = Collider.width[eid] as number;
		const h = Collider.height[eid] as number;
		const ox = Collider.offsetX[eid] as number;
		const oy = Collider.offsetY[eid] as number;

		insertEntity(grid, eid, x + ox, y + oy, w, h);
	}
}

// =============================================================================
// INCREMENTAL UPDATE STATE
// =============================================================================

/**
 * Creates a fresh spatial hash system state for incremental updates.
 *
 * @param dirtyThreshold - Fraction of entities above which full rebuild is used (default: 0.5)
 * @returns New system state
 *
 * @example
 * ```typescript
 * import { createSpatialHashSystemState } from 'blecsd';
 *
 * const state = createSpatialHashSystemState(0.3);
 * ```
 */
export function createSpatialHashSystemState(
	dirtyThreshold: number = DEFAULT_DIRTY_THRESHOLD,
): SpatialHashSystemState {
	return {
		dirtyEntities: createPackedStore<number>(64),
		dirtyLookup: new Set(),
		prevBounds: createComponentStore<PrevBounds>({ iterable: true }),
		initialized: false,
		dirtyThreshold: Math.max(0, Math.min(1, dirtyThreshold)),
	};
}

// =============================================================================
// SYSTEM
// =============================================================================

/** Module-level grid reference for the system */
let systemGrid: SpatialHashGrid | null = null;

/** Module-level incremental update state */
let systemState: SpatialHashSystemState = createSpatialHashSystemState();

/**
 * Sets the spatial hash grid for the system to use.
 * Resets incremental state so the next tick performs a full rebuild.
 *
 * @param grid - The spatial hash grid
 *
 * @example
 * ```typescript
 * import { createSpatialHash, setSpatialHashGrid } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 4 });
 * setSpatialHashGrid(grid);
 * ```
 */
export function setSpatialHashGrid(grid: SpatialHashGrid): void {
	if (grid !== systemGrid) {
		systemState.initialized = false;
		systemState.prevBounds.clear();
	}
	systemGrid = grid;
}

/**
 * Gets the current system spatial hash grid.
 *
 * @returns The grid, or null if not set
 */
export function getSpatialHashGrid(): SpatialHashGrid | null {
	return systemGrid;
}

/**
 * Gets the current incremental update system state.
 *
 * @returns The system state
 */
export function getSpatialHashSystemState(): SpatialHashSystemState {
	return systemState;
}

/**
 * Marks an entity as needing re-hashing on the next system tick.
 * Use this when an external system knows an entity's position or
 * collider changed, to avoid waiting for the position comparison scan.
 *
 * @param eid - Entity to mark dirty
 *
 * @example
 * ```typescript
 * import { markSpatialDirty } from 'blecsd';
 *
 * // After teleporting an entity, mark it dirty
 * Position.x[entity] = 100;
 * Position.y[entity] = 200;
 * markSpatialDirty(entity);
 * ```
 */
export function markSpatialDirty(eid: Entity): void {
	const id = eid as number;
	if (!systemState.dirtyLookup.has(id)) {
		addToStore(systemState.dirtyEntities, id);
		systemState.dirtyLookup.add(id);
	}
}

/**
 * Gets the number of entities currently marked as dirty.
 *
 * @returns Count of dirty entities awaiting re-hash
 *
 * @example
 * ```typescript
 * import { getSpatialDirtyCount } from 'blecsd';
 *
 * console.log(`${getSpatialDirtyCount()} entities need re-hashing`);
 * ```
 */
export function getSpatialDirtyCount(): number {
	return systemState.dirtyEntities.size;
}

/**
 * Resets the incremental spatial hash system state.
 * Clears dirty entities, position cache, and forces a full rebuild on next tick.
 * Useful for testing or scene transitions.
 *
 * @example
 * ```typescript
 * import { resetSpatialHashState } from 'blecsd';
 *
 * resetSpatialHashState();
 * ```
 */
export function resetSpatialHashState(): void {
	systemState = createSpatialHashSystemState(systemState.dirtyThreshold);
}

/**
 * Sets the dirty threshold for the incremental update system.
 * When the fraction of dirty entities exceeds this value,
 * a full rebuild is used instead of incremental updates.
 *
 * @param threshold - Fraction between 0.0 and 1.0 (default: 0.5)
 *
 * @example
 * ```typescript
 * import { setSpatialDirtyThreshold } from 'blecsd';
 *
 * // Use full rebuild when more than 30% of entities moved
 * setSpatialDirtyThreshold(0.3);
 * ```
 */
export function setSpatialDirtyThreshold(threshold: number): void {
	systemState.dirtyThreshold = Math.max(0, Math.min(1, threshold));
}

// =============================================================================
// INCREMENTAL UPDATE
// =============================================================================

/**
 * Reads the effective position and size of an entity (position + collider offset).
 */
function readEntityBounds(eid: Entity): { x: number; y: number; w: number; h: number } {
	const x = (Position.x[eid] as number) + (Collider.offsetX[eid] as number);
	const y = (Position.y[eid] as number) + (Collider.offsetY[eid] as number);
	const w = Collider.width[eid] as number;
	const h = Collider.height[eid] as number;
	return { x, y, w, h };
}

/**
 * Populates the position cache from all current entities.
 */
function populatePrevCache(state: SpatialHashSystemState, entities: readonly Entity[]): void {
	for (const eid of entities) {
		const { x, y, w, h } = readEntityBounds(eid);
		const prev = state.prevBounds.get(eid);
		if (prev) {
			prev.x = x;
			prev.y = y;
			prev.w = w;
			prev.h = h;
		} else {
			state.prevBounds.set(eid, { x, y, w, h });
		}
	}
}

/**
 * Detects entities that were removed since last frame and removes them
 * from the grid and position cache.
 */
function removeStaleEntities(
	grid: SpatialHashGrid,
	state: SpatialHashSystemState,
	currentEntities: ReadonlySet<number>,
): void {
	const toRemove: Entity[] = [];
	state.prevBounds.forEach((_bounds, eid) => {
		if (!currentEntities.has(eid as number)) {
			toRemove.push(eid);
		}
	});
	for (const eid of toRemove) {
		removeEntityFromGrid(grid, eid);
		state.prevBounds.delete(eid);
	}
}

/**
 * Scans all entities for position/size changes and marks dirty ones.
 * Updates the position cache for all entities.
 */
function detectDirtyEntities(state: SpatialHashSystemState, entities: readonly Entity[]): void {
	for (const eid of entities) {
		const id = eid as number;
		const { x, y, w, h } = readEntityBounds(eid);

		const prev = state.prevBounds.get(eid);

		// New entity or position/size changed
		if (!prev || x !== prev.x || y !== prev.y || w !== prev.w || h !== prev.h) {
			if (!state.dirtyLookup.has(id)) {
				addToStore(state.dirtyEntities, id);
				state.dirtyLookup.add(id);
			}
		}

		// Update the cache in-place when possible to avoid allocation
		if (prev) {
			prev.x = x;
			prev.y = y;
			prev.w = w;
			prev.h = h;
		} else {
			state.prevBounds.set(eid, { x, y, w, h });
		}
	}
}

/**
 * Performs an incremental update of the spatial hash grid.
 * Only re-inserts entities that were marked dirty (moved, resized, or new).
 * Falls back to full rebuild when dirty count exceeds the threshold.
 *
 * @param grid - The spatial hash grid
 * @param state - The incremental update state
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { createSpatialHash, createSpatialHashSystemState, incrementalSpatialUpdate } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 4 });
 * const state = createSpatialHashSystemState();
 * incrementalSpatialUpdate(grid, state, world);
 * ```
 */
export function incrementalSpatialUpdate(
	grid: SpatialHashGrid,
	state: SpatialHashSystemState,
	world: World,
): void {
	const entities = query(world, [Position, Collider]) as unknown as readonly Entity[];

	// First frame: full rebuild and populate cache
	if (!state.initialized) {
		rebuildSpatialHash(grid, world);
		populatePrevCache(state, entities);
		clearStore(state.dirtyEntities);
		state.dirtyLookup.clear();
		state.initialized = true;
		return;
	}

	// Build set of current entities for stale detection
	const currentEntities = new Set<number>();
	for (const eid of entities) {
		currentEntities.add(eid as number);
	}

	// Remove entities that no longer have Position+Collider
	removeStaleEntities(grid, state, currentEntities);

	// Detect position/size changes
	detectDirtyEntities(state, entities);

	// Process dirty entities
	const dirtyCount = state.dirtyEntities.size;
	if (dirtyCount > 0) {
		const totalCount = entities.length;
		if (totalCount > 0 && dirtyCount > state.dirtyThreshold * totalCount) {
			// Too many dirty entities: full rebuild is faster
			rebuildSpatialHash(grid, world);
		} else {
			// Incremental: only re-insert dirty entities
			const { data } = state.dirtyEntities;
			for (let i = 0; i < dirtyCount; i++) {
				const id = data[i];
				if (id === undefined) continue;
				const eid = id as Entity;
				// Skip entities that no longer have the required components
				if (!hasComponent(world, eid, Position) || !hasComponent(world, eid, Collider)) continue;
				const { x, y, w, h } = readEntityBounds(eid);
				insertEntity(grid, eid, x, y, w, h);
			}
		}
	}

	// Clear dirty set for next frame
	clearStore(state.dirtyEntities);
	state.dirtyLookup.clear();
}

// =============================================================================
// SYSTEM FUNCTION
// =============================================================================

/**
 * Spatial hash system with incremental updates.
 *
 * On the first frame, performs a full rebuild. On subsequent frames,
 * detects which entities moved and only re-hashes those. Falls back
 * to full rebuild when the dirty fraction exceeds the configured threshold.
 *
 * Register this in the EARLY_UPDATE phase to ensure collision queries
 * use up-to-date spatial data.
 *
 * @example
 * ```typescript
 * import { createSpatialHash, setSpatialHashGrid, spatialHashSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const grid = createSpatialHash({ cellSize: 4 });
 * setSpatialHashGrid(grid);
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.EARLY_UPDATE, spatialHashSystem);
 * ```
 */
export const spatialHashSystem: System = (world: World): World => {
	if (systemGrid) {
		incrementalSpatialUpdate(systemGrid, systemState, world);
	}
	return world;
};

/**
 * Creates a new spatial hash system.
 *
 * @returns The system function
 */
export function createSpatialHashSystem(): System {
	return spatialHashSystem;
}
