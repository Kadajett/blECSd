/**
 * ScrollableBox Widget
 *
 * A scrollable container widget that combines Box functionality with scrolling.
 * Supports keyboard and mouse-based scrolling, configurable scrollbars, and
 * automatic scroll clamping.
 *
 * @module widgets/scrollableBox
 */

import { z } from 'zod';
import {
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
import {
	type ScrollableData,
	type ScrollableOptions,
	ScrollbarVisibility,
	type ScrollPercentage,
	type ScrollPosition,
} from '../components/scrollable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	canScroll,
	canScrollX,
	canScrollY,
	scrollBy as componentScrollBy,
	scrollTo as componentScrollTo,
	getScroll,
	getScrollable,
	getScrollPercentage,
	isAtBottom,
	isAtLeft,
	isAtRight,
	isAtTop,
	scrollToBottom,
	scrollToLeft,
	scrollToRight,
	scrollToTop,
	setScrollable,
	setScrollPercentage,
	setScrollSize,
	setViewport,
} from '../systems/scrollableSystem';
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
 * Scrollbar visibility mode.
 */
export type ScrollbarMode = 'auto' | 'visible' | 'hidden';

/**
 * Scrollbar configuration.
 */
export interface ScrollbarConfig {
	/** Scrollbar visibility mode */
	readonly mode?: ScrollbarMode;
	/** Scrollbar foreground color */
	readonly fg?: string | number;
	/** Scrollbar background color */
	readonly bg?: string | number;
	/** Track character */
	readonly trackChar?: string;
	/** Thumb character */
	readonly thumbChar?: string;
}

/**
 * Configuration for creating a ScrollableBox widget.
 */
export interface ScrollableBoxConfig {
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

	// Scrolling
	/** Scrollbar configuration (true for default, false to disable, or config) */
	readonly scrollbar?: boolean | ScrollbarConfig;
	/** Always show scrollbar even if content fits */
	readonly alwaysScroll?: boolean;
	/** Enable mouse wheel scrolling (default: true) */
	readonly mouse?: boolean;
	/** Enable keyboard scrolling (default: true) */
	readonly keys?: boolean;
	/** Total scrollable content width */
	readonly scrollWidth?: number;
	/** Total scrollable content height */
	readonly scrollHeight?: number;
	/** Initial scroll X position */
	readonly scrollX?: number;
	/** Initial scroll Y position */
	readonly scrollY?: number;
}

/**
 * ScrollableBox widget interface providing chainable methods.
 */
export interface ScrollableBoxWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the scrollable box */
	show(): ScrollableBoxWidget;
	/** Hides the scrollable box */
	hide(): ScrollableBoxWidget;

	// Position
	/** Moves the scrollable box by dx, dy */
	move(dx: number, dy: number): ScrollableBoxWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ScrollableBoxWidget;

	// Content
	/** Sets the text content of the scrollable box */
	setContent(text: string): ScrollableBoxWidget;
	/** Gets the text content of the scrollable box */
	getContent(): string;

	// Focus
	/** Focuses the scrollable box */
	focus(): ScrollableBoxWidget;
	/** Blurs the scrollable box */
	blur(): ScrollableBoxWidget;
	/** Checks if the scrollable box is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this scrollable box */
	append(child: Entity): ScrollableBoxWidget;
	/** Gets all direct children of this scrollable box */
	getChildren(): Entity[];

	// Scrolling
	/** Scrolls to absolute position */
	scrollTo(x: number, y: number): ScrollableBoxWidget;
	/** Scrolls by delta */
	scrollBy(dx: number, dy: number): ScrollableBoxWidget;
	/** Scrolls to percentage (0-100) */
	setScrollPerc(percX: number, percY: number): ScrollableBoxWidget;
	/** Gets scroll percentage (0-100) */
	getScrollPerc(): ScrollPercentage;
	/** Gets scroll position */
	getScroll(): ScrollPosition;
	/** Sets scrollable content size */
	setScrollSize(width: number, height: number): ScrollableBoxWidget;
	/** Sets viewport size */
	setViewport(width: number, height: number): ScrollableBoxWidget;
	/** Gets full scrollable data */
	getScrollable(): ScrollableData | undefined;
	/** Scrolls to top */
	scrollToTop(): ScrollableBoxWidget;
	/** Scrolls to bottom */
	scrollToBottom(): ScrollableBoxWidget;
	/** Scrolls to left */
	scrollToLeft(): ScrollableBoxWidget;
	/** Scrolls to right */
	scrollToRight(): ScrollableBoxWidget;
	/** Checks if can scroll (content exceeds viewport) */
	canScroll(): boolean;
	/** Checks if can scroll horizontally */
	canScrollX(): boolean;
	/** Checks if can scroll vertically */
	canScrollY(): boolean;
	/** Checks if scrolled to top */
	isAtTop(): boolean;
	/** Checks if scrolled to bottom */
	isAtBottom(): boolean;
	/** Checks if scrolled to left */
	isAtLeft(): boolean;
	/** Checks if scrolled to right */
	isAtRight(): boolean;

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
 * Zod schema for scrollbar configuration.
 */
