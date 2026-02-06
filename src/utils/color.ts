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
 * Parses a color value (hex string or packed number) to a packed color.
 *
 * @param color - Hex string (#RGB, #RRGGBB, etc.) or packed 32-bit number
 * @returns Packed 32-bit color value
 *
 * @example
 * ```typescript
 * const red = parseColor('#ff0000');
 * const blue = parseColor(0xff0000ff);
 * ```
 */
export function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}
