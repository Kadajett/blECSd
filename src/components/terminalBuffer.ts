/**
 * TerminalBuffer Component
 *
 * ECS component for terminal emulator buffers. Stores a 2D grid of cells
 * with per-cell styling, cursor state, and scrollback history.
 *
 * @module components/terminalBuffer
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 * import {
 *   setTerminalBuffer,
 *   writeToTerminal,
 *   getTerminalState,
 *   clearTerminal,
 * } from 'blecsd/components';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Initialize a terminal buffer
 * setTerminalBuffer(world, eid, { width: 80, height: 24 });
 *
 * // Write ANSI content
 * writeToTerminal(world, eid, '\x1b[31mHello\x1b[0m World');
 *
 * // Get current state
 * const state = getTerminalState(eid);
 * console.log(state?.cursorX, state?.cursorY);
 *
 * // Clear the terminal
 * clearTerminal(world, eid);
 * ```
 */

import { z } from 'zod';
import type { Entity, World } from '../core/types';
import { type Attribute, cloneAttribute, createAttribute } from '../terminal/ansi/parser';
import {
	type Cell,
	cloneCell,
	createCell,
	createScreenBuffer,
	DEFAULT_BG,
	DEFAULT_FG,
	type ScreenBufferData,
} from '../terminal/screen/cell';
import {
	appendLine,
	clearScrollback,
	createScrollbackBuffer,
	getLineRange,
	type ScrollbackBuffer,
	type ScrollbackConfig,
} from '../utils/virtualScrollback';
import { markDirty } from './renderable';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

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

// =============================================================================
// COMPLEX STATE STORAGE
// =============================================================================

/**
 * Terminal state stored in a Map for complex data.
 */
export interface TerminalState {
	/** Cell buffer (2D grid in row-major order) */
	readonly buffer: ScreenBufferData;
	/** Scrollback history */
	readonly scrollback: ScrollbackBuffer;
	/** Current text attributes for new characters */
	currentAttr: Attribute;
	/** Partial escape sequence buffer */
	escapeBuffer: string;
	/** Whether we're in the middle of parsing an escape sequence */
	inEscape: boolean;
	/** Saved cursor position X */
	savedCursorX: number;
	/** Saved cursor position Y */
	savedCursorY: number;
	/** Saved attributes */
	savedAttr: Attribute;
	/** Alternate screen buffer (for full-screen apps) */
	altBuffer: ScreenBufferData | null;
	/** Cursor shape: 'block' | 'underline' | 'bar' */
	cursorShape: CursorShape;
	/** Cursor blink enabled */
	cursorBlink: boolean;
}

/**
 * Cursor shape types.
 */
export type CursorShape = 'block' | 'underline' | 'bar';

/**
 * Map of entity ID to terminal state.
 */
const terminalStateMap = new Map<Entity, TerminalState>();

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Terminal buffer configuration schema.
 */
export const TerminalBufferConfigSchema = z.object({
	/** Terminal width in columns */
	width: z.number().int().positive().default(DEFAULT_TERMINAL_WIDTH),
	/** Terminal height in rows */
	height: z.number().int().positive().default(DEFAULT_TERMINAL_HEIGHT),
	/** Maximum scrollback lines */
	scrollbackLines: z.number().int().nonnegative().default(DEFAULT_SCROLLBACK_LINES),
	/** Initial cursor visibility */
	cursorVisible: z.boolean().default(true),
	/** Cursor shape */
	cursorShape: z.enum(['block', 'underline', 'bar']).default('block'),
	/** Cursor blink enabled */
	cursorBlink: z.boolean().default(true),
});

/**
 * Terminal buffer configuration type.
 */
export type TerminalBufferConfig = z.input<typeof TerminalBufferConfigSchema>;

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Creates initial terminal state.
 */
function createTerminalState(
	width: number,
	height: number,
	scrollbackLines: number,
	cursorShape: CursorShape,
	cursorBlink: boolean,
): TerminalState {
	const scrollbackConfig: Partial<ScrollbackConfig> = {
		maxLines: scrollbackLines,
		chunkSize: Math.min(scrollbackLines, 1000),
	};

	return {
		buffer: createScreenBuffer(width, height),
		scrollback: createScrollbackBuffer(scrollbackConfig),
		currentAttr: createAttribute(),
		escapeBuffer: '',
		inEscape: false,
		savedCursorX: 0,
		savedCursorY: 0,
		savedAttr: createAttribute(),
		altBuffer: null,
		cursorShape,
		cursorBlink,
	};
}

/**
 * Gets the cell index in the buffer.
 */
function cellIndex(width: number, x: number, y: number): number {
	return y * width + x;
}

/**
 * Converts internal Attribute to Cell colors/attrs.
 */
