/**
 * Tests for ECS World creation and management.
 * @module core/world.test
 */

import { describe, expect, it } from 'vitest';
import { Position } from '../components/position';
import { addComponent, addEntity } from './ecs';
import { createWorld, resetWorld } from './world';

describe('createWorld', () => {
	it('creates a new world instance', () => {
		const world = createWorld();

		expect(world).toBeDefined();
		expect(typeof world).toBe('object');
	});

	it('creates independent world instances', () => {
		const world1 = createWorld();
		const world2 = createWorld();

		// Different world instances should be independent
		addEntity(world1);
		addEntity(world2);

		// Entity IDs may or may not be the same (bitecs implementation detail)
		// But worlds should be independent objects
		expect(world1).not.toBe(world2);
	});

	it('allows entity creation in new world', () => {
		const world = createWorld();
		const eid = addEntity(world);

		expect(typeof eid).toBe('number');
		expect(eid).toBeGreaterThanOrEqual(0);
	});

	it('allows component addition in new world', () => {
		const world = createWorld();
		const eid = addEntity(world);

		expect(() => addComponent(world, eid, Position)).not.toThrow();

		Position.x[eid] = 10;
		Position.y[eid] = 20;

		expect(Position.x[eid]).toBe(10);
		expect(Position.y[eid]).toBe(20);
	});
});

describe('resetWorld', () => {
	it('resets world state', () => {
		const world = createWorld();

		// Add entities
		addEntity(world);
		addEntity(world);

		// Reset world
		resetWorld(world);

		// After reset, can create new entities
		const newEid = addEntity(world);
		expect(typeof newEid).toBe('number');
	});

	it('does not throw when resetting empty world', () => {
		const world = createWorld();

		expect(() => resetWorld(world)).not.toThrow();
	});

	it('allows reusing world after reset', () => {
		const world = createWorld();

		// First use
		const eid1 = addEntity(world);
		addComponent(world, eid1, Position);
		Position.x[eid1] = 100;

		// Reset
		resetWorld(world);

		// Second use
		const eid2 = addEntity(world);
		addComponent(world, eid2, Position);
		Position.x[eid2] = 200;

		expect(Position.x[eid2]).toBe(200);
	});

	it('can be called multiple times', () => {
		const world = createWorld();

		expect(() => {
			resetWorld(world);
			resetWorld(world);
			resetWorld(world);
		}).not.toThrow();
	});
});
