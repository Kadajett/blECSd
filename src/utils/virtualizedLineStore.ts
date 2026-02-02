/**
 * Virtualized Line Store for Large Text Content
 *
 * High-performance data structure for storing and accessing millions of lines
 * with O(1) random access. Optimized for read-only content with streaming append.
 *
 * @module utils/virtualizedLineStore
 *
 * @example
 * ```typescript
 * import { createLineStore, getLineAtIndex, getLineRange } from 'blecsd';
 *
 * // Create store from content
 * const store = createLineStore(largeTextContent);
 *
 * // O(1) access to any line
 * const line1000 = getLineAtIndex(store, 1000);
 *
 * // Get visible range for viewport
 * const visibleLines = getLineRange(store, 1000, 1025);
 * ```
 */

import { z } from 'zod';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema for line index validation.
 */
export const LineIndexSchema = z.number().int().nonnegative();

/**
 * Schema for line range parameters.
 */
export const LineRangeParamsSchema = z.object({
	startLine: LineIndexSchema,
	endLine: LineIndexSchema,
});

/**
 * Schema for visible lines parameters.
 */
export const VisibleLinesParamsSchema = z.object({
	firstVisible: LineIndexSchema,
	visibleCount: z.number().int().nonnegative(),
	overscanBefore: z.number().int().nonnegative().default(5),
	overscanAfter: z.number().int().nonnegative().default(5),
});

/**
 * Schema for trim parameters.
 */
