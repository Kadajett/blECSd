/**
 * Tests for Dirty Rectangle Tracking System
 *
 * @module core/dirtyRects.test
 */

import { addComponent, addEntity, createWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { ComputedLayout } from '../systems/layoutSystem';
import {
	clearDirtyTracking,
	createDirtyTracker,
	forceFullRedrawFlag,
	getDirtyEntities,
	getDirtyRegions,
	getDirtyRegionsInViewport,
	getDirtyStats,
	hasDirtyEntities,
	isCellDirty,
	isEntityDirty,
	markCellDirty,
	markEntityDirty,
	markRegionDirty,
	needsFullRedraw,
	regionIntersectsDirty,
	removeEntityFromTracking,
	resizeDirtyTracker,
	updateEntityBounds,
} from './dirtyRects';
import type { Entity, World } from './types';

// =============================================================================
// HELPERS
// =============================================================================

function createTestWorld(): World {
	return createWorld() as World;
}

function createEntityWithLayout(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
): Entity {
	const eid = addEntity(world) as Entity;
	addComponent(world, eid, ComputedLayout);
	ComputedLayout.x[eid] = x;
	ComputedLayout.y[eid] = y;
	ComputedLayout.width[eid] = width;
	ComputedLayout.height[eid] = height;
	ComputedLayout.valid[eid] = 1; // Required for hasComputedLayout to return true
	return eid;
}

// =============================================================================
// CREATION TESTS
// =============================================================================

describe('createDirtyTracker', () => {
	it('creates tracker with correct dimensions', () => {
		const tracker = createDirtyTracker(80, 24);

		expect(tracker.width).toBe(80);
		expect(tracker.height).toBe(24);
	});

	it('initializes with force full redraw on first frame', () => {
		const tracker = createDirtyTracker(80, 24);

		expect(tracker.forceFullRedraw).toBe(true);
		expect(needsFullRedraw(tracker)).toBe(true);
	});

	it('creates correct bitset size', () => {
		const tracker = createDirtyTracker(80, 24);
		const expectedCells = 80 * 24;
		const expectedBytes = Math.ceil(expectedCells / 8);

		expect(tracker.dirtyCells.length).toBe(expectedBytes);
	});

	it('starts with empty dirty entities', () => {
		const tracker = createDirtyTracker(80, 24);

		expect(tracker.dirtyEntities.size).toBe(0);
		expect(tracker.entityBounds.size).toBe(0);
	});
});

describe('resizeDirtyTracker', () => {
	it('creates new tracker with new dimensions', () => {
		const tracker = createDirtyTracker(80, 24);
		const resized = resizeDirtyTracker(tracker, 120, 40);

		expect(resized.width).toBe(120);
		expect(resized.height).toBe(40);
	});

	it('forces full redraw after resize', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker); // Clear initial full redraw

		const resized = resizeDirtyTracker(tracker, 120, 40);

		expect(resized.forceFullRedraw).toBe(true);
	});

	it('preserves entity bounds that fit', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		updateEntityBounds(tracker, world, eid, true);
		expect(tracker.entityBounds.size).toBe(1);

		const resized = resizeDirtyTracker(tracker, 120, 40);

		expect(resized.entityBounds.size).toBe(1);
		expect(resized.entityBounds.has(eid)).toBe(true);
	});
});

// =============================================================================
// CELL-LEVEL DIRTY TRACKING TESTS
// =============================================================================

describe('markCellDirty', () => {
	it('marks a single cell as dirty', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markCellDirty(tracker, 10, 5);

		expect(isCellDirty(tracker, 10, 5)).toBe(true);
	});

	it('does not mark out of bounds cells', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markCellDirty(tracker, -1, 5);
		markCellDirty(tracker, 80, 5);
		markCellDirty(tracker, 10, -1);
		markCellDirty(tracker, 10, 24);

		expect(isCellDirty(tracker, -1, 5)).toBe(false);
		expect(isCellDirty(tracker, 80, 5)).toBe(false);
	});

	it('marks tracker regions as stale', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);
		getDirtyRegions(tracker); // Cache regions
		tracker.regionsStale = false;

		markCellDirty(tracker, 10, 5);

		expect(tracker.regionsStale).toBe(true);
	});
});

describe('isCellDirty', () => {
	it('returns false for clean cells', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		expect(isCellDirty(tracker, 10, 5)).toBe(false);
	});

	it('returns false for out of bounds', () => {
		const tracker = createDirtyTracker(80, 24);

		expect(isCellDirty(tracker, -1, 0)).toBe(false);
		expect(isCellDirty(tracker, 100, 0)).toBe(false);
	});
});

