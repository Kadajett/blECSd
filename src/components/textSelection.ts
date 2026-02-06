/**
 * Text Selection Across Virtualized Content
 *
 * Provides range-based text selection that works across millions of virtualized
 * (unrendered) lines. Supports both stream and rectangular (block) selection.
 * Selection is stored as lightweight range descriptors and text is materialized
 * lazily on copy.
 *
 * @module components/textSelection
 *
 * @example
 * ```typescript
 * import {
 *   createSelectionState,
 *   startSelection,
 *   updateSelection,
 *   getSelectedText,
 *   clearTextSelection,
 * } from 'blecsd';
 *
 * // Create selection state for an entity
 * const state = createSelectionState();
 *
 * // Start selecting at line 100, column 5
 * startSelection(state, 100, 5);
 *
 * // Extend selection to line 200, column 20
 * updateSelection(state, 200, 20);
 *
 * // Copy selected text from a line store
 * const text = getSelectedText(state, lineStore);
 * ```
 */

import { z } from 'zod';
import type { VirtualizedLineStore } from '../utils/virtualizedLineStore';
import { getLineAtIndex, getLineRange } from '../utils/virtualizedLineStore';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum number of lines that callers are advised to materialize in a single
 * synchronous copy operation.
 *
 * This constant is intentionally exported for consumers of this module to use
 * as a heuristic when deciding between:
 *
 * - synchronous copy via {@link getSelectedText}, and
 * - a background/streaming copy via {@link createBackgroundCopy}.
 *
 * The selection utilities provided by this module do not enforce this limit
 * automatically; it is a guideline for API users who need to avoid blocking
 * the UI thread when dealing with very large selections.
 */
export const SYNC_COPY_LINE_LIMIT = 50_000;

/** Chunk size for background copy operations */
export const BACKGROUND_COPY_CHUNK_SIZE = 10_000;

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema for selection position.
 */
export const SelectionPositionSchema = z.object({
	line: z.number().int().nonnegative(),
	col: z.number().int().nonnegative(),
});

/**
 * Schema for selection mode.
 */
export const SelectionModeSchema = z.enum(['stream', 'rectangular']);

// =============================================================================
// TYPES
// =============================================================================

/**
 * A position in the text (line + column).
 */
export interface SelectionPosition {
	/** Line index (0-based) */
	readonly line: number;
	/** Column index (0-based) */
	readonly col: number;
}

/**
 * Selection mode.
 * - 'stream': Normal selection that flows across lines
 * - 'rectangular': Block selection (column-based rectangle)
 */
export type SelectionMode = 'stream' | 'rectangular';

/**
 * Normalized selection range with start <= end.
 */
export interface SelectionRange {
	/** Start position (earlier in document) */
	readonly start: SelectionPosition;
	/** End position (later in document) */
	readonly end: SelectionPosition;
	/** Selection mode */
	readonly mode: SelectionMode;
}

/**
 * Mutable selection state for an entity.
 */
export interface TextSelectionState {
	/** Anchor point (where selection started) */
	anchorLine: number;
	anchorCol: number;
	/** Focus point (where selection currently extends to) */
	focusLine: number;
	focusCol: number;
	/** Whether a selection is active */
	active: boolean;
	/** Selection mode */
	mode: SelectionMode;
}

/**
 * Result of a background copy operation.
 */
export interface CopyProgress {
	/** Whether the copy is complete */
	readonly done: boolean;
	/** Lines processed so far */
	readonly linesProcessed: number;
	/** Total lines to process */
	readonly totalLines: number;
	/** Accumulated text (only filled when done) */
	readonly text: string;
}

/**
 * Per-line selection info for rendering.
 */
export interface LineSelectionInfo {
	/** Whether this line is fully selected */
	readonly fullLine: boolean;
	/** Start column of selection on this line (-1 if not selected) */
	readonly startCol: number;
	/** End column of selection on this line (-1 if not selected, exclusive) */
	readonly endCol: number;
}

// =============================================================================
// ENTITY STORE
// =============================================================================

/** Per-entity selection state */
const selectionStore = new Map<number, TextSelectionState>();

// =============================================================================
// STATE CREATION
// =============================================================================