function attrToCell(attr: Attribute): { fg: number; bg: number; attrs: number } {
	// Convert InternalColor to packed RGBA
	// For now, use simple mapping (can be enhanced later)
	let fg = DEFAULT_FG;
	let bg = DEFAULT_BG;

	// Basic 16-color mapping
	const basicColors = [
		0x000000ff, // black
		0xaa0000ff, // red
		0x00aa00ff, // green
		0xaaaa00ff, // yellow
		0x0000aaff, // blue
		0xaa00aaff, // magenta
		0x00aaaaff, // cyan
		0xaaaaaaff, // white
		0x555555ff, // bright black
		0xff5555ff, // bright red
		0x55ff55ff, // bright green
		0xffff55ff, // bright yellow
		0x5555ffff, // bright blue
		0xff55ffff, // bright magenta
		0x55ffffff, // bright cyan
		0xffffffff, // bright white
	];

	// Foreground color
	if (attr.fg.type === 1) {
		// BASIC
		fg = basicColors[attr.fg.value] ?? DEFAULT_FG;
	} else if (attr.fg.type === 3) {
		// RGB
		// Convert packed RGB to RGBA
		fg = (attr.fg.value << 8) | 0xff;
	}

	// Background color
	if (attr.bg.type === 1) {
		// BASIC
		bg = basicColors[attr.bg.value] ?? DEFAULT_BG;
	} else if (attr.bg.type === 3) {
		// RGB
		bg = (attr.bg.value << 8) | 0xff;
	}

	return { fg, bg, attrs: attr.styles };
}

/**
 * Scrolls the terminal buffer up by one line.
 */
