/**
 * List Component Tests
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '../core/types';
import {
	activateSelected,
	addItem,
	appendToSearchQuery,
	attachListBehavior,
	backspaceSearchQuery,
	blurList,
	clearItems,
	clearListCallbacks,
	clearListDisplay,
	clearSearchQuery,
	clearSelection,
	disableList,
	enableList,
	endListSearch,
	ensureVisible,
	findAndSelectByText,
	findNextMatch,
	focusList,
	getFirstVisible,
	getItem,
	getItemCount,
	getItems,
	getListDisplay,
	getListSearchQuery,
	getListState,
	getSelectedIndex,
	getSelectedItem,
	getVisibleCount,
	getVisibleItems,
	handleListKeyPress,
	isList,
	isListDisabled,
	isListFocused,
	isListInState,
	isListInteractive,
	isListKeysEnabled,
	isListMouseEnabled,
	isListSearchEnabled,
	isListSearching,
	LIST_STATE_MACHINE_CONFIG,
	listStore,
	onListActivate,
	onListSearchChange,
	onListSelect,
	removeItem,
	renderListItems,
	resetListStore,
	scrollPage,
	selectByValue,
	selectFirst,
	selectLast,
	selectNext,
	selectPrev,
	setFirstVisible,
	setItems,
	setListDisplay,
	setListInteractive,
	setListKeys,
	setListMouse,
	setListSearchQuery,
	setSelectedIndex,
	setVisibleCount,
	startListSearch,
	updateItem,
} from './list';

describe('List Component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		resetListStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('State Machine Configuration', () => {
		it('should have correct initial state', () => {
			expect(LIST_STATE_MACHINE_CONFIG.initial).toBe('idle');
		});

		it('should have correct state transitions from idle', () => {
			const idleTransitions = LIST_STATE_MACHINE_CONFIG.states.idle.on;
			expect(idleTransitions?.focus).toBe('focused');
			expect(idleTransitions?.disable).toBe('disabled');
		});

		it('should have correct state transitions from focused', () => {
			const focusedTransitions = LIST_STATE_MACHINE_CONFIG.states.focused.on;
			expect(focusedTransitions?.blur).toBe('idle');
			expect(focusedTransitions?.startSelect).toBe('selecting');
			expect(focusedTransitions?.startSearch).toBe('searching');
			expect(focusedTransitions?.disable).toBe('disabled');
		});

		it('should have correct state transitions from searching', () => {
			const searchingTransitions = LIST_STATE_MACHINE_CONFIG.states.searching.on;
			expect(searchingTransitions?.endSearch).toBe('focused');
			expect(searchingTransitions?.blur).toBe('idle');
			expect(searchingTransitions?.disable).toBe('disabled');
		});

		it('should have correct state transitions from disabled', () => {
			const disabledTransitions = LIST_STATE_MACHINE_CONFIG.states.disabled.on;
			expect(disabledTransitions?.enable).toBe('idle');
		});
	});

	describe('attachListBehavior', () => {
		it('should initialize list with default values', () => {
			attachListBehavior(world, eid);

			expect(isList(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(-1);
			expect(getItemCount(eid)).toBe(0);
			expect(isListInteractive(eid)).toBe(true);
			expect(isListMouseEnabled(eid)).toBe(true);
			expect(isListKeysEnabled(eid)).toBe(true);
		});

		it('should initialize list with items', () => {
			const items = [
				{ text: 'Item 1', value: 'item1' },
				{ text: 'Item 2', value: 'item2' },
			];
			attachListBehavior(world, eid, items);

			expect(getItemCount(eid)).toBe(2);
			expect(getItems(eid)).toEqual(items);
		});

		it('should initialize list with custom options', () => {
			attachListBehavior(world, eid, [{ text: 'Item 1' }], {
				interactive: false,
				mouse: false,
				keys: false,
				selectedIndex: 0,
				visibleCount: 5,
			});

			expect(isListInteractive(eid)).toBe(false);
			expect(isListMouseEnabled(eid)).toBe(false);
			expect(isListKeysEnabled(eid)).toBe(false);
			expect(getSelectedIndex(eid)).toBe(0);
			expect(getVisibleCount(eid)).toBe(5);
		});

		it('should set initial state to idle', () => {
			attachListBehavior(world, eid);
			expect(getListState(world, eid)).toBe('idle');
		});
	});

	describe('isList', () => {
		it('should return false for non-list entity', () => {
			expect(isList(world, eid)).toBe(false);
		});

		it('should return true for list entity', () => {
			attachListBehavior(world, eid);
			expect(isList(world, eid)).toBe(true);
		});
	});

	describe('State Management', () => {
		beforeEach(() => {
			attachListBehavior(world, eid);
		});

		it('should focus list', () => {
			expect(focusList(world, eid)).toBe(true);
			expect(getListState(world, eid)).toBe('focused');
			expect(isListFocused(world, eid)).toBe(true);
		});

		it('should blur list', () => {
			focusList(world, eid);
			expect(blurList(world, eid)).toBe(true);
			expect(getListState(world, eid)).toBe('idle');
		});

		it('should disable list', () => {
			expect(disableList(world, eid)).toBe(true);
			expect(getListState(world, eid)).toBe('disabled');
			expect(isListDisabled(world, eid)).toBe(true);
		});

		it('should enable list', () => {
			disableList(world, eid);
			expect(enableList(world, eid)).toBe(true);
			expect(getListState(world, eid)).toBe('idle');
		});

		it('should check if list is in specific state', () => {
			expect(isListInState(world, eid, 'idle')).toBe(true);
			focusList(world, eid);
			expect(isListInState(world, eid, 'focused')).toBe(true);
		});
	});

	describe('Item Management', () => {
		beforeEach(() => {
			attachListBehavior(world, eid, [
				{ text: 'Item 1', value: 'item1' },
				{ text: 'Item 2', value: 'item2' },
				{ text: 'Item 3', value: 'item3' },
			]);
		});

		it('should get items', () => {
			const items = getItems(eid);
			expect(items.length).toBe(3);
			expect(items[0]?.text).toBe('Item 1');
		});

		it('should set items', () => {
			setItems(world, eid, [{ text: 'New Item' }]);
			expect(getItemCount(eid)).toBe(1);
			expect(getItem(eid, 0)?.text).toBe('New Item');
		});

		it('should add item at end', () => {
			addItem(world, eid, { text: 'Item 4', value: 'item4' });
			expect(getItemCount(eid)).toBe(4);
			expect(getItem(eid, 3)?.text).toBe('Item 4');
		});

		it('should add item at specific index', () => {
			addItem(world, eid, { text: 'Inserted', value: 'inserted' }, 1);
			expect(getItemCount(eid)).toBe(4);
			expect(getItem(eid, 1)?.text).toBe('Inserted');
			expect(getItem(eid, 2)?.text).toBe('Item 2');
		});

		it('should adjust selection when adding before selected', () => {
			setSelectedIndex(world, eid, 1);
			addItem(world, eid, { text: 'Inserted' }, 0);
			expect(getSelectedIndex(eid)).toBe(2);
		});

		it('should remove item', () => {
			const removed = removeItem(world, eid, 1);
			expect(removed?.text).toBe('Item 2');
			expect(getItemCount(eid)).toBe(2);
			expect(getItem(eid, 1)?.text).toBe('Item 3');
		});

		it('should return undefined when removing invalid index', () => {
			expect(removeItem(world, eid, 10)).toBeUndefined();
			expect(removeItem(world, eid, -1)).toBeUndefined();
		});

		it('should adjust selection when removing before selected', () => {
			setSelectedIndex(world, eid, 2);
			removeItem(world, eid, 0);
			expect(getSelectedIndex(eid)).toBe(1);
		});

		it('should adjust selection when removing selected', () => {
			setSelectedIndex(world, eid, 1);
			removeItem(world, eid, 1);
			expect(getSelectedIndex(eid)).toBe(1); // stays at same index (now Item 3)
		});

		it('should update item', () => {
			expect(updateItem(world, eid, 1, { text: 'Updated', value: 'updated' })).toBe(true);
			expect(getItem(eid, 1)?.text).toBe('Updated');
		});

		it('should fail to update invalid index', () => {
			expect(updateItem(world, eid, 10, { text: 'Invalid' })).toBe(false);
		});

		it('should clear items', () => {
			setSelectedIndex(world, eid, 1);
			clearItems(world, eid);
			expect(getItemCount(eid)).toBe(0);
			expect(getSelectedIndex(eid)).toBe(-1);
		});
	});

	describe('Selection Management', () => {
		beforeEach(() => {
			attachListBehavior(world, eid, [
				{ text: 'Item 1', value: 'item1' },
				{ text: 'Item 2', value: 'item2', disabled: true },
				{ text: 'Item 3', value: 'item3' },
				{ text: 'Item 4', value: 'item4' },
			]);
		});

		it('should get and set selected index', () => {
			expect(setSelectedIndex(world, eid, 0)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(0);
		});

		it('should get selected item', () => {
			setSelectedIndex(world, eid, 0);
			expect(getSelectedItem(eid)?.text).toBe('Item 1');
		});

		it('should return undefined for no selection', () => {
			expect(getSelectedItem(eid)).toBeUndefined();
		});

		it('should not select disabled item', () => {
			expect(setSelectedIndex(world, eid, 1)).toBe(false);
		});

		it('should not select out of bounds', () => {
			expect(setSelectedIndex(world, eid, 10)).toBe(false);
			expect(setSelectedIndex(world, eid, -2)).toBe(false);
		});

		it('should select previous item', () => {
			setSelectedIndex(world, eid, 3);
			expect(selectPrev(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(2); // Skips disabled item 2
		});

		it('should select next item', () => {
			setSelectedIndex(world, eid, 0);
			expect(selectNext(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(2); // Skips disabled item 1
		});

		it('should wrap around when selecting prev', () => {
			setSelectedIndex(world, eid, 0);
			expect(selectPrev(world, eid, true)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(3);
		});

		it('should wrap around when selecting next', () => {
			setSelectedIndex(world, eid, 3);
			expect(selectNext(world, eid, true)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(0);
		});

		it('should not wrap when disabled', () => {
			setSelectedIndex(world, eid, 0);
			expect(selectPrev(world, eid, false)).toBe(false);
		});

		it('should select first item', () => {
			setSelectedIndex(world, eid, 3);
			expect(selectFirst(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(0);
		});

		it('should select last item', () => {
			setSelectedIndex(world, eid, 0);
			expect(selectLast(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(3);
		});

		it('should select by value', () => {
			expect(selectByValue(world, eid, 'item3')).toBe(true);
			expect(getSelectedIndex(eid)).toBe(2);
		});

		it('should fail to select by non-existent value', () => {
			expect(selectByValue(world, eid, 'nonexistent')).toBe(false);
		});

		it('should clear selection', () => {
			setSelectedIndex(world, eid, 0);
			clearSelection(world, eid);
			expect(getSelectedIndex(eid)).toBe(-1);
		});

		it('should activate selected item', () => {
			const callback = vi.fn();
			onListActivate(eid, callback);

			setSelectedIndex(world, eid, 0);
			expect(activateSelected(world, eid)).toBe(true);
			expect(callback).toHaveBeenCalledWith(0, { text: 'Item 1', value: 'item1' });
		});

		it('should not activate when no selection', () => {
			expect(activateSelected(world, eid)).toBe(false);
		});
	});

	describe('Virtualization', () => {
		beforeEach(() => {
			const items = Array.from({ length: 20 }, (_, i) => ({
				text: `Item ${i + 1}`,
				value: `item${i + 1}`,
			}));
			attachListBehavior(world, eid, items, { visibleCount: 5 });
		});

		it('should get first visible', () => {
			expect(getFirstVisible(eid)).toBe(0);
		});

		it('should set first visible', () => {
			setFirstVisible(world, eid, 5);
			expect(getFirstVisible(eid)).toBe(5);
		});

		it('should clamp first visible to bounds', () => {
			setFirstVisible(world, eid, 100);
			expect(getFirstVisible(eid)).toBe(19);

			setFirstVisible(world, eid, -5);
			expect(getFirstVisible(eid)).toBe(0);
		});

		it('should get visible count', () => {
			expect(getVisibleCount(eid)).toBe(5);
		});

		it('should set visible count', () => {
			setVisibleCount(world, eid, 10);
			expect(getVisibleCount(eid)).toBe(10);
		});

		it('should ensure index is visible', () => {
			expect(getFirstVisible(eid)).toBe(0);
			ensureVisible(world, eid, 10);
			expect(getFirstVisible(eid)).toBe(6); // 10 - 5 + 1
		});

		it('should get visible items', () => {
			const visibleItems = getVisibleItems(eid);
			expect(visibleItems.length).toBe(5);
			expect(visibleItems[0]?.item.text).toBe('Item 1');
			expect(visibleItems[4]?.item.text).toBe('Item 5');
		});

		it('should scroll page down', () => {
			setSelectedIndex(world, eid, 0);
			expect(scrollPage(world, eid, 1)).toBe(true);
			expect(getFirstVisible(eid)).toBe(5);
			expect(getSelectedIndex(eid)).toBe(5);
		});

		it('should scroll page up', () => {
			setFirstVisible(world, eid, 10);
			setSelectedIndex(world, eid, 10);
			expect(scrollPage(world, eid, -1)).toBe(true);
			expect(getFirstVisible(eid)).toBe(5);
			expect(getSelectedIndex(eid)).toBe(5);
		});
	});

	describe('Display Configuration', () => {
		beforeEach(() => {
			attachListBehavior(world, eid);
		});

		it('should get default display', () => {
			const display = getListDisplay(eid);
			expect(display.selectedPrefix).toBe('> ');
			expect(display.unselectedPrefix).toBe('  ');
		});

		it('should set display options', () => {
			setListDisplay(eid, {
				selectedPrefix: '* ',
				unselectedPrefix: '- ',
				selectedFg: 0xffff00ff,
			});
			const display = getListDisplay(eid);
			expect(display.selectedPrefix).toBe('* ');
			expect(display.unselectedPrefix).toBe('- ');
			expect(display.selectedFg).toBe(0xffff00ff);
		});

		it('should clear display', () => {
			setListDisplay(eid, { selectedPrefix: '* ' });
			clearListDisplay(eid);
			const display = getListDisplay(eid);
			expect(display.selectedPrefix).toBe('> '); // back to default
		});
	});

	describe('Options', () => {
		beforeEach(() => {
			attachListBehavior(world, eid);
		});

		it('should set interactive mode', () => {
			setListInteractive(world, eid, false);
			expect(isListInteractive(eid)).toBe(false);
		});

		it('should set mouse mode', () => {
			setListMouse(world, eid, false);
			expect(isListMouseEnabled(eid)).toBe(false);
		});

		it('should set keys mode', () => {
			setListKeys(world, eid, false);
			expect(isListKeysEnabled(eid)).toBe(false);
		});
	});

	describe('Callbacks', () => {
		beforeEach(() => {
			attachListBehavior(world, eid, [
				{ text: 'Item 1', value: 'item1' },
				{ text: 'Item 2', value: 'item2' },
			]);
		});

		it('should call onSelect callback when selection changes', () => {
			const callback = vi.fn();
			onListSelect(eid, callback);

			setSelectedIndex(world, eid, 0);
			expect(callback).toHaveBeenCalledWith(0, { text: 'Item 1', value: 'item1' });
		});

		it('should unsubscribe from callbacks', () => {
			const callback = vi.fn();
			const unsubscribe = onListSelect(eid, callback);

			unsubscribe();
			setSelectedIndex(world, eid, 0);
			expect(callback).not.toHaveBeenCalled();
		});

		it('should clear all callbacks', () => {
			const selectCallback = vi.fn();
			const activateCallback = vi.fn();

			onListSelect(eid, selectCallback);
			onListActivate(eid, activateCallback);

			clearListCallbacks(eid);

			setSelectedIndex(world, eid, 0);
			activateSelected(world, eid);

			expect(selectCallback).not.toHaveBeenCalled();
			expect(activateCallback).not.toHaveBeenCalled();
		});
	});

	describe('Key Handling', () => {
		beforeEach(() => {
			attachListBehavior(world, eid, [{ text: 'Item 1' }, { text: 'Item 2' }, { text: 'Item 3' }]);
		});

		it('should return selectPrev for up key', () => {
			const action = handleListKeyPress(world, eid, 'up');
			expect(action).toEqual({ type: 'selectPrev' });
		});

		it('should return selectPrev for k key', () => {
			const action = handleListKeyPress(world, eid, 'k');
			expect(action).toEqual({ type: 'selectPrev' });
		});

		it('should return selectNext for down key', () => {
			const action = handleListKeyPress(world, eid, 'down');
			expect(action).toEqual({ type: 'selectNext' });
		});

		it('should return selectNext for j key', () => {
			const action = handleListKeyPress(world, eid, 'j');
			expect(action).toEqual({ type: 'selectNext' });
		});

		it('should return selectFirst for home key', () => {
			const action = handleListKeyPress(world, eid, 'home');
			expect(action).toEqual({ type: 'selectFirst' });
		});

		it('should return selectLast for end key', () => {
			const action = handleListKeyPress(world, eid, 'end');
			expect(action).toEqual({ type: 'selectLast' });
		});

		it('should return pageUp for pageup key', () => {
			const action = handleListKeyPress(world, eid, 'pageup');
			expect(action).toEqual({ type: 'pageUp' });
		});

		it('should return pageDown for pagedown key', () => {
			const action = handleListKeyPress(world, eid, 'pagedown');
			expect(action).toEqual({ type: 'pageDown' });
		});

		it('should return confirm for enter key', () => {
			const action = handleListKeyPress(world, eid, 'enter');
			expect(action).toEqual({ type: 'confirm' });
		});

		it('should return confirm for space key', () => {
			const action = handleListKeyPress(world, eid, 'space');
			expect(action).toEqual({ type: 'confirm' });
		});

		it('should return null for disabled list', () => {
			disableList(world, eid);
			expect(handleListKeyPress(world, eid, 'down')).toBeNull();
		});

		it('should return null when keys disabled', () => {
			setListKeys(world, eid, false);
			expect(handleListKeyPress(world, eid, 'down')).toBeNull();
		});

		it('should return null for non-list entity', () => {
			const eid2 = addEntity(world) as Entity;
			expect(handleListKeyPress(world, eid2, 'down')).toBeNull();
		});

		it('should return null for unhandled keys', () => {
			expect(handleListKeyPress(world, eid, 'a')).toBeNull();
		});
	});

	describe('Rendering', () => {
		beforeEach(() => {
			attachListBehavior(world, eid, [{ text: 'Item 1' }, { text: 'Item 2' }, { text: 'Item 3' }]);
		});

		it('should render items with default prefixes', () => {
			setSelectedIndex(world, eid, 1);
			const lines = renderListItems(eid, 20);
			expect(lines[0]).toBe('  Item 1');
			expect(lines[1]).toBe('> Item 2');
			expect(lines[2]).toBe('  Item 3');
		});

		it('should truncate long items', () => {
			setItems(world, eid, [{ text: 'This is a very long item that should be truncated' }]);
			const lines = renderListItems(eid, 15);
			expect(lines[0]?.length).toBeLessThanOrEqual(15);
			expect(lines[0]).toContain('…');
		});
	});

	describe('Search Mode', () => {
		it('should enable search mode', () => {
			attachListBehavior(world, eid, [], { search: true });
			expect(isListSearchEnabled(eid)).toBe(true);
		});

		it('should disable search mode by default', () => {
			attachListBehavior(world, eid);
			expect(isListSearchEnabled(eid)).toBe(false);
		});

		it('should start search when enabled', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			expect(startListSearch(world, eid)).toBe(true);
			expect(isListSearching(world, eid)).toBe(true);
		});

		it('should not start search when disabled', () => {
			attachListBehavior(world, eid, [], { search: false });
			focusList(world, eid);
			expect(startListSearch(world, eid)).toBe(false);
			expect(isListSearching(world, eid)).toBe(false);
		});

		it('should end search mode', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);
			expect(endListSearch(world, eid)).toBe(true);
			expect(isListSearching(world, eid)).toBe(false);
		});

		it('should track search query', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);
			expect(getListSearchQuery(eid)).toBe('');

			setListSearchQuery(world, eid, 'test');
			expect(getListSearchQuery(eid)).toBe('test');
		});

		it('should append to search query', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);

			appendToSearchQuery(world, eid, 't');
			expect(getListSearchQuery(eid)).toBe('t');

			appendToSearchQuery(world, eid, 'e');
			expect(getListSearchQuery(eid)).toBe('te');
		});

		it('should backspace search query', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);
			setListSearchQuery(world, eid, 'test');

			backspaceSearchQuery(world, eid);
			expect(getListSearchQuery(eid)).toBe('tes');
		});

		it('should clear search query', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);
			setListSearchQuery(world, eid, 'test');

			clearSearchQuery(world, eid);
			expect(getListSearchQuery(eid)).toBe('');
		});

		it('should find and select by text', () => {
			const items: ListItem[] = [{ text: 'Apple' }, { text: 'Banana' }, { text: 'Cherry' }];
			attachListBehavior(world, eid, items, { search: true });
			focusList(world, eid);
			startListSearch(world, eid);

			expect(findAndSelectByText(world, eid, 'ban')).toBe(true);
			expect(getSelectedIndex(eid)).toBe(1);
		});

		it('should find next match', () => {
			const items: ListItem[] = [{ text: 'Apple' }, { text: 'Apricot' }, { text: 'Avocado' }];
			attachListBehavior(world, eid, items, { search: true });
			focusList(world, eid);
			startListSearch(world, eid);

			setListSearchQuery(world, eid, 'a');
			setSelectedIndex(world, eid, 0);

			expect(findNextMatch(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(1);

			expect(findNextMatch(world, eid)).toBe(true);
			expect(getSelectedIndex(eid)).toBe(2);
		});

		it('should fire search change callback', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);

			const queries: string[] = [];
			const unsubscribe = onListSearchChange(eid, (query) => queries.push(query));

			setListSearchQuery(world, eid, 'a');
			setListSearchQuery(world, eid, 'ab');
			setListSearchQuery(world, eid, 'abc');

			expect(queries).toEqual(['a', 'ab', 'abc']);
			unsubscribe();
		});

		it('should handle search key press', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);

			const action = handleListKeyPress(world, eid, '/');
			expect(action?.type).toBe('startSearch');
		});

		it('should handle escape in search mode', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);

			const action = handleListKeyPress(world, eid, 'escape');
			expect(action?.type).toBe('endSearch');
		});

		it('should handle character input in search mode', () => {
			attachListBehavior(world, eid, [], { search: true });
			focusList(world, eid);
			startListSearch(world, eid);

			const action = handleListKeyPress(world, eid, 'a');
			expect(action?.type).toBe('searchChar');
			if (action?.type === 'searchChar') {
				expect(action.char).toBe('a');
			}
		});
	});

	describe('Store', () => {
		it('should expose store for external access', () => {
			attachListBehavior(world, eid);
			expect(listStore.isList[eid]).toBe(1);
		});

		it('should reset store', () => {
			attachListBehavior(world, eid);
			expect(listStore.isList[eid]).toBe(1);

			resetListStore();
			expect(listStore.isList[eid]).toBe(0);
		});
	});
});
