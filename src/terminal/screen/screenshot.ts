/**
 * Screenshot Capture System
 *
 * Captures screen content for replay, testing, and debugging.
 *
 * @module terminal/screen/screenshot
 *
 * @example
 * ```typescript
 * import {
 *   captureScreen,
 *   captureRegion,
 *   screenshotToAnsi,
 *   screenshotToText,
 * } from 'blecsd';
 *
 * // Capture the full screen
 * const screenshot = captureScreen(buffer);
 *
 * // Capture a region
 * const region = captureRegion(buffer, 10, 5, 20, 10);
 *
 * // Convert to ANSI for terminal output
 * const ansi = screenshotToAnsi(screenshot);
 *
 * // Convert to plain text
 * const text = screenshotToText(screenshot);
 * ```
 */

import { CSI, SGR } from '../ansi';
import type { Cell, ScreenBufferData } from './cell';
import { Attr, cloneCell, createCell, getCell } from './cell';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A captured screenshot of screen content.
 */
export interface Screenshot {
	/** Width of the captured area in columns */
	readonly width: number;
	/** Height of the captured area in rows */
	readonly height: number;
	/** 2D array of cells (row-major: cells[y][x]) */
	readonly cells: ReadonlyArray<ReadonlyArray<Cell>>;
	/** Timestamp when the screenshot was captured */
	readonly timestamp: number;
	/** X offset from screen origin (for region captures) */
	readonly offsetX: number;
	/** Y offset from screen origin (for region captures) */
	readonly offsetY: number;
}

/**
 * Options for screenshot capture.
 */
export interface CaptureOptions {
	/** Include cell attributes (bold, underline, etc.) */
	readonly includeAttributes?: boolean;
	/** Include colors */
	readonly includeColors?: boolean;
	/** Custom timestamp (default: Date.now()) */
	readonly timestamp?: number;
}

/**
 * Options for ANSI output.
 */
export interface AnsiOutputOptions {
	/** Reset attributes at end of each line */
	readonly resetPerLine?: boolean;
	/** Use 256-color palette instead of true color */
	readonly use256Color?: boolean;
	/** Include line separator */
	readonly lineSeparator?: string;
}

/**
 * Options for text output.
 */
export interface TextOutputOptions {
	/** Line separator (default: '\n') */
	readonly lineSeparator?: string;
	/** Preserve whitespace at end of lines */
	readonly preserveTrailingSpaces?: boolean;
}

// =============================================================================
// CAPTURE FUNCTIONS
// =============================================================================

/**
 * Captures the full screen buffer.
 *
 * @param buffer - The screen buffer to capture
 * @param options - Capture options
 * @returns A Screenshot object containing all cells
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, captureScreen } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * // ... populate buffer ...
 *
 * const screenshot = captureScreen(buffer);
 * console.log(`Captured ${screenshot.width}x${screenshot.height} at ${screenshot.timestamp}`);
 * ```
 */
export function captureScreen(buffer: ScreenBufferData, options: CaptureOptions = {}): Screenshot {
	return captureRegion(buffer, 0, 0, buffer.width, buffer.height, options);
}

/**
 * Captures a rectangular region of the screen buffer.
 *
 * @param buffer - The screen buffer to capture
 * @param x - Left edge of region (0-indexed)
 * @param y - Top edge of region (0-indexed)
 * @param width - Width of region
 * @param height - Height of region
 * @param options - Capture options
 * @returns A Screenshot object containing the region
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, captureRegion } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * // ... populate buffer ...
 *
 * // Capture a 20x10 region starting at (10, 5)
 * const region = captureRegion(buffer, 10, 5, 20, 10);
 * ```
 */
