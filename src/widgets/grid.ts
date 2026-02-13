/**
 * Grid Widget
 *
 * A grid layout container for organizing dashboard-style layouts with
 * rows, columns, gaps, and cell spanning support.
 *
 * @module widgets/grid
 */

import { z } from 'zod';
import { type DimensionValue, getDimensions, setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getParent, NULL_ENTITY } from '../components/hierarchy';
import { setPaddingAll } from '../components/padding';
import { getPosition, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Grid component marker for identifying grid entities.
 */
export const Grid = {
	/** Tag indicating this is a grid widget (1 = yes) */
	isGrid: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cell size specification - can be fixed number or percentage.
 */
export type CellSize = number | `${number}%`;

/**
 * Grid cell assignment for a child entity.
 */
export interface GridCell {
	/** The child entity ID */
	readonly entity: Entity;
	/** Starting row (0-indexed) */
	readonly row: number;
	/** Starting column (0-indexed) */
	readonly col: number;
	/** Number of rows to span (default: 1) */
	readonly rowSpan: number;
	/** Number of columns to span (default: 1) */
	readonly colSpan: number;
}

/**
 * Grid widget configuration.
 *
 * @example
 * ```typescript
 * const grid = createGrid(world, eid, {
 *   rows: 3,
 *   cols: 4,
 *   gap: 1,
 *   cellWidths: [100, '25%', '25%', '50%'],
 *   cellHeights: ['33%', '33%', '34%'],
 *   padding: 2,
 *   left: 10,
 *   top: 5,
 *   width: 80,
 *   height: 24
 * });
 * ```
 */
export interface GridConfig {
	/**
	 * Number of rows
	 * @default 1
	 */
	readonly rows?: number;

	/**
	 * Number of columns
	 * @default 1
	 */
	readonly cols?: number;

	/**
	 * Gap between cells (in terminal cells)
	 * @default 0
	 */
	readonly gap?: number;

	/**
	 * Cell widths (fixed or percentage). If array, must match cols count.
	 * If single value, applies to all columns.
	 * @default 'auto' (equal distribution)
	 */
	readonly cellWidths?: CellSize | readonly CellSize[];

	/**
	 * Cell heights (fixed or percentage). If array, must match rows count.
	 * If single value, applies to all rows.
	 * @default 'auto' (equal distribution)
	 */
	readonly cellHeights?: CellSize | readonly CellSize[];

	/**
	 * Padding around grid content
	 * @default 0
	 */
	readonly padding?: number;

	/**
	 * X position
	 * @default 0
	 */
	readonly left?: number;

	/**
	 * Y position
	 * @default 0
	 */
	readonly top?: number;

	/**
	 * Grid width
	 * @default 'auto'
	 */
	readonly width?: DimensionValue;

	/**
	 * Grid height
	 * @default 'auto'
	 */
	readonly height?: DimensionValue;

	/**
	 * Foreground color
	 * @default undefined
	 */
	readonly fg?: string | number;

	/**
	 * Background color
	 * @default undefined
	 */
	readonly bg?: string | number;
}

/**
 * Grid widget interface providing chainable methods.
 */
export interface GridWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the grid */
	show(): GridWidget;
	/** Hides the grid */
	hide(): GridWidget;

	// Focus
	/** Focuses the grid */
	focus(): GridWidget;
	/** Blurs the grid */
	blur(): GridWidget;
	/** Checks if focused */
	isFocused(): boolean;

	// Cell management
	/** Adds a child entity to a grid cell */
	addToCell(
		childEid: Entity,
		row: number,
		col: number,
		rowSpan?: number,
		colSpan?: number,
	): GridWidget;
	/** Removes a child entity from the grid */
	removeFromGrid(childEid: Entity): GridWidget;
	/** Gets all grid cell assignments */
	getCells(): readonly GridCell[];
	/** Recalculates and applies layout */
	layout(): GridWidget;

	// Configuration
	/** Updates gap between cells */
	setGap(gap: number): GridWidget;
	/** Updates cell widths */
	setCellWidths(widths: CellSize | readonly CellSize[]): GridWidget;
	/** Updates cell heights */
	setCellHeights(heights: CellSize | readonly CellSize[]): GridWidget;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMA
// =============================================================================

const CellSizeSchema = z.union([z.number().int().positive(), z.string().regex(/^\d+%$/)]);

export const GridConfigSchema = z.object({
	rows: z.number().int().positive().optional().default(1),
	cols: z.number().int().positive().optional().default(1),
	gap: z.number().int().min(0).optional().default(0),
	cellWidths: z.union([CellSizeSchema, z.array(CellSizeSchema)]).optional(),
	cellHeights: z.union([CellSizeSchema, z.array(CellSizeSchema)]).optional(),
	padding: z.number().int().min(0).optional().default(0),
	left: z.number().optional().default(0),
	top: z.number().optional().default(0),
	width: z
		.union([z.number(), z.string(), z.literal('auto')])
		.optional()
		.default('auto'),
	height: z
		.union([z.number(), z.string(), z.literal('auto')])
		.optional()
		.default('auto'),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

type ValidatedGridConfig = z.infer<typeof GridConfigSchema>;

// =============================================================================
// STATE
// =============================================================================

interface GridState {
	rows: number;
	cols: number;
	gap: number;
	cellWidths: readonly CellSize[];
	cellHeights: readonly CellSize[];
	padding: number;
	cells: GridCell[];
}

const gridStateMap = new Map<Entity, GridState>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parses a cell size value to a number (fixed) or percentage.
 */
function parseCellSize(size: CellSize): { value: number; isPercent: boolean } {
	if (typeof size === 'string' && size.endsWith('%')) {
		return { value: Number.parseFloat(size), isPercent: true };
	}
	return { value: typeof size === 'number' ? size : Number.parseInt(size, 10), isPercent: false };
}

/**
 * Calculates actual cell dimensions based on available space.
 */
function calculateCellDimensions(
	sizes: readonly CellSize[],
	count: number,
	totalSpace: number,
	gap: number,
): number[] {
	// Total gap space
	const totalGap = gap * (count - 1);
	const availableSpace = totalSpace - totalGap;

	// Parse all sizes
	const parsed = sizes.map(parseCellSize);

	// Calculate fixed space and percentage sum
	let fixedSpace = 0;
	let _percentSum = 0;
	for (const { value, isPercent } of parsed) {
		if (isPercent) {
			_percentSum += value;
		} else {
			fixedSpace += value;
		}
	}

	// Remaining space for percentages
	const percentSpace = availableSpace - fixedSpace;

	// Calculate final sizes
	const result: number[] = [];
	for (const { value, isPercent } of parsed) {
		if (isPercent) {
			// Percentage of remaining space
			result.push((value / 100) * percentSpace);
		} else {
			result.push(value);
		}
	}

	return result;
}

/** Validates grid cell bounds and throws if invalid */
function validateGridBounds(
	row: number,
	col: number,
	rowSpan: number,
	colSpan: number,
	rows: number,
	cols: number,
): void {
	if (row < 0 || row >= rows) {
		throw new Error(`Row ${row} out of bounds (0-${rows - 1})`);
	}
	if (col < 0 || col >= cols) {
		throw new Error(`Column ${col} out of bounds (0-${cols - 1})`);
	}
	if (row + rowSpan > rows) {
		throw new Error(`Row span ${rowSpan} exceeds grid bounds (row ${row} + span ${rowSpan} > ${rows})`);
	}
	if (col + colSpan > cols) {
		throw new Error(`Column span ${colSpan} exceeds grid bounds (col ${col} + span ${colSpan} > ${cols})`);
	}
}

/**
 * Calculates grid layout and updates child positions/dimensions.
 */
function applyGridLayout(world: World, eid: Entity, state: GridState): void {
	// Get grid dimensions
	const dims = getDimensions(world, eid);
	if (!dims) return;

	const gridWidth = dims.width;
	const gridHeight = dims.height;

	// Account for padding
	const contentWidth = gridWidth - state.padding * 2;
	const contentHeight = gridHeight - state.padding * 2;

	// Calculate cell dimensions
	const cellWidths = calculateCellDimensions(state.cellWidths, state.cols, contentWidth, state.gap);
	const cellHeights = calculateCellDimensions(
		state.cellHeights,
		state.rows,
		contentHeight,
		state.gap,
	);

	// Calculate cumulative positions (including gaps)
	const colPositions: number[] = [state.padding];
	for (let col = 0; col < state.cols; col++) {
		if (col > 0) {
			colPositions[col] = (colPositions[col - 1] ?? 0) + (cellWidths[col - 1] ?? 0) + state.gap;
		}
	}

	const rowPositions: number[] = [state.padding];
	for (let row = 0; row < state.rows; row++) {
		if (row > 0) {
			rowPositions[row] = (rowPositions[row - 1] ?? 0) + (cellHeights[row - 1] ?? 0) + state.gap;
		}
	}

	// Get grid position
	const gridPos = getPosition(world, eid);
	if (!gridPos) return;

	// Position each cell
	for (const cell of state.cells) {
		const cellX = colPositions[cell.col] ?? 0;
		const cellY = rowPositions[cell.row] ?? 0;

		// Calculate span dimensions
		let cellWidth = 0;
		for (let c = cell.col; c < cell.col + cell.colSpan && c < state.cols; c++) {
			cellWidth += cellWidths[c] ?? 0;
			if (c < cell.col + cell.colSpan - 1) {
				cellWidth += state.gap;
			}
		}

		let cellHeight = 0;
		for (let r = cell.row; r < cell.row + cell.rowSpan && r < state.rows; r++) {
			cellHeight += cellHeights[r] ?? 0;
			if (r < cell.row + cell.rowSpan - 1) {
				cellHeight += state.gap;
			}
		}

		// Set child position and dimensions (relative to grid)
		setPosition(world, cell.entity, gridPos.x + cellX, gridPos.y + cellY);
		setDimensions(world, cell.entity, cellWidth, cellHeight);
		markDirty(world, cell.entity);
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Grid layout widget for organizing dashboard-style layouts.
 *
 * The grid divides space into rows and columns with configurable gaps,
 * and supports cell spanning for flexible layouts.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Grid configuration
 * @returns The Grid widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createGrid } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Simple 2x2 grid
 * const grid = createGrid(world, eid, {
 *   rows: 2,
 *   cols: 2,
 *   gap: 1,
 *   width: 80,
 *   height: 24
 * });
 *
 * // Add children to cells
 * const child1 = addEntity(world);
 * const child2 = addEntity(world);
 * grid.addToCell(child1, 0, 0);  // Top-left
 * grid.addToCell(child2, 0, 1, 2, 1);  // Top-right, span 2 rows
 *
 * // Dashboard with mixed sizes
 * const dashboard = createGrid(world, eid, {
 *   rows: 3,
 *   cols: 4,
 *   gap: 2,
 *   cellWidths: [100, '25%', '25%', '50%'],
 *   cellHeights: ['33%', '33%', '34%'],
 *   padding: 2
 * });
 * ```
 */
export function createGrid(world: World, entity: Entity, config: GridConfig = {}): GridWidget {
	const validated = GridConfigSchema.parse(config) as ValidatedGridConfig;
	const eid = entity;

	// Mark as grid
	Grid.isGrid[eid] = 1;

	// Position and dimensions
	setPosition(world, eid, validated.left, validated.top);
	setDimensions(world, eid, validated.width as DimensionValue, validated.height as DimensionValue);

	// Set up focusable
	setFocusable(world, eid, { focusable: true });

	// Set up padding
	if (validated.padding > 0) {
		setPaddingAll(world, eid, validated.padding);
	}

	// Set up style
	const fgColor = validated.fg ? parseColor(validated.fg) : undefined;
	const bgColor = validated.bg ? parseColor(validated.bg) : undefined;
	if (fgColor !== undefined || bgColor !== undefined) {
		setStyle(world, eid, { fg: fgColor, bg: bgColor });
	}

	// Normalize cell sizes to arrays
	let cellWidths: readonly CellSize[];
	if (validated.cellWidths) {
		cellWidths = Array.isArray(validated.cellWidths)
			? validated.cellWidths
			: Array(validated.cols).fill(validated.cellWidths);
	} else {
		// Auto: equal percentages
		const equalPercent = `${100 / validated.cols}%` as const;
		cellWidths = Array(validated.cols).fill(equalPercent);
	}

	let cellHeights: readonly CellSize[];
	if (validated.cellHeights) {
		cellHeights = Array.isArray(validated.cellHeights)
			? validated.cellHeights
			: Array(validated.rows).fill(validated.cellHeights);
	} else {
		// Auto: equal percentages
		const equalPercent = `${100 / validated.rows}%` as const;
		cellHeights = Array(validated.rows).fill(equalPercent);
	}

	// Initialize state
	const state: GridState = {
		rows: validated.rows,
		cols: validated.cols,
		gap: validated.gap,
		cellWidths,
		cellHeights,
		padding: validated.padding,
		cells: [],
	};
	gridStateMap.set(eid, state);

	// Create the widget object with chainable methods
	const widget: GridWidget = {
		eid,

		// Visibility
		show(): GridWidget {
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide(): GridWidget {
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
		},

		// Focus
		focus(): GridWidget {
			focus(world, eid);
			return widget;
		},

		blur(): GridWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Cell management
		addToCell(childEid: Entity, row: number, col: number, rowSpan = 1, colSpan = 1): GridWidget {
			const currentState = gridStateMap.get(eid);
			if (!currentState) return widget;

			// Validate bounds
			validateGridBounds(row, col, rowSpan, colSpan, currentState.rows, currentState.cols);

			// Remove from previous cell if already in grid
			const existingIndex = currentState.cells.findIndex((c) => c.entity === childEid);
			if (existingIndex >= 0) {
				currentState.cells.splice(existingIndex, 1);
			}

			// Add to cell
			currentState.cells.push({
				entity: childEid,
				row,
				col,
				rowSpan,
				colSpan,
			});

			// Set up hierarchy if not already a child
			if (getParent(world, childEid) === NULL_ENTITY) {
				appendChild(world, eid, childEid);
			}

			// Apply layout
			applyGridLayout(world, eid, currentState);
			markDirty(world, eid);

			return widget;
		},

		removeFromGrid(childEid: Entity): GridWidget {
			const currentState = gridStateMap.get(eid);
			if (!currentState) return widget;

			const index = currentState.cells.findIndex((c) => c.entity === childEid);
			if (index >= 0) {
				currentState.cells.splice(index, 1);
				markDirty(world, eid);
			}

			return widget;
		},

		getCells(): readonly GridCell[] {
			const currentState = gridStateMap.get(eid);
			return currentState?.cells ?? [];
		},

		layout(): GridWidget {
			const currentState = gridStateMap.get(eid);
			if (currentState) {
				applyGridLayout(world, eid, currentState);
				markDirty(world, eid);
			}
			return widget;
		},

		// Configuration
		setGap(gap: number): GridWidget {
			const currentState = gridStateMap.get(eid);
			if (currentState) {
				currentState.gap = gap;
				applyGridLayout(world, eid, currentState);
				markDirty(world, eid);
			}
			return widget;
		},

		setCellWidths(widths: CellSize | readonly CellSize[]): GridWidget {
			const currentState = gridStateMap.get(eid);
			if (currentState) {
				currentState.cellWidths = Array.isArray(widths)
					? widths
					: Array(currentState.cols).fill(widths);
				applyGridLayout(world, eid, currentState);
				markDirty(world, eid);
			}
			return widget;
		},

		setCellHeights(heights: CellSize | readonly CellSize[]): GridWidget {
			const currentState = gridStateMap.get(eid);
			if (currentState) {
				currentState.cellHeights = Array.isArray(heights)
					? heights
					: Array(currentState.rows).fill(heights);
				applyGridLayout(world, eid, currentState);
				markDirty(world, eid);
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			gridStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

/**
 * Helper function to add a child entity to a grid cell.
 *
 * This is a convenience wrapper around grid.addToCell() for use when you
 * have the grid entity ID rather than the GridWidget instance.
 *
 * @param world - The ECS world
 * @param gridEid - The grid entity ID
 * @param childEid - The child entity ID to add
 * @param row - Starting row (0-indexed)
 * @param col - Starting column (0-indexed)
 * @param rowSpan - Number of rows to span (default: 1)
 * @param colSpan - Number of columns to span (default: 1)
 *
 * @example
 * ```typescript
 * import { addToGrid } from 'blecsd/widgets';
 *
 * const gridEid = addEntity(world);
 * const grid = createGrid(world, gridEid, { rows: 2, cols: 2 });
 *
 * const child = addEntity(world);
 * addToGrid(world, gridEid, child, 0, 0);  // Top-left
 *
 * const spanning = addEntity(world);
 * addToGrid(world, gridEid, spanning, 0, 1, 2, 1);  // Span 2 rows
 * ```
 */
export function addToGrid(
	world: World,
	gridEid: Entity,
	childEid: Entity,
	row: number,
	col: number,
	rowSpan = 1,
	colSpan = 1,
): void {
	const state = gridStateMap.get(gridEid);
	if (!state) {
		throw new Error(`Entity ${gridEid} is not a grid`);
	}

	// Validate bounds
	if (row < 0 || row >= state.rows) {
		throw new Error(`Row ${row} out of bounds (0-${state.rows - 1})`);
	}
	if (col < 0 || col >= state.cols) {
		throw new Error(`Column ${col} out of bounds (0-${state.cols - 1})`);
	}
	if (row + rowSpan > state.rows) {
		throw new Error(
			`Row span ${rowSpan} exceeds grid bounds (row ${row} + span ${rowSpan} > ${state.rows})`,
		);
	}
	if (col + colSpan > state.cols) {
		throw new Error(
			`Column span ${colSpan} exceeds grid bounds (col ${col} + span ${colSpan} > ${state.cols})`,
		);
	}

	// Remove from previous cell if already in grid
	const existingIndex = state.cells.findIndex((c) => c.entity === childEid);
	if (existingIndex >= 0) {
		state.cells.splice(existingIndex, 1);
	}

	// Add to cell
	state.cells.push({
		entity: childEid,
		row,
		col,
		rowSpan,
		colSpan,
	});

	// Set up hierarchy if not already a child
	if (getParent(world, childEid) === NULL_ENTITY) {
		appendChild(world, gridEid, childEid);
	}

	// Apply layout
	applyGridLayout(world, gridEid, state);
	markDirty(world, gridEid);
}

/**
 * Type guard to check if an entity is a grid widget.
 */
export function isGrid(_world: World, eid: Entity): boolean {
	return Grid.isGrid[eid] === 1;
}

/**
 * Resets the grid store (for testing).
 * @internal
 */
export function resetGridStore(): void {
	gridStateMap.clear();
}
