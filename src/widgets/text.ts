/**
 * Text Widget
 *
 * A simple text display widget that shrinks to fit its content by default.
 * Useful for labels, status messages, and other text elements.
 *
 * @module widgets/text
 */

import { z } from 'zod';
import { getContent, setContent, TextAlign, TextVAlign } from '../components/content';
import { setDimensions, setShrink } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
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
 * Configuration for creating a Text widget.
 *
 * @example
 * ```typescript
 * const text = createText(world, eid, {
 *   left: 10,
 *   top: 5,
 *   width: 40,
 *   content: 'Hello, World!',
 *   align: 'center',
 *   valign: 'middle',
 *   fg: '#FFFFFF',
 *   bg: '#000080',
 *   shrink: false
 * });
 * ```
 */
export interface TextConfig {
	// Position
	/**
	 * Left position (absolute pixels, percentage of parent, or keyword)
	 * @default 0
	 */
	readonly left?: PositionValue;
	/**
	 * Top position (absolute pixels, percentage of parent, or keyword)
	 * @default 0
	 */
	readonly top?: PositionValue;
	/**
	 * Right position (absolute pixels, percentage of parent, or keyword)
	 * @default undefined
	 */
	readonly right?: PositionValue;
	/**
	 * Bottom position (absolute pixels, percentage of parent, or keyword)
	 * @default undefined
	 */
	readonly bottom?: PositionValue;
	/**
	 * Width (absolute pixels, percentage of parent, or 'auto')
	 * @default 'auto' (fits content width)
	 */
	readonly width?: DimensionValue;
	/**
	 * Height (absolute pixels, percentage of parent, or 'auto')
	 * @default 'auto' (fits content height)
	 */
	readonly height?: DimensionValue;

	// Style
	/**
	 * Foreground (text) color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default foreground color
	 */
	readonly fg?: string | number;
	/**
	 * Background color (hex string like "#RRGGBB" or packed RGBA number)
	 * @default Terminal default background color
	 */
	readonly bg?: string | number;

	// Content
	/**
	 * Text content to display
	 * @default '' (empty string)
	 */
	readonly content?: string;
	/**
	 * Horizontal text alignment within the bounds
	 * @default 'left'
	 */
	readonly align?: Align;
	/**
	 * Vertical text alignment within the bounds
	 * @default 'top'
	 */
	readonly valign?: VAlign;

	// Behavior
	/**
	 * Whether to automatically shrink dimensions to fit content
	 * @default true
	 */
	readonly shrink?: boolean;
}

/**
 * Text widget interface providing chainable methods.
 */
export interface TextWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the text */
	show(): TextWidget;
	/** Hides the text */
	hide(): TextWidget;

	// Position
	/** Moves the text by dx, dy */
	move(dx: number, dy: number): TextWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): TextWidget;

	// Content
	/** Sets the text content */
	setContent(text: string): TextWidget;
	/** Gets the text content */
	getContent(): string;

	// Focus
	/** Focuses the text */
	focus(): TextWidget;
	/** Blurs the text */
	blur(): TextWidget;
	/** Checks if the text is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this text */
	append(child: Entity): TextWidget;
	/** Gets all direct children of this text */
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
 * Zod schema for text widget configuration.
 */