function scrollUp(state: TerminalState, width: number, height: number): void {
	// Save top line to scrollback
	const topLine = extractLine(state.buffer, 0, width);
	appendLine(state.scrollback, topLine);

	// Shift all rows up
	for (let y = 0; y < height - 1; y++) {
		for (let x = 0; x < width; x++) {
			const srcIdx = (y + 1) * width + x;
			const dstIdx = y * width + x;
			const srcCell = state.buffer.cells[srcIdx];
			if (srcCell) {
				state.buffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	// Clear bottom line
	const clearCell = createCell();
	for (let x = 0; x < width; x++) {
		const idx = (height - 1) * width + x;
		state.buffer.cells[idx] = cloneCell(clearCell);
	}
}

/**
 * Extracts a line as text from the buffer.
 */
function extractLine(buffer: ScreenBufferData, row: number, width: number): string {
	let line = '';
	for (let x = 0; x < width; x++) {
		const idx = row * width + x;
		const cell = buffer.cells[idx];
		line += cell?.char ?? ' ';
	}
	// Trim trailing spaces
	return line.trimEnd();
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Sets up a terminal buffer on an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param config - Terminal buffer configuration
 *
 * @example
 * ```typescript
 * setTerminalBuffer(world, eid, {
 *   width: 80,
 *   height: 24,
 *   scrollbackLines: 1000,
 * });
 * ```
 */
export function setTerminalBuffer(
	world: World,
	eid: Entity,
	config: TerminalBufferConfig = {},
): void {
	const validated = TerminalBufferConfigSchema.parse(config);

	// Set scalar state
	TerminalBuffer.isTerminal[eid] = 1;
	TerminalBuffer.width[eid] = validated.width;
	TerminalBuffer.height[eid] = validated.height;
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	TerminalBuffer.cursorVisible[eid] = validated.cursorVisible ? 1 : 0;
	TerminalBuffer.scrollOffset[eid] = 0;
	TerminalBuffer.altScreenActive[eid] = 0;

	// Set complex state
	const state = createTerminalState(
		validated.width,
		validated.height,
		validated.scrollbackLines,
		validated.cursorShape,
		validated.cursorBlink,
	);
	terminalStateMap.set(eid, state);

	markDirty(world, eid);
}

/**
 * Checks if an entity has a terminal buffer.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns true if the entity has a terminal buffer
 */
export function hasTerminalBuffer(_world: World, eid: Entity): boolean {
	return TerminalBuffer.isTerminal[eid] === 1;
}

/**
 * Gets the terminal state for an entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns Terminal state or undefined
 */
export function getTerminalState(_world: World, eid: Entity): TerminalState | undefined {
	return terminalStateMap.get(eid);
}

/**
 * Gets terminal buffer data (scalar values).
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns Terminal buffer data
 */
export function getTerminalBuffer(
	_world: World,
	eid: Entity,
):
	| {
			width: number;
			height: number;
			cursorX: number;
			cursorY: number;
			cursorVisible: boolean;
			scrollOffset: number;
	  }
	| undefined {
	if (!hasTerminalBuffer(_world, eid)) {
		return undefined;
	}

	return {
		width: TerminalBuffer.width[eid] ?? 0,
		height: TerminalBuffer.height[eid] ?? 0,
		cursorX: TerminalBuffer.cursorX[eid] ?? 0,
		cursorY: TerminalBuffer.cursorY[eid] ?? 0,
		cursorVisible: TerminalBuffer.cursorVisible[eid] === 1,
		scrollOffset: TerminalBuffer.scrollOffset[eid] ?? 0,
	};
}

/**
 * Handles newline character.
 */
function handleNewline(
	world: World,
	eid: Entity,
	state: TerminalState,
	width: number,
	height: number,
): void {
	let cursorY = (TerminalBuffer.cursorY[eid] ?? 0) + 1;
	if (cursorY >= height) {
		scrollUp(state, width, height);
		cursorY = height - 1;
	}
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = cursorY;
	markDirty(world, eid);
}

/**
 * Handles tab character.
 */
function handleTab(world: World, eid: Entity, width: number): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const nextTab = Math.min((Math.floor(cursorX / 8) + 1) * 8, width - 1);
	TerminalBuffer.cursorX[eid] = nextTab;
	markDirty(world, eid);
}

/**
 * Writes a printable character and advances cursor.
 */
function writePrintableChar(
	world: World,
	eid: Entity,
	state: TerminalState,
	char: string,
	width: number,
	height: number,
): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	let cursorY = TerminalBuffer.cursorY[eid] ?? 0;

	// Write the character to the buffer
	const { fg, bg, attrs } = attrToCell(state.currentAttr);
	const idx = cellIndex(width, cursorX, cursorY);
	state.buffer.cells[idx] = createCell(char, fg, bg, attrs);

	// Advance cursor
	let newCursorX = cursorX + 1;
	if (newCursorX >= width) {
		newCursorX = 0;
		cursorY++;
		if (cursorY >= height) {
			scrollUp(state, width, height);
			cursorY = height - 1;
		}
	}

	TerminalBuffer.cursorX[eid] = newCursorX;
	TerminalBuffer.cursorY[eid] = cursorY;
	markDirty(world, eid);
}

/**
 * Writes a character to the terminal at the current cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param char - Character to write
 */
export function writeChar(world: World, eid: Entity, char: string): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	// Handle special characters
	if (char === '\n') {
		handleNewline(world, eid, state, width, height);
		return;
	}

	if (char === '\r') {
		TerminalBuffer.cursorX[eid] = 0;
		markDirty(world, eid);
		return;
	}

	if (char === '\b') {
		const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
		if (cursorX > 0) {
			TerminalBuffer.cursorX[eid] = cursorX - 1;
		}
		markDirty(world, eid);
		return;
	}

	if (char === '\t') {
		handleTab(world, eid, width);
		return;
	}

	// Write printable character
	writePrintableChar(world, eid, state, char, width, height);
}

/**
 * Writes a string to the terminal (processes escape sequences).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param data - String to write
 */
export function writeToTerminal(world: World, eid: Entity, data: string): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	for (let i = 0; i < data.length; i++) {
		const char = data[i];
		if (char === undefined) continue;

		// Check for ESC character
		if (char === '\x1b') {
			state.inEscape = true;
			state.escapeBuffer = char;
			continue;
		}

		// If we're in an escape sequence
		if (state.inEscape) {
			state.escapeBuffer += char;

			// Check if escape sequence is complete
			if (isEscapeComplete(state.escapeBuffer)) {
				processEscapeSequence(world, eid, state, state.escapeBuffer);
				state.inEscape = false;
				state.escapeBuffer = '';
			}
			continue;
		}

		// Regular character
		writeChar(world, eid, char);
	}
}

/**
 * Checks if an escape sequence is complete.
 */
