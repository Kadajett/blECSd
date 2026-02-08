/**
 * CI Performance Benchmarks
 *
 * Fast benchmarks suitable for CI performance regression detection.
 * These benchmarks focus on critical hot paths and common operations
 * that should complete quickly while still being representative.
 */

import { describe, bench } from 'vitest';
import { addEntity, query } from '../src/core/ecs';
import type { World } from '../src/core/types';
import { createWorld } from '../src/core/world';
import { Position, setPosition } from '../src/components/position';
import { setDimensions } from '../src/components/dimensions';
import { setRenderable } from '../src/components/renderable';
import { Velocity, setVelocity } from '../src/components/velocity';
import { layoutSystem } from '../src/systems/layoutSystem';
import { renderSystem } from '../src/systems/renderSystem';
import { movementSystem } from '../src/systems/movementSystem';
import { createScheduler, LoopPhase } from '../src/core/scheduler';
import { initializeScreen } from '../src/components/screen';

describe('CI: Entity Operations', () => {
	bench('create 100 entities', () => {
		const world = createWorld();
		for (let i = 0; i < 100; i++) {
			addEntity(world);
		}
	});

	bench('create 100 entities with Position', () => {
		const world = createWorld();
		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
		}
	});

	bench('query 1000 entities', () => {
		const world = createWorld();
		for (let i = 0; i < 1000; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
		}

		// Query
		const entities = Array.from(query(world, [Position]));
		return entities.length;
	});
});

describe('CI: Component Operations', () => {
	bench('set Position on 100 entities', () => {
		const world = createWorld();
		const entities = [];
		for (let i = 0; i < 100; i++) {
			entities.push(addEntity(world));
		}

		for (const eid of entities) {
			setPosition(world, eid, 10, 20);
		}
	});

	bench('set Velocity on 100 entities', () => {
		const world = createWorld();
		const entities = [];
		for (let i = 0; i < 100; i++) {
			entities.push(addEntity(world));
		}

		for (const eid of entities) {
			setVelocity(world, eid, 1, 1);
		}
	});

	bench('set Renderable on 100 entities', () => {
		const world = createWorld();
		const entities = [];
		for (let i = 0; i < 100; i++) {
			entities.push(addEntity(world));
		}

		for (const eid of entities) {
			setRenderable(world, eid, {
				content: 'test',
				fg: 0xffffff,
				bg: 0x000000,
			});
		}
	});
});

describe('CI: System Operations', () => {
	bench('layout 50 entities', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 80, Math.floor(i / 80));
			setDimensions(world, eid, { width: 10, height: 2 });
		}

		layoutSystem(world);
	});

	bench('render 50 entities', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i % 80, Math.floor(i / 80));
			setRenderable(world, eid, {
				content: `Entity ${i}`,
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		renderSystem(world);
	});

	bench('movement 50 entities', () => {
		const world = createWorld();

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, i, i);
			setVelocity(world, eid, 1, 1);
		}

		movementSystem(world);
	});
});

describe('CI: Full Render Cycle', () => {
	bench('10 entities render cycle (10 frames)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

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

		// Run 10 frames
		for (let frame = 0; frame < 10; frame++) {
			scheduler.run(world, 1 / 60);
		}
	});

	bench('50 entities render cycle (10 frames)', () => {
		const world = createWorld();
		initializeScreen(world, 80, 24);
		const scheduler = createScheduler();
		scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
		scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

		for (let i = 0; i < 50; i++) {
			const eid = addEntity(world);
			setPosition(world, eid, (i * 2) % 80, Math.floor((i * 2) / 80));
			setDimensions(world, eid, { width: 2, height: 1 });
			setRenderable(world, eid, {
				content: String(i),
				fg: 0xffffff,
				bg: 0x000000,
			});
		}

		for (let frame = 0; frame < 10; frame++) {
			scheduler.run(world, 1 / 60);
		}
	});
});
