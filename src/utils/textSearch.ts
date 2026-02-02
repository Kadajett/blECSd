/**
 * Efficient Text Search
 *
 * Fast search across massive text buffers with:
 * - Boyer-Moore-Horspool for literal string matching
 * - Regex support with timeout protection
 * - Incremental search with result caching
 * - Match navigation (next/prev)
 * - Background search for large documents
 *
 * @module utils/textSearch
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single match result.
 */
export interface SearchMatch {
	/** Start position in the text (character index) */
	readonly start: number;
	/** End position in the text (character index) */
	readonly end: number;
	/** Line number (0-indexed) */
	readonly line: number;
	/** Column in the line (0-indexed) */
	readonly column: number;
	/** The matched text */
	readonly text: string;
}

/**
 * Search options.
 */
export interface SearchOptions {
	/** Case-sensitive search (default: false) */
	readonly caseSensitive?: boolean;
	/** Whole word matching (default: false) */
	readonly wholeWord?: boolean;
	/** Use regex pattern (default: false) */
	readonly regex?: boolean;
	/** Maximum matches to return (default: unlimited) */
	readonly maxMatches?: number;
	/** Timeout in ms for regex searches (default: 5000) */
	readonly timeout?: number;
	/** Start position for incremental search */
	readonly startPosition?: number;
	/** Search in reverse */
	readonly reverse?: boolean;
}

/**
 * Search result with metadata.
 */
export interface SearchResult {
	/** Array of matches */
	readonly matches: readonly SearchMatch[];
	/** Total match count (may be more than returned if maxMatches hit) */
	readonly totalCount: number;
	/** Whether search was truncated by maxMatches */
	readonly truncated: boolean;
	/** Whether search timed out (regex only) */
	readonly timedOut: boolean;
	/** Time taken in milliseconds */
	readonly timeMs: number;
	/** The query that produced this result */
	readonly query: string;
}

/**
 * Search cache for incremental updates.
 */
export interface SearchCache {
	/** Current query */
	query: string;
	/** Current options */
	options: SearchOptions;
	/** Cached matches */
	matches: SearchMatch[];
	/** Text hash for validation */
	textHash: number;
	/** Current match index for navigation */
	currentIndex: number;
	/** Search is complete */
	complete: boolean;
	/** Last searched position (for incremental) */
	lastPosition: number;
}

/**
 * Progressive search result.
 */
