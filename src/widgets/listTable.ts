/**
 * ListTable Widget
 *
 * Provides a selectable table widget combining Table rendering with List selection.
 * Supports row selection (not cell selection), fixed headers, and keyboard navigation.
 *
 * @module widgets/listTable
 */

import { z } from 'zod';
import { setDimensions } from '../components/dimensions';
import {
	activateSelected,
	appendToSearchQuery,
	attachListBehavior,
	backspaceSearchQuery,
	blurList,
	clearListCallbacks,
	clearSearchQuery,
	endListSearch,
	findNextMatch,
	focusList,
	getListSearchQuery,
	getListState,
	getSelectedIndex,
	handleListKeyPress,
	isListSearching,
	type ListAction,
	type ListItem,
	type ListSelectCallback,
	type ListState,
	onListActivate,
	onListSearchChange,
	onListSelect,
	scrollPage,
	selectFirst,
	selectLast,
	selectNext,
	selectPrev,
	setItems,
	setSelectedIndex,
	startListSearch,
} from '../components/list';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import type {
	CellAlign,
	TableCell,
	TableColumn,
	TableData,
	TableDisplay,
	TableDisplayOptions,
	TableRow,
} from '../components/table';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	attachTableBehavior,
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
	isTable,
	setCell,
	setCellBorders,
	setCellPadding,
	setData,
	setHeaderRowCount,
	setHeaders,
	setTableDisplay,
} from '../systems/tableSystem';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Style configuration for ListTable.
 */
export interface ListTableStyleConfig {
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
	/** Selected row style */
	readonly selected?:
		| {
				readonly fg?: number | undefined;
				readonly bg?: number | undefined;
		  }
		| undefined;
	/** Alternate row background for striping */
	readonly altRowBg?: number | undefined;
}

/**
 * Configuration for creating a ListTable widget.
 */
export interface ListTableWidgetConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width of the table */
	readonly width?: number;
	/** Height of the table (visible rows including header) */
	readonly height?: number;
	/** Table data as string[][] (first row is header if headerRows > 0) */
	readonly data?: readonly (readonly string[])[];
	/** Cell padding (spaces) */
	readonly pad?: number;
	/** Default cell alignment */
	readonly align?: CellAlign;
	/** Style configuration */
	readonly style?: ListTableStyleConfig;
	/** Whether to show cell borders */
	readonly cellBorders?: boolean;
	/** Number of header rows (default: 1) */
	readonly headerRows?: number;
	/** Column configurations */
	readonly columns?: readonly TableColumn[];
	/** Initially selected row index (data row, not including headers) */
	readonly selected?: number;
	/** Whether the table is interactive (default: true) */
	readonly interactive?: boolean;
	/** Whether mouse input is enabled (default: true) */
	readonly mouse?: boolean;
	/** Whether keyboard input is enabled (default: true) */
	readonly keys?: boolean;
	/** Whether search mode is enabled (default: false) */
	readonly search?: boolean;
}

/**
 * ListTable widget interface providing chainable methods.
 */
