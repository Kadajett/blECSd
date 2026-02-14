/**
 * Dirty Rectangle Tracking System
 *
 * Provides efficient dirty region tracking for optimal rendering performance.
 * Only redraws portions of the screen that have changed.
 *
 * @module core/dirtyRects
 *
 * @example
 * ```typescript
 * import {
 *   createDirtyTracker,
 *   markEntityDirty,
 *   getDirtyRegions,
 *   clearDirtyTracking,
 *   hasDirtyEntities,
 * } from 'blecsd';
 *
 * const tracker = createDirtyTracker(80, 24);
 *
 * // When entity changes, mark it dirty
 * markEntityDirty(tracker, world, entity);
 *
 * // Check if anything needs redrawing
 * if (hasDirtyEntities(tracker)) {
 *   const regions = getDirtyRegions(tracker);
 *   // Render only dirty regions
 * }
 *
 * // After frame, clear tracking
 * clearDirtyTracking(tracker);
 * ```
 */

// Cell-level operations
export { isCellDirty, markCellDirty, markRegionDirty } from './cells';
// Entity-level operations
export {
	isEntityDirty,
	markEntityDirty,
	removeEntityFromTracking,
	updateEntityBounds,
} from './entities';
// Frame management
export { clearDirtyTracking, forceFullRedrawFlag, markAllEntitiesDirty } from './frame';
// Query functions
export {
	getDirtyEntities,
	getDirtyRegions,
	getDirtyStats,
	hasDirtyEntities,
	needsFullRedraw,
} from './queries';
// Tracker creation and management
export { createDirtyTracker, resizeDirtyTracker } from './tracker';
// Types
export type { DirtyRect, DirtyStats, DirtyTrackerData, EntityBoundsEntry } from './types';

// Viewport helpers
export { getDirtyRegionsInViewport, regionIntersectsDirty } from './viewport';
