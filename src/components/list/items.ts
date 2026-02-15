/**
 * List Component Item Management
 *
 * @module components/list/items
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { itemsStore, listStore } from './stores';
import type { ListItem } from './types';

/**
 * Gets all items from a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Array of list items
 */
export function getItems(_world: World, eid: Entity): readonly ListItem[] {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param index - The item index
 * @returns The item or undefined
 */
export function getItem(_world: World, eid: Entity, index: number): ListItem | undefined {
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
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @returns Number of items
 */
export function getItemCount(_world: World, eid: Entity): number {
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
