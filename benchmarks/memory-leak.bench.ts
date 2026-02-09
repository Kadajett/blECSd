/**
 * Memory Leak Detection Benchmarks
 *
 * Detects potential memory leaks by running long cycles and measuring heap growth.
 * A memory leak is indicated by persistent heap growth after GC cycles.
 *
 * Scenarios tested:
 * - Entity create/destroy cycles (should not leak)
 * - Widget create/destroy cycles (should not retain references)
 * - Event subscribe/unsubscribe cycles (should not leak listeners)
 * - System execution loops (should not accumulate state)
 *
 * Threshold: >10% heap growth after GC indicates potential leak
 */

import { describe, bench } from 'vitest';

/**
 * Gets current heap usage in bytes after forcing GC.
 */
function getHeapUsed(): number {
	if (global.gc) {
		global.gc();
	}
	return process.memoryUsage().heapUsed;
}

/**
 * Forces garbage collection if available.
 * Node must be run with --expose-gc flag.
 */
function forceGC(): void {
	if (global.gc) {
		global.gc();
	}
}

/**
 * Checks if heap growth exceeds threshold (indicates potential leak).
 * @param startHeap - Initial heap size
 * @param endHeap - Final heap size
 * @param threshold - Percentage threshold (default 10%)
 * @returns True if growth exceeds threshold
 */
function detectLeak(startHeap: number, endHeap: number, threshold = 0.1): boolean {
	const growth = (endHeap - startHeap) / startHeap;
	return growth > threshold;
}

describe('Memory Leak Detection: Entity Lifecycle', () => {
	bench('10k entity create/destroy cycles', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');

		const world = createWorld();
		const startHeap = getHeapUsed();

		// Run 10k create/destroy cycles
		for (let i = 0; i < 10000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 100, i % 50);
			setDimensions(world, eid, { width: 10, height: 2 });
			removeEntity(world, eid);

			// Force GC every 1000 iterations
			if (i % 1000 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});

	bench('batch entity create/destroy (100 entities x 100 cycles)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');

		const world = createWorld();
		const startHeap = getHeapUsed();

		// Create and destroy batches of entities
		for (let cycle = 0; cycle < 100; cycle++) {
			const entities: number[] = [];

			// Create 100 entities
			for (let i = 0; i < 100; i++) {
				const eid = addEntity(world);
				setPosition(world, eid, i, cycle);
				entities.push(eid);
			}

			// Destroy all entities
			for (const eid of entities) {
				removeEntity(world, eid);
			}

			// Force GC every 10 cycles
			if (cycle % 10 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});
});

