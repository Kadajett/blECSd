/**
 * Cursor navigation utilities namespace.
 *
 * @example
 * ```typescript
 * import { cursorNav } from 'blecsd/utils';
 *
 * const cursor = cursorNav.createCursor(0, 0);
 * const result = cursorNav.moveCursorDown(cursor, viewport, lineIndex);
 * cursorNav.goToLine(cursor, 10);
 * ```
 */

import {
	buildLineIndex,
	buildLineIndexFromLengths,
	clampCursor,
	createCursor,
	createNavConfig,
	createViewport,
	ensureCursorVisible,
	goToEnd,
	goToLine,
	goToStart,
	lineForOffset,
	moveCursorDown,
	moveCursorLeft,
	moveCursorRight,
	moveCursorUp,
	offsetForLine,
	pageDown,
	pageUp,
} from '../cursorNavigation';

export const cursorNav = Object.freeze({
	createCursor,
	moveCursorUp,
	moveCursorDown,
	moveCursorLeft,
	moveCursorRight,
	goToLine,
	goToStart,
	goToEnd,
	pageUp,
	pageDown,
	clampCursor,
	ensureCursorVisible,
	createViewport,
	createNavConfig,
	buildLineIndex,
	buildLineIndexFromLengths,
	lineForOffset,
	offsetForLine,
});

export type CursorNavModule = typeof cursorNav;
