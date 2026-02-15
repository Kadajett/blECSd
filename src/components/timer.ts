/**
 * Timer and Delay components for time-based game logic.
 *
 * Provides countdown timers, delays, repeating timers, and callback support
 * for scheduling game events using the ECS pattern.
 *
 * @module components/timer
 */

import { addComponent, hasComponent, query, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// TIMER COMPONENT
// =============================================================================

/**
 * Timer component store using SoA (Structure of Arrays).
 *
 * - `duration`: Total timer duration in seconds
 * - `elapsed`: Time elapsed since timer started (seconds)
 * - `remaining`: Time remaining until timer fires (seconds)
 * - `repeat`: Number of times to repeat (0 = no repeat, 0xFFFF = infinite)
 * - `repeatCount`: Number of times the timer has fired
 * - `active`: Whether the timer is currently counting down (0 or 1)
 * - `paused`: Whether the timer is paused (0 or 1)
 * - `autoDestroy`: Whether to remove the component when complete (0 or 1)
 *
 * @example
 * ```typescript
 * import { setTimer, TimerState } from 'blecsd';
 *
 * // One-shot 2-second timer
 * setTimer(world, entity, { duration: 2 });
 *
 * // Repeating timer, fires every 0.5 seconds
 * setTimer(world, entity, { duration: 0.5, repeat: TIMER_INFINITE });
 *
 * // 3-second delay that auto-removes when done
 * setTimer(world, entity, { duration: 3, autoDestroy: true });
 * ```
 */
export const Timer = {
	/** Total timer duration in seconds */
	duration: new Float32Array(DEFAULT_CAPACITY),
	/** Time elapsed since timer started */
	elapsed: new Float32Array(DEFAULT_CAPACITY),
	/** Time remaining until next fire */
	remaining: new Float32Array(DEFAULT_CAPACITY),
	/** Number of times to repeat (0 = one-shot, 0xFFFF = infinite) */
	repeat: new Uint16Array(DEFAULT_CAPACITY),
	/** Number of times the timer has fired */
	repeatCount: new Uint16Array(DEFAULT_CAPACITY),
	/** Whether the timer is active (1) or stopped (0) */
	active: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the timer is paused (1) or running (0) */
	paused: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether to auto-remove component when complete (1) or keep (0) */
	autoDestroy: new Uint8Array(DEFAULT_CAPACITY),
};

/** Value for infinite repeating timers */
export const TIMER_INFINITE = 0xffff;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Timer data returned by getTimer.
 */
export interface TimerData {
	readonly duration: number;
	readonly elapsed: number;
	readonly remaining: number;
	readonly repeat: number;
	readonly repeatCount: number;
	readonly active: boolean;
	readonly paused: boolean;
	readonly autoDestroy: boolean;
}

/**
 * Options for creating a timer.
 */
export interface TimerOptions {
	/** Duration in seconds */
	duration: number;
	/** Number of times to repeat (default: 0, use TIMER_INFINITE for infinite) */
	repeat?: number;
	/** Whether to auto-remove component when complete (default: false) */
	autoDestroy?: boolean;
	/** Whether to start immediately (default: true) */
	active?: boolean;
}

// =============================================================================
// CALLBACK STORE
// =============================================================================

/** Callback invoked when a timer fires */
export type TimerCallback = (world: World, eid: Entity) => void;

/** Callback invoked when a timer completes all repeats */
export type TimerCompleteCallback = (world: World, eid: Entity) => void;

/** Per-entity callback storage */
interface TimerCallbacks {
	onFire?: TimerCallback;
	onComplete?: TimerCompleteCallback;
}

/** Store for timer callbacks (keyed by entity) */
const callbackStore = new Map<number, TimerCallbacks>();

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initializes timer fields to default values.
 */
function initTimer(eid: Entity): void {
	Timer.duration[eid] = 0;
	Timer.elapsed[eid] = 0;
	Timer.remaining[eid] = 0;
	Timer.repeat[eid] = 0;
	Timer.repeatCount[eid] = 0;
	Timer.active[eid] = 0;
	Timer.paused[eid] = 0;
	Timer.autoDestroy[eid] = 0;
}

// =============================================================================
// SETTERS
// =============================================================================

/**
 * Sets a timer on an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity to add the timer to
 * @param options - Timer configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, setTimer, TIMER_INFINITE } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // One-shot 3-second timer
 * setTimer(world, eid, { duration: 3 });
 *
 * // Repeating timer
 * setTimer(world, eid, { duration: 0.5, repeat: TIMER_INFINITE });
 * ```
 */
export function setTimer(world: World, eid: Entity, options: TimerOptions): Entity {
	if (!hasComponent(world, eid, Timer)) {
		addComponent(world, eid, Timer);
		initTimer(eid);
	}

	Timer.duration[eid] = options.duration;
	Timer.elapsed[eid] = 0;
	Timer.remaining[eid] = options.duration;
	Timer.repeat[eid] = options.repeat ?? 0;
	Timer.repeatCount[eid] = 0;
	Timer.active[eid] = options.active !== false ? 1 : 0;
	Timer.autoDestroy[eid] = options.autoDestroy ? 1 : 0;
	Timer.paused[eid] = 0;

	return eid;
}

/**
 * Starts or resumes a timer.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 *
 * @example
 * ```typescript
 * import { startTimer } from 'blecsd';
 *
 * startTimer(world, entity);
 * ```
 */
export function startTimer(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Timer)) {
		return;
	}
	Timer.active[eid] = 1;
	Timer.paused[eid] = 0;
}

