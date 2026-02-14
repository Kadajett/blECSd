/**
 * Real-World Scenario Benchmark: Large Virtualized List with Search Filter
 *
 * Simulates a large list (10,000 items) with filtering:
 * - Virtualized rendering (only visible items)
 * - Search filter changes
 * - Scroll position updates
 * - Layout recalculation as visible items change
 *
 * Measures render time as filter and scroll position change.
 */

import { bench, describe } from 'vitest';

describe('Large List Scenario', () => {
	bench('10,000-item list: initial render', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const eid = addEntity(world);
		const list = createList(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 24 },
		});

		// Create 10,000 items
		const items = Array.from({ length: 10000 }, (_, i) => ({
			content: `Item ${i}: ${String(i).padStart(5, '0')}`,
			value: i,
		}));
		list.setItems(items);

		// Cleanup
		removeEntity(world, eid);
	});

	bench('10,000-item list: filter change (narrow results)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const eid = addEntity(world);
		const list = createList(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 24 },
		});

		// Create 10,000 items
		const allItems = Array.from({ length: 10000 }, (_, i) => ({
			content: `Item ${i}: ${String(i).padStart(5, '0')}`,
			value: i,
		}));
		list.setItems(allItems);

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate filter change: show only items containing "999"
		const filtered = allItems.filter((item) => item.content.includes('999'));
		list.setItems(filtered);

		// Re-render with filtered items
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		removeEntity(world, eid);
	});

	bench('10,000-item list: filter change (expand results)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const eid = addEntity(world);
		const list = createList(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 24 },
		});

		const allItems = Array.from({ length: 10000 }, (_, i) => ({
			content: `Item ${i}: ${String(i).padStart(5, '0')}`,
			value: i,
		}));

		// Start with narrow filter
		const filtered = allItems.filter((item) => item.content.includes('999'));
		list.setItems(filtered);

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Clear filter (expand to all items)
		list.setItems(allItems);

		// Re-render with all items
		layoutSystem(world);
		renderSystem(world);

		// Cleanup
		removeEntity(world, eid);
	});

	bench('10,000-item list: rapid scroll (100 scroll events)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const eid = addEntity(world);
		const list = createList(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 24 },
		});

		const items = Array.from({ length: 10000 }, (_, i) => ({
			content: `Item ${i}: ${String(i).padStart(5, '0')}`,
			value: i,
		}));
		list.setItems(items);

		// Initial render
		layoutSystem(world);
		renderSystem(world);

		// Simulate 100 rapid scroll events
		for (let i = 0; i < 100; i++) {
			// Scroll down by varying amounts
			list.scrollBy(1 + (i % 10));

			// Re-render after scroll
			layoutSystem(world);
			renderSystem(world);
		}

		// Cleanup
		removeEntity(world, eid);
	});

	bench('10,000-item list: combined filter + scroll', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const eid = addEntity(world);
		const list = createList(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 24 },
		});

		const allItems = Array.from({ length: 10000 }, (_, i) => ({
			content: `Item ${i}: ${String(i).padStart(5, '0')}`,
			value: i,
		}));

		// Simulate realistic search workflow: type query, scroll results, refine query
		const queries = ['1', '12', '123', '1234', '123'];

		for (const query of queries) {
			// Filter items
			const filtered = allItems.filter((item) => item.content.includes(query));
			list.setItems(filtered);

			// Layout and render
			layoutSystem(world);
			renderSystem(world);

			// Scroll through some results
			for (let i = 0; i < 5; i++) {
				list.scrollBy(3);
				layoutSystem(world);
				renderSystem(world);
			}
		}

		// Cleanup
		removeEntity(world, eid);
	});
});
