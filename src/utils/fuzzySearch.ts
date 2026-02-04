/**
 * Fuzzy Search Utility
 *
 * Provides fuzzy string matching with scoring and highlighting support.
 *
 * @module utils/fuzzySearch
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for fuzzy search.
 */
export interface FuzzyOptions {
	/** Whether to ignore case (default: true) */
	readonly caseSensitive?: boolean;
	/** Minimum score threshold (0-1, default: 0) */
	readonly threshold?: number;
	/** Maximum number of results to return (default: unlimited) */
	readonly limit?: number;
	/** Bonus for consecutive character matches (default: 0.3) */
	readonly consecutiveBonus?: number;
	/** Bonus for matches at word boundaries (default: 0.2) */
	readonly wordBoundaryBonus?: number;
	/** Bonus for exact prefix match (default: 0.5) */
	readonly prefixBonus?: number;
	/** Penalty per character distance between matches (default: 0.1) */
	readonly gapPenalty?: number;
}

/**
 * A single fuzzy match result.
 */
export interface FuzzyMatch<T = string> {
	/** The original item */
	readonly item: T;
	/** The string that was matched against */
	readonly text: string;
	/** Match score (0-1, higher is better) */
	readonly score: number;
	/** Indices of matched characters in the text */
	readonly indices: readonly number[];
}

/**
 * Options with text extractor for object arrays.
 */
export interface FuzzySearchOptions<T> extends FuzzyOptions {
	/** Function to extract searchable text from an item */
	readonly getText?: (item: T) => string;
}

type ResolvedFuzzyOptions = Omit<Required<FuzzyOptions>, 'limit'> & {
	readonly limit: number | undefined;
};

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for fuzzy options.
 */
export const FuzzyOptionsSchema = z.object({
	caseSensitive: z.boolean().default(false),
	threshold: z.number().min(0).max(1).default(0),
	limit: z.number().int().positive().optional(),
	consecutiveBonus: z.number().min(0).max(1).default(0.3),
	wordBoundaryBonus: z.number().min(0).max(1).default(0.2),
	prefixBonus: z.number().min(0).max(1).default(0.5),
	gapPenalty: z.number().min(0).max(1).default(0.1),
});

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_OPTIONS = {
	caseSensitive: false,
	threshold: 0,
	limit: undefined,
	consecutiveBonus: 0.3,
	wordBoundaryBonus: 0.2,
	prefixBonus: 0.5,
	gapPenalty: 0.1,
} satisfies ResolvedFuzzyOptions;

function resolveFuzzyOptions(options: FuzzyOptions = {}): ResolvedFuzzyOptions {
	return { ...DEFAULT_OPTIONS, ...options };
}

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Checks if a character is a word boundary.
 * Word boundaries are defined as:
 * - Start of string
 * - After a space, underscore, hyphen, or slash
 * - Transition from lowercase to uppercase (camelCase)
 *
 * @param text - The text to check
 * @param index - The character index
 * @returns true if the character is at a word boundary
 */
function isWordBoundary(text: string, index: number): boolean {
	if (index === 0) return true;
	const prevChar = text[index - 1];
	const currChar = text[index];
	if (!prevChar || !currChar) return false;

	// After separator
	if (prevChar === ' ' || prevChar === '_' || prevChar === '-' || prevChar === '/') {
		return true;
	}

	// CamelCase boundary
	if (prevChar === prevChar.toLowerCase() && currChar === currChar.toUpperCase()) {
		return true;
	}

	return false;
}

/**
 * Calculates the fuzzy match score based on matched indices.
 */
function calculateFuzzyScore(
	query: string,
	text: string,
	searchQuery: string,
	searchText: string,
	indices: number[],
	opts: ResolvedFuzzyOptions,
): number {
	// Calculate base score (percentage of query matched)
	let score = query.length / Math.max(text.length, query.length);

	// Apply bonuses and penalties
	let consecutiveCount = 0;
	let previousIndex = -2;

	for (let i = 0; i < indices.length; i++) {
		const index = indices[i];
		if (index === undefined) continue;

		// Consecutive bonus
		if (index === previousIndex + 1) {
			consecutiveCount++;
			score += opts.consecutiveBonus * (consecutiveCount / query.length);
		} else {
			consecutiveCount = 0;
			// Gap penalty
			if (previousIndex >= 0) {
				const gap = index - previousIndex - 1;
				score -= opts.gapPenalty * (gap / text.length);
			}
		}

		// Word boundary bonus
		if (isWordBoundary(text, index)) {
			score += opts.wordBoundaryBonus / query.length;
		}

		previousIndex = index;
	}

	// Prefix bonus
	if (indices[0] === 0) {
		score += opts.prefixBonus;
	}

	// Exact match bonus
	if (searchQuery === searchText) {
		score = 1;
	}

	// Clamp score to 0-1
	return Math.max(0, Math.min(1, score));
}

/**
 * Calculates the fuzzy match score for a query against a text.
 *
 * @param query - The search query
 * @param text - The text to search in
 * @param options - Matching options
 * @returns Match result with score and indices, or null if no match
 */
