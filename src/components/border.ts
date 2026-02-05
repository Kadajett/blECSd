/**
 * Border component for element borders.
 * @module components/border
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Border type enumeration.
 */
export enum BorderType {
	/** No border */
	None = 0,
	/** Line border using box-drawing characters */
	Line = 1,
	/** Background color border */
	Background = 2,
	/** Custom characters border */
	Custom = 3,
}

/**
 * Preset border character sets.
 */
export interface BorderCharset {
	readonly topLeft: number;
	readonly topRight: number;
	readonly bottomLeft: number;
	readonly bottomRight: number;
	readonly horizontal: number;
	readonly vertical: number;
}

/**
 * Single line border characters (─ │ ┌ ┐ └ ┘).
 */
export const BORDER_SINGLE: BorderCharset = {
	topLeft: 0x250c, // ┌
	topRight: 0x2510, // ┐
	bottomLeft: 0x2514, // └
	bottomRight: 0x2518, // ┘
	horizontal: 0x2500, // ─
	vertical: 0x2502, // │
};

/**
 * Double line border characters (═ ║ ╔ ╗ ╚ ╝).
 */
export const BORDER_DOUBLE: BorderCharset = {
	topLeft: 0x2554, // ╔
	topRight: 0x2557, // ╗
	bottomLeft: 0x255a, // ╚
	bottomRight: 0x255d, // ╝
	horizontal: 0x2550, // ═
	vertical: 0x2551, // ║
};

/**
 * Rounded border characters (─ │ ╭ ╮ ╰ ╯).
 */
export const BORDER_ROUNDED: BorderCharset = {
	topLeft: 0x256d, // ╭
	topRight: 0x256e, // ╮
	bottomLeft: 0x2570, // ╰
	bottomRight: 0x256f, // ╯
	horizontal: 0x2500, // ─
	vertical: 0x2502, // │
};

/**
 * Bold/thick border characters (━ ┃ ┏ ┓ ┗ ┛).
 */
export const BORDER_BOLD: BorderCharset = {
	topLeft: 0x250f, // ┏
	topRight: 0x2513, // ┓
	bottomLeft: 0x2517, // ┗
	bottomRight: 0x251b, // ┛
	horizontal: 0x2501, // ━
	vertical: 0x2503, // ┃
};

/**
 * ASCII border characters (- | + + + +).
 */
export const BORDER_ASCII: BorderCharset = {
	topLeft: 0x2b, // +
	topRight: 0x2b, // +
	bottomLeft: 0x2b, // +
	bottomRight: 0x2b, // +
	horizontal: 0x2d, // -
	vertical: 0x7c, // |
};

/**
 * Default foreground color for borders (white).
 */
export const DEFAULT_BORDER_FG = 0xffffffff;

/**
 * Default background color for borders (transparent).
 */
export const DEFAULT_BORDER_BG = 0x00000000;

/**
 * Border component store using SoA (Structure of Arrays) for performance.
 *
 * - `type`: Border type (0=none, 1=line, 2=bg, 3=custom)
 * - `left`, `top`, `right`, `bottom`: Which sides have borders (0=no, 1=yes)
 * - `fg`, `bg`: Border colors (packed RGBA)
 * - `charTopLeft`, etc.: Unicode codepoints for border characters
 *
 * @example
 * ```typescript
 * import { Border, setBorder, getBorder, BorderType, BORDER_DOUBLE } from 'blecsd';
 *
 * setBorder(world, entity, { type: BorderType.Line });
 * setBorderChars(world, entity, BORDER_DOUBLE);
 *
 * const border = getBorder(world, entity);
 * console.log(border.type); // BorderType.Line
 * ```
 */
