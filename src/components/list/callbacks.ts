/**
 * List Component Callbacks
 *
 * @module components/list/callbacks
 */

import type { Entity, World } from '../../core/types';
import { activateCallbacks, cancelCallbacks, selectCallbacks } from './stores';
import type { ListSelectCallback } from './types';

/**
 * Registers a callback for when selection changes.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onListSelect(world, eid, (index, item) => {
 *   console.log(`Selected: ${item.text}`);
 * });
 * ```
 */
export function onListSelect(_world: World, eid: Entity, callback: ListSelectCallback): () => void {
	const callbacks = selectCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	selectCallbacks.set(eid, callbacks);

	return () => {
		const cbs = selectCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Registers a callback for when an item is activated (confirmed).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onListActivate(world, eid, (index, item) => {
 *   console.log(`Activated: ${item.text}`);
 * });
 * ```
 */
export function onListActivate(
	_world: World,
	eid: Entity,
	callback: ListSelectCallback,
): () => void {
	const callbacks = activateCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	activateCallbacks.set(eid, callbacks);

	return () => {
		const cbs = activateCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Registers a callback for cancel events (when Escape is pressed).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param callback - Callback function to invoke on cancel
 * @returns Function to unsubscribe the callback
 *
 * @example
 * ```typescript
 * const unsubscribe = onListCancel(world, eid, () => {
 *   console.log('List cancelled');
 * });
 * ```
 */
export function onListCancel(_world: World, eid: Entity, callback: () => void): () => void {
	const callbacks = cancelCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	cancelCallbacks.set(eid, callbacks);

	return () => {
		const cbs = cancelCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Triggers cancel callbacks for a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function triggerListCancel(_world: World, eid: Entity): void {
	const callbacks = cancelCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback();
		}
	}
}

/**
 * Clears all callbacks for a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearListCallbacks(_world: World, eid: Entity): void {
	selectCallbacks.delete(eid);
	activateCallbacks.delete(eid);
	cancelCallbacks.delete(eid);
}
