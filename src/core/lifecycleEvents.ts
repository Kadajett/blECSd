/**
 * Node lifecycle events for tracking entity hierarchy changes.
 * These events integrate with the event bubbling system.
 * @module core/lifecycleEvents
 */

import type { EventBus } from './events';
import type { Entity } from './types';

// =============================================================================
// LIFECYCLE EVENT TYPES
// =============================================================================

/**
 * Event data for parent change events.
 */
export interface ReparentEvent {
	/** The entity being reparented */
	readonly entity: Entity;
	/** The previous parent (0 if was root) */
	readonly oldParent: Entity;
	/** The new parent (0 if becoming root) */
	readonly newParent: Entity;
}

/**
 * Event data when a child is added.
 */
export interface AdoptEvent {
	/** The parent entity */
	readonly parent: Entity;
	/** The adopted child entity */
	readonly child: Entity;
}

/**
 * Event data when an entity is attached to the screen tree.
 */
export interface AttachEvent {
	/** The entity being attached */
	readonly entity: Entity;
	/** The screen entity it's attached to */
	readonly screen: Entity;
}

/**
 * Event data when an entity is detached from the screen tree.
 */
export interface DetachEvent {
	/** The entity being detached */
	readonly entity: Entity;
	/** The screen entity it was attached to */
	readonly screen: Entity;
}

/**
 * Event data when a child is removed.
 */
export interface RemoveEvent {
	/** The parent entity */
	readonly parent: Entity;
	/** The removed child entity */
	readonly child: Entity;
}

/**
 * Event data when an entity is destroyed.
 */
export interface DestroyEvent {
	/** The entity being destroyed */
	readonly entity: Entity;
}

/**
 * Map of lifecycle event names to their payload types.
 */
export interface LifecycleEventMap {
	reparent: ReparentEvent;
	adopt: AdoptEvent;
	attach: AttachEvent;
	detach: DetachEvent;
	remove: RemoveEvent;
	destroy: DestroyEvent;
}

// =============================================================================
// LIFECYCLE EVENT EMITTER
// =============================================================================

/**
 * Store for entity lifecycle event buses.
 * Maps entity IDs to their individual event buses.
 */
const entityEventBuses = new Map<Entity, EventBus<LifecycleEventMap>>();

/**
 * Gets or creates an event bus for an entity.
 *
 * @param entity - The entity ID
 * @param createEventBus - Factory function to create event buses
 * @returns The entity's event bus
 */
export function getLifecycleEventBus(
	entity: Entity,
	createEventBus: () => EventBus<LifecycleEventMap>,
): EventBus<LifecycleEventMap> {
	let bus = entityEventBuses.get(entity);
	if (!bus) {
		bus = createEventBus();
		entityEventBuses.set(entity, bus);
	}
	return bus;
}

/**
 * Removes an entity's event bus.
 * Called when entity is destroyed.
 *
 * @param entity - The entity ID
 */
export function removeLifecycleEventBus(entity: Entity): void {
	entityEventBuses.delete(entity);
}

/**
 * Clears all lifecycle event buses.
 * Primarily used for testing.
 */
export function clearLifecycleEventBuses(): void {
	entityEventBuses.clear();
}

// =============================================================================
// LIFECYCLE EVENT EMITTERS
// =============================================================================

/**
 * Emits a reparent event when an entity's parent changes.
 *
 * @param bus - The entity's event bus
 * @param entity - The entity being reparented
 * @param oldParent - The previous parent entity
 * @param newParent - The new parent entity
 *
 * @example
 * ```typescript
 * import { emitReparent, getLifecycleEventBus, createEventBus } from 'blecsd';
 *
 * const bus = getLifecycleEventBus(entity, createEventBus);
 * bus.on('reparent', (event) => {
 *   console.log(`Entity ${event.entity} moved from ${event.oldParent} to ${event.newParent}`);
 * });
 *
 * // Later, when parent changes:
 * emitReparent(bus, entity, oldParent, newParent);
 * ```
 */