export const Border = {
	/** Border type (0=none, 1=line, 2=bg, 3=custom) */
	type: new Uint8Array(DEFAULT_CAPACITY),
	/** Left side enabled (0=no, 1=yes) */
	left: new Uint8Array(DEFAULT_CAPACITY),
	/** Top side enabled (0=no, 1=yes) */
	top: new Uint8Array(DEFAULT_CAPACITY),
	/** Right side enabled (0=no, 1=yes) */
	right: new Uint8Array(DEFAULT_CAPACITY),
	/** Bottom side enabled (0=no, 1=yes) */
	bottom: new Uint8Array(DEFAULT_CAPACITY),
	/** Foreground color (packed RGBA) */
	fg: new Uint32Array(DEFAULT_CAPACITY),
	/** Background color (packed RGBA) */
	bg: new Uint32Array(DEFAULT_CAPACITY),
	/** Top-left corner character (Unicode codepoint) */
	charTopLeft: new Uint32Array(DEFAULT_CAPACITY),
	/** Top-right corner character (Unicode codepoint) */
	charTopRight: new Uint32Array(DEFAULT_CAPACITY),
	/** Bottom-left corner character (Unicode codepoint) */
	charBottomLeft: new Uint32Array(DEFAULT_CAPACITY),
	/** Bottom-right corner character (Unicode codepoint) */
	charBottomRight: new Uint32Array(DEFAULT_CAPACITY),
	/** Horizontal edge character (Unicode codepoint) */
	charHorizontal: new Uint32Array(DEFAULT_CAPACITY),
	/** Vertical edge character (Unicode codepoint) */
	charVertical: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Border configuration options.
 */
export interface BorderOptions {
	/** Border type */
	type?: BorderType;
	/** Enable left side */
	left?: boolean;
	/** Enable top side */
	top?: boolean;
	/** Enable right side */
	right?: boolean;
	/** Enable bottom side */
	bottom?: boolean;
	/** Foreground color (hex string or packed number) */
	fg?: string | number;
	/** Background color (hex string or packed number) */
	bg?: string | number;
	/** Preset border charset or custom characters */
	chars?: BorderCharset;
}

/**
 * Border data returned by getBorder.
 */
export interface BorderData {
	readonly type: BorderType;
	readonly left: boolean;
	readonly top: boolean;
	readonly right: boolean;
	readonly bottom: boolean;
	readonly fg: number;
	readonly bg: number;
	readonly charTopLeft: number;
	readonly charTopRight: number;
	readonly charBottomLeft: number;
	readonly charBottomRight: number;
	readonly charHorizontal: number;
	readonly charVertical: number;
}

/**
 * Parses a color value (hex string or number) to a packed color.
 */
function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

/**
 * Converts a hex color string to a packed 32-bit color.
 */
function hexToColor(hex: string): number {
	const clean = hex.replace('#', '');
	let r: number;
	let g: number;
	let b: number;
	let a = 255;

	if (clean.length === 3 || clean.length === 4) {
		const c0 = clean.charAt(0);
		const c1 = clean.charAt(1);
		const c2 = clean.charAt(2);
		r = Number.parseInt(c0 + c0, 16);
		g = Number.parseInt(c1 + c1, 16);
		b = Number.parseInt(c2 + c2, 16);
		if (clean.length === 4) {
			const c3 = clean.charAt(3);
			a = Number.parseInt(c3 + c3, 16);
		}
	} else if (clean.length === 6 || clean.length === 8) {
		r = Number.parseInt(clean.slice(0, 2), 16);
		g = Number.parseInt(clean.slice(2, 4), 16);
		b = Number.parseInt(clean.slice(4, 6), 16);
		if (clean.length === 8) {
			a = Number.parseInt(clean.slice(6, 8), 16);
		}
	} else {
		return 0;
	}

	return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/**
 * Initializes a Border component with default values.
 */
function initBorder(eid: Entity): void {
	Border.type[eid] = BorderType.None;
	Border.left[eid] = 1;
	Border.top[eid] = 1;
	Border.right[eid] = 1;
	Border.bottom[eid] = 1;
	Border.fg[eid] = DEFAULT_BORDER_FG;
	Border.bg[eid] = DEFAULT_BORDER_BG;
	Border.charTopLeft[eid] = BORDER_SINGLE.topLeft;
	Border.charTopRight[eid] = BORDER_SINGLE.topRight;
	Border.charBottomLeft[eid] = BORDER_SINGLE.bottomLeft;
	Border.charBottomRight[eid] = BORDER_SINGLE.bottomRight;
	Border.charHorizontal[eid] = BORDER_SINGLE.horizontal;
	Border.charVertical[eid] = BORDER_SINGLE.vertical;
}

/**
 * Ensures an entity has the Border component, initializing if needed.
 */
function ensureBorder(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Border)) {
		addComponent(world, eid, Border);
		initBorder(eid);
	}
}

/**
 * Applies border side options to an entity.
 * @internal
 */
function applyBorderSides(eid: Entity, options: BorderOptions): void {
	if (options.left !== undefined) Border.left[eid] = options.left ? 1 : 0;
	if (options.top !== undefined) Border.top[eid] = options.top ? 1 : 0;
	if (options.right !== undefined) Border.right[eid] = options.right ? 1 : 0;
	if (options.bottom !== undefined) Border.bottom[eid] = options.bottom ? 1 : 0;
}

/**
 * Applies border options to an entity.
 * @internal
 */
function applyBorderOptions(eid: Entity, options: BorderOptions): void {
	if (options.type !== undefined) Border.type[eid] = options.type;
	applyBorderSides(eid, options);
	if (options.fg !== undefined) Border.fg[eid] = parseColor(options.fg);
	if (options.bg !== undefined) Border.bg[eid] = parseColor(options.bg);
	if (options.chars !== undefined) applyBorderChars(eid, options.chars);
}