export interface ProgressiveSearchResult {
	/** New matches found in this batch */
	readonly matches: readonly SearchMatch[];
	/** Whether more searching is needed */
	readonly hasMore: boolean;
	/** Next position to search from */
	readonly nextPosition: number;
	/** Time taken in milliseconds */
	readonly timeMs: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default regex timeout in milliseconds */
export const DEFAULT_TIMEOUT = 5000;

/** Default batch size for progressive search */
export const DEFAULT_SEARCH_BATCH = 100000;

/** Word boundary pattern */
const WORD_BOUNDARY_BEFORE = /(?:^|[^\w])/;
const WORD_BOUNDARY_AFTER = /(?:$|[^\w])/;

// =============================================================================
// BOYER-MOORE-HORSPOOL
// =============================================================================

/**
 * Computes the bad character table for Boyer-Moore-Horspool.
 *
 * @param pattern - The pattern to search for
 * @returns Bad character skip table
 */
function computeBadCharTable(pattern: string): Map<string, number> {
	const table = new Map<string, number>();
	const m = pattern.length;

	// Default skip is pattern length for characters not in pattern
	// For characters in pattern, skip is distance from end

	for (let i = 0; i < m - 1; i++) {
		const char = pattern[i];
		if (char !== undefined) {
			table.set(char, m - 1 - i);
		}
	}

	return table;
}

/**
 * Fast literal string search using Boyer-Moore-Horspool algorithm.
 *
 * @param text - The text to search in
 * @param pattern - The pattern to find
 * @param caseSensitive - Whether search is case-sensitive
 * @param startPosition - Position to start searching from
 * @returns Array of match start positions
 */
export function boyerMooreHorspool(
	text: string,
	pattern: string,
	caseSensitive: boolean = true,
	startPosition: number = 0,
): number[] {
	if (pattern.length === 0) {
		return [];
	}

	const searchText = caseSensitive ? text : text.toLowerCase();
	const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
	const n = searchText.length;
	const m = searchPattern.length;
	const matches: number[] = [];

	if (m > n) {
		return matches;
	}

	// Build bad character table
	const badChar = computeBadCharTable(searchPattern);

	let i = startPosition + m - 1;

	while (i < n) {
		let j = m - 1;
		let k = i;

		// Match from right to left
		while (j >= 0 && searchText[k] === searchPattern[j]) {
			j--;
			k--;
		}

		if (j < 0) {
			// Match found
			matches.push(k + 1);
			i++; // Move forward by 1 to find overlapping matches
		} else {
			// Use bad character table for skip
			const char = searchText[i];
			const skip = char !== undefined ? (badChar.get(char) ?? m) : m;
			i += Math.max(1, skip);
		}
	}

	return matches;
}

// =============================================================================
// TEXT UTILITIES
// =============================================================================

/**
 * Computes a simple hash for text validation.
 */
function computeTextHash(text: string): number {
	let hash = 0;
	const len = Math.min(text.length, 1000); // Sample first 1000 chars
	for (let i = 0; i < len; i++) {
		const char = text.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	hash = ((hash << 5) - hash + text.length) | 0;
	return hash;
}

/**
 * Finds line and column for a position in text.
 */
function positionToLineColumn(text: string, position: number): { line: number; column: number } {
	let line = 0;
	let lineStart = 0;

	for (let i = 0; i < position && i < text.length; i++) {
		if (text[i] === '\n') {
			line++;
			lineStart = i + 1;
		}
	}

	return { line, column: position - lineStart };
}

/**
 * Builds an array of line start positions for fast line lookup.
 */
function buildLineIndex(text: string): number[] {
	const lineStarts = [0];

	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') {
			lineStarts.push(i + 1);
		}
	}

	return lineStarts;
}

/**
 * Binary search to find line number from position.
 */
function findLineFromPosition(lineStarts: number[], position: number): number {
	let low = 0;
	let high = lineStarts.length - 1;

	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		const lineStart = lineStarts[mid];
		if (lineStart !== undefined && lineStart <= position) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}

	return low;
}

// =============================================================================
// SEARCH FUNCTIONS
// =============================================================================

/**
 * Searches for literal text in a string.
 *
 * @param text - The text to search in
 * @param query - The query to find
 * @param options - Search options
 * @returns Search result with matches
 */
export function searchLiteral(text: string, query: string, options: SearchOptions = {}): SearchResult {
	const startTime = performance.now();
	const caseSensitive = options.caseSensitive ?? false;
	const wholeWord = options.wholeWord ?? false;
	const maxMatches = options.maxMatches;
	const startPosition = options.startPosition ?? 0;

	if (query.length === 0) {
		return {
			matches: [],
			totalCount: 0,
			truncated: false,
			timedOut: false,
			timeMs: performance.now() - startTime,
			query,
		};
	}

	// Use Boyer-Moore-Horspool for fast searching
	const positions = boyerMooreHorspool(text, query, caseSensitive, startPosition);

	// Build line index for fast line lookup
	const lineStarts = buildLineIndex(text);

	// Convert positions to matches
	const matches: SearchMatch[] = [];
	let truncated = false;

	for (const pos of positions) {
		// Check whole word boundary if needed
		if (wholeWord) {
			const charBefore = pos > 0 ? text[pos - 1] : '';
			const charAfter = text[pos + query.length] ?? '';

			if (charBefore && /\w/.test(charBefore)) continue;
			if (charAfter && /\w/.test(charAfter)) continue;
		}

		const line = findLineFromPosition(lineStarts, pos);
		const lineStart = lineStarts[line] ?? 0;
		const matchText = text.slice(pos, pos + query.length);

		matches.push({
			start: pos,
			end: pos + query.length,
			line,
			column: pos - lineStart,
			text: matchText,
		});

		if (maxMatches && matches.length >= maxMatches) {
			truncated = true;
			break;
		}
	}

	return {
		matches,
		totalCount: truncated ? positions.length : matches.length,
		truncated,
		timedOut: false,
		timeMs: performance.now() - startTime,
		query,
	};
}

