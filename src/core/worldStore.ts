/**
 * WorldStore - Utilities for world-scoped storage
 *
 * Provides a pattern for storing entity-associated data on the world object
 * rather than in module-level Map singletons. This ensures:
 * - World isolation: Each world has its own data
 * - Memory safety: Data is cleaned up when world is destroyed
 * - Library-first: Users can create multiple worlds without conflicts
 * - Testability: No global state between tests
 *
 * @module core/worldStore
 */

import type { Entity, World } from './types';

/**
 * Symbol namespace for world stores to avoid collisions with user properties.
 * @internal
 */
const WORLD_STORES = Symbol.for('blecsd:stores');

/**
 * Gets or creates a world-scoped store.
 * Stores are Maps that live on the world object, not as module singletons.
 *
 * @param world - The ECS world
 * @param key - Unique string key for this store (e.g., 'select:options')
 * @returns A Map scoped to this world
 *
 * @example
 * ```typescript
 * // Instead of module-level singleton:
 * // const optionsStore = new Map<Entity, SelectOption[]>();
 *
 * // Use world-scoped store:
 * function getOptionsStore(world: World): Map<Entity, SelectOption[]> {
 *   return getWorldStore(world, 'select:options');
 * }
 *
 * // Usage
 * const store = getOptionsStore(world);
 * store.set(entity, options);
 * ```
 */
export function getWorldStore<K, V>(world: World, key: string): Map<K, V> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const w = world as any;

	// Initialize stores namespace on world if it doesn't exist
	if (!w[WORLD_STORES]) {
		w[WORLD_STORES] = new Map<string, Map<unknown, unknown>>();
	}

	const stores = w[WORLD_STORES] as Map<string, Map<K, V>>;

	// Get or create store for this key
	if (!stores.has(key)) {
		stores.set(key, new Map<K, V>());
	}

	return stores.get(key) as Map<K, V>;
}

/**
 * Gets or creates a world-scoped Set.
 *
 * @param world - The ECS world
 * @param key - Unique string key for this set
 * @returns A Set scoped to this world
 *
 * @example
 * ```typescript
 * function getActiveSpinners(world: World): Set<Entity> {
 *   return getWorldSet(world, 'spinner:active');
 * }
 * ```
 */
export function getWorldSet<T>(world: World, key: string): Set<T> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const w = world as any;

	if (!w[WORLD_STORES]) {
		w[WORLD_STORES] = new Map<string, unknown>();
	}

	const stores = w[WORLD_STORES] as Map<string, Set<T>>;

	if (!stores.has(key)) {
		stores.set(key, new Set<T>());
	}

	return stores.get(key) as Set<T>;
}

/**
 * Cleans up all data for an entity across all world stores.
 * Call this when an entity is removed to prevent memory leaks.
 *
 * @param world - The ECS world
 * @param entity - The entity being removed
 *
 * @example
 * ```typescript
 * export function removeEntity(world: World, entity: Entity): void {
 *   // ... remove from components ...
 *   cleanupEntityStores(world, entity);
 * }
 * ```
 */
export function cleanupEntityStores(world: World, entity: Entity): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const w = world as any;

	if (!w[WORLD_STORES]) {
		return;
	}

	const stores = w[WORLD_STORES] as Map<string, unknown>;

	// Remove entity from all Maps and Sets
	for (const store of stores.values()) {
		if (store instanceof Map) {
			(store as Map<Entity, unknown>).delete(entity);
		} else if (store instanceof Set) {
			(store as Set<Entity>).delete(entity);
		}
	}
}

/**
 * Destroys all stores for a world.
 * Call this when destroying a world to free memory.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * export function destroyWorld(world: World): void {
 *   clearWorldStores(world);
 *   // ... other cleanup ...
 * }
 * ```
 */
export function clearWorldStores(world: World): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const w = world as any;

	if (w[WORLD_STORES]) {
		w[WORLD_STORES].clear();
		delete w[WORLD_STORES];
	}
}

/**
 * Gets all store keys for debugging/inspection.
 * @internal
 */
export function getStoreKeys(world: World): string[] {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const w = world as any;

	if (!w[WORLD_STORES]) {
		return [];
	}

	const stores = w[WORLD_STORES] as Map<string, unknown>;
	return Array.from(stores.keys());
}
