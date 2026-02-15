/**
 * Layout Widget Types & Configuration
 *
 * @module widgets/layout/types
 */

import { z } from 'zod';
import type { Entity } from '../../core/types';

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
