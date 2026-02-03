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

import { ComputedLayout, hasComputedLayout } from '../systems/layoutSystem';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A rectangular region on screen.
 */
export interface DirtyRect {
	/** Left edge X coordinate */
	readonly x: number;
	/** Top edge Y coordinate */
	readonly y: number;
	/** Width of region */
	readonly width: number;
	/** Height of region */
	readonly height: number;
}

/**
 * Entity bounds cache entry.
 */
interface EntityBoundsEntry {
	/** Previous frame's X position */
	prevX: number;
	/** Previous frame's Y position */
	prevY: number;
	/** Previous frame's width */
	prevWidth: number;
	/** Previous frame's height */
	prevHeight: number;
	/** Whether entity was visible last frame */
	wasVisible: boolean;
}

/**
 * Dirty tracking state.
 */
export interface DirtyTrackerData {
	/** Screen width */
	readonly width: number;
	/** Screen height */
	readonly height: number;
	/** Bitset tracking dirty cells (1 bit per cell) */
	readonly dirtyCells: Uint8Array;
	/** Set of dirty entity IDs */
	readonly dirtyEntities: Set<Entity>;
	/** Previous bounds for each entity */
	readonly entityBounds: Map<Entity, EntityBoundsEntry>;
	/** Coalesced dirty regions */
	readonly dirtyRegions: DirtyRect[];
	/** Whether regions need recalculation */
	regionsStale: boolean;
	/** Force full redraw */
	forceFullRedraw: boolean;
	/** Frame counter for timing */
	frameCount: number;
}

/**
 * Statistics for dirty tracking performance.
 */
export interface DirtyStats {
	/** Number of dirty entities this frame */
	readonly dirtyEntityCount: number;
	/** Number of dirty regions after coalescing */
	readonly dirtyRegionCount: number;
	/** Total dirty area in cells */
	readonly dirtyArea: number;
	/** Percentage of screen that is dirty */
	readonly dirtyPercent: number;
	/** Whether full redraw was triggered */
	readonly fullRedraw: boolean;
	/** Number of entities being tracked */
	readonly trackedEntityCount: number;
}

// =============================================================================
// CREATION
// =============================================================================

/**
 * Creates a new dirty tracking system.
 *
 * @param width - Screen width in cells
 * @param height - Screen height in cells
 * @returns A new DirtyTrackerData
 *
 * @example
 * ```typescript
 * import { createDirtyTracker } from 'blecsd';
 *
 * const tracker = createDirtyTracker(80, 24);
 * ```
 */
export function createDirtyTracker(width: number, height: number): DirtyTrackerData {
	// Calculate bytes needed for bitset (1 bit per cell, 8 cells per byte)
	const cellCount = width * height;
	const byteCount = Math.ceil(cellCount / 8);

	return {
		width,
		height,
		dirtyCells: new Uint8Array(byteCount),
		dirtyEntities: new Set(),
		entityBounds: new Map(),
		dirtyRegions: [],
		regionsStale: true,
		forceFullRedraw: true, // First frame needs full draw
		frameCount: 0,
	};
}

/**
 * Resizes the dirty tracker for a new screen size.
 *
 * @param tracker - The dirty tracker
 * @param newWidth - New screen width
 * @param newHeight - New screen height
 * @returns A new resized tracker
 *
 * @example
 * ```typescript
 * tracker = resizeDirtyTracker(tracker, 120, 40);
 * ```
 */
export function resizeDirtyTracker(
	tracker: DirtyTrackerData,
	newWidth: number,
	newHeight: number,
): DirtyTrackerData {
	const newTracker = createDirtyTracker(newWidth, newHeight);

	// Copy entity bounds that still fit
	for (const [eid, bounds] of tracker.entityBounds) {
		if (bounds.prevX < newWidth && bounds.prevY < newHeight) {
			newTracker.entityBounds.set(eid, { ...bounds });
		}
	}

	// Force full redraw after resize
	newTracker.forceFullRedraw = true;

	return newTracker;
}

// =============================================================================
// CELL-LEVEL DIRTY TRACKING
// =============================================================================

/**
 * Marks a single cell as dirty.
 *
 * @param tracker - The dirty tracker
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 */
export function markCellDirty(tracker: DirtyTrackerData, x: number, y: number): void {
	if (x < 0 || x >= tracker.width || y < 0 || y >= tracker.height) {
		return;
	}

	const cellIndex = y * tracker.width + x;
	const byteIndex = cellIndex >> 3; // Divide by 8
	const bitIndex = cellIndex & 7; // Mod 8

	const byte = tracker.dirtyCells[byteIndex];
	if (byte !== undefined) {
		tracker.dirtyCells[byteIndex] = byte | (1 << bitIndex);
	}

	tracker.regionsStale = true;
}

