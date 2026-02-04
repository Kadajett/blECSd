/**
 * Fast Word Wrap with Caching
 *
 * Efficiently calculates line wrapping for huge text with:
 * - Per-paragraph wrap caching
 * - Dirty flag on content/width change
 * - Progressive rewrap (visible region first)
 * - Unicode grapheme cluster support
 *
 * @module utils/fastWrap
 *
 * @example
 * ```typescript
 * import { createWrapCache, wrapWithCache, invalidateRange } from 'blecsd';
 *
 * // Create cache for a document
 * const cache = createWrapCache(80);
 *
 * // Wrap text (results are cached)
 * const lines = wrapWithCache(cache, 'Long text...');
 *
 * // On width change, invalidate and rewrap visible first
 * resizeWrapCache(cache, 120);
 * const visibleLines = wrapVisibleFirst(cache, text, 0, 50);
 * ```
 */

import { stringWidth } from './unicode';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum paragraph length before splitting for caching.
 * Longer paragraphs are split into chunks for better cache granularity.
 */
export const MAX_PARAGRAPH_CHUNK = 1000;

/**
 * Default batch size for progressive rewrapping.
 */
export const DEFAULT_BATCH_SIZE = 100;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cached wrap result for a paragraph.
 */
export interface WrapEntry {
	/** Original paragraph text */
	readonly text: string;
	/** Hash of the text for quick comparison */
	readonly hash: number;
	/** Width used for wrapping */
	readonly width: number;
	/** Resulting wrapped lines */
	readonly lines: readonly string[];
	/** Line break positions within original text */
	readonly breakPoints: readonly number[];
}

/**
 * Wrap cache data structure.
 */
export interface WrapCache {
	/** Current wrap width */
	width: number;
	/** Cached paragraph entries by paragraph index */
	readonly entries: Map<number, WrapEntry>;
	/** Dirty paragraph indices that need rewrapping */
	readonly dirty: Set<number>;
	/** Total lines across all paragraphs (for fast lookup) */
	totalLines: number;
	/** Cumulative line counts per paragraph (for line-to-paragraph mapping) */
	readonly lineOffsets: number[];
	/** Whether the entire cache is invalidated */
	fullInvalidate: boolean;
}

/**
 * Options for wrap operations.
 */
export interface FastWrapOptions {
	/** Maximum width in characters */
	readonly width: number;
	/** Break mid-word if word exceeds width (default: false) */
	readonly breakWord?: boolean;
	/** Use Unicode-aware width calculation (default: true) */
	readonly unicodeWidth?: boolean;
}

/**
 * Result of progressive wrapping.
 */
export interface ProgressiveWrapResult {
	/** Wrapped lines for the requested range */
	readonly lines: readonly string[];
	/** Whether there's more work to do */
	readonly hasMore: boolean;
	/** Next paragraph to process */
	readonly nextParagraph: number;
	/** Time taken in milliseconds */
	readonly timeMs: number;
}

/**
 * Line position mapping.
 */
export interface LinePosition {
	/** Paragraph index */
	readonly paragraph: number;
	/** Line within paragraph */
	readonly lineInParagraph: number;
	/** Character offset within paragraph */
	readonly charOffset: number;
}

// =============================================================================
// HASH FUNCTION
// =============================================================================

/**
 * Fast hash function for strings (djb2).
 */
function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
	}
	return hash >>> 0;
}

// =============================================================================
// WIDTH CALCULATION
// =============================================================================

/**
 * Gets the visible width of a string.
 * Uses Unicode-aware width by default.
 */
function getCharWidth(text: string, unicodeWidth: boolean): number {
	if (unicodeWidth) {
		return stringWidth(text);
	}
	// Simple ASCII width (faster but less accurate)
	return text.length;
}

// Export for use by other modules
export { getCharWidth as getWidth };

// =============================================================================
// CACHE CREATION
// =============================================================================

/**
 * Creates a new wrap cache.
 *
 * @param width - Initial wrap width
 * @returns A new WrapCache
 *
 * @example
 * ```typescript
 * import { createWrapCache } from 'blecsd';
 *
 * const cache = createWrapCache(80);
 * ```
 */
