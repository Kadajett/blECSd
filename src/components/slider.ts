/**
 * Slider Component
 *
 * Provides range slider functionality with state machine control.
 *
 * @module components/slider
 */

import { z } from 'zod';
import type { StateMachineConfig } from '../core/stateMachine';
import type { Entity, World } from '../core/types';
import { SliderRangeSchema, SliderStepSchema } from '../schemas/components';
import { markDirty } from './renderable';
import { attachStateMachine, getState, hasStateMachine, sendEvent } from './stateMachine';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Slider orientation.
 */
export const SliderOrientation = {
	Horizontal: 0,
	Vertical: 1,
} as const;

export type SliderOrientationType = (typeof SliderOrientation)[keyof typeof SliderOrientation];

/**
 * Slider state type.
 */
export type SliderState = 'idle' | 'focused' | 'dragging' | 'disabled';

/**
 * Slider event type.
 */
export type SliderEvent = 'focus' | 'blur' | 'dragStart' | 'dragEnd' | 'disable' | 'enable';

/**
 * Slider display configuration.
 */
export interface SliderDisplay {
	/** Character for the track */
	readonly trackChar: string;
	/** Character for the thumb */
	readonly thumbChar: string;
	/** Character for the filled portion */
	readonly fillChar: string;
	/** Track foreground color */
	readonly trackFg: number;
	/** Track background color */
	readonly trackBg: number;
	/** Thumb foreground color */
	readonly thumbFg: number;
	/** Thumb background color */
	readonly thumbBg: number;
	/** Fill foreground color */
	readonly fillFg: number;
	/** Fill background color */
	readonly fillBg: number;
}

/**
 * Slider display options for configuration.
 */
export interface SliderDisplayOptions {
	trackChar?: string | undefined;
	thumbChar?: string | undefined;
	fillChar?: string | undefined;
	trackFg?: number | undefined;
	trackBg?: number | undefined;
	thumbFg?: number | undefined;
	thumbBg?: number | undefined;
	fillFg?: number | undefined;
	fillBg?: number | undefined;
}

/**
 * Slider callback function type.
 */
export type SliderChangeCallback = (value: number) => void;

/**
 * Slider store for managing slider-specific data.
 */
