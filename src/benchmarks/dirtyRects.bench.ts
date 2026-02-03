/**
 * Dirty Rectangle System Benchmarks
 *
 * Measures dirty rectangle tracking, region coalescing, and render optimization.
 *
 * Run with: pnpm bench src/benchmarks/dirtyRects.bench.ts
 *
 * @module benchmarks/dirtyRects
 */

import { addComponent, addEntity, createWorld } from 'bitecs';
import { bench, describe } from 'vitest';
import {
	clearDirtyTracking,
	createDirtyTracker,
	type DirtyTrackerData,
	getDirtyEntities,
	getDirtyRegions,
	getDirtyRegionsInViewport,
	getDirtyStats,
	hasDirtyEntities,
	isCellDirty,
	markAllEntitiesDirty,
	markCellDirty,
	markEntityDirty,
	markRegionDirty,
	needsFullRedraw,
	removeEntityFromTracking,
	resizeDirtyTracker,
	updateEntityBounds,
} from '../core/dirtyRects';
import type { Entity, World } from '../core/types';
import { ComputedLayout } from '../systems/layoutSystem';

// =============================================================================
// SETUP HELPERS
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
	ComputedLayout.valid[eid] = 1;
	return eid;
}

function createEntityGrid(
	world: World,
	rows: number,
	cols: number,
	cellWidth: number,
	cellHeight: number,
): Entity[] {
	const entities: Entity[] = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const eid = createEntityWithLayout(
				world,
				col * cellWidth,
				row * cellHeight,
				cellWidth,
				cellHeight,
			);
			entities.push(eid);
		}
	}
	return entities;
}

// =============================================================================
// TRACKER CREATION BENCHMARKS
// =============================================================================

describe('Dirty Tracker Creation', () => {
	bench('create 80x24 tracker', () => {
		createDirtyTracker(80, 24);
	});

	bench('create 200x60 tracker', () => {
		createDirtyTracker(200, 60);
	});

	bench('create 400x100 tracker (large)', () => {
		createDirtyTracker(400, 100);
	});

	bench('resize tracker 80x24 -> 200x60', () => {
		const tracker = createDirtyTracker(80, 24);
		resizeDirtyTracker(tracker, 200, 60);
	});
});

// =============================================================================
// CELL MARKING BENCHMARKS
// =============================================================================

describe('Cell Marking', () => {
	let tracker: DirtyTrackerData;

	describe('single cells', () => {
		bench(
			'mark 100 cells dirty',
			() => {
				for (let i = 0; i < 100; i++) {
					markCellDirty(tracker, (i * 17) % 80, (i * 7) % 24);
				}
			},
			{
				setup() {
					tracker = createDirtyTracker(80, 24);
					clearDirtyTracking(tracker);
				},
			},
		);

		bench(
			'mark 1,000 cells dirty',
			() => {
				for (let i = 0; i < 1000; i++) {
					markCellDirty(tracker, (i * 17) % 80, (i * 7) % 24);
				}
			},
			{
				setup() {
					tracker = createDirtyTracker(80, 24);
					clearDirtyTracking(tracker);
				},
			},
		);

		bench(
			'check 100 cells dirty status',
			() => {
				for (let i = 0; i < 100; i++) {
					isCellDirty(tracker, (i * 17) % 80, (i * 7) % 24);
				}
			},
			{
				setup() {
					tracker = createDirtyTracker(80, 24);
					for (let i = 0; i < 50; i++) {
						markCellDirty(tracker, (i * 13) % 80, (i * 5) % 24);
					}
				},
			},
		);
	});

	describe('regions', () => {
		bench(
			'mark 10 regions dirty (10x5 each)',
			() => {
				for (let i = 0; i < 10; i++) {
					markRegionDirty(tracker, (i * 8) % 70, (i * 2) % 19, 10, 5);
				}
			},
			{
				setup() {
					tracker = createDirtyTracker(80, 24);
					clearDirtyTracking(tracker);
				},
			},
		);

		bench(
			'mark 100 regions dirty (5x3 each)',
			() => {
				for (let i = 0; i < 100; i++) {
					markRegionDirty(tracker, (i * 5) % 75, (i * 2) % 21, 5, 3);
				}
			},
			{
				setup() {
					tracker = createDirtyTracker(80, 24);
					clearDirtyTracking(tracker);
				},
			},
		);

		bench(
			'mark full screen dirty',
			() => {
				markRegionDirty(tracker, 0, 0, 80, 24);
			},
			{
				setup() {
					tracker = createDirtyTracker(80, 24);
					clearDirtyTracking(tracker);
				},
			},
		);
	});
});

// =============================================================================
// ENTITY TRACKING BENCHMARKS
// =============================================================================

