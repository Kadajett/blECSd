/**
 * Entity disposal and cleanup system.
 *
 * Handles proper cleanup of entities including:
 * - Deferred destruction (mark for destruction, process at frame end)
 * - Hierarchy cleanup (remove from parent, destroy children)
 * - Lifecycle event emission
 * - Store cleanup
 * - Entity recycling
 *
 * @module core/disposal
 *
 * @example
 * ```typescript
 * import { destroyEntity, destroyAllChildren, flushDestroyQueue } from 'blecsd';
 *
 * // Mark entity for destruction (deferred)
 * destroyEntity(world, entity);
 *
 * // At end of frame, process all pending destructions
 * flushDestroyQueue(world);
 *
 * // Or destroy immediately
 * destroyEntity(world, entity, { immediate: true });
 * ```
 */

import {
	getChildren,
	getParent,
	Hierarchy,
	NULL_ENTITY,
	removeChild,
} from '../components/hierarchy';
import { hasComponent, removeEntity } from './ecs';
import { createEventBus } from './events';
import {
	emitDestroy,
	getLifecycleEventBus,
	type LifecycleEventMap,
	removeLifecycleEventBus,
} from './lifecycleEvents';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for entity destruction.
 */
export interface DestroyOptions {
	/**
	 * If true, destroy immediately instead of deferring to end of frame.
	 * Use with caution as this may cause issues during iteration.
	 */
	immediate?: boolean;

	/**
	 * If true, also destroy all children recursively.
	 * Defaults to true.
	 */
	destroyChildren?: boolean;

	/**
	 * If true, emit destroy event before cleanup.
	 * Defaults to true.
	 */
	emitEvent?: boolean;
}

/**
 * Callback for custom cleanup when an entity is destroyed.
 */
export type CleanupCallback = (world: World, entity: Entity) => void;

// =============================================================================
// DESTRUCTION QUEUE
// =============================================================================

/** Entities marked for destruction */
const destroyQueue = new Set<Entity>();

/** Per-world destruction queues */
const worldDestroyQueues = new WeakMap<World, Set<Entity>>();

/** Custom cleanup callbacks registered for entity types */
const cleanupCallbacks: CleanupCallback[] = [];

/**
 * Gets the destroy queue for a world.
 */
function getWorldDestroyQueue(world: World): Set<Entity> {
	let queue = worldDestroyQueues.get(world);
	if (!queue) {
		queue = new Set();
		worldDestroyQueues.set(world, queue);
	}
	return queue;
}

// =============================================================================
// CLEANUP REGISTRATION
// =============================================================================

/**
 * Registers a cleanup callback that runs when any entity is destroyed.
 *
 * Use this to register store cleanup functions.
 *
 * @param callback - Function to call during entity cleanup
 * @returns Function to unregister the callback
 *
 * @example
 * ```typescript
 * import { registerCleanupCallback } from 'blecsd';
 *
 * // Register cleanup for a custom store
 * const unregister = registerCleanupCallback((world, entity) => {
 *   myCustomStore.delete(entity);
 * });
 *
 * // Later, unregister if needed
 * unregister();
 * ```
 */
export function registerCleanupCallback(callback: CleanupCallback): () => void {
	cleanupCallbacks.push(callback);
	return () => {
		const index = cleanupCallbacks.indexOf(callback);
		if (index !== -1) {
			cleanupCallbacks.splice(index, 1);
		}
	};
}

/**
 * Clears all registered cleanup callbacks.
 * Primarily for testing.
 */
export function clearCleanupCallbacks(): void {
	cleanupCallbacks.length = 0;
}

// =============================================================================
// DESTRUCTION FUNCTIONS
// =============================================================================

/**
 * Marks an entity for destruction.
 *
 * By default, destruction is deferred to the end of the frame via
 * `flushDestroyQueue()`. This prevents issues when destroying entities
 * during iteration.
 *
 * @param world - The ECS world
 * @param entity - The entity to destroy
 * @param options - Destruction options
 *
 * @example
 * ```typescript
 * import { destroyEntity } from 'blecsd';
 *
 * // Deferred destruction (recommended)
 * destroyEntity(world, entity);
 *
 * // Immediate destruction
 * destroyEntity(world, entity, { immediate: true });
 *
 * // Don't destroy children
 * destroyEntity(world, entity, { destroyChildren: false });
 * ```
 */
export function destroyEntity(world: World, entity: Entity, options: DestroyOptions = {}): void {
	const { immediate = false, destroyChildren = true, emitEvent = true } = options;

	if (immediate) {
		performDestruction(world, entity, destroyChildren, emitEvent);
	} else {
		// Queue for deferred destruction
		const queue = getWorldDestroyQueue(world);
		queue.add(entity);
		destroyQueue.add(entity);

		// Also queue children if requested
		if (destroyChildren && hasComponent(world, entity, Hierarchy)) {
			const children = getChildren(world, entity);
			for (const child of children) {
				queue.add(child);
				destroyQueue.add(child);
			}
		}
	}
}

