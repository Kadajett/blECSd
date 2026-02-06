/**
 * Cursor/caret navigation for huge documents.
 *
 * Provides O(log n) line lookup via binary search indexing,
 * cursor-first viewport management, and instant page/document
 * navigation regardless of document size.
 *
 * @module utils/cursorNavigation
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cursor position in a document.
 */
export interface CursorPosition {
	/** Line index (0-based) */
	readonly line: number;
	/** Column index (0-based) */
	readonly column: number;
}

/**
 * Viewport state for cursor-following.
 */
export interface ViewportState {
	/** First visible line index (0-based) */
	readonly topLine: number;
	/** Number of visible lines */
	readonly height: number;
	/** First visible column (for horizontal scrolling) */
	readonly leftColumn: number;
	/** Visible width in columns */
	readonly width: number;
}

/**
 * Configuration for cursor navigation behavior.
 */
export interface CursorNavConfig {
	/** Lines of padding to keep above/below cursor (default: 5) */
	readonly scrollPadding: number;
	/** Horizontal padding columns (default: 5) */
	readonly horizontalPadding: number;
	/** Whether to wrap at line boundaries (default: true) */
	readonly lineWrap: boolean;
	/** Tab width for column calculations (default: 4) */
	readonly tabWidth: number;
}

/**
 * A line index for O(log n) line lookups by byte offset.
 */
export interface LineIndex {
	/** Byte offsets for start of each line */
	readonly offsets: readonly number[];
	/** Total number of lines */
	readonly lineCount: number;
}

/**
 * Result of a cursor navigation operation.
 */
export interface NavigationResult {
	/** New cursor position */
	readonly cursor: CursorPosition;
	/** Updated viewport (if scrolling was needed) */
	readonly viewport: ViewportState;
	/** Whether the viewport moved */
	readonly scrolled: boolean;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_NAV_CONFIG: CursorNavConfig = {
	scrollPadding: 5,
	horizontalPadding: 5,
	lineWrap: true,
	tabWidth: 4,
};

// =============================================================================
// LINE INDEX
// =============================================================================

/**
 * Builds a line index from text content for O(log n) lookups.
 *
 * @param text - The full document text
 * @returns A line index structure
 *
 * @example
 * ```typescript
 * import { buildLineIndex } from 'blecsd';
 *
 * const index = buildLineIndex('hello\nworld\nfoo');
 * // index.offsets = [0, 6, 12]
 * // index.lineCount = 3
 * ```
 */
export function buildLineIndex(text: string): LineIndex {
	const offsets: number[] = [0];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') {
			offsets.push(i + 1);
		}
	}
	return { offsets, lineCount: offsets.length };
}

/**
 * Builds a line index from an array of line lengths.
 * More efficient when line lengths are already known.
 *
 * @param lineLengths - Array of byte lengths per line (including newline)
 * @returns A line index structure
 *
 * @example
 * ```typescript
 * import { buildLineIndexFromLengths } from 'blecsd';
 *
 * const index = buildLineIndexFromLengths([6, 6, 3]); // "hello\n" "world\n" "foo"
 * ```
 */
export function buildLineIndexFromLengths(lineLengths: readonly number[]): LineIndex {
	const offsets: number[] = [0];
	let offset = 0;
	for (let i = 0; i < lineLengths.length - 1; i++) {
		offset += lineLengths[i]!;
		offsets.push(offset);
	}
	return { offsets, lineCount: lineLengths.length };
}

/**
 * Finds the line number for a given byte offset using binary search.
 * O(log n) performance.
 *
 * @param index - The line index
 * @param offset - Byte offset to look up
 * @returns Line number (0-based)
 *
 * @example
 * ```typescript
 * import { buildLineIndex, lineForOffset } from 'blecsd';
 *
 * const index = buildLineIndex('hello\nworld\n');
 * lineForOffset(index, 7); // 1 (within "world")
 * ```
 */
export function lineForOffset(index: LineIndex, offset: number): number {
	const offsets = index.offsets;
	let lo = 0;
	let hi = offsets.length - 1;

	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		const midVal = offsets[mid]!;
		if (midVal <= offset) {
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}

	return Math.max(0, lo - 1);
}

/**
 * Gets the byte offset for the start of a line.
 *
 * @param index - The line index
 * @param line - Line number (0-based)
 * @returns Byte offset, or -1 if out of range
 */
export function offsetForLine(index: LineIndex, line: number): number {
	if (line < 0 || line >= index.lineCount) return -1;
	return index.offsets[line]!;
}