/**
 * Creates a fresh selection state.
 *
 * @returns New selection state with no active selection
 *
 * @example
 * ```typescript
 * import { createSelectionState } from 'blecsd';
 *
 * const state = createSelectionState();
 * console.log(state.active); // false
 * ```
 */
export function createSelectionState(): TextSelectionState {
	return {
		anchorLine: 0,
		anchorCol: 0,
		focusLine: 0,
		focusCol: 0,
		active: false,
		mode: 'stream',
	};
}

// =============================================================================
// ENTITY REGISTRATION
// =============================================================================

/**
 * Registers selection state for an entity.
 *
 * @param eid - Entity ID
 * @returns The created selection state
 */
export function registerSelectionState(eid: number): TextSelectionState {
	const state = createSelectionState();
	selectionStore.set(eid, state);
	return state;
}

/**
 * Gets the selection state for an entity.
 *
 * @param eid - Entity ID
 * @returns Selection state or undefined
 *
 * @example
 * ```typescript
 * import { registerSelectionState, getSelectionState } from 'blecsd';
 *
 * registerSelectionState(42);
 * const state = getSelectionState(42);
 * ```
 */
export function getSelectionState(eid: number): TextSelectionState | undefined {
	return selectionStore.get(eid);
}

/**
 * Checks if an entity has selection state.
 *
 * @param eid - Entity ID
 * @returns true if registered
 */
export function hasSelectionState(eid: number): boolean {
	return selectionStore.has(eid);
}

/**
 * Removes selection state for an entity.
 *
 * @param eid - Entity ID
 */
export function removeSelectionState(eid: number): void {
	selectionStore.delete(eid);
}

/**
 * Resets the selection store (for testing).
 */
export function resetSelectionStore(): void {
	selectionStore.clear();
}

// =============================================================================
// SELECTION OPERATIONS
// =============================================================================

/**
 * Begins a new selection at the given position.
 *
 * @param state - Selection state
 * @param line - Line index
 * @param col - Column index
 * @param mode - Selection mode (default: 'stream')
 *
 * @example
 * ```typescript
 * import { createSelectionState, startSelection } from 'blecsd';
 *
 * const state = createSelectionState();
 * startSelection(state, 100, 5);
 * // Anchor and focus are both at (100, 5)
 * ```
 */
export function startSelection(
	state: TextSelectionState,
	line: number,
	col: number,
	mode: SelectionMode = 'stream',
): void {
	const safeLine = Math.max(0, Math.trunc(line) || 0);
	const safeCol = Math.max(0, Math.trunc(col) || 0);
	state.anchorLine = safeLine;
	state.anchorCol = safeCol;
	state.focusLine = safeLine;
	state.focusCol = safeCol;
	state.active = true;
	state.mode = mode;
}

/**
 * Updates the focus (extension point) of the current selection.
 * If no selection is active (i.e. startSelection was not called), this is a no-op.
 *
 * @param state - Selection state
 * @param line - New focus line (non-negative integer)
 * @param col - New focus column (non-negative integer)
 */
export function updateSelection(state: TextSelectionState, line: number, col: number): void {
	if (!state.active) {
		return;
	}
	state.focusLine = Math.max(0, Math.trunc(line) || 0);
	state.focusCol = Math.max(0, Math.trunc(col) || 0);
}

/**
 * Clears the current selection.
 *
 * @param state - Selection state
 */
export function clearTextSelection(state: TextSelectionState): void {
	state.active = false;
	state.anchorLine = 0;
	state.anchorCol = 0;
	state.focusLine = 0;
	state.focusCol = 0;
	state.mode = 'stream';
}

/**
 * Checks if a selection is active and non-empty.
 *
 * @param state - Selection state
 * @returns true if there is an active non-empty selection
 */
export function hasActiveSelection(state: TextSelectionState): boolean {
	if (!state.active) {
		return false;
	}
	return state.anchorLine !== state.focusLine || state.anchorCol !== state.focusCol;
}

/**
 * Selects an entire line.
 * Note: This always sets the selection mode to 'stream', regardless of the
 * current mode, since line selection is inherently a stream operation.
 *
 * @param state - Selection state
 * @param line - Line to select
 * @param lineLength - Length of the line in characters
 */
