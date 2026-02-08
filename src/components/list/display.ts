/**
 * List Component Display Configuration
 *
 * @module components/list/display
 */

import type { Entity } from '../../core/types';
import {
	DEFAULT_DISABLED_FG,
	DEFAULT_ITEM_BG,
	DEFAULT_ITEM_FG,
	DEFAULT_SELECTED_BG,
	DEFAULT_SELECTED_FG,
	DEFAULT_SELECTED_PREFIX,
	DEFAULT_UNSELECTED_PREFIX,
} from './constants';
import { displayStore } from './stores';
import type { ListDisplay, ListDisplayOptions } from './types';

/**
 * Sets the list display configuration.
 *
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setListDisplay(eid: Entity, options: ListDisplayOptions): void {
	const existing = displayStore.get(eid);
	displayStore.set(eid, {
		selectedPrefix: options.selectedPrefix ?? existing?.selectedPrefix ?? DEFAULT_SELECTED_PREFIX,
		unselectedPrefix:
			options.unselectedPrefix ?? existing?.unselectedPrefix ?? DEFAULT_UNSELECTED_PREFIX,
		selectedFg: options.selectedFg ?? existing?.selectedFg ?? DEFAULT_SELECTED_FG,
		selectedBg: options.selectedBg ?? existing?.selectedBg ?? DEFAULT_SELECTED_BG,
		itemFg: options.itemFg ?? existing?.itemFg ?? DEFAULT_ITEM_FG,
		itemBg: options.itemBg ?? existing?.itemBg ?? DEFAULT_ITEM_BG,
		disabledFg: options.disabledFg ?? existing?.disabledFg ?? DEFAULT_DISABLED_FG,
	});
}

/**
 * Gets the list display configuration.
 *
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getListDisplay(eid: Entity): ListDisplay {
	return (
		displayStore.get(eid) ?? {
			selectedPrefix: DEFAULT_SELECTED_PREFIX,
			unselectedPrefix: DEFAULT_UNSELECTED_PREFIX,
			selectedFg: DEFAULT_SELECTED_FG,
			selectedBg: DEFAULT_SELECTED_BG,
			itemFg: DEFAULT_ITEM_FG,
			itemBg: DEFAULT_ITEM_BG,
			disabledFg: DEFAULT_DISABLED_FG,
		}
	);
}

/**
 * Clears the list display configuration.
 *
 * @param eid - The entity ID
 */
export function clearListDisplay(eid: Entity): void {
	displayStore.delete(eid);
}
