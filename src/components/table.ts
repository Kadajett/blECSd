/**
 * Table Component
 *
 * Provides table/grid data management functionality with cell-based data storage.
 *
 * @module components/table
 */

import type { Entity, World } from '../core/types';
import { markDirty } from './renderable';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Table cell alignment.
 */
export type CellAlign = 'left' | 'center' | 'right';

/**
 * Table cell data.
 */
export interface TableCell {
	/** Cell text value */
	readonly value: string;
	/** Cell foreground color (optional) */
	readonly fg?: number;
	/** Cell background color (optional) */
	readonly bg?: number;
	/** Cell alignment (optional, defaults to left) */
	readonly align?: CellAlign;
}

/**
 * Table row data.
 */
export type TableRow = readonly TableCell[];

/**
 * Table data (array of rows).
 */
export type TableData = readonly TableRow[];

/**
 * Table column configuration.
 */
export interface TableColumn {
	/** Column header text */
	readonly header: string;
	/** Column width (characters) */
	readonly width?: number;
	/** Column minimum width */
	readonly minWidth?: number;
	/** Column maximum width */
	readonly maxWidth?: number;
	/** Column alignment */
	readonly align?: CellAlign;
}

/**
 * Table store for managing table-specific data.
 */
export interface TableStore {
	/** Whether entity is a table */
	isTable: Uint8Array;
	/** Number of rows in table */
	rowCount: Uint32Array;
	/** Number of columns in table */
	colCount: Uint16Array;
	/** Number of header rows */
	headerRows: Uint8Array;
	/** Cell padding */
	pad: Uint8Array;
	/** Whether to show cell borders */
	cellBorders: Uint8Array;
}

/**
 * Table display configuration.
 */
export interface TableDisplay {
	/** Header foreground color */
	readonly headerFg: number;
	/** Header background color */
	readonly headerBg: number;
	/** Cell foreground color */
	readonly cellFg: number;
	/** Cell background color */
	readonly cellBg: number;
	/** Alternate row background color (for striping) */
	readonly altRowBg?: number;
	/** Border foreground color */
	readonly borderFg: number;
	/** Border background color */
	readonly borderBg: number;
	/** Selected row foreground color */
	readonly selectedFg?: number;
	/** Selected row background color */
	readonly selectedBg?: number;
}

/**
 * Table display options for configuration.
 */
