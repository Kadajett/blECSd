/**
 * Dirty Rectangle Tracking System
 *
 * Provides efficient dirty region tracking for optimal rendering performance.
 * Only redraws portions of the screen that have changed.
 *
 * This module re-exports from the modular `dirtyRects/` submodules.
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

// Types
export type { DirtyRect, DirtyStats, DirtyTrackerData, EntityBoundsEntry } from './dirtyRects/types';

// Cell-level operations
export { isCellDirty, markCellDirty, markRegionDirty } from './dirtyRects/cells';

// Entity-level operations
export {
	isEntityDirty,
	markEntityDirty,
	removeEntityFromTracking,
	updateEntityBounds,
} from './dirtyRects/entities';

// Frame management
export { clearDirtyTracking, forceFullRedrawFlag, markAllEntitiesDirty } from './dirtyRects/frame';

// Query functions
export {
	getDirtyEntities,
	getDirtyRegions,
	getDirtyStats,
	hasDirtyEntities,
	needsFullRedraw,
} from './dirtyRects/queries';

// Tracker creation and management
export { createDirtyTracker, resizeDirtyTracker } from './dirtyRects/tracker';

// Viewport helpers
export { getDirtyRegionsInViewport, regionIntersectsDirty } from './dirtyRects/viewport';
