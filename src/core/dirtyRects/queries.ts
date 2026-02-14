/**
 * Query functions for dirty tracking.
 * @module core/dirtyRects/queries
 */

import type { Entity } from '../types';
import { calculateDirtyRegions } from './regions';
import type { DirtyRect, DirtyStats, DirtyTrackerData } from './types';

/**
 * Gets the coalesced dirty regions.
 * Regions are cached and only recalculated when needed.
 *
 * @param tracker - The dirty tracker
 * @returns Array of dirty rectangles
 *
 * @example
 * ```typescript
 * const regions = getDirtyRegions(tracker);
 * for (const region of regions) {
 *   renderRegion(buffer, region.x, region.y, region.width, region.height);
 * }
 * ```
 */
export function getDirtyRegions(tracker: DirtyTrackerData): readonly DirtyRect[] {
	if (tracker.regionsStale) {
		tracker.dirtyRegions.length = 0;
		tracker.dirtyRegions.push(...calculateDirtyRegions(tracker));
		tracker.regionsStale = false;
	}
	return tracker.dirtyRegions;
}

/**
 * Checks if there are any dirty entities or regions.
 *
 * @param tracker - The dirty tracker
 * @returns true if anything needs redrawing
 */
export function hasDirtyEntities(tracker: DirtyTrackerData): boolean {
	if (tracker.forceFullRedraw) {
		return true;
	}
	return tracker.dirtyEntities.size > 0;
}

/**
 * Checks if a full redraw is needed.
 *
 * @param tracker - The dirty tracker
 * @returns true if full redraw is required
 */
export function needsFullRedraw(tracker: DirtyTrackerData): boolean {
	return tracker.forceFullRedraw;
}

/**
 * Gets the set of dirty entities.
 *
 * @param tracker - The dirty tracker
 * @returns Set of dirty entity IDs
 */
export function getDirtyEntities(tracker: DirtyTrackerData): ReadonlySet<Entity> {
	return tracker.dirtyEntities;
}

/**
 * Gets dirty tracking statistics.
 *
 * @param tracker - The dirty tracker
 * @returns Statistics object
 *
 * @example
 * ```typescript
 * const stats = getDirtyStats(tracker);
 * console.log(`${stats.dirtyPercent.toFixed(1)}% of screen dirty`);
 * ```
 */
export function getDirtyStats(tracker: DirtyTrackerData): DirtyStats {
	const regions = getDirtyRegions(tracker);
	const totalCells = tracker.width * tracker.height;

	let dirtyArea = 0;
	for (const region of regions) {
		dirtyArea += region.width * region.height;
	}

	return {
		dirtyEntityCount: tracker.dirtyEntities.size,
		dirtyRegionCount: regions.length,
		dirtyArea,
		dirtyPercent: totalCells > 0 ? (dirtyArea / totalCells) * 100 : 0,
		fullRedraw: tracker.forceFullRedraw,
		trackedEntityCount: tracker.entityBounds.size,
	};
}