/**
 * Searches for regex pattern in a string with timeout protection.
 *
 * @param text - The text to search in
 * @param pattern - The regex pattern
 * @param options - Search options
 * @returns Search result with matches
 */
export function searchRegex(text: string, pattern: string, options: SearchOptions = {}): SearchResult {
	const startTime = performance.now();
	const caseSensitive = options.caseSensitive ?? false;
	const maxMatches = options.maxMatches;
	const timeout = options.timeout ?? DEFAULT_TIMEOUT;
	const startPosition = options.startPosition ?? 0;

	if (pattern.length === 0) {
		return {
			matches: [],
			totalCount: 0,
			truncated: false,
			timedOut: false,
			timeMs: performance.now() - startTime,
			query: pattern,
		};
	}

	// Compile regex
	let regex: RegExp;
	try {
		const flags = caseSensitive ? 'g' : 'gi';
		regex = new RegExp(pattern, flags);
	} catch {
		// Invalid regex
		return {
			matches: [],
			totalCount: 0,
			truncated: false,
			timedOut: false,
			timeMs: performance.now() - startTime,
			query: pattern,
		};
	}

	// Build line index for fast line lookup
	const lineStarts = buildLineIndex(text);

	// Search with timeout protection
	const matches: SearchMatch[] = [];
	let truncated = false;
	let timedOut = false;
	let lastIndex = startPosition;
	regex.lastIndex = startPosition;

	const deadline = startTime + timeout;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		// Check timeout every 1000 matches
		if (matches.length % 1000 === 0 && performance.now() > deadline) {
			timedOut = true;
			break;
		}

		// Prevent infinite loop on empty matches
		if (match.index === lastIndex) {
			regex.lastIndex = lastIndex + 1;
		}
		lastIndex = regex.lastIndex;

		const pos = match.index;
		const matchText = match[0];
		const line = findLineFromPosition(lineStarts, pos);
		const lineStart = lineStarts[line] ?? 0;

		matches.push({
			start: pos,
			end: pos + matchText.length,
			line,
			column: pos - lineStart,
			text: matchText,
		});

		if (maxMatches && matches.length >= maxMatches) {
			truncated = true;
			break;
		}
	}

	return {
		matches,
		totalCount: matches.length,
		truncated,
		timedOut,
		timeMs: performance.now() - startTime,
		query: pattern,
	};
}

/**
 * Unified search function that handles both literal and regex.
 *
 * @param text - The text to search in
 * @param query - The query (literal or regex pattern)
 * @param options - Search options
 * @returns Search result with matches
 */
export function search(text: string, query: string, options: SearchOptions = {}): SearchResult {
	if (options.regex) {
		return searchRegex(text, query, options);
	}
	return searchLiteral(text, query, options);
}

// =============================================================================
// PROGRESSIVE SEARCH
// =============================================================================

/**
 * Performs incremental search in batches.
 *
 * @param text - The text to search in
 * @param query - The query to find
 * @param startPosition - Position to start from
 * @param batchSize - Number of characters to search per batch
 * @param options - Search options
 * @returns Progressive result with batch matches
 */
