/**
 * Layout Widget
 *
 * An auto-layout container widget that arranges children using different
 * layout modes: inline (flow), grid, or flex.
 *
 * @module widgets/layout
 */

import { removeEntity } from 'bitecs';
import { z } from 'zod';
import { getDimensions, setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { getPosition, moveBy, setPosition } from '../components/position';
import { hexToColor, markDirty, setStyle, setVisible } from '../components/renderable';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Layout mode.
 */
export type LayoutMode = 'inline' | 'grid' | 'flex';

/**
 * Justify content alignment.
 */
export type JustifyContent = 'start' | 'center' | 'end' | 'space-between';

/**
 * Align items alignment.
 */
export type AlignItems = 'start' | 'center' | 'end';

/**
 * Flex direction.
 */
export type FlexDirection = 'row' | 'column';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Configuration for creating a Layout widget.
 */
export interface LayoutConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Width (absolute, percentage, or 'auto') */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') */
	readonly height?: DimensionValue;

	// Layout mode
	/** Layout mode: 'inline', 'grid', or 'flex' - default: 'inline' */
	readonly layout?: LayoutMode;

	// Layout options
	/** Gap between children - default: 0 */
	readonly gap?: number;
	/** Wrap children to next row/column - default: true */
	readonly wrap?: boolean;
	/** Justify content alignment - default: 'start' */
	readonly justify?: JustifyContent;
	/** Align items alignment - default: 'start' */
	readonly align?: AlignItems;

	// Grid-specific
	/** Number of columns (grid mode) */
	readonly cols?: number;

	// Flex-specific
	/** Flex direction - default: 'row' */
	readonly direction?: FlexDirection;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
}

/**
 * Layout widget interface providing chainable methods.
 */
export interface LayoutWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the layout */
	show(): LayoutWidget;
	/** Hides the layout */
	hide(): LayoutWidget;

	// Position
	/** Moves the layout by dx, dy */
	move(dx: number, dy: number): LayoutWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): LayoutWidget;

	// Layout-specific
	/** Gets the layout mode */
	getLayoutMode(): LayoutMode;
	/** Sets the gap between children */
	setGap(gap: number): LayoutWidget;
	/** Gets the gap between children */
	getGap(): number;
	/** Recalculates and applies layout to children */
	recalculate(): LayoutWidget;

	// Focus
	/** Focuses the layout */
	focus(): LayoutWidget;
	/** Blurs the layout */
	blur(): LayoutWidget;
	/** Checks if the layout is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this layout */
	append(child: Entity): LayoutWidget;
	/** Gets all direct children of this layout */
	getChildren(): Entity[];

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

/**
 * Child layout data for calculations.
 */
export interface ChildLayoutData {
	readonly eid: Entity;
	readonly width: number;
	readonly height: number;
}

/**
 * Layout position result.
 */
export interface LayoutPosition {
	readonly x: number;
	readonly y: number;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for layout widget configuration.
 */
export const LayoutConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Layout mode
	layout: z.enum(['inline', 'grid', 'flex']).optional(),

	// Layout options
	gap: z.number().nonnegative().optional(),
	wrap: z.boolean().optional(),
	justify: z.enum(['start', 'center', 'end', 'space-between']).optional(),
	align: z.enum(['start', 'center', 'end']).optional(),

	// Grid-specific
	cols: z.number().positive().optional(),