export function captureRegion(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
	options: CaptureOptions = {},
): Screenshot {
	const { includeAttributes = true, includeColors = true, timestamp = Date.now() } = options;

	// Clamp to buffer bounds
	const startX = Math.max(0, Math.min(x, buffer.width));
	const startY = Math.max(0, Math.min(y, buffer.height));
	const endX = Math.max(startX, Math.min(x + width, buffer.width));
	const endY = Math.max(startY, Math.min(y + height, buffer.height));

	const capturedWidth = endX - startX;
	const capturedHeight = endY - startY;

	const cells: Cell[][] = [];

	for (let row = startY; row < endY; row++) {
		const rowCells: Cell[] = [];
		for (let col = startX; col < endX; col++) {
			const cell = getCell(buffer, col, row);
			if (cell) {
				const captured = cloneCell(cell);

				// Optionally strip attributes/colors
				if (!includeAttributes) {
					captured.attrs = Attr.NONE;
				}
				if (!includeColors) {
					captured.fg = 0xffffffff;
					captured.bg = 0x000000ff;
				}

				rowCells.push(captured);
			} else {
				rowCells.push(createCell());
			}
		}
		cells.push(rowCells);
	}

	return {
		width: capturedWidth,
		height: capturedHeight,
		cells,
		timestamp,
		offsetX: startX,
		offsetY: startY,
	};
}

/**
 * Captures a single row from the screen buffer.
 *
 * @param buffer - The screen buffer to capture
 * @param row - Row index (0-indexed)
 * @param options - Capture options
 * @returns A Screenshot object containing the row
 *
 * @example
 * ```typescript
 * import { createScreenBuffer, captureRow } from 'blecsd';
 *
 * const buffer = createScreenBuffer(80, 24);
 * const row = captureRow(buffer, 5);
 * ```
 */
export function captureRow(
	buffer: ScreenBufferData,
	row: number,
	options: CaptureOptions = {},
): Screenshot {
	return captureRegion(buffer, 0, row, buffer.width, 1, options);
}

/**
 * Creates an empty screenshot with the specified dimensions.
 *
 * @param width - Width in columns
 * @param height - Height in rows
 * @returns An empty Screenshot
 *
 * @example
 * ```typescript
 * import { createEmptyScreenshot } from 'blecsd';
 *
 * const empty = createEmptyScreenshot(80, 24);
 * ```
 */
export function createEmptyScreenshot(width: number, height: number): Screenshot {
	const cells: Cell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			row.push(createCell());
		}
		cells.push(row);
	}

	return {
		width,
		height,
		cells,
		timestamp: Date.now(),
		offsetX: 0,
		offsetY: 0,
	};
}

// =============================================================================
// OUTPUT FUNCTIONS
// =============================================================================

/**
 * Unpacks a 32-bit RGBA color into components.
 */
function unpackColor(packed: number): { r: number; g: number; b: number; a: number } {
	return {
		r: (packed >>> 24) & 0xff,
		g: (packed >>> 16) & 0xff,
		b: (packed >>> 8) & 0xff,
		a: packed & 0xff,
	};
}

/**
 * Generates ANSI SGR sequence for foreground color.
 */
function fgColorSequence(packed: number, use256: boolean): string {
	const { r, g, b } = unpackColor(packed);
	if (use256) {
		// Approximate to 256-color palette
		const color =
			16 +
			36 * Math.round((r * 5) / 255) +
			6 * Math.round((g * 5) / 255) +
			Math.round((b * 5) / 255);
		return `${CSI}38;5;${color}m`;
	}
	return `${CSI}38;2;${r};${g};${b}m`;
}

/**
 * Generates ANSI SGR sequence for background color.
 */
function bgColorSequence(packed: number, use256: boolean): string {
	const { r, g, b } = unpackColor(packed);
	if (use256) {
		const color =
			16 +
			36 * Math.round((r * 5) / 255) +
			6 * Math.round((g * 5) / 255) +
			Math.round((b * 5) / 255);
		return `${CSI}48;5;${color}m`;
	}
	return `${CSI}48;2;${r};${g};${b}m`;
}

/**
 * Generates ANSI SGR sequence for attributes.
 */
function attrSequence(attrs: number): string {
	const codes: number[] = [];

	if (attrs & Attr.BOLD) codes.push(SGR.BOLD);
	if (attrs & Attr.DIM) codes.push(SGR.DIM);
	if (attrs & Attr.ITALIC) codes.push(SGR.ITALIC);
	if (attrs & Attr.UNDERLINE) codes.push(SGR.UNDERLINE);
	if (attrs & Attr.BLINK) codes.push(SGR.BLINK);
	if (attrs & Attr.INVERSE) codes.push(SGR.INVERSE);
	if (attrs & Attr.HIDDEN) codes.push(SGR.HIDDEN);
	if (attrs & Attr.STRIKETHROUGH) codes.push(SGR.STRIKETHROUGH);

	if (codes.length === 0) return '';
	return `${CSI}${codes.join(';')}m`;
}