/**
 * Pauses a timer, preserving its current state.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 *
 * @example
 * ```typescript
 * import { pauseTimer } from 'blecsd';
 *
 * pauseTimer(world, entity);
 * ```
 */
export function pauseTimer(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Timer)) {
		return;
	}
	Timer.paused[eid] = 1;
}

/**
 * Resumes a paused timer.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 *
 * @example
 * ```typescript
 * import { resumeTimer } from 'blecsd';
 *
 * resumeTimer(world, entity);
 * ```
 */
export function resumeTimer(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Timer)) {
		return;
	}
	Timer.paused[eid] = 0;
}

/**
 * Stops a timer and resets it.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 *
 * @example
 * ```typescript
 * import { stopTimer } from 'blecsd';
 *
 * stopTimer(world, entity);
 * ```
 */
export function stopTimer(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Timer)) {
		return;
	}
	Timer.active[eid] = 0;
	Timer.paused[eid] = 0;
	Timer.elapsed[eid] = 0;
	Timer.remaining[eid] = Timer.duration[eid] as number;
	Timer.repeatCount[eid] = 0;
}

/**
 * Resets a timer to its initial state and starts it.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 *
 * @example
 * ```typescript
 * import { resetTimer } from 'blecsd';
 *
 * resetTimer(world, entity);
 * ```
 */
export function resetTimer(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Timer)) {
		return;
	}
	Timer.elapsed[eid] = 0;
	Timer.remaining[eid] = Timer.duration[eid] as number;
	Timer.repeatCount[eid] = 0;
	Timer.active[eid] = 1;
	Timer.paused[eid] = 0;
}

/**
 * Removes the timer component and callbacks from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity to remove the timer from
 *
 * @example
 * ```typescript
 * import { removeTimer } from 'blecsd';
 *
 * removeTimer(world, entity);
 * ```
 */
export function removeTimer(world: World, eid: Entity): void {
	if (hasComponent(world, eid, Timer)) {
		removeComponent(world, eid, Timer);
	}
	callbackStore.delete(eid as number);
}

// =============================================================================
// GETTERS
// =============================================================================

/**
 * Gets the timer data for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity to query
 * @returns Timer data, or undefined if entity has no timer
 *
 * @example
 * ```typescript
 * import { getTimer } from 'blecsd';
 *
 * const timer = getTimer(world, entity);
 * if (timer) {
 *   console.log(`Remaining: ${timer.remaining}s`);
 * }
 * ```
 */
export function getTimer(world: World, eid: Entity): TimerData | undefined {
	if (!hasComponent(world, eid, Timer)) {
		return undefined;
	}
	return {
		duration: Timer.duration[eid] as number,
		elapsed: Timer.elapsed[eid] as number,
		remaining: Timer.remaining[eid] as number,
		repeat: Timer.repeat[eid] as number,
		repeatCount: Timer.repeatCount[eid] as number,
		active: Timer.active[eid] === 1,
		paused: Timer.paused[eid] === 1,
		autoDestroy: Timer.autoDestroy[eid] === 1,
	};
}

/**
 * Checks if an entity has a timer component.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @returns True if the entity has a Timer component
 *
 * @example
 * ```typescript
 * import { hasTimer } from 'blecsd';
 *
 * if (hasTimer(world, entity)) {
 *   // entity has a timer
 * }
 * ```
 */
export function hasTimer(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Timer);
}

/**
 * Checks if a timer is currently active and not paused.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @returns True if the timer is running
 *
 * @example
 * ```typescript
 * import { isTimerRunning } from 'blecsd';
 *
 * if (isTimerRunning(world, entity)) {
 *   // timer is counting down
 * }
 * ```
 */
export function isTimerRunning(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Timer)) {
		return false;
	}
	return Timer.active[eid] === 1 && Timer.paused[eid] === 0;
}

/**
 * Checks if a timer has completed (all repeats exhausted).
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @returns True if the timer has finished
 *
 * @example
 * ```typescript
 * import { isTimerComplete } from 'blecsd';
 *
 * if (isTimerComplete(world, entity)) {
 *   // timer finished all cycles
 * }
 * ```
 */
export function isTimerComplete(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Timer)) {
		return false;
	}
	return Timer.active[eid] === 0 && (Timer.elapsed[eid] as number) > 0;
}

