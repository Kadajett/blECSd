/**
 * Tests for spatial hash grid collision optimization.
 * @module systems/spatialHash.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Collider } from '../components/collision';
import { Position } from '../components/position';
import { addComponent, addEntity, createWorld, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	clearSpatialHash,
	createSpatialHash,
	createSpatialHashSystemState,
	DEFAULT_CELL_SIZE,
	getEntitiesAtPoint,
	getEntitiesInCell,
	getNearbyEntities,
	getSpatialDirtyCount,
	getSpatialHashStats,
	getSpatialHashSystemState,
	incrementalSpatialUpdate,
	insertEntity,
	markSpatialDirty,
	queryArea,
	rebuildSpatialHash,
	removeEntityFromGrid,
	resetSpatialHashState,
	type SpatialHashGrid,
	type SpatialHashSystemState,
	setSpatialDirtyThreshold,
	setSpatialHashGrid,
	spatialHashSystem,
	worldToCell,
} from './spatialHash';

/** Helper: create an entity with Position + Collider at a given position/size. */
function createCollidable(
	world: World,
	x: number,
	y: number,
	w = 1,
	h = 1,
	ox = 0,
	oy = 0,
): Entity {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Collider);
	Position.x[eid] = x;
	Position.y[eid] = y;
	Collider.width[eid] = w;
	Collider.height[eid] = h;
	Collider.offsetX[eid] = ox;
	Collider.offsetY[eid] = oy;
	return eid as Entity;
}