export function selectLine(state: TextSelectionState, line: number, lineLength: number): void {
	const safeLine = Math.max(0, Math.trunc(line) || 0);
	const safeLength = Math.max(0, Math.trunc(lineLength) || 0);
	state.anchorLine = safeLine;
	state.anchorCol = 0;
	state.focusLine = safeLine;
	state.focusCol = safeLength;
	state.active = true;
	state.mode = 'stream';
}

/**
 * Extends selection to select a range of full lines.
 * Note: This always sets the selection mode to 'stream', regardless of the
 * current mode, since line range selection is inherently a stream operation.
 *
 * @param state - Selection state
 * @param startLine - First line
 * @param endLine - Last line (inclusive)
 * @param endLineLength - Length of the last line
 */
export function selectLineRange(
	state: TextSelectionState,
	startLine: number,
	endLine: number,
	endLineLength: number,
): void {
	const safeStart = Math.max(0, Math.trunc(startLine) || 0);
	const safeEnd = Math.max(0, Math.trunc(endLine) || 0);
	const safeLength = Math.max(0, Math.trunc(endLineLength) || 0);
	state.anchorLine = safeStart;
	state.anchorCol = 0;
	state.focusLine = safeEnd;
	state.focusCol = safeLength;
	state.active = true;
	state.mode = 'stream';
}

/**
 * Selects all content.
 *
 * @param state - Selection state
 * @param totalLines - Total line count
 * @param lastLineLength - Length of the last line
 */
export function selectAll(
	state: TextSelectionState,
	totalLines: number,
	lastLineLength: number,
): void {
	const safeTotal = Math.max(0, Math.trunc(totalLines) || 0);
	if (safeTotal === 0) {
		return;
	}
	const safeLength = Math.max(0, Math.trunc(lastLineLength) || 0);
	state.anchorLine = 0;
	state.anchorCol = 0;
	state.focusLine = safeTotal - 1;
	state.focusCol = safeLength;
	state.active = true;
	state.mode = 'stream';
}

/**
 * Switches the selection mode (stream <-> rectangular).
 *
 * @param state - Selection state
 * @param mode - New mode
 */
export function setSelectionMode(state: TextSelectionState, mode: SelectionMode): void {
	state.mode = mode;
}

// =============================================================================
// RANGE NORMALIZATION
// =============================================================================

/**
 * Returns a normalized selection range with start <= end.
 * Anchor may be after focus if the user selected backwards.
 *
 * @param state - Selection state
 * @returns Normalized range or null if no active selection
 *
 * @example
 * ```typescript
 * import { createSelectionState, startSelection, updateSelection, getNormalizedRange } from 'blecsd';
 *
 * const state = createSelectionState();
 * startSelection(state, 200, 10); // anchor at (200, 10)
 * updateSelection(state, 100, 5); // focus at (100, 5) -- backwards
 *
 * const range = getNormalizedRange(state);
 * // range.start = { line: 100, col: 5 }
 * // range.end = { line: 200, col: 10 }
 * ```
 */
export function getNormalizedRange(state: TextSelectionState): SelectionRange | null {
	if (!state.active) {
		return null;
	}

	const anchorBefore =
		state.anchorLine < state.focusLine ||
		(state.anchorLine === state.focusLine && state.anchorCol <= state.focusCol);

	if (anchorBefore) {
		return {
			start: { line: state.anchorLine, col: state.anchorCol },
			end: { line: state.focusLine, col: state.focusCol },
			mode: state.mode,
		};
	}

	return {
		start: { line: state.focusLine, col: state.focusCol },
		end: { line: state.anchorLine, col: state.anchorCol },
		mode: state.mode,
	};
}

/**
 * Gets the total number of lines spanned by the selection.
 *
 * @param state - Selection state
 * @returns Number of lines (0 if no selection)
 */
export function getSelectionLineCount(state: TextSelectionState): number {
	const range = getNormalizedRange(state);
	if (!range) {
		return 0;
	}
	return range.end.line - range.start.line + 1;
}

// =============================================================================
// LINE-LEVEL SELECTION QUERIES
// =============================================================================

/**
 * Checks if a specific line is within the selection range.
 *
 * @param state - Selection state
 * @param line - Line index to check
 * @returns true if the line is at least partially selected
 */
export function isLineSelected(state: TextSelectionState, line: number): boolean {
	const range = getNormalizedRange(state);
	if (!range) {
		return false;
	}
	return line >= range.start.line && line <= range.end.line;
}