export function emitReparent(
	bus: EventBus<LifecycleEventMap>,
	entity: Entity,
	oldParent: Entity,
	newParent: Entity,
): void {
	bus.emit('reparent', { entity, oldParent, newParent });
}

/**
 * Emits an adopt event when a child is added to a parent.
 *
 * @param bus - The parent's event bus
 * @param parent - The parent entity
 * @param child - The adopted child entity
 *
 * @example
 * ```typescript
 * import { emitAdopt, getLifecycleEventBus, createEventBus } from 'blecsd';
 *
 * const bus = getLifecycleEventBus(parent, createEventBus);
 * bus.on('adopt', (event) => {
 *   console.log(`Parent ${event.parent} adopted child ${event.child}`);
 * });
 *
 * emitAdopt(bus, parent, child);
 * ```
 */
export function emitAdopt(bus: EventBus<LifecycleEventMap>, parent: Entity, child: Entity): void {
	bus.emit('adopt', { parent, child });
}

/**
 * Emits an attach event when an entity is attached to the screen tree.
 *
 * @param bus - The entity's event bus
 * @param entity - The attached entity
 * @param screen - The screen entity
 *
 * @example
 * ```typescript
 * import { emitAttach, getLifecycleEventBus, createEventBus } from 'blecsd';
 *
 * const bus = getLifecycleEventBus(entity, createEventBus);
 * bus.on('attach', (event) => {
 *   console.log(`Entity ${event.entity} attached to screen ${event.screen}`);
 * });
 *
 * emitAttach(bus, entity, screen);
 * ```
 */
export function emitAttach(bus: EventBus<LifecycleEventMap>, entity: Entity, screen: Entity): void {
	bus.emit('attach', { entity, screen });
}

/**
 * Emits a detach event when an entity is detached from the screen tree.
 *
 * @param bus - The entity's event bus
 * @param entity - The detached entity
 * @param screen - The screen entity
 *
 * @example
 * ```typescript
 * import { emitDetach, getLifecycleEventBus, createEventBus } from 'blecsd';
 *
 * const bus = getLifecycleEventBus(entity, createEventBus);
 * bus.on('detach', (event) => {
 *   console.log(`Entity ${event.entity} detached from screen ${event.screen}`);
 * });
 *
 * emitDetach(bus, entity, screen);
 * ```
 */
export function emitDetach(bus: EventBus<LifecycleEventMap>, entity: Entity, screen: Entity): void {
	bus.emit('detach', { entity, screen });
}

/**
 * Emits a remove event when a child is removed from a parent.
 *
 * @param bus - The parent's event bus
 * @param parent - The parent entity
 * @param child - The removed child entity
 *
 * @example
 * ```typescript
 * import { emitRemove, getLifecycleEventBus, createEventBus } from 'blecsd';
 *
 * const bus = getLifecycleEventBus(parent, createEventBus);
 * bus.on('remove', (event) => {
 *   console.log(`Parent ${event.parent} removed child ${event.child}`);
 * });
 *
 * emitRemove(bus, parent, child);
 * ```
 */
export function emitRemove(bus: EventBus<LifecycleEventMap>, parent: Entity, child: Entity): void {
	bus.emit('remove', { parent, child });
}

/**
 * Emits a destroy event when an entity is destroyed.
 *
 * @param bus - The entity's event bus
 * @param entity - The destroyed entity
 *
 * @example
 * ```typescript
 * import { emitDestroy, getLifecycleEventBus, createEventBus } from 'blecsd';
 *
 * const bus = getLifecycleEventBus(entity, createEventBus);
 * bus.on('destroy', (event) => {
 *   console.log(`Entity ${event.entity} was destroyed`);
 * });
 *
 * emitDestroy(bus, entity);
 * ```
 */
