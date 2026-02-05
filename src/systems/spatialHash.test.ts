/**
 * Tests for spatial hash grid collision optimization.
 * @module systems/spatialHash.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Collider } from '../components/collision';
import { Position } from '../components/position';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import type { Entity } from '../core/types';
import {
	clearSpatialHash,
	createSpatialHash,
	DEFAULT_CELL_SIZE,
	getEntitiesAtPoint,
	getEntitiesInCell,
	getNearbyEntities,
	getSpatialHashStats,
	insertEntity,
	queryArea,
	rebuildSpatialHash,
	removeEntityFromGrid,
	type SpatialHashGrid,
	setSpatialHashGrid,
	spatialHashSystem,
	worldToCell,
} from './spatialHash';

describe('spatialHash', () => {
	let grid: SpatialHashGrid;

	beforeEach(() => {
		grid = createSpatialHash({ cellSize: 8 });
	});

	// =========================================================================
	// createSpatialHash
	// =========================================================================

	describe('createSpatialHash', () => {
		it('creates a grid with specified cell size', () => {
			const g = createSpatialHash({ cellSize: 4 });
			expect(g.cellSize).toBe(4);
			expect(g.cells.size).toBe(0);
			expect(g.entityCells.size).toBe(0);
		});

		it('uses default cell size when not specified', () => {
			const g = createSpatialHash();
			expect(g.cellSize).toBe(DEFAULT_CELL_SIZE);
		});
	});

	// =========================================================================
	// worldToCell
	// =========================================================================

	describe('worldToCell', () => {
		it('maps world coordinates to cell coordinates', () => {
			const cell = worldToCell(grid, 15, 23);
			expect(cell.cx).toBe(1); // 15 / 8 = 1.875 -> floor = 1
			expect(cell.cy).toBe(2); // 23 / 8 = 2.875 -> floor = 2
		});

		it('handles zero coordinates', () => {
			const cell = worldToCell(grid, 0, 0);
			expect(cell.cx).toBe(0);
			expect(cell.cy).toBe(0);
		});

		it('handles negative coordinates', () => {
			const cell = worldToCell(grid, -5, -10);
			expect(cell.cx).toBe(-1);
			expect(cell.cy).toBe(-2);
		});
	});

	// =========================================================================
	// insertEntity / removeEntityFromGrid
	// =========================================================================

	describe('insertEntity', () => {
		it('inserts an entity into the grid', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
			expect(stats.cellCount).toBe(1);
		});

		it('inserts entity spanning multiple cells', () => {
			// Entity from (6,6) to (18,18) with cell size 8
			// Spans cells (0,0), (0,1), (1,0), (1,1), (2,0), (2,1), (0,2), (1,2), (2,2)
			insertEntity(grid, 1 as Entity, 0, 0, 17, 17);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
			expect(stats.cellCount).toBeGreaterThan(1);
		});

		it('updates position on re-insert', () => {
			insertEntity(grid, 1 as Entity, 0, 0, 1, 1);
			const nearby1 = getEntitiesAtPoint(grid, 0, 0);
			expect(nearby1.has(1)).toBe(true);

			insertEntity(grid, 1 as Entity, 20, 20, 1, 1);
			const nearbyOld = getEntitiesAtPoint(grid, 0, 0);
			expect(nearbyOld.has(1)).toBe(false);

			const nearbyNew = getEntitiesAtPoint(grid, 20, 20);
			expect(nearbyNew.has(1)).toBe(true);
		});
	});

	describe('removeEntityFromGrid', () => {
		it('removes an entity from the grid', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			removeEntityFromGrid(grid, 1 as Entity);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(0);
			expect(stats.cellCount).toBe(0);
		});

		it('is a no-op for non-existent entities', () => {
			removeEntityFromGrid(grid, 999 as Entity);
			// Should not throw
		});
	});

	// =========================================================================
	// queryArea
	// =========================================================================

	describe('queryArea', () => {
		it('finds entities in the queried area', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(grid, 2 as Entity, 20, 20, 1, 1);

			const results = queryArea(grid, 0, 0, 8, 8);
			expect(results.has(1)).toBe(true);
			expect(results.has(2)).toBe(false);
		});

		it('returns empty set for empty area', () => {
			const results = queryArea(grid, 100, 100, 1, 1);
			expect(results.size).toBe(0);
		});

		it('finds entities across multiple cells', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(grid, 2 as Entity, 12, 4, 1, 1);

			// Query area spanning both cells
			const results = queryArea(grid, 0, 0, 16, 8);
			expect(results.has(1)).toBe(true);
			expect(results.has(2)).toBe(true);
		});
	});

	// =========================================================================
	// getNearbyEntities
	// =========================================================================

	describe('getNearbyEntities', () => {
		it('finds entities in same cell', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(grid, 2 as Entity, 5, 5, 1, 1);
			insertEntity(grid, 3 as Entity, 20, 20, 1, 1);

			const nearby = getNearbyEntities(grid, 1 as Entity);
			expect(nearby.has(2)).toBe(true);
			expect(nearby.has(3)).toBe(false);
		});

		it('excludes the queried entity itself', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			const nearby = getNearbyEntities(grid, 1 as Entity);
			expect(nearby.has(1)).toBe(false);
		});

		it('returns empty set for unknown entity', () => {
			const nearby = getNearbyEntities(grid, 999 as Entity);
			expect(nearby.size).toBe(0);
		});
	});

	// =========================================================================
	// getEntitiesInCell / getEntitiesAtPoint
	// =========================================================================

	describe('getEntitiesInCell', () => {
		it('returns entities in a specific cell', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			const entities = getEntitiesInCell(grid, 0, 0);
			expect(entities.has(1)).toBe(true);
		});

		it('returns empty set for empty cell', () => {
			const entities = getEntitiesInCell(grid, 99, 99);
			expect(entities.size).toBe(0);
		});
	});

	describe('getEntitiesAtPoint', () => {
		it('returns entities at a world point', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			const entities = getEntitiesAtPoint(grid, 4, 4);
			expect(entities.has(1)).toBe(true);
		});
	});

	// =========================================================================
	// clearSpatialHash / getSpatialHashStats
	// =========================================================================

	describe('clearSpatialHash', () => {
		it('removes all entities from the grid', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(grid, 2 as Entity, 20, 20, 1, 1);
			clearSpatialHash(grid);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(0);
			expect(stats.cellCount).toBe(0);
		});
	});

	describe('getSpatialHashStats', () => {
		it('returns correct statistics', () => {
			insertEntity(grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(grid, 2 as Entity, 5, 5, 1, 1);
			insertEntity(grid, 3 as Entity, 20, 20, 1, 1);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(3);
			expect(stats.cellCount).toBe(2); // Two different cells
			expect(stats.maxEntitiesInCell).toBe(2);
			expect(stats.averageEntitiesPerCell).toBeCloseTo(1.5);
		});

		it('returns zeros for empty grid', () => {
			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(0);
			expect(stats.cellCount).toBe(0);
			expect(stats.averageEntitiesPerCell).toBe(0);
			expect(stats.maxEntitiesInCell).toBe(0);
		});
	});

	// =========================================================================
	// rebuildSpatialHash
	// =========================================================================

	describe('rebuildSpatialHash', () => {
		it('rebuilds from world entities with Position and Collider', () => {
			const world = createWorld();

			const eid1 = addEntity(world);
			addComponent(world, eid1, Position);
			addComponent(world, eid1, Collider);
			Position.x[eid1] = 4;
			Position.y[eid1] = 4;
			Collider.width[eid1] = 2;
			Collider.height[eid1] = 2;
			Collider.offsetX[eid1] = 0;
			Collider.offsetY[eid1] = 0;

			const eid2 = addEntity(world);
			addComponent(world, eid2, Position);
			addComponent(world, eid2, Collider);
			Position.x[eid2] = 20;
			Position.y[eid2] = 20;
			Collider.width[eid2] = 1;
			Collider.height[eid2] = 1;
			Collider.offsetX[eid2] = 0;
			Collider.offsetY[eid2] = 0;

			rebuildSpatialHash(grid, world);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(2);
		});
	});

	// =========================================================================
	// spatialHashSystem
	// =========================================================================

	describe('spatialHashSystem', () => {
		it('rebuilds the grid when system is run', () => {
			const world = createWorld();

			const eid = addEntity(world);
			addComponent(world, eid, Position);
			addComponent(world, eid, Collider);
			Position.x[eid] = 4;
			Position.y[eid] = 4;
			Collider.width[eid] = 1;
			Collider.height[eid] = 1;
			Collider.offsetX[eid] = 0;
			Collider.offsetY[eid] = 0;

			setSpatialHashGrid(grid);
			spatialHashSystem(world);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
		});
	});
});
