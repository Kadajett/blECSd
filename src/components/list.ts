/**
 * List Component
 *
 * Provides list/item selection functionality with keyboard and mouse support.
 *
 * @module components/list
 */

import type { StateMachineConfig } from '../core/stateMachine';
import type { Entity, World } from '../core/types';
import { markDirty } from './renderable';
import { attachStateMachine, getState, hasStateMachine, sendEvent } from './stateMachine';

// =============================================================================
// TYPES
// =============================================================================

/**
 * List state type.
 */
export type ListState = 'idle' | 'focused' | 'selecting' | 'searching' | 'disabled';

/**
 * List event type.
 */
export type ListEvent =
	| 'focus'
	| 'blur'
	| 'startSelect'
	| 'endSelect'
	| 'startSearch'
	| 'endSearch'
	| 'disable'
	| 'enable';

/**
 * List item data.
 */
export interface ListItem {
	/** Display text */
	readonly text: string;
	/** Optional value associated with the item */
	readonly value?: string;
	/** Whether the item is disabled */
	readonly disabled?: boolean;
}

/**
 * List store for managing list-specific data.
 */
export interface ListStore {
	/** Whether entity is a list */
	isList: Uint8Array;
	/** Currently selected index (-1 if none) */
	selectedIndex: Int32Array;
	/** Number of items in the list */
	itemCount: Uint32Array;
	/** First visible item index (for virtualization) */
	firstVisible: Uint32Array;
	/** Number of visible items */
	visibleCount: Uint32Array;
	/** Whether list is interactive */
	interactive: Uint8Array;
	/** Whether list responds to mouse */
	mouse: Uint8Array;
	/** Whether list responds to keyboard */
	keys: Uint8Array;
	/** Whether search mode is enabled */
	searchEnabled: Uint8Array;
	/** Total item count for virtualized lists (may be > itemCount) */
	totalCount: Uint32Array;
	/** Whether items are currently loading */
	isLoading: Uint8Array;
}

/**
 * Lazy load callback for virtualized lists.
 * Called when items need to be loaded for a range.
 *
 * @param startIndex - First item index to load
 * @param count - Number of items to load
 * @returns Promise that resolves when items are loaded
 */
export type ListLazyLoadCallback = (startIndex: number, count: number) => Promise<ListItem[]>;

/**
 * Scroll event callback for infinite scroll detection.
 *
 * @param scrollInfo - Information about current scroll state
 */
export type ListScrollCallback = (scrollInfo: ListScrollInfo) => void;

/**
 * Scroll information for infinite scroll.
 */
export interface ListScrollInfo {
	/** First visible item index */
	readonly firstVisible: number;
	/** Number of visible items */
	readonly visibleCount: number;
	/** Total loaded items */
	readonly loadedCount: number;
	/** Total items (may be larger than loaded for infinite scroll) */
	readonly totalCount: number;
	/** Whether we're near the end (within threshold) */
	readonly nearEnd: boolean;
	/** Whether we're near the start (within threshold) */
	readonly nearStart: boolean;
}

/**
 * List display configuration.
 */
export interface ListDisplay {
	/** Character shown before selected item */
	readonly selectedPrefix: string;
	/** Character shown before unselected items */
	readonly unselectedPrefix: string;
	/** Selected item foreground color */
	readonly selectedFg: number;
	/** Selected item background color */
	readonly selectedBg: number;
	/** Item foreground color */
	readonly itemFg: number;
	/** Item background color */
	readonly itemBg: number;
	/** Disabled item foreground color */
	readonly disabledFg: number;
}

/**
 * List display options for configuration.
 */
export interface ListDisplayOptions {
	selectedPrefix?: string;
	unselectedPrefix?: string;
	selectedFg?: number;
	selectedBg?: number;
	itemFg?: number;
	itemBg?: number;
	disabledFg?: number;
}

/**
 * List selection callback function type.
 */
export type ListSelectCallback = (index: number, item: ListItem) => void;

/**
 * List action returned from key press handling.
 */
export type ListAction =
	| { type: 'selectPrev' }
	| { type: 'selectNext' }
	| { type: 'selectFirst' }
	| { type: 'selectLast' }
	| { type: 'pageUp' }
	| { type: 'pageDown' }
	| { type: 'confirm' }
	| { type: 'cancel' }
	| { type: 'startSearch' }
	| { type: 'endSearch' }
	| { type: 'searchChar'; char: string }
	| { type: 'searchBackspace' }
	| { type: 'searchNextMatch' };

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default selected prefix character */
export const DEFAULT_SELECTED_PREFIX = '> ';

/** Default unselected prefix character */
export const DEFAULT_UNSELECTED_PREFIX = '  ';

/** Default selected foreground color */
export const DEFAULT_SELECTED_FG = 0xffffffff;

/** Default selected background color */
export const DEFAULT_SELECTED_BG = 0x0066ffff;

/** Default item foreground color */
export const DEFAULT_ITEM_FG = 0xccccccff;

/** Default item background color */
export const DEFAULT_ITEM_BG = 0x000000ff;

/** Default disabled foreground color */
export const DEFAULT_DISABLED_FG = 0x666666ff;

/** Maximum entities supported */
const MAX_ENTITIES = 10000;

// =============================================================================
// STORES
// =============================================================================

/**
 * Store for list component data.
 */
