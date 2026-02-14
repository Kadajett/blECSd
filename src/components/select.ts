/**
 * Select/Dropdown Component
 *
 * Pure data container for select/dropdown functionality.
 * All business logic is in selectSystem.ts.
 *
 * @module components/select
 */

import type { StateMachineConfig } from '../core/stateMachine';

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