export function createWrapCache(width: number): WrapCache {
	return {
		width,
		entries: new Map(),
		dirty: new Set(),
		totalLines: 0,
		lineOffsets: [],
		fullInvalidate: true,
	};
}

/**
 * Clears all cached entries.
 *
 * @param cache - The cache to clear
 */
export function clearWrapCache(cache: WrapCache): void {
	cache.entries.clear();
	cache.dirty.clear();
	cache.totalLines = 0;
	cache.lineOffsets.length = 0;
	cache.fullInvalidate = true;
}

/**
 * Resizes the wrap cache to a new width.
 * Invalidates all entries that need rewrapping.
 *
 * @param cache - The cache to resize
 * @param newWidth - New wrap width
 */
export function resizeWrapCache(cache: WrapCache, newWidth: number): void {
	if (cache.width === newWidth) {
		return;
	}

	cache.width = newWidth;
	cache.fullInvalidate = true;

	// Mark all entries as dirty
	for (const [index] of cache.entries) {
		cache.dirty.add(index);
	}
}

// =============================================================================
// PARAGRAPH WRAPPING
// =============================================================================

/**
 * Wraps a single paragraph.
 */
function wrapParagraph(
	text: string,
	width: number,
	breakWord: boolean,
	unicodeWidth: boolean,
): { lines: string[]; breakPoints: number[] } {
	if (width <= 0) {
		return { lines: [''], breakPoints: [0] };
	}

	if (text.length === 0) {
		return { lines: [''], breakPoints: [0] };
	}

	const state = createWrapState();

	for (let i = 0; i <= text.length; i++) {
		processWrapIndex(state, text, i, width, breakWord, unicodeWidth);
	}

	return { lines: state.lines, breakPoints: state.breakPoints };
}

interface WrapState {
	lines: string[];
	breakPoints: number[];
	lineStart: number;
	lineWidth: number;
	wordWidth: number;
	lastBreakable: number;
	lastBreakableWidth: number;
}

function createWrapState(): WrapState {
	return {
		lines: [],
		breakPoints: [0],
		lineStart: 0,
		lineWidth: 0,
		wordWidth: 0,
		lastBreakable: -1,
		lastBreakableWidth: 0,
	};
}

function handleLineEnd(state: WrapState, text: string, endIndex: number, isEnd: boolean): void {
	const line = text.slice(state.lineStart, endIndex);
	if (line.length > 0 || state.lines.length === 0) {
		state.lines.push(line);
		if (!isEnd) {
			state.breakPoints.push(endIndex + 1);
		}
	}
	resetLineState(state, endIndex + 1);
}

function resetLineState(state: WrapState, newStart: number): void {
	state.lineStart = newStart;
	state.lineWidth = 0;
	state.wordWidth = 0;
	state.lastBreakable = -1;
	state.lastBreakableWidth = 0;
}

function recordBreakable(state: WrapState, index: number, charWidth: number): void {
	state.lastBreakable = index;
	state.lastBreakableWidth = state.lineWidth;
	state.wordWidth = 0;
	state.lineWidth += charWidth;
}

function recordWordWidth(state: WrapState, charWidth: number): void {
	state.wordWidth += charWidth;
	state.lineWidth += charWidth;
}

function handleOverflow(
	state: WrapState,
	text: string,
	index: number,
	charWidth: number,
	width: number,
	breakWord: boolean,
): void {
	if (state.lastBreakable >= state.lineStart && !breakWord) {
		const line = text.slice(state.lineStart, state.lastBreakable);
		state.lines.push(line);
		state.breakPoints.push(state.lastBreakable + 1);
		state.lineStart = state.lastBreakable + 1;
		state.lineWidth = state.lineWidth - state.lastBreakableWidth - 1;
		state.lastBreakable = -1;
		return;
	}

	if (breakWord || state.wordWidth > width) {
		const line = text.slice(state.lineStart, index);
		state.lines.push(line);
		state.breakPoints.push(index);
		state.lineStart = index;
		state.lineWidth = charWidth;
		state.wordWidth = charWidth;
		state.lastBreakable = -1;
	}
}

