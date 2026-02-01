/**
 * Entity factory functions for creating common entity types.
 * These are internal factories used by the Game class.
 * @module core/entities
 */

import { addComponent, addEntity } from 'bitecs';
import { z } from 'zod';

import { Border, type BorderCharset, type BorderOptions, setBorder } from '../components/border';
import { Content, type ContentOptions, setContent } from '../components/content';
import { Dimensions, type DimensionValue } from '../components/dimensions';
import { Focusable, type FocusableOptions, setFocusable } from '../components/focusable';
import { Hierarchy, setParent } from '../components/hierarchy';
import { Interactive, type InteractiveOptions, setInteractive } from '../components/interactive';
import { Padding, type PaddingOptions, setPadding } from '../components/padding';
import { Position } from '../components/position';
import { Renderable, type StyleOptions, setStyle } from '../components/renderable';
import { Scrollable, type ScrollableOptions, setScrollable } from '../components/scrollable';
import type { Entity, World } from './types';

// =============================================================================
// CONFIG SCHEMAS
// =============================================================================

/**
 * Position configuration shared by all entities.
 */
const PositionConfigSchema = z.object({
	x: z.number().optional(),
	y: z.number().optional(),
	z: z.number().optional(),
	absolute: z.boolean().optional(),
});

/**
 * Dimension configuration shared by entities with size.
 */
const DimensionConfigSchema = z.object({
	width: z.union([z.number(), z.string()]).optional(),
	height: z.union([z.number(), z.string()]).optional(),
	minWidth: z.number().optional(),
	maxWidth: z.number().optional(),
	minHeight: z.number().optional(),
	maxHeight: z.number().optional(),
	shrink: z.boolean().optional(),
});

/**
 * Style configuration for renderable entities.
 */
const StyleConfigSchema = z.object({
	fg: z.number().optional(),
	bg: z.number().optional(),
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	underline: z.boolean().optional(),
	strikethrough: z.boolean().optional(),
	dim: z.boolean().optional(),
	inverse: z.boolean().optional(),
	blink: z.boolean().optional(),
	visible: z.boolean().optional(),
});

/**
 * Border configuration.
 */
const BorderConfigSchema = z.object({
	type: z.number().optional(),
	left: z.boolean().optional(),
	right: z.boolean().optional(),
	top: z.boolean().optional(),
	bottom: z.boolean().optional(),
	fg: z.number().optional(),
	bg: z.number().optional(),
	chars: z.custom<BorderCharset>().optional(),
});

/**
 * Padding configuration.
 */
const PaddingConfigSchema = z.object({
	left: z.number().optional(),
	right: z.number().optional(),
	top: z.number().optional(),
	bottom: z.number().optional(),
});

/**
 * Content configuration for text entities.
 */
const ContentConfigSchema = z.object({
	text: z.string().optional(),
	align: z.number().optional(),
	valign: z.number().optional(),
	wrap: z.boolean().optional(),
	parseTags: z.boolean().optional(),
});

/**
 * Interactive configuration.
 */
const InteractiveConfigSchema = z.object({
	clickable: z.boolean().optional(),
	draggable: z.boolean().optional(),
	hoverable: z.boolean().optional(),
	keyable: z.boolean().optional(),
	hoverEffectFg: z.number().optional(),
	hoverEffectBg: z.number().optional(),
});

/**
 * Focusable configuration.
 */
const FocusableConfigSchema = z.object({
	focusable: z.boolean().optional(),
	tabIndex: z.number().optional(),
	focusEffectFg: z.number().optional(),
	focusEffectBg: z.number().optional(),
});

/**
 * Scrollable configuration.
 */
const ScrollableConfigSchema = z.object({
	scrollable: z.boolean().optional(),
	scrollX: z.number().optional(),
	scrollY: z.number().optional(),
	scrollWidth: z.number().optional(),
	scrollHeight: z.number().optional(),
	scrollbarVisible: z.number().optional(),
});

/**
 * Zod schema for validating box entity configuration.
 *
 * Box entities are basic container elements with position, dimensions,
 * optional border, padding, and styling. They serve as the foundation
 * for layout and grouping other elements.
 *
 * @example
 * ```typescript
 * import { BoxConfigSchema } from 'blecsd';
 *
 * const config = BoxConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 10,
 *   fg: 0xffffffff,
 *   bg: 0x0000ffff,
 *   border: {
 *     type: 1,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export const BoxConfigSchema = z
	.object({
		parent: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema);

/**
 * Configuration options for creating a box entity.
 *
 * @see {@link BoxConfigSchema} for validation
 * @see {@link createBoxEntity} for entity creation
 */
