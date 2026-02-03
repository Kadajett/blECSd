/**
 * Selection system for handling selection state changes.
 * @module systems/selectionSystem
 */

import type { Entity, World } from 'blecsd';
import {
	getCurrentIndex,
	moveSelection,
	extendSelection,
	selectFirst,
	selectLast,
	toggleItemSelection,
	selectAll,
	clearItemSelection,
	selectRange,
	clampSelection,
	setCurrentIndex,
	VirtualList,
	ensureIndexVisible,
	setTotalItems,
	hasVirtualList,
} from '../components';

/**
 * Selection action types.
 */
export type SelectionAction =
	| { type: 'move'; delta: number }
	| { type: 'extend'; delta: number }
	| { type: 'page'; direction: 1 | -1 }
	| { type: 'extendPage'; direction: 1 | -1 }
	| { type: 'first' }
	| { type: 'last' }
	| { type: 'toggle' }
	| { type: 'selectAll' }
	| { type: 'clearSelection' }
	| { type: 'click'; index: number }
	| { type: 'shiftClick'; index: number }
	| { type: 'ctrlClick'; index: number };

/**
 * Processes a selection action.
 *
 * @param world - ECS world
 * @param listEid - List entity with Selection and VirtualList components
 * @param action - The selection action to process
 * @param totalItems - Total number of items in the list
 * @returns true if selection changed
 */
export function processSelectionAction(
	world: World,
	listEid: Entity,
	action: SelectionAction,
	totalItems: number,
): boolean {
	const maxIndex = Math.max(0, totalItems - 1);
	const prevIndex = getCurrentIndex(world, listEid);

	// Update total items
	setTotalItems(world, listEid, totalItems);

	switch (action.type) {
		case 'move':
			moveSelection(world, listEid, action.delta, maxIndex);
			break;

		case 'extend':
			extendSelection(world, listEid, action.delta, maxIndex);
			selectRange(world, listEid);
			break;

		case 'page': {
			// Get page size from VirtualList component
			const pageSize = getPageSize(world, listEid);
			moveSelection(world, listEid, action.direction * pageSize, maxIndex);
			break;
		}

		case 'extendPage': {
			const pageSize = getPageSize(world, listEid);
			extendSelection(world, listEid, action.direction * pageSize, maxIndex);
			selectRange(world, listEid);
			break;
		}

		case 'first':
			selectFirst(world, listEid);
			break;

		case 'last':
			selectLast(world, listEid, maxIndex);
			break;

		case 'toggle': {
			const currentIndex = getCurrentIndex(world, listEid);
			if (currentIndex >= 0) {
				toggleItemSelection(world, listEid, currentIndex);
			}
			break;
		}

		case 'selectAll':
			selectAll(world, listEid, maxIndex);
			break;

		case 'clearSelection':
			clearItemSelection(world, listEid);
			break;

		case 'click':
			setCurrentIndex(world, listEid, Math.min(action.index, maxIndex));
			clearItemSelection(world, listEid);
			break;

		case 'shiftClick':
			setCurrentIndex(world, listEid, Math.min(action.index, maxIndex));
			selectRange(world, listEid);
			break;

		case 'ctrlClick':
			setCurrentIndex(world, listEid, Math.min(action.index, maxIndex));
			toggleItemSelection(world, listEid, action.index);
			break;
	}

	// Ensure new selection is visible
	const newIndex = getCurrentIndex(world, listEid);
	if (newIndex >= 0) {
		ensureIndexVisible(world, listEid, newIndex);
	}

	// Clamp selection to valid range
	clampSelection(world, listEid, maxIndex);

	return newIndex !== prevIndex;
}

/**
 * Gets the page size from VirtualList component.
 */
function getPageSize(world: World, eid: Entity): number {
	if (!hasVirtualList(world, eid)) {
		return 10; // Default page size
	}
	return (VirtualList.visibleCount[eid] as number) || 10;
}

/**
 * Resets selection to first item.
 */
export function resetSelection(world: World, listEid: Entity): void {
	selectFirst(world, listEid);
	clearItemSelection(world, listEid);
	ensureIndexVisible(world, listEid, 0);
}
