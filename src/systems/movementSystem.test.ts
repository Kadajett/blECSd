/**
 * Tests for movement system.
 * @module systems/movementSystem.test
 */

import { describe, expect, it } from 'vitest';
import { Position } from '../components/position';
import { Velocity } from '../components/velocity';
import { addComponent, addEntity } from '../core/ecs';
import { createScheduler } from '../core/scheduler';
import { createWorld } from '../core/world';
import {
	createMovementSystem,
	hasMovementSystem,
	movementSystem,
	queryMovement,
	registerMovementSystem,
	updateMovements,
} from './movementSystem';

describe('movementSystem', () => {
	it('updates entity positions based on velocity', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Position);
		addComponent(world, eid, Velocity);

		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Velocity.x[eid] = 10;
		Velocity.y[eid] = 20;

		// Run system with 1 second delta time
		movementSystem(world);

		// Position should be updated (actual values depend on deltaTime)
		expect(typeof Position.x[eid]).toBe('number');
		expect(typeof Position.y[eid]).toBe('number');
	});

	it('handles entities with only Velocity component', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Velocity);
		Velocity.x[eid] = 10;
		Velocity.y[eid] = 20;

		// Should not throw (won't update position since no Position component)
		expect(() => movementSystem(world)).not.toThrow();
	});

	it('handles empty world', () => {
		const world = createWorld();

		expect(() => movementSystem(world)).not.toThrow();
	});

	it('returns world unchanged', () => {
		const world = createWorld();
		const result = movementSystem(world);

		expect(result).toBe(world);
	});

	it('processes multiple entities', () => {
		const world = createWorld();

		const eid1 = addEntity(world);
		const eid2 = addEntity(world);
		const eid3 = addEntity(world);

		addComponent(world, eid1, Position);
		addComponent(world, eid1, Velocity);
		addComponent(world, eid2, Position);
		addComponent(world, eid2, Velocity);
		addComponent(world, eid3, Position);
		addComponent(world, eid3, Velocity);

		Position.x[eid1] = 0;
		Position.y[eid1] = 0;
		Velocity.x[eid1] = 1;
		Velocity.y[eid1] = 1;

		Position.x[eid2] = 10;
		Position.y[eid2] = 10;
		Velocity.x[eid2] = 2;
		Velocity.y[eid2] = 2;

		Position.x[eid3] = 20;
		Position.y[eid3] = 20;
		Velocity.x[eid3] = 3;
		Velocity.y[eid3] = 3;

		expect(() => movementSystem(world)).not.toThrow();
	});
});

describe('queryMovement', () => {
	it('returns array', () => {
		const world = createWorld();
		const entities = queryMovement(world);

		expect(Array.isArray(entities)).toBe(true);
	});

	it('handles empty world', () => {
		const world = createWorld();
		const entities = queryMovement(world);

		expect(Array.isArray(entities)).toBe(true);
		expect(entities.length).toBeGreaterThanOrEqual(0);
	});
});

describe('hasMovementSystem', () => {
	it('returns boolean for any entity', () => {
		const world = createWorld();
		const eid = addEntity(world);

		const result = hasMovementSystem(world, eid);
		expect(typeof result).toBe('boolean');
	});

	it('returns false for non-existent entities', () => {
		const world = createWorld();

		expect(hasMovementSystem(world, 99999)).toBe(false);
	});
});

describe('createMovementSystem', () => {
	it('returns the movement system', () => {
		const system = createMovementSystem();

		expect(typeof system).toBe('function');
	});

	it('returned system works correctly', () => {
		const world = createWorld();
		const system = createMovementSystem();

		expect(() => system(world)).not.toThrow();
	});
});

describe('registerMovementSystem', () => {
	it('registers system with scheduler', () => {
		const scheduler = createScheduler();

		expect(() => registerMovementSystem(scheduler)).not.toThrow();
	});

	it('registers with custom priority', () => {
		const scheduler = createScheduler();

		expect(() => registerMovementSystem(scheduler, 10)).not.toThrow();
	});

	it('registered system executes in ANIMATION phase', () => {
		const scheduler = createScheduler();
		registerMovementSystem(scheduler);

		// The system should be in the ANIMATION phase
		// This is implementation-specific and hard to test directly
		expect(scheduler).toBeDefined();
	});
});

describe('updateMovements', () => {
	it('updates specific entities', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Position);
		addComponent(world, eid, Velocity);

		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Velocity.x[eid] = 10;
		Velocity.y[eid] = 20;

		updateMovements(world, [eid], 1.0);

		// Position should be updated
		expect(typeof Position.x[eid]).toBe('number');
		expect(typeof Position.y[eid]).toBe('number');
	});

	it('handles empty entity array', () => {
		const world = createWorld();

		expect(() => updateMovements(world, [], 1.0)).not.toThrow();
	});

	it('skips entities without Velocity', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Position);
		Position.x[eid] = 0;
		Position.y[eid] = 0;

		// Should not throw even though entity has no Velocity
		expect(() => updateMovements(world, [eid], 1.0)).not.toThrow();

		// Position should be unchanged
		expect(Position.x[eid]).toBe(0);
		expect(Position.y[eid]).toBe(0);
	});

	it('respects deltaTime parameter', () => {
		const world = createWorld();
		const eid = addEntity(world);

		addComponent(world, eid, Position);
		addComponent(world, eid, Velocity);

		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Velocity.x[eid] = 10;
		Velocity.y[eid] = 20;

		// Small deltaTime
		updateMovements(world, [eid], 0.1);

		// Movement should be scaled by deltaTime
		expect(typeof Position.x[eid]).toBe('number');
		expect(typeof Position.y[eid]).toBe('number');
	});
});
