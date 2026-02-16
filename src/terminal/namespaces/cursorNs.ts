/**
 * Artificial cursor management namespace.
 *
 * Functions for creating and managing software-rendered cursors with support
 * for multiple cursor shapes (block, bar, underline), blinking, and multi-cursor editing.
 *
 * @example
 * ```typescript
 * import { cursorNs } from 'blecsd/terminal';
 *
 * // Create cursor manager
 * const manager = cursorNs.createCursorManager();
 *
 * // Add cursors
 * const primaryId = cursorNs.addCursor(manager, 0, 0, 'block', true);
 * const secondaryId = cursorNs.addCursor(manager, 5, 10, 'bar', false);
 *
 * // Move cursors
 * cursorNs.moveCursorTo(manager, primaryId, 10, 5);
 * cursorNs.moveCursorBy(manager, primaryId, 1, 0); // Move right
 *
 * // Render cursors
 * const visibleCursors = cursorNs.getVisibleCursors(manager);
 * for (const cursor of visibleCursors) {
 *   const cell = cursorNs.createCursorCell(cursor, buffer);
 *   // Render cell to screen
 * }
 *
 * // Terminal cursor control
 * cursorNs.hideTerminalCursor(program);
 * cursorNs.showTerminalCursor(program);
 * ```
 */

import {
	addCursor,
	BAR_CURSOR_CHAR,
	BLOCK_CURSOR_CHAR,
	createArtificialCursor,
	createCursorCell,
	createCursorManager,
	getCursorAt,
	getPrimaryCursor,
	getVisibleCursors,
	HIDE_TERMINAL_CURSOR,
	hideTerminalCursor,
	isCursorVisible,
	moveCursorBy,
	moveCursorTo,
	removeCursor,
	renderCursor,
	resetCursorBlink,
	SHOW_TERMINAL_CURSOR,
	setCursorBlink,
	setCursorColors,
	setCursorShape,
	setCursorVisible,
	showTerminalCursor,
	UNDERLINE_CURSOR_CHAR,
	updateAllCursorBlinks,
	updateCursorBlink,
	updateCursorInManager,
} from '../cursor';

/**
 * Artificial cursor management namespace.
 */
export const cursorNs = Object.freeze({
	addCursor,
	BAR_CURSOR_CHAR,
	BLOCK_CURSOR_CHAR,
	createArtificialCursor,
	createCursorCell,
	createCursorManager,
	getCursorAt,
	getPrimaryCursor,
	getVisibleCursors,
	HIDE_TERMINAL_CURSOR,
	hideTerminalCursor,
	isCursorVisible,
	moveCursorBy,
	moveCursorTo,
	removeCursor,
	renderCursor,
	resetCursorBlink,
	SHOW_TERMINAL_CURSOR,
	setCursorBlink,
	setCursorColors,
	setCursorShape,
	setCursorVisible,
	showTerminalCursor,
	UNDERLINE_CURSOR_CHAR,
	updateAllCursorBlinks,
	updateCursorBlink,
	updateCursorInManager,
});

export type CursorNsModule = typeof cursorNs;