/**
 * Gets selection info for a specific line for rendering purposes.
 * Returns the column range that is selected on the given line.
 *
 * @param state - Selection state
 * @param line - Line index
 * @param lineLength - Length of the line in characters
 * @returns Selection info for the line
 */
export function getLineSelectionInfo(
	state: TextSelectionState,
	line: number,
	lineLength: number,
): LineSelectionInfo {
	const range = getNormalizedRange(state);
	if (!range || line < range.start.line || line > range.end.line) {
		return { fullLine: false, startCol: -1, endCol: -1 };
	}

	if (range.mode === 'rectangular') {
		// Rectangular: same column range on every line
		const minCol = Math.min(range.start.col, range.end.col);
		const maxCol = Math.max(range.start.col, range.end.col);
		const startCol = Math.min(minCol, lineLength);
		const endCol = Math.min(maxCol, lineLength);
		return {
			fullLine: startCol === 0 && endCol >= lineLength,
			startCol,
			endCol,
		};
	}

	// Stream selection
	const isSingleLine = range.start.line === range.end.line;

	if (isSingleLine) {
		return {
			fullLine: range.start.col === 0 && range.end.col >= lineLength,
			startCol: Math.min(range.start.col, lineLength),
			endCol: Math.min(range.end.col, lineLength),
		};
	}

	if (line === range.start.line) {
		// First line: from start col to end of line
		return {
			fullLine: range.start.col === 0,
			startCol: Math.min(range.start.col, lineLength),
			endCol: lineLength,
		};
	}

	if (line === range.end.line) {
		// Last line: from start of line to end col
		return {
			fullLine: range.end.col >= lineLength,
			startCol: 0,
			endCol: Math.min(range.end.col, lineLength),
		};
	}

	// Middle line: fully selected
	return { fullLine: true, startCol: 0, endCol: lineLength };
}

/**
 * Gets the set of lines that are selected (for dirty tracking).
 * Only returns lines within the given viewport range for efficiency.
 *
 * @param state - Selection state
 * @param viewportStart - First visible line
 * @param viewportEnd - Last visible line (exclusive)
 * @returns Array of selected line indices within viewport
 */
export function getSelectedLinesInViewport(
	state: TextSelectionState,
	viewportStart: number,
	viewportEnd: number,
): readonly number[] {
	const range = getNormalizedRange(state);
	if (!range) {
		return [];
	}

	const from = Math.max(range.start.line, viewportStart);
	const to = Math.min(range.end.line, viewportEnd - 1);

	if (from > to) {
		return [];
	}

	const lines: number[] = [];
	for (let i = from; i <= to; i++) {
		lines.push(i);
	}
	return lines;
}

// =============================================================================
// TEXT MATERIALIZATION
// =============================================================================

/**
 * Extracts selected text from a line store synchronously.
 * For stream selection, text flows across lines.
 * For rectangular selection, each line contributes the selected column range.
 *
 * **Warning:** This materializes the entire selection in one call. For
 * selections larger than {@link SYNC_COPY_LINE_LIMIT} lines, prefer
 * {@link createBackgroundCopy} to avoid blocking the UI thread.
 *
 * @param state - Selection state
 * @param store - The virtualized line store
 * @returns Selected text as a string, or empty string if no selection
 *
 * @example
 * ```typescript
 * import { createSelectionState, startSelection, updateSelection, getSelectedText } from 'blecsd';
 * import { createLineStore } from 'blecsd';
 *
 * const store = createLineStore('Hello World\nFoo Bar\nBaz');
 * const state = createSelectionState();
 * startSelection(state, 0, 6);
 * updateSelection(state, 1, 3);
 *
 * const text = getSelectedText(state, store);
 * // text = "World\nFoo"
 * ```
 */
export function getSelectedText(state: TextSelectionState, store: VirtualizedLineStore): string {
	const range = getNormalizedRange(state);
	if (!range) {
		return '';
	}

	if (range.mode === 'rectangular') {
		return getRectangularSelectedText(range, store);
	}

	return getStreamSelectedText(range, store);
}

/**
 * Extracts stream-selected text.
 * Missing lines in the store are represented as empty strings to preserve line structure.
 */