describe('markRegionDirty', () => {
	it('marks all cells in region', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 3, 2);

		expect(isCellDirty(tracker, 10, 5)).toBe(true);
		expect(isCellDirty(tracker, 11, 5)).toBe(true);
		expect(isCellDirty(tracker, 12, 5)).toBe(true);
		expect(isCellDirty(tracker, 10, 6)).toBe(true);
		expect(isCellDirty(tracker, 11, 6)).toBe(true);
		expect(isCellDirty(tracker, 12, 6)).toBe(true);
	});

	it('does not mark outside region', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 3, 2);

		expect(isCellDirty(tracker, 9, 5)).toBe(false);
		expect(isCellDirty(tracker, 13, 5)).toBe(false);
		expect(isCellDirty(tracker, 10, 4)).toBe(false);
		expect(isCellDirty(tracker, 10, 7)).toBe(false);
	});

	it('clips to screen bounds', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		// Region extends past screen edge
		markRegionDirty(tracker, 78, 22, 5, 5);

		expect(isCellDirty(tracker, 79, 23)).toBe(true);
		expect(isCellDirty(tracker, 78, 22)).toBe(true);
	});

	it('handles empty regions', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 0, 0);
		markRegionDirty(tracker, 10, 5, -1, 3);

		expect(isCellDirty(tracker, 10, 5)).toBe(false);
	});
});

// =============================================================================
// ENTITY-LEVEL DIRTY TRACKING TESTS
// =============================================================================

describe('markEntityDirty', () => {
	it('adds entity to dirty set', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		markEntityDirty(tracker, world, eid);

		expect(isEntityDirty(tracker, eid)).toBe(true);
		expect(tracker.dirtyEntities.has(eid)).toBe(true);
	});

	it('marks entity region as dirty', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 3, 2);

		markEntityDirty(tracker, world, eid);

		expect(isCellDirty(tracker, 10, 5)).toBe(true);
		expect(isCellDirty(tracker, 12, 6)).toBe(true);
	});

	it('marks both old and new positions when entity moves', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 3, 2);

		// First frame - establish bounds
		markEntityDirty(tracker, world, eid);
		updateEntityBounds(tracker, world, eid, true);
		clearDirtyTracking(tracker);

		// Move entity
		ComputedLayout.x[eid] = 20;
		ComputedLayout.y[eid] = 10;
		markEntityDirty(tracker, world, eid);

		// Old position should be dirty
		expect(isCellDirty(tracker, 10, 5)).toBe(true);
		// New position should be dirty
		expect(isCellDirty(tracker, 20, 10)).toBe(true);
	});
});

describe('updateEntityBounds', () => {
	it('caches entity bounds', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		updateEntityBounds(tracker, world, eid, true);

		expect(tracker.entityBounds.has(eid)).toBe(true);
		const bounds = tracker.entityBounds.get(eid);
		expect(bounds?.prevX).toBe(10);
		expect(bounds?.prevY).toBe(5);
		expect(bounds?.prevWidth).toBe(20);
		expect(bounds?.prevHeight).toBe(10);
		expect(bounds?.wasVisible).toBe(true);
	});

	it('removes entity without layout from cache', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = addEntity(world) as Entity;
		// No ComputedLayout added

		updateEntityBounds(tracker, world, eid, true);

		expect(tracker.entityBounds.has(eid)).toBe(false);
	});
});

describe('removeEntityFromTracking', () => {
	it('removes entity from tracking', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		markEntityDirty(tracker, world, eid);
		updateEntityBounds(tracker, world, eid, true);

		expect(tracker.dirtyEntities.has(eid)).toBe(true);
		expect(tracker.entityBounds.has(eid)).toBe(true);

		removeEntityFromTracking(tracker, eid);

		expect(tracker.dirtyEntities.has(eid)).toBe(false);
		expect(tracker.entityBounds.has(eid)).toBe(false);
	});

	it('marks previous bounds as dirty when removing visible entity', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 3, 2);

		updateEntityBounds(tracker, world, eid, true);
		clearDirtyTracking(tracker);

		removeEntityFromTracking(tracker, eid);

		// Old position should be marked dirty
		expect(isCellDirty(tracker, 10, 5)).toBe(true);
	});
});

// =============================================================================
// REGION COALESCING TESTS
// =============================================================================

