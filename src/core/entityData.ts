/**
 * Entity data storage for arbitrary key-value pairs.
 *
 * Provides a way to store custom data on entities without creating
 * new bitecs components. Useful for user-defined metadata, temporary
 * state, or application-specific data.
 *
 * @module core/entityData
 */

import type { Entity, World } from './types';

/**
 * Type for stored data values.
 * Supports primitives, objects, arrays, and functions.
 */
export type DataValue = unknown;

/**
 * Storage map for a single entity's data.
 */
export type EntityDataMap = Map<string, DataValue>;

/**
 * Global store for all entity data.
 */
const entityDataStore = new Map<Entity, EntityDataMap>();

/**
 * Gets a value stored on an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @param key - The key to retrieve
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored value or defaultValue
 *
 * @example
 * ```typescript
 * import { getEntityData, setEntityData } from 'blecsd';
 *
 * // Store and retrieve data
 * setEntityData(world, playerEntity, 'score', 100);
 * const score = getEntityData(world, playerEntity, 'score', 0);
 * console.log(score); // 100
 *
 * // With default value
 * const health = getEntityData(world, playerEntity, 'health', 100);
 * console.log(health); // 100 (default, since not set)
 * ```
 */
export function getEntityData<T = DataValue>(
	_world: World,
	eid: Entity,
	key: string,
	defaultValue?: T,
): T {
	const data = entityDataStore.get(eid);
	if (!data) {
		return defaultValue as T;
	}
	const value = data.get(key);
	if (value === undefined) {
		return defaultValue as T;
	}
	return value as T;
}

/**
 * Sets a value on an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @param key - The key to set
 * @param value - The value to store
 *
 * @example
 * ```typescript
 * import { setEntityData } from 'blecsd';
 *
 * // Store primitive values
 * setEntityData(world, entity, 'name', 'Player 1');
 * setEntityData(world, entity, 'level', 5);
 * setEntityData(world, entity, 'isActive', true);
 *
 * // Store objects
 * setEntityData(world, entity, 'inventory', { gold: 100, items: [] });
 *
 * // Store functions
 * setEntityData(world, entity, 'onDeath', () => console.log('Game over'));
 * ```
 */
export function setEntityData(_world: World, eid: Entity, key: string, value: DataValue): void {
	let data = entityDataStore.get(eid);
	if (!data) {
		data = new Map();
		entityDataStore.set(eid, data);
	}
	data.set(key, value);
}

/**
 * Checks if an entity has data stored for a specific key.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @param key - The key to check
 * @returns True if the key exists
 *
 * @example
 * ```typescript
 * import { hasEntityData, setEntityData } from 'blecsd';
 *
 * if (!hasEntityData(world, entity, 'initialized')) {
 *   initializeEntity(entity);
 *   setEntityData(world, entity, 'initialized', true);
 * }
 * ```
 */
export function hasEntityData(_world: World, eid: Entity, key: string): boolean {
	const data = entityDataStore.get(eid);
	return data?.has(key) ?? false;
}

/**
 * Deletes a specific key from an entity's data.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @param key - The key to delete
 * @returns True if the key existed and was deleted
 *
 * @example
 * ```typescript
 * import { deleteEntityData, setEntityData } from 'blecsd';
 *
 * setEntityData(world, entity, 'temporaryBuff', { damage: 10 });
 * // Later...
 * deleteEntityData(world, entity, 'temporaryBuff');
 * ```
 */
export function deleteEntityData(_world: World, eid: Entity, key: string): boolean {
	const data = entityDataStore.get(eid);
	return data?.delete(key) ?? false;
}

/**
 * Gets all keys stored on an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns Array of keys
 *
 * @example
 * ```typescript
 * import { getEntityDataKeys, setEntityData } from 'blecsd';
 *
 * setEntityData(world, entity, 'name', 'Player');
 * setEntityData(world, entity, 'score', 100);
 *
 * const keys = getEntityDataKeys(world, entity);
 * console.log(keys); // ['name', 'score']
 * ```
 */
