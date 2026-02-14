/**
 * Signal primitives for reactive state management.
 * Provides automatic dependency tracking and efficient recomputation.
 * @module core/signals
 */

import { markDirty } from '../components/renderable';
import type { Entity, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Signal getter function.
 * Returns the current value of the signal.
 */
export type SignalGetter<T> = () => T;

/**
 * Signal setter function.
 * Updates the signal value and notifies dependents.
 */
export type SignalSetter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * A signal is a tuple of [getter, setter].
 */
export type Signal<T> = readonly [SignalGetter<T>, SignalSetter<T>];

/**
 * Computed signal getter.
 * Returns the current computed value.
 */
export type ComputedGetter<T> = SignalGetter<T>;

/**
 * Internal signal node for dependency tracking.
 */
interface SignalNode<T> {
	readonly value: T;
	readonly subscribers: Set<ComputedNode<unknown>>;
	version: number;
}

/**
 * Internal computed node for dependency tracking.
 * Computed nodes can also act as signal sources for other computeds.
 */
interface ComputedNode<T> {
	readonly fn: () => T;
	value: T;
	readonly dependencies: Set<SignalNode<unknown> | ComputedNode<unknown>>;
	readonly subscribers: Set<ComputedNode<unknown>>;
	dirty: boolean;
	version: number;
	computing: boolean;
}

/**
 * Internal entity signal node.
 */
interface EntitySignalNode<T> extends SignalNode<T> {
	readonly world: World;
	readonly eid: Entity;
}

// =============================================================================
// TRACKING STATE
// =============================================================================

/**
 * Global tracking context stack.
 * When a computed is executing, it pushes itself onto this stack.
 * Any signal reads during execution add themselves to the current tracker's dependencies.
 */
const trackingStack: ComputedNode<unknown>[] = [];

/**
 * Batch update tracking.
 * When non-null, signal updates are deferred until batch completes.
 */
let batchDepth = 0;
const batchedComputeds = new Set<ComputedNode<unknown>>();

// =============================================================================
// DEPENDENCY TRACKING
// =============================================================================

/**
 * Registers a dependency on a signal or computed.
 * Called when a signal or computed is read during computed execution.
 */
function track<T>(node: SignalNode<T> | ComputedNode<T>): void {
	const currentTracker = trackingStack[trackingStack.length - 1];
	if (!currentTracker) {
		return;
	}

	// Add this signal/computed to the computed's dependencies
	currentTracker.dependencies.add(node as SignalNode<unknown> | ComputedNode<unknown>);
	// Add the computed to this signal/computed's subscribers
	node.subscribers.add(currentTracker);
}

/**
 * Notifies all subscribers that a signal or computed has changed.
 * Recursively marks dependent computeds as dirty.
 */
function notify(node: SignalNode<unknown> | ComputedNode<unknown>): void {
	if (batchDepth > 0) {
		// In batch mode, collect dirty computeds instead of recomputing immediately
		for (const subscriber of node.subscribers) {
			if (!subscriber.dirty) {
				subscriber.dirty = true;
				batchedComputeds.add(subscriber);
				// Recursively mark dependents
				notify(subscriber);
			}
		}
		return;
	}

	// Immediately mark subscribers as dirty and propagate
	for (const subscriber of node.subscribers) {
		if (!subscriber.dirty) {
			subscriber.dirty = true;
			// Recursively mark dependents of this computed
			notify(subscriber);
		}
	}
}

/**
 * Unsubscribes a computed from all its dependencies.
 */
function unsubscribe(computed: ComputedNode<unknown>): void {
	for (const dep of computed.dependencies) {
		dep.subscribers.delete(computed);
	}
	computed.dependencies.clear();
}

// =============================================================================
// SIGNAL CREATION
// =============================================================================

/**
 * Creates a reactive signal with automatic dependency tracking.
 *
 * Returns a tuple of [getter, setter]. The getter returns the current value
 * and tracks dependencies. The setter updates the value and notifies dependents.
 *
 * @param initialValue - Initial value of the signal
 * @returns Tuple of [getter, setter]
 *
 * @example
 * ```typescript
 * import { createSignal } from 'blecsd';
 *
 * const [count, setCount] = createSignal(0);
 * console.log(count()); // 0
 * setCount(1);
 * console.log(count()); // 1
 *
 * // Functional update
 * setCount(prev => prev + 1);
 * console.log(count()); // 2
 * ```
 */
export function createSignal<T>(initialValue: T): Signal<T> {
	const node: SignalNode<T> = {
		value: initialValue,
		subscribers: new Set(),
		version: 0,
	};

	const getter: SignalGetter<T> = (): T => {
		track(node);
		return node.value;
	};

	const setter: SignalSetter<T> = (value: T | ((prev: T) => T)): void => {
		const newValue = typeof value === 'function' ? (value as (prev: T) => T)(node.value) : value;

		// Skip update if value hasn't changed (reference equality)
		if (Object.is(newValue, node.value)) {
			return;
		}

		(node as { value: T }).value = newValue;
		node.version++;
		notify(node);
	};

	return [getter, setter] as const;
}

// =============================================================================
// COMPUTED SIGNALS
// =============================================================================

/**
 * WeakMap to track computed nodes for disposal.
 * Maps getter functions to their internal nodes.
 */
const computedNodes = new WeakMap<SignalGetter<unknown>, ComputedNode<unknown>>();

/**
 * Creates a computed signal that automatically tracks dependencies.
 *
 * The function is executed once immediately, and any signals read during
 * execution become dependencies. The computed value is cached and only
 * recomputed when dependencies change.
 *
 * Handles diamond dependencies correctly (A depends on B and C, both depend on D -
 * when D changes, A recomputes only once).
 *
 * @param fn - Function that computes the value
 * @returns Getter function for the computed value
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
export function createComputed<T>(fn: () => T): ComputedGetter<T> {
	const node: ComputedNode<T> = {
		fn,
		value: undefined as T,
		dependencies: new Set(),
		subscribers: new Set(),
		dirty: true,
		version: 0,
		computing: false,
	};

	const getter: ComputedGetter<T> = (): T => {
		// Detect circular dependencies
		if (node.computing) {
			throw new Error('Circular dependency detected in computed signal');
		}

		if (node.dirty) {
			// Recompute the value
			node.computing = true;

			// Clear old dependencies before recomputing
			unsubscribe(node);

			// Track new dependencies during computation
			trackingStack.push(node);
			try {
				node.value = node.fn();
				node.dirty = false;
				node.version++;
			} finally {
				trackingStack.pop();
				node.computing = false;
			}
		}

		// Track this computed as a dependency if we're inside another computed
		track(node);

		return node.value;
	};

	// Initialize the computed value
	getter();

	// Register for disposal
	computedNodes.set(getter, node as ComputedNode<unknown>);

	return getter;
}

// =============================================================================
// BATCHING
// =============================================================================

/**
 * Batches multiple signal updates together.
 *
 * All signal updates within the batch function are deferred, and
 * computed signals only recompute once after all updates complete.
 *
 * @param fn - Function containing batched updates
 *
 * @example
 * ```typescript
 * import { createSignal, createComputed, createBatch } from 'blecsd';
 *
 * const [a, setA] = createSignal(0);
 * const [b, setB] = createSignal(0);
 * const sum = createComputed(() => a() + b());
 *
 * createBatch(() => {
 *   setA(1);
 *   setB(2);
 * });
 * // sum recomputes only once, not twice
 * console.log(sum()); // 3
 * ```
 */
export function createBatch(fn: () => void): void {
	batchDepth++;
	try {
		fn();
	} finally {
		batchDepth--;
		if (batchDepth === 0) {
			// Batch complete - clear the batched set
			// Computeds are already marked dirty and will recompute on next access
			batchedComputeds.clear();
		}
	}
}

// =============================================================================
// ENTITY SIGNALS
// =============================================================================

/**
 * Creates an entity-scoped signal that automatically marks the entity dirty.
 *
 * When the signal changes, `markDirty(world, eid)` is called automatically,
 * integrating with the rendering system's dirty tracking.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param initialValue - Initial value of the signal
 * @returns Tuple of [getter, setter]
 *
 * @example
 * ```typescript
 * import { createEntitySignal } from 'blecsd';
 *
 * const [health, setHealth] = createEntitySignal(world, playerEntity, 100);
 * setHealth(80); // Automatically marks playerEntity as dirty
 * ```
 */
export function createEntitySignal<T>(world: World, eid: Entity, initialValue: T): Signal<T> {
	const node: EntitySignalNode<T> = {
		value: initialValue,
		subscribers: new Set(),
		version: 0,
		world,
		eid,
	};

	const getter: SignalGetter<T> = (): T => {
		track(node);
		return node.value;
	};

	const setter: SignalSetter<T> = (value: T | ((prev: T) => T)): void => {
		const newValue = typeof value === 'function' ? (value as (prev: T) => T)(node.value) : value;

		if (Object.is(newValue, node.value)) {
			return;
		}

		(node as { value: T }).value = newValue;
		node.version++;
		notify(node);

		// Mark entity as dirty
		markDirty(node.world, node.eid);
	};

	return [getter, setter] as const;
}

// =============================================================================
// DISPOSAL
// =============================================================================

/**
 * Disposes a signal or computed, removing all subscriptions.
 *
 * For computed signals, this unsubscribes from all dependencies.
 * Call this when a signal is no longer needed to prevent memory leaks.
 *
 * Note: This takes a getter function, not the full signal tuple.
 *
 * @param getter - Signal or computed getter function
 *
 * @example
 * ```typescript
 * import { createSignal, createComputed, disposeSignal } from 'blecsd';
 *
 * const [count] = createSignal(0);
 * const doubled = createComputed(() => count() * 2);
 *
 * // When done with the computed
 * disposeSignal(doubled);
 * ```
 */
export function disposeSignal<T>(getter: SignalGetter<T>): void {
	const node = computedNodes.get(getter);
	if (node) {
		unsubscribe(node);
		computedNodes.delete(getter);
	}
}
