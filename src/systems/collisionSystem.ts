/**
 * Collision system for detecting entity collisions.
 * Processes all entities with Collider component.
 *
 * Uses PackedStore for cache-friendly dense iteration of active pairs,
 * with numeric pair keys to eliminate per-frame string allocation.
 *
 * @module systems/collisionSystem
 */

import {
	Collider,
	type CollisionPair,
	canLayersCollide,
	createCollisionPair,
	isTrigger,
	testCollision,
} from '../components/collision';
import { Position } from '../components/position';
import { hasComponent, query } from '../core/ecs';
import { createEventBus, type EventBus } from '../core/events';
import type { Scheduler } from '../core/scheduler';
import {
	addToStore,
	clearStore,
	createPackedStore,
	type PackedHandle,
	type PackedStore,
	removeFromStore,
} from '../core/storage';
import { LoopPhase, type System, type World } from '../core/types';

// =============================================================================
// COLLISION EVENTS
// =============================================================================

/**
 * Collision event data.
 */
export interface CollisionEventData {
	/** First entity in collision */
	readonly entityA: number;
	/** Second entity in collision */
	readonly entityB: number;
}

/**
 * Collision event map for the EventBus.
 */
export interface CollisionEventMap {
	/** Fired when two solid colliders start colliding */
	collisionStart: CollisionEventData;
	/** Fired when two solid colliders stop colliding */
	collisionEnd: CollisionEventData;
	/** Fired when an entity enters a trigger zone */
	triggerEnter: CollisionEventData;
	/** Fired when an entity exits a trigger zone */
	triggerExit: CollisionEventData;
}

// =============================================================================
// NUMERIC PAIR KEY
// =============================================================================

/**
 * Multiplier for encoding entity pair as a single number.
 * Supports entity IDs up to 2^26 (~67 million) without collision.
 * Both entity IDs must be non-negative integers below this bound.
 */
const ENTITY_BOUND = 0x4000000;

/**
 * Computes a collision-free numeric key for a normalized collision pair.
 * Eliminates string allocation compared to template-literal keys.
 *
 * The key is unique as long as both entity IDs are non-negative integers
 * below ENTITY_BOUND (2^26 = 67,108,864). If an entity ID exceeds this
 * bound, the key may collide with another pair's key, causing incorrect
 * collision tracking. A runtime assertion guards against this.
 *
 * @param entityA - Lower entity ID (pair must be normalized: entityA < entityB)
 * @param entityB - Higher entity ID
 * @returns Unique numeric key for the pair
 * @throws {RangeError} If either entity ID is >= ENTITY_BOUND
 */
function pairNumericKey(entityA: number, entityB: number): number {
	if (entityA >= ENTITY_BOUND || entityB >= ENTITY_BOUND) {
		throw new RangeError(
			`Entity IDs must be below ${ENTITY_BOUND} for collision-free pair keys. Got: ${entityA}, ${entityB}`,
		);
	}
	return entityA * ENTITY_BOUND + entityB;
}

// =============================================================================
// COLLISION SYSTEM STATE
// =============================================================================

/**
 * Readonly view of active collision/trigger pairs.
 * Provides dense data for cache-friendly iteration without
 * exposing mutable store internals. Do not cache this view
 * across frames, as the underlying data may be reallocated.
 */
export interface ActivePairsView {
	/** Dense array of active pairs. Read-only; do not mutate elements or indices. */
	readonly data: ReadonlyArray<CollisionPair>;
	/** Number of live pairs in the data array (iterate data[0..size-1]). */
	readonly size: number;
}

/**
 * Collision system state.
 * Uses PackedStore for cache-friendly dense storage and iteration
 * of active collision and trigger pairs.
 */
export interface CollisionSystemState {
	/** Event bus for collision events */
	readonly eventBus: EventBus<CollisionEventMap>;
	/** Currently active collision pairs (dense packed storage) */
	readonly activePairs: PackedStore<CollisionPair>;
	/** Currently active trigger pairs (dense packed storage) */
	readonly activeTriggers: PackedStore<CollisionPair>;
	/** Maps numeric pair key to handle in activePairs for O(1) lookup */
	readonly pairHandles: Map<number, PackedHandle>;
	/** Maps numeric pair key to handle in activeTriggers for O(1) lookup */
	readonly triggerHandles: Map<number, PackedHandle>;
}

// Global collision system state
const collisionState: CollisionSystemState = {
	eventBus: createEventBus<CollisionEventMap>(),
	activePairs: createPackedStore<CollisionPair>(),
	activeTriggers: createPackedStore<CollisionPair>(),
	pairHandles: new Map(),
	triggerHandles: new Map(),
};

