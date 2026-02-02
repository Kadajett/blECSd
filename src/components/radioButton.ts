/**
 * RadioButton and RadioSet components and helper functions.
 * Provides radio button functionality with mutual exclusion.
 * @module components/radioButton
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
 * RadioButton states.
 */
export type RadioButtonState = 'unselected' | 'selected' | 'disabled';

/**
 * RadioButton events that can trigger state transitions.
 */
export type RadioButtonEvent = 'select' | 'deselect' | 'disable' | 'enable';

/**
 * RadioButton state machine configuration.
 *
 * State transitions:
 * - unselected: can become selected (select), disabled (disable)
 * - selected: can become unselected (deselect), disabled (disable)
 * - disabled: can become unselected (enable)
 */
export const RADIO_BUTTON_STATE_MACHINE_CONFIG: StateMachineConfig<
	RadioButtonState,
	RadioButtonEvent,
	void
> = {
	initial: 'unselected',
	states: {
		unselected: {
			on: {
				select: 'selected',
				disable: 'disabled',
			},
		},
		selected: {
			on: {
				deselect: 'unselected',
				disable: 'disabled',
			},
		},
		disabled: {
			on: {
				enable: 'unselected',
			},
		},
	},
};

/** Default capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * RadioButton component store for tracking radio button entities.
 * Uses entity ID as index.
 */
export interface RadioButtonStore {
	/** Whether entity is a radio button (1 = true, 0 = false) */
	isRadioButton: Uint8Array;
	/** RadioButton state machine ID */
	machineId: Uint32Array;
	/** RadioSet parent entity ID (0 = no set) */
	radioSetId: Uint32Array;
}

/**
 * Creates a new radio button store with default capacity.
 */
function createRadioButtonStore(capacity = DEFAULT_CAPACITY): RadioButtonStore {
	return {
		isRadioButton: new Uint8Array(capacity),
		machineId: new Uint32Array(capacity),
		radioSetId: new Uint32Array(capacity),
	};
}

/**
 * Global radio button store instance.
 */
export const radioButtonStore = createRadioButtonStore();

/**
 * RadioSet component store for tracking radio set container entities.
 * Uses entity ID as index.
 */
export interface RadioSetStore {
	/** Whether entity is a radio set (1 = true, 0 = false) */
	isRadioSet: Uint8Array;
	/** Currently selected radio button entity ID (0 = none) */
	selectedButton: Uint32Array;
}

/**
 * Creates a new radio set store with default capacity.
 */
function createRadioSetStore(capacity = DEFAULT_CAPACITY): RadioSetStore {
	return {
		isRadioSet: new Uint8Array(capacity),
		selectedButton: new Uint32Array(capacity),
	};
}

/**
 * Global radio set store instance.
 */
export const radioSetStore = createRadioSetStore();

/**
 * Display configuration for radio buttons.
 */
export interface RadioButtonDisplay {
	/** Character when selected */
	selectedChar: string;
	/** Character when unselected */
	unselectedChar: string;
}

/**
 * Options for radio button display configuration.
 */
export interface RadioButtonDisplayOptions {
	selectedChar?: string;
	unselectedChar?: string;
}

/** Default selected character */
export const DEFAULT_RADIO_SELECTED_CHAR = '◉';

/** Default unselected character */
export const DEFAULT_RADIO_UNSELECTED_CHAR = '○';

/**
 * Store for radio button display configuration.
 */
const displayStore = new Map<Entity, RadioButtonDisplay>();

/**
 * Store for radio button values.
 */
const valueStore = new Map<Entity, string>();

/**
 * Callback type for radio set selection change.
 */
export type RadioSelectCallback = (
	selectedValue: string | null,
	selectedEntity: Entity | null,
) => void;

/**
 * Store for selection change callbacks.
 */
const selectCallbacks = new Map<Entity, RadioSelectCallback[]>();

/**
 * Resets the radio button store to initial state.
 * Useful for testing.
 */
export function resetRadioButtonStore(): void {
	radioButtonStore.isRadioButton.fill(0);
	radioButtonStore.machineId.fill(0);
	radioButtonStore.radioSetId.fill(0);
	radioSetStore.isRadioSet.fill(0);
	radioSetStore.selectedButton.fill(0);
	displayStore.clear();
	valueStore.clear();
	selectCallbacks.clear();
}

// =============================================================================
// RADIO SET FUNCTIONS
// =============================================================================

