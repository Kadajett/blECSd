/**
 * Slider System
 *
 * All business logic for slider/range components.
 * Component file (slider.ts) contains only data definitions.
 *
 * @module systems/sliderSystem
 */

import { z } from 'zod';
import { markDirty } from '../components/renderable';
import type {
	SliderChangeCallback,
	SliderDisplay,
	SliderDisplayOptions,
	SliderEvent,
	SliderOrientationType,
	SliderState,
} from '../components/slider';
import {
	DEFAULT_FILL_BG,
	DEFAULT_FILL_CHAR,
	DEFAULT_FILL_CHAR_VERTICAL,
	DEFAULT_FILL_FG,
	DEFAULT_THUMB_BG,
	DEFAULT_THUMB_CHAR,
	DEFAULT_THUMB_FG,
	DEFAULT_TRACK_BG,
	DEFAULT_TRACK_CHAR,
	DEFAULT_TRACK_CHAR_VERTICAL,
	DEFAULT_TRACK_FG,
	SLIDER_STATE_MACHINE_CONFIG,
	SliderOrientation,
	sliderStore,
} from '../components/slider';
import {
	attachStateMachine,
	getState,
	hasStateMachine,
	sendEvent,
} from '../components/stateMachine';
import type { Entity, World } from '../core/types';
import { getWorldStore } from '../core/worldStore';
import { SliderRangeSchema, SliderStepSchema } from '../schemas/components';

// =============================================================================
// WORLD-SCOPED STORES (REPLACED MODULE-LEVEL SINGLETONS)
// =============================================================================

/** Get world-scoped store for slider display configuration */
function getDisplayStore(world: World): Map<Entity, SliderDisplay> {
	return getWorldStore<Entity, SliderDisplay>(world, 'slider:display');
}

/** Get world-scoped store for slider change callbacks */
function getChangeCallbacks(world: World): Map<Entity, SliderChangeCallback[]> {
	return getWorldStore<Entity, SliderChangeCallback[]>(world, 'slider:changeCallbacks');
}

/** Get world-scoped store for drag start callbacks */
function getDragStartCallbacks(world: World): Map<Entity, (() => void)[]> {
	return getWorldStore<Entity, (() => void)[]>(world, 'slider:dragStartCallbacks');
}

