/**
 * List Component Store Reset (for testing)
 *
 * @module components/list/reset
 */

import {
	activateCallbacks,
	cancelCallbacks,
	displayStore,
	filteredItemsCache,
	filterStore,
	itemsStore,
	lazyLoadCallbacks,
	listStore,
	loadingPlaceholderStore,
	multiSelectedStore,
	multiSelectStore,
	scrollCallbacks,
	searchChangeCallbacks,
	searchQueryStore,
	selectCallbacks,
} from './stores';

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
	cancelCallbacks.clear();
	multiSelectStore.clear();
	multiSelectedStore.clear();
	filterStore.clear();
	filteredItemsCache.clear();
	searchQueryStore.clear();
	searchChangeCallbacks.clear();
	lazyLoadCallbacks.clear();
	scrollCallbacks.clear();
	loadingPlaceholderStore.clear();
}
