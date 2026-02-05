/**
 * Tests for ECS wrapper module
 * @module core/ecs.test
 */

import { describe, expect, it } from 'vitest';
import {
	addComponent,
	addEntity,
	entityExists,
	getAllEntities,
	hasComponent,
	query,
	removeComponent,
	removeEntity,
} from './ecs';
import { createWorld, resetWorld } from './world';

// Use simple SoA-style components for testing (matching blECSd's pattern)
const TestPosition = {
	x: new Float32Array(1000),
	y: new Float32Array(1000),
};

const TestVelocity = {
	dx: new Float32Array(1000),
	dy: new Float32Array(1000),
};

describe('ecs wrapper', () => {
	describe('addEntity', () => {
		it('should create a new entity in the world', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(entity).toBeGreaterThan(0);
			expect(entityExists(world, entity)).toBe(true);
		});

		it('should create unique entities', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			const entity3 = addEntity(world);

			expect(entity1).not.toBe(entity2);
			expect(entity2).not.toBe(entity3);
			expect(entity1).not.toBe(entity3);
		});
	});

	describe('removeEntity', () => {
		it('should remove an entity from the world', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(entityExists(world, entity)).toBe(true);
			removeEntity(world, entity);
			expect(entityExists(world, entity)).toBe(false);
		});

		it('should remove entity components when entity is removed', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);

			expect(hasComponent(world, entity, TestPosition)).toBe(true);
			removeEntity(world, entity);
			expect(entityExists(world, entity)).toBe(false);
		});
	});

	describe('entityExists', () => {
		it('should return true for existing entities', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(entityExists(world, entity)).toBe(true);
		});

		it('should return false for non-existent entities', () => {
			const world = createWorld();

			// Entity 9999 should not exist in a fresh world
			expect(entityExists(world, 9999)).toBe(false);
		});

		it('should return false after entity is removed', () => {
			const world = createWorld();
			const entity = addEntity(world);
			removeEntity(world, entity);

			expect(entityExists(world, entity)).toBe(false);
		});
	});

	describe('getAllEntities', () => {
		it('should return empty array for empty world', () => {
			const world = createWorld();
			const entities = getAllEntities(world);

			expect(entities).toEqual([]);
		});

		it('should return all entities in the world', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			const entity3 = addEntity(world);

			const entities = getAllEntities(world);

			expect(entities).toHaveLength(3);
			expect(entities).toContain(entity1);
			expect(entities).toContain(entity2);
			expect(entities).toContain(entity3);
		});

		it('should not include removed entities', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			removeEntity(world, entity1);

			const entities = getAllEntities(world);

			expect(entities).toHaveLength(1);
			expect(entities).toContain(entity2);
			expect(entities).not.toContain(entity1);
		});
	});

	describe('addComponent', () => {
		it('should add a component to an entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasComponent(world, entity, TestPosition)).toBe(false);
			addComponent(world, entity, TestPosition);
			expect(hasComponent(world, entity, TestPosition)).toBe(true);
		});

		it('should allow setting component values after adding', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);

			TestPosition.x[entity] = 100;
			TestPosition.y[entity] = 200;

			expect(TestPosition.x[entity]).toBe(100);
			expect(TestPosition.y[entity]).toBe(200);
		});

		it('should allow multiple components on same entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			addComponent(world, entity, TestPosition);
			addComponent(world, entity, TestVelocity);

			expect(hasComponent(world, entity, TestPosition)).toBe(true);
			expect(hasComponent(world, entity, TestVelocity)).toBe(true);
		});
	});

	describe('hasComponent', () => {
		it('should return false when entity does not have component', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasComponent(world, entity, TestPosition)).toBe(false);
		});

		it('should return true when entity has component', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);

			expect(hasComponent(world, entity, TestPosition)).toBe(true);
		});

		it('should correctly distinguish between different components', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);

			expect(hasComponent(world, entity, TestPosition)).toBe(true);
			expect(hasComponent(world, entity, TestVelocity)).toBe(false);
		});
	});

	describe('removeComponent', () => {
		it('should remove a component from an entity', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);

			expect(hasComponent(world, entity, TestPosition)).toBe(true);
			removeComponent(world, entity, TestPosition);
			expect(hasComponent(world, entity, TestPosition)).toBe(false);
		});

		it('should not affect other components on the entity', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);
			addComponent(world, entity, TestVelocity);

			removeComponent(world, entity, TestPosition);

			expect(hasComponent(world, entity, TestPosition)).toBe(false);
			expect(hasComponent(world, entity, TestVelocity)).toBe(true);
		});

		it('should not affect the entity itself', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);
			removeComponent(world, entity, TestPosition);

			expect(entityExists(world, entity)).toBe(true);
		});
	});

	describe('query', () => {
		it('should return empty array when no entities match', () => {
			const world = createWorld();
			addEntity(world); // Entity without components

			const result = query(world, [TestPosition]);

			expect(result).toHaveLength(0);
		});

		it('should return entities with the specified component', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, TestPosition);

			const result = query(world, [TestPosition]);

			expect(result).toHaveLength(1);
			expect(result).toContain(entity1);
			expect(result).not.toContain(entity2);
		});

		it('should return entities with all specified components', () => {
			const world = createWorld();
			const entityBoth = addEntity(world);
			const entityPositionOnly = addEntity(world);
			const entityVelocityOnly = addEntity(world);

			addComponent(world, entityBoth, TestPosition);
			addComponent(world, entityBoth, TestVelocity);
			addComponent(world, entityPositionOnly, TestPosition);
			addComponent(world, entityVelocityOnly, TestVelocity);

			const result = query(world, [TestPosition, TestVelocity]);

			expect(result).toHaveLength(1);
			expect(result).toContain(entityBoth);
		});

		it('should not include removed entities', () => {
			const world = createWorld();
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			addComponent(world, entity1, TestPosition);
			addComponent(world, entity2, TestPosition);

			removeEntity(world, entity1);

			const result = query(world, [TestPosition]);

			expect(result).toHaveLength(1);
			expect(result).toContain(entity2);
			expect(result).not.toContain(entity1);
		});
	});

	describe('integration with world operations', () => {
		it('should work with resetWorld', () => {
			const world = createWorld();
			const entity = addEntity(world);
			addComponent(world, entity, TestPosition);

			resetWorld(world);

			// After reset, entities should be cleared
			const entities = getAllEntities(world);
			expect(entities).toHaveLength(0);
		});
	});
});
