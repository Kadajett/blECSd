/**
 * Input action handlers.
 * @module input/handlers
 */

import type { Entity, World } from 'blecsd';
import type { FileStore } from '../data';
import type { FileManagerConfig } from '../config';
import {
	nextSizeFormat,
	nextSortField,
	toggleSortDirection,
} from '../config';
import { processSelectionAction, type SelectionAction } from '../systems/selectionSystem';
import { processNavigationAction } from '../systems/navigationSystem';
import { updatePreview, scrollPreviewUp, scrollPreviewDown, type PreviewState } from '../systems/previewSystem';
import type { Action } from './keyBindings';
import type { MouseAction } from './mouseBindings';

/**
 * Handler context.
 */
export interface HandlerContext {
	world: World;
	listEid: Entity;
	previewEid: Entity;
	fileStore: FileStore;
	config: FileManagerConfig;
	previewState: PreviewState;
	focusedPane: 'list' | 'preview';
	filterMode: boolean;
	filterQuery: string;
	/** Terminal dimensions for scroll calculations */
	terminalWidth: number;
	terminalHeight: number;
}

/**
 * Handler result.
 */
export interface HandlerResult {
	/** Whether to redraw */
	redraw: boolean;
	/** Whether to quit */
	quit: boolean;
	/** Updated config (if changed) */
	config?: FileManagerConfig;
	/** Updated focus */
	focusedPane?: 'list' | 'preview';
	/** Updated filter mode */
	filterMode?: boolean;
	/** Updated filter query */
	filterQuery?: string;
}

const EMPTY_RESULT: HandlerResult = { redraw: false, quit: false };

/**
 * Handles a keyboard action.
 */
export async function handleAction(
	action: Action,
	ctx: HandlerContext,
): Promise<HandlerResult> {
	const { world, listEid, previewEid, fileStore, config, previewState } = ctx;

	switch (action) {
		// Movement
		case 'move:up':
			return handleSelection(ctx, { type: 'move', delta: -1 });

		case 'move:down':
			return handleSelection(ctx, { type: 'move', delta: 1 });

		case 'move:pageUp':
			return handleSelection(ctx, { type: 'page', direction: -1 });

		case 'move:pageDown':
			return handleSelection(ctx, { type: 'page', direction: 1 });

		case 'move:first':
			return handleSelection(ctx, { type: 'first' });

		case 'move:last':
			return handleSelection(ctx, { type: 'last' });

		// Extend selection
		case 'extend:up':
			return handleSelection(ctx, { type: 'extend', delta: -1 });

		case 'extend:down':
			return handleSelection(ctx, { type: 'extend', delta: 1 });

		case 'extend:pageUp':
			return handleSelection(ctx, { type: 'extendPage', direction: -1 });

		case 'extend:pageDown':
			return handleSelection(ctx, { type: 'extendPage', direction: 1 });

		// Multi-select
		case 'toggle:select':
			return handleSelection(ctx, { type: 'toggle' });

		case 'select:all':
			return handleSelection(ctx, { type: 'selectAll' });

		// Navigation
		case 'nav:enter': {
			const result = await processNavigationAction(
				world,
				listEid,
				{ type: 'enter' },
				fileStore,
				config,
			);
			if (result.fileOpened) {
				// Could emit event or handle file open
				// For now, just redraw
			}
			updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
			return { redraw: true, quit: false };
		}

		case 'nav:back': {
			await processNavigationAction(
				world,
				listEid,
				{ type: 'back' },
				fileStore,
				config,
			);
			updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
			return { redraw: true, quit: false };
		}

		case 'nav:home': {
			await processNavigationAction(
				world,
				listEid,
				{ type: 'home' },
				fileStore,
				config,
			);
			updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
			return { redraw: true, quit: false };
		}

		case 'nav:refresh': {
			await processNavigationAction(
				world,
				listEid,
				{ type: 'refresh' },
				fileStore,
				config,
			);
			updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
			return { redraw: true, quit: false };
		}

		// Filter
		case 'filter:start':
			return { redraw: true, quit: false, filterMode: true, filterQuery: '' };

		case 'filter:cancel':
			if (ctx.filterMode) {
				fileStore.clearFilter(config);
				return { redraw: true, quit: false, filterMode: false, filterQuery: '' };
			}
			return EMPTY_RESULT;

		// Settings
		case 'toggle:hidden': {
			const newConfig = { ...config, showHidden: !config.showHidden };
			fileStore.resort(newConfig);
			updatePreview(world, listEid, previewEid, fileStore, newConfig.sizeFormat, previewState);
			return { redraw: true, quit: false, config: newConfig };
		}

		case 'cycle:sort': {
			const newConfig = { ...config, sortField: nextSortField(config.sortField) };
			fileStore.resort(newConfig);
			return { redraw: true, quit: false, config: newConfig };
		}

		case 'toggle:sortDirection': {
			const newConfig = { ...config, sortDirection: toggleSortDirection(config.sortDirection) };
			fileStore.resort(newConfig);
			return { redraw: true, quit: false, config: newConfig };
		}

		case 'cycle:sizeFormat': {
			const newConfig = { ...config, sizeFormat: nextSizeFormat(config.sizeFormat) };
			return { redraw: true, quit: false, config: newConfig };
		}

		// Preview
		case 'preview:scrollUp': {
			// Preview visible height = terminal height - header(1) - status bar(1) - action bar(1) = height - 3
			const previewVisibleHeight = ctx.terminalHeight - 3;
			scrollPreviewUp(world, previewEid, 3, previewVisibleHeight);
			return { redraw: true, quit: false };
		}

		case 'preview:scrollDown': {
			const previewVisibleHeight = ctx.terminalHeight - 3;
			scrollPreviewDown(world, previewEid, 3, previewVisibleHeight);
			return { redraw: true, quit: false };
		}

		case 'focus:toggle':
			return {
				redraw: true,
				quit: false,
				focusedPane: ctx.focusedPane === 'list' ? 'preview' : 'list',
			};

		// File operations (action bar)
		// These are placeholders - full implementation would require dialogs
		case 'file:new':
			// TODO: Show dialog for creating new file/directory
			// For now, just acknowledge the action
			return { redraw: true, quit: false };

		case 'file:delete':
			// TODO: Show confirmation dialog and delete selected files
			return { redraw: true, quit: false };

		case 'file:rename':
			// TODO: Show input dialog for new name
			return { redraw: true, quit: false };

		case 'file:copy':
			// TODO: Mark selected files for copy operation
			return { redraw: true, quit: false };

		case 'file:move':
			// TODO: Mark selected files for move operation
			return { redraw: true, quit: false };

		case 'app:help':
			// TODO: Show help dialog with key bindings
			return { redraw: true, quit: false };

		// Quit
		case 'app:quit':
			return { redraw: false, quit: true };

		default:
			return EMPTY_RESULT;
	}
}

