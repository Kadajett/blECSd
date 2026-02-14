/**
 * Table Widget Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { resetTableStore } from '../systems/tableSystem';
import { createTable, isTableWidget, type TableWidget } from './table';

describe('Table Widget', () => {
	let world: World;
	let eid: Entity;
	let widget: TableWidget;

	beforeEach(() => {
		resetTableStore(world);
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('createTable', () => {
		it('should create a table widget', () => {
			widget = createTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
				],
			});

			expect(widget.eid).toBe(eid);
			expect(isTableWidget(world, eid)).toBe(true);
		});

		it('should initialize with default values', () => {
			widget = createTable(world, eid);

			expect(widget.getData()).toEqual([]);
			expect(widget.getRowCount()).toBe(0);
			expect(widget.getCellPadding()).toBe(1);
		});

		it('should initialize with provided data', () => {
			widget = createTable(world, eid, {
				data: [
					['Name', 'Age'],
					['Alice', '30'],
				],
			});

			expect(widget.getRowCount()).toBe(2);
			expect(widget.getColCount()).toBe(2);
			expect(widget.getCellValue(0, 0)).toBe('Name');
		});
	});

	describe('visibility', () => {
		beforeEach(() => {
			widget = createTable(world, eid, { data: [['A']] });
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
			widget = createTable(world, eid, { x: 10, y: 20, data: [['A']] });
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

	describe('data', () => {
		beforeEach(() => {
			widget = createTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
				],
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
			]);
		});

		it('should get full data with metadata', () => {
			const fullData = widget.getFullData();
			expect(fullData).toHaveLength(2);
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
			widget = createTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
				],
			});
		});

		it('should set cell value', () => {
			const result = widget.setCell(0, 1, 'NEW');
			expect(result).toBe(widget);
			expect(widget.getCellValue(0, 1)).toBe('NEW');
		});

		it('should set cell with metadata', () => {
			widget.setCell(0, 0, { value: 'STYLED', fg: 0xff0000ff });
			const cell = widget.getCell(0, 0);
			expect(cell?.value).toBe('STYLED');
			expect(cell?.fg).toBe(0xff0000ff);
		});

		it('should get cell', () => {
			const cell = widget.getCell(1, 1);
			expect(cell?.value).toBe('D');
		});

		it('should get cell value', () => {
			const value = widget.getCellValue(1, 0);
			expect(value).toBe('C');
		});

		it('should return undefined for out of bounds', () => {
			expect(widget.getCell(10, 10)).toBeUndefined();
			expect(widget.getCellValue(10, 10)).toBeUndefined();
		});
	});

	describe('rows', () => {
		beforeEach(() => {
			widget = createTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
				],
			});
		});

		it('should get row', () => {
			const row = widget.getRow(0);
			expect(row).toHaveLength(2);
			expect(row?.[0]?.value).toBe('A');
		});

		it('should append row', () => {
			const result = widget.appendRow(['E', 'F']);
			expect(result).toBe(widget);
			expect(widget.getRowCount()).toBe(3);
			expect(widget.getCellValue(2, 0)).toBe('E');
		});

		it('should insert row', () => {
			const result = widget.insertRow(1, ['X', 'Y']);
			expect(result).toBe(widget);
			expect(widget.getRowCount()).toBe(3);
			expect(widget.getCellValue(1, 0)).toBe('X');
			expect(widget.getCellValue(2, 0)).toBe('C');
		});

		it('should remove row', () => {
			const result = widget.removeRow(0);
			expect(result).toBe(widget);
			expect(widget.getRowCount()).toBe(1);
			expect(widget.getCellValue(0, 0)).toBe('C');
		});
	});

	describe('columns', () => {
		beforeEach(() => {
			widget = createTable(world, eid, {
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

		it('should calculate column widths', () => {
			const widths = widget.calculateColumnWidths();
			expect(widths).toHaveLength(2);
			expect(widths[0]).toBeGreaterThan(0);
		});

		it('should calculate column widths with max width', () => {
			const widths = widget.calculateColumnWidths(20);
			const total = widths.reduce((sum, w) => sum + w, 0);
			expect(total).toBeLessThanOrEqual(20);
		});
	});

	describe('headers', () => {
		beforeEach(() => {
			widget = createTable(world, eid, {
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
			widget = createTable(world, eid, { data: [['A']] });
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
			});
			expect(result).toBe(widget);

			const display = widget.getDisplay();
			expect(display.headerFg).toBe(0xffffffff);
			expect(display.cellFg).toBe(0xccccccff);
		});
	});

	describe('rendering', () => {
		beforeEach(() => {
			widget = createTable(world, eid, {
				data: [
					['A', 'B'],
					['C', 'D'],
				],
				noCellBorders: true, // disable borders for predictable line count
			});
		});

		it('should render lines', () => {
			const lines = widget.renderLines(80);
			expect(lines).toHaveLength(2);
		});

		it('should render with borders', () => {
			widget.setCellBorders(true);
			const lines = widget.renderLines(80);
			// With borders, there's a separator line between rows
			expect(lines.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('lifecycle', () => {
		it('should destroy the widget', () => {
			widget = createTable(world, eid, { data: [['A', 'B']] });
			expect(isTableWidget(world, eid)).toBe(true);

			widget.destroy();
			expect(isTableWidget(world, eid)).toBe(false);
		});
	});
});
