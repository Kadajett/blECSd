/**
 * Table System
 *
 * All business logic for table/grid components.
 * Component file (table.ts) contains only data definitions.
 *
 * @module systems/tableSystem
 */

import { markDirty } from '../components/renderable';
import type {
	TableCell,
	TableColumn,
	TableData,
	TableDisplay,
	TableDisplayOptions,
	TableRow,
} from '../components/table';
import {
	DEFAULT_BORDER_BG,
	DEFAULT_BORDER_FG,
	DEFAULT_CELL_BG,
	DEFAULT_CELL_FG,
	DEFAULT_HEADER_BG,
	DEFAULT_HEADER_FG,
	Table,
	tableStore,
} from '../components/table';
import type { Entity, World } from '../core/types';

// =============================================================================
// INTERNAL STORES (NOT EXPORTED FROM COMPONENT)
// =============================================================================

/** Store for table cell data */
const dataStore = new Map<Entity, TableCell[][]>();

/** Store for table column configuration */
const columnStore = new Map<Entity, TableColumn[]>();

/** Store for table display configuration */
const displayStore = new Map<Entity, TableDisplay>();

// =============================================================================
// COMPONENT FUNCTIONS
// =============================================================================

// =============================================================================
// COMPONENT FUNCTIONS
// =============================================================================

/**
 * Attaches table behavior to an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Table options
 *
 * @example
 * ```typescript
 * import { attachTableBehavior } from 'blecsd';
 *
 * attachTableBehavior(world, eid, {
 *   headerRows: 1,
 *   pad: 1,
 *   cellBorders: true,
 * });
 * ```
 */
export function attachTableBehavior(
	_world: World,
	eid: Entity,
	options: {
		headerRows?: number;
		pad?: number;
		cellBorders?: boolean;
	} = {},
): void {
	tableStore.isTable[eid] = 1;
	tableStore.rowCount[eid] = 0;
	tableStore.colCount[eid] = 0;
	tableStore.headerRows[eid] = options.headerRows ?? 1;
	tableStore.pad[eid] = options.pad ?? 1;
	tableStore.cellBorders[eid] = options.cellBorders === true ? 1 : 0;

	// Initialize Table component arrays
	Table.rowCount[eid] = 0;
	Table.colCount[eid] = 0;
	Table.headerRows[eid] = options.headerRows ?? 1;
	Table.pad[eid] = options.pad ?? 1;
	Table.cellBorders[eid] = options.cellBorders === true ? 1 : 0;

	dataStore.set(eid, []);
	columnStore.set(eid, []);
}

/**
 * Checks if an entity is a table.
 *
 * @param _world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns true if entity is a table
 */
export function isTable(_world: World, eid: Entity): boolean {
	return tableStore.isTable[eid] === 1;
}

/**
 * Detaches table behavior from an entity.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 */
export function detachTableBehavior(_world: World, eid: Entity): void {
	tableStore.isTable[eid] = 0;
	tableStore.rowCount[eid] = 0;
	tableStore.colCount[eid] = 0;
	tableStore.headerRows[eid] = 1;
	tableStore.pad[eid] = 1;
	tableStore.cellBorders[eid] = 0;

	Table.rowCount[eid] = 0;
	Table.colCount[eid] = 0;
	Table.headerRows[eid] = 1;
	Table.pad[eid] = 1;
	Table.cellBorders[eid] = 0;

	dataStore.delete(eid);
	columnStore.delete(eid);
	displayStore.delete(eid);
}

// =============================================================================
// DATA MANAGEMENT
// =============================================================================

/**
 * Sets the table data.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param rows - Array of row arrays (string[][] or TableCell[][])
 *
 * @example
 * ```typescript
 * // With string arrays
 * setData(world, eid, [
 *   ['Name', 'Age', 'City'],
 *   ['Alice', '30', 'NYC'],
 *   ['Bob', '25', 'LA'],
 * ]);
 *
 * // With TableCell objects
 * setData(world, eid, [
 *   [{ value: 'Name', fg: 0xffffffff }, { value: 'Age' }, { value: 'City' }],
 *   [{ value: 'Alice' }, { value: '30' }, { value: 'NYC' }],
 * ]);
 * ```
 */