describe('getDirtyRegions', () => {
	it('returns full screen region on first frame', () => {
		const tracker = createDirtyTracker(80, 24);

		const regions = getDirtyRegions(tracker);

		expect(regions.length).toBe(1);
		expect(regions[0]).toEqual({ x: 0, y: 0, width: 80, height: 24 });
	});

	it('returns empty array when no dirty cells', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		const regions = getDirtyRegions(tracker);

		expect(regions.length).toBe(0);
	});

	it('creates region for dirty cells', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 3, 2);

		const regions = getDirtyRegions(tracker);

		expect(regions.length).toBe(1);
		expect(regions[0]?.x).toBe(10);
		expect(regions[0]?.y).toBe(5);
		expect(regions[0]?.width).toBe(3);
		expect(regions[0]?.height).toBe(2);
	});

	it('coalesces adjacent regions', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		// Two adjacent regions
		markRegionDirty(tracker, 10, 5, 3, 2);
		markRegionDirty(tracker, 13, 5, 3, 2); // Adjacent

		const regions = getDirtyRegions(tracker);

		// Should be merged into one
		expect(regions.length).toBe(1);
		expect(regions[0]?.width).toBe(6); // Combined width
	});

	it('keeps separate regions when far apart', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 3, 2);
		markRegionDirty(tracker, 50, 15, 3, 2); // Far away

		const regions = getDirtyRegions(tracker);

		expect(regions.length).toBe(2);
	});

	it('caches regions until stale', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 3, 2);

		const regions1 = getDirtyRegions(tracker);
		const regions2 = getDirtyRegions(tracker);

		// Should be same cached array
		expect(regions1).toBe(regions2);
	});
});

// =============================================================================
// QUERY FUNCTION TESTS
// =============================================================================

describe('hasDirtyEntities', () => {
	it('returns true when force full redraw', () => {
		const tracker = createDirtyTracker(80, 24);

		expect(hasDirtyEntities(tracker)).toBe(true);
	});

	it('returns true when entities are dirty', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		markEntityDirty(tracker, world, eid);

		expect(hasDirtyEntities(tracker)).toBe(true);
	});

	it('returns false when nothing is dirty', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		expect(hasDirtyEntities(tracker)).toBe(false);
	});
});

describe('getDirtyStats', () => {
	it('returns correct statistics', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 10, 5);

		markEntityDirty(tracker, world, eid);
		updateEntityBounds(tracker, world, eid, true);

		const stats = getDirtyStats(tracker);

		expect(stats.dirtyEntityCount).toBe(1);
		expect(stats.dirtyRegionCount).toBe(1);
		expect(stats.dirtyArea).toBe(50); // 10 * 5
		expect(stats.dirtyPercent).toBeCloseTo(2.6, 1); // 50 / 1920 * 100
		expect(stats.fullRedraw).toBe(false);
		expect(stats.trackedEntityCount).toBe(1);
	});

	it('shows full redraw statistics', () => {
		const tracker = createDirtyTracker(80, 24);

		const stats = getDirtyStats(tracker);

		expect(stats.fullRedraw).toBe(true);
		expect(stats.dirtyArea).toBe(80 * 24);
		expect(stats.dirtyPercent).toBe(100);
	});
});

describe('getDirtyEntities', () => {
	it('returns set of dirty entities', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid1 = createEntityWithLayout(world, 10, 5, 20, 10);
		const eid2 = createEntityWithLayout(world, 40, 10, 20, 10);

		markEntityDirty(tracker, world, eid1);
		markEntityDirty(tracker, world, eid2);

		const entities = getDirtyEntities(tracker);

		expect(entities.size).toBe(2);
		expect(entities.has(eid1)).toBe(true);
		expect(entities.has(eid2)).toBe(true);
	});
});

// =============================================================================
// FRAME MANAGEMENT TESTS
// =============================================================================

describe('clearDirtyTracking', () => {
	it('clears all dirty state', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		markEntityDirty(tracker, world, eid);
		markCellDirty(tracker, 50, 15);

		clearDirtyTracking(tracker);

		expect(hasDirtyEntities(tracker)).toBe(false);
		expect(isCellDirty(tracker, 10, 5)).toBe(false);
		expect(isCellDirty(tracker, 50, 15)).toBe(false);
		expect(tracker.forceFullRedraw).toBe(false);
	});

	it('increments frame counter', () => {
		const tracker = createDirtyTracker(80, 24);
		const initialFrame = tracker.frameCount;

		clearDirtyTracking(tracker);

		expect(tracker.frameCount).toBe(initialFrame + 1);
	});

	it('preserves entity bounds cache', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 20, 10);

		updateEntityBounds(tracker, world, eid, true);
		clearDirtyTracking(tracker);

		expect(tracker.entityBounds.has(eid)).toBe(true);
	});
});