// =============================================================================
// CURSOR CREATION
// =============================================================================

/**
 * Creates a cursor position.
 *
 * @param line - Line index (0-based)
 * @param column - Column index (0-based)
 * @returns A cursor position
 *
 * @example
 * ```typescript
 * import { createCursor } from 'blecsd';
 *
 * const cursor = createCursor(0, 0); // Top-left
 * ```
 */
export function createCursor(line = 0, column = 0): CursorPosition {
	return { line: Math.max(0, line), column: Math.max(0, column) };
}

/**
 * Creates a viewport state.
 *
 * @param topLine - First visible line
 * @param height - Viewport height in lines
 * @param leftColumn - First visible column
 * @param width - Viewport width in columns
 * @returns A viewport state
 */
export function createViewport(
	topLine = 0,
	height = 24,
	leftColumn = 0,
	width = 80,
): ViewportState {
	return {
		topLine: Math.max(0, topLine),
		height: Math.max(1, height),
		leftColumn: Math.max(0, leftColumn),
		width: Math.max(1, width),
	};
}

/**
 * Creates a navigation config with defaults.
 *
 * @param config - Optional overrides
 * @returns Full navigation config
 */
export function createNavConfig(config?: Partial<CursorNavConfig>): CursorNavConfig {
	return { ...DEFAULT_NAV_CONFIG, ...config };
}

// =============================================================================
// VIEWPORT MANAGEMENT
// =============================================================================

/**
 * Adjusts the viewport to ensure the cursor is visible.
 * Applies scroll padding to keep context around the cursor.
 *
 * @param cursor - Current cursor position
 * @param viewport - Current viewport state
 * @param totalLines - Total lines in document
 * @param config - Navigation configuration
 * @returns Updated viewport and whether it scrolled
 *
 * @example
 * ```typescript
 * import { createCursor, createViewport, ensureCursorVisible } from 'blecsd';
 *
 * const cursor = createCursor(100, 0);
 * const viewport = createViewport(0, 40);
 * const { viewport: newVp, scrolled } = ensureCursorVisible(cursor, viewport, 10000);
 * ```
 */
export function ensureCursorVisible(
	cursor: CursorPosition,
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): { viewport: ViewportState; scrolled: boolean } {
	const cfg = { ...DEFAULT_NAV_CONFIG, ...config };
	let { topLine, leftColumn } = viewport;
	let scrolled = false;

	// Vertical scrolling
	const minTop = cursor.line - viewport.height + 1 + cfg.scrollPadding;
	const maxTop = cursor.line - cfg.scrollPadding;

	if (topLine > maxTop) {
		topLine = Math.max(0, maxTop);
		scrolled = true;
	}
	if (topLine < minTop) {
		topLine = Math.min(Math.max(0, totalLines - viewport.height), Math.max(0, minTop));
		scrolled = true;
	}

	// Horizontal scrolling
	const minLeft = cursor.column - viewport.width + 1 + cfg.horizontalPadding;
	const maxLeft = cursor.column - cfg.horizontalPadding;

	if (leftColumn > maxLeft) {
		leftColumn = Math.max(0, maxLeft);
		scrolled = true;
	}
	if (leftColumn < minLeft) {
		leftColumn = Math.max(0, minLeft);
		scrolled = true;
	}

	if (!scrolled) return { viewport, scrolled: false };

	return {
		viewport: { ...viewport, topLine, leftColumn },
		scrolled: true,
	};
}

// =============================================================================
// NAVIGATION OPERATIONS
// =============================================================================

/**
 * Clamps a cursor position within document bounds.
 *
 * @param cursor - The cursor position
 * @param totalLines - Total lines in document
 * @param getLineLength - Function returning line length for a given line index
 * @returns Clamped cursor position
 */
export function clampCursor(
	cursor: CursorPosition,
	totalLines: number,
	getLineLength: (line: number) => number,
): CursorPosition {
	const line = Math.max(0, Math.min(cursor.line, totalLines - 1));
	const maxCol = line < totalLines ? getLineLength(line) : 0;
	const column = Math.max(0, Math.min(cursor.column, maxCol));
	return { line, column };
}

/**
 * Moves cursor up by a given number of lines.
 *
 * @param cursor - Current cursor position
 * @param lines - Number of lines to move (default: 1)
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 */
export function moveCursorUp(
	cursor: CursorPosition,
	lines: number,
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	const newCursor = createCursor(cursor.line - lines, cursor.column);
	const clamped = clampCursor(newCursor, totalLines, () => cursor.column);
	const { viewport: newVp, scrolled } = ensureCursorVisible(clamped, viewport, totalLines, config);
	return { cursor: clamped, viewport: newVp, scrolled };
}

