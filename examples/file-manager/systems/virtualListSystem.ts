/**
 * VirtualList system for updating visible row entities.
 * @module systems/virtualListSystem
 */

import type { Entity, System, World } from 'blecsd';
import {
	VirtualList,
	getVisibleRange,
	setDataIndex,
	markRowDirty,
	hasVirtualList,
} from '../components';

/**
 * State for tracking which row entities belong to which list.
 */
export interface VirtualListState {
	/** Map of list entity to its row entities */
	listRows: Map<number, Entity[]>;
	/** Map of row entity to its current data index (for change detection) */
	rowIndices: Map<number, number>;
	/** Registered list entities */
	lists: Entity[];
}

/**
 * Creates the virtual list state.
 */
export function createVirtualListState(): VirtualListState {
	return {
		listRows: new Map(),
		rowIndices: new Map(),
		lists: [],
	};
}

/**
 * Registers row entities for a list.
 */
export function registerListRows(state: VirtualListState, listEid: Entity, rows: Entity[]): void {
	state.listRows.set(listEid, rows);
	if (!state.lists.includes(listEid)) {
		state.lists.push(listEid);
	}
	for (const row of rows) {
		state.rowIndices.set(row, -1);
	}
}

/**
 * Creates the virtual list system.
 * Updates FileRow.dataIndex for visible rows based on scroll position.
 */
export function createVirtualListSystem(state: VirtualListState): System {
	return (world: World): World => {
		// Process all registered lists
		for (const listEid of state.lists) {
			if (!hasVirtualList(world, listEid)) continue;

			const rows = state.listRows.get(listEid);
			if (!rows) continue;

			const range = getVisibleRange(world, listEid);
			const totalItems = VirtualList.totalItems[listEid] as number;

			// Update each row's data index
			for (let i = 0; i < rows.length; i++) {
				const rowEid = rows[i];
				if (rowEid === undefined) continue;

				// Calculate the data index for this row position
				const dataIndex = range.start + i;
				const validIndex = dataIndex < range.end && dataIndex < totalItems ? dataIndex : -1;

				// Check if index changed
				const prevIndex = state.rowIndices.get(rowEid) ?? -1;
				if (prevIndex !== validIndex) {
					setDataIndex(world, rowEid, validIndex);
					state.rowIndices.set(rowEid, validIndex);
				}
			}
		}

		return world;
	};
}

/**
 * Marks all rows in a list as dirty (for full redraw).
 */
export function markAllRowsDirty(world: World, state: VirtualListState, listEid: Entity): void {
	const rows = state.listRows.get(listEid);
	if (!rows) return;

	for (const rowEid of rows) {
		markRowDirty(world, rowEid);
	}
}

/**
 * Gets the row entity at a specific screen position.
 */
export function getRowAtPosition(
	state: VirtualListState,
	listEid: Entity,
	screenY: number,
	listStartY: number,
): Entity | undefined {
	const rows = state.listRows.get(listEid);
	if (!rows) return undefined;

	const rowIndex = screenY - listStartY;
	return rows[rowIndex];
}
