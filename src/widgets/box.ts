/**
 * Box Widget
 *
 * Provides a chainable API wrapper around core components for creating
 * basic container widgets with borders, padding, and content.
 *
 * @module widgets/box
 */

import { z } from 'zod';
import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	type BorderCharset,
	BorderType,
	setBorder,
	setBorderChars,
} from '../components/border';
import { getContent, setContent, TextAlign, TextVAlign } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { setPadding } from '../components/padding';
import { moveBy, setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Dimension value that can be a number, percentage string, or 'auto'.
 */
export type DimensionValue = number | `${number}%` | 'auto';

/**
 * Position value that can be a number, percentage string, or keyword.
 */
export type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';

/**
 * Horizontal text alignment.
 */
export type Align = 'left' | 'center' | 'right';

/**
 * Vertical text alignment.
 */
export type VAlign = 'top' | 'middle' | 'bottom';

/**
 * Border configuration for boxes.
 */
export interface BorderConfig {
	/** Border type */
	readonly type?: 'line' | 'bg' | 'none';
	/** Foreground color for border (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color for border (hex string or packed number) */
	readonly bg?: string | number;
	/** Border charset ('single', 'double', 'rounded', 'bold', 'ascii', or custom) */
	readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}

/**
 * Padding configuration (all sides, or individual sides).
 */
export type PaddingConfig =
	| number
	| {
			readonly left?: number;
			readonly top?: number;
			readonly right?: number;
			readonly bottom?: number;
	  };

/**
 * Configuration for creating a Box widget.
 */
export interface BoxConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Right position (absolute or percentage) */
	readonly right?: PositionValue;
	/** Bottom position (absolute or percentage) */
	readonly bottom?: PositionValue;
	/** Width (absolute, percentage, or 'auto') */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') */
	readonly height?: DimensionValue;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;
	/** Border configuration */
	readonly border?: BorderConfig;
	/** Padding configuration */
	readonly padding?: PaddingConfig;

	// Content
	/** Text content */
	readonly content?: string;
	/** Horizontal text alignment */
	readonly align?: Align;
	/** Vertical text alignment */
	readonly valign?: VAlign;
}

/**
 * Box widget interface providing chainable methods.
 */
export interface BoxWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the box */
	show(): BoxWidget;
	/** Hides the box */
	hide(): BoxWidget;

	// Position
	/** Moves the box by dx, dy */
	move(dx: number, dy: number): BoxWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): BoxWidget;

	// Content
	/** Sets the text content of the box */
	setContent(text: string): BoxWidget;
	/** Gets the text content of the box */
	getContent(): string;

	// Focus
	/** Focuses the box */
	focus(): BoxWidget;
	/** Blurs the box */
	blur(): BoxWidget;
	/** Checks if the box is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this box */
	append(child: Entity): BoxWidget;
	/** Gets all direct children of this box */
	getChildren(): Entity[];

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for dimension values.
 */
const DimensionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.literal('auto'),
]);

/**
 * Zod schema for position values.
 */
const PositionValueSchema = z.union([
	z.number(),
	z.string().regex(/^\d+(\.\d+)?%$/, 'Percentage must be in format "50%"'),
	z.enum(['center', 'left', 'right', 'top', 'bottom']),
]);

/**
 * Zod schema for border configuration.
 */
const BorderConfigSchema = z
	.object({
		type: z.enum(['line', 'bg', 'none']).optional(),
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		ch: z
			.union([
				z.enum(['single', 'double', 'rounded', 'bold', 'ascii']),
				z.custom<BorderCharset>((val) => {
					return (
						typeof val === 'object' &&
						val !== null &&
						'topLeft' in val &&
						'topRight' in val &&
						'bottomLeft' in val &&
						'bottomRight' in val &&
						'horizontal' in val &&
						'vertical' in val
					);
				}),
			])
			.optional(),
	})
	.optional();

/**
 * Zod schema for padding configuration.
 */
const PaddingConfigSchema = z
	.union([
		z.number().int().nonnegative(),
		z.object({
			left: z.number().int().nonnegative().optional(),
			top: z.number().int().nonnegative().optional(),
			right: z.number().int().nonnegative().optional(),
			bottom: z.number().int().nonnegative().optional(),
		}),
	])
	.optional();

