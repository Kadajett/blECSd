/**
 * Event bubbling system for hierarchical event propagation.
 * Events bubble up from target entity through ancestors.
 * @module core/eventBubbling
 */

import { getParent, Hierarchy, NULL_ENTITY } from '../components/hierarchy';
import { hasComponent } from './ecs';
import type { EventBus, EventMap } from './events';
import type { Entity, World } from './types';

/**
 * An event that can bubble up through the entity hierarchy.
 * Follows DOM-like event propagation semantics.
 *
 * @typeParam T - The payload type for this event
 *
 * @example
 * ```typescript
 * import { createBubbleableEvent, bubbleEvent } from 'blecsd';
 *
 * const event = createBubbleableEvent('click', targetEntity, { x: 10, y: 20 });
 * bubbleEvent(world, event, targetEntity, getEntityEventBus);
 *
 * if (!event.defaultPrevented) {
 *   // Handle default behavior
 * }
 * ```
 */
export interface BubbleableEvent<T = unknown> {
	/** The event type name */
	readonly type: string;
	/** The entity where the event originated (stays fixed during bubbling) */
	readonly target: Entity;
	/** The entity currently handling the event (changes during bubbling) */
	currentTarget: Entity;
	/** Whether this event bubbles up through the hierarchy */
	readonly bubbles: boolean;
	/** Whether preventDefault() was called */
	defaultPrevented: boolean;
	/** Whether stopPropagation() was called */
	propagationStopped: boolean;
	/** Whether stopImmediatePropagation() was called */
	immediatePropagationStopped: boolean;
	/** The event payload data */
	readonly payload: T;

	/**
	 * Stops the event from bubbling to parent entities.
	 * Handlers on the current entity will still fire.
	 */
	stopPropagation(): void;

	/**
	 * Stops the event immediately.
	 * No more handlers will fire, including on the current entity.
	 */
	stopImmediatePropagation(): void;

	/**
	 * Prevents the default behavior associated with this event.
	 * Does not stop propagation.
	 */
	preventDefault(): void;
}

/**
 * Options for creating a bubbleable event.
 */
export interface BubbleableEventOptions<T> {
	/** Event type name */
	type: string;
	/** Target entity where the event originates */
	target: Entity;
	/** Event payload data */
	payload: T;
	/** Whether the event should bubble (default: true) */
	bubbles?: boolean;
}

/**
 * Creates a new bubbleable event.
 *
 * @param options - Event configuration
 * @returns A new BubbleableEvent instance
 *
 * @example
 * ```typescript
 * import { createBubbleableEvent } from 'blecsd';
 *
 * const event = createBubbleableEvent({
 *   type: 'click',
 *   target: buttonEntity,
 *   payload: { x: 10, y: 20 },
 *   bubbles: true,
 * });
 * ```
 */
export function createBubbleableEvent<T>(options: BubbleableEventOptions<T>): BubbleableEvent<T> {
	const { type, target, payload, bubbles = true } = options;

	const event: BubbleableEvent<T> = {
		type,
		target,
		currentTarget: target,
		bubbles,
		defaultPrevented: false,
		propagationStopped: false,
		immediatePropagationStopped: false,
		payload,

		stopPropagation() {
			this.propagationStopped = true;
		},

		stopImmediatePropagation() {
			this.propagationStopped = true;
			this.immediatePropagationStopped = true;
		},

		preventDefault() {
			this.defaultPrevented = true;
		},
	};

	return event;
}

/**
 * Function type for getting an EventBus for a specific entity.
 * Returns undefined if the entity has no event bus.
 */
export type GetEntityEventBus<T extends EventMap> = (
	world: World,
	eid: Entity,
) => EventBus<T> | undefined;

/**
 * Result of bubbling an event through the hierarchy.
 */
export interface BubbleResult {
	/** Whether the event's default was prevented */
	defaultPrevented: boolean;
	/** Whether propagation was stopped before reaching root */
	propagationStopped: boolean;
	/** Number of entities the event was dispatched to */
	dispatchCount: number;
}

