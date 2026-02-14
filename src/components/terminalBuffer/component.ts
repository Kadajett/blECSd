/**
 * TerminalBuffer component definition.
 *
 * @module components/terminalBuffer/component
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
export const DEFAULT_CAPACITY = 10000;

/** Default terminal width in columns */
export const DEFAULT_TERMINAL_WIDTH = 80;

/** Default terminal height in rows */
export const DEFAULT_TERMINAL_HEIGHT = 24;

/** Default scrollback lines */
export const DEFAULT_SCROLLBACK_LINES = 1000;

// =============================================================================
// COMPONENT DEFINITION
// =============================================================================

/**
 * TerminalBuffer component for scalar state.
 * Complex state (cells, scrollback, parser state) is stored in a Map.
 */
export const TerminalBuffer = {
	/** Tag indicating this is a terminal buffer (1 = yes) */
	isTerminal: new Uint8Array(DEFAULT_CAPACITY),
	/** Terminal width in columns */
	width: new Uint16Array(DEFAULT_CAPACITY),
	/** Terminal height in rows */
	height: new Uint16Array(DEFAULT_CAPACITY),
	/** Cursor X position (column) */
	cursorX: new Uint16Array(DEFAULT_CAPACITY),
	/** Cursor Y position (row) */
	cursorY: new Uint16Array(DEFAULT_CAPACITY),
	/** Cursor visible flag (1 = visible) */
	cursorVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Scroll offset from top (for viewing history) */
	scrollOffset: new Uint32Array(DEFAULT_CAPACITY),
	/** Alternate screen buffer active (1 = yes) */
	altScreenActive: new Uint8Array(DEFAULT_CAPACITY),
};