/**
 * Checks if a cell is dirty.
 *
 * @param tracker - The dirty tracker
 * @param x - Cell X coordinate
 * @param y - Cell Y coordinate
 * @returns true if cell is dirty
 */
export function isCellDirty(tracker: DirtyTrackerData, x: number, y: number): boolean {
	if (x < 0 || x >= tracker.width || y < 0 || y >= tracker.height) {
		return false;
	}

	const cellIndex = y * tracker.width + x;
	const byteIndex = cellIndex >> 3;
	const bitIndex = cellIndex & 7;

	const byte = tracker.dirtyCells[byteIndex];
	if (byte === undefined) {
		return false;
	}

	return (byte & (1 << bitIndex)) !== 0;
}

/**
 * Marks a rectangular region as dirty.
 *
 * @param tracker - The dirty tracker
 * @param x - Region left edge
 * @param y - Region top edge
 * @param width - Region width
 * @param height - Region height
 */
export function markRegionDirty(
	tracker: DirtyTrackerData,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	// Clamp to screen bounds
	const x1 = Math.max(0, Math.floor(x));
	const y1 = Math.max(0, Math.floor(y));
	const x2 = Math.min(tracker.width, Math.floor(x + width));
	const y2 = Math.min(tracker.height, Math.floor(y + height));

	if (x2 <= x1 || y2 <= y1) {
		return;
	}

	// Mark all cells in region
	for (let cy = y1; cy < y2; cy++) {
		for (let cx = x1; cx < x2; cx++) {
			const cellIndex = cy * tracker.width + cx;
			const byteIndex = cellIndex >> 3;
			const bitIndex = cellIndex & 7;

			const byte = tracker.dirtyCells[byteIndex];
			if (byte !== undefined) {
				tracker.dirtyCells[byteIndex] = byte | (1 << bitIndex);
			}
		}
	}

	tracker.regionsStale = true;
}

// =============================================================================
// ENTITY-LEVEL DIRTY TRACKING
// =============================================================================

/**
 * Marks an entity as dirty for redraw.
 * Also marks both old and new positions if entity moved.
 *
 * @param tracker - The dirty tracker
 * @param world - The ECS world
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * // When entity changes position or appearance
 * markEntityDirty(tracker, world, entity);
 * ```
 */
export function markEntityDirty(tracker: DirtyTrackerData, world: World, eid: Entity): void {
	tracker.dirtyEntities.add(eid);

	// Get current bounds
	if (!hasComputedLayout(world, eid)) {
		return;
	}

	const currentX = ComputedLayout.x[eid] as number;
	const currentY = ComputedLayout.y[eid] as number;
	const currentW = ComputedLayout.width[eid] as number;
	const currentH = ComputedLayout.height[eid] as number;

	// Check for previous bounds
	const prevBounds = tracker.entityBounds.get(eid);

	if (prevBounds) {
		// Mark old position dirty (entity moved away from here)
		if (
			prevBounds.prevX !== currentX ||
			prevBounds.prevY !== currentY ||
			prevBounds.prevWidth !== currentW ||
			prevBounds.prevHeight !== currentH
		) {
			markRegionDirty(
				tracker,
				prevBounds.prevX,
				prevBounds.prevY,
				prevBounds.prevWidth,
				prevBounds.prevHeight,
			);
		}
	}

	// Mark new position dirty
	markRegionDirty(tracker, currentX, currentY, currentW, currentH);

	tracker.regionsStale = true;
}

/**
 * Updates entity bounds cache after rendering.
 * Call this after an entity has been rendered.
 *
 * @param tracker - The dirty tracker
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param visible - Whether entity is currently visible
 */
export function updateEntityBounds(
	tracker: DirtyTrackerData,
	world: World,
	eid: Entity,
	visible: boolean,
): void {
	if (!hasComputedLayout(world, eid)) {
		// Remove from cache if no layout
		tracker.entityBounds.delete(eid);
		return;
	}

	const entry: EntityBoundsEntry = {
		prevX: ComputedLayout.x[eid] as number,
		prevY: ComputedLayout.y[eid] as number,
		prevWidth: ComputedLayout.width[eid] as number,
		prevHeight: ComputedLayout.height[eid] as number,
		wasVisible: visible,
	};

	tracker.entityBounds.set(eid, entry);
}

/**
 * Removes an entity from dirty tracking.
 * Call when entity is destroyed.
 *
 * @param tracker - The dirty tracker
 * @param eid - The entity ID
 */