export interface SliderStore {
	/** Whether entity is a slider */
	isSlider: Uint8Array;
	/** Current value */
	value: Float32Array;
	/** Minimum value */
	min: Float32Array;
	/** Maximum value */
	max: Float32Array;
	/** Step increment */
	step: Float32Array;
	/** Orientation (0=horizontal, 1=vertical) */
	orientation: Uint8Array;
	/** Whether to show value text */
	showValue: Uint8Array;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default track character (horizontal) */
export const DEFAULT_TRACK_CHAR = '─';

/** Default track character (vertical) */
export const DEFAULT_TRACK_CHAR_VERTICAL = '│';

/** Default thumb character */
export const DEFAULT_THUMB_CHAR = '●';

/** Default fill character (horizontal) */
export const DEFAULT_FILL_CHAR = '━';

/** Default fill character (vertical) */
export const DEFAULT_FILL_CHAR_VERTICAL = '┃';

/** Default track foreground color */
export const DEFAULT_TRACK_FG = 0x666666ff;

/** Default track background color */
export const DEFAULT_TRACK_BG = 0x000000ff;

/** Default thumb foreground color */
export const DEFAULT_THUMB_FG = 0xffffffff;

/** Default thumb background color */
export const DEFAULT_THUMB_BG = 0x0066ffff;

/** Default fill foreground color */
export const DEFAULT_FILL_FG = 0x00ff00ff;

/** Default fill background color */
export const DEFAULT_FILL_BG = 0x000000ff;

/** Maximum entities supported */
const MAX_ENTITIES = 10000;

// =============================================================================
// STORES
// =============================================================================

/**
 * Store for slider component data.
 */
export const sliderStore: SliderStore = {
	isSlider: new Uint8Array(MAX_ENTITIES),
	value: new Float32Array(MAX_ENTITIES),
	min: new Float32Array(MAX_ENTITIES),
	max: new Float32Array(MAX_ENTITIES).fill(100),
	step: new Float32Array(MAX_ENTITIES).fill(1),
	orientation: new Uint8Array(MAX_ENTITIES),
	showValue: new Uint8Array(MAX_ENTITIES),
};

/** Store for slider display configuration */
const displayStore = new Map<Entity, SliderDisplay>();

/** Store for slider change callbacks */
const changeCallbacks = new Map<Entity, SliderChangeCallback[]>();

/** Store for drag start callbacks */
const dragStartCallbacks = new Map<Entity, (() => void)[]>();

/** Store for drag end callbacks */
const dragEndCallbacks = new Map<Entity, (() => void)[]>();

// =============================================================================
// STATE MACHINE CONFIG
// =============================================================================

/**
 * State machine configuration for slider widgets.
 */
export const SLIDER_STATE_MACHINE_CONFIG: StateMachineConfig<SliderState, SliderEvent> = {
	initial: 'idle',
	states: {
		idle: {
			on: {
				focus: 'focused',
				disable: 'disabled',
			},
		},
		focused: {
			on: {
				blur: 'idle',
				dragStart: 'dragging',
				disable: 'disabled',
			},
		},
		dragging: {
			on: {
				dragEnd: 'focused',
				blur: 'idle',
				disable: 'disabled',
			},
		},
		disabled: {
			on: {
				enable: 'idle',
			},
		},
	},
};

// =============================================================================
// COMPONENT FUNCTIONS
// =============================================================================

/**
 * Attaches slider behavior to an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param min - Minimum value
 * @param max - Maximum value
 * @param value - Initial value
 * @param step - Step increment
 *
 * @example
 * ```typescript
 * import { attachSliderBehavior } from 'blecsd';
 *
 * attachSliderBehavior(world, eid, 0, 100, 50, 1);
 * ```
 */
export function attachSliderBehavior(
	world: World,
	eid: Entity,
	min = 0,
	max = 100,
	value = 0,
	step = 1,
): void {
	sliderStore.isSlider[eid] = 1;
	sliderStore.min[eid] = min;
	sliderStore.max[eid] = max;
	sliderStore.value[eid] = clampValue(value, min, max);
	sliderStore.step[eid] = step;
	sliderStore.orientation[eid] = SliderOrientation.Horizontal;
	sliderStore.showValue[eid] = 0;

	attachStateMachine(world, eid, SLIDER_STATE_MACHINE_CONFIG);
}

/**
 * Clamps a value to the min/max range.
 */
function clampValue(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Rounds value to nearest step.
 */
function roundToStep(value: number, step: number, min: number): number {
	if (step <= 0) {
		return value;
	}
	return min + Math.round((value - min) / step) * step;
}

/**
 * Checks if an entity is a slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is a slider
 */
export function isSlider(world: World, eid: Entity): boolean {
	return sliderStore.isSlider[eid] === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current state of a slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current state
 */
export function getSliderState(world: World, eid: Entity): SliderState {
	return (getState(world, eid) as SliderState) ?? 'idle';
}

/**
 * Checks if slider is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param state - The state to check
 * @returns true if slider is in the specified state
 */
export function isSliderInState(world: World, eid: Entity, state: SliderState): boolean {
	return getSliderState(world, eid) === state;
}

/**
 * Checks if slider is focused.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if slider is focused
 */
export function isSliderFocused(world: World, eid: Entity): boolean {
	const state = getSliderState(world, eid);
	return state === 'focused' || state === 'dragging';
}

/**
 * Checks if slider is being dragged.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if slider is being dragged
 */
export function isSliderDragging(world: World, eid: Entity): boolean {
	return isSliderInState(world, eid, 'dragging');
}

/**
 * Checks if slider is disabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if slider is disabled
 */
export function isSliderDisabled(world: World, eid: Entity): boolean {
	return isSliderInState(world, eid, 'disabled');
}

/**
 * Sends an event to the slider state machine.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param event - The event to send
 * @returns true if transition occurred
 */
/** Fire callbacks from a callback map */
function fireSliderCallbacks(eid: Entity, callbackMap: Map<Entity, Array<() => void>>): void {
	const callbacks = callbackMap.get(eid);
	if (!callbacks) return;
	for (const cb of callbacks) {
		cb();
	}
}

/** Handle slider state change callbacks */
function handleSliderStateChange(
	eid: Entity,
	previousState: SliderState,
	newState: SliderState,
): void {
	if (previousState !== 'dragging' && newState === 'dragging') {
		fireSliderCallbacks(eid, dragStartCallbacks);
	} else if (previousState === 'dragging' && newState !== 'dragging') {
		fireSliderCallbacks(eid, dragEndCallbacks);
	}
}

export function sendSliderEvent(world: World, eid: Entity, event: SliderEvent): boolean {
	if (!isSlider(world, eid)) return false;

	const previousState = getSliderState(world, eid);
	const result = sendEvent(world, eid, event);

	if (result) {
		const newState = getSliderState(world, eid);
		markDirty(world, eid);
		handleSliderStateChange(eid, previousState, newState);
	}

	return result;
}

/**
 * Focuses the slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if focused successfully
 */
export function focusSlider(world: World, eid: Entity): boolean {
	return sendSliderEvent(world, eid, 'focus');
}

/**
 * Blurs the slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if blurred successfully
 */
export function blurSlider(world: World, eid: Entity): boolean {
	return sendSliderEvent(world, eid, 'blur');
}

/**
 * Starts dragging the slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if drag started successfully
 */
export function startDragging(world: World, eid: Entity): boolean {
	return sendSliderEvent(world, eid, 'dragStart');
}

/**
 * Stops dragging the slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if drag stopped successfully
 */
export function stopDragging(world: World, eid: Entity): boolean {
	return sendSliderEvent(world, eid, 'dragEnd');
}

/**
 * Disables the slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if disabled successfully
 */
export function disableSlider(world: World, eid: Entity): boolean {
	return sendSliderEvent(world, eid, 'disable');
}

/**
 * Enables the slider.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if enabled successfully
 */
export function enableSlider(world: World, eid: Entity): boolean {
	return sendSliderEvent(world, eid, 'enable');
}

// =============================================================================
// VALUE MANAGEMENT
// =============================================================================

/**
 * Gets the slider value.
 *
 * @param eid - The entity ID
 * @returns The current value
 */
export function getSliderValue(eid: Entity): number {
	return sliderStore.value[eid] ?? 0;
}

/**
 * Sets the slider value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - The new value
 */
export function setSliderValue(world: World, eid: Entity, value: number): void {
	const min = sliderStore.min[eid] ?? 0;
	const max = sliderStore.max[eid] ?? 100;
	const step = sliderStore.step[eid] ?? 1;

	const newValue = clampValue(roundToStep(value, step, min), min, max);
	const oldValue = sliderStore.value[eid] ?? 0;

	if (newValue !== oldValue) {
		sliderStore.value[eid] = newValue;
		markDirty(world, eid);

		// Fire change callbacks
		const callbacks = changeCallbacks.get(eid);
		if (callbacks) {
			for (const cb of callbacks) {
				cb(newValue);
			}
		}
	}
}

/**
 * Gets the slider minimum value.
 *
 * @param eid - The entity ID
 * @returns The minimum value
 */
export function getSliderMin(eid: Entity): number {
	return sliderStore.min[eid] ?? 0;
}

/**
 * Gets the slider maximum value.
 *
 * @param eid - The entity ID
 * @returns The maximum value
 */
export function getSliderMax(eid: Entity): number {
	return sliderStore.max[eid] ?? 100;
}

/**
 * Gets the slider step value.
 *
 * @param eid - The entity ID
 * @returns The step value
 */
export function getSliderStep(eid: Entity): number {
	return sliderStore.step[eid] ?? 1;
}

/**
 * Sets the slider range.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function setSliderRange(world: World, eid: Entity, min: number, max: number): void {
	SliderRangeSchema.parse({ min, max });
	sliderStore.min[eid] = min;
	sliderStore.max[eid] = max;

	// Clamp current value to new range
	const currentValue = sliderStore.value[eid] ?? 0;
	const clampedValue = clampValue(currentValue, min, max);
	if (clampedValue !== currentValue) {
		setSliderValue(world, eid, clampedValue);
	}

	markDirty(world, eid);
}

/**
 * Sets the slider step.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param step - Step value
 */
export function setSliderStep(world: World, eid: Entity, step: number): void {
	SliderStepSchema.parse(step);
	sliderStore.step[eid] = step;

	// Round current value to new step
	const currentValue = sliderStore.value[eid] ?? 0;
	const min = sliderStore.min[eid] ?? 0;
	const roundedValue = roundToStep(currentValue, step, min);
	if (roundedValue !== currentValue) {
		setSliderValue(world, eid, roundedValue);
	}

	markDirty(world, eid);
}

/**
 * Gets the slider percentage (0-1).
 *
 * @param eid - The entity ID
 * @returns Value as percentage
 */
export function getSliderPercentage(eid: Entity): number {
	const min = sliderStore.min[eid] ?? 0;
	const max = sliderStore.max[eid] ?? 100;
	const value = sliderStore.value[eid] ?? 0;

	if (max === min) {
		return 0;
	}

	return (value - min) / (max - min);
}

/**
 * Sets the slider value from a percentage.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param percentage - Value as percentage (0-1)
 */
export function setSliderFromPercentage(world: World, eid: Entity, percentage: number): void {
	z.number().finite().parse(percentage);
	const min = sliderStore.min[eid] ?? 0;
	const max = sliderStore.max[eid] ?? 100;
	const clampedPct = Math.max(0, Math.min(1, percentage));
	const value = min + clampedPct * (max - min);
	setSliderValue(world, eid, value);
}

/**
 * Increments the slider value by step.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param multiplier - Step multiplier (default: 1)
 */
export function incrementSlider(world: World, eid: Entity, multiplier = 1): void {
	const step = sliderStore.step[eid] ?? 1;
	const current = sliderStore.value[eid] ?? 0;
	setSliderValue(world, eid, current + step * multiplier);
}

/**
 * Decrements the slider value by step.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param multiplier - Step multiplier (default: 1)
 */
export function decrementSlider(world: World, eid: Entity, multiplier = 1): void {
	const step = sliderStore.step[eid] ?? 1;
	const current = sliderStore.value[eid] ?? 0;
	setSliderValue(world, eid, current - step * multiplier);
}

/**
 * Sets slider to minimum value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function setSliderToMin(world: World, eid: Entity): void {
	setSliderValue(world, eid, sliderStore.min[eid] ?? 0);
}

/**
 * Sets slider to maximum value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function setSliderToMax(world: World, eid: Entity): void {
	setSliderValue(world, eid, sliderStore.max[eid] ?? 100);
}

// =============================================================================
// ORIENTATION
// =============================================================================

/**
 * Gets the slider orientation.
 *
 * @param eid - The entity ID
 * @returns The orientation
 */
export function getSliderOrientation(eid: Entity): SliderOrientationType {
	return sliderStore.orientation[eid] as SliderOrientationType;
}

/**
 * Sets the slider orientation.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param orientation - The orientation
 */
export function setSliderOrientation(
	world: World,
	eid: Entity,
	orientation: SliderOrientationType,
): void {
	sliderStore.orientation[eid] = orientation;
	markDirty(world, eid);
}

/**
 * Checks if slider is horizontal.
 *
 * @param eid - The entity ID
 * @returns true if horizontal
 */
export function isSliderHorizontal(eid: Entity): boolean {
	return getSliderOrientation(eid) === SliderOrientation.Horizontal;
}

/**
 * Checks if slider is vertical.
 *
 * @param eid - The entity ID
 * @returns true if vertical
 */
export function isSliderVertical(eid: Entity): boolean {
	return getSliderOrientation(eid) === SliderOrientation.Vertical;
}

// =============================================================================
// SHOW VALUE
// =============================================================================

/**
 * Gets whether the slider shows its value.
 *
 * @param eid - The entity ID
 * @returns true if showing value
 */
export function isShowingSliderValue(eid: Entity): boolean {
	return sliderStore.showValue[eid] === 1;
}

/**
 * Sets whether to show the slider value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param show - Whether to show value
 */
export function setShowSliderValue(world: World, eid: Entity, show: boolean): void {
	sliderStore.showValue[eid] = show ? 1 : 0;
	markDirty(world, eid);
}

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Sets the slider display configuration.
 *
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setSliderDisplay(eid: Entity, options: SliderDisplayOptions): void {
	const existing = displayStore.get(eid);
	const orientation = getSliderOrientation(eid);

	const defaultTrack =
		orientation === SliderOrientation.Vertical ? DEFAULT_TRACK_CHAR_VERTICAL : DEFAULT_TRACK_CHAR;
	const defaultFill =
		orientation === SliderOrientation.Vertical ? DEFAULT_FILL_CHAR_VERTICAL : DEFAULT_FILL_CHAR;

	displayStore.set(eid, {
		trackChar: options.trackChar ?? existing?.trackChar ?? defaultTrack,
		thumbChar: options.thumbChar ?? existing?.thumbChar ?? DEFAULT_THUMB_CHAR,
		fillChar: options.fillChar ?? existing?.fillChar ?? defaultFill,
		trackFg: options.trackFg ?? existing?.trackFg ?? DEFAULT_TRACK_FG,
		trackBg: options.trackBg ?? existing?.trackBg ?? DEFAULT_TRACK_BG,
		thumbFg: options.thumbFg ?? existing?.thumbFg ?? DEFAULT_THUMB_FG,
		thumbBg: options.thumbBg ?? existing?.thumbBg ?? DEFAULT_THUMB_BG,
		fillFg: options.fillFg ?? existing?.fillFg ?? DEFAULT_FILL_FG,
		fillBg: options.fillBg ?? existing?.fillBg ?? DEFAULT_FILL_BG,
	});
}

/**
 * Gets the slider display configuration.
 *
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getSliderDisplay(eid: Entity): SliderDisplay {
	const orientation = getSliderOrientation(eid);
	const defaultTrack =
		orientation === SliderOrientation.Vertical ? DEFAULT_TRACK_CHAR_VERTICAL : DEFAULT_TRACK_CHAR;
	const defaultFill =
		orientation === SliderOrientation.Vertical ? DEFAULT_FILL_CHAR_VERTICAL : DEFAULT_FILL_CHAR;

	return (
		displayStore.get(eid) ?? {
			trackChar: defaultTrack,
			thumbChar: DEFAULT_THUMB_CHAR,
			fillChar: defaultFill,
			trackFg: DEFAULT_TRACK_FG,
			trackBg: DEFAULT_TRACK_BG,
			thumbFg: DEFAULT_THUMB_FG,
			thumbBg: DEFAULT_THUMB_BG,
			fillFg: DEFAULT_FILL_FG,
			fillBg: DEFAULT_FILL_BG,
		}
	);
}

/**
 * Clears the slider display configuration.
 *
 * @param eid - The entity ID
 */
export function clearSliderDisplay(eid: Entity): void {
	displayStore.delete(eid);
}

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Registers a callback for when the slider value changes.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onSliderChange(eid, (value) => {
 *   console.log(`Value: ${value}`);
 * });
 * ```
 */
export function onSliderChange(eid: Entity, callback: SliderChangeCallback): () => void {
	const callbacks = changeCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	changeCallbacks.set(eid, callbacks);

	return () => {
		const cbs = changeCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Registers a callback for when dragging starts.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 */
export function onSliderDragStart(eid: Entity, callback: () => void): () => void {
	const callbacks = dragStartCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	dragStartCallbacks.set(eid, callbacks);

	return () => {
		const cbs = dragStartCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Registers a callback for when dragging ends.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 */
export function onSliderDragEnd(eid: Entity, callback: () => void): () => void {
	const callbacks = dragEndCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	dragEndCallbacks.set(eid, callbacks);

	return () => {
		const cbs = dragEndCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Clears all callbacks for a slider.
 *
 * @param eid - The entity ID
 */
export function clearSliderCallbacks(eid: Entity): void {
	changeCallbacks.delete(eid);
	dragStartCallbacks.delete(eid);
	dragEndCallbacks.delete(eid);
}

// =============================================================================
// KEY HANDLING
// =============================================================================

/**
 * Action returned from key press handling.
 */
export type SliderAction =
	| { type: 'increment'; multiplier: number }
	| { type: 'decrement'; multiplier: number }
	| { type: 'toMin' }
	| { type: 'toMax' };

/**
 * Handles key press for slider widget.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param key - The key name
 * @returns Action to perform or null
 *
 * @example
 * ```typescript
 * const action = handleSliderKeyPress(world, eid, 'right');
 * if (action?.type === 'increment') {
 *   incrementSlider(world, eid, action.multiplier);
 * }
 * ```
 */
export function handleSliderKeyPress(world: World, eid: Entity, key: string): SliderAction | null {
	if (!isSlider(world, eid)) {
		return null;
	}

	if (isSliderDisabled(world, eid)) {
		return null;
	}

	const isHorizontal = isSliderHorizontal(eid);

	switch (key) {
		case 'right':
			if (isHorizontal) {
				return { type: 'increment', multiplier: 1 };
			}
			return null;

		case 'left':
			if (isHorizontal) {
				return { type: 'decrement', multiplier: 1 };
			}
			return null;

		case 'up':
			if (!isHorizontal) {
				return { type: 'increment', multiplier: 1 };
			}
			return null;

		case 'down':
			if (!isHorizontal) {
				return { type: 'decrement', multiplier: 1 };
			}
			return null;

		case 'pageup':
			return { type: 'increment', multiplier: 10 };

		case 'pagedown':
			return { type: 'decrement', multiplier: 10 };

		case 'home':
			return { type: 'toMin' };

		case 'end':
			return { type: 'toMax' };

		default:
			return null;
	}
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Renders the slider as a string.
 *
 * @param eid - The entity ID
 * @param width - The available width
 * @returns Rendered slider string
 */
export function renderSliderString(eid: Entity, width: number): string {
	if (width <= 0) {
		return '';
	}

	const percentage = getSliderPercentage(eid);
	const display = getSliderDisplay(eid);
	const showValue = isShowingSliderValue(eid);

	// Calculate value string and adjust width
	let valueStr = '';
	let trackWidth = width;
	if (showValue) {
		const value = getSliderValue(eid);
		valueStr = ` ${value}`;
		trackWidth = Math.max(1, width - valueStr.length);
	}

	// Calculate thumb position
	const thumbPos = Math.round(percentage * (trackWidth - 1));

	// Build the track string
	let result = '';
	for (let i = 0; i < trackWidth; i++) {
		if (i === thumbPos) {
			result += display.thumbChar;
		} else if (i < thumbPos) {
			result += display.fillChar;
		} else {
			result += display.trackChar;
		}
	}

	return result + valueStr;
}

// =============================================================================
// STORE RESET
// =============================================================================

/**
 * Resets the slider store. Used for testing.
 */
export function resetSliderStore(): void {
	sliderStore.isSlider.fill(0);
	sliderStore.value.fill(0);
	sliderStore.min.fill(0);
	sliderStore.max.fill(100);
	sliderStore.step.fill(1);
	sliderStore.orientation.fill(0);
	sliderStore.showValue.fill(0);
	displayStore.clear();
	changeCallbacks.clear();
	dragStartCallbacks.clear();
	dragEndCallbacks.clear();
}
