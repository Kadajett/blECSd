/**
 * List Widget Tests
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetListStore } from '../components/list';
import type { Entity, World } from '../core/types';
import { createList, isListWidget, type ListWidget } from './list';

describe('List Widget', () => {
	let world: World;
	let eid: Entity;
	let widget: ListWidget;

	beforeEach(() => {
		resetListStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createList', () => {
		it('should create a list widget', () => {
			widget = createList(world, eid, {
				items: ['Item 1', 'Item 2', 'Item 3'],
			});

			expect(widget.eid).toBe(eid);
			expect(isListWidget(world, eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			widget = createList(world, eid);

			expect(widget.getItems()).toEqual([]);
			expect(widget.getSelectedIndex()).toBe(0);
		});

		it('should initialize with provided items', () => {
			widget = createList(world, eid, {
				items: ['A', 'B', 'C'],
			});

			const items = widget.getItems();
			expect(items).toHaveLength(3);
			expect(items[0]?.text).toBe('A');
			expect(items[1]?.text).toBe('B');
			expect(items[2]?.text).toBe('C');
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			widget = createList(world, eid, { items: ['A', 'B'] });
		});

		it('should show the widget', () => {
			const result = widget.hide().show();
			expect(result).toBe(widget);
		});

		it('should hide the widget', () => {
			const result = widget.show().hide();
			expect(result).toBe(widget);
		});
	});

	describe('position', () => {
		beforeEach(() => {
			widget = createList(world, eid, { x: 10, y: 20, items: ['A'] });
		});

		it('should set position', () => {
			const result = widget.setPosition(5, 10);
			expect(result).toBe(widget);
		});

		it('should move by delta', () => {
			const result = widget.move(5, -5);
			expect(result).toBe(widget);
		});
	});

	describe('focus', () => {
		beforeEach(() => {
			widget = createList(world, eid, { items: ['A', 'B'] });
		});

		it('should focus the widget', () => {
			const result = widget.focus();
			expect(result).toBe(widget);
			expect(widget.getState()).toBe('focused');
		});

		it('should blur the widget', () => {
			widget.focus();
			const result = widget.blur();
			expect(result).toBe(widget);
			expect(widget.getState()).toBe('idle');
		});
	});

	describe('items', () => {
		beforeEach(() => {
			widget = createList(world, eid, { items: ['A', 'B', 'C'] });
		});

		it('should set items', () => {
			const result = widget.setItems(['X', 'Y']);
			expect(result).toBe(widget);

			const items = widget.getItems();
			expect(items).toHaveLength(2);
			expect(items[0]?.text).toBe('X');
		});

		it('should add item', () => {
			const result = widget.addItem('D');
			expect(result).toBe(widget);

			const items = widget.getItems();
			expect(items).toHaveLength(4);
			expect(items[3]?.text).toBe('D');
		});

		it('should remove item', () => {
			const result = widget.removeItem(1);
			expect(result).toBe(widget);

			const items = widget.getItems();
			expect(items).toHaveLength(2);
			expect(items[0]?.text).toBe('A');
			expect(items[1]?.text).toBe('C');
		});

		it('should clear items', () => {
			const result = widget.clearItems();
			expect(result).toBe(widget);
			expect(widget.getItems()).toHaveLength(0);
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			widget = createList(world, eid, { items: ['A', 'B', 'C'] });
		});

		it('should select by index', () => {
			const result = widget.select(2);
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(2);
		});

		it('should get selected item', () => {
			widget.select(1);
			const item = widget.getSelectedItem();
			expect(item?.text).toBe('B');
		});

		it('should select previous', () => {
			widget.select(2);
			const result = widget.selectPrev();
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should select next', () => {
			widget.select(0);
			const result = widget.selectNext();
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should select first', () => {
			widget.select(2);
			const result = widget.selectFirst();
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(0);
		});

		it('should select last', () => {
			widget.select(0);
			const result = widget.selectLast();
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(2);
		});
	});

	describe('scrolling', () => {
		beforeEach(() => {
			widget = createList(world, eid, {
				items: ['A', 'B', 'C', 'D', 'E', 'F'],
				height: 3,
			});
		});

		it('should page down', () => {
			const result = widget.pageDown();
			expect(result).toBe(widget);
		});

		it('should page up', () => {
			widget.pageDown();
			const result = widget.pageUp();
			expect(result).toBe(widget);
		});
	});

	describe('search', () => {
		beforeEach(() => {
			widget = createList(world, eid, {
				items: ['Apple', 'Banana', 'Cherry'],
				search: true,
			});
			widget.focus();
		});

		it('should start search', () => {
			const result = widget.startSearch();
			expect(result).toBe(widget);
			expect(widget.isSearching()).toBe(true);
		});

		it('should end search', () => {
			widget.startSearch();
			const result = widget.endSearch();
			expect(result).toBe(widget);
			expect(widget.isSearching()).toBe(false);
		});

		it('should track search query', () => {
			widget.startSearch();
			expect(widget.getSearchQuery()).toBe('');
		});
	});

	describe('events', () => {
		beforeEach(() => {
			widget = createList(world, eid, { items: ['A', 'B', 'C'] });
		});

		it('should fire select callback', () => {
			const callback = vi.fn();
			widget.onSelect(callback);

			widget.select(1);
			expect(callback).toHaveBeenCalledWith(1, expect.objectContaining({ text: 'B' }));
		});

		it('should fire activate callback', () => {
			const callback = vi.fn();
			widget.onActivate(callback);

			widget.select(1);
			widget.activate();
			expect(callback).toHaveBeenCalledWith(1, expect.objectContaining({ text: 'B' }));
		});

		it('should fire search change callback', () => {
			widget = createList(world, eid, { items: ['A', 'B'], search: true });
			const callback = vi.fn();
			widget.onSearchChange(callback);
			widget.focus();
			widget.startSearch();

			widget.handleKey('a');
			expect(callback).toHaveBeenCalledWith('a');
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			widget = createList(world, eid, { items: ['A', 'B', 'C'] });
		});

		it('should handle down key', () => {
			widget.select(0);
			const action = widget.handleKey('down');
			expect(action?.type).toBe('selectNext');
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should handle up key', () => {
			widget.select(2);
			const action = widget.handleKey('up');
			expect(action?.type).toBe('selectPrev');
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should handle enter key', () => {
			const callback = vi.fn();
			widget.onActivate(callback);

			widget.select(1);
			const action = widget.handleKey('enter');
			expect(action?.type).toBe('confirm');
			expect(callback).toHaveBeenCalled();
		});

		it('should handle / key for search', () => {
			widget = createList(world, eid, { items: ['A'], search: true });
			widget.focus();
			const action = widget.handleKey('/');
			expect(action?.type).toBe('startSearch');
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			widget = createList(world, eid, { items: ['A', 'B'] });
			expect(isListWidget(world, eid)).toBe(true);

			widget.destroy();
			expect(isListWidget(world, eid)).toBe(false);
		});
	});
});