function isEscapeComplete(seq: string): boolean {
	if (seq.length < 2) return false;

	// CSI sequences end with a letter
	if (seq[1] === '[') {
		const lastChar = seq[seq.length - 1];
		if (lastChar === undefined) return false;
		return /[A-Za-z@`~]/.test(lastChar);
	}

	// OSC sequences end with BEL or ST
	if (seq[1] === ']') {
		return seq.endsWith('\x07') || seq.endsWith('\x1b\\');
	}

	// Simple escape sequences
	return seq.length >= 2;
}

/**
 * Processes a complete escape sequence.
 */
function processEscapeSequence(world: World, eid: Entity, state: TerminalState, seq: string): void {
	if (seq.length < 2) return;

	const second = seq[1];

	// CSI sequences
	if (second === '[') {
		processCsiSequence(world, eid, state, seq);
		return;
	}

	// Other escape sequences (simplified)
	switch (second) {
		case 'c': // Reset
			resetTerminal(world, eid);
			break;
		case '7': // Save cursor
			state.savedCursorX = TerminalBuffer.cursorX[eid] ?? 0;
			state.savedCursorY = TerminalBuffer.cursorY[eid] ?? 0;
			state.savedAttr = cloneAttribute(state.currentAttr);
			break;
		case '8': // Restore cursor
			TerminalBuffer.cursorX[eid] = state.savedCursorX;
			TerminalBuffer.cursorY[eid] = state.savedCursorY;
			state.currentAttr = cloneAttribute(state.savedAttr);
			markDirty(world, eid);
			break;
		case 'D': // Index (move down)
			moveCursorDown(world, eid, state, 1);
			break;
		case 'M': // Reverse index (move up)
			moveCursorUp(world, eid, 1);
			break;
		case 'E': // Next line
			TerminalBuffer.cursorX[eid] = 0;
			moveCursorDown(world, eid, state, 1);
			break;
	}
}

/**
 * Processes a CSI escape sequence.
 */
function processCsiSequence(world: World, eid: Entity, state: TerminalState, seq: string): void {
	// Parse CSI sequence: ESC [ <params> <command>
	// Include ? for private mode sequences like ESC[?25l
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional for ANSI parsing
	const match = seq.match(/^\x1b\[(\??[\d;]*)([A-Za-z@`~])$/);
	if (!match) return;

	const params = match[1] ?? '';
	const command = match[2];

	// Parse parameters
	const args = params === '' ? [] : params.split(';').map((s) => parseInt(s, 10) || 0);
	const arg1 = args[0] ?? 1;
	const arg2 = args[1] ?? 1;

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	switch (command) {
		// Cursor movement
		case 'A': // Cursor up
			moveCursorUp(world, eid, arg1);
			break;
		case 'B': // Cursor down
			moveCursorDown(world, eid, state, arg1);
			break;
		case 'C': // Cursor forward
			moveCursorForward(world, eid, arg1, width);
			break;
		case 'D': // Cursor back
			moveCursorBack(world, eid, arg1);
			break;
		case 'E': // Cursor next line
			TerminalBuffer.cursorX[eid] = 0;
			moveCursorDown(world, eid, state, arg1);
			break;
		case 'F': // Cursor previous line
			TerminalBuffer.cursorX[eid] = 0;
			moveCursorUp(world, eid, arg1);
			break;
		case 'G': // Cursor horizontal absolute
			TerminalBuffer.cursorX[eid] = Math.min(Math.max(arg1 - 1, 0), width - 1);
			markDirty(world, eid);
			break;
		case 'H': // Cursor position
		case 'f':
			TerminalBuffer.cursorY[eid] = Math.min(Math.max(arg1 - 1, 0), height - 1);
			TerminalBuffer.cursorX[eid] = Math.min(Math.max(arg2 - 1, 0), width - 1);
			markDirty(world, eid);
			break;

		// Erase
		case 'J': // Erase in display
			eraseInDisplay(world, eid, state, args[0] ?? 0);
			break;
		case 'K': // Erase in line
			eraseInLine(world, eid, state, args[0] ?? 0);
			break;

		// SGR (Select Graphic Rendition)
		case 'm':
			applySgr(state, args.length === 0 ? [0] : args);
			break;

		// DEC Private Mode Set
		case 'h':
			handleDecPrivateMode(world, eid, state, params, true);
			break;
		// DEC Private Mode Reset
		case 'l':
			handleDecPrivateMode(world, eid, state, params, false);
			break;

		// Save/restore cursor
		case 's':
			state.savedCursorX = TerminalBuffer.cursorX[eid] ?? 0;
			state.savedCursorY = TerminalBuffer.cursorY[eid] ?? 0;
			break;
		case 'u':
			TerminalBuffer.cursorX[eid] = state.savedCursorX;
			TerminalBuffer.cursorY[eid] = state.savedCursorY;
			markDirty(world, eid);
			break;
	}
}

/**
 * Handles cursor visibility mode.
 */
