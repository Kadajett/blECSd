/**
 * Multi-Select Widget
 *
 * A standalone multi-select dropdown/list with checkbox display,
 * filter-as-you-type, range selection, and keyboard-only navigation.
 *
 * @module widgets/multiSelect
 *
 * @example
 * ```typescript
 * import { createMultiSelect, getSelectedItems, onSelectionChange } from 'blecsd';
 *
 * const world = createWorld();
 * const ms = createMultiSelect(world, {
 *   items: ['Apple', 'Banana', 'Cherry', 'Date'],
 *   width: 30,
 *   height: 10,
 * });
 *
 * // Toggle items
 * ms.focus().select(0).toggleCurrent();
 *
 * // Get selected
 * const selected = getSelectedItems(world, ms.eid);
 * console.log(selected); // ['Apple']
 *
 * // Listen for changes
 * onSelectionChange(world, ms.eid, (items) => {
 *   console.log('Selected:', items);
 * });
 * ```
 */

import { z } from 'zod';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default widget dimensions */
const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 10;

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Checkbox display characters */
const CHECKBOX_CHECKED = '[x]';
const CHECKBOX_UNCHECKED = '[ ]';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A multi-select item with display text and optional value.
 *
 * @example
 * ```typescript
 * const item: MultiSelectItem = {
 *   text: 'Option A',
 *   value: 'a',
 *   disabled: false,
 * };
 * ```
 */
export interface MultiSelectItem {
	/** Display text */
	readonly text: string;
	/** Optional value (defaults to text) */
	readonly value?: string | undefined;
	/** Whether the item is disabled and cannot be selected */
	readonly disabled?: boolean | undefined;
}

/**
 * Configuration for creating a MultiSelect widget.
 *
 * @example
 * ```typescript
 * const config: MultiSelectConfig = {
 *   items: ['Apple', 'Banana', 'Cherry'],
 *   width: 30,
 *   height: 10,
 *   selected: [0, 2],
 * };
 * ```
 */
export interface MultiSelectConfig {
	/** X position @default 0 */
	readonly x?: number;
	/** Y position @default 0 */
	readonly y?: number;
	/** Width in columns @default 30 */
	readonly width?: number;
	/** Height in rows @default 10 */
	readonly height?: number;
	/** Items as strings or MultiSelectItem objects */
	readonly items?: readonly (string | MultiSelectItem)[];
	/** Initially selected indices @default [] */
	readonly selected?: readonly number[];
	/** Foreground color for normal items */
	readonly fg?: number;
	/** Background color for normal items */
	readonly bg?: number;
	/** Foreground color for the highlighted/cursor item */
	readonly cursorFg?: number;
	/** Background color for the highlighted/cursor item */
	readonly cursorBg?: number;
	/** Foreground color for selected items */
	readonly selectedFg?: number;
	/** Background color for selected items */
	readonly selectedBg?: number;
	/** Foreground color for disabled items */
	readonly disabledFg?: number;
	/** Whether to enable filter-as-you-type @default true */
	readonly filterable?: boolean;
}

/**
 * Callback fired when the selection changes.
 */
export type SelectionChangeCallback = (
	selectedIndices: readonly number[],
	selectedItems: readonly MultiSelectItem[],
) => void;

/**
 * MultiSelect widget interface providing chainable methods.
 */
