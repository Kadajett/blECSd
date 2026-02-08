/**
 * List Component Selection Management
 *
 * @module components/list/selection
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { getItem } from './items';
import { activateCallbacks, itemsStore, listStore, selectCallbacks } from './stores';
import type { ListItem } from './types';
import { ensureVisible } from './virtualization';

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

/**
 * Sets the selected index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The index to select (-1 to clear)
 * @returns true if selection changed
 */
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