export function fuzzyMatch(
	query: string,
	text: string,
	options: FuzzyOptions = {},
): FuzzyMatch<string> | null {
	const opts = resolveFuzzyOptions(options);

	// Handle empty query
	if (!query) {
		return {
			item: text,
			text,
			score: 1,
			indices: [],
		};
	}

	// Normalize case if not case-sensitive
	const searchQuery = opts.caseSensitive ? query : query.toLowerCase();
	const searchText = opts.caseSensitive ? text : text.toLowerCase();

	// Find all matched character indices
	const indices: number[] = [];
	let queryIndex = 0;
	let textIndex = 0;

	while (queryIndex < searchQuery.length && textIndex < searchText.length) {
		if (searchQuery[queryIndex] === searchText[textIndex]) {
			indices.push(textIndex);
			queryIndex++;
		}
		textIndex++;
	}

	// Check if all query characters were found
	if (queryIndex !== searchQuery.length) {
		return null;
	}

	// Calculate score
	const score = calculateFuzzyScore(query, text, searchQuery, searchText, indices, opts);

	return {
		item: text,
		text,
		score,
		indices,
	};
}

/**
 * Performs fuzzy search on an array of strings.
 *
 * @param query - The search query
 * @param items - Array of strings to search
 * @param options - Search options
 * @returns Array of matches sorted by score (highest first)
 *
 * @example
 * ```typescript
 * const items = ['apple', 'application', 'banana', 'apply'];
 * const results = fuzzySearch('app', items);
 * // Returns: [
 * //   { item: 'apple', text: 'apple', score: 0.9, indices: [0, 1, 2] },
 * //   { item: 'apply', text: 'apply', score: 0.9, indices: [0, 1, 2] },
 * //   { item: 'application', text: 'application', score: 0.7, indices: [0, 1, 2] },
 * // ]
 * ```
 */
export function fuzzySearch(
	query: string,
	items: readonly string[],
	options: FuzzyOptions = {},
): FuzzyMatch<string>[] {
	const opts = resolveFuzzyOptions(options);
	const results: FuzzyMatch<string>[] = [];

	for (const item of items) {
		const match = fuzzyMatch(query, item, opts);
		if (match && match.score >= (opts.threshold || 0)) {
			results.push(match);
		}
	}

	// Sort by score descending
	results.sort((a, b) => b.score - a.score);

	// Apply limit
	if (opts.limit !== undefined && results.length > opts.limit) {
		return results.slice(0, opts.limit);
	}

	return results;
}

/**
 * Performs fuzzy search on an array of objects.
 *
 * @param query - The search query
 * @param items - Array of objects to search
 * @param options - Search options with text extractor
 * @returns Array of matches sorted by score (highest first)
 *
 * @example
 * ```typescript
 * interface Item { name: string; id: number; }
 * const items: Item[] = [
 *   { name: 'Apple', id: 1 },
 *   { name: 'Banana', id: 2 },
 * ];
 * const results = fuzzySearchBy('app', items, { getText: (item) => item.name });
 * // Returns matches with the original item objects
 * ```
 */
export function fuzzySearchBy<T>(
	query: string,
	items: readonly T[],
	options: FuzzySearchOptions<T>,
): FuzzyMatch<T>[] {
	const { getText = String, ...fuzzyOpts } = options;
	const opts = resolveFuzzyOptions(fuzzyOpts);
	const results: FuzzyMatch<T>[] = [];

	for (const item of items) {
		const text = getText(item);
		const match = fuzzyMatch(query, text, opts);
		if (match && match.score >= (opts.threshold || 0)) {
			results.push({
				item,
				text,
				score: match.score,
				indices: match.indices,
			});
		}
	}

	// Sort by score descending
	results.sort((a, b) => b.score - a.score);

	// Apply limit
	if (opts.limit !== undefined && results.length > opts.limit) {
		return results.slice(0, opts.limit);
	}

	return results;
}

/**
 * Highlights matched characters in a string.
 *
 * @param text - The original text
 * @param indices - The matched character indices
 * @param highlight - Function to wrap matched characters (default: adds brackets)
 * @returns Text with highlighted matches
 *
 * @example
 * ```typescript
 * const text = 'application';
 * const indices = [0, 1, 2]; // "app"
 * const highlighted = highlightMatch(text, indices, (c) => `[${c}]`);
 * // Returns: "[a][p][p]lication"
 * ```
 */
export function highlightMatch(
	text: string,
	indices: readonly number[],
	highlight: (char: string) => string = (c) => `[${c}]`,
): string {
	const indexSet = new Set(indices);
	let result = '';

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char !== undefined) {
			if (indexSet.has(i)) {
				result += highlight(char);
			} else {
				result += char;
			}
		}
	}

	return result;
}

/**
 * Filters items based on fuzzy search and returns only matching items.
 * This is a simpler API for cases where you just need filtered results.
 *
 * @param query - The search query
 * @param items - Array of strings to filter
 * @param options - Search options
 * @returns Array of matching items (original strings, not FuzzyMatch objects)
 *
 * @example
 * ```typescript
 * const items = ['apple', 'application', 'banana'];
 * const filtered = fuzzyFilter('app', items);
 * // Returns: ['apple', 'application']
 * ```
 */
export function fuzzyFilter(
	query: string,
	items: readonly string[],
	options: FuzzyOptions = {},
): string[] {
	const matches = fuzzySearch(query, items, options);
	return matches.map((m) => m.item);
}

/**
 * Checks if a string matches a fuzzy query.
 *
 * @param query - The search query
 * @param text - The text to check
 * @param options - Match options
 * @returns true if the text matches the query
 *
 * @example
 * ```typescript
 * fuzzyTest('app', 'application'); // true
 * fuzzyTest('xyz', 'application'); // false
 * ```
 */
export function fuzzyTest(query: string, text: string, options: FuzzyOptions = {}): boolean {
	const match = fuzzyMatch(query, text, options);
	return match !== null && match.score >= (options.threshold ?? 0);
}