describe('Entity Tracking', () => {
	let world: World;
	let tracker: DirtyTrackerData;
	let entities: Entity[];

	describe('entity bounds update', () => {
		bench(
			'update 100 entity bounds',
			() => {
				for (const eid of entities) {
					updateEntityBounds(tracker, world, eid, true);
				}
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 60);
					entities = createEntityGrid(world, 10, 10, 10, 5);
				},
			},
		);

		bench(
			'update 1,000 entity bounds',
			() => {
				for (const eid of entities) {
					updateEntityBounds(tracker, world, eid, true);
				}
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(400, 100);
					entities = createEntityGrid(world, 25, 40, 10, 4);
				},
			},
		);
	});

	describe('entity dirty marking', () => {
		bench(
			'mark 100 entities dirty',
			() => {
				for (const eid of entities) {
					markEntityDirty(tracker, world, eid);
				}
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 60);
					entities = createEntityGrid(world, 10, 10, 10, 5);
					// Pre-cache bounds
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
					clearDirtyTracking(tracker);
				},
			},
		);

		bench(
			'mark 1,000 entities dirty',
			() => {
				for (const eid of entities) {
					markEntityDirty(tracker, world, eid);
				}
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(400, 100);
					entities = createEntityGrid(world, 25, 40, 10, 4);
					// Pre-cache bounds
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
					clearDirtyTracking(tracker);
				},
			},
		);

		bench(
			'mark all entities dirty (bulk)',
			() => {
				markAllEntitiesDirty(tracker, entities);
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(400, 100);
					entities = createEntityGrid(world, 25, 40, 10, 4);
					clearDirtyTracking(tracker);
				},
			},
		);
	});

	describe('entity removal', () => {
		bench(
			'remove 100 entities from tracking',
			() => {
				for (const eid of entities) {
					removeEntityFromTracking(tracker, eid);
				}
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 60);
					entities = createEntityGrid(world, 10, 10, 10, 5);
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
				},
			},
		);
	});
});

// =============================================================================
// REGION COALESCING BENCHMARKS
// =============================================================================

describe('Region Coalescing', () => {
	let tracker: DirtyTrackerData;

	bench(
		'coalesce scattered dirty cells (100 cells)',
		() => {
			getDirtyRegions(tracker);
		},
		{
			setup() {
				tracker = createDirtyTracker(80, 24);
				clearDirtyTracking(tracker);
				for (let i = 0; i < 100; i++) {
					markCellDirty(tracker, (i * 17) % 80, (i * 7) % 24);
				}
			},
		},
	);

	bench(
		'coalesce clustered dirty cells (100 cells in 10 clusters)',
		() => {
			getDirtyRegions(tracker);
		},
		{
			setup() {
				tracker = createDirtyTracker(80, 24);
				clearDirtyTracking(tracker);
				// Create 10 clusters of 10 cells each
				for (let cluster = 0; cluster < 10; cluster++) {
					const baseX = (cluster * 8) % 72;
					const baseY = (cluster * 2) % 20;
					for (let i = 0; i < 10; i++) {
						markCellDirty(tracker, baseX + (i % 4), baseY + Math.floor(i / 4));
					}
				}
			},
		},
	);

	bench(
		'coalesce many small regions (50 regions)',
		() => {
			getDirtyRegions(tracker);
		},
		{
			setup() {
				tracker = createDirtyTracker(200, 60);
				clearDirtyTracking(tracker);
				for (let i = 0; i < 50; i++) {
					markRegionDirty(tracker, (i * 4) % 196, (i * 3) % 57, 3, 2);
				}
			},
		},
	);

	bench(
		'get regions in viewport (partial screen)',
		() => {
			getDirtyRegionsInViewport(tracker, 20, 5, 40, 15);
		},
		{
			setup() {
				tracker = createDirtyTracker(80, 24);
				clearDirtyTracking(tracker);
				for (let i = 0; i < 100; i++) {
					markCellDirty(tracker, (i * 17) % 80, (i * 7) % 24);
				}
				getDirtyRegions(tracker); // Pre-coalesce
			},
		},
	);
});

// =============================================================================
// FRAME SIMULATION BENCHMARKS
// =============================================================================

