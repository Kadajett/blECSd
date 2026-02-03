/**
 * Entity Creation and Lifecycle Benchmarks
 *
 * Measures entity creation, destruction, and component management performance.
 *
 * Run with: pnpm bench src/benchmarks/entity.bench.ts
 *
 * @module benchmarks/entity
 */

import { addComponent, addEntity, createWorld, removeEntity } from 'bitecs';
import { bench, describe } from 'vitest';
import { Dimensions } from '../components/dimensions';
import { Hierarchy } from '../components/hierarchy';
import { Interactive } from '../components/interactive';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import type { World } from '../core/types';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates a world with entities for benchmarking.
 */
function createBenchWorld(): World {
	return createWorld() as World;
}

/**
 * Creates a minimal entity with just Position.
 */
function createMinimalEntity(world: World): number {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	return eid;
}

/**
 * Creates a typical UI entity with Position, Dimensions, Renderable, Hierarchy.
 */
function createTypicalUIEntity(world: World): number {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Hierarchy);
	return eid;
}

/**
 * Creates a full interactive entity with all common components.
 */
function createInteractiveEntity(world: World): number {
	const eid = addEntity(world);
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Hierarchy);
	addComponent(world, eid, Interactive);
	return eid;
}

// =============================================================================
// ENTITY CREATION BENCHMARKS
// =============================================================================

describe('Entity Creation', () => {
	describe('single entity creation', () => {
		bench('minimal entity (Position only)', () => {
			const world = createBenchWorld();
			createMinimalEntity(world);
		});

		bench('typical UI entity (4 components)', () => {
			const world = createBenchWorld();
			createTypicalUIEntity(world);
		});

		bench('interactive entity (5 components)', () => {
			const world = createBenchWorld();
			createInteractiveEntity(world);
		});
	});

	describe('batch creation - 100 entities', () => {
		bench('minimal entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 100; i++) {
				createMinimalEntity(world);
			}
		});

		bench('typical UI entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 100; i++) {
				createTypicalUIEntity(world);
			}
		});

		bench('interactive entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 100; i++) {
				createInteractiveEntity(world);
			}
		});
	});

	describe('batch creation - 1,000 entities', () => {
		bench('minimal entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 1000; i++) {
				createMinimalEntity(world);
			}
		});

		bench('typical UI entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 1000; i++) {
				createTypicalUIEntity(world);
			}
		});

		bench('interactive entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 1000; i++) {
				createInteractiveEntity(world);
			}
		});
	});

	describe('batch creation - 10,000 entities', () => {
		bench('minimal entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 10000; i++) {
				createMinimalEntity(world);
			}
		});

		bench('typical UI entities', () => {
			const world = createBenchWorld();
			for (let i = 0; i < 10000; i++) {
				createTypicalUIEntity(world);
			}
		});
	});
});

// =============================================================================
// ENTITY DESTRUCTION BENCHMARKS
// =============================================================================

describe('Entity Destruction', () => {
	describe('single entity removal', () => {
		bench('remove entity', () => {
			const world = createBenchWorld();
			const eid = createTypicalUIEntity(world);
			removeEntity(world, eid);
		});
	});

	describe('batch removal - 100 entities', () => {
		let world: World;
		let entities: number[];

		bench(
			'remove 100 entities',
			() => {
				for (const eid of entities) {
					removeEntity(world, eid);
				}
			},
			{
				setup() {
					world = createBenchWorld();
					entities = [];
					for (let i = 0; i < 100; i++) {
						entities.push(createTypicalUIEntity(world));
					}
				},
			},
		);
	});

	describe('batch removal - 1,000 entities', () => {
		let world: World;
		let entities: number[];

		bench(
			'remove 1,000 entities',
			() => {
				for (const eid of entities) {
					removeEntity(world, eid);
				}
			},
			{
				setup() {
					world = createBenchWorld();
					entities = [];
					for (let i = 0; i < 1000; i++) {
						entities.push(createTypicalUIEntity(world));
					}
				},
			},
		);
	});
});

// =============================================================================
// ENTITY CHURN BENCHMARKS (create + destroy)
// =============================================================================

describe('Entity Churn (create + destroy cycle)', () => {
	bench('100 entity churn', () => {
		const world = createBenchWorld();
		for (let i = 0; i < 100; i++) {
			const eid = createTypicalUIEntity(world);
			removeEntity(world, eid);
		}
	});

	bench('1,000 entity churn', () => {
		const world = createBenchWorld();
		for (let i = 0; i < 1000; i++) {
			const eid = createTypicalUIEntity(world);
			removeEntity(world, eid);
		}
	});
});