function getStreamSelectedText(range: SelectionRange, store: VirtualizedLineStore): string {
	const { start, end } = range;

	// Single line selection
	if (start.line === end.line) {
		const line = getLineAtIndex(store, start.line);
		if (!line) {
			return '';
		}
		return line.slice(start.col, end.col);
	}

	const parts: string[] = [];

	// First line: from start col to end
	const firstLine = getLineAtIndex(store, start.line);
	parts.push(firstLine !== undefined ? firstLine.slice(start.col) : '');

	// Middle lines: full lines in batches
	if (end.line - start.line > 1) {
		const middleRange = getLineRange(store, start.line + 1, end.line);
		for (const line of middleRange.lines) {
			parts.push(line);
		}
	}

	// Last line: from start to end col
	const lastLine = getLineAtIndex(store, end.line);
	parts.push(lastLine !== undefined ? lastLine.slice(0, end.col) : '');

	return parts.join('\n');
}

/**
 * Extracts rectangular-selected text.
 */
function getRectangularSelectedText(range: SelectionRange, store: VirtualizedLineStore): string {
	const minCol = Math.min(range.start.col, range.end.col);
	const maxCol = Math.max(range.start.col, range.end.col);
	const lineRange = getLineRange(store, range.start.line, range.end.line + 1);

	const parts: string[] = [];
	for (const line of lineRange.lines) {
		const sliceStart = Math.min(minCol, line.length);
		const sliceEnd = Math.min(maxCol, line.length);
		parts.push(line.slice(sliceStart, sliceEnd));
	}

	return parts.join('\n');
}

// =============================================================================
// BACKGROUND COPY (CHUNKED)
// =============================================================================

/**
 * Creates a background copy iterator for huge selections.
 * Processes lines in chunks to avoid UI freezes.
 *
 * @param state - Selection state
 * @param store - Line store
 * @param chunkSize - Lines per chunk (default: BACKGROUND_COPY_CHUNK_SIZE)
 * @returns Iterator that yields CopyProgress updates
 *
 * @example
 * ```typescript
 * import { createSelectionState, startSelection, updateSelection, createBackgroundCopy } from 'blecsd';
 *
 * const iter = createBackgroundCopy(state, store);
 * for (const progress of iter) {
 *   if (progress.done) {
 *     console.log('Copied:', progress.text.length, 'chars');
 *   }
 * }
 * ```
 */
export function* createBackgroundCopy(
	state: TextSelectionState,
	store: VirtualizedLineStore,
	chunkSize: number = BACKGROUND_COPY_CHUNK_SIZE,
): Generator<CopyProgress, void, undefined> {
	const range = getNormalizedRange(state);
	if (!range) {
		yield { done: true, linesProcessed: 0, totalLines: 0, text: '' };
		return;
	}

	const totalLines = range.end.line - range.start.line + 1;

	if (range.mode === 'rectangular') {
		// For rectangular, fall back to sync since it's simpler
		const text = getRectangularSelectedText(range, store);
		yield { done: true, linesProcessed: totalLines, totalLines, text };
		return;
	}

	const parts: string[] = [];
	let linesProcessed = 0;

	// Process first line
	const firstLine = getLineAtIndex(store, range.start.line);
	if (firstLine !== undefined) {
		if (range.start.line === range.end.line) {
			parts.push(firstLine.slice(range.start.col, range.end.col));
			yield { done: true, linesProcessed: 1, totalLines, text: parts[0] ?? '' };
			return;
		}
		parts.push(firstLine.slice(range.start.col));
	}
	linesProcessed = 1;

	// Process middle lines in chunks
	const middleStart = range.start.line + 1;
	const middleEnd = range.end.line;

	for (let chunk = middleStart; chunk < middleEnd; chunk += chunkSize) {
		const chunkEnd = Math.min(chunk + chunkSize, middleEnd);
		const lineData = getLineRange(store, chunk, chunkEnd);

		for (const line of lineData.lines) {
			parts.push(line);
		}

		linesProcessed += chunkEnd - chunk;

		if (chunkEnd < middleEnd) {
			yield {
				done: false,
				linesProcessed,
				totalLines,
				text: '',
			};
		}
	}

	// Process last line
	const lastLine = getLineAtIndex(store, range.end.line);
	if (lastLine !== undefined) {
		parts.push(lastLine.slice(0, range.end.col));
	}
	linesProcessed = totalLines;

	yield {
		done: true,
		linesProcessed,
		totalLines,
		text: parts.join('\n'),
	};
}

