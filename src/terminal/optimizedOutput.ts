/**
 * Optimized Output Buffer
 *
 * High-performance output buffering with escape sequence optimization.
 * Batches terminal output and removes redundant escape sequences for
 * efficient rendering.
 *
 * Key optimizations:
 * - Single write() call per frame
 * - Cursor position tracking to skip unnecessary moves
 * - Color state deduplication
 * - Escape sequence coalescing
 *
 * @module terminal/optimizedOutput
 *
 * @example
 * ```typescript
 * import {
 *   createOutputBuffer,
 *   writeCellAt,
 *   flushToStream,
 *   getOutputStats,
 * } from 'blecsd';
 *
 * const buffer = createOutputBuffer();
 *
 * // Write cells with automatic optimization
 * writeCellAt(buffer, 0, 0, 'H', 0xff0000, 0x000000);
 * writeCellAt(buffer, 1, 0, 'i', 0xff0000, 0x000000); // Same colors, no color reset
 *
 * // Flush to terminal
 * flushToStream(buffer, process.stdout);
 *
 * // Check optimization stats
 * const stats = getOutputStats(buffer);
 * console.log(`Saved ${stats.bytesSaved} bytes via optimization`);
 * ```
 */

import type { Writable } from 'node:stream';
import { cursor as cursorAnsi, style as styleAnsi, sync as syncAnsi } from './ansi';

/**
 * Output buffer configuration options.
 */
export interface OutputBufferOptions {
	/** Initial buffer capacity in characters (default: 8192) */
	readonly initialCapacity?: number;
	/** Enable synchronized output mode (default: true) */
	readonly syncMode?: boolean;
	/** Track statistics for debugging (default: false) */
	readonly trackStats?: boolean;
}

/**
 * Color state for tracking current terminal styling.
 */
export interface ColorState {
	/** Current foreground color (24-bit RGB or -1 for default) */
	fg: number;
	/** Current background color (24-bit RGB or -1 for default) */
	bg: number;
	/** Current text attributes (bold, italic, etc.) */
	attrs: number;
}

/**
 * Statistics about buffer operations.
 */
export interface OutputStats {
	/** Number of cells written */
	cellsWritten: number;
	/** Number of cursor moves issued */
	cursorMoves: number;
	/** Number of cursor moves skipped (already at position) */
	cursorMovesSkipped: number;
	/** Number of color changes issued */
	colorChanges: number;
	/** Number of color changes skipped (already set) */
	colorChangesSkipped: number;
	/** Total bytes written */
	bytesWritten: number;
	/** Bytes saved via optimization */
	bytesSaved: number;
}

/**
 * Text attribute flags.
 */
export const ATTR_BOLD = 1 << 0;
export const ATTR_DIM = 1 << 1;
export const ATTR_ITALIC = 1 << 2;
export const ATTR_UNDERLINE = 1 << 3;
export const ATTR_BLINK = 1 << 4;
export const ATTR_INVERSE = 1 << 5;
export const ATTR_HIDDEN = 1 << 6;
export const ATTR_STRIKETHROUGH = 1 << 7;

/**
 * Default/reset color value.
 */
export const DEFAULT_COLOR = -1;

/**
 * Optimized output buffer data.
 */
export interface OutputBufferData {
	/** Character buffer */
	readonly chunks: string[];
	/** Current cursor X position (0-indexed) */
	cursorX: number;
	/** Current cursor Y position (0-indexed) */
	cursorY: number;
	/** Known cursor position (for skipping moves) */
	knownCursorX: number;
	knownCursorY: number;
	/** Whether cursor position is known */
	cursorKnown: boolean;
	/** Current color state */
	readonly colorState: ColorState;
	/** Whether synchronized output is enabled */
	syncMode: boolean;
	/** Whether we're inside a sync frame */
	inSyncFrame: boolean;
	/** Statistics tracking */
	readonly stats: OutputStats;
	/** Whether to track stats */
	trackStats: boolean;
	/** Screen width for line wrap detection */
	screenWidth: number;
	/** Screen height */
	screenHeight: number;
}