export function searchBatch(
	text: string,
	query: string,
	startPosition: number,
	batchSize: number = DEFAULT_SEARCH_BATCH,
	options: SearchOptions = {},
): ProgressiveSearchResult {
	const startTime = performance.now();

	if (query.length === 0 || startPosition >= text.length) {
		return {
			matches: [],
			hasMore: false,
			nextPosition: text.length,
			timeMs: performance.now() - startTime,
		};
	}

	const endPosition = Math.min(startPosition + batchSize, text.length);
	const batchText = text.slice(0, endPosition); // Need full text up to endPosition for line numbers

	// Search in the batch
	const result = search(batchText, query, {
		...options,
		startPosition,
	});

	// Filter matches to only include those starting in the batch range
	const batchMatches = result.matches.filter((m) => m.start >= startPosition && m.start < endPosition);

	const hasMore = endPosition < text.length;

	return {
		matches: batchMatches,
		hasMore,
		nextPosition: endPosition,
		timeMs: performance.now() - startTime,
	};
}

// =============================================================================
// SEARCH CACHE
// =============================================================================

/**
 * Creates a new search cache.
 *
 * @returns Empty search cache
 */
export function createSearchCache(): SearchCache {
	return {
		query: '',
		options: {},
		matches: [],
		textHash: 0,
		currentIndex: -1,
		complete: false,
		lastPosition: 0,
	};
}

/**
 * Clears the search cache.
 *
 * @param cache - The cache to clear
 */
export function clearSearchCache(cache: SearchCache): void {
	cache.query = '';
	cache.options = {};
	cache.matches = [];
	cache.textHash = 0;
	cache.currentIndex = -1;
	cache.complete = false;
	cache.lastPosition = 0;
}

/**
 * Updates the search cache with a new query.
 *
 * @param cache - The cache to update
 * @param text - The text being searched
 * @param query - The new query
 * @param options - Search options
 * @returns Whether the cache was invalidated
 */
export function updateSearchQuery(cache: SearchCache, text: string, query: string, options: SearchOptions = {}): boolean {
	const textHash = computeTextHash(text);

	// Check if cache is still valid
	const queryChanged = cache.query !== query;
	const optionsChanged =
		cache.options.caseSensitive !== options.caseSensitive ||
		cache.options.wholeWord !== options.wholeWord ||
		cache.options.regex !== options.regex;
	const textChanged = cache.textHash !== textHash;

	if (queryChanged || optionsChanged || textChanged) {
		// Invalidate cache
		cache.query = query;
		cache.options = options;
		cache.matches = [];
		cache.textHash = textHash;
		cache.currentIndex = -1;
		cache.complete = false;
		cache.lastPosition = 0;
		return true;
	}

	return false;
}

/**
 * Performs cached search with incremental updates.
 *
 * @param cache - The search cache
 * @param text - The text to search
 * @param batchSize - Characters to search per call
 * @returns Search result from cache
 */
