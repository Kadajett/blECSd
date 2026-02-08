/**
 * List Component Stores
 *
 * @module components/list/stores
 */

import type { Entity } from '../../core/types';
import { createComponentStore } from '../../utils/componentStorage';
import { MAX_ENTITIES } from './constants';
import type {
	ListDisplay,
	ListItem,
	ListLazyLoadCallback,
	ListScrollCallback,
	ListSelectCallback,
	ListStore,
} from './types';

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

/**
 * Store for list items.
 * Uses iterable ComponentStore backed by PackedStore for cache-friendly
 * dense iteration when rendering all list entities.
 */
export const itemsStore = createComponentStore<ListItem[]>({ iterable: true });

/** Store for lazy load callbacks */
export const lazyLoadCallbacks = new Map<Entity, ListLazyLoadCallback>();

/** Store for scroll callbacks */
export const scrollCallbacks = new Map<Entity, Set<ListScrollCallback>>();

/** Store for loading placeholder text */
export const loadingPlaceholderStore = new Map<Entity, string>();

/** Store for list display configuration */
export const displayStore = new Map<Entity, ListDisplay>();

/** Store for list select callbacks */
export const selectCallbacks = new Map<Entity, ListSelectCallback[]>();

/** Store for list item activate callbacks */
export const activateCallbacks = new Map<Entity, ListSelectCallback[]>();

/** Store for search query text */
export const searchQueryStore = new Map<Entity, string>();

/** Store for search change callbacks */
export const searchChangeCallbacks = new Map<Entity, Array<(query: string) => void>>();

/** Store for cancel callbacks */
export const cancelCallbacks = new Map<Entity, Array<() => void>>();

/** Store for multi-select mode */
export const multiSelectStore = new Map<Entity, boolean>();

/** Store for selected indices in multi-select mode */
export const multiSelectedStore = new Map<Entity, Set<number>>();

/** Store for filter text */
export const filterStore = new Map<Entity, string>();

/** Store for filtered items cache */
export const filteredItemsCache = new Map<Entity, ListItem[]>();