/**
 * Creates a new optimized output buffer.
 *
 * @param options - Buffer configuration
 * @returns A new output buffer
 *
 * @example
 * ```typescript
 * const buffer = createOutputBuffer({ syncMode: true });
 * ```
 */
export function createOutputBuffer(options: OutputBufferOptions = {}): OutputBufferData {
	return {
		chunks: [],
		cursorX: 0,
		cursorY: 0,
		knownCursorX: 0,
		knownCursorY: 0,
		cursorKnown: false,
		colorState: {
			fg: DEFAULT_COLOR,
			bg: DEFAULT_COLOR,
			attrs: 0,
		},
		syncMode: options.syncMode ?? true,
		inSyncFrame: false,
		stats: {
			cellsWritten: 0,
			cursorMoves: 0,
			cursorMovesSkipped: 0,
			colorChanges: 0,
			colorChangesSkipped: 0,
			bytesWritten: 0,
			bytesSaved: 0,
		},
		trackStats: options.trackStats ?? false,
		screenWidth: 80,
		screenHeight: 24,
	};
}

/**
 * Sets the screen dimensions for line wrap calculations.
 *
 * @param buffer - The output buffer
 * @param width - Screen width in columns
 * @param height - Screen height in rows
 */
export function setScreenSize(buffer: OutputBufferData, width: number, height: number): void {
	buffer.screenWidth = width;
	buffer.screenHeight = height;
}

/**
 * Resets the color state to defaults.
 *
 * @param buffer - The output buffer
 */
export function resetColorState(buffer: OutputBufferData): void {
	if (
		buffer.colorState.fg !== DEFAULT_COLOR ||
		buffer.colorState.bg !== DEFAULT_COLOR ||
		buffer.colorState.attrs !== 0
	) {
		buffer.chunks.push(styleAnsi.reset());
		buffer.colorState.fg = DEFAULT_COLOR;
		buffer.colorState.bg = DEFAULT_COLOR;
		buffer.colorState.attrs = 0;
	}
}

/**
 * Sets the foreground color, skipping if already set.
 *
 * @param buffer - The output buffer
 * @param color - RGB color (24-bit) or DEFAULT_COLOR for reset
 */
export function setForeground(buffer: OutputBufferData, color: number): void {
	if (buffer.colorState.fg === color) {
		if (buffer.trackStats) {
			buffer.stats.colorChangesSkipped++;
			buffer.stats.bytesSaved += 11; // Approximate SGR sequence length
		}
		return;
	}

	if (color === DEFAULT_COLOR) {
		buffer.chunks.push('\x1b[39m');
	} else {
		const r = (color >> 16) & 0xff;
		const g = (color >> 8) & 0xff;
		const b = color & 0xff;
		buffer.chunks.push(`\x1b[38;2;${r};${g};${b}m`);
	}

	buffer.colorState.fg = color;
	if (buffer.trackStats) {
		buffer.stats.colorChanges++;
	}
}

/**
 * Sets the background color, skipping if already set.
 *
 * @param buffer - The output buffer
 * @param color - RGB color (24-bit) or DEFAULT_COLOR for reset
 */
export function setBackground(buffer: OutputBufferData, color: number): void {
	if (buffer.colorState.bg === color) {
		if (buffer.trackStats) {
			buffer.stats.colorChangesSkipped++;
			buffer.stats.bytesSaved += 11;
		}
		return;
	}

	if (color === DEFAULT_COLOR) {
		buffer.chunks.push('\x1b[49m');
	} else {
		const r = (color >> 16) & 0xff;
		const g = (color >> 8) & 0xff;
		const b = color & 0xff;
		buffer.chunks.push(`\x1b[48;2;${r};${g};${b}m`);
	}

	buffer.colorState.bg = color;
	if (buffer.trackStats) {
		buffer.stats.colorChanges++;
	}
}

/**
 * Sets text attributes, only changing what differs.
 *
 * @param buffer - The output buffer
 * @param attrs - Attribute flags
 */