export interface ListTableWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the table */
	show(): ListTableWidget;
	/** Hides the table */
	hide(): ListTableWidget;

	// Position
	/** Moves the table by dx, dy */
	move(dx: number, dy: number): ListTableWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ListTableWidget;

	// Focus
	/** Focuses the table */
	focus(): ListTableWidget;
	/** Blurs the table */
	blur(): ListTableWidget;

	// Data
	/** Sets the table data (first rows are headers based on headerRows) */
	setData(data: readonly (readonly string[])[]): ListTableWidget;
	/** Gets the table data as strings */
	getData(): string[][];
	/** Gets the full table data with cell metadata */
	getFullData(): TableData;
	/** Clears all table data */
	clearData(): ListTableWidget;

	// Cells
	/** Sets a cell value */
	setCell(row: number, col: number, value: string | TableCell): ListTableWidget;
	/** Gets a cell value */
	getCell(row: number, col: number): TableCell | undefined;
	/** Gets a cell's string value */
	getCellValue(row: number, col: number): string | undefined;

	// Rows
	/** Gets a row */
	getRow(row: number): TableRow | undefined;
	/** Gets the number of rows (including headers) */
	getRowCount(): number;
	/** Gets the number of data rows (excluding headers) */
	getDataRowCount(): number;

	// Columns
	/** Sets column configuration */
	setColumns(columns: readonly TableColumn[]): ListTableWidget;
	/** Gets column configuration */
	getColumns(): readonly TableColumn[];
	/** Gets the number of columns */
	getColCount(): number;

	// Headers
	/** Sets header row count */
	setHeaderRowCount(count: number): ListTableWidget;
	/** Gets header row count */
	getHeaderRowCount(): number;
	/** Gets header rows */
	getHeaderRows(): readonly TableRow[];
	/** Gets data rows (excluding headers) */
	getDataRows(): readonly TableRow[];

	// Display
	/** Sets cell padding */
	setCellPadding(padding: number): ListTableWidget;
	/** Gets cell padding */
	getCellPadding(): number;
	/** Sets whether to show cell borders */
	setCellBorders(enabled: boolean): ListTableWidget;
	/** Checks if cell borders are shown */
	hasCellBorders(): boolean;
	/** Sets display styles */
	setStyle(style: ListTableStyleConfig): ListTableWidget;
	/** Gets display configuration */
	getDisplay(): TableDisplay;

	// Selection (row-based)
	/** Selects a data row by index (0 = first data row after headers) */
	select(index: number): ListTableWidget;
	/** Gets the currently selected row index */
	getSelectedIndex(): number;
	/** Gets the currently selected row data */
	getSelectedRow(): TableRow | undefined;
	/** Selects the previous row */
	selectPrev(): ListTableWidget;
	/** Selects the next row */
	selectNext(): ListTableWidget;
	/** Selects the first data row */
	selectFirst(): ListTableWidget;
	/** Selects the last data row */
	selectLast(): ListTableWidget;
	/** Activates (confirms) the current selection */
	activate(): ListTableWidget;

	// Scrolling
	/** Scrolls up one page */
	pageUp(): ListTableWidget;
	/** Scrolls down one page */
	pageDown(): ListTableWidget;

	// Search
	/** Enters search mode */
	startSearch(): ListTableWidget;
	/** Exits search mode */
	endSearch(): ListTableWidget;
	/** Gets the current search query */
	getSearchQuery(): string;
	/** Checks if in search mode */
	isSearching(): boolean;

	// State
	/** Gets the current state */
	getState(): ListState;

	// Events
	/** Registers callback for selection change */
	onSelect(callback: ListSelectCallback): () => void;
	/** Registers callback for row activation */
	onActivate(callback: ListSelectCallback): () => void;
	/** Registers callback for search query change */
	onSearchChange(callback: (query: string) => void): () => void;

	// Key handling
	/** Handles a key press, returns the action taken */
	handleKey(key: string): ListAction | null;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for ListTable widget configuration.
 */
export const ListTableWidgetConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().default(10),
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
			selected: z
				.object({
					fg: z.number().optional(),
					bg: z.number().optional(),
				})
				.optional(),
			altRowBg: z.number().optional(),
		})
		.optional(),
	cellBorders: z.boolean().default(true),
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
	selected: z.number().int().min(-1).default(0),
	interactive: z.boolean().default(true),
	mouse: z.boolean().default(true),
	keys: z.boolean().default(true),
	search: z.boolean().default(false),
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Converts table data rows to list items for selection tracking.
 * Uses the first column as the display text.
 */
function dataRowsToListItems(data: readonly (readonly string[])[], headerRows: number): ListItem[] {
	const items: ListItem[] = [];
	for (let i = headerRows; i < data.length; i++) {
		const row = data[i];
		if (row) {
			// Use first column as text, entire row as value
			const text = row[0] ?? '';
			items.push({ text, value: row.join('\t') });
		}
	}
	return items;
}

