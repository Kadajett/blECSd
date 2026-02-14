/**
 * Output system for writing rendered buffer to terminal.
 * Runs in the POST_RENDER phase after all rendering is complete.
 * @module systems/outputSystem
 */

import type { Writable } from 'node:stream';
import type { System, World } from '../core/types';
import { getWorldStore } from '../core/worldStore';
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
	/** Whether mouse tracking is enabled */
	mouseTracking: boolean;
	/** Mouse tracking mode */
	mouseMode: string | null;
	/** Whether synchronized output is active */
	syncOutput: boolean;
	/** Whether bracketed paste mode is enabled */
	bracketedPaste: boolean;
	/** Whether focus reporting is enabled */
	focusReporting: boolean;
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
		mouseTracking: false,
		mouseMode: null,
		syncOutput: false,
		bracketedPaste: false,
		focusReporting: false,
	};
}

// =============================================================================
// WORLD-SCOPED STORES (REPLACED MODULE-LEVEL SINGLETONS)
// =============================================================================

/**
 * Get world-scoped color sequence cache.
 * Note: This is a memoization cache that could theoretically be shared globally
 * (color values are deterministic), but scoped to world for consistency.
 *
 * Cache keys:
 * - Background colors: use the color value directly
 * - Foreground colors: use color value | 0x100000000 to distinguish from bg
 */
function getColorSequenceCache(world: World): Map<number, string> {
	return getWorldStore<number, string>(world, 'output:colorCache');
}

/**
 * Clears the color sequence cache.
 * Call this if the cache grows too large (unlikely in typical usage).
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { clearStyleCache } from 'blecsd';
 *
 * clearStyleCache(world); // Clear cached color sequences
 * ```
 */