/**
 * Moves cursor down by a given number of lines.
 *
 * @param cursor - Current cursor position
 * @param lines - Number of lines to move (default: 1)
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 */
export function moveCursorDown(
	cursor: CursorPosition,
	lines: number,
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	const newCursor = createCursor(cursor.line + lines, cursor.column);
	const clamped = clampCursor(newCursor, totalLines, () => cursor.column);
	const { viewport: newVp, scrolled } = ensureCursorVisible(clamped, viewport, totalLines, config);
	return { cursor: clamped, viewport: newVp, scrolled };
}

/**
 * Moves cursor to a specific line (go-to-line).
 * Uses O(1) direct jump, not O(n) scrolling.
 *
 * @param targetLine - Target line number (0-based)
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 *
 * @example
 * ```typescript
 * import { goToLine, createViewport } from 'blecsd';
 *
 * const viewport = createViewport(0, 40);
 * const result = goToLine(999999, viewport, 1000000);
 * // Instantly jumps to line 1,000,000
 * ```
 */
export function goToLine(
	targetLine: number,
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	const line = Math.max(0, Math.min(targetLine, totalLines - 1));
	const cursor = createCursor(line, 0);
	const { viewport: newVp, scrolled } = ensureCursorVisible(cursor, viewport, totalLines, config);
	return { cursor, viewport: newVp, scrolled };
}

/**
 * Performs a page-up navigation.
 *
 * @param cursor - Current cursor position
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 */
export function pageUp(
	cursor: CursorPosition,
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	return moveCursorUp(cursor, viewport.height - 1, viewport, totalLines, config);
}

/**
 * Performs a page-down navigation.
 *
 * @param cursor - Current cursor position
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 */
export function pageDown(
	cursor: CursorPosition,
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	return moveCursorDown(cursor, viewport.height - 1, viewport, totalLines, config);
}

/**
 * Jumps to the beginning of the document.
 *
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 */
export function goToStart(
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	return goToLine(0, viewport, totalLines, config);
}

/**
 * Jumps to the end of the document.
 *
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param config - Navigation config
 * @returns Navigation result
 */
export function goToEnd(
	viewport: ViewportState,
	totalLines: number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	return goToLine(totalLines - 1, viewport, totalLines, config);
}

/**
 * Moves cursor left by a given number of columns.
 *
 * @param cursor - Current cursor position
 * @param columns - Columns to move (default: 1)
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param getLineLength - Function returning line length
 * @param config - Navigation config
 * @returns Navigation result
 */
export function moveCursorLeft(
	cursor: CursorPosition,
	columns: number,
	viewport: ViewportState,
	totalLines: number,
	getLineLength: (line: number) => number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	const cfg = { ...DEFAULT_NAV_CONFIG, ...config };
	let { line, column } = cursor;
	column -= columns;

	// Wrap to previous line if enabled
	if (column < 0 && cfg.lineWrap && line > 0) {
		line--;
		column = getLineLength(line);
	} else {
		column = Math.max(0, column);
	}

	const newCursor = { line, column };
	const { viewport: newVp, scrolled } = ensureCursorVisible(
		newCursor,
		viewport,
		totalLines,
		config,
	);
	return { cursor: newCursor, viewport: newVp, scrolled };
}

/**
 * Moves cursor right by a given number of columns.
 *
 * @param cursor - Current cursor position
 * @param columns - Columns to move (default: 1)
 * @param viewport - Current viewport
 * @param totalLines - Total lines in document
 * @param getLineLength - Function returning line length
 * @param config - Navigation config
 * @returns Navigation result
 */
export function moveCursorRight(
	cursor: CursorPosition,
	columns: number,
	viewport: ViewportState,
	totalLines: number,
	getLineLength: (line: number) => number,
	config?: Partial<CursorNavConfig>,
): NavigationResult {
	const cfg = { ...DEFAULT_NAV_CONFIG, ...config };
	let { line, column } = cursor;
	const lineLen = getLineLength(line);
	column += columns;

	// Wrap to next line if enabled
	if (column > lineLen && cfg.lineWrap && line < totalLines - 1) {
		line++;
		column = 0;
	} else {
		column = Math.min(column, lineLen);
	}

	const newCursor = { line, column };
	const { viewport: newVp, scrolled } = ensureCursorVisible(
		newCursor,
		viewport,
		totalLines,
		config,
	);
	return { cursor: newCursor, viewport: newVp, scrolled };
}
