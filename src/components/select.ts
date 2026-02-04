/**
 * Select/Dropdown Component
 *
 * Provides dropdown select functionality with state machine control.
 *
 * @module components/select
 */

import type { StateMachineConfig } from '../core/stateMachine';
import type { Entity, World } from '../core/types';
import { markDirty } from './renderable';
import { attachStateMachine, getState, hasStateMachine, sendEvent } from './stateMachine';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Select option with label and value.
 */
export interface SelectOption {
	/** Display text */
	readonly label: string;
	/** Value to use when selected */
	readonly value: string;
}

/**
 * Select state type.
 */
export type SelectState = 'closed' | 'open' | 'disabled';

/**
 * Select event type.
 */
export type SelectEvent = 'open' | 'close' | 'select' | 'disable' | 'enable' | 'toggle';

/**
 * Select display configuration.
 */
export interface SelectDisplay {
	/** Character shown when dropdown is closed (arrow down) */
	readonly closedIndicator: string;
	/** Character shown when dropdown is open (arrow up) */
	readonly openIndicator: string;
	/** Character shown for selected option in dropdown */
	readonly selectedMark: string;
	/** Separator between label and indicator */
	readonly separator: string;
}

/**
 * Select display options for configuration.
 */
export interface SelectDisplayOptions {
	closedIndicator?: string;
	openIndicator?: string;
	selectedMark?: string;
	separator?: string;
}

/**
 * Select callback function type.
 */
export type SelectCallback = (value: string, label: string, index: number) => void;

/**
 * Select store for managing select-specific data.
 */
