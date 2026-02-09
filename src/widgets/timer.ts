/**
 * Timer and Stopwatch Widgets
 *
 * Timer: Countdown timer with customizable format and completion callback
 * Stopwatch: Count-up stopwatch with lap tracking support
 *
 * @module widgets/timer
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { moveBy, setPosition } from '../components/position';
import { markDirty } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Time format options for display
 */
export type TimeFormat = 'ss' | 'mm:ss' | 'hh:mm:ss';

/**
 * Configuration for creating a Timer widget.
 */
export interface TimerConfig {
	// Position
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;

	// Timer settings
	/** Duration in milliseconds */
	readonly duration: number;
	/** Display format (default: 'mm:ss') */
	readonly format?: TimeFormat;
	/** Auto-start the timer (default: false) */
	readonly autoStart?: boolean;
	/** Callback when timer completes */
	readonly onComplete?: () => void;
}

/**
 * Configuration for creating a Stopwatch widget.
 */
export interface StopwatchConfig {
	// Position
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;

	// Stopwatch settings
	/** Display format (default: 'mm:ss') */
	readonly format?: TimeFormat;
	/** Enable lap tracking (default: false) */
	readonly lapSupport?: boolean;
	/** Auto-start the stopwatch (default: false) */
	readonly autoStart?: boolean;
}

/**
 * Timer widget state
 */
export interface TimerState {
	/** Remaining time in milliseconds */
	remaining: number;
	/** Total duration in milliseconds */
	duration: number;
	/** Is timer running */
	running: boolean;
}

/**
 * Stopwatch widget state
 */
export interface StopwatchState {
	/** Elapsed time in milliseconds */
	elapsed: number;
	/** Is stopwatch running */
	running: boolean;
	/** Lap times in milliseconds */
	laps: number[];
}

/**
 * Timer widget interface
 */
export interface TimerWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Start the timer */
	start(): TimerWidget;
	/** Pause the timer */
	pause(): TimerWidget;
	/** Reset the timer to initial duration */
	reset(): TimerWidget;
	/** Get current timer state */
	getState(): TimerState;
	/** Set position */
	setPosition(x: number, y: number): TimerWidget;
	/** Move by offset */
	move(dx: number, dy: number): TimerWidget;
	/** Destroy the widget */
	destroy(): void;
}

/**
 * Stopwatch widget interface
 */
export interface StopwatchWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Start the stopwatch */
	start(): StopwatchWidget;
	/** Pause the stopwatch */
	pause(): StopwatchWidget;
	/** Reset the stopwatch to zero */
	reset(): StopwatchWidget;
	/** Record a lap time (if lap support enabled) */
	lap(): StopwatchWidget;
	/** Get current stopwatch state */
	getState(): StopwatchState;
	/** Get all lap times */
	getLaps(): readonly number[];
	/** Set position */
	setPosition(x: number, y: number): StopwatchWidget;
	/** Move by offset */
	move(dx: number, dy: number): StopwatchWidget;
	/** Destroy the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for timer configuration.
 */
export const TimerConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	duration: z.number().positive(),
	format: z.enum(['ss', 'mm:ss', 'hh:mm:ss']).default('mm:ss'),
	autoStart: z.boolean().default(false),
	onComplete: z.function().optional(),
});

/**
 * Zod schema for stopwatch configuration.
 */
export const StopwatchConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	format: z.enum(['ss', 'mm:ss', 'hh:mm:ss']).default('mm:ss'),
	lapSupport: z.boolean().default(false),
	autoStart: z.boolean().default(false),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Timer component marker
 */
