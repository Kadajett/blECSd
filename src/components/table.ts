/**
 * Table Component
 *
 * Pure data container for table/grid functionality.
 * All business logic is in tableSystem.ts.
 *
 * @module components/table
 */

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
	readonly width?: number | undefined;
	/** Column minimum width */
	readonly minWidth?: number | undefined;
	/** Column maximum width */
	readonly maxWidth?: number | undefined;
	/** Column alignment */
	readonly align?: CellAlign | undefined;
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
 * @deprecated Use tableStore instead
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