function processWrapIndex(
	state: WrapState,
	text: string,
	index: number,
	width: number,
	breakWord: boolean,
	unicodeWidth: boolean,
): void {
	const char = index < text.length ? text[index] : undefined;
	const isEnd = index === text.length;
	const isNewline = char === '\n';

	if (isNewline || isEnd) {
		handleLineEnd(state, text, index, isEnd);
		return;
	}

	const charWidth = unicodeWidth ? stringWidth(char ?? '') : 1;
	const isSpace = char === ' ' || char === '\t';

	if (isSpace) {
		recordBreakable(state, index, charWidth);
	} else {
		recordWordWidth(state, charWidth);
	}

	if (state.lineWidth > width) {
		handleOverflow(state, text, index, charWidth, width, breakWord);
	}
}

/**
 * Creates a cache entry for a paragraph.
 */
function createEntry(
	text: string,
	width: number,
	breakWord: boolean,
	unicodeWidth: boolean,
): WrapEntry {
	const { lines, breakPoints } = wrapParagraph(text, width, breakWord, unicodeWidth);

	return {
		text,
		hash: hashString(text),
		width,
		lines,
		breakPoints,
	};
}

// =============================================================================
// CACHED WRAPPING
// =============================================================================

/**
 * Wraps text using cache for efficiency.
 *
 * @param cache - The wrap cache
 * @param text - Text to wrap
 * @param options - Wrap options
 * @returns Array of wrapped lines
 *
 * @example
 * ```typescript
 * import { createWrapCache, wrapWithCache } from 'blecsd';
 *
 * const cache = createWrapCache(80);
 * const lines = wrapWithCache(cache, 'Long text here...');
 * ```
 */
export function wrapWithCache(
	cache: WrapCache,
	text: string,
	options?: Partial<FastWrapOptions>,
): readonly string[] {
	const width = options?.width ?? cache.width;
	const breakWord = options?.breakWord ?? false;
	const unicodeWidth = options?.unicodeWidth ?? true;

	// Split into paragraphs
	const paragraphs = text.split('\n');
	const allLines: string[] = [];

	// Update line offsets
	cache.lineOffsets.length = 0;
	let lineOffset = 0;

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i];
		if (paragraph === undefined) continue;

		cache.lineOffsets.push(lineOffset);

		// Check cache
		const cached = cache.entries.get(i);
		const hash = hashString(paragraph);

		if (
			cached &&
			cached.hash === hash &&
			cached.width === width &&
			!cache.dirty.has(i) &&
			!cache.fullInvalidate
		) {
			// Use cached result
			allLines.push(...cached.lines);
			lineOffset += cached.lines.length;
			continue;
		}

		// Compute and cache
		const entry = createEntry(paragraph, width, breakWord, unicodeWidth);
		cache.entries.set(i, entry);
		cache.dirty.delete(i);

		allLines.push(...entry.lines);
		lineOffset += entry.lines.length;
	}

	cache.totalLines = lineOffset;
	cache.fullInvalidate = false;

	// Clean up old entries
	for (const [index] of cache.entries) {
		if (index >= paragraphs.length) {
			cache.entries.delete(index);
		}
	}

	return allLines;
}

/**
 * Wraps visible region first for responsive UI.
 *
 * @param cache - The wrap cache
 * @param text - Text to wrap
 * @param startLine - First visible line
 * @param endLine - Last visible line (exclusive)
 * @param options - Wrap options
 * @returns Progressive wrap result
 *
 * @example
 * ```typescript
 * import { createWrapCache, wrapVisibleFirst } from 'blecsd';
 *
 * const cache = createWrapCache(80);
 *
 * // First, wrap just the visible region (fast)
 * const result = wrapVisibleFirst(cache, text, 0, 50);
 *
 * // Later, continue wrapping the rest
 * if (result.hasMore) {
 *   continueWrap(cache, text, result.nextParagraph);
 * }
 * ```
 */
