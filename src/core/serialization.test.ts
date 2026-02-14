/**
 * Tests for ECS world state serialization with delta compression
 * @module core/serialization.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	addComponent,
	addEntity,
	createWorld,
	getAllEntities,
	hasComponent,
	removeEntity,
} from './ecs';
import {
	applyWorldDelta,
	type ComponentRegistration,
	createWorldDelta,
	deserializeWorld,
	getRegisteredComponents,
	registerComponents,
	serializeWorld,
} from './serialization';
import type { World } from './types';

// =============================================================================
// TEST COMPONENTS
// =============================================================================

const DEFAULT_CAPACITY = 10000;

const TestPosition = {
	x: new Float32Array(DEFAULT_CAPACITY),
	y: new Float32Array(DEFAULT_CAPACITY),
	z: new Uint16Array(DEFAULT_CAPACITY),
	absolute: new Uint8Array(DEFAULT_CAPACITY),
};

const TestVelocity = {
	x: new Float32Array(DEFAULT_CAPACITY),
	y: new Float32Array(DEFAULT_CAPACITY),
	maxSpeed: new Float32Array(DEFAULT_CAPACITY),
	friction: new Float32Array(DEFAULT_CAPACITY),
};

const TestHealth = {
	current: new Float32Array(DEFAULT_CAPACITY),
	max: new Float32Array(DEFAULT_CAPACITY),
};

// Component registrations
const positionReg: ComponentRegistration = {
	name: 'Position',
	component: TestPosition,
	fields: ['x', 'y', 'z', 'absolute'],
};

const velocityReg: ComponentRegistration = {
	name: 'Velocity',
	component: TestVelocity,
	fields: ['x', 'y', 'maxSpeed', 'friction'],
};

const healthReg: ComponentRegistration = {
	name: 'Health',
	component: TestHealth,
	fields: ['current', 'max'],
};

// =============================================================================
// TESTS
// =============================================================================

describe('serialization', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		registerComponents([positionReg, velocityReg, healthReg]);
	});

	// =========================================================================
	// REGISTRY
	// =========================================================================

	describe('component registry', () => {
		it('registers and retrieves components', () => {
			const components = getRegisteredComponents();
			expect(components).toHaveLength(3);
			expect(components.find((c) => c.name === 'Position')).toBeDefined();
			expect(components.find((c) => c.name === 'Velocity')).toBeDefined();
			expect(components.find((c) => c.name === 'Health')).toBeDefined();
		});

		it('allows re-registering components', () => {
			registerComponents([positionReg]);
			const components = getRegisteredComponents();
			expect(components).toHaveLength(1);
			expect(components[0]?.name).toBe('Position');
		});
	});

	// =========================================================================
	// SERIALIZATION
	// =========================================================================

	describe('serializeWorld', () => {
		it('serializes an empty world', () => {
			const snapshot = serializeWorld(world, [positionReg]);
			expect(snapshot.version).toBe(1);
			expect(snapshot.timestamp).toBeGreaterThan(0);
			expect(snapshot.entityCount).toBe(0);
			expect(snapshot.components).toHaveLength(0);
		});

		it('serializes a world with one entity and one component', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 10;
			TestPosition.y[eid] = 20;
			TestPosition.z[eid] = 5;
			TestPosition.absolute[eid] = 1;

			const snapshot = serializeWorld(world, [positionReg]);
			expect(snapshot.entityCount).toBe(1);
			expect(snapshot.components).toHaveLength(1);

			const posComp = snapshot.components[0];
			expect(posComp).toBeDefined();
			expect(posComp!.name).toBe('Position');
			expect(posComp!.entities).toEqual([eid]);
			expect(posComp!.values.x).toEqual([10]);
			expect(posComp!.values.y).toEqual([20]);
			expect(posComp!.values.z).toEqual([5]);
			expect(posComp!.values.absolute).toEqual([1]);
		});

		it('serializes multiple entities with same component', () => {
			const eid1 = addEntity(world);
			addComponent(world, eid1, TestPosition);
			TestPosition.x[eid1] = 100;

			const eid2 = addEntity(world);
			addComponent(world, eid2, TestPosition);
			TestPosition.x[eid2] = 200;

			const snapshot = serializeWorld(world, [positionReg]);
			expect(snapshot.entityCount).toBe(2);
			const posComp = snapshot.components.find((c) => c.name === 'Position')!;
			expect(posComp.entities).toContain(eid1);
			expect(posComp.entities).toContain(eid2);
		});

		it('serializes entity with multiple components', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			addComponent(world, eid, TestVelocity);
			TestPosition.x[eid] = 10;
			TestVelocity.x[eid] = 5;

			const snapshot = serializeWorld(world, [positionReg, velocityReg]);
			expect(snapshot.components).toHaveLength(2);
			expect(snapshot.components.find((c) => c.name === 'Position')).toBeDefined();
			expect(snapshot.components.find((c) => c.name === 'Velocity')).toBeDefined();
		});

		it('only serializes registered components', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			addComponent(world, eid, TestVelocity);

			// Only register Position
			const snapshot = serializeWorld(world, [positionReg]);
			expect(snapshot.components).toHaveLength(1);
			expect(snapshot.components[0]!.name).toBe('Position');
		});
	});

	// =========================================================================
	// DESERIALIZATION
	// =========================================================================

	describe('deserializeWorld', () => {
		it('deserializes an empty snapshot', () => {
			const snapshot = serializeWorld(world, [positionReg]);
			const newWorld = deserializeWorld(snapshot);
			const entities = getAllEntities(newWorld);
			expect(entities).toHaveLength(0);
		});

		it('round-trip: serialize -> deserialize produces identical state', () => {
			const eid1 = addEntity(world);
			addComponent(world, eid1, TestPosition);
			TestPosition.x[eid1] = 123.456;
			TestPosition.y[eid1] = -78.9;
			TestPosition.z[eid1] = 42;
			TestPosition.absolute[eid1] = 1;

			const eid2 = addEntity(world);
			addComponent(world, eid2, TestVelocity);
			TestVelocity.x[eid2] = 5.5;
			TestVelocity.y[eid2] = -3.3;
			TestVelocity.maxSpeed[eid2] = 10;
			TestVelocity.friction[eid2] = 0.8;

			const snapshot = serializeWorld(world, [positionReg, velocityReg]);
			const newWorld = deserializeWorld(snapshot);

			// Check entity count
			const entities = getAllEntities(newWorld);
			expect(entities).toHaveLength(2);

			// Find the entities in the new world
			const positions = entities.filter((e) => hasComponent(newWorld, e, TestPosition));
			const velocities = entities.filter((e) => hasComponent(newWorld, e, TestVelocity));

			expect(positions).toHaveLength(1);
			expect(velocities).toHaveLength(1);

			// Check values
			const newPosEid = positions[0]!;
			expect(TestPosition.x[newPosEid]).toBeCloseTo(123.456);
			expect(TestPosition.y[newPosEid]).toBeCloseTo(-78.9);
			expect(TestPosition.z[newPosEid]).toBe(42);
			expect(TestPosition.absolute[newPosEid]).toBe(1);

			const newVelEid = velocities[0]!;
			expect(TestVelocity.x[newVelEid]).toBeCloseTo(5.5);
			expect(TestVelocity.y[newVelEid]).toBeCloseTo(-3.3);
			expect(TestVelocity.maxSpeed[newVelEid]).toBe(10);
			expect(TestVelocity.friction[newVelEid]).toBeCloseTo(0.8);
		});

		it('handles multiple components on same entity', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			addComponent(world, eid, TestVelocity);
			TestPosition.x[eid] = 100;
			TestVelocity.x[eid] = 10;

			const snapshot = serializeWorld(world, [positionReg, velocityReg]);
			const newWorld = deserializeWorld(snapshot);

			const entities = getAllEntities(newWorld);
			expect(entities).toHaveLength(1);
			const newEid = entities[0]!;

			expect(hasComponent(newWorld, newEid, TestPosition)).toBe(true);
			expect(hasComponent(newWorld, newEid, TestVelocity)).toBe(true);
			expect(TestPosition.x[newEid]).toBe(100);
			expect(TestVelocity.x[newEid]).toBe(10);
		});

		it('handles large world with 100+ entities', () => {
			// Create 150 entities with various components
			for (let i = 0; i < 150; i++) {
				const eid = addEntity(world);
				addComponent(world, eid, TestPosition);
				TestPosition.x[eid] = i;
				TestPosition.y[eid] = i * 2;

				if (i % 2 === 0) {
					addComponent(world, eid, TestVelocity);
					TestVelocity.x[eid] = i * 0.5;
				}

				if (i % 3 === 0) {
					addComponent(world, eid, TestHealth);
					TestHealth.current[eid] = 100;
					TestHealth.max[eid] = 100;
				}
			}

			const snapshot = serializeWorld(world, [positionReg, velocityReg, healthReg]);
			expect(snapshot.entityCount).toBe(150);

			const newWorld = deserializeWorld(snapshot);
			const entities = getAllEntities(newWorld);
			expect(entities).toHaveLength(150);

			// Verify some entities
			const withVelocity = entities.filter((e) => hasComponent(newWorld, e, TestVelocity));
			const withHealth = entities.filter((e) => hasComponent(newWorld, e, TestHealth));
			expect(withVelocity.length).toBeGreaterThanOrEqual(70);
			expect(withHealth.length).toBeGreaterThanOrEqual(45);
		});
	});

	// =========================================================================
	// DELTA COMPRESSION
	// =========================================================================

	describe('createWorldDelta', () => {
		it('detects added entities', () => {
			const snapshot1 = serializeWorld(world, [positionReg]);

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 100;

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			expect(delta.addedEntities).toContain(eid);
			expect(delta.removedEntities).toHaveLength(0);
			expect(delta.changedComponents.length).toBeGreaterThan(0);
		});

		it('detects removed entities', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);

			const snapshot1 = serializeWorld(world, [positionReg]);

			removeEntity(world, eid);

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			expect(delta.addedEntities).toHaveLength(0);
			expect(delta.removedEntities).toContain(eid);
		});

		it('detects changed component values', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 10;
			TestPosition.y[eid] = 20;

			const snapshot1 = serializeWorld(world, [positionReg]);

			// Modify values
			TestPosition.x[eid] = 100;
			TestPosition.y[eid] = 200;

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			expect(delta.addedEntities).toHaveLength(0);
			expect(delta.removedEntities).toHaveLength(0);
			expect(delta.changedComponents.length).toBeGreaterThan(0);

			const posChanged = delta.changedComponents.find((c) => c.name === 'Position');
			expect(posChanged).toBeDefined();
			expect(posChanged!.entities).toContain(eid);
		});

		it('detects component additions (not entity additions)', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);

			const snapshot1 = serializeWorld(world, [positionReg, velocityReg]);

			// Add new component to existing entity
			addComponent(world, eid, TestVelocity);
			TestVelocity.x[eid] = 5;

			const snapshot2 = serializeWorld(world, [positionReg, velocityReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			expect(delta.addedEntities).toHaveLength(0);
			expect(delta.changedComponents.length).toBeGreaterThan(0);
			const velChanged = delta.changedComponents.find((c) => c.name === 'Velocity');
			expect(velChanged).toBeDefined();
		});

		it('handles multiple entities with adds, removes, and changes', () => {
			const eid1 = addEntity(world);
			addComponent(world, eid1, TestPosition);
			TestPosition.x[eid1] = 10;

			const eid2 = addEntity(world);
			addComponent(world, eid2, TestPosition);
			TestPosition.x[eid2] = 20;

			const snapshot1 = serializeWorld(world, [positionReg]);

			// Remove eid1
			removeEntity(world, eid1);

			// Modify eid2
			TestPosition.x[eid2] = 999;

			// Add eid3 (bitecs might reuse eid1, so just check counts)
			const eid3 = addEntity(world);
			addComponent(world, eid3, TestPosition);
			TestPosition.x[eid3] = 30;

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			// Should detect the new entity (might be reused ID)
			expect(delta.addedEntities.length + delta.changedComponents.length).toBeGreaterThan(0);
			// eid2 should be in changedComponents or the values should reflect the change
			const posChanged = delta.changedComponents.find((c) => c.name === 'Position');
			expect(posChanged).toBeDefined();
		});
	});

	describe('applyWorldDelta', () => {
		it('applies added entities', () => {
			const baseSnapshot = serializeWorld(world, [positionReg]);

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 100;

			const currentSnapshot = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(baseSnapshot, currentSnapshot);

			// Apply delta to fresh world
			const newWorld = deserializeWorld(baseSnapshot);
			applyWorldDelta(newWorld, delta, [positionReg]);

			const entities = getAllEntities(newWorld);
			expect(entities.length).toBeGreaterThan(0);
		});

		it('applies removed entities', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);

			const snapshot1 = serializeWorld(world, [positionReg]);

			removeEntity(world, eid);

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			// Apply delta to world with entity
			const newWorld = deserializeWorld(snapshot1);
			expect(getAllEntities(newWorld)).toHaveLength(1);

			applyWorldDelta(newWorld, delta, [positionReg]);

			expect(getAllEntities(newWorld)).toHaveLength(0);
		});

		it('applies changed component values', () => {
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 10;

			const snapshot1 = serializeWorld(world, [positionReg]);

			TestPosition.x[eid] = 999;

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			const newWorld = deserializeWorld(snapshot1);
			const newEntities = getAllEntities(newWorld);
			const newEid = newEntities[0]!;

			// Before applying delta
			expect(TestPosition.x[newEid]).toBe(10);

			applyWorldDelta(newWorld, delta, [positionReg]);

			// After applying delta
			expect(TestPosition.x[newEid]).toBe(999);
		});

		it('correctly handles complex delta (add, remove, change)', () => {
			const eid1 = addEntity(world);
			addComponent(world, eid1, TestPosition);
			TestPosition.x[eid1] = 10;

			const eid2 = addEntity(world);
			addComponent(world, eid2, TestPosition);
			TestPosition.x[eid2] = 20;

			const snapshot1 = serializeWorld(world, [positionReg]);

			// Changes
			removeEntity(world, eid1);
			TestPosition.x[eid2] = 200;
			const eid3 = addEntity(world);
			addComponent(world, eid3, TestPosition);
			TestPosition.x[eid3] = 30;

			const snapshot2 = serializeWorld(world, [positionReg]);
			const delta = createWorldDelta(snapshot1, snapshot2);

			// Apply to fresh world
			const newWorld = deserializeWorld(snapshot1);
			applyWorldDelta(newWorld, delta, [positionReg]);

			const entities = getAllEntities(newWorld);
			// Should have eid2 and eid3, not eid1
			expect(entities).toHaveLength(2);
		});
	});
});
