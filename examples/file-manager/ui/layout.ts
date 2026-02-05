/**
 * UI layout creation.
 * @module ui/layout
 */

import { addEntity } from 'blecsd';
import type { Entity, World, ListbarWidget } from 'blecsd';
import { createListbar } from 'blecsd';
import {
	setSelection,
	setVirtualList,
	setPreview,
} from '../components';
import { setFileRow } from '../components';
import type { FileManagerConfig } from '../config';

/**
 * Actions available in the file manager.
 */
export type FileManagerAction = 'new' | 'delete' | 'rename' | 'copy' | 'move' | 'refresh' | 'help';

/**
 * Layout entities.
 */
export interface LayoutEntities {
	/** Main file list entity */
	list: Entity;
	/** Preview pane entity */
	preview: Entity;
	/** Row entities for virtualized list */
	rows: Entity[];
	/** Action bar widget */
	actionBar: ListbarWidget | null;
}

/**
 * Creates the UI entity hierarchy.
 */
export function createLayout(
	world: World,
	config: FileManagerConfig,
	viewportHeight: number,
): LayoutEntities {
	// Calculate list height (viewport - header - column header - status bar - action bar)
	const listHeight = viewportHeight - 4;
	const rowCount = listHeight + config.bufferRows * 2;

	// Create list entity
	const list = addEntity(world);
	setSelection(world, list, 0);
	setVirtualList(world, list, {
		totalItems: 0,
		visibleStart: 0,
		visibleCount: listHeight,
		rowHeight: 1,
		bufferRows: config.bufferRows,
	});

	// Create row entities (pooled)
	const rows: Entity[] = [];
	for (let i = 0; i < rowCount; i++) {
		const row = addEntity(world);
		setFileRow(world, row, -1);
		rows.push(row);
	}

	// Create preview entity
	const preview = addEntity(world);
	setPreview(world, preview);

	// Create action bar
	const actionBarEntity = addEntity(world);
	const actionBar = createListbar(world, actionBarEntity, {
		y: viewportHeight - 1,
		items: [
			{ text: 'New', key: 'n', value: 'new' },
			{ text: 'Delete', key: 'd', value: 'delete' },
			{ text: 'Rename', key: 'r', value: 'rename' },
			{ text: 'Copy', key: 'c', value: 'copy' },
			{ text: 'Move', key: 'm', value: 'move' },
			{ text: 'Refresh', key: 'R', value: 'refresh' },
			{ text: 'Help', key: '?', value: 'help' },
		],
		autoCommandKeys: false,
		style: {
			item: { fg: 0xccccccff, bg: 0x333333ff },
			selected: { fg: 0x000000ff, bg: 0x00ffffff },
			prefix: { fg: 0xffff00ff, bg: 0x333333ff },
			separator: ' ',
		},
	});

	return { list, preview, rows, actionBar };
}

/**
 * Updates layout for new viewport size.
 */
export function updateLayout(
	world: World,
	layout: LayoutEntities,
	config: FileManagerConfig,
	viewportHeight: number,
): void {
	const listHeight = viewportHeight - 4;

	// Update virtual list visible count
	setVirtualList(world, layout.list, {
		visibleCount: listHeight,
	});

	// Update action bar position
	if (layout.actionBar) {
		layout.actionBar.setPosition(0, viewportHeight - 1);
	}

	// If we need more rows, we'd add them here
	// For now, we assume initial row count is sufficient
}
