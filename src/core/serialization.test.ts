/**
 * Tests for ECS world state serialization/deserialization.
 * @module core/serialization.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addComponent, addEntity, createWorld, hasComponent } from './ecs';
import {
	clearSerializableRegistry,
	cloneSnapshot,
	deserializeWorld,
	deserializeWorldFromJSON,
	getRegisteredComponents,
	getSerializable,
	registerSerializable,
	SERIALIZATION_VERSION,
	type SerializedWorld,
	serializeWorld,
	serializeWorldToJSON,
	unregisterSerializable,
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
};

const TestVelocity = {
	vx: new Float32Array(DEFAULT_CAPACITY),
	vy: new Float32Array(DEFAULT_CAPACITY),
};

/** Side store for custom data (not in typed arrays) */
const customDataStore = new Map<number, string>();

const TestCustom = {
	flag: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TESTS
// =============================================================================

describe('serialization', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		clearSerializableRegistry();
		customDataStore.clear();
	});

	afterEach(() => {
		clearSerializableRegistry();
		customDataStore.clear();
	});

	// =========================================================================
	// REGISTRY
	// =========================================================================

	describe('component registry', () => {
		it('registers and retrieves a component descriptor', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const desc = getSerializable('Position');
			expect(desc).toBeDefined();
			expect(desc?.name).toBe('Position');
			expect(desc?.store).toBe(TestPosition);
		});

		it('returns undefined for unregistered components', () => {
			expect(getSerializable('NonExistent')).toBeUndefined();
		});

		it('unregisters a component', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			expect(unregisterSerializable('Position')).toBe(true);
			expect(getSerializable('Position')).toBeUndefined();
		});

		it('returns false when unregistering non-existent component', () => {
			expect(unregisterSerializable('NonExistent')).toBe(false);
		});

		it('lists registered component names', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			registerSerializable({ name: 'Velocity', store: TestVelocity });

			const names = getRegisteredComponents();
			expect(names).toContain('Position');
			expect(names).toContain('Velocity');
			expect(names).toHaveLength(2);
		});

		it('clears all registered components', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			registerSerializable({ name: 'Velocity', store: TestVelocity });

			clearSerializableRegistry();
			expect(getRegisteredComponents()).toHaveLength(0);
		});
	});

	// =========================================================================
	// SERIALIZATION
	// =========================================================================

	describe('serializeWorld', () => {
		it('serializes entities with registered components', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 10;
			TestPosition.y[eid] = 20;
			TestPosition.z[eid] = 5;

			const snapshot = serializeWorld(world);

			expect(snapshot.version).toBe(SERIALIZATION_VERSION);
			expect(snapshot.timestamp).toBeGreaterThan(0);
			expect(snapshot.entities).toHaveLength(1);

			const entity = snapshot.entities[0];
			expect(entity).toBeDefined();
			expect(entity!.components.Position).toBeDefined();
			expect(entity!.components.Position!.fields.x).toBe(10);
			expect(entity!.components.Position!.fields.y).toBe(20);
			expect(entity!.components.Position!.fields.z).toBe(5);
		});

		it('serializes multiple components per entity', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			registerSerializable({ name: 'Velocity', store: TestVelocity });

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			addComponent(world, eid, TestVelocity);
			TestPosition.x[eid] = 1;
			TestPosition.y[eid] = 2;
			TestVelocity.vx[eid] = 3;
			TestVelocity.vy[eid] = 4;

			const snapshot = serializeWorld(world);

			expect(snapshot.entities).toHaveLength(1);
			const entity = snapshot.entities[0]!;
			expect(entity.components.Position).toBeDefined();
			expect(entity.components.Velocity).toBeDefined();
			expect(entity.components.Velocity!.fields.vx).toBe(3);
		});

		it('serializes multiple entities', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const eid1 = addEntity(world);
			addComponent(world, eid1, TestPosition);
			TestPosition.x[eid1] = 100;

			const eid2 = addEntity(world);
			addComponent(world, eid2, TestPosition);
			TestPosition.x[eid2] = 200;

			const snapshot = serializeWorld(world);
			expect(snapshot.entities).toHaveLength(2);
		});

		it('skips entities without registered components', () => {
			// Don't register Position
			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 10;

			const snapshot = serializeWorld(world);
			expect(snapshot.entities).toHaveLength(0);
		});

		it('filters entities by ID', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const eid1 = addEntity(world);
			addComponent(world, eid1, TestPosition);
			TestPosition.x[eid1] = 100;

			const eid2 = addEntity(world);
			addComponent(world, eid2, TestPosition);
			TestPosition.x[eid2] = 200;

			const snapshot = serializeWorld(world, { entityFilter: [eid1] });
			expect(snapshot.entities).toHaveLength(1);
			expect(snapshot.entities[0]!.components.Position!.fields.x).toBe(100);
		});

		it('filters components by name', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			registerSerializable({ name: 'Velocity', store: TestVelocity });

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			addComponent(world, eid, TestVelocity);

			const snapshot = serializeWorld(world, { componentFilter: ['Position'] });
			expect(snapshot.entities).toHaveLength(1);
			expect(snapshot.entities[0]!.components.Position).toBeDefined();
			expect(snapshot.entities[0]!.components.Velocity).toBeUndefined();
		});

		it('includes metadata in snapshot', () => {
			const snapshot = serializeWorld(world, { metadata: { level: 'dungeon-1' } });
			expect(snapshot.metadata).toEqual({ level: 'dungeon-1' });
		});

		it('calls custom serializer', () => {
			registerSerializable({
				name: 'Custom',
				store: TestCustom,
				serialize: (eid) => customDataStore.get(eid as number),
			});

			const eid = addEntity(world);
			addComponent(world, eid, TestCustom);
			TestCustom.flag[eid] = 1;
			customDataStore.set(eid as number, 'hello');

			const snapshot = serializeWorld(world);
			expect(snapshot.entities[0]!.components.Custom!.custom).toBe('hello');
		});
	});

	describe('serializeWorldToJSON', () => {
		it('produces valid JSON', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 42;

			const json = serializeWorldToJSON(world);
			const parsed = JSON.parse(json) as SerializedWorld;
			expect(parsed.version).toBe(1);
			expect(parsed.entities).toHaveLength(1);
		});
	});

	// =========================================================================
	// DESERIALIZATION
	// =========================================================================

	describe('deserializeWorld', () => {
		it('restores entities with component data', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [
					{
						id: 999,
						components: {
							Position: {
								fields: { x: 50, y: 60, z: 3 },
							},
						},
					},
				],
			};

			const result = deserializeWorld(snapshot, world);

			expect(result.entityCount).toBe(1);
			expect(result.componentCount).toBe(1);
			expect(result.entityMap.size).toBe(1);

			const newEid = result.entityMap.get(999);
			expect(newEid).toBeDefined();
			expect(hasComponent(world, newEid!, TestPosition)).toBe(true);
			expect(TestPosition.x[newEid!]).toBe(50);
			expect(TestPosition.y[newEid!]).toBe(60);
			expect(TestPosition.z[newEid!]).toBe(3);
		});

		it('restores multiple entities', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [
					{ id: 1, components: { Position: { fields: { x: 10, y: 20, z: 0 } } } },
					{ id: 2, components: { Position: { fields: { x: 30, y: 40, z: 0 } } } },
				],
			};

			const result = deserializeWorld(snapshot, world);
			expect(result.entityCount).toBe(2);

			const eid1 = result.entityMap.get(1)!;
			const eid2 = result.entityMap.get(2)!;
			expect(TestPosition.x[eid1]).toBe(10);
			expect(TestPosition.x[eid2]).toBe(30);
		});

		it('restores multiple components per entity', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			registerSerializable({ name: 'Velocity', store: TestVelocity });

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [
					{
						id: 1,
						components: {
							Position: { fields: { x: 5, y: 10, z: 0 } },
							Velocity: { fields: { vx: 1, vy: -1 } },
						},
					},
				],
			};

			const result = deserializeWorld(snapshot, world);
			expect(result.componentCount).toBe(2);

			const eid = result.entityMap.get(1)!;
			expect(TestPosition.x[eid]).toBe(5);
			expect(TestVelocity.vx[eid]).toBe(1);
			expect(TestVelocity.vy[eid]).toBeCloseTo(-1);
		});

		it('skips unregistered components gracefully', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [
					{
						id: 1,
						components: {
							Position: { fields: { x: 5, y: 10, z: 0 } },
							UnknownComponent: { fields: { foo: 99 } },
						},
					},
				],
			};

			const result = deserializeWorld(snapshot, world);
			expect(result.componentCount).toBe(1);
		});

		it('creates new world when option is set', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [{ id: 1, components: { Position: { fields: { x: 1, y: 2, z: 0 } } } }],
			};

			const result = deserializeWorld(snapshot, world, { createNew: true });
			expect(result.world).not.toBe(world);
			expect(result.entityCount).toBe(1);
		});

		it('clears world before deserializing when option is set', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			// Add entity to world first
			const existingEid = addEntity(world);
			addComponent(world, existingEid, TestPosition);

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [{ id: 1, components: { Position: { fields: { x: 1, y: 2, z: 0 } } } }],
			};

			const result = deserializeWorld(snapshot, world, { clearWorld: true });
			expect(result.entityCount).toBe(1);
		});

		it('calls custom deserializer', () => {
			registerSerializable({
				name: 'Custom',
				store: TestCustom,
				deserialize: (eid, data) => {
					customDataStore.set(eid as number, data as string);
				},
			});

			const snapshot: SerializedWorld = {
				version: 1,
				timestamp: Date.now(),
				entities: [
					{
						id: 1,
						components: {
							Custom: { fields: { flag: 1 }, custom: 'restored' },
						},
					},
				],
			};

			const result = deserializeWorld(snapshot, world);
			const newEid = result.entityMap.get(1)!;
			expect(TestCustom.flag[newEid]).toBe(1);
			expect(customDataStore.get(newEid as number)).toBe('restored');
		});
	});

	describe('deserializeWorldFromJSON', () => {
		it('parses JSON and restores world state', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const json = JSON.stringify({
				version: 1,
				timestamp: Date.now(),
				entities: [{ id: 1, components: { Position: { fields: { x: 42, y: 84, z: 0 } } } }],
			});

			const result = deserializeWorldFromJSON(json, world);
			expect(result.entityCount).toBe(1);
			const eid = result.entityMap.get(1)!;
			expect(TestPosition.x[eid]).toBe(42);
		});
	});

	// =========================================================================
	// ROUND-TRIP
	// =========================================================================

	describe('round-trip serialization', () => {
		it('preserves data through serialize/deserialize cycle', () => {
			registerSerializable({ name: 'Position', store: TestPosition });
			registerSerializable({ name: 'Velocity', store: TestVelocity });

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			addComponent(world, eid, TestVelocity);
			TestPosition.x[eid] = 123.456;
			TestPosition.y[eid] = -78.9;
			TestPosition.z[eid] = 42;
			TestVelocity.vx[eid] = 5.5;
			TestVelocity.vy[eid] = -3.3;

			const json = serializeWorldToJSON(world);
			const newWorld = createWorld();
			const result = deserializeWorldFromJSON(json, newWorld);

			const newEid = result.entityMap.get(eid as number)!;
			expect(TestPosition.x[newEid]).toBeCloseTo(123.456, 2);
			expect(TestPosition.y[newEid]).toBeCloseTo(-78.9, 1);
			expect(TestPosition.z[newEid]).toBe(42);
			expect(TestVelocity.vx[newEid]).toBeCloseTo(5.5, 1);
			expect(TestVelocity.vy[newEid]).toBeCloseTo(-3.3, 1);
		});

		it('preserves custom data through round-trip', () => {
			registerSerializable({
				name: 'Custom',
				store: TestCustom,
				serialize: (eid) => customDataStore.get(eid as number),
				deserialize: (eid, data) => {
					customDataStore.set(eid as number, data as string);
				},
			});

			const eid = addEntity(world);
			addComponent(world, eid, TestCustom);
			TestCustom.flag[eid] = 1;
			customDataStore.set(eid as number, 'test-data');

			const json = serializeWorldToJSON(world);
			customDataStore.clear();

			const newWorld = createWorld();
			const result = deserializeWorldFromJSON(json, newWorld);
			const newEid = result.entityMap.get(eid as number)!;

			expect(TestCustom.flag[newEid]).toBe(1);
			expect(customDataStore.get(newEid as number)).toBe('test-data');
		});
	});

	// =========================================================================
	// CLONE SNAPSHOT
	// =========================================================================

	describe('cloneSnapshot', () => {
		it('creates a deep copy', () => {
			registerSerializable({ name: 'Position', store: TestPosition });

			const eid = addEntity(world);
			addComponent(world, eid, TestPosition);
			TestPosition.x[eid] = 10;

			const snapshot = serializeWorld(world);
			const clone = cloneSnapshot(snapshot);

			expect(clone).toEqual(snapshot);
			expect(clone).not.toBe(snapshot);
			expect(clone.entities).not.toBe(snapshot.entities);
		});
	});
});
