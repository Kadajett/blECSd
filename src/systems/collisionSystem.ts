/**
 * Collision system for detecting entity collisions.
 * Processes all entities with Collider component.
 * @module systems/collisionSystem
 */

import { hasComponent, query } from 'bitecs';
import {
	Collider,
	type CollisionPair,
	canLayersCollide,
	collisionPairKey,
	createCollisionPair,
	isTrigger,
	testCollision,
} from '../components/collision';
import { Position } from '../components/position';
import { createEventBus, type EventBus } from '../core/events';
import type { Scheduler } from '../core/scheduler';
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
// COLLISION SYSTEM STATE
// =============================================================================

/**
 * Collision system state.
 */
export interface CollisionSystemState {
	/** Event bus for collision events */
	readonly eventBus: EventBus<CollisionEventMap>;
	/** Currently active collision pairs */
	readonly activePairs: Map<string, CollisionPair>;
	/** Currently active trigger pairs */
	readonly activeTriggers: Map<string, CollisionPair>;
}

// Global collision system state
const collisionState: CollisionSystemState = {
	eventBus: createEventBus<CollisionEventMap>(),
	activePairs: new Map(),
	activeTriggers: new Map(),
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
 * Gets the current active collision pairs.
 *
 * @returns Map of active collision pairs
 */
export function getActiveCollisions(): ReadonlyMap<string, CollisionPair> {
	return collisionState.activePairs;
}

/**
 * Gets the current active trigger pairs.
 *
 * @returns Map of active trigger pairs
 */
export function getActiveTriggers(): ReadonlyMap<string, CollisionPair> {
	return collisionState.activeTriggers;
}

/**
 * Resets the collision system state.
 * Useful for testing or scene changes.
 */
export function resetCollisionState(): void {
	collisionState.activePairs.clear();
	collisionState.activeTriggers.clear();
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
 */
function emitEndedEvents(
	activeMap: Map<string, CollisionPair>,
	currentKeys: Set<string>,
	eventName: 'collisionEnd' | 'triggerExit',
): void {
	for (const [key, pair] of activeMap) {
		if (!currentKeys.has(key)) {
			activeMap.delete(key);
			collisionState.eventBus.emit(eventName, {
				entityA: pair.entityA,
				entityB: pair.entityB,
			});
		}
	}
}

/**
 * Processes a single collision pair and tracks it.
 */
function processPair(
	pair: CollisionPair,
	currentSolidKeys: Set<string>,
	currentTriggerKeys: Set<string>,
): void {
	const key = collisionPairKey(pair);

	if (pair.isTrigger) {
		currentTriggerKeys.add(key);
		if (!collisionState.activeTriggers.has(key)) {
			collisionState.activeTriggers.set(key, pair);
			collisionState.eventBus.emit('triggerEnter', {
				entityA: pair.entityA,
				entityB: pair.entityB,
			});
		}
	} else {
		currentSolidKeys.add(key);
		if (!collisionState.activePairs.has(key)) {
			collisionState.activePairs.set(key, pair);
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
	const currentSolidKeys = new Set<string>();
	const currentTriggerKeys = new Set<string>();

	for (const pair of currentPairs) {
		processPair(pair, currentSolidKeys, currentTriggerKeys);
	}

	emitEndedEvents(collisionState.activePairs, currentSolidKeys, 'collisionEnd');
	emitEndedEvents(collisionState.activeTriggers, currentTriggerKeys, 'triggerExit');
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
	for (const pair of collisionState.activePairs.values()) {
		if (pair.entityA === eid || pair.entityB === eid) {
			return true;
		}
	}
	return false;
}

/**
 * Checks if an entity is currently in any trigger zone.
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
	for (const pair of collisionState.activeTriggers.values()) {
		if (pair.entityA === eid || pair.entityB === eid) {
			return true;
		}
	}
	return false;
}

/**
 * Gets all entities currently colliding with a specific entity.
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
	for (const pair of collisionState.activePairs.values()) {
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
	for (const pair of collisionState.activeTriggers.values()) {
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
	const pair = createCollisionPair(eidA, eidB, false);
	const key = collisionPairKey(pair);
	return collisionState.activePairs.has(key) || collisionState.activeTriggers.has(key);
}