export function removeEntityFromTracking(tracker: DirtyTrackerData, eid: Entity): void {
	const prevBounds = tracker.entityBounds.get(eid);

	// Mark previous position dirty (entity was here, now gone)
	if (prevBounds && prevBounds.wasVisible) {
		markRegionDirty(
			tracker,
			prevBounds.prevX,
			prevBounds.prevY,
			prevBounds.prevWidth,
			prevBounds.prevHeight,
		);
	}

	tracker.dirtyEntities.delete(eid);
	tracker.entityBounds.delete(eid);
}

/**
 * Checks if an entity is marked dirty.
 *
 * @param tracker - The dirty tracker
 * @param eid - The entity ID
 * @returns true if entity is dirty
 */
export function isEntityDirty(tracker: DirtyTrackerData, eid: Entity): boolean {
	return tracker.dirtyEntities.has(eid);
}

// =============================================================================
// REGION COALESCING
// =============================================================================

/**
 * Calculates coalesced dirty regions from the dirty cell bitset.
 * Uses a greedy rectangle finding algorithm.
 *
 * @param tracker - The dirty tracker
 * @returns Array of dirty rectangles
 */
function calculateDirtyRegions(tracker: DirtyTrackerData): DirtyRect[] {
	const regions: DirtyRect[] = [];

	if (tracker.forceFullRedraw) {
		// Single region covering entire screen
		regions.push({
			x: 0,
			y: 0,
			width: tracker.width,
			height: tracker.height,
		});
		return regions;
	}

	// Create a working copy of dirty state for greedy extraction
	const processed = new Uint8Array(tracker.dirtyCells.length);

	// Scan for dirty cells and expand into rectangles
	for (let y = 0; y < tracker.height; y++) {
		for (let x = 0; x < tracker.width; x++) {
			const cellIndex = y * tracker.width + x;
			const byteIndex = cellIndex >> 3;
			const bitIndex = cellIndex & 7;

			const dirtyByte = tracker.dirtyCells[byteIndex];
			const processedByte = processed[byteIndex];

			if (dirtyByte === undefined || processedByte === undefined) {
				continue;
			}

			const isDirty = (dirtyByte & (1 << bitIndex)) !== 0;
			const isProcessed = (processedByte & (1 << bitIndex)) !== 0;

			if (isDirty && !isProcessed) {
				// Found an unprocessed dirty cell - expand into rectangle
				const rect = expandDirtyRect(tracker, processed, x, y);
				if (rect.width > 0 && rect.height > 0) {
					regions.push(rect);
				}
			}
		}
	}

	// Coalesce adjacent/overlapping regions
	return coalesceRegions(regions);
}

/**
 * Expands a dirty cell into the largest possible rectangle.
 * @internal
 */
function expandDirtyRect(
	tracker: DirtyTrackerData,
	processed: Uint8Array,
	startX: number,
	startY: number,
): DirtyRect {
	// Expand right as far as possible on this row
	let endX = startX;
	while (endX < tracker.width) {
		const cellIndex = startY * tracker.width + endX;
		const byteIndex = cellIndex >> 3;
		const bitIndex = cellIndex & 7;

		const dirtyByte = tracker.dirtyCells[byteIndex];
		const processedByte = processed[byteIndex];

		if (dirtyByte === undefined || processedByte === undefined) {
			break;
		}

		const isDirty = (dirtyByte & (1 << bitIndex)) !== 0;
		const isProcessed = (processedByte & (1 << bitIndex)) !== 0;

		if (!isDirty || isProcessed) {
			break;
		}

		endX++;
	}

	const width = endX - startX;
	if (width === 0) {
		return { x: startX, y: startY, width: 0, height: 0 };
	}

	// Expand down as far as possible while maintaining width
	let endY = startY;
	while (endY < tracker.height) {
		let rowValid = true;

		// Check if entire row segment is dirty and unprocessed
		for (let x = startX; x < endX; x++) {
			const cellIndex = endY * tracker.width + x;
			const byteIndex = cellIndex >> 3;
			const bitIndex = cellIndex & 7;

			const dirtyByte = tracker.dirtyCells[byteIndex];
			const processedByte = processed[byteIndex];

			if (dirtyByte === undefined || processedByte === undefined) {
				rowValid = false;
				break;
			}

			const isDirty = (dirtyByte & (1 << bitIndex)) !== 0;
			const isProcessed = (processedByte & (1 << bitIndex)) !== 0;

			if (!isDirty || isProcessed) {
				rowValid = false;
				break;
			}
		}

		if (!rowValid) {
			break;
		}

		endY++;
	}

	const height = endY - startY;

	// Mark all cells in rectangle as processed
	for (let y = startY; y < endY; y++) {
		for (let x = startX; x < endX; x++) {
			const cellIndex = y * tracker.width + x;
			const byteIndex = cellIndex >> 3;
			const bitIndex = cellIndex & 7;

			const byte = processed[byteIndex];
			if (byte !== undefined) {
				processed[byteIndex] = byte | (1 << bitIndex);
			}
		}
	}

	return { x: startX, y: startY, width, height };
}

