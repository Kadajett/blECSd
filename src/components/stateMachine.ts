/**
 * State machine component for entity behavior
 * @module components/stateMachine
 * @internal This module is for internal use by widgets
 */

import { addComponent, hasComponent, registerComponent, removeComponent, withStore } from 'bitecs';
import type { StateMachine } from '../core/stateMachine';
import { createStateMachine, type StateMachineConfig } from '../core/stateMachine';
import type { Entity, World } from '../core/types';

// Default capacity for component arrays (can grow as needed)
const DEFAULT_CAPACITY = 10000;

/**
 * Store for the StateMachine component's typed arrays.
 * Using SoA (Structure of Arrays) pattern for cache efficiency.
 */
export interface StateMachineStore {
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
 * Create a new StateMachine component store with the specified capacity.
 */
function createStateMachineStore(capacity = DEFAULT_CAPACITY): StateMachineStore {
	return {
		machineId: new Uint32Array(capacity),
		currentState: new Uint16Array(capacity),
		previousState: new Uint16Array(capacity),
		stateAge: new Float32Array(capacity),
	};
}

// Global store for StateMachine component data
const stateMachineStore = createStateMachineStore();

// Symbol to track if component is registered for a world
const REGISTERED_WORLDS = new WeakSet<World>();

// Reference to the component (set when first registered)
// biome-ignore lint/suspicious/noExplicitAny: Component type varies by world
let StateMachineComponentRef: any = null;

/**
 * Get or register the StateMachine component for a world.
 * This must be called before using any StateMachine functions.
 */
function getStateMachineComponent(world: World): unknown {
	if (!REGISTERED_WORLDS.has(world)) {
		StateMachineComponentRef = registerComponent(
			world,
			withStore(() => stateMachineStore),
		);
		REGISTERED_WORLDS.add(world);
	}
	return StateMachineComponentRef;
}

/**
 * Store for state machine instances and definitions.
 * Maps machine IDs to runtime state machine instances.
 */
class StateMachineDefinitionStore {
	private machines = new Map<number, StateMachine<string, string, unknown>>();
	private stateIndices = new Map<number, Map<string, number>>();
	private stateNames = new Map<number, string[]>();
	private nextId = 1;

	/**
	 * Register a new state machine configuration.
	 *
	 * @param config - State machine configuration
	 * @returns Machine ID for use with entities
	 */
	register<S extends string, E extends string, C = unknown>(
		config: StateMachineConfig<S, E, C>,
	): number {
		const id = this.nextId++;
		const machine = createStateMachine(config);
		this.machines.set(id, machine as unknown as StateMachine<string, string, unknown>);

		// Build state index lookup
		const states = Object.keys(config.states) as S[];
		const indexMap = new Map<string, number>();
		for (let i = 0; i < states.length; i++) {
			const state = states[i];
			if (state !== undefined) {
				indexMap.set(state, i);
			}
		}
		this.stateIndices.set(id, indexMap);
		this.stateNames.set(id, states);

		return id;
	}

	/**
	 * Get the state machine instance for a machine ID.
	 */
	getMachine(machineId: number): StateMachine<string, string, unknown> | undefined {
		return this.machines.get(machineId);
	}

	/**
	 * Get the state index for a state name.
	 */
	getStateIndex(machineId: number, state: string): number {
		return this.stateIndices.get(machineId)?.get(state) ?? 0;
	}

	/**
	 * Get the state name for a state index.
	 */
	getStateName(machineId: number, index: number): string {
		return this.stateNames.get(machineId)?.[index] ?? '';
	}

	/**
	 * Remove a machine registration.
	 */
	unregister(machineId: number): void {
		this.machines.delete(machineId);
		this.stateIndices.delete(machineId);
		this.stateNames.delete(machineId);
	}

