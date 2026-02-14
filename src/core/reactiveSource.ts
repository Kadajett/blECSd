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

/**
 * Minimal interface for a readable stream.
 */
interface ReadableStream {
	on(event: string, listener: (...args: unknown[]) => void): void;
	removeListener(event: string, listener: (...args: unknown[]) => void): void;
	destroy?(): void;
}

/**
 * Options for stream signal creation.
 */
interface StreamSignalOptions<T> {
	/**
	 * Transform function to convert Buffer chunks to signal values.
	 * Defaults to converting Buffer to string.
	 */
	transform?: (chunk: Buffer) => T;
	/**
	 * Initial value for the signal.
	 */
	initialValue: T;
	/**
	 * Whether to destroy the stream on dispose. Defaults to false.
	 */
	destroyOnDispose?: boolean;
}

/**
 * Creates a signal from a Node.js Readable stream.
 * Updates on each 'data' event with the transformed chunk value.
 *
 * @param readable - A readable stream (Node.js Readable or compatible)
 * @param options - Stream signal options
 * @returns Tuple of [getter, dispose]
 *
 * @example
 * ```typescript
 * import { createStreamSignal } from 'blecsd';
 * import { createReadStream } from 'fs';
 *
 * const stream = createReadStream('./data.txt', { encoding: 'utf8' });
 * const [data, dispose] = createStreamSignal(stream, {
 *   initialValue: '',
 *   transform: (chunk) => chunk.toString('utf8')
 * });
 *
 * console.log(data()); // Latest chunk from stream
 *
 * dispose(); // Clean up listeners
 * ```
 */
export function createStreamSignal<T>(
	readable: ReadableStream,
	options: StreamSignalOptions<T>,
): [SignalGetter<T>, Dispose] {
	const {
		transform = (chunk: Buffer): T => chunk.toString('utf8') as T,
		initialValue,
		destroyOnDispose = false,
	} = options;
	const [value, setValue] = createSignal(initialValue);

	const dataListener = (...args: unknown[]): void => {
		const chunk = args[0] as Buffer;
		setValue(transform(chunk));
	};

	const errorListener = (...args: unknown[]): void => {
		// On error, keep the previous value but log the error
		const err = args[0] as Error;
		console.error('Stream error:', err);
	};

	readable.on('data', dataListener);
	readable.on('error', errorListener);

	const dispose = (): void => {
		readable.removeListener('data', dataListener);
		readable.removeListener('error', errorListener);
		if (destroyOnDispose && readable.destroy) {
			readable.destroy();
		}
	};

	return [value, dispose];
}

/**
 * Subscribe function type for callback signal.
 * Takes a callback and returns an unsubscribe function.
 */
type Subscribe<T> = (callback: (value: T) => void) => () => void;

/**
 * Creates a signal from a generic subscribe/unsubscribe pattern.
 * This is a universal adapter for WebSocket, EventEmitter, and other callback-based sources.
 *
 * @param subscribe - Function that takes a callback and returns an unsubscribe function
 * @param initialValue - Initial value for the signal
 * @returns Tuple of [getter, dispose]
 *
 * @example
 * ```typescript
 * import { createCallbackSignal } from 'blecsd';
 *
 * // WebSocket example
 * const ws = new WebSocket('ws://localhost:8080');
 * const [message, dispose] = createCallbackSignal<string>(
 *   (callback) => {
 *     const handler = (event: MessageEvent) => callback(event.data);
 *     ws.addEventListener('message', handler);
 *     return () => ws.removeEventListener('message', handler);
 *   },
 *   ''
 * );
 *
 * console.log(message()); // Latest WebSocket message
 *
 * dispose(); // Unsubscribe
 * ```
 */
export function createCallbackSignal<T>(
	subscribe: Subscribe<T>,
	initialValue: T,
): [SignalGetter<T>, Dispose] {
	const [value, setValue] = createSignal(initialValue);

	const unsubscribe = subscribe((newValue: T) => {
		setValue(newValue);
	});

	return [value, unsubscribe];
}

/**
 * Creates a signal that polls an async function at regular intervals.
 * Handles promises and errors gracefully.
 *
 * @param fn - Async function to poll
 * @param intervalMs - Polling interval in milliseconds
 * @param initialValue - Initial value for the signal
 * @returns Tuple of [getter, dispose]
 *
 * @example
 * ```typescript
 * import { createPollingSignal } from 'blecsd';
 *
 * const [apiData, dispose] = createPollingSignal(
 *   async () => {
 *     const response = await fetch('https://api.example.com/status');
 *     return response.json();
 *   },
 *   5000, // Poll every 5 seconds
 *   { status: 'unknown' }
 * );
 *
 * console.log(apiData()); // Latest API response
 *
 * dispose(); // Stop polling
 * ```
 */
export function createPollingSignal<T>(
	fn: () => Promise<T>,
	intervalMs: number,
	initialValue: T,
): [SignalGetter<T>, Dispose] {
	const [value, setValue] = createSignal(initialValue);
	let isDisposed = false;

	const poll = async (): Promise<void> => {
		if (isDisposed) {
			return;
		}

		try {
			const result = await fn();
			if (!isDisposed) {
				setValue(result);
			}
		} catch (err) {
			// On error, keep the previous value
			console.error('Polling error:', err);
		}
	};

	// Start first poll immediately
	void poll();

	const intervalId = setInterval(() => {
		void poll();
	}, intervalMs);

	const dispose = (): void => {
		isDisposed = true;
		clearInterval(intervalId);
	};

	return [value, dispose];
}

/**
 * Minimal interface for an event emitter.
 */
interface EventEmitter {
	on(eventName: string, listener: (...args: unknown[]) => void): void;
	removeListener(eventName: string, listener: (...args: unknown[]) => void): void;
}

/**
 * Creates a signal from a Node.js EventEmitter event.
 * Updates whenever the specified event is emitted.
 *
 * @param emitter - Event emitter instance
 * @param eventName - Name of the event to listen to
 * @param initialValue - Initial value for the signal (optional)
 * @returns Tuple of [getter, dispose]
 *
 * @example
 * ```typescript
 * import { createEventSignal } from 'blecsd';
 * import { EventEmitter } from 'events';
 *
 * const emitter = new EventEmitter();
 * const [message, dispose] = createEventSignal<string>(emitter, 'message', '');
 *
 * emitter.emit('message', 'Hello');
 * console.log(message()); // "Hello"
 *
 * emitter.emit('message', 'World');
 * console.log(message()); // "World"
 *
 * dispose(); // Remove listener
 * ```
 */
export function createEventSignal<T>(
	emitter: EventEmitter,
	eventName: string,
	initialValue?: T,
): [SignalGetter<T | undefined>, Dispose] {
	const [value, setValue] = createSignal<T | undefined>(initialValue);

	const listener = (...args: unknown[]): void => {
		const payload = args[0] as T;
		setValue(payload);
	};

	emitter.on(eventName, listener);

	const dispose = (): void => {
		emitter.removeListener(eventName, listener);
	};

	return [value, dispose];
}
