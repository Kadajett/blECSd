/**
 * List Component Types
 *
 * @module components/list/types
 */

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
	| { type: 'toggleSelect' }
	| { type: 'startSearch' }
	| { type: 'endSearch' }
	| { type: 'searchChar'; char: string }
	| { type: 'searchBackspace' }
	| { type: 'searchNextMatch' };
