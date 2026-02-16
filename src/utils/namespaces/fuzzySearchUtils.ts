/**
 * Fuzzy search utilities namespace.
 *
 * @example
 * ```typescript
 * import { fuzzySearchUtils } from 'blecsd/utils';
 *
 * const match = fuzzySearchUtils.fuzzyMatch('hello', 'hlo');
 * const results = fuzzySearchUtils.fuzzySearch(items, 'query');
 * const filtered = fuzzySearchUtils.fuzzyFilter(items, 'query', item => item.name);
 * ```
 */

import {
	FuzzyOptionsSchema,
	fuzzyFilter,
	fuzzyMatch,
	fuzzySearch,
	fuzzySearchBy,
	fuzzyTest,
	highlightMatch,
} from '../fuzzySearch';

export const fuzzySearchUtils = Object.freeze({
	fuzzyMatch,
	fuzzySearch,
	fuzzyFilter,
	fuzzySearchBy,
	fuzzyTest,
	highlightMatch,
	FuzzyOptionsSchema,
});

export type FuzzySearchUtilsModule = typeof fuzzySearchUtils;
