/**
 * Position caching for render optimization.
 * Caches computed positions to avoid expensive recalculations.
 * @module core/positionCache
 */

import type { Entity, World } from './types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Last computed position data.
 * Used to cache resolved positions and skip recalculation when unchanged.
 *
 * - `xi`: Inner X start (left edge after border/padding)
 * - `xl`: Inner X end (right edge before border/padding)
 * - `yi`: Inner Y start (top edge after border/padding)
 * - `yl`: Inner Y end (bottom edge before border/padding)
 * - `base`: Scroll base offset
 * - `valid`: Cache validity flag (1 = valid, 0 = invalid)
 *
 * @example
 * ```typescript
 * import { setPositionCache, getPositionCache, invalidatePositionCache } from 'blecsd';
 *
 * // Set cached position after computing
 * setPositionCache(world, entity, { xi: 5, xl: 85, yi: 3, yl: 23, base: 0 });
 *
 * // Get cached position (returns undefined if invalid)
 * const cached = getPositionCache(world, entity);
 * if (cached) {
 *   // Use cached values instead of recalculating
 *   console.log(`Inner bounds: ${cached.xi},${cached.yi} to ${cached.xl},${cached.yl}`);
 * }
 *
 * // Invalidate when position changes
 * invalidatePositionCache(world, entity);
 * ```
 */
