/**
 * Output system for writing rendered buffer to terminal.
 * Runs in the POST_RENDER phase after all rendering is complete.
 * @module systems/outputSystem
 */

import type { Writable } from 'node:stream';
import type { System, World } from '../core/types';
import type { Cell, CellChange } from '../terminal/screen/cell';
import { Attr } from '../terminal/screen/cell';
import type { DoubleBufferData } from '../terminal/screen/doubleBuffer';
import { clearDirtyRegions, getMinimalUpdates, swapBuffers } from '../terminal/screen/doubleBuffer';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Control Sequence Introducer */
const CSI = '\x1b[';

/** SGR codes */
const SGR = {
	RESET: 0,
	BOLD: 1,
	DIM: 2,
	ITALIC: 3,
	UNDERLINE: 4,
	BLINK: 5,
	INVERSE: 7,
	HIDDEN: 8,
	STRIKETHROUGH: 9,
	FG_256: 38,
	BG_256: 48,
} as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Output state maintained across frames.
 */
export interface OutputState {
	/** Last cursor X position (0-indexed) */
	lastX: number;
	/** Last cursor Y position (0-indexed) */
	lastY: number;
	/** Last foreground color */
	lastFg: number;
	/** Last background color */
	lastBg: number;
	/** Last attributes */
	lastAttrs: number;
	/** Whether we're in alternate screen mode */
	alternateScreen: boolean;
}

/**
 * Creates initial output state.
 */
export function createOutputState(): OutputState {
	return {
		lastX: -1,
		lastY: -1,
		lastFg: -1,
		lastBg: -1,
		lastAttrs: -1,
		alternateScreen: false,
	};
}

// =============================================================================
// ANSI SEQUENCE GENERATION
// =============================================================================

/**
 * Generates SGR sequence for codes.
 */
function sgr(...codes: number[]): string {
	return `${CSI}${codes.join(';')}m`;
}

/**
 * Generates cursor move sequence (1-indexed).
 */
function moveCursor(x: number, y: number): string {
	return `${CSI}${y + 1};${x + 1}H`;
}

/**
 * Generates cursor column move sequence (1-indexed).
 */
function moveColumn(x: number): string {
	return `${CSI}${x + 1}G`;
}

/**
 * Generates cursor forward sequence.
 */
function cursorForward(n: number): string {
	if (n === 1) return `${CSI}C`;
	return `${CSI}${n}C`;
}

/**
 * Extracts RGB components from packed ARGB color.
 */
function unpackColor(color: number): { r: number; g: number; b: number; a: number } {
	return {
		a: (color >>> 24) & 0xff,
		r: (color >>> 16) & 0xff,
		g: (color >>> 8) & 0xff,
		b: color & 0xff,
	};
}

/**
 * Generates foreground color sequence (true color).
 */
function fgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) {
		// Transparent/default
		return sgr(39);
	}
	return sgr(SGR.FG_256, 2, r, g, b);
}

/**
 * Generates background color sequence (true color).
 */
function bgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) {
		// Transparent/default
		return sgr(49);
	}
	return sgr(SGR.BG_256, 2, r, g, b);
}

/**
 * Generates attribute sequence from packed attrs.
 */
function attrsSequence(attrs: number): string {
	const codes: number[] = [];

	if (attrs === Attr.NONE) {
		return '';
	}

	if (attrs & Attr.BOLD) codes.push(SGR.BOLD);
	if (attrs & Attr.DIM) codes.push(SGR.DIM);
	if (attrs & Attr.ITALIC) codes.push(SGR.ITALIC);
	if (attrs & Attr.UNDERLINE) codes.push(SGR.UNDERLINE);
	if (attrs & Attr.BLINK) codes.push(SGR.BLINK);
	if (attrs & Attr.INVERSE) codes.push(SGR.INVERSE);
	if (attrs & Attr.HIDDEN) codes.push(SGR.HIDDEN);
	if (attrs & Attr.STRIKETHROUGH) codes.push(SGR.STRIKETHROUGH);

	if (codes.length === 0) {
		return '';
	}

	return sgr(...codes);
}

// =============================================================================
// OUTPUT GENERATION
// =============================================================================

/**
 * Generates optimal cursor movement sequence.
 * @internal
 */
function generateCursorMove(state: OutputState, x: number, y: number): string {
	// Same position, no move needed
	if (state.lastX === x && state.lastY === y) {
		return '';
	}

	// Same row, move within row
	if (state.lastY === y) {
		const diff = x - state.lastX;
		if (diff === 1) {
			// Implicit advance from previous character
			return '';
		}
		if (diff > 0 && diff <= 4) {
			// Short forward move
			return cursorForward(diff);
		}
		// Column move
		return moveColumn(x);
	}

	// Different row, full move
	return moveCursor(x, y);
}

/**
 * Generates style sequences for a cell.
 * @internal
 */