export function setData(
	world: World,
	eid: Entity,
	rows: ReadonlyArray<ReadonlyArray<string | TableCell>>,
): void {
	// Convert string arrays to TableCell arrays
	const data: TableCell[][] = rows.map((row) =>
		row.map((cell) => (typeof cell === 'string' ? { value: cell } : cell)),
	);

	dataStore.set(eid, data);

	// Update row/column counts
	tableStore.rowCount[eid] = data.length;
	tableStore.colCount[eid] = data.reduce((max, row) => Math.max(max, row.length), 0);

	markDirty(world, eid);
}

/**
 * Gets the table data.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Table data as array of rows
 */
export function getData(_world: World, eid: Entity): TableData {
	return dataStore.get(eid) ?? [];
}

/**
 * Gets the table data as a string array.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Table data as string[][]
 */
export function getDataAsStrings(_world: World, eid: Entity): string[][] {
	const data = dataStore.get(eid) ?? [];
	return data.map((row) => row.map((cell) => cell.value));
}

/**
 * Sets a single cell value.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @param value - Cell value (string or TableCell)
 * @returns true if cell was set successfully
 *
 * @example
 * ```typescript
 * setCell(world, eid, 1, 2, 'Updated value');
 * setCell(world, eid, 1, 2, { value: 'Styled', fg: 0xff0000ff });
 * ```
 */
export function setCell(
	world: World,
	eid: Entity,
	row: number,
	col: number,
	value: string | TableCell,
): boolean {
	const data = dataStore.get(eid);
	if (!data) {
		return false;
	}

	// Bounds check
	if (row < 0 || col < 0) {
		return false;
	}

	// Expand data if necessary
	while (data.length <= row) {
		data.push([]);
	}

	const rowData = data[row];
	if (!rowData) {
		return false;
	}

	while (rowData.length <= col) {
		rowData.push({ value: '' });
	}

	rowData[col] = typeof value === 'string' ? { value } : value;

	// Update column count if needed
	const newColCount = data.reduce((max, r) => Math.max(max, r.length), 0);
	tableStore.colCount[eid] = newColCount;
	tableStore.rowCount[eid] = data.length;

	markDirty(world, eid);
	return true;
}

/**
 * Gets a single cell value.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @returns Cell data or undefined if out of bounds
 */
export function getCell(
	_world: World,
	eid: Entity,
	row: number,
	col: number,
): TableCell | undefined {
	const data = dataStore.get(eid);
	if (!data || row < 0 || col < 0) {
		return undefined;
	}
	return data[row]?.[col];
}

/**
 * Gets a cell's string value.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @returns Cell value string or undefined if out of bounds
 */
export function getCellValue(
	world: World,
	eid: Entity,
	row: number,
	col: number,
): string | undefined {
	return getCell(world, eid, row, col)?.value;
}

/**
 * Gets a specific row.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @returns Row data or undefined if out of bounds
 */
export function getRow(_world: World, eid: Entity, row: number): TableRow | undefined {
	const data = dataStore.get(eid);
	return data?.[row];
}

/**
 * Gets a specific column.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param col - Column index (0-based)
 * @returns Column data as array of cells
 */
export function getColumn(_world: World, eid: Entity, col: number): readonly TableCell[] {
	const data = dataStore.get(eid) ?? [];
	return data.map((row) => row[col] ?? { value: '' });
}

/**
 * Gets the number of rows.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Number of rows
 */
export function getRowCount(_world: World, eid: Entity): number {
	return tableStore.rowCount[eid] ?? 0;
}

/**
 * Gets the number of columns.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Number of columns
 */
export function getColCount(_world: World, eid: Entity): number {
	return tableStore.colCount[eid] ?? 0;
}

/**
 * Appends a row to the table.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param row - Row data
 */
export function appendRow(world: World, eid: Entity, row: ReadonlyArray<string | TableCell>): void {
	const data = dataStore.get(eid) ?? [];
	const newRow = row.map((cell) => (typeof cell === 'string' ? { value: cell } : cell));
	data.push(newRow);

	tableStore.rowCount[eid] = data.length;
	tableStore.colCount[eid] = Math.max(tableStore.colCount[eid] ?? 0, newRow.length);

	markDirty(world, eid);
}