export const listStore: ListStore = {
	isList: new Uint8Array(MAX_ENTITIES),
	selectedIndex: new Int32Array(MAX_ENTITIES).fill(-1),
	itemCount: new Uint32Array(MAX_ENTITIES),
	firstVisible: new Uint32Array(MAX_ENTITIES),
	visibleCount: new Uint32Array(MAX_ENTITIES),
	interactive: new Uint8Array(MAX_ENTITIES),
	mouse: new Uint8Array(MAX_ENTITIES),
	keys: new Uint8Array(MAX_ENTITIES),
	searchEnabled: new Uint8Array(MAX_ENTITIES),
	totalCount: new Uint32Array(MAX_ENTITIES),
	isLoading: new Uint8Array(MAX_ENTITIES),
};

/** Store for list items */
const itemsStore = new Map<Entity, ListItem[]>();

/** Store for lazy load callbacks */
const lazyLoadCallbacks = new Map<Entity, ListLazyLoadCallback>();

/** Store for scroll callbacks */
const scrollCallbacks = new Map<Entity, Set<ListScrollCallback>>();

/** Store for loading placeholder text */
const loadingPlaceholderStore = new Map<Entity, string>();

/** Default loading placeholder */
const DEFAULT_LOADING_PLACEHOLDER = 'Loading...';

/** Store for list display configuration */
const displayStore = new Map<Entity, ListDisplay>();

/** Store for list select callbacks */
const selectCallbacks = new Map<Entity, ListSelectCallback[]>();

/** Store for list item activate callbacks */
const activateCallbacks = new Map<Entity, ListSelectCallback[]>();

/** Store for search query text */
const searchQueryStore = new Map<Entity, string>();

/** Store for search change callbacks */
const searchChangeCallbacks = new Map<Entity, Array<(query: string) => void>>();

// =============================================================================
// STATE MACHINE CONFIG
// =============================================================================

/**
 * State machine configuration for list widgets.
 *
 * States:
 * - idle: List is not focused
 * - focused: List has focus, ready for navigation
 * - selecting: User is actively selecting (e.g., during mouse drag)
 * - searching: User is typing to search/filter items
 * - disabled: List is disabled and cannot be interacted with
 */
export const LIST_STATE_MACHINE_CONFIG: StateMachineConfig<ListState, ListEvent> = {
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
				startSelect: 'selecting',
				startSearch: 'searching',
				disable: 'disabled',
			},
		},
		selecting: {
			on: {
				endSelect: 'focused',
				blur: 'idle',
				disable: 'disabled',
			},
		},
		searching: {
			on: {
				endSearch: 'focused',
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
 * Attaches list behavior to an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param items - Initial items
 * @param options - List options
 *
 * @example
 * ```typescript
 * import { attachListBehavior } from 'blecsd';
 *
 * attachListBehavior(world, eid, [
 *   { text: 'Option 1', value: 'opt1' },
 *   { text: 'Option 2', value: 'opt2' },
 * ], { interactive: true, keys: true });
 * ```
 */
export function attachListBehavior(
	world: World,
	eid: Entity,
	items: ListItem[] = [],
	options: {
		interactive?: boolean;
		mouse?: boolean;
		keys?: boolean;
		search?: boolean;
		selectedIndex?: number;
		visibleCount?: number;
	} = {},
): void {
	listStore.isList[eid] = 1;
	listStore.selectedIndex[eid] = options.selectedIndex ?? -1;
	listStore.itemCount[eid] = items.length;
	listStore.firstVisible[eid] = 0;
	listStore.visibleCount[eid] = options.visibleCount ?? items.length;
	listStore.interactive[eid] = options.interactive !== false ? 1 : 0;
	listStore.mouse[eid] = options.mouse !== false ? 1 : 0;
	listStore.keys[eid] = options.keys !== false ? 1 : 0;
	listStore.searchEnabled[eid] = options.search === true ? 1 : 0;

	itemsStore.set(eid, [...items]);
	attachStateMachine(world, eid, LIST_STATE_MACHINE_CONFIG);
}

/**
 * Checks if an entity is a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is a list
 */
export function isList(world: World, eid: Entity): boolean {
	return listStore.isList[eid] === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current state of a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current state
 */
export function getListState(world: World, eid: Entity): ListState {
	return (getState(world, eid) as ListState) ?? 'idle';
}

/**
 * Checks if list is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param state - The state to check
 * @returns true if list is in the specified state
 */
export function isListInState(world: World, eid: Entity, state: ListState): boolean {
	return getListState(world, eid) === state;
}

/**
 * Checks if list is focused.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if list is focused
 */
export function isListFocused(world: World, eid: Entity): boolean {
	const state = getListState(world, eid);
	return state === 'focused' || state === 'selecting';
}

/**
 * Checks if list is disabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if list is disabled
 */
export function isListDisabled(world: World, eid: Entity): boolean {
	return isListInState(world, eid, 'disabled');
}

/**
 * Sends an event to the list state machine.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param event - The event to send
 * @returns true if transition occurred
 */
export function sendListEvent(world: World, eid: Entity, event: ListEvent): boolean {
	if (!isList(world, eid)) {
		return false;
	}

	const result = sendEvent(world, eid, event);
	if (result) {
		markDirty(world, eid);
	}
	return result;
}

/**
 * Focuses the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if focused successfully
 */
export function focusList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'focus');
}

/**
 * Blurs the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if blurred successfully
 */
export function blurList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'blur');
}