describe('Frame Simulation', () => {
	let world: World;
	let tracker: DirtyTrackerData;
	let entities: Entity[];

	describe('static screen (no changes)', () => {
		bench(
			'1000 static entities - check for dirty',
			() => {
				// Check if anything needs redraw
				hasDirtyEntities(tracker);
				needsFullRedraw(tracker);
				getDirtyRegions(tracker);
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 100);
					entities = createEntityGrid(world, 25, 40, 5, 4);
					// Initial render - mark all dirty, then clear
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
					clearDirtyTracking(tracker);
				},
			},
		);
	});

	describe('single entity moving', () => {
		bench(
			'1000 static + 1 moving entity - full frame',
			() => {
				// Move entity
				const movingEntity = entities[0];
				if (movingEntity !== undefined) {
					const currentX = ComputedLayout.x[movingEntity];
					if (currentX !== undefined) {
						ComputedLayout.x[movingEntity] = currentX + 1;
					}
					updateEntityBounds(tracker, world, movingEntity, true);
				}
				// Get dirty regions
				getDirtyRegions(tracker);
				// Clear for next frame
				clearDirtyTracking(tracker);
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 100);
					entities = createEntityGrid(world, 25, 40, 5, 4);
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
					clearDirtyTracking(tracker);
				},
			},
		);
	});

	describe('10% entities changing', () => {
		bench(
			'1000 entities with 100 dirty - full frame',
			() => {
				// Mark 10% dirty
				for (let i = 0; i < 100; i++) {
					const entity = entities[i * 10];
					if (entity !== undefined) {
						markEntityDirty(tracker, world, entity);
					}
				}
				// Get dirty regions
				getDirtyRegions(tracker);
				// Clear for next frame
				clearDirtyTracking(tracker);
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 100);
					entities = createEntityGrid(world, 25, 40, 5, 4);
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
					clearDirtyTracking(tracker);
				},
			},
		);
	});

	describe('full redraw', () => {
		bench(
			'1000 entities - mark all dirty and get regions',
			() => {
				markAllEntitiesDirty(tracker, entities);
				getDirtyRegions(tracker);
				clearDirtyTracking(tracker);
			},
			{
				setup() {
					world = createTestWorld();
					tracker = createDirtyTracker(200, 100);
					entities = createEntityGrid(world, 25, 40, 5, 4);
					for (const eid of entities) {
						updateEntityBounds(tracker, world, eid, true);
					}
				},
			},
		);
	});
});

// =============================================================================
// STATISTICS BENCHMARKS
// =============================================================================

describe('Statistics', () => {
	let tracker: DirtyTrackerData;

	bench(
		'get stats with 100 dirty cells',
		() => {
			getDirtyStats(tracker);
		},
		{
			setup() {
				tracker = createDirtyTracker(80, 24);
				clearDirtyTracking(tracker);
				for (let i = 0; i < 100; i++) {
					markCellDirty(tracker, (i * 17) % 80, (i * 7) % 24);
				}
			},
		},
	);

	bench(
		'get dirty entities (100 entities)',
		() => {
			getDirtyEntities(tracker);
		},
		{
			setup() {
				const world = createTestWorld();
				tracker = createDirtyTracker(200, 60);
				const entities = createEntityGrid(world, 10, 10, 10, 5);
				for (const eid of entities) {
					markEntityDirty(tracker, world, eid);
				}
			},
		},
	);
});

// =============================================================================
// ACCEPTANCE CRITERIA BENCHMARKS
// =============================================================================

describe('Acceptance Criteria', () => {
	let world: World;
	let tracker: DirtyTrackerData;
	let entities: Entity[];

	bench(
		'ACCEPTANCE: Static screen near-zero CPU',
		() => {
			// This should be nearly instant for static screens
			const hasWork = hasDirtyEntities(tracker) || needsFullRedraw(tracker);
			if (hasWork) {
				getDirtyRegions(tracker);
			}
		},
		{
			setup() {
				world = createTestWorld();
				tracker = createDirtyTracker(200, 100);
				entities = createEntityGrid(world, 25, 40, 5, 4);
				for (const eid of entities) {
					updateEntityBounds(tracker, world, eid, true);
				}
				clearDirtyTracking(tracker);
			},
		},
	);

	bench(
		'ACCEPTANCE: 1000 static + 1 moving = minimal overhead',
		() => {
			// Move the first entity
			const movingEntity = entities[0];
			if (movingEntity !== undefined) {
				ComputedLayout.x[movingEntity] = (ComputedLayout.x[movingEntity] ?? 0) + 1;
				updateEntityBounds(tracker, world, movingEntity, true);
			}

			// Get what needs to be redrawn
			const regions = getDirtyRegions(tracker);

			// Clear for next frame
			clearDirtyTracking(tracker);

			// Regions should be minimal (just the old and new position of the moving entity)
			// This validates that 1000 static entities don't add overhead
			if (regions.length > 10) {
				throw new Error(`Too many regions: ${regions.length}`);
			}
		},
		{
			setup() {
				world = createTestWorld();
				tracker = createDirtyTracker(200, 100);
				entities = createEntityGrid(world, 25, 40, 5, 4);
				for (const eid of entities) {
					updateEntityBounds(tracker, world, eid, true);
				}
				clearDirtyTracking(tracker);
			},
		},
	);
});
