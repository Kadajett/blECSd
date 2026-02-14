/**
 * Minimal signal primitives for reactive effects and sources.
 * This is a temporary implementation for the feat/reactive-sources-effects branch.
 * It will be replaced by the merged version from the signals task.
 *
 * @module core/signals
 */

/**
 * Signal getter function.
 */
export type SignalGetter<T> = () => T;

/**
 * Signal setter function.
 */
export type SignalSetter<T> = (value: T) => void;

/**
 * Signal tuple with getter and setter.
 */
export type Signal<T> = readonly [SignalGetter<T>, SignalSetter<T>];

/**
 * Computed signal getter (read-only).
 */
export type ComputedSignal<T> = SignalGetter<T>;

/**
 * Dependency tracking context.
 */
interface DependencyContext {
	readonly dependencies: Set<SignalGetter<unknown>>;
	readonly addDependency: (signal: SignalGetter<unknown>) => void;
}

/**
 * Global dependency tracking stack.
 */
const dependencyStack: DependencyContext[] = [];

/**
 * Subscriber callback function.
 */
type Subscriber = () => void;

/**
 * Map of signal getters to their subscribers.
 */
const signalSubscribers = new WeakMap<SignalGetter<unknown>, Set<Subscriber>>();

/**
 * Adds a dependency to the current tracking context.
 */
function trackDependency(signal: SignalGetter<unknown>): void {
	const context = dependencyStack[dependencyStack.length - 1];
	if (context) {
		context.addDependency(signal);
	}
}

/**
 * Subscribes to signal changes.
 */
function subscribe(signal: SignalGetter<unknown>, subscriber: Subscriber): () => void {
	let subscribers = signalSubscribers.get(signal);
	if (!subscribers) {
		subscribers = new Set();
		signalSubscribers.set(signal, subscribers);
	}
	subscribers.add(subscriber);

	return (): void => {
		const subs = signalSubscribers.get(signal);
		if (subs) {
			subs.delete(subscriber);
		}
	};
}

/**
 * Notifies all subscribers of a signal change.
 */
function notify(signal: SignalGetter<unknown>): void {
	const subscribers = signalSubscribers.get(signal);
	if (subscribers) {
		for (const subscriber of subscribers) {
			subscriber();
		}
	}
}

/**
 * Creates a reactive signal with getter and setter.
 *
 * @param initial - Initial value
 * @returns Tuple of [getter, setter]
 *
 * @example
 * ```typescript
 * import { createSignal } from 'blecsd';
 *
 * const [count, setCount] = createSignal(0);
 * console.log(count()); // 0
 * setCount(5);
 * console.log(count()); // 5
 * ```
 */
export function createSignal<T>(initial: T): Signal<T> {
	let value = initial;

	const getter: SignalGetter<T> = (): T => {
		trackDependency(getter);
		return value;
	};

	const setter: SignalSetter<T> = (newValue: T): void => {
		if (newValue !== value) {
			value = newValue;
			notify(getter);
		}
	};

	return [getter, setter] as const;
}

/**
 * Creates a computed signal that derives its value from other signals.
 *
 * @param fn - Function that computes the value
 * @returns Getter for the computed value
 *
 * @example
 * ```typescript
 * import { createSignal, createComputed } from 'blecsd';
 *
 * const [count, setCount] = createSignal(0);
 * const doubled = createComputed(() => count() * 2);
 *
 * console.log(doubled()); // 0
 * setCount(5);
 * console.log(doubled()); // 10
 * ```
 */
export function createComputed<T>(fn: () => T): ComputedSignal<T> {
	let value: T;
	let dirty = true;
	const dependencies = new Set<SignalGetter<unknown>>();

	const recompute = (): void => {
		dirty = true;
		notify(getter);
	};

	const getter: ComputedSignal<T> = (): T => {
		if (dirty) {
			// Clear old dependencies
			for (const dep of dependencies) {
				const subs = signalSubscribers.get(dep);
				if (subs) {
					subs.delete(recompute);
				}
			}
			dependencies.clear();

			// Track new dependencies
			const context: DependencyContext = {
				dependencies,
				addDependency: (signal): void => {
					dependencies.add(signal);
					subscribe(signal, recompute);
				},
			};

			dependencyStack.push(context);
			try {
				value = fn();
				dirty = false;
			} finally {
				dependencyStack.pop();
			}
		}

		trackDependency(getter);
		return value;
	};

	// Initial computation
	getter();

	return getter;
}

/**
 * Runs a function while tracking dependencies.
 * Used internally by effect system.
 *
 * @param fn - Function to run
 * @param onDependencyChange - Callback when any dependency changes
 * @returns Cleanup function
 * @internal
 */
export function trackDependencies(fn: () => void, onDependencyChange: () => void): () => void {
	const dependencies = new Set<SignalGetter<unknown>>();
	const unsubscribers: Array<() => void> = [];

	const cleanup = (): void => {
		for (const unsub of unsubscribers) {
			unsub();
		}
		unsubscribers.length = 0;
		dependencies.clear();
	};

	const retrack = (): void => {
		cleanup();

		const context: DependencyContext = {
			dependencies,
			addDependency: (signal): void => {
				if (!dependencies.has(signal)) {
					dependencies.add(signal);
					const unsub = subscribe(signal, onDependencyChange);
					unsubscribers.push(unsub);
				}
			},
		};

		dependencyStack.push(context);
		try {
			fn();
		} finally {
			dependencyStack.pop();
		}
	};

	// Initial tracking
	retrack();

	return cleanup;
}
