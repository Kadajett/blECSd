/**
 * Startup Time and Time-to-First-Render Benchmarks
 *
 * Measures application startup performance including:
 * - Cold start time
 * - World setup time
 * - Time-to-first-render
 * - Module import time
 * - Minimal vs full dashboard comparison
 *
 * These benchmarks help identify startup bottlenecks and ensure
 * the library initializes quickly for responsive user experiences.
 */

import { describe, bench } from 'vitest';
import { performance } from 'node:perf_hooks';

/**
 * Measures the time to import the blecsd module.
 * This represents the initial load cost of the library.
 *
 * @returns Import duration in milliseconds
 */
async function measureModuleImportTime(): Promise<number> {
	const start = performance.now();
	await import('../src/index');
	const end = performance.now();
	return end - start;
}

/**
 * Measures cold start: time from createWorld to first entity added.
 *
 * @returns Cold start duration in milliseconds
 */
function measureColdStart(): number {
	const { createWorld } = require('../src/core/world');
	const { addEntity } = require('../src/core/ecs');

	const start = performance.now();
	const world = createWorld();
	addEntity(world);
	const end = performance.now();

	return end - start;
}

/**
 * Measures world setup time for a typical application.
 * Creates 100 entities with common components (Position, Dimensions, Renderable).
 *
 * @returns Setup duration in milliseconds
 */
function measureWorldSetup(): number {
	const { createWorld } = require('../src/core/world');
	const { addEntity } = require('../src/core/ecs');
	const { setPosition } = require('../src/components/position');
	const { setDimensions } = require('../src/components/dimensions');
	const { setRenderable } = require('../src/components/renderable');

	const start = performance.now();

	const world = createWorld();

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

	const end = performance.now();
	return end - start;
}

/**
 * Measures time-to-first-render: complete flow from world creation
 * through layout and render systems to output buffer.
 *
 * @returns Time-to-first-render in milliseconds
 */
function measureTimeToFirstRender(): number {
	const { createWorld } = require('../src/core/world');
	const { addEntity } = require('../src/core/ecs');
	const { setPosition } = require('../src/components/position');
	const { setDimensions } = require('../src/components/dimensions');
	const { setRenderable } = require('../src/components/renderable');
	const { initializeScreen } = require('../src/components/screen');
	const { layoutSystem } = require('../src/systems/layoutSystem');
	const { renderSystem } = require('../src/systems/renderSystem');
	const { outputSystem } = require('../src/systems/outputSystem');

	const start = performance.now();

	// Create world and screen
	const world = createWorld();
	initializeScreen(world, 80, 24);

	// Add 10 entities
	for (let i = 0; i < 10; i++) {
		const eid = addEntity(world);
		setPosition(world, eid, i * 8, i * 2);
		setDimensions(world, eid, { width: 8, height: 2 });
		setRenderable(world, eid, {
			content: `Box ${i}`,
			fg: 0xffffff,
			bg: 0x000000,
		});
	}

	// Run layout and render
	layoutSystem(world);
	renderSystem(world);
	outputSystem(world);

	const end = performance.now();
	return end - start;
}

/**
 * Measures minimal setup: single entity with minimal components.
 *
 * @returns Minimal setup duration in milliseconds
 */
function measureMinimalSetup(): number {
	const { createWorld } = require('../src/core/world');
	const { addEntity } = require('../src/core/ecs');
	const { setPosition } = require('../src/components/position');
	const { initializeScreen } = require('../src/components/screen');
	const { layoutSystem } = require('../src/systems/layoutSystem');
	const { renderSystem } = require('../src/systems/renderSystem');

	const start = performance.now();

	const world = createWorld();
	initializeScreen(world, 80, 24);

	const eid = addEntity(world);
	setPosition(world, eid, 0, 0);

	layoutSystem(world);
	renderSystem(world);

	const end = performance.now();
	return end - start;
}

/**
 * Measures full dashboard setup: 50+ entities with widgets.
 *
 * @returns Full dashboard setup duration in milliseconds
 */
function measureFullDashboardSetup(): number {
	const { createWorld } = require('../src/core/world');
	const { addEntity } = require('../src/core/ecs');
	const { setPosition } = require('../src/components/position');
	const { setDimensions } = require('../src/components/dimensions');
	const { setRenderable } = require('../src/components/renderable');
	const { setBorder } = require('../src/components/border');
	const { initializeScreen } = require('../src/components/screen');
	const { createBox } = require('../src/widgets/box');
	const { layoutSystem } = require('../src/systems/layoutSystem');
	const { renderSystem } = require('../src/systems/renderSystem');

	const start = performance.now();

	const world = createWorld();
	initializeScreen(world, 160, 48);

	// Create 50 panel widgets
	for (let i = 0; i < 50; i++) {
		const eid = addEntity(world);
		const col = i % 10;
		const row = Math.floor(i / 10);

		setPosition(world, eid, col * 16, row * 10);
		setDimensions(world, eid, { width: 16, height: 10 });

		createBox(world, eid, {
			border: { type: 'single' },
			title: `Panel ${i}`,
		});

		setRenderable(world, eid, {
			content: `Data ${i}`,
			fg: 0xffffff,
			bg: 0x000000,
		});
	}

	// Run initial layout and render
	layoutSystem(world);
	renderSystem(world);

	const end = performance.now();
	return end - start;
}

describe('Startup Performance', () => {
	bench('module import time', async () => {
		await measureModuleImportTime();
	});

	bench('cold start (createWorld + addEntity)', () => {
		measureColdStart();
	});

	bench('world setup (100 entities)', () => {
		measureWorldSetup();
	});

	bench('time-to-first-render (10 entities)', () => {
		measureTimeToFirstRender();
	});

	bench('minimal setup (1 entity)', () => {
		measureMinimalSetup();
	});

	bench('full dashboard setup (50 widgets)', () => {
		measureFullDashboardSetup();
	});
});

describe('Startup Comparison', () => {
	bench('minimal app (1 entity) - complete flow', () => {
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

		const eid = addEntity(world);
		setPosition(world, eid, 10, 5);
		setDimensions(world, eid, { width: 20, height: 5 });
		setRenderable(world, eid, {
			content: 'Hello, World!',
			fg: 0xffffff,
			bg: 0x000000,
		});

		scheduler.run(world, 0.016);
	});

	bench('small app (10 entities) - complete flow', () => {
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

		scheduler.run(world, 0.016);
	});

	bench('medium app (50 entities) - complete flow', () => {
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

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 4) % 80, Math.floor((i * 4) / 80));
			setDimensions(world, eid, { width: 4, height: 1 });
			setRenderable(world, eid, {
				content: String(i),
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		scheduler.run(world, 0.016);
	});
});
