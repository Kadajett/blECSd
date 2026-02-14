/**
 * Unified dirty tracking system for efficient rendering.
 * Combines entity-level tracking with cell-level bitsets for optimal performance.
 *
 * @module core/dirtyTracking
 *
 * @example
 * ```typescript
 * import { createDirtyTracker, markEntityDirty, getDirtyRegions } from 'blecsd';
 *
 * // Create tracker
 * const tracker = createDirtyTracker(80, 24);
 *
 * // Mark entity as dirty (automatically tracks bounds)
 * markEntityDirty(tracker, world, entityId);
 *
 * // Get dirty regions for rendering
 * const regions = getDirtyRegions(tracker);
 * for (const rect of regions) {
 *   renderRect(rect.x, rect.y, rect.width, rect.height);
 * }
 *
 * // Clear after rendering
 * clearDirtyTracking(tracker);
 * ```
 */

import { isEffectivelyVisible, Renderable } from '../components/renderable';
import { ComputedLayout, hasComputedLayout } from '../systems/layoutSystem';
import { hasComponent } from './ecs';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rectangle representing a dirty region.
 */
export interface DirtyRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Cached entity bounds for motion detection.
 * @internal
 */
interface EntityBoundsCache {
	prevX: number;
	prevY: number;
	prevWidth: number;
	prevHeight: number;
	wasVisible: boolean;
}

/**
 * Unified dirty tracker combining entity-level and cell-level tracking.
 */
export interface DirtyTracker {
	/** Screen width in cells */
	readonly width: number;
	/** Screen height in cells */
	readonly height: number;
	/** Bitset for dirty cells (one bit per cell) */
	readonly dirtyCells: Uint8Array;
	/** Set of dirty entities */
	readonly dirtyEntities: Set<Entity>;
	/** Cache of previous entity bounds */
	readonly entityBoundsCache: Map<Entity, EntityBoundsCache>;
	/** Computed dirty regions (lazily calculated) */
	readonly dirtyRegions: DirtyRect[];
	/** Whether dirtyRegions needs recalculation */
	regionsStale: boolean;
	/** Force full screen redraw */
	forceFullRedraw: boolean;
	/** Frame counter for debugging */
	frameCount: number;
}

// =============================================================================
// CREATION
// =============================================================================

/**
 * Creates a new unified dirty tracker.
 *
 * @param width - Screen width in cells
 * @param height - Screen height in cells
 * @returns New dirty tracker instance
 *
 * @example
 * ```typescript
 * const tracker = createDirtyTracker(80, 24);
 * ```
 */
export function createDirtyTracker(width: number, height: number): DirtyTracker {
	const totalCells = width * height;
	const bytesNeeded = Math.ceil(totalCells / 8);

	return {
		width,
		height,
		dirtyCells: new Uint8Array(bytesNeeded),
		dirtyEntities: new Set<Entity>(),
		entityBoundsCache: new Map<Entity, EntityBoundsCache>(),
		dirtyRegions: [],
		regionsStale: false,
		forceFullRedraw: false,
		frameCount: 0,
	};
}

// =============================================================================
// ENTITY-LEVEL TRACKING
// =============================================================================

/**
 * Marks an entity as dirty, tracking its bounds for optimal region calculation.
 *
 * @param tracker - Dirty tracker instance
 * @param world - ECS world
 * @param eid - Entity ID
 *
 * @example
 * ```typescript
 * // Entity moved or changed - mark it dirty
 * markEntityDirty(tracker, world, boxEntity);
 * ```
 */
export function markEntityDirty(tracker: DirtyTracker, world: World, eid: Entity): void {
	// Add to dirty set
	tracker.dirtyEntities.add(eid);

	// Get current bounds from layout
	if (!hasComputedLayout(world, eid)) {
		return;
	}

	const x = Math.floor(ComputedLayout.x[eid] as number);
	const y = Math.floor(ComputedLayout.y[eid] as number);
	const width = Math.floor(ComputedLayout.width[eid] as number);
	const height = Math.floor(ComputedLayout.height[eid] as number);
	const visible = hasComponent(world, eid, Renderable) && isEffectivelyVisible(world, eid);

	// Get cached bounds
	const cached = tracker.entityBoundsCache.get(eid);

	if (cached) {
		// Mark both old and new regions dirty (for motion trails)
		if (cached.wasVisible) {
			markRegionDirty(tracker, cached.prevX, cached.prevY, cached.prevWidth, cached.prevHeight);
		}
		if (visible) {
			markRegionDirty(tracker, x, y, width, height);
		}

		// Update cache
		cached.prevX = x;
		cached.prevY = y;
		cached.prevWidth = width;
		cached.prevHeight = height;
		cached.wasVisible = visible;
	} else {
		// First time seeing this entity - cache it and mark dirty
		tracker.entityBoundsCache.set(eid, {
			prevX: x,
			prevY: y,
			prevWidth: width,
			prevHeight: height,
			wasVisible: visible,
		});

		if (visible) {
			markRegionDirty(tracker, x, y, width, height);
		}
	}

	tracker.regionsStale = true;
}