export interface MultiSelectWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the widget */
	show(): MultiSelectWidget;
	/** Hides the widget */
	hide(): MultiSelectWidget;

	// Focus
	/** Focuses the widget */
	focus(): MultiSelectWidget;
	/** Blurs the widget */
	blur(): MultiSelectWidget;
	/** Returns whether the widget is focused */
	isFocused(): boolean;

	// Cursor
	/** Moves cursor to a specific index */
	select(index: number): MultiSelectWidget;
	/** Gets the current cursor index */
	getCursorIndex(): number;
	/** Moves cursor up */
	cursorUp(): MultiSelectWidget;
	/** Moves cursor down */
	cursorDown(): MultiSelectWidget;
	/** Moves to first item */
	cursorFirst(): MultiSelectWidget;
	/** Moves to last item */
	cursorLast(): MultiSelectWidget;
	/** Scrolls up by page */
	pageUp(): MultiSelectWidget;
	/** Scrolls down by page */
	pageDown(): MultiSelectWidget;

	// Selection
	/** Toggles the selection of the current item */
	toggleCurrent(): MultiSelectWidget;
	/** Toggles the selection of a specific item by index */
	toggleItem(index: number): MultiSelectWidget;
	/** Selects all items */
	selectAll(): MultiSelectWidget;
	/** Deselects all items */
	deselectAll(): MultiSelectWidget;
	/** Range select from anchor to current cursor (Shift+Arrow behavior) */
	rangeSelectTo(index: number): MultiSelectWidget;
	/** Gets all selected indices (sorted) */
	getSelectedIndices(): readonly number[];
	/** Gets all selected items */
	getSelectedItems(): readonly MultiSelectItem[];
	/** Gets the count of selected items */
	getSelectedCount(): number;
	/** Gets a formatted status string like "3 selected" */
	getSelectionStatus(): string;
	/** Checks if a specific index is selected */
	isSelected(index: number): boolean;

	// Items
	/** Sets the items */
	setItems(items: readonly (string | MultiSelectItem)[]): MultiSelectWidget;
	/** Gets all items */
	getItems(): readonly MultiSelectItem[];
	/** Gets visible items (after filtering) */
	getVisibleItems(): readonly MultiSelectItem[];

	// Filter
	/** Sets the filter query (filter-as-you-type) */
	setFilter(query: string): MultiSelectWidget;
	/** Gets the current filter query */
	getFilter(): string;
	/** Clears the filter */
	clearFilter(): MultiSelectWidget;

	// Rendering helpers
	/** Gets the rendered lines for display (with checkboxes) */
	getRenderLines(): readonly string[];

	// Events
	/** Registers a callback for selection changes */
	onSelectionChange(callback: SelectionChangeCallback): () => void;

	// Key handling
	/** Handles a key press, returns true if consumed */
	handleKey(key: string, ctrl?: boolean, shift?: boolean): boolean;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for MultiSelectConfig validation.
 */
export const MultiSelectConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(DEFAULT_WIDTH),
	height: z.number().int().positive().default(DEFAULT_HEIGHT),
	items: z
		.array(
			z.union([
				z.string(),
				z.object({
					text: z.string(),
					value: z.string().optional(),
					disabled: z.boolean().optional(),
				}),
			]),
		)
		.default([]),
	selected: z.array(z.number().int().nonnegative()).default([]),
	fg: z.number().int().nonnegative().optional(),
	bg: z.number().int().nonnegative().optional(),
	cursorFg: z.number().int().nonnegative().optional(),
	cursorBg: z.number().int().nonnegative().optional(),
	selectedFg: z.number().int().nonnegative().optional(),
	selectedBg: z.number().int().nonnegative().optional(),
	disabledFg: z.number().int().nonnegative().optional(),
	filterable: z.boolean().default(true),
});

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