/**
 * Disables the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if disabled successfully
 */
export function disableList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'disable');
}

/**
 * Enables the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if enabled successfully
 */
export function enableList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'enable');
}

// =============================================================================
// ITEM MANAGEMENT
// =============================================================================

/**
 * Gets all items from a list.
 *
 * @param eid - The entity ID
 * @returns Array of list items
 */
export function getItems(eid: Entity): readonly ListItem[] {
	return itemsStore.get(eid) ?? [];
}

/**
 * Sets all items in a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param items - The items to set
 */
export function setItems(world: World, eid: Entity, items: ListItem[]): void {
	itemsStore.set(eid, [...items]);
	listStore.itemCount[eid] = items.length;

	// Reset selection if out of bounds
	const selectedIndex = listStore.selectedIndex[eid] ?? -1;
	if (selectedIndex >= items.length) {
		listStore.selectedIndex[eid] = items.length > 0 ? items.length - 1 : -1;
	}

	// Reset first visible if out of bounds
	const firstVisible = listStore.firstVisible[eid] ?? 0;
	if (firstVisible >= items.length) {
		listStore.firstVisible[eid] = Math.max(0, items.length - 1);
	}

	markDirty(world, eid);
}

/**
 * Adds an item to the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param item - The item to add
 * @param index - Optional index to insert at (defaults to end)
 */
export function addItem(world: World, eid: Entity, item: ListItem, index?: number): void {
	const items = itemsStore.get(eid) ?? [];
	const insertIndex = index ?? items.length;

	items.splice(insertIndex, 0, item);
	itemsStore.set(eid, items);
	listStore.itemCount[eid] = items.length;

	// Adjust selection if inserting before it
	const selectedIndex = listStore.selectedIndex[eid] ?? -1;
	if (selectedIndex >= 0 && insertIndex <= selectedIndex) {
		listStore.selectedIndex[eid] = selectedIndex + 1;
	}

	markDirty(world, eid);
}

/**
 * Removes an item from the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The index to remove
 * @returns The removed item or undefined
 */
export function removeItem(world: World, eid: Entity, index: number): ListItem | undefined {
	const items = itemsStore.get(eid) ?? [];
	if (index < 0 || index >= items.length) {
		return undefined;
	}

	const removed = items.splice(index, 1)[0];
	listStore.itemCount[eid] = items.length;

	// Adjust selection
	const selectedIndex = listStore.selectedIndex[eid] ?? -1;
	if (selectedIndex >= 0) {
		if (index < selectedIndex) {
			listStore.selectedIndex[eid] = selectedIndex - 1;
		} else if (index === selectedIndex) {
			// Selection was removed
			listStore.selectedIndex[eid] = items.length > 0 ? Math.min(index, items.length - 1) : -1;
		}
	}

	markDirty(world, eid);
	return removed;
}

/**
 * Gets an item by index.
 *
 * @param eid - The entity ID
 * @param index - The item index
 * @returns The item or undefined
 */
export function getItem(eid: Entity, index: number): ListItem | undefined {
	const items = itemsStore.get(eid);
	return items?.[index];
}

/**
 * Updates an item at a specific index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The item index
 * @param item - The new item data
 * @returns true if updated successfully
 */
export function updateItem(world: World, eid: Entity, index: number, item: ListItem): boolean {
	const items = itemsStore.get(eid);
	if (!items || index < 0 || index >= items.length) {
		return false;
	}

	items[index] = item;
	markDirty(world, eid);
	return true;
}

/**
 * Gets the number of items in the list.
 *
 * @param eid - The entity ID
 * @returns Number of items
 */
export function getItemCount(eid: Entity): number {
	return listStore.itemCount[eid] ?? 0;
}

/**
 * Clears all items from the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearItems(world: World, eid: Entity): void {
	itemsStore.set(eid, []);
	listStore.itemCount[eid] = 0;
	listStore.selectedIndex[eid] = -1;
	listStore.firstVisible[eid] = 0;
	markDirty(world, eid);
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
	return listStore.selectedIndex[eid] ?? -1;
}

/**
 * Gets the selected item.
 *
 * @param eid - The entity ID
 * @returns Selected item or undefined
 */
export function getSelectedItem(eid: Entity): ListItem | undefined {
	const index = listStore.selectedIndex[eid] ?? -1;
	if (index < 0) {
		return undefined;
	}
	return getItem(eid, index);
}

/**
 * Sets the selected index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The index to select (-1 to clear)
 * @returns true if selection changed
 */
/** Validate and check if index can be selected */
function canSelectIndex(eid: Entity, index: number, itemCount: number): boolean {
	if (index < -1 || index >= itemCount) return false;
	if (index < 0) return true;

	const item = getItem(eid, index);
	return !item?.disabled;
}

/** Fire select callbacks for a given index */
function fireSelectCallbacks(eid: Entity, index: number): void {
	if (index < 0) return;

	const item = getItem(eid, index);
	if (!item) return;

	const callbacks = selectCallbacks.get(eid);
	if (!callbacks) return;

	for (const cb of callbacks) {
		cb(index, item);
	}
}

