/**
 * Event propagation to descendants (downward through hierarchy).
 * Emits events to an entity and all its children recursively.
 * @module core/eventDescendants
 */

import { z } from 'zod';
import { Hierarchy, NULL_ENTITY } from '../components/hierarchy';
import { hasComponent } from './ecs';
import type { EventBus, EventMap } from './events';
import type { Entity, World } from './types';

/**
 * Function type for getting an EventBus for a specific entity.
 * Returns undefined if the entity has no event bus.
 */
export type GetEntityEventBus<T extends EventMap> = (
	world: World,
	eid: Entity,
) => EventBus<T> | undefined;

/**
 * Result of emitting an event to descendants.
 */
export interface EmitDescendantsResult {
	/** Number of entities the event was dispatched to */
	dispatchCount: number;
	/** Maximum depth reached during traversal */
	maxDepth: number;
	/** Whether a circular reference was detected */
	circularReferenceDetected: boolean;
}

/**
 * Zod schema for EmitDescendantsResult.
 */
export const EmitDescendantsResultSchema = z.object({
	dispatchCount: z.number().int().nonnegative(),
	maxDepth: z.number().int().nonnegative(),
	circularReferenceDetected: z.boolean(),
});

/**
 * Options for emitting events to descendants.
 */
export interface EmitDescendantsOptions {
	/** Maximum depth to traverse (default: Infinity) */
	maxDepth?: number;
	/** Whether to include the root entity (default: true) */
	includeRoot?: boolean;
}

/**
 * Zod schema for EmitDescendantsOptions.
 */
export const EmitDescendantsOptionsSchema = z.object({
	maxDepth: z.number().int().positive().optional(),
	includeRoot: z.boolean().optional(),
});

/**
 * Emits an event to an entity and all its descendants in the hierarchy.
 * Traverses the entity tree depth-first, visiting each descendant entity.
 * Safely handles circular references by tracking visited entities.
 *
 * @typeParam T - Event map type
 * @typeParam K - Event name type
 * @param world - The ECS world
 * @param eid - The root entity to start emitting from
 * @param eventName - The name of the event to emit
 * @param eventData - The event data to pass to handlers
 * @param getEventBus - Function to get the event bus for an entity
 * @param options - Optional emission configuration
 * @returns Result with dispatch count, max depth, and circular reference detection
 *
 * @example
 * ```typescript
 * import { emitDescendants, createEventBus } from 'blecsd';
 *
 * // Set up entity hierarchy
 * const parent = addEntity(world);
 * const child1 = addEntity(world);
 * const child2 = addEntity(world);
 * appendChild(world, parent, child1);
 * appendChild(world, parent, child2);
 *
 * // Create event buses for entities
 * const eventBuses = new Map();
 * eventBuses.set(parent, createEventBus());
 * eventBuses.set(child1, createEventBus());
 * eventBuses.set(child2, createEventBus());
 *
 * const getEventBus = (world, eid) => eventBuses.get(eid);
 *
 * // Listen for events
 * eventBuses.get(parent).on('action', (data) => console.log('Parent:', data));
 * eventBuses.get(child1).on('action', (data) => console.log('Child1:', data));
 * eventBuses.get(child2).on('action', (data) => console.log('Child2:', data));
 *
 * // Emit to all descendants
 * const result = emitDescendants(
 *   world,
 *   parent,
 *   'action',
 *   { type: 'activate' },
 *   getEventBus
 * );
 * // Logs: "Parent: { type: 'activate' }"
 * //       "Child1: { type: 'activate' }"
 *       "Child2: { type: 'activate' }"
 * // result.dispatchCount === 3
 * ```
 */
export function emitDescendants<T extends EventMap, K extends keyof T>(
	world: World,
	eid: Entity,
	eventName: K,
	eventData: T[K],
	getEventBus: GetEntityEventBus<T>,
	options?: EmitDescendantsOptions,
): EmitDescendantsResult {
	// Validate options
	const validatedOptions = options
		? EmitDescendantsOptionsSchema.parse(options)
		: { includeRoot: true, maxDepth: Number.POSITIVE_INFINITY };

	const maxDepth = validatedOptions.maxDepth ?? Number.POSITIVE_INFINITY;
	const includeRoot = validatedOptions.includeRoot ?? true;

	// Track visited entities to detect circular references
	const visited = new Set<Entity>();
	let dispatchCount = 0;
	let maxDepthReached = 0;
	let circularReferenceDetected = false;

	/**
	 * Recursively emit to entity and all descendants.
	 * @internal
	 */
	function emitRecursive(currentEid: Entity, depth: number): void {
		// Check depth limit
		if (depth > maxDepth) {
			return;
		}

		// Detect circular references
		if (visited.has(currentEid)) {
			circularReferenceDetected = true;
			return;
		}

		visited.add(currentEid);
		maxDepthReached = Math.max(maxDepthReached, depth);

		// Emit to current entity (skip root if includeRoot is false)
		if (depth > 0 || includeRoot) {
			const eventBus = getEventBus(world, currentEid);
			if (eventBus) {
				eventBus.emit(eventName, eventData);
				dispatchCount++;
			}
		}

		// Check if entity has hierarchy component
		if (!hasComponent(world, currentEid, Hierarchy)) {
			return;
		}

		// Traverse children
		let child = Hierarchy.firstChild[currentEid] as Entity;
		while (child !== NULL_ENTITY) {
			emitRecursive(child, depth + 1);
			child = Hierarchy.nextSibling[child] as Entity;
		}
	}

	// Start recursive emission
	emitRecursive(eid, 0);

	const result: EmitDescendantsResult = {
		dispatchCount,
		maxDepth: maxDepthReached,
		circularReferenceDetected,
	};

	return EmitDescendantsResultSchema.parse(result);
}

/**
 * Store for entity event buses.
 * Maps entity IDs to their event buses.
 */
export interface EntityEventBusStore<T extends EventMap> {
	/** Gets the event bus for an entity */
	get(world: World, eid: Entity): EventBus<T> | undefined;
	/** Sets the event bus for an entity */
	set(world: World, eid: Entity, eventBus: EventBus<T>): void;
	/** Checks if an entity has an event bus */
	has(world: World, eid: Entity): boolean;
	/** Removes the event bus for an entity */
	delete(world: World, eid: Entity): boolean;
	/** Clears all event buses */
	clear(): void;
}

/**
 * Creates a simple entity event bus store using a Map.
 *
 * @typeParam T - Event map type
 * @returns A new EntityEventBusStore instance
 *
 * @example
 * ```typescript
 * import { createEntityEventBusStore, createEventBus } from 'blecsd';
 *
 * const store = createEntityEventBusStore();
 * const eventBus = createEventBus();
 *
 * store.set(world, entity, eventBus);
 * const retrieved = store.get(world, entity);
 * ```
 */
export function createEntityEventBusStore<T extends EventMap>(): EntityEventBusStore<T> {
	const buses = new Map<Entity, EventBus<T>>();

	return {
		get(_world: World, eid: Entity): EventBus<T> | undefined {
			return buses.get(eid);
		},
		set(_world: World, eid: Entity, eventBus: EventBus<T>): void {
			buses.set(eid, eventBus);
		},
		has(_world: World, eid: Entity): boolean {
			return buses.has(eid);
		},
		delete(_world: World, eid: Entity): boolean {
			return buses.delete(eid);
		},
		clear(): void {
			buses.clear();
		},
	};
}