/**
 * Zod schema for box widget configuration.
 */
export const BoxConfigSchema = z.object({
	// Position
	left: PositionValueSchema.optional(),
	top: PositionValueSchema.optional(),
	right: PositionValueSchema.optional(),
	bottom: PositionValueSchema.optional(),
	width: DimensionValueSchema.optional(),
	height: DimensionValueSchema.optional(),

	// Style
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
	border: BorderConfigSchema,
	padding: PaddingConfigSchema,

	// Content
	content: z.string().optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
	valign: z.enum(['top', 'middle', 'bottom']).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Box component marker for identifying box entities.
 */
export const Box = {
	/** Tag indicating this is a box widget (1 = yes) */
	isBox: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Converts align string to TextAlign enum.
 */
function alignToEnum(align: Align): TextAlign {
	switch (align) {
		case 'left':
			return TextAlign.Left;
		case 'center':
			return TextAlign.Center;
		case 'right':
			return TextAlign.Right;
	}
}

/**
 * Converts valign string to TextVAlign enum.
 */
function valignToEnum(valign: VAlign): TextVAlign {
	switch (valign) {
		case 'top':
			return TextVAlign.Top;
		case 'middle':
			return TextVAlign.Middle;
		case 'bottom':
			return TextVAlign.Bottom;
	}
}

/**
 * Gets the appropriate BorderCharset for a named style.
 */
function getBorderCharset(ch: 'single' | 'double' | 'rounded' | 'bold' | 'ascii'): BorderCharset {
	switch (ch) {
		case 'single':
			return BORDER_SINGLE;
		case 'double':
			return BORDER_DOUBLE;
		case 'rounded':
			return BORDER_ROUNDED;
		case 'bold':
			return BORDER_BOLD;
		case 'ascii':
			return BORDER_ASCII;
	}
}

/**
 * Converts border type string to BorderType enum.
 */
function borderTypeToEnum(type: 'line' | 'bg' | 'none'): BorderType {
	switch (type) {
		case 'line':
			return BorderType.Line;
		case 'bg':
			return BorderType.Background;
		case 'none':
			return BorderType.None;
	}
}

/**
 * Parses a position value to a number.
 * For percentages and keywords, returns 0 (resolved at render time).
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	// Percentages and other keywords need runtime resolution
	return 0;
}

/**
 * Parses a dimension value for setDimensions.
 */
function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		// Assume it's a percentage string
		return value as `${number}%`;
	}
	return value;
}

/**
 * Validated config type from BoxConfigSchema.
 */
interface ValidatedBoxConfig {
	left?: string | number;
	top?: string | number;
	right?: string | number;
	bottom?: string | number;
	width?: string | number;
	height?: string | number;
	fg?: string | number;
	bg?: string | number;
	border?: {
		type?: 'line' | 'bg' | 'none';
		fg?: string | number;
		bg?: string | number;
		ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
	};
	padding?:
		| number
		| {
				left?: number;
				top?: number;
				right?: number;
				bottom?: number;
		  };
	content?: string;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'middle' | 'bottom';
}

/**
 * Sets up position and dimensions on an entity.
 * @internal
 */
function setupPositionAndDimensions(world: World, eid: Entity, config: ValidatedBoxConfig): void {
	const x = parsePositionToNumber(config.left);
	const y = parsePositionToNumber(config.top);
	setPosition(world, eid, x, y);

	const width = parseDimension(config.width);
	const height = parseDimension(config.height);
	setDimensions(world, eid, width, height);
}

/**
 * Sets up style colors on an entity.
 * @internal
 */
function setupStyle(world: World, eid: Entity, config: ValidatedBoxConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

/**
 * Sets up border on an entity.
 * @internal
 */
function setupBorder(
	world: World,
	eid: Entity,
	borderConfig: NonNullable<ValidatedBoxConfig['border']>,
): void {
	const borderType = borderConfig.type ? borderTypeToEnum(borderConfig.type) : BorderType.Line;

	setBorder(world, eid, {
		type: borderType,
		fg: borderConfig.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});

	if (borderConfig.ch) {
		const charset =
			typeof borderConfig.ch === 'string' ? getBorderCharset(borderConfig.ch) : borderConfig.ch;
		setBorderChars(world, eid, charset);
	}
}

/**
 * Sets up padding on an entity.
 * @internal
 */
function setupPadding(
	world: World,
	eid: Entity,
	paddingConfig: NonNullable<ValidatedBoxConfig['padding']>,
): void {
	if (typeof paddingConfig === 'number') {
		setPadding(world, eid, {
			left: paddingConfig,
			top: paddingConfig,
			right: paddingConfig,
			bottom: paddingConfig,
		});
	} else {
		setPadding(world, eid, paddingConfig);
	}
}

/**
 * Sets up content on an entity.
 * @internal
 */
function setupContent(world: World, eid: Entity, config: ValidatedBoxConfig): void {
	if (config.content === undefined) return;

	const contentOptions: { align?: TextAlign; valign?: TextVAlign } = {};
	if (config.align) contentOptions.align = alignToEnum(config.align);
	if (config.valign) contentOptions.valign = valignToEnum(config.valign);
	setContent(world, eid, config.content, contentOptions);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Box widget with the given configuration.
 *
 * The Box widget is a basic container that can hold content and children.
 * It supports borders, padding, and styling.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap (or creates a new one if not provided)
 * @param config - Widget configuration
 * @returns The Box widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createBox } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const box = createBox(world, eid, {
 *   left: 5,
 *   top: 5,
 *   width: 30,
 *   height: 10,
 *   content: 'Hello, World!',
 *   border: { type: 'line' },
 *   padding: 1,
 * });
 *
 * // Chain methods
 * box
 *   .setContent('Updated content')
 *   .focus()
 *   .show();
 *
 * // Clean up when done
 * box.destroy();
 * ```
 */
export function createBox(world: World, entity: Entity, config: BoxConfig = {}): BoxWidget {
	const validated = BoxConfigSchema.parse(config) as ValidatedBoxConfig;
	const eid = entity;

	// Mark as box
	Box.isBox[eid] = 1;

	// Set up components using helper functions
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	if (validated.border) setupBorder(world, eid, validated.border);
	if (validated.padding !== undefined) setupPadding(world, eid, validated.padding);
	setupContent(world, eid, validated);

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Create the widget object with chainable methods
	const widget: BoxWidget = {
		eid,

		// Visibility
		show(): BoxWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): BoxWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): BoxWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): BoxWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setContent(text: string): BoxWidget {
			setContent(world, eid, text);
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			return getContent(world, eid);
		},

		// Focus
		focus(): BoxWidget {
			focus(world, eid);
			return widget;
		},

		blur(): BoxWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): BoxWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Lifecycle
		destroy(): void {
			Box.isBox[eid] = 0;
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sets the content of a box entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text content
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setBoxContent } from 'blecsd/widgets';
 *
 * setBoxContent(world, boxEntity, 'New content');
 * ```
 */
export function setBoxContent(world: World, eid: Entity, text: string): Entity {
	setContent(world, eid, text);
	markDirty(world, eid);
	return eid;
}

/**
 * Gets the content of a box entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The text content or empty string if no content
 *
 * @example
 * ```typescript
 * import { getBoxContent } from 'blecsd/widgets';
 *
 * const content = getBoxContent(world, boxEntity);
 * console.log(content);
 * ```
 */
export function getBoxContent(world: World, eid: Entity): string {
	return getContent(world, eid);
}

/**
 * Checks if an entity is a box widget.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the entity is a box
 *
 * @example
 * ```typescript
 * import { isBox } from 'blecsd/widgets';
 *
 * if (isBox(world, entity)) {
 *   // Handle box-specific logic
 * }
 * ```
 */
export function isBox(_world: World, eid: Entity): boolean {
	return Box.isBox[eid] === 1;
}

/**
 * Resets the Box component store. Useful for testing.
 * @internal
 */
export function resetBoxStore(): void {
	Box.isBox.fill(0);
}
