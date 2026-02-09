/**
 * Full-Stack Render Cycle Benchmarks
 *
 * Measures complete render pipeline performance with frame time breakdown:
 * - Input phase timing
 * - Layout phase timing
 * - Render phase timing
 * - Output phase timing
 * - Frame time with varying entity counts
 * - Frame time with varying widget complexity
 * - Dirty rect optimization effectiveness
 * - Full redraw vs incremental update comparison
 *
 * These benchmarks help identify bottlenecks in the render pipeline
 * and validate optimization strategies.
 */

import { describe, bench } from 'vitest';
import { performance } from 'node:perf_hooks';

describe('Render Cycle: Phase Breakdown', () => {
	bench('input phase (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { initializeScreen } = require('../src/components/screen');
		const { inputSystem } = require('../src/systems/inputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 8, 0);
			setDimensions(world, eid, { width: 8, height: 3 });
		}

		// Measure input phase
		inputSystem(world);
	});

	bench('layout phase (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 8, 0);
			setDimensions(world, eid, { width: 8, height: 3 });
		}

		// Measure layout phase
		layoutSystem(world);
	});

	bench('render phase (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 8, 0);
			setDimensions(world, eid, { width: 8, height: 3 });
			setRenderable(world, eid, {
				content: `Box ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Need layout first
		layoutSystem(world);

		// Measure render phase
		renderSystem(world);
	});

	bench('output phase (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 8, 0);
			setDimensions(world, eid, { width: 8, height: 3 });
			setRenderable(world, eid, {
				content: `Box ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Run layout and render first
		layoutSystem(world);
		renderSystem(world);

		// Measure output phase
		outputSystem(world);
	});
});

describe('Render Cycle: Complete Frame Time', () => {
	bench('full frame (10 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 8, 0);
			setDimensions(world, eid, { width: 8, height: 3 });
			setRenderable(world, eid, {
				content: `Box ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Measure complete frame
		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('full frame (100 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 100 entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: String(i),
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Measure complete frame
		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('full frame (500 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		// Create 500 entities
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 3) % 160, Math.floor((i * 3) / 160));
			setDimensions(world, eid, { width: 3, height: 1 });
			setRenderable(world, eid, {
				content: `${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Measure complete frame
		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('full frame (1000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		// Create 1000 entities
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 2) % 160, Math.floor((i * 2) / 160));
			setDimensions(world, eid, { width: 2, height: 1 });
			setRenderable(world, eid, {
				content: `${i % 10}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Measure complete frame
		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});
});

describe('Render Cycle: Widget Complexity', () => {
	bench('simple boxes (10 boxes)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 simple box entities
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i * 8, 0);
			setDimensions(world, eid, { width: 8, height: 3 });
			setRenderable(world, eid, {
				content: `Box ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('nested panels with borders (10 panels)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { initializeScreen } = require('../src/components/screen');
		const { createBox } = require('../src/widgets/box');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 10 box widgets with borders
		for (let i = 0; i < 10; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i % 5) * 16, Math.floor(i / 5) * 12);
			setDimensions(world, eid, { width: 16, height: 12 });

			createBox(world, eid, {
				border: { type: 'single' },
				title: `Panel ${i}`,
			});
		}

		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('panels with lists (5 panels, 20 items each)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');
		const { inputSystem } = require('../src/systems/inputSystem');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create 5 list widgets with 20 items each
		for (let i = 0; i < 5; i++) {
			const eid = addEntity(world);
			const list = createList(world, eid, {
				position: { x: i * 16, y: 0 },
				dimensions: { width: 16, height: 24 },
			});

			// Add 20 items
			const items = Array.from({ length: 20 }, (_, j) => ({
				content: `Item ${j}`,
				value: j,
			}));
			list.setItems(items);
		}

		inputSystem(world);
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});
});

describe('Render Cycle: Dirty Rect Optimization', () => {
	bench('no changes (skip rate test)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create entities
		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: `${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// First frame (everything dirty)
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);

		// Second frame (nothing changed - should skip most work)
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('single entity update (partial dirty)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable, markDirty } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const entities: number[] = [];

		// Create entities
		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: `${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// First frame
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);

		// Mark only one entity dirty
		markDirty(world, entities[0]);

		// Second frame (only one entity dirty)
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('10% entities update (medium dirty)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable, markDirty } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const entities: number[] = [];

		// Create 100 entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: `${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// First frame
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);

		// Mark 10% dirty (10 entities)
		for (let i = 0; i < 10; i++) {
			markDirty(world, entities[i]);
		}

		// Second frame (10% dirty)
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});
});

describe('Render Cycle: Full Redraw vs Incremental', () => {
	bench('full redraw (100 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable, markDirty } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const entities: number[] = [];

		// Create 100 entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: `${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// Mark all entities dirty for full redraw
		for (const eid of entities) {
			markDirty(world, eid);
		}

		// Full redraw
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});

	bench('incremental update (5 entities of 100)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable, markDirty } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');
		const { outputSystem } = require('../src/systems/outputSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const entities: number[] = [];

		// Create 100 entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: `${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
			entities.push(eid);
		}

		// First frame (all dirty)
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);

		// Mark only 5 entities dirty for incremental update
		for (let i = 0; i < 5; i++) {
			markDirty(world, entities[i]);
		}

		// Incremental update
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	});
});