export function setSelectedIndex(world: World, eid: Entity, index: number): boolean {
	const itemCount = listStore.itemCount[eid] ?? 0;
	const currentIndex = listStore.selectedIndex[eid] ?? -1;

	if (!canSelectIndex(eid, index, itemCount)) return false;
	if (currentIndex === index) return false;

	listStore.selectedIndex[eid] = index;
	markDirty(world, eid);
	fireSelectCallbacks(eid, index);
	ensureVisible(world, eid, index);

	return true;
}

/**
 * Selects the previous item.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param wrap - Whether to wrap around (default: true)
 * @returns true if selection changed
 */
export function selectPrev(world: World, eid: Entity, wrap = true): boolean {
	const itemCount = listStore.itemCount[eid] ?? 0;
	if (itemCount === 0) {
		return false;
	}

	let index = listStore.selectedIndex[eid] ?? -1;
	const startIndex = index;

	// Find previous non-disabled item
	do {
		index--;
		if (index < 0) {
			if (wrap) {
				index = itemCount - 1;
			} else {
				return false;
			}
		}
		const item = getItem(eid, index);
		if (!item?.disabled) {
			return setSelectedIndex(world, eid, index);
		}
	} while (index !== startIndex);

	return false;
}

/**
 * Selects the next item.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param wrap - Whether to wrap around (default: true)
 * @returns true if selection changed
 */
export function selectNext(world: World, eid: Entity, wrap = true): boolean {
	const itemCount = listStore.itemCount[eid] ?? 0;
	if (itemCount === 0) {
		return false;
	}

	let index = listStore.selectedIndex[eid] ?? -1;
	const startIndex = index;

	// Find next non-disabled item
	do {
		index++;
		if (index >= itemCount) {
			if (wrap) {
				index = 0;
			} else {
				return false;
			}
		}
		const item = getItem(eid, index);
		if (!item?.disabled) {
			return setSelectedIndex(world, eid, index);
		}
	} while (index !== startIndex);

	return false;
}

/**
 * Selects the first item.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if selection changed
 */
export function selectFirst(world: World, eid: Entity): boolean {
	const itemCount = listStore.itemCount[eid] ?? 0;
	for (let i = 0; i < itemCount; i++) {
		const item = getItem(eid, i);
		if (!item?.disabled) {
			return setSelectedIndex(world, eid, i);
		}
	}
	return false;
}

/**
 * Selects the last item.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if selection changed
 */
export function selectLast(world: World, eid: Entity): boolean {
	const itemCount = listStore.itemCount[eid] ?? 0;
	for (let i = itemCount - 1; i >= 0; i--) {
		const item = getItem(eid, i);
		if (!item?.disabled) {
			return setSelectedIndex(world, eid, i);
		}
	}
	return false;
}

/**
 * Selects an item by value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - The value to select
 * @returns true if selection changed
 */
export function selectByValue(world: World, eid: Entity, value: string): boolean {
	const items = itemsStore.get(eid) ?? [];
	const index = items.findIndex((item) => item.value === value);
	if (index >= 0) {
		return setSelectedIndex(world, eid, index);
	}
	return false;
}

/**
 * Clears the selection.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearSelection(world: World, eid: Entity): void {
	setSelectedIndex(world, eid, -1);
}

/**
 * Activates (confirms) the currently selected item.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if an item was activated
 */
export function activateSelected(_world: World, eid: Entity): boolean {
	const index = listStore.selectedIndex[eid] ?? -1;
	if (index < 0) {
		return false;
	}

	const item = getItem(eid, index);
	if (!item || item.disabled) {
		return false;
	}

	// Fire activate callbacks
	const callbacks = activateCallbacks.get(eid);
	if (callbacks) {
		for (const cb of callbacks) {
			cb(index, item);
		}
	}

	return true;
}

// =============================================================================
// VIRTUALIZATION
// =============================================================================

/**
 * Gets the first visible item index.
 *
 * @param eid - The entity ID
 * @returns First visible index
 */
export function getFirstVisible(eid: Entity): number {
	return listStore.firstVisible[eid] ?? 0;
}

/**
 * Sets the first visible item index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The first visible index
 */
export function setFirstVisible(world: World, eid: Entity, index: number): void {
	const itemCount = listStore.itemCount[eid] ?? 0;
	const totalCount = listStore.totalCount[eid] ?? itemCount;
	const maxIndex = Math.max(0, Math.max(itemCount, totalCount) - 1);
	const clamped = Math.max(0, Math.min(index, maxIndex));
	listStore.firstVisible[eid] = clamped;
	markDirty(world, eid);
	notifyScrollCallbacks(eid);
}

/**
 * Gets the number of visible items.
 *
 * @param eid - The entity ID
 * @returns Number of visible items
 */
export function getVisibleCount(eid: Entity): number {
	return listStore.visibleCount[eid] ?? 0;
}

/**
 * Sets the number of visible items.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param count - The number of visible items
 */
export function setVisibleCount(world: World, eid: Entity, count: number): void {
	listStore.visibleCount[eid] = Math.max(1, count);
	markDirty(world, eid);
}

/**
 * Ensures an index is visible by scrolling if necessary.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The index to make visible
 */
export function ensureVisible(world: World, eid: Entity, index: number): void {
	if (index < 0) {
		return;
	}

	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? 0;
	const lastVisible = firstVisible + visibleCount - 1;

	if (index < firstVisible) {
		setFirstVisible(world, eid, index);
	} else if (index > lastVisible) {
		setFirstVisible(world, eid, index - visibleCount + 1);
	}
}