export const PositionCache = {
	/** Inner X start (left edge after border/padding) */
	xi: new Float32Array(DEFAULT_CAPACITY),
	/** Inner X end (right edge before border/padding) */
	xl: new Float32Array(DEFAULT_CAPACITY),
	/** Inner Y start (top edge after border/padding) */
	yi: new Float32Array(DEFAULT_CAPACITY),
	/** Inner Y end (bottom edge before border/padding) */
	yl: new Float32Array(DEFAULT_CAPACITY),
	/** Scroll base offset */
	base: new Float32Array(DEFAULT_CAPACITY),
	/** Cache validity flag (1 = valid, 0 = invalid) */
	valid: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Cached position data returned by getPositionCache.
 */
export interface CachedPosition {
	/** Inner X start (left edge after border/padding) */
	readonly xi: number;
	/** Inner X end (right edge before border/padding) */
	readonly xl: number;
	/** Inner Y start (top edge after border/padding) */
	readonly yi: number;
	/** Inner Y end (bottom edge before border/padding) */
	readonly yl: number;
	/** Scroll base offset */
	readonly base: number;
}

/**
 * Options for setting position cache.
 */
export interface SetPositionCacheOptions {
	/** Inner X start (left edge after border/padding) */
	readonly xi: number;
	/** Inner X end (right edge before border/padding) */
	readonly xl: number;
	/** Inner Y start (top edge after border/padding) */
	readonly yi: number;
	/** Inner Y end (bottom edge before border/padding) */
	readonly yl: number;
	/** Scroll base offset */
	readonly base: number;
}

/**
 * Sets the cached position for an entity.
 * Marks the cache as valid.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @param options - Position values to cache
 *
 * @example
 * ```typescript
 * import { setPositionCache } from 'blecsd';
 *
 * // After computing positions during render
 * setPositionCache(world, entity, {
 *   xi: 5,   // Inner left
 *   xl: 85,  // Inner right
 *   yi: 3,   // Inner top
 *   yl: 23,  // Inner bottom
 *   base: 0, // Scroll offset
 * });
 * ```
 */
export function setPositionCache(
	_world: World,
	eid: Entity,
	options: SetPositionCacheOptions,
): void {
	PositionCache.xi[eid] = options.xi;
	PositionCache.xl[eid] = options.xl;
	PositionCache.yi[eid] = options.yi;
	PositionCache.yl[eid] = options.yl;
	PositionCache.base[eid] = options.base;
	PositionCache.valid[eid] = 1;
}

/**
 * Gets the cached position for an entity.
 * Returns undefined if the cache is invalid.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns Cached position data or undefined if invalid
 *
 * @example
 * ```typescript
 * import { getPositionCache } from 'blecsd';
 *
 * const cached = getPositionCache(world, entity);
 * if (cached) {
 *   // Use cached values
 *   const innerWidth = cached.xl - cached.xi;
 *   const innerHeight = cached.yl - cached.yi;
 * }
 * ```
 */
export function getPositionCache(_world: World, eid: Entity): CachedPosition | undefined {
	if (PositionCache.valid[eid] !== 1) {
		return undefined;
	}
	return {
		xi: PositionCache.xi[eid] as number,
		xl: PositionCache.xl[eid] as number,
		yi: PositionCache.yi[eid] as number,
		yl: PositionCache.yl[eid] as number,
		base: PositionCache.base[eid] as number,
	};
}

/**
 * Checks if the position cache is valid for an entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if cache is valid
 *
 * @example
 * ```typescript
 * import { hasValidPositionCache } from 'blecsd';
 *
 * if (hasValidPositionCache(world, entity)) {
 *   // Skip expensive position calculation
 * }
 * ```
 */
export function hasValidPositionCache(_world: World, eid: Entity): boolean {
	return PositionCache.valid[eid] === 1;
}

/**
 * Invalidates the position cache for an entity.
 * Call this when position, size, or parent changes.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { invalidatePositionCache } from 'blecsd';
 *
 * // Invalidate when entity moves
 * setPosition(world, entity, 10, 20);
 * invalidatePositionCache(world, entity);
 * ```
 */
export function invalidatePositionCache(_world: World, eid: Entity): void {
	PositionCache.valid[eid] = 0;
}

/**
 * Invalidates the position cache for an entity and all its descendants.
 * Call this when a parent changes position, as all children need recalculation.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param getDescendants - Function to get descendant entities
 *
 * @example
 * ```typescript
 * import { invalidatePositionCacheTree, getChildren } from 'blecsd';
 *
 * // Invalidate entire subtree when parent moves
 * invalidatePositionCacheTree(world, parentEntity, (w, e) => {
 *   // Return all descendants recursively
 *   return getAllDescendants(w, e);
 * });
 * ```
 */
export function invalidatePositionCacheTree(
	world: World,
	eid: Entity,
	getDescendants: (world: World, eid: Entity) => Entity[],
): void {
	// Invalidate this entity
	PositionCache.valid[eid] = 0;

	// Invalidate all descendants
	const descendants = getDescendants(world, eid);
	for (const descendant of descendants) {
		PositionCache.valid[descendant] = 0;
	}
}

/**
 * Clears all position caches.
 * Useful for forcing a complete recalculation after major changes.
 *
 * @param _world - The ECS world (unused, for API consistency)
 *
 * @example
 * ```typescript
 * import { clearAllPositionCaches } from 'blecsd';
 *
 * // After screen resize
 * clearAllPositionCaches(world);
 * ```
 */
export function clearAllPositionCaches(_world: World): void {
	PositionCache.valid.fill(0);
}

/**
 * Gets inner width from cached position.
 * Returns 0 if cache is invalid.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns Inner width or 0 if invalid
 *
 * @example
 * ```typescript
 * import { getCachedInnerWidth } from 'blecsd';
 *
 * const innerWidth = getCachedInnerWidth(world, entity);
 * ```
 */
export function getCachedInnerWidth(_world: World, eid: Entity): number {
	if (PositionCache.valid[eid] !== 1) {
		return 0;
	}
	return (PositionCache.xl[eid] as number) - (PositionCache.xi[eid] as number);
}

/**
 * Gets inner height from cached position.
 * Returns 0 if cache is invalid.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns Inner height or 0 if invalid
 *
 * @example
 * ```typescript
 * import { getCachedInnerHeight } from 'blecsd';
 *
 * const innerHeight = getCachedInnerHeight(world, entity);
 * ```
 */
export function getCachedInnerHeight(_world: World, eid: Entity): number {
	if (PositionCache.valid[eid] !== 1) {
		return 0;
	}
	return (PositionCache.yl[eid] as number) - (PositionCache.yi[eid] as number);
}

/**
 * Updates just the scroll base in the cache.
 * Useful when only scroll position changes but layout is the same.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @param base - New scroll base value
 *
 * @example
 * ```typescript
 * import { updateCachedScrollBase } from 'blecsd';
 *
 * // After scrolling (layout unchanged, just scroll offset)
 * updateCachedScrollBase(world, entity, newScrollY);
 * ```
 */
export function updateCachedScrollBase(_world: World, eid: Entity, base: number): void {
	// Only update if cache is valid (don't make invalid cache "partially valid")
	if (PositionCache.valid[eid] === 1) {
		PositionCache.base[eid] = base;
	}
}

/**
 * Checks if a point is within the cached inner bounds.
 * Returns false if cache is invalid.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @returns true if point is within inner bounds
 *
 * @example
 * ```typescript
 * import { isPointInCachedBounds } from 'blecsd';
 *
 * // Efficient hit testing using cached positions
 * if (isPointInCachedBounds(world, entity, mouseX, mouseY)) {
 *   // Point is inside the element's inner area
 * }
 * ```
 */
export function isPointInCachedBounds(_world: World, eid: Entity, x: number, y: number): boolean {
	if (PositionCache.valid[eid] !== 1) {
		return false;
	}
	const xi = PositionCache.xi[eid] as number;
	const xl = PositionCache.xl[eid] as number;
	const yi = PositionCache.yi[eid] as number;
	const yl = PositionCache.yl[eid] as number;

	return x >= xi && x < xl && y >= yi && y < yl;
}
