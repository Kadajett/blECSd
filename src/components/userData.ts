/**
 * UserData component for storing arbitrary application-specific data on entities.
 * Provides blessed-compatible _data, __, and $ aliases.
 * @module components/userData
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * UserData component marker using SoA.
 * The actual data is stored in a separate Map for flexibility.
 *
 * This marker simply tracks which entities have user data.
 * The data itself is stored in userDataStore.
 *
 * @example
 * ```typescript
 * import { UserData, setUserData, getUserData } from 'blecsd';
 *
 * // Set user data
 * setUserData(world, entity, { score: 100, level: 5 });
 *
 * // Get user data
 * const data = getUserData(world, entity);
 * console.log(data?.score); // 100
 * ```
 */
export const UserData = {
	/** Marker to indicate entity has user data (1 = has data) */
	hasData: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * User data storage map.
 * Maps entity IDs to their data objects.
 */
const userDataStore = new Map<Entity, Record<string, unknown>>();

/**
 * User data object type.
 * Can store any key-value pairs.
 */
export type UserDataObject = Record<string, unknown>;

/**
 * Sets user data for an entity.
 * Adds the UserData component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param data - User data object to store
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setUserData } from 'blecsd';
 *
 * setUserData(world, entity, {
 *   customId: 'player1',
 *   inventory: ['sword', 'shield'],
 *   stats: { hp: 100, mp: 50 }
 * });
 * ```
 */
export function setUserData(world: World, eid: Entity, data: UserDataObject): Entity {
	if (!hasComponent(world, eid, UserData)) {
		addComponent(world, eid, UserData);
	}

	UserData.hasData[eid] = 1;
	userDataStore.set(eid, data);

	return eid;
}

/**
 * Gets user data for an entity.
 * Returns undefined if the entity has no user data.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns User data object or undefined
 *
 * @example
 * ```typescript
 * import { getUserData } from 'blecsd';
 *
 * const data = getUserData(world, entity);
 * if (data) {
 *   console.log('Custom data:', data);
 * }
 * ```
 */
export function getUserData(world: World, eid: Entity): UserDataObject | undefined {
	if (!hasComponent(world, eid, UserData) || UserData.hasData[eid] === 0) {
		return undefined;
	}

	return userDataStore.get(eid);
}

/**
 * Gets or creates user data for an entity.
 * If the entity has no user data, creates an empty object.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns User data object (existing or new)
 *
 * @example
 * ```typescript
 * import { getOrCreateUserData } from 'blecsd';
 *
 * const data = getOrCreateUserData(world, entity);
 * data.customProperty = 'value'; // Safe to assign
 * ```
 */
export function getOrCreateUserData(world: World, eid: Entity): UserDataObject {
	let data = getUserData(world, eid);

	if (!data) {
		data = {};
		setUserData(world, eid, data);
	}

	return data;
}

/**
 * Checks if an entity has user data.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity has user data
 *
 * @example
 * ```typescript
 * import { hasUserData } from 'blecsd';
 *
 * if (hasUserData(world, entity)) {
 *   console.log('Entity has custom data');
 * }
 * ```
 */
export function hasUserData(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, UserData) && UserData.hasData[eid] === 1;
}

/**
 * Removes user data from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if data was removed, false if entity had no data
 *
 * @example
 * ```typescript
 * import { removeUserData } from 'blecsd';
 *
 * removeUserData(world, entity);
 * ```
 */
export function removeUserData(world: World, eid: Entity): boolean {
	if (!hasUserData(world, eid)) {
		return false;
	}

	UserData.hasData[eid] = 0;
	return userDataStore.delete(eid);
}

/**
 * Clears all user data from all entities.
 * Useful for testing or when destroying the world.
 *
 * @example
 * ```typescript
 * import { clearAllUserData } from 'blecsd';
 *
 * clearAllUserData();
 * ```
 */
export function clearAllUserData(): void {
	userDataStore.clear();
}

/**
 * Gets the total number of entities with user data.
 * Useful for debugging and metrics.
 *
 * @returns Number of entities with user data
 *
 * @example
 * ```typescript
 * import { getUserDataCount } from 'blecsd';
 *
 * console.log(`${getUserDataCount()} entities have user data`);
 * ```
 */
export function getUserDataCount(): number {
	return userDataStore.size;
}
