/**
 * Table Widget
 *
 * Provides a chainable API wrapper around the Table component for creating
 * data grid widgets with headers and cell borders.
 *
 * @module widgets/table
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import {
	appendRow,
	attachTableBehavior,
	type CellAlign,
	calculateColumnWidths,
	clearData,
	detachTableBehavior,
	getCell,
	getCellPadding,
	getCellValue,
	getColCount,
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
	setCell,
	setCellBorders,
	setCellPadding,
	setData,
	setHeaderRowCount,
	setHeaders,
	setTableDisplay,
	type TableCell,
	type TableColumn,
	type TableData,
	type TableDisplay,
	type TableDisplayOptions,
	type TableRow,
} from '../components/table';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Converts a TableStyleConfig to TableDisplayOptions.
 * Extracts style properties and maps them to display options.
 */
function styleConfigToDisplayOptions(style: TableStyleConfig): TableDisplayOptions {
	const displayOptions: TableDisplayOptions = {};
	if (style.border?.fg !== undefined) displayOptions.borderFg = style.border.fg;
	if (style.border?.bg !== undefined) displayOptions.borderBg = style.border.bg;
	if (style.header?.fg !== undefined) displayOptions.headerFg = style.header.fg;
	if (style.header?.bg !== undefined) displayOptions.headerBg = style.header.bg;
	if (style.cell?.fg !== undefined) displayOptions.cellFg = style.cell.fg;
	if (style.cell?.bg !== undefined) displayOptions.cellBg = style.cell.bg;
	if (style.altRowBg !== undefined) displayOptions.altRowBg = style.altRowBg;
	if (style.selected?.fg !== undefined) displayOptions.selectedFg = style.selected.fg;
	if (style.selected?.bg !== undefined) displayOptions.selectedBg = style.selected.bg;
	return displayOptions;
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Style configuration for table elements.
 */
export interface TableStyleConfig {
	/** Border style */
	readonly border?:
		| {
				readonly fg?: number | undefined;
				readonly bg?: number | undefined;
		  }
		| undefined;
	/** Header style */
	readonly header?:
		| {
				readonly fg?: number | undefined;
				readonly bg?: number | undefined;
		  }
		| undefined;
	/** Cell style */
	readonly cell?:
		| {
				readonly fg?: number | undefined;
				readonly bg?: number | undefined;
		  }
		| undefined;
	/** Alternate row background for striping */
	readonly altRowBg?: number | undefined;
	/** Selected row style */
	readonly selected?:
		| {
				readonly fg?: number | undefined;
				readonly bg?: number | undefined;
		  }
		| undefined;
}

/**
 * Configuration for creating a Table widget.
 */
export interface TableWidgetConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width of the table */
	readonly width?: number;
	/** Height of the table */
	readonly height?: number;
	/** Table data as string[][] */
	readonly data?: readonly (readonly string[])[];
	/** Cell padding (spaces) */
	readonly pad?: number;
	/** Default cell alignment */
	readonly align?: CellAlign;
	/** Style configuration */
	readonly style?: TableStyleConfig;
	/** Whether to hide cell borders */
	readonly noCellBorders?: boolean;
	/** Number of header rows */
	readonly headerRows?: number;
	/** Column configurations */
	readonly columns?: readonly TableColumn[];
}

/**
 * Table widget interface providing chainable methods.
 */
