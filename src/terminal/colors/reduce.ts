/**
 * Color reduction for low-color terminals
 * @module terminal/colors/reduce
 */

import { matchColor } from './match';
import { type Color256, isStandardColor, PALETTE_RGB, type RGB } from './palette';

// =============================================================================
// COLOR DEPTH TYPES
// =============================================================================

/**
 * Supported color depth levels.
 */
export type ColorDepth = 'truecolor' | '256' | '16' | '8' | '2';

/**
 * Color depth in bits.
 */
export type ColorBits = 24 | 8 | 4 | 3 | 1;

/**
 * Maps color depth names to bit counts.
 */
export const COLOR_DEPTH_BITS: Record<ColorDepth, ColorBits> = {
	truecolor: 24,
	'256': 8,
	'16': 4,
	'8': 3,
	'2': 1,
} as const;

// =============================================================================
// 16-COLOR REDUCTION
// =============================================================================

/**
 * Standard 16 ANSI colors with their approximate RGB values
 * used for matching higher colors down to 16.
 */
const ANSI_16_PALETTE: readonly RGB[] = PALETTE_RGB.slice(0, 16);

/**
 * Reduces a Color256 to the nearest 16-color ANSI palette color.
 *
 * @param color - The 256-color palette index
 * @returns Color256 in range 0-15
 *
 * @example
 * ```typescript
 * import { reduceTo16 } from 'blecsd';
 *
 * reduceTo16(196); // Bright red cube -> 9 (bright red ANSI)
 * reduceTo16(240); // Gray -> 7 or 8 (light/dark gray)
 * ```
 */
export function reduceTo16(color: Color256): Color256 {
	// Already a standard color
	if (isStandardColor(color)) {
		return color;
	}

	// Get the RGB value and find nearest in 16-color palette
	const rgb = PALETTE_RGB[color];
	if (!rgb) return 0 as Color256;
	return matchColor(rgb, {
		palette: ANSI_16_PALETTE,
		indices: Array.from({ length: 16 }, (_, i) => i),
	});
}

/**
 * Reduces an RGB color directly to the nearest 16-color ANSI palette.
 *
 * @param rgb - The RGB color
 * @returns Color256 in range 0-15
 */
export function rgbTo16(rgb: RGB): Color256 {
	return matchColor(rgb, {
		palette: ANSI_16_PALETTE,
		indices: Array.from({ length: 16 }, (_, i) => i),
	});
}

// =============================================================================
// 8-COLOR REDUCTION
// =============================================================================

/**
 * Basic 8 ANSI colors (no bright variants).
 */
const ANSI_8_PALETTE: readonly RGB[] = PALETTE_RGB.slice(0, 8);

/**
 * Reduces a Color256 to the nearest 8-color basic ANSI palette.
 * Bright colors are mapped to their non-bright equivalents.
 *
 * @param color - The 256-color palette index
 * @returns Color256 in range 0-7
 *
 * @example
 * ```typescript
 * import { reduceTo8 } from 'blecsd';
 *
 * reduceTo8(9);   // Bright red -> 1 (red)
 * reduceTo8(196); // Red cube -> 1 (red)
 * ```
 */
export function reduceTo8(color: Color256): Color256 {
	// Bright colors (8-15) map to base colors (0-7)
	if (color >= 8 && color <= 15) {
		return (color - 8) as Color256;
	}

	// Already a basic color
	if (color < 8) {
		return color;
	}

	// Get the RGB value and find nearest in 8-color palette
	const rgb = PALETTE_RGB[color];
	if (!rgb) return 0 as Color256;
	return matchColor(rgb, {
		palette: ANSI_8_PALETTE,
		indices: Array.from({ length: 8 }, (_, i) => i),
	});
}

/**
 * Reduces an RGB color directly to the nearest 8-color basic ANSI palette.
 *
 * @param rgb - The RGB color
 * @returns Color256 in range 0-7
 */
export function rgbTo8(rgb: RGB): Color256 {
	return matchColor(rgb, {
		palette: ANSI_8_PALETTE,
		indices: Array.from({ length: 8 }, (_, i) => i),
	});
}

// =============================================================================
// MONOCHROME REDUCTION
// =============================================================================

/**
 * Monochrome palette (black and white only).
 */
