/**
 * Cursor management
 * @module terminal/cursor
 */

export type {
	ArtificialCursor,
	ArtificialCursorOptions,
	CursorManager,
	CursorShape,
	RenderedCursor,
} from './artificial';

export {
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
	moveCursor as moveCursorTo,
	moveCursorBy,
	removeCursor,
	renderCursor,
	resetCursorBlink,
	setCursorBlink,
	setCursorColors,
	setCursorShape,
	setCursorVisible,
	SHOW_TERMINAL_CURSOR,
	showTerminalCursor,
	UNDERLINE_CURSOR_CHAR,
	updateAllCursorBlinks,
	updateCursorBlink,
	updateCursorInManager,
} from './artificial';