export interface TableWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the table */
	show(): TableWidget;
	/** Hides the table */
	hide(): TableWidget;

	// Position
	/** Moves the table by dx, dy */
	move(dx: number, dy: number): TableWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): TableWidget;

	// Data
	/** Sets the table data */
	setData(data: readonly (readonly string[])[]): TableWidget;
	/** Gets the table data as strings */
	getData(): string[][];
	/** Gets the full table data with cell metadata */
	getFullData(): TableData;
	/** Clears all table data */
	clearData(): TableWidget;

	// Cells
	/** Sets a cell value */
	setCell(row: number, col: number, value: string | TableCell): TableWidget;
	/** Gets a cell value */
	getCell(row: number, col: number): TableCell | undefined;
	/** Gets a cell's string value */
	getCellValue(row: number, col: number): string | undefined;

	// Rows
	/** Gets a row */
	getRow(row: number): TableRow | undefined;
	/** Appends a row */
	appendRow(row: readonly string[]): TableWidget;
	/** Inserts a row at index */
	insertRow(index: number, row: readonly string[]): TableWidget;
	/** Removes a row */
	removeRow(index: number): TableWidget;
	/** Gets the number of rows */
	getRowCount(): number;

	// Columns
	/** Sets column configuration */
	setColumns(columns: readonly TableColumn[]): TableWidget;
	/** Gets column configuration */
	getColumns(): readonly TableColumn[];
	/** Gets the number of columns */
	getColCount(): number;
	/** Calculates column widths */
	calculateColumnWidths(maxWidth?: number): number[];

	// Headers
	/** Sets header row count */
	setHeaderRowCount(count: number): TableWidget;
	/** Gets header row count */
	getHeaderRowCount(): number;
	/** Gets header rows */
	getHeaderRows(): readonly TableRow[];
	/** Gets data rows (excluding headers) */
	getDataRows(): readonly TableRow[];

	// Display
	/** Sets cell padding */
	setCellPadding(padding: number): TableWidget;
	/** Gets cell padding */
	getCellPadding(): number;
	/** Sets whether to show cell borders */
	setCellBorders(enabled: boolean): TableWidget;
	/** Checks if cell borders are shown */
	hasCellBorders(): boolean;
	/** Sets display styles */
	setStyle(style: TableStyleConfig): TableWidget;
	/** Gets display configuration */
	getDisplay(): TableDisplay;

	// Rendering
	/** Renders table as text lines */
	renderLines(width: number): string[];

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for table widget configuration.
 */
