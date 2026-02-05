/**
 * ListTable Widget Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetListStore } from '../components/list';
import { resetTableStore } from '../components/table';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { createListTable, isListTableWidget, type ListTableWidget } from './listTable';

describe('ListTable Widget', () => {
	let world: World;
	let eid: Entity;
	let widget: ListTableWidget;

	beforeEach(() => {
		resetListStore();
		resetTableStore();
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createListTable', () => {
		it('should create a list table widget', () => {
			widget = createListTable(world, eid, {
				data: [
					['Name', 'Age'],
					['Alice', '30'],
					['Bob', '25'],
				],
				headerRows: 1,
			});

			expect(widget.eid).toBe(eid);
			expect(isListTableWidget(world, eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			widget = createListTable(world, eid);

			expect(widget.getData()).toEqual([]);
			expect(widget.getRowCount()).toBe(0);
			expect(widget.getCellPadding()).toBe(1);
			expect(widget.getHeaderRowCount()).toBe(1);
		});

		it('should initialize with provided data', () => {
			widget = createListTable(world, eid, {
				data: [
					['Name', 'Age'],
					['Alice', '30'],
					['Bob', '25'],
				],
				headerRows: 1,
			});

			expect(widget.getRowCount()).toBe(3);
			expect(widget.getDataRowCount()).toBe(2);
			expect(widget.getColCount()).toBe(2);
			expect(widget.getCellValue(0, 0)).toBe('Name');
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [['A'], ['B']],
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
			widget = createListTable(world, eid, {
				x: 10,
				y: 20,
				data: [['A'], ['B']],
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
			widget = createListTable(world, eid, {
				data: [['Header'], ['Item1'], ['Item2']],
				headerRows: 1,
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

	describe('data', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
					['E', 'F'],
				],
				headerRows: 1,
			});
		});

		it('should set data', () => {
			const result = widget.setData([
				['X', 'Y', 'Z'],
				['1', '2', '3'],
			]);
			expect(result).toBe(widget);
			expect(widget.getRowCount()).toBe(2);
			expect(widget.getColCount()).toBe(3);
		});

		it('should get data as strings', () => {
			const data = widget.getData();
			expect(data).toEqual([
				['A', 'B'],
				['C', 'D'],
				['E', 'F'],
			]);
		});

		it('should get full data with metadata', () => {
			const fullData = widget.getFullData();
			expect(fullData).toHaveLength(3);
			expect(fullData[0]?.[0]?.value).toBe('A');
		});

		it('should clear data', () => {
			const result = widget.clearData();
			expect(result).toBe(widget);
			expect(widget.getRowCount()).toBe(0);
		});
	});

	describe('cells', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
					['E', 'F'],
				],
				headerRows: 1,
			});
		});

		it('should set cell value', () => {
			const result = widget.setCell(1, 0, 'NEW');
			expect(result).toBe(widget);
			expect(widget.getCellValue(1, 0)).toBe('NEW');
		});

		it('should get cell', () => {
			const cell = widget.getCell(1, 1);
			expect(cell?.value).toBe('D');
		});

		it('should get cell value', () => {
			const value = widget.getCellValue(2, 0);
			expect(value).toBe('E');
		});

		it('should return undefined for out of bounds', () => {
			expect(widget.getCell(10, 10)).toBeUndefined();
			expect(widget.getCellValue(10, 10)).toBeUndefined();
		});
	});

	describe('rows', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [
					['Header1', 'Header2'],
					['A', 'B'],
					['C', 'D'],
				],
				headerRows: 1,
			});
		});

		it('should get row', () => {
			const row = widget.getRow(1);
			expect(row).toHaveLength(2);
			expect(row?.[0]?.value).toBe('A');
		});

		it('should get row count', () => {
			expect(widget.getRowCount()).toBe(3);
		});

		it('should get data row count', () => {
			expect(widget.getDataRowCount()).toBe(2);
		});
	});

	describe('columns', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [
					['Name', 'Age'],
					['Alice', '30'],
				],
			});
		});

		it('should set columns', () => {
			const result = widget.setColumns([
				{ header: 'Name', width: 20 },
				{ header: 'Age', width: 5, align: 'right' },
			]);
			expect(result).toBe(widget);

			const columns = widget.getColumns();
			expect(columns).toHaveLength(2);
			expect(columns[0]?.width).toBe(20);
		});

		it('should get column count', () => {
			expect(widget.getColCount()).toBe(2);
		});
	});

	describe('headers', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [
					['Header1', 'Header2'],
					['Data1', 'Data2'],
					['Data3', 'Data4'],
				],
				headerRows: 1,
			});
		});

		it('should set header row count', () => {
			const result = widget.setHeaderRowCount(2);
			expect(result).toBe(widget);
			expect(widget.getHeaderRowCount()).toBe(2);
		});

		it('should get header rows', () => {
			const headers = widget.getHeaderRows();
			expect(headers).toHaveLength(1);
			expect(headers[0]?.[0]?.value).toBe('Header1');
		});

		it('should get data rows', () => {
			const dataRows = widget.getDataRows();
			expect(dataRows).toHaveLength(2);
			expect(dataRows[0]?.[0]?.value).toBe('Data1');
		});
	});

	describe('display', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, { data: [['A'], ['B']] });
		});

		it('should set and get cell padding', () => {
			const result = widget.setCellPadding(3);
			expect(result).toBe(widget);
			expect(widget.getCellPadding()).toBe(3);
		});

		it('should set and get cell borders', () => {
			expect(widget.hasCellBorders()).toBe(true); // default is true

			const result = widget.setCellBorders(false);
			expect(result).toBe(widget);
			expect(widget.hasCellBorders()).toBe(false);
		});

		it('should set style', () => {
			const result = widget.setStyle({
				header: { fg: 0xffffffff, bg: 0x333333ff },
				cell: { fg: 0xccccccff },
				selected: { fg: 0x000000ff, bg: 0x00ffffff },
			});
			expect(result).toBe(widget);

			const display = widget.getDisplay();
			expect(display.headerFg).toBe(0xffffffff);
			expect(display.cellFg).toBe(0xccccccff);
			expect(display.selectedFg).toBe(0x000000ff);
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [['Header'], ['Item1'], ['Item2'], ['Item3']],
				headerRows: 1,
			});
		});

		it('should select by index', () => {
			const result = widget.select(1);
			expect(result).toBe(widget);
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should get selected row', () => {
			widget.select(0);
			const row = widget.getSelectedRow();
			expect(row).toBeDefined();
			expect(row?.[0]?.value).toBe('Item1');
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
			expect(widget.getSelectedIndex()).toBe(2); // 3 data rows - 1
		});
	});

	describe('scrolling', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [['Header'], ['Item1'], ['Item2'], ['Item3'], ['Item4'], ['Item5']],
				headerRows: 1,
				height: 3,
			});
		});

		it('should page up', () => {
			widget.selectLast();
			const result = widget.pageUp();
			expect(result).toBe(widget);
		});

		it('should page down', () => {
			widget.selectFirst();
			const result = widget.pageDown();
			expect(result).toBe(widget);
		});
	});

	describe('search', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [['Name'], ['Alice'], ['Bob'], ['Carol']],
				headerRows: 1,
				search: true,
			});
		});

		it('should start search', () => {
			widget.focus();
			const result = widget.startSearch();
			expect(result).toBe(widget);
			expect(widget.isSearching()).toBe(true);
		});

		it('should end search', () => {
			widget.focus().startSearch();
			const result = widget.endSearch();
			expect(result).toBe(widget);
			expect(widget.isSearching()).toBe(false);
		});

		it('should get search query', () => {
			expect(widget.getSearchQuery()).toBe('');
		});
	});

	describe('events', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [['Header'], ['Item1'], ['Item2']],
				headerRows: 1,
			});
		});

		it('should register select callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onSelect(callback);

			widget.focus().selectNext();

			expect(callback).toHaveBeenCalled();

			unsubscribe();
		});

		it('should register activate callback', () => {
			const callback = vi.fn();
			const unsubscribe = widget.onActivate(callback);

			widget.focus().activate();

			expect(callback).toHaveBeenCalled();

			unsubscribe();
		});

		it('should register search change callback', () => {
			const callback = vi.fn();
			widget = createListTable(world, eid, {
				data: [['H'], ['A'], ['B']],
				headerRows: 1,
				search: true,
			});
			const unsubscribe = widget.onSearchChange(callback);

			widget.focus().startSearch();
			widget.handleKey('a');

			expect(callback).toHaveBeenCalled();

			unsubscribe();
		});
	});

	describe('key handling', () => {
		beforeEach(() => {
			widget = createListTable(world, eid, {
				data: [['Header'], ['Item1'], ['Item2'], ['Item3']],
				headerRows: 1,
			});
			widget.focus();
		});

		it('should handle down key', () => {
			widget.select(0);
			const action = widget.handleKey('down');
			expect(action?.type).toBe('selectNext');
			expect(widget.getSelectedIndex()).toBe(1);
		});

		it('should handle up key', () => {
			widget.select(1);
			const action = widget.handleKey('up');
			expect(action?.type).toBe('selectPrev');
			expect(widget.getSelectedIndex()).toBe(0);
		});

		it('should handle enter key', () => {
			const callback = vi.fn();
			widget.onActivate(callback);
			widget.select(0);

			const action = widget.handleKey('enter');
			expect(action?.type).toBe('confirm');
			expect(callback).toHaveBeenCalled();
		});

		it('should handle g key for first', () => {
			widget.select(2);
			const action = widget.handleKey('g');
			expect(action?.type).toBe('selectFirst');
			expect(widget.getSelectedIndex()).toBe(0);
		});

		it('should handle G key for last', () => {
			widget.select(0);
			const action = widget.handleKey('G');
			expect(action?.type).toBe('selectLast');
			expect(widget.getSelectedIndex()).toBe(2);
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			widget = createListTable(world, eid, {
				data: [['A'], ['B']],
			});
			expect(isListTableWidget(world, eid)).toBe(true);

			widget.destroy();
			expect(isListTableWidget(world, eid)).toBe(false);
		});
	});
});