/**
 * Scrolls the list by a page (visibleCount items).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param direction - 1 for down, -1 for up
 * @returns true if scrolled
 */
export function scrollPage(world: World, eid: Entity, direction: 1 | -1): boolean {
	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? 0;
	const itemCount = listStore.itemCount[eid] ?? 0;

	const newFirst = firstVisible + direction * visibleCount;
	if (newFirst < 0 || newFirst >= itemCount) {
		return false;
	}

	setFirstVisible(world, eid, newFirst);

	// Also move selection
	const selectedIndex = listStore.selectedIndex[eid] ?? -1;
	if (selectedIndex >= 0) {
		const newSelected = selectedIndex + direction * visibleCount;
		setSelectedIndex(world, eid, Math.max(0, Math.min(newSelected, itemCount - 1)));
	}

	return true;
}

/**
 * Gets the visible items for rendering.
 *
 * @param eid - The entity ID
 * @returns Array of visible items with their indices
 */
export function getVisibleItems(eid: Entity): Array<{ index: number; item: ListItem }> {
	const items = itemsStore.get(eid) ?? [];
	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? items.length;

	const result: Array<{ index: number; item: ListItem }> = [];
	for (let i = 0; i < visibleCount && firstVisible + i < items.length; i++) {
		const index = firstVisible + i;
		const item = items[index];
		if (item) {
			result.push({ index, item });
		}
	}
	return result;
}

// =============================================================================
// VIRTUALIZATION
// =============================================================================

/**
 * Sets the total item count for virtualized lists.
 * This can be larger than the actual loaded items count for infinite scroll.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param count - Total item count
 */
export function setTotalCount(world: World, eid: Entity, count: number): void {
	listStore.totalCount[eid] = count;
	markDirty(world, eid);
}

/**
 * Gets the total item count (may be larger than loaded items).
 *
 * @param eid - The entity ID
 * @returns Total item count
 */
export function getTotalCount(eid: Entity): number {
	const total = listStore.totalCount[eid] ?? 0;
	// If totalCount is 0 (not explicitly set), fall back to itemCount
	if (total === 0) {
		return listStore.itemCount[eid] ?? 0;
	}
	return total;
}

/**
 * Sets the lazy load callback for loading items on demand.
 *
 * @param eid - The entity ID
 * @param callback - Callback function to load items
 */
export function setLazyLoadCallback(eid: Entity, callback: ListLazyLoadCallback): void {
	lazyLoadCallbacks.set(eid, callback);
}

/**
 * Gets the lazy load callback.
 *
 * @param eid - The entity ID
 * @returns Lazy load callback or undefined
 */
export function getLazyLoadCallback(eid: Entity): ListLazyLoadCallback | undefined {
	return lazyLoadCallbacks.get(eid);
}

/**
 * Clears the lazy load callback.
 *
 * @param eid - The entity ID
 */
export function clearLazyLoadCallback(eid: Entity): void {
	lazyLoadCallbacks.delete(eid);
}

/**
 * Registers a scroll callback for detecting scroll events.
 *
 * @param eid - The entity ID
 * @param callback - Callback function
 * @returns Unsubscribe function
 */
export function onListScroll(eid: Entity, callback: ListScrollCallback): () => void {
	let callbacks = scrollCallbacks.get(eid);
	if (!callbacks) {
		callbacks = new Set();
		scrollCallbacks.set(eid, callbacks);
	}
	callbacks.add(callback);
	return () => {
		callbacks?.delete(callback);
	};
}

/**
 * Notifies scroll callbacks of scroll state change.
 *
 * @param eid - The entity ID
 * @param threshold - Items from end to trigger nearEnd (default: visibleCount)
 */
function notifyScrollCallbacks(eid: Entity, threshold?: number): void {
	const callbacks = scrollCallbacks.get(eid);
	if (!callbacks || callbacks.size === 0) {
		return;
	}

	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? 0;
	const loadedCount = listStore.itemCount[eid] ?? 0;
	const totalCount = listStore.totalCount[eid] ?? loadedCount;
	const scrollThreshold = threshold ?? visibleCount;

	const info: ListScrollInfo = {
		firstVisible,
		visibleCount,
		loadedCount,
		totalCount,
		nearEnd: firstVisible + visibleCount >= loadedCount - scrollThreshold,
		nearStart: firstVisible <= scrollThreshold,
	};

	for (const callback of callbacks) {
		callback(info);
	}
}

/**
 * Sets the loading state for a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param loading - Whether items are loading
 */