export interface SelectStore {
	/** Whether entity is a select */
	isSelect: Uint8Array;
	/** Currently selected option index (-1 for none) */
	selectedIndex: Int32Array;
	/** Currently highlighted option index in open state */
	highlightedIndex: Int32Array;
	/** Number of options */
	optionCount: Uint32Array;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default closed indicator character */
export const DEFAULT_CLOSED_INDICATOR = '▼';

/** Default open indicator character */
export const DEFAULT_OPEN_INDICATOR = '▲';

/** Default selected mark character */
export const DEFAULT_SELECTED_MARK = '●';

/** Default separator between label and indicator */
export const DEFAULT_SEPARATOR = ' ';

/** Maximum entities supported */
const MAX_ENTITIES = 10000;

// =============================================================================
// STORES
// =============================================================================

/**
 * Store for select component data.
 */
export const selectStore: SelectStore = {
	isSelect: new Uint8Array(MAX_ENTITIES),
	selectedIndex: new Int32Array(MAX_ENTITIES).fill(-1),
	highlightedIndex: new Int32Array(MAX_ENTITIES).fill(0),
	optionCount: new Uint32Array(MAX_ENTITIES),
};

/** Store for select options */
const optionsStore = new Map<Entity, SelectOption[]>();

/** Store for select display configuration */
const displayStore = new Map<Entity, SelectDisplay>();

/** Store for select change callbacks */
const changeCallbacks = new Map<Entity, SelectCallback[]>();

/** Store for select open callbacks */
const openCallbacks = new Map<Entity, (() => void)[]>();

/** Store for select close callbacks */
const closeCallbacks = new Map<Entity, (() => void)[]>();

// =============================================================================
// STATE MACHINE CONFIG
// =============================================================================

/**
 * State machine configuration for select widgets.
 */
export const SELECT_STATE_MACHINE_CONFIG: StateMachineConfig<SelectState, SelectEvent> = {
	initial: 'closed',
	states: {
		closed: {
			on: {
				open: 'open',
				toggle: 'open',
				disable: 'disabled',
			},
		},
		open: {
			on: {
				close: 'closed',
				select: 'closed',
				toggle: 'closed',
				disable: 'disabled',
			},
		},
		disabled: {
			on: {
				enable: 'closed',
			},
		},
	},
};

// =============================================================================
// COMPONENT FUNCTIONS
// =============================================================================

/**
 * Attaches select behavior to an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Initial options
 * @param selectedIndex - Initial selected index
 *
 * @example
 * ```typescript
 * import { attachSelectBehavior } from 'blecsd';
 *
 * attachSelectBehavior(world, eid, [
 *   { label: 'Option 1', value: 'opt1' },
 *   { label: 'Option 2', value: 'opt2' },
 * ], 0);
 * ```
 */
export function attachSelectBehavior(
	world: World,
	eid: Entity,
	options: SelectOption[] = [],
	selectedIndex = -1,
): void {
	selectStore.isSelect[eid] = 1;
	selectStore.selectedIndex[eid] = selectedIndex;
	selectStore.highlightedIndex[eid] = selectedIndex >= 0 ? selectedIndex : 0;
	selectStore.optionCount[eid] = options.length;

	optionsStore.set(eid, [...options]);

	attachStateMachine(world, eid, SELECT_STATE_MACHINE_CONFIG);
}

/**
 * Checks if an entity is a select.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is a select
 *
 * @example
 * ```typescript
 * if (isSelect(world, eid)) {
 *   const value = getSelectedValue(eid);
 * }
 * ```
 */
export function isSelect(world: World, eid: Entity): boolean {
	return selectStore.isSelect[eid] === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current state of a select.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current state
 *
 * @example
 * ```typescript
 * const state = getSelectState(world, eid);
 * if (state === 'open') {
 *   // Dropdown is visible
 * }
 * ```
 */
export function getSelectState(world: World, eid: Entity): SelectState {
	return (getState(world, eid) as SelectState) ?? 'closed';
}

/**
 * Checks if select is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param state - The state to check
 * @returns true if select is in the specified state
 */
export function isSelectInState(world: World, eid: Entity, state: SelectState): boolean {
	return getSelectState(world, eid) === state;
}

/**
 * Checks if select is open.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if select dropdown is open
 */
export function isSelectOpen(world: World, eid: Entity): boolean {
	return isSelectInState(world, eid, 'open');
}

/**
 * Checks if select is disabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if select is disabled
 */
export function isSelectDisabled(world: World, eid: Entity): boolean {
	return isSelectInState(world, eid, 'disabled');
}

/**
 * Sends an event to the select state machine.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param event - The event to send
 * @returns true if transition occurred
 */
/** Fire callbacks from a callback map */
function fireCallbacks(eid: Entity, callbackMap: Map<Entity, Array<() => void>>): void {
	const callbacks = callbackMap.get(eid);
	if (!callbacks) return;
	for (const cb of callbacks) {
		cb();
	}
}

/** Handle select state change callbacks */
function handleSelectStateChange(
	eid: Entity,
	previousState: SelectState,
	newState: SelectState,
): void {
	if (previousState !== 'open' && newState === 'open') {
		fireCallbacks(eid, openCallbacks);
	} else if (previousState === 'open' && newState !== 'open') {
		fireCallbacks(eid, closeCallbacks);
	}
}

export function sendSelectEvent(world: World, eid: Entity, event: SelectEvent): boolean {
	if (!isSelect(world, eid)) return false;

	const previousState = getSelectState(world, eid);
	const result = sendEvent(world, eid, event);

	if (result) {
		const newState = getSelectState(world, eid);
		markDirty(world, eid);
		handleSelectStateChange(eid, previousState, newState);
	}

	return result;
}

/**
 * Opens the select dropdown.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if opened successfully
 *
 * @example
 * ```typescript
 * openSelect(world, eid);
 * ```
 */
export function openSelect(world: World, eid: Entity): boolean {
	return sendSelectEvent(world, eid, 'open');
}

/**
 * Closes the select dropdown.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if closed successfully
 */
export function closeSelect(world: World, eid: Entity): boolean {
	return sendSelectEvent(world, eid, 'close');
}

/**
 * Toggles the select dropdown.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if toggled successfully
 */
export function toggleSelect(world: World, eid: Entity): boolean {
	return sendSelectEvent(world, eid, 'toggle');
}

/**
 * Disables the select.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if disabled successfully
 */
export function disableSelect(world: World, eid: Entity): boolean {
	return sendSelectEvent(world, eid, 'disable');
}

/**
 * Enables the select.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if enabled successfully
 */
export function enableSelect(world: World, eid: Entity): boolean {
	return sendSelectEvent(world, eid, 'enable');
}

// =============================================================================
// OPTIONS MANAGEMENT
// =============================================================================

/**
 * Gets the options for a select.
 *
 * @param eid - The entity ID
 * @returns Array of options
 */
export function getSelectOptions(eid: Entity): readonly SelectOption[] {
	return optionsStore.get(eid) ?? [];
}

/**
 * Sets the options for a select.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - New options array
 */
export function setSelectOptions(world: World, eid: Entity, options: SelectOption[]): void {
	optionsStore.set(eid, [...options]);
	selectStore.optionCount[eid] = options.length;

	// Reset selection if current selection is out of bounds
	const currentIndex = selectStore.selectedIndex[eid] ?? -1;
	if (currentIndex >= options.length) {
		selectStore.selectedIndex[eid] = options.length > 0 ? 0 : -1;
	}

	// Reset highlight
	selectStore.highlightedIndex[eid] = 0;

	markDirty(world, eid);
}

/**
 * Gets the number of options.
 *
 * @param eid - The entity ID
 * @returns Number of options
 */
export function getOptionCount(eid: Entity): number {
	return selectStore.optionCount[eid] ?? 0;
}

/**
 * Gets an option by index.
 *
 * @param eid - The entity ID
 * @param index - The option index
 * @returns The option or undefined
 */
export function getOptionAt(eid: Entity, index: number): SelectOption | undefined {
	const options = optionsStore.get(eid);
	return options?.[index];
}

// =============================================================================
// SELECTION MANAGEMENT
// =============================================================================

/**
 * Gets the selected index.
 *
 * @param eid - The entity ID
 * @returns Selected index or -1 if none
 */
export function getSelectedIndex(eid: Entity): number {
	return selectStore.selectedIndex[eid] ?? -1;
}

/**
 * Gets the selected option.
 *
 * @param eid - The entity ID
 * @returns Selected option or undefined
 */
export function getSelectedOption(eid: Entity): SelectOption | undefined {
	const index = selectStore.selectedIndex[eid] ?? -1;
	if (index < 0) {
		return undefined;
	}
	return getOptionAt(eid, index);
}

/**
 * Gets the selected value.
 *
 * @param eid - The entity ID
 * @returns Selected value or undefined
 */
export function getSelectedValue(eid: Entity): string | undefined {
	return getSelectedOption(eid)?.value;
}

/**
 * Gets the selected label.
 *
 * @param eid - The entity ID
 * @returns Selected label or undefined
 */
export function getSelectedLabel(eid: Entity): string | undefined {
	return getSelectedOption(eid)?.label;
}

/**
 * Selects an option by index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The option index to select
 * @returns true if selection changed
 */
export function selectOptionByIndex(world: World, eid: Entity, index: number): boolean {
	const options = optionsStore.get(eid);
	if (!options || index < 0 || index >= options.length) {
		return false;
	}

	const previousIndex = selectStore.selectedIndex[eid] ?? -1;
	if (previousIndex === index) {
		return false;
	}

	selectStore.selectedIndex[eid] = index;
	selectStore.highlightedIndex[eid] = index;
	markDirty(world, eid);

	// Fire change callbacks
	const option = options[index];
	const callbacks = changeCallbacks.get(eid);
	if (callbacks && option) {
		for (const cb of callbacks) {
			cb(option.value, option.label, index);
		}
	}

	// Send select event to close dropdown
	sendSelectEvent(world, eid, 'select');

	return true;
}

/**
 * Selects an option by value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - The value to select
 * @returns true if selection changed
 */
export function selectOptionByValue(world: World, eid: Entity, value: string): boolean {
	const options = optionsStore.get(eid);
	if (!options) {
		return false;
	}

	const index = options.findIndex((opt) => opt.value === value);
	if (index < 0) {
		return false;
	}

	return selectOptionByIndex(world, eid, index);
}

/**
 * Clears the selection.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearSelection(world: World, eid: Entity): void {
	selectStore.selectedIndex[eid] = -1;
	markDirty(world, eid);
}

// =============================================================================
// HIGHLIGHT MANAGEMENT (for keyboard navigation)
// =============================================================================

/**
 * Gets the highlighted index.
 *
 * @param eid - The entity ID
 * @returns Highlighted index
 */
export function getHighlightedIndex(eid: Entity): number {
	return selectStore.highlightedIndex[eid] ?? 0;
}

/**
 * Sets the highlighted index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The index to highlight
 */
export function setHighlightedIndex(world: World, eid: Entity, index: number): void {
	const count = selectStore.optionCount[eid] ?? 0;
	if (count === 0) {
		return;
	}

	// Clamp to valid range
	const clampedIndex = Math.max(0, Math.min(index, count - 1));
	selectStore.highlightedIndex[eid] = clampedIndex;
	markDirty(world, eid);
}

/**
 * Highlights the next option.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param wrap - Whether to wrap around (default: true)
 */
export function highlightNext(world: World, eid: Entity, wrap = true): void {
	const count = selectStore.optionCount[eid] ?? 0;
	if (count === 0) {
		return;
	}

	let next = (selectStore.highlightedIndex[eid] ?? 0) + 1;
	if (next >= count) {
		next = wrap ? 0 : count - 1;
	}

	setHighlightedIndex(world, eid, next);
}

/**
 * Highlights the previous option.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param wrap - Whether to wrap around (default: true)
 */
export function highlightPrev(world: World, eid: Entity, wrap = true): void {
	const count = selectStore.optionCount[eid] ?? 0;
	if (count === 0) {
		return;
	}

	let prev = (selectStore.highlightedIndex[eid] ?? 0) - 1;
	if (prev < 0) {
		prev = wrap ? count - 1 : 0;
	}

	setHighlightedIndex(world, eid, prev);
}

/**
 * Selects the currently highlighted option.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if selection changed
 */
export function selectHighlighted(world: World, eid: Entity): boolean {
	const index = selectStore.highlightedIndex[eid] ?? 0;
	return selectOptionByIndex(world, eid, index);
}

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Sets the select display configuration.
 *
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setSelectDisplay(eid: Entity, options: SelectDisplayOptions): void {
	const existing = displayStore.get(eid);
	displayStore.set(eid, {
		closedIndicator:
			options.closedIndicator ?? existing?.closedIndicator ?? DEFAULT_CLOSED_INDICATOR,
		openIndicator: options.openIndicator ?? existing?.openIndicator ?? DEFAULT_OPEN_INDICATOR,
		selectedMark: options.selectedMark ?? existing?.selectedMark ?? DEFAULT_SELECTED_MARK,
		separator: options.separator ?? existing?.separator ?? DEFAULT_SEPARATOR,
	});
}

/**
 * Gets the select display configuration.
 *
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getSelectDisplay(eid: Entity): SelectDisplay {
	return (
		displayStore.get(eid) ?? {
			closedIndicator: DEFAULT_CLOSED_INDICATOR,
			openIndicator: DEFAULT_OPEN_INDICATOR,
			selectedMark: DEFAULT_SELECTED_MARK,
			separator: DEFAULT_SEPARATOR,
		}
	);
}

/**
 * Clears the select display configuration.
 *
 * @param eid - The entity ID
 */
export function clearSelectDisplay(eid: Entity): void {
	displayStore.delete(eid);
}

/**
 * Gets the indicator character based on state.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Indicator character
 */
export function getSelectIndicator(world: World, eid: Entity): string {
	const display = getSelectDisplay(eid);
	const state = getSelectState(world, eid);
	return state === 'open' ? display.openIndicator : display.closedIndicator;
}

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Registers a callback for when the selection changes.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onSelectChange(eid, (value, label, index) => {
 *   console.log(`Selected: ${label} (${value})`);
 * });
 * ```
 */
export function onSelectChange(eid: Entity, callback: SelectCallback): () => void {
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
 * Registers a callback for when the dropdown opens.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 */
export function onSelectOpen(eid: Entity, callback: () => void): () => void {
	const callbacks = openCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	openCallbacks.set(eid, callbacks);

	return () => {
		const cbs = openCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Registers a callback for when the dropdown closes.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 */
export function onSelectClose(eid: Entity, callback: () => void): () => void {
	const callbacks = closeCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	closeCallbacks.set(eid, callbacks);

	return () => {
		const cbs = closeCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Clears all callbacks for a select.
 *
 * @param eid - The entity ID
 */
export function clearSelectCallbacks(eid: Entity): void {
	changeCallbacks.delete(eid);
	openCallbacks.delete(eid);
	closeCallbacks.delete(eid);
}

// =============================================================================
// KEY HANDLING
// =============================================================================

/**
 * Action returned from key press handling.
 */
export type SelectAction =
	| { type: 'open' }
	| { type: 'close' }
	| { type: 'toggle' }
	| { type: 'select'; index: number }
	| { type: 'highlightNext' }
	| { type: 'highlightPrev' }
	| { type: 'highlightFirst' }
	| { type: 'highlightLast' };

/**
 * Handles key press for select widget.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param key - The key name
 * @returns Action to perform or null
 *
 * @example
 * ```typescript
 * const action = handleSelectKeyPress(world, eid, 'down');
 * if (action?.type === 'highlightNext') {
 *   highlightNext(world, eid);
 * }
 * ```
 */
export function handleSelectKeyPress(world: World, eid: Entity, key: string): SelectAction | null {
	if (!isSelect(world, eid)) {
		return null;
	}

	if (isSelectDisabled(world, eid)) {
		return null;
	}

	const isOpen = isSelectOpen(world, eid);

	switch (key) {
		case 'return':
		case 'enter':
		case 'space':
			if (isOpen) {
				return { type: 'select', index: getHighlightedIndex(eid) };
			}
			return { type: 'open' };

		case 'escape':
			if (isOpen) {
				return { type: 'close' };
			}
			return null;

		case 'up':
			if (isOpen) {
				return { type: 'highlightPrev' };
			}
			return { type: 'open' };

		case 'down':
			if (isOpen) {
				return { type: 'highlightNext' };
			}
			return { type: 'open' };

		case 'home':
			if (isOpen) {
				return { type: 'highlightFirst' };
			}
			return null;

		case 'end':
			if (isOpen) {
				return { type: 'highlightLast' };
			}
			return null;

		default:
			return null;
	}
}

// =============================================================================
// STORE RESET
// =============================================================================

/**
 * Resets the select store. Used for testing.
 */
export function resetSelectStore(): void {
	selectStore.isSelect.fill(0);
	selectStore.selectedIndex.fill(-1);
	selectStore.highlightedIndex.fill(0);
	selectStore.optionCount.fill(0);
	optionsStore.clear();
	displayStore.clear();
	changeCallbacks.clear();
	openCallbacks.clear();
	closeCallbacks.clear();
}