export const TimerComponent = {
	/** Tag indicating this is a timer widget (1 = yes) */
	isTimer: new Uint8Array(DEFAULT_CAPACITY),
	/** Is timer running (1 = yes) */
	running: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Stopwatch component marker
 */
export const StopwatchComponent = {
	/** Tag indicating this is a stopwatch widget (1 = yes) */
	isStopwatch: new Uint8Array(DEFAULT_CAPACITY),
	/** Is stopwatch running (1 = yes) */
	running: new Uint8Array(DEFAULT_CAPACITY),
	/** Lap support enabled (1 = yes) */
	lapSupport: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Timer state stored outside ECS
 */
interface TimerInternalState {
	remaining: number;
	duration: number;
	format: TimeFormat;
	onComplete: (() => void) | undefined;
}

/**
 * Stopwatch state stored outside ECS
 */
interface StopwatchInternalState {
	elapsed: number;
	format: TimeFormat;
	laps: number[];
}

/** Map of entity to timer state */
const timerStateMap = new Map<Entity, TimerInternalState>();

/** Map of entity to stopwatch state */
const stopwatchStateMap = new Map<Entity, StopwatchInternalState>();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format milliseconds according to the given format.
 * @internal
 */
function formatTime(ms: number, format: TimeFormat): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const pad = (n: number): string => n.toString().padStart(2, '0');

	switch (format) {
		case 'ss':
			return pad(totalSeconds);
		case 'mm:ss':
			return `${pad(minutes)}:${pad(seconds)}`;
		case 'hh:mm:ss':
			return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}
}

/**
 * Renders the timer display.
 * @internal
 */
function renderTimer(world: World, eid: Entity): void {
	const state = timerStateMap.get(eid);
	if (!state) return;

	const display = formatTime(state.remaining, state.format);
	setContent(world, eid, display);
}

/**
 * Renders the stopwatch display.
 * @internal
 */
function renderStopwatch(world: World, eid: Entity): void {
	const state = stopwatchStateMap.get(eid);
	if (!state) return;

	const display = formatTime(state.elapsed, state.format);
	setContent(world, eid, display);
}

/**
 * Calculate display width based on format.
 * @internal
 */
function getWidthForFormat(format: TimeFormat): number {
	switch (format) {
		case 'ss':
			return 2;
		case 'mm:ss':
			return 5;
		case 'hh:mm:ss':
			return 8;
	}
}

// =============================================================================
// TIMER FACTORY
// =============================================================================

/**
 * Creates a Timer widget with countdown functionality.
 *
 * The Timer widget displays a countdown from a specified duration to zero,
 * with customizable display format and completion callback.
 *
 * @param world - The ECS world
 * @param config - Timer configuration
 * @returns The Timer widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createTimer } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a 5-minute countdown timer
 * const timer = createTimer(world, {
 *   x: 10,
 *   y: 5,
 *   duration: 5 * 60 * 1000, // 5 minutes in ms
 *   format: 'mm:ss',
 *   onComplete: () => console.log('Time is up!'),
 * });
 *
 * timer.start();
 * ```
 */
export function createTimer(world: World, config: TimerConfig): TimerWidget {
	const validated = TimerConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as timer widget
	TimerComponent.isTimer[eid] = 1;
	TimerComponent.running[eid] = validated.autoStart ? 1 : 0;

	const width = getWidthForFormat(validated.format);
	setDimensions(world, eid, width, 1);
	setPosition(world, eid, validated.x, validated.y);

	// Store state
	timerStateMap.set(eid, {
		remaining: validated.duration,
		duration: validated.duration,
		format: validated.format,
		onComplete: validated.onComplete,
	});

	// Initial render
	renderTimer(world, eid);

	// Create the widget interface
	const widget: TimerWidget = {
		eid,

		start(): TimerWidget {
			TimerComponent.running[eid] = 1;
			return widget;
		},

		pause(): TimerWidget {
			TimerComponent.running[eid] = 0;
			return widget;
		},

		reset(): TimerWidget {
			const state = timerStateMap.get(eid);
			if (!state) return widget;

			state.remaining = state.duration;
			TimerComponent.running[eid] = 0;

			renderTimer(world, eid);
			markDirty(world, eid);

			return widget;
		},

		getState(): TimerState {
			const state = timerStateMap.get(eid);
			if (!state) {
				return { remaining: 0, duration: 0, running: false };
			}

			return {
				remaining: state.remaining,
				duration: state.duration,
				running: TimerComponent.running[eid] === 1,
			};
		},

		setPosition(x: number, y: number): TimerWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): TimerWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		destroy(): void {
			TimerComponent.isTimer[eid] = 0;
			TimerComponent.running[eid] = 0;
			timerStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// STOPWATCH FACTORY
// =============================================================================

/**
 * Creates a Stopwatch widget with count-up functionality.
 *
 * The Stopwatch widget tracks elapsed time from zero upward,
 * with optional lap time tracking.
 *
 * @param world - The ECS world
 * @param config - Stopwatch configuration
 * @returns The Stopwatch widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createStopwatch } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a stopwatch with lap support
 * const stopwatch = createStopwatch(world, {
 *   x: 10,
 *   y: 5,
 *   format: 'mm:ss',
 *   lapSupport: true,
 * });
 *
 * stopwatch.start();
 * // ... later
 * stopwatch.lap(); // Record a lap time
 * const laps = stopwatch.getLaps();
 * ```
 */
export function createStopwatch(world: World, config: StopwatchConfig = {}): StopwatchWidget {
	const validated = StopwatchConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as stopwatch widget
	StopwatchComponent.isStopwatch[eid] = 1;
	StopwatchComponent.running[eid] = validated.autoStart ? 1 : 0;
	StopwatchComponent.lapSupport[eid] = validated.lapSupport ? 1 : 0;

	const width = getWidthForFormat(validated.format);
	setDimensions(world, eid, width, 1);
	setPosition(world, eid, validated.x, validated.y);

	// Store state
	stopwatchStateMap.set(eid, {
		elapsed: 0,
		format: validated.format,
		laps: [],
	});

	// Initial render
	renderStopwatch(world, eid);

	// Create the widget interface
	const widget: StopwatchWidget = {
		eid,

		start(): StopwatchWidget {
			StopwatchComponent.running[eid] = 1;
			return widget;
		},

		pause(): StopwatchWidget {
			StopwatchComponent.running[eid] = 0;
			return widget;
		},

		reset(): StopwatchWidget {
			const state = stopwatchStateMap.get(eid);
			if (!state) return widget;

			state.elapsed = 0;
			state.laps = [];
			StopwatchComponent.running[eid] = 0;

			renderStopwatch(world, eid);
			markDirty(world, eid);

			return widget;
		},

		lap(): StopwatchWidget {
			if (StopwatchComponent.lapSupport[eid] !== 1) {
				return widget;
			}

			const state = stopwatchStateMap.get(eid);
			if (!state) return widget;

			state.laps.push(state.elapsed);

			return widget;
		},

		getState(): StopwatchState {
			const state = stopwatchStateMap.get(eid);
			if (!state) {
				return { elapsed: 0, running: false, laps: [] };
			}

			return {
				elapsed: state.elapsed,
				running: StopwatchComponent.running[eid] === 1,
				laps: [...state.laps],
			};
		},

		getLaps(): readonly number[] {
			const state = stopwatchStateMap.get(eid);
			return state?.laps ?? [];
		},

		setPosition(x: number, y: number): StopwatchWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): StopwatchWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		destroy(): void {
			StopwatchComponent.isStopwatch[eid] = 0;
			StopwatchComponent.running[eid] = 0;
			StopwatchComponent.lapSupport[eid] = 0;
			stopwatchStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// SYSTEM - Time Update
// =============================================================================

/**
 * Updates a single timer entity.
 * @internal
 */
function updateTimer(world: World, eid: Entity, deltaMs: number): void {
	const state = timerStateMap.get(eid);
	if (!state) return;

	state.remaining = Math.max(0, state.remaining - deltaMs);

	// Check for completion
	if (state.remaining === 0) {
		TimerComponent.running[eid] = 0;
		if (state.onComplete) {
			state.onComplete();
		}
	}

	renderTimer(world, eid);
	markDirty(world, eid);
}

/**
 * Updates a single stopwatch entity.
 * @internal
 */
function updateStopwatch(world: World, eid: Entity, deltaMs: number): void {
	const state = stopwatchStateMap.get(eid);
	if (!state) return;

	state.elapsed += deltaMs;

	renderStopwatch(world, eid);
	markDirty(world, eid);
}

/**
 * Updates all timer and stopwatch entities based on delta time.
 * Should be called every frame with the time elapsed since last frame.
 *
 * @param world - The ECS world
 * @param deltaMs - Time elapsed since last update in milliseconds
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { updateTimeWidgets } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * let lastTime = Date.now();
 *
 * function gameLoop() {
 *   const now = Date.now();
 *   const delta = now - lastTime;
 *   lastTime = now;
 *
 *   updateTimeWidgets(world, delta);
 *   // ... other systems
 * }
 * ```
 */
export function updateTimeWidgets(world: World, deltaMs: number): void {
	// Update timers
	for (let i = 0; i < TimerComponent.isTimer.length; i++) {
		if (TimerComponent.isTimer[i] === 1 && TimerComponent.running[i] === 1) {
			updateTimer(world, i, deltaMs);
		}
	}

	// Update stopwatches
	for (let i = 0; i < StopwatchComponent.isStopwatch.length; i++) {
		if (StopwatchComponent.isStopwatch[i] === 1 && StopwatchComponent.running[i] === 1) {
			updateStopwatch(world, i, deltaMs);
		}
	}
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a timer widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a timer widget
 *
 * @example
 * ```typescript
 * import { isTimer } from 'blecsd/widgets';
 *
 * if (isTimer(world, entity)) {
 *   // Handle timer-specific logic
 * }
 * ```
 */
export function isTimer(_world: World, eid: Entity): boolean {
	return TimerComponent.isTimer[eid] === 1;
}

/**
 * Checks if an entity is a stopwatch widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a stopwatch widget
 *
 * @example
 * ```typescript
 * import { isStopwatch } from 'blecsd/widgets';
 *
 * if (isStopwatch(world, entity)) {
 *   // Handle stopwatch-specific logic
 * }
 * ```
 */
export function isStopwatch(_world: World, eid: Entity): boolean {
	return StopwatchComponent.isStopwatch[eid] === 1;
}

/**
 * Resets the timer widget store. Useful for testing.
 * @internal
 */
export function resetTimerWidgetStore(): void {
	TimerComponent.isTimer.fill(0);
	TimerComponent.running.fill(0);
	timerStateMap.clear();
}

/**
 * Resets the stopwatch widget store. Useful for testing.
 * @internal
 */
export function resetStopwatchWidgetStore(): void {
	StopwatchComponent.isStopwatch.fill(0);
	StopwatchComponent.running.fill(0);
	StopwatchComponent.lapSupport.fill(0);
	stopwatchStateMap.clear();
}