export const TextConfigSchema = z.object({
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

	// Content
	content: z.string().optional(),
	align: z.enum(['left', 'center', 'right']).optional(),
	valign: z.enum(['top', 'middle', 'bottom']).optional(),

	// Behavior
	shrink: z.boolean().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Text component marker for identifying text entities.
 */
export const Text = {
	/** Tag indicating this is a text widget (1 = yes) */
	isText: new Uint8Array(DEFAULT_CAPACITY),
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
 * Validated config type from TextConfigSchema.
 */
interface ValidatedTextConfig {
	left?: string | number;
	top?: string | number;
	right?: string | number;
	bottom?: string | number;
	width?: string | number;
	height?: string | number;
	fg?: string | number;
	bg?: string | number;
	content?: string;
	align?: 'left' | 'center' | 'right';
	valign?: 'top' | 'middle' | 'bottom';
	shrink?: boolean;
}

/**
 * Sets up position and dimensions on an entity.
 * @internal
 */
function setupPositionAndDimensions(world: World, eid: Entity, config: ValidatedTextConfig): void {
	const x = parsePositionToNumber(config.left);
	const y = parsePositionToNumber(config.top);
	setPosition(world, eid, x, y);

	const width = parseDimension(config.width);
	const height = parseDimension(config.height);
	setDimensions(world, eid, width, height);

	// Text widgets shrink to content by default
	const shouldShrink = config.shrink !== false;
	setShrink(world, eid, shouldShrink);
}

/**
 * Sets up style colors on an entity.
 * @internal
 */
function setupStyle(world: World, eid: Entity, config: ValidatedTextConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

/**
 * Sets up content on an entity.
 * @internal
 */
function setupContent(world: World, eid: Entity, config: ValidatedTextConfig): void {
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
 * Creates a Text widget with the given configuration.
 *
 * The Text widget is a simple container for displaying text that shrinks
 * to fit its content by default. Unlike Box, it has no border by default.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The Text widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { createText } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Simple label
 * const label = createText(world, eid, {
 *   left: 5,
 *   top: 2,
 *   content: 'Hello, World!',
 * });
 *
 * // Styled text
 * const status = createText(world, addEntity(world), {
 *   left: 0,
 *   top: 0,
 *   content: 'Status: Ready',
 *   fg: '#00ff00',
 *   align: 'center',
 * });
 *
 * // Chain methods
 * label
 *   .setContent('Updated!')
 *   .setPosition(10, 5)
 *   .show();
 * ```
 */
export function createText(world: World, entity: Entity, config: TextConfig = {}): TextWidget {
	const validated = TextConfigSchema.parse(config) as ValidatedTextConfig;
	const eid = entity;

	// Mark as text
	Text.isText[eid] = 1;

	// Set up components using helper functions
	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	setupContent(world, eid, validated);

	// Make focusable (but not focused by default)
	setFocusable(world, eid, { focusable: true });

	// Create the widget object with chainable methods
	const widget: TextWidget = {
		eid,

		// Visibility
		show(): TextWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): TextWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		move(dx: number, dy: number): TextWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): TextWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Content
		setContent(text: string): TextWidget {
			setContent(world, eid, text);
			markDirty(world, eid);
			return widget;
		},

		getContent(): string {
			return getContent(world, eid);
		},

		// Focus
		focus(): TextWidget {
			focus(world, eid);
			return widget;
		},

		blur(): TextWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		// Children
		append(child: Entity): TextWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		// Lifecycle
		destroy(): void {
			Text.isText[eid] = 0;
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sets the content of a text entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text content
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setTextContent } from 'blecsd/widgets';
 *
 * setTextContent(world, textEntity, 'New label');
 * ```
 */
export function setTextContent(world: World, eid: Entity, text: string): Entity {
	setContent(world, eid, text);
	markDirty(world, eid);
	return eid;
}

/**
 * Gets the content of a text entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The text content or empty string if no content
 *
 * @example
 * ```typescript
 * import { getTextContent } from 'blecsd/widgets';
 *
 * const label = getTextContent(world, textEntity);
 * console.log(label);
 * ```
 */
export function getTextContent(world: World, eid: Entity): string {
	return getContent(world, eid);
}

/**
 * Checks if an entity is a text widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a text widget
 *
 * @example
 * ```typescript
 * import { isText } from 'blecsd/widgets';
 *
 * if (isText(world, entity)) {
 *   // Handle text-specific logic
 * }
 * ```
 */
export function isText(_world: World, eid: Entity): boolean {
	return Text.isText[eid] === 1;
}

/**
 * Resets the Text component store. Useful for testing.
 * @internal
 */
export function resetTextStore(): void {
	Text.isText.fill(0);
}
