/**
 * Multi-Select Widget Types
 *
 * TypeScript interfaces and type definitions for the MultiSelect widget.
 *
 * @module widgets/multiSelect/types
 */

import type { Entity } from '../../core/types';

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