/**
 * Gets the collision event bus.
 *
 * @returns The collision event bus
 *
 * @example
 * ```typescript
 * import { getCollisionEventBus } from 'blecsd';
 *
 * const bus = getCollisionEventBus();
 * bus.on('collisionStart', ({ entityA, entityB }) => {
 *   console.log(`Collision between ${entityA} and ${entityB}`);
 * });
 * ```
 */
export function getCollisionEventBus(): EventBus<CollisionEventMap> {
	return collisionState.eventBus;
}

/**
 * Gets the current number of active collision pairs.
 *
 * @returns Number of active solid collision pairs
 *
 * @example
 * ```typescript
 * import { getActiveCollisionCount } from 'blecsd';
 *
 * const count = getActiveCollisionCount();
 * console.log(`${count} active collisions`);
 * ```
 */
export function getActiveCollisionCount(): number {
	return collisionState.activePairs.size;
}

/**
 * Gets the current active collision pairs as a readonly view.
 * Iterate data[0..size-1] for dense, cache-friendly access.
 *
 * The returned view is a snapshot reference into the live store.
 * Do not cache it across frames or mutate its contents.
 *
 * @returns Readonly view of active collision pairs
 */
export function getActiveCollisions(): ActivePairsView {
	return { data: collisionState.activePairs.data, size: collisionState.activePairs.size };
}

/**
 * Gets the current number of active trigger pairs.
 *
 * @returns Number of active trigger pairs
 *
 * @example
 * ```typescript
 * import { getActiveTriggerCount } from 'blecsd';
 *
 * const count = getActiveTriggerCount();
 * console.log(`${count} active triggers`);
 * ```
 */
export function getActiveTriggerCount(): number {
	return collisionState.activeTriggers.size;
}

/**
 * Gets the current active trigger pairs as a readonly view.
 * Iterate data[0..size-1] for dense, cache-friendly access.
 *
 * The returned view is a snapshot reference into the live store.
 * Do not cache it across frames or mutate its contents.
 *
 * @returns Readonly view of active trigger pairs
 */
export function getActiveTriggers(): ActivePairsView {
	return { data: collisionState.activeTriggers.data, size: collisionState.activeTriggers.size };
}

/**
 * Resets the collision system state.
 * Useful for testing or scene changes.
 */
export function resetCollisionState(): void {
	clearStore(collisionState.activePairs);
	clearStore(collisionState.activeTriggers);
	collisionState.pairHandles.clear();
	collisionState.triggerHandles.clear();
}

// =============================================================================
// COLLISION QUERIES
// =============================================================================

/**
 * Query all entities with the Collider component.
 *
 * @param world - The ECS world
 * @returns Array of entity IDs with Collider component
 */
export function queryColliders(world: World): number[] {
	return Array.from(query(world, [Collider]));
}

// =============================================================================
// COLLISION DETECTION
// =============================================================================

/**
 * Tests collision between two specific entities.
 * Returns a CollisionPair if they collide, undefined otherwise.
 */
function testEntityPair(
	world: World,
	eidA: number,
	posAX: number,
	posAY: number,
	layerA: number,
	maskA: number,
	triggerA: boolean,
	eidB: number,
): CollisionPair | undefined {
	if (!hasComponent(world, eidB, Position)) {
		return undefined;
	}

	const layerB = Collider.layer[eidB] as number;
	const maskB = Collider.mask[eidB] as number;

	if (!canLayersCollide(layerA, maskA, layerB, maskB)) {
		return undefined;
	}

	const posBX = Position.x[eidB] as number;
	const posBY = Position.y[eidB] as number;

	if (!testCollision(eidA, posAX, posAY, eidB, posBX, posBY)) {
		return undefined;
	}

	const triggerB = isTrigger(world, eidB);
	return createCollisionPair(eidA, eidB, triggerA || triggerB);
}

/**
 * Detects all collisions between entities in the world.
 * Uses a simple O(n^2) broad phase (suitable for small entity counts).
 *
 * @param world - The ECS world
 * @returns Array of collision pairs
 */
export function detectCollisions(world: World): CollisionPair[] {
	const entities = queryColliders(world);
	const pairs: CollisionPair[] = [];

	for (let i = 0; i < entities.length; i++) {
		const eidA = entities[i];
		if (eidA === undefined || !hasComponent(world, eidA, Position)) {
			continue;
		}

		const posAX = Position.x[eidA] as number;
		const posAY = Position.y[eidA] as number;
		const layerA = Collider.layer[eidA] as number;
		const maskA = Collider.mask[eidA] as number;
		const triggerA = isTrigger(world, eidA);

		for (let j = i + 1; j < entities.length; j++) {
			const eidB = entities[j];
			if (eidB === undefined) continue;

			const pair = testEntityPair(world, eidA, posAX, posAY, layerA, maskA, triggerA, eidB);
			if (pair) {
				pairs.push(pair);
			}
		}
	}

	return pairs;
}

