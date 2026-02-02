/**
 * Listbar Widget Tests
 */

import { addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, World } from '../core/types';
import {
	createListbar,
	isListbarWidget,
	type ListbarItem,
	type ListbarWidget,
	resetListbarStore,
} from './listbar';

describe('Listbar Widget', () => {
	let world: World;
	let eid: Entity;
	let widget: ListbarWidget;

	beforeEach(() => {
		resetListbarStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createListbar', () => {
		it('should create a listbar widget', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'File' }, { text: 'Edit' }],
			});

			expect(widget.eid).toBe(eid);
			expect(isListbarWidget(world, eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			widget = createListbar(world, eid);

			expect(widget.getItems()).toEqual([]);
			expect(widget.getItemCount()).toBe(0);
			expect(widget.getSelectedIndex()).toBe(-1);
		});

		it('should initialize with provided items', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'File' }, { text: 'Edit' }, { text: 'View' }],
			});

			expect(widget.getItemCount()).toBe(3);
			expect(widget.getSelectedIndex()).toBe(0);
			expect(widget.getSelectedItem()?.text).toBe('File');
		});

		it('should set initial selected index', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
				selected: 1,
			});

			expect(widget.getSelectedIndex()).toBe(1);
			expect(widget.getSelectedItem()?.text).toBe('B');
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }],
			});
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
			widget = createListbar(world, eid, {
				x: 10,
				y: 20,
				items: [{ text: 'A' }],
			});
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
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }],
			});
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
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }],
			});
		});

		it('should set items', () => {
			const result = widget.setItems([{ text: 'X' }, { text: 'Y' }, { text: 'Z' }]);
			expect(result).toBe(widget);
			expect(widget.getItemCount()).toBe(3);
		});

		it('should get items', () => {
			const items = widget.getItems();
			expect(items).toHaveLength(2);
			expect(items[0]?.text).toBe('A');
		});

		it('should add item', () => {
			const result = widget.addItem({ text: 'C' });
			expect(result).toBe(widget);
			expect(widget.getItemCount()).toBe(3);
		});

		it('should remove item', () => {
			const result = widget.removeItem(0);
			expect(result).toBe(widget);
			expect(widget.getItemCount()).toBe(1);
			expect(widget.getItems()[0]?.text).toBe('B');
		});

		it('should adjust selection when removing before selected', () => {
			widget.select(1);
			widget.removeItem(0);
			expect(widget.getSelectedIndex()).toBe(0);
			expect(widget.getSelectedItem()?.text).toBe('B');
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
			});
		});

		it('should select by index', () => {
			const result = widget.select(1);
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should get selected item', () => {
			widget.select(2);
			const item = widget.getSelectedItem();
			expect(item?.text).toBe('C');
		});

		it('should select previous with wrap', () => {
			widget.select(0);
			const result = widget.selectPrev();
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(2); // wraps to end
		});

		it('should select next with wrap', () => {
			widget.select(2);
			const result = widget.selectNext();
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(0); // wraps to start
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

		it('should ignore out of bounds selection', () => {
			widget.select(0);
			widget.select(100);
			expect(widget.getSelectedIndex()).toBe(0);
		});
	});

	describe('selectByKey', () => {
		it('should select by custom key', () => {
			widget = createListbar(world, eid, {
				items: [
					{ text: 'File', key: 'f' },
					{ text: 'Edit', key: 'e' },
					{ text: 'View', key: 'v' },
				],
			});

			const found = widget.selectByKey('e');
			expect(found).toBe(true);
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should be case insensitive', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'File', key: 'F' }],
			});

			const found = widget.selectByKey('f');
			expect(found).toBe(true);
		});

		it('should select by auto command key (1-9)', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
				autoCommandKeys: true,
			});

			const found = widget.selectByKey('2');
			expect(found).toBe(true);
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should not use auto keys if disabled', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }],
				autoCommandKeys: false,
			});

			const found = widget.selectByKey('1');
			expect(found).toBe(false);
		});

		it('should return false for unknown key', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }],
			});

			const found = widget.selectByKey('x');
			expect(found).toBe(false);
		});
	});

	describe('events', () => {
		beforeEach(() => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }],
			});
		});

		it('should register select callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onSelect(callback);

			widget.select(1);

			expect(callback).toHaveBeenCalledWith(1, { text: 'B' });

			unsubscribe();
		});

		it('should register activate callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onActivate(callback);

			widget.select(0);
			widget.activate();

			expect(callback).toHaveBeenCalledWith(0, { text: 'A' });

			unsubscribe();
		});

		it('should call item callback on activate', () => {
			const itemCallback = vi.fn();
			widget = createListbar(world, eid, {
				items: [{ text: 'Action', callback: itemCallback }],
			});

			widget.activate();

			expect(itemCallback).toHaveBeenCalled();
		});

		it('should unsubscribe callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onSelect(callback);
			unsubscribe();

			widget.select(1);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
			});
			widget.focus();
		});

		it('should handle right key', () => {
			widget.select(0);
			const action = widget.handleKey('right');
			expect(action?.type).toBe('selectNext');
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should handle left key', () => {
			widget.select(1);
			const action = widget.handleKey('left');
			expect(action?.type).toBe('selectPrev');
			expect(widget.getSelectedIndex()).toBe(0);
		});

		it('should handle l key', () => {
			widget.select(0);
			const action = widget.handleKey('l');
			expect(action?.type).toBe('selectNext');
		});

		it('should handle h key', () => {
			widget.select(1);
			const action = widget.handleKey('h');
			expect(action?.type).toBe('selectPrev');
		});

		it('should handle home key', () => {
			widget.select(2);
			const action = widget.handleKey('home');
			expect(action?.type).toBe('selectFirst');
			expect(widget.getSelectedIndex()).toBe(0);
		});

		it('should handle end key', () => {
			widget.select(0);
			const action = widget.handleKey('end');
			expect(action?.type).toBe('selectLast');
			expect(widget.getSelectedIndex()).toBe(2);
		});

		it('should handle enter key', () => {
			const callback = vi.fn();
			widget.onActivate(callback);
			widget.select(0);

			const action = widget.handleKey('enter');
			expect(action?.type).toBe('confirm');
			expect(callback).toHaveBeenCalled();
		});

		it('should handle space key', () => {
			const callback = vi.fn();
			widget.onActivate(callback);

			const action = widget.handleKey(' ');
			expect(action?.type).toBe('confirm');
		});

		it('should handle escape key', () => {
			const action = widget.handleKey('escape');
			expect(action?.type).toBe('cancel');
			expect(widget.getState()).toBe('idle');
		});

		it('should handle number keys with autoCommandKeys', () => {
			const action = widget.handleKey('2');
			expect(action?.type).toBe('selectByKey');
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should not respond when blurred', () => {
			widget.blur();
			const action = widget.handleKey('right');
			expect(action).toBeNull();
		});

		it('should not respond when keys disabled', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }],
				keys: false,
			});
			widget.focus();

			const action = widget.handleKey('right');
			expect(action).toBeNull();
		});
	});

	describe('display', () => {
		beforeEach(() => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }, { text: 'B' }],
			});
		});

		it('should set style', () => {
			const result = widget.setStyle({
				selected: { fg: 0xffffffff, bg: 0x333333ff },
			});
			expect(result).toBe(widget);
		});

		it('should get and set separator', () => {
			expect(widget.getSeparator()).toBe(' | ');

			widget.setSeparator(' - ');
			expect(widget.getSeparator()).toBe(' - ');
		});
	});

	describe('rendering', () => {
		it('should render items with separator', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'File' }, { text: 'Edit' }],
				autoCommandKeys: false,
			});
			widget.select(0);

			const line = widget.renderLine();
			expect(line).toContain('File');
			expect(line).toContain('Edit');
			expect(line).toContain('|');
		});

		it('should render with custom keys', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'File', key: 'f' }, { text: 'Edit', key: 'e' }],
			});

			const line = widget.renderLine();
			expect(line).toContain('[f]File');
			expect(line).toContain('[e]Edit');
		});

		it('should render with auto command keys', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'File' }, { text: 'Edit' }],
				autoCommandKeys: true,
			});

			const line = widget.renderLine();
			expect(line).toContain('[1]File');
			expect(line).toContain('[2]Edit');
		});

		it('should calculate width', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'ABC' }, { text: 'DEF' }],
				autoCommandKeys: false,
			});

			const width = widget.calculateWidth();
			// "ABC" + " | " + "DEF" = 3 + 3 + 3 = 9
			expect(width).toBe(9);
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			widget = createListbar(world, eid, {
				items: [{ text: 'A' }],
			});
			expect(isListbarWidget(world, eid)).toBe(true);

			widget.destroy();
			expect(isListbarWidget(world, eid)).toBe(false);
		});
	});
});
