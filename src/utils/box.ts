/**
 * Box rendering utilities for drawing borders and boxes.
 * @module utils/box
 */

import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
} from '../components/border';

/**
 * Re-export border charsets for convenience.
 */
export { BORDER_ASCII, BORDER_BOLD, BORDER_DOUBLE, BORDER_ROUNDED, BORDER_SINGLE };
export type { BorderCharset };

/**
 * Box drawing characters as strings (for convenience).
 */
export interface BoxChars {
	readonly topLeft: string;
	readonly topRight: string;
	readonly bottomLeft: string;
	readonly bottomRight: string;
	readonly horizontal: string;
	readonly vertical: string;
}

/**
 * Converts a BorderCharset (code points) to BoxChars (strings).
 *
 * @param charset - Border character set with code points
 * @returns Box characters as strings
 *
 * @example
 * ```typescript
 * import { BORDER_ROUNDED, charsetToBoxChars } from 'blecsd';
 *
 * const chars = charsetToBoxChars(BORDER_ROUNDED);
 * console.log(chars.topLeft); // "╭"
 * ```
 */
export function charsetToBoxChars(charset: BorderCharset): BoxChars {
	return {
		topLeft: String.fromCodePoint(charset.topLeft),
		topRight: String.fromCodePoint(charset.topRight),
		bottomLeft: String.fromCodePoint(charset.bottomLeft),
		bottomRight: String.fromCodePoint(charset.bottomRight),
		horizontal: String.fromCodePoint(charset.horizontal),
		vertical: String.fromCodePoint(charset.vertical),
	};
}

/**
 * Preset box styles as string characters.
 */
export const BOX_SINGLE = charsetToBoxChars(BORDER_SINGLE);
export const BOX_DOUBLE = charsetToBoxChars(BORDER_DOUBLE);
export const BOX_ROUNDED = charsetToBoxChars(BORDER_ROUNDED);
export const BOX_BOLD = charsetToBoxChars(BORDER_BOLD);

/**
 * ASCII box characters (works in all terminals).
 */
export const BOX_ASCII: BoxChars = {
	topLeft: '+',
	topRight: '+',
	bottomLeft: '+',
	bottomRight: '+',
	horizontal: '-',
	vertical: '|',
};

/**
 * Dashed box characters.
 */
export const BOX_DASHED: BoxChars = {
	topLeft: '┌',
	topRight: '┐',
	bottomLeft: '└',
	bottomRight: '┘',
	horizontal: '╌',
	vertical: '╎',
};

/**
 * Interface for a renderable cell buffer.
 * Any object implementing this interface can be used with renderBox.
 */
export interface CellBuffer {
	/** Width of the buffer in cells */
	readonly width: number;
	/** Height of the buffer in cells */
	readonly height: number;
	/**
	 * Set a cell's character and colors.
	 * @param x - Column (0-indexed)
	 * @param y - Row (0-indexed)
	 * @param char - Character to display
	 * @param fg - Foreground color (optional)
	 * @param bg - Background color (optional)
	 */
	setCell(x: number, y: number, char: string, fg?: number, bg?: number): void;
}

/**
 * Simple in-memory cell buffer for testing and rendering.
 */
export interface Cell {
	char: string;
	fg: number;
	bg: number;
}

/**
 * Creates a simple cell buffer.
 *
 * @param width - Buffer width in cells
 * @param height - Buffer height in cells
 * @param defaultFg - Default foreground color (default: 0xffffffff white)
 * @param defaultBg - Default background color (default: 0x00000000 transparent)
 * @returns A CellBuffer instance
 *
 * @example
 * ```typescript
 * import { createCellBuffer, renderBox, BOX_SINGLE } from 'blecsd';
 *
 * const buffer = createCellBuffer(80, 24);
 * renderBox(buffer, 5, 2, 20, 10, BOX_SINGLE);
 * ```
 */
export function createCellBuffer(
	width: number,
	height: number,
	defaultFg = 0xffffffff,
	defaultBg = 0x00000000,
): CellBuffer & { cells: Cell[][] } {
	const cells: Cell[][] = [];

	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ char: ' ', fg: defaultFg, bg: defaultBg });
		}
		cells.push(row);
	}

	return {
		width,
		height,
		cells,
		setCell(x: number, y: number, char: string, fg?: number, bg?: number): void {
			if (x < 0 || x >= width || y < 0 || y >= height) {
				return; // Out of bounds
			}
			const cell = cells[y]?.[x];
			if (cell) {
				cell.char = char;
				if (fg !== undefined) cell.fg = fg;
				if (bg !== undefined) cell.bg = bg;
			}
		},
	};
}