/**
 * Emits end events for pairs that are no longer active.
 * Iterates the dense PackedStore data backwards for safe swap-and-pop removal.
 * Looks up existing handles from handleMap rather than reconstructing from store internals.
 */
function emitEndedEvents(
	store: PackedStore<CollisionPair>,
	handleMap: Map<number, PackedHandle>,
	currentKeys: Set<number>,
	eventName: 'collisionEnd' | 'triggerExit',
): void {
	const { data } = store;

	// Iterate backwards so swap-and-pop doesn't skip elements
	for (let i = store.size - 1; i >= 0; i--) {
		const pair = data[i];
		if (!pair) continue;

		const key = pairNumericKey(pair.entityA, pair.entityB);
		if (currentKeys.has(key)) continue;

		// This pair ended: look up its handle and remove
		const handle = handleMap.get(key);
		if (!handle) continue;

		handleMap.delete(key);
		removeFromStore(store, handle);

		collisionState.eventBus.emit(eventName, {
			entityA: pair.entityA,
			entityB: pair.entityB,
		});
	}
}

/**
 * Processes a single collision pair and tracks it in the appropriate packed store.
 */
function processPair(
	pair: CollisionPair,
	currentSolidKeys: Set<number>,
	currentTriggerKeys: Set<number>,
): void {
	const key = pairNumericKey(pair.entityA, pair.entityB);

	if (pair.isTrigger) {
		currentTriggerKeys.add(key);
		if (!collisionState.triggerHandles.has(key)) {
			const handle = addToStore(collisionState.activeTriggers, pair);
			collisionState.triggerHandles.set(key, handle);
			collisionState.eventBus.emit('triggerEnter', {
				entityA: pair.entityA,
				entityB: pair.entityB,
			});
		}
	} else {
		currentSolidKeys.add(key);
		if (!collisionState.pairHandles.has(key)) {
			const handle = addToStore(collisionState.activePairs, pair);
			collisionState.pairHandles.set(key, handle);
			collisionState.eventBus.emit('collisionStart', {
				entityA: pair.entityA,
				entityB: pair.entityB,
			});
		}
	}
}

/**
 * Processes collision pairs and emits events.
 *
 * @param currentPairs - Currently detected collision pairs
 */
function processCollisionEvents(currentPairs: CollisionPair[]): void {
	const currentSolidKeys = new Set<number>();
	const currentTriggerKeys = new Set<number>();

	for (const pair of currentPairs) {
		processPair(pair, currentSolidKeys, currentTriggerKeys);
	}

	emitEndedEvents(
		collisionState.activePairs,
		collisionState.pairHandles,
		currentSolidKeys,
		'collisionEnd',
	);
	emitEndedEvents(
		collisionState.activeTriggers,
		collisionState.triggerHandles,
		currentTriggerKeys,
		'triggerExit',
	);
}

// =============================================================================
// COLLISION SYSTEM
// =============================================================================

/**
 * Collision system that detects collisions and emits events.
 *
 * This system should be registered in the UPDATE phase, after movement.
 * It detects all collisions between entities with Collider and Position
 * components, and emits events for collision start/end and trigger enter/exit.
 *
 * @param world - The ECS world to process
 * @returns The world (unchanged reference)
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase, collisionSystem, getCollisionEventBus } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.UPDATE, collisionSystem, 10); // After movement
 *
 * // Listen for collisions
 * const bus = getCollisionEventBus();
 * bus.on('collisionStart', ({ entityA, entityB }) => {
 *   console.log(`Collision: ${entityA} hit ${entityB}`);
 * });
 * ```
 */
export const collisionSystem: System = (world: World): World => {
	const pairs = detectCollisions(world);
	processCollisionEvents(pairs);
	return world;
};

/**
 * Creates a new collision system.
 *
 * Factory function that returns the collisionSystem.
 *
 * @returns The collision system function
 *
 * @example
 * ```typescript
 * import { createCollisionSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const system = createCollisionSystem();
 * scheduler.registerSystem(LoopPhase.UPDATE, system, 10);
 * ```
 */
export function createCollisionSystem(): System {
	return collisionSystem;
}

