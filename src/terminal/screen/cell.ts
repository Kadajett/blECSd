/**
 * Cell Type and Screen Buffer
 *
 * Provides the fundamental Cell type for terminal rendering and a functional
 * screen buffer implementation for managing a grid of cells.
 *
 * @module terminal/screen/cell
 *
 * @example
 * ```typescript
 * import {
 *   createCell,
 *   createScreenBuffer,
 *   setCell,
 *   getCell,
 *   fillRect,
 *   Attr,
 * } from 'blecsd';
 *
 * // Create a buffer
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Create a styled cell
 * const cell = createCell('X', 0xff0000ff, 0x000000ff, Attr.BOLD);
 *
 * // Set cells in the buffer
 * setCell(buffer, 10, 5, cell);
 *
 * // Fill a region
 * fillRect(buffer, 0, 0, 80, 1, createCell(' ', 0xffffffff, 0x0000ffff));
 * ```
 */

/**
 * Text attribute bit flags for cell styling.
 *
 * These can be combined using bitwise OR to apply multiple attributes.
 *
 * @example
 * ```typescript
 * import { Attr } from 'blecsd';
 *
 * // Single attribute
 * const boldAttr = Attr.BOLD;
 *
 * // Combined attributes
 * const boldUnderline = Attr.BOLD | Attr.UNDERLINE;
 *
 * // Check if attribute is set
 * const isBold = (attrs & Attr.BOLD) !== 0;
 * ```
 */
export const Attr = {
	/** No attributes */
	NONE: 0,
	/** Bold text */
	BOLD: 1 << 0,
	/** Dim/faint text */
	DIM: 1 << 1,
	/** Italic text */
	ITALIC: 1 << 2,
	/** Underlined text */
	UNDERLINE: 1 << 3,
	/** Blinking text */
	BLINK: 1 << 4,
	/** Inverted colors */
	INVERSE: 1 << 5,
	/** Hidden/invisible text */
	HIDDEN: 1 << 6,
	/** Strikethrough text */
	STRIKETHROUGH: 1 << 7,
} as const;

/**
 * Type for attribute flags.
 */
export type AttrFlags = number;

/**
 * Represents a single terminal cell.
 *
 * Each cell contains a character (which may be multi-byte for Unicode),
 * foreground and background colors packed as 32-bit RGBA values,
 * and packed text attributes.
 *
 * @example
 * ```typescript
 * import { Cell, createCell, Attr } from 'blecsd';
 *
 * const cell: Cell = {
 *   char: 'A',
 *   fg: 0xffffffff,  // White
 *   bg: 0x000000ff,  // Black
 *   attrs: Attr.BOLD | Attr.UNDERLINE,
 * };
 * ```
 */
export interface Cell {
	/** Character to display (may be multi-byte for Unicode) */
	char: string;
	/** Foreground color (packed 32-bit RGBA) */
	fg: number;
	/** Background color (packed 32-bit RGBA) */
	bg: number;
	/** Packed attribute flags */
	attrs: AttrFlags;
}

/**
 * Default foreground color (white, fully opaque).
 */
export const DEFAULT_FG = 0xffffffff;

/**
 * Default background color (black, fully opaque).
 */
export const DEFAULT_BG = 0x000000ff;

/**
 * Default cell character (space).
 */
export const DEFAULT_CHAR = ' ';

/**
 * Creates a new Cell with the specified properties.
 *
 * @param char - Character to display (default: space)
 * @param fg - Foreground color as packed RGBA (default: white)
 * @param bg - Background color as packed RGBA (default: black)
 * @param attrs - Packed attribute flags (default: none)
 * @returns A new Cell object
 *
 * @example
 * ```typescript
 * import { createCell, Attr, DEFAULT_FG, DEFAULT_BG } from 'blecsd';
 *
 * // Default empty cell
 * const empty = createCell();
 *
 * // Red 'X' on black
 * const redX = createCell('X', 0xff0000ff, 0x000000ff);
 *
 * // Bold white 'A' on blue
 * const boldA = createCell('A', 0xffffffff, 0x0000ffff, Attr.BOLD);
 * ```
 */
export function createCell(
	char: string = DEFAULT_CHAR,
	fg: number = DEFAULT_FG,
	bg: number = DEFAULT_BG,
	attrs: AttrFlags = Attr.NONE,
): Cell {
	return { char, fg, bg, attrs };
}

