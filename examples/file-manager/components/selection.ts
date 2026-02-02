/**
 * Selection component for tracking selected items.
 * @module components/selection
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from 'blecsd';

/** Default entity capacity */
const DEFAULT_CAPACITY = 10000;

/**
 * Selection component for tracking the current selection in a list.
 *
 * - `currentIndex`: Currently focused item index (-1 = none)
 * - `anchorIndex`: Anchor for shift-select range (-1 = same as current)
 * - `selectionCount`: Number of selected items
 *
 * Note: Multi-select bitset is stored separately for efficiency.
 */
export const Selection = {
	/** Currently focused item index (-1 = none) */
	currentIndex: new Int32Array(DEFAULT_CAPACITY),
	/** Anchor index for shift-select (-1 = same as current) */
	anchorIndex: new Int32Array(DEFAULT_CAPACITY),
	/** Number of selected items */
	selectionCount: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Multi-select bitset storage.
 * Stored separately since bitecs doesn't support dynamic-sized arrays.
 */
class SelectionBitsetStore {
	private bitsets: Map<number, Set<number>> = new Map();

	/**
	 * Gets or creates the selection set for an entity.
	 */
	get(eid: Entity): Set<number> {
		let set = this.bitsets.get(eid);
		if (!set) {
			set = new Set();
			this.bitsets.set(eid, set);
		}
		return set;
	}

	/**
	 * Clears the selection set for an entity.
	 */
	clear(eid: Entity): void {
		this.bitsets.get(eid)?.clear();
	}

	/**
	 * Deletes the selection set for an entity.
	 */
	delete(eid: Entity): void {
		this.bitsets.delete(eid);
	}
}

/**
 * Global selection bitset store.
 */
export const selectionBitsetStore = new SelectionBitsetStore();

/**
 * Selection data returned by getSelection.
 */
export interface SelectionData {
	readonly currentIndex: number;
	readonly anchorIndex: number;
	readonly selectionCount: number;
}

/**
 * Initializes a Selection component with default values.
 */
function initSelection(eid: Entity): void {
	Selection.currentIndex[eid] = -1;
	Selection.anchorIndex[eid] = -1;
	Selection.selectionCount[eid] = 0;
	selectionBitsetStore.clear(eid);
}

/**
 * Ensures an entity has the Selection component.
 */
function ensureSelection(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Selection)) {
		addComponent(world, eid, Selection);
		initSelection(eid);
	}
}

/**
 * Sets up the Selection component on an entity.
 */
export function setSelection(world: World, eid: Entity, index = -1): Entity {
	ensureSelection(world, eid);
	Selection.currentIndex[eid] = index;
	Selection.anchorIndex[eid] = index;
	return eid;
}

/**
 * Gets the selection data for an entity.
 */
export function getSelection(world: World, eid: Entity): SelectionData | undefined {
	if (!hasComponent(world, eid, Selection)) {
		return undefined;
	}
	return {
		currentIndex: Selection.currentIndex[eid] as number,
		anchorIndex: Selection.anchorIndex[eid] as number,
		selectionCount: Selection.selectionCount[eid] as number,
	};
}

/**
 * Gets the current index.
 */
export function getCurrentIndex(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Selection)) {
		return -1;
	}
	return Selection.currentIndex[eid] as number;
}

/**
 * Sets the current index.
 */
export function setCurrentIndex(world: World, eid: Entity, index: number): Entity {
	ensureSelection(world, eid);
	Selection.currentIndex[eid] = index;
	return eid;
}

/**
 * Moves the selection by delta.
 */
export function moveSelection(world: World, eid: Entity, delta: number, maxIndex: number): Entity {
	ensureSelection(world, eid);
	const current = Selection.currentIndex[eid] as number;
	const newIndex = Math.max(0, Math.min(maxIndex, current + delta));
	Selection.currentIndex[eid] = newIndex;
	Selection.anchorIndex[eid] = newIndex;
	return eid;
}

/**
 * Moves the selection by delta, extending the range selection.
 */
export function extendSelection(world: World, eid: Entity, delta: number, maxIndex: number): Entity {
	ensureSelection(world, eid);
	const current = Selection.currentIndex[eid] as number;
	const newIndex = Math.max(0, Math.min(maxIndex, current + delta));
	Selection.currentIndex[eid] = newIndex;
	// Don't update anchor - keep it for range
	return eid;
}

/**
 * Moves to first item.
 */
export function selectFirst(world: World, eid: Entity): Entity {
	ensureSelection(world, eid);
	Selection.currentIndex[eid] = 0;
	Selection.anchorIndex[eid] = 0;
	return eid;
}

/**
 * Moves to last item.
 */
export function selectLast(world: World, eid: Entity, maxIndex: number): Entity {
	ensureSelection(world, eid);
	Selection.currentIndex[eid] = maxIndex;
	Selection.anchorIndex[eid] = maxIndex;
	return eid;
}

/**
 * Toggles selection of an item.
 */
export function toggleItemSelection(world: World, eid: Entity, index: number): Entity {
	ensureSelection(world, eid);
	const set = selectionBitsetStore.get(eid);

	if (set.has(index)) {
		set.delete(index);
	} else {
		set.add(index);
	}

	Selection.selectionCount[eid] = set.size;
	return eid;
}

/**
 * Checks if an item is selected.
 */
export function isItemSelected(world: World, eid: Entity, index: number): boolean {
	if (!hasComponent(world, eid, Selection)) {
		return false;
	}
	return selectionBitsetStore.get(eid).has(index);
}

/**
 * Selects all items up to maxIndex.
 */
export function selectAll(world: World, eid: Entity, maxIndex: number): Entity {
	ensureSelection(world, eid);
	const set = selectionBitsetStore.get(eid);
	set.clear();

	for (let i = 0; i <= maxIndex; i++) {
		set.add(i);
	}

	Selection.selectionCount[eid] = set.size;
	return eid;
}

/**
 * Clears all item selections.
 */
export function clearItemSelection(world: World, eid: Entity): Entity {
	ensureSelection(world, eid);
	selectionBitsetStore.clear(eid);
	Selection.selectionCount[eid] = 0;
	return eid;
}

/**
 * Selects a range from anchor to current.
 */
export function selectRange(world: World, eid: Entity): Entity {
	ensureSelection(world, eid);
	const current = Selection.currentIndex[eid] as number;
	const anchor = Selection.anchorIndex[eid] as number;
	const set = selectionBitsetStore.get(eid);

	const start = Math.min(current, anchor);
	const end = Math.max(current, anchor);

	for (let i = start; i <= end; i++) {
		set.add(i);
	}

	Selection.selectionCount[eid] = set.size;
	return eid;
}

/**
 * Gets all selected indices.
 */
export function getSelectedIndices(world: World, eid: Entity): number[] {
	if (!hasComponent(world, eid, Selection)) {
		return [];
	}
	return Array.from(selectionBitsetStore.get(eid)).sort((a, b) => a - b);
}

/**
 * Checks if entity has Selection component.
 */
export function hasSelection(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Selection);
}

/**
 * Clamps the current index to valid range.
 */
export function clampSelection(world: World, eid: Entity, maxIndex: number): Entity {
	if (!hasComponent(world, eid, Selection)) {
		return eid;
	}

	const current = Selection.currentIndex[eid] as number;
	if (current > maxIndex) {
		Selection.currentIndex[eid] = Math.max(0, maxIndex);
	}
	if (current < 0 && maxIndex >= 0) {
		Selection.currentIndex[eid] = 0;
	}

	return eid;
}
