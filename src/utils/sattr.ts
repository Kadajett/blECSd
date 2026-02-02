/**
 * Style attribute encoding for terminal rendering.
 * Converts style objects to binary attribute codes for efficient rendering.
 * @module utils/sattr
 */

import type { StyleData } from '../components/renderable';

/**
 * Attribute flags for text styling.
 * These can be OR'd together to combine multiple attributes.
 */
export enum AttrFlags {
	/** No special attributes */
	NONE = 0,
	/** Bold text */
	BOLD = 1 << 0,
	/** Underlined text */
	UNDERLINE = 1 << 1,
	/** Blinking text */
	BLINK = 1 << 2,
	/** Inverse colors (swap fg/bg) */
	INVERSE = 1 << 3,
	/** Hidden/invisible text */
	INVISIBLE = 1 << 4,
	/** Dim text */
	DIM = 1 << 5,
	/** Italic text */
	ITALIC = 1 << 6,
	/** Strikethrough text */
	STRIKETHROUGH = 1 << 7,
}

/**
 * Encoded style attribute containing colors and flags.
 * Uses BigInt to store full 32-bit colors plus attribute flags.
 */
export interface StyleAttr {
	/** Foreground color (packed RGBA) */
	readonly fg: number;
	/** Background color (packed RGBA) */
	readonly bg: number;
	/** Attribute flags (AttrFlags) */
	readonly attrs: number;
}

/**
 * Style input for sattr conversion.
 * Accepts either full StyleData or partial style object.
 */
export interface StyleInput {
	fg?: number;
	bg?: number;
	bold?: boolean;
	underline?: boolean;
	blink?: boolean;
	inverse?: boolean;
	invisible?: boolean;
	dim?: boolean;
	italic?: boolean;
	strikethrough?: boolean;
}

/**
 * Default foreground color (white).
 */
const DEFAULT_FG = 0xffffffff;

/**
 * Default background color (transparent black).
 */
const DEFAULT_BG = 0x00000000;

/**
 * Converts style boolean flags to attribute number.
 *
 * @param style - Style input with boolean flags
 * @returns Packed attribute flags
 *
 * @example
 * ```typescript
 * import { styleToAttrs, AttrFlags } from 'blecsd';
 *
 * const attrs = styleToAttrs({ bold: true, underline: true });
 * // attrs = AttrFlags.BOLD | AttrFlags.UNDERLINE
 * ```
 */
export function styleToAttrs(style: StyleInput): number {
	let attrs = AttrFlags.NONE;
	if (style.bold) attrs |= AttrFlags.BOLD;
	if (style.underline) attrs |= AttrFlags.UNDERLINE;
	if (style.blink) attrs |= AttrFlags.BLINK;
	if (style.inverse) attrs |= AttrFlags.INVERSE;
	if (style.invisible) attrs |= AttrFlags.INVISIBLE;
	if (style.dim) attrs |= AttrFlags.DIM;
	if (style.italic) attrs |= AttrFlags.ITALIC;
	if (style.strikethrough) attrs |= AttrFlags.STRIKETHROUGH;
	return attrs;
}

/**
 * Converts attribute flags to style boolean properties.
 *
 * @param attrs - Packed attribute flags
 * @returns Object with boolean style properties
 *
 * @example
 * ```typescript
 * import { attrsToStyle, AttrFlags } from 'blecsd';
 *
 * const style = attrsToStyle(AttrFlags.BOLD | AttrFlags.UNDERLINE);
 * // style = { bold: true, underline: true, ... }
 * ```
 */
export function attrsToStyle(attrs: number): {
	bold: boolean;
	underline: boolean;
	blink: boolean;
	inverse: boolean;
	invisible: boolean;
	dim: boolean;
	italic: boolean;
	strikethrough: boolean;
} {
	return {
		bold: (attrs & AttrFlags.BOLD) !== 0,
		underline: (attrs & AttrFlags.UNDERLINE) !== 0,
		blink: (attrs & AttrFlags.BLINK) !== 0,
		inverse: (attrs & AttrFlags.INVERSE) !== 0,
		invisible: (attrs & AttrFlags.INVISIBLE) !== 0,
		dim: (attrs & AttrFlags.DIM) !== 0,
		italic: (attrs & AttrFlags.ITALIC) !== 0,
		strikethrough: (attrs & AttrFlags.STRIKETHROUGH) !== 0,
	};
}

/**
 * Converts a style object to a style attribute.
 * This is the main function for encoding styles for rendering.
 *
 * @param style - Style input (colors and boolean flags)
 * @param defaultFg - Default foreground color if not specified
 * @param defaultBg - Default background color if not specified
 * @returns Encoded style attribute
 *
 * @example
 * ```typescript
 * import { sattr } from 'blecsd';
 *
 * const attr = sattr({ fg: 0xffff0000, bold: true });
 * // attr = { fg: 0xffff0000, bg: 0x00000000, attrs: AttrFlags.BOLD }
 *
 * // With defaults
 * const attr2 = sattr({ bold: true }, 0xffffffff, 0x000000ff);
 * // Uses provided defaults for fg/bg
 * ```
 */
export function sattr(
	style: StyleInput,
	defaultFg = DEFAULT_FG,
	defaultBg = DEFAULT_BG,
): StyleAttr {
	return {
		fg: style.fg ?? defaultFg,
		bg: style.bg ?? defaultBg,
		attrs: styleToAttrs(style),
	};
}

/**
 * Converts a StyleData object to a style attribute.
 * Convenience function for converting from Renderable component data.
 *
 * @param style - Full StyleData from getStyle()
 * @returns Encoded style attribute
 *
 * @example
 * ```typescript
 * import { sattrFromStyleData, getStyle } from 'blecsd';
 *
 * const style = getStyle(world, entity);
 * if (style) {
 *   const attr = sattrFromStyleData(style);
 * }
 * ```
 */