/**
 * Marks an entity as a radio set container.
 *
 * @param world - The ECS world
 * @param eid - Entity ID to mark as radio set
 *
 * @example
 * ```typescript
 * import { attachRadioSetBehavior } from 'blecsd';
 *
 * attachRadioSetBehavior(world, containerEntity);
 * ```
 */
export function attachRadioSetBehavior(world: World, eid: Entity): void {
	radioSetStore.isRadioSet[eid] = 1;
	radioSetStore.selectedButton[eid] = 0;
	markDirty(world, eid);
}

/**
 * Checks if an entity is a radio set.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns True if entity is a radio set
 */
export function isRadioSet(_world: World, eid: Entity): boolean {
	return radioSetStore.isRadioSet[eid] === 1;
}

/**
 * Gets the currently selected button in a radio set.
 *
 * @param eid - Radio set entity ID
 * @returns Selected button entity ID or 0 if none
 */
export function getSelectedButton(eid: Entity): Entity {
	return radioSetStore.selectedButton[eid] as Entity;
}

/**
 * Gets the value of the currently selected button in a radio set.
 *
 * @param eid - Radio set entity ID
 * @returns Selected value or null if none
 *
 * @example
 * ```typescript
 * import { getSelectedValue } from 'blecsd';
 *
 * const value = getSelectedValue(radioSet);
 * if (value) {
 *   console.log('Selected:', value);
 * }
 * ```
 */
export function getSelectedValue(eid: Entity): string | null {
	const selectedButton = radioSetStore.selectedButton[eid] as Entity;
	if (selectedButton === 0) {
		return null;
	}
	return valueStore.get(selectedButton) ?? null;
}

/**
 * Registers a callback for radio set selection changes.
 *
 * @param eid - Radio set entity ID
 * @param callback - Function to call when selection changes
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * import { onRadioSelect } from 'blecsd';
 *
 * const unsubscribe = onRadioSelect(radioSet, (value, entity) => {
 *   console.log('Selected:', value);
 * });
 * ```
 */
export function onRadioSelect(eid: Entity, callback: RadioSelectCallback): () => void {
	const callbacks = selectCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	selectCallbacks.set(eid, callbacks);

	return () => {
		const current = selectCallbacks.get(eid);
		if (current) {
			const index = current.indexOf(callback);
			if (index !== -1) {
				current.splice(index, 1);
			}
		}
	};
}

/**
 * Emits selection change callbacks for a radio set.
 *
 * @param eid - Radio set entity ID
 */
function emitSelectChange(eid: Entity): void {
	const callbacks = selectCallbacks.get(eid);
	if (callbacks) {
		const selectedButton = getSelectedButton(eid);
		const selectedValue = selectedButton !== 0 ? (valueStore.get(selectedButton) ?? null) : null;
		for (const callback of callbacks) {
			callback(selectedValue, selectedButton !== 0 ? selectedButton : null);
		}
	}
}

/**
 * Clears all callbacks for a radio set.
 *
 * @param eid - Radio set entity ID
 */
export function clearRadioSetCallbacks(eid: Entity): void {
	selectCallbacks.delete(eid);
}

// =============================================================================
// RADIO BUTTON FUNCTIONS
// =============================================================================

/**
 * Marks an entity as a radio button and attaches state machine.
 *
 * @param world - The ECS world
 * @param eid - Entity ID to mark as radio button
 * @param radioSetId - Optional radio set parent entity ID
 * @returns State machine ID
 *
 * @example
 * ```typescript
 * import { attachRadioButtonBehavior } from 'blecsd';
 *
 * const machineId = attachRadioButtonBehavior(world, buttonEntity, radioSetEntity);
 * ```
 */
export function attachRadioButtonBehavior(world: World, eid: Entity, radioSetId?: Entity): number {
	radioButtonStore.isRadioButton[eid] = 1;
	radioButtonStore.radioSetId[eid] = radioSetId ?? 0;

	const machineId = attachStateMachine(world, eid, RADIO_BUTTON_STATE_MACHINE_CONFIG);
	radioButtonStore.machineId[eid] = machineId;

	// Initialize default display
	setRadioButtonDisplay(eid, {});

	markDirty(world, eid);
	return machineId;
}

/**
 * Checks if an entity is a radio button.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns True if entity is a radio button
 */
export function isRadioButton(_world: World, eid: Entity): boolean {
	return radioButtonStore.isRadioButton[eid] === 1;
}

/**
 * Gets the current state of a radio button.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @returns Current state or undefined if not a radio button
 *
 * @example
 * ```typescript
 * import { getRadioButtonState } from 'blecsd';
 *
 * const state = getRadioButtonState(world, button);
 * // 'unselected' | 'selected' | 'disabled'
 * ```
 */
