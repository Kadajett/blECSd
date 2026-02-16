/**
 * ANSI escape code namespace.
 *
 * Groups all ANSI escape code generators including CSI, ESC, OSC, DCS, SGR,
 * cursor movement, mouse control, screen manipulation, styling, synchronization,
 * and box drawing utilities.
 *
 * @example
 * ```typescript
 * import { ansiCodes } from 'blecsd/terminal';
 *
 * // Use constants and code generators
 * const moveRight = `${ansiCodes.CSI}5C`; // Move cursor right 5 cells
 * const bold = ansiCodes.SGR.bold();
 * const clearScreen = ansiCodes.screen.clear();
 *
 * // Access sub-namespaces
 * ansiCodes.cursor.moveTo(10, 5);
 * ansiCodes.mouse.enable();
 * ansiCodes.boxDrawing.single.horizontal;
 * ```
 */

import {
	BEL,
	boxDrawing,
	bracketedPaste,
	ClipboardSelection,
	CSI,
	charset,
	clipboard,
	cursor,
	DCS,
	DEFAULT_CLIPBOARD_MAX_SIZE,
	ESC,
	HYPERLINK_ALLOWED_PROTOCOLS,
	hyperlink,
	isHyperlinkAllowed,
	LocatorButton,
	LocatorEvent,
	locator,
	MediaCopyMode,
	MouseMode,
	mediaCopy,
	mouse,
	OSC,
	rectangle,
	SGR,
	ST,
	screen,
	style,
	sync,
	title,
	tmux,
	windowOps,
} from '../ansi';

/**
 * ANSI escape code namespace.
 *
 * Groups all ANSI constants and code generators.
 */
export const ansiCodes = Object.freeze({
	// Core constants
	BEL,
	CSI,
	DCS,
	ESC,
	OSC,
	ST,
	SGR,

	// Sub-namespaces
	boxDrawing: Object.freeze(boxDrawing),
	bracketedPaste: Object.freeze(bracketedPaste),
	ClipboardSelection: Object.freeze(ClipboardSelection),
	charset: Object.freeze(charset),
	clipboard: Object.freeze(clipboard),
	cursor: Object.freeze(cursor),
	hyperlink: Object.freeze(hyperlink),
	LocatorButton: Object.freeze(LocatorButton),
	LocatorEvent: Object.freeze(LocatorEvent),
	locator: Object.freeze(locator),
	MediaCopyMode: Object.freeze(MediaCopyMode),
	mediaCopy: Object.freeze(mediaCopy),
	MouseMode: Object.freeze(MouseMode),
	mouse: Object.freeze(mouse),
	rectangle: Object.freeze(rectangle),
	screen: Object.freeze(screen),
	style: Object.freeze(style),
	sync: Object.freeze(sync),
	title: Object.freeze(title),
	tmux: Object.freeze(tmux),
	windowOps: Object.freeze(windowOps),

	// Constants
	DEFAULT_CLIPBOARD_MAX_SIZE,
	HYPERLINK_ALLOWED_PROTOCOLS,

	// Functions
	isHyperlinkAllowed,
});

export type AnsiCodesModule = typeof ansiCodes;
