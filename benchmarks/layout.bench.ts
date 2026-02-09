/**
 * Layout System Performance Benchmarks
 *
 * Measures layout system performance across various scenarios:
 * - Flat layouts: many entities at the same hierarchy level
 * - Nested layouts: deep hierarchy trees
 * - Mixed positioning: absolute, relative, and percentage-based sizes
 * - Layout invalidation: incremental updates after changes
 * - Full vs incremental layout computation
 *
 * These benchmarks help identify layout bottlenecks and guide optimization.
 */

import { bench, describe } from 'vitest';
import { addEntity } from '../src/core/ecs';
import { createWorld } from '../src/core/world';
import type { World } from '../src/core/types';
import { initializeScreen } from '../src/components/screen';
import { setPosition } from '../src/components/position';
import { setDimensions } from '../src/components/dimensions';
import { appendChild } from '../src/components/hierarchy';
import { layoutSystem, invalidateLayout } from '../src/systems/layoutSystem';

/**
 * Creates a world with screen initialized for layout benchmarks.
 */
function setupWorld(): World {
	const world = createWorld();
	initializeScreen(world, 160, 48);
	return world;
}

describe('Layout Performance: Flat Layouts', () => {
	bench('flat layout: 10 entities side by side', () => {
		const world = setupWorld();

		// Create 10 entities in a row
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 15, 0);
			setDimensions(world, eid, { width: 14, height: 5 });
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('flat layout: 100 entities side by side', () => {
		const world = setupWorld();

		// Create 100 entities in a grid
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			const col = i % 10;
			const row = Math.floor(i / 10);
			setPosition(world, eid, col * 16, row * 5);
			setDimensions(world, eid, { width: 15, height: 4 });
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('flat layout: 500 entities side by side', () => {
		const world = setupWorld();

		// Create 500 entities in a grid
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			const col = i % 20;
			const row = Math.floor(i / 20);
			setPosition(world, eid, col * 8, row * 2);
			setDimensions(world, eid, { width: 7, height: 1 });
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('flat layout: 1000 entities side by side', () => {
		const world = setupWorld();

		// Create 1000 entities in a grid
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			const col = i % 40;
			const row = Math.floor(i / 40);
			setPosition(world, eid, col * 4, row * 2);
			setDimensions(world, eid, { width: 3, height: 1 });
		}

		// Run layout system
		layoutSystem(world);
	});
});

describe('Layout Performance: Nested Layouts', () => {
	bench('nested layout: 5 levels deep', () => {
		const world = setupWorld();

		// Create a nested hierarchy 5 levels deep
		let parentEid = addEntity(world);
		setPosition(world, parentEid, 0, 0);
		setDimensions(world, parentEid, { width: 100, height: 40 });

		for (let level = 0; level < 4; level++) {
			const childEid = addEntity(world);
			setPosition(world, childEid, 5, 5);
			setDimensions(world, childEid, { width: 90 - level * 10, height: 30 - level * 5 });
			appendChild(world, parentEid, childEid);
			parentEid = childEid;
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('nested layout: 10 levels deep', () => {
		const world = setupWorld();

		// Create a nested hierarchy 10 levels deep
		let parentEid = addEntity(world);
		setPosition(world, parentEid, 0, 0);
		setDimensions(world, parentEid, { width: 150, height: 45 });

		for (let level = 0; level < 9; level++) {
			const childEid = addEntity(world);
			setPosition(world, childEid, 2, 2);
			setDimensions(world, childEid, { width: 146 - level * 10, height: 41 - level * 3 });
			appendChild(world, parentEid, childEid);
			parentEid = childEid;
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('nested layout: 20 levels deep', () => {
		const world = setupWorld();

		// Create a nested hierarchy 20 levels deep
		let parentEid = addEntity(world);
		setPosition(world, parentEid, 0, 0);
		setDimensions(world, parentEid, { width: 160, height: 48 });

		for (let level = 0; level < 19; level++) {
			const childEid = addEntity(world);
			setPosition(world, childEid, 1, 1);
			setDimensions(world, childEid, { width: 158 - level * 5, height: 46 - level * 2 });
			appendChild(world, parentEid, childEid);
			parentEid = childEid;
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('nested layout: tree structure (100 entities, 3 levels)', () => {
		const world = setupWorld();

		// Create root
		const root = addEntity(world);
		setPosition(world, root, 0, 0);
		setDimensions(world, root, { width: 160, height: 48 });

		// Create 10 children at level 1
		for (let i = 0; i < 10; i++) {
			const child1 = addEntity(world);
			setPosition(world, child1, i * 16, 0);
			setDimensions(world, child1, { width: 15, height: 15 });
			appendChild(world, root, child1);

			// Create 9 children at level 2 for each level 1 child
			for (let j = 0; j < 9; j++) {
				const child2 = addEntity(world);
				setPosition(world, child2, (j % 3) * 5, Math.floor(j / 3) * 5);
				setDimensions(world, child2, { width: 4, height: 4 });
				appendChild(world, child1, child2);
			}
		}

		// Run layout system
		layoutSystem(world);
	});
});

describe('Layout Performance: Mixed Positioning', () => {
	bench('mixed positioning: absolute + relative (50 entities)', () => {
		const world = setupWorld();

		// Create entities with mixed absolute and relative positioning
		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			if (i % 2 === 0) {
				// Absolute positioning
				setPosition(world, eid, i * 3, i * 1);
			} else {
				// Relative positioning (offset from previous)
				setPosition(world, eid, 10, 0);
			}
			setDimensions(world, eid, { width: 10, height: 2 });
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('mixed positioning: percentage-based sizes (100 entities)', () => {
		const world = setupWorld();

		// Create parent containers
		for (let i = 0; i < 10; i++) {
			const parentEid = addEntity(world);
			setPosition(world, parentEid, (i % 5) * 32, Math.floor(i / 5) * 24);
			setDimensions(world, parentEid, { width: 30, height: 20 });

			// Create children with percentage-based sizes (simulated with fractions)
			for (let j = 0; j < 10; j++) {
				const childEid = addEntity(world);
				setPosition(world, childEid, 0, j * 2);
				// Simulate percentage by using fractions of parent size
				setDimensions(world, childEid, { width: 25, height: 1 }); // ~80% width
				appendChild(world, parentEid, childEid);
			}
		}

		// Run layout system
		layoutSystem(world);
	});

	bench('mixed positioning: complex grid layout (200 entities)', () => {
		const world = setupWorld();

		// Create a complex grid with mixed sizing
		for (let i = 0; i < 200; i++) {
			const eid = addEntity(world);
			const col = i % 20;
			const row = Math.floor(i / 20);

			// Vary sizes based on position
			const width = col % 3 === 0 ? 12 : col % 3 === 1 ? 8 : 6;
			const height = row % 2 === 0 ? 3 : 2;

			setPosition(world, eid, col * 8, row * 5);
			setDimensions(world, eid, { width, height });
		}

		// Run layout system
		layoutSystem(world);
	});
});

describe('Layout Performance: Layout Invalidation', () => {
	bench('layout invalidation: change 1 entity, re-layout 100 entities', () => {
		const world = setupWorld();
		const entities: number[] = [];

		// Create 100 entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 10) * 16, Math.floor(i / 10) * 5);
			setDimensions(world, eid, { width: 15, height: 4 });
			entities.push(eid);
		}

		// Initial layout
		layoutSystem(world);

		// Change one entity and re-layout
		const targetEid = entities[50];
		if (targetEid !== undefined) {
			setPosition(world, targetEid, 80, 20);
			invalidateLayout(world, targetEid);
			layoutSystem(world);
		}
	});

	bench('layout invalidation: change 10 entities, re-layout 100 entities', () => {
		const world = setupWorld();
		const entities: number[] = [];

		// Create 100 entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 10) * 16, Math.floor(i / 10) * 5);
			setDimensions(world, eid, { width: 15, height: 4 });
			entities.push(eid);
		}

		// Initial layout
		layoutSystem(world);

		// Change 10 entities and re-layout
		for (let i = 0; i < 10; i++) {
			const targetEid = entities[i * 10];
			if (targetEid !== undefined) {
				setPosition(world, targetEid, i * 16, 20);
				invalidateLayout(world, targetEid);
			}
		}
		layoutSystem(world);
	});

	bench('layout invalidation: change parent, cascade to 50 children', () => {
		const world = setupWorld();

		// Create parent
		const parentEid = addEntity(world);
		setPosition(world, parentEid, 0, 0);
		setDimensions(world, parentEid, { width: 100, height: 40 });

		// Create 50 children
		for (let i = 0; i < 50; i++) {
			const childEid = addEntity(world);
			setPosition(world, childEid, (i % 10) * 10, Math.floor(i / 10) * 8);
			setDimensions(world, childEid, { width: 9, height: 7 });
			appendChild(world, parentEid, childEid);
		}

		// Initial layout
		layoutSystem(world);

		// Change parent position (should cascade to children)
		setPosition(world, parentEid, 50, 10);
		invalidateLayout(world, parentEid);
		layoutSystem(world);
	});
});

describe('Layout Performance: Full vs Incremental', () => {
	bench('full layout: 500 entities initial computation', () => {
		const world = setupWorld();

		// Create 500 entities
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 25) * 6, Math.floor(i / 25) * 2);
			setDimensions(world, eid, { width: 5, height: 1 });
		}

		// Run full layout computation (first time)
		layoutSystem(world);
	});

	bench('incremental layout: 500 entities no changes', () => {
		const world = setupWorld();

		// Create 500 entities
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 25) * 6, Math.floor(i / 25) * 2);
			setDimensions(world, eid, { width: 5, height: 1 });
		}

		// Initial layout
		layoutSystem(world);

		// Run layout again without changes (should be faster)
		layoutSystem(world);
	});

	bench('incremental layout: 500 entities, 5% changed', () => {
		const world = setupWorld();
		const entities: number[] = [];

		// Create 500 entities
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 25) * 6, Math.floor(i / 25) * 2);
			setDimensions(world, eid, { width: 5, height: 1 });
			entities.push(eid);
		}

		// Initial layout
		layoutSystem(world);

		// Change 5% of entities (25 entities)
		for (let i = 0; i < 25; i++) {
			const targetEid = entities[i * 20];
			if (targetEid !== undefined) {
				setPosition(world, targetEid, i * 6, 40);
				invalidateLayout(world, targetEid);
			}
		}

		// Run incremental layout
		layoutSystem(world);
	});

	bench('incremental layout: 500 entities, 20% changed', () => {
		const world = setupWorld();
		const entities: number[] = [];

		// Create 500 entities
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 25) * 6, Math.floor(i / 25) * 2);
			setDimensions(world, eid, { width: 5, height: 1 });
			entities.push(eid);
		}

		// Initial layout
		layoutSystem(world);

		// Change 20% of entities (100 entities)
		for (let i = 0; i < 100; i++) {
			const targetEid = entities[i * 5];
			if (targetEid !== undefined) {
				setPosition(world, targetEid, i % 25 * 6, 40);
				invalidateLayout(world, targetEid);
			}
		}

		// Run incremental layout
		layoutSystem(world);
	});
});
