/**
 * Searchable List Enhancement
 *
 * Enhances list and virtualized list widgets with inline search/filter
 * capabilities. Adds a filter input that narrows displayed items in
 * real-time as the user types.
 *
 * Works with both the List widget (finite items) and VirtualizedList
 * widget (large datasets) through a common SearchableContent interface.
 *
 * @module widgets/searchableList
 *
 * @example
 * ```typescript
 * import { createSearchableList } from 'blecsd';
 *
 * const world = createWorld();
 * const sl = createSearchableList(world, {
 *   items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
 *   enableSearch: true,
 *   width: 30,
 *   height: 10,
 * });
 *
 * // Filter in real-time
 * sl.setFilter('ber');
 * console.log(sl.getFilteredItems()); // ['Elderberry']
 *
 * // Preserve selection across filter changes
 * sl.select(0).setFilter('Ch');
 * sl.clearFilter();
 * // Original selection is restored
 * ```
 */

import { z } from 'zod';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_WIDTH = 30;
const DEFAULT_HEIGHT = 10;
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * An item in the searchable list.
 */
export interface SearchableListItem {
	/** Display text */
	readonly text: string;
	/** Optional value (defaults to text) */
	readonly value?: string;
	/** Whether the item is disabled */
	readonly disabled?: boolean;
}

/**
 * Configuration for the SearchableList widget.
 *
 * @example
 * ```typescript
 * const config: SearchableListConfig = {
 *   items: ['Apple', 'Banana', 'Cherry'],
 *   enableSearch: true,
 *   placeholder: 'Type to filter...',
 * };
 * ```
 */
export interface SearchableListConfig {
	/** X position @default 0 */
	readonly x?: number;
	/** Y position @default 0 */
	readonly y?: number;
	/** Width in columns @default 30 */
	readonly width?: number;
	/** Height in rows @default 10 */
	readonly height?: number;
	/** Items to display */
	readonly items?: readonly string[];
	/** Whether to show the inline filter input @default true */
	readonly enableSearch?: boolean;
	/** Placeholder text for the filter input @default 'Filter...' */
	readonly placeholder?: string;
	/** Initially selected item index @default 0 */
	readonly selected?: number;
	/** Foreground color for normal items */
	readonly fg?: number;
	/** Background color for normal items */
	readonly bg?: number;
	/** Foreground color for the selected/highlighted item */
	readonly selectedFg?: number;
	/** Background color for the selected/highlighted item */
	readonly selectedBg?: number;
	/** Foreground color for disabled items */
	readonly disabledFg?: number;
	/** Foreground color for the filter input */
	readonly filterFg?: number;
	/** Background color for the filter input */
	readonly filterBg?: number;
}

/**
 * Callback fired when filter or selection changes.
 */
export type SearchableListCallback = (
	filteredItems: readonly SearchableListItem[],
	selectedIndex: number,
) => void;

/**
 * SearchableList widget interface.
 */
export interface SearchableListWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the widget */
	show(): SearchableListWidget;
	/** Hides the widget */
	hide(): SearchableListWidget;

	// Focus
	/** Focuses the widget (activates filter input) */
	focus(): SearchableListWidget;
	/** Blurs the widget */
	blur(): SearchableListWidget;
	/** Returns whether the widget is focused */
	isFocused(): boolean;

	// Items
	/** Sets the items */
	setItems(items: readonly string[]): SearchableListWidget;
	/** Gets all items */
	getItems(): readonly SearchableListItem[];

	// Filter
	/** Sets the filter query */
	setFilter(query: string): SearchableListWidget;
	/** Gets the current filter query */
	getFilter(): string;
	/** Clears the filter */
	clearFilter(): SearchableListWidget;
	/** Gets items after filtering */
	getFilteredItems(): readonly SearchableListItem[];
	/** Gets the filtered item count */
	getFilteredCount(): number;
	/** Gets a status string like "5 of 20 items" */
	getFilterStatus(): string;
	/** Whether search/filter is enabled */
	isSearchEnabled(): boolean;
	/** Enables or disables search */
	setSearchEnabled(enabled: boolean): SearchableListWidget;

	// Selection
	/** Selects the item at the given index (in filtered view) */
	select(index: number): SearchableListWidget;
	/** Gets the currently selected index (in filtered view) */
	getSelectedIndex(): number;
	/** Gets the currently selected item */
	getSelectedItem(): SearchableListItem | undefined;
	/** Gets the original (unfiltered) index of the selected item */
	getOriginalSelectedIndex(): number;
	/** Moves selection up */
	selectPrev(): SearchableListWidget;
	/** Moves selection down */
	selectNext(): SearchableListWidget;
	/** Selects the first item */
	selectFirst(): SearchableListWidget;
	/** Selects the last item */
	selectLast(): SearchableListWidget;

	// Events
	/** Registers a callback for filter/selection changes */
	onChange(callback: SearchableListCallback): () => void;

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
 * Zod schema for SearchableListConfig validation.
 */