/**
 * Converts a screenshot to ANSI escape sequences for terminal display.
 *
 * @param screenshot - The screenshot to convert
 * @param options - Output options
 * @returns ANSI-formatted string
 *
 * @example
 * ```typescript
 * import { captureScreen, screenshotToAnsi } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * const ansi = screenshotToAnsi(screenshot);
 * process.stdout.write(ansi);
 * ```
 */
export function screenshotToAnsi(screenshot: Screenshot, options: AnsiOutputOptions = {}): string {
	const { resetPerLine = true, use256Color = false, lineSeparator = '\n' } = options;

	const lines: string[] = [];
	let lastFg = -1;
	let lastBg = -1;
	let lastAttrs = -1;

	for (let y = 0; y < screenshot.height; y++) {
		const row = screenshot.cells[y];
		if (!row) continue;

		let line = '';

		for (let x = 0; x < screenshot.width; x++) {
			const cell = row[x];
			if (!cell) {
				line += ' ';
				continue;
			}

			// Apply attributes if changed
			if (cell.attrs !== lastAttrs) {
				// Reset then apply new attributes
				line += `${CSI}0m`;
				lastFg = -1;
				lastBg = -1;
				if (cell.attrs !== Attr.NONE) {
					line += attrSequence(cell.attrs);
				}
				lastAttrs = cell.attrs;
			}

			// Apply colors if changed
			if (cell.fg !== lastFg) {
				line += fgColorSequence(cell.fg, use256Color);
				lastFg = cell.fg;
			}
			if (cell.bg !== lastBg) {
				line += bgColorSequence(cell.bg, use256Color);
				lastBg = cell.bg;
			}

			line += cell.char;
		}

		if (resetPerLine) {
			line += `${CSI}0m`;
			lastFg = -1;
			lastBg = -1;
			lastAttrs = -1;
		}

		lines.push(line);
	}

	return lines.join(lineSeparator);
}

/**
 * Converts a screenshot to plain text, stripping colors and attributes.
 *
 * @param screenshot - The screenshot to convert
 * @param options - Output options
 * @returns Plain text string
 *
 * @example
 * ```typescript
 * import { captureScreen, screenshotToText } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * const text = screenshotToText(screenshot);
 * console.log(text);
 * ```
 */
export function screenshotToText(screenshot: Screenshot, options: TextOutputOptions = {}): string {
	const { lineSeparator = '\n', preserveTrailingSpaces = false } = options;

	const lines: string[] = [];

	for (let y = 0; y < screenshot.height; y++) {
		const row = screenshot.cells[y];
		if (!row) {
			lines.push('');
			continue;
		}

		let line = '';
		for (let x = 0; x < screenshot.width; x++) {
			const cell = row[x];
			line += cell?.char ?? ' ';
		}

		if (!preserveTrailingSpaces) {
			line = line.trimEnd();
		}

		lines.push(line);
	}

	return lines.join(lineSeparator);
}

/**
 * Converts a screenshot to a JSON-serializable format.
 *
 * @param screenshot - The screenshot to convert
 * @returns JSON-safe object
 *
 * @example
 * ```typescript
 * import { captureScreen, screenshotToJson } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * const json = screenshotToJson(screenshot);
 * const str = JSON.stringify(json);
 * ```
 */
export function screenshotToJson(screenshot: Screenshot): object {
	return {
		width: screenshot.width,
		height: screenshot.height,
		offsetX: screenshot.offsetX,
		offsetY: screenshot.offsetY,
		timestamp: screenshot.timestamp,
		cells: screenshot.cells.map((row) =>
			row.map((cell) => ({
				char: cell.char,
				fg: cell.fg,
				bg: cell.bg,
				attrs: cell.attrs,
			})),
		),
	};
}

/**
 * Restores a screenshot from JSON data.
 *
 * @param json - JSON data from screenshotToJson
 * @returns Restored Screenshot
 *
 * @example
 * ```typescript
 * import { screenshotFromJson } from 'blecsd';
 *
 * const json = JSON.parse(savedData);
 * const screenshot = screenshotFromJson(json);
 * ```
 */