	// Flex-specific
	direction: z.enum(['row', 'column']).optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Layout component marker for identifying layout entities.
 */
export const Layout = {
	/** Tag indicating this is a layout widget (1 = yes) */
	isLayout: new Uint8Array(DEFAULT_CAPACITY),
	/** Layout mode (0=inline, 1=grid, 2=flex) */
	mode: new Uint8Array(DEFAULT_CAPACITY),
	/** Gap between children */
	gap: new Float32Array(DEFAULT_CAPACITY),
	/** Wrap enabled (0=no, 1=yes) */
	wrap: new Uint8Array(DEFAULT_CAPACITY),
	/** Justify content (0=start, 1=center, 2=end, 3=space-between) */
	justify: new Uint8Array(DEFAULT_CAPACITY),
	/** Align items (0=start, 1=center, 2=end) */
	align: new Uint8Array(DEFAULT_CAPACITY),
	/** Grid columns */
	cols: new Uint8Array(DEFAULT_CAPACITY),
	/** Flex direction (0=row, 1=column) */
	direction: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Parses a color value to a packed 32-bit color.
 */
function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

/**
 * Parses a position value to a number.
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Parses a dimension value for setDimensions.
 */
function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/**
 * Converts layout mode string to enum value.
 */
function layoutModeToNumber(mode: LayoutMode): number {
	switch (mode) {
		case 'inline':
			return 0;
		case 'grid':
			return 1;
		case 'flex':
			return 2;
	}
}

/**
 * Converts enum value to layout mode string.
 */
function numberToLayoutMode(value: number): LayoutMode {
	switch (value) {
		case 0:
			return 'inline';
		case 1:
			return 'grid';
		case 2:
			return 'flex';
		default:
			return 'inline';
	}
}

/**
 * Converts justify content string to enum value.
 */
function justifyToNumber(justify: JustifyContent): number {
	switch (justify) {
		case 'start':
			return 0;
		case 'center':
			return 1;
		case 'end':
			return 2;
		case 'space-between':
			return 3;
	}
}

/**
 * Converts align items string to enum value.
 */
function alignToNumber(align: AlignItems): number {
	switch (align) {
		case 'start':
			return 0;
		case 'center':
			return 1;
		case 'end':
			return 2;
	}
}

/**
 * Validated config type from LayoutConfigSchema.
 */
interface ValidatedLayoutConfig {
	left?: string | number;
	top?: string | number;
	width?: string | number;
	height?: string | number;
	layout?: 'inline' | 'grid' | 'flex';
	gap?: number;
	wrap?: boolean;
	justify?: 'start' | 'center' | 'end' | 'space-between';
	align?: 'start' | 'center' | 'end';
	cols?: number;
	direction?: 'row' | 'column';
	fg?: string | number;
	bg?: string | number;
}

/**
 * Gets child dimensions.
 */
function getChildData(world: World, children: Entity[]): ChildLayoutData[] {
	return children.map((eid) => {
		const dims = getDimensions(world, eid);
		return {
			eid,
			width: dims?.width ?? 1,
			height: dims?.height ?? 1,
		};
	});
}

// =============================================================================
// LAYOUT CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculates inline (flow) layout positions.
 * Children flow left-to-right, wrapping to next line when needed.
 *
 * @param children - Child layout data
 * @param containerWidth - Container width for wrapping
 * @param gap - Gap between children
 * @param wrap - Whether to wrap children
 * @returns Map of entity ID to position
 *
 * @example
 * ```typescript
 * const positions = calculateInlineLayout(children, 80, 1, true);
 * ```
 */
export function calculateInlineLayout(
	children: ChildLayoutData[],
	containerWidth: number,
	gap: number,
	wrap: boolean,
): Map<Entity, LayoutPosition> {
	const positions = new Map<Entity, LayoutPosition>();

	let x = 0;
	let y = 0;
	let rowHeight = 0;

	for (const child of children) {
		// Check if we need to wrap
		if (wrap && x > 0 && x + child.width > containerWidth) {
			x = 0;
			y += rowHeight + gap;
			rowHeight = 0;
		}

		positions.set(child.eid, { x, y });

		x += child.width + gap;
		rowHeight = Math.max(rowHeight, child.height);
	}

	return positions;
}

/**
 * Calculates grid layout positions.
 * Children are placed in a grid with fixed number of columns.
 *
 * @param children - Child layout data
 * @param cols - Number of columns
 * @param gap - Gap between children
 * @returns Map of entity ID to position
 *
 * @example
 * ```typescript
 * const positions = calculateGridLayout(children, 3, 1);
 * ```
 */
export function calculateGridLayout(
	children: ChildLayoutData[],
	cols: number,
	gap: number,
): Map<Entity, LayoutPosition> {
	const positions = new Map<Entity, LayoutPosition>();

	// Calculate column widths and row heights
	const colWidths: number[] = new Array(cols).fill(0);
	const rowHeights: number[] = [];

	// First pass: calculate max widths and heights
	children.forEach((child, index) => {
		const col = index % cols;
		const row = Math.floor(index / cols);

		colWidths[col] = Math.max(colWidths[col] as number, child.width);

		if (!rowHeights[row]) {
			rowHeights[row] = 0;
		}
		rowHeights[row] = Math.max(rowHeights[row] as number, child.height);
	});

	// Second pass: calculate positions
	children.forEach((child, index) => {
		const col = index % cols;
		const row = Math.floor(index / cols);

		// Calculate x position
		let x = 0;
		for (let c = 0; c < col; c++) {
			x += (colWidths[c] as number) + gap;
		}

		// Calculate y position
		let y = 0;
		for (let r = 0; r < row; r++) {
			y += (rowHeights[r] as number) + gap;
		}

		positions.set(child.eid, { x, y });
	});

	return positions;
}

/**
 * Calculates flex layout positions.
 * Children are arranged in a row or column with alignment.
 *
 * @param children - Child layout data
 * @param containerSize - Container size (width for row, height for column)
 * @param gap - Gap between children
 * @param direction - Flex direction
 * @param justify - Justify content
 * @param align - Align items
 * @returns Map of entity ID to position
 *
 * @example
 * ```typescript
 * const positions = calculateFlexLayout(children, 80, 1, 'row', 'center', 'center');
 * ```
 */
export function calculateFlexLayout(
	children: ChildLayoutData[],
	containerSize: number,
	gap: number,
	direction: FlexDirection,
	justify: JustifyContent,
	align: AlignItems,
): Map<Entity, LayoutPosition> {
	const positions = new Map<Entity, LayoutPosition>();

	if (children.length === 0) {
		return positions;
	}

	const isRow = direction === 'row';

	// Calculate total size of children
	const totalChildSize = children.reduce((sum, child) => {
		return sum + (isRow ? child.width : child.height);
	}, 0);

	const totalGap = gap * (children.length - 1);
	const totalSize = totalChildSize + totalGap;
	const freeSpace = Math.max(0, containerSize - totalSize);

	// Calculate max cross-axis size
	const maxCrossSize = Math.max(...children.map((c) => (isRow ? c.height : c.width)));

	// Calculate starting position based on justify
	let mainPos = 0;
	let spaceBetween = 0;

	switch (justify) {
		case 'start':
			mainPos = 0;
			break;
		case 'center':
			mainPos = freeSpace / 2;
			break;
		case 'end':
			mainPos = freeSpace;
			break;
		case 'space-between':
			mainPos = 0;
			if (children.length > 1) {
				spaceBetween = freeSpace / (children.length - 1);
			}
			break;
	}

	// Position children
	for (const child of children) {
		const childMainSize = isRow ? child.width : child.height;
		const childCrossSize = isRow ? child.height : child.width;

		// Calculate cross-axis position based on align
		let crossPos = 0;
		switch (align) {
			case 'start':
				crossPos = 0;
				break;
			case 'center':
				crossPos = (maxCrossSize - childCrossSize) / 2;
				break;
			case 'end':
				crossPos = maxCrossSize - childCrossSize;
				break;
		}

		if (isRow) {
			positions.set(child.eid, { x: mainPos, y: crossPos });
		} else {
			positions.set(child.eid, { x: crossPos, y: mainPos });
		}

		mainPos += childMainSize + gap + spaceBetween;
	}

	return positions;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Layout widget with the given configuration.
 *
 * The Layout widget is a container that automatically arranges its children
 * using different layout modes: inline (flow), grid, or flex.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Layout widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { createLayout, createBox } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Create a flex layout
 * const layout = createLayout(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 80,
 *   height: 24,
 *   layout: 'flex',
 *   direction: 'row',
 *   gap: 2,
 *   justify: 'center',
 *   align: 'center',
 * });
 *
 * // Add children
 * const child1 = createBox(world, addEntity(world), { width: 10, height: 5 });
 * const child2 = createBox(world, addEntity(world), { width: 10, height: 5 });
 * layout.append(child1.eid).append(child2.eid);
 *
 * // Recalculate layout
 * layout.recalculate();
 * ```
 */
export function createLayout(
	world: World,
	entity: Entity,
	config: LayoutConfig = {},
): LayoutWidget {
	const validated = LayoutConfigSchema.parse(config) as ValidatedLayoutConfig;
	const eid = entity;

	// Set layout properties
	const layoutMode = validated.layout ?? 'inline';
	Layout.isLayout[eid] = 1;
	Layout.mode[eid] = layoutModeToNumber(layoutMode);
	Layout.gap[eid] = validated.gap ?? 0;
	Layout.wrap[eid] = validated.wrap !== false ? 1 : 0;
	Layout.justify[eid] = justifyToNumber(validated.justify ?? 'start');
	Layout.align[eid] = alignToNumber(validated.align ?? 'start');
	Layout.cols[eid] = validated.cols ?? 3;
	Layout.direction[eid] = validated.direction === 'column' ? 1 : 0;

	// Set up position
	const x = parsePositionToNumber(validated.left);
	const y = parsePositionToNumber(validated.top);
	setPosition(world, eid, x, y);

	// Set up dimensions
	const width = parseDimension(validated.width);
	const height = parseDimension(validated.height);
	setDimensions(world, eid, width, height);

	// Set up style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	/**
	 * Recalculates layout positions for all children.
	 */
	function recalculateLayout(): void {
		const children = getChildren(world, eid);
		if (children.length === 0) return;

		const childData = getChildData(world, children);
		const gap = Layout.gap[eid] as number;
		const mode = numberToLayoutMode(Layout.mode[eid] as number);

		const dims = getDimensions(world, eid);
		const containerWidth = dims?.width ?? 80;
		const containerHeight = dims?.height ?? 24;

		let positions: Map<Entity, LayoutPosition>;

		switch (mode) {
			case 'inline': {
				const wrap = Layout.wrap[eid] === 1;
				positions = calculateInlineLayout(childData, containerWidth, gap, wrap);
				break;
			}
			case 'grid': {
				const cols = Layout.cols[eid] as number;
				positions = calculateGridLayout(childData, cols, gap);
				break;
			}
			case 'flex': {
				const direction = Layout.direction[eid] === 0 ? 'row' : 'column';
				const justify =
					(['start', 'center', 'end', 'space-between'] as const)[Layout.justify[eid] as number] ??
					'start';
				const alignVal =
					(['start', 'center', 'end'] as const)[Layout.align[eid] as number] ?? 'start';
				const containerSize = direction === 'row' ? containerWidth : containerHeight;
				positions = calculateFlexLayout(
					childData,
					containerSize,
					gap,
					direction as FlexDirection,
					justify as JustifyContent,
					alignVal as AlignItems,
				);
				break;
			}
		}

		// Apply positions to children
		const layoutPos = getPosition(world, eid);
		const offsetX = layoutPos?.x ?? 0;
		const offsetY = layoutPos?.y ?? 0;

		for (const [childEid, pos] of positions) {
			setPosition(world, childEid, offsetX + pos.x, offsetY + pos.y);
			markDirty(world, childEid);
		}

		markDirty(world, eid);
	}

	// Create the widget object with chainable methods
	const widget: LayoutWidget = {
		eid,

		// Visibility
		show(): LayoutWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): LayoutWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): LayoutWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(newX: number, newY: number): LayoutWidget {
			setPosition(world, eid, newX, newY);
			markDirty(world, eid);
			return widget;
		},

		// Layout-specific
		getLayoutMode(): LayoutMode {
			return numberToLayoutMode(Layout.mode[eid] as number);
		},

		setGap(newGap: number): LayoutWidget {
			Layout.gap[eid] = newGap;
			markDirty(world, eid);
			return widget;
		},

		getGap(): number {
			return Layout.gap[eid] as number;
		},

		recalculate(): LayoutWidget {
			recalculateLayout();
			return widget;
		},

		// Focus
		focus(): LayoutWidget {
			focus(world, eid);
			return widget;
		},

		blur(): LayoutWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): LayoutWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Lifecycle
		destroy(): void {
			Layout.isLayout[eid] = 0;
			Layout.mode[eid] = 0;
			Layout.gap[eid] = 0;
			Layout.wrap[eid] = 0;
			Layout.justify[eid] = 0;
			Layout.align[eid] = 0;
			Layout.cols[eid] = 0;
			Layout.direction[eid] = 0;
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a layout widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a layout widget
 *
 * @example
 * ```typescript
 * import { isLayout } from 'blecsd/widgets';
 *
 * if (isLayout(world, entity)) {
 *   // Handle layout-specific logic
 * }
 * ```
 */
export function isLayout(_world: World, eid: Entity): boolean {
	return Layout.isLayout[eid] === 1;
}

/**
 * Gets the layout mode of a layout entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The layout mode
 */
export function getLayoutMode(_world: World, eid: Entity): LayoutMode {
	return numberToLayoutMode(Layout.mode[eid] as number);
}

/**
 * Resets the Layout component store. Useful for testing.
 * @internal
 */
export function resetLayoutStore(): void {
	Layout.isLayout.fill(0);
	Layout.mode.fill(0);
	Layout.gap.fill(0);
	Layout.wrap.fill(0);
	Layout.justify.fill(0);
	Layout.align.fill(0);
	Layout.cols.fill(0);
	Layout.direction.fill(0);
}
