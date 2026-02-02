/**
 * ProgressBar component and helper functions.
 * Provides progress indicator functionality.
 * @module components/progressBar
 */

import type { Entity, World } from '../core/types';
import { markDirty } from './renderable';

/** Default capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Progress bar orientation.
 */
export const ProgressOrientation = {
	Horizontal: 0,
	Vertical: 1,
} as const;

export type ProgressOrientation =
	(typeof ProgressOrientation)[keyof typeof ProgressOrientation];

/**
 * ProgressBar component store for tracking progress bar entities.
 * Uses entity ID as index.
 */
export interface ProgressBarStore {
	/** Whether entity is a progress bar (1 = true, 0 = false) */
	isProgressBar: Uint8Array;
	/** Current value (0-100 by default) */
	value: Float32Array;
	/** Minimum value */
	min: Float32Array;
	/** Maximum value */
	max: Float32Array;
	/** Orientation (0 = horizontal, 1 = vertical) */
	orientation: Uint8Array;
	/** Whether to show percentage text (1 = true, 0 = false) */
	showPercentage: Uint8Array;
}

/**
 * Creates a new progress bar store with default capacity.
 */
function createProgressBarStore(capacity = DEFAULT_CAPACITY): ProgressBarStore {
	return {
		isProgressBar: new Uint8Array(capacity),
		value: new Float32Array(capacity),
		min: new Float32Array(capacity),
		max: new Float32Array(capacity),
		orientation: new Uint8Array(capacity),
		showPercentage: new Uint8Array(capacity),
	};
}

/**
 * Global progress bar store instance.
 */
export const progressBarStore = createProgressBarStore();

/**
 * Configuration for progress bar display.
 */
export interface ProgressBarDisplay {
	/** Character to use for filled portion */
	fillChar: string;
	/** Character to use for empty portion */
	emptyChar: string;
	/** Foreground color for filled portion */
	fillFg: number;
	/** Background color for filled portion */
	fillBg: number;
	/** Foreground color for empty portion */
	emptyFg: number;
	/** Background color for empty portion */
	emptyBg: number;
}

/**
 * Options for progress bar display configuration.
 */
export interface ProgressBarDisplayOptions {
	fillChar?: string;
	emptyChar?: string;
	fillFg?: number;
	fillBg?: number;
	emptyFg?: number;
	emptyBg?: number;
}

/** Default fill character for horizontal progress bars */
export const DEFAULT_FILL_CHAR = '█';

/** Default empty character for horizontal progress bars */
export const DEFAULT_EMPTY_CHAR = '░';

/** Default fill character for vertical progress bars */
export const DEFAULT_FILL_CHAR_VERTICAL = '█';

/** Default empty character for vertical progress bars */
export const DEFAULT_EMPTY_CHAR_VERTICAL = '░';

/**
 * Store for progress bar display configuration.
 */
const displayStore = new Map<Entity, ProgressBarDisplay>();

/**
 * Callback type for progress complete event.
 */
export type ProgressCompleteCallback = () => void;

/**
 * Callback type for progress change event.
 */
export type ProgressChangeCallback = (value: number, percentage: number) => void;

/**
 * Stores for callbacks.
 */
const completeCallbacks = new Map<Entity, ProgressCompleteCallback[]>();
const changeCallbacks = new Map<Entity, ProgressChangeCallback[]>();

/**
 * Resets the progress bar store to initial state.
 * Useful for testing.
 */
export function resetProgressBarStore(): void {
	progressBarStore.isProgressBar.fill(0);
	progressBarStore.value.fill(0);
	progressBarStore.min.fill(0);
	progressBarStore.max.fill(0);
	progressBarStore.orientation.fill(0);
	progressBarStore.showPercentage.fill(0);
	displayStore.clear();
	completeCallbacks.clear();
	changeCallbacks.clear();
}

/**
 * Marks an entity as a progress bar.
 *
 * @param world - The ECS world
 * @param eid - Entity ID to mark as progress bar
 * @param options - Progress bar options
 *
 * @example
 * ```typescript
 * import { attachProgressBarBehavior } from 'blecsd';
 *
 * attachProgressBarBehavior(world, entity, {
 *   min: 0,
 *   max: 100,
 *   orientation: ProgressOrientation.Horizontal,
 * });
 * ```
 */