describe('forceFullRedrawFlag', () => {
	it('sets force full redraw flag', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		expect(needsFullRedraw(tracker)).toBe(false);

		forceFullRedrawFlag(tracker);

		expect(needsFullRedraw(tracker)).toBe(true);
	});
});

// =============================================================================
// INTEGRATION HELPER TESTS
// =============================================================================

describe('regionIntersectsDirty', () => {
	it('returns true when full redraw needed', () => {
		const tracker = createDirtyTracker(80, 24);

		expect(regionIntersectsDirty(tracker, 10, 5, 20, 10)).toBe(true);
	});

	it('returns true when region intersects dirty area', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 10, 5);

		// Overlapping region
		expect(regionIntersectsDirty(tracker, 15, 7, 10, 5)).toBe(true);
	});

	it('returns false when region does not intersect', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		markRegionDirty(tracker, 10, 5, 10, 5);

		// Non-overlapping region
		expect(regionIntersectsDirty(tracker, 50, 15, 10, 5)).toBe(false);
	});
});

describe('getDirtyRegionsInViewport', () => {
	it('clips dirty regions to viewport', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		// Dirty region partially in viewport
		markRegionDirty(tracker, 5, 5, 20, 10);

		// Viewport that clips the region
		const clipped = getDirtyRegionsInViewport(tracker, 10, 8, 10, 5);

		expect(clipped.length).toBe(1);
		expect(clipped[0]?.x).toBe(10);
		expect(clipped[0]?.y).toBe(8);
		expect(clipped[0]?.width).toBe(10);
		expect(clipped[0]?.height).toBe(5);
	});

	it('excludes regions outside viewport', () => {
		const tracker = createDirtyTracker(80, 24);
		clearDirtyTracking(tracker);

		// Dirty region outside viewport
		markRegionDirty(tracker, 50, 15, 10, 5);

		// Viewport that doesn't contain the region
		const clipped = getDirtyRegionsInViewport(tracker, 0, 0, 20, 10);

		expect(clipped.length).toBe(0);
	});
});

// =============================================================================
// PERFORMANCE SCENARIO TESTS
// =============================================================================

describe('Performance Scenarios', () => {
	it('static screen has no dirty regions after clear', () => {
		const tracker = createDirtyTracker(80, 24);

		// First frame - full redraw
		clearDirtyTracking(tracker);

		// Second frame - nothing changed
		const regions = getDirtyRegions(tracker);

		expect(regions.length).toBe(0);
		expect(hasDirtyEntities(tracker)).toBe(false);
	});

	it('moving single entity only dirties affected cells', () => {
		const tracker = createDirtyTracker(80, 24);
		const world = createTestWorld();
		const eid = createEntityWithLayout(world, 10, 5, 5, 3);

		// Frame 1: Initial render
		markEntityDirty(tracker, world, eid);
		updateEntityBounds(tracker, world, eid, true);
		clearDirtyTracking(tracker);

		// Frame 2: Move entity
		ComputedLayout.x[eid] = 20;
		ComputedLayout.y[eid] = 10;
		markEntityDirty(tracker, world, eid);

		const stats = getDirtyStats(tracker);

		// Should only dirty old position (15 cells) + new position (15 cells) = 30 max
		// Actual might be less if coalesced, but definitely not full screen
		expect(stats.dirtyArea).toBeLessThan(80 * 24);
		expect(stats.dirtyPercent).toBeLessThan(5); // Should be small percentage
	});

	it('handles many entities efficiently', () => {
		const tracker = createDirtyTracker(200, 100);
		const world = createTestWorld();

		// Create 1000 entities
		const entities: Entity[] = [];
		for (let i = 0; i < 1000; i++) {
			const x = (i * 17) % 190;
			const y = (i * 7) % 95;
			entities.push(createEntityWithLayout(world, x, y, 5, 3));
		}

		// Mark all dirty and update bounds
		for (const eid of entities) {
			markEntityDirty(tracker, world, eid);
			updateEntityBounds(tracker, world, eid, true);
		}

		const stats = getDirtyStats(tracker);

		expect(stats.dirtyEntityCount).toBe(1000);
		expect(stats.trackedEntityCount).toBe(1000);
	});
});