/**
 * Gets the progress of the current timer cycle as a value from 0 to 1.
 *
 * @param world - The ECS world
 * @param eid - The entity to check
 * @returns Progress from 0 (just started) to 1 (about to fire), or 0 if no timer
 *
 * @example
 * ```typescript
 * import { getTimerProgress } from 'blecsd';
 *
 * const progress = getTimerProgress(world, entity);
 * console.log(`${Math.round(progress * 100)}% complete`);
 * ```
 */
export function getTimerProgress(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Timer)) {
		return 0;
	}
	const duration = Timer.duration[eid] as number;
	if (duration <= 0) {
		return 0;
	}
	const remaining = Timer.remaining[eid] as number;
	return Math.max(0, Math.min(1, 1 - remaining / duration));
}

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Registers a callback invoked each time the timer fires.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 * @param callback - Function to call when timer fires
 *
 * @example
 * ```typescript
 * import { onTimerFire } from 'blecsd';
 *
 * onTimerFire(world, entity, (world, eid) => {
 *   console.log('Timer fired!');
 * });
 * ```
 */
export function onTimerFire(_world: World, eid: Entity, callback: TimerCallback): void {
	const existing = callbackStore.get(eid as number) ?? {};
	existing.onFire = callback;
	callbackStore.set(eid as number, existing);
}

/**
 * Registers a callback invoked when the timer completes all repeats.
 *
 * @param world - The ECS world
 * @param eid - The entity with the timer
 * @param callback - Function to call when timer completes
 *
 * @example
 * ```typescript
 * import { onTimerComplete } from 'blecsd';
 *
 * onTimerComplete(world, entity, (world, eid) => {
 *   console.log('Timer finished!');
 * });
 * ```
 */
export function onTimerComplete(_world: World, eid: Entity, callback: TimerCompleteCallback): void {
	const existing = callbackStore.get(eid as number) ?? {};
	existing.onComplete = callback;
	callbackStore.set(eid as number, existing);
}

/**
 * Clears all callbacks for an entity's timer.
 *
 * @param world - The ECS world
 * @param eid - The entity to clear callbacks for
 *
 * @example
 * ```typescript
 * import { clearTimerCallbacks } from 'blecsd';
 *
 * clearTimerCallbacks(world, entity);
 * ```
 */
export function clearTimerCallbacks(_world: World, eid: Entity): void {
	callbackStore.delete(eid as number);
}

/**
 * Resets the callback store. Useful for testing.
 */
export function resetTimerStore(): void {
	callbackStore.clear();
}

// =============================================================================
// TIMER SYSTEM UPDATE
// =============================================================================

/**
 * Updates all active timers by the given delta time.
 *
 * This is the core timer update function, typically called from a system
 * registered in the UPDATE phase.
 *
 * @param world - The ECS world
 * @param dt - Delta time in seconds
 * @returns Entities whose timers fired this frame
 *
 * @example
 * ```typescript
 * import { updateTimers, getDeltaTime } from 'blecsd';
 *
 * const timerSystem: System = (world) => {
 *   const dt = getDeltaTime();
 *   updateTimers(world, dt);
 *   return world;
 * };
 * ```
 */
export function updateTimers(world: World, dt: number): readonly Entity[] {
	const fired: Entity[] = [];
	const toRemove: Entity[] = [];

	const entities = timerQuery(world);

	for (const eid of entities) {
		if (Timer.active[eid] !== 1 || Timer.paused[eid] === 1) {
			continue;
		}

		Timer.elapsed[eid] = (Timer.elapsed[eid] as number) + dt;
		Timer.remaining[eid] = (Timer.remaining[eid] as number) - dt;

		if ((Timer.remaining[eid] as number) <= 0) {
			fired.push(eid);
			handleTimerFired(world, eid, toRemove);
		}
	}

	for (const eid of toRemove) {
		removeTimer(world, eid);
	}

	return fired;
}

/**
 * Handles a timer that has just fired: increments repeat count,
 * invokes callbacks, and determines whether to restart or complete.
 */
function handleTimerFired(world: World, eid: Entity, toRemove: Entity[]): void {
	Timer.repeatCount[eid] = ((Timer.repeatCount[eid] as number) + 1) as number;

	const callbacks = callbackStore.get(eid as number);
	if (callbacks?.onFire) {
		callbacks.onFire(world, eid);
	}

	const repeat = Timer.repeat[eid] as number;
	const repeatCount = Timer.repeatCount[eid] as number;

	if (repeat === TIMER_INFINITE || repeatCount <= repeat) {
		Timer.remaining[eid] = Timer.duration[eid] as number;
		return;
	}

	Timer.active[eid] = 0;
	Timer.remaining[eid] = 0;

	if (callbacks?.onComplete) {
		callbacks.onComplete(world, eid);
	}

	if (Timer.autoDestroy[eid] === 1) {
		toRemove.push(eid);
	}
}

/**
 * Queries for all entities with Timer component.
 */
function timerQuery(world: World): readonly Entity[] {
	return query(world, [Timer]) as unknown as readonly Entity[];
}