export function setAttributes(buffer: OutputBufferData, attrs: number): void {
	const current = buffer.colorState.attrs;
	if (current === attrs) {
		return;
	}

	// Check each attribute and only emit changes
	const added = attrs & ~current;
	const removed = current & ~attrs;

	// Handle removed attributes (need to reset and re-add others)
	if (removed !== 0) {
		// Reset all SGR and re-apply
		buffer.chunks.push('\x1b[0m');
		buffer.colorState.attrs = 0;
		buffer.colorState.fg = DEFAULT_COLOR;
		buffer.colorState.bg = DEFAULT_COLOR;
		// Re-apply all attrs
		applyAttributesRaw(buffer, attrs);
		buffer.colorState.attrs = attrs;
		return;
	}

	// Only adding attributes
	applyAttributesRaw(buffer, added);
	buffer.colorState.attrs = attrs;
}

/**
 * Applies attribute flags without tracking state.
 * @internal
 */
function applyAttributesRaw(buffer: OutputBufferData, attrs: number): void {
	if (attrs & ATTR_BOLD) buffer.chunks.push('\x1b[1m');
	if (attrs & ATTR_DIM) buffer.chunks.push('\x1b[2m');
	if (attrs & ATTR_ITALIC) buffer.chunks.push('\x1b[3m');
	if (attrs & ATTR_UNDERLINE) buffer.chunks.push('\x1b[4m');
	if (attrs & ATTR_BLINK) buffer.chunks.push('\x1b[5m');
	if (attrs & ATTR_INVERSE) buffer.chunks.push('\x1b[7m');
	if (attrs & ATTR_HIDDEN) buffer.chunks.push('\x1b[8m');
	if (attrs & ATTR_STRIKETHROUGH) buffer.chunks.push('\x1b[9m');
}

/**
 * Moves cursor to position, skipping if already there.
 *
 * @param buffer - The output buffer
 * @param x - Column (0-indexed)
 * @param y - Row (0-indexed)
 */
export function moveCursor(buffer: OutputBufferData, x: number, y: number): void {
	if (buffer.cursorKnown && buffer.knownCursorX === x && buffer.knownCursorY === y) {
		recordCursorSkip(buffer, 8);
		return;
	}

	if (buffer.cursorKnown && tryOptimizedCursorMove(buffer, x, y)) {
		return;
	}

	// Full cursor position command (1-indexed for ANSI)
	buffer.chunks.push(cursorAnsi.move(x + 1, y + 1));
	buffer.knownCursorX = x;
	buffer.knownCursorY = y;
	buffer.cursorKnown = true;

	recordCursorMove(buffer);
}

function recordCursorMove(buffer: OutputBufferData): void {
	if (buffer.trackStats) {
		buffer.stats.cursorMoves++;
	}
}

function recordCursorSkip(buffer: OutputBufferData, bytesSaved: number): void {
	if (buffer.trackStats) {
		buffer.stats.cursorMovesSkipped++;
		buffer.stats.bytesSaved += bytesSaved;
	}
}

function tryOptimizedCursorMove(buffer: OutputBufferData, x: number, y: number): boolean {
	const dx = x - buffer.knownCursorX;
	const dy = y - buffer.knownCursorY;

	if (dx === 0 && dy === 0) {
		recordCursorSkip(buffer, 0);
		buffer.knownCursorX = x;
		buffer.knownCursorY = y;
		return true;
	}

	if (dy === 0) {
		buffer.chunks.push(horizontalMoveAnsi(dx));
		buffer.knownCursorX = x;
		recordCursorMove(buffer);
		return true;
	}

	if (dx === 0) {
		buffer.chunks.push(verticalMoveAnsi(dy));
		buffer.knownCursorY = y;
		recordCursorMove(buffer);
		return true;
	}

	if (x === 0 && dy === 1) {
		buffer.chunks.push('\r\n');
		buffer.knownCursorX = 0;
		buffer.knownCursorY = y;
		recordCursorMove(buffer);
		return true;
	}

	return false;
}

function horizontalMoveAnsi(dx: number): string {
	if (dx === 1) return '\x1b[C';
	if (dx === -1) return '\x1b[D';
	return dx > 0 ? cursorAnsi.forward(dx) : cursorAnsi.back(-dx);
}

