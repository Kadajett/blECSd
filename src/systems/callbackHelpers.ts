/**
 * Shared callback helpers for system callback stores.
 *
 * Eliminates duplicated get/register/fire/clear callback patterns
 * across selectSystem, sliderSystem, and other systems.
 *
 * @module systems/callbackHelpers
 */

import type { Entity, World } from '../core/types';
import { getWorldStore } from '../core/worldStore';

/**
 * Creates a typed getter for a world-scoped callback store.
 *
 * @param storeKey - Unique key for the world store (e.g., 'select:changeCallbacks')
 * @returns A function that retrieves the callback map from a world
 *
 * @example
 * ```typescript
 * const getChangeCallbacks = createCallbackStore<SelectCallback>('select:changeCallbacks');
 * const callbacks = getChangeCallbacks(world).get(eid);
 * ```
 */
export function createCallbackStore<T>(
	storeKey: string,
): (world: World) => Map<Entity, T[]> {
	return (world: World) => getWorldStore<Entity, T[]>(world, storeKey);
}

/**
 * Fire all callbacks registered for an entity.
 *
 * @param eid - The entity ID
 * @param callbackMap - Map of entity to callbacks
 */
export function fireCallbacks(
	eid: Entity,
	callbackMap: Map<Entity, Array<() => void>>,
): void {
	const callbacks = callbackMap.get(eid);
	if (!callbacks) return;
	for (const cb of callbacks) {
		cb();
	}
}

/**
 * Register a callback for an entity and return an unsubscribe function.
 *
 * @param store - The callback store map
 * @param eid - The entity ID
 * @param callback - The callback to register
 * @returns Unsubscribe function that removes the callback
 *
 * @example
 * ```typescript
 * const unsub = registerCallback(getChangeCallbacks(world), eid, myCallback);
 * // Later:
 * unsub(); // removes the callback
 * ```
 */
export function registerCallback<T>(
	store: Map<Entity, T[]>,
	eid: Entity,
	callback: T,
): () => void {
	const callbacks = store.get(eid) ?? [];
	callbacks.push(callback);
	store.set(eid, callbacks);

	return () => {
		const cbs = store.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Clear all callbacks for a specific entity from multiple stores.
 *
 * @param eid - The entity ID
 * @param stores - The callback store maps to clear
 */
export function clearEntityCallbacks(
	eid: Entity,
	...stores: Map<Entity, unknown[]>[]
): void {
	for (const store of stores) {
		store.delete(eid);
	}
}

/**
 * Clear all callbacks from multiple stores (full reset).
 *
 * @param stores - The callback store maps to clear
 */
export function clearAllCallbacks(
	...stores: Map<Entity, unknown[]>[]
): void {
	for (const store of stores) {
		store.clear();
	}
}