export function attachProgressBarBehavior(
	world: World,
	eid: Entity,
	options: {
		min?: number;
		max?: number;
		value?: number;
		orientation?: ProgressOrientation;
		showPercentage?: boolean;
	} = {},
): void {
	progressBarStore.isProgressBar[eid] = 1;
	progressBarStore.min[eid] = options.min ?? 0;
	progressBarStore.max[eid] = options.max ?? 100;
	progressBarStore.value[eid] = options.value ?? 0;
	progressBarStore.orientation[eid] = options.orientation ?? ProgressOrientation.Horizontal;
	progressBarStore.showPercentage[eid] = options.showPercentage ? 1 : 0;

	// Initialize default display
	setProgressBarDisplay(eid, {});

	markDirty(world, eid);
}

/**
 * Checks if an entity is a progress bar.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns True if entity is a progress bar
 *
 * @example
 * ```typescript
 * import { isProgressBar } from 'blecsd';
 *
 * if (isProgressBar(world, eid)) {
 *   // Handle progress bar entity
 * }
 * ```
 */
export function isProgressBar(world: World, eid: Entity): boolean {
	return progressBarStore.isProgressBar[eid] === 1;
}

/**
 * Gets the current progress value.
 *
 * @param eid - Progress bar entity ID
 * @returns Current value
 *
 * @example
 * ```typescript
 * import { getProgress } from 'blecsd';
 *
 * const value = getProgress(progressBar);
 * ```
 */
export function getProgress(eid: Entity): number {
	return progressBarStore.value[eid] as number;
}

/**
 * Gets the minimum value of the progress bar.
 *
 * @param eid - Progress bar entity ID
 * @returns Minimum value
 */
export function getProgressMin(eid: Entity): number {
	return progressBarStore.min[eid] as number;
}

/**
 * Gets the maximum value of the progress bar.
 *
 * @param eid - Progress bar entity ID
 * @returns Maximum value
 */
export function getProgressMax(eid: Entity): number {
	return progressBarStore.max[eid] as number;
}

/**
 * Gets the progress as a percentage (0-100).
 *
 * @param eid - Progress bar entity ID
 * @returns Progress percentage (0-100)
 *
 * @example
 * ```typescript
 * import { getProgressPercentage } from 'blecsd';
 *
 * const percent = getProgressPercentage(progressBar);
 * console.log(`${percent}% complete`);
 * ```
 */
export function getProgressPercentage(eid: Entity): number {
	const min = progressBarStore.min[eid] as number;
	const max = progressBarStore.max[eid] as number;
	const value = progressBarStore.value[eid] as number;

	if (max === min) {
		return 0;
	}

	return ((value - min) / (max - min)) * 100;
}

/**
 * Gets the progress bar orientation.
 *
 * @param eid - Progress bar entity ID
 * @returns Orientation value
 */
export function getProgressOrientation(eid: Entity): ProgressOrientation {
	return progressBarStore.orientation[eid] as ProgressOrientation;
}

/**
 * Checks if percentage display is enabled.
 *
 * @param eid - Progress bar entity ID
 * @returns True if percentage is shown
 */
export function isShowingPercentage(eid: Entity): boolean {
	return progressBarStore.showPercentage[eid] === 1;
}

/**
 * Sets the progress bar value.
 * Value is clamped to min/max range.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 * @param value - New value
 *
 * @example
 * ```typescript
 * import { setProgress } from 'blecsd';
 *
 * setProgress(world, progressBar, 50);
 * ```
 */
export function setProgress(world: World, eid: Entity, value: number): void {
	const min = progressBarStore.min[eid] as number;
	const max = progressBarStore.max[eid] as number;
	const oldValue = progressBarStore.value[eid] as number;

	// Clamp value to valid range
	const clampedValue = Math.max(min, Math.min(max, value));
	progressBarStore.value[eid] = clampedValue;

	markDirty(world, eid);

	// Emit change callback
	if (clampedValue !== oldValue) {
		const percentage = getProgressPercentage(eid);
		emitProgressChange(eid, clampedValue, percentage);

		// Emit complete callback if at max
		if (clampedValue === max && oldValue < max) {
			emitProgressComplete(eid);
		}
	}
}

/**
 * Increments the progress bar value.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 * @param amount - Amount to add (default: 1)
 *
 * @example
 * ```typescript
 * import { incrementProgress } from 'blecsd';
 *
 * incrementProgress(world, progressBar, 10);
 * ```
 */