export function screenshotFromJson(json: unknown): Screenshot {
	const data = json as {
		width: number;
		height: number;
		offsetX: number;
		offsetY: number;
		timestamp: number;
		cells: Array<Array<{ char: string; fg: number; bg: number; attrs: number }>>;
	};

	const cells: Cell[][] = data.cells.map((row) =>
		row.map((cell) => ({
			char: cell.char,
			fg: cell.fg,
			bg: cell.bg,
			attrs: cell.attrs,
		})),
	);

	return {
		width: data.width,
		height: data.height,
		offsetX: data.offsetX,
		offsetY: data.offsetY,
		timestamp: data.timestamp,
		cells,
	};
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Compares two screenshots for equality.
 *
 * @param a - First screenshot
 * @param b - Second screenshot
 * @returns true if screenshots are identical
 *
 * @example
 * ```typescript
 * import { captureScreen, screenshotsEqual } from 'blecsd';
 *
 * const before = captureScreen(buffer);
 * // ... modify buffer ...
 * const after = captureScreen(buffer);
 *
 * if (!screenshotsEqual(before, after)) {
 *   console.log('Buffer changed');
 * }
 * ```
 */
export function screenshotsEqual(a: Screenshot, b: Screenshot): boolean {
	if (a.width !== b.width || a.height !== b.height) {
		return false;
	}

	for (let y = 0; y < a.height; y++) {
		const rowA = a.cells[y];
		const rowB = b.cells[y];
		if (!rowA || !rowB) {
			if (rowA !== rowB) return false;
			continue;
		}

		for (let x = 0; x < a.width; x++) {
			const cellA = rowA[x];
			const cellB = rowB[x];
			if (!cellA || !cellB) {
				if (cellA !== cellB) return false;
				continue;
			}

			if (
				cellA.char !== cellB.char ||
				cellA.fg !== cellB.fg ||
				cellA.bg !== cellB.bg ||
				cellA.attrs !== cellB.attrs
			) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Represents a difference between two cells.
 */
export interface CellDiff {
	readonly x: number;
	readonly y: number;
	readonly before: Cell;
	readonly after: Cell;
}

/**
 * Computes the differences between two screenshots.
 *
 * @param before - The original screenshot
 * @param after - The modified screenshot
 * @returns Array of cell differences
 *
 * @example
 * ```typescript
 * import { captureScreen, diffScreenshots } from 'blecsd';
 *
 * const before = captureScreen(buffer);
 * // ... modify buffer ...
 * const after = captureScreen(buffer);
 *
 * const diffs = diffScreenshots(before, after);
 * console.log(`${diffs.length} cells changed`);
 * ```
 */
export function diffScreenshots(before: Screenshot, after: Screenshot): CellDiff[] {
	const diffs: CellDiff[] = [];

	const width = Math.max(before.width, after.width);
	const height = Math.max(before.height, after.height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const cellBefore = before.cells[y]?.[x] ?? createCell();
			const cellAfter = after.cells[y]?.[x] ?? createCell();

			if (
				cellBefore.char !== cellAfter.char ||
				cellBefore.fg !== cellAfter.fg ||
				cellBefore.bg !== cellAfter.bg ||
				cellBefore.attrs !== cellAfter.attrs
			) {
				diffs.push({
					x,
					y,
					before: cellBefore,
					after: cellAfter,
				});
			}
		}
	}

	return diffs;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets a cell from a screenshot.
 *
 * @param screenshot - The screenshot
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns The cell at the position, or undefined if out of bounds
 *
 * @example
 * ```typescript
 * import { captureScreen, getScreenshotCell } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * const cell = getScreenshotCell(screenshot, 10, 5);
 * ```
 */
export function getScreenshotCell(screenshot: Screenshot, x: number, y: number): Cell | undefined {
	if (x < 0 || x >= screenshot.width || y < 0 || y >= screenshot.height) {
		return undefined;
	}
	return screenshot.cells[y]?.[x];
}

/**
 * Gets the content at a specific row as text.
 *
 * @param screenshot - The screenshot
 * @param y - Row index
 * @returns The text content of the row
 *
 * @example
 * ```typescript
 * import { captureScreen, getScreenshotRow } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * const rowText = getScreenshotRow(screenshot, 0);
 * ```
 */
export function getScreenshotRow(screenshot: Screenshot, y: number): string {
	if (y < 0 || y >= screenshot.height) {
		return '';
	}

	const row = screenshot.cells[y];
	if (!row) return '';

	return row.map((cell) => cell.char).join('');
}

/**
 * Gets the content at a specific column as text.
 *
 * @param screenshot - The screenshot
 * @param x - Column index
 * @returns The text content of the column
 *
 * @example
 * ```typescript
 * import { captureScreen, getScreenshotColumn } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * const colText = getScreenshotColumn(screenshot, 0);
 * ```
 */
export function getScreenshotColumn(screenshot: Screenshot, x: number): string {
	if (x < 0 || x >= screenshot.width) {
		return '';
	}

	let col = '';
	for (let y = 0; y < screenshot.height; y++) {
		const cell = screenshot.cells[y]?.[x];
		col += cell?.char ?? ' ';
	}
	return col;
}

/**
 * Extracts a sub-region from a screenshot.
 *
 * @param screenshot - The source screenshot
 * @param x - Left edge of region
 * @param y - Top edge of region
 * @param width - Width of region
 * @param height - Height of region
 * @returns A new screenshot containing the region
 *
 * @example
 * ```typescript
 * import { captureScreen, extractRegion } from 'blecsd';
 *
 * const full = captureScreen(buffer);
 * const region = extractRegion(full, 10, 5, 20, 10);
 * ```
 */
export function extractRegion(
	screenshot: Screenshot,
	x: number,
	y: number,
	width: number,
	height: number,
): Screenshot {
	// Clamp to screenshot bounds
	const startX = Math.max(0, Math.min(x, screenshot.width));
	const startY = Math.max(0, Math.min(y, screenshot.height));
	const endX = Math.max(startX, Math.min(x + width, screenshot.width));
	const endY = Math.max(startY, Math.min(y + height, screenshot.height));

	const extractedWidth = endX - startX;
	const extractedHeight = endY - startY;

	const cells: Cell[][] = [];

	for (let row = startY; row < endY; row++) {
		const rowCells: Cell[] = [];
		for (let col = startX; col < endX; col++) {
			const cell = screenshot.cells[row]?.[col];
			rowCells.push(cell ? cloneCell(cell) : createCell());
		}
		cells.push(rowCells);
	}

	return {
		width: extractedWidth,
		height: extractedHeight,
		cells,
		timestamp: screenshot.timestamp,
		offsetX: screenshot.offsetX + startX,
		offsetY: screenshot.offsetY + startY,
	};
}

/**
 * Checks if a screenshot contains only default/empty cells.
 *
 * @param screenshot - The screenshot to check
 * @returns true if all cells are empty
 *
 * @example
 * ```typescript
 * import { createEmptyScreenshot, isScreenshotEmpty } from 'blecsd';
 *
 * const empty = createEmptyScreenshot(80, 24);
 * console.log(isScreenshotEmpty(empty)); // true
 * ```
 */
export function isScreenshotEmpty(screenshot: Screenshot): boolean {
	for (let y = 0; y < screenshot.height; y++) {
		const row = screenshot.cells[y];
		if (!row) continue;

		for (let x = 0; x < screenshot.width; x++) {
			const cell = row[x];
			if (cell && cell.char !== ' ') {
				return false;
			}
		}
	}
	return true;
}

/**
 * Counts the number of non-empty cells in a screenshot.
 *
 * @param screenshot - The screenshot
 * @returns Number of cells with non-space characters
 *
 * @example
 * ```typescript
 * import { captureScreen, countNonEmptyCells } from 'blecsd';
 *
 * const screenshot = captureScreen(buffer);
 * console.log(`${countNonEmptyCells(screenshot)} cells have content`);
 * ```
 */
export function countNonEmptyCells(screenshot: Screenshot): number {
	let count = 0;
	for (let y = 0; y < screenshot.height; y++) {
		const row = screenshot.cells[y];
		if (!row) continue;

		for (let x = 0; x < screenshot.width; x++) {
			const cell = row[x];
			if (cell && cell.char !== ' ') {
				count++;
			}
		}
	}
	return count;
}