function handleCursorVisibilityMode(world: World, eid: Entity, enable: boolean): void {
	TerminalBuffer.cursorVisible[eid] = enable ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Handles alternate screen buffer with cursor save/restore (mode 1049).
 */
function handleAltScreenWithCursorMode(
	world: World,
	eid: Entity,
	state: TerminalState,
	enable: boolean,
): void {
	if (enable) {
		// Save cursor and switch to alternate buffer
		state.savedCursorX = TerminalBuffer.cursorX[eid] ?? 0;
		state.savedCursorY = TerminalBuffer.cursorY[eid] ?? 0;
		switchToAlternateBuffer(world, eid, state);
	} else {
		// Switch back to main buffer and restore cursor
		switchToMainBuffer(world, eid, state);
		TerminalBuffer.cursorX[eid] = state.savedCursorX;
		TerminalBuffer.cursorY[eid] = state.savedCursorY;
	}
	markDirty(world, eid);
}

/**
 * Handles alternate screen buffer modes (47, 1047).
 */
function handleAltScreenMode(
	world: World,
	eid: Entity,
	state: TerminalState,
	mode: string,
	enable: boolean,
): void {
	if (enable) {
		switchToAlternateBuffer(world, eid, state);
		if (mode === '1047') {
			// Clear the alternate buffer
			clearCellRange(state, 0, state.buffer.cells.length);
		}
	} else {
		switchToMainBuffer(world, eid, state);
	}
	markDirty(world, eid);
}

/**
 * Handles DEC Private Mode sequences (CSI ? Ps h/l).
 */
function handleDecPrivateMode(
	world: World,
	eid: Entity,
	state: TerminalState,
	params: string,
	enable: boolean,
): void {
	// Remove leading '?' if present
	const mode = params.startsWith('?') ? params.slice(1) : params;

	if (mode === '25') {
		handleCursorVisibilityMode(world, eid, enable);
		return;
	}

	if (mode === '1049') {
		handleAltScreenWithCursorMode(world, eid, state, enable);
		return;
	}

	if (mode === '47' || mode === '1047') {
		handleAltScreenMode(world, eid, state, mode, enable);
		return;
	}

	// Other modes we don't handle yet but shouldn't error on
	// '7': Wraparound mode (we always wrap, so this is a no-op for now)
	// '1': Application cursor keys
	// '12': Start blinking cursor
	// '2004': Bracketed paste mode
}

/**
 * Switches to the alternate screen buffer.
 * Saves the current buffer and switches to a cleared alternate buffer.
 */
function switchToAlternateBuffer(_world: World, eid: Entity, state: TerminalState): void {
	if (TerminalBuffer.altScreenActive[eid] === 1) return; // Already in alt buffer

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	// Create alternate buffer to save current content
	if (!state.altBuffer) {
		state.altBuffer = createScreenBuffer(width, height);
	}

	// Copy current cells to alt buffer (saving main screen)
	for (let i = 0; i < state.buffer.cells.length && i < state.altBuffer.cells.length; i++) {
		const cell = state.buffer.cells[i];
		if (cell) {
			state.altBuffer.cells[i] = cloneCell(cell);
		}
	}

	// Clear the current buffer (now the "alternate" screen)
	const clearCell = createCell();
	for (let i = 0; i < state.buffer.cells.length; i++) {
		state.buffer.cells[i] = cloneCell(clearCell);
	}

	// Reset cursor to top-left
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	TerminalBuffer.altScreenActive[eid] = 1;
}

/**
 * Switches back to the main screen buffer.
 * Restores the saved buffer content.
 */
function switchToMainBuffer(_world: World, eid: Entity, state: TerminalState): void {
	if (TerminalBuffer.altScreenActive[eid] === 0) return; // Already in main buffer

	if (state.altBuffer) {
		// Restore the saved main buffer content
		for (let i = 0; i < state.altBuffer.cells.length && i < state.buffer.cells.length; i++) {
			const cell = state.altBuffer.cells[i];
			if (cell) {
				state.buffer.cells[i] = cloneCell(cell);
			}
		}
	}

	TerminalBuffer.altScreenActive[eid] = 0;
}

/**
 * Moves cursor up by n lines.
 */
function moveCursorUp(world: World, eid: Entity, n: number): void {
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;
	TerminalBuffer.cursorY[eid] = Math.max(0, cursorY - n);
	markDirty(world, eid);
}

/**
 * Moves cursor down by n lines, scrolling if necessary.
 */
function moveCursorDown(world: World, eid: Entity, state: TerminalState, n: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;
	let cursorY = TerminalBuffer.cursorY[eid] ?? 0;

	cursorY += n;
	while (cursorY >= height) {
		scrollUp(state, width, height);
		cursorY--;
	}
	TerminalBuffer.cursorY[eid] = cursorY;
	markDirty(world, eid);
}

/**
 * Moves cursor forward by n columns.
 */
function moveCursorForward(world: World, eid: Entity, n: number, width: number): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	TerminalBuffer.cursorX[eid] = Math.min(width - 1, cursorX + n);
	markDirty(world, eid);
}

/**
 * Moves cursor back by n columns.
 */
function moveCursorBack(world: World, eid: Entity, n: number): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	TerminalBuffer.cursorX[eid] = Math.max(0, cursorX - n);
	markDirty(world, eid);
}

/**
 * Clears cells in a range.
 */
function clearCellRange(state: TerminalState, startIdx: number, endIdx: number): void {
	const clearCell = createCell();
	for (let i = startIdx; i < endIdx; i++) {
		state.buffer.cells[i] = cloneCell(clearCell);
	}
}

/**
 * Clears a line segment.
 */
function clearLineSegment(
	state: TerminalState,
	width: number,
	y: number,
	startX: number,
	endX: number,
): void {
	const clearCell = createCell();
	for (let x = startX; x <= endX; x++) {
		const idx = y * width + x;
		state.buffer.cells[idx] = cloneCell(clearCell);
	}
}