/**
 * Handles a selection action.
 */
function handleSelection(ctx: HandlerContext, action: SelectionAction): HandlerResult {
	const { world, listEid, previewEid, fileStore, config, previewState } = ctx;

	const changed = processSelectionAction(world, listEid, action, fileStore.count);

	if (changed) {
		updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
	}

	return { redraw: changed, quit: false };
}

/**
 * Handles a mouse action.
 */
export async function handleMouseAction(
	action: MouseAction,
	ctx: HandlerContext,
): Promise<HandlerResult> {
	const { world, listEid, previewEid, fileStore, config, previewState } = ctx;

	switch (action.type) {
		case 'click':
			return handleSelection(ctx, { type: 'click', index: action.index });

		case 'doubleClick': {
			// First select the item
			processSelectionAction(world, listEid, { type: 'click', index: action.index }, fileStore.count);
			// Then enter
			const result = await processNavigationAction(
				world,
				listEid,
				{ type: 'enter' },
				fileStore,
				config,
			);
			updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
			return { redraw: true, quit: false };
		}

		case 'ctrlClick':
			return handleSelection(ctx, { type: 'ctrlClick', index: action.index });

		case 'shiftClick':
			return handleSelection(ctx, { type: 'shiftClick', index: action.index });

		case 'scroll': {
			const delta = action.direction === 'up' ? -action.lines : action.lines;
			return handleSelection(ctx, { type: 'move', delta });
		}

		case 'previewScroll': {
			// Preview visible height = terminal height - header(1) - status bar(1) - action bar(1) = height - 3
			const previewVisibleHeight = ctx.terminalHeight - 3;
			if (action.direction === 'up') {
				scrollPreviewUp(world, previewEid, action.lines, previewVisibleHeight);
			} else {
				scrollPreviewDown(world, previewEid, action.lines, previewVisibleHeight);
			}
			return { redraw: true, quit: false };
		}

		case 'headerClick': {
			// Column 0 = name, 1 = size, 2 = date
			const sortFieldMap = [0, 1, 2, 3]; // Maps to SortField enum
			const sortField = sortFieldMap[action.column] ?? 0;
			const newConfig = { ...config, sortField: sortField as 0 | 1 | 2 | 3 };
			fileStore.resort(newConfig);
			return { redraw: true, quit: false, config: newConfig };
		}

		case 'dividerDrag':
			// Could implement pane resizing here
			return { redraw: false, quit: false };

		default:
			return { redraw: false, quit: false };
	}
}

/**
 * Handles filter input (when in filter mode).
 */
export function handleFilterInput(
	key: string,
	ctx: HandlerContext,
): HandlerResult {
	const { world, listEid, previewEid, fileStore, config, previewState, filterQuery } = ctx;

	if (key === 'backspace') {
		const newQuery = filterQuery.slice(0, -1);
		fileStore.setFilter(newQuery, config);
		updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
		return { redraw: true, quit: false, filterQuery: newQuery };
	}

	if (key === 'enter' || key === 'return') {
		return { redraw: true, quit: false, filterMode: false };
	}

	if (key === 'escape') {
		fileStore.clearFilter(config);
		return { redraw: true, quit: false, filterMode: false, filterQuery: '' };
	}

	// Regular character
	if (key.length === 1) {
		const newQuery = filterQuery + key;
		fileStore.setFilter(newQuery, config);
		updatePreview(world, listEid, previewEid, fileStore, config.sizeFormat, previewState);
		return { redraw: true, quit: false, filterQuery: newQuery };
	}

	return { redraw: false, quit: false };
}
