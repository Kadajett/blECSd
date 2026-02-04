/**
 * BigText Widget
 *
 * Renders large ASCII art text using bitmap fonts.
 *
 * @module widgets/bigText
 */

import { readFileSync } from 'node:fs';
import { removeEntity } from 'bitecs';
import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions, setShrink } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { appendChild, getChildren } from '../components/hierarchy';
import { moveBy, setPosition } from '../components/position';
import { hexToColor, markDirty, setStyle, setVisible } from '../components/renderable';
import type { Entity, World } from '../core/types';
import {
	type BitmapFont,
	BitmapFontSchema,
	getCharBitmap,
	loadFont as loadBuiltinFont,
	renderChar,
} from './fonts';

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
 * Bitmap font definition for BigText.
 */
export type FontDefinition = BitmapFont;

/**
 * Configuration for creating a BigText widget.
 */
export interface BigTextConfig {
	// Position
	/** Left position (absolute or percentage) */
	readonly left?: PositionValue;
	/** Top position (absolute or percentage) */
	readonly top?: PositionValue;
	/** Right position (absolute or percentage) */
	readonly right?: PositionValue;
	/** Bottom position (absolute or percentage) */
	readonly bottom?: PositionValue;
	/** Width (absolute, percentage, or 'auto') - defaults to 'auto' */
	readonly width?: DimensionValue;
	/** Height (absolute, percentage, or 'auto') - defaults to 'auto' */
	readonly height?: DimensionValue;

	// Style
	/** Foreground color (hex string or packed number) */
	readonly fg?: string | number;
	/** Background color (hex string or packed number) */
	readonly bg?: string | number;

	// Content
	/** Text content */
	readonly text: string;
	/** Font name (built-in), path, or font definition */
	readonly font?: string | FontDefinition;

	// Behavior
	/** Whether to shrink to content size (default: true) */
	readonly shrink?: boolean;
}

/**
 * BigText widget interface providing chainable methods.
 */
export interface BigTextWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the widget */
	show(): BigTextWidget;
	/** Hides the widget */
	hide(): BigTextWidget;

	// Position
	/** Moves the widget by dx, dy */
	move(dx: number, dy: number): BigTextWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): BigTextWidget;

	// Content
	/** Sets the text content */
	setText(text: string): BigTextWidget;
	/** Gets the text content */
	getText(): string;

	// Focus
	/** Focuses the widget */
	focus(): BigTextWidget;
	/** Blurs the widget */
	blur(): BigTextWidget;
	/** Checks if the widget is focused */
	isFocused(): boolean;

	// Children
	/** Appends a child entity to this widget */
	append(child: Entity): BigTextWidget;
	/** Gets all direct children of this widget */
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
 * Zod schema for BigText widget configuration.
 */
