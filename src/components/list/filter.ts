/**
 * List Component Filter
 *
 * @module components/list/filter
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { getItems } from './items';
import { filteredItemsCache, filterStore, listStore } from './stores';
import type { ListItem } from './types';

/**
 * Sets a filter text to show only matching items.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param filterText - The filter text (case-insensitive substring match)
 *
 * @example
 * ```typescript
 * setListFilter(world, eid, 'app'); // Shows only items containing 'app'
 * ```
 */
export function setListFilter(world: World, eid: Entity, filterText: string): void {
	const filter = filterText.toLowerCase();
	filterStore.set(eid, filter);

	// Recalculate filtered items
	const allItems = getItems(eid);
	const filtered =
		filter === ''
			? [...allItems]
			: allItems.filter((item) => item.text.toLowerCase().includes(filter));

	filteredItemsCache.set(eid, filtered);

	// Reset selection to first visible item
	if (filtered.length > 0) {
		listStore.selectedIndex[eid] = 0;
	} else {
		listStore.selectedIndex[eid] = -1;
	}

	listStore.firstVisible[eid] = 0;
	markDirty(world, eid);
}

/**
 * Gets the current filter text.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns The current filter text
 */
export function getListFilter(_world: World, eid: Entity): string {
	return filterStore.get(eid) ?? '';
}

/**
 * Clears the filter, showing all items.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearListFilter(world: World, eid: Entity): void {
	filterStore.delete(eid);
	filteredItemsCache.delete(eid);
	listStore.firstVisible[eid] = 0;
	if (getItems(eid).length > 0) {
		listStore.selectedIndex[eid] = 0;
	}
	markDirty(world, eid);
}

/**
 * Gets the filtered (visible) items based on current filter.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns Array of filtered items
 */
export function getFilteredItems(_world: World, eid: Entity): readonly ListItem[] {
	const filter = filterStore.get(eid);
	if (filter === undefined || filter === '') {
		return getItems(eid);
	}

	const cached = filteredItemsCache.get(eid);
	if (cached) {
		return cached;
	}

	// Fallback: calculate on the fly
	const allItems = getItems(eid);
	const filtered = allItems.filter((item) =>
		item.text.toLowerCase().includes(filter.toLowerCase()),
	);
	filteredItemsCache.set(eid, filtered);
	return filtered;
}