export function incrementProgress(
	world: World,
	eid: Entity,
	amount = 1,
): void {
	const current = progressBarStore.value[eid] as number;
	setProgress(world, eid, current + amount);
}

/**
 * Decrements the progress bar value.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 * @param amount - Amount to subtract (default: 1)
 */
export function decrementProgress(
	world: World,
	eid: Entity,
	amount = 1,
): void {
	const current = progressBarStore.value[eid] as number;
	setProgress(world, eid, current - amount);
}

/**
 * Resets the progress bar to minimum value.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 */
export function resetProgress(world: World, eid: Entity): void {
	const min = progressBarStore.min[eid] as number;
	setProgress(world, eid, min);
}

/**
 * Sets the progress bar to maximum value (complete).
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 */
export function completeProgress(world: World, eid: Entity): void {
	const max = progressBarStore.max[eid] as number;
	setProgress(world, eid, max);
}

/**
 * Checks if the progress bar is complete (at max value).
 *
 * @param eid - Progress bar entity ID
 * @returns True if at max value
 *
 * @example
 * ```typescript
 * import { isProgressComplete } from 'blecsd';
 *
 * if (isProgressComplete(progressBar)) {
 *   console.log('Done!');
 * }
 * ```
 */
export function isProgressComplete(eid: Entity): boolean {
	const max = progressBarStore.max[eid] as number;
	const value = progressBarStore.value[eid] as number;
	return value >= max;
}

/**
 * Sets the progress bar display configuration.
 *
 * @param eid - Progress bar entity ID
 * @param options - Display options
 *
 * @example
 * ```typescript
 * import { setProgressBarDisplay } from 'blecsd';
 *
 * setProgressBarDisplay(progressBar, {
 *   fillChar: '=',
 *   emptyChar: '-',
 *   fillFg: 0x00ff00ff,
 * });
 * ```
 */
export function setProgressBarDisplay(
	eid: Entity,
	options: ProgressBarDisplayOptions,
): void {
	const existing = displayStore.get(eid);
	const orientation = progressBarStore.orientation[eid] as ProgressOrientation;

	const defaultFill =
		orientation === ProgressOrientation.Vertical
			? DEFAULT_FILL_CHAR_VERTICAL
			: DEFAULT_FILL_CHAR;
	const defaultEmpty =
		orientation === ProgressOrientation.Vertical
			? DEFAULT_EMPTY_CHAR_VERTICAL
			: DEFAULT_EMPTY_CHAR;

	displayStore.set(eid, {
		fillChar: options.fillChar ?? existing?.fillChar ?? defaultFill,
		emptyChar: options.emptyChar ?? existing?.emptyChar ?? defaultEmpty,
		fillFg: options.fillFg ?? existing?.fillFg ?? 0x00ff00ff, // Green
		fillBg: options.fillBg ?? existing?.fillBg ?? 0x000000ff, // Black
		emptyFg: options.emptyFg ?? existing?.emptyFg ?? 0x666666ff, // Gray
		emptyBg: options.emptyBg ?? existing?.emptyBg ?? 0x000000ff, // Black
	});
}

/**
 * Gets the progress bar display configuration.
 *
 * @param eid - Progress bar entity ID
 * @returns Display configuration
 */
export function getProgressBarDisplay(eid: Entity): ProgressBarDisplay {
	const display = displayStore.get(eid);
	if (display) {
		return display;
	}

	// Return defaults
	const orientation = progressBarStore.orientation[eid] as ProgressOrientation;
	const defaultFill =
		orientation === ProgressOrientation.Vertical
			? DEFAULT_FILL_CHAR_VERTICAL
			: DEFAULT_FILL_CHAR;
	const defaultEmpty =
		orientation === ProgressOrientation.Vertical
			? DEFAULT_EMPTY_CHAR_VERTICAL
			: DEFAULT_EMPTY_CHAR;

	return {
		fillChar: defaultFill,
		emptyChar: defaultEmpty,
		fillFg: 0x00ff00ff,
		fillBg: 0x000000ff,
		emptyFg: 0x666666ff,
		emptyBg: 0x000000ff,
	};
}

/**
 * Clears the progress bar display configuration.
 *
 * @param eid - Progress bar entity ID
 */
export function clearProgressBarDisplay(eid: Entity): void {
	displayStore.delete(eid);
}

