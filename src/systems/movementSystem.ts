/**
 * Movement system for updating entity positions based on velocity.
 * Processes all entities with Velocity component.
 * @module systems/movementSystem
 */

import { Position } from '../components/position';
import {
	applyAccelerationToEntity,
	applyFrictionToEntity,
	applyVelocityToEntity,
	clampSpeedForEntity,
	hasAcceleration,
	hasVelocity,
} from '../components/velocity';
import { hasComponent, query, registerComponent, withStore } from '../core/ecs';
import { getDeltaTime, type Scheduler } from '../core/scheduler';
import { LoopPhase, type System, type World } from '../core/types';

// Default capacity for component arrays
const DEFAULT_CAPACITY = 10000;

/**
 * Store for the Velocity component's typed arrays.
 */
interface VelocitySystemStore {
	x: Float32Array;
	y: Float32Array;
	maxSpeed: Float32Array;
	friction: Float32Array;
}

/**
 * Create a new Velocity store for system processing.
 */
function createVelocityStore(capacity = DEFAULT_CAPACITY): VelocitySystemStore {
	return {
		x: new Float32Array(capacity),
		y: new Float32Array(capacity),
		maxSpeed: new Float32Array(capacity),
		friction: new Float32Array(capacity),
	};
}

// Global store used by the system
const systemStore = createVelocityStore();

// Symbol to track if component is registered for a world
const REGISTERED_WORLDS = new WeakSet<World>();

// Reference to the component
// biome-ignore lint/suspicious/noExplicitAny: Component type varies by world
let VelocitySystemComponentRef: any = null;

/**
 * Get or register the Velocity component for use with the system.
 *
 * @param world - The ECS world
 * @returns The component reference for querying
 */
function getVelocityComponent(world: World): unknown {
	if (!REGISTERED_WORLDS.has(world)) {
		VelocitySystemComponentRef = registerComponent(
			world,
			withStore(() => systemStore),
		);
		REGISTERED_WORLDS.add(world);
	}
	return VelocitySystemComponentRef;
}

/**
 * Query all entities with the Velocity component.
 *
 * PERF: Converts iterator to array for system processing.
 * Array allocation is unavoidable here as we need to iterate over entities.
 *
 * @param world - The ECS world
 * @returns Array of entity IDs with Velocity component
 */
export function queryMovement(world: World): number[] {
	const component = getVelocityComponent(world);
	// PERF: Array.from() allocation necessary for system iteration
	return Array.from(query(world, [component]));
}

/**
 * Checks if an entity has the Velocity component (via system store).
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns true if entity has Velocity component
 */
export function hasMovementSystem(world: World, eid: number): boolean {
	const component = getVelocityComponent(world);
	return hasComponent(world, eid, component);
}

/**
 * Movement system that updates all entities with Velocity component.
 *
 * This system should be registered in the PHYSICS phase of the game loop.
 * It reads delta time from getDeltaTime() which is set by the scheduler.
 *
 * For each entity with Velocity, the system:
 * 1. Applies acceleration to velocity (if Acceleration component present)
 * 2. Applies friction to velocity
 * 3. Clamps velocity to max speed
 * 4. Applies velocity to position (if Position component present)
 *
 * @param world - The ECS world to process
 * @returns The world (unchanged reference)
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase, movementSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.ANIMATION, movementSystem);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export const movementSystem: System = (world: World): World => {
	// PERF: Cache delta time lookup once per frame
	const dt = getDeltaTime();
	const entities = queryMovement(world);

	// PERF: Tight loop over entities with minimal branching
	// All component operations use direct typed array access (cache-friendly)
	for (const eid of entities) {
		// Apply acceleration if present
		if (hasAcceleration(world, eid)) {
			applyAccelerationToEntity(eid, dt);
		}

		// Apply friction
		applyFrictionToEntity(eid, dt);

		// Clamp to max speed
		clampSpeedForEntity(eid);

		// Apply velocity to position
		if (hasComponent(world, eid, Position)) {
			applyVelocityToEntity(eid, dt);
		}
	}

	return world;
};

/**
 * Creates a new movement system.
 *
 * Factory function that returns the movementSystem.
 *
 * @returns The movement system function
 *
 * @example
 * ```typescript
 * import { createMovementSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const system = createMovementSystem();
 * scheduler.registerSystem(LoopPhase.ANIMATION, system);
 * ```
 */
export function createMovementSystem(): System {
	return movementSystem;
}

/**
 * Registers the movement system with a scheduler.
 *
 * Convenience function that registers movementSystem in the PHYSICS phase.
 *
 * @param scheduler - The scheduler to register with
 * @param priority - Optional priority within the PHYSICS phase (default: 0)
 *
 * @example
 * ```typescript
 * import { createScheduler, registerMovementSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerMovementSystem(scheduler);
 *
 * // Movement updates will now happen in PHYSICS phase
 * scheduler.run(world, deltaTime);
 * ```
 */
export function registerMovementSystem(scheduler: Scheduler, priority = 0): void {
	scheduler.registerSystem(LoopPhase.ANIMATION, movementSystem, priority);
}

/**
 * Manually update movement for specific entities.
 *
 * Useful when you need to update movement outside of the system,
 * such as in tests or custom update loops.
 *
 * @param world - The ECS world
 * @param entities - Array of entity IDs to update
 * @param deltaTime - Time elapsed in seconds
 *
 * @example
 * ```typescript
 * import { updateMovements, queryMovement } from 'blecsd';
 *
 * // Manual update (typically use the system instead)
 * const entities = queryMovement(world);
 * updateMovements(world, entities, 0.016);
 * ```
 */
export function updateMovements(
	world: World,
	entities: readonly number[],
	deltaTime: number,
): void {
	for (const eid of entities) {
		if (!hasVelocity(world, eid)) {
			continue;
		}

		// Apply acceleration if present
		if (hasAcceleration(world, eid)) {
			applyAccelerationToEntity(eid, deltaTime);
		}

		// Apply friction
		applyFrictionToEntity(eid, deltaTime);

		// Clamp to max speed
		clampSpeedForEntity(eid);

		// Apply velocity to position
		if (hasComponent(world, eid, Position)) {
			applyVelocityToEntity(eid, deltaTime);
		}
	}
}