/**
 * Options for rendering a box.
 */
export interface RenderBoxOptions {
	/** Foreground color for the border (optional) */
	fg?: number;
	/** Background color for the border (optional) */
	bg?: number;
	/** Fill the interior with background color (default: false) */
	fill?: boolean;
	/** Fill character for interior (default: ' ') */
	fillChar?: string;
}

/**
 * Renders box corners to a cell buffer.
 * @internal
 */
function renderBoxCorners(
	buffer: CellBuffer,
	x: number,
	y: number,
	right: number,
	bottom: number,
	width: number,
	height: number,
	chars: BoxChars,
	fg?: number,
	bg?: number,
): void {
	buffer.setCell(x, y, chars.topLeft, fg, bg);

	if (width > 1) {
		buffer.setCell(right, y, chars.topRight, fg, bg);
	}

	if (height > 1) {
		buffer.setCell(x, bottom, chars.bottomLeft, fg, bg);
	}

	if (width > 1 && height > 1) {
		buffer.setCell(right, bottom, chars.bottomRight, fg, bg);
	}
}

/**
 * Renders box edges (horizontal and vertical lines) to a cell buffer.
 * @internal
 */
function renderBoxEdges(
	buffer: CellBuffer,
	x: number,
	y: number,
	right: number,
	bottom: number,
	width: number,
	height: number,
	chars: BoxChars,
	fg?: number,
	bg?: number,
): void {
	// Draw horizontal lines (top and bottom)
	for (let col = x + 1; col < right; col++) {
		buffer.setCell(col, y, chars.horizontal, fg, bg);
		if (height > 1) {
			buffer.setCell(col, bottom, chars.horizontal, fg, bg);
		}
	}

	// Draw vertical lines (left and right)
	for (let row = y + 1; row < bottom; row++) {
		buffer.setCell(x, row, chars.vertical, fg, bg);
		if (width > 1) {
			buffer.setCell(right, row, chars.vertical, fg, bg);
		}
	}
}

/**
 * Renders a box to a cell buffer.
 *
 * Draws border characters around the specified rectangle.
 * Minimum size is 1x1 (just corners).
 *
 * @param buffer - The cell buffer to render to
 * @param x - Left column (0-indexed)
 * @param y - Top row (0-indexed)
 * @param width - Box width (including borders)
 * @param height - Box height (including borders)
 * @param chars - Box characters to use
 * @param options - Rendering options
 *
 * @example
 * ```typescript
 * import { createCellBuffer, renderBox, BOX_ROUNDED } from 'blecsd';
 *
 * const buffer = createCellBuffer(80, 24);
 *
 * // Draw a simple box
 * renderBox(buffer, 5, 2, 20, 10, BOX_ROUNDED);
 *
 * // Draw with colors
 * renderBox(buffer, 30, 2, 20, 10, BOX_DOUBLE, {
 *   fg: 0x00ff00ff, // Green
 *   fill: true
 * });
 * ```
 */
export function renderBox(
	buffer: CellBuffer,
	x: number,
	y: number,
	width: number,
	height: number,
	chars: BoxChars,
	options: RenderBoxOptions = {},
): void {
	const { fg, bg, fill = false, fillChar = ' ' } = options;

	// Minimum 1x1 (single corner)
	if (width < 1 || height < 1) {
		return;
	}

	const right = x + width - 1;
	const bottom = y + height - 1;

	// Draw corners
	renderBoxCorners(buffer, x, y, right, bottom, width, height, chars, fg, bg);

	// Draw edges
	renderBoxEdges(buffer, x, y, right, bottom, width, height, chars, fg, bg);

	// Fill interior
	if (fill && width > 2 && height > 2) {
		fillRect(buffer, x + 1, y + 1, width - 2, height - 2, fillChar, fg, bg);
	}
}