const ScrollbarConfigSchema = z
	.union([
		z.boolean(),
		z.object({
			mode: z.enum(['auto', 'visible', 'hidden']).optional(),
			fg: z.union([z.string(), z.number()]).optional(),
			bg: z.union([z.string(), z.number()]).optional(),
			trackChar: z.string().optional(),
			thumbChar: z.string().optional(),
		}),
	])
	.optional();

/**
 * Zod schema for scrollable box widget configuration.
 */
export const ScrollableBoxConfigSchema = z.object({
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

	// Scrolling
	scrollbar: ScrollbarConfigSchema,
	alwaysScroll: z.boolean().optional(),
	mouse: z.boolean().optional(),
	keys: z.boolean().optional(),
	scrollWidth: z.number().nonnegative().optional(),
	scrollHeight: z.number().nonnegative().optional(),
	scrollX: z.number().optional(),
	scrollY: z.number().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * ScrollableBox component marker for identifying scrollable box entities.
 */
export const ScrollableBox = {
	/** Tag indicating this is a scrollable box widget (1 = yes) */
	isScrollableBox: new Uint8Array(DEFAULT_CAPACITY),
	/** Mouse scrolling enabled (1 = yes) */
	mouseEnabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Keyboard scrolling enabled (1 = yes) */
	keysEnabled: new Uint8Array(DEFAULT_CAPACITY),
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
	const { BORDER_DOUBLE, BORDER_ROUNDED, BORDER_BOLD, BORDER_ASCII } =
		require('../components/border');
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
 * Converts scrollbar mode to ScrollbarVisibility enum.
 */
function scrollbarModeToVisibility(mode: ScrollbarMode): ScrollbarVisibility {
	switch (mode) {
		case 'auto':
			return ScrollbarVisibility.Auto;
		case 'visible':
			return ScrollbarVisibility.Visible;
		case 'hidden':
			return ScrollbarVisibility.Hidden;
	}
}

/**
 * Validated config type from ScrollableBoxConfigSchema.
 */
interface ValidatedScrollableBoxConfig {
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
	scrollbar?:
		| boolean
		| {
				mode?: 'auto' | 'visible' | 'hidden';
				fg?: string | number;
				bg?: string | number;
				trackChar?: string;
				thumbChar?: string;
		  };
	alwaysScroll?: boolean;
	mouse?: boolean;
	keys?: boolean;
	scrollWidth?: number;
	scrollHeight?: number;
	scrollX?: number;
	scrollY?: number;
}

/**
 * Sets up position and dimensions on an entity.
 * @internal
 */
function setupPositionAndDimensions(
	world: World,
	eid: Entity,
	config: ValidatedScrollableBoxConfig,
): void {
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
function setupStyle(world: World, eid: Entity, config: ValidatedScrollableBoxConfig): void {
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
	borderConfig: NonNullable<ValidatedScrollableBoxConfig['border']>,
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
	paddingConfig: NonNullable<ValidatedScrollableBoxConfig['padding']>,
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
function setupContent(world: World, eid: Entity, config: ValidatedScrollableBoxConfig): void {
	if (config.content === undefined) return;

	const contentOptions: { align?: TextAlign; valign?: TextVAlign } = {};
	if (config.align) contentOptions.align = alignToEnum(config.align);
	if (config.valign) contentOptions.valign = valignToEnum(config.valign);
	setContent(world, eid, config.content, contentOptions);
}

/**
 * Sets up scrollable component on an entity.
 * @internal
 */
function setupScrollable(world: World, eid: Entity, config: ValidatedScrollableBoxConfig): void {
	const scrollableOptions: ScrollableOptions = {};

	// Set scroll size
	if (config.scrollWidth !== undefined) scrollableOptions.scrollWidth = config.scrollWidth;
	if (config.scrollHeight !== undefined) scrollableOptions.scrollHeight = config.scrollHeight;

	// Set initial scroll position
	if (config.scrollX !== undefined) scrollableOptions.scrollX = config.scrollX;
	if (config.scrollY !== undefined) scrollableOptions.scrollY = config.scrollY;

	// Set always scroll
	if (config.alwaysScroll !== undefined) scrollableOptions.alwaysScroll = config.alwaysScroll;

	// Handle scrollbar config
	if (config.scrollbar === true) {
		scrollableOptions.scrollbarVisible = ScrollbarVisibility.Auto;
	} else if (config.scrollbar === false) {
		scrollableOptions.scrollbarVisible = ScrollbarVisibility.Hidden;
	} else if (typeof config.scrollbar === 'object') {
		if (config.scrollbar.mode) {
			scrollableOptions.scrollbarVisible = scrollbarModeToVisibility(config.scrollbar.mode);
		}
	}

	setScrollable(world, eid, scrollableOptions);

	// Set mouse/keys enabled flags
	ScrollableBox.mouseEnabled[eid] = config.mouse !== false ? 1 : 0;
	ScrollableBox.keysEnabled[eid] = config.keys !== false ? 1 : 0;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a ScrollableBox widget with the given configuration.
 *
 * The ScrollableBox widget is a container that supports scrolling.
 * It combines Box functionality with scrollable content support.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The ScrollableBox widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createScrollableBox } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const scrollBox = createScrollableBox(world, eid, {
 *   left: 5,
 *   top: 5,
 *   width: 40,
 *   height: 10,
 *   scrollHeight: 100,  // Content is 100 lines tall
 *   border: { type: 'line' },
 *   scrollbar: true,
 * });
 *
 * // Scroll down
 * scrollBox.scrollBy(0, 5);
 *
 * // Scroll to 50%
 * scrollBox.setScrollPerc(0, 50);
 *
 * // Jump to bottom
 * scrollBox.scrollToBottom();
 * ```
 */
export function createScrollableBox(
	world: World,
	entity: Entity,
	config: ScrollableBoxConfig = {},
): ScrollableBoxWidget {
	const validated = ScrollableBoxConfigSchema.parse(config) as ValidatedScrollableBoxConfig;
	const eid = entity;

	// Mark as scrollable box
	ScrollableBox.isScrollableBox[eid] = 1;

	// Set up components using helper functions
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	if (validated.border) setupBorder(world, eid, validated.border);
	if (validated.padding !== undefined) setupPadding(world, eid, validated.padding);
	setupContent(world, eid, validated);
	setupScrollable(world, eid, validated);

	// Make focusable
	setFocusable(world, eid, { focusable: true });

	// Create the widget object with chainable methods
	const widget: ScrollableBoxWidget = {
		eid,

		// Visibility
		show(): ScrollableBoxWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): ScrollableBoxWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): ScrollableBoxWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): ScrollableBoxWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setContent(text: string): ScrollableBoxWidget {
			setContent(world, eid, text);
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			return getContent(world, eid);
		},

		// Focus
		focus(): ScrollableBoxWidget {
			focus(world, eid);
			return widget;
		},

		blur(): ScrollableBoxWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): ScrollableBoxWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Scrolling
		scrollTo(x: number, y: number): ScrollableBoxWidget {
			componentScrollTo(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		scrollBy(dx: number, dy: number): ScrollableBoxWidget {
			componentScrollBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setScrollPerc(percX: number, percY: number): ScrollableBoxWidget {
			setScrollPercentage(world, eid, percX, percY);
			markDirty(world, eid);
			return widget;
		},

		getScrollPerc(): ScrollPercentage {
			return getScrollPercentage(world, eid);
		},

		getScroll(): ScrollPosition {
			return getScroll(world, eid);
		},

		setScrollSize(width: number, height: number): ScrollableBoxWidget {
			setScrollSize(world, eid, width, height);
			markDirty(world, eid);
			return widget;
		},

		setViewport(width: number, height: number): ScrollableBoxWidget {
			setViewport(world, eid, width, height);
			markDirty(world, eid);
			return widget;
		},

		getScrollable(): ScrollableData | undefined {
			return getScrollable(world, eid);
		},

		scrollToTop(): ScrollableBoxWidget {
			scrollToTop(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToBottom(): ScrollableBoxWidget {
			scrollToBottom(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToLeft(): ScrollableBoxWidget {
			scrollToLeft(world, eid);
			markDirty(world, eid);
			return widget;
		},

		scrollToRight(): ScrollableBoxWidget {
			scrollToRight(world, eid);
			markDirty(world, eid);
			return widget;
		},

		canScroll(): boolean {
			return canScroll(world, eid);
		},

		canScrollX(): boolean {
			return canScrollX(world, eid);
		},

		canScrollY(): boolean {
			return canScrollY(world, eid);
		},

		isAtTop(): boolean {
			return isAtTop(world, eid);
		},

		isAtBottom(): boolean {
			return isAtBottom(world, eid);
		},

		isAtLeft(): boolean {
			return isAtLeft(world, eid);
		},

		isAtRight(): boolean {
			return isAtRight(world, eid);
		},

		// Lifecycle
		destroy(): void {
			ScrollableBox.isScrollableBox[eid] = 0;
			ScrollableBox.mouseEnabled[eid] = 0;
			ScrollableBox.keysEnabled[eid] = 0;
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a scrollable box widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a scrollable box
 *
 * @example
 * ```typescript
 * import { isScrollableBox } from 'blecsd/widgets';
 *
 * if (isScrollableBox(world, entity)) {
 *   // Handle scrollable-box-specific logic
 * }
 * ```
 */
export function isScrollableBox(_world: World, eid: Entity): boolean {
	return ScrollableBox.isScrollableBox[eid] === 1;
}

/**
 * Checks if mouse scrolling is enabled for a scrollable box.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if mouse scrolling is enabled
 */
export function isMouseScrollEnabled(_world: World, eid: Entity): boolean {
	return ScrollableBox.mouseEnabled[eid] === 1;
}

/**
 * Checks if keyboard scrolling is enabled for a scrollable box.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if keyboard scrolling is enabled
 */
export function isKeysScrollEnabled(_world: World, eid: Entity): boolean {
	return ScrollableBox.keysEnabled[eid] === 1;
}

/**
 * Resets the ScrollableBox component store. Useful for testing.
 * @internal
 */
export function resetScrollableBoxStore(): void {
	ScrollableBox.isScrollableBox.fill(0);
	ScrollableBox.mouseEnabled.fill(0);
	ScrollableBox.keysEnabled.fill(0);
}