/**
 * Clears entire lines.
 */
function clearLines(state: TerminalState, width: number, startY: number, endY: number): void {
	const clearCell = createCell();
	for (let y = startY; y < endY; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			state.buffer.cells[idx] = cloneCell(clearCell);
		}
	}
}

/**
 * Erases from cursor to end of display.
 */
function eraseCursorToEnd(
	state: TerminalState,
	width: number,
	height: number,
	cursorX: number,
	cursorY: number,
): void {
	// Clear current line from cursor
	clearLineSegment(state, width, cursorY, cursorX, width - 1);
	// Clear lines below
	clearLines(state, width, cursorY + 1, height);
}

/**
 * Erases from start to cursor.
 */
function eraseStartToCursor(
	state: TerminalState,
	width: number,
	cursorX: number,
	cursorY: number,
): void {
	// Clear lines above
	clearLines(state, width, 0, cursorY);
	// Clear current line up to cursor
	clearLineSegment(state, width, cursorY, 0, cursorX);
}

/**
 * Erases part of the display.
 */
function eraseInDisplay(world: World, eid: Entity, state: TerminalState, mode: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;

	if (mode === 0) {
		// Clear from cursor to end
		eraseCursorToEnd(state, width, height, cursorX, cursorY);
	} else if (mode === 1) {
		// Clear from start to cursor
		eraseStartToCursor(state, width, cursorX, cursorY);
	} else if (mode === 2 || mode === 3) {
		// Clear entire display
		clearCellRange(state, 0, state.buffer.cells.length);
		if (mode === 3) {
			clearScrollback(state.scrollback);
		}
	}

	markDirty(world, eid);
}

/**
 * Erases part of the current line.
 */
function eraseInLine(world: World, eid: Entity, state: TerminalState, mode: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;
	const clearCell = createCell();

	switch (mode) {
		case 0: // Clear from cursor to end of line
			for (let x = cursorX; x < width; x++) {
				const idx = cursorY * width + x;
				state.buffer.cells[idx] = cloneCell(clearCell);
			}
			break;
		case 1: // Clear from start of line to cursor
			for (let x = 0; x <= cursorX; x++) {
				const idx = cursorY * width + x;
				state.buffer.cells[idx] = cloneCell(clearCell);
			}
			break;
		case 2: // Clear entire line
			for (let x = 0; x < width; x++) {
				const idx = cursorY * width + x;
				state.buffer.cells[idx] = cloneCell(clearCell);
			}
			break;
	}
	markDirty(world, eid);
}

/**
 * SGR handler function type.
 * Returns the number of args consumed.
 */
type SgrHandler = (state: TerminalState, args: number[], i: number) => number;

/**
 * Handles reset (code 0).
 */
function handleSgrReset(state: TerminalState): number {
	state.currentAttr = createAttribute();
	return 1;
}

/**
 * Handles style codes (1-9).
 */
function handleSgrStyle(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.styles |= 1 << (code - 1);
	return 1;
}

/**
 * Handles style resets (22-29).
 */
function handleSgrStyleReset(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.styles &= ~(1 << (code - 22 + 1));
	return 1;
}

/**
 * Handles basic foreground colors (30-37).
 */
function handleSgrFgBasic(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.fg = { type: 1, value: code - 30 };
	return 1;
}

/**
 * Handles default foreground (39).
 */
function handleSgrFgDefault(state: TerminalState): number {
	state.currentAttr.fg = { type: 0, value: 0 };
	return 1;
}

/**
 * Handles basic background colors (40-47).
 */
function handleSgrBgBasic(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.bg = { type: 1, value: code - 40 };
	return 1;
}

/**
 * Handles default background (49).
 */
function handleSgrBgDefault(state: TerminalState): number {
	state.currentAttr.bg = { type: 0, value: 0 };
	return 1;
}

/**
 * Handles bright foreground colors (90-97).
 */
function handleSgrFgBright(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.fg = { type: 1, value: code - 90 + 8 };
	return 1;
}

/**
 * Handles bright background colors (100-107).
 */
function handleSgrBgBright(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.bg = { type: 1, value: code - 100 + 8 };
	return 1;
}

/**
 * Determines which handler to use for an SGR code.
 * Uses early returns to reduce complexity.
 */
function getSgrHandler(code: number): SgrHandler | null {
	// Reset
	if (code === 0) return handleSgrReset;

	// Styles and resets
	if (code >= 1 && code <= 9) return handleSgrStyle;
	if (code >= 22 && code <= 29) return handleSgrStyleReset;

	// Foreground colors
	if (code >= 30 && code <= 37) return handleSgrFgBasic;
	if (code === 39) return handleSgrFgDefault;
	if (code >= 90 && code <= 97) return handleSgrFgBright;

	// Background colors
	if (code >= 40 && code <= 47) return handleSgrBgBasic;
	if (code === 49) return handleSgrBgDefault;
	if (code >= 100 && code <= 107) return handleSgrBgBright;

	// Extended colors handled separately, unknown codes return null
	return null;
}

