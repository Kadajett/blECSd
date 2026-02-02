/**
 * Entity data storage tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	clearAllEntityData,
	clearEntityData,
	deleteEntityData,
	getAllEntityData,
	getEntityData,
	getEntityDataCount,
	getEntityDataKeys,
	hasAnyEntityData,
	hasEntityData,
	setEntityData,
	setEntityDataBulk,
	updateEntityData,
} from './entityData';
import type { Entity } from './types';

describe('entityData', () => {
	const entity1 = 1 as Entity;
	const entity2 = 2 as Entity;

	beforeEach(() => {
		clearAllEntityData();
	});

	describe('getEntityData', () => {
		it('should return default value when key does not exist', () => {
			const value = getEntityData(entity1, 'nonexistent', 'default');
			expect(value).toBe('default');
		});

		it('should return undefined when no default provided', () => {
			const value = getEntityData(entity1, 'nonexistent');
			expect(value).toBeUndefined();
		});

		it('should return stored value', () => {
			setEntityData(entity1, 'name', 'Player');
			const value = getEntityData(entity1, 'name');
			expect(value).toBe('Player');
		});

		it('should return stored value over default', () => {
			setEntityData(entity1, 'score', 100);
			const value = getEntityData(entity1, 'score', 0);
			expect(value).toBe(100);
		});
	});

	describe('setEntityData', () => {
		it('should store primitive values', () => {
			setEntityData(entity1, 'string', 'hello');
			setEntityData(entity1, 'number', 42);
			setEntityData(entity1, 'boolean', true);
			setEntityData(entity1, 'null', null);

			expect(getEntityData(entity1, 'string')).toBe('hello');
			expect(getEntityData(entity1, 'number')).toBe(42);
			expect(getEntityData(entity1, 'boolean')).toBe(true);
			expect(getEntityData(entity1, 'null')).toBeNull();
		});

		it('should store objects', () => {
			const obj = { x: 10, y: 20 };
			setEntityData(entity1, 'position', obj);

			const retrieved = getEntityData<typeof obj>(entity1, 'position');
			expect(retrieved).toEqual(obj);
			expect(retrieved).toBe(obj); // Same reference
		});

		it('should store arrays', () => {
			const arr = [1, 2, 3];
			setEntityData(entity1, 'items', arr);

			const retrieved = getEntityData<number[]>(entity1, 'items');
			expect(retrieved).toEqual(arr);
		});

		it('should store functions', () => {
			const fn = () => 'test';
			setEntityData(entity1, 'callback', fn);

			const retrieved = getEntityData<typeof fn>(entity1, 'callback');
			expect(retrieved).toBe(fn);
			expect(retrieved?.()).toBe('test');
		});

		it('should overwrite existing values', () => {
			setEntityData(entity1, 'value', 1);
			setEntityData(entity1, 'value', 2);

			expect(getEntityData(entity1, 'value')).toBe(2);
		});

		it('should store data per entity', () => {
			setEntityData(entity1, 'name', 'Player 1');
			setEntityData(entity2, 'name', 'Player 2');

			expect(getEntityData(entity1, 'name')).toBe('Player 1');
			expect(getEntityData(entity2, 'name')).toBe('Player 2');
		});
	});

	describe('hasEntityData', () => {
		it('should return false for nonexistent key', () => {
			expect(hasEntityData(entity1, 'nonexistent')).toBe(false);
		});

		it('should return true for existing key', () => {
			setEntityData(entity1, 'exists', 'value');
			expect(hasEntityData(entity1, 'exists')).toBe(true);
		});

		it('should return true for null value', () => {
			setEntityData(entity1, 'nullable', null);
			expect(hasEntityData(entity1, 'nullable')).toBe(true);
		});

		it('should return true for undefined value', () => {
			setEntityData(entity1, 'undef', undefined);
			expect(hasEntityData(entity1, 'undef')).toBe(true);
		});
	});

	describe('deleteEntityData', () => {
		it('should return false for nonexistent key', () => {
			expect(deleteEntityData(entity1, 'nonexistent')).toBe(false);
		});

		it('should delete existing key and return true', () => {
			setEntityData(entity1, 'toDelete', 'value');
			expect(deleteEntityData(entity1, 'toDelete')).toBe(true);
			expect(hasEntityData(entity1, 'toDelete')).toBe(false);
		});

		it('should not affect other keys', () => {
			setEntityData(entity1, 'keep', 'value1');
			setEntityData(entity1, 'delete', 'value2');

			deleteEntityData(entity1, 'delete');

			expect(hasEntityData(entity1, 'keep')).toBe(true);
		});
	});

	describe('getEntityDataKeys', () => {
		it('should return empty array for entity without data', () => {
			expect(getEntityDataKeys(entity1)).toEqual([]);
		});

		it('should return all keys', () => {
			setEntityData(entity1, 'a', 1);
			setEntityData(entity1, 'b', 2);
			setEntityData(entity1, 'c', 3);

			const keys = getEntityDataKeys(entity1);
			expect(keys).toHaveLength(3);
			expect(keys).toContain('a');
			expect(keys).toContain('b');
			expect(keys).toContain('c');
		});
	});

	describe('getAllEntityData', () => {
		it('should return empty object for entity without data', () => {
			expect(getAllEntityData(entity1)).toEqual({});
		});

		it('should return all data as object', () => {
			setEntityData(entity1, 'name', 'Player');
			setEntityData(entity1, 'score', 100);

			const data = getAllEntityData(entity1);
			expect(data).toEqual({ name: 'Player', score: 100 });
		});
	});

	describe('setEntityDataBulk', () => {
		it('should set multiple values at once', () => {
			setEntityDataBulk(entity1, {
				name: 'Player',
				score: 100,
				level: 5,
			});

			expect(getEntityData(entity1, 'name')).toBe('Player');
			expect(getEntityData(entity1, 'score')).toBe(100);
			expect(getEntityData(entity1, 'level')).toBe(5);
		});

		it('should merge with existing data', () => {
			setEntityData(entity1, 'existing', 'value');
			setEntityDataBulk(entity1, { new: 'data' });

			expect(getEntityData(entity1, 'existing')).toBe('value');
			expect(getEntityData(entity1, 'new')).toBe('data');
		});
	});

	describe('clearEntityData', () => {
		it('should clear all data for entity', () => {
			setEntityData(entity1, 'a', 1);
			setEntityData(entity1, 'b', 2);

			clearEntityData(entity1);

			expect(hasAnyEntityData(entity1)).toBe(false);
		});

		it('should not affect other entities', () => {
			setEntityData(entity1, 'data', 'value1');
			setEntityData(entity2, 'data', 'value2');

			clearEntityData(entity1);

			expect(hasAnyEntityData(entity1)).toBe(false);
			expect(getEntityData(entity2, 'data')).toBe('value2');
		});
	});

	describe('clearAllEntityData', () => {
		it('should clear data for all entities', () => {
			setEntityData(entity1, 'data', 'value1');
			setEntityData(entity2, 'data', 'value2');

			clearAllEntityData();

			expect(hasAnyEntityData(entity1)).toBe(false);
			expect(hasAnyEntityData(entity2)).toBe(false);
		});
	});

	describe('getEntityDataCount', () => {
		it('should return 0 when no entities have data', () => {
			expect(getEntityDataCount()).toBe(0);
		});

		it('should return count of entities with data', () => {
			setEntityData(entity1, 'data', 'value');
			expect(getEntityDataCount()).toBe(1);

			setEntityData(entity2, 'data', 'value');
			expect(getEntityDataCount()).toBe(2);
		});

		it('should decrease when entity data is cleared', () => {
			setEntityData(entity1, 'data', 'value');
			setEntityData(entity2, 'data', 'value');

			clearEntityData(entity1);
			expect(getEntityDataCount()).toBe(1);
		});
	});

	describe('hasAnyEntityData', () => {
		it('should return false for entity without data', () => {
			expect(hasAnyEntityData(entity1)).toBe(false);
		});

		it('should return true for entity with data', () => {
			setEntityData(entity1, 'key', 'value');
			expect(hasAnyEntityData(entity1)).toBe(true);
		});

		it('should return false after all keys deleted', () => {
			setEntityData(entity1, 'key', 'value');
			deleteEntityData(entity1, 'key');

			// Note: The map still exists but is empty
			expect(hasAnyEntityData(entity1)).toBe(false);
		});
	});

	describe('updateEntityData', () => {
		it('should update existing value', () => {
			setEntityData(entity1, 'count', 10);
			updateEntityData<number>(entity1, 'count', (current) => (current ?? 0) + 5);

			expect(getEntityData(entity1, 'count')).toBe(15);
		});

		it('should handle undefined current value', () => {
			updateEntityData<number>(entity1, 'count', (current) => (current ?? 0) + 5);

			expect(getEntityData(entity1, 'count')).toBe(5);
		});

		it('should toggle boolean', () => {
			setEntityData(entity1, 'visible', true);
			updateEntityData<boolean>(entity1, 'visible', (current) => !current);

			expect(getEntityData(entity1, 'visible')).toBe(false);
		});

		it('should append to array', () => {
			setEntityData(entity1, 'items', [1, 2]);
			updateEntityData<number[]>(entity1, 'items', (current) => [...(current ?? []), 3]);

			expect(getEntityData(entity1, 'items')).toEqual([1, 2, 3]);
		});
	});

	describe('type safety', () => {
		it('should preserve type through get/set', () => {
			interface PlayerData {
				name: string;
				level: number;
			}

			const playerData: PlayerData = { name: 'Hero', level: 10 };
			setEntityData(entity1, 'player', playerData);

			const retrieved = getEntityData<PlayerData>(entity1, 'player');
			expect(retrieved?.name).toBe('Hero');
			expect(retrieved?.level).toBe(10);
		});
	});
});