export type BoxConfig = z.infer<typeof BoxConfigSchema>;

/**
 * Zod schema for validating text entity configuration.
 *
 * Text entities display content with optional styling, border, alignment,
 * and text wrapping. They support both plain text and tag-parsed content.
 *
 * @example
 * ```typescript
 * import { TextConfigSchema, TextAlign, TextVAlign } from 'blecsd';
 *
 * const config = TextConfigSchema.parse({
 *   x: 5,
 *   y: 2,
 *   text: 'Hello, World!',
 *   fg: 0x00ff00ff,
 *   align: TextAlign.Center,
 *   valign: TextVAlign.Middle,
 *   wrap: true,
 * });
 * ```
 */
export const TextConfigSchema = z
	.object({
		parent: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(ContentConfigSchema);

/**
 * Configuration options for creating a text entity.
 *
 * @see {@link TextConfigSchema} for validation
 * @see {@link createTextEntity} for entity creation
 */
export type TextConfig = z.infer<typeof TextConfigSchema>;

/**
 * Zod schema for validating button entity configuration.
 *
 * Button entities are interactive elements with focus support, hover effects,
 * and click handling. They display a centered label and respond to keyboard
 * and mouse input.
 *
 * @example
 * ```typescript
 * import { ButtonConfigSchema, BorderType } from 'blecsd';
 *
 * const config = ButtonConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 12,
 *   height: 3,
 *   label: 'Submit',
 *   clickable: true,
 *   hoverable: true,
 *   focusable: true,
 *   border: {
 *     type: BorderType.Line,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export const ButtonConfigSchema = z
	.object({
		parent: z.number().optional(),
		label: z.string().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a button entity.
 *
 * @see {@link ButtonConfigSchema} for validation
 * @see {@link createButtonEntity} for entity creation
 */
export type ButtonConfig = z.infer<typeof ButtonConfigSchema>;

/**
 * Zod schema for validating screen entity configuration.
 *
 * Screen entities are the root container for all other entities. They represent
 * the terminal viewport and define the coordinate space for child elements.
 * Width and height are required and must be positive integers.
 *
 * @example
 * ```typescript
 * import { ScreenConfigSchema } from 'blecsd';
 *
 * const config = ScreenConfigSchema.parse({
 *   width: 80,
 *   height: 24,
 *   title: 'My Terminal App',
 * });
 * ```
 */
export const ScreenConfigSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	title: z.string().optional(),
});

/**
 * Configuration options for creating a screen entity.
 * Width and height are required.
 *
 * @see {@link ScreenConfigSchema} for validation
 * @see {@link createScreenEntity} for entity creation
 */
export type ScreenConfig = z.infer<typeof ScreenConfigSchema>;

/**
 * Zod schema for validating input entity configuration.
 *
 * Input entities are text input fields with focus and key handling.
 * They support placeholder text, maximum length constraints, and
 * visual feedback for focus and hover states.
 *
 * @example
 * ```typescript
 * import { InputConfigSchema } from 'blecsd';
 *
 * const config = InputConfigSchema.parse({
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   height: 1,
 *   value: '',
 *   placeholder: 'Enter your name...',
 *   maxLength: 100,
 *   focusable: true,
 *   focusEffectFg: 0x00ff00ff,
 *   focusEffectBg: 0x111111ff,
 * });
 * ```
 */