/**
 * Removes an entity from dirty tracking (call when entity is destroyed).
 *
 * @param tracker - Dirty tracker instance
 * @param eid - Entity ID
 *
 * @example
 * ```typescript
 * // Entity destroyed - clean up tracking
 * removeEntityFromTracking(world, tracker, destroyedEntity);
 * ```
 */
export function removeEntityFromTracking(_world: World, tracker: DirtyTracker, eid: Entity): void {
	tracker.dirtyEntities.delete(eid);
	tracker.entityBoundsCache.delete(eid);
}

// =============================================================================
// CELL-LEVEL TRACKING
// =============================================================================

/**
 * Marks a single cell as dirty using bitset.
 *
 * @param tracker - Dirty tracker instance
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 *
 * @example
 * ```typescript
 * // Mark specific cell dirty
 * markCellDirty(tracker, 10, 5);
 * ```
 */
export function markCellDirty(tracker: DirtyTracker, x: number, y: number): void {
	// Bounds check
	if (x < 0 || x >= tracker.width || y < 0 || y >= tracker.height) {
		return;
	}

	const cellIndex = y * tracker.width + x;
	const byteIndex = Math.floor(cellIndex / 8);
	const bitIndex = cellIndex % 8;

	const currentByte = tracker.dirtyCells[byteIndex];
	if (currentByte !== undefined) {
		tracker.dirtyCells[byteIndex] = currentByte | (1 << bitIndex);
	}
	tracker.regionsStale = true;
}

/**
 * Checks if a cell is marked dirty.
 *
 * @param tracker - Dirty tracker instance
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 * @returns True if cell is dirty
 *
 * @example
 * ```typescript
 * if (isCellDirty(tracker, 10, 5)) {
 *   // Cell needs redraw
 * }
 * ```
 */
export function isCellDirty(tracker: DirtyTracker, x: number, y: number): boolean {
	if (x < 0 || x >= tracker.width || y < 0 || y >= tracker.height) {
		return false;
	}

	const cellIndex = y * tracker.width + x;
	const byteIndex = Math.floor(cellIndex / 8);
	const bitIndex = cellIndex % 8;

	const currentByte = tracker.dirtyCells[byteIndex];
	return currentByte !== undefined && (currentByte & (1 << bitIndex)) !== 0;
}

/**
 * Marks a rectangular region as dirty using cell bitsets.
 *
 * @param tracker - Dirty tracker instance
 * @param x - Region X coordinate
 * @param y - Region Y coordinate
 * @param width - Region width
 * @param height - Region height
 *
 * @example
 * ```typescript
 * // Mark 10x5 region dirty
 * markRegionDirty(tracker, 0, 0, 10, 5);
 * ```
 */
export function markRegionDirty(
	tracker: DirtyTracker,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	// Clip to screen bounds
	const x1 = Math.max(0, x);
	const y1 = Math.max(0, y);
	const x2 = Math.min(tracker.width, x + width);
	const y2 = Math.min(tracker.height, y + height);

	if (x2 <= x1 || y2 <= y1) {
		return;
	}

	// Mark all cells in region
	for (let cy = y1; cy < y2; cy++) {
		for (let cx = x1; cx < x2; cx++) {
			const cellIndex = cy * tracker.width + cx;
			const byteIndex = Math.floor(cellIndex / 8);
			const bitIndex = cellIndex % 8;
			const currentByte = tracker.dirtyCells[byteIndex];
			if (currentByte !== undefined) {
				tracker.dirtyCells[byteIndex] = currentByte | (1 << bitIndex);
			}
		}
	}

	tracker.regionsStale = true;
}

// =============================================================================
// REGION COMPUTATION
// =============================================================================

/**
 * Grows a rectangle horizontally from the starting position.
 * @internal
 */
function growRectHorizontally(tracker: DirtyTracker, x: number, y: number): number {
	let width = 1;
	while (x + width < tracker.width && isCellDirty(tracker, x + width, y)) {
		width++;
	}
	return width;
}

/**
 * Checks if a row can be added to the rectangle.
 * @internal
 */
function canGrowRectVertically(
	tracker: DirtyTracker,
	x: number,
	y: number,
	width: number,
): boolean {
	for (let dx = 0; dx < width; dx++) {
		if (!isCellDirty(tracker, x + dx, y)) {
			return false;
		}
	}
	return true;
}

/**
 * Grows a rectangle vertically as much as possible.
 * @internal
 */
function growRectVertically(tracker: DirtyTracker, x: number, y: number, width: number): number {
	let height = 1;
	while (y + height < tracker.height && canGrowRectVertically(tracker, x, y + height, width)) {
		height++;
	}
	return height;
}

/**
 * Marks all cells in a rectangle as visited.
 * @internal
 */
function markRectAsVisited(
	tracker: DirtyTracker,
	x: number,
	y: number,
	width: number,
	height: number,
	visited: Set<number>,
): void {
	for (let dy = 0; dy < height; dy++) {
		for (let dx = 0; dx < width; dx++) {
			visited.add((y + dy) * tracker.width + (x + dx));
		}
	}
}

