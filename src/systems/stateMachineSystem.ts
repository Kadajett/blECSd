/**
 * State machine system for updating entity state age.
 * Processes all entities with StateMachine component.
 * @module systems/stateMachineSystem
 */

import { hasComponent, query, registerComponent, withStore } from '../core/ecs';
import { getDeltaTime, type Scheduler } from '../core/scheduler';
import { LoopPhase, type System, type World } from '../core/types';

// Default capacity for component arrays (can grow as needed)
const DEFAULT_CAPACITY = 10000;

/**
 * Store for the StateMachine component's typed arrays.
 * Using SoA (Structure of Arrays) pattern for cache efficiency.
 *
 * This store is shared with components/stateMachine.ts to ensure
 * consistent data access. Systems access the raw store directly
 * for performance in tight loops.
 */
interface StateMachineSystemStore {
	/** Index into the machine definitions store */
	machineId: Uint32Array;
	/** Index of current state in the state list */
	currentState: Uint16Array;
	/** Index of previous state in the state list */
	previousState: Uint16Array;
	/** Time (in seconds) spent in current state */
	stateAge: Float32Array;
}

/**
 * Create a new StateMachine store for system processing.
 */
function createStateMachineStore(capacity = DEFAULT_CAPACITY): StateMachineSystemStore {
	return {
		machineId: new Uint32Array(capacity),
		currentState: new Uint16Array(capacity),
		previousState: new Uint16Array(capacity),
		stateAge: new Float32Array(capacity),
	};
}

// Global store used by the system
const systemStore = createStateMachineStore();

// Symbol to track if component is registered for a world
const REGISTERED_WORLDS = new WeakSet<World>();

// Reference to the component (set when first registered)
// biome-ignore lint/suspicious/noExplicitAny: Component type varies by world
let StateMachineSystemComponentRef: any = null;

/**
 * Get or register the StateMachine component for use with the system.
 * This ensures the component is registered before querying.
 *
 * @param world - The ECS world
 * @returns The component reference for querying
 */
function getStateMachineComponent(world: World): unknown {
	if (!REGISTERED_WORLDS.has(world)) {
		StateMachineSystemComponentRef = registerComponent(
			world,
			withStore(() => systemStore),
		);
		REGISTERED_WORLDS.add(world);
	}
	return StateMachineSystemComponentRef;
}

/**
 * Checks if an entity has the StateMachine component.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns true if entity has StateMachine component
 */
export function hasStateMachineSystem(world: World, eid: number): boolean {
	const component = getStateMachineComponent(world);
	return hasComponent(world, eid, component);
}

/**
 * Query all entities with the StateMachine component.
 *
 * @param world - The ECS world
 * @returns Array of entity IDs with StateMachine component
 */
export function queryStateMachine(world: World): number[] {
	const component = getStateMachineComponent(world);
	return Array.from(query(world, [component]));
}

/**
 * Gets the state age store for direct access.
 * Use with caution; primarily for testing.
 *
 * @returns The state age array
 */
export function getStateAgeStore(): Float32Array {
	return systemStore.stateAge;
}

/**
 * State machine system that updates the stateAge for all entities
 * with a StateMachine component.
 *
 * This system should be registered in the UPDATE phase of the game loop.
 * It reads delta time from getDeltaTime() which is set by the scheduler.
 *
 * The system updates each entity's stateAge by adding the frame's delta time.
 * This allows game logic to check how long an entity has been in its current
 * state for time-based transitions or animations.
 *
 * @param world - The ECS world to process
 * @returns The world (unchanged reference, but stateAge values updated)
 *
 * @example
 * ```typescript
 * import { createScheduler, LoopPhase, stateMachineSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.UPDATE, stateMachineSystem);
 *
 * // In game loop
 * scheduler.run(world, deltaTime);
 * ```
 */
export const stateMachineSystem: System = (world: World): World => {
	const dt = getDeltaTime();
	const entities = queryStateMachine(world);

	for (const eid of entities) {
		const currentAge = systemStore.stateAge[eid] ?? 0;
		systemStore.stateAge[eid] = currentAge + dt;
	}

	return world;
};

/**
 * Creates a new state machine system.
 *
 * Factory function that returns the stateMachineSystem.
 * Useful for cases where you need a fresh reference or want to
 * match the factory pattern used elsewhere in the codebase.
 *
 * @returns The state machine system function
 *
 * @example
 * ```typescript
 * import { createStateMachineSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * const system = createStateMachineSystem();
 * scheduler.registerSystem(LoopPhase.UPDATE, system);
 * ```
 */
export function createStateMachineSystem(): System {
	return stateMachineSystem;
}

/**
 * Registers the state machine system with a scheduler.
 *
 * Convenience function that registers stateMachineSystem in the UPDATE phase.
 *
 * @param scheduler - The scheduler to register with
 * @param priority - Optional priority within the UPDATE phase (default: 0)
 *
 * @example
 * ```typescript
 * import { createScheduler, registerStateMachineSystem } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * registerStateMachineSystem(scheduler);
 *
 * // State machine updates will now happen in UPDATE phase
 * scheduler.run(world, deltaTime);
 * ```
 */
export function registerStateMachineSystem(scheduler: Scheduler, priority = 0): void {
	scheduler.registerSystem(LoopPhase.UPDATE, stateMachineSystem, priority);
}

/**
 * Manually update state age for specific entities.
 *
 * Useful when you need to update state age outside of the system,
 * such as in tests or custom update loops.
 *
 * @param entities - Array of entity IDs to update
 * @param deltaTime - Time elapsed in seconds
 *
 * @example
 * ```typescript
 * import { updateStateAges, queryStateMachine } from 'blecsd';
 *
 * // Manual update (typically use the system instead)
 * const entities = queryStateMachine(world);
 * updateStateAges(entities, 0.016); // ~60fps frame
 * ```
 */
export function updateStateAges(entities: readonly number[], deltaTime: number): void {
	for (const eid of entities) {
		const currentAge = systemStore.stateAge[eid] ?? 0;
		systemStore.stateAge[eid] = currentAge + deltaTime;
	}
}

/**
 * Resets the state age for an entity to zero.
 *
 * Typically called when a state transition occurs (handled by
 * sendEvent in components/stateMachine.ts), but can be called
 * manually for custom state management.
 *
 * @param eid - Entity ID to reset
 *
 * @example
 * ```typescript
 * import { resetStateAge } from 'blecsd';
 *
 * // After a manual state transition
 * resetStateAge(entityId);
 * ```
 */
export function resetStateAge(eid: number): void {
	systemStore.stateAge[eid] = 0;
}

/**
 * Gets the state age for an entity from the system store.
 *
 * @param eid - Entity ID to query
 * @returns Time in seconds the entity has been in current state
 *
 * @example
 * ```typescript
 * import { getSystemStateAge } from 'blecsd';
 *
 * const age = getSystemStateAge(entityId);
 * if (age > 5.0) {
 *   // Entity has been in state for over 5 seconds
 * }
 * ```
 */
export function getSystemStateAge(eid: number): number {
	return systemStore.stateAge[eid] ?? 0;
}
