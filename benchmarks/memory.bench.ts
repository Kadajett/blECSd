/**
 * Memory Profiling and GC Pressure Benchmarks
 *
 * Measures memory usage and garbage collection pressure across different scenarios:
 * - Base memory footprint of an empty world
 * - Memory per entity with various component combinations
 * - Memory growth over time (create/destroy cycles)
 * - GC pressure tracking (heap usage before/after operations)
 * - Widget memory usage (List, Table)
 * - PackedStore vs Map memory comparison
 *
 * These benchmarks help identify memory leaks, excessive allocations,
 * and guide memory optimization decisions.
 */

import { describe, bench, beforeEach, afterEach } from 'vitest';
import { performance } from 'node:perf_hooks';

/**
 * Gets current heap usage in bytes.
 * Returns used heap size which includes all allocated objects.
 */
function getHeapUsed(): number {
	if (global.gc) {
		global.gc();
	}
	return process.memoryUsage().heapUsed;
}

/**
 * Measures memory used by executing a function.
 * Forces GC before and after to get more accurate readings.
 *
 * @param fn - Function to measure
 * @returns Memory delta in bytes
 */
function measureMemory(fn: () => void): number {
	const startMem = getHeapUsed();
	fn();
	const endMem = getHeapUsed();
	return endMem - startMem;
}

/**
 * Helper to trigger GC if available.
 * Node must be run with --expose-gc flag.
 */
function forceGC(): void {
	if (global.gc) {
		global.gc();
	}
}

describe('Memory Profiling: Base Footprint', () => {
	bench('empty world baseline', () => {
		const { createWorld } = require('../src/core/world');

		const startMem = getHeapUsed();
		const world = createWorld();
		const endMem = getHeapUsed();

		// Store for reporting (actual measurement is in the delta)
		const memoryDelta = endMem - startMem;
	});

	bench('empty world + screen initialization', () => {
		const { createWorld } = require('../src/core/world');
		const { initializeScreen } = require('../src/components/screen');

		const startMem = getHeapUsed();
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const endMem = getHeapUsed();

		const memoryDelta = endMem - startMem;
	});
});

