/**
 * Shared color utilities for packing, unpacking, and parsing colors.
 * @module utils/color
 */

/**
 * Packs RGBA color components into a single 32-bit integer.
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-255, default: 255)
 * @returns Packed 32-bit color value
 *
 * @example
 * ```typescript
 * const red = packColor(255, 0, 0);
 * const semiTransparentBlue = packColor(0, 0, 255, 128);
 * ```
 */
export function packColor(r: number, g: number, b: number, a = 255): number {
	return (((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)) >>> 0;
}

/**
 * Unpacks a 32-bit color value into RGBA components.
 *
 * @param color - Packed 32-bit color value
 * @returns Object with r, g, b, a components (0-255 each)
 *
 * @example
 * ```typescript
 * const { r, g, b, a } = unpackColor(0xff0000ff); // Red with full alpha
 * ```
 */
export function unpackColor(color: number): { r: number; g: number; b: number; a: number } {
	return {
		r: (color >> 16) & 0xff,
		g: (color >> 8) & 0xff,
		b: color & 0xff,
		a: (color >> 24) & 0xff,
	};
}

/**
 * Converts a hex color string to a packed 32-bit color.
 *
 * @param hex - Hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)
 * @returns Packed 32-bit color value
 *
 * @example
 * ```typescript
 * const red = hexToColor('#ff0000');
 * const semiTransparent = hexToColor('#ff000080');
 * ```
 */
export function hexToColor(hex: string): number {
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

	return packColor(r, g, b, a);
}

/**
 * Converts a packed 32-bit color to a hex string.
 *
 * @param color - Packed 32-bit color value
 * @param includeAlpha - Whether to include alpha in output (default: false)
 * @returns Hex color string
 *
 * @example
 * ```typescript
 * const hex = colorToHex(0xffff0000); // '#ff0000'
 * const hexWithAlpha = colorToHex(0x80ff0000, true); // '#ff000080'
 * ```
 */
export function colorToHex(color: number, includeAlpha = false): string {
	const { r, g, b, a } = unpackColor(color);
	const rHex = r.toString(16).padStart(2, '0');
	const gHex = g.toString(16).padStart(2, '0');
	const bHex = b.toString(16).padStart(2, '0');

	if (includeAlpha) {
		const aHex = a.toString(16).padStart(2, '0');
		return `#${rHex}${gHex}${bHex}${aHex}`;
	}
	return `#${rHex}${gHex}${bHex}`;
}

/**
 * Unified color helper — accepts any blECSd color format and returns a packed
 * 32-bit ARGB integer suitable for all component color fields.
 *
 * blECSd represents colors internally as packed 32-bit integers (`ARGB`).
 * You can pass colors in two formats:
 *
 * - **Hex strings**: `'#RRGGBB'`, `'#RRGGBBAA'`, `'#RGB'`, `'#RGBA'`
 *   (the `#` prefix is optional).
 * - **Packed integers**: `0xAARRGGBB` (the raw packed value used internally).
 *
 * Prefer `parseColor` at call sites when the format may vary.  For
 * performance-critical tight loops, use `packColor` directly.
 *
 * @param color - Hex string (`#RGB`, `#RRGGBB`, `#RRGGBBAA`, etc.) or a packed
 *   32-bit ARGB integer (`0xAARRGGBB`).
 * @returns Packed 32-bit ARGB color value.
 *
 * @example
 * ```typescript
 * import { parseColor } from 'blecsd';
 *
 * // Both produce the same internal value:
 * const a = parseColor('#ff0000');       // hex string
 * const b = parseColor(0xffff0000);      // packed integer (ARGB, fully opaque red)
 *
 * // Works with any component color field:
 * setStyle(world, box, { fg: parseColor('#ffffff'), bg: parseColor('#0066cc') });
 *
 * // Useful when accepting user-supplied colors:
 * function applyTheme(fg: string | number, bg: string | number) {
 *   setStyle(world, entity, { fg: parseColor(fg), bg: parseColor(bg) });
 * }
 * ```
 *
 * @see {@link packColor} for building colors from RGBA components.
 * @see {@link hexToColor} for hex-string-only conversion.
 * @see {@link colorToHex} for converting a packed color back to a hex string.
 */
export function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}
