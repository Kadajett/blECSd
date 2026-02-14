/**
 * Table Component Tests
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	appendRow,
	attachTableBehavior,
	calculateColumnWidths,
	clearData,
	clearTableDisplay,
	getCell,
	getCellPadding,
	getCellValue,
	getColCount,
	getColumn,
	getColumns,
	getData,
	getDataAsStrings,
	getDataRows,
	getHeaderRowCount,
	getHeaderRows,
	getRow,
	getRowCount,
	getTableDisplay,
	hasCellBorders,
	insertRow,
	isTable,
	removeRow,
	renderTableLines,
	resetTableStore,
	setCell,
	setCellBorders,
	setCellPadding,
	setData,
	setHeaderRowCount,
	setHeaders,
	setTableDisplay,
} from '../systems/tableSystem';
import {
	DEFAULT_BORDER_BG,
	DEFAULT_BORDER_FG,
	DEFAULT_CELL_BG,
	DEFAULT_CELL_FG,
	DEFAULT_HEADER_BG,
	DEFAULT_HEADER_FG,
	tableStore,
} from './table';

describe('Table Component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		resetTableStore(world);
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
	});

	describe('State Machine Config', () => {
		it('should initialize with default values', () => {
			attachTableBehavior(world, eid);

			expect(isTable(world, eid)).toBe(true);
			expect(getRowCount(world, eid)).toBe(0);
			expect(getColCount(world, eid)).toBe(0);
			expect(getHeaderRowCount(world, eid)).toBe(1);
			expect(getCellPadding(world, eid)).toBe(1);
			expect(hasCellBorders(world, eid)).toBe(false);
		});

		it('should initialize with custom options', () => {
			attachTableBehavior(world, eid, {
				headerRows: 2,
				pad: 2,
				cellBorders: true,
			});

			expect(getHeaderRowCount(world, eid)).toBe(2);
			expect(getCellPadding(world, eid)).toBe(2);
			expect(hasCellBorders(world, eid)).toBe(true);
		});
	});

	describe('Data Management', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
		});

		it('should set data from string arrays', () => {
			setData(world, eid, [
				['Name', 'Age', 'City'],
				['Alice', '30', 'NYC'],
				['Bob', '25', 'LA'],
			]);

			expect(getRowCount(world, eid)).toBe(3);
			expect(getColCount(world, eid)).toBe(3);
		});

		it('should set data from TableCell arrays', () => {
			setData(world, eid, [
				[{ value: 'Name' }, { value: 'Age' }],
				[{ value: 'Alice', fg: 0xff0000ff }, { value: '30' }],
			]);

			expect(getRowCount(world, eid)).toBe(2);
			const cell = getCell(world, eid, 1, 0);
			expect(cell?.fg).toBe(0xff0000ff);
		});

		it('should get data', () => {
			setData(world, eid, [
				['A', 'B'],
				['C', 'D'],
			]);

			const data = getData(world, eid);
			expect(data).toHaveLength(2);
			expect(data[0]?.[0]?.value).toBe('A');
		});

		it('should get data as strings', () => {
			setData(world, eid, [
				['A', 'B'],
				['C', 'D'],
			]);

			const strings = getDataAsStrings(world, eid);
			expect(strings).toEqual([
				['A', 'B'],
				['C', 'D'],
			]);
		});

		it('should clear data', () => {
			setData(world, eid, [['A', 'B']]);
			clearData(world, eid);

			expect(getRowCount(world, eid)).toBe(0);
			expect(getColCount(world, eid)).toBe(0);
			expect(getData(world, eid)).toEqual([]);
		});
	});

	describe('Cell Access', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
			setData(world, eid, [
				['A', 'B', 'C'],
				['D', 'E', 'F'],
				['G', 'H', 'I'],
			]);
		});

		it('should get cell by position', () => {
			const cell = getCell(world, eid, 1, 2);
			expect(cell?.value).toBe('F');
		});

		it('should get cell value by position', () => {
			const value = getCellValue(world, eid, 1, 2);
			expect(value).toBe('F');
		});

		it('should return undefined for out of bounds', () => {
			expect(getCell(world, eid, 10, 10)).toBeUndefined();
			expect(getCell(world, eid, -1, 0)).toBeUndefined();
			expect(getCellValue(world, eid, 10, 10)).toBeUndefined();
		});

		it('should set cell value', () => {
			setCell(world, eid, 1, 1, 'NEW');
			expect(getCellValue(world, eid, 1, 1)).toBe('NEW');
		});

		it('should set cell with TableCell object', () => {
			setCell(world, eid, 1, 1, { value: 'STYLED', fg: 0x00ff00ff });
			const cell = getCell(world, eid, 1, 1);
			expect(cell?.value).toBe('STYLED');
			expect(cell?.fg).toBe(0x00ff00ff);
		});

		it('should expand data when setting cell beyond bounds', () => {
			setCell(world, eid, 5, 5, 'EXPANDED');
			expect(getRowCount(world, eid)).toBe(6);
			expect(getColCount(world, eid)).toBe(6);
			expect(getCellValue(world, eid, 5, 5)).toBe('EXPANDED');
		});
	});

	describe('Row Access', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
			setData(world, eid, [
				['A', 'B', 'C'],
				['D', 'E', 'F'],
			]);
		});

		it('should get row by index', () => {
			const row = getRow(world, eid, 1);
			expect(row).toHaveLength(3);
			expect(row?.[0]?.value).toBe('D');
		});

		it('should return undefined for invalid row index', () => {
			expect(getRow(world, eid, 10)).toBeUndefined();
		});

		it('should get column by index', () => {
			const col = getColumn(world, eid, 1);
			expect(col).toHaveLength(2);
			expect(col[0]?.value).toBe('B');
			expect(col[1]?.value).toBe('E');
		});
	});

	describe('Row Manipulation', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
			setData(world, eid, [
				['A', 'B'],
				['C', 'D'],
			]);
		});

		it('should append row', () => {
			appendRow(world, eid, ['E', 'F']);
			expect(getRowCount(world, eid)).toBe(3);
			expect(getCellValue(world, eid, 2, 0)).toBe('E');
		});

		it('should insert row at index', () => {
			insertRow(world, eid, 1, ['X', 'Y']);
			expect(getRowCount(world, eid)).toBe(3);
			expect(getCellValue(world, eid, 1, 0)).toBe('X');
			expect(getCellValue(world, eid, 2, 0)).toBe('C');
		});

		it('should remove row', () => {
			const removed = removeRow(world, eid, 0);
			expect(removed?.[0]?.value).toBe('A');
			expect(getRowCount(world, eid)).toBe(1);
			expect(getCellValue(world, eid, 0, 0)).toBe('C');
		});

		it('should return undefined when removing invalid row', () => {
			expect(removeRow(world, eid, 10)).toBeUndefined();
			expect(removeRow(world, eid, -1)).toBeUndefined();
		});
	});

	describe('Headers', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
		});

		it('should set headers from column configuration', () => {
			setHeaders(world, eid, [
				{ header: 'Name', width: 20 },
				{ header: 'Age', width: 5, align: 'right' },
				{ header: 'City', width: 15 },
			]);

			const columns = getColumns(world, eid);
			expect(columns).toHaveLength(3);
			expect(columns[0]?.header).toBe('Name');
			expect(columns[1]?.align).toBe('right');
		});

		it('should get header rows', () => {
			setHeaders(world, eid, [{ header: 'Col1' }, { header: 'Col2' }]);

			const headers = getHeaderRows(world, eid);
			expect(headers).toHaveLength(1);
			expect(headers[0]?.[0]?.value).toBe('Col1');
		});

		it('should get data rows excluding headers', () => {
			setData(world, eid, [
				['Header1', 'Header2'],
				['Data1', 'Data2'],
				['Data3', 'Data4'],
			]);

			const dataRows = getDataRows(world, eid);
			expect(dataRows).toHaveLength(2);
			expect(dataRows[0]?.[0]?.value).toBe('Data1');
		});

		it('should set header row count', () => {
			setHeaderRowCount(world, eid, 2);
			expect(getHeaderRowCount(world, eid)).toBe(2);
		});
	});

	describe('Display Configuration', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
		});

		it('should get default display configuration', () => {
			const display = getTableDisplay(world, eid);
			expect(display.headerFg).toBe(DEFAULT_HEADER_FG);
			expect(display.headerBg).toBe(DEFAULT_HEADER_BG);
			expect(display.cellFg).toBe(DEFAULT_CELL_FG);
			expect(display.cellBg).toBe(DEFAULT_CELL_BG);
			expect(display.borderFg).toBe(DEFAULT_BORDER_FG);
			expect(display.borderBg).toBe(DEFAULT_BORDER_BG);
		});

		it('should set display configuration', () => {
			setTableDisplay(world, eid, {
				headerFg: 0xaabbccff,
				selectedBg: 0x0066ffff,
			});

			const display = getTableDisplay(world, eid);
			expect(display.headerFg).toBe(0xaabbccff);
			expect(display.selectedBg).toBe(0x0066ffff);
		});

		it('should clear display configuration', () => {
			setTableDisplay(world, eid, { headerFg: 0x123456ff });
			clearTableDisplay(world, eid);

			const display = getTableDisplay(world, eid);
			expect(display.headerFg).toBe(DEFAULT_HEADER_FG);
		});
	});

	describe('Options', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
		});

		it('should get and set cell padding', () => {
			setCellPadding(world, eid, 3);
			expect(getCellPadding(world, eid)).toBe(3);
		});

		it('should clamp cell padding', () => {
			setCellPadding(world, eid, 300);
			expect(getCellPadding(world, eid)).toBe(255);

			setCellPadding(world, eid, -5);
			expect(getCellPadding(world, eid)).toBe(0);
		});

		it('should get and set cell borders', () => {
			expect(hasCellBorders(world, eid)).toBe(false);

			setCellBorders(world, eid, true);
			expect(hasCellBorders(world, eid)).toBe(true);

			setCellBorders(world, eid, false);
			expect(hasCellBorders(world, eid)).toBe(false);
		});
	});

	describe('Column Width Calculation', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
		});

		it('should calculate widths from content', () => {
			setData(world, eid, [
				['Short', 'Longer Text'],
				['A', 'B'],
			]);

			const widths = calculateColumnWidths(world, eid);
			expect(widths[0]).toBe('Short'.length + 2); // +2 for padding
			expect(widths[1]).toBe('Longer Text'.length + 2);
		});

		it('should apply column width configuration', () => {
			setData(world, eid, [['A', 'B']]);
			setHeaders(world, eid, [
				{ header: 'Col1', width: 20 },
				{ header: 'Col2', minWidth: 15 },
			]);

			const widths = calculateColumnWidths(world, eid);
			expect(widths[0]).toBe(20);
			expect(widths[1]).toBeGreaterThanOrEqual(15);
		});

		it('should scale down to max width', () => {
			setData(world, eid, [['Very Long Content', 'Also Long Content']]);

			const widths = calculateColumnWidths(world, eid, 20);
			const total = widths.reduce((sum, w) => sum + w, 0);
			expect(total).toBeLessThanOrEqual(20);
		});
	});

	describe('Rendering', () => {
		beforeEach(() => {
			attachTableBehavior(world, eid);
		});

		it('should render table as lines', () => {
			setData(world, eid, [
				['A', 'B'],
				['C', 'D'],
			]);

			const lines = renderTableLines(world, eid, 80);
			expect(lines).toHaveLength(2);
		});

		it('should render with cell borders', () => {
			attachTableBehavior(world, eid, { cellBorders: true });
			setData(world, eid, [
				['Header1', 'Header2'],
				['Data1', 'Data2'],
			]);

			const lines = renderTableLines(world, eid, 80);
			expect(lines.length).toBeGreaterThan(2); // Should have separator line
		});

		it('should truncate long content', () => {
			setData(world, eid, [['This is a very long string that should be truncated']]);

			const lines = renderTableLines(world, eid, 20);
			expect(lines[0]?.includes('…')).toBe(true);
		});
	});

	describe('Store', () => {
		it('should expose store for external access', () => {
			attachTableBehavior(world, eid);
			expect(tableStore.isTable[eid]).toBe(1);
		});

		it('should reset store', () => {
			attachTableBehavior(world, eid);
			expect(tableStore.isTable[eid]).toBe(1);

			resetTableStore(world);
			expect(tableStore.isTable[eid]).toBe(0);
		});
	});
});
