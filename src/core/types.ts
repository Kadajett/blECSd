/**
 * Core type definitions for blECSd
 * @module core/types
 */

import type { World as BitEcsWorld, EntityId } from 'bitecs';

/**
 * Branded Entity type for type safety.
 * Prevents accidentally passing raw numbers where entities are expected.
 *
 * @example
 * ```typescript
 * import type { Entity } from 'blecsd';
 *
 * function moveEntity(eid: Entity, x: number, y: number): void {
 *   // eid is guaranteed to be a valid entity reference
 * }
 * ```
 */
export type Entity = EntityId;

/**
 * The ECS World type from bitecs.
 */
export type World = BitEcsWorld;

/**
 * A System is a function that processes entities in the world.
 * Systems should be pure functions that take a world and return it.
 *
 * @example
 * ```typescript
 * import { defineSystem } from 'blecsd';
 *
 * const movementSystem: System = (world) => {
 *   // Process entities with Position and Velocity
 *   return world;
 * };
 * ```
 */
export type System = (world: World) => World;

/**
 * Function to unsubscribe from events or callbacks.
 */
export type Unsubscribe = () => void;

/**
 * Loop phases for the game loop.
 * INPUT is always first and cannot be reordered.
 */
export enum LoopPhase {
	/** Process all pending input - ALWAYS FIRST, cannot be moved */
	INPUT = 0,
	/** Pre-update logic */
	EARLY_UPDATE = 1,
	/** Main game logic */
	UPDATE = 2,
	/** Post-update logic */
	LATE_UPDATE = 3,
	/** Physics calculations */
	PHYSICS = 4,
	/** UI layout calculation */
	LAYOUT = 5,
	/** Render to screen buffer */
	RENDER = 6,
	/** Output to terminal, cleanup */
	POST_RENDER = 7,
}
