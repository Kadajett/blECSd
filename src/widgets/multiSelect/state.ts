/**
 * Multi-Select Widget State
 *
 * State management for MultiSelect widgets including component definition
 * and state stores.
 *
 * @module widgets/multiSelect/state
 */

import type { Entity } from '../../core/types';
import type { MultiSelectItem, SelectionChangeCallback } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * MultiSelect component marker for identifying multi-select entities.
 *
 * @example
 * ```typescript
 * import { MultiSelect } from 'blecsd';
 *
 * if (MultiSelect.isMultiSelect[eid] === 1) {
 *   // Entity is a multi-select widget
 * }
 * ```
 */
export const MultiSelect = {
	/** Tag indicating this is a multi-select widget (1 = yes) */
	isMultiSelect: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the widget is visible (0 = hidden, 1 = visible) */
	visible: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the widget is focused (0 = no, 1 = yes) */
	focused: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

export interface MultiSelectState {
	items: MultiSelectItem[];
	selected: Set<number>;
	cursorIndex: number;
	rangeAnchor: number;
	filterQuery: string;
	filteredIndices: number[];
	filterable: boolean;
	firstVisible: number;
	visibleCount: number;
	width: number;
	fg: number;
	bg: number;
	cursorFg: number;
	cursorBg: number;
	selectedFg: number;
	selectedBg: number;
	disabledFg: number;
	selectionCallbacks: SelectionChangeCallback[];
}

export const stateMap = new Map<Entity, MultiSelectState>();
