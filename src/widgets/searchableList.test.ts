/**
 * SearchableList Widget Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	createSearchableList,
	getSearchableFilteredItems,
	isSearchableList,
	resetSearchableListStore,
	type SearchableListWidget,
	setSearchableFilter,
} from './searchableList';

describe('SearchableList Widget', () => {
	let world: World;
	let eid: Entity;
	let list: SearchableListWidget;

	const items = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry'];

	beforeEach(() => {
		resetSearchableListStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createSearchableList', () => {
		it('should create a searchable list widget', () => {
			list = createSearchableList(world, { items });

			expect(list.eid).toBeDefined();
			expect(isSearchableList(world, list.eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			list = createSearchableList(world);

			expect(list.getItems()).toEqual([]);
			expect(list.getFilter()).toBe('');
			expect(list.isSearchEnabled()).toBe(true);
		});

		it('should initialize with provided items', () => {
			list = createSearchableList(world, { items });

			const allItems = list.getItems();
			expect(allItems).toHaveLength(5);
			expect(allItems[0]?.text).toBe('Apple');
		});

		it('should start with search enabled by default', () => {
			list = createSearchableList(world, { items });
			expect(list.isSearchEnabled()).toBe(true);
		});

		it('should allow disabling search', () => {
			list = createSearchableList(world, { items, enableSearch: false });
			expect(list.isSearchEnabled()).toBe(false);
		});
	});

	describe('filtering', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should show all items with empty filter', () => {
			expect(list.getFilteredItems()).toHaveLength(5);
		});

		it('should filter items by substring', () => {
			list.setFilter('ber');
			const filtered = list.getFilteredItems();
			expect(filtered).toHaveLength(1); // Only Blueberry contains 'ber'
			expect(filtered[0]?.text).toBe('Blueberry');
		});

		it('should filter case-insensitively', () => {
			list.setFilter('APPLE');
			const filtered = list.getFilteredItems();
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.text).toBe('Apple');
		});

		it('should filter with partial matches', () => {
			list.setFilter('ap');
			const filtered = list.getFilteredItems();
			// Apple and Apricot both start with 'Ap'
			expect(filtered.length).toBeGreaterThanOrEqual(2);
		});

		it('should clear filter', () => {
			list.setFilter('xyz');
			list.clearFilter();
			expect(list.getFilteredItems()).toHaveLength(5);
		});

		it('should get filter query', () => {
			list.setFilter('test');
			expect(list.getFilter()).toBe('test');
		});

		it('should get filtered count', () => {
			list.setFilter('Cherry');
			expect(list.getFilteredCount()).toBe(1);
		});

		it('should return correct filter status', () => {
			expect(list.getFilterStatus()).toBe('5 items');

			list.setFilter('ap');
			expect(list.getFilterStatus()).toMatch(/\d+ of 5 items/);
		});

		it('should handle no matches', () => {
			list.setFilter('zzz');
			expect(list.getFilteredCount()).toBe(0);
			expect(list.getFilterStatus()).toBe('0 of 5 items');
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should start with first item selected', () => {
			expect(list.getSelectedIndex()).toBe(0);
			expect(list.getSelectedItem()?.text).toBe('Apple');
		});

		it('should select by index', () => {
			list.select(2);
			expect(list.getSelectedIndex()).toBe(2);
			expect(list.getSelectedItem()?.text).toBe('Banana');
		});

		it('should select previous', () => {
			list.select(2);
			list.selectPrev();
			expect(list.getSelectedIndex()).toBe(1);
		});

		it('should select next', () => {
			list.selectNext();
			expect(list.getSelectedIndex()).toBe(1);
		});

		it('should not go below 0', () => {
			list.selectPrev();
			expect(list.getSelectedIndex()).toBe(0);
		});

		it('should not go past last item', () => {
			for (let i = 0; i < 10; i++) {
				list.selectNext();
			}
			expect(list.getSelectedIndex()).toBe(4);
		});

		it('should select first', () => {
			list.select(3);
			list.selectFirst();
			expect(list.getSelectedIndex()).toBe(0);
		});

		it('should select last', () => {
			list.selectLast();
			expect(list.getSelectedIndex()).toBe(4);
		});

		it('should clamp selection when filtering narrows results', () => {
			list.select(4); // Last item
			list.setFilter('Apple'); // Only 1 item
			expect(list.getSelectedIndex()).toBe(0);
		});

		it('should preserve selection concept across filter changes', () => {
			// Select Apple
			list.select(0);
			expect(list.getSelectedItem()?.text).toBe('Apple');

			// Filter to 'Ch' shows only Cherry
			list.setFilter('Ch');
			expect(list.getFilteredCount()).toBe(1);
			expect(list.getSelectedIndex()).toBe(0);
			expect(list.getSelectedItem()?.text).toBe('Cherry');

			// Clear filter restores all items
			list.clearFilter();
			expect(list.getFilteredCount()).toBe(5);
		});
	});

	describe('original index tracking', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should return original index when no filter', () => {
			list.select(2);
			expect(list.getOriginalSelectedIndex()).toBe(2);
		});

		it('should return correct original index when filtered', () => {
			list.setFilter('Cherry');
			list.select(0);
			// Cherry is index 4 in original array
			expect(list.getOriginalSelectedIndex()).toBe(4);
		});

		it('should return -1 when no selection', () => {
			list = createSearchableList(world);
			expect(list.getOriginalSelectedIndex()).toBe(-1);
		});
	});

	describe('search enable/disable', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should disable search', () => {
			list.setSearchEnabled(false);
			expect(list.isSearchEnabled()).toBe(false);
		});

		it('should clear filter when search is disabled', () => {
			list.setFilter('Apple');
			list.setSearchEnabled(false);
			expect(list.getFilter()).toBe('');
			expect(list.getFilteredItems()).toHaveLength(5);
		});

		it('should re-enable search', () => {
			list.setSearchEnabled(false);
			list.setSearchEnabled(true);
			expect(list.isSearchEnabled()).toBe(true);
		});
	});

	describe('item management', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should set new items', () => {
			list.setItems(['X', 'Y', 'Z']);
			expect(list.getItems()).toHaveLength(3);
			expect(list.getItems()[0]?.text).toBe('X');
		});

		it('should re-apply filter when items change', () => {
			list.setFilter('ap');
			list.setItems(['Grape', 'Apple', 'Mango']);
			const filtered = list.getFilteredItems();
			// 'Grape' contains 'ap'? 'grape'.includes('ap') = false
			// 'Apple' contains 'ap'? 'apple'.includes('ap') = true
			expect(filtered.some((i) => i.text === 'Apple')).toBe(true);
		});
	});

	describe('events', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should fire onChange when filter changes', () => {
			const callback = vi.fn();
			list.onChange(callback);

			list.setFilter('ap');
			expect(callback).toHaveBeenCalledWith(expect.any(Array), expect.any(Number));
		});

		it('should fire onChange when selection changes', () => {
			const callback = vi.fn();
			list.onChange(callback);

			list.selectNext();
			expect(callback).toHaveBeenCalled();
		});

		it('should unsubscribe callback', () => {
			const callback = vi.fn();
			const unsub = list.onChange(callback);

			unsub();
			list.setFilter('test');
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should handle down arrow', () => {
			list.handleKey('down');
			expect(list.getSelectedIndex()).toBe(1);
		});

		it('should handle up arrow', () => {
			list.handleKey('down');
			list.handleKey('up');
			expect(list.getSelectedIndex()).toBe(0);
		});

		it('should handle j/k vim keys', () => {
			list.handleKey('j');
			expect(list.getSelectedIndex()).toBe(1);
			list.handleKey('k');
			expect(list.getSelectedIndex()).toBe(0);
		});

		it('should handle home/end', () => {
			list.handleKey('end');
			expect(list.getSelectedIndex()).toBe(4);
			list.handleKey('home');
			expect(list.getSelectedIndex()).toBe(0);
		});

		it('should type to filter', () => {
			list.handleKey('a');
			expect(list.getFilter()).toBe('a');
			list.handleKey('p');
			expect(list.getFilter()).toBe('ap');
		});

		it('should handle backspace for filter', () => {
			list.setFilter('abc');
			list.handleKey('backspace');
			expect(list.getFilter()).toBe('ab');
		});

		it('should handle Ctrl+U to clear filter', () => {
			list.setFilter('test');
			list.handleKey('u', true);
			expect(list.getFilter()).toBe('');
		});

		it('should handle escape to clear filter first', () => {
			list.setFilter('test');
			list.handleKey('escape');
			expect(list.getFilter()).toBe('');
		});

		it('should handle escape to blur when filter is empty', () => {
			list.focus();
			list.handleKey('escape');
			expect(list.isFocused()).toBe(false);
		});

		it('should not filter when search is disabled', () => {
			list.setSearchEnabled(false);
			const handled = list.handleKey('a');
			expect(handled).toBe(false);
			expect(list.getFilter()).toBe('');
		});

		it('should return false for unhandled keys', () => {
			const result = list.handleKey('f5');
			expect(result).toBe(false);
		});
	});

	describe('standalone API functions', () => {
		it('should get filtered items via getSearchableFilteredItems', () => {
			list = createSearchableList(world, { items });
			list.setFilter('Cherry');

			const filtered = getSearchableFilteredItems(world, list.eid);
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.text).toBe('Cherry');
		});

		it('should return empty for non-existent entity', () => {
			const filtered = getSearchableFilteredItems(world, eid);
			expect(filtered).toEqual([]);
		});

		it('should set filter via setSearchableFilter', () => {
			list = createSearchableList(world, { items });
			setSearchableFilter(world, list.eid, 'Ban');

			expect(list.getFilter()).toBe('Ban');
			expect(list.getFilteredCount()).toBe(1);
		});

		it('should no-op setSearchableFilter for non-existent entity', () => {
			expect(() => setSearchableFilter(world, eid, 'test')).not.toThrow();
		});
	});

	describe('visibility and focus', () => {
		beforeEach(() => {
			list = createSearchableList(world, { items });
		});

		it('should show the widget', () => {
			const result = list.hide().show();
			expect(result).toBe(list);
		});

		it('should hide the widget', () => {
			const result = list.show().hide();
			expect(result).toBe(list);
		});

		it('should focus the widget', () => {
			list.focus();
			expect(list.isFocused()).toBe(true);
		});

		it('should blur the widget', () => {
			list.focus();
			list.blur();
			expect(list.isFocused()).toBe(false);
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			list = createSearchableList(world, { items });
			const listEid = list.eid;

			expect(isSearchableList(world, listEid)).toBe(true);

			list.destroy();
			expect(isSearchableList(world, listEid)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle empty items', () => {
			list = createSearchableList(world);
			expect(list.getSelectedIndex()).toBe(-1);
			expect(list.getSelectedItem()).toBeUndefined();
			expect(list.getOriginalSelectedIndex()).toBe(-1);
		});

		it('should handle selecting in empty filtered results', () => {
			list = createSearchableList(world, { items });
			list.setFilter('zzzzz');
			expect(list.getSelectedIndex()).toBe(-1);
			expect(list.getSelectedItem()).toBeUndefined();
		});

		it('should handle clearing filter with no previous selection', () => {
			list = createSearchableList(world, { items });
			list.setFilter('zzz');
			list.clearFilter();
			// Should reset to index 0
			expect(list.getSelectedIndex()).toBe(0);
		});
	});
});