// =============================================================================
// SELECTION DIFFING (FOR DIRTY TRACKING)
// =============================================================================

/**
 * Computes dirty ranges when both old and new selections exist.
 * Returns the symmetric difference of the two ranges.
 */
function computeOverlapDirtyRanges(
	oldRange: SelectionRange,
	newRange: SelectionRange,
): [number, number][] {
	// Mode change: everything is dirty
	if (oldRange.mode !== newRange.mode) {
		return [
			[
				Math.min(oldRange.start.line, newRange.start.line),
				Math.max(oldRange.end.line, newRange.end.line),
			],
		];
	}

	const ranges: [number, number][] = [];
	const overlapStart = Math.max(oldRange.start.line, newRange.start.line);
	const overlapEnd = Math.min(oldRange.end.line, newRange.end.line);

	// Top dirty region (above overlap)
	const topStart = Math.min(oldRange.start.line, newRange.start.line);
	if (topStart < overlapStart) {
		ranges.push([topStart, overlapStart - 1]);
	}

	// Bottom dirty region (below overlap)
	const bottomEnd = Math.max(oldRange.end.line, newRange.end.line);
	if (overlapEnd < bottomEnd) {
		ranges.push([overlapEnd + 1, bottomEnd]);
	}

	// Start/end lines are dirty if columns changed
	if (overlapStart <= overlapEnd) {
		if (oldRange.start.line === newRange.start.line && oldRange.start.col !== newRange.start.col) {
			ranges.push([oldRange.start.line, oldRange.start.line]);
		}
		if (oldRange.end.line === newRange.end.line && oldRange.end.col !== newRange.end.col) {
			ranges.push([oldRange.end.line, oldRange.end.line]);
		}
	}

	return mergeRanges(ranges);
}

/**
 * Merges overlapping or adjacent dirty ranges to avoid redundant re-rendering.
 */
function mergeRanges(ranges: [number, number][]): [number, number][] {
	if (ranges.length <= 1) {
		return ranges;
	}

	ranges.sort((a, b) => a[0] - b[0]);

	const merged: [number, number][] = [];
	for (const range of ranges) {
		const last = merged[merged.length - 1];
		if (!last) {
			merged.push(range);
			continue;
		}

		if (range[0] <= last[1] + 1) {
			if (range[1] > last[1]) {
				last[1] = range[1];
			}
		} else {
			merged.push(range);
		}
	}

	return merged;
}

/**
 * Computes the dirty line ranges when selection changes.
 * Returns the line ranges that need re-rendering.
 *
 * @param oldState - Previous selection state (or null)
 * @param newState - Current selection state
 * @returns Array of [startLine, endLine] ranges that changed
 */
export function getSelectionDirtyRanges(
	oldState: TextSelectionState | null,
	newState: TextSelectionState,
): readonly [number, number][] {
	const oldRange = oldState ? getNormalizedRange(oldState) : null;
	const newRange = getNormalizedRange(newState);

	// No selection before or after
	if (!oldRange && !newRange) {
		return [];
	}

	// Selection appeared
	if (!oldRange && newRange) {
		return [[newRange.start.line, newRange.end.line]];
	}

	// Selection disappeared
	if (oldRange && !newRange) {
		return [[oldRange.start.line, oldRange.end.line]];
	}

	// Both exist - compute symmetric difference
	if (oldRange && newRange) {
		return computeOverlapDirtyRanges(oldRange, newRange);
	}

	return [];
}

// =============================================================================
// SNAPSHOT
// =============================================================================

/**
 * Creates a snapshot of the current selection state.
 * Returns a shallow copy that is independent of the original state.
 * Useful for tracking previous state for dirty computation.
 *
 * @param state - Selection state
 * @returns Independent copy of the state
 */
export function snapshotSelection(state: TextSelectionState): TextSelectionState {
	return {
		anchorLine: state.anchorLine,
		anchorCol: state.anchorCol,
		focusLine: state.focusLine,
		focusCol: state.focusCol,
		active: state.active,
		mode: state.mode,
	};
}