/** Get world-scoped store for drag end callbacks */
function getDragEndCallbacks(world: World): Map<Entity, (() => void)[]> {
	return getWorldStore<Entity, (() => void)[]>(world, 'slider:dragEndCallbacks');
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

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
 * Fire callbacks from a callback map.
 */
function fireSliderCallbacks(eid: Entity, callbackMap: Map<Entity, Array<() => void>>): void {
	const callbacks = callbackMap.get(eid);
	if (!callbacks) return;
	for (const cb of callbacks) {
		cb();
	}
}

/**
 * Handle slider state change callbacks.
 */
function handleSliderStateChange(
	world: World,
	eid: Entity,
	previousState: SliderState,
	newState: SliderState,
): void {
	if (previousState !== 'dragging' && newState === 'dragging') {
		fireSliderCallbacks(eid, getDragStartCallbacks(world));
	} else if (previousState === 'dragging' && newState !== 'dragging') {
		fireSliderCallbacks(eid, getDragEndCallbacks(world));
	}
}

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
export function sendSliderEvent(world: World, eid: Entity, event: SliderEvent): boolean {
	if (!isSlider(world, eid)) return false;

	const previousState = getSliderState(world, eid);
	const result = sendEvent(world, eid, event);

	if (result) {
		const newState = getSliderState(world, eid);
		markDirty(world, eid);
		handleSliderStateChange(world, eid, previousState, newState);
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns The current value
 */
export function getSliderValue(_world: World, eid: Entity): number {
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
		const callbacks = getChangeCallbacks(world).get(eid);
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns The minimum value
 */
export function getSliderMin(_world: World, eid: Entity): number {
	return sliderStore.min[eid] ?? 0;
}

/**
 * Gets the slider maximum value.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns The maximum value
 */
export function getSliderMax(_world: World, eid: Entity): number {
	return sliderStore.max[eid] ?? 100;
}

/**
 * Gets the slider step value.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns The step value
 */
export function getSliderStep(_world: World, eid: Entity): number {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Value as percentage
 */
export function getSliderPercentage(_world: World, eid: Entity): number {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns The orientation
 */
export function getSliderOrientation(_world: World, eid: Entity): SliderOrientationType {
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
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if horizontal
 */
export function isSliderHorizontal(world: World, eid: Entity): boolean {
	return getSliderOrientation(world, eid) === SliderOrientation.Horizontal;
}

/**
 * Checks if slider is vertical.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if vertical
 */
export function isSliderVertical(world: World, eid: Entity): boolean {
	return getSliderOrientation(world, eid) === SliderOrientation.Vertical;
}

// =============================================================================
// SHOW VALUE
// =============================================================================

/**
 * Gets whether the slider shows its value.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns true if showing value
 */
export function isShowingSliderValue(_world: World, eid: Entity): boolean {
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
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setSliderDisplay(world: World, eid: Entity, options: SliderDisplayOptions): void {
	const existing = getDisplayStore(world).get(eid);
	const orientation = getSliderOrientation(world, eid);

	const defaultTrack =
		orientation === SliderOrientation.Vertical ? DEFAULT_TRACK_CHAR_VERTICAL : DEFAULT_TRACK_CHAR;
	const defaultFill =
		orientation === SliderOrientation.Vertical ? DEFAULT_FILL_CHAR_VERTICAL : DEFAULT_FILL_CHAR;

	getDisplayStore(world).set(eid, {
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
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getSliderDisplay(world: World, eid: Entity): SliderDisplay {
	const orientation = getSliderOrientation(world, eid);
	const defaultTrack =
		orientation === SliderOrientation.Vertical ? DEFAULT_TRACK_CHAR_VERTICAL : DEFAULT_TRACK_CHAR;
	const defaultFill =
		orientation === SliderOrientation.Vertical ? DEFAULT_FILL_CHAR_VERTICAL : DEFAULT_FILL_CHAR;

	return (
		getDisplayStore(world).get(eid) ?? {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 */
export function clearSliderDisplay(world: World, eid: Entity): void {
	getDisplayStore(world).delete(eid);
}

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Registers a callback for when the slider value changes.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onSliderChange(world, eid, (value) => {
 *   console.log(`Value: ${value}`);
 * });
 * ```
 */
export function onSliderChange(
	world: World,
	eid: Entity,
	callback: SliderChangeCallback,
): () => void {
	const callbacks = getChangeCallbacks(world).get(eid) ?? [];
	callbacks.push(callback);
	getChangeCallbacks(world).set(eid, callbacks);

	return () => {
		const cbs = getChangeCallbacks(world).get(eid);
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 */
export function onSliderDragStart(world: World, eid: Entity, callback: () => void): () => void {
	const callbacks = getDragStartCallbacks(world).get(eid) ?? [];
	callbacks.push(callback);
	getDragStartCallbacks(world).set(eid, callbacks);

	return () => {
		const cbs = getDragStartCallbacks(world).get(eid);
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 */
export function onSliderDragEnd(world: World, eid: Entity, callback: () => void): () => void {
	const callbacks = getDragEndCallbacks(world).get(eid) ?? [];
	callbacks.push(callback);
	getDragEndCallbacks(world).set(eid, callbacks);

	return () => {
		const cbs = getDragEndCallbacks(world).get(eid);
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 */
export function clearSliderCallbacks(world: World, eid: Entity): void {
	getChangeCallbacks(world).delete(eid);
	getDragStartCallbacks(world).delete(eid);
	getDragEndCallbacks(world).delete(eid);
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

	const isHorizontal = isSliderHorizontal(world, eid);

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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param width - The available width
 * @returns Rendered slider string
 */
export function renderSliderString(_world: World, eid: Entity, width: number): string {
	if (width <= 0) {
		return '';
	}

	const percentage = getSliderPercentage(_world, eid);
	const display = getSliderDisplay(_world, eid);
	const showValue = isShowingSliderValue(_world, eid);

	// Calculate value string and adjust width
	let valueStr = '';
	let trackWidth = width;
	if (showValue) {
		const value = getSliderValue(_world, eid);
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
 *
 * @param world - The ECS world
 */
export function resetSliderStore(world: World): void {
	sliderStore.isSlider.fill(0);
	sliderStore.value.fill(0);
	sliderStore.min.fill(0);
	sliderStore.max.fill(100);
	sliderStore.step.fill(1);
	sliderStore.orientation.fill(0);
	sliderStore.showValue.fill(0);
	getDisplayStore(world).clear();
	getChangeCallbacks(world).clear();
	getDragStartCallbacks(world).clear();
	getDragEndCallbacks(world).clear();
}