export function getRadioButtonState(world: World, eid: Entity): RadioButtonState | undefined {
	if (!isRadioButton(world, eid)) {
		return undefined;
	}
	if (!hasStateMachine(world, eid)) {
		return undefined;
	}
	return getState(world, eid) as RadioButtonState;
}

/**
 * Sends an event to a radio button's state machine.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @param event - Event to send
 * @returns True if event caused a state change
 */
export function sendRadioButtonEvent(world: World, eid: Entity, event: RadioButtonEvent): boolean {
	if (!isRadioButton(world, eid)) {
		return false;
	}
	return sendEvent(world, eid, event);
}

/**
 * Checks if a radio button is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @param state - State to check for
 * @returns True if in the specified state
 */
export function isRadioButtonInState(world: World, eid: Entity, state: RadioButtonState): boolean {
	if (!isRadioButton(world, eid)) {
		return false;
	}
	return isInState(world, eid, state);
}

/**
 * Checks if a radio button is selected.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @returns True if selected
 *
 * @example
 * ```typescript
 * import { isRadioSelected } from 'blecsd';
 *
 * if (isRadioSelected(world, button)) {
 *   console.log('This button is selected');
 * }
 * ```
 */
export function isRadioSelected(world: World, eid: Entity): boolean {
	return isRadioButtonInState(world, eid, 'selected');
}

/**
 * Checks if a radio button is disabled.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @returns True if disabled
 */
export function isRadioButtonDisabled(world: World, eid: Entity): boolean {
	return isRadioButtonInState(world, eid, 'disabled');
}

/**
 * Gets the radio set that a button belongs to.
 *
 * @param eid - Radio button entity ID
 * @returns Radio set entity ID or 0 if not in a set
 */
export function getRadioSet(eid: Entity): Entity {
	return radioButtonStore.radioSetId[eid] as Entity;
}

/**
 * Sets the radio set for a button.
 *
 * @param eid - Radio button entity ID
 * @param radioSetId - Radio set entity ID
 */
export function setRadioSet(eid: Entity, radioSetId: Entity): void {
	radioButtonStore.radioSetId[eid] = radioSetId;
}

/**
 * Gets the value associated with a radio button.
 *
 * @param eid - Radio button entity ID
 * @returns Value string or undefined
 */
export function getRadioValue(eid: Entity): string | undefined {
	return valueStore.get(eid);
}

/**
 * Sets the value associated with a radio button.
 *
 * @param eid - Radio button entity ID
 * @param value - Value string
 */
export function setRadioValue(eid: Entity, value: string): void {
	valueStore.set(eid, value);
}

/**
 * Selects a radio button and deselects others in the same set.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID to select
 *
 * @example
 * ```typescript
 * import { selectRadioButton } from 'blecsd';
 *
 * selectRadioButton(world, button);
 * // This button is now selected, others in set are deselected
 * ```
 */
export function selectRadioButton(world: World, eid: Entity): void {
	if (!isRadioButton(world, eid)) {
		return;
	}

	if (isRadioButtonDisabled(world, eid)) {
		return;
	}

	const radioSetId = radioButtonStore.radioSetId[eid] as Entity;

	// Deselect currently selected button in the set
	if (radioSetId !== 0) {
		const currentlySelected = radioSetStore.selectedButton[radioSetId] as Entity;
		if (currentlySelected !== 0 && currentlySelected !== eid) {
			sendRadioButtonEvent(world, currentlySelected, 'deselect');
		}
		radioSetStore.selectedButton[radioSetId] = eid;
	}

	// Select this button
	sendRadioButtonEvent(world, eid, 'select');
	markDirty(world, eid);

	// Emit selection change
	if (radioSetId !== 0) {
		emitSelectChange(radioSetId);
	}
}

/**
 * Deselects a radio button.
 * Note: Usually you should use selectRadioButton on another button instead.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 */
export function deselectRadioButton(world: World, eid: Entity): void {
	if (!isRadioButton(world, eid)) {
		return;
	}

	sendRadioButtonEvent(world, eid, 'deselect');

	const radioSetId = radioButtonStore.radioSetId[eid] as Entity;
	if (radioSetId !== 0) {
		const currentlySelected = radioSetStore.selectedButton[radioSetId] as Entity;
		if (currentlySelected === eid) {
			radioSetStore.selectedButton[radioSetId] = 0;
			emitSelectChange(radioSetId);
		}
	}

	markDirty(world, eid);
}

/**
 * Disables a radio button.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 */
