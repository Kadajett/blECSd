/**
 * Hit Test and Spatial Query Benchmarks
 *
 * Measures hit testing and spatial query performance with varying entity counts.
 *
 * Run with: pnpm bench src/benchmarks/hitTest.bench.ts
 *
 * @module benchmarks/hitTest
 */

import { addComponent, addEntity, createWorld } from '../core/ecs';
import { bench, describe } from 'vitest';
import { Dimensions } from '../components/dimensions';
import { Interactive, setInteractive } from '../components/interactive';
import { Position } from '../components/position';
import { Renderable } from '../components/renderable';
import {
	createClickableCache,
	hitTest,
	hitTestAll,
	invalidateClickableCache,
	updateClickableCache,
} from '../core/hitTest';
import { setPositionCache } from '../core/positionCache';
import type { Entity, World } from '../core/types';
import { ComputedLayout } from '../systems/layoutSystem';

// =============================================================================
// SETUP HELPERS
// =============================================================================

/**
 * Creates a world with positioned, interactive entities.
 */
function createTestWorld(entityCount: number, screenWidth = 200, screenHeight = 100): World {
	const world = createWorld() as World;

	// Create entities spread across the screen
	for (let i = 0; i < entityCount; i++) {
		const eid = addEntity(world);

		// Add position and dimensions
		addComponent(world, eid, Position);
		addComponent(world, eid, Dimensions);
		addComponent(world, eid, Renderable);
		addComponent(world, eid, Interactive);
		addComponent(world, eid, ComputedLayout);

		// Spread entities across the screen
		const x = (i * 17) % screenWidth;
		const y = (i * 7) % screenHeight;

		Position.x[eid] = x;
		Position.y[eid] = y;
		Dimensions.width[eid] = 10;
		Dimensions.height[eid] = 3;

		// Set computed layout
		ComputedLayout.x[eid] = x;
		ComputedLayout.y[eid] = y;
		ComputedLayout.width[eid] = 10;
		ComputedLayout.height[eid] = 3;

		// Make interactive
		setInteractive(world, eid as Entity, { clickable: true, hoverable: true });

		// Cache position for hit testing (xi, xl, yi, yl, base)
		setPositionCache(world, eid as Entity, {
			xi: x,
			xl: x + 10,
			yi: y,
			yl: y + 3,
			base: 0,
		});
	}

	return world;
}

// =============================================================================
// HIT TEST BENCHMARKS - WITHOUT CACHE
// =============================================================================

describe('Hit Test (no cache)', () => {
	describe('single point query', () => {
		bench('100 entities - center hit', () => {
			const world = createTestWorld(100);
			hitTest(world, 100, 50);
		});

		bench('1,000 entities - center hit', () => {
			const world = createTestWorld(1000);
			hitTest(world, 100, 50);
		});

		bench('10,000 entities - center hit', () => {
			const world = createTestWorld(10000);
			hitTest(world, 100, 50);
		});
	});

	describe('hitTestAll (find all overlapping)', () => {
		bench('100 entities', () => {
			const world = createTestWorld(100);
			hitTestAll(world, 100, 50);
		});

		bench('1,000 entities', () => {
			const world = createTestWorld(1000);
			hitTestAll(world, 100, 50);
		});
	});
});

// =============================================================================
// HIT TEST BENCHMARKS - WITH CACHE
// =============================================================================

describe('Hit Test (with cache)', () => {
	describe('cached single point query', () => {
		bench('100 entities - center hit', () => {
			const world = createTestWorld(100);
			const cache = createClickableCache();
			updateClickableCache(world, cache);
			hitTest(world, 100, 50, cache);
		});

		bench('1,000 entities - center hit', () => {
			const world = createTestWorld(1000);
			const cache = createClickableCache();
			updateClickableCache(world, cache);
			hitTest(world, 100, 50, cache);
		});

		bench('10,000 entities - center hit', () => {
			const world = createTestWorld(10000);
			const cache = createClickableCache();
			updateClickableCache(world, cache);
			hitTest(world, 100, 50, cache);
		});
	});

	describe('repeated queries (cache warm)', () => {
		let world: World;
		let cache: ReturnType<typeof createClickableCache>;

		bench(
			'100 entities - 100 queries',
			() => {
				for (let i = 0; i < 100; i++) {
					hitTest(world, (i * 17) % 200, (i * 7) % 100, cache);
				}
			},
			{
				setup() {
					world = createTestWorld(100);
					cache = createClickableCache();
					updateClickableCache(world, cache);
				},
			},
		);

		bench(
			'1,000 entities - 100 queries',
			() => {
				for (let i = 0; i < 100; i++) {
					hitTest(world, (i * 17) % 200, (i * 7) % 100, cache);
				}
			},
			{
				setup() {
					world = createTestWorld(1000);
					cache = createClickableCache();
					updateClickableCache(world, cache);
				},
			},
		);
	});
});

// =============================================================================
// CACHE UPDATE BENCHMARKS
// =============================================================================

describe('Cache Operations', () => {
	describe('cache rebuild', () => {
		bench('rebuild cache - 100 entities', () => {
			const world = createTestWorld(100);
			const cache = createClickableCache();
			updateClickableCache(world, cache);
		});

		bench('rebuild cache - 1,000 entities', () => {
			const world = createTestWorld(1000);
			const cache = createClickableCache();
			updateClickableCache(world, cache);
		});

		bench('rebuild cache - 10,000 entities', () => {
			const world = createTestWorld(10000);
			const cache = createClickableCache();
			updateClickableCache(world, cache);
		});
	});

	describe('cache invalidate + rebuild cycle', () => {
		let world: World;
		let cache: ReturnType<typeof createClickableCache>;

		bench(
			'100 entities - invalidate + rebuild',
			() => {
				invalidateClickableCache(cache);
				updateClickableCache(world, cache);
			},
			{
				setup() {
					world = createTestWorld(100);
					cache = createClickableCache();
					updateClickableCache(world, cache);
				},
			},
		);

		bench(
			'1,000 entities - invalidate + rebuild',
			() => {
				invalidateClickableCache(cache);
				updateClickableCache(world, cache);
			},
			{
				setup() {
					world = createTestWorld(1000);
					cache = createClickableCache();
					updateClickableCache(world, cache);
				},
			},
		);
	});
});

// =============================================================================
// POSITION CACHE BENCHMARKS
// =============================================================================

describe('Position Cache', () => {
	describe('cache population', () => {
		bench('cache 100 entity positions', () => {
			// Position cache is populated by createTestWorld
			// This benchmarks the world creation with position caching
			createTestWorld(100);
		});

		bench('cache 1,000 entity positions', () => {
			// Position cache is populated by createTestWorld
			createTestWorld(1000);
		});
	});
});
