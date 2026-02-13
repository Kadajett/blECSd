/**
 * MultiSelect Widget Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	createMultiSelect,
	getSelectedItems,
	isMultiSelect,
	type MultiSelectWidget,
	onSelectionChange,
	resetMultiSelectStore,
} from './multiSelect';

describe('MultiSelect Widget', () => {
	let world: World;
	let eid: Entity;
	let ms: MultiSelectWidget;

	const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

	beforeEach(() => {
		resetMultiSelectStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createMultiSelect', () => {
		it('should create a multi-select widget', () => {
			ms = createMultiSelect(world, { items });

			expect(ms.eid).toBeDefined();
			expect(isMultiSelect(world, ms.eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			ms = createMultiSelect(world);

			expect(ms.getItems()).toEqual([]);
			expect(ms.getSelectedCount()).toBe(0);
			expect(ms.getCursorIndex()).toBe(-1);
		});

		it('should initialize with provided items', () => {
			ms = createMultiSelect(world, { items });

			const allItems = ms.getItems();
			expect(allItems).toHaveLength(5);
			expect(allItems[0]?.text).toBe('Apple');
			expect(allItems[4]?.text).toBe('Elderberry');
		});

		it('should initialize with pre-selected items', () => {
			ms = createMultiSelect(world, { items, selected: [0, 2] });

			expect(ms.getSelectedCount()).toBe(2);
			expect(ms.isSelected(0)).toBe(true);
			expect(ms.isSelected(1)).toBe(false);
			expect(ms.isSelected(2)).toBe(true);
		});

		it('should accept MultiSelectItem objects', () => {
			ms = createMultiSelect(world, {
				items: [
					{ text: 'A', value: 'val-a' },
					{ text: 'B', value: 'val-b', disabled: true },
				],
			});

			const allItems = ms.getItems();
			expect(allItems).toHaveLength(2);
			expect(allItems[0]?.value).toBe('val-a');
			expect(allItems[1]?.disabled).toBe(true);
		});

		it('should not pre-select disabled items', () => {
			ms = createMultiSelect(world, {
				items: [{ text: 'A' }, { text: 'B', disabled: true }],
				selected: [0, 1],
			});

			expect(ms.getSelectedCount()).toBe(1);
			expect(ms.isSelected(0)).toBe(true);
			expect(ms.isSelected(1)).toBe(false);
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should show the widget', () => {
			const result = ms.hide().show();
			expect(result).toBe(ms);
		});

		it('should hide the widget', () => {
			const result = ms.show().hide();
			expect(result).toBe(ms);
		});
	});

	describe('focus', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should focus the widget', () => {
			const result = ms.focus();
			expect(result).toBe(ms);
			expect(ms.isFocused()).toBe(true);
		});

		it('should blur the widget', () => {
			ms.focus();
			const result = ms.blur();
			expect(result).toBe(ms);
			expect(ms.isFocused()).toBe(false);
		});
	});

	describe('cursor navigation', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should start at index 0', () => {
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should move cursor down', () => {
			ms.cursorDown();
			expect(ms.getCursorIndex()).toBe(1);
		});

		it('should move cursor up', () => {
			ms.cursorDown().cursorDown();
			ms.cursorUp();
			expect(ms.getCursorIndex()).toBe(1);
		});

		it('should not go below 0', () => {
			ms.cursorUp();
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should not go past last item', () => {
			for (let i = 0; i < 10; i++) {
				ms.cursorDown();
			}
			expect(ms.getCursorIndex()).toBe(4);
		});

		it('should jump to first item', () => {
			ms.cursorDown().cursorDown();
			ms.cursorFirst();
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should jump to last item', () => {
			ms.cursorLast();
			expect(ms.getCursorIndex()).toBe(4);
		});

		it('should select by index', () => {
			ms.select(3);
			expect(ms.getCursorIndex()).toBe(3);
		});

		it('should page up and down', () => {
			ms = createMultiSelect(world, {
				items: Array.from({ length: 20 }, (_, i) => `Item ${i}`),
				height: 5,
			});

			ms.pageDown();
			expect(ms.getCursorIndex()).toBeGreaterThan(0);

			ms.pageUp();
			expect(ms.getCursorIndex()).toBe(0);
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should toggle current item', () => {
			ms.select(0);
			ms.toggleCurrent();
			expect(ms.isSelected(0)).toBe(true);

			ms.toggleCurrent();
			expect(ms.isSelected(0)).toBe(false);
		});

		it('should toggle specific item by index', () => {
			ms.toggleItem(2);
			expect(ms.isSelected(2)).toBe(true);

			ms.toggleItem(2);
			expect(ms.isSelected(2)).toBe(false);
		});

		it('should not toggle disabled items', () => {
			ms = createMultiSelect(world, {
				items: [{ text: 'A' }, { text: 'B', disabled: true }],
			});

			ms.select(1).toggleCurrent();
			expect(ms.isSelected(1)).toBe(false);
		});

		it('should select all items', () => {
			ms.selectAll();
			expect(ms.getSelectedCount()).toBe(5);
		});

		it('should not select disabled items when selecting all', () => {
			ms = createMultiSelect(world, {
				items: [{ text: 'A' }, { text: 'B', disabled: true }, { text: 'C' }],
			});

			ms.selectAll();
			expect(ms.getSelectedCount()).toBe(2);
			expect(ms.isSelected(1)).toBe(false);
		});

		it('should deselect all items', () => {
			ms.selectAll();
			ms.deselectAll();
			expect(ms.getSelectedCount()).toBe(0);
		});

		it('should get selected indices sorted', () => {
			ms.toggleItem(3);
			ms.toggleItem(1);
			ms.toggleItem(4);

			const indices = ms.getSelectedIndices();
			expect(indices).toEqual([1, 3, 4]);
		});

		it('should get selected items', () => {
			ms.toggleItem(0);
			ms.toggleItem(2);

			const selectedItems = ms.getSelectedItems();
			expect(selectedItems).toHaveLength(2);
			expect(selectedItems[0]?.text).toBe('Apple');
			expect(selectedItems[1]?.text).toBe('Cherry');
		});

		it('should report selection status', () => {
			expect(ms.getSelectionStatus()).toBe('None selected');

			ms.toggleItem(0);
			expect(ms.getSelectionStatus()).toBe('1 selected');

			ms.toggleItem(1);
			expect(ms.getSelectionStatus()).toBe('2 selected');
		});
	});

	describe('range selection', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should range select from anchor to target', () => {
			ms.select(1); // Sets anchor at 1
			ms.rangeSelectTo(3);

			expect(ms.isSelected(1)).toBe(true);
			expect(ms.isSelected(2)).toBe(true);
			expect(ms.isSelected(3)).toBe(true);
			expect(ms.isSelected(0)).toBe(false);
			expect(ms.isSelected(4)).toBe(false);
		});

		it('should range select backward', () => {
			ms.select(3); // Sets anchor at 3
			ms.rangeSelectTo(1);

			expect(ms.isSelected(1)).toBe(true);
			expect(ms.isSelected(2)).toBe(true);
			expect(ms.isSelected(3)).toBe(true);
		});

		it('should skip disabled items in range', () => {
			ms = createMultiSelect(world, {
				items: [{ text: 'A' }, { text: 'B', disabled: true }, { text: 'C' }, { text: 'D' }],
			});

			ms.select(0);
			ms.rangeSelectTo(3);

			expect(ms.isSelected(0)).toBe(true);
			expect(ms.isSelected(1)).toBe(false); // disabled
			expect(ms.isSelected(2)).toBe(true);
			expect(ms.isSelected(3)).toBe(true);
		});
	});

	describe('filter-as-you-type', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items, filterable: true });
		});

		it('should filter items', () => {
			ms.setFilter('ber');

			const visible = ms.getVisibleItems();
			expect(visible.length).toBeGreaterThanOrEqual(1);
			expect(visible.some((i) => i.text === 'Elderberry')).toBe(true);
		});

		it('should filter case-insensitively', () => {
			ms.setFilter('APPLE');

			const visible = ms.getVisibleItems();
			expect(visible).toHaveLength(1);
			expect(visible[0]?.text).toBe('Apple');
		});

		it('should clear filter', () => {
			ms.setFilter('xyz');
			ms.clearFilter();

			const visible = ms.getVisibleItems();
			expect(visible).toHaveLength(5);
		});

		it('should get filter query', () => {
			ms.setFilter('test');
			expect(ms.getFilter()).toBe('test');
		});

		it('should preserve selections across filter changes', () => {
			ms.toggleItem(0); // Select Apple
			ms.toggleItem(2); // Select Cherry

			ms.setFilter('Ch'); // Only Cherry visible
			expect(ms.getSelectedCount()).toBe(2); // Both still selected

			ms.clearFilter();
			expect(ms.isSelected(0)).toBe(true);
			expect(ms.isSelected(2)).toBe(true);
		});

		it('should clamp cursor on filter', () => {
			ms.select(4); // Last item
			ms.setFilter('Apple'); // Only 1 item visible
			expect(ms.getCursorIndex()).toBe(0);
		});
	});

	describe('render lines', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items: ['A', 'B', 'C'], width: 20 });
		});

		it('should render lines with checkboxes', () => {
			const lines = ms.getRenderLines();
			expect(lines).toHaveLength(3);
			expect(lines[0]).toContain('[ ]');
			expect(lines[0]).toContain('A');
		});

		it('should show checked items', () => {
			ms.toggleItem(1);
			const lines = ms.getRenderLines();
			expect(lines[1]).toContain('[x]');
		});

		it('should show cursor indicator', () => {
			ms.select(0);
			const lines = ms.getRenderLines();
			expect(lines[0]).toMatch(/^>/);
			expect(lines[1]).toMatch(/^ /);
		});

		it('should truncate long text', () => {
			ms = createMultiSelect(world, {
				items: ['This is a very long item name that should be truncated'],
				width: 20,
			});

			const lines = ms.getRenderLines();
			expect(lines[0]).toBeDefined();
			expect((lines[0] as string).length).toBeLessThanOrEqual(20);
		});
	});

	describe('events', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should fire selection change callback', () => {
			const callback = vi.fn();
			ms.onSelectionChange(callback);

			ms.toggleItem(0);
			expect(callback).toHaveBeenCalledWith([0], expect.any(Array));
		});

		it('should fire on select all', () => {
			const callback = vi.fn();
			ms.onSelectionChange(callback);

			ms.selectAll();
			expect(callback).toHaveBeenCalled();
			const [indices] = callback.mock.calls[0] as [number[], unknown];
			expect(indices).toHaveLength(5);
		});

		it('should fire on deselect all', () => {
			ms.selectAll();
			const callback = vi.fn();
			ms.onSelectionChange(callback);

			ms.deselectAll();
			expect(callback).toHaveBeenCalledWith([], []);
		});

		it('should unsubscribe callback', () => {
			const callback = vi.fn();
			const unsub = ms.onSelectionChange(callback);

			unsub();
			ms.toggleItem(0);
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should handle down arrow', () => {
			ms.handleKey('down');
			expect(ms.getCursorIndex()).toBe(1);
		});

		it('should handle up arrow', () => {
			ms.handleKey('down');
			ms.handleKey('up');
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should handle j/k vim keys', () => {
			ms.handleKey('j');
			expect(ms.getCursorIndex()).toBe(1);
			ms.handleKey('k');
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should handle space to toggle', () => {
			ms.handleKey(' ');
			expect(ms.isSelected(0)).toBe(true);
		});

		it('should handle Ctrl+A to select all', () => {
			ms.handleKey('a', true);
			expect(ms.getSelectedCount()).toBe(5);
		});

		it('should handle Ctrl+A to deselect all when all selected', () => {
			ms.selectAll();
			ms.handleKey('a', true);
			expect(ms.getSelectedCount()).toBe(0);
		});

		it('should handle Shift+Down for range select', () => {
			ms.handleKey('down', false, true);
			expect(ms.isSelected(0)).toBe(true);
			expect(ms.isSelected(1)).toBe(true);
		});

		it('should handle Shift+Up for range select', () => {
			ms.select(2);
			ms.handleKey('up', false, true);
			expect(ms.isSelected(1)).toBe(true);
			expect(ms.isSelected(2)).toBe(true);
		});

		it('should handle home/end keys', () => {
			ms.handleKey('end');
			expect(ms.getCursorIndex()).toBe(4);
			ms.handleKey('home');
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should handle g/G vim keys', () => {
			ms.handleKey('G');
			expect(ms.getCursorIndex()).toBe(4);
			ms.handleKey('g');
			expect(ms.getCursorIndex()).toBe(0);
		});

		it('should handle escape to clear filter first', () => {
			ms.setFilter('test');
			ms.handleKey('escape');
			expect(ms.getFilter()).toBe('');
			expect(ms.isFocused()).toBe(false); // Not blurred yet

			ms.focus();
			ms.handleKey('escape');
			expect(ms.isFocused()).toBe(false);
		});

		it('should handle typing for filter', () => {
			ms.handleKey('a');
			expect(ms.getFilter()).toBe('a');
		});

		it('should handle backspace for filter', () => {
			ms.setFilter('abc');
			ms.handleKey('backspace');
			expect(ms.getFilter()).toBe('ab');
		});

		it('should return false for unhandled keys', () => {
			const result = ms.handleKey('f5');
			expect(result).toBe(false);
		});
	});

	describe('standalone API functions', () => {
		it('should get selected items via getSelectedItems', () => {
			ms = createMultiSelect(world, { items });
			ms.toggleItem(0);
			ms.toggleItem(2);

			const selected = getSelectedItems(world, ms.eid);
			expect(selected).toHaveLength(2);
			expect(selected[0]?.text).toBe('Apple');
		});

		it('should return empty for non-existent entity', () => {
			const selected = getSelectedItems(world, eid);
			expect(selected).toEqual([]);
		});

		it('should register via onSelectionChange', () => {
			ms = createMultiSelect(world, { items });
			const callback = vi.fn();

			onSelectionChange(world, ms.eid, callback);
			ms.toggleItem(0);
			expect(callback).toHaveBeenCalled();
		});

		it('should return no-op unsub for non-existent entity', () => {
			const unsub = onSelectionChange(world, eid, vi.fn());
			expect(() => unsub()).not.toThrow();
		});
	});

	describe('item management', () => {
		beforeEach(() => {
			ms = createMultiSelect(world, { items });
		});

		it('should set new items', () => {
			ms.setItems(['X', 'Y', 'Z']);
			expect(ms.getItems()).toHaveLength(3);
			expect(ms.getItems()[0]?.text).toBe('X');
		});

		it('should clear out-of-bounds selections on item change', () => {
			ms.toggleItem(4); // Select last item
			ms.setItems(['A', 'B']); // Now only 2 items
			expect(ms.isSelected(4)).toBe(false);
		});

		it('should clamp cursor on item change', () => {
			ms.select(4);
			ms.setItems(['A', 'B']);
			expect(ms.getCursorIndex()).toBeLessThanOrEqual(1);
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			ms = createMultiSelect(world, { items });
			const msEid = ms.eid;

			expect(isMultiSelect(world, msEid)).toBe(true);

			ms.destroy();
			expect(isMultiSelect(world, msEid)).toBe(false);
		});
	});
});
