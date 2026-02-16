/**
 * Text search utilities namespace with caching support.
 *
 * @example
 * ```typescript
 * import { textSearchUtils } from 'blecsd/utils';
 *
 * const cache = textSearchUtils.createSearchCache();
 * const result = textSearchUtils.searchWithCache(cache, lines, 'query');
 * const next = textSearchUtils.getNextMatch(result, currentPos);
 * const visible = textSearchUtils.getVisibleMatches(result, startLine, endLine);
 * ```
 */

import {
	boyerMooreHorspool,
	clearSearchCache,
	createSearchCache,
	DEFAULT_SEARCH_BATCH,
	DEFAULT_TIMEOUT,
	findNearestMatch,
	getMatchAt,
	getMatchStatus,
	getNextMatch,
	getPreviousMatch,
	getVisibleMatches,
	positionToLineColumn,
	search,
	searchBatch,
	searchLiteral,
	searchRegex,
	searchReverse,
	searchWithCache,
	updateSearchQuery,
	WORD_BOUNDARY_AFTER,
	WORD_BOUNDARY_BEFORE,
} from '../textSearch';

export const textSearchUtils = Object.freeze({
	search,
	searchWithCache,
	createSearchCache,
	getNextMatch,
	getPreviousMatch,
	getVisibleMatches,
	clearSearchCache,
	updateSearchQuery,
	searchBatch,
	searchLiteral,
	searchRegex,
	searchReverse,
	boyerMooreHorspool,
	findNearestMatch,
	getMatchAt,
	getMatchStatus,
	positionToLineColumn,
	DEFAULT_SEARCH_BATCH,
	DEFAULT_TIMEOUT,
	WORD_BOUNDARY_BEFORE,
	WORD_BOUNDARY_AFTER,
});

export type TextSearchUtilsModule = typeof textSearchUtils;
