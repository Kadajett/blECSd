/**
 * Tests for unified dirty tracking system
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Renderable } from '../components/renderable';
import { ComputedLayout } from '../systems/layoutSystem';
import {
	clearDirtyTracking,
	createDirtyTracker,
	type DirtyTracker,
	forceFullRedraw,
	getDirtyRegions,
	getDirtyTrackingStats,
	hasDirtyRegions,
	isCellDirty,
	markCellDirty,
	markEntityDirty,
	markRegionDirty,
	removeEntityFromTracking,
} from './dirtyTracking';
import { addComponent, addEntity } from './ecs';
import type { Entity, World } from './types';
import { createWorld } from './world';

describe('dirtyTracking', () => {
	let world: World;
	let tracker: DirtyTracker;

	beforeEach(() => {
		world = createWorld();
		tracker = createDirtyTracker(80, 24);
	});

	// Helper to create entity with valid layout
	function createEntityWithLayout(
		x: number,
		y: number,
		width: number,
		height: number,
		visible = true,
	): Entity {
		const eid = addEntity(world);
		addComponent(world, eid, Renderable);
		addComponent(world, eid, ComputedLayout);
		ComputedLayout.x[eid] = x;
		ComputedLayout.y[eid] = y;
		ComputedLayout.width[eid] = width;
		ComputedLayout.height[eid] = height;
		ComputedLayout.valid[eid] = 1;
		Renderable.visible[eid] = visible ? 1 : 0;
		return eid;
	}

	describe('createDirtyTracker', () => {
		it('should create tracker with correct dimensions', () => {
			expect(tracker.width).toBe(80);
			expect(tracker.height).toBe(24);
		});

		it('should initialize with no dirty cells', () => {
			expect(hasDirtyRegions(tracker)).toBe(false);
		});

		it('should initialize bitset with correct size', () => {
			const totalCells = 80 * 24;
			const bytesNeeded = Math.ceil(totalCells / 8);
			expect(tracker.dirtyCells.length).toBe(bytesNeeded);
		});

		it('should initialize with empty dirty entities set', () => {
			expect(tracker.dirtyEntities.size).toBe(0);
		});

		it('should initialize frame count to 0', () => {
			expect(tracker.frameCount).toBe(0);
		});
	});

	describe('markCellDirty', () => {
		it('should mark single cell as dirty', () => {
			markCellDirty(tracker, 10, 5);
			expect(isCellDirty(tracker, 10, 5)).toBe(true);
		});

		it('should not affect other cells', () => {
			markCellDirty(tracker, 10, 5);
			expect(isCellDirty(tracker, 11, 5)).toBe(false);
			expect(isCellDirty(tracker, 10, 6)).toBe(false);
		});

		it('should handle bounds checking', () => {
			markCellDirty(tracker, -1, 5);
			markCellDirty(tracker, 100, 5);
			markCellDirty(tracker, 10, -1);
			markCellDirty(tracker, 10, 50);
			// Should not crash or mark cells
			expect(hasDirtyRegions(tracker)).toBe(false);
		});

		it('should mark multiple cells independently', () => {
			markCellDirty(tracker, 0, 0);
			markCellDirty(tracker, 79, 23);
			markCellDirty(tracker, 40, 12);
			expect(isCellDirty(tracker, 0, 0)).toBe(true);
			expect(isCellDirty(tracker, 79, 23)).toBe(true);
			expect(isCellDirty(tracker, 40, 12)).toBe(true);
		});

		it('should set regionsStale flag', () => {
			tracker.regionsStale = false;
			markCellDirty(tracker, 10, 5);
			expect(tracker.regionsStale).toBe(true);
		});
	});

	describe('isCellDirty', () => {
		it('should return false for clean cells', () => {
			expect(isCellDirty(tracker, 10, 5)).toBe(false);
		});

		it('should return true for dirty cells', () => {
			markCellDirty(tracker, 10, 5);
			expect(isCellDirty(tracker, 10, 5)).toBe(true);
		});

		it('should handle out-of-bounds gracefully', () => {
			expect(isCellDirty(tracker, -1, 5)).toBe(false);
			expect(isCellDirty(tracker, 100, 5)).toBe(false);
			expect(isCellDirty(tracker, 10, -1)).toBe(false);
			expect(isCellDirty(tracker, 10, 50)).toBe(false);
		});
	});

	describe('markRegionDirty', () => {
		it('should mark rectangular region as dirty', () => {
			markRegionDirty(tracker, 10, 5, 5, 3);
			// Check all cells in region
			for (let y = 5; y < 8; y++) {
				for (let x = 10; x < 15; x++) {
					expect(isCellDirty(tracker, x, y)).toBe(true);
				}
			}
		});

		it('should not mark cells outside region', () => {
			markRegionDirty(tracker, 10, 5, 5, 3);
			expect(isCellDirty(tracker, 9, 5)).toBe(false);
			expect(isCellDirty(tracker, 15, 5)).toBe(false);
			expect(isCellDirty(tracker, 10, 4)).toBe(false);
			expect(isCellDirty(tracker, 10, 8)).toBe(false);
		});

		it('should clip region to screen bounds', () => {
			markRegionDirty(tracker, -5, -5, 20, 20);
			// Should only mark from (0,0) to (15,15)
			expect(isCellDirty(tracker, 0, 0)).toBe(true);
			expect(isCellDirty(tracker, 14, 14)).toBe(true);
		});

		it('should handle zero-size regions', () => {
			markRegionDirty(tracker, 10, 5, 0, 0);
			expect(hasDirtyRegions(tracker)).toBe(false);
		});

		it('should handle out-of-bounds regions', () => {
			markRegionDirty(tracker, 100, 100, 5, 5);
			expect(hasDirtyRegions(tracker)).toBe(false);
		});
	});

	describe('markEntityDirty', () => {
		it('should mark entity dirty and track bounds', () => {
			const eid = createEntityWithLayout(10, 5, 20, 10);
			markEntityDirty(tracker, world, eid);

			expect(tracker.dirtyEntities.has(eid)).toBe(true);
			expect(tracker.entityBoundsCache.has(eid)).toBe(true);
		});

		it('should mark entity bounds region dirty', () => {
			const eid = createEntityWithLayout(10, 5, 5, 3);
			markEntityDirty(tracker, world, eid);

			// Check cells in entity bounds are dirty
			expect(isCellDirty(tracker, 10, 5)).toBe(true);
			expect(isCellDirty(tracker, 14, 7)).toBe(true);
		});

		it('should track entity movement (mark old and new bounds)', () => {
			const eid = createEntityWithLayout(10, 5, 5, 3);

			// First mark
			markEntityDirty(tracker, world, eid);
			clearDirtyTracking(tracker);

			// Move entity
			ComputedLayout.x[eid] = 20;
			ComputedLayout.y[eid] = 10;

			// Second mark
			markEntityDirty(tracker, world, eid);

			// Both old and new positions should be dirty
			expect(isCellDirty(tracker, 10, 5)).toBe(true); // Old
			expect(isCellDirty(tracker, 20, 10)).toBe(true); // New
		});

		it('should handle entities without layout', () => {
			const eid = addEntity(world);
			addComponent(world, eid, Renderable);
			// No ComputedLayout component

			markEntityDirty(tracker, world, eid);

			expect(tracker.dirtyEntities.has(eid)).toBe(true);
			expect(tracker.entityBoundsCache.has(eid)).toBe(false);
		});

		it('should handle invisible entities', () => {
			const eid = createEntityWithLayout(10, 5, 5, 3, false);
			markEntityDirty(tracker, world, eid);

			// Entity tracked but region not marked dirty
			expect(tracker.dirtyEntities.has(eid)).toBe(true);
			expect(tracker.entityBoundsCache.has(eid)).toBe(true);
		});
	});

	describe('removeEntityFromTracking', () => {
		it('should remove entity from dirty set', () => {
			const eid = addEntity(world);
			tracker.dirtyEntities.add(eid);

			removeEntityFromTracking(world, tracker, eid);

			expect(tracker.dirtyEntities.has(eid)).toBe(false);
		});

		it('should remove entity from bounds cache', () => {
			const eid = createEntityWithLayout(10, 5, 5, 3);
			markEntityDirty(tracker, world, eid);
			removeEntityFromTracking(world, tracker, eid);

			expect(tracker.entityBoundsCache.has(eid)).toBe(false);
		});
	});

	describe('getDirtyRegions', () => {
		it('should return empty array when no dirty cells', () => {
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(0);
		});

		it('should return single region for single dirty cell', () => {
			markCellDirty(tracker, 10, 5);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 10, y: 5, width: 1, height: 1 });
		});

		it('should coalesce horizontal adjacent cells', () => {
			markCellDirty(tracker, 10, 5);
			markCellDirty(tracker, 11, 5);
			markCellDirty(tracker, 12, 5);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 10, y: 5, width: 3, height: 1 });
		});

		it('should coalesce rectangular regions', () => {
			markRegionDirty(tracker, 10, 5, 5, 3);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 10, y: 5, width: 5, height: 3 });
		});

		it('should return multiple regions for disconnected dirty areas', () => {
			markCellDirty(tracker, 10, 5);
			markCellDirty(tracker, 20, 10);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(2);
		});

		it('should cache regions when regionsStale is false', () => {
			markCellDirty(tracker, 10, 5);
			const regions1 = getDirtyRegions(tracker);
			const regions2 = getDirtyRegions(tracker);
			expect(regions1).toBe(regions2); // Same array reference
		});

		it('should recalculate when regionsStale is true', () => {
			markCellDirty(tracker, 10, 5);
			getDirtyRegions(tracker);
			markCellDirty(tracker, 20, 10);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(2);
		});

		it('should return full screen when forceFullRedraw is true', () => {
			forceFullRedraw(tracker);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 0, y: 0, width: 80, height: 24 });
		});
	});

	describe('hasDirtyRegions', () => {
		it('should return false when no dirty cells', () => {
			expect(hasDirtyRegions(tracker)).toBe(false);
		});

		it('should return true when cells are dirty', () => {
			markCellDirty(tracker, 10, 5);
			expect(hasDirtyRegions(tracker)).toBe(true);
		});

		it('should return true when entities are dirty', () => {
			const eid = addEntity(world);
			tracker.dirtyEntities.add(eid);
			expect(hasDirtyRegions(tracker)).toBe(true);
		});

		it('should return true when forceFullRedraw is true', () => {
			forceFullRedraw(tracker);
			expect(hasDirtyRegions(tracker)).toBe(true);
		});
	});

	describe('clearDirtyTracking', () => {
		it('should clear all dirty cells', () => {
			markCellDirty(tracker, 10, 5);
			markCellDirty(tracker, 20, 10);
			clearDirtyTracking(tracker);
			expect(hasDirtyRegions(tracker)).toBe(false);
		});

		it('should clear dirty entities', () => {
			const eid = addEntity(world);
			tracker.dirtyEntities.add(eid);
			clearDirtyTracking(tracker);
			expect(tracker.dirtyEntities.size).toBe(0);
		});

		it('should clear dirty regions', () => {
			markCellDirty(tracker, 10, 5);
			getDirtyRegions(tracker);
			clearDirtyTracking(tracker);
			expect(tracker.dirtyRegions.length).toBe(0);
		});

		it('should reset forceFullRedraw flag', () => {
			forceFullRedraw(tracker);
			clearDirtyTracking(tracker);
			expect(tracker.forceFullRedraw).toBe(false);
		});

		it('should increment frame count', () => {
			const before = tracker.frameCount;
			clearDirtyTracking(tracker);
			expect(tracker.frameCount).toBe(before + 1);
		});

		it('should not clear bounds cache', () => {
			const eid = createEntityWithLayout(10, 5, 5, 3);
			markEntityDirty(tracker, world, eid);
			clearDirtyTracking(tracker);

			// Bounds cache should persist across frames
			expect(tracker.entityBoundsCache.has(eid)).toBe(true);
		});
	});

	describe('forceFullRedraw', () => {
		it('should set forceFullRedraw flag', () => {
			forceFullRedraw(tracker);
			expect(tracker.forceFullRedraw).toBe(true);
		});

		it('should set regionsStale flag', () => {
			tracker.regionsStale = false;
			forceFullRedraw(tracker);
			expect(tracker.regionsStale).toBe(true);
		});

		it('should make getDirtyRegions return full screen', () => {
			forceFullRedraw(tracker);
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBe(1);
			expect(regions[0]).toEqual({ x: 0, y: 0, width: 80, height: 24 });
		});
	});

	describe('getDirtyTrackingStats', () => {
		it('should return zero stats for clean tracker', () => {
			const stats = getDirtyTrackingStats(tracker);
			expect(stats.dirtyCellCount).toBe(0);
			expect(stats.dirtyEntityCount).toBe(0);
			expect(stats.cachedEntityCount).toBe(0);
			expect(stats.frameCount).toBe(0);
		});

		it('should count dirty cells', () => {
			markCellDirty(tracker, 10, 5);
			markCellDirty(tracker, 20, 10);
			markCellDirty(tracker, 30, 15);
			const stats = getDirtyTrackingStats(tracker);
			expect(stats.dirtyCellCount).toBe(3);
		});

		it('should count dirty entities', () => {
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			tracker.dirtyEntities.add(eid1);
			tracker.dirtyEntities.add(eid2);
			const stats = getDirtyTrackingStats(tracker);
			expect(stats.dirtyEntityCount).toBe(2);
		});

		it('should count cached entities', () => {
			const eid1 = createEntityWithLayout(0, 0, 10, 10);
			const eid2 = createEntityWithLayout(10, 10, 10, 10);
			const eid3 = createEntityWithLayout(20, 20, 10, 10);

			markEntityDirty(tracker, world, eid1);
			markEntityDirty(tracker, world, eid2);
			markEntityDirty(tracker, world, eid3);

			const stats = getDirtyTrackingStats(tracker);
			expect(stats.cachedEntityCount).toBe(3);
		});

		it('should track frame count', () => {
			clearDirtyTracking(tracker);
			clearDirtyTracking(tracker);
			clearDirtyTracking(tracker);
			const stats = getDirtyTrackingStats(tracker);
			expect(stats.frameCount).toBe(3);
		});
	});

	describe('integration tests', () => {
		it('should handle typical render workflow', () => {
			// Create entities
			const box1 = createEntityWithLayout(10, 5, 20, 10);
			const box2 = createEntityWithLayout(40, 10, 15, 8);

			// Mark dirty
			markEntityDirty(tracker, world, box1);
			markEntityDirty(tracker, world, box2);

			// Get regions
			const regions = getDirtyRegions(tracker);
			expect(regions.length).toBeGreaterThan(0);

			// Clear after render
			clearDirtyTracking(tracker);
			expect(hasDirtyRegions(tracker)).toBe(false);

			// Bounds cache should persist
			expect(tracker.entityBoundsCache.has(box1)).toBe(true);
			expect(tracker.entityBoundsCache.has(box2)).toBe(true);
		});

		it('should handle entity movement across frames', () => {
			const box = createEntityWithLayout(10, 5, 5, 5);

			// Frame 1: initial render
			markEntityDirty(tracker, world, box);
			const regions1 = getDirtyRegions(tracker);
			expect(regions1.length).toBe(1);
			clearDirtyTracking(tracker);

			// Frame 2: move entity
			ComputedLayout.x[box] = 20;
			ComputedLayout.y[box] = 10;
			markEntityDirty(tracker, world, box);
			const regions2 = getDirtyRegions(tracker);
			// Should have regions for both old and new positions
			expect(regions2.length).toBeGreaterThan(0);

			// Both old and new positions should be covered
			let hasOld = false;
			let hasNew = false;
			for (const region of regions2) {
				if (
					region.x <= 10 &&
					10 < region.x + region.width &&
					region.y <= 5 &&
					5 < region.y + region.height
				) {
					hasOld = true;
				}
				if (
					region.x <= 20 &&
					20 < region.x + region.width &&
					region.y <= 10 &&
					10 < region.y + region.height
				) {
					hasNew = true;
				}
			}
			expect(hasOld).toBe(true);
			expect(hasNew).toBe(true);
		});

		it('should handle large number of entities', () => {
			const entities = [];
			for (let i = 0; i < 100; i++) {
				const x = (i % 10) * 8;
				const y = Math.floor(i / 10) * 2;
				const eid = createEntityWithLayout(x, y, 7, 1);
				entities.push(eid);
			}

			// Mark all entities dirty
			for (const eid of entities) {
				markEntityDirty(tracker, world, eid);
			}

			// Should coalesce into fewer regions
			const regions = getDirtyRegions(tracker);
			// With 100 entities in a grid pattern, expect significant coalescing
			expect(regions.length).toBeLessThanOrEqual(entities.length);
			expect(regions.length).toBeGreaterThan(0);

			const stats = getDirtyTrackingStats(tracker);
			expect(stats.dirtyEntityCount).toBe(100);
			expect(stats.cachedEntityCount).toBe(100);
		});
	});
});
