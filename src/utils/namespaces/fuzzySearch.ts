/**
 * Fuzzy search utilities namespace.
 *
 * @example
 * ```typescript
 * import { fuzzySearch } from 'blecsd/utils';
 *
 * const match = fuzzySearch.fuzzyMatch('hello', 'hlo');
 * const results = fuzzySearch.search(items, 'query');
 * const filtered = fuzzySearch.fuzzyFilter(items, 'query', item => item.name);
 * ```
 */

import {
	FuzzyOptionsSchema,
	fuzzyFilter,
	fuzzyMatch,
	fuzzySearchBy,
	fuzzySearch as fuzzySearchFn,
	fuzzyTest,
	highlightMatch,
} from '../fuzzySearch';

export const fuzzySearch = Object.freeze({
	fuzzyMatch,
	search: fuzzySearchFn,
	fuzzyFilter,
	fuzzySearchBy,
	fuzzyTest,
	highlightMatch,
	FuzzyOptionsSchema,
});

export type FuzzySearchModule = typeof fuzzySearch;
