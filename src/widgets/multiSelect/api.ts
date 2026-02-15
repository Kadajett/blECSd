/**
 * Multi-Select Widget API
 *
 * Standalone API functions for working with MultiSelect widgets.
 *
 * @module widgets/multiSelect/api
 */

import type { Entity, World } from '../../core/types';
import { MultiSelect, stateMap } from './state';
import type { MultiSelectItem, SelectionChangeCallback } from './types';

// =============================================================================
// STANDALONE API FUNCTIONS
// =============================================================================

/**
 * Gets the selected items from a MultiSelect entity.
 *
 * @param _world - The ECS world
 * @param eid - The multi-select entity ID
 * @returns Array of selected items, or empty array if not a multi-select
 *
 * @example
 * ```typescript
 * import { getSelectedItems } from 'blecsd';
 *
 * const items = getSelectedItems(world, multiSelectEid);
 * console.log(items.map(i => i.text));
 * ```
 */
export function getSelectedItems(_world: World, eid: Entity): readonly MultiSelectItem[] {
	const state = stateMap.get(eid);
	if (!state) {
		return [];
	}
	return Array.from(state.selected)
		.sort((a, b) => a - b)
		.map((i) => state.items[i])
		.filter((item): item is MultiSelectItem => item !== undefined);
}

/**
 * Registers a callback for when the selection changes on a MultiSelect entity.
 *
 * @param _world - The ECS world
 * @param eid - The multi-select entity ID
 * @param callback - The callback to fire on selection change
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * import { onSelectionChange } from 'blecsd';
 *
 * const unsub = onSelectionChange(world, msEid, (indices, items) => {
 *   console.log(`${items.length} items selected`);
 * });
 *
 * // Later: unsub();
 * ```
 */
export function onSelectionChange(
	_world: World,
	eid: Entity,
	callback: SelectionChangeCallback,
): () => void {
	const state = stateMap.get(eid);
	if (!state) {
		return () => {};
	}

	state.selectionCallbacks.push(callback);
	return () => {
		const idx = state.selectionCallbacks.indexOf(callback);
		if (idx !== -1) {
			state.selectionCallbacks.splice(idx, 1);
		}
	};
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a MultiSelect widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a multi-select widget
 */
export function isMultiSelect(_world: World, eid: Entity): boolean {
	return MultiSelect.isMultiSelect[eid] === 1;
}

/**
 * Resets the MultiSelect component store. Useful for testing.
 *
 * @internal
 */
export function resetMultiSelectStore(): void {
	MultiSelect.isMultiSelect.fill(0);
	MultiSelect.visible.fill(0);
	MultiSelect.focused.fill(0);
	stateMap.clear();
}
