/**
 * SearchableList widget namespace.
 *
 * @example
 * ```typescript
 * import { searchableList } from 'blecsd/widgets';
 * const sl = searchableList.create(world, { items: [...] });
 * searchableList.setFilter(world, sl.eid, 'search term');
 * const filtered = searchableList.getFilteredItems(world, sl.eid);
 * ```
 */
import {
	createSearchableList,
	getSearchableFilteredItems,
	isSearchableList,
	resetSearchableListStore,
	setSearchableFilter,
} from '../searchableList';

export const searchableList = Object.freeze({
	create: createSearchableList,
	is: isSearchableList,
	setFilter: setSearchableFilter,
	getFilteredItems: getSearchableFilteredItems,
	resetStore: resetSearchableListStore,
});

export type SearchableListModule = typeof searchableList;
