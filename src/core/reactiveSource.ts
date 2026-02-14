/**
 * Reactive data source adapters for blECSd.
 * Provides signal-based wrappers for common data sources like intervals, timers, and reducers.
 *
 * @module core/reactiveSource
 */

import type { ComputedSignal, SignalGetter } from './signals';
import { createComputed, createSignal } from './signals';

/**
 * Dispose function for reactive sources.
 */
type Dispose = () => void;

/**
 * Creates a signal that updates at a regular interval.
 * The signal value is computed by calling the provided function.
 *
 * @param fn - Function to call on each interval
 * @param intervalMs - Interval in milliseconds
 * @returns Tuple of [getter, dispose]
 *
 * @example
 * ```typescript
 * import { createIntervalSignal } from 'blecsd';
 *
 * const [time, dispose] = createIntervalSignal(() => Date.now(), 1000);
 *
 * console.log(time()); // Current timestamp
 * // ... wait 1 second ...
 * console.log(time()); // Updated timestamp
 *
 * dispose(); // Stop the interval
 * ```
 */
export function createIntervalSignal<T>(
	fn: () => T,
	intervalMs: number,
): [SignalGetter<T>, Dispose] {
	const [value, setValue] = createSignal(fn());

	const intervalId = setInterval(() => {
		setValue(fn());
	}, intervalMs);

	const dispose = (): void => {
		clearInterval(intervalId);
	};

	return [value, dispose];
}

/**
 * Creates a signal that tracks elapsed time as a progress value from 0 to 1.
 * Useful for animations, countdowns, and timed transitions.
 *
 * @param durationMs - Duration in milliseconds
 * @returns Tuple of [progress getter (0-1), dispose]
 *
 * @example
 * ```typescript
 * import { createTimerSignal } from 'blecsd';
 *
 * const [progress, dispose] = createTimerSignal(5000); // 5 second timer
 *
 * console.log(progress()); // 0.0
 * // ... wait 2.5 seconds ...
 * console.log(progress()); // ~0.5
 * // ... wait 2.5 more seconds ...
 * console.log(progress()); // 1.0
 *
 * dispose(); // Stop the timer
 * ```
 */
export function createTimerSignal(durationMs: number): [SignalGetter<number>, Dispose] {
	const startTime = Date.now();
	const [elapsed, setElapsed] = createSignal(0);

	const intervalId = setInterval(() => {
		const now = Date.now();
		const delta = now - startTime;
		const progress = Math.min(delta / durationMs, 1);
		setElapsed(progress);

		if (progress >= 1) {
			clearInterval(intervalId);
		}
	}, 16); // ~60fps

	const dispose = (): void => {
		clearInterval(intervalId);
	};

	return [elapsed, dispose];
}

/**
 * Dispatch function for reducer signal.
 */
type Dispatch<A> = (action: A) => void;

/**
 * Reducer function type.
 */
type Reducer<T, A> = (state: T, action: A) => T;

/**
 * Creates a signal with a reducer-style update pattern.
 * Similar to React's useReducer, but as a reactive signal.
 *
 * @param reducer - Reducer function (state, action) => newState
 * @param initial - Initial state value
 * @returns Tuple of [getter, dispatch]
 *
 * @example
 * ```typescript
 * import { createReducerSignal } from 'blecsd';
 *
 * type CounterAction = { type: 'increment' } | { type: 'decrement' } | { type: 'reset' };
 *
 * const [count, dispatch] = createReducerSignal<number, CounterAction>(
 *   (state, action) => {
 *     switch (action.type) {
 *       case 'increment': return state + 1;
 *       case 'decrement': return state - 1;
 *       case 'reset': return 0;
 *     }
 *   },
 *   0
 * );
 *
 * console.log(count()); // 0
 * dispatch({ type: 'increment' });
 * console.log(count()); // 1
 * dispatch({ type: 'increment' });
 * console.log(count()); // 2
 * dispatch({ type: 'reset' });
 * console.log(count()); // 0
 * ```
 */
export function createReducerSignal<T, A>(
	reducer: Reducer<T, A>,
	initial: T,
): [SignalGetter<T>, Dispatch<A>] {
	const [state, setState] = createSignal(initial);

	const dispatch: Dispatch<A> = (action: A): void => {
		const currentState = state();
		const newState = reducer(currentState, action);
		setState(newState);
	};

	return [state, dispatch];
}

/**
 * Combiner function type for derived signals.
 */
type Combiner<T, R> = (...values: T[]) => R;

/**
 * Creates a derived signal that combines multiple signal values.
 * The combiner function is called whenever any input signal changes.
 *
 * @param signals - Array of signal getters to combine
 * @param combiner - Function to combine signal values
 * @returns Computed signal with combined value
 *
 * @example
 * ```typescript
 * import { createSignal, createDerivedSignal } from 'blecsd';
 *
 * const [firstName, setFirstName] = createSignal('John');
 * const [lastName, setLastName] = createSignal('Doe');
 *
 * const fullName = createDerivedSignal(
 *   [firstName, lastName],
 *   (first, last) => `${first} ${last}`
 * );
 *
 * console.log(fullName()); // "John Doe"
 * setFirstName('Jane');
 * console.log(fullName()); // "Jane Doe"
 * ```
 */
export function createDerivedSignal<T, R>(
	signals: ReadonlyArray<SignalGetter<T>>,
	combiner: Combiner<T, R>,
): ComputedSignal<R> {
	return createComputed(() => {
		const values = signals.map((signal) => signal());
		return combiner(...values);
	});
}