/**
 * Renders a horizontal line to a cell buffer.
 *
 * @param buffer - The cell buffer to render to
 * @param x - Starting column (0-indexed)
 * @param y - Row (0-indexed)
 * @param length - Line length
 * @param char - Character to use (default: horizontal box char)
 * @param fg - Foreground color (optional)
 * @param bg - Background color (optional)
 *
 * @example
 * ```typescript
 * import { createCellBuffer, renderHLine, BOX_SINGLE } from 'blecsd';
 *
 * const buffer = createCellBuffer(80, 24);
 * renderHLine(buffer, 5, 10, 20, BOX_SINGLE.horizontal);
 * ```
 */
export function renderHLine(
	buffer: CellBuffer,
	x: number,
	y: number,
	length: number,
	char = '─',
	fg?: number,
	bg?: number,
): void {
	for (let i = 0; i < length; i++) {
		buffer.setCell(x + i, y, char, fg, bg);
	}
}

/**
 * Renders a vertical line to a cell buffer.
 *
 * @param buffer - The cell buffer to render to
 * @param x - Column (0-indexed)
 * @param y - Starting row (0-indexed)
 * @param length - Line length
 * @param char - Character to use (default: vertical box char)
 * @param fg - Foreground color (optional)
 * @param bg - Background color (optional)
 *
 * @example
 * ```typescript
 * import { createCellBuffer, renderVLine, BOX_SINGLE } from 'blecsd';
 *
 * const buffer = createCellBuffer(80, 24);
 * renderVLine(buffer, 10, 5, 10, BOX_SINGLE.vertical);
 * ```
 */
export function renderVLine(
	buffer: CellBuffer,
	x: number,
	y: number,
	length: number,
	char = '│',
	fg?: number,
	bg?: number,
): void {
	for (let i = 0; i < length; i++) {
		buffer.setCell(x, y + i, char, fg, bg);
	}
}

/**
 * Fills a rectangular region with a character.
 *
 * @param buffer - The cell buffer to render to
 * @param x - Left column (0-indexed)
 * @param y - Top row (0-indexed)
 * @param width - Region width
 * @param height - Region height
 * @param char - Fill character (default: ' ')
 * @param fg - Foreground color (optional)
 * @param bg - Background color (optional)
 *
 * @example
 * ```typescript
 * import { createCellBuffer, fillRect } from 'blecsd';
 *
 * const buffer = createCellBuffer(80, 24);
 * fillRect(buffer, 5, 2, 20, 10, ' ', 0xffffffff, 0x0000aaff);
 * ```
 */
export function fillRect(
	buffer: CellBuffer,
	x: number,
	y: number,
	width: number,
	height: number,
	char = ' ',
	fg?: number,
	bg?: number,
): void {
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			buffer.setCell(x + col, y + row, char, fg, bg);
		}
	}
}

/**
 * Renders text to a cell buffer.
 *
 * @param buffer - The cell buffer to render to
 * @param x - Starting column (0-indexed)
 * @param y - Row (0-indexed)
 * @param text - Text to render
 * @param fg - Foreground color (optional)
 * @param bg - Background color (optional)
 *
 * @example
 * ```typescript
 * import { createCellBuffer, renderText } from 'blecsd';
 *
 * const buffer = createCellBuffer(80, 24);
 * renderText(buffer, 10, 5, 'Hello, World!');
 * ```
 */
export function renderText(
	buffer: CellBuffer,
	x: number,
	y: number,
	text: string,
	fg?: number,
	bg?: number,
): void {
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char !== undefined) {
			buffer.setCell(x + i, y, char, fg, bg);
		}
	}
}

/**
 * Converts a cell buffer to a string representation.
 * Useful for testing and debugging.
 *
 * @param buffer - The cell buffer with cells property
 * @returns String representation of the buffer
 *
 * @example
 * ```typescript
 * import { createCellBuffer, renderBox, BOX_SINGLE, bufferToString } from 'blecsd';
 *
 * const buffer = createCellBuffer(10, 5);
 * renderBox(buffer, 0, 0, 10, 5, BOX_SINGLE);
 * console.log(bufferToString(buffer));
 * // Output:
 * // ┌────────┐
 * // │        │
 * // │        │
 * // │        │
 * // └────────┘
 * ```
 */
export function bufferToString(buffer: CellBuffer & { cells: Cell[][] }): string {
	const lines: string[] = [];

	for (let y = 0; y < buffer.height; y++) {
		let line = '';
		for (let x = 0; x < buffer.width; x++) {
			line += buffer.cells[y]?.[x]?.char ?? ' ';
		}
		lines.push(line);
	}

	return lines.join('\n');
}