/**
 * Applies a single SGR code and returns the number of args consumed.
 */
function applySingleSgr(state: TerminalState, args: number[], i: number): number {
	const code = args[i] ?? 0;

	// Extended foreground (38;5;N or 38;2;R;G;B)
	if (code === 38) {
		const consumed = applyExtendedColor(state, args, i, 'fg');
		if (consumed > 0) return consumed;
		return 1; // Invalid extended color, skip
	}

	// Extended background (48;5;N or 48;2;R;G;B)
	if (code === 48) {
		const consumed = applyExtendedColor(state, args, i, 'bg');
		if (consumed > 0) return consumed;
		return 1; // Invalid extended color, skip
	}

	// Standard SGR codes
	const handler = getSgrHandler(code);
	if (handler) {
		return handler(state, args, i);
	}

	// Unknown code, skip
	return 1;
}

/**
 * Applies extended color codes (256-color or RGB).
 * Returns the number of args consumed, or 0 if invalid.
 */
function applyExtendedColor(
	state: TerminalState,
	args: number[],
	i: number,
	target: 'fg' | 'bg',
): number {
	if (i + 1 >= args.length) return 0;

	const subCode = args[i + 1];

	// 256-color mode (38;5;N or 48;5;N)
	if (subCode === 5 && i + 2 < args.length) {
		const colorIdx = args[i + 2] ?? 0;
		state.currentAttr[target] = { type: 2, value: colorIdx };
		return 3;
	}

	// RGB mode (38;2;R;G;B or 48;2;R;G;B)
	if (subCode === 2 && i + 4 < args.length) {
		const r = args[i + 2] ?? 0;
		const g = args[i + 3] ?? 0;
		const b = args[i + 4] ?? 0;
		state.currentAttr[target] = { type: 3, value: (r << 16) | (g << 8) | b };
		return 5;
	}

	return 0;
}

/**
 * Applies SGR (Select Graphic Rendition) codes.
 */
function applySgr(state: TerminalState, args: number[]): void {
	let i = 0;
	while (i < args.length) {
		const consumed = applySingleSgr(state, args, i);
		i += consumed;
	}
}

/**
 * Clears the terminal buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function clearTerminal(world: World, eid: Entity): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const clearCell = createCell();
	for (let i = 0; i < state.buffer.cells.length; i++) {
		state.buffer.cells[i] = cloneCell(clearCell);
	}

	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	state.currentAttr = createAttribute();

	markDirty(world, eid);
}

/**
 * Resets the terminal to initial state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function resetTerminal(world: World, eid: Entity): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	clearTerminal(world, eid);
	clearScrollback(state.scrollback);
	state.escapeBuffer = '';
	state.inEscape = false;
	state.savedCursorX = 0;
	state.savedCursorY = 0;
	state.savedAttr = createAttribute();
	TerminalBuffer.cursorVisible[eid] = 1;
	TerminalBuffer.scrollOffset[eid] = 0;

	markDirty(world, eid);
}

/**
 * Sets cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param x - Column (0-indexed)
 * @param y - Row (0-indexed)
 */
export function setCursorPosition(world: World, eid: Entity, x: number, y: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	TerminalBuffer.cursorX[eid] = Math.min(Math.max(x, 0), width - 1);
	TerminalBuffer.cursorY[eid] = Math.min(Math.max(y, 0), height - 1);

	markDirty(world, eid);
}

/**
 * Sets cursor visibility.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param visible - Cursor visibility
 */
export function setCursorVisible(world: World, eid: Entity, visible: boolean): void {
	TerminalBuffer.cursorVisible[eid] = visible ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Scrolls the terminal view up.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param lines - Number of lines to scroll
 */
export function scrollTerminalUp(world: World, eid: Entity, lines: number): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const currentOffset = TerminalBuffer.scrollOffset[eid] ?? 0;
	const maxOffset = state.scrollback.totalLines;
	TerminalBuffer.scrollOffset[eid] = Math.min(currentOffset + lines, maxOffset);

	markDirty(world, eid);
}

/**
 * Scrolls the terminal view down.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param lines - Number of lines to scroll
 */
export function scrollTerminalDown(world: World, eid: Entity, lines: number): void {
	const currentOffset = TerminalBuffer.scrollOffset[eid] ?? 0;
	TerminalBuffer.scrollOffset[eid] = Math.max(0, currentOffset - lines);

	markDirty(world, eid);
}

