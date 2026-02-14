/**
 * Cache management for syntax highlighting.
 *
 * @module utils/syntaxHighlight/cache
 */

import type { Grammar, HighlightCache, HighlightStats } from './types';


// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Creates a new highlight cache.
 *
 * @param grammar - The grammar to use for highlighting
 * @returns A new highlight cache
 */
export function createHighlightCache(grammar: Grammar): HighlightCache {
	return {
		grammar,
		entries: new Map(),
		dirty: new Set(),
		lineCount: 0,
		fullInvalidate: true,
	};
}

/**
 * Clears all entries from the cache.
 *
 * @param cache - The cache to clear
 */
export function clearHighlightCache(cache: HighlightCache): void {
	cache.entries.clear();
	cache.dirty.clear();
	cache.lineCount = 0;
	cache.fullInvalidate = true;
}

/**
 * Changes the grammar used for highlighting.
 *
 * @param cache - The cache to update
 * @param grammar - The new grammar
 */
export function setGrammar(cache: HighlightCache, grammar: Grammar): void {
	if (cache.grammar.name !== grammar.name) {
		cache.grammar = grammar;
		cache.fullInvalidate = true;
		for (let i = 0; i < cache.lineCount; i++) {
			cache.dirty.add(i);
		}
	}
}

/**
 * Gets statistics about the highlight cache.
 *
 * @param cache - The cache to analyze
 * @returns Cache statistics
 */
export function getHighlightStats(cache: HighlightCache): HighlightStats {
	return {
		cachedLines: cache.entries.size,
		dirtyLines: cache.dirty.size,
		grammar: cache.grammar.name,
		lineCount: cache.lineCount,
		fullInvalidate: cache.fullInvalidate,
	};
}

// =============================================================================
// INVALIDATION
// =============================================================================

/**
 * Invalidates a range of lines.
 *
 * @param cache - The cache to update
 * @param start - Start line (inclusive)
 * @param end - End line (exclusive)
 */
export function invalidateLines(cache: HighlightCache, start: number, end: number): void {
	for (let i = start; i < end; i++) {
		cache.dirty.add(i);
	}
}

/**
 * Invalidates a single line.
 *
 * @param cache - The cache to update
 * @param line - The line to invalidate
 */
export function invalidateLine(cache: HighlightCache, line: number): void {
	cache.dirty.add(line);
}

/**
 * Invalidates all lines in the cache.
 *
 * @param cache - The cache to update
 */
export function invalidateAllLines(cache: HighlightCache): void {
	cache.fullInvalidate = true;
	for (let i = 0; i < cache.lineCount; i++) {
		cache.dirty.add(i);
	}
}