const MONO_BLACK: RGB = PALETTE_RGB[0] ?? { r: 0, g: 0, b: 0 };
const MONO_WHITE: RGB = PALETTE_RGB[15] ?? { r: 255, g: 255, b: 255 };
const MONO_PALETTE: readonly RGB[] = [MONO_BLACK, MONO_WHITE] as const;

/**
 * Reduces a Color256 to monochrome (black or white).
 * Uses luminance to determine which is closer.
 *
 * @param color - The 256-color palette index
 * @returns 0 (black) or 15 (white)
 *
 * @example
 * ```typescript
 * import { reduceTo2 } from 'blecsd';
 *
 * reduceTo2(9);   // Bright red -> 0 (dark) or 15 (light)
 * reduceTo2(11);  // Yellow -> 15 (bright enough to be white)
 * ```
 */
export function reduceTo2(color: Color256): Color256 {
	const rgb = PALETTE_RGB[color];
	if (!rgb) return 0 as Color256;
	const luminance = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
	return luminance > 127 ? (15 as Color256) : (0 as Color256);
}

/**
 * Reduces an RGB color to monochrome.
 *
 * @param rgb - The RGB color
 * @returns 0 (black) or 15 (white)
 */
export function rgbTo2(rgb: RGB): Color256 {
	const luminance = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
	return luminance > 127 ? (15 as Color256) : (0 as Color256);
}

// =============================================================================
// REDUCED PALETTES
// =============================================================================

/**
 * Creates a reduced palette for a given color depth.
 *
 * @param depth - Target color depth
 * @returns Array of Color256 indices in the reduced palette
 *
 * @example
 * ```typescript
 * import { createReducedPalette } from 'blecsd';
 *
 * const palette16 = createReducedPalette('16'); // [0, 1, 2, ..., 15]
 * const palette8 = createReducedPalette('8');   // [0, 1, 2, ..., 7]
 * const mono = createReducedPalette('2');       // [0, 15]
 * ```
 */
export function createReducedPalette(depth: ColorDepth): Color256[] {
	switch (depth) {
		case 'truecolor':
		case '256':
			// Full palette
			return Array.from({ length: 256 }, (_, i) => i as Color256);
		case '16':
			return Array.from({ length: 16 }, (_, i) => i as Color256);
		case '8':
			return Array.from({ length: 8 }, (_, i) => i as Color256);
		case '2':
			return [0 as Color256, 15 as Color256];
	}
}

/**
 * Gets the RGB palette for a given color depth.
 *
 * @param depth - Target color depth
 * @returns Array of RGB values
 */
export function getReducedPaletteRGB(depth: ColorDepth): readonly RGB[] {
	switch (depth) {
		case 'truecolor':
		case '256':
			return PALETTE_RGB;
		case '16':
			return ANSI_16_PALETTE;
		case '8':
			return ANSI_8_PALETTE;
		case '2':
			return MONO_PALETTE;
	}
}

// =============================================================================
// UNIFIED REDUCTION
// =============================================================================

/**
 * Reduces a Color256 to a target color depth.
 *
 * @param color - The 256-color palette index
 * @param depth - Target color depth
 * @returns Reduced color index appropriate for the target depth
 *
 * @example
 * ```typescript
 * import { reduceColor } from 'blecsd';
 *
 * reduceColor(196, '16');  // Red cube -> nearest ANSI 16
 * reduceColor(196, '8');   // Red cube -> nearest ANSI 8
 * reduceColor(196, '2');   // Red cube -> black or white
 * ```
 */
export function reduceColor(color: Color256, depth: ColorDepth): Color256 {
	switch (depth) {
		case 'truecolor':
		case '256':
			return color;
		case '16':
			return reduceTo16(color);
		case '8':
			return reduceTo8(color);
		case '2':
			return reduceTo2(color);
	}
}

/**
 * Reduces an RGB color to a target color depth.
 *
 * @param rgb - The RGB color
 * @param depth - Target color depth
 * @returns Reduced Color256 index
 */
export function reduceRgb(rgb: RGB, depth: ColorDepth): Color256 {
	switch (depth) {
		case 'truecolor':
		case '256':
			return matchColor(rgb);
		case '16':
			return rgbTo16(rgb);
		case '8':
			return rgbTo8(rgb);
		case '2':
			return rgbTo2(rgb);
	}
}

// =============================================================================
// BATCH REDUCTION
// =============================================================================