/**
 * Creates a copy of a cell.
 *
 * @param cell - The cell to clone
 * @returns A new Cell with the same values
 *
 * @example
 * ```typescript
 * import { createCell, cloneCell } from 'blecsd';
 *
 * const original = createCell('X', 0xff0000ff);
 * const copy = cloneCell(original);
 * ```
 */
export function cloneCell(cell: Cell): Cell {
	return { ...cell };
}

/**
 * Compares two cells for equality.
 *
 * @param a - First cell
 * @param b - Second cell
 * @returns true if cells are identical
 *
 * @example
 * ```typescript
 * import { createCell, cellsEqual } from 'blecsd';
 *
 * const a = createCell('X', 0xff0000ff);
 * const b = createCell('X', 0xff0000ff);
 * console.log(cellsEqual(a, b)); // true
 * ```
 */
export function cellsEqual(a: Cell, b: Cell): boolean {
	return a.char === b.char && a.fg === b.fg && a.bg === b.bg && a.attrs === b.attrs;
}

/**
 * Checks if a cell has a specific attribute.
 *
 * @param cell - The cell to check
 * @param attr - The attribute flag to check for
 * @returns true if the attribute is set
 *
 * @example
 * ```typescript
 * import { createCell, hasAttr, Attr } from 'blecsd';
 *
 * const cell = createCell('X', 0xffffffff, 0x000000ff, Attr.BOLD | Attr.UNDERLINE);
 * console.log(hasAttr(cell, Attr.BOLD)); // true
 * console.log(hasAttr(cell, Attr.BLINK)); // false
 * ```
 */
export function hasAttr(cell: Cell, attr: AttrFlags): boolean {
	return (cell.attrs & attr) !== 0;
}

/**
 * Creates a new cell with an attribute added.
 *
 * @param cell - The original cell
 * @param attr - The attribute to add
 * @returns A new cell with the attribute set
 *
 * @example
 * ```typescript
 * import { createCell, withAttr, Attr } from 'blecsd';
 *
 * const cell = createCell('X');
 * const boldCell = withAttr(cell, Attr.BOLD);
 * ```
 */
export function withAttr(cell: Cell, attr: AttrFlags): Cell {
	return { ...cell, attrs: cell.attrs | attr };
}

/**
 * Creates a new cell with an attribute removed.
 *
 * @param cell - The original cell
 * @param attr - The attribute to remove
 * @returns A new cell with the attribute cleared
 *
 * @example
 * ```typescript
 * import { createCell, withoutAttr, Attr } from 'blecsd';
 *
 * const cell = createCell('X', 0xffffffff, 0x000000ff, Attr.BOLD);
 * const normalCell = withoutAttr(cell, Attr.BOLD);
 * ```
 */
export function withoutAttr(cell: Cell, attr: AttrFlags): Cell {
	return { ...cell, attrs: cell.attrs & ~attr };
}

/**
 * Screen buffer data structure.
 *
 * Uses a flat array of cells for efficient access. The buffer stores
 * cells in row-major order: index = y * width + x.
 */
export interface ScreenBufferData {
	/** Buffer width in cells */
	readonly width: number;
	/** Buffer height in cells */
	readonly height: number;
	/** Flat array of cells (row-major order) */
	readonly cells: Cell[];
}

/**
 * Creates a new screen buffer filled with default cells.
 *
 * @param width - Buffer width in cells
 * @param height - Buffer height in cells
 * @param defaultCell - Optional default cell to fill with
 * @returns A new ScreenBufferData
 * @throws {Error} If width or height is not positive
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, createCell } from 'blecsd';
 *
 * // Create an 80x24 buffer with default cells
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Create a buffer with custom default cell
 * const blueBuffer = createScreenBuffer(80, 24, createCell(' ', 0xffffffff, 0x0000ffff));
 * ```
 */
export function createScreenBuffer(
	width: number,
	height: number,
	defaultCell?: Cell,
): ScreenBufferData {
	if (width <= 0) {
		throw new Error(`Buffer width must be positive, got ${width}`);
	}
	if (height <= 0) {
		throw new Error(`Buffer height must be positive, got ${height}`);
	}

	const size = width * height;
	const cells: Cell[] = new Array(size);
	const fillCell = defaultCell ?? createCell();

	for (let i = 0; i < size; i++) {
		cells[i] = cloneCell(fillCell);
	}

	return { width, height, cells };
}