export function wrapVisibleFirst(
	cache: WrapCache,
	text: string,
	startLine: number,
	endLine: number,
	options?: Partial<FastWrapOptions>,
): ProgressiveWrapResult {
	const startTime = performance.now();
	const width = options?.width ?? cache.width;
	const breakWord = options?.breakWord ?? false;
	const unicodeWidth = options?.unicodeWidth ?? true;

	const paragraphs = text.split('\n');
	const visibleLines: string[] = [];

	// First pass: estimate paragraph for visible lines
	// If cache has line offsets, use them; otherwise estimate
	const startInfo = resolveVisibleStart(cache, startLine);
	let currentLine = startInfo.currentLine;
	const targetParagraph = startInfo.targetParagraph;

	// Process paragraphs until we have enough visible lines
	let processedParagraphs = 0;
	const maxParagraphs = paragraphs.length;

	for (let i = targetParagraph; i < maxParagraphs && currentLine < endLine; i++) {
		const paragraph = paragraphs[i];
		if (paragraph === undefined) continue;

		const entry = getWrapEntry(cache, i, paragraph, width, breakWord, unicodeWidth);

		// Add lines that fall within visible range
		currentLine = appendVisibleLines(visibleLines, entry.lines, currentLine, startLine, endLine);

		processedParagraphs = i + 1;
	}

	const timeMs = performance.now() - startTime;

	return {
		lines: visibleLines,
		hasMore: processedParagraphs < maxParagraphs,
		nextParagraph: processedParagraphs,
		timeMs,
	};
}

function resolveVisibleStart(
	cache: WrapCache,
	startLine: number,
): { targetParagraph: number; currentLine: number } {
	let targetParagraph = 0;
	let currentLine = 0;

	if (cache.lineOffsets.length === 0 || cache.fullInvalidate) {
		return { targetParagraph, currentLine };
	}

	for (let i = 0; i < cache.lineOffsets.length; i++) {
		const offset = cache.lineOffsets[i];
		if (offset !== undefined && offset <= startLine) {
			targetParagraph = i;
			currentLine = offset;
		} else {
			break;
		}
	}

	return { targetParagraph, currentLine };
}

function getWrapEntry(
	cache: WrapCache,
	index: number,
	paragraph: string,
	width: number,
	breakWord: boolean,
	unicodeWidth: boolean,
): WrapEntry {
	const cached = cache.entries.get(index);
	const hash = hashString(paragraph);

	if (
		cached &&
		cached.hash === hash &&
		cached.width === width &&
		!cache.dirty.has(index) &&
		!cache.fullInvalidate
	) {
		return cached;
	}

	const entry = createEntry(paragraph, width, breakWord, unicodeWidth);
	cache.entries.set(index, entry);
	cache.dirty.delete(index);
	return entry;
}

function appendVisibleLines(
	visibleLines: string[],
	lines: readonly string[],
	currentLine: number,
	startLine: number,
	endLine: number,
): number {
	let lineIndex = currentLine;
	for (let i = 0; i < lines.length; i++) {
		if (lineIndex >= startLine && lineIndex < endLine) {
			const line = lines[i];
			if (line !== undefined) {
				visibleLines.push(line);
			}
		}
		lineIndex++;
	}
	return lineIndex;
}

/**
 * Continues wrapping from a specific paragraph.
 * Use this for background processing after visible region is done.
 *
 * @param cache - The wrap cache
 * @param text - Text to wrap
 * @param startParagraph - Paragraph to start from
 * @param batchSize - Max paragraphs to process (default: 100)
 * @param options - Wrap options
 * @returns Progressive wrap result
 */
export function continueWrap(
	cache: WrapCache,
	text: string,
	startParagraph: number,
	batchSize: number = DEFAULT_BATCH_SIZE,
	options?: Partial<FastWrapOptions>,
): ProgressiveWrapResult {
	const startTime = performance.now();
	const width = options?.width ?? cache.width;
	const breakWord = options?.breakWord ?? false;
	const unicodeWidth = options?.unicodeWidth ?? true;

	const paragraphs = text.split('\n');
	const lines: string[] = [];

	const endParagraph = Math.min(startParagraph + batchSize, paragraphs.length);

	for (let i = startParagraph; i < endParagraph; i++) {
		const paragraph = paragraphs[i];
		if (paragraph === undefined) continue;

		const cached = cache.entries.get(i);
		const hash = hashString(paragraph);

		let entry: WrapEntry;
		if (
			cached &&
			cached.hash === hash &&
			cached.width === width &&
			!cache.dirty.has(i) &&
			!cache.fullInvalidate
		) {
			entry = cached;
		} else {
			entry = createEntry(paragraph, width, breakWord, unicodeWidth);
			cache.entries.set(i, entry);
			cache.dirty.delete(i);
		}

		lines.push(...entry.lines);
	}

	const timeMs = performance.now() - startTime;

	return {
		lines,
		hasMore: endParagraph < paragraphs.length,
		nextParagraph: endParagraph,
		timeMs,
	};
}