export function clearStyleCache(world: World): void {
	getColorSequenceCache(world).clear();
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
 * Uses caching to avoid rebuilding sequences for repeated colors.
 */
function fgColor(world: World, color: number): string {
	// Check cache first
	const cacheKey = color | 0x100000000; // Set high bit to distinguish fg from bg
	const cached = getColorSequenceCache(world).get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	// Build sequence
	const { r, g, b, a } = unpackColor(color);
	const sequence = a === 0 ? sgr(39) : sgr(SGR.FG_256, 2, r, g, b);

	// Cache and return
	getColorSequenceCache(world).set(cacheKey, sequence);
	return sequence;
}

/**
 * Generates background color sequence (true color).
 * Uses caching to avoid rebuilding sequences for repeated colors.
 */
function bgColor(world: World, color: number): string {
	// Check cache first (use color value directly for bg)
	const cached = getColorSequenceCache(world).get(color);
	if (cached !== undefined) {
		return cached;
	}

	// Build sequence
	const { r, g, b, a } = unpackColor(color);
	const sequence = a === 0 ? sgr(49) : sgr(SGR.BG_256, 2, r, g, b);

	// Cache and return
	getColorSequenceCache(world).set(color, sequence);
	return sequence;
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
function generateStyleSequences(world: World, state: OutputState, cell: Cell): string {
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
		output += fgColor(world, cell.fg);
		state.lastFg = cell.fg;
	}

	// Set background color (if changed)
	if (cell.bg !== state.lastBg) {
		output += bgColor(world, cell.bg);
		state.lastBg = cell.bg;
	}

	return output;
}

/**
 * Generates output for a single cell change.
 * @internal
 */
function generateCellOutput(world: World, state: OutputState, change: CellChange): string {
	const { x, y, cell } = change;
	let output = '';

	// Cursor movement
	output += generateCursorMove(state, x, y);

	// Style changes
	output += generateStyleSequences(world, state, cell);

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
 * Uses array accumulator for efficient string building and batches
 * consecutive cells with identical styles to minimize SGR emissions.
 *
 * @param state - Output state
 * @param changes - Array of cell changes
 * @param skipSort - Skip sorting if changes are already in row-major order
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
/** Sort changes by row then column for optimal cursor movement. */
function sortChangesByPosition(
	changes: readonly CellChange[],
	skipSort: boolean,
): readonly CellChange[] {
	if (skipSort) return changes;
	const mutable = Array.from(changes);
	mutable.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
	return mutable;
}

/** Find the end index of a style run starting at `startIndex`. */
function findStyleRunEnd(changes: readonly CellChange[], startIndex: number): number {
	let endIndex = startIndex + 1;
	while (endIndex < changes.length) {
		const current = changes[endIndex];
		const prev = changes[endIndex - 1];
		if (!current || !prev) break;
		const isContinuation =
			current.y === prev.y &&
			current.x === prev.x + 1 &&
			current.cell.fg === prev.cell.fg &&
			current.cell.bg === prev.cell.bg &&
			current.cell.attrs === prev.cell.attrs;
		if (!isContinuation) break;
		endIndex++;
	}
	return endIndex;
}

/** Emit a batched style run (multiple cells with same style) to chunks. */
function emitStyleRun(world: World, 
	state: OutputState,
	changes: readonly CellChange[],
	startIndex: number,
	endIndex: number,
	chunks: string[],
): void {
	const firstChange = changes[startIndex];
	if (!firstChange) return;
	chunks.push(generateCursorMove(state, firstChange.x, firstChange.y));
	chunks.push(generateStyleSequences(world, state, firstChange.cell));
	for (let i = startIndex; i < endIndex; i++) {
		const change = changes[i];
		if (change) chunks.push(change.cell.char);
	}
	state.lastX = firstChange.x + (endIndex - startIndex);
	state.lastY = firstChange.y;
}

export function generateOutput(world: World, 
	state: OutputState,
	changes: readonly CellChange[],
	skipSort = false,
): string {
	if (changes.length === 0) return '';

	const chunks: string[] = [];
	const sortedChanges = sortChangesByPosition(changes, skipSort);

	let runStartIndex = 0;
	while (runStartIndex < sortedChanges.length) {
		if (!sortedChanges[runStartIndex]) break;
		const runEndIndex = findStyleRunEnd(sortedChanges, runStartIndex);

		if (runEndIndex - runStartIndex === 1) {
			const change = sortedChanges[runStartIndex];
			if (change) chunks.push(generateCellOutput(world, state, change));
		} else {
			emitStyleRun(world, state, sortedChanges, runStartIndex, runEndIndex, chunks);
		}
		runStartIndex = runEndIndex;
	}

	return chunks.join('');
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
export const outputSystem: System = (world: World): World => {
	if (!outputStream || !outputDoubleBuffer) {
		return world;
	}

	// PERF: Get state once at start to avoid repeated function calls
	const state = getOutputState();

	// Check if this is a full redraw BEFORE getting updates
	const isFullRedraw = outputDoubleBuffer.fullRedraw;

	// Get minimal updates
	const changes = getMinimalUpdates(outputDoubleBuffer);

	if (changes.length === 0) {
		// Still swap and clear even if no changes
		swapBuffers(outputDoubleBuffer);
		clearDirtyRegions(outputDoubleBuffer);
		return world;
	}

	// PERF: Generate output with pre-fetched state
	// Skip sorting for full redraws since collectAllCells() already returns row-major order
	const output = generateOutput(world, state, changes, isFullRedraw);

	// Write to stream (only if we have output)
	if (output.length > 0) {
		outputStream.write(output);
	}

	// Swap buffers and clear dirty regions
	swapBuffers(outputDoubleBuffer);
	clearDirtyRegions(outputDoubleBuffer);

	return world;
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
 * Rings the terminal bell.
 *
 * @example
 * ```typescript
 * import { bell } from 'blecsd';
 *
 * bell(); // Produce audible or visual bell
 * ```
 */
export function bell(): void {
	writeRaw('\x07');
}

/**
 * Moves cursor to a specific position.
 *
 * @param x - Column position (0-indexed)
 * @param y - Row position (0-indexed)
 *
 * @example
 * ```typescript
 * import { moveTo } from 'blecsd';
 *
 * moveTo(10, 5); // Move to column 10, row 5
 * ```
 */
export function moveTo(x: number, y: number): void {
	writeRaw(moveCursor(x, y));
	const state = getOutputState();
	state.lastX = x;
	state.lastY = y;
}

/**
 * Enables mouse tracking in the terminal.
 *
 * @param mode - Mouse tracking mode: 'normal' (clicks only), 'button' (clicks + drag), or 'any' (all motion). Default is 'any'.
 *
 * @example
 * ```typescript
 * import { enableMouseTracking } from 'blecsd';
 *
 * enableMouseTracking('any'); // Track all mouse motion
 * enableMouseTracking('button'); // Track only when button pressed
 * enableMouseTracking('normal'); // Track clicks only
 * ```
 */
export function enableMouseTracking(mode: 'normal' | 'button' | 'any' = 'any'): void {
	const state = getOutputState();

	// Enable SGR extended mouse coordinates
	writeRaw(`${CSI}?1006h`);

	// Enable appropriate tracking mode
	if (mode === 'normal') {
		// Normal tracking (clicks only)
		writeRaw(`${CSI}?1000h`);
	} else if (mode === 'button') {
		// Button event tracking (clicks + drag)
		writeRaw(`${CSI}?1002h`);
	} else {
		// Any event tracking (all motion)
		writeRaw(`${CSI}?1003h`);
	}

	state.mouseTracking = true;
	state.mouseMode = mode;
}

/**
 * Disables mouse tracking in the terminal.
 *
 * @example
 * ```typescript
 * import { disableMouseTracking } from 'blecsd';
 *
 * disableMouseTracking();
 * ```
 */
export function disableMouseTracking(): void {
	const state = getOutputState();

	// Disable all tracking modes
	writeRaw(`${CSI}?1000l`); // Normal
	writeRaw(`${CSI}?1002l`); // Button
	writeRaw(`${CSI}?1003l`); // Any
	writeRaw(`${CSI}?1006l`); // SGR extended

	state.mouseTracking = false;
	state.mouseMode = null;
}

/**
 * Sets the terminal cursor shape.
 *
 * @param shape - Cursor shape: 'block', 'underline', or 'bar'
 *
 * @example
 * ```typescript
 * import { setTerminalCursorShape } from 'blecsd';
 *
 * setTerminalCursorShape('block'); // Block cursor
 * setTerminalCursorShape('underline'); // Underline cursor
 * setTerminalCursorShape('bar'); // Bar/vertical line cursor
 * ```
 */
export function setTerminalCursorShape(shape: 'block' | 'underline' | 'bar'): void {
	const shapeCode = shape === 'block' ? 2 : shape === 'underline' ? 4 : 6;
	writeRaw(`${CSI}${shapeCode} q`);
}

/**
 * Sets the terminal window title.
 *
 * @param title - Window title string
 *
 * @example
 * ```typescript
 * import { setWindowTitle } from 'blecsd';
 *
 * setWindowTitle('My Terminal App');
 * ```
 */
export function setWindowTitle(title: string): void {
	writeRaw(`\x1b]2;${title}\x07`);
}

/**
 * Begins synchronized output mode.
 * Prevents partial screen updates from being displayed.
 *
 * @example
 * ```typescript
 * import { beginSyncOutput, endSyncOutput } from 'blecsd';
 *
 * beginSyncOutput();
 * // ... render multiple updates ...
 * endSyncOutput(); // All updates appear atomically
 * ```
 */
export function beginSyncOutput(): void {
	writeRaw(`${CSI}?2026h`);
	const state = getOutputState();
	state.syncOutput = true;
}

/**
 * Ends synchronized output mode.
 *
 * @example
 * ```typescript
 * import { endSyncOutput } from 'blecsd';
 *
 * endSyncOutput();
 * ```
 */
export function endSyncOutput(): void {
	writeRaw(`${CSI}?2026l`);
	const state = getOutputState();
	state.syncOutput = false;
}

/**
 * Saves the current cursor position.
 *
 * @example
 * ```typescript
 * import { saveCursorPosition, restoreCursorPosition } from 'blecsd';
 *
 * saveCursorPosition();
 * // ... move cursor and draw ...
 * restoreCursorPosition(); // Return to saved position
 * ```
 */
export function saveCursorPosition(): void {
	writeRaw('\x1b7');
}

/**
 * Restores the previously saved cursor position.
 *
 * @example
 * ```typescript
 * import { restoreCursorPosition } from 'blecsd';
 *
 * restoreCursorPosition();
 * ```
 */
export function restoreCursorPosition(): void {
	writeRaw('\x1b8');
}

/**
 * Enables bracketed paste mode in the terminal.
 * When enabled, pasted text is bracketed with special sequences.
 *
 * @example
 * ```typescript
 * import { enableBracketedPasteMode } from 'blecsd';
 *
 * enableBracketedPasteMode();
 * ```
 */
export function enableBracketedPasteMode(): void {
	writeRaw(`${CSI}?2004h`);
	const state = getOutputState();
	state.bracketedPaste = true;
}

/**
 * Disables bracketed paste mode in the terminal.
 *
 * @example
 * ```typescript
 * import { disableBracketedPasteMode } from 'blecsd';
 *
 * disableBracketedPasteMode();
 * ```
 */
export function disableBracketedPasteMode(): void {
	writeRaw(`${CSI}?2004l`);
	const state = getOutputState();
	state.bracketedPaste = false;
}

/**
 * Enables focus reporting in the terminal.
 * When enabled, the terminal sends focus in/out events.
 *
 * @example
 * ```typescript
 * import { enableFocusReporting } from 'blecsd';
 *
 * enableFocusReporting();
 * ```
 */
export function enableFocusReporting(): void {
	writeRaw(`${CSI}?1004h`);
	const state = getOutputState();
	state.focusReporting = true;
}

/**
 * Disables focus reporting in the terminal.
 *
 * @example
 * ```typescript
 * import { disableFocusReporting } from 'blecsd';
 *
 * disableFocusReporting();
 * ```
 */
export function disableFocusReporting(): void {
	writeRaw(`${CSI}?1004l`);
	const state = getOutputState();
	state.focusReporting = false;
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

	if (state.bracketedPaste) {
		disableBracketedPasteMode();
	}

	if (state.focusReporting) {
		disableFocusReporting();
	}

	if (state.mouseTracking) {
		disableMouseTracking();
	}

	if (state.syncOutput) {
		endSyncOutput();
	}

	if (state.alternateScreen) {
		leaveAlternateScreen();
	}

	resetAttributes();
	showCursor();
	cursorHome();
}