function verticalMoveAnsi(dy: number): string {
	if (dy === 1) return '\x1b[B';
	if (dy === -1) return '\x1b[A';
	return dy > 0 ? cursorAnsi.down(dy) : cursorAnsi.up(-dy);
}

/**
 * Writes a character at the current cursor position.
 * Updates known cursor position based on character width.
 *
 * @param buffer - The output buffer
 * @param char - Character to write
 */
export function writeChar(buffer: OutputBufferData, char: string): void {
	buffer.chunks.push(char);

	// Update cursor position
	if (buffer.cursorKnown) {
		buffer.knownCursorX++;
		// Handle line wrap
		if (buffer.knownCursorX >= buffer.screenWidth) {
			buffer.knownCursorX = 0;
			buffer.knownCursorY++;
		}
	}

	if (buffer.trackStats) {
		buffer.stats.cellsWritten++;
	}
}

/**
 * Writes a cell at a specific position with colors.
 * Combines cursor movement and character output with optimization.
 *
 * @param buffer - The output buffer
 * @param x - Column (0-indexed)
 * @param y - Row (0-indexed)
 * @param char - Character to write
 * @param fg - Foreground color (RGB or DEFAULT_COLOR)
 * @param bg - Background color (RGB or DEFAULT_COLOR)
 * @param attrs - Text attributes (optional)
 */
export function writeCellAt(
	buffer: OutputBufferData,
	x: number,
	y: number,
	char: string,
	fg: number = DEFAULT_COLOR,
	bg: number = DEFAULT_COLOR,
	attrs: number = 0,
): void {
	moveCursor(buffer, x, y);
	setForeground(buffer, fg);
	setBackground(buffer, bg);
	setAttributes(buffer, attrs);
	writeChar(buffer, char);
}

/**
 * Writes a string at a specific position.
 *
 * @param buffer - The output buffer
 * @param x - Column (0-indexed)
 * @param y - Row (0-indexed)
 * @param text - Text to write
 * @param fg - Foreground color (RGB or DEFAULT_COLOR)
 * @param bg - Background color (RGB or DEFAULT_COLOR)
 * @param attrs - Text attributes (optional)
 */
export function writeStringAt(
	buffer: OutputBufferData,
	x: number,
	y: number,
	text: string,
	fg: number = DEFAULT_COLOR,
	bg: number = DEFAULT_COLOR,
	attrs: number = 0,
): void {
	moveCursor(buffer, x, y);
	setForeground(buffer, fg);
	setBackground(buffer, bg);
	setAttributes(buffer, attrs);

	buffer.chunks.push(text);

	// Update cursor position
	if (buffer.cursorKnown) {
		buffer.knownCursorX += text.length;
		// Handle line wrap
		while (buffer.knownCursorX >= buffer.screenWidth) {
			buffer.knownCursorX -= buffer.screenWidth;
			buffer.knownCursorY++;
		}
	}

	if (buffer.trackStats) {
		buffer.stats.cellsWritten += text.length;
	}
}

/**
 * Writes raw content to the buffer without optimization.
 * Use sparingly for special escape sequences.
 *
 * @param buffer - The output buffer
 * @param content - Raw content to write
 */
export function writeRaw(buffer: OutputBufferData, content: string): void {
	buffer.chunks.push(content);
	// Mark cursor position as unknown since we don't know what the raw content does
	buffer.cursorKnown = false;
}

/**
 * Begins a synchronized output frame.
 *
 * @param buffer - The output buffer
 */
export function beginFrame(buffer: OutputBufferData): void {
	if (buffer.syncMode && !buffer.inSyncFrame) {
		buffer.chunks.push(syncAnsi.begin());
		buffer.inSyncFrame = true;
	}
}

/**
 * Ends a synchronized output frame.
 *
 * @param buffer - The output buffer
 */
export function endFrame(buffer: OutputBufferData): void {
	if (buffer.syncMode && buffer.inSyncFrame) {
		buffer.chunks.push(syncAnsi.end());
		buffer.inSyncFrame = false;
	}
}