/**
 * Registers the collision system with a scheduler.
 *
 * Convenience function that registers collisionSystem in the UPDATE phase.
 * Uses priority 10 by default to run after movement (priority 0).
 *
 * @param scheduler - The scheduler to register with
 * @param priority - Optional priority within the UPDATE phase (default: 10)
 *
 * @example
 * ```typescript
 * import { createScheduler, registerCollisionSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerCollisionSystem(scheduler);
 *
 * // Collisions will be detected after movement
 * scheduler.run(world, deltaTime);
 * ```
 */
export function registerCollisionSystem(scheduler: Scheduler, priority = 10): void {
	scheduler.registerSystem(LoopPhase.UPDATE, collisionSystem, priority);
}

// =============================================================================
// COLLISION QUERIES
// =============================================================================

/**
 * Checks if an entity is currently colliding with any other entity.
 * Uses dense iteration over the packed collision store.
 *
 * @param eid - The entity to check
 * @returns true if entity is in any active collision
 *
 * @example
 * ```typescript
 * import { isColliding } from 'blecsd';
 *
 * if (isColliding(player)) {
 *   console.log('Player is touching something!');
 * }
 * ```
 */
export function isColliding(eid: number): boolean {
	const { data } = collisionState.activePairs;
	for (let i = 0; i < collisionState.activePairs.size; i++) {
		const pair = data[i];
		if (pair && (pair.entityA === eid || pair.entityB === eid)) {
			return true;
		}
	}
	return false;
}

/**
 * Checks if an entity is currently in any trigger zone.
 * Uses dense iteration over the packed trigger store.
 *
 * @param eid - The entity to check
 * @returns true if entity is in any active trigger
 *
 * @example
 * ```typescript
 * import { isInTrigger } from 'blecsd';
 *
 * if (isInTrigger(player)) {
 *   console.log('Player is in a trigger zone!');
 * }
 * ```
 */
export function isInTrigger(eid: number): boolean {
	const { data } = collisionState.activeTriggers;
	for (let i = 0; i < collisionState.activeTriggers.size; i++) {
		const pair = data[i];
		if (pair && (pair.entityA === eid || pair.entityB === eid)) {
			return true;
		}
	}
	return false;
}

/**
 * Gets all entities currently colliding with a specific entity.
 * Uses dense iteration over the packed collision store.
 *
 * @param eid - The entity to check
 * @returns Array of entity IDs colliding with this entity
 *
 * @example
 * ```typescript
 * import { getCollidingEntities } from 'blecsd';
 *
 * const enemies = getCollidingEntities(player);
 * for (const enemy of enemies) {
 *   // Handle collision with each enemy
 * }
 * ```
 */
export function getCollidingEntities(eid: number): number[] {
	const colliding: number[] = [];
	const { data } = collisionState.activePairs;
	for (let i = 0; i < collisionState.activePairs.size; i++) {
		const pair = data[i];
		if (!pair) continue;
		if (pair.entityA === eid) {
			colliding.push(pair.entityB);
		} else if (pair.entityB === eid) {
			colliding.push(pair.entityA);
		}
	}
	return colliding;
}

/**
 * Gets all trigger zones an entity is currently in.
 * Uses dense iteration over the packed trigger store.
 *
 * @param eid - The entity to check
 * @returns Array of entity IDs of triggers this entity is in
 *
 * @example
 * ```typescript
 * import { getTriggerZones } from 'blecsd';
 *
 * const zones = getTriggerZones(player);
 * for (const zone of zones) {
 *   // Handle being in each zone
 * }
 * ```
 */
export function getTriggerZones(eid: number): number[] {
	const triggers: number[] = [];
	const { data } = collisionState.activeTriggers;
	for (let i = 0; i < collisionState.activeTriggers.size; i++) {
		const pair = data[i];
		if (!pair) continue;
		if (pair.entityA === eid) {
			triggers.push(pair.entityB);
		} else if (pair.entityB === eid) {
			triggers.push(pair.entityA);
		}
	}
	return triggers;
}

/**
 * Checks if two specific entities are currently colliding.
 * Uses handle-based O(1) lookup via numeric pair key.
 *
 * @param eidA - First entity
 * @param eidB - Second entity
 * @returns true if the entities are colliding
 *
 * @example
 * ```typescript
 * import { areColliding } from 'blecsd';
 *
 * if (areColliding(player, enemy)) {
 *   // Handle player-enemy collision
 * }
 * ```
 */
export function areColliding(eidA: number, eidB: number): boolean {
	const a = Math.min(eidA, eidB);
	const b = Math.max(eidA, eidB);
	const key = pairNumericKey(a, b);
	return collisionState.pairHandles.has(key) || collisionState.triggerHandles.has(key);
}
