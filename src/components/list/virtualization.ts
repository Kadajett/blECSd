/**
 * List Component Virtualization
 *
 * @module components/list/virtualization
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { DEFAULT_LOADING_PLACEHOLDER } from './constants';
import {
	itemsStore,
	lazyLoadCallbacks,
	listStore,
	loadingPlaceholderStore,
	scrollCallbacks,
} from './stores';
import type { ListItem, ListScrollInfo } from './types';

/**
 * Gets the first visible item index.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns First visible index
 */
export function getFirstVisible(_world: World, eid: Entity): number {
	return listStore.firstVisible[eid] ?? 0;
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Number of visible items
 */
export function getVisibleCount(_world: World, eid: Entity): number {
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

// Store reference to setSelectedIndex to avoid circular dependency at module load time
let setSelectedIndexRef: ((world: World, eid: Entity, index: number) => boolean) | null = null;

/**
 * Sets the setSelectedIndex reference (called during module initialization).
 * This breaks the circular dependency between virtualization and selection modules.
 */
export function setSelectionRef(fn: (world: World, eid: Entity, index: number) => boolean): void {
	setSelectedIndexRef = fn;
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
	if (selectedIndex >= 0 && setSelectedIndexRef) {
		const newSelected = selectedIndex + direction * visibleCount;
		setSelectedIndexRef(world, eid, Math.max(0, Math.min(newSelected, itemCount - 1)));
	}

	return true;
}

/**
 * Gets the visible items for rendering.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Array of visible items with their indices
 */
export function getVisibleItems(
	_world: World,
	eid: Entity,
): Array<{ index: number; item: ListItem }> {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Total item count
 */
export function getTotalCount(_world: World, eid: Entity): number {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param callback - Callback function to load items
 */
export function setLazyLoadCallback(
	_world: World,
	eid: Entity,
	callback: (startIndex: number, count: number) => Promise<ListItem[]>,
): void {
	lazyLoadCallbacks.set(eid, callback);
}

/**
 * Gets the lazy load callback.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Lazy load callback or undefined
 */
export function getLazyLoadCallback(
	_world: World,
	eid: Entity,
): ((startIndex: number, count: number) => Promise<ListItem[]>) | undefined {
	return lazyLoadCallbacks.get(eid);
}

/**
 * Clears the lazy load callback.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 */
export function clearLazyLoadCallback(_world: World, eid: Entity): void {
	lazyLoadCallbacks.delete(eid);
}

/**
 * Registers a scroll callback for detecting scroll events.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param callback - Callback function
 * @returns Unsubscribe function
 */
export function onListScroll(
	_world: World,
	eid: Entity,
	callback: (scrollInfo: ListScrollInfo) => void,
): () => void {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns true if loading
 */
export function isListLoading(_world: World, eid: Entity): boolean {
	return listStore.isLoading[eid] === 1;
}

/**
 * Sets the loading placeholder text.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param text - Placeholder text to show while loading
 */
export function setLoadingPlaceholder(_world: World, eid: Entity, text: string): void {
	loadingPlaceholderStore.set(eid, text);
}

/**
 * Gets the loading placeholder text.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Loading placeholder text
 */
export function getLoadingPlaceholder(_world: World, eid: Entity): string {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Object with needsLoad flag and range to load
 */
export function checkNeedsLoad(
	_world: World,
	eid: Entity,
): {
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
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param threshold - Items from end to trigger nearEnd (default: visibleCount)
 * @returns Scroll information
 */
export function getScrollInfo(world: World, eid: Entity, threshold?: number): ListScrollInfo {
	const firstVisible = listStore.firstVisible[eid] ?? 0;
	const visibleCount = listStore.visibleCount[eid] ?? 0;
	const loadedCount = listStore.itemCount[eid] ?? 0;
	const totalCount = getTotalCount(world, eid);
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