interface MultiSelectState {
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

const stateMap = new Map<Entity, MultiSelectState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Handles navigation keys for multi-select.
 */
function handleMultiSelectNav(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	key: string,
	shift: boolean,
): boolean {
	if (key === 'up' || key === 'k') {
		if (shift) {
			widget.rangeSelectTo(Math.max(0, state.cursorIndex - 1));
		} else {
			widget.cursorUp();
			state.rangeAnchor = state.cursorIndex;
		}
		return true;
	}

	if (key === 'down' || key === 'j') {
		if (shift) {
			widget.rangeSelectTo(Math.min(state.filteredIndices.length - 1, state.cursorIndex + 1));
		} else {
			widget.cursorDown();
			state.rangeAnchor = state.cursorIndex;
		}
		return true;
	}

	if (key === 'home' || key === 'g') {
		widget.cursorFirst();
		return true;
	}
	if (key === 'end' || key === 'G') {
		widget.cursorLast();
		return true;
	}
	if (key === 'pageup') {
		widget.pageUp();
		return true;
	}
	if (key === 'pagedown') {
		widget.pageDown();
		return true;
	}

	return false;
}

/**
 * Handles filter input keys for multi-select.
 */
function handleMultiSelectFilter(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	key: string,
	ctrl: boolean,
): boolean {
	if (state.filterable && key.length === 1 && !ctrl) {
		state.filterQuery += key;
		recalculateFilter(state);
		return true;
	}

	if (state.filterable && key === 'backspace') {
		if (state.filterQuery.length > 0) {
			state.filterQuery = state.filterQuery.slice(0, -1);
			recalculateFilter(state);
		}
		return true;
	}

	if (key === 'escape') {
		if (state.filterQuery.length > 0) {
			state.filterQuery = '';
			recalculateFilter(state);
		} else {
			widget.blur();
		}
		return true;
	}

	return false;
}

/**
 * Handles key input for the multi-select widget.
 */
function handleMultiSelectKey(
	widget: MultiSelectWidget,
	state: MultiSelectState,
	key: string,
	ctrl: boolean,
	shift: boolean,
): boolean {
	if (ctrl && key === 'a') {
		if (state.selected.size === state.items.length) {
			widget.deselectAll();
		} else {
			widget.selectAll();
		}
		return true;
	}

	if (handleMultiSelectNav(widget, state, key, shift)) {
		return true;
	}

	if (key === ' ') {
		widget.toggleCurrent();
		return true;
	}

	return handleMultiSelectFilter(widget, state, key, ctrl);
}

/**
 * Normalizes items from string or MultiSelectItem to MultiSelectItem.
 */
function normalizeItems(items: readonly (string | MultiSelectItem)[]): MultiSelectItem[] {
	return items.map((item) => {
		if (typeof item === 'string') {
			return { text: item, value: item };
		}
		return { ...item, value: item.value ?? item.text };
	});
}

/**
 * Recalculates filtered indices based on current filter query.
 */
function recalculateFilter(state: MultiSelectState): void {
	if (state.filterQuery.length === 0) {
		state.filteredIndices = state.items.map((_, i) => i);
		return;
	}

	const lowerQuery = state.filterQuery.toLowerCase();
	state.filteredIndices = [];
	for (let i = 0; i < state.items.length; i++) {
		const item = state.items[i];
		if (item?.text.toLowerCase().includes(lowerQuery)) {
			state.filteredIndices.push(i);
		}
	}

	// Clamp cursor
	if (state.filteredIndices.length === 0) {
		state.cursorIndex = -1;
	} else if (state.cursorIndex >= state.filteredIndices.length) {
		state.cursorIndex = state.filteredIndices.length - 1;
	} else if (state.cursorIndex < 0) {
		state.cursorIndex = 0;
	}
	state.firstVisible = 0;
}

/**
 * Fires selection change callbacks.
 */
function fireSelectionCallbacks(state: MultiSelectState): void {
	const indices = Array.from(state.selected).sort((a, b) => a - b);
	const items = indices
		.map((i) => state.items[i])
		.filter((item): item is MultiSelectItem => item !== undefined);

	for (const cb of state.selectionCallbacks) {
		cb(indices, items);
	}
}

/**
 * Gets the actual item index from the filtered view index.
 */
function getActualIndex(state: MultiSelectState, filteredIdx: number): number {
	const idx = state.filteredIndices[filteredIdx];
	return idx ?? -1;
}

/**
 * Ensures the cursor is visible in the viewport.
 */
function ensureCursorVisible(state: MultiSelectState): void {
	if (state.cursorIndex < state.firstVisible) {
		state.firstVisible = state.cursorIndex;
	} else if (state.cursorIndex >= state.firstVisible + state.visibleCount) {
		state.firstVisible = state.cursorIndex - state.visibleCount + 1;
	}
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a MultiSelect widget.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The MultiSelectWidget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { createMultiSelect } from 'blecsd';
 *
 * const world = createWorld();
 * const ms = createMultiSelect(world, {
 *   items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
 *   width: 30,
 *   height: 8,
 *   selected: [0, 2],
 * });
 *
 * ms.focus();
 * console.log(ms.getSelectionStatus()); // "2 selected"
 *
 * ms.handleKey(' '); // Toggle current
 * ms.handleKey('down'); // Move cursor
 * ```
 */
export function createMultiSelect(world: World, config: MultiSelectConfig = {}): MultiSelectWidget {
	const validated = MultiSelectConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as multi-select
	MultiSelect.isMultiSelect[eid] = 1;
	MultiSelect.visible[eid] = 1;
	MultiSelect.focused[eid] = 0;

	const items = normalizeItems(validated.items);

	// Initialize selected set
	const selected = new Set<number>();
	for (const idx of validated.selected) {
		if (idx >= 0 && idx < items.length) {
			const item = items[idx];
			if (item && !item.disabled) {
				selected.add(idx);
			}
		}
	}

	// Determine visible count (account for filter input line if filterable)
	const filterLineHeight = validated.filterable ? 1 : 0;
	const visibleCount = Math.max(1, validated.height - filterLineHeight);

	const state: MultiSelectState = {
		items,
		selected,
		cursorIndex: items.length > 0 ? 0 : -1,
		rangeAnchor: 0,
		filterQuery: '',
		filteredIndices: items.map((_, i) => i),
		filterable: validated.filterable,
		firstVisible: 0,
		visibleCount,
		width: validated.width,
		fg: validated.fg ?? 0xffffffff,
		bg: validated.bg ?? 0x000000ff,
		cursorFg: validated.cursorFg ?? 0x000000ff,
		cursorBg: validated.cursorBg ?? 0x0088ffff,
		selectedFg: validated.selectedFg ?? 0x00ff00ff,
		selectedBg: validated.selectedBg ?? 0x000000ff,
		disabledFg: validated.disabledFg ?? 0x888888ff,
		selectionCallbacks: [],
	};

	stateMap.set(eid, state);

	const widget: MultiSelectWidget = {
		eid,

		// Visibility
		show(): MultiSelectWidget {
			MultiSelect.visible[eid] = 1;
			return widget;
		},

		hide(): MultiSelectWidget {
			MultiSelect.visible[eid] = 0;
			return widget;
		},

		// Focus
		focus(): MultiSelectWidget {
			MultiSelect.focused[eid] = 1;
			return widget;
		},

		blur(): MultiSelectWidget {
			MultiSelect.focused[eid] = 0;
			return widget;
		},

		isFocused(): boolean {
			return MultiSelect.focused[eid] === 1;
		},

		// Cursor
		select(index: number): MultiSelectWidget {
			if (index >= 0 && index < state.filteredIndices.length) {
				state.cursorIndex = index;
				state.rangeAnchor = index;
				ensureCursorVisible(state);
			}
			return widget;
		},

		getCursorIndex(): number {
			return state.cursorIndex;
		},

		cursorUp(): MultiSelectWidget {
			if (state.cursorIndex > 0) {
				state.cursorIndex--;
				ensureCursorVisible(state);
			}
			return widget;
		},

		cursorDown(): MultiSelectWidget {
			if (state.cursorIndex < state.filteredIndices.length - 1) {
				state.cursorIndex++;
				ensureCursorVisible(state);
			}
			return widget;
		},

		cursorFirst(): MultiSelectWidget {
			if (state.filteredIndices.length > 0) {
				state.cursorIndex = 0;
				state.firstVisible = 0;
			}
			return widget;
		},

		cursorLast(): MultiSelectWidget {
			if (state.filteredIndices.length > 0) {
				state.cursorIndex = state.filteredIndices.length - 1;
				ensureCursorVisible(state);
			}
			return widget;
		},

		pageUp(): MultiSelectWidget {
			state.cursorIndex = Math.max(0, state.cursorIndex - state.visibleCount);
			ensureCursorVisible(state);
			return widget;
		},

		pageDown(): MultiSelectWidget {
			state.cursorIndex = Math.min(
				state.filteredIndices.length - 1,
				state.cursorIndex + state.visibleCount,
			);
			ensureCursorVisible(state);
			return widget;
		},

		// Selection
		toggleCurrent(): MultiSelectWidget {
			if (state.cursorIndex < 0 || state.cursorIndex >= state.filteredIndices.length) {
				return widget;
			}

			const actualIdx = getActualIndex(state, state.cursorIndex);
			if (actualIdx < 0) {
				return widget;
			}

			const item = state.items[actualIdx];
			if (item?.disabled) {
				return widget;
			}

			if (state.selected.has(actualIdx)) {
				state.selected.delete(actualIdx);
			} else {
				state.selected.add(actualIdx);
			}

			state.rangeAnchor = state.cursorIndex;
			fireSelectionCallbacks(state);
			return widget;
		},

		toggleItem(index: number): MultiSelectWidget {
			if (index < 0 || index >= state.items.length) {
				return widget;
			}

			const item = state.items[index];
			if (item?.disabled) {
				return widget;
			}

			if (state.selected.has(index)) {
				state.selected.delete(index);
			} else {
				state.selected.add(index);
			}

			fireSelectionCallbacks(state);
			return widget;
		},

		selectAll(): MultiSelectWidget {
			for (let i = 0; i < state.items.length; i++) {
				const item = state.items[i];
				if (item && !item.disabled) {
					state.selected.add(i);
				}
			}
			fireSelectionCallbacks(state);
			return widget;
		},

		deselectAll(): MultiSelectWidget {
			state.selected.clear();
			fireSelectionCallbacks(state);
			return widget;
		},

		rangeSelectTo(index: number): MultiSelectWidget {
			if (index < 0 || index >= state.filteredIndices.length) {
				return widget;
			}

			const start = Math.min(state.rangeAnchor, index);
			const end = Math.max(state.rangeAnchor, index);

			for (let i = start; i <= end; i++) {
				const actualIdx = getActualIndex(state, i);
				if (actualIdx >= 0) {
					const item = state.items[actualIdx];
					if (item && !item.disabled) {
						state.selected.add(actualIdx);
					}
				}
			}

			state.cursorIndex = index;
			ensureCursorVisible(state);
			fireSelectionCallbacks(state);
			return widget;
		},

		getSelectedIndices(): readonly number[] {
			return Array.from(state.selected).sort((a, b) => a - b);
		},

		getSelectedItems(): readonly MultiSelectItem[] {
			return Array.from(state.selected)
				.sort((a, b) => a - b)
				.map((i) => state.items[i])
				.filter((item): item is MultiSelectItem => item !== undefined);
		},

		getSelectedCount(): number {
			return state.selected.size;
		},

		getSelectionStatus(): string {
			const count = state.selected.size;
			if (count === 0) {
				return 'None selected';
			}
			return `${count} selected`;
		},

		isSelected(index: number): boolean {
			return state.selected.has(index);
		},

		// Items
		setItems(newItems: readonly (string | MultiSelectItem)[]): MultiSelectWidget {
			state.items = normalizeItems(newItems);
			// Remove selections that are out of bounds
			for (const idx of state.selected) {
				if (idx >= state.items.length) {
					state.selected.delete(idx);
				}
			}
			recalculateFilter(state);
			if (state.cursorIndex >= state.filteredIndices.length) {
				state.cursorIndex = Math.max(0, state.filteredIndices.length - 1);
			}
			return widget;
		},

		getItems(): readonly MultiSelectItem[] {
			return state.items;
		},

		getVisibleItems(): readonly MultiSelectItem[] {
			return state.filteredIndices
				.map((i) => state.items[i])
				.filter((item): item is MultiSelectItem => item !== undefined);
		},

		// Filter
		setFilter(query: string): MultiSelectWidget {
			state.filterQuery = query;
			recalculateFilter(state);
			return widget;
		},

		getFilter(): string {
			return state.filterQuery;
		},

		clearFilter(): MultiSelectWidget {
			state.filterQuery = '';
			recalculateFilter(state);
			return widget;
		},

		// Rendering helpers
		getRenderLines(): readonly string[] {
			const lines: string[] = [];
			const startIdx = state.firstVisible;
			const endIdx = Math.min(startIdx + state.visibleCount, state.filteredIndices.length);

			for (let i = startIdx; i < endIdx; i++) {
				const actualIdx = getActualIndex(state, i);
				if (actualIdx < 0) {
					continue;
				}
				const item = state.items[actualIdx];
				if (!item) {
					continue;
				}

				const checkbox = state.selected.has(actualIdx) ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
				const cursor = i === state.cursorIndex ? '>' : ' ';
				const text = item.text;
				const maxTextWidth = Math.max(0, state.width - 6); // cursor + space + checkbox + space
				const truncated = text.length > maxTextWidth ? `${text.slice(0, maxTextWidth - 1)}~` : text;

				lines.push(`${cursor} ${checkbox} ${truncated}`);
			}

			return lines;
		},

		// Events
		onSelectionChange(callback: SelectionChangeCallback): () => void {
			state.selectionCallbacks.push(callback);
			return () => {
				const idx = state.selectionCallbacks.indexOf(callback);
				if (idx !== -1) {
					state.selectionCallbacks.splice(idx, 1);
				}
			};
		},

		// Key handling
		handleKey(key: string, ctrl = false, shift = false): boolean {
			return handleMultiSelectKey(widget, state, key, ctrl, shift);
		},

		// Lifecycle
		destroy(): void {
			MultiSelect.isMultiSelect[eid] = 0;
			MultiSelect.visible[eid] = 0;
			MultiSelect.focused[eid] = 0;
			stateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// STANDALONE API FUNCTIONS
// =============================================================================

/**
 * Gets the selected items from a MultiSelect entity.
 *
 * @param _world - The ECS world
 * @param eid - The multi-select entity ID
 * @returns Array of selected items, or empty array if not a multi-select
 *
 * @example
 * ```typescript
 * import { getSelectedItems } from 'blecsd';
 *
 * const items = getSelectedItems(world, multiSelectEid);
 * console.log(items.map(i => i.text));
 * ```
 */
export function getSelectedItems(_world: World, eid: Entity): readonly MultiSelectItem[] {
	const state = stateMap.get(eid);
	if (!state) {
		return [];
	}
	return Array.from(state.selected)
		.sort((a, b) => a - b)
		.map((i) => state.items[i])
		.filter((item): item is MultiSelectItem => item !== undefined);
}

/**
 * Registers a callback for when the selection changes on a MultiSelect entity.
 *
 * @param _world - The ECS world
 * @param eid - The multi-select entity ID
 * @param callback - The callback to fire on selection change
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * import { onSelectionChange } from 'blecsd';
 *
 * const unsub = onSelectionChange(world, msEid, (indices, items) => {
 *   console.log(`${items.length} items selected`);
 * });
 *
 * // Later: unsub();
 * ```
 */
export function onSelectionChange(
	_world: World,
	eid: Entity,
	callback: SelectionChangeCallback,
): () => void {
	const state = stateMap.get(eid);
	if (!state) {
		return () => {};
	}

	state.selectionCallbacks.push(callback);
	return () => {
		const idx = state.selectionCallbacks.indexOf(callback);
		if (idx !== -1) {
			state.selectionCallbacks.splice(idx, 1);
		}
	};
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a MultiSelect widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a multi-select widget
 */
export function isMultiSelect(_world: World, eid: Entity): boolean {
	return MultiSelect.isMultiSelect[eid] === 1;
}

/**
 * Resets the MultiSelect component store. Useful for testing.
 *
 * @internal
 */
export function resetMultiSelectStore(): void {
	MultiSelect.isMultiSelect.fill(0);
	MultiSelect.visible.fill(0);
	MultiSelect.focused.fill(0);
	stateMap.clear();
}