describe('Memory Leak Detection: Widget Lifecycle', () => {
	bench('widget create/destroy cycles (Box, 1000 iterations)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createBox } = require('../src/widgets/box');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const startHeap = getHeapUsed();

		// Create and destroy 1000 box widgets
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			const box = createBox(world, eid, {
				top: 0,
				left: 0,
				width: 20,
				height: 5,
				content: `Box ${i}`,
			});

			// Destroy widget
			box.destroy();
			removeEntity(world, eid);

			// Force GC every 100 iterations
			if (i % 100 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});

	bench('widget create/destroy cycles (List, 500 iterations)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createList } = require('../src/widgets/list');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const startHeap = getHeapUsed();

		// Create and destroy 500 list widgets
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			const list = createList(world, eid, {
				x: 0,
				y: 0,
				width: 40,
				height: 20,
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			// Destroy widget
			list.destroy();
			removeEntity(world, eid);

			// Force GC every 50 iterations
			if (i % 50 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});

	bench('widget create/destroy cycles (TextInput, 500 iterations)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity, removeEntity } = require('../src/core/ecs');
		const { initializeScreen } = require('../src/components/screen');
		const { createTextbox } = require('../src/widgets/textbox');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const startHeap = getHeapUsed();

		// Create and destroy 500 textbox widgets
		for (let i = 0; i < 500; i++) {
			const eid = addEntity(world);
			const textbox = createTextbox(world, eid, {
				x: 0,
				y: 0,
				width: 40,
				height: 1,
			});

			// Simulate some text input
			textbox.setText(`Test text ${i}`);

			// Destroy widget
			textbox.destroy();
			removeEntity(world, eid);

			// Force GC every 50 iterations
			if (i % 50 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});
});

describe('Memory Leak Detection: Event System', () => {
	bench('event subscribe/unsubscribe cycles (10k iterations)', () => {
		const { createEventBus } = require('../src/core/events');

		type TestEvents = {
			test: { value: number };
			click: { x: number; y: number };
			keypress: { key: string };
		};

		const bus = createEventBus<TestEvents>();
		const startHeap = getHeapUsed();

		// Subscribe and unsubscribe 10k times
		for (let i = 0; i < 10000; i++) {
			const unsubscribe1 = bus.on('test', (data) => {
				// Handler that does nothing
			});
			const unsubscribe2 = bus.on('click', (data) => {
				// Handler that does nothing
			});
			const unsubscribe3 = bus.on('keypress', (data) => {
				// Handler that does nothing
			});

			// Unsubscribe immediately
			unsubscribe1();
			unsubscribe2();
			unsubscribe3();

			// Force GC every 1000 iterations
			if (i % 1000 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});

	bench('event handler accumulation test (1000 handlers)', () => {
		const { createEventBus } = require('../src/core/events');

		type TestEvents = {
			test: { value: number };
		};

		const bus = createEventBus<TestEvents>();
		const unsubscribers: Array<() => void> = [];

		const startHeap = getHeapUsed();

		// Add 1000 handlers
		for (let i = 0; i < 1000; i++) {
			const unsub = bus.on('test', (data) => {
				// Handler that does nothing
			});
			unsubscribers.push(unsub);
		}

		// Emit events
		for (let i = 0; i < 100; i++) {
			bus.emit('test', { value: i });
		}

		// Unsubscribe all
		for (const unsub of unsubscribers) {
			unsub();
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});
});

describe('Memory Leak Detection: System Execution', () => {
	bench('layout system loops (1000 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { initializeScreen } = require('../src/components/screen');
		const { layoutSystem } = require('../src/systems/layoutSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create some entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 80, Math.floor(i / 80));
			setDimensions(world, eid, { width: 10, height: 2 });
		}

		const startHeap = getHeapUsed();

		// Run layout system 1000 times
		for (let i = 0; i < 1000; i++) {
			layoutSystem(world);

			// Force GC every 100 frames
			if (i % 100 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});

	bench('render system loops (1000 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		// Create some entities with renderables
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 80, Math.floor(i / 80));
			setDimensions(world, eid, { width: 10, height: 2 });
			setRenderable(world, eid, {
				content: `Entity ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		const startHeap = getHeapUsed();

		// Run render system 1000 times
		for (let i = 0; i < 1000; i++) {
			renderSystem(world);

			// Force GC every 100 frames
			if (i % 100 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});

	bench('full scheduler loops (1000 frames)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { setPosition } = require('../src/components/position');
		const { setDimensions } = require('../src/components/dimensions');
		const { setRenderable } = require('../src/components/renderable');
		const { initializeScreen } = require('../src/components/screen');
		const { createScheduler, LoopPhase } = require('../src/core/scheduler');
		const { layoutSystem } = require('../src/systems/layoutSystem');
		const { renderSystem } = require('../src/systems/renderSystem');

		const world = createWorld();
		initializeScreen(world, 80, 24);

		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		// Create some entities
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 80, Math.floor(i / 80));
			setDimensions(world, eid, { width: 10, height: 2 });
			setRenderable(world, eid, {
				content: `Entity ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		const startHeap = getHeapUsed();

		// Run full scheduler 1000 times
		for (let i = 0; i < 1000; i++) {
			scheduler.run(world, 1 / 60);

			// Force GC every 100 frames
			if (i % 100 === 0) {
				forceGC();
			}
		}

		forceGC();
		const endHeap = getHeapUsed();
		const hasLeak = detectLeak(startHeap, endHeap);

		if (hasLeak) {
			const growthPercent = (((endHeap - startHeap) / startHeap) * 100).toFixed(2);
			console.warn(`⚠️  Potential memory leak detected: ${growthPercent}% heap growth`);
		}
	});
});