/**
 * Gets the current buffer contents as a single string.
 *
 * @param buffer - The output buffer
 * @returns Combined buffer contents
 */
export function getContents(buffer: OutputBufferData): string {
	return buffer.chunks.join('');
}

/**
 * Gets the current buffer length in bytes.
 *
 * @param buffer - The output buffer
 * @returns Total length of all chunks
 */
export function getBufferLength(buffer: OutputBufferData): number {
	return buffer.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
}

/**
 * Flushes the buffer to a writable stream.
 *
 * @param buffer - The output buffer
 * @param stream - Target stream
 */
export function flushToStream(buffer: OutputBufferData, stream: Writable): void {
	if (buffer.chunks.length === 0) {
		return;
	}

	const output = buffer.chunks.join('');
	stream.write(output);

	if (buffer.trackStats) {
		buffer.stats.bytesWritten += output.length;
	}

	buffer.chunks.length = 0;
}

/**
 * Clears the buffer without flushing.
 *
 * @param buffer - The output buffer
 */
export function clearBuffer(buffer: OutputBufferData): void {
	buffer.chunks.length = 0;
	buffer.inSyncFrame = false;
}

/**
 * Resets the buffer state completely.
 *
 * @param buffer - The output buffer
 */
export function resetBuffer(buffer: OutputBufferData): void {
	buffer.chunks.length = 0;
	buffer.cursorX = 0;
	buffer.cursorY = 0;
	buffer.knownCursorX = 0;
	buffer.knownCursorY = 0;
	buffer.cursorKnown = false;
	buffer.colorState.fg = DEFAULT_COLOR;
	buffer.colorState.bg = DEFAULT_COLOR;
	buffer.colorState.attrs = 0;
	buffer.inSyncFrame = false;
}

/**
 * Resets buffer statistics.
 *
 * @param buffer - The output buffer
 */
export function resetStats(buffer: OutputBufferData): void {
	buffer.stats.cellsWritten = 0;
	buffer.stats.cursorMoves = 0;
	buffer.stats.cursorMovesSkipped = 0;
	buffer.stats.colorChanges = 0;
	buffer.stats.colorChangesSkipped = 0;
	buffer.stats.bytesWritten = 0;
	buffer.stats.bytesSaved = 0;
}

/**
 * Gets current buffer statistics.
 *
 * @param buffer - The output buffer
 * @returns Statistics snapshot
 */
export function getOutputStats(buffer: OutputBufferData): Readonly<OutputStats> {
	return { ...buffer.stats };
}

/**
 * Hides the terminal cursor.
 *
 * @param buffer - The output buffer
 */
export function hideCursor(buffer: OutputBufferData): void {
	buffer.chunks.push(cursorAnsi.hide());
}

/**
 * Shows the terminal cursor.
 *
 * @param buffer - The output buffer
 */
export function showCursor(buffer: OutputBufferData): void {
	buffer.chunks.push(cursorAnsi.show());
}

/**
 * Clears the entire screen.
 *
 * @param buffer - The output buffer
 */
export function clearScreen(buffer: OutputBufferData): void {
	buffer.chunks.push('\x1b[2J');
	buffer.cursorKnown = false;
}

/**
 * Clears from cursor to end of screen.
 *
 * @param buffer - The output buffer
 */
export function clearToEnd(buffer: OutputBufferData): void {
	buffer.chunks.push('\x1b[J');
}

/**
 * Clears the current line.
 *
 * @param buffer - The output buffer
 */
export function clearLine(buffer: OutputBufferData): void {
	buffer.chunks.push('\x1b[2K');
}

/**
 * Estimates bytes saved by optimization.
 * Compares optimized output size to naive approach.
 *
 * @param buffer - The output buffer
 * @returns Estimated bytes saved
 */
export function estimateBytesSaved(buffer: OutputBufferData): number {
	const stats = buffer.stats;

	// Cursor move saves ~8 bytes per skip
	const cursorSaved = stats.cursorMovesSkipped * 8;

	// Color change saves ~12 bytes per skip
	const colorSaved = stats.colorChangesSkipped * 12;

	return cursorSaved + colorSaved;
}