export const BigTextConfigSchema = z.object({
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
	text: z.string(),
	font: z.union([z.string(), BitmapFontSchema]).optional(),

	// Behavior
	shrink: z.boolean().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * BigText component marker for identifying BigText entities.
 */
export const BigText = {
	/** Tag indicating this is a BigText widget (1 = yes) */
	isBigText: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

const DEFAULT_FONT_NAME = 'terminus-14-bold';
const fontPathCache = new Map<string, FontDefinition>();
const sourceTextStore = new Map<Entity, string>();

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
 * Parses a position string into a numeric value (defaults to 0).
 */
function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	switch (value) {
		case 'left':
		case 'top':
			return 0;
		case 'center':
			return 0;
		case 'right':
		case 'bottom':
			return 0;
	}
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
 * Resolves a font definition from a config value.
 */
function resolveFont(font: string | FontDefinition | undefined): FontDefinition {
	if (!font) {
		return loadBuiltinFont(DEFAULT_FONT_NAME);
	}
	if (typeof font !== 'string') {
		return font;
	}
	if (font === 'terminus-14-bold' || font === 'terminus-14-normal') {
		return loadBuiltinFont(font);
	}
	return loadFont(font);
}

function renderEmptyGlyph(width: number, height: number): readonly string[] {
	const line = ' '.repeat(width);
	return Array.from({ length: height }, () => line);
}

function renderTextLine(font: FontDefinition, text: string): readonly string[] {
	const height = font.charHeight;
	const rows = Array.from({ length: height }, () => '');

	for (const char of Array.from(text)) {
		const bitmap = getCharBitmap(font, char);
		const glyphLines = bitmap
			? renderChar(font, char)
			: renderEmptyGlyph(font.charWidth, font.charHeight);

		for (let index = 0; index < height; index += 1) {
			const segment = glyphLines[index] ?? '';
			rows[index] = `${rows[index]}${segment}`;
		}
	}

	return rows;
}

function renderText(font: FontDefinition, text: string): string {
	const rawLines = text.split('\n');
	const renderedLines: string[] = [];

	for (const line of rawLines) {
		renderedLines.push(...renderTextLine(font, line));
	}

	return renderedLines.join('\n');
}

// =============================================================================
// PUBLIC HELPERS
// =============================================================================

/**
 * Loads a bitmap font definition from a JSON file path.
 *
 * @param path - Path to the font JSON file
 * @returns Loaded font definition
 *
 * @example
 * ```typescript
 * import { loadFont } from 'blecsd/widgets/bigText';
 *
 * const font = loadFont('./fonts/terminus-14-bold.json');
 * ```
 */
export function loadFont(path: string): FontDefinition {
	const cached = fontPathCache.get(path);
	if (cached) {
		return cached;
	}

	const raw = readFileSync(path, 'utf8');
	const parsed = JSON.parse(raw) as unknown;
	const font = BitmapFontSchema.parse(parsed);
	fontPathCache.set(path, font);
	return font;
}

// =============================================================================
// FACTORY
// =============================================================================

interface ValidatedBigTextConfig {
	left?: string | number;
	top?: string | number;
	right?: string | number;
	bottom?: string | number;
	width?: string | number;
	height?: string | number;
	fg?: string | number;
	bg?: string | number;
	text: string;
	font?: string | FontDefinition;
	shrink?: boolean;
}

function setupPositionAndDimensions(
	world: World,
	eid: Entity,
	config: ValidatedBigTextConfig,
): void {
	const x = parsePositionToNumber(config.left);
	const y = parsePositionToNumber(config.top);
	setPosition(world, eid, x, y);

	const width = parseDimension(config.width);
	const height = parseDimension(config.height);
	setDimensions(world, eid, width, height);

	const shouldShrink = config.shrink !== false;
	setShrink(world, eid, shouldShrink);
}

function setupStyle(world: World, eid: Entity, config: ValidatedBigTextConfig): void {
	if (config.fg === undefined && config.bg === undefined) return;

	setStyle(world, eid, {
		fg: config.fg !== undefined ? parseColor(config.fg) : undefined,
		bg: config.bg !== undefined ? parseColor(config.bg) : undefined,
	});
}

function setupContent(world: World, eid: Entity, config: ValidatedBigTextConfig): void {
	const font = resolveFont(config.font);
	const rendered = renderText(font, config.text);
	sourceTextStore.set(eid, config.text);
	setContent(world, eid, rendered);
}

/**
 * Creates a BigText widget with the given configuration.
 *
 * @param world - The ECS world
 * @param entity - The entity to wrap
 * @param config - Widget configuration
 * @returns The BigText widget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { createBigText } from 'blecsd/widgets';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * const bigText = createBigText(world, eid, {
 *   text: 'HELLO',
 *   font: 'terminus-14-bold',
 * });
 * ```
 */
export function createBigText(world: World, entity: Entity, config: BigTextConfig): BigTextWidget {
	const validated = BigTextConfigSchema.parse(config) as ValidatedBigTextConfig;
	const eid = entity;

	BigText.isBigText[eid] = 1;

	setupPositionAndDimensions(world, eid, validated);
	setupStyle(world, eid, validated);
	setupContent(world, eid, validated);

	setFocusable(world, eid, { focusable: true });

	const widget: BigTextWidget = {
		eid,

		show(): BigTextWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): BigTextWidget {
			setVisible(world, eid, false);
			return widget;
		},

		move(dx: number, dy: number): BigTextWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		setPosition(x: number, y: number): BigTextWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		setText(text: string): BigTextWidget {
			setTextContent(world, eid, text, validated.font);
			return widget;
		},

		getText(): string {
			return sourceTextStore.get(eid) ?? '';
		},

		focus(): BigTextWidget {
			focus(world, eid);
			return widget;
		},

		blur(): BigTextWidget {
			blur(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		append(child: Entity): BigTextWidget {
			appendChild(world, eid, child);
			return widget;
		},

		getChildren(): Entity[] {
			return getChildren(world, eid);
		},

		destroy(): void {
			BigText.isBigText[eid] = 0;
			sourceTextStore.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sets the text content of a BigText entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text content
 * @param font - Optional font override (name, path, or font definition)
 *
 * @example
 * ```typescript
 * import { setText } from 'blecsd/widgets';
 *
 * setText(world, bigTextEntity, 'NEW TEXT');
 * ```
 */
export function setText(
	world: World,
	eid: Entity,
	text: string,
	font?: string | FontDefinition,
): void {
	const resolvedFont = resolveFont(font);
	const rendered = renderText(resolvedFont, text);
	sourceTextStore.set(eid, text);
	setContent(world, eid, rendered);
	markDirty(world, eid);
}

function setTextContent(
	world: World,
	eid: Entity,
	text: string,
	font?: string | FontDefinition,
): Entity {
	setText(world, eid, text, font);
	return eid;
}

/**
 * Checks if an entity is a BigText widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a BigText widget
 *
 * @example
 * ```typescript
 * import { isBigText } from 'blecsd/widgets';
 *
 * if (isBigText(world, entity)) {
 *   // Handle big text-specific logic
 * }
 * ```
 */
export function isBigText(_world: World, eid: Entity): boolean {
	return BigText.isBigText[eid] === 1;
}

/**
 * Resets the BigText component store. Useful for testing.
 * @internal
 */
export function resetBigTextStore(): void {
	BigText.isBigText.fill(0);
	sourceTextStore.clear();
}
