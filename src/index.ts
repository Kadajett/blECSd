/**
 * blECSd Terminal Game Library
 *
 * A modern terminal game library built on TypeScript and ECS architecture.
 *
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

// Conflict-free modules: use export *
export * as three from './3d';
export * from './audio';
// Components owns TableCell, TableData (table widget component)
export type { DimensionValue, ListItem, TableCell, TableData } from './components';
// Modules with name collisions: export * then explicitly re-export
// the ambiguous names from the preferred source module.
export * from './components';
// Disambiguate colliding exports:
// Components owns these (also in widgets/bigText or widgets/streamingText)
// Components owns TextAlign (enum) over utils TextAlign (type alias)
export {
	ensureCursorVisible,
	focusNext,
	focusPrev,
	getText,
	prepend,
	scrollBy,
	scrollByLines,
	scrollToBottom,
	scrollToLine,
	scrollToTop,
	setText,
	TextAlign,
} from './components';
// Core owns CleanupCallback and PositionCache (value)
export type {
	BoxConfig,
	CleanupCallback,
	HitTestResult,
	PositionValue,
	TextConfig,
	Unsubscribe,
} from './core';
export * from './core';
export {
	BoxConfigSchema,
	getZIndex,
	hitTest,
	normalizeZIndices,
	PositionValueSchema,
	query,
	setZIndex,
	TextConfigSchema,
} from './core';
export * from './debug';
export * from './errors';
export * from './game';
export * from './input';
export * from './schemas';
// Systems owns DirtyRect
// Systems owns PositionCache (interface from visibilityCulling)
export type { DirtyRect, PositionCache } from './systems';
export * from './systems';
// Terminal owns these
export type {
	AttrFlags,
	Cell,
	CursorPosition,
	CursorShape,
	KeyHandler,
	MouseHandler,
	TerminalCapabilities,
} from './terminal';
export * from './terminal';
export {
	beginFrame,
	clearBuffer,
	clearOutputBuffer,
	disableInput,
	disableKeys,
	disableMouse,
	enableInput,
	enableKeys,
	enableMouse,
	endFrame,
	fillRect,
	getCell,
	hideCursor,
	isCursorVisible,
	isScreen,
	moveCursor,
	resetCursorBlink,
	setCell,
	setCursorVisible,
	showCursor,
	stripAnsi,
	writeChar,
	writeRaw,
} from './terminal';
export * from './types';
export * from './utils';

// Utils owns these
export { getLine, getLineCount, getLines, getStats, renderText } from './utils';
export * from './widgets';

// Game module (no unique collision exports needed, handled via export *)