export const TrimParamsSchema = z.object({
	maxLines: z.number().int().positive(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Initial capacity for line offset array */
const INITIAL_LINE_CAPACITY = 10000;

/** Growth factor when expanding arrays */
const GROWTH_FACTOR = 2;

/** Maximum lines before switching to chunked mode */
export const CHUNKED_THRESHOLD = 1_000_000;

/** Newline character code */
const NEWLINE = 10; // '\n'.charCodeAt(0)

// =============================================================================
// TYPES
// =============================================================================

/**
 * Statistics about a line store.
 */
export interface LineStoreStats {
	/** Total line count */
	readonly lineCount: number;
	/** Total byte size of content */
	readonly byteSize: number;
	/** Memory used by offset array */
	readonly offsetArrayBytes: number;
	/** Total memory estimate */
	readonly totalMemoryBytes: number;
	/** Average line length */
	readonly avgLineLength: number;
	/** Whether content is indexed */
	readonly indexed: boolean;
}

/**
 * A range of lines from the store.
 */
export interface LineRange {
	/** Lines in the range */
	readonly lines: readonly string[];
	/** Start line index (actual) */
	readonly startLine: number;
	/** End line index (exclusive) */
	readonly endLine: number;
	/** Time to extract in milliseconds */
	readonly extractTimeMs: number;
}

/**
 * Information about a single line.
 */
export interface LineInfo {
	/** Line content (without newline) */
	readonly text: string;
	/** Byte offset in buffer */
	readonly offset: number;
	/** Line length in bytes */
	readonly length: number;
	/** Line number (0-based) */
	readonly lineNumber: number;
}

/**
 * Internal state for the line store.
 * Mutable for performance during construction.
 */
interface LineStoreState {
	/** Raw content buffer */
	buffer: string;
	/** Line start offsets */
	offsets: Uint32Array;
	/** Number of lines */
	lineCount: number;
	/** Whether fully indexed */
	indexed: boolean;
	/** Capacity of offset array */
	offsetCapacity: number;
}

/**
 * Immutable view of a virtualized line store.
 */
export interface VirtualizedLineStore {
	/** Raw content buffer */
	readonly buffer: string;
	/** Line start offsets (position of first char of each line) */
	readonly offsets: Uint32Array;
	/** Total line count */
	readonly lineCount: number;
	/** Total byte size */
	readonly byteSize: number;
	/** Whether offsets are computed */
	readonly indexed: boolean;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Creates the internal mutable state.
 */
function createState(initialCapacity: number = INITIAL_LINE_CAPACITY): LineStoreState {
	return {
		buffer: '',
		offsets: new Uint32Array(initialCapacity),
		lineCount: 0,
		indexed: false,
		offsetCapacity: initialCapacity,
	};
}

/**
 * Grows the offset array if needed.
 */
function ensureOffsetCapacity(state: LineStoreState, needed: number): void {
	if (needed <= state.offsetCapacity) {
		return;
	}

	const newCapacity = Math.max(needed, state.offsetCapacity * GROWTH_FACTOR);
	const newOffsets = new Uint32Array(newCapacity);
	newOffsets.set(state.offsets);
	state.offsets = newOffsets;
	state.offsetCapacity = newCapacity;
}

/**
 * Indexes content to find line offsets.
 * Uses a fast single-pass algorithm.
 */
function indexContent(state: LineStoreState): void {
	const { buffer } = state;
	const len = buffer.length;

	if (len === 0) {
		state.lineCount = 0;
		state.indexed = true;
		return;
	}

	// First line always starts at 0
	ensureOffsetCapacity(state, 1);
	state.offsets[0] = 0;
	let lineCount = 1;

	// Fast scan for newlines
	for (let i = 0; i < len; i++) {
		if (buffer.charCodeAt(i) === NEWLINE) {
			ensureOffsetCapacity(state, lineCount + 1);
			state.offsets[lineCount] = i + 1;
			lineCount++;
		}
	}

	state.lineCount = lineCount;
	state.indexed = true;
}

/**
 * Gets the end offset of a line (position of newline or end of buffer).
 */
function getLineEndOffset(store: VirtualizedLineStore, lineIndex: number): number {
	if (lineIndex >= store.lineCount - 1) {
		// Last line ends at buffer end
		return store.buffer.length;
	}

	// Next line's offset minus 1 (the newline)
	const nextOffset = store.offsets[lineIndex + 1];
	return nextOffset !== undefined ? nextOffset - 1 : store.buffer.length;
}

// =============================================================================
// PUBLIC API - CREATION
// =============================================================================

/**
 * Creates a virtualized line store from content.
 *
 * @param content - Text content (newline-separated lines)
 * @returns New line store
 *
 * @example
 * ```typescript
 * import { createLineStore } from 'blecsd';
 *
 * const store = createLineStore('Line 1\nLine 2\nLine 3');
 * console.log(store.lineCount); // 3
 * ```
 */
export function createLineStore(content: string = ''): VirtualizedLineStore {
	const state = createState();
	state.buffer = content;
	indexContent(state);

	return {
		buffer: state.buffer,
		offsets: state.offsets.slice(0, state.lineCount),
		lineCount: state.lineCount,
		byteSize: state.buffer.length,
		indexed: state.indexed,
	};
}

/**
 * Creates a line store from an array of lines.
 *
 * @param lines - Array of line strings
 * @returns New line store
 *
 * @example
 * ```typescript
 * import { createLineStoreFromLines } from 'blecsd';
 *
 * const store = createLineStoreFromLines(['Line 1', 'Line 2', 'Line 3']);
 * ```
 */
export function createLineStoreFromLines(lines: readonly string[]): VirtualizedLineStore {
	if (lines.length === 0) {
		return createLineStore('');
	}

	// Pre-calculate total size for efficiency
	let totalSize = 0;
	for (const line of lines) {
		totalSize += line.length + 1; // +1 for newline
	}
	totalSize--; // No trailing newline

	// Build buffer and offsets in one pass
	const offsets = new Uint32Array(lines.length);
	let buffer = '';
	let offset = 0;

	for (let i = 0; i < lines.length; i++) {
		offsets[i] = offset;
		const line = lines[i];
		if (line !== undefined) {
			buffer += line;
			offset += line.length;
		}
		if (i < lines.length - 1) {
			buffer += '\n';
			offset++;
		}
	}

	return {
		buffer,
		offsets,
		lineCount: lines.length,
		byteSize: buffer.length,
		indexed: true,
	};
}

/**
 * Creates an empty line store.
 *
 * @returns Empty line store
 */
export function createEmptyLineStore(): VirtualizedLineStore {
	return {
		buffer: '',
		offsets: new Uint32Array(0),
		lineCount: 0,
		byteSize: 0,
		indexed: true,
	};
}

// =============================================================================
// PUBLIC API - ACCESS
// =============================================================================

/**
 * Gets a line at a specific index. O(1) operation.
 *
 * @param store - The line store
 * @param index - Line index (0-based)
 * @returns Line content or undefined if out of bounds
 *
 * @example
 * ```typescript
 * import { createLineStore, getLineAtIndex } from 'blecsd';
 *
 * const store = createLineStore('Line 1\nLine 2\nLine 3');
 * console.log(getLineAtIndex(store, 1)); // 'Line 2'
 * ```
 */
export function getLineAtIndex(store: VirtualizedLineStore, index: number): string | undefined {
	if (index < 0 || index >= store.lineCount) {
		return undefined;
	}

	const startOffset = store.offsets[index];
	if (startOffset === undefined) {
		return undefined;
	}

	const endOffset = getLineEndOffset(store, index);
	return store.buffer.slice(startOffset, endOffset);
}

/**
 * Gets detailed information about a line.
 *
 * @param store - The line store
 * @param index - Line index (0-based)
 * @returns Line info or undefined if out of bounds
 */
export function getLineInfo(store: VirtualizedLineStore, index: number): LineInfo | undefined {
	if (index < 0 || index >= store.lineCount) {
		return undefined;
	}

	const startOffset = store.offsets[index];
	if (startOffset === undefined) {
		return undefined;
	}

	const endOffset = getLineEndOffset(store, index);
	return {
		text: store.buffer.slice(startOffset, endOffset),
		offset: startOffset,
		length: endOffset - startOffset,
		lineNumber: index,
	};
}

/**
 * Gets a range of lines. Optimized for viewport extraction.
 *
 * @param store - The line store
 * @param startLine - Start line index (inclusive)
 * @param endLine - End line index (exclusive)
 * @returns Line range result
 *
 * @example
 * ```typescript
 * import { createLineStore, getLineRange } from 'blecsd';
 *
 * const store = createLineStore(largeContent);
 * const viewport = getLineRange(store, 1000, 1025);
 * console.log(viewport.lines.length); // 25
 * ```
 */
export function getLineRange(
	store: VirtualizedLineStore,
	startLine: number,
	endLine: number,
): LineRange {
	const start = performance.now();

	// Clamp to valid range
	const clampedStart = Math.max(0, startLine);
	const clampedEnd = Math.min(store.lineCount, endLine);

	if (clampedStart >= clampedEnd) {
		return {
			lines: [],
			startLine: clampedStart,
			endLine: clampedStart,
			extractTimeMs: performance.now() - start,
		};
	}

	const lines: string[] = [];

	for (let i = clampedStart; i < clampedEnd; i++) {
		const startOffset = store.offsets[i];
		if (startOffset === undefined) {
			continue;
		}
		const endOffset = getLineEndOffset(store, i);
		lines.push(store.buffer.slice(startOffset, endOffset));
	}

	return {
		lines,
		startLine: clampedStart,
		endLine: clampedEnd,
		extractTimeMs: performance.now() - start,
	};
}

/**
 * Gets visible lines for a viewport with overscan.
 *
 * @param store - The line store
 * @param firstVisible - First visible line index
 * @param visibleCount - Number of visible lines
 * @param overscanBefore - Extra lines to include before viewport
 * @param overscanAfter - Extra lines to include after viewport
 * @returns Line range with overscan
 */
export function getVisibleLines(
	store: VirtualizedLineStore,
	firstVisible: number,
	visibleCount: number,
	overscanBefore: number = 5,
	overscanAfter: number = 5,
): LineRange {
	const start = Math.max(0, firstVisible - overscanBefore);
	const end = Math.min(store.lineCount, firstVisible + visibleCount + overscanAfter);
	return getLineRange(store, start, end);
}

// =============================================================================
// PUBLIC API - MUTATIONS (STREAMING)
// =============================================================================

/**
 * Appends content to the store, returning a new store.
 * Optimized for streaming append (log viewers).
 *
 * @param store - The original store
 * @param content - Content to append
 * @returns New store with appended content
 *
 * @example
 * ```typescript
 * import { createLineStore, appendToStore } from 'blecsd';
 *
 * let store = createLineStore('Line 1');
 * store = appendToStore(store, '\nLine 2\nLine 3');
 * console.log(store.lineCount); // 3
 * ```
 */
export function appendToStore(
	store: VirtualizedLineStore,
	content: string,
): VirtualizedLineStore {
	if (content.length === 0) {
		return store;
	}

	// Build new buffer
	const newBuffer = store.buffer + content;
	const prevLength = store.buffer.length;

	// Count new lines in appended content
	let newLineCount = 0;
	for (let i = 0; i < content.length; i++) {
		if (content.charCodeAt(i) === NEWLINE) {
			newLineCount++;
		}
	}

	// If appending to empty store, the first character starts the first line
	const isAppendingToEmpty = store.lineCount === 0;
	if (isAppendingToEmpty) {
		newLineCount++; // The first line before any newline
	}

	// Create new offset array with space for new lines
	const totalLines = store.lineCount + newLineCount;
	const newOffsets = new Uint32Array(totalLines);

	// Copy existing offsets
	newOffsets.set(store.offsets);

	// Add new offsets
	let lineIdx = store.lineCount;

	// If appending to empty store, first line starts at offset 0
	if (isAppendingToEmpty) {
		newOffsets[lineIdx] = 0;
		lineIdx++;
	}

	// Add offsets for each newline (line starts after newline)
	for (let i = 0; i < content.length; i++) {
		if (content.charCodeAt(i) === NEWLINE) {
			newOffsets[lineIdx] = prevLength + i + 1;
			lineIdx++;
		}
	}

	return {
		buffer: newBuffer,
		offsets: newOffsets,
		lineCount: totalLines,
		byteSize: newBuffer.length,
		indexed: true,
	};
}

/**
 * Appends lines to the store.
 *
 * @param store - The original store
 * @param lines - Lines to append
 * @returns New store with appended lines
 */
export function appendLines(
	store: VirtualizedLineStore,
	lines: readonly string[],
): VirtualizedLineStore {
	if (lines.length === 0) {
		return store;
	}

	// Join with newlines and prepend newline if store is not empty
	const prefix = store.byteSize > 0 ? '\n' : '';
	const content = prefix + lines.join('\n');

	return appendToStore(store, content);
}

// =============================================================================
// PUBLIC API - QUERIES
// =============================================================================

/**
 * Gets the line count.
 *
 * @param store - The line store
 * @returns Total line count
 */
export function getLineCount(store: VirtualizedLineStore): number {
	return store.lineCount;
}

/**
 * Gets the byte size of the content.
 *
 * @param store - The line store
 * @returns Total byte size
 */
export function getByteSize(store: VirtualizedLineStore): number {
	return store.byteSize;
}

/**
 * Checks if the store is empty.
 *
 * @param store - The line store
 * @returns true if empty
 */
export function isStoreEmpty(store: VirtualizedLineStore): boolean {
	return store.lineCount === 0;
}

/**
 * Gets statistics about the store.
 *
 * @param store - The line store
 * @returns Store statistics
 */
export function getStoreStats(store: VirtualizedLineStore): LineStoreStats {
	const offsetArrayBytes = store.offsets.byteLength;
	const bufferBytes = store.byteSize * 2; // UTF-16 in JS
	const totalMemoryBytes = offsetArrayBytes + bufferBytes;
	const avgLineLength = store.lineCount > 0 ? store.byteSize / store.lineCount : 0;

	return {
		lineCount: store.lineCount,
		byteSize: store.byteSize,
		offsetArrayBytes,
		totalMemoryBytes,
		avgLineLength,
		indexed: store.indexed,
	};
}

// =============================================================================
// PUBLIC API - SEARCH / NAVIGATION
// =============================================================================

/**
 * Finds the line index for a byte offset.
 * Uses binary search for O(log n) performance.
 *
 * @param store - The line store
 * @param byteOffset - Byte offset in buffer
 * @returns Line index containing the offset
 */
export function getLineForOffset(store: VirtualizedLineStore, byteOffset: number): number {
	if (store.lineCount === 0) {
		return 0;
	}

	if (byteOffset <= 0) {
		return 0;
	}

	if (byteOffset >= store.byteSize) {
		return store.lineCount - 1;
	}

	// Binary search for the line
	let low = 0;
	let high = store.lineCount - 1;

	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		const midOffset = store.offsets[mid];

		if (midOffset === undefined || midOffset > byteOffset) {
			high = mid - 1;
		} else {
			low = mid;
		}
	}

	return low;
}

/**
 * Gets the byte offset for a line.
 *
 * @param store - The line store
 * @param lineIndex - Line index
 * @returns Byte offset or -1 if out of bounds
 */
export function getOffsetForLine(store: VirtualizedLineStore, lineIndex: number): number {
	if (lineIndex < 0 || lineIndex >= store.lineCount) {
		return -1;
	}

	return store.offsets[lineIndex] ?? -1;
}

// =============================================================================
// PUBLIC API - BULK OPERATIONS
// =============================================================================

/**
 * Exports all content as a string.
 *
 * @param store - The line store
 * @returns Full content
 */
export function exportContent(store: VirtualizedLineStore): string {
	return store.buffer;
}

/**
 * Exports a range of lines as a string.
 *
 * @param store - The line store
 * @param startLine - Start line index
 * @param endLine - End line index (exclusive)
 * @returns Content of the line range
 */
export function exportLineRange(
	store: VirtualizedLineStore,
	startLine: number,
	endLine: number,
): string {
	const range = getLineRange(store, startLine, endLine);
	return range.lines.join('\n');
}

/**
 * Creates a trimmed store with only the last N lines.
 * Useful for keeping log buffers bounded.
 *
 * @param store - The line store
 * @param maxLines - Maximum lines to keep
 * @returns New store with at most maxLines
 */
export function trimToLineCount(
	store: VirtualizedLineStore,
	maxLines: number,
): VirtualizedLineStore {
	if (store.lineCount <= maxLines) {
		return store;
	}

	const startLine = store.lineCount - maxLines;
	const startOffset = store.offsets[startLine];

	if (startOffset === undefined) {
		return store;
	}

	const newBuffer = store.buffer.slice(startOffset);

	// Rebuild offsets relative to new buffer start
	const newOffsets = new Uint32Array(maxLines);
	for (let i = 0; i < maxLines; i++) {
		const oldOffset = store.offsets[startLine + i];
		newOffsets[i] = oldOffset !== undefined ? oldOffset - startOffset : 0;
	}

	return {
		buffer: newBuffer,
		offsets: newOffsets,
		lineCount: maxLines,
		byteSize: newBuffer.length,
		indexed: true,
	};
}