function styleToTableDisplayOptions(style: ListTableStyleConfig): TableDisplayOptions {
	const borderFg = style.border?.fg;
	const borderBg = style.border?.bg;
	const headerFg = style.header?.fg;
	const headerBg = style.header?.bg;
	const cellFg = style.cell?.fg;
	const cellBg = style.cell?.bg;
	const altRowBg = style.altRowBg;
	const selectedFg = style.selected?.fg;
	const selectedBg = style.selected?.bg;

	return {
		...(borderFg !== undefined ? { borderFg } : {}),
		...(borderBg !== undefined ? { borderBg } : {}),
		...(headerFg !== undefined ? { headerFg } : {}),
		...(headerBg !== undefined ? { headerBg } : {}),
		...(cellFg !== undefined ? { cellFg } : {}),
		...(cellBg !== undefined ? { cellBg } : {}),
		...(altRowBg !== undefined ? { altRowBg } : {}),
		...(selectedFg !== undefined ? { selectedFg } : {}),
		...(selectedBg !== undefined ? { selectedBg } : {}),
	};
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a ListTable widget with the given configuration.
 *
 * The ListTable widget combines Table rendering with List selection,
 * providing a selectable data grid with fixed headers.
 *
 * Key bindings:
 * - Up/k: Previous row
 * - Down/j: Next row
 * - Enter/Space: Activate (confirm) selection
 * - Escape: Cancel
 * - /: Enter search mode (if enabled)
 * - g: First row
 * - G: Last row
 * - PageUp/PageDown: Scroll by page
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The ListTable widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createListTable } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const listTable = createListTable(world, eid, {
 *   x: 5,
 *   y: 5,
 *   data: [
 *     ['Name', 'Age', 'City'],  // Header row
 *     ['Alice', '30', 'NYC'],
 *     ['Bob', '25', 'LA'],
 *     ['Carol', '35', 'Chicago'],
 *   ],
 *   headerRows: 1,
 *   style: {
 *     header: { fg: 0xffffffff, bg: 0x333333ff },
 *     selected: { fg: 0x000000ff, bg: 0x00ffffff },
 *   },
 * });
 *
 * // Chain methods
 * listTable
 *   .focus()
 *   .selectFirst()
 *   .onSelect((index, item) => {
 *     console.log(`Selected row ${index}: ${item.value}`);
 *   });
 *
 * // Handle keys in your game loop
 * const action = listTable.handleKey('down');
 *
 * // Clean up when done
 * listTable.destroy();
 * ```
 */
export function createListTable(
	world: World,
	entity: Entity,
	config: ListTableWidgetConfig = {},
): ListTableWidget {
	const validated = ListTableWidgetConfigSchema.parse(config);
	const eid = entity;

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions if provided
	if (validated.width !== undefined) {
		setDimensions(world, eid, validated.width, validated.height);
	}

	// Attach table behavior for rendering
	attachTableBehavior(world, eid, {
		headerRows: validated.headerRows,
		pad: validated.pad,
		cellBorders: validated.cellBorders,
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
		setTableDisplay(world, eid, styleToTableDisplayOptions(validated.style));
	}

	// Convert data rows to list items for selection tracking
	const listItems = dataRowsToListItems(validated.data, validated.headerRows);

	// Attach list behavior for selection
	attachListBehavior(world, eid, listItems, {
		interactive: validated.interactive,
		mouse: validated.mouse,
		keys: validated.keys,
		search: validated.search,
		selectedIndex: validated.selected,
		visibleCount: Math.max(1, validated.height - validated.headerRows),
	});

	// Helper to sync list items when table data changes
	const syncListItems = (): void => {
		const currentData = getDataAsStrings(world, eid);
		const headerCount = getHeaderRowCount(world, eid);
		const items = dataRowsToListItems(currentData, headerCount);
		setItems(world, eid, items);
	};

	// Create the widget object with chainable methods
	const widget: ListTableWidget = {
		eid,

		// Visibility
		show(): ListTableWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): ListTableWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): ListTableWidget {
			Position.x[eid] = (Position.x[eid] ?? 0) + dx;
			Position.y[eid] = (Position.y[eid] ?? 0) + dy;
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): ListTableWidget {
			setPosition(world, eid, x, y);
			return widget;
		},

		// Focus
		focus(): ListTableWidget {
			focusList(world, eid);
			return widget;
		},

		blur(): ListTableWidget {
			blurList(world, eid);
			return widget;
		},

		// Data
		setData(data: readonly (readonly string[])[]): ListTableWidget {
			setData(world, eid, data);
			syncListItems();
			return widget;
		},

		getData(): string[][] {
			return getDataAsStrings(world, eid);
		},

		getFullData(): TableData {
			return getData(world, eid);
		},

		clearData(): ListTableWidget {
			clearData(world, eid);
			syncListItems();
			return widget;
		},

		// Cells
		setCell(row: number, col: number, value: string | TableCell): ListTableWidget {
			setCell(world, eid, row, col, value);
			syncListItems();
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

		getRowCount(): number {
			return getRowCount(world, eid);
		},

		getDataRowCount(): number {
			return Math.max(0, getRowCount(world, eid) - getHeaderRowCount(world, eid));
		},

		// Columns
		setColumns(columns: readonly TableColumn[]): ListTableWidget {
			setHeaders(world, eid, columns);
			return widget;
		},

		getColumns(): readonly TableColumn[] {
			return getColumns(world, eid);
		},

		getColCount(): number {
			return getColCount(world, eid);
		},

		// Headers
		setHeaderRowCount(count: number): ListTableWidget {
			setHeaderRowCount(world, eid, count);
			syncListItems();
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
		setCellPadding(padding: number): ListTableWidget {
			setCellPadding(world, eid, padding);
			return widget;
		},

		getCellPadding(): number {
			return getCellPadding(world, eid);
		},

		setCellBorders(enabled: boolean): ListTableWidget {
			setCellBorders(world, eid, enabled);
			return widget;
		},

		hasCellBorders(): boolean {
			return hasCellBorders(world, eid);
		},

		setStyle(style: ListTableStyleConfig): ListTableWidget {
			setTableDisplay(world, eid, styleToTableDisplayOptions(style));
			markDirty(world, eid);
			return widget;
		},

		getDisplay(): TableDisplay {
			return getTableDisplay(world, eid);
		},

		// Selection
		select(index: number): ListTableWidget {
			setSelectedIndex(world, eid, index);
			return widget;
		},

		getSelectedIndex(world, ): number {
			return getSelectedIndex(world, eid);
		},

		getSelectedRow(): TableRow | undefined {
			const selectedIdx = getSelectedIndex(world, eid);
			if (selectedIdx < 0) {
				return undefined;
			}
			// Convert list index to table row index (add header rows)
			const headerCount = getHeaderRowCount(world, eid);
			return getRow(world, eid, headerCount + selectedIdx);
		},

		selectPrev(): ListTableWidget {
			selectPrev(world, eid);
			return widget;
		},

		selectNext(): ListTableWidget {
			selectNext(world, eid);
			return widget;
		},

		selectFirst(): ListTableWidget {
			selectFirst(world, eid);
			return widget;
		},

		selectLast(): ListTableWidget {
			selectLast(world, eid);
			return widget;
		},

		activate(): ListTableWidget {
			activateSelected(world, eid);
			return widget;
		},

		// Scrolling
		pageUp(): ListTableWidget {
			scrollPage(world, eid, -1);
			return widget;
		},

		pageDown(): ListTableWidget {
			scrollPage(world, eid, 1);
			return widget;
		},

		// Search
		startSearch(): ListTableWidget {
			startListSearch(world, eid);
			return widget;
		},

		endSearch(): ListTableWidget {
			endListSearch(world, eid);
			return widget;
		},

		getSearchQuery(): string {
			return getListSearchQuery(world, eid);
		},

		isSearching(): boolean {
			return isListSearching(world, eid);
		},

		// State
		getState(): ListState {
			return getListState(world, eid);
		},

		// Events
		onSelect(callback: ListSelectCallback): () => void {
			return onListSelect(world, eid, callback);
		},

		onActivate(callback: ListSelectCallback): () => void {
			return onListActivate(world, eid, callback);
		},

		onSearchChange(callback: (query: string) => void): () => void {
			return onListSearchChange(world, eid, callback);
		},

		// Key handling
		handleKey(key: string): ListAction | null {
			const action = handleListKeyPress(world, eid, key);

			// Execute the action
			if (action) {
				switch (action.type) {
					case 'selectPrev':
						selectPrev(world, eid);
						break;
					case 'selectNext':
						selectNext(world, eid);
						break;
					case 'selectFirst':
						selectFirst(world, eid);
						break;
					case 'selectLast':
						selectLast(world, eid);
						break;
					case 'pageUp':
						scrollPage(world, eid, -1);
						break;
					case 'pageDown':
						scrollPage(world, eid, 1);
						break;
					case 'confirm':
						activateSelected(world, eid);
						break;
					case 'cancel':
						blurList(world, eid);
						break;
					case 'startSearch':
						startListSearch(world, eid);
						break;
					case 'endSearch':
						endListSearch(world, eid);
						break;
					case 'searchChar':
						appendToSearchQuery(world, eid, action.char);
						break;
					case 'searchBackspace':
						backspaceSearchQuery(world, eid);
						break;
					case 'searchNextMatch':
						findNextMatch(world, eid);
						break;
				}
			}

			return action;
		},

		// Lifecycle
		destroy(): void {
			clearListCallbacks(world, eid);
			clearSearchQuery(world, eid);
			detachTableBehavior(world, eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Checks if an entity is a ListTable.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity has both table and list behavior
 */
export function isListTableWidget(world: World, eid: Entity): boolean {
	// ListTable has both table and list behavior attached
	return isTable(world, eid);
}
