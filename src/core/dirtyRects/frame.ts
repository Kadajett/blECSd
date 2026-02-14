/**
 * Frame management functions for dirty tracking.
 * @module core/dirtyRects/frame
 */

import type { World } from '../types';
import { markEntityDirty } from './entities';
import type { DirtyTrackerData } from './types';

/**
 * Clears dirty tracking for the next frame.
 * Call this after rendering is complete.
 *
 * @param tracker - The dirty tracker
 *
 * @example
 * ```typescript
 * // After rendering frame
 * clearDirtyTracking(tracker);
 * ```
 */
export function clearDirtyTracking(tracker: DirtyTrackerData): void {
	// Clear dirty cell bitset
	tracker.dirtyCells.fill(0);

	// Clear dirty entities
	tracker.dirtyEntities.clear();

	// Clear cached regions
	tracker.dirtyRegions.length = 0;

	// Reset flags
	tracker.regionsStale = true;
	tracker.forceFullRedraw = false;
	tracker.frameCount++;
}

/**
 * Forces a full redraw on the next frame.
 *
 * @param tracker - The dirty tracker
 *
 * @example
 * ```typescript
 * // After major state change
 * forceFullRedrawFlag(tracker);
 * ```
 */
export function forceFullRedrawFlag(tracker: DirtyTrackerData): void {
	tracker.forceFullRedraw = true;
	tracker.regionsStale = true;
}

/**
 * Marks all tracked entities as dirty.
 *
 * @param tracker - The dirty tracker
 * @param world - The ECS world
 */
export function markAllEntitiesDirty(tracker: DirtyTrackerData, world: World): void {
	tracker.entityBounds.forEach((_bounds, eid) => {
		markEntityDirty(tracker, world, eid);
	});
}