export function sattrFromStyleData(style: StyleData): StyleAttr {
	return {
		fg: style.fg,
		bg: style.bg,
		attrs: styleToAttrs(style),
	};
}

/**
 * Compares two style attributes for equality.
 *
 * @param a - First style attribute
 * @param b - Second style attribute
 * @returns true if styles are identical
 *
 * @example
 * ```typescript
 * import { sattr, sattrEqual } from 'blecsd';
 *
 * const attr1 = sattr({ fg: 0xffff0000, bold: true });
 * const attr2 = sattr({ fg: 0xffff0000, bold: true });
 * console.log(sattrEqual(attr1, attr2)); // true
 * ```
 */
export function sattrEqual(a: StyleAttr, b: StyleAttr): boolean {
	return a.fg === b.fg && a.bg === b.bg && a.attrs === b.attrs;
}

/**
 * Creates a copy of a style attribute.
 *
 * @param attr - Style attribute to copy
 * @returns New style attribute with same values
 */
export function sattrCopy(attr: StyleAttr): StyleAttr {
	return { fg: attr.fg, bg: attr.bg, attrs: attr.attrs };
}

/**
 * Merges two style attributes, with the second overriding the first.
 * Only non-default values from the overlay are applied.
 *
 * @param base - Base style attribute
 * @param overlay - Overlay style (can be partial)
 * @returns Merged style attribute
 *
 * @example
 * ```typescript
 * import { sattr, sattrMerge } from 'blecsd';
 *
 * const base = sattr({ fg: 0xffff0000, bold: true });
 * const overlay = sattr({ underline: true });
 * const merged = sattrMerge(base, overlay);
 * // merged has red fg, bold, and underline
 * ```
 */
export function sattrMerge(base: StyleAttr, overlay: Partial<StyleAttr>): StyleAttr {
	return {
		fg: overlay.fg ?? base.fg,
		bg: overlay.bg ?? base.bg,
		attrs: overlay.attrs !== undefined ? overlay.attrs : base.attrs,
	};
}

/**
 * Checks if a style attribute has a specific flag.
 *
 * @param attr - Style attribute to check
 * @param flag - Flag to check for
 * @returns true if flag is set
 *
 * @example
 * ```typescript
 * import { sattr, sattrHasFlag, AttrFlags } from 'blecsd';
 *
 * const attr = sattr({ bold: true, underline: true });
 * console.log(sattrHasFlag(attr, AttrFlags.BOLD)); // true
 * console.log(sattrHasFlag(attr, AttrFlags.BLINK)); // false
 * ```
 */
export function sattrHasFlag(attr: StyleAttr, flag: AttrFlags): boolean {
	return (attr.attrs & flag) !== 0;
}

/**
 * Adds a flag to a style attribute (immutably).
 *
 * @param attr - Style attribute
 * @param flag - Flag to add
 * @returns New style attribute with flag added
 */
export function sattrAddFlag(attr: StyleAttr, flag: AttrFlags): StyleAttr {
	return {
		fg: attr.fg,
		bg: attr.bg,
		attrs: attr.attrs | flag,
	};
}

/**
 * Removes a flag from a style attribute (immutably).
 *
 * @param attr - Style attribute
 * @param flag - Flag to remove
 * @returns New style attribute with flag removed
 */
export function sattrRemoveFlag(attr: StyleAttr, flag: AttrFlags): StyleAttr {
	return {
		fg: attr.fg,
		bg: attr.bg,
		attrs: attr.attrs & ~flag,
	};
}

/**
 * Creates a style attribute with inverted colors (swaps fg and bg).
 *
 * @param attr - Style attribute to invert
 * @returns New style attribute with swapped colors
 */
export function sattrInvert(attr: StyleAttr): StyleAttr {
	return {
		fg: attr.bg,
		bg: attr.fg,
		attrs: attr.attrs,
	};
}

/**
 * Creates an empty/default style attribute.
 *
 * @returns Default style attribute (white on transparent black, no flags)
 */
export function sattrEmpty(): StyleAttr {
	return {
		fg: DEFAULT_FG,
		bg: DEFAULT_BG,
		attrs: AttrFlags.NONE,
	};
}

/**
 * Encodes a style attribute to a single BigInt for compact storage.
 * Format: [8 bits attrs][32 bits bg][32 bits fg] = 72 bits
 *
 * @param attr - Style attribute to encode
 * @returns Encoded BigInt value
 *
 * @example
 * ```typescript
 * import { sattr, encodeStyleAttr, decodeStyleAttr } from 'blecsd';
 *
 * const attr = sattr({ fg: 0xffff0000, bold: true });
 * const encoded = encodeStyleAttr(attr);
 * const decoded = decodeStyleAttr(encoded);
 * // decoded is equal to attr
 * ```
 */
export function encodeStyleAttr(attr: StyleAttr): bigint {
	// Use BigInt for 72-bit encoding
	const fg = BigInt(attr.fg >>> 0);
	const bg = BigInt(attr.bg >>> 0) << 32n;
	const attrs = BigInt(attr.attrs) << 64n;
	return fg | bg | attrs;
}

/**
 * Decodes a BigInt back to a style attribute.
 *
 * @param encoded - Encoded BigInt value
 * @returns Decoded style attribute
 */
export function decodeStyleAttr(encoded: bigint): StyleAttr {
	const fg = Number(encoded & 0xffffffffn);
	const bg = Number((encoded >> 32n) & 0xffffffffn);
	const attrs = Number((encoded >> 64n) & 0xffn);
	return { fg, bg, attrs };
}