/**
 * Bubbles an event up through the entity hierarchy.
 *
 * The event starts at the target entity and propagates up through ancestors.
 * At each entity, the event is emitted to that entity's EventBus (if one exists).
 * Bubbling stops when:
 * - The root is reached (no more parents)
 * - stopPropagation() is called
 * - The event's bubbles property is false
 *
 * @param world - The ECS world
 * @param event - The bubbleable event to dispatch
 * @param getEventBus - Function to get an entity's EventBus
 * @returns Result indicating whether default was prevented and dispatch count
 *
 * @example
 * ```typescript
 * import { createBubbleableEvent, bubbleEvent } from 'blecsd';
 *
 * // Create a store mapping entities to their event buses
 * const entityBuses = new Map<Entity, EventBus<MyEvents>>();
 *
 * const getEventBus = (world: World, eid: Entity) => entityBuses.get(eid);
 *
 * // Create and bubble an event
 * const event = createBubbleableEvent({
 *   type: 'click',
 *   target: buttonEntity,
 *   payload: { x: 10, y: 20 },
 * });
 *
 * const result = bubbleEvent(world, event, getEventBus);
 *
 * if (!result.defaultPrevented) {
 *   // Perform default click behavior
 * }
 * ```
 */
export function bubbleEvent<T, E extends EventMap>(
	world: World,
	event: BubbleableEvent<T>,
	getEventBus: GetEntityEventBus<E>,
): BubbleResult {
	let dispatchCount = 0;
	let currentEntity = event.target;

	while (currentEntity !== (NULL_ENTITY as Entity)) {
		// Update currentTarget to the entity being processed
		event.currentTarget = currentEntity;

		// Get the event bus for this entity
		const bus = getEventBus(world, currentEntity);

		if (bus) {
			// Emit to this entity's bus
			// The event type must be a key in the EventMap
			bus.emit(event.type as keyof E, event as E[keyof E]);
			dispatchCount++;

			// Check if immediate propagation was stopped
			if (event.immediatePropagationStopped) {
				break;
			}
		}

		// Check if propagation was stopped or event doesn't bubble
		if (event.propagationStopped || !event.bubbles) {
			break;
		}

		// Move to parent entity
		if (!hasComponent(world, currentEntity, Hierarchy)) {
			break;
		}

		currentEntity = getParent(world, currentEntity);
	}

	return {
		defaultPrevented: event.defaultPrevented,
		propagationStopped: event.propagationStopped,
		dispatchCount,
	};
}

/**
 * Creates a simple entity event bus store.
 * Useful for quickly setting up event bubbling without custom storage.
 *
 * @returns An object with methods to manage entity event buses
 *
 * @example
 * ```typescript
 * import { createEntityEventBusStore, createBubbleableEvent, bubbleEvent } from 'blecsd';
 *
 * interface MyEvents {
 *   click: BubbleableEvent<{ x: number; y: number }>;
 *   focus: BubbleableEvent<void>;
 * }
 *
 * const store = createEntityEventBusStore<MyEvents>();
 *
 * // Attach a bus to an entity
 * const bus = store.getOrCreate(buttonEntity);
 * bus.on('click', (e) => console.log('clicked!', e.payload));
 *
 * // Bubble an event
 * const event = createBubbleableEvent({
 *   type: 'click',
 *   target: buttonEntity,
 *   payload: { x: 10, y: 20 },
 * });
 *
 * bubbleEvent(world, event, store.get);
 * ```
 */
export function createEntityEventBusStore<E extends EventMap>(): {
	/** Get an entity's event bus (undefined if none exists) */
	get: GetEntityEventBus<E>;
	/** Get or create an event bus for an entity */
	getOrCreate: (eid: Entity, createBus: () => EventBus<E>) => EventBus<E>;
	/** Set an entity's event bus */
	set: (eid: Entity, bus: EventBus<E>) => void;
	/** Remove an entity's event bus */
	delete: (eid: Entity) => boolean;
	/** Check if an entity has an event bus */
	has: (eid: Entity) => boolean;
	/** Clear all stored event buses */
	clear: () => void;
} {
	const buses = new Map<Entity, EventBus<E>>();

	return {
		get: (_world: World, eid: Entity) => buses.get(eid),

		getOrCreate: (eid: Entity, createBus: () => EventBus<E>) => {
			let bus = buses.get(eid);
			if (!bus) {
				bus = createBus();
				buses.set(eid, bus);
			}
			return bus;
		},

		set: (eid: Entity, bus: EventBus<E>) => {
			buses.set(eid, bus);
		},

		delete: (eid: Entity) => buses.delete(eid),

		has: (eid: Entity) => buses.has(eid),

		clear: () => buses.clear(),
	};
}
