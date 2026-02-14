/**
 * Checkbox component and helper functions.
 * Provides state machine support and toggle operations.
 * @module components/checkbox
 */

import type { StateMachineConfig } from '../core/stateMachine';
import type { Entity, World } from '../core/types';
import { markDirty } from './renderable';
import {
	attachStateMachine,
	getState,
	hasStateMachine,
	isInState,
	sendEvent,
} from './stateMachine';

/**
 * Checkbox states.
 */
export type CheckboxState = 'unchecked' | 'checked' | 'disabled';

/**
 * Checkbox events that can trigger state transitions.
 */
export type CheckboxEvent = 'toggle' | 'check' | 'uncheck' | 'disable' | 'enable';

/**
 * Checkbox state machine configuration.
 *
 * State transitions:
 * - unchecked: can become checked (toggle, check), disabled (disable)
 * - checked: can become unchecked (toggle, uncheck), disabled (disable)
 * - disabled: can become unchecked (enable)
 */
export const CHECKBOX_STATE_MACHINE_CONFIG: StateMachineConfig<CheckboxState, CheckboxEvent, void> =
	{
		initial: 'unchecked',
		states: {
			unchecked: {
				on: {
					toggle: 'checked',
					check: 'checked',
					disable: 'disabled',
				},
			},
			checked: {
				on: {
					toggle: 'unchecked',
					uncheck: 'unchecked',
					disable: 'disabled',
				},
			},
			disabled: {
				on: {
					enable: 'unchecked',
				},
			},
		},
	};

/** Default capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Checkbox component store for tracking checkbox entities.
 * Uses entity ID as index.
 */
export interface CheckboxStore {
	/** Whether entity is a checkbox (1 = true, 0 = false) */
	isCheckbox: Uint8Array;
	/** Checkbox state machine ID */
	machineId: Uint32Array;
}

/**
 * Create a checkbox store with the specified capacity.
 */
function createCheckboxStore(capacity = DEFAULT_CAPACITY): CheckboxStore {
	return {
		isCheckbox: new Uint8Array(capacity),
		machineId: new Uint32Array(capacity),
	};
}

/**
 * Global checkbox store.
 */
export const checkboxStore = createCheckboxStore();

/**
 * Store for checkbox change callbacks.
 * Maps entity ID to callback functions.
 */
const changeCallbacks = new Map<Entity, Array<(checked: boolean) => void>>();

/**
 * Display configuration for checkboxes.
 * Maps entity ID to display characters.
 */
export interface CheckboxDisplay {
	/** Character shown when checked (default: '☑') */
	checkedChar: string;
	/** Character shown when unchecked (default: '☐') */
	uncheckedChar: string;
}

/**
 * Default checked character.
 */
export const DEFAULT_CHECKED_CHAR = '☑';

/**
 * Default unchecked character.
 */
export const DEFAULT_UNCHECKED_CHAR = '☐';

/**
 * Store for checkbox display configuration.
 * Maps entity ID to display characters.
 */
const displayStore = new Map<Entity, CheckboxDisplay>();

/**
 * Resets the checkbox store. Useful for testing.
 */
export function resetCheckboxStore(): void {
	checkboxStore.isCheckbox.fill(0);
	checkboxStore.machineId.fill(0);
	changeCallbacks.clear();
	displayStore.clear();
}

// =============================================================================
// Checkbox Functions
// =============================================================================

/**
 * Attaches checkbox behavior to an entity.
 * This adds the checkbox state machine and marks the entity as a checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param initialChecked - Whether the checkbox starts checked (default: false)
 * @returns The state machine ID
 *
 * @example
 * ```typescript
 * import { attachCheckboxBehavior } from 'blecsd';
 *
 * const checkbox = createEntity(world);
 * attachCheckboxBehavior(world, checkbox);
 *
 * // Or start it checked
 * attachCheckboxBehavior(world, checkbox, true);
 * ```
 */
export function attachCheckboxBehavior(world: World, eid: Entity, initialChecked = false): number {
	const machineId = attachStateMachine(world, eid, CHECKBOX_STATE_MACHINE_CONFIG);
	checkboxStore.isCheckbox[eid] = 1;
	checkboxStore.machineId[eid] = machineId;

	// Set initial state if checked
	if (initialChecked) {
		sendEvent(world, eid, 'check');
	}

	return machineId;
}

/**
 * Checks if an entity has checkbox behavior attached.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the entity is a checkbox
 *
 * @example
 * ```typescript
 * if (isCheckbox(world, entity)) {
 *   toggleCheckbox(world, entity);
 * }
 * ```
 */