export const InputConfigSchema = z
	.object({
		parent: z.number().optional(),
		value: z.string().optional(),
		placeholder: z.string().optional(),
		maxLength: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(InteractiveConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating an input entity.
 *
 * @see {@link InputConfigSchema} for validation
 * @see {@link createInputEntity} for entity creation
 */
export type InputConfig = z.infer<typeof InputConfigSchema>;

/**
 * Zod schema for validating list entity configuration.
 *
 * List entities display a scrollable list of items with selection support.
 * They are focusable, respond to keyboard navigation, and support
 * configurable scrollbar visibility.
 *
 * @example
 * ```typescript
 * import { ListConfigSchema } from 'blecsd';
 *
 * const config = ListConfigSchema.parse({
 *   x: 5,
 *   y: 5,
 *   width: 30,
 *   height: 10,
 *   items: ['Option 1', 'Option 2', 'Option 3'],
 *   selectedIndex: 0,
 *   scrollable: true,
 *   focusable: true,
 *   border: {
 *     type: 1,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export const ListConfigSchema = z
	.object({
		parent: z.number().optional(),
		items: z.array(z.string()).optional(),
		selectedIndex: z.number().optional(),
		border: BorderConfigSchema.optional(),
		padding: PaddingConfigSchema.optional(),
	})
	.merge(PositionConfigSchema)
	.merge(DimensionConfigSchema)
	.merge(StyleConfigSchema)
	.merge(ScrollableConfigSchema)
	.merge(FocusableConfigSchema);

/**
 * Configuration options for creating a list entity.
 *
 * @see {@link ListConfigSchema} for validation
 * @see {@link createListEntity} for entity creation
 */
export type ListConfig = z.infer<typeof ListConfigSchema>;

// =============================================================================
// ENTITY FACTORIES
// =============================================================================

/**
 * Initializes base components for an entity.
 * Adds Position, Dimensions, Renderable, and Hierarchy.
 */
function initBaseComponents(world: World, eid: Entity): void {
	// Add components using bitecs addComponent
	addComponent(world, eid, Position);
	addComponent(world, eid, Dimensions);
	addComponent(world, eid, Renderable);
	addComponent(world, eid, Hierarchy);

	// Initialize Position
	Position.x[eid] = 0;
	Position.y[eid] = 0;
	Position.z[eid] = 0;
	Position.absolute[eid] = 0;

	// Initialize Dimensions
	Dimensions.width[eid] = 0;
	Dimensions.height[eid] = 0;
	Dimensions.minWidth[eid] = 0;
	Dimensions.minHeight[eid] = 0;
	Dimensions.maxWidth[eid] = Number.POSITIVE_INFINITY;
	Dimensions.maxHeight[eid] = Number.POSITIVE_INFINITY;
	Dimensions.shrink[eid] = 0;

	// Initialize Renderable
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 1;
	Renderable.fg[eid] = 0xffffffff;
	Renderable.bg[eid] = 0x000000ff;
	Renderable.bold[eid] = 0;
	Renderable.underline[eid] = 0;
	Renderable.blink[eid] = 0;
	Renderable.inverse[eid] = 0;
	Renderable.transparent[eid] = 0;

	// Initialize Hierarchy (using NULL_ENTITY for no parent/child)
	Hierarchy.parent[eid] = 0; // 0 = no parent in this implementation
	Hierarchy.firstChild[eid] = 0;
	Hierarchy.nextSibling[eid] = 0;
	Hierarchy.prevSibling[eid] = 0;
	Hierarchy.childCount[eid] = 0;
	Hierarchy.depth[eid] = 0;
}

/**
 * Applies position config to an entity.
 */
function applyPositionConfig(eid: Entity, config: z.infer<typeof PositionConfigSchema>): void {
	if (config.x !== undefined) Position.x[eid] = config.x;
	if (config.y !== undefined) Position.y[eid] = config.y;
	if (config.z !== undefined) Position.z[eid] = config.z;
	if (config.absolute !== undefined) Position.absolute[eid] = config.absolute ? 1 : 0;
}

/**
 * Parses a dimension value into the numeric format for storage.
 */
function parseDimValue(value: DimensionValue): number {
	if (typeof value === 'string' && value.endsWith('%')) {
		const percent = Number.parseFloat(value);
		return -(percent + 2); // Encode percentage
	}
	if (value === 'auto') {
		return -1; // AUTO_DIMENSION
	}
	return value as number;
}

/**
 * Applies dimension constraints to an entity.
 */
function applyDimensionConstraints(
	eid: Entity,
	config: z.infer<typeof DimensionConfigSchema>,
): void {
	if (config.minWidth !== undefined) Dimensions.minWidth[eid] = config.minWidth;
	if (config.maxWidth !== undefined) Dimensions.maxWidth[eid] = config.maxWidth;
	if (config.minHeight !== undefined) Dimensions.minHeight[eid] = config.minHeight;
	if (config.maxHeight !== undefined) Dimensions.maxHeight[eid] = config.maxHeight;
	if (config.shrink !== undefined) Dimensions.shrink[eid] = config.shrink ? 1 : 0;
}

/**
 * Applies dimension config to an entity.
 */
function applyDimensionConfig(eid: Entity, config: z.infer<typeof DimensionConfigSchema>): void {
	if (config.width !== undefined) {
		Dimensions.width[eid] = parseDimValue(config.width as DimensionValue);
	}
	if (config.height !== undefined) {
		Dimensions.height[eid] = parseDimValue(config.height as DimensionValue);
	}
	applyDimensionConstraints(eid, config);
}

/**
 * Applies style config to an entity.
 */
function applyStyleConfig(
	world: World,
	eid: Entity,
	config: z.infer<typeof StyleConfigSchema>,
): void {
	const styleOptions: StyleOptions = {};

	if (config.fg !== undefined) styleOptions.fg = config.fg;
	if (config.bg !== undefined) styleOptions.bg = config.bg;
	if (config.bold !== undefined) styleOptions.bold = config.bold;
	if (config.italic !== undefined) styleOptions.italic = config.italic;
	if (config.underline !== undefined) styleOptions.underline = config.underline;
	if (config.strikethrough !== undefined) styleOptions.strikethrough = config.strikethrough;
	if (config.dim !== undefined) styleOptions.dim = config.dim;
	if (config.inverse !== undefined) styleOptions.inverse = config.inverse;
	if (config.blink !== undefined) styleOptions.blink = config.blink;

	if (Object.keys(styleOptions).length > 0) {
		setStyle(world, eid, styleOptions);
	}

	if (config.visible !== undefined) {
		Renderable.visible[eid] = config.visible ? 1 : 0;
	}
}

/**
 * Applies border config to an entity.
 */
function applyBorderConfig(
	world: World,
	eid: Entity,
	config?: z.infer<typeof BorderConfigSchema>,
): void {
	if (!config) {
		return;
	}

	// Only initialize border if any border option is set
	const hasBorderConfig =
		config.type !== undefined ||
		config.left !== undefined ||
		config.right !== undefined ||
		config.top !== undefined ||
		config.bottom !== undefined ||
		config.fg !== undefined ||
		config.bg !== undefined ||
		config.chars !== undefined;

	if (!hasBorderConfig) {
		return;
	}

	// Initialize border component
	Border.type[eid] = config.type ?? 0;
	Border.left[eid] = 0;
	Border.right[eid] = 0;
	Border.top[eid] = 0;
	Border.bottom[eid] = 0;
	Border.fg[eid] = 0xffffffff;
	Border.bg[eid] = 0x000000ff;

	const borderOptions: BorderOptions = {};
	if (config.type !== undefined) borderOptions.type = config.type;
	if (config.left !== undefined) borderOptions.left = config.left;
	if (config.right !== undefined) borderOptions.right = config.right;
	if (config.top !== undefined) borderOptions.top = config.top;
	if (config.bottom !== undefined) borderOptions.bottom = config.bottom;
	if (config.fg !== undefined) borderOptions.fg = config.fg;
	if (config.bg !== undefined) borderOptions.bg = config.bg;
	if (config.chars !== undefined) borderOptions.chars = config.chars;

	setBorder(world, eid, borderOptions);
}

/**
 * Applies padding config to an entity.
 */
function applyPaddingConfig(
	world: World,
	eid: Entity,
	config?: z.infer<typeof PaddingConfigSchema>,
): void {
	if (!config) {
		return;
	}

	const hasPaddingConfig =
		config.left !== undefined ||
		config.right !== undefined ||
		config.top !== undefined ||
		config.bottom !== undefined;

	if (!hasPaddingConfig) {
		return;
	}

	// Initialize padding component
	Padding.left[eid] = 0;
	Padding.right[eid] = 0;
	Padding.top[eid] = 0;
	Padding.bottom[eid] = 0;

	const paddingOptions: PaddingOptions = {};
	if (config.left !== undefined) paddingOptions.left = config.left;
	if (config.right !== undefined) paddingOptions.right = config.right;
	if (config.top !== undefined) paddingOptions.top = config.top;
	if (config.bottom !== undefined) paddingOptions.bottom = config.bottom;

	setPadding(world, eid, paddingOptions);
}

/**
 * Creates a Box entity with the specified configuration.
 *
 * Box is a basic container element with position, dimensions, optional border,
 * and padding. Boxes serve as the foundation for layout and grouping other
 * elements in the UI hierarchy.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Optional box configuration options
 * @returns The created entity ID
 *
 * @example
 * ```typescript
 * import { createWorld, createBoxEntity, BorderType } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create a simple box
 * const box = createBoxEntity(world, {
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 10,
 * });
 *
 * // Create a styled box with border
 * const styledBox = createBoxEntity(world, {
 *   x: 0,
 *   y: 0,
 *   width: 20,
 *   height: 5,
 *   fg: 0xffffffff,
 *   bg: 0x0000ffff,
 *   border: {
 *     type: BorderType.Line,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 *   padding: {
 *     left: 1,
 *     right: 1,
 *     top: 0,
 *     bottom: 0,
 *   },
 * });
 *
 * // Create a child box
 * const childBox = createBoxEntity(world, {
 *   parent: styledBox,
 *   x: 2,
 *   y: 1,
 *   width: 10,
 *   height: 3,
 * });
 * ```
 */
export function createBoxEntity(world: World, config: BoxConfig = {}): Entity {
	const validated = BoxConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

/**
 * Initializes the Content component on an entity.
 */
function initContentComponent(world: World, eid: Entity): void {
	addComponent(world, eid, Content);
	Content.align[eid] = 0;
	Content.valign[eid] = 0;
	Content.wrap[eid] = 0;
	Content.parseTags[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;
	Content.contentId[eid] = 0;
}

/**
 * Applies content options to an entity without setting text.
 */
function applyContentOptionsWithoutText(
	eid: Entity,
	config: z.infer<typeof ContentConfigSchema>,
): void {
	if (config.align !== undefined) Content.align[eid] = config.align;
	if (config.valign !== undefined) Content.valign[eid] = config.valign;
	if (config.wrap !== undefined) Content.wrap[eid] = config.wrap ? 1 : 0;
	if (config.parseTags !== undefined) Content.parseTags[eid] = config.parseTags ? 1 : 0;
}

/**
 * Applies text content config to an entity.
 */
function applyTextContent(
	world: World,
	eid: Entity,
	config: z.infer<typeof ContentConfigSchema>,
): void {
	if (config.text !== undefined) {
		const contentOptions: ContentOptions = {};
		if (config.align !== undefined) contentOptions.align = config.align;
		if (config.valign !== undefined) contentOptions.valign = config.valign;
		if (config.wrap !== undefined) contentOptions.wrap = config.wrap;
		if (config.parseTags !== undefined) contentOptions.parseTags = config.parseTags;
		setContent(world, eid, config.text, contentOptions);
	} else {
		applyContentOptionsWithoutText(eid, config);
	}
}

/**
 * Creates a Text entity with the specified configuration.
 *
 * Text entities display content with optional styling, border, and text alignment.
 * They support text wrapping, vertical and horizontal alignment, and tag parsing
 * for inline styling.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Optional text configuration options
 * @returns The created entity ID
 *
 * @example
 * ```typescript
 * import { createWorld, createTextEntity, TextAlign, TextVAlign } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create simple text
 * const text = createTextEntity(world, {
 *   x: 5,
 *   y: 2,
 *   text: 'Hello, World!',
 * });
 *
 * // Create styled, centered text
 * const styledText = createTextEntity(world, {
 *   x: 0,
 *   y: 0,
 *   width: 40,
 *   height: 3,
 *   text: 'Centered Title',
 *   fg: 0x00ff00ff,
 *   align: TextAlign.Center,
 *   valign: TextVAlign.Middle,
 * });
 *
 * // Create wrapped text block
 * const paragraph = createTextEntity(world, {
 *   x: 5,
 *   y: 10,
 *   width: 60,
 *   text: 'This is a long paragraph that will wrap to fit within the specified width.',
 *   wrap: true,
 * });
 * ```
 */
export function createTextEntity(world: World, config: TextConfig = {}): Entity {
	const validated = TextConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	initContentComponent(world, eid);
	applyTextContent(world, eid, validated);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

/**
 * Creates a Button entity with the specified configuration.
 *
 * Button entities are interactive elements with focus support, hover effects,
 * and click handling. They display a centered label and respond to keyboard
 * and mouse input. Buttons are focusable, clickable, and hoverable by default.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Optional button configuration options
 * @returns The created entity ID
 *
 * @example
 * ```typescript
 * import { createWorld, createButtonEntity, BorderType } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create a simple button
 * const button = createButtonEntity(world, {
 *   x: 10,
 *   y: 5,
 *   width: 12,
 *   height: 3,
 *   label: 'Submit',
 * });
 *
 * // Create a styled button with border
 * const styledButton = createButtonEntity(world, {
 *   x: 10,
 *   y: 10,
 *   width: 16,
 *   height: 3,
 *   label: 'Cancel',
 *   fg: 0xffffffff,
 *   bg: 0xff0000ff,
 *   hoverEffectFg: 0xffffffff,
 *   hoverEffectBg: 0xff4444ff,
 *   focusEffectFg: 0xffffffff,
 *   focusEffectBg: 0x0066ffff,
 *   border: {
 *     type: BorderType.Line,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 *
 * // Create a button with custom tab order
 * const tabButton = createButtonEntity(world, {
 *   x: 30,
 *   y: 5,
 *   label: 'Next',
 *   tabIndex: 2,
 * });
 * ```
 */
export function createButtonEntity(world: World, config: ButtonConfig = {}): Entity {
	const validated = ButtonConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for label
	Content.align[eid] = 1; // Center by default
	Content.valign[eid] = 1; // Middle by default
	Content.wrap[eid] = 0;
	Content.parseTags[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;

	if (validated.label !== undefined) {
		setContent(world, eid, validated.label);
	}

	// Initialize Interactive component
	addComponent(world, eid, Interactive);
	Interactive.clickable[eid] = 1; // Buttons are clickable by default
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 1; // Buttons are hoverable by default
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1; // Buttons respond to keys by default
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x444444ff;

	const interactiveOptions: InteractiveOptions = {};
	if (validated.clickable !== undefined) interactiveOptions.clickable = validated.clickable;
	if (validated.draggable !== undefined) interactiveOptions.draggable = validated.draggable;
	if (validated.hoverable !== undefined) interactiveOptions.hoverable = validated.hoverable;
	if (validated.keyable !== undefined) interactiveOptions.keyable = validated.keyable;
	if (validated.hoverEffectFg !== undefined)
		interactiveOptions.hoverEffectFg = validated.hoverEffectFg;
	if (validated.hoverEffectBg !== undefined)
		interactiveOptions.hoverEffectBg = validated.hoverEffectBg;

	if (Object.keys(interactiveOptions).length > 0) {
		setInteractive(world, eid, interactiveOptions);
	}

	// Initialize Focusable component
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1; // Buttons are focusable by default
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;

	const focusableOptions: FocusableOptions = {};
	if (validated.focusable !== undefined) focusableOptions.focusable = validated.focusable;
	if (validated.tabIndex !== undefined) focusableOptions.tabIndex = validated.tabIndex;
	if (validated.focusEffectFg !== undefined)
		focusableOptions.focusEffectFg = validated.focusEffectFg;
	if (validated.focusEffectBg !== undefined)
		focusableOptions.focusEffectBg = validated.focusEffectBg;

	if (Object.keys(focusableOptions).length > 0) {
		setFocusable(world, eid, focusableOptions);
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

/**
 * Creates a Screen entity with the specified configuration.
 *
 * Screen entities are the root container for all other entities. They represent
 * the terminal viewport and define the coordinate space for child elements.
 * Screens are always positioned at (0,0) and are always visible.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Screen configuration with required width and height
 * @returns The created entity ID
 * @throws {ZodError} If width or height are missing or not positive integers
 *
 * @example
 * ```typescript
 * import { createWorld, createScreenEntity } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create a screen matching terminal size
 * const screen = createScreenEntity(world, {
 *   width: 80,
 *   height: 24,
 * });
 *
 * // Create a screen with title
 * const namedScreen = createScreenEntity(world, {
 *   width: 120,
 *   height: 40,
 *   title: 'My Terminal Game',
 * });
 * ```
 */
export function createScreenEntity(world: World, config: ScreenConfig): Entity {
	const validated = ScreenConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);

	// Screen is always at 0,0 and not absolute
	Position.x[eid] = 0;
	Position.y[eid] = 0;
	Position.z[eid] = 0;
	Position.absolute[eid] = 0;

	// Set dimensions to terminal size
	Dimensions.width[eid] = validated.width;
	Dimensions.height[eid] = validated.height;

	// Screen is always visible
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 1;

	// Screen is the root (no parent - using 0 = NULL_ENTITY)
	Hierarchy.parent[eid] = 0;
	Hierarchy.depth[eid] = 0;

	return eid;
}

/**
 * Creates an Input entity with the specified configuration.
 *
 * Input entities are text input fields with focus and key handling.
 * They support placeholder text, maximum length constraints, and visual
 * feedback for focus and hover states. Inputs are focusable, clickable,
 * and keyable by default.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Optional input configuration options
 * @returns The created entity ID
 *
 * @example
 * ```typescript
 * import { createWorld, createInputEntity, BorderType } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create a simple input
 * const input = createInputEntity(world, {
 *   x: 10,
 *   y: 5,
 *   width: 30,
 *   height: 1,
 * });
 *
 * // Create an input with placeholder and validation
 * const emailInput = createInputEntity(world, {
 *   x: 10,
 *   y: 8,
 *   width: 40,
 *   height: 1,
 *   value: '',
 *   placeholder: 'Enter your email...',
 *   maxLength: 100,
 * });
 *
 * // Create a styled input with custom focus colors
 * const styledInput = createInputEntity(world, {
 *   x: 10,
 *   y: 11,
 *   width: 30,
 *   height: 1,
 *   focusEffectFg: 0x00ff00ff,
 *   focusEffectBg: 0x111111ff,
 *   border: {
 *     type: BorderType.Line,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 * ```
 */
export function createInputEntity(world: World, config: InputConfig = {}): Entity {
	const validated = InputConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	// Initialize Content component for value
	Content.align[eid] = 0; // Left align
	Content.valign[eid] = 1; // Middle
	Content.wrap[eid] = 0;
	Content.parseTags[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;

	if (validated.value !== undefined) {
		setContent(world, eid, validated.value);
	}

	// Initialize Interactive component
	Interactive.clickable[eid] = 1;
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 1;
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1;
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x333333ff;

	const interactiveOptions: InteractiveOptions = {};
	if (validated.clickable !== undefined) interactiveOptions.clickable = validated.clickable;
	if (validated.draggable !== undefined) interactiveOptions.draggable = validated.draggable;
	if (validated.hoverable !== undefined) interactiveOptions.hoverable = validated.hoverable;
	if (validated.keyable !== undefined) interactiveOptions.keyable = validated.keyable;
	if (validated.hoverEffectFg !== undefined)
		interactiveOptions.hoverEffectFg = validated.hoverEffectFg;
	if (validated.hoverEffectBg !== undefined)
		interactiveOptions.hoverEffectBg = validated.hoverEffectBg;

	if (Object.keys(interactiveOptions).length > 0) {
		setInteractive(world, eid, interactiveOptions);
	}

	// Initialize Focusable component
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1;
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;

	const focusableOptions: FocusableOptions = {};
	if (validated.focusable !== undefined) focusableOptions.focusable = validated.focusable;
	if (validated.tabIndex !== undefined) focusableOptions.tabIndex = validated.tabIndex;
	if (validated.focusEffectFg !== undefined)
		focusableOptions.focusEffectFg = validated.focusEffectFg;
	if (validated.focusEffectBg !== undefined)
		focusableOptions.focusEffectBg = validated.focusEffectBg;

	if (Object.keys(focusableOptions).length > 0) {
		setFocusable(world, eid, focusableOptions);
	}

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}

/**
 * Initializes Scrollable component with list-specific defaults.
 */
function initListScrollable(world: World, eid: Entity, itemCount: number): void {
	addComponent(world, eid, Scrollable);
	Scrollable.scrollX[eid] = 0;
	Scrollable.scrollY[eid] = 0;
	Scrollable.scrollWidth[eid] = 0;
	Scrollable.scrollHeight[eid] = itemCount;
	Scrollable.scrollbarVisible[eid] = 2; // Auto
}

/**
 * Applies list scrollable options.
 */
function applyListScrollableOptions(
	world: World,
	eid: Entity,
	config: z.infer<typeof ScrollableConfigSchema>,
): void {
	const scrollableOptions: ScrollableOptions = {};
	if (config.scrollable !== undefined) scrollableOptions.scrollX = 0;
	if (config.scrollX !== undefined) scrollableOptions.scrollX = config.scrollX;
	if (config.scrollY !== undefined) scrollableOptions.scrollY = config.scrollY;
	if (config.scrollWidth !== undefined) scrollableOptions.scrollWidth = config.scrollWidth;
	if (config.scrollHeight !== undefined) scrollableOptions.scrollHeight = config.scrollHeight;
	if (config.scrollbarVisible !== undefined)
		scrollableOptions.scrollbarVisible = config.scrollbarVisible;

	if (Object.keys(scrollableOptions).length > 0) {
		setScrollable(world, eid, scrollableOptions);
	}
}

/**
 * Initializes Interactive component with list-specific defaults.
 */
function initListInteractive(eid: Entity): void {
	Interactive.clickable[eid] = 1;
	Interactive.draggable[eid] = 0;
	Interactive.hoverable[eid] = 0;
	Interactive.hovered[eid] = 0;
	Interactive.pressed[eid] = 0;
	Interactive.keyable[eid] = 1;
	Interactive.hoverEffectFg[eid] = 0xffffffff;
	Interactive.hoverEffectBg[eid] = 0x444444ff;
}

/**
 * Initializes Focusable component with default values.
 */
function initFocusableComponent(world: World, eid: Entity): void {
	addComponent(world, eid, Focusable);
	Focusable.focusable[eid] = 1;
	Focusable.focused[eid] = 0;
	Focusable.tabIndex[eid] = 0;
	Focusable.focusEffectFg[eid] = 0xffffffff;
	Focusable.focusEffectBg[eid] = 0x0066ffff;
}

/**
 * Applies focusable options from config.
 */
function applyFocusableOptions(
	world: World,
	eid: Entity,
	config: z.infer<typeof FocusableConfigSchema>,
): void {
	const focusableOptions: FocusableOptions = {};
	if (config.focusable !== undefined) focusableOptions.focusable = config.focusable;
	if (config.tabIndex !== undefined) focusableOptions.tabIndex = config.tabIndex;
	if (config.focusEffectFg !== undefined) focusableOptions.focusEffectFg = config.focusEffectFg;
	if (config.focusEffectBg !== undefined) focusableOptions.focusEffectBg = config.focusEffectBg;

	if (Object.keys(focusableOptions).length > 0) {
		setFocusable(world, eid, focusableOptions);
	}
}

/**
 * Creates a List entity with the specified configuration.
 *
 * List entities display a scrollable list of items with selection support.
 * They are focusable, respond to keyboard navigation, and support configurable
 * scrollbar visibility. Items are stored as newline-separated content.
 *
 * @param world - The ECS world to create the entity in
 * @param config - Optional list configuration options
 * @returns The created entity ID
 *
 * @example
 * ```typescript
 * import { createWorld, createListEntity, BorderType } from 'blecsd';
 *
 * const world = createWorld();
 *
 * // Create a simple list
 * const list = createListEntity(world, {
 *   x: 5,
 *   y: 5,
 *   width: 30,
 *   height: 10,
 *   items: ['Option 1', 'Option 2', 'Option 3'],
 * });
 *
 * // Create a list with selection and scrolling
 * const menuList = createListEntity(world, {
 *   x: 0,
 *   y: 0,
 *   width: 25,
 *   height: 8,
 *   items: ['New Game', 'Load Game', 'Options', 'Credits', 'Exit'],
 *   selectedIndex: 0,
 *   scrollable: true,
 *   border: {
 *     type: BorderType.Line,
 *     left: true,
 *     right: true,
 *     top: true,
 *     bottom: true,
 *   },
 * });
 *
 * // Create a list with custom focus styling
 * const styledList = createListEntity(world, {
 *   x: 30,
 *   y: 5,
 *   width: 20,
 *   height: 6,
 *   items: ['Red', 'Green', 'Blue'],
 *   focusEffectFg: 0xffff00ff,
 *   focusEffectBg: 0x333333ff,
 *   tabIndex: 1,
 * });
 * ```
 */
export function createListEntity(world: World, config: ListConfig = {}): Entity {
	const validated = ListConfigSchema.parse(config);
	const eid = addEntity(world) as Entity;

	initBaseComponents(world, eid);
	applyPositionConfig(eid, validated);
	applyDimensionConfig(eid, validated);
	applyStyleConfig(world, eid, validated);
	applyBorderConfig(world, eid, validated.border);
	applyPaddingConfig(world, eid, validated.padding);

	initContentComponent(world, eid);
	if (validated.items !== undefined && validated.items.length > 0) {
		setContent(world, eid, validated.items.join('\n'));
	}

	initListScrollable(world, eid, validated.items?.length ?? 0);
	applyListScrollableOptions(world, eid, validated);

	initFocusableComponent(world, eid);
	applyFocusableOptions(world, eid, validated);

	initListInteractive(eid);

	if (validated.parent !== undefined) {
		setParent(world, eid, validated.parent as Entity);
	}

	return eid;
}
