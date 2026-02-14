/**
 * Reactive effect system for blECSd.
 * Effects automatically re-run when their dependencies change.
 *
 * @module core/reactiveEffects
 */

import { trackDependencies } from './signals';
import { LoopPhase } from './types';

/**
 * Effect handle for disposal.
 */
export interface EffectHandle {
	readonly dispose: () => void;
}

/**
 * Cleanup function returned by effect.
 */
type EffectCleanup = () => void;

/**
 * Effect function that may optionally return a cleanup function.
 * The function can return nothing (void/undefined) or a cleanup function.
 */
export type EffectFunction = () => unknown;

/**
 * Scheduled effect entry.
 */
interface ScheduledEffectEntry {
	readonly fn: EffectFunction;
	readonly phase: LoopPhase;
	readonly markDirty: () => void;
	dirty: boolean;
	cleanup: EffectCleanup | null;
	stopTracking: (() => void) | null;
	disposed: boolean;
}

/**
 * Global list of scheduled effects pending execution.
 */
const scheduledEffects: ScheduledEffectEntry[] = [];

/**
 * Creates an immediate effect that runs when dependencies change.
 * The effect runs immediately on creation and re-runs whenever any signal
 * read inside the effect changes.
 *
 * @param fn - Effect function to run
 * @returns Effect handle for disposal
 *
 * @example
 * ```typescript
 * import { createSignal, createEffect } from 'blecsd';
 *
 * const [count, setCount] = createSignal(0);
 *
 * const effect = createEffect(() => {
 *   console.log(`Count is now: ${count()}`);
 *   return () => console.log('Cleaning up effect');
 * });
 *
 * setCount(5); // Logs: "Cleaning up effect", then "Count is now: 5"
 *
 * effect.dispose(); // Stop the effect
 * ```
 */
export function createEffect(fn: EffectFunction): EffectHandle {
	let cleanup: EffectCleanup | null = null;
	let disposed = false;

	const runEffect = (): void => {
		if (disposed) {
			return;
		}

		// Run cleanup from previous execution
		if (cleanup) {
			cleanup();
			cleanup = null;
		}

		// Run effect and capture new cleanup
		const result = fn();
		if (typeof result === 'function') {
			cleanup = result as EffectCleanup;
		}
	};

	// Track dependencies and run on changes
	const stopTracking = trackDependencies(runEffect, runEffect);

	return {
		dispose: (): void => {
			if (disposed) {
				return;
			}
			disposed = true;
			stopTracking();
			if (cleanup) {
				cleanup();
				cleanup = null;
			}
		},
	};
}

/**
 * Creates a scheduled effect that defers execution to a specific ECS loop phase.
 * Unlike immediate effects, scheduled effects batch their updates and run during
 * the specified phase of the game loop.
 *
 * @param fn - Effect function to run
 * @param phase - Loop phase to run in (default: LATE_UPDATE)
 * @returns Effect handle for disposal
 *
 * @example
 * ```typescript
 * import { createSignal, createScheduledEffect, LoopPhase } from 'blecsd';
 *
 * const [position, setPosition] = createSignal({ x: 0, y: 0 });
 *
 * // Effect runs during LAYOUT phase
 * const effect = createScheduledEffect(() => {
 *   const pos = position();
 *   console.log(`Position updated: ${pos.x}, ${pos.y}`);
 * }, LoopPhase.LAYOUT);
 *
 * setPosition({ x: 10, y: 20 }); // Marked dirty, waits for LAYOUT phase
 *
 * effect.dispose(); // Stop the effect
 * ```
 */
export function createScheduledEffect(
	fn: EffectFunction,
	phase: LoopPhase = LoopPhase.LATE_UPDATE,
): EffectHandle {
	const entry: ScheduledEffectEntry = {
		fn,
		phase,
		markDirty: (): void => {
			if (!entry.disposed) {
				entry.dirty = true;
			}
		},
		dirty: true,
		cleanup: null,
		stopTracking: null,
		disposed: false,
	};

	scheduledEffects.push(entry);

	// Scheduled effects don't run or track dependencies immediately
	// They set up tracking when first flushed

	return {
		dispose: (): void => {
			if (entry.disposed) {
				return;
			}
			entry.disposed = true;
			if (entry.stopTracking) {
				entry.stopTracking();
				entry.stopTracking = null;
			}
			if (entry.cleanup) {
				entry.cleanup();
				entry.cleanup = null;
			}
			const index = scheduledEffects.indexOf(entry);
			if (index !== -1) {
				scheduledEffects.splice(index, 1);
			}
		},
	};
}