/**
 * Scrolls to the top of history.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function scrollTerminalToTop(world: World, eid: Entity): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	TerminalBuffer.scrollOffset[eid] = state.scrollback.totalLines;
	markDirty(world, eid);
}

/**
 * Scrolls to the bottom (current view).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function scrollTerminalToBottom(world: World, eid: Entity): void {
	TerminalBuffer.scrollOffset[eid] = 0;
	markDirty(world, eid);
}

/**
 * Resizes the terminal buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param width - New width in columns
 * @param height - New height in rows
 */
export function resizeTerminalBuffer(
	world: World,
	eid: Entity,
	width: number,
	height: number,
): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const oldWidth = TerminalBuffer.width[eid] ?? 0;
	const oldHeight = TerminalBuffer.height[eid] ?? 0;

	// Create new buffer
	const newBuffer = createScreenBuffer(width, height);

	// Copy existing content
	const copyWidth = Math.min(oldWidth, width);
	const copyHeight = Math.min(oldHeight, height);

	for (let y = 0; y < copyHeight; y++) {
		for (let x = 0; x < copyWidth; x++) {
			const srcIdx = y * oldWidth + x;
			const dstIdx = y * width + x;
			const srcCell = state.buffer.cells[srcIdx];
			if (srcCell) {
				newBuffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	// Update state
	(state as { buffer: ScreenBufferData }).buffer = newBuffer;
	TerminalBuffer.width[eid] = width;
	TerminalBuffer.height[eid] = height;

	// Clamp cursor
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;
	TerminalBuffer.cursorX[eid] = Math.min(cursorX, width - 1);
	TerminalBuffer.cursorY[eid] = Math.min(cursorY, height - 1);

	markDirty(world, eid);
}

/**
 * Removes a terminal buffer from an entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 */
export function removeTerminalBuffer(_world: World, eid: Entity): void {
	TerminalBuffer.isTerminal[eid] = 0;
	TerminalBuffer.width[eid] = 0;
	TerminalBuffer.height[eid] = 0;
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	TerminalBuffer.cursorVisible[eid] = 0;
	TerminalBuffer.scrollOffset[eid] = 0;
	TerminalBuffer.altScreenActive[eid] = 0;
	terminalStateMap.delete(eid);
}

/**
 * Renders scrollback lines to ANSI string.
 */
function renderScrollbackLines(state: TerminalState, height: number, scrollOffset: number): string {
	const scrollbackLines = getLineRange(
		state.scrollback,
		state.scrollback.totalLines - scrollOffset,
		state.scrollback.totalLines - scrollOffset + height,
	);

	let output = '';
	for (const line of scrollbackLines.lines) {
		output += line.ansi ?? line.text;
		output += '\n';
	}
	return output;
}

/**
 * Renders a single cell with color tracking.
 */
function renderCell(
	cell: Cell,
	lastColors: { fg: number; bg: number },
): { output: string; fg: number; bg: number } {
	let output = '';

	// Only emit color codes if they changed
	if (cell.fg !== lastColors.fg || cell.bg !== lastColors.bg) {
		output += '\x1b[0m'; // Reset
		// Would add full color conversion here
		lastColors.fg = cell.fg;
		lastColors.bg = cell.bg;
	}

	output += cell.char;
	return { output, fg: lastColors.fg, bg: lastColors.bg };
}

/**
 * Renders terminal buffer to an ANSI string (for display).
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns ANSI string representation of the terminal
 */
export function renderTerminalToAnsi(_world: World, eid: Entity): string {
	const state = terminalStateMap.get(eid);
	if (!state) return '';

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;
	const scrollOffset = TerminalBuffer.scrollOffset[eid] ?? 0;

	// If scrolled back, show scrollback content
	if (scrollOffset > 0) {
		return renderScrollbackLines(state, height, scrollOffset);
	}

	// Normal view: render buffer
	let output = '';
	const lastColors = { fg: -1, bg: -1 };

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			const cell = state.buffer.cells[idx];
			if (!cell) continue;

			const result = renderCell(cell, lastColors);
			output += result.output;
			lastColors.fg = result.fg;
			lastColors.bg = result.bg;
		}
		if (y < height - 1) {
			output += '\n';
		}
	}

	return output;
}

/**
 * Gets the cells for rendering.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 * @returns Readonly array of cells
 */
export function getTerminalCells(_world: World, eid: Entity): readonly Cell[] | undefined {
	const state = terminalStateMap.get(eid);
	return state?.buffer.cells;
}

/**
 * Resets the terminal buffer store (for testing).
 * @internal
 */
export function resetTerminalBufferStore(): void {
	TerminalBuffer.isTerminal.fill(0);
	TerminalBuffer.width.fill(0);
	TerminalBuffer.height.fill(0);
	TerminalBuffer.cursorX.fill(0);
	TerminalBuffer.cursorY.fill(0);
	TerminalBuffer.cursorVisible.fill(0);
	TerminalBuffer.scrollOffset.fill(0);
	TerminalBuffer.altScreenActive.fill(0);
	terminalStateMap.clear();
}