/**
 * Gets the fill character for the current progress value.
 *
 * @param eid - Progress bar entity ID
 * @returns Fill character
 */
export function getProgressFillChar(eid: Entity): string {
	return getProgressBarDisplay(eid).fillChar;
}

/**
 * Gets the empty character for the remaining progress.
 *
 * @param eid - Progress bar entity ID
 * @returns Empty character
 */
export function getProgressEmptyChar(eid: Entity): string {
	return getProgressBarDisplay(eid).emptyChar;
}

/**
 * Renders the progress bar as a string.
 * Useful for custom rendering.
 *
 * @param eid - Progress bar entity ID
 * @param width - Width in characters
 * @returns Rendered progress bar string
 *
 * @example
 * ```typescript
 * import { renderProgressString } from 'blecsd';
 *
 * const bar = renderProgressString(progressBar, 20);
 * // Returns something like "████████████░░░░░░░░"
 * ```
 */
export function renderProgressString(eid: Entity, width: number): string {
	const percentage = getProgressPercentage(eid) / 100;
	const display = getProgressBarDisplay(eid);

	const filledWidth = Math.round(width * percentage);
	const emptyWidth = width - filledWidth;

	return display.fillChar.repeat(filledWidth) + display.emptyChar.repeat(emptyWidth);
}

/**
 * Registers a callback for progress completion.
 *
 * @param eid - Progress bar entity ID
 * @param callback - Function to call when complete
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * import { onProgressComplete } from 'blecsd';
 *
 * const unsubscribe = onProgressComplete(progressBar, () => {
 *   console.log('Progress complete!');
 * });
 * ```
 */
export function onProgressComplete(
	eid: Entity,
	callback: ProgressCompleteCallback,
): () => void {
	const callbacks = completeCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	completeCallbacks.set(eid, callbacks);

	return () => {
		const current = completeCallbacks.get(eid);
		if (current) {
			const index = current.indexOf(callback);
			if (index !== -1) {
				current.splice(index, 1);
			}
		}
	};
}

/**
 * Registers a callback for progress changes.
 *
 * @param eid - Progress bar entity ID
 * @param callback - Function to call on change
 * @returns Unsubscribe function
 */
export function onProgressChange(
	eid: Entity,
	callback: ProgressChangeCallback,
): () => void {
	const callbacks = changeCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	changeCallbacks.set(eid, callbacks);

	return () => {
		const current = changeCallbacks.get(eid);
		if (current) {
			const index = current.indexOf(callback);
			if (index !== -1) {
				current.splice(index, 1);
			}
		}
	};
}

/**
 * Emits the progress complete event.
 *
 * @param eid - Progress bar entity ID
 */
function emitProgressComplete(eid: Entity): void {
	const callbacks = completeCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback();
		}
	}
}

/**
 * Emits the progress change event.
 *
 * @param eid - Progress bar entity ID
 * @param value - New value
 * @param percentage - New percentage
 */
function emitProgressChange(eid: Entity, value: number, percentage: number): void {
	const callbacks = changeCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(value, percentage);
		}
	}
}

/**
 * Clears all callbacks for a progress bar.
 *
 * @param eid - Progress bar entity ID
 */
export function clearProgressBarCallbacks(eid: Entity): void {
	completeCallbacks.delete(eid);
	changeCallbacks.delete(eid);
}

/**
 * Sets the progress bar orientation.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 * @param orientation - New orientation
 */
export function setProgressOrientation(
	world: World,
	eid: Entity,
	orientation: ProgressOrientation,
): void {
	progressBarStore.orientation[eid] = orientation;
	markDirty(world, eid);
}

/**
 * Sets whether to show percentage text.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 * @param show - Whether to show percentage
 */
export function setShowPercentage(
	world: World,
	eid: Entity,
	show: boolean,
): void {
	progressBarStore.showPercentage[eid] = show ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Sets the min/max range for the progress bar.
 *
 * @param world - The ECS world
 * @param eid - Progress bar entity ID
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function setProgressRange(
	world: World,
	eid: Entity,
	min: number,
	max: number,
): void {
	progressBarStore.min[eid] = min;
	progressBarStore.max[eid] = max;

	// Re-clamp current value
	const current = progressBarStore.value[eid] as number;
	if (current < min || current > max) {
		setProgress(world, eid, Math.max(min, Math.min(max, current)));
	}

	markDirty(world, eid);
}