function generateStyleSequences(state: OutputState, cell: Cell): string {
	let output = '';

	// Check if we need a full reset (simpler than tracking all attr changes)
	const needsReset =
		state.lastAttrs !== -1 && state.lastAttrs !== Attr.NONE && cell.attrs === Attr.NONE;

	if (needsReset) {
		output += sgr(SGR.RESET);
		state.lastFg = -1;
		state.lastBg = -1;
		state.lastAttrs = -1;
	}

	// Set attributes (if changed and not none)
	if (cell.attrs !== state.lastAttrs && cell.attrs !== Attr.NONE) {
		// Reset first if we had different attrs
		if (state.lastAttrs !== -1 && state.lastAttrs !== Attr.NONE) {
			output += sgr(SGR.RESET);
			state.lastFg = -1;
			state.lastBg = -1;
		}
		output += attrsSequence(cell.attrs);
		state.lastAttrs = cell.attrs;
	} else if (cell.attrs === Attr.NONE && state.lastAttrs === -1) {
		state.lastAttrs = Attr.NONE;
	}

	// Set foreground color (if changed)
	if (cell.fg !== state.lastFg) {
		output += fgColor(cell.fg);
		state.lastFg = cell.fg;
	}

	// Set background color (if changed)
	if (cell.bg !== state.lastBg) {
		output += bgColor(cell.bg);
		state.lastBg = cell.bg;
	}

	return output;
}

/**
 * Generates output for a single cell change.
 * @internal
 */
function generateCellOutput(state: OutputState, change: CellChange): string {
	const { x, y, cell } = change;
	let output = '';

	// Cursor movement
	output += generateCursorMove(state, x, y);

	// Style changes
	output += generateStyleSequences(state, cell);

	// Character
	output += cell.char;

	// Update cursor position (advances by 1 for single-width chars)
	state.lastX = x + 1;
	state.lastY = y;

	return output;
}

/**
 * Generates optimized output for all cell changes.
 *
 * @param state - Output state
 * @param changes - Array of cell changes
 * @returns ANSI output string
 *
 * @example
 * ```typescript
 * import { generateOutput, createOutputState } from 'blecsd';
 *
 * const state = createOutputState();
 * const output = generateOutput(state, changes);
 * process.stdout.write(output);
 * ```
 */
export function generateOutput(state: OutputState, changes: readonly CellChange[]): string {
	if (changes.length === 0) {
		return '';
	}

	let output = '';

	// Sort changes by row then column for optimal cursor movement
	const sortedChanges = [...changes].sort((a, b) => {
		if (a.y !== b.y) return a.y - b.y;
		return a.x - b.x;
	});

	for (const change of sortedChanges) {
		output += generateCellOutput(state, change);
	}

	return output;
}

// =============================================================================
// OUTPUT SYSTEM
// =============================================================================

/** Module-level output state */
let outputState: OutputState | null = null;

/** Module-level output stream */
let outputStream: Writable | null = null;

/** Module-level double buffer reference */
let outputDoubleBuffer: DoubleBufferData | null = null;

/**
 * Sets the output stream for the output system.
 *
 * @param stream - Writable stream (typically process.stdout)
 *
 * @example
 * ```typescript
 * import { setOutputStream } from 'blecsd';
 *
 * setOutputStream(process.stdout);
 * ```
 */
export function setOutputStream(stream: Writable): void {
	outputStream = stream;
}

/**
 * Gets the current output stream.
 *
 * @returns The current output stream or null
 */
export function getOutputStream(): Writable | null {
	return outputStream;
}

/**
 * Clears the output stream reference.
 */
export function clearOutputStream(): void {
	outputStream = null;
}

/**
 * Sets the double buffer for the output system.
 *
 * @param db - The double buffer
 *
 * @example
 * ```typescript
 * import { setOutputBuffer, createDoubleBuffer } from 'blecsd';
 *
 * const db = createDoubleBuffer(80, 24);
 * setOutputBuffer(db);
 * ```
 */
export function setOutputBuffer(db: DoubleBufferData): void {
	outputDoubleBuffer = db;
}

/**
 * Gets the current output buffer.
 *
 * @returns The current double buffer or null
 */
export function getOutputBuffer(): DoubleBufferData | null {
	return outputDoubleBuffer;
}

/**
 * Clears the output buffer reference.
 */
export function clearOutputBuffer(): void {
	outputDoubleBuffer = null;
}

/**
 * Gets or creates the output state.
 *
 * @returns The output state
 */
export function getOutputState(): OutputState {
	if (!outputState) {
		outputState = createOutputState();
	}
	return outputState;
}

/**
 * Resets the output state.
 */
export function resetOutputState(): void {
	outputState = createOutputState();
}