/**
 * Coalesces overlapping or adjacent rectangles.
 * @internal
 */
function coalesceRegions(regions: DirtyRect[]): DirtyRect[] {
	if (regions.length < 2) {
		return regions;
	}

	// Sort by area (largest first) for better coalescing
	const sorted = [...regions].sort((a, b) => b.width * b.height - a.width * a.height);

	const result: DirtyRect[] = [];
	const used = new Set<number>();

	for (let i = 0; i < sorted.length; i++) {
		if (used.has(i)) {
			continue;
		}

		let current = sorted[i];
		if (!current) continue;

		used.add(i);

		// Try to merge with other rectangles
		let merged = true;
		while (merged) {
			merged = false;

			for (let j = i + 1; j < sorted.length; j++) {
				if (used.has(j)) {
					continue;
				}

				const other = sorted[j];
				if (!other) continue;

				// Check if rectangles can be merged (overlap or adjacent)
				if (canMergeRects(current, other)) {
					current = mergeRects(current, other);
					used.add(j);
					merged = true;
				}
			}
		}

		result.push(current);
	}

	return result;
}

/**
 * Checks if two rectangles can be merged.
 * @internal
 */
function canMergeRects(a: DirtyRect, b: DirtyRect): boolean {
	// Allow merging if they overlap or are adjacent (within 1 cell)
	const aRight = a.x + a.width;
	const aBottom = a.y + a.height;
	const bRight = b.x + b.width;
	const bBottom = b.y + b.height;

	// Check if they're within 1 cell of each other
	return !(b.x > aRight + 1 || bRight < a.x - 1 || b.y > aBottom + 1 || bBottom < a.y - 1);
}

/**
 * Merges two rectangles into their bounding box.
 * @internal
 */
function mergeRects(a: DirtyRect, b: DirtyRect): DirtyRect {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	const right = Math.max(a.x + a.width, b.x + b.width);
	const bottom = Math.max(a.y + a.height, b.y + b.height);

	return { x, y, width: right - x, height: bottom - y };
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

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

// =============================================================================
// FRAME MANAGEMENT
// =============================================================================

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
 * forceFullRedraw(tracker);
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
	for (const eid of tracker.entityBounds.keys()) {
		markEntityDirty(tracker, world, eid);
	}
}

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

/**
 * Checks if a region intersects any dirty region.
 *
 * @param tracker - The dirty tracker
 * @param x - Region X
 * @param y - Region Y
 * @param width - Region width
 * @param height - Region height
 * @returns true if region intersects dirty area
 */
export function regionIntersectsDirty(
	tracker: DirtyTrackerData,
	x: number,
	y: number,
	width: number,
	height: number,
): boolean {
	if (tracker.forceFullRedraw) {
		return true;
	}

	const regions = getDirtyRegions(tracker);
	for (const region of regions) {
		// Check for intersection
		if (
			x < region.x + region.width &&
			x + width > region.x &&
			y < region.y + region.height &&
			y + height > region.y
		) {
			return true;
		}
	}

	return false;
}

/**
 * Gets dirty regions clipped to a viewport.
 * Useful for rendering only visible dirty areas.
 *
 * @param tracker - The dirty tracker
 * @param viewX - Viewport X
 * @param viewY - Viewport Y
 * @param viewWidth - Viewport width
 * @param viewHeight - Viewport height
 * @returns Dirty regions clipped to viewport
 */
export function getDirtyRegionsInViewport(
	tracker: DirtyTrackerData,
	viewX: number,
	viewY: number,
	viewWidth: number,
	viewHeight: number,
): DirtyRect[] {
	const regions = getDirtyRegions(tracker);
	const clipped: DirtyRect[] = [];

	for (const region of regions) {
		// Calculate intersection
		const x1 = Math.max(region.x, viewX);
		const y1 = Math.max(region.y, viewY);
		const x2 = Math.min(region.x + region.width, viewX + viewWidth);
		const y2 = Math.min(region.y + region.height, viewY + viewHeight);

		if (x2 > x1 && y2 > y1) {
			clipped.push({
				x: x1,
				y: y1,
				width: x2 - x1,
				height: y2 - y1,
			});
		}
	}

	return clipped;
}
