/**
 * Helper utilities namespace for common operations.
 *
 * @example
 * ```typescript
 * import { helpers } from 'blecsd/utils';
 *
 * const grouped = helpers.groupBy(items, item => item.category);
 * const sorted = helpers.sortBy(items, item => item.priority);
 * const unique = helpers.unique([1, 2, 2, 3]);
 * ```
 */

import {
	findAllFiles,
	findFile,
	groupBy,
	merge,
	partition,
	shallowMerge,
	sortBy,
	sortByIndex,
	sortByName,
	sortByPriority,
	unique,
	uniqueBy,
} from '../helpers';

export const helpers = Object.freeze({
	findFile,
	findAllFiles,
	groupBy,
	merge,
	shallowMerge,
	partition,
	unique,
	uniqueBy,
	sortBy,
	sortByIndex,
	sortByName,
	sortByPriority,
});

export type HelpersModule = typeof helpers;