export function disableRadioButton(world: World, eid: Entity): void {
	sendRadioButtonEvent(world, eid, 'disable');
	markDirty(world, eid);
}

/**
 * Enables a radio button.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 */
export function enableRadioButton(world: World, eid: Entity): void {
	sendRadioButtonEvent(world, eid, 'enable');
	markDirty(world, eid);
}

// =============================================================================
// DISPLAY FUNCTIONS
// =============================================================================

/**
 * Sets the display configuration for a radio button.
 *
 * @param eid - Radio button entity ID
 * @param options - Display options
 *
 * @example
 * ```typescript
 * import { setRadioButtonDisplay } from 'blecsd';
 *
 * setRadioButtonDisplay(button, {
 *   selectedChar: '(x)',
 *   unselectedChar: '( )',
 * });
 * ```
 */
export function setRadioButtonDisplay(eid: Entity, options: RadioButtonDisplayOptions): void {
	const existing = displayStore.get(eid);
	displayStore.set(eid, {
		selectedChar: options.selectedChar ?? existing?.selectedChar ?? DEFAULT_RADIO_SELECTED_CHAR,
		unselectedChar:
			options.unselectedChar ?? existing?.unselectedChar ?? DEFAULT_RADIO_UNSELECTED_CHAR,
	});
}

/**
 * Gets the display configuration for a radio button.
 *
 * @param eid - Radio button entity ID
 * @returns Display configuration
 */
export function getRadioButtonDisplay(eid: Entity): RadioButtonDisplay {
	return (
		displayStore.get(eid) ?? {
			selectedChar: DEFAULT_RADIO_SELECTED_CHAR,
			unselectedChar: DEFAULT_RADIO_UNSELECTED_CHAR,
		}
	);
}

/**
 * Gets the appropriate display character based on radio button state.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @returns Character to display
 *
 * @example
 * ```typescript
 * import { getRadioButtonChar } from 'blecsd';
 *
 * const char = getRadioButtonChar(world, button);
 * // '◉' if selected, '○' if unselected
 * ```
 */
export function getRadioButtonChar(world: World, eid: Entity): string {
	const display = getRadioButtonDisplay(eid);
	if (isRadioSelected(world, eid)) {
		return display.selectedChar;
	}
	return display.unselectedChar;
}

/**
 * Clears the display configuration for a radio button.
 *
 * @param eid - Radio button entity ID
 */
export function clearRadioButtonDisplay(eid: Entity): void {
	displayStore.delete(eid);
}

// =============================================================================
// KEY HANDLING
// =============================================================================

/**
 * Handles key press events for a radio button.
 *
 * @param world - The ECS world
 * @param eid - Radio button entity ID
 * @param key - Key name
 * @returns True if the key was handled
 *
 * @example
 * ```typescript
 * import { handleRadioButtonKeyPress } from 'blecsd';
 *
 * if (handleRadioButtonKeyPress(world, button, 'space')) {
 *   // Button was selected
 * }
 * ```
 */
export function handleRadioButtonKeyPress(world: World, eid: Entity, key: string): boolean {
	if (!isRadioButton(world, eid)) {
		return false;
	}

	if (isRadioButtonDisabled(world, eid)) {
		return false;
	}

	// Space or Enter selects the radio button
	if (key === 'space' || key === 'return' || key === 'enter') {
		selectRadioButton(world, eid);
		return true;
	}

	return false;
}

/**
 * Gets all radio buttons in a radio set.
 *
 * @param radioSetId - Radio set entity ID
 * @returns Array of radio button entity IDs
 */
export function getRadioButtonsInSet(radioSetId: Entity): Entity[] {
	const buttons: Entity[] = [];
	for (let i = 0; i < radioButtonStore.isRadioButton.length; i++) {
		if (radioButtonStore.isRadioButton[i] === 1 && radioButtonStore.radioSetId[i] === radioSetId) {
			buttons.push(i as Entity);
		}
	}
	return buttons;
}

/**
 * Selects a radio button by value in a radio set.
 *
 * @param world - The ECS world
 * @param radioSetId - Radio set entity ID
 * @param value - Value to select
 * @returns True if a button was selected
 *
 * @example
 * ```typescript
 * import { selectRadioByValue } from 'blecsd';
 *
 * selectRadioByValue(world, radioSet, 'option2');
 * ```
 */
export function selectRadioByValue(world: World, radioSetId: Entity, value: string): boolean {
	const buttons = getRadioButtonsInSet(radioSetId);
	for (const button of buttons) {
		if (valueStore.get(button) === value) {
			selectRadioButton(world, button);
			return true;
		}
	}
	return false;
}
