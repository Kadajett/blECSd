/**
 * Color format conversion functions
 * @module terminal/colors/convert
 */

import {
	asColor256,
	type Color256,
	type HSL,
	type HSLA,
	isColor256,
	PALETTE_RGB,
	type RGB,
	type RGBA,
} from './palette';

// =============================================================================
// HEX CONVERSIONS
// =============================================================================

/**
 * Converts a hex color string to RGB.
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats.
 *
 * @param hex - Hex color string (e.g., '#ff0000', '#f00', '#ff000080')
 * @returns RGB or RGBA object
 * @throws Error if hex format is invalid
 *
 * @example
 * ```typescript
 * import { hexToRgb } from 'blecsd';
 *
 * hexToRgb('#ff0000'); // { r: 255, g: 0, b: 0 }
 * hexToRgb('#f00');    // { r: 255, g: 0, b: 0 }
 * hexToRgb('#ff000080'); // { r: 255, g: 0, b: 0, a: 0.5 }
 * ```
 */
export function hexToRgb(hex: string): RGB | RGBA {
	// Remove leading #
	const h = hex.startsWith('#') ? hex.slice(1) : hex;

	if (!/^[0-9a-fA-F]+$/.test(h)) {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	let r: number;
	let g: number;
	let b: number;
	let a: number | undefined;

	if (h.length === 3) {
		// #RGB -> #RRGGBB
		const h0 = h[0] ?? '0';
		const h1 = h[1] ?? '0';
		const h2 = h[2] ?? '0';
		r = Number.parseInt(h0 + h0, 16);
		g = Number.parseInt(h1 + h1, 16);
		b = Number.parseInt(h2 + h2, 16);
	} else if (h.length === 6) {
		// #RRGGBB
		r = Number.parseInt(h.slice(0, 2), 16);
		g = Number.parseInt(h.slice(2, 4), 16);
		b = Number.parseInt(h.slice(4, 6), 16);
	} else if (h.length === 8) {
		// #RRGGBBAA
		r = Number.parseInt(h.slice(0, 2), 16);
		g = Number.parseInt(h.slice(2, 4), 16);
		b = Number.parseInt(h.slice(4, 6), 16);
		a = Number.parseInt(h.slice(6, 8), 16) / 255;
	} else {
		throw new Error(`Invalid hex color length: ${hex}`);
	}

	if (a !== undefined) {
		return { r, g, b, a };
	}
	return { r, g, b };
}

/**
 * Converts an RGB color to a hex string.
 *
 * @param rgb - RGB color object
 * @returns Hex color string (e.g., '#ff0000')
 *
 * @example
 * ```typescript
 * import { rgbToHex } from 'blecsd';
 *
 * rgbToHex({ r: 255, g: 0, b: 0 }); // '#ff0000'
 * ```
 */
export function rgbToHex(rgb: RGB): string {
	const toHex = (n: number): string => {
		const clamped = Math.max(0, Math.min(255, Math.round(n)));
		return clamped.toString(16).padStart(2, '0');
	};
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Converts an RGBA color to a hex string with alpha.
 *
 * @param rgba - RGBA color object
 * @returns Hex color string (e.g., '#ff000080')
 *
 * @example
 * ```typescript
 * import { rgbaToHex } from 'blecsd';
 *
 * rgbaToHex({ r: 255, g: 0, b: 0, a: 0.5 }); // '#ff000080'
 * ```
 */
export function rgbaToHex(rgba: RGBA): string {
	const toHex = (n: number): string => {
		const clamped = Math.max(0, Math.min(255, Math.round(n)));
		return clamped.toString(16).padStart(2, '0');
	};
	const alpha = Math.round(rgba.a * 255);
	return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}${toHex(alpha)}`;
}

// =============================================================================
// HSL CONVERSIONS
// =============================================================================

/**
 * Converts an RGB color to HSL.
 *
 * @param rgb - RGB color object
 * @returns HSL color object (h: 0-360, s: 0-100, l: 0-100)
 *
 * @example
 * ```typescript
 * import { rgbToHsl } from 'blecsd';
 *
 * rgbToHsl({ r: 255, g: 0, b: 0 }); // { h: 0, s: 100, l: 50 }
 * rgbToHsl({ r: 0, g: 255, b: 0 }); // { h: 120, s: 100, l: 50 }
 * ```
 */
export function rgbToHsl(rgb: RGB): HSL {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) {
		// Achromatic
		return { h: 0, s: 0, l: Math.round(l * 100) };
	}

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	let h: number;
	switch (max) {
		case r:
			h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
			break;
		case g:
			h = ((b - r) / d + 2) / 6;
			break;
		default:
			h = ((r - g) / d + 4) / 6;
			break;
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

/**
 * Converts an HSL color to RGB.
 *
 * @param hsl - HSL color object (h: 0-360, s: 0-100, l: 0-100)
 * @returns RGB color object
 *
 * @example
 * ```typescript
 * import { hslToRgb } from 'blecsd';
 *
 * hslToRgb({ h: 0, s: 100, l: 50 });   // { r: 255, g: 0, b: 0 }
 * hslToRgb({ h: 120, s: 100, l: 50 }); // { r: 0, g: 255, b: 0 }
 * ```
 */
export function hslToRgb(hsl: HSL): RGB {
	const h = hsl.h / 360;
	const s = hsl.s / 100;
	const l = hsl.l / 100;

	if (s === 0) {
		// Achromatic
		const gray = Math.round(l * 255);
		return { r: gray, g: gray, b: gray };
	}

	const hue2rgb = (p: number, q: number, t: number): number => {
		let tt = t;
		if (tt < 0) tt += 1;
		if (tt > 1) tt -= 1;
		if (tt < 1 / 6) return p + (q - p) * 6 * tt;
		if (tt < 1 / 2) return q;
		if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;

	return {
		r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		g: Math.round(hue2rgb(p, q, h) * 255),
		b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	};
}

/**
 * Converts RGBA to HSLA.
 */
export function rgbaToHsla(rgba: RGBA): HSLA {
	const hsl = rgbToHsl(rgba);
	return { ...hsl, a: rgba.a };
}

/**
 * Converts HSLA to RGBA.
 */
export function hslaToRgba(hsla: HSLA): RGBA {
	const rgb = hslToRgb(hsla);
	return { ...rgb, a: hsla.a };
}

// =============================================================================
// 256-COLOR CONVERSIONS
// =============================================================================

/**
 * Finds the nearest 256-color palette index for an RGB color.
 * Uses Euclidean distance in RGB space for matching.
 *
 * @param rgb - RGB color to match
 * @returns The closest Color256 palette index
 *
 * @example
 * ```typescript
 * import { rgbToColor256 } from 'blecsd';
 *
 * rgbToColor256({ r: 255, g: 0, b: 0 }); // 9 (bright red)
 * rgbToColor256({ r: 128, g: 128, b: 128 }); // 244 (gray)
 * ```
 */
export function rgbToColor256(rgb: RGB): Color256 {
	let bestIndex = 0;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (let i = 0; i < 256; i++) {
		const palette = PALETTE_RGB[i];
		if (!palette) continue;
		const dr = rgb.r - palette.r;
		const dg = rgb.g - palette.g;
		const db = rgb.b - palette.b;
		const distance = dr * dr + dg * dg + db * db;

		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = i;
		}

		// Early exit for exact match
		if (distance === 0) break;
	}

	return bestIndex as Color256;
}

/**
 * Converts a 256-color palette index to RGB.
 *
 * @param color - Color256 palette index
 * @returns RGB color object
 *
 * @example
 * ```typescript
 * import { color256ToRgb } from 'blecsd';
 *
 * color256ToRgb(9);   // { r: 255, g: 0, b: 0 }
 * color256ToRgb(244); // { r: 168, g: 168, b: 168 }
 * ```
 */
export function color256ToRgb(color: Color256): RGB {
	const rgb = PALETTE_RGB[color];
	if (!rgb) {
		throw new Error(`Invalid Color256: ${color}`);
	}
	return rgb;
}

/**
 * Converts a hex color directly to the nearest 256-color index.
 *
 * @param hex - Hex color string
 * @returns Color256 palette index
 *
 * @example
 * ```typescript
 * import { hexToColor256 } from 'blecsd';
 *
 * hexToColor256('#ff0000'); // 9 (bright red)
 * ```
 */
export function hexToColor256(hex: string): Color256 {
	const rgb = hexToRgb(hex);
	return rgbToColor256(rgb);
}

/**
 * Converts a 256-color palette index to hex.
 *
 * @param color - Color256 palette index
 * @returns Hex color string
 *
 * @example
 * ```typescript
 * import { color256ToHex } from 'blecsd';
 *
 * color256ToHex(9); // '#ff0000'
 * ```
 */
export function color256ToHex(color: Color256): string {
	const rgb = PALETTE_RGB[color];
	if (!rgb) {
		throw new Error(`Invalid Color256: ${color}`);
	}
	return rgbToHex(rgb);
}

// =============================================================================
// TRUECOLOR (24-BIT) CONVERSIONS
// =============================================================================

/**
 * Packs an RGB color into a 24-bit integer (0xRRGGBB).
 *
 * @param rgb - RGB color object
 * @returns Packed 24-bit color value
 *
 * @example
 * ```typescript
 * import { rgbToTruecolor } from 'blecsd';
 *
 * rgbToTruecolor({ r: 255, g: 0, b: 0 }); // 0xff0000 (16711680)
 * ```
 */
export function rgbToTruecolor(rgb: RGB): number {
	const r = Math.max(0, Math.min(255, Math.round(rgb.r)));
	const g = Math.max(0, Math.min(255, Math.round(rgb.g)));
	const b = Math.max(0, Math.min(255, Math.round(rgb.b)));
	return (r << 16) | (g << 8) | b;
}

/**
 * Unpacks a 24-bit truecolor integer to RGB.
 *
 * @param color - Packed 24-bit color value (0xRRGGBB)
 * @returns RGB color object
 *
 * @example
 * ```typescript
 * import { truecolorToRgb } from 'blecsd';
 *
 * truecolorToRgb(0xff0000); // { r: 255, g: 0, b: 0 }
 * ```
 */
export function truecolorToRgb(color: number): RGB {
	return {
		r: (color >> 16) & 0xff,
		g: (color >> 8) & 0xff,
		b: color & 0xff,
	};
}

/**
 * Converts a hex color to a 24-bit truecolor integer.
 *
 * @param hex - Hex color string
 * @returns Packed 24-bit color value
 *
 * @example
 * ```typescript
 * import { hexToTruecolor } from 'blecsd';
 *
 * hexToTruecolor('#ff0000'); // 0xff0000
 * ```
 */
export function hexToTruecolor(hex: string): number {
	const rgb = hexToRgb(hex);
	return rgbToTruecolor(rgb);
}

/**
 * Converts a 24-bit truecolor integer to hex.
 *
 * @param color - Packed 24-bit color value
 * @returns Hex color string
 *
 * @example
 * ```typescript
 * import { truecolorToHex } from 'blecsd';
 *
 * truecolorToHex(0xff0000); // '#ff0000'
 * ```
 */
export function truecolorToHex(color: number): string {
	return rgbToHex(truecolorToRgb(color));
}

/**
 * Converts a truecolor value to the nearest 256-color index.
 * Useful for downgrading colors to terminals that don't support truecolor.
 *
 * @param color - Packed 24-bit color value
 * @returns Color256 palette index
 *
 * @example
 * ```typescript
 * import { truecolorToColor256 } from 'blecsd';
 *
 * truecolorToColor256(0xff0000); // 9 (bright red)
 * ```
 */
export function truecolorToColor256(color: number): Color256 {
	return rgbToColor256(truecolorToRgb(color));
}

/**
 * Converts a 256-color palette index to a 24-bit truecolor value.
 *
 * @param color - Color256 palette index
 * @returns Packed 24-bit color value
 *
 * @example
 * ```typescript
 * import { color256ToTruecolor } from 'blecsd';
 *
 * color256ToTruecolor(9); // 0xff0000
 * ```
 */
export function color256ToTruecolor(color: Color256): number {
	const rgb = PALETTE_RGB[color];
	if (!rgb) {
		throw new Error(`Invalid Color256: ${color}`);
	}
	return rgbToTruecolor(rgb);
}

// =============================================================================
// SGR (SELECT GRAPHIC RENDITION) HELPERS
// =============================================================================

/**
 * Generates the SGR parameters for a 256-color foreground.
 * Use with ESC[38;5;${n}m
 *
 * @param color - Color256 palette index
 * @returns SGR parameter string (e.g., '38;5;196')
 *
 * @example
 * ```typescript
 * import { sgrFg256 } from 'blecsd';
 *
 * const params = sgrFg256(196);
 * const escape = `\x1b[${params}m`; // '\x1b[38;5;196m'
 * ```
 */
export function sgrFg256(color: Color256): string {
	return `38;5;${color}`;
}

/**
 * Generates the SGR parameters for a 256-color background.
 * Use with ESC[48;5;${n}m
 *
 * @param color - Color256 palette index
 * @returns SGR parameter string (e.g., '48;5;196')
 */
export function sgrBg256(color: Color256): string {
	return `48;5;${color}`;
}

/**
 * Generates the SGR parameters for a truecolor foreground.
 * Use with ESC[38;2;r;g;b m
 *
 * @param rgb - RGB color object or packed truecolor
 * @returns SGR parameter string (e.g., '38;2;255;0;0')
 *
 * @example
 * ```typescript
 * import { sgrFgRgb } from 'blecsd';
 *
 * const params = sgrFgRgb({ r: 255, g: 0, b: 0 });
 * const escape = `\x1b[${params}m`; // '\x1b[38;2;255;0;0m'
 * ```
 */
export function sgrFgRgb(rgb: RGB | number): string {
	const color = typeof rgb === 'number' ? truecolorToRgb(rgb) : rgb;
	return `38;2;${color.r};${color.g};${color.b}`;
}

/**
 * Generates the SGR parameters for a truecolor background.
 * Use with ESC[48;2;r;g;b m
 *
 * @param rgb - RGB color object or packed truecolor
 * @returns SGR parameter string (e.g., '48;2;255;0;0')
 */
export function sgrBgRgb(rgb: RGB | number): string {
	const color = typeof rgb === 'number' ? truecolorToRgb(rgb) : rgb;
	return `48;2;${color.r};${color.g};${color.b}`;
}

// =============================================================================
// SMART COLOR CUBE MATCHING
// =============================================================================

/**
 * Finds the nearest color cube level (0-5) for a component value (0-255).
 * Used internally for optimized color cube matching.
 */
function nearestCubeLevel(value: number): number {
	// Thresholds between cube levels: 0, 95, 135, 175, 215, 255
	// Midpoints: 47.5, 115, 155, 195, 235
	if (value < 48) return 0;
	if (value < 115) return 1;
	if (value < 155) return 2;
	if (value < 195) return 3;
	if (value < 235) return 4;
	return 5;
}

/**
 * Converts RGB directly to the nearest color cube index (16-231).
 * More efficient than searching the full palette when you know
 * you want a color cube match.
 *
 * @param rgb - RGB color object
 * @returns Color256 index in the color cube range
 *
 * @example
 * ```typescript
 * import { rgbToColorCube } from 'blecsd';
 *
 * rgbToColorCube({ r: 255, g: 0, b: 0 }); // 196
 * ```
 */
export function rgbToColorCube(rgb: RGB): Color256 {
	const r = nearestCubeLevel(rgb.r);
	const g = nearestCubeLevel(rgb.g);
	const b = nearestCubeLevel(rgb.b);
	return (16 + 36 * r + 6 * g + b) as Color256;
}

/**
 * Converts RGB directly to the nearest grayscale index (232-255).
 * More efficient than searching when you want a grayscale match.
 *
 * @param rgb - RGB color object
 * @returns Color256 index in the grayscale range
 *
 * @example
 * ```typescript
 * import { rgbToGrayscale256 } from 'blecsd';
 *
 * rgbToGrayscale256({ r: 128, g: 128, b: 128 }); // ~244
 * ```
 */
export function rgbToGrayscale256(rgb: RGB): Color256 {
	// Average the RGB values for perceived brightness
	const gray = (rgb.r + rgb.g + rgb.b) / 3;
	// Grayscale ramp: 8, 18, 28, ..., 238 (steps of 10 starting at 8)
	// Find nearest step
	const step = Math.max(0, Math.min(23, Math.round((gray - 8) / 10)));
	return (232 + step) as Color256;
}

// =============================================================================
// COLOR PARSING
// =============================================================================

/**
 * Unified color value type that can represent any color format.
 */
export type ColorValue = string | number | RGB | Color256;

/**
 * Parses any color value into RGB.
 *
 * @param value - Color in any supported format:
 *   - Hex string: '#ff0000', '#f00'
 *   - RGB object: { r: 255, g: 0, b: 0 }
 *   - 256-color index: 9 (if 0-255)
 *   - Truecolor integer: 0xff0000 (if > 255)
 *
 * @returns RGB color object
 * @throws Error if format is not recognized
 *
 * @example
 * ```typescript
 * import { parseColor } from 'blecsd';
 *
 * parseColor('#ff0000');            // { r: 255, g: 0, b: 0 }
 * parseColor({ r: 255, g: 0, b: 0 }); // { r: 255, g: 0, b: 0 }
 * parseColor(9);                    // { r: 255, g: 0, b: 0 } (256-color)
 * parseColor(0xff0000);             // { r: 255, g: 0, b: 0 } (truecolor)
 * ```
 */
export function parseColor(value: ColorValue): RGB {
	// String: hex format
	if (typeof value === 'string') {
		return hexToRgb(value);
	}

	// Object: RGB
	if (typeof value === 'object' && value !== null) {
		if ('r' in value && 'g' in value && 'b' in value) {
			return { r: value.r, g: value.g, b: value.b };
		}
		throw new Error('Invalid color object');
	}

	// Number: 256-color or truecolor
	if (typeof value === 'number') {
		if (isColor256(value)) {
			return color256ToRgb(value);
		}
		// Treat larger numbers as truecolor
		return truecolorToRgb(value);
	}

	throw new Error(`Invalid color value: ${value}`);
}

/**
 * Converts any color value to the nearest 256-color index.
 *
 * @param value - Color in any supported format
 * @returns Color256 palette index
 *
 * @example
 * ```typescript
 * import { toColor256 } from 'blecsd';
 *
 * toColor256('#ff0000');              // 9
 * toColor256({ r: 255, g: 0, b: 0 }); // 9
 * toColor256(0xff0000);               // 9
 * ```
 */
export function toColor256(value: ColorValue): Color256 {
	// Already a valid 256-color index
	if (typeof value === 'number' && isColor256(value)) {
		return asColor256(value);
	}

	const rgb = parseColor(value);
	return rgbToColor256(rgb);
}

/**
 * Converts any color value to a 24-bit truecolor integer.
 *
 * @param value - Color in any supported format
 * @returns Packed 24-bit color value
 *
 * @example
 * ```typescript
 * import { toTruecolor } from 'blecsd';
 *
 * toTruecolor('#ff0000');              // 0xff0000
 * toTruecolor({ r: 255, g: 0, b: 0 }); // 0xff0000
 * toTruecolor(9);                      // 0xff0000
 * ```
 */
export function toTruecolor(value: ColorValue): number {
	const rgb = parseColor(value);
	return rgbToTruecolor(rgb);
}

/**
 * Converts any color value to a hex string.
 *
 * @param value - Color in any supported format
 * @returns Hex color string
 *
 * @example
 * ```typescript
 * import { toHex } from 'blecsd';
 *
 * toHex({ r: 255, g: 0, b: 0 }); // '#ff0000'
 * toHex(9);                      // '#ff0000'
 * toHex(0xff0000);               // '#ff0000'
 * ```
 */
export function toHex(value: ColorValue): string {
	const rgb = parseColor(value);
	return rgbToHex(rgb);
}