	/**
	 * Clear all registrations.
	 */
	clear(): void {
		this.machines.clear();
		this.stateIndices.clear();
		this.stateNames.clear();
		this.nextId = 1;
	}
}

/**
 * Global store for state machine definitions.
 */
export const StateMachineStore = new StateMachineDefinitionStore();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Attach a state machine to an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity to attach machine to
 * @param config - State machine configuration
 * @returns The machine ID for later reference
 *
 * @example
 * ```typescript
 * const machineId = attachStateMachine(world, entityId, {
 *   initial: 'idle',
 *   states: {
 *     idle: { on: { activate: 'active' } },
 *     active: { on: { deactivate: 'idle' } }
 *   }
 * });
 * ```
 */
export function attachStateMachine<S extends string, E extends string, C = unknown>(
	world: World,
	eid: Entity,
	config: StateMachineConfig<S, E, C>,
): number {
	const component = getStateMachineComponent(world);
	const machineId = StateMachineStore.register(config);
	const initialStateIndex = StateMachineStore.getStateIndex(machineId, config.initial);

	addComponent(world, eid, component);
	stateMachineStore.machineId[eid] = machineId;
	stateMachineStore.currentState[eid] = initialStateIndex;
	stateMachineStore.previousState[eid] = initialStateIndex;
	stateMachineStore.stateAge[eid] = 0;

	return machineId;
}

/**
 * Detach and remove a state machine from an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity to detach machine from
 */
export function detachStateMachine(world: World, eid: Entity): void {
	const component = getStateMachineComponent(world);
	if (!hasComponent(world, eid, component)) {
		return;
	}

	const machineId = stateMachineStore.machineId[eid] ?? 0;
	StateMachineStore.unregister(machineId);
	removeComponent(world, eid, component);
}

/**
 * Get the current state name for an entity's state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity to query
 * @returns Current state name, or empty string if no machine attached
 *
 * @example
 * ```typescript
 * const state = getState(world, entityId);
 * if (state === 'active') {
 *   // Handle active state
 * }
 * ```
 */
export function getState(world: World, eid: Entity): string {
	const component = getStateMachineComponent(world);
	if (!hasComponent(world, eid, component)) {
		return '';
	}

	const machineId = stateMachineStore.machineId[eid] ?? 0;
	const stateIndex = stateMachineStore.currentState[eid] ?? 0;
	return StateMachineStore.getStateName(machineId, stateIndex);
}

/**
 * Get the previous state name for an entity's state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity to query
 * @returns Previous state name, or empty string if no machine attached
 */
export function getPreviousState(world: World, eid: Entity): string {
	const component = getStateMachineComponent(world);
	if (!hasComponent(world, eid, component)) {
		return '';
	}

	const machineId = stateMachineStore.machineId[eid] ?? 0;
	const stateIndex = stateMachineStore.previousState[eid] ?? 0;
	return StateMachineStore.getStateName(machineId, stateIndex);
}

/**
 * Send an event to an entity's state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity to send event to
 * @param event - Event name to send
 * @returns True if a transition occurred, false otherwise
 *
 * @example
 * ```typescript
 * sendEvent(world, entityId, 'activate');
 * ```
 */
export function sendEvent(world: World, eid: Entity, event: string): boolean {
	const component = getStateMachineComponent(world);
	if (!hasComponent(world, eid, component)) {
		return false;
	}

	const machineId = stateMachineStore.machineId[eid] ?? 0;
	const machine = StateMachineStore.getMachine(machineId);
	if (!machine) {
		return false;
	}

	const previousState = machine.current;
	const transitioned = machine.send(event as never);

	if (transitioned) {
		// Update component data
		const newStateIndex = StateMachineStore.getStateIndex(machineId, machine.current);
		const prevStateIndex = StateMachineStore.getStateIndex(machineId, previousState);

		stateMachineStore.previousState[eid] = prevStateIndex;
		stateMachineStore.currentState[eid] = newStateIndex;
		stateMachineStore.stateAge[eid] = 0;
	}

	return transitioned;
}

/**
 * Check if an event can cause a transition from the current state.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @param event - Event name to check
 * @returns True if the event can cause a transition
 */
export function canSendEvent(world: World, eid: Entity, event: string): boolean {
	const component = getStateMachineComponent(world);
	if (!hasComponent(world, eid, component)) {
		return false;
	}

	const machineId = stateMachineStore.machineId[eid] ?? 0;
	const machine = StateMachineStore.getMachine(machineId);
	if (!machine) {
		return false;
	}

	return machine.can(event as never);
}

/**
 * Get the time spent in the current state.
 *
 * @param world - The ECS world
 * @param eid - Entity to query
 * @returns Time in seconds in current state, or 0 if no machine attached
 *
 * @example
 * ```typescript
 * const age = getStateAge(world, entityId);
 * if (age > 5.0) {
 *   // State has been active for more than 5 seconds
 * }
 * ```
 */
export function getStateAge(world: World, eid: Entity): number {
	const component = getStateMachineComponent(world);
	if (!hasComponent(world, eid, component)) {
		return 0;
	}
	return stateMachineStore.stateAge[eid] ?? 0;
}

/**
 * Check if an entity is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @param state - State name to check
 * @returns True if entity is in the specified state
 */
export function isInState(world: World, eid: Entity, state: string): boolean {
	return getState(world, eid) === state;
}

/**
 * Update state age for all entities with state machines.
 * Call this in your game loop with the delta time.
 *
 * @param world - The ECS world
 * @param entities - Entities to update
 * @param deltaTime - Time elapsed since last frame in seconds
 */
export function updateStateAge(world: World, entities: Entity[], deltaTime: number): void {
	const component = getStateMachineComponent(world);
	for (const eid of entities) {
		if (hasComponent(world, eid, component)) {
			const currentAge = stateMachineStore.stateAge[eid] ?? 0;
			stateMachineStore.stateAge[eid] = currentAge + deltaTime;
		}
	}
}

/**
 * Check if an entity has a state machine attached.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns True if entity has a state machine
 */
export function hasStateMachine(world: World, eid: Entity): boolean {
	const component = getStateMachineComponent(world);
	return hasComponent(world, eid, component);
}