export const TableWidgetConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	data: z.array(z.array(z.string())).default([]),
	pad: z.number().int().min(0).max(10).default(1),
	align: z.enum(['left', 'center', 'right']).default('left'),
	style: z
		.object({
			border: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			header: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			cell: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			altRowBg: z.number().optional(),
			selected: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
		})
		.optional(),
	noCellBorders: z.boolean().default(false),
	headerRows: z.number().int().min(0).max(10).default(1),
	columns: z
		.array(
			z.object({
				header: z.string(),
				width: z.number().int().positive().optional(),
				minWidth: z.number().int().positive().optional(),
				maxWidth: z.number().int().positive().optional(),
				align: z.enum(['left', 'center', 'right']).optional(),
			}),
		)
		.optional(),
});

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Table widget with the given configuration.
 *
 * The Table widget provides a chainable API for creating and managing
 * data grid widgets with headers and cell borders.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Table widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createTable } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const table = createTable(world, eid, {
 *   x: 5,
 *   y: 5,
 *   data: [
 *     ['Name', 'Age', 'City'],
 *     ['Alice', '30', 'NYC'],
 *     ['Bob', '25', 'LA'],
 *   ],
 *   headerRows: 1,
 *   style: {
 *     header: { fg: 0xffffffff, bg: 0x333333ff },
 *     cell: { fg: 0xccccccff },
 *   },
 * });
 *
 * // Chain methods
 * table
 *   .setCellPadding(2)
 *   .setCellBorders(true)
 *   .setCell(1, 0, 'Alice Smith');
 *
 * // Render to strings
 * const lines = table.renderLines(80);
 *
 * // Clean up when done
 * table.destroy();
 * ```
 */
export function createTable(
	world: World,
	entity: Entity,
	config: TableWidgetConfig = {},
): TableWidget {
	const validated = TableWidgetConfigSchema.parse(config);
	const eid = entity;

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions if provided
	if (validated.width !== undefined && validated.height !== undefined) {
		setDimensions(world, eid, validated.width, validated.height);
	}

	// Attach table behavior
	attachTableBehavior(world, eid, {
		headerRows: validated.headerRows,
		pad: validated.pad,
		cellBorders: !validated.noCellBorders,
	});

	// Set initial data
	if (validated.data.length > 0) {
		setData(world, eid, validated.data);
	}

	// Set columns if provided
	if (validated.columns) {
		setHeaders(world, eid, validated.columns);
	}

	// Apply display styles if provided
	if (validated.style) {
		setTableDisplay(world, eid, styleConfigToDisplayOptions(validated.style));
	}

	// Create the widget object with chainable methods
	const widget: TableWidget = {
		eid,

		// Visibility
		show(): TableWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TableWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): TableWidget {
			Position.x[eid] = (Position.x[eid] ?? 0) + dx;
			Position.y[eid] = (Position.y[eid] ?? 0) + dy;
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): TableWidget {
			setPosition(world, eid, x, y);
			return widget;
		},

		// Data
		setData(data: readonly (readonly string[])[]): TableWidget {
			setData(world, eid, data);
			return widget;
		},

		getData(): string[][] {
			return getDataAsStrings(world, eid);
		},

		getFullData(): TableData {
			return getData(world, eid);
		},

		clearData(): TableWidget {
			clearData(world, eid);
			return widget;
		},

		// Cells
		setCell(row: number, col: number, value: string | TableCell): TableWidget {
			setCell(world, eid, row, col, value);
			return widget;
		},

		getCell(row: number, col: number): TableCell | undefined {
			return getCell(world, eid, row, col);
		},

		getCellValue(row: number, col: number): string | undefined {
			return getCellValue(world, eid, row, col);
		},

		// Rows
		getRow(row: number): TableRow | undefined {
			return getRow(world, eid, row);
		},

		appendRow(row: readonly string[]): TableWidget {
			appendRow(world, eid, row);
			return widget;
		},

		insertRow(index: number, row: readonly string[]): TableWidget {
			insertRow(world, eid, index, row);
			return widget;
		},

		removeRow(index: number): TableWidget {
			removeRow(world, eid, index);
			return widget;
		},

		getRowCount(): number {
			return getRowCount(world, eid);
		},

		// Columns
		setColumns(columns: readonly TableColumn[]): TableWidget {
			setHeaders(world, eid, columns);
			return widget;
		},

		getColumns(): readonly TableColumn[] {
			return getColumns(world, eid);
		},

		getColCount(): number {
			return getColCount(world, eid);
		},

		calculateColumnWidths(maxWidth?: number): number[] {
			return calculateColumnWidths(world, eid, maxWidth);
		},

		// Headers
		setHeaderRowCount(count: number): TableWidget {
			setHeaderRowCount(world, eid, count);
			return widget;
		},

		getHeaderRowCount(): number {
			return getHeaderRowCount(world, eid);
		},

		getHeaderRows(): readonly TableRow[] {
			return getHeaderRows(world, eid);
		},

		getDataRows(): readonly TableRow[] {
			return getDataRows(world, eid);
		},

		// Display
		setCellPadding(padding: number): TableWidget {
			setCellPadding(world, eid, padding);
			return widget;
		},

		getCellPadding(): number {
			return getCellPadding(world, eid);
		},

		setCellBorders(enabled: boolean): TableWidget {
			setCellBorders(world, eid, enabled);
			return widget;
		},

		hasCellBorders(): boolean {
			return hasCellBorders(world, eid);
		},

		setStyle(style: TableStyleConfig): TableWidget {
			setTableDisplay(world, eid, styleConfigToDisplayOptions(style));
			markDirty(world, eid);
			return widget;
		},

		getDisplay(): TableDisplay {
			return getTableDisplay(world, eid);
		},

		// Rendering
		renderLines(width: number): string[] {
			return renderTableLines(world, eid, width);
		},

		// Lifecycle
		destroy(): void {
			detachTableBehavior(world, eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a table.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a table
 */
export function isTableWidget(world: World, eid: Entity): boolean {
	return isTable(world, eid);
}