describe('spatialHash', () => {
	let grid: SpatialHashGrid;
	let world: World;

	beforeEach(() => {
		grid = createSpatialHash({ cellSize: 8 });
		world = createWorld();
		resetSpatialHashState();
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
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
			expect(stats.cellCount).toBe(1);
		});

		it('inserts entity spanning multiple cells', () => {
			// Entity from (0,0) to (17,17) with cell size 8
			insertEntity(world, grid, 1 as Entity, 0, 0, 17, 17);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
			expect(stats.cellCount).toBeGreaterThan(1);
		});

		it('updates position on re-insert', () => {
			insertEntity(world, grid, 1 as Entity, 0, 0, 1, 1);
			const nearby1 = getEntitiesAtPoint(grid, 0, 0);
			expect(nearby1.has(1)).toBe(true);

			insertEntity(world, grid, 1 as Entity, 20, 20, 1, 1);
			const nearbyOld = getEntitiesAtPoint(grid, 0, 0);
			expect(nearbyOld.has(1)).toBe(false);

			const nearbyNew = getEntitiesAtPoint(grid, 20, 20);
			expect(nearbyNew.has(1)).toBe(true);
		});
	});

	describe('removeEntityFromGrid', () => {
		it('removes an entity from the grid', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			removeEntityFromGrid(world, grid, 1 as Entity);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(0);
			expect(stats.cellCount).toBe(0);
		});

		it('is a no-op for non-existent entities', () => {
			removeEntityFromGrid(world, grid, 999 as Entity);
			// Should not throw
		});
	});

	// =========================================================================
	// queryArea
	// =========================================================================

	describe('queryArea', () => {
		it('finds entities in the queried area', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(world, grid, 2 as Entity, 20, 20, 1, 1);

			const results = queryArea(grid, 0, 0, 8, 8);
			expect(results.has(1)).toBe(true);
			expect(results.has(2)).toBe(false);
		});

		it('returns empty set for empty area', () => {
			const results = queryArea(grid, 100, 100, 1, 1);
			expect(results.size).toBe(0);
		});

		it('finds entities across multiple cells', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(world, grid, 2 as Entity, 12, 4, 1, 1);

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
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(world, grid, 2 as Entity, 5, 5, 1, 1);
			insertEntity(world, grid, 3 as Entity, 20, 20, 1, 1);

			const nearby = getNearbyEntities(world, grid, 1 as Entity);
			expect(nearby.has(2)).toBe(true);
			expect(nearby.has(3)).toBe(false);
		});

		it('excludes the queried entity itself', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			const nearby = getNearbyEntities(world, grid, 1 as Entity);
			expect(nearby.has(1)).toBe(false);
		});

		it('returns empty set for unknown entity', () => {
			const nearby = getNearbyEntities(world, grid, 999 as Entity);
			expect(nearby.size).toBe(0);
		});
	});

	// =========================================================================
	// getEntitiesInCell / getEntitiesAtPoint
	// =========================================================================

	describe('getEntitiesInCell', () => {
		it('returns entities in a specific cell', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
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
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			const entities = getEntitiesAtPoint(grid, 4, 4);
			expect(entities.has(1)).toBe(true);
		});
	});

	// =========================================================================
	// clearSpatialHash / getSpatialHashStats
	// =========================================================================

	describe('clearSpatialHash', () => {
		it('removes all entities from the grid', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(world, grid, 2 as Entity, 20, 20, 1, 1);
			clearSpatialHash(grid);

			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(0);
			expect(stats.cellCount).toBe(0);
		});
	});

	describe('getSpatialHashStats', () => {
		it('returns correct statistics', () => {
			insertEntity(world, grid, 1 as Entity, 4, 4, 1, 1);
			insertEntity(world, grid, 2 as Entity, 5, 5, 1, 1);
			insertEntity(world, grid, 3 as Entity, 20, 20, 1, 1);

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
	// spatialHashSystem (uses incremental updates)
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

	// =========================================================================
	// Incremental update system state
	// =========================================================================

	describe('createSpatialHashSystemState', () => {
		it('creates state with default threshold', () => {
			const state = createSpatialHashSystemState();
			expect(state.dirtyEntities.size).toBe(0);
			expect(state.dirtyLookup.size).toBe(0);
			expect(state.prevBounds.size).toBe(0);
			expect(state.initialized).toBe(false);
			expect(state.dirtyThreshold).toBe(0.5);
		});

		it('creates state with custom threshold', () => {
			const state = createSpatialHashSystemState(0.25);
			expect(state.dirtyThreshold).toBe(0.25);
		});
	});

	describe('markSpatialDirty / getSpatialDirtyCount', () => {
		it('marks an entity as dirty', () => {
			expect(getSpatialDirtyCount()).toBe(0);
			markSpatialDirty(world,42 as Entity);
			expect(getSpatialDirtyCount()).toBe(1);
		});

		it('deduplicates repeated marks for the same entity', () => {
			markSpatialDirty(world,10 as Entity);
			markSpatialDirty(world,10 as Entity);
			markSpatialDirty(world,10 as Entity);
			expect(getSpatialDirtyCount()).toBe(1);
		});

		it('tracks multiple distinct entities', () => {
			markSpatialDirty(world,1 as Entity);
			markSpatialDirty(world,2 as Entity);
			markSpatialDirty(world,3 as Entity);
			expect(getSpatialDirtyCount()).toBe(3);
		});
	});

	describe('resetSpatialHashState', () => {
		it('clears dirty entities and position cache', () => {
			markSpatialDirty(world,1 as Entity);
			markSpatialDirty(world,2 as Entity);
			const state = getSpatialHashSystemState();
			state.prevBounds.set(1 as Entity, { x: 10, y: 0, w: 0, h: 0 });
			state.initialized = true;

			resetSpatialHashState();

			expect(getSpatialDirtyCount()).toBe(0);
			const newState = getSpatialHashSystemState();
			expect(newState.prevBounds.size).toBe(0);
			expect(newState.initialized).toBe(false);
		});

		it('preserves the dirty threshold across resets', () => {
			setSpatialDirtyThreshold(0.25);
			resetSpatialHashState();
			const state = getSpatialHashSystemState();
			expect(state.dirtyThreshold).toBe(0.25);
		});
	});

	describe('setSpatialDirtyThreshold', () => {
		it('sets the threshold', () => {
			setSpatialDirtyThreshold(0.3);
			expect(getSpatialHashSystemState().dirtyThreshold).toBe(0.3);
		});

		it('clamps threshold to [0, 1]', () => {
			setSpatialDirtyThreshold(-0.5);
			expect(getSpatialHashSystemState().dirtyThreshold).toBe(0);

			setSpatialDirtyThreshold(2.0);
			expect(getSpatialHashSystemState().dirtyThreshold).toBe(1);
		});
	});

	// =========================================================================
	// incrementalSpatialUpdate
	// =========================================================================

	describe('incrementalSpatialUpdate', () => {
		let world: World;
		let state: SpatialHashSystemState;

		beforeEach(() => {
			world = createWorld();
			state = createSpatialHashSystemState();
		});

		it('performs full rebuild on first frame (uninitialized)', () => {
			const eid = createCollidable(world, 4, 4, 2, 2);

			incrementalSpatialUpdate(grid, state, world);

			expect(state.initialized).toBe(true);
			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
			// Position cache populated
			expect(state.prevBounds.has(eid)).toBe(true);
		});

		it('detects moved entities and re-hashes them incrementally', () => {
			const eid = createCollidable(world, 4, 4, 1, 1);

			// First frame: full rebuild
			incrementalSpatialUpdate(grid, state, world);

			// Verify entity is at original position
			let at44 = getEntitiesAtPoint(grid, 4, 4);
			expect(at44.has(eid as number)).toBe(true);

			// Move entity
			Position.x[eid] = 20;
			Position.y[eid] = 20;

			// Second frame: incremental update
			incrementalSpatialUpdate(grid, state, world);

			// Entity should be at new position
			at44 = getEntitiesAtPoint(grid, 4, 4);
			expect(at44.has(eid as number)).toBe(false);

			const at2020 = getEntitiesAtPoint(grid, 20, 20);
			expect(at2020.has(eid as number)).toBe(true);
		});

		it('does not re-hash entities that did not move', () => {
			const eid1 = createCollidable(world, 4, 4, 1, 1);
			const eid2 = createCollidable(world, 20, 20, 1, 1);

			// First frame
			incrementalSpatialUpdate(grid, state, world);

			// Second frame: nothing moved
			incrementalSpatialUpdate(grid, state, world);

			// Dirty set should be clear (was cleared at end of frame)
			expect(state.dirtyEntities.size).toBe(0);

			// Both still in the grid
			expect(getEntitiesAtPoint(grid, 4, 4).has(eid1 as number)).toBe(true);
			expect(getEntitiesAtPoint(grid, 20, 20).has(eid2 as number)).toBe(true);
		});

		it('detects new entities added after initialization', () => {
			const eid1 = createCollidable(world, 4, 4, 1, 1);

			// First frame
			incrementalSpatialUpdate(grid, state, world);
			expect(getSpatialHashStats(grid).entityCount).toBe(1);

			// Add a new entity
			const eid2 = createCollidable(world, 16, 16, 1, 1);

			// Second frame: should detect new entity
			incrementalSpatialUpdate(grid, state, world);

			expect(getSpatialHashStats(grid).entityCount).toBe(2);
			expect(getEntitiesAtPoint(grid, 16, 16).has(eid2 as number)).toBe(true);
			expect(getEntitiesAtPoint(grid, 4, 4).has(eid1 as number)).toBe(true);
		});

		it('removes stale entities that lost Position+Collider', () => {
			const eid1 = createCollidable(world, 4, 4, 1, 1);
			const eid2 = createCollidable(world, 20, 20, 1, 1);

			// First frame
			incrementalSpatialUpdate(grid, state, world);
			expect(getSpatialHashStats(grid).entityCount).toBe(2);

			// Remove eid2 from the world
			removeEntity(world, eid2);

			// Second frame: should detect stale entity
			incrementalSpatialUpdate(grid, state, world);

			expect(getSpatialHashStats(grid).entityCount).toBe(1);
			expect(getEntitiesAtPoint(grid, 20, 20).has(eid2 as number)).toBe(false);
			expect(getEntitiesAtPoint(grid, 4, 4).has(eid1 as number)).toBe(true);
		});

		it('falls back to full rebuild when dirty fraction exceeds threshold', () => {
			// Set very low threshold: any dirty entity triggers rebuild
			state.dirtyThreshold = 0.0;

			const eid1 = createCollidable(world, 4, 4, 1, 1);
			createCollidable(world, 20, 20, 1, 1);

			// First frame: full rebuild (init)
			incrementalSpatialUpdate(grid, state, world);

			// Move one entity
			Position.x[eid1] = 12;

			// Second frame: dirty fraction (1/2 = 0.5) > threshold (0.0) => full rebuild
			incrementalSpatialUpdate(grid, state, world);

			// Still correctly placed after rebuild
			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(2);
			expect(getEntitiesAtPoint(grid, 12, 4).has(eid1 as number)).toBe(true);
		});

		it('uses incremental update when dirty fraction is below threshold', () => {
			// High threshold: never rebuild
			state.dirtyThreshold = 1.0;

			const eid1 = createCollidable(world, 4, 4, 1, 1);
			createCollidable(world, 20, 20, 1, 1);

			// First frame
			incrementalSpatialUpdate(grid, state, world);

			// Move one entity
			Position.x[eid1] = 12;

			// Second frame: dirty fraction (1/2 = 0.5) < threshold (1.0) => incremental
			incrementalSpatialUpdate(grid, state, world);

			// Entity should be at new position
			expect(getEntitiesAtPoint(grid, 12, 4).has(eid1 as number)).toBe(true);
			expect(getEntitiesAtPoint(grid, 4, 4).has(eid1 as number)).toBe(false);
		});

		it('pre-marked dirty entities are included in the update', () => {
			const eid = createCollidable(world, 4, 4, 1, 1);

			// First frame
			setSpatialHashGrid(grid);
			spatialHashSystem(world);

			// Move entity and mark dirty via external API
			Position.x[eid] = 20;
			markSpatialDirty(world,eid);

			// The system tick should pick up the pre-marked dirty entity
			spatialHashSystem(world);

			expect(getEntitiesAtPoint(grid, 20, 4).has(eid as number)).toBe(true);
			expect(getEntitiesAtPoint(grid, 4, 4).has(eid as number)).toBe(false);
		});

		it('detects size changes as dirty', () => {
			const eid = createCollidable(world, 0, 0, 2, 2);

			// First frame
			incrementalSpatialUpdate(grid, state, world);

			// Change collider size
			Collider.width[eid] = 10;
			Collider.height[eid] = 10;

			// Second frame: should detect size change
			incrementalSpatialUpdate(grid, state, world);

			// Entity should now span more cells
			const stats = getSpatialHashStats(grid);
			expect(stats.entityCount).toBe(1);
			// With size 10 at origin with cellSize 8, spans cells (0,0) and (1,1)
			expect(stats.cellCount).toBeGreaterThan(1);
		});

		it('clears dirty set at end of each frame', () => {
			createCollidable(world, 4, 4, 1, 1);

			// First frame
			incrementalSpatialUpdate(grid, state, world);
			expect(state.dirtyEntities.size).toBe(0);
			expect(state.dirtyLookup.size).toBe(0);
		});

		it('handles setSpatialHashGrid resetting initialized flag', () => {
			const eid = createCollidable(world, 4, 4, 1, 1);

			// Initialize with first grid
			setSpatialHashGrid(grid);
			spatialHashSystem(world);
			expect(getSpatialHashStats(grid).entityCount).toBe(1);

			// Switch to new grid: should trigger full rebuild
			const grid2 = createSpatialHash({ cellSize: 4 });
			setSpatialHashGrid(grid2);
			spatialHashSystem(world);

			expect(getSpatialHashStats(grid2).entityCount).toBe(1);
			expect(getEntitiesAtPoint(grid2, 4, 4).has(eid as number)).toBe(true);
		});
	});
});