describe('Memory Profiling: Per-Entity Memory', () => {
	bench('100 entities (no components)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');

		const world = createWorld();
		const startMem = getHeapUsed();

		for (let i = 0; i < 100; i++) {
			addEntity(world);
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('100 entities with Position', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');

		const world = createWorld();
		const startMem = getHeapUsed();

		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('100 entities with Position + Dimensions', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');

		const world = createWorld();
		const startMem = getHeapUsed();

		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
			setDimensions(world, eid, { width: 10, height: 2 });
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('100 entities with Position + Dimensions + Renderable', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');

		const world = createWorld();
		const startMem = getHeapUsed();

		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
			setDimensions(world, eid, { width: 10, height: 2 });
			setRenderable(world, eid, {
				content: `Entity ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});
});

describe('Memory Profiling: Growth Over Time', () => {
	bench('create/destroy 10k entities (10 cycles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');

		const world = createWorld();
		const entities: number[] = [];

		// Measure memory growth across multiple create/destroy cycles
		for (let cycle = 0; cycle < 10; cycle++) {
			// Create 1000 entities
			for (let i = 0; i < 1000; i++) {
				const eid = addEntity(world);
				setPosition(world, eid, i, i);
				entities.push(eid);
			}

			// Destroy all entities
			for (const eid of entities) {
				removeEntity(world, eid);
			}
			entities.length = 0;

			// Force GC between cycles
			forceGC();
		}
	});

	bench('persistent growth: add 100 entities per cycle (10 cycles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');

		const world = createWorld();

		const startMem = getHeapUsed();

		// Add more entities each cycle without removing
		for (let cycle = 0; cycle < 10; cycle++) {
			for (let i = 0; i < 100; i++) {
				const eid = addEntity(world);
				setPosition(world, eid, i, i);
				setDimensions(world, eid, { width: 10, height: 2 });
			}
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});
});

describe('Memory Profiling: GC Pressure', () => {
	bench('GC pressure: rapid entity creation (5k entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setRenderable } = require('../src/components/renderable');

		const world = createWorld();

		// Track heap before
		const startHeap = getHeapUsed();

		// Create many entities with string allocations (GC pressure)
		for (let i = 0; i < 5000; i++) {
			const eid = addEntity(world);
			setRenderable(world, eid, {
				content: `Item ${i} with some text`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		// Measure heap after
		const endHeap = getHeapUsed();
		const heapGrowth = endHeap - startHeap;
	});

	bench('GC pressure: layout system (1000 entities)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		// Create entities
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 160, Math.floor(i / 160));
			setDimensions(world, eid, { width: 5, height: 1 });
		}

		const startHeap = getHeapUsed();

		// Run layout system multiple times
		for (let i = 0; i < 10; i++) {
			layoutSystem(world);
		}

		const endHeap = getHeapUsed();
		const heapGrowth = endHeap - startHeap;
	});
});

describe('Memory Profiling: Widget Configurations', () => {
	bench('List widget with 1000 items', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const startMem = getHeapUsed();

		const eid = addEntity(world);
		const list = createList(world, eid, {
			position: { x: 0, y: 0 },
			dimensions: { width: 80, height: 24 },
		});

		// Add 1000 items
		const items = Array.from({ length: 1000 }, (_, i) => ({
			content: `Item ${i}`,
			value: i,
		}));
		list.setItems(items);

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('Box widget with nested children (50 boxes)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { initializeScreen } = require('../src/components/screen');
		const { createBox } = require('../src/widgets/box');

		const world = createWorld();
		initializeScreen(world, 160, 48);

		const startMem = getHeapUsed();

		// Create 50 box widgets
		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			const col = i % 10;
			const row = Math.floor(i / 10);

			setPosition(world, eid, col * 16, row * 10);
			setDimensions(world, eid, { width: 16, height: 10 });

			createBox(world, eid, {
				border: { type: 'single' },
				title: `Box ${i}`,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});
});

describe('Memory Profiling: PackedStore vs Map', () => {
	interface TestData {
		id: number;
		x: number;
		y: number;
		name: string;
	}

	bench('PackedStore with 1000 items', () => {
		const { createPackedStore, addToStore } = require('../src/core/storage/packedStore');

		const startMem = getHeapUsed();

		const store = createPackedStore<TestData>();

		for (let i = 0; i < 1000; i++) {
			addToStore(store, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('Map with 1000 items', () => {
		const startMem = getHeapUsed();

		const map = new Map<number, TestData>();

		for (let i = 0; i < 1000; i++) {
			map.set(i, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('PackedStore with 10k items', () => {
		const { createPackedStore, addToStore } = require('../src/core/storage/packedStore');

		const startMem = getHeapUsed();

		const store = createPackedStore<TestData>();

		for (let i = 0; i < 10000; i++) {
			addToStore(store, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('Map with 10k items', () => {
		const startMem = getHeapUsed();

		const map = new Map<number, TestData>();

		for (let i = 0; i < 10000; i++) {
			map.set(i, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('PackedStore: add/remove churn (1000 ops)', () => {
		const { createPackedStore, addToStore, removeFromStore } = require('../src/core/storage/packedStore');

		const store = createPackedStore<TestData>();
		const handles: any[] = [];

		const startMem = getHeapUsed();

		// Add 500 items
		for (let i = 0; i < 500; i++) {
			const handle = addToStore(store, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
			handles.push(handle);
		}

		// Remove half, add more
		for (let i = 0; i < 250; i++) {
			removeFromStore(store, handles[i]);
		}

		for (let i = 500; i < 750; i++) {
			const handle = addToStore(store, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
			handles.push(handle);
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});

	bench('Map: add/remove churn (1000 ops)', () => {
		const map = new Map<number, TestData>();

		const startMem = getHeapUsed();

		// Add 500 items
		for (let i = 0; i < 500; i++) {
			map.set(i, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
		}

		// Remove half, add more
		for (let i = 0; i < 250; i++) {
			map.delete(i);
		}

		for (let i = 500; i < 750; i++) {
			map.set(i, {
				id: i,
				x: i * 10,
				y: i * 5,
				name: `Item ${i}`,
			});
		}

		const endMem = getHeapUsed();
		const memoryDelta = endMem - startMem;
	});
});