/**
 * Inserts a row at a specific index.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Row index to insert at
 * @param row - Row data
 */
export function insertRow(
	world: World,
	eid: Entity,
	index: number,
	row: ReadonlyArray<string | TableCell>,
): void {
	const data = dataStore.get(eid) ?? [];
	const newRow = row.map((cell) => (typeof cell === 'string' ? { value: cell } : cell));

	const insertIndex = Math.max(0, Math.min(index, data.length));
	data.splice(insertIndex, 0, newRow);

	tableStore.rowCount[eid] = data.length;
	tableStore.colCount[eid] = Math.max(tableStore.colCount[eid] ?? 0, newRow.length);

	markDirty(world, eid);
}

/**
 * Removes a row from the table.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param index - Row index to remove
 * @returns The removed row or undefined
 */
export function removeRow(world: World, eid: Entity, index: number): TableRow | undefined {
	const data = dataStore.get(eid);
	if (!data || index < 0 || index >= data.length) {
		return undefined;
	}

	const removed = data.splice(index, 1)[0];
	tableStore.rowCount[eid] = data.length;

	// Recalculate column count
	tableStore.colCount[eid] = data.reduce((max, row) => Math.max(max, row.length), 0);

	markDirty(world, eid);
	return removed;
}

/**
 * Clears all table data.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearData(world: World, eid: Entity): void {
	dataStore.set(eid, []);
	tableStore.rowCount[eid] = 0;
	tableStore.colCount[eid] = 0;
	markDirty(world, eid);
}

// =============================================================================
// HEADER MANAGEMENT
// =============================================================================

/**
 * Sets table headers using column configuration.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param columns - Column configuration
 *
 * @example
 * ```typescript
 * setHeaders(world, eid, [
 *   { header: 'Name', width: 20, align: 'left' },
 *   { header: 'Age', width: 5, align: 'right' },
 *   { header: 'City', width: 15, align: 'left' },
 * ]);
 * ```
 */
export function setHeaders(world: World, eid: Entity, columns: readonly TableColumn[]): void {
	columnStore.set(eid, [...columns]);

	// Insert header row if data exists and doesn't have headers
	const data = dataStore.get(eid) ?? [];
	const headerRowCount = tableStore.headerRows[eid] ?? 1;

	if (headerRowCount > 0) {
		// Create header rows from column definitions
		const headerRow: TableCell[] = columns.map((col) => ({
			value: col.header,
			align: col.align ?? 'left',
		}));

		if (data.length === 0) {
			data.unshift(headerRow);
		} else {
			// Replace first row with header
			data[0] = headerRow;
		}

		tableStore.rowCount[eid] = data.length;
		tableStore.colCount[eid] = columns.length;
	}

	markDirty(world, eid);
}

/**
 * Gets the column configuration.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Column configuration
 */
export function getColumns(_world: World, eid: Entity): readonly TableColumn[] {
	return columnStore.get(eid) ?? [];
}

/**
 * Gets the header row(s).
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Header row data
 */
export function getHeaderRows(_world: World, eid: Entity): readonly TableRow[] {
	const data = dataStore.get(eid) ?? [];
	const headerRowCount = tableStore.headerRows[eid] ?? 1;
	return data.slice(0, headerRowCount);
}

/**
 * Gets the data rows (excluding headers).
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Data rows
 */
export function getDataRows(_world: World, eid: Entity): readonly TableRow[] {
	const data = dataStore.get(eid) ?? [];
	const headerRowCount = tableStore.headerRows[eid] ?? 1;
	return data.slice(headerRowCount);
}

/**
 * Sets the number of header rows.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param count - Number of header rows (0-255)
 */
export function setHeaderRowCount(world: World, eid: Entity, count: number): void {
	tableStore.headerRows[eid] = Math.max(0, Math.min(255, count));
	markDirty(world, eid);
}

/**
 * Gets the number of header rows.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Number of header rows
 */