export function isCheckbox(world: World, eid: Entity): boolean {
	return (checkboxStore.isCheckbox[eid] ?? 0) === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current checkbox state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Current checkbox state or undefined if not a checkbox
 *
 * @example
 * ```typescript
 * const state = getCheckboxState(world, checkbox);
 * if (state === 'checked') {
 *   // Handle checked state
 * }
 * ```
 */
export function getCheckboxState(world: World, eid: Entity): CheckboxState | undefined {
	if (!isCheckbox(world, eid)) {
		return undefined;
	}
	return getState(world, eid) as CheckboxState;
}

/**
 * Sends an event to a checkbox's state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param event - Checkbox event to send
 * @returns true if a state transition occurred
 *
 * @example
 * ```typescript
 * sendCheckboxEvent(world, checkbox, 'toggle');
 * sendCheckboxEvent(world, checkbox, 'check');
 * sendCheckboxEvent(world, checkbox, 'uncheck');
 * ```
 */
export function sendCheckboxEvent(world: World, eid: Entity, event: CheckboxEvent): boolean {
	if (!isCheckbox(world, eid)) {
		return false;
	}

	const previousState = getState(world, eid);
	const transitioned = sendEvent(world, eid, event);

	if (transitioned) {
		markDirty(world, eid);

		// Emit change event only when transitioning between checked and unchecked
		// (not when enabling/disabling)
		const newState = getState(world, eid);
		const wasCheckedOrUnchecked = previousState === 'checked' || previousState === 'unchecked';
		const isNowCheckedOrUnchecked = newState === 'checked' || newState === 'unchecked';
		if (wasCheckedOrUnchecked && isNowCheckedOrUnchecked && previousState !== newState) {
			emitChange(eid, newState === 'checked');
		}
	}

	return transitioned;
}

/**
 * Checks if a checkbox is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param state - State to check
 * @returns true if checkbox is in the specified state
 *
 * @example
 * ```typescript
 * if (isCheckboxInState(world, checkbox, 'checked')) {
 *   // Apply checked styling
 * }
 * ```
 */
export function isCheckboxInState(world: World, eid: Entity, state: CheckboxState): boolean {
	if (!isCheckbox(world, eid)) {
		return false;
	}
	return isInState(world, eid, state);
}

/**
 * Checks if a checkbox is currently checked.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if checkbox is checked
 *
 * @example
 * ```typescript
 * if (isChecked(world, acceptTerms)) {
 *   enableSubmitButton();
 * }
 * ```
 */
export function isChecked(world: World, eid: Entity): boolean {
	return isCheckboxInState(world, eid, 'checked');
}

/**
 * Checks if a checkbox is currently unchecked.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if checkbox is unchecked
 *
 * @example
 * ```typescript
 * if (isUnchecked(world, newsletter)) {
 *   // Don't subscribe to newsletter
 * }
 * ```
 */
export function isUnchecked(world: World, eid: Entity): boolean {
	return isCheckboxInState(world, eid, 'unchecked');
}

/**
 * Checks if a checkbox is currently disabled.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if checkbox is disabled
 *
 * @example
 * ```typescript
 * if (isCheckboxDisabled(world, checkbox)) {
 *   setStyle(world, checkbox, { fg: grayColor });
 * }
 * ```
 */
export function isCheckboxDisabled(world: World, eid: Entity): boolean {
	return isCheckboxInState(world, eid, 'disabled');
}

/**
 * Toggles the checkbox between checked and unchecked states.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the toggle was successful
 *
 * @example
 * ```typescript
 * // Toggle checkbox on click
 * toggleCheckbox(world, checkbox);
 * ```
 */
export function toggleCheckbox(world: World, eid: Entity): boolean {
	return sendCheckboxEvent(world, eid, 'toggle');
}

/**
 * Checks the checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the checkbox was checked
 *
 * @example
 * ```typescript
 * // Set checkbox to checked
 * checkCheckbox(world, acceptTerms);
 * ```
 */
export function checkCheckbox(world: World, eid: Entity): boolean {
	return sendCheckboxEvent(world, eid, 'check');
}

/**
 * Unchecks the checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the checkbox was unchecked
 *
 * @example
 * ```typescript
 * // Set checkbox to unchecked
 * uncheckCheckbox(world, newsletter);
 * ```
 */
export function uncheckCheckbox(world: World, eid: Entity): boolean {
	return sendCheckboxEvent(world, eid, 'uncheck');
}

/**
 * Disables a checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the checkbox was disabled
 *
 * @example
 * ```typescript
 * // Disable checkbox when form is submitting
 * disableCheckbox(world, checkbox);
 * ```
 */
export function disableCheckbox(world: World, eid: Entity): boolean {
	return sendCheckboxEvent(world, eid, 'disable');
}

/**
 * Enables a disabled checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if the checkbox was enabled
 *
 * @example
 * ```typescript
 * // Enable checkbox when form is ready
 * enableCheckbox(world, checkbox);
 * ```
 */
export function enableCheckbox(world: World, eid: Entity): boolean {
	return sendCheckboxEvent(world, eid, 'enable');
}

/**
 * Sets the checked state of a checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param checked - Whether the checkbox should be checked
 * @returns true if the state was changed
 *
 * @example
 * ```typescript
 * // Programmatically set checked state
 * setChecked(world, rememberMe, userPreferences.rememberMe);
 * ```
 */
export function setChecked(world: World, eid: Entity, checked: boolean): boolean {
	if (!isCheckbox(world, eid)) {
		return false;
	}

	const currentState = getCheckboxState(world, eid);
	if (currentState === 'disabled') {
		return false;
	}

	if (checked && currentState === 'unchecked') {
		return checkCheckbox(world, eid);
	}
	if (!checked && currentState === 'checked') {
		return uncheckCheckbox(world, eid);
	}

	return false;
}

// =============================================================================
// Change Event Handling
// =============================================================================

/**
 * Registers a callback to be called when the checkbox state changes.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @param callback - Function to call on change (receives boolean checked state)
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onCheckboxChange(world, checkbox, (checked) => {
 *   console.log('Checkbox is now:', checked ? 'checked' : 'unchecked');
 * });
 *
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function onCheckboxChange(_world: World, eid: Entity, callback: (checked: boolean) => void): () => void {
	let callbacks = changeCallbacks.get(eid);
	if (!callbacks) {
		callbacks = [];
		changeCallbacks.set(eid, callbacks);
	}
	callbacks.push(callback);

	return () => {
		const cbs = changeCallbacks.get(eid);
		if (cbs) {
			const index = cbs.indexOf(callback);
			if (index !== -1) {
				cbs.splice(index, 1);
			}
		}
	};
}

/**
 * Emits a change event for a checkbox, calling all registered callbacks.
 *
 * @param eid - Entity ID
 * @param checked - New checked state
 */
function emitChange(eid: Entity, checked: boolean): void {
	const callbacks = changeCallbacks.get(eid);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(checked);
		}
	}
}

