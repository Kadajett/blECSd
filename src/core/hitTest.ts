/**
 * Hit Test System with Z-Order Aware Clickable Sorting
 *
 * Provides efficient hit testing for mouse interactions, sorting clickable
 * elements by z-index so the topmost element receives events first.
 *
 * @module core/hitTest
 *
 * @example
 * ```typescript
 * import {
 *   createClickableCache,
 *   hitTest,
 *   hitTestAll,
 *   invalidateClickableCache,
 * } from 'blecsd';
 *
 * // Create cache for efficient hit testing
 * const cache = createClickableCache();
 *
 * // Hit test at mouse position - returns topmost entity
 * const topEntity = hitTest(world, mouseX, mouseY, cache);
 *
 * // Get all entities under point, sorted by z-index (highest first)
 * const allEntities = hitTestAll(world, mouseX, mouseY, cache);
 *
 * // Invalidate cache when hierarchy changes
 * invalidateClickableCache(cache);
 * ```
 */

import { hasComponent } from 'bitecs';
import { Interactive } from '../components/interactive';
import { isPointInEntity } from './computedPosition';
import { isPointInCachedBounds } from './positionCache';
import { queryInteractive } from './queries';
import type { Entity, World } from './types';
import { getZIndex, hasZOrder, ZOrder } from './zOrder';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cache for clickable element sorting.
 *
 * Maintains a sorted list of clickable/hoverable entities for efficient
 * hit testing. The cache is invalidated when the hierarchy changes.
 */
export interface ClickableCache {
	/** Sorted entities (highest z-index first) */
	entities: Entity[];
	/** Whether cache needs rebuilding */
	dirty: boolean;
	/** Last known count for quick dirty check */
	lastCount: number;
}

/**
 * Result of a hit test operation.
 */
export interface HitTestResult {
	/** The entity under the point (topmost if multiple) */
	readonly entity: Entity;
	/** Z-index of the entity */
	readonly zIndex: number;
}

/**
 * Options for hit testing.
 */