/**
 * Sets the border configuration of an entity.
 * Adds the Border component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Border configuration options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setBorder, BorderType, BORDER_DOUBLE } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Set a line border with double characters
 * setBorder(world, entity, {
 *   type: BorderType.Line,
 *   chars: BORDER_DOUBLE,
 *   fg: '#ff0000',
 * });
 *
 * // Enable only top and bottom borders
 * setBorder(world, entity, {
 *   type: BorderType.Line,
 *   left: false,
 *   right: false,
 * });
 * ```
 */
export function setBorder(world: World, eid: Entity, options: BorderOptions): Entity {
	ensureBorder(world, eid);
	applyBorderOptions(eid, options);
	return eid;
}

/**
 * Applies border characters to an entity.
 * @internal
 */
function applyBorderChars(eid: Entity, chars: BorderCharset): void {
	Border.charTopLeft[eid] = chars.topLeft;
	Border.charTopRight[eid] = chars.topRight;
	Border.charBottomLeft[eid] = chars.bottomLeft;
	Border.charBottomRight[eid] = chars.bottomRight;
	Border.charHorizontal[eid] = chars.horizontal;
	Border.charVertical[eid] = chars.vertical;
}

/**
 * Sets the border characters of an entity.
 * Adds the Border component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param chars - Border character set
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setBorderChars, BORDER_ROUNDED } from 'blecsd';
 *
 * setBorderChars(world, entity, BORDER_ROUNDED);
 * ```
 */
export function setBorderChars(world: World, eid: Entity, chars: BorderCharset): Entity {
	ensureBorder(world, eid);
	applyBorderChars(eid, chars);
	return eid;
}

/**
 * Gets the border data of an entity.
 * Returns undefined if the entity doesn't have a Border component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Border data or undefined
 *
 * @example
 * ```typescript
 * import { getBorder } from 'blecsd';
 *
 * const border = getBorder(world, entity);
 * if (border) {
 *   console.log(`Type: ${border.type}, Left: ${border.left}`);
 * }
 * ```
 */
export function getBorder(world: World, eid: Entity): BorderData | undefined {
	if (!hasComponent(world, eid, Border)) {
		return undefined;
	}
	return {
		type: Border.type[eid] as BorderType,
		left: Border.left[eid] === 1,
		top: Border.top[eid] === 1,
		right: Border.right[eid] === 1,
		bottom: Border.bottom[eid] === 1,
		fg: Border.fg[eid] as number,
		bg: Border.bg[eid] as number,
		charTopLeft: Border.charTopLeft[eid] as number,
		charTopRight: Border.charTopRight[eid] as number,
		charBottomLeft: Border.charBottomLeft[eid] as number,
		charBottomRight: Border.charBottomRight[eid] as number,
		charHorizontal: Border.charHorizontal[eid] as number,
		charVertical: Border.charVertical[eid] as number,
	};
}

/**
 * Checks if an entity has a Border component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Border component
 */
export function hasBorder(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Border);
}

/**
 * Checks if an entity has any visible border (type !== None and at least one side enabled).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if border is visible
 */
export function hasBorderVisible(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Border)) {
		return false;
	}
	if (Border.type[eid] === BorderType.None) {
		return false;
	}
	return (
		Border.left[eid] === 1 ||
		Border.top[eid] === 1 ||
		Border.right[eid] === 1 ||
		Border.bottom[eid] === 1
	);
}

/**
 * Enables all border sides.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function enableAllBorders(world: World, eid: Entity): Entity {
	ensureBorder(world, eid);
	Border.left[eid] = 1;
	Border.top[eid] = 1;
	Border.right[eid] = 1;
	Border.bottom[eid] = 1;
	return eid;
}

/**
 * Disables all border sides.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function disableAllBorders(world: World, eid: Entity): Entity {
	ensureBorder(world, eid);
	Border.left[eid] = 0;
	Border.top[eid] = 0;
	Border.right[eid] = 0;
	Border.bottom[eid] = 0;
	return eid;
}

/**
 * Gets the border character for a specific position.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param position - Position name
 * @returns Unicode codepoint or undefined
 */
export function getBorderChar(
	world: World,
	eid: Entity,
	position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'horizontal' | 'vertical',
): number | undefined {
	if (!hasComponent(world, eid, Border)) {
		return undefined;
	}
	switch (position) {
		case 'topLeft':
			return Border.charTopLeft[eid] as number;
		case 'topRight':
			return Border.charTopRight[eid] as number;
		case 'bottomLeft':
			return Border.charBottomLeft[eid] as number;
		case 'bottomRight':
			return Border.charBottomRight[eid] as number;
		case 'horizontal':
			return Border.charHorizontal[eid] as number;
		case 'vertical':
			return Border.charVertical[eid] as number;
	}
}
