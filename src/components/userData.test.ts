import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createWorld } from '../core/world';
import {
	clearAllUserData,
	getOrCreateUserData,
	getUserData,
	getUserDataCount,
	hasUserData,
	removeUserData,
	setUserData,
} from './userData';

describe('UserData Component', () => {
	let world: World;
	let entity: Entity;

	beforeEach(() => {
		world = createWorld();
		entity = addEntity(world);
	});

	afterEach(() => {
		clearAllUserData();
	});

	describe('setUserData', () => {
		it('should store user data on an entity', () => {
			const data = { name: 'player', score: 100 };
			setUserData(world, entity, data);

			const retrieved = getUserData(world, entity);
			expect(retrieved).toEqual(data);
		});

		it('should return the entity for chaining', () => {
			const result = setUserData(world, entity, {});
			expect(result).toBe(entity);
		});

		it('should overwrite existing data', () => {
			setUserData(world, entity, { old: 'data' });
			setUserData(world, entity, { new: 'data' });

			const retrieved = getUserData(world, entity);
			expect(retrieved).toEqual({ new: 'data' });
		});

		it('should handle complex nested data', () => {
			const complexData = {
				id: 'player1',
				stats: { hp: 100, mp: 50, level: 10 },
				inventory: ['sword', 'shield', 'potion'],
				metadata: {
					createdAt: new Date(),
					tags: ['warrior', 'hero'],
				},
			};

			setUserData(world, entity, complexData);
			const retrieved = getUserData(world, entity);

			expect(retrieved).toEqual(complexData);
		});
	});

	describe('getUserData', () => {
		it('should return undefined for entity with no user data', () => {
			const data = getUserData(world, entity);
			expect(data).toBeUndefined();
		});

		it('should return stored data', () => {
			const testData = { value: 42 };
			setUserData(world, entity, testData);

			const retrieved = getUserData(world, entity);
			expect(retrieved).toEqual(testData);
		});

		it('should handle empty objects', () => {
			setUserData(world, entity, {});
			const retrieved = getUserData(world, entity);
			expect(retrieved).toEqual({});
		});
	});

	describe('getOrCreateUserData', () => {
		it('should return existing data if present', () => {
			const existingData = { existing: true };
			setUserData(world, entity, existingData);

			const data = getOrCreateUserData(world, entity);
			expect(data).toEqual(existingData);
		});

		it('should create empty object if no data exists', () => {
			const data = getOrCreateUserData(world, entity);
			expect(data).toEqual({});
		});

		it('should allow mutation of created object', () => {
			const data = getOrCreateUserData(world, entity);
			data.customProperty = 'value';

			const retrieved = getUserData(world, entity);
			expect(retrieved?.customProperty).toBe('value');
		});

		it('should persist created data', () => {
			const data1 = getOrCreateUserData(world, entity);
			data1.test = 'value';

			const data2 = getOrCreateUserData(world, entity);
			expect(data2.test).toBe('value');
		});
	});

	describe('hasUserData', () => {
		it('should return false for entity with no data', () => {
			expect(hasUserData(world, entity)).toBe(false);
		});

		it('should return true for entity with data', () => {
			setUserData(world, entity, { some: 'data' });
			expect(hasUserData(world, entity)).toBe(true);
		});

		it('should return true even for empty object', () => {
			setUserData(world, entity, {});
			expect(hasUserData(world, entity)).toBe(true);
		});

		it('should return false after data is removed', () => {
			setUserData(world, entity, { some: 'data' });
			removeUserData(world, entity);
			expect(hasUserData(world, entity)).toBe(false);
		});
	});

	describe('removeUserData', () => {
		it('should remove user data from entity', () => {
			setUserData(world, entity, { data: 'test' });
			removeUserData(world, entity);

			expect(hasUserData(world, entity)).toBe(false);
			expect(getUserData(world, entity)).toBeUndefined();
		});

		it('should return true when data was removed', () => {
			setUserData(world, entity, {});
			const result = removeUserData(world, entity);
			expect(result).toBe(true);
		});

		it('should return false when no data to remove', () => {
			const result = removeUserData(world, entity);
			expect(result).toBe(false);
		});

		it('should handle multiple removes gracefully', () => {
			setUserData(world, entity, {});
			removeUserData(world, entity);
			const result = removeUserData(world, entity);
			expect(result).toBe(false);
		});
	});

	describe('clearAllUserData', () => {
		it('should clear all user data from all entities', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			const entity3 = addEntity(world);

			setUserData(world, entity1, { id: 1 });
			setUserData(world, entity2, { id: 2 });
			setUserData(world, entity3, { id: 3 });

			expect(getUserDataCount()).toBe(3);

			clearAllUserData();

			expect(getUserDataCount()).toBe(0);
			expect(getUserData(world, entity1)).toBeUndefined();
			expect(getUserData(world, entity2)).toBeUndefined();
			expect(getUserData(world, entity3)).toBeUndefined();
		});
	});

	describe('getUserDataCount', () => {
		it('should return 0 when no entities have data', () => {
			expect(getUserDataCount()).toBe(0);
		});

		it('should return correct count of entities with data', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);
			const entity3 = addEntity(world);

			setUserData(world, entity1, {});
			expect(getUserDataCount()).toBe(1);

			setUserData(world, entity2, {});
			expect(getUserDataCount()).toBe(2);

			setUserData(world, entity3, {});
			expect(getUserDataCount()).toBe(3);
		});

		it('should decrement when data is removed', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			setUserData(world, entity1, {});
			setUserData(world, entity2, {});
			expect(getUserDataCount()).toBe(2);

			removeUserData(world, entity1);
			expect(getUserDataCount()).toBe(1);

			removeUserData(world, entity2);
			expect(getUserDataCount()).toBe(0);
		});

		it('should not count overwritten data multiple times', () => {
			setUserData(world, entity, { first: 'data' });
			setUserData(world, entity, { second: 'data' });

			expect(getUserDataCount()).toBe(1);
		});
	});

	describe('multiple entities', () => {
		it('should keep data separate per entity', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			setUserData(world, entity1, { id: 1, name: 'first' });
			setUserData(world, entity2, { id: 2, name: 'second' });

			const data1 = getUserData(world, entity1);
			const data2 = getUserData(world, entity2);

			expect(data1).toEqual({ id: 1, name: 'first' });
			expect(data2).toEqual({ id: 2, name: 'second' });
		});

		it('should allow independent modification', () => {
			const entity1 = addEntity(world);
			const entity2 = addEntity(world);

			const data1 = getOrCreateUserData(world, entity1);
			const data2 = getOrCreateUserData(world, entity2);

			data1.value = 'first';
			data2.value = 'second';

			expect(getUserData(world, entity1)?.value).toBe('first');
			expect(getUserData(world, entity2)?.value).toBe('second');
		});
	});

	describe('type safety', () => {
		it('should handle various data types', () => {
			const data = {
				string: 'text',
				number: 42,
				boolean: true,
				null: null,
				array: [1, 2, 3],
				object: { nested: 'value' },
				date: new Date(),
				undefined: undefined,
			};

			setUserData(world, entity, data);
			const retrieved = getUserData(world, entity);

			expect(retrieved).toEqual(data);
		});

		it('should preserve reference types', () => {
			const sharedArray = [1, 2, 3];
			const sharedObject = { nested: 'value' };

			const data = {
				array: sharedArray,
				object: sharedObject,
			};

			setUserData(world, entity, data);
			const retrieved = getUserData(world, entity);

			// Same references
			expect(retrieved?.array).toBe(sharedArray);
			expect(retrieved?.object).toBe(sharedObject);
		});
	});
});