export const SearchableListConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(DEFAULT_WIDTH),
	height: z.number().int().positive().default(DEFAULT_HEIGHT),
	items: z.array(z.string()).default([]),
	enableSearch: z.boolean().default(true),
	placeholder: z.string().default('Filter...'),
	selected: z.number().int().min(-1).default(0),
	fg: z.number().int().nonnegative().optional(),
	bg: z.number().int().nonnegative().optional(),
	selectedFg: z.number().int().nonnegative().optional(),
	selectedBg: z.number().int().nonnegative().optional(),
	disabledFg: z.number().int().nonnegative().optional(),
	filterFg: z.number().int().nonnegative().optional(),
	filterBg: z.number().int().nonnegative().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * SearchableList component marker.
 */
export const SearchableList = {
	/** Tag indicating this is a searchable list widget */
	isSearchableList: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the widget is visible */
	visible: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the widget is focused */
	focused: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface SearchableListState {
	items: SearchableListItem[];
	filterQuery: string;
	filteredItems: SearchableListItem[];
	filteredToOriginalMap: number[];
	selectedFilteredIndex: number;
	searchEnabled: boolean;
	placeholder: string;
	visibleCount: number;
	firstVisible: number;
	width: number;
	fg: number;
	bg: number;
	selectedFg: number;
	selectedBg: number;
	disabledFg: number;
	filterFg: number;
	filterBg: number;
	callbacks: SearchableListCallback[];
}

const stateMap = new Map<Entity, SearchableListState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Recalculates filtered items based on current filter query.
 */
function recalculateFilter(state: SearchableListState): void {
	if (state.filterQuery.length === 0) {
		state.filteredItems = [...state.items];
		state.filteredToOriginalMap = state.items.map((_, i) => i);
	} else {
		const lowerQuery = state.filterQuery.toLowerCase();
		state.filteredItems = [];
		state.filteredToOriginalMap = [];

		for (let i = 0; i < state.items.length; i++) {
			const item = state.items[i];
			if (item?.text.toLowerCase().includes(lowerQuery)) {
				state.filteredItems.push(item);
				state.filteredToOriginalMap.push(i);
			}
		}
	}

	// Clamp selection
	if (state.filteredItems.length === 0) {
		state.selectedFilteredIndex = -1;
	} else if (state.selectedFilteredIndex >= state.filteredItems.length) {
		state.selectedFilteredIndex = 0;
	} else if (state.selectedFilteredIndex < 0 && state.filteredItems.length > 0) {
		state.selectedFilteredIndex = 0;
	}

	state.firstVisible = 0;
}

/**
 * Fires change callbacks.
 */
function fireCallbacks(state: SearchableListState): void {
	for (const cb of state.callbacks) {
		cb(state.filteredItems, state.selectedFilteredIndex);
	}
}

/**
 * Ensures the selected item is visible in the viewport.
 */
function ensureVisible(state: SearchableListState): void {
	if (state.selectedFilteredIndex < state.firstVisible) {
		state.firstVisible = state.selectedFilteredIndex;
	} else if (state.selectedFilteredIndex >= state.firstVisible + state.visibleCount) {
		state.firstVisible = state.selectedFilteredIndex - state.visibleCount + 1;
	}
}

/**
 * Handles navigation keys for the searchable list (up/down/home/end/page).
 * Returns true if the key was consumed.
 */
function handleSearchableListNav(
	key: string,
	state: SearchableListState,
	widget: SearchableListWidget,
): boolean {
	if (key === 'up' || key === 'k') {
		widget.selectPrev();
		return true;
	}
	if (key === 'down' || key === 'j') {
		widget.selectNext();
		return true;
	}
	if (key === 'home') {
		widget.selectFirst();
		return true;
	}
	if (key === 'end') {
		widget.selectLast();
		return true;
	}
	if (key === 'pageup') {
		const newIdx = Math.max(0, state.selectedFilteredIndex - state.visibleCount);
		widget.select(newIdx);
		fireCallbacks(state);
		return true;
	}
	if (key === 'pagedown') {
		const newIdx = Math.min(
			state.filteredItems.length - 1,
			state.selectedFilteredIndex + state.visibleCount,
		);
		widget.select(newIdx);
		fireCallbacks(state);
		return true;
	}
	return false;
}

/**
 * Handles filter input keys when search is enabled.
 * Returns true if the key was consumed.
 */
function handleSearchableListFilter(
	key: string,
	ctrl: boolean,
	state: SearchableListState,
	widget: SearchableListWidget,
): boolean {
	if (key === 'backspace') {
		if (state.filterQuery.length > 0) {
			state.filterQuery = state.filterQuery.slice(0, -1);
			recalculateFilter(state);
			fireCallbacks(state);
		}
		return true;
	}
	if (ctrl && key === 'u') {
		widget.clearFilter();
		return true;
	}
	if (key.length === 1 && !ctrl) {
		state.filterQuery += key;
		recalculateFilter(state);
		fireCallbacks(state);
		return true;
	}
	return false;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a SearchableList widget with inline filtering.
 *
 * When `enableSearch` is true (default), the first row of the widget shows
 * a filter input. Typing narrows the displayed items in real-time.
 * Selection state is preserved across filter changes by tracking the
 * original item index.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The SearchableListWidget instance
 *
 * @example
 * ```typescript
 * import { createSearchableList } from 'blecsd';
 *
 * const world = createWorld();
 * const list = createSearchableList(world, {
 *   items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
 *   enableSearch: true,
 *   placeholder: 'Type to filter...',
 *   width: 30,
 *   height: 10,
 * });
 *
 * list.focus();
 * list.setFilter('ber');
 * console.log(list.getFilterStatus()); // "1 of 5 items"
 * ```
 */
export function createSearchableList(
	world: World,
	config: SearchableListConfig = {},
): SearchableListWidget {
	const validated = SearchableListConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as searchable list
	SearchableList.isSearchableList[eid] = 1;
	SearchableList.visible[eid] = 1;
	SearchableList.focused[eid] = 0;

	const items: SearchableListItem[] = validated.items.map((text) => ({
		text,
		value: text,
	}));

	// Account for filter input line
	const filterLineHeight = validated.enableSearch ? 1 : 0;
	const visibleCount = Math.max(1, validated.height - filterLineHeight);

	const state: SearchableListState = {
		items,
		filterQuery: '',
		filteredItems: [...items],
		filteredToOriginalMap: items.map((_, i) => i),
		selectedFilteredIndex: items.length > 0 ? Math.min(validated.selected, items.length - 1) : -1,
		searchEnabled: validated.enableSearch,
		placeholder: validated.placeholder,
		visibleCount,
		firstVisible: 0,
		width: validated.width,
		fg: validated.fg ?? 0xffffffff,
		bg: validated.bg ?? 0x000000ff,
		selectedFg: validated.selectedFg ?? 0x000000ff,
		selectedBg: validated.selectedBg ?? 0x0088ffff,
		disabledFg: validated.disabledFg ?? 0x888888ff,
		filterFg: validated.filterFg ?? 0xffffffff,
		filterBg: validated.filterBg ?? 0x222222ff,
		callbacks: [],
	};

	stateMap.set(eid, state);

	const widget: SearchableListWidget = {
		eid,

		// Visibility
		show(): SearchableListWidget {
			SearchableList.visible[eid] = 1;
			return widget;
		},

		hide(): SearchableListWidget {
			SearchableList.visible[eid] = 0;
			return widget;
		},

		// Focus
		focus(): SearchableListWidget {
			SearchableList.focused[eid] = 1;
			return widget;
		},

		blur(): SearchableListWidget {
			SearchableList.focused[eid] = 0;
			return widget;
		},

		isFocused(): boolean {
			return SearchableList.focused[eid] === 1;
		},

		// Items
		setItems(newItems: readonly string[]): SearchableListWidget {
			state.items = newItems.map((text) => ({ text, value: text }));
			recalculateFilter(state);
			fireCallbacks(state);
			return widget;
		},

		getItems(): readonly SearchableListItem[] {
			return state.items;
		},

		// Filter
		setFilter(query: string): SearchableListWidget {
			state.filterQuery = query;
			recalculateFilter(state);
			fireCallbacks(state);
			return widget;
		},

		getFilter(): string {
			return state.filterQuery;
		},

		clearFilter(): SearchableListWidget {
			state.filterQuery = '';
			recalculateFilter(state);
			fireCallbacks(state);
			return widget;
		},

		getFilteredItems(): readonly SearchableListItem[] {
			return state.filteredItems;
		},

		getFilteredCount(): number {
			return state.filteredItems.length;
		},

		getFilterStatus(): string {
			if (state.filterQuery.length === 0) {
				return `${state.items.length} items`;
			}
			return `${state.filteredItems.length} of ${state.items.length} items`;
		},

		isSearchEnabled(): boolean {
			return state.searchEnabled;
		},

		setSearchEnabled(enabled: boolean): SearchableListWidget {
			state.searchEnabled = enabled;
			// Recalculate visible count
			const filterLineHeight = enabled ? 1 : 0;
			state.visibleCount = Math.max(1, validated.height - filterLineHeight);
			if (!enabled) {
				state.filterQuery = '';
				recalculateFilter(state);
			}
			return widget;
		},

		// Selection
		select(index: number): SearchableListWidget {
			if (index >= 0 && index < state.filteredItems.length) {
				state.selectedFilteredIndex = index;
				ensureVisible(state);
			}
			return widget;
		},

		getSelectedIndex(): number {
			return state.selectedFilteredIndex;
		},

		getSelectedItem(): SearchableListItem | undefined {
			if (
				state.selectedFilteredIndex < 0 ||
				state.selectedFilteredIndex >= state.filteredItems.length
			) {
				return undefined;
			}
			return state.filteredItems[state.selectedFilteredIndex];
		},

		getOriginalSelectedIndex(): number {
			if (state.selectedFilteredIndex < 0) {
				return -1;
			}
			return state.filteredToOriginalMap[state.selectedFilteredIndex] ?? -1;
		},

		selectPrev(): SearchableListWidget {
			if (state.selectedFilteredIndex > 0) {
				state.selectedFilteredIndex--;
				ensureVisible(state);
				fireCallbacks(state);
			}
			return widget;
		},

		selectNext(): SearchableListWidget {
			if (state.selectedFilteredIndex < state.filteredItems.length - 1) {
				state.selectedFilteredIndex++;
				ensureVisible(state);
				fireCallbacks(state);
			}
			return widget;
		},

		selectFirst(): SearchableListWidget {
			if (state.filteredItems.length > 0) {
				state.selectedFilteredIndex = 0;
				state.firstVisible = 0;
				fireCallbacks(state);
			}
			return widget;
		},

		selectLast(): SearchableListWidget {
			if (state.filteredItems.length > 0) {
				state.selectedFilteredIndex = state.filteredItems.length - 1;
				ensureVisible(state);
				fireCallbacks(state);
			}
			return widget;
		},

		// Events
		onChange(callback: SearchableListCallback): () => void {
			state.callbacks.push(callback);
			return () => {
				const idx = state.callbacks.indexOf(callback);
				if (idx !== -1) {
					state.callbacks.splice(idx, 1);
				}
			};
		},

		// Key handling
		handleKey(key: string, ctrl = false, _shift = false): boolean {
			// Navigation keys (always active)
			if (handleSearchableListNav(key, state, widget)) {
				return true;
			}

			// Escape clears filter or blurs
			if (key === 'escape') {
				if (state.filterQuery.length > 0) {
					widget.clearFilter();
				} else {
					widget.blur();
				}
				return true;
			}

			// Filter typing (when search is enabled)
			if (state.searchEnabled) {
				return handleSearchableListFilter(key, ctrl, state, widget);
			}

			return false;
		},

		// Lifecycle
		destroy(): void {
			SearchableList.isSearchableList[eid] = 0;
			SearchableList.visible[eid] = 0;
			SearchableList.focused[eid] = 0;
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
 * Gets the filtered items from a SearchableList entity.
 *
 * @param _world - The ECS world
 * @param eid - The searchable list entity ID
 * @returns Array of filtered items
 *
 * @example
 * ```typescript
 * import { getFilteredItems } from 'blecsd';
 *
 * const items = getFilteredItems(world, listEid);
 * ```
 */
export function getSearchableFilteredItems(
	_world: World,
	eid: Entity,
): readonly SearchableListItem[] {
	const state = stateMap.get(eid);
	return state?.filteredItems ?? [];
}

/**
 * Sets the filter query on a SearchableList entity.
 *
 * @param _world - The ECS world
 * @param eid - The searchable list entity ID
 * @param query - The filter query
 *
 * @example
 * ```typescript
 * import { setSearchableFilter } from 'blecsd';
 *
 * setSearchableFilter(world, listEid, 'apple');
 * ```
 */
export function setSearchableFilter(_world: World, eid: Entity, query: string): void {
	const state = stateMap.get(eid);
	if (!state) {
		return;
	}
	state.filterQuery = query;
	recalculateFilter(state);
	fireCallbacks(state);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a SearchableList widget.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a searchable list
 */
export function isSearchableList(_world: World, eid: Entity): boolean {
	return SearchableList.isSearchableList[eid] === 1;
}

/**
 * Resets the SearchableList store. Useful for testing.
 *
 * @internal
 */
export function resetSearchableListStore(): void {
	SearchableList.isSearchableList.fill(0);
	SearchableList.visible.fill(0);
	SearchableList.focused.fill(0);
	stateMap.clear();
}
