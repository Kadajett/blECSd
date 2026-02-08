/**
 * Typed EventEmitter implementation for type-safe event handling
 * @module core/events
 */

import type { Entity, Unsubscribe, World } from './types';

/**
 * Generic event handler type.
 * Takes the event payload and returns nothing.
 */
export type EventHandler<T> = (event: T) => void;

/**
 * Base event map type constraint.
 * Any object type mapping event names to payload types satisfies this constraint.
 * You don't need to explicitly extend this; any interface with string keys works.
 *
 * @example
 * ```typescript
 * // This works automatically:
 * interface MyEvents {
 *   'player:moved': { x: number; y: number };
 *   'game:over': { score: number };
 * }
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for flexible event map constraint
export type EventMap = Record<string, any>;

/**
 * UI events emitted by interactive elements.
 */
export interface UIEventMap {
	click: { x: number; y: number; button: number };
	keypress: { key: string; ctrl: boolean; meta: boolean; shift: boolean };
	focus: { target: unknown };
	blur: { target: unknown };
	mouseenter: { x: number; y: number };
	mouseleave: { x: number; y: number };
	mousemove: { x: number; y: number };
	mousedown: { x: number; y: number; button: number };
	mouseup: { x: number; y: number; button: number };
	scroll: { direction: 'up' | 'down'; amount: number };
}

/**
 * Screen-level events.
 */
export interface ScreenEventMap {
	resize: { width: number; height: number };
	render: { frameTime: number };
	destroy: Record<string, never>;
	warning: {
		type: string;
		message: string;
		metadata: Record<string, unknown>;
		timestamp: number;
	};
}

/**
 * Internal listener entry with handler and once flag.
 */
interface ListenerEntry<T> {
	handler: EventHandler<T>;
	once: boolean;
}

/**
 * Type-safe EventBus interface.
 *
 * @typeParam T - Event map defining event names and payload types
 */
export interface EventBus<T extends EventMap> {
	on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe;
	once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe;
	off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): EventBus<T>;
	emit<K extends keyof T>(event: K, payload: T[K]): boolean;
	removeAllListeners<K extends keyof T>(event?: K): EventBus<T>;
	listenerCount<K extends keyof T>(event: K): number;
	eventNames(): Array<keyof T>;
	hasListeners<K extends keyof T>(event: K): boolean;
}

/**
 * Create a new type-safe event bus.
 *
 * @typeParam T - Event map defining event names and payload types
 * @returns A new EventBus instance
 *
 * @example
 * ```typescript
 * import { createEventBus } from 'blecsd';
 *
 * interface GameEvents {
 *   'enemy:spawn': { type: string; x: number; y: number };
 *   'player:death': { cause: string };
 * }
 *
 * const events = createEventBus<GameEvents>();
 * events.on('enemy:spawn', (e) => console.log(`${e.type} at ${e.x}, ${e.y}`));
 * ```
 */
export function createEventBus<T extends EventMap>(): EventBus<T> {
	const listeners = new Map<keyof T, Set<ListenerEntry<unknown>>>();

	function addListener<K extends keyof T>(
		event: K,
		handler: EventHandler<T[K]>,
		once: boolean,
	): Unsubscribe {
		let eventListeners = listeners.get(event);
		if (!eventListeners) {
			eventListeners = new Set();
			listeners.set(event, eventListeners);
		}

		const entry: ListenerEntry<unknown> = {
			handler: handler as EventHandler<unknown>,
			once,
		};
		eventListeners.add(entry);

		return () => {
			eventListeners.delete(entry);
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
		};
	}

	const bus: EventBus<T> = {
		on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe {
			return addListener(event, handler, false);
		},
		once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe {
			return addListener(event, handler, true);
		},
		off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): EventBus<T> {
			const eventListeners = listeners.get(event);
			if (!eventListeners) {
				return bus;
			}
			for (const entry of eventListeners) {
				if (entry.handler === handler) {
					eventListeners.delete(entry);
					break;
				}
			}
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
			return bus;
		},
		emit<K extends keyof T>(event: K, payload: T[K]): boolean {
			const eventListeners = listeners.get(event);
			if (!eventListeners || eventListeners.size === 0) {
				return false;
			}
			const toRemove: ListenerEntry<unknown>[] = [];
			for (const entry of eventListeners) {
				(entry.handler as EventHandler<T[K]>)(payload);
				if (entry.once) {
					toRemove.push(entry);
				}
			}
			for (const entry of toRemove) {
				eventListeners.delete(entry);
			}
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
			return true;
		},
		removeAllListeners<K extends keyof T>(event?: K): EventBus<T> {
			if (event === undefined) {
				listeners.clear();
			} else {
				listeners.delete(event);
			}
			return bus;
		},
		listenerCount<K extends keyof T>(event: K): number {
			const eventListeners = listeners.get(event);
			return eventListeners?.size ?? 0;
		},
		eventNames(): Array<keyof T> {
			return Array.from(listeners.keys());
		},
		hasListeners<K extends keyof T>(event: K): boolean {
			return bus.listenerCount(event) > 0;
		},
	};

	return bus;
}

// =============================================================================
// ENTITY EVENT BUS UTILITIES
// =============================================================================

/**
 * Function type for getting an EventBus for a specific entity.
 * Returns undefined if the entity has no event bus.
 *
 * @typeParam T - Event map type
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity's EventBus, or undefined if none exists
 *
 * @example
 * ```typescript
 * import { createEventBus, type GetEntityEventBus } from 'blecsd';
 *
 * const entityBuses = new Map<Entity, EventBus<MyEvents>>();
 * const getEventBus: GetEntityEventBus<MyEvents> = (world, eid) => entityBuses.get(eid);
 * ```
 */
export type GetEntityEventBus<T extends EventMap> = (
	world: World,
	eid: Entity,
) => EventBus<T> | undefined;

/**
 * Store for entity event buses.
 * Maps entity IDs to their event buses.
 *
 * @typeParam T - Event map type
 */
export interface EntityEventBusStore<T extends EventMap> {
	/** Gets the event bus for an entity */
	get(world: World, eid: Entity): EventBus<T> | undefined;
	/** Gets or creates an event bus for an entity */
	getOrCreate(world: World, eid: Entity): EventBus<T>;
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
 * Provides a centralized way to manage EventBus instances per entity.
 *
 * @typeParam T - Event map type
 * @returns A new EntityEventBusStore instance
 *
 * @example
 * ```typescript
 * import { createEntityEventBusStore, createEventBus } from 'blecsd';
 *
 * interface MyEvents {
 *   click: { x: number; y: number };
 *   focus: Record<string, never>;
 * }
 *
 * const store = createEntityEventBusStore<MyEvents>();
 *
 * // Get or create a bus for an entity
 * const bus = store.getOrCreate(world, entityId);
 * bus.on('click', (e) => console.log('clicked at', e.x, e.y));
 *
 * // Check if entity has a bus
 * if (store.has(world, entityId)) {
 *   const existingBus = store.get(world, entityId);
 * }
 * ```
 */
export function createEntityEventBusStore<T extends EventMap>(): EntityEventBusStore<T> {
	const buses = new Map<Entity, EventBus<T>>();

	return {
		get(_world: World, eid: Entity): EventBus<T> | undefined {
			return buses.get(eid);
		},

		getOrCreate(_world: World, eid: Entity): EventBus<T> {
			let bus = buses.get(eid);
			if (!bus) {
				bus = createEventBus<T>();
				buses.set(eid, bus);
			}
			return bus;
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