export function getEntityDataKeys(_world: World, eid: Entity): string[] {
	const data = entityDataStore.get(eid);
	return data ? Array.from(data.keys()) : [];
}

/**
 * Gets all data stored on an entity as a plain object.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns Object with all stored key-value pairs
 *
 * @example
 * ```typescript
 * import { getAllEntityData, setEntityData } from 'blecsd';
 *
 * setEntityData(world, entity, 'name', 'Player');
 * setEntityData(world, entity, 'score', 100);
 *
 * const allData = getAllEntityData(world, entity);
 * console.log(allData); // { name: 'Player', score: 100 }
 * ```
 */
export function getAllEntityData(_world: World, eid: Entity): Record<string, DataValue> {
	const data = entityDataStore.get(eid);
	if (!data) {
		return {};
	}
	const result: Record<string, DataValue> = {};
	for (const [key, value] of data) {
		result[key] = value;
	}
	return result;
}

/**
 * Sets multiple values on an entity at once.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param data - Object with key-value pairs to set
 *
 * @example
 * ```typescript
 * import { setEntityDataBulk } from 'blecsd';
 *
 * setEntityDataBulk(world, entity, {
 *   name: 'Player 1',
 *   score: 0,
 *   lives: 3,
 *   powerups: [],
 * });
 * ```
 */
export function setEntityDataBulk(
	world: World,
	eid: Entity,
	data: Record<string, DataValue>,
): void {
	for (const [key, value] of Object.entries(data)) {
		setEntityData(world, eid, key, value);
	}
}

/**
 * Clears all data stored on an entity.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 *
 * @example
 * ```typescript
 * import { clearEntityData } from 'blecsd';
 *
 * // Clear all custom data when entity is destroyed
 * clearEntityData(world, entity);
 * ```
 */
export function clearEntityData(_world: World, eid: Entity): void {
	entityDataStore.delete(eid);
}

/**
 * Clears all entity data from the store.
 * Useful for testing or resetting game state.
 *
 * @example
 * ```typescript
 * import { clearAllEntityData } from 'blecsd';
 *
 * // Reset all entity data
 * clearAllEntityData();
 * ```
 */
export function clearAllEntityData(): void {
	entityDataStore.clear();
}

/**
 * Gets the number of entities with stored data.
 *
 * @returns Number of entities with data
 *
 * @example
 * ```typescript
 * import { getEntityDataCount } from 'blecsd';
 *
 * console.log(`${getEntityDataCount()} entities have custom data`);
 * ```
 */
export function getEntityDataCount(): number {
	return entityDataStore.size;
}

/**
 * Checks if an entity has any data stored.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns True if the entity has any stored data
 *
 * @example
 * ```typescript
 * import { hasAnyEntityData } from 'blecsd';
 *
 * if (hasAnyEntityData(world, entity)) {
 *   console.log('Entity has custom data');
 * }
 * ```
 */
export function hasAnyEntityData(_world: World, eid: Entity): boolean {
	const data = entityDataStore.get(eid);
	return data !== undefined && data.size > 0;
}

/**
 * Updates a value on an entity using a transform function.
 * If the key doesn't exist, the transform receives undefined.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param key - The key to update
 * @param transform - Function to transform the current value
 *
 * @example
 * ```typescript
 * import { updateEntityData, setEntityData } from 'blecsd';
 *
 * setEntityData(world, entity, 'score', 100);
 *
 * // Increment score
 * updateEntityData(world, entity, 'score', (current) => (current ?? 0) + 10);
 *
 * // Toggle boolean
 * updateEntityData(world, entity, 'visible', (current) => !current);
 *
 * // Append to array
 * updateEntityData(world, entity, 'items', (current) => [...(current ?? []), newItem]);
 * ```
 */
export function updateEntityData<T = DataValue>(
	world: World,
	eid: Entity,
	key: string,
	transform: (current: T | undefined) => T,
): void {
	const current = getEntityData<T>(world, eid, key);
	setEntityData(world, eid, key, transform(current));
}