export function setListLoading(world: World, eid: Entity, loading: boolean): void {
	listStore.isLoading[eid] = loading ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if a list is currently loading items.
 *
 * @param eid - The entity ID
 * @returns true if loading
 */
export function isListLoading(eid: Entity): boolean {
	return listStore.isLoading[eid] === 1;
}

/**
 * Sets the loading placeholder text.
 *
 * @param eid - The entity ID
 * @param text - Placeholder text to show while loading
 */
export function setLoadingPlaceholder(eid: Entity, text: string): void {
	loadingPlaceholderStore.set(eid, text);
}

/**
 * Gets the loading placeholder text.
 *
 * @param eid - The entity ID
 * @returns Loading placeholder text
 */
export function getLoadingPlaceholder(eid: Entity): string {
	return loadingPlaceholderStore.get(eid) ?? DEFAULT_LOADING_PLACEHOLDER;
}

/**
 * Loads items for a range using the lazy load callback.
 * Returns immediately if no callback is set or already loading.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param startIndex - First item to load
 * @param count - Number of items to load
 * @returns Promise that resolves when loading completes
 */
export async function loadItems(
	world: World,
	eid: Entity,
	startIndex: number,
	count: number,
): Promise<void> {
	const callback = lazyLoadCallbacks.get(eid);
	if (!callback) {
		return;
	}

	// Don't start another load if already loading
	if (listStore.isLoading[eid] === 1) {
		return;
	}

	setListLoading(world, eid, true);

	try {
		const newItems = await callback(startIndex, count);

		// Merge loaded items into the items store
		const items = itemsStore.get(eid) ?? [];

		// Ensure array is large enough
		while (items.length < startIndex + newItems.length) {
			items.push({ text: '', disabled: true });
		}

		// Insert loaded items
		for (let i = 0; i < newItems.length; i++) {
			const item = newItems[i];
			if (item) {
				items[startIndex + i] = item;
			}
		}

		itemsStore.set(eid, items);
		listStore.itemCount[eid] = items.length;
		markDirty(world, eid);
	} finally {
		setListLoading(world, eid, false);
	}
}

/**
 * Checks if items need to be loaded for the current visible range.
 *
 * @param eid - The entity ID
 * @returns Object with needsLoad flag and range to load
 */
export function checkNeedsLoad(eid: Entity): {
	needsLoad: boolean;
	startIndex: number;
	count: number;
} {
	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? 0;
	const totalCount = listStore.totalCount[eid] ?? 0;
	const items = itemsStore.get(eid) ?? [];

	// Check if we need to load items in the visible range
	const endVisible = Math.min(firstVisible + visibleCount, totalCount);

	for (let i = firstVisible; i < endVisible; i++) {
		const item = items[i];
		// Item is considered unloaded if it doesn't exist or has empty text
		if (!item || item.text === '') {
			return {
				needsLoad: true,
				startIndex: firstVisible,
				count: visibleCount,
			};
		}
	}

	return { needsLoad: false, startIndex: 0, count: 0 };
}

/**
 * Gets scroll info for the list.
 *
 * @param eid - The entity ID
 * @param threshold - Items from end to trigger nearEnd (default: visibleCount)
 * @returns Scroll information
 */
export function getScrollInfo(eid: Entity, threshold?: number): ListScrollInfo {
	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? 0;
	const loadedCount = listStore.itemCount[eid] ?? 0;
	const totalCount = getTotalCount(eid);
	const scrollThreshold = threshold ?? visibleCount;

	return {
		firstVisible,
		visibleCount,
		loadedCount,
		totalCount,
		nearEnd: firstVisible + visibleCount >= loadedCount - scrollThreshold,
		nearStart: firstVisible <= scrollThreshold,
	};
}

/**
 * Appends items to the list (useful for infinite scroll).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param newItems - Items to append
 */
export function appendItems(world: World, eid: Entity, newItems: readonly ListItem[]): void {
	const items = itemsStore.get(eid) ?? [];
	items.push(...newItems);
	itemsStore.set(eid, items);
	listStore.itemCount[eid] = items.length;
	markDirty(world, eid);
}

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Sets the list display configuration.
 *
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setListDisplay(eid: Entity, options: ListDisplayOptions): void {
	const existing = displayStore.get(eid);
	displayStore.set(eid, {
		selectedPrefix: options.selectedPrefix ?? existing?.selectedPrefix ?? DEFAULT_SELECTED_PREFIX,
		unselectedPrefix:
			options.unselectedPrefix ?? existing?.unselectedPrefix ?? DEFAULT_UNSELECTED_PREFIX,
		selectedFg: options.selectedFg ?? existing?.selectedFg ?? DEFAULT_SELECTED_FG,
		selectedBg: options.selectedBg ?? existing?.selectedBg ?? DEFAULT_SELECTED_BG,
		itemFg: options.itemFg ?? existing?.itemFg ?? DEFAULT_ITEM_FG,
		itemBg: options.itemBg ?? existing?.itemBg ?? DEFAULT_ITEM_BG,
		disabledFg: options.disabledFg ?? existing?.disabledFg ?? DEFAULT_DISABLED_FG,
	});
}

/**
 * Gets the list display configuration.
 *
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getListDisplay(eid: Entity): ListDisplay {
	return (
		displayStore.get(eid) ?? {
			selectedPrefix: DEFAULT_SELECTED_PREFIX,
			unselectedPrefix: DEFAULT_UNSELECTED_PREFIX,
			selectedFg: DEFAULT_SELECTED_FG,
			selectedBg: DEFAULT_SELECTED_BG,
			itemFg: DEFAULT_ITEM_FG,
			itemBg: DEFAULT_ITEM_BG,
			disabledFg: DEFAULT_DISABLED_FG,
		}
	);
}

/**
 * Clears the list display configuration.
 *
 * @param eid - The entity ID
 */
export function clearListDisplay(eid: Entity): void {
	displayStore.delete(eid);
}

// =============================================================================
// OPTIONS
// =============================================================================

/**
 * Checks if list is interactive.
 *
 * @param eid - The entity ID
 * @returns true if interactive
 */
export function isListInteractive(eid: Entity): boolean {
	return listStore.interactive[eid] === 1;
}

/**
 * Sets list interactive mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param interactive - Whether list is interactive
 */
export function setListInteractive(world: World, eid: Entity, interactive: boolean): void {
	listStore.interactive[eid] = interactive ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if list responds to mouse.
 *
 * @param eid - The entity ID
 * @returns true if mouse enabled
 */
export function isListMouseEnabled(eid: Entity): boolean {
	return listStore.mouse[eid] === 1;
}

/**
 * Sets list mouse mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param mouse - Whether mouse is enabled
 */
export function setListMouse(world: World, eid: Entity, mouse: boolean): void {
	listStore.mouse[eid] = mouse ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if list responds to keyboard.
 *
 * @param eid - The entity ID
 * @returns true if keys enabled
 */
export function isListKeysEnabled(eid: Entity): boolean {
	return listStore.keys[eid] === 1;
}

/**
 * Sets list keys mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param keys - Whether keys are enabled
 */
export function setListKeys(world: World, eid: Entity, keys: boolean): void {
	listStore.keys[eid] = keys ? 1 : 0;
	markDirty(world, eid);
}

// =============================================================================
// SEARCH MODE
// =============================================================================

/**
 * Checks if search mode is enabled for the list.
 *
 * @param eid - The entity ID
 * @returns true if search is enabled
 */
export function isListSearchEnabled(eid: Entity): boolean {
	return listStore.searchEnabled[eid] === 1;
}

/**
 * Sets whether search mode is enabled for the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param enabled - Whether search is enabled
 */
export function setListSearchEnabled(world: World, eid: Entity, enabled: boolean): void {
	listStore.searchEnabled[eid] = enabled ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if list is currently in search mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if list is in searching state
 */
export function isListSearching(world: World, eid: Entity): boolean {
	return isListInState(world, eid, 'searching');
}

/**
 * Starts search mode for the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if search mode was started
 */
export function startListSearch(world: World, eid: Entity): boolean {
	if (!isList(world, eid)) {
		return false;
	}
	if (!isListSearchEnabled(eid)) {
		return false;
	}

	const result = sendListEvent(world, eid, 'startSearch');
	if (result) {
		searchQueryStore.set(eid, '');
	}
	return result;
}

/**
 * Ends search mode for the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if search mode was ended
 */
export function endListSearch(world: World, eid: Entity): boolean {
	if (!isList(world, eid)) {
		return false;
	}

	const result = sendListEvent(world, eid, 'endSearch');
	if (result) {
		searchQueryStore.delete(eid);
	}
	return result;
}

/**
 * Gets the current search query.
 *
 * @param eid - The entity ID
 * @returns The current search query or empty string
 */
export function getListSearchQuery(eid: Entity): string {
	return searchQueryStore.get(eid) ?? '';
}

/**
 * Sets the search query and finds matching items.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param query - The search query
 * @returns true if a match was found and selected
 */
export function setListSearchQuery(world: World, eid: Entity, query: string): boolean {
	searchQueryStore.set(eid, query);
	markDirty(world, eid);

	// Fire callbacks
	const callbacks = searchChangeCallbacks.get(eid);
	if (callbacks) {
		for (const cb of callbacks) {
			cb(query);
		}
	}

	// Find and select first matching item
	if (query.length > 0) {
		return findAndSelectByText(world, eid, query);
	}
	return false;
}

/**
 * Appends a character to the search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param char - The character to append
 * @returns true if a match was found and selected
 */
export function appendToSearchQuery(world: World, eid: Entity, char: string): boolean {
	const current = searchQueryStore.get(eid) ?? '';
	return setListSearchQuery(world, eid, current + char);
}

/**
 * Removes the last character from the search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if a match was found and selected
 */
export function backspaceSearchQuery(world: World, eid: Entity): boolean {
	const current = searchQueryStore.get(eid) ?? '';
	if (current.length === 0) {
		return false;
	}
	return setListSearchQuery(world, eid, current.slice(0, -1));
}

/**
 * Clears the search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearSearchQuery(world: World, eid: Entity): void {
	setListSearchQuery(world, eid, '');
}

/**
 * Finds and selects the first item matching the text (case-insensitive).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text to search for
 * @returns true if a match was found and selected
 */
export function findAndSelectByText(world: World, eid: Entity, text: string): boolean {
	const items = itemsStore.get(eid) ?? [];
	const lowerText = text.toLowerCase();

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item && !item.disabled && item.text.toLowerCase().startsWith(lowerText)) {
			return setSelectedIndex(world, eid, i);
		}
	}
	return false;
}

/**
 * Finds the next item matching the current search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if a match was found and selected
 */
export function findNextMatch(world: World, eid: Entity): boolean {
	const query = searchQueryStore.get(eid);
	if (!query || query.length === 0) {
		return false;
	}

	const items = itemsStore.get(eid) ?? [];
	const currentIndex = listStore.selectedIndex[eid] ?? -1;
	const lowerQuery = query.toLowerCase();

	// Start searching from current index + 1
	for (let i = currentIndex + 1; i < items.length; i++) {
		const item = items[i];
		if (item && !item.disabled && item.text.toLowerCase().startsWith(lowerQuery)) {
			return setSelectedIndex(world, eid, i);
		}
	}

	// Wrap around to beginning
	for (let i = 0; i <= currentIndex; i++) {
		const item = items[i];
		if (item && !item.disabled && item.text.toLowerCase().startsWith(lowerQuery)) {
			return setSelectedIndex(world, eid, i);
		}
	}

	return false;
}

/**
 * Registers a callback for when search query changes.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onListSearchChange(eid, (query) => {
 *   console.log(`Search: ${query}`);
 * });
 * ```
 */
export function onListSearchChange(eid: Entity, callback: (query: string) => void): () => void {
	const callbacks = searchChangeCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	searchChangeCallbacks.set(eid, callbacks);

	return () => {
		const cbs = searchChangeCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Registers a callback for when selection changes.
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onListSelect(eid, (index, item) => {
 *   console.log(`Selected: ${item.text}`);
 * });
 * ```
 */
export function onListSelect(eid: Entity, callback: ListSelectCallback): () => void {
	const callbacks = selectCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	selectCallbacks.set(eid, callbacks);

	return () => {
		const cbs = selectCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Registers a callback for when an item is activated (confirmed).
 *
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onListActivate(eid, (index, item) => {
 *   console.log(`Activated: ${item.text}`);
 * });
 * ```
 */
export function onListActivate(eid: Entity, callback: ListSelectCallback): () => void {
	const callbacks = activateCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	activateCallbacks.set(eid, callbacks);

	return () => {
		const cbs = activateCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}

/**
 * Clears all callbacks for a list.
 *
 * @param eid - The entity ID
 */
export function clearListCallbacks(eid: Entity): void {
	selectCallbacks.delete(eid);
	activateCallbacks.delete(eid);
	searchChangeCallbacks.delete(eid);
}

// =============================================================================
// KEY HANDLING
// =============================================================================

/**
 * Handles key press for list widget.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param key - The key name
 * @returns Action to perform or null
 *
 * @example
 * ```typescript
 * const action = handleListKeyPress(world, eid, 'down');
 * if (action?.type === 'selectNext') {
 *   selectNext(world, eid);
 * }
 * ```
 */
export function handleListKeyPress(world: World, eid: Entity, key: string): ListAction | null {
	if (!isList(world, eid)) {
		return null;
	}

	if (isListDisabled(world, eid)) {
		return null;
	}

	if (!isListKeysEnabled(eid)) {
		return null;
	}

	// Handle search mode
	if (isListSearching(world, eid)) {
		return handleSearchModeKeyPress(key);
	}

	// Normal mode
	switch (key) {
		case 'up':
		case 'k':
			return { type: 'selectPrev' };

		case 'down':
		case 'j':
			return { type: 'selectNext' };

		case 'home':
		case 'g':
			return { type: 'selectFirst' };

		case 'end':
		case 'G':
			return { type: 'selectLast' };

		case 'pageup':
			return { type: 'pageUp' };

		case 'pagedown':
			return { type: 'pageDown' };

		case 'enter':
		case 'space':
			return { type: 'confirm' };

		case 'escape':
			return { type: 'cancel' };

		case '/':
			return { type: 'startSearch' };

		default:
			return null;
	}
}

/**
 * Handles key press in search mode.
 *
 * @param key - The key name
 * @returns Action to perform or null
 */
function handleSearchModeKeyPress(key: string): ListAction | null {
	switch (key) {
		case 'escape':
			return { type: 'endSearch' };

		case 'enter':
			return { type: 'endSearch' };

		case 'backspace':
			return { type: 'searchBackspace' };

		case 'up':
		case 'down':
			// Allow navigation to exit search
			return { type: 'endSearch' };

		case 'tab':
		case 'C-n': // Ctrl+N
			return { type: 'searchNextMatch' };

		default:
			// Single printable character
			if (key.length === 1 && key >= ' ') {
				return { type: 'searchChar', char: key };
			}
			return null;
	}
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Renders list items as strings for display.
 *
 * @param eid - The entity ID
 * @param width - Available width
 * @returns Array of rendered line strings
 */
export function renderListItems(eid: Entity, width: number): string[] {
	const display = getListDisplay(eid);
	const visibleItems = getVisibleItems(eid);
	const selectedIndex = listStore.selectedIndex[eid] ?? -1;
	const lines: string[] = [];

	for (const { index, item } of visibleItems) {
		const isSelected = index === selectedIndex;
		const prefix = isSelected ? display.selectedPrefix : display.unselectedPrefix;
		const text = item.text;

		// Truncate if needed
		const maxTextWidth = width - prefix.length;
		const truncatedText = text.length > maxTextWidth ? `${text.slice(0, maxTextWidth - 1)}…` : text;

		lines.push(prefix + truncatedText);
	}

	return lines;
}

// =============================================================================
// STORE RESET
// =============================================================================

/**
 * Resets the list store. Used for testing.
 */
export function resetListStore(): void {
	listStore.isList.fill(0);
	listStore.selectedIndex.fill(-1);
	listStore.itemCount.fill(0);
	listStore.firstVisible.fill(0);
	listStore.visibleCount.fill(0);
	listStore.interactive.fill(0);
	listStore.mouse.fill(0);
	listStore.keys.fill(0);
	listStore.searchEnabled.fill(0);
	listStore.totalCount.fill(0);
	listStore.isLoading.fill(0);
	itemsStore.clear();
	displayStore.clear();
	selectCallbacks.clear();
	activateCallbacks.clear();
	searchQueryStore.clear();
	searchChangeCallbacks.clear();
	lazyLoadCallbacks.clear();
	scrollCallbacks.clear();
	loadingPlaceholderStore.clear();
}
