/**
 * Configurable state machine framework
 * @module core/stateMachine
 * @internal This module is for internal use by widgets
 */

import { z } from 'zod';
import type { Unsubscribe } from './types';

/**
 * Action function executed on state transitions.
 * Receives the state machine context for side effects.
 */
export type Action<Context = unknown> = (context: Context) => void;

/**
 * Transition target with optional actions.
 */
export interface TransitionConfig<S extends string, Context = unknown> {
	target: S;
	actions?: Action<Context>[];
	guard?: (context: Context) => boolean;
}

/**
 * State configuration with entry/exit actions and transitions.
 */
export interface StateConfig<S extends string, E extends string, Context = unknown> {
	/** Actions to run when entering this state */
	entry?: Action<Context>[];
	/** Actions to run when exiting this state */
	exit?: Action<Context>[];
	/** Event handlers mapping events to target states */
	on?: Partial<Record<E, S | TransitionConfig<S, Context>>>;
}

/**
 * Full state machine configuration.
 *
 * @typeParam S - Union type of all state names
 * @typeParam E - Union type of all event names
 * @typeParam Context - Optional context object passed to actions
 */
export interface StateMachineConfig<S extends string, E extends string, Context = unknown> {
	/** Initial state when machine starts */
	initial: S;
	/** State definitions */
	states: Record<S, StateConfig<S, E, Context>>;
	/** Optional initial context */
	context?: Context;
}

/**
 * State change listener function.
 */
export type StateListener<S extends string> = (current: S, previous: S) => void;

/**
 * StateMachine interface for type-safe access.
 *
 * @typeParam S - Union type of all state names
 * @typeParam E - Union type of all event names
 * @typeParam Context - Optional context object passed to actions
 */
export interface StateMachine<S extends string, E extends string, Context = unknown> {
	readonly current: S;
	readonly context: Context;
	send(event: E): boolean;
	can(event: E): boolean;
	matches(state: S): boolean;
	subscribe(listener: StateListener<S>): Unsubscribe;
	validEvents(): E[];
	reset(): void;
}

function normalizeTransition<S extends string, Context>(
	transition: S | TransitionConfig<S, Context>,
): TransitionConfig<S, Context> {
	if (typeof transition === 'string') {
		return { target: transition };
	}
	return transition;
}

/**
 * Create a new state machine.
 *
 * @param config - State machine configuration
 * @returns A new StateMachine instance
 *
 * @example
 * ```typescript
 * const machine = createStateMachine({
 *   initial: 'off',
 *   states: {
 *     off: { on: { toggle: 'on' } },
 *     on: { on: { toggle: 'off' } }
 *   }
 * });
 *
 * machine.send('toggle'); // -> 'on'
 * ```
 */
export function createStateMachine<S extends string, E extends string, Context = unknown>(
	config: StateMachineConfig<S, E, Context>,
): StateMachine<S, E, Context> {
	let _current: S = config.initial;
	const _context: Context = config.context as Context;
	const listeners = new Set<StateListener<S>>();

	function runActions(actions: Action<Context>[] | undefined): void {
		if (!actions) return;
		for (const action of actions) {
			action(_context);
		}
	}

	function notifyListeners(previous: S): void {
		if (previous === _current) return;
		for (const listener of listeners) {
			listener(_current, previous);
		}
	}

	// Run initial state entry actions
	const initialState = config.states[_current];
	if (initialState?.entry) {
		for (const action of initialState.entry) {
			action(_context);
		}
	}

	const machine: StateMachine<S, E, Context> = {
		get current(): S {
			return _current;
		},

		get context(): Context {
			return _context;
		},

		/**
		 * Send an event to the state machine.
		 * Transitions to the target state if a valid transition exists.
		 *
		 * @param event - The event to send
		 * @returns True if a transition occurred, false if no valid transition
		 */
		send(event: E): boolean {
			const stateConfig = config.states[_current];
			if (!stateConfig?.on) {
				return false;
			}

			const transition = stateConfig.on[event];
			if (transition === undefined) {
				return false;
			}

			const { target, actions, guard } = normalizeTransition(transition);

			// Check guard condition
			if (guard && !guard(_context)) {
				return false;
			}

			const previous = _current;

			// Run exit, transition, and entry actions
			runActions(stateConfig.exit);
			runActions(actions);
			_current = target;
			runActions(config.states[_current]?.entry);

			// Notify listeners
			notifyListeners(previous);

			return true;
		},

		/**
		 * Check if an event can cause a transition from the current state.
		 *
		 * @param event - The event to check
		 * @returns True if the event can cause a transition
		 */
		can(event: E): boolean {
			const stateConfig = config.states[_current];
			if (!stateConfig?.on) {
				return false;
			}

			const transition = stateConfig.on[event];
			if (transition === undefined) {
				return false;
			}

			// Check guard if present
			const { guard } = normalizeTransition(transition);
			if (guard && !guard(_context)) {
				return false;
			}

			return true;
		},

		/**
		 * Check if the machine is in a specific state.
		 *
		 * @param state - The state to check
		 * @returns True if currently in that state
		 */
		matches(state: S): boolean {
			return _current === state;
		},

		/**
		 * Subscribe to state changes.
		 *
		 * @param listener - Function called on state change
		 * @returns Unsubscribe function
		 */
		subscribe(listener: StateListener<S>): Unsubscribe {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		/**
		 * Get all valid events from the current state.
		 *
		 * @returns Array of event names that can cause transitions
		 */
		validEvents(): E[] {
			const stateConfig = config.states[_current];
			if (!stateConfig?.on) {
				return [];
			}

			const events: E[] = [];
			for (const event of Object.keys(stateConfig.on) as E[]) {
				if (machine.can(event)) {
					events.push(event);
				}
			}
			return events;
		},

		/**
		 * Reset the machine to its initial state.
		 * Runs exit actions on current state and entry actions on initial state.
		 *
		 * Note: Context is NOT reset. If you need to reset context,
		 * create a new state machine instance instead.
		 */
		reset(): void {
			const previous = _current;

			// Run exit actions on current state
			runActions(config.states[_current]?.exit);

			// Reset state only (context is not deep copied)
			_current = config.initial;

			// Run initial entry actions
			runActions(config.states[_current]?.entry);

			// Notify listeners if state changed
			notifyListeners(previous);
		},
	};

	return machine;
}

// =============================================================================
// Zod Schemas for Config Validation
// =============================================================================

/**
 * Schema for validating state machine configuration at runtime.
 * Useful for loading machine configs from JSON.
 */
export const TransitionConfigSchema = z.union([
	z.string(),
	z.object({
		target: z.string(),
		// Actions and guards can't be validated as functions from JSON
	}),
]);

export const StateConfigSchema = z.object({
	entry: z.array(z.function()).optional(),
	exit: z.array(z.function()).optional(),
	on: z.record(z.string(), TransitionConfigSchema).optional(),
});

export const StateMachineConfigSchema = z.object({
	initial: z.string(),
	states: z.record(z.string(), StateConfigSchema),
	context: z.unknown().optional(),
});

/**
 * Validate a state machine configuration object.
 *
 * @param config - Configuration to validate
 * @returns Validated configuration
 * @throws ZodError if validation fails
 */
export function validateStateMachineConfig(
	config: unknown,
): z.infer<typeof StateMachineConfigSchema> {
	return StateMachineConfigSchema.parse(config);
}