export function searchWithCache(
	cache: SearchCache,
	text: string,
	batchSize: number = DEFAULT_SEARCH_BATCH,
): SearchResult {
	const startTime = performance.now();

	if (cache.query.length === 0) {
		return {
			matches: cache.matches,
			totalCount: 0,
			truncated: false,
			timedOut: false,
			timeMs: performance.now() - startTime,
			query: cache.query,
		};
	}

	// If search is complete, return cached results
	if (cache.complete) {
		return {
			matches: cache.matches,
			totalCount: cache.matches.length,
			truncated: false,
			timedOut: false,
			timeMs: performance.now() - startTime,
			query: cache.query,
		};
	}

	// Continue incremental search
	const result = searchBatch(text, cache.query, cache.lastPosition, batchSize, cache.options);

	// Add new matches
	cache.matches.push(...result.matches);
	cache.lastPosition = result.nextPosition;
	cache.complete = !result.hasMore;

	return {
		matches: cache.matches,
		totalCount: cache.matches.length,
		truncated: false,
		timedOut: false,
		timeMs: performance.now() - startTime,
		query: cache.query,
	};
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Gets the next match from current position.
 *
 * @param cache - The search cache
 * @returns Next match or undefined if none
 */
export function getNextMatch(cache: SearchCache): SearchMatch | undefined {
	if (cache.matches.length === 0) {
		return undefined;
	}

	cache.currentIndex = (cache.currentIndex + 1) % cache.matches.length;
	return cache.matches[cache.currentIndex];
}

/**
 * Gets the previous match from current position.
 *
 * @param cache - The search cache
 * @returns Previous match or undefined if none
 */
export function getPreviousMatch(cache: SearchCache): SearchMatch | undefined {
	if (cache.matches.length === 0) {
		return undefined;
	}

	cache.currentIndex = cache.currentIndex <= 0 ? cache.matches.length - 1 : cache.currentIndex - 1;
	return cache.matches[cache.currentIndex];
}

/**
 * Gets match at specific index.
 *
 * @param cache - The search cache
 * @param index - Match index
 * @returns Match at index or undefined
 */
export function getMatchAt(cache: SearchCache, index: number): SearchMatch | undefined {
	if (index < 0 || index >= cache.matches.length) {
		return undefined;
	}

	cache.currentIndex = index;
	return cache.matches[index];
}

/**
 * Finds the nearest match to a position.
 *
 * @param cache - The search cache
 * @param position - Text position
 * @param preferAfter - Prefer match after position (default: true)
 * @returns Nearest match and its index
 */
export function findNearestMatch(
	cache: SearchCache,
	position: number,
	preferAfter: boolean = true,
): { match: SearchMatch; index: number } | undefined {
	if (cache.matches.length === 0) {
		return undefined;
	}

	// Binary search for nearest match
	let low = 0;
	let high = cache.matches.length - 1;

	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		const match = cache.matches[mid];
		if (match && match.start < position) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	// low is now the index of the first match >= position
	const matchAfter = cache.matches[low];
	const matchBefore = low > 0 ? cache.matches[low - 1] : undefined;

	if (preferAfter && matchAfter) {
		cache.currentIndex = low;
		return { match: matchAfter, index: low };
	}

	if (!preferAfter && matchBefore) {
		cache.currentIndex = low - 1;
		return { match: matchBefore, index: low - 1 };
	}

	// Return whichever exists
	if (matchAfter) {
		cache.currentIndex = low;
		return { match: matchAfter, index: low };
	}

	if (matchBefore) {
		cache.currentIndex = low - 1;
		return { match: matchBefore, index: low - 1 };
	}

	return undefined;
}

// =============================================================================
// VISIBLE MATCHES
// =============================================================================

/**
 * Gets matches visible in a line range.
 *
 * @param cache - The search cache
 * @param startLine - Start line (inclusive)
 * @param endLine - End line (exclusive)
 * @returns Matches in the visible range
 */
export function getVisibleMatches(cache: SearchCache, startLine: number, endLine: number): readonly SearchMatch[] {
	return cache.matches.filter((m) => m.line >= startLine && m.line < endLine);
}

/**
 * Gets match count for display (e.g., "3 of 100").
 *
 * @param cache - The search cache
 * @returns Current position and total count
 */
export function getMatchStatus(cache: SearchCache): { current: number; total: number; complete: boolean } {
	return {
		current: cache.currentIndex + 1,
		total: cache.matches.length,
		complete: cache.complete,
	};
}

// =============================================================================
// REVERSE SEARCH
// =============================================================================

/**
 * Searches in reverse (from end to start).
 *
 * @param text - The text to search in
 * @param query - The query to find
 * @param options - Search options
 * @returns Matches in reverse order
 */
export function searchReverse(text: string, query: string, options: SearchOptions = {}): SearchResult {
	// Search normally, then reverse the results
	const result = search(text, query, options);

	return {
		...result,
		matches: [...result.matches].reverse(),
	};
}