export interface HitTestOptions {
	/** Use cached positions for faster testing (default: true) */
	useCachedPositions?: boolean;
	/** Only test clickable entities (default: true) */
	clickableOnly?: boolean;
	/** Only test hoverable entities (default: false) */
	hoverableOnly?: boolean;
	/** Test both clickable and hoverable (default: false) */
	interactiveOnly?: boolean;
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Creates a new clickable cache.
 *
 * The cache stores a z-index sorted list of interactive entities
 * for efficient hit testing.
 *
 * @returns A new ClickableCache
 *
 * @example
 * ```typescript
 * import { createClickableCache } from 'blecsd';
 *
 * const cache = createClickableCache();
 * ```
 */
export function createClickableCache(): ClickableCache {
	return {
		entities: [],
		dirty: true,
		lastCount: 0,
	};
}

/**
 * Marks the clickable cache as needing rebuild.
 *
 * Call this when:
 * - Entities are added or removed
 * - Z-index values change
 * - Interactive state changes (clickable/hoverable toggled)
 *
 * @param cache - The clickable cache
 *
 * @example
 * ```typescript
 * import { invalidateClickableCache } from 'blecsd';
 *
 * // After adding a new clickable entity
 * invalidateClickableCache(cache);
 * ```
 */
export function invalidateClickableCache(cache: ClickableCache): void {
	cache.dirty = true;
}

/**
 * Checks if the cache needs rebuilding.
 *
 * @param cache - The clickable cache
 * @returns true if cache is dirty
 */
export function isCacheDirty(cache: ClickableCache): boolean {
	return cache.dirty;
}

/**
 * Rebuilds the clickable cache if needed.
 *
 * Queries for all interactive entities and sorts them by z-index
 * in descending order (highest z-index first for hit testing).
 *
 * @param world - The ECS world
 * @param cache - The clickable cache
 *
 * @example
 * ```typescript
 * import { updateClickableCache } from 'blecsd';
 *
 * // Rebuild cache before hit testing
 * updateClickableCache(world, cache);
 * ```
 */
export function updateClickableCache(world: World, cache: ClickableCache): void {
	if (!cache.dirty) {
		return;
	}

	// Query all interactive entities
	const interactives = queryInteractive(world);

	// Filter to only clickable or hoverable
	const filtered = interactives.filter((eid) => {
		return Interactive.clickable[eid] === 1 || Interactive.hoverable[eid] === 1;
	});

	// Sort by z-index descending (highest first for hit testing)
	filtered.sort((a, b) => {
		const zA = hasZOrder(world, a) ? (ZOrder.zIndex[a] ?? 0) : 0;
		const zB = hasZOrder(world, b) ? (ZOrder.zIndex[b] ?? 0) : 0;
		return zB - zA;
	});

	cache.entities = filtered;
	cache.lastCount = filtered.length;
	cache.dirty = false;
}

/**
 * Gets the current sorted clickable entities from cache.
 *
 * @param world - The ECS world
 * @param cache - The clickable cache
 * @returns Array of entities sorted by z-index (highest first)
 */
export function getClickableEntities(world: World, cache: ClickableCache): readonly Entity[] {
	updateClickableCache(world, cache);
	return cache.entities;
}

/**
 * Gets the count of clickable entities.
 *
 * @param world - The ECS world
 * @param cache - The clickable cache
 * @returns Number of clickable/hoverable entities
 */
export function getClickableCount(world: World, cache: ClickableCache): number {
	updateClickableCache(world, cache);
	return cache.entities.length;
}

// =============================================================================
// HIT TESTING
// =============================================================================

/**
 * Default hit test options.
 */
const DEFAULT_OPTIONS: HitTestOptions = {
	useCachedPositions: true,
	clickableOnly: true,
	hoverableOnly: false,
	interactiveOnly: false,
};

/**
 * Checks if an entity matches the hit test filter criteria.
 */
function matchesFilter(world: World, eid: Entity, options: HitTestOptions): boolean {
	if (!hasComponent(world, eid, Interactive)) {
		return false;
	}

	if (options.interactiveOnly) {
		return Interactive.clickable[eid] === 1 || Interactive.hoverable[eid] === 1;
	}

	if (options.clickableOnly && options.hoverableOnly) {
		return Interactive.clickable[eid] === 1 && Interactive.hoverable[eid] === 1;
	}

	if (options.clickableOnly) {
		return Interactive.clickable[eid] === 1;
	}

	if (options.hoverableOnly) {
		return Interactive.hoverable[eid] === 1;
	}

	return true;
}

/**
 * Checks if a point is inside an entity.
 */
function isPointInside(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	useCached: boolean,
): boolean {
	if (useCached) {
		return isPointInCachedBounds(world, eid, x, y);
	}
	return isPointInEntity(world, eid, x, y);
}

/**
 * Performs a hit test at the given coordinates.
 *
 * Returns the topmost (highest z-index) entity under the point that
 * matches the filter criteria (clickable by default).
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache for efficiency
 * @param options - Hit test options
 * @returns The topmost entity at the point, or null if none
 *
 * @example
 * ```typescript
 * import { hitTest, createClickableCache } from 'blecsd';
 *
 * const cache = createClickableCache();
 *
 * // Find topmost clickable entity under mouse
 * const entity = hitTest(world, mouseX, mouseY, cache);
 *
 * if (entity !== null) {
 *   // Handle click on entity
 * }
 * ```
 */
export function hitTest(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
	options: HitTestOptions = DEFAULT_OPTIONS,
): Entity | null {
	const useCached = options.useCachedPositions ?? true;

	// If we have a cache, use it for efficiency
	if (cache) {
		updateClickableCache(world, cache);

		// Iterate in z-order (highest first)
		for (const eid of cache.entities) {
			if (!matchesFilter(world, eid, options)) {
				continue;
			}
			if (isPointInside(world, eid, x, y, useCached)) {
				return eid;
			}
		}
		return null;
	}

	// No cache - query and sort on the fly
	const interactives = queryInteractive(world);
	const candidates: Array<{ eid: Entity; z: number }> = [];

	for (const eid of interactives) {
		if (!matchesFilter(world, eid, options)) {
			continue;
		}
		if (isPointInside(world, eid, x, y, useCached)) {
			candidates.push({
				eid,
				z: getZIndex(world, eid),
			});
		}
	}

	if (candidates.length === 0) {
		return null;
	}

	// Sort by z-index descending and return topmost
	candidates.sort((a, b) => b.z - a.z);
	return candidates[0]?.eid ?? null;
}

/**
 * Performs a hit test and returns all entities at the point.
 *
 * Returns entities sorted by z-index (highest first).
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache for efficiency
 * @param options - Hit test options
 * @returns Array of entities at the point, sorted by z-index (highest first)
 *
 * @example
 * ```typescript
 * import { hitTestAll, createClickableCache } from 'blecsd';
 *
 * const cache = createClickableCache();
 *
 * // Get all entities under mouse position
 * const entities = hitTestAll(world, mouseX, mouseY, cache);
 *
 * for (const eid of entities) {
 *   console.log(`Entity ${eid} at z=${getZIndex(world, eid)}`);
 * }
 * ```
 */
export function hitTestAll(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
	options: HitTestOptions = DEFAULT_OPTIONS,
): Entity[] {
	const useCached = options.useCachedPositions ?? true;
	const results: Entity[] = [];

	// If we have a cache, use it for efficiency
	if (cache) {
		updateClickableCache(world, cache);

		// Already sorted by z-index (highest first)
		for (const eid of cache.entities) {
			if (!matchesFilter(world, eid, options)) {
				continue;
			}
			if (isPointInside(world, eid, x, y, useCached)) {
				results.push(eid);
			}
		}
		return results;
	}

	// No cache - query and sort on the fly
	const interactives = queryInteractive(world);
	const candidates: Array<{ eid: Entity; z: number }> = [];

	for (const eid of interactives) {
		if (!matchesFilter(world, eid, options)) {
			continue;
		}
		if (isPointInside(world, eid, x, y, useCached)) {
			candidates.push({
				eid,
				z: getZIndex(world, eid),
			});
		}
	}

	// Sort by z-index descending
	candidates.sort((a, b) => b.z - a.z);

	return candidates.map((c) => c.eid);
}

/**
 * Performs a hit test with detailed results.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache for efficiency
 * @param options - Hit test options
 * @returns Array of HitTestResults with entity and z-index
 *
 * @example
 * ```typescript
 * import { hitTestDetailed, createClickableCache } from 'blecsd';
 *
 * const cache = createClickableCache();
 *
 * const results = hitTestDetailed(world, mouseX, mouseY, cache);
 * for (const { entity, zIndex } of results) {
 *   console.log(`Entity ${entity} at z=${zIndex}`);
 * }
 * ```
 */
export function hitTestDetailed(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
	options: HitTestOptions = DEFAULT_OPTIONS,
): HitTestResult[] {
	const useCached = options.useCachedPositions ?? true;
	const results: HitTestResult[] = [];

	if (cache) {
		updateClickableCache(world, cache);

		for (const eid of cache.entities) {
			if (!matchesFilter(world, eid, options)) {
				continue;
			}
			if (isPointInside(world, eid, x, y, useCached)) {
				results.push({
					entity: eid,
					zIndex: getZIndex(world, eid),
				});
			}
		}
		return results;
	}

	// No cache - query and sort on the fly
	const interactives = queryInteractive(world);

	for (const eid of interactives) {
		if (!matchesFilter(world, eid, options)) {
			continue;
		}
		if (isPointInside(world, eid, x, y, useCached)) {
			results.push({
				entity: eid,
				zIndex: getZIndex(world, eid),
			});
		}
	}

	// Sort by z-index descending
	results.sort((a, b) => b.zIndex - a.zIndex);

	return results;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Checks if any clickable entity is under the point.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache
 * @returns true if any clickable entity is under the point
 */
export function hasClickableAt(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
): boolean {
	return hitTest(world, x, y, cache, { clickableOnly: true, useCachedPositions: true }) !== null;
}

/**
 * Checks if any hoverable entity is under the point.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache
 * @returns true if any hoverable entity is under the point
 */
export function hasHoverableAt(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
): boolean {
	return (
		hitTest(world, x, y, cache, {
			hoverableOnly: true,
			clickableOnly: false,
			useCachedPositions: true,
		}) !== null
	);
}

/**
 * Gets the topmost clickable entity at a point.
 *
 * Convenience wrapper for hitTest with clickableOnly=true.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache
 * @returns Topmost clickable entity or null
 */
export function getClickableAt(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
): Entity | null {
	return hitTest(world, x, y, cache, { clickableOnly: true, useCachedPositions: true });
}

/**
 * Gets the topmost hoverable entity at a point.
 *
 * Convenience wrapper for hitTest with hoverableOnly=true.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache
 * @returns Topmost hoverable entity or null
 */
export function getHoverableAt(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
): Entity | null {
	return hitTest(world, x, y, cache, {
		hoverableOnly: true,
		clickableOnly: false,
		useCachedPositions: true,
	});
}

/**
 * Gets all clickable entities at a point.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache
 * @returns Array of clickable entities (highest z-index first)
 */
export function getAllClickablesAt(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
): Entity[] {
	return hitTestAll(world, x, y, cache, { clickableOnly: true, useCachedPositions: true });
}

/**
 * Gets all hoverable entities at a point.
 *
 * @param world - The ECS world
 * @param x - Screen X coordinate
 * @param y - Screen Y coordinate
 * @param cache - Optional clickable cache
 * @returns Array of hoverable entities (highest z-index first)
 */
export function getAllHoverablesAt(
	world: World,
	x: number,
	y: number,
	cache?: ClickableCache,
): Entity[] {
	return hitTestAll(world, x, y, cache, {
		hoverableOnly: true,
		clickableOnly: false,
		useCachedPositions: true,
	});
}