export function getHeaderRowCount(_world: World, eid: Entity): number {
	return tableStore.headerRows[eid] ?? 1;
}

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Sets the table display configuration.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setTableDisplay(_world: World, eid: Entity, options: TableDisplayOptions): void {
	const existing = displayStore.get(eid);
	const altRowBg = options.altRowBg ?? existing?.altRowBg;
	const selectedFg = options.selectedFg ?? existing?.selectedFg;
	const selectedBg = options.selectedBg ?? existing?.selectedBg;

	const display: TableDisplay = {
		headerFg: options.headerFg ?? existing?.headerFg ?? DEFAULT_HEADER_FG,
		headerBg: options.headerBg ?? existing?.headerBg ?? DEFAULT_HEADER_BG,
		cellFg: options.cellFg ?? existing?.cellFg ?? DEFAULT_CELL_FG,
		cellBg: options.cellBg ?? existing?.cellBg ?? DEFAULT_CELL_BG,
		borderFg: options.borderFg ?? existing?.borderFg ?? DEFAULT_BORDER_FG,
		borderBg: options.borderBg ?? existing?.borderBg ?? DEFAULT_BORDER_BG,
		...(altRowBg !== undefined && { altRowBg }),
		...(selectedFg !== undefined && { selectedFg }),
		...(selectedBg !== undefined && { selectedBg }),
	};
	displayStore.set(eid, display);
}

/**
 * Gets the table display configuration.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getTableDisplay(_world: World, eid: Entity): TableDisplay {
	return (
		displayStore.get(eid) ?? {
			headerFg: DEFAULT_HEADER_FG,
			headerBg: DEFAULT_HEADER_BG,
			cellFg: DEFAULT_CELL_FG,
			cellBg: DEFAULT_CELL_BG,
			borderFg: DEFAULT_BORDER_FG,
			borderBg: DEFAULT_BORDER_BG,
		}
	);
}

/**
 * Clears the table display configuration.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 */
export function clearTableDisplay(_world: World, eid: Entity): void {
	displayStore.delete(eid);
}

// =============================================================================
// OPTIONS
// =============================================================================

/**
 * Gets the cell padding.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns Cell padding (spaces)
 */
export function getCellPadding(_world: World, eid: Entity): number {
	return tableStore.pad[eid] ?? 1;
}

/**
 * Sets the cell padding.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param padding - Cell padding (0-255)
 */
export function setCellPadding(world: World, eid: Entity, padding: number): void {
	tableStore.pad[eid] = Math.max(0, Math.min(255, padding));
	markDirty(world, eid);
}

/**
 * Checks if cell borders are enabled.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @returns true if cell borders are enabled
 */
export function hasCellBorders(_world: World, eid: Entity): boolean {
	return tableStore.cellBorders[eid] === 1;
}

/**
 * Sets whether cell borders are enabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param enabled - Whether to show cell borders
 */
export function setCellBorders(world: World, eid: Entity, enabled: boolean): void {
	tableStore.cellBorders[eid] = enabled ? 1 : 0;
	markDirty(world, eid);
}

// =============================================================================
// COLUMN WIDTH CALCULATION
// =============================================================================

/**
 * Calculates column widths based on content.
 *
 * @param eid - The entity ID
 * @param maxTotalWidth - Maximum total width (optional)
 * @returns Array of column widths
 */
/** Calculate content widths from data */
function calculateContentWidths(data: TableCell[][], colCount: number, padding: number): number[] {
	const widths: number[] = new Array(colCount).fill(0);
	for (const row of data) {
		for (let c = 0; c < row.length; c++) {
			const cell = row[c];
			if (cell) {
				widths[c] = Math.max(widths[c] ?? 0, cell.value.length + padding * 2);
			}
		}
	}
	return widths;
}

/** Apply column constraints to widths */
function applyColumnConstraints(widths: number[], columns: TableColumn[]): void {
	for (let c = 0; c < columns.length; c++) {
		const col = columns[c];
		if (!col) continue;

		if (col.width !== undefined) {
			widths[c] = col.width;
		} else {
			if (col.minWidth !== undefined) widths[c] = Math.max(widths[c] ?? 0, col.minWidth);
			if (col.maxWidth !== undefined) widths[c] = Math.min(widths[c] ?? 0, col.maxWidth);
		}
	}
}