/**
 * Removes all change callbacks for a checkbox.
 * Call this when destroying a checkbox entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 *
 * @example
 * ```typescript
 * // Clean up before removing entity
 * clearCheckboxCallbacks(world, checkboxEntity);
 * removeEntity(world, checkboxEntity);
 * ```
 */
export function clearCheckboxCallbacks(_world: World, eid: Entity): void {
	changeCallbacks.delete(eid);
}

// =============================================================================
// Keyboard Handling
// =============================================================================

/**
 * Handles a key press on a focused checkbox.
 * Enter and Space keys toggle the checkbox.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param keyName - Name of the key pressed
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * // In your input handler:
 * if (isFocused(world, checkbox)) {
 *   handleCheckboxKeyPress(world, checkbox, keyEvent.name);
 * }
 * ```
 */
export function handleCheckboxKeyPress(world: World, eid: Entity, keyName: string): boolean {
	if (!isCheckbox(world, eid)) {
		return false;
	}

	const state = getCheckboxState(world, eid);
	if (state === 'disabled') {
		return false;
	}

	// Enter or Space toggles checkbox
	if (keyName === 'return' || keyName === 'enter' || keyName === 'space') {
		toggleCheckbox(world, eid);
		return true;
	}

	return false;
}

// =============================================================================
// Display Configuration
// =============================================================================

/**
 * Options for setting checkbox display characters.
 */
export interface CheckboxDisplayOptions {
	/** Character shown when checked */
	checkedChar?: string;
	/** Character shown when unchecked */
	uncheckedChar?: string;
}

/**
 * Sets the display characters for a checkbox.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @param options - Display options
 *
 * @example
 * ```typescript
 * // Use ASCII characters instead of Unicode
 * setCheckboxDisplay(world, checkbox, {
 *   checkedChar: '[x]',
 *   uncheckedChar: '[ ]',
 * });
 * ```
 */
export function setCheckboxDisplay(_world: World, eid: Entity, options: CheckboxDisplayOptions): void {
	const current = displayStore.get(eid) ?? {
		checkedChar: DEFAULT_CHECKED_CHAR,
		uncheckedChar: DEFAULT_UNCHECKED_CHAR,
	};

	displayStore.set(eid, {
		checkedChar: options.checkedChar ?? current.checkedChar,
		uncheckedChar: options.uncheckedChar ?? current.uncheckedChar,
	});
}

/**
 * Gets the display configuration for a checkbox.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns Display configuration or defaults if not set
 *
 * @example
 * ```typescript
 * const display = getCheckboxDisplay(world, checkbox);
 * const char = isChecked(world, checkbox)
 *   ? display.checkedChar
 *   : display.uncheckedChar;
 * ```
 */
export function getCheckboxDisplay(_world: World, eid: Entity): CheckboxDisplay {
	return (
		displayStore.get(eid) ?? {
			checkedChar: DEFAULT_CHECKED_CHAR,
			uncheckedChar: DEFAULT_UNCHECKED_CHAR,
		}
	);
}

/**
 * Gets the current display character based on checkbox state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns The appropriate character for the current state
 *
 * @example
 * ```typescript
 * const char = getCheckboxChar(world, checkbox);
 * // Returns '☑' if checked, '☐' if unchecked
 * ```
 */
export function getCheckboxChar(world: World, eid: Entity): string {
	const display = getCheckboxDisplay(world, eid);
	const state = getCheckboxState(world, eid);

	if (state === 'checked') {
		return display.checkedChar;
	}
	return display.uncheckedChar;
}

/**
 * Removes display configuration for a checkbox.
 * Call this when destroying a checkbox entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 */
export function clearCheckboxDisplay(_world: World, eid: Entity): void {
	displayStore.delete(eid);
}