/**
 * Output system that writes rendered content to the terminal.
 *
 * The system:
 * 1. Gets minimal updates from the double buffer
 * 2. Generates optimized ANSI sequences
 * 3. Writes to the output stream
 * 4. Swaps buffers and clears dirty regions
 *
 * @param world - The ECS world
 * @returns The world (unchanged)
 *
 * @example
 * ```typescript
 * import {
 *   outputSystem,
 *   setOutputStream,
 *   setOutputBuffer,
 *   createScheduler,
 *   LoopPhase,
 * } from 'blecsd';
 *
 * // Setup
 * setOutputStream(process.stdout);
 * setOutputBuffer(doubleBuffer);
 *
 * // Register in POST_RENDER phase
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.POST_RENDER, outputSystem);
 * ```
 */
export const outputSystem: System = (_world: World): World => {
	if (!outputStream || !outputDoubleBuffer) {
		return _world;
	}

	// Get minimal updates
	const changes = getMinimalUpdates(outputDoubleBuffer);

	if (changes.length === 0) {
		// Still swap and clear even if no changes
		swapBuffers(outputDoubleBuffer);
		clearDirtyRegions(outputDoubleBuffer);
		return _world;
	}

	// Generate output
	const state = getOutputState();
	const output = generateOutput(state, changes);

	// Write to stream
	if (output.length > 0) {
		outputStream.write(output);
	}

	// Swap buffers and clear dirty regions
	swapBuffers(outputDoubleBuffer);
	clearDirtyRegions(outputDoubleBuffer);

	return _world;
};

/**
 * Creates the output system function.
 *
 * @returns A new output system function
 *
 * @example
 * ```typescript
 * import { createOutputSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.POST_RENDER, createOutputSystem());
 * ```
 */
export function createOutputSystem(): System {
	return outputSystem;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Writes raw output to the stream.
 * Bypasses the double buffer for immediate output.
 *
 * @param data - String data to write
 *
 * @example
 * ```typescript
 * import { writeRaw } from 'blecsd';
 *
 * // Write raw ANSI sequence
 * writeRaw('\x1b[2J'); // Clear screen
 * ```
 */
export function writeRaw(data: string): void {
	if (outputStream) {
		outputStream.write(data);
	}
}

/**
 * Hides the terminal cursor.
 *
 * @example
 * ```typescript
 * import { hideCursor } from 'blecsd';
 *
 * hideCursor();
 * ```
 */
export function hideCursor(): void {
	writeRaw(`${CSI}?25l`);
}

/**
 * Shows the terminal cursor.
 *
 * @example
 * ```typescript
 * import { showCursor } from 'blecsd';
 *
 * showCursor();
 * ```
 */
export function showCursor(): void {
	writeRaw(`${CSI}?25h`);
}

/**
 * Enters alternate screen buffer mode.
 *
 * @example
 * ```typescript
 * import { enterAlternateScreen } from 'blecsd';
 *
 * enterAlternateScreen();
 * // ... render application ...
 * leaveAlternateScreen();
 * ```
 */
export function enterAlternateScreen(): void {
	writeRaw(`${CSI}?1049h`);
	const state = getOutputState();
	state.alternateScreen = true;
}

/**
 * Leaves alternate screen buffer mode.
 *
 * @example
 * ```typescript
 * import { leaveAlternateScreen } from 'blecsd';
 *
 * leaveAlternateScreen();
 * ```
 */
export function leaveAlternateScreen(): void {
	writeRaw(`${CSI}?1049l`);
	const state = getOutputState();
	state.alternateScreen = false;
}

/**
 * Clears the entire screen.
 *
 * @example
 * ```typescript
 * import { clearScreen } from 'blecsd';
 *
 * clearScreen();
 * ```
 */
export function clearScreen(): void {
	writeRaw(`${CSI}2J`);
}

/**
 * Moves cursor to home position (0, 0).
 *
 * @example
 * ```typescript
 * import { cursorHome } from 'blecsd';
 *
 * cursorHome();
 * ```
 */
export function cursorHome(): void {
	writeRaw(`${CSI}H`);
	const state = getOutputState();
	state.lastX = 0;
	state.lastY = 0;
}

/**
 * Resets all terminal attributes.
 *
 * @example
 * ```typescript
 * import { resetAttributes } from 'blecsd';
 *
 * resetAttributes();
 * ```
 */
export function resetAttributes(): void {
	writeRaw(sgr(SGR.RESET));
	const state = getOutputState();
	state.lastFg = -1;
	state.lastBg = -1;
	state.lastAttrs = -1;
}

/**
 * Flushes output and resets terminal state.
 * Call this before exiting the application.
 *
 * @example
 * ```typescript
 * import { cleanup } from 'blecsd';
 *
 * // Before exiting
 * cleanup();
 * ```
 */
export function cleanup(): void {
	const state = getOutputState();

	if (state.alternateScreen) {
		leaveAlternateScreen();
	}

	resetAttributes();
	showCursor();
	cursorHome();
}
