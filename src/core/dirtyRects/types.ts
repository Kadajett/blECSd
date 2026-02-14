/**
 * Type definitions for dirty rectangle tracking.
 * @module core/dirtyRects/types
 */

import type { ComponentStore } from '../../utils/componentStorage';
import type { Entity } from '../types';

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
export interface EntityBoundsEntry {
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
	/** Previous bounds for each entity, backed by ComponentStore for cache-friendly iteration */
	readonly entityBounds: ComponentStore<EntityBoundsEntry>;
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