/** Scale widths to fit within maximum total */
function scaleWidthsToFit(widths: number[], maxTotalWidth: number): void {
	const totalWidth = widths.reduce((sum, w) => sum + w, 0);
	if (totalWidth > maxTotalWidth) {
		const scale = maxTotalWidth / totalWidth;
		for (let c = 0; c < widths.length; c++) {
			widths[c] = Math.floor((widths[c] ?? 0) * scale);
		}
	}
}

/**
 * Calculates column widths based on content.
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param maxTotalWidth - Maximum total width (optional)
 * @returns Array of column widths
 */
export function calculateColumnWidths(
	_world: World,
	eid: Entity,
	maxTotalWidth?: number,
): number[] {
	const data = dataStore.get(eid) ?? [];
	const columns = columnStore.get(eid) ?? [];
	const colCount = tableStore.colCount[eid] ?? 0;
	const padding = tableStore.pad[eid] ?? 1;

	const widths = calculateContentWidths(data, colCount, padding);
	applyColumnConstraints(widths, columns);

	if (maxTotalWidth !== undefined) {
		scaleWidthsToFit(widths, maxTotalWidth);
	}

	return widths;
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/** Align text within a content width */
function alignText(text: string, contentWidth: number, align: 'left' | 'right' | 'center'): string {
	if (align === 'right') return text.padStart(contentWidth);
	if (align === 'center') {
		const leftPad = Math.floor((contentWidth - text.length) / 2);
		return text.padStart(leftPad + text.length).padEnd(contentWidth);
	}
	return text.padEnd(contentWidth);
}

/** Format a single cell */
function formatCell(cell: TableCell, colWidth: number, padding: number, padStr: string): string {
	const contentWidth = colWidth - padding * 2;
	let text = cell.value;
	if (text.length > contentWidth) {
		text = `${text.slice(0, contentWidth - 1)}…`;
	}
	const paddedText = alignText(text, contentWidth, cell.align ?? 'left');
	return padStr + paddedText + padStr;
}

/** Render a single row */
function renderRow(
	row: TableCell[],
	colWidths: number[],
	padding: number,
	cellBorders: boolean,
): string {
	const padStr = ' '.repeat(padding);
	const separator = cellBorders ? '│' : '';
	let line = '';

	for (let c = 0; c < colWidths.length; c++) {
		const cell = row[c] ?? { value: '' };
		if (c > 0 && cellBorders) line += separator;
		line += formatCell(cell, colWidths[c] ?? 0, padding, padStr);
	}

	return line;
}

/**
 * Renders table as an array of strings (one per line).
 *
 * @param world - The ECS world (unused, kept for API consistency)
 * @param eid - The entity ID
 * @param width - Available width
 * @returns Array of rendered line strings
 */
export function renderTableLines(world: World, eid: Entity, width: number): string[] {
	const data = dataStore.get(eid) ?? [];
	const colWidths = calculateColumnWidths(world, eid, width);
	const padding = tableStore.pad[eid] ?? 1;
	const cellBorders = tableStore.cellBorders[eid] === 1;
	const headerRowCount = tableStore.headerRows[eid] ?? 1;

	const lines: string[] = [];

	for (let r = 0; r < data.length; r++) {
		lines.push(renderRow(data[r] ?? [], colWidths, padding, cellBorders));

		// Add separator line after headers
		if (cellBorders && r === headerRowCount - 1 && r < data.length - 1) {
			lines.push(colWidths.map((w) => '─'.repeat(w)).join('┼'));
		}
	}

	return lines;
}

// =============================================================================
// STORE RESET
// =============================================================================

/**
 * Resets the table store. Used for testing.
 */
export function resetTableStore(): void {
	tableStore.isTable.fill(0);
	tableStore.rowCount.fill(0);
	tableStore.colCount.fill(0);
	tableStore.headerRows.fill(1);
	tableStore.pad.fill(1);
	tableStore.cellBorders.fill(0);
}