/**
 * Calculates the array index for a given x,y position.
 *
 * @param buffer - The screen buffer
 * @param x - X coordinate (column)
 * @param y - Y coordinate (row)
 * @returns The array index, or -1 if out of bounds
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, cellIndex } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * const idx = cellIndex(buffer, 10, 5);
 * console.log(idx); // 410 (5 * 80 + 10)
 * ```
 */
export function cellIndex(buffer: ScreenBufferData, x: number, y: number): number {
	if (x < 0 || x >= buffer.width || y < 0 || y >= buffer.height) {
		return -1;
	}
	return y * buffer.width + x;
}

/**
 * Checks if coordinates are within buffer bounds.
 *
 * @param buffer - The screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if coordinates are valid
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, isInBounds } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * console.log(isInBounds(buffer, 0, 0)); // true
 * console.log(isInBounds(buffer, 80, 0)); // false (out of bounds)
 * ```
 */
export function isInBounds(buffer: ScreenBufferData, x: number, y: number): boolean {
	return x >= 0 && x < buffer.width && y >= 0 && y < buffer.height;
}

/**
 * Gets a cell from the buffer at the specified position.
 *
 * @param buffer - The screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns The cell at (x, y), or undefined if out of bounds
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, getCell, setCell, createCell } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * setCell(buffer, 10, 5, createCell('X'));
 *
 * const cell = getCell(buffer, 10, 5);
 * console.log(cell?.char); // 'X'
 * ```
 */
export function getCell(buffer: ScreenBufferData, x: number, y: number): Cell | undefined {
	const idx = cellIndex(buffer, x, y);
	if (idx < 0) {
		return undefined;
	}
	return buffer.cells[idx];
}

/**
 * Sets a cell in the buffer at the specified position.
 * Mutates the buffer in place for performance.
 *
 * @param buffer - The screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param cell - The cell to set
 * @returns true if the cell was set, false if out of bounds
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, setCell, createCell, Attr } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * const success = setCell(buffer, 10, 5, createCell('X', 0xff0000ff, 0x000000ff, Attr.BOLD));
 * console.log(success); // true
 * ```
 */
export function setCell(buffer: ScreenBufferData, x: number, y: number, cell: Cell): boolean {
	const idx = cellIndex(buffer, x, y);
	if (idx < 0) {
		return false;
	}
	buffer.cells[idx] = cell;
	return true;
}

/**
 * Sets a character at the specified position, preserving other cell properties.
 * Mutates the buffer in place for performance.
 *
 * @param buffer - The screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param char - The character to set
 * @returns true if set, false if out of bounds
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, setChar } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * setChar(buffer, 10, 5, 'X');
 * ```
 */
export function setChar(buffer: ScreenBufferData, x: number, y: number, char: string): boolean {
	const idx = cellIndex(buffer, x, y);
	if (idx < 0) {
		return false;
	}
	const existing = buffer.cells[idx];
	if (existing) {
		existing.char = char;
	}
	return true;
}

/**
 * Clears the entire buffer to default cells.
 * Mutates the buffer in place.
 *
 * @param buffer - The screen buffer
 * @param clearCell - Optional cell to fill with (default: space with default colors)
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, clearBuffer, createCell } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * // ... draw stuff ...
 * clearBuffer(buffer);
 *
 * // Clear to a custom cell
 * clearBuffer(buffer, createCell(' ', 0xffffffff, 0x0000ffff));
 * ```
 */
export function clearBuffer(buffer: ScreenBufferData, clearCell?: Cell): void {
	const fillCell = clearCell ?? createCell();
	for (let i = 0; i < buffer.cells.length; i++) {
		buffer.cells[i] = cloneCell(fillCell);
	}
}

/**
 * Fills a rectangular region of the buffer with a cell.
 * Mutates the buffer in place. Coordinates are clamped to buffer bounds.
 *
 * @param buffer - The screen buffer
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param w - Width of region
 * @param h - Height of region
 * @param cell - Cell to fill with
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, fillRect, createCell } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Fill top row with blue background
 * fillRect(buffer, 0, 0, 80, 1, createCell(' ', 0xffffffff, 0x0000ffff));
 *
 * // Draw a red box at (10, 5) of size 20x5
 * fillRect(buffer, 10, 5, 20, 5, createCell(' ', 0xffffffff, 0xff0000ff));
 * ```
 */