/**
 * Converts bitset dirty cells into coalesced rectangular regions.
 * Uses scanline algorithm for efficient region merging.
 *
 * @param tracker - Dirty tracker instance
 * @returns Array of dirty rectangles
 *
 * @example
 * ```typescript
 * const regions = getDirtyRegions(tracker);
 * for (const rect of regions) {
 *   console.log(`Dirty: ${rect.x},${rect.y} ${rect.width}x${rect.height}`);
 * }
 * ```
 */
export function getDirtyRegions(tracker: DirtyTracker): readonly DirtyRect[] {
	// Return full screen if forced
	if (tracker.forceFullRedraw) {
		return [{ x: 0, y: 0, width: tracker.width, height: tracker.height }];
	}

	// Return cached regions if available
	if (!tracker.regionsStale && tracker.dirtyRegions.length > 0) {
		return tracker.dirtyRegions;
	}

	// Clear old regions
	tracker.dirtyRegions.length = 0;

	// Scan for dirty cells and coalesce into rectangles
	const regions: DirtyRect[] = [];
	const visited = new Set<number>();

	for (let y = 0; y < tracker.height; y++) {
		for (let x = 0; x < tracker.width; x++) {
			const cellIndex = y * tracker.width + x;
			if (visited.has(cellIndex) || !isCellDirty(tracker, x, y)) {
				continue;
			}

			// Found unvisited dirty cell - grow rectangle
			const width = growRectHorizontally(tracker, x, y);
			const height = growRectVertically(tracker, x, y, width);

			// Mark all cells in rectangle as visited
			markRectAsVisited(tracker, x, y, width, height, visited);

			regions.push({ x, y, width, height });
		}
	}

	// Store computed regions
	tracker.dirtyRegions.length = 0;
	tracker.dirtyRegions.push(...regions);
	tracker.regionsStale = false;

	return tracker.dirtyRegions;
}

/**
 * Checks if tracker has any dirty regions.
 *
 * @param tracker - Dirty tracker instance
 * @returns True if any cells are dirty
 *
 * @example
 * ```typescript
 * if (hasDirtyRegions(tracker)) {
 *   render();
 * }
 * ```
 */
export function hasDirtyRegions(tracker: DirtyTracker): boolean {
	if (tracker.forceFullRedraw) {
		return true;
	}

	// Quick check: any dirty entities?
	if (tracker.dirtyEntities.size > 0) {
		return true;
	}

	// Check bitset for any dirty cells
	for (let i = 0; i < tracker.dirtyCells.length; i++) {
		if (tracker.dirtyCells[i] !== 0) {
			return true;
		}
	}

	return false;
}

// =============================================================================
// CLEARING
// =============================================================================

/**
 * Clears all dirty tracking state after rendering.
 *
 * @param tracker - Dirty tracker instance
 *
 * @example
 * ```typescript
 * // After rendering
 * render(getDirtyRegions(tracker));
 * clearDirtyTracking(tracker);
 * ```
 */
export function clearDirtyTracking(tracker: DirtyTracker): void {
	// Clear bitset
	tracker.dirtyCells.fill(0);

	// Clear entity tracking
	tracker.dirtyEntities.clear();

	// Clear regions
	tracker.dirtyRegions.length = 0;
	tracker.regionsStale = false;

	// Reset full redraw flag
	tracker.forceFullRedraw = false;

	// Increment frame counter
	tracker.frameCount++;
}

/**
 * Forces a full screen redraw on next render.
 *
 * @param tracker - Dirty tracker instance
 *
 * @example
 * ```typescript
 * // Terminal resized - force full redraw
 * forceFullRedraw(tracker);
 * ```
 */
export function forceFullRedraw(tracker: DirtyTracker): void {
	tracker.forceFullRedraw = true;
	tracker.regionsStale = true;
}

// =============================================================================
// DEBUGGING
// =============================================================================

/**
 * Gets debug statistics about dirty tracking state.
 *
 * @param tracker - Dirty tracker instance
 * @returns Debug statistics
 *
 * @example
 * ```typescript
 * const stats = getDirtyTrackingStats(tracker);
 * console.log(`Dirty cells: ${stats.dirtyCellCount}`);
 * console.log(`Dirty entities: ${stats.dirtyEntityCount}`);
 * ```
 */
export function getDirtyTrackingStats(tracker: DirtyTracker): {
	readonly dirtyCellCount: number;
	readonly dirtyEntityCount: number;
	readonly cachedEntityCount: number;
	readonly dirtyRegionCount: number;
	readonly frameCount: number;
} {
	let dirtyCellCount = 0;
	for (let i = 0; i < tracker.dirtyCells.length; i++) {
		const byte = tracker.dirtyCells[i];
		if (byte !== undefined) {
			for (let bit = 0; bit < 8; bit++) {
				if (byte & (1 << bit)) {
					dirtyCellCount++;
				}
			}
		}
	}

	return {
		dirtyCellCount,
		dirtyEntityCount: tracker.dirtyEntities.size,
		cachedEntityCount: tracker.entityBoundsCache.size,
		dirtyRegionCount: tracker.regionsStale ? 0 : tracker.dirtyRegions.length,
		frameCount: tracker.frameCount,
	};
}
