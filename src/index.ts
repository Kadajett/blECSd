/**
 * blECSd Terminal UI Library
 *
 * A modern terminal UI library built on TypeScript and ECS architecture.
 *
 * @packageDocumentation
 */

export const VERSION = '0.5.0';

// 3D module exported as namespace to avoid top-level name collisions
export * as three from './3d';

// Conflict-free modules
export * from './audio';
export * from './debug';
export * from './errors';
export * from './game';
export * from './input';
export * from './schemas';
export * from './text';
export * from './types';

// Modules with name collisions between them require explicit disambiguation.
// When two modules export the same name, the explicit re-export below wins.

export type { DimensionValue, ListItem, TableCell, TableData } from './components';
// Components: export all, then re-export names that collide with other modules.
// Components owns: TextAlign (enum, over utils type alias), getText, setText,
// scrollBy, scrollToTop, scrollToBottom, etc. (over widgets/bigText or streamingText)
export * from './components';
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
export type {
	BoxConfig,
	CleanupCallback,
	HitTestResult,
	PositionValue,
	TextConfig,
	Unsubscribe,
} from './core';
// Core: export all, then re-export names that collide with other modules.
// Core owns: BoxConfig, CleanupCallback, HitTestResult, PositionValue,
// TextConfig, Unsubscribe, BoxConfigSchema, hitTest, query, etc.
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
export * from './style';
export type { DirtyRect, PositionCache } from './systems';
// Systems: export all, then re-export type names that collide.
// Systems owns: DirtyRect, PositionCache (interface from visibilityCulling)
export * from './systems';
export type {
	AttrFlags,
	Cell,
	CursorPosition,
	CursorShape,
	KeyHandler,
	MouseHandler,
	TerminalCapabilities,
} from './terminal';
// Terminal: export all, then re-export names that collide with other modules.
// Terminal owns: AttrFlags, Cell, CursorPosition, CursorShape, KeyHandler,
// MouseHandler, TerminalCapabilities, and various enable/disable functions.
export * from './terminal';
export {
	clearBuffer,
	disableInput,
	disableKeys,
	disableMouse,
	enableInput,
	enableKeys,
	enableMouse,
	fillRect,
	getCell,
	isCursorVisible,
	isScreen,
	resetCursorBlink,
	setCell,
	setCursorVisible,
	stripAnsi,
} from './terminal';

// Utils: export all. Names like getLine, getLineCount, etc. are owned by utils
// and win over any collisions from other modules.
export * from './utils';
export { getLine, getLineCount, getLines, getStats, renderText } from './utils';

// Widgets: export all
export * from './widgets';