export function fillRect(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	w: number,
	h: number,
	cell: Cell,
): void {
	// Clamp to buffer bounds
	const x1 = Math.max(0, x);
	const y1 = Math.max(0, y);
	const x2 = Math.min(buffer.width, x + w);
	const y2 = Math.min(buffer.height, y + h);

	for (let row = y1; row < y2; row++) {
		for (let col = x1; col < x2; col++) {
			const idx = row * buffer.width + col;
			buffer.cells[idx] = cloneCell(cell);
		}
	}
}

/**
 * Resizes a buffer, preserving existing content where possible.
 * Creates a new buffer and copies cells from the old one.
 *
 * @param buffer - The original buffer
 * @param newWidth - New width
 * @param newHeight - New height
 * @param fillCell - Cell to use for newly exposed areas
 * @returns A new resized buffer
 * @throws {Error} If newWidth or newHeight is not positive
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, resizeBuffer, setCell, createCell } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * setCell(buffer, 5, 5, createCell('X'));
 *
 * const larger = resizeBuffer(buffer, 120, 40);
 * // Cell at (5, 5) is preserved
 * ```
 */
export function resizeBuffer(
	buffer: ScreenBufferData,
	newWidth: number,
	newHeight: number,
	fillCell?: Cell,
): ScreenBufferData {
	const newBuffer = createScreenBuffer(newWidth, newHeight, fillCell);

	// Copy overlapping region
	const copyWidth = Math.min(buffer.width, newWidth);
	const copyHeight = Math.min(buffer.height, newHeight);

	for (let y = 0; y < copyHeight; y++) {
		for (let x = 0; x < copyWidth; x++) {
			const srcIdx = y * buffer.width + x;
			const dstIdx = y * newWidth + x;
			const srcCell = buffer.cells[srcIdx];
			if (srcCell) {
				newBuffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	return newBuffer;
}

/**
 * Writes a string to the buffer starting at the specified position.
 * Multi-byte Unicode characters are handled correctly (each grapheme
 * occupies one cell). Mutates the buffer in place.
 *
 * @param buffer - The screen buffer
 * @param x - Starting X coordinate
 * @param y - Y coordinate
 * @param text - Text to write
 * @param fg - Foreground color (default: white)
 * @param bg - Background color (default: black)
 * @param attrs - Text attributes (default: none)
 * @returns Number of cells written
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, writeString, Attr } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 *
 * // Write white text on black
 * writeString(buffer, 10, 5, 'Hello, World!');
 *
 * // Write bold red text
 * writeString(buffer, 10, 7, 'Warning!', 0xff0000ff, 0x000000ff, Attr.BOLD);
 * ```
 */
export function writeString(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	text: string,
	fg: number = DEFAULT_FG,
	bg: number = DEFAULT_BG,
	attrs: AttrFlags = Attr.NONE,
): number {
	if (y < 0 || y >= buffer.height) {
		return 0;
	}

	let written = 0;
	let currentX = x;

	// Use spread to handle Unicode correctly (surrogate pairs, etc.)
	const chars = [...text];

	for (const char of chars) {
		if (currentX < 0) {
			currentX++;
			continue;
		}
		if (currentX >= buffer.width) {
			break;
		}

		const idx = y * buffer.width + currentX;
		buffer.cells[idx] = { char, fg, bg, attrs };
		currentX++;
		written++;
	}

	return written;
}

/**
 * Copies a rectangular region from one buffer to another.
 * Handles overlapping regions correctly.
 *
 * @param src - Source buffer
 * @param dst - Destination buffer
 * @param srcX - Source X coordinate
 * @param srcY - Source Y coordinate
 * @param dstX - Destination X coordinate
 * @param dstY - Destination Y coordinate
 * @param w - Width to copy
 * @param h - Height to copy
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, copyRegion, fillRect, createCell } from 'blecsd';
 *
 * const src = createScreenBuffer(80, 24);
 * const dst = createScreenBuffer(80, 24);
 *
 * // Fill source with pattern
 * fillRect(src, 0, 0, 10, 10, createCell('#', 0xff0000ff, 0x000000ff));
 *
 * // Copy to destination
 * copyRegion(src, dst, 0, 0, 20, 5, 10, 10);
 * ```
 */
export function copyRegion(
	src: ScreenBufferData,
	dst: ScreenBufferData,
	srcX: number,
	srcY: number,
	dstX: number,
	dstY: number,
	w: number,
	h: number,
): void {
	// Clamp to source bounds
	const srcX1 = Math.max(0, srcX);
	const srcY1 = Math.max(0, srcY);
	const srcX2 = Math.min(src.width, srcX + w);
	const srcY2 = Math.min(src.height, srcY + h);

	// Adjust destination based on source clamping
	const adjustedDstX = dstX + (srcX1 - srcX);
	const adjustedDstY = dstY + (srcY1 - srcY);

	// Calculate actual copy dimensions
	const copyW = srcX2 - srcX1;
	const copyH = srcY2 - srcY1;

	// Clamp to destination bounds
	const dstX1 = Math.max(0, adjustedDstX);
	const dstY1 = Math.max(0, adjustedDstY);
	const dstX2 = Math.min(dst.width, adjustedDstX + copyW);
	const dstY2 = Math.min(dst.height, adjustedDstY + copyH);

	// Adjust source based on destination clamping
	const finalSrcX = srcX1 + (dstX1 - adjustedDstX);
	const finalSrcY = srcY1 + (dstY1 - adjustedDstY);

	// Copy cells
	for (let dy = dstY1, sy = finalSrcY; dy < dstY2; dy++, sy++) {
		for (let dx = dstX1, sx = finalSrcX; dx < dstX2; dx++, sx++) {
			const srcIdx = sy * src.width + sx;
			const dstIdx = dy * dst.width + dx;
			const srcCell = src.cells[srcIdx];
			if (srcCell) {
				dst.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}
}

/** A single cell change in a buffer diff */
export interface CellChange {
	readonly x: number;
	readonly y: number;
	readonly cell: Cell;
}

/**
 * Finds changed cells in the overlapping region of two buffers.
 * @internal
 */
function diffOverlappingRegion(
	oldBuffer: ScreenBufferData,
	newBuffer: ScreenBufferData,
	width: number,
	height: number,
): CellChange[] {
	const changes: CellChange[] = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const oldIdx = y * oldBuffer.width + x;
			const newIdx = y * newBuffer.width + x;
			const oldCell = oldBuffer.cells[oldIdx];
			const newCell = newBuffer.cells[newIdx];

			if (oldCell && newCell && !cellsEqual(oldCell, newCell)) {
				changes.push({ x, y, cell: cloneCell(newCell) });
			}
		}
	}

	return changes;
}

/**
 * Finds cells in expanded region (outside the overlap).
 * @internal
 */
function diffExpandedRegion(
	newBuffer: ScreenBufferData,
	overlapWidth: number,
	overlapHeight: number,
): CellChange[] {
	const changes: CellChange[] = [];

	for (let y = 0; y < newBuffer.height; y++) {
		for (let x = 0; x < newBuffer.width; x++) {
			// Skip cells in overlap region
			if (x < overlapWidth && y < overlapHeight) {
				continue;
			}
			const idx = y * newBuffer.width + x;
			const cell = newBuffer.cells[idx];
			if (cell) {
				changes.push({ x, y, cell: cloneCell(cell) });
			}
		}
	}

	return changes;
}

/**
 * Computes the difference between two buffers.
 * Returns an array of changed cell positions and their new values.
 * Useful for efficient terminal updates (only output changed cells).
 *
 * @param oldBuffer - Previous buffer state
 * @param newBuffer - Current buffer state
 * @returns Array of { x, y, cell } for changed cells
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, setCell, createCell, diffBuffers } from 'blecsd';
 *
 * const old = createScreenBuffer(80, 24);
 * const current = createScreenBuffer(80, 24);
 * setCell(current, 10, 5, createCell('X'));
 *
 * const changes = diffBuffers(old, current);
 * // changes = [{ x: 10, y: 5, cell: { char: 'X', ... } }]
 * ```
 */
export function diffBuffers(
	oldBuffer: ScreenBufferData,
	newBuffer: ScreenBufferData,
): CellChange[] {
	// Only compare overlapping region
	const overlapWidth = Math.min(oldBuffer.width, newBuffer.width);
	const overlapHeight = Math.min(oldBuffer.height, newBuffer.height);

	// Get changes in overlapping region
	const changes = diffOverlappingRegion(oldBuffer, newBuffer, overlapWidth, overlapHeight);

	// If new buffer is larger, include cells in expanded area
	const hasExpandedRegion =
		newBuffer.width > oldBuffer.width || newBuffer.height > oldBuffer.height;
	if (hasExpandedRegion) {
		const expandedChanges = diffExpandedRegion(newBuffer, overlapWidth, overlapHeight);
		changes.push(...expandedChanges);
	}

	return changes;
}