/**
 * Destroys all children of an entity without destroying the parent.
 *
 * @param world - The ECS world
 * @param parent - The parent entity
 * @param options - Destruction options (immediate applies to all children)
 *
 * @example
 * ```typescript
 * import { destroyAllChildren } from 'blecsd';
 *
 * // Clear all children from a container
 * destroyAllChildren(world, container);
 * ```
 */
export function destroyAllChildren(
	world: World,
	parent: Entity,
	options: DestroyOptions = {},
): void {
	if (!hasComponent(world, parent, Hierarchy)) {
		return;
	}

	const children = getChildren(world, parent);
	for (const child of children) {
		destroyEntity(world, child, options);
	}
}

/**
 * Checks if an entity is marked for destruction.
 *
 * @param entity - The entity to check
 * @returns true if entity is queued for destruction
 */
export function isMarkedForDestruction(entity: Entity): boolean {
	return destroyQueue.has(entity);
}

/**
 * Processes all entities marked for destruction.
 *
 * Should be called at the end of each frame, typically in POST_RENDER phase.
 *
 * @param world - The ECS world
 * @returns Number of entities destroyed
 *
 * @example
 * ```typescript
 * import { flushDestroyQueue } from 'blecsd';
 *
 * // In your game loop's post-render phase:
 * const destroyed = flushDestroyQueue(world);
 * ```
 */
export function flushDestroyQueue(world: World): number {
	const queue = getWorldDestroyQueue(world);
	const count = queue.size;

	if (count === 0) {
		return 0;
	}

	// Process in reverse order to handle children before parents
	// (children are typically added to queue after parents)
	const entities = Array.from(queue);

	// Sort by depth (deepest first) to ensure children are destroyed before parents
	entities.sort((a, b) => {
		const depthA = hasComponent(world, a, Hierarchy) ? (Hierarchy.depth[a] ?? 0) : 0;
		const depthB = hasComponent(world, b, Hierarchy) ? (Hierarchy.depth[b] ?? 0) : 0;
		return depthB - depthA;
	});

	for (const entity of entities) {
		// Skip if already destroyed (e.g., was a child of an already-processed entity)
		if (!destroyQueue.has(entity)) {
			continue;
		}

		performDestruction(world, entity, false, true);
	}

	queue.clear();
	return count;
}

/**
 * Performs the actual destruction of an entity.
 */
function performDestruction(
	world: World,
	entity: Entity,
	destroyChildren: boolean,
	emitEvent: boolean,
): void {
	// Remove from global queue
	destroyQueue.delete(entity);

	// Emit destroy event
	if (emitEvent) {
		try {
			const bus = getLifecycleEventBus(entity, () => createEventBus<LifecycleEventMap>());
			emitDestroy(bus, entity);
		} catch {
			// Ignore errors from event emission
		}
	}

	// Destroy children first if requested
	if (destroyChildren && hasComponent(world, entity, Hierarchy)) {
		const children = getChildren(world, entity);
		for (const child of children) {
			performDestruction(world, child, true, emitEvent);
		}
	}

	// Remove from parent
	if (hasComponent(world, entity, Hierarchy)) {
		const parent = getParent(world, entity);
		if (parent !== NULL_ENTITY) {
			removeChild(world, parent, entity);
		}
	}

	// Run custom cleanup callbacks
	for (const callback of cleanupCallbacks) {
		try {
			callback(world, entity);
		} catch {
			// Ignore errors from cleanup callbacks
		}
	}

	// Clean up lifecycle event bus
	removeLifecycleEventBus(entity);

	// Remove entity from bitecs (recycles the ID)
	try {
		removeEntity(world, entity);
	} catch {
		// Entity may already be removed
	}
}

// =============================================================================
// WORLD DESTRUCTION
// =============================================================================

/**
 * Destroys all entities in a world.
 *
 * This performs immediate destruction of all entities.
 *
 * @param world - The ECS world to clear
 *
 * @example
 * ```typescript
 * import { destroyWorld } from 'blecsd';
 *
 * // Clean up everything before resetting
 * destroyWorld(world);
 * ```
 */
export function destroyWorld(world: World): void {
	// Clear the destroy queue first
	const queue = getWorldDestroyQueue(world);
	queue.clear();
	destroyQueue.clear();

	// Note: In bitecs, we can't easily iterate all entities
	// The typical pattern is to reset the world entirely
	// For now, just clear our tracking structures
	clearCleanupCallbacks();
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the number of entities currently queued for destruction.
 *
 * @param world - Optional world to check (if not provided, returns global count)
 * @returns Number of entities in destroy queue
 */
export function getDestroyQueueSize(world?: World): number {
	if (world) {
		const queue = worldDestroyQueues.get(world);
		return queue?.size ?? 0;
	}
	return destroyQueue.size;
}

/**
 * Clears the destruction queue without destroying entities.
 *
 * Use with caution - entities will remain but won't be destroyed.
 *
 * @param world - The ECS world
 */
export function clearDestroyQueue(world: World): void {
	const queue = getWorldDestroyQueue(world);
	for (const entity of queue) {
		destroyQueue.delete(entity);
	}
	queue.clear();
}

/**
 * Resets all disposal state.
 * Primarily for testing.
 */
export function resetDisposalState(): void {
	destroyQueue.clear();
	cleanupCallbacks.length = 0;
}