export interface TableDisplayOptions {
	headerFg?: number;
	headerBg?: number;
	cellFg?: number;
	cellBg?: number;
	altRowBg?: number;
	borderFg?: number;
	borderBg?: number;
	selectedFg?: number;
	selectedBg?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default header foreground color */
export const DEFAULT_HEADER_FG = 0xffffffff;

/** Default header background color */
export const DEFAULT_HEADER_BG = 0x333333ff;

/** Default cell foreground color */
export const DEFAULT_CELL_FG = 0xccccccff;

/** Default cell background color */
export const DEFAULT_CELL_BG = 0x000000ff;

/** Default border foreground color */
export const DEFAULT_BORDER_FG = 0x666666ff;

/** Default border background color */
export const DEFAULT_BORDER_BG = 0x000000ff;

/** Maximum entities supported */
const MAX_ENTITIES = 10000;

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Table component store using SoA (Structure of Arrays) for performance.
 *
 * Stores table grid metadata.
 *
 * @example
 * ```typescript
 * import { Table, attachTableBehavior, setData } from 'blecsd';
 *
 * attachTableBehavior(world, eid);
 * setData(world, eid, [
 *   ['Name', 'Age'],
 *   ['Alice', '30'],
 * ]);
 * ```
 */
export const Table = {
	/** Number of data rows (excluding headers) */
	rowCount: new Uint32Array(MAX_ENTITIES),
	/** Number of columns */
	colCount: new Uint16Array(MAX_ENTITIES),
	/** Number of header rows */
	headerRows: new Uint8Array(MAX_ENTITIES).fill(1),
	/** Cell padding (spaces) */
	pad: new Uint8Array(MAX_ENTITIES).fill(1),
	/** Whether to render cell borders (0 = no, 1 = yes) */
	cellBorders: new Uint8Array(MAX_ENTITIES),
};

// =============================================================================
// STORES
// =============================================================================

/**
 * Store for table component data.
 */
export const tableStore: TableStore = {
	isTable: new Uint8Array(MAX_ENTITIES),
	rowCount: new Uint32Array(MAX_ENTITIES),
	colCount: new Uint16Array(MAX_ENTITIES),
	headerRows: new Uint8Array(MAX_ENTITIES).fill(1),
	pad: new Uint8Array(MAX_ENTITIES).fill(1),
	cellBorders: new Uint8Array(MAX_ENTITIES),
};

/** Store for table cell data */
const dataStore = new Map<Entity, TableCell[][]>();

/** Store for table column configuration */
const columnStore = new Map<Entity, TableColumn[]>();

/** Store for table display configuration */
const displayStore = new Map<Entity, TableDisplay>();

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
 * @param eid - The entity ID
 * @returns Table data as array of rows
 */
export function getData(eid: Entity): TableData {
	return dataStore.get(eid) ?? [];
}

/**
 * Gets the table data as a string array.
 *
 * @param eid - The entity ID
 * @returns Table data as string[][]
 */
export function getDataAsStrings(eid: Entity): string[][] {
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
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @returns Cell data or undefined if out of bounds
 */
export function getCell(eid: Entity, row: number, col: number): TableCell | undefined {
	const data = dataStore.get(eid);
	if (!data || row < 0 || col < 0) {
		return undefined;
	}
	return data[row]?.[col];
}

/**
 * Gets a cell's string value.
 *
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @returns Cell value string or undefined if out of bounds
 */
export function getCellValue(eid: Entity, row: number, col: number): string | undefined {
	return getCell(eid, row, col)?.value;
}

/**
 * Gets a specific row.
 *
 * @param eid - The entity ID
 * @param row - Row index (0-based)
 * @returns Row data or undefined if out of bounds
 */
export function getRow(eid: Entity, row: number): TableRow | undefined {
	const data = dataStore.get(eid);
	return data?.[row];
}

/**
 * Gets a specific column.
 *
 * @param eid - The entity ID
 * @param col - Column index (0-based)
 * @returns Column data as array of cells
 */
export function getColumn(eid: Entity, col: number): readonly TableCell[] {
	const data = dataStore.get(eid) ?? [];
	return data.map((row) => row[col] ?? { value: '' });
}

/**
 * Gets the number of rows.
 *
 * @param eid - The entity ID
 * @returns Number of rows
 */
export function getRowCount(eid: Entity): number {
	return tableStore.rowCount[eid] ?? 0;
}

/**
 * Gets the number of columns.
 *
 * @param eid - The entity ID
 * @returns Number of columns
 */
export function getColCount(eid: Entity): number {
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
 * @param eid - The entity ID
 * @returns Column configuration
 */
export function getColumns(eid: Entity): readonly TableColumn[] {
	return columnStore.get(eid) ?? [];
}

/**
 * Gets the header row(s).
 *
 * @param eid - The entity ID
 * @returns Header row data
 */
export function getHeaderRows(eid: Entity): readonly TableRow[] {
	const data = dataStore.get(eid) ?? [];
	const headerRowCount = tableStore.headerRows[eid] ?? 1;
	return data.slice(0, headerRowCount);
}

/**
 * Gets the data rows (excluding headers).
 *
 * @param eid - The entity ID
 * @returns Data rows
 */
export function getDataRows(eid: Entity): readonly TableRow[] {
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
 * @param eid - The entity ID
 * @returns Number of header rows
 */
export function getHeaderRowCount(eid: Entity): number {
	return tableStore.headerRows[eid] ?? 1;
}

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Sets the table display configuration.
 *
 * @param eid - The entity ID
 * @param options - Display options
 */
export function setTableDisplay(eid: Entity, options: TableDisplayOptions): void {
	const existing = displayStore.get(eid);
	displayStore.set(eid, {
		headerFg: options.headerFg ?? existing?.headerFg ?? DEFAULT_HEADER_FG,
		headerBg: options.headerBg ?? existing?.headerBg ?? DEFAULT_HEADER_BG,
		cellFg: options.cellFg ?? existing?.cellFg ?? DEFAULT_CELL_FG,
		cellBg: options.cellBg ?? existing?.cellBg ?? DEFAULT_CELL_BG,
		altRowBg: options.altRowBg ?? existing?.altRowBg,
		borderFg: options.borderFg ?? existing?.borderFg ?? DEFAULT_BORDER_FG,
		borderBg: options.borderBg ?? existing?.borderBg ?? DEFAULT_BORDER_BG,
		selectedFg: options.selectedFg ?? existing?.selectedFg,
		selectedBg: options.selectedBg ?? existing?.selectedBg,
	});
}

/**
 * Gets the table display configuration.
 *
 * @param eid - The entity ID
 * @returns Display configuration
 */
export function getTableDisplay(eid: Entity): TableDisplay {
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
 * @param eid - The entity ID
 */
export function clearTableDisplay(eid: Entity): void {
	displayStore.delete(eid);
}

// =============================================================================
// OPTIONS
// =============================================================================

/**
 * Gets the cell padding.
 *
 * @param eid - The entity ID
 * @returns Cell padding (spaces)
 */
export function getCellPadding(eid: Entity): number {
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
 * @param eid - The entity ID
 * @returns true if cell borders are enabled
 */
export function hasCellBorders(eid: Entity): boolean {
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
export function calculateColumnWidths(eid: Entity, maxTotalWidth?: number): number[] {
	const data = dataStore.get(eid) ?? [];
	const columns = columnStore.get(eid) ?? [];
	const colCount = tableStore.colCount[eid] ?? 0;
	const padding = tableStore.pad[eid] ?? 1;

	const widths: number[] = new Array(colCount).fill(0);

	// Calculate max content width for each column
	for (const row of data) {
		for (let c = 0; c < row.length; c++) {
			const cell = row[c];
			if (cell) {
				widths[c] = Math.max(widths[c] ?? 0, cell.value.length + padding * 2);
			}
		}
	}

	// Apply column configuration constraints
	for (let c = 0; c < columns.length; c++) {
		const col = columns[c];
		if (!col) continue;

		if (col.width !== undefined) {
			widths[c] = col.width;
		} else {
			if (col.minWidth !== undefined) {
				widths[c] = Math.max(widths[c] ?? 0, col.minWidth);
			}
			if (col.maxWidth !== undefined) {
				widths[c] = Math.min(widths[c] ?? 0, col.maxWidth);
			}
		}
	}

	// Scale down if total width exceeds maximum
	if (maxTotalWidth !== undefined) {
		const totalWidth = widths.reduce((sum, w) => sum + w, 0);
		if (totalWidth > maxTotalWidth) {
			const scale = maxTotalWidth / totalWidth;
			for (let c = 0; c < widths.length; c++) {
				widths[c] = Math.floor((widths[c] ?? 0) * scale);
			}
		}
	}

	return widths;
}

// =============================================================================
// RENDERING HELPERS
// =============================================================================

/**
 * Renders table as an array of strings (one per line).
 *
 * @param eid - The entity ID
 * @param width - Available width
 * @returns Array of rendered line strings
 */
export function renderTableLines(eid: Entity, width: number): string[] {
	const data = dataStore.get(eid) ?? [];
	const colWidths = calculateColumnWidths(eid, width);
	const padding = tableStore.pad[eid] ?? 1;
	const cellBorders = tableStore.cellBorders[eid] === 1;
	const headerRowCount = tableStore.headerRows[eid] ?? 1;

	const lines: string[] = [];
	const padStr = ' '.repeat(padding);
	const separator = cellBorders ? '│' : '';

	for (let r = 0; r < data.length; r++) {
		const row = data[r] ?? [];
		let line = '';

		for (let c = 0; c < colWidths.length; c++) {
			const cell = row[c] ?? { value: '' };
			const colWidth = colWidths[c] ?? 0;
			const contentWidth = colWidth - padding * 2;
			const align = cell.align ?? 'left';

			let text = cell.value;
			if (text.length > contentWidth) {
				text = text.slice(0, contentWidth - 1) + '…';
			}

			// Pad based on alignment
			let paddedText: string;
			switch (align) {
				case 'right':
					paddedText = text.padStart(contentWidth);
					break;
				case 'center': {
					const leftPad = Math.floor((contentWidth - text.length) / 2);
					paddedText = text.padStart(leftPad + text.length).padEnd(contentWidth);
					break;
				}
				default:
					paddedText = text.padEnd(contentWidth);
			}

			if (c > 0 && cellBorders) {
				line += separator;
			}
			line += padStr + paddedText + padStr;
		}

		lines.push(line);

		// Add separator line after headers
		if (cellBorders && r === headerRowCount - 1 && r < data.length - 1) {
			const sepLine = colWidths.map((w) => '─'.repeat(w)).join('┼');
			lines.push(sepLine);
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
	dataStore.clear();
	columnStore.clear();
	displayStore.clear();
}