/**
 * Reduces multiple colors to a target depth.
 *
 * @param colors - Array of Color256 indices
 * @param depth - Target color depth
 * @returns Array of reduced Color256 indices
 *
 * @example
 * ```typescript
 * import { reduceColors } from 'blecsd';
 *
 * const reduced = reduceColors([196, 46, 21], '16');
 * ```
 */
export function reduceColors(colors: readonly Color256[], depth: ColorDepth): Color256[] {
	return colors.map((c) => reduceColor(c, depth));
}

// =============================================================================
// COLOR MAPPING
// =============================================================================

/**
 * Creates a mapping from full 256-color palette to a reduced palette.
 * Useful for pre-computing reductions.
 *
 * @param depth - Target color depth
 * @returns Map from original Color256 to reduced Color256
 *
 * @example
 * ```typescript
 * import { createColorMap } from 'blecsd';
 *
 * const map16 = createColorMap('16');
 * const reduced = map16.get(196); // Get pre-computed 16-color equivalent
 * ```
 */
export function createColorMap(depth: ColorDepth): Map<Color256, Color256> {
	const map = new Map<Color256, Color256>();
	for (let i = 0; i < 256; i++) {
		const color = i as Color256;
		map.set(color, reduceColor(color, depth));
	}
	return map;
}

// Pre-computed maps for common reductions
let map16Cache: Map<Color256, Color256> | null = null;
let map8Cache: Map<Color256, Color256> | null = null;
let map2Cache: Map<Color256, Color256> | null = null;

/**
 * Gets a cached color map for common depths.
 * Creates the map on first access.
 *
 * @param depth - Target color depth
 * @returns Cached color map
 */
export function getCachedColorMap(depth: '16' | '8' | '2'): Map<Color256, Color256> {
	switch (depth) {
		case '16':
			if (!map16Cache) map16Cache = createColorMap('16');
			return map16Cache;
		case '8':
			if (!map8Cache) map8Cache = createColorMap('8');
			return map8Cache;
		case '2':
			if (!map2Cache) map2Cache = createColorMap('2');
			return map2Cache;
	}
}

/**
 * Fast color reduction using pre-computed maps.
 *
 * @param color - The Color256 to reduce
 * @param depth - Target depth (16, 8, or 2)
 * @returns Reduced Color256
 */
export function reduceFast(color: Color256, depth: '16' | '8' | '2'): Color256 {
	const map = getCachedColorMap(depth);
	return map.get(color) ?? color;
}

// =============================================================================
// BRIGHTNESS PRESERVATION
// =============================================================================

/**
 * Reduces a bright color (8-15) while preserving its bright status when possible.
 * For 16-color mode, bright colors stay bright.
 * For 8-color mode, bright colors map to base colors.
 *
 * @param color - The Color256 (typically 8-15)
 * @param depth - Target color depth
 * @returns Reduced Color256 that tries to preserve brightness
 */
export function reduceBright(color: Color256, depth: ColorDepth): Color256 {
	// Not a bright standard color
	if (color < 8 || color > 15) {
		return reduceColor(color, depth);
	}

	switch (depth) {
		case 'truecolor':
		case '256':
		case '16':
			// Keep bright colors as-is
			return color;
		case '8':
			// Map to base color
			return (color - 8) as Color256;
		case '2':
			// Bright colors are generally "light"
			return 15 as Color256;
	}
}

// =============================================================================
// COLOR DEPTH DETECTION
// =============================================================================

/**
 * Determines the minimum color depth needed to represent a color accurately.
 *
 * @param color - The Color256 to check
 * @returns The minimum depth that can represent this color well
 *
 * @example
 * ```typescript
 * import { getMinimumDepth } from 'blecsd';
 *
 * getMinimumDepth(1);   // '8' - basic ANSI color
 * getMinimumDepth(9);   // '16' - bright ANSI color
 * getMinimumDepth(196); // '256' - color cube color
 * ```
 */
export function getMinimumDepth(color: Color256): ColorDepth {
	if (color < 8) return '8';
	if (color < 16) return '16';
	return '256';
}

/**
 * Checks if a color will be accurately represented at a given depth.
 *
 * @param color - The Color256 to check
 * @param depth - Target color depth
 * @returns True if the color is in the target palette
 */
export function isAccurateAtDepth(color: Color256, depth: ColorDepth): boolean {
	switch (depth) {
		case 'truecolor':
		case '256':
			return true;
		case '16':
			return color < 16;
		case '8':
			return color < 8;
		case '2':
			return color === 0 || color === 15;
	}
}