// =============================================================================
// INVALIDATION
// =============================================================================

/**
 * Invalidates a range of paragraphs.
 *
 * @param cache - The wrap cache
 * @param startParagraph - First paragraph to invalidate
 * @param endParagraph - Last paragraph to invalidate (exclusive)
 */
export function invalidateRange(
	cache: WrapCache,
	startParagraph: number,
	endParagraph: number,
): void {
	for (let i = startParagraph; i < endParagraph; i++) {
		cache.dirty.add(i);
	}
}

/**
 * Invalidates a single paragraph.
 *
 * @param cache - The wrap cache
 * @param paragraph - Paragraph index to invalidate
 */
export function invalidateParagraph(cache: WrapCache, paragraph: number): void {
	cache.dirty.add(paragraph);
}

/**
 * Invalidates all paragraphs.
 *
 * @param cache - The wrap cache
 */
export function invalidateAll(cache: WrapCache): void {
	cache.fullInvalidate = true;
}

// =============================================================================
// LINE MAPPING
// =============================================================================

/**
 * Maps a display line number to paragraph position.
 *
 * @param cache - The wrap cache
 * @param lineNumber - Display line number
 * @returns Line position or undefined if out of bounds
 */
export function lineToPosition(cache: WrapCache, lineNumber: number): LinePosition | undefined {
	if (lineNumber < 0 || lineNumber >= cache.totalLines) {
		return undefined;
	}

	// Binary search for paragraph
	let low = 0;
	let high = cache.lineOffsets.length - 1;
	let paragraph = 0;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const offset = cache.lineOffsets[mid];

		if (offset === undefined) break;

		if (offset <= lineNumber) {
			paragraph = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	const paragraphOffset = cache.lineOffsets[paragraph] ?? 0;
	const lineInParagraph = lineNumber - paragraphOffset;

	// Get character offset from cached entry
	const entry = cache.entries.get(paragraph);
	const charOffset = entry?.breakPoints[lineInParagraph] ?? 0;

	return {
		paragraph,
		lineInParagraph,
		charOffset,
	};
}

/**
 * Maps a paragraph position to display line number.
 *
 * @param cache - The wrap cache
 * @param paragraph - Paragraph index
 * @param lineInParagraph - Line within paragraph (default: 0)
 * @returns Display line number or -1 if invalid
 */
export function positionToLine(
	cache: WrapCache,
	paragraph: number,
	lineInParagraph: number = 0,
): number {
	if (paragraph < 0 || paragraph >= cache.lineOffsets.length) {
		return -1;
	}

	const offset = cache.lineOffsets[paragraph];
	if (offset === undefined) {
		return -1;
	}

	return offset + lineInParagraph;
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Cache statistics.
 */
export interface WrapCacheStats {
	/** Number of cached paragraphs */
	readonly cachedParagraphs: number;
	/** Number of dirty paragraphs */
	readonly dirtyParagraphs: number;
	/** Total wrapped lines */
	readonly totalLines: number;
	/** Current wrap width */
	readonly width: number;
	/** Whether full invalidation is pending */
	readonly fullInvalidate: boolean;
}

/**
 * Gets statistics about the wrap cache.
 *
 * @param cache - The wrap cache
 * @returns Cache statistics
 */
export function getWrapCacheStats(cache: WrapCache): WrapCacheStats {
	return {
		cachedParagraphs: cache.entries.size,
		dirtyParagraphs: cache.dirty.size,
		totalLines: cache.totalLines,
		width: cache.width,
		fullInvalidate: cache.fullInvalidate,
	};
}
