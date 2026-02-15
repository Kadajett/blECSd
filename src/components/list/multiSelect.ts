/**
 * List Component Multi-Select
 *
 * @module components/list/multiSelect
 */

import type { Entity, World } from '../../core/types';
import { getItems } from './items';
import { multiSelectedStore, multiSelectStore } from './stores';

/**
 * Enables or disables multi-select mode for a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param enabled - Whether multi-select is enabled
 *
 * @example
 * ```typescript
 * setListMultiSelect(world, eid, true);
 * ```
 */
export function setListMultiSelect(_world: World, eid: Entity, enabled: boolean): void {
	multiSelectStore.set(eid, enabled);
	if (enabled && !multiSelectedStore.has(eid)) {
		multiSelectedStore.set(eid, new Set<number>());
	}
}

/**
 * Checks if a list has multi-select enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if multi-select is enabled
 */
export function isListMultiSelect(_world: World, eid: Entity): boolean {
	return multiSelectStore.get(eid) ?? false;
}

/**
 * Toggles selection of an item in multi-select mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The item index to toggle
 * @returns true if the item is now selected, false if deselected
 */
export function toggleMultiSelect(world: World, eid: Entity, index: number): boolean {
	if (!isListMultiSelect(world, eid)) {
		throw new Error('Multi-select is not enabled for this list');
	}

	const selected = multiSelectedStore.get(eid);
	if (!selected) {
		return false;
	}

	if (selected.has(index)) {
		selected.delete(index);
		return false;
	}

	selected.add(index);
	return true;
}

/**
 * Gets all selected indices in multi-select mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Array of selected indices
 */
export function getMultiSelected(world: World, eid: Entity): number[] {
	if (!isListMultiSelect(world, eid)) {
		throw new Error('Multi-select is not enabled for this list');
	}

	const selected = multiSelectedStore.get(eid);
	return selected ? Array.from(selected).sort((a, b) => a - b) : [];
}

/**
 * Selects all items in multi-select mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function selectAllItems(world: World, eid: Entity): void {
	if (!isListMultiSelect(world, eid)) {
		return;
	}

	const items = getItems(world, eid);
	const selected = multiSelectedStore.get(eid);
	if (selected) {
		selected.clear();
		for (let i = 0; i < items.length; i++) {
			selected.add(i);
		}
	}
}

/**
 * Deselects all items in multi-select mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function deselectAllItems(world: World, eid: Entity): void {
	if (!isListMultiSelect(world, eid)) {
		return;
	}

	const selected = multiSelectedStore.get(eid);
	if (selected) {
		selected.clear();
	}
}

/**
 * Checks if an item is selected in multi-select mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - The item index
 * @returns true if the item is selected
 */
export function isItemMultiSelected(world: World, eid: Entity, index: number): boolean {
	if (!isListMultiSelect(world, eid)) {
		return false;
	}

	const selected = multiSelectedStore.get(eid);
	return selected?.has(index) ?? false;
}