/**
 * Disposes an effect, stopping it from running and cleaning up.
 * This is a convenience function equivalent to calling effect.dispose().
 *
 * @param handle - Effect handle to dispose
 *
 * @example
 * ```typescript
 * import { createEffect, disposeEffect } from 'blecsd';
 *
 * const effect = createEffect(() => {
 *   console.log('Effect running');
 * });
 *
 * disposeEffect(effect); // Same as effect.dispose()
 * ```
 */
export function disposeEffect(handle: EffectHandle): void {
	handle.dispose();
}

/**
 * Flushes all scheduled effects for a specific phase.
 * This is called by the reactive system during each loop phase.
 *
 * @param phase - Loop phase to flush effects for
 * @internal
 */
export function flushScheduledEffects(phase: LoopPhase): void {
	for (const entry of scheduledEffects) {
		if (entry.phase !== phase || entry.disposed) {
			continue;
		}

		if (!entry.dirty) {
			continue;
		}

		entry.dirty = false;

		// If this is the first run, set up dependency tracking
		if (!entry.stopTracking) {
			const runEffect = (): void => {
				if (entry.disposed) {
					return;
				}

				// Run cleanup from previous execution
				if (entry.cleanup) {
					entry.cleanup();
					entry.cleanup = null;
				}

				// Run effect and capture new cleanup
				const result = entry.fn();
				if (typeof result === 'function') {
					entry.cleanup = result as EffectCleanup;
				}
			};

			entry.stopTracking = trackDependencies(runEffect, entry.markDirty);
		} else {
			// Subsequent runs: just execute the function
			if (entry.cleanup) {
				entry.cleanup();
				entry.cleanup = null;
			}

			const result = entry.fn();
			if (typeof result === 'function') {
				entry.cleanup = result as EffectCleanup;
			}
		}
	}
}

/**
 * Gets the count of scheduled effects for a specific phase.
 * Useful for debugging and testing.
 *
 * @param phase - Loop phase to count effects for
 * @returns Number of scheduled effects in the phase
 *
 * @example
 * ```typescript
 * import { createScheduledEffect, getScheduledEffectCount, LoopPhase } from 'blecsd';
 *
 * createScheduledEffect(() => {}, LoopPhase.UPDATE);
 * createScheduledEffect(() => {}, LoopPhase.UPDATE);
 *
 * console.log(getScheduledEffectCount(LoopPhase.UPDATE)); // 2
 * ```
 */
export function getScheduledEffectCount(phase: LoopPhase): number {
	return scheduledEffects.filter((entry) => entry.phase === phase && !entry.disposed).length;
}

/**
 * Gets the total count of all scheduled effects across all phases.
 *
 * @returns Total number of scheduled effects
 *
 * @example
 * ```typescript
 * import { createScheduledEffect, getTotalScheduledEffectCount, LoopPhase } from 'blecsd';
 *
 * createScheduledEffect(() => {}, LoopPhase.UPDATE);
 * createScheduledEffect(() => {}, LoopPhase.RENDER);
 *
 * console.log(getTotalScheduledEffectCount()); // 2
 * ```
 */
export function getTotalScheduledEffectCount(): number {
	return scheduledEffects.filter((entry) => !entry.disposed).length;
}

/**
 * Clears all scheduled effects. Used for testing.
 *
 * @internal
 */
export function resetScheduledEffects(): void {
	for (const entry of scheduledEffects) {
		if (entry.stopTracking) {
			entry.stopTracking();
		}
		if (entry.cleanup) {
			entry.cleanup();
		}
		entry.disposed = true;
	}
	scheduledEffects.length = 0;
}