export function emitDestroy(bus: EventBus<LifecycleEventMap>, entity: Entity): void {
	bus.emit('destroy', { entity });
}

// =============================================================================
// LIFECYCLE EVENT LISTENERS
// =============================================================================

/**
 * Subscribes to reparent events on an entity.
 *
 * @param entity - The entity to listen on
 * @param handler - The event handler
 * @param createEventBus - Factory function to create event buses
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * import { onReparent, createEventBus } from 'blecsd';
 *
 * const unsubscribe = onReparent(entity, (event) => {
 *   console.log(`Reparented from ${event.oldParent} to ${event.newParent}`);
 * }, createEventBus);
 *
 * // Later:
 * unsubscribe();
 * ```
 */
export function onReparent(
	entity: Entity,
	handler: (event: ReparentEvent) => void,
	createEventBus: () => EventBus<LifecycleEventMap>,
): () => void {
	const bus = getLifecycleEventBus(entity, createEventBus);
	return bus.on('reparent', handler);
}

/**
 * Subscribes to adopt events on an entity.
 *
 * @param entity - The entity to listen on
 * @param handler - The event handler
 * @param createEventBus - Factory function to create event buses
 * @returns Unsubscribe function
 */
export function onAdopt(
	entity: Entity,
	handler: (event: AdoptEvent) => void,
	createEventBus: () => EventBus<LifecycleEventMap>,
): () => void {
	const bus = getLifecycleEventBus(entity, createEventBus);
	return bus.on('adopt', handler);
}

/**
 * Subscribes to attach events on an entity.
 *
 * @param entity - The entity to listen on
 * @param handler - The event handler
 * @param createEventBus - Factory function to create event buses
 * @returns Unsubscribe function
 */
export function onAttach(
	entity: Entity,
	handler: (event: AttachEvent) => void,
	createEventBus: () => EventBus<LifecycleEventMap>,
): () => void {
	const bus = getLifecycleEventBus(entity, createEventBus);
	return bus.on('attach', handler);
}

/**
 * Subscribes to detach events on an entity.
 *
 * @param entity - The entity to listen on
 * @param handler - The event handler
 * @param createEventBus - Factory function to create event buses
 * @returns Unsubscribe function
 */
export function onDetach(
	entity: Entity,
	handler: (event: DetachEvent) => void,
	createEventBus: () => EventBus<LifecycleEventMap>,
): () => void {
	const bus = getLifecycleEventBus(entity, createEventBus);
	return bus.on('detach', handler);
}

/**
 * Subscribes to remove events on an entity.
 *
 * @param entity - The entity to listen on
 * @param handler - The event handler
 * @param createEventBus - Factory function to create event buses
 * @returns Unsubscribe function
 */
export function onRemove(
	entity: Entity,
	handler: (event: RemoveEvent) => void,
	createEventBus: () => EventBus<LifecycleEventMap>,
): () => void {
	const bus = getLifecycleEventBus(entity, createEventBus);
	return bus.on('remove', handler);
}

/**
 * Subscribes to destroy events on an entity.
 *
 * @param entity - The entity to listen on
 * @param handler - The event handler
 * @param createEventBus - Factory function to create event buses
 * @returns Unsubscribe function
 */
export function onDestroy(
	entity: Entity,
	handler: (event: DestroyEvent) => void,
	createEventBus: () => EventBus<LifecycleEventMap>,
): () => void {
	const bus = getLifecycleEventBus(entity, createEventBus);
	return bus.on('destroy', handler);
}

// =============================================================================
// CONVENIENCE COMBINED TYPE
// =============================================================================

/**
 * Union type of all lifecycle events.
 */
export type LifecycleEvent =
	| ReparentEvent
	| AdoptEvent
	| AttachEvent
	| DetachEvent
	| RemoveEvent
	| DestroyEvent;

/**
 * Lifecycle event names.
 */
export type LifecycleEventName = keyof LifecycleEventMap;
