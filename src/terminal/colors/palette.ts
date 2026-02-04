/**
 * 256-color palette definitions and types
 * @module terminal/colors/palette
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Branded type for 256-color palette indices (0-255).
 * Prevents accidentally passing arbitrary numbers where color indices are expected.
 *
 * @example
 * ```typescript
 * import { Color256, isColor256 } from 'blecsd';
 *
 * const color: Color256 = 196 as Color256; // Red
 * if (isColor256(userInput)) {
 *   // Safe to use as color index
 * }
 * ```
 */
export type Color256 = number & { readonly __brand: 'Color256' };

/**
 * RGB color representation with values from 0-255.
 *
 * @example
 * ```typescript
 * import type { RGB } from 'blecsd';
 *
 * const red: RGB = { r: 255, g: 0, b: 0 };
 * ```
 */
export interface RGB {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

/**
 * RGBA color with alpha channel (0-1).
 *
 * @example
 * ```typescript
 * import type { RGBA } from 'blecsd';
 *
 * const semiTransparentRed: RGBA = { r: 255, g: 0, b: 0, a: 0.5 };
 * ```
 */
export interface RGBA extends RGB {
	readonly a: number;
}

/**
 * HSL color representation.
 * - h: Hue (0-360)
 * - s: Saturation (0-100)
 * - l: Lightness (0-100)
 *
 * @example
 * ```typescript
 * import type { HSL } from 'blecsd';
 *
 * const red: HSL = { h: 0, s: 100, l: 50 };
 * ```
 */
export interface HSL {
	readonly h: number;
	readonly s: number;
	readonly l: number;
}

/**
 * HSLA color with alpha channel.
 */
export interface HSLA extends HSL {
	readonly a: number;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema for validating 256-color palette indices.
 *
 * @example
 * ```typescript
 * import { Color256Schema } from 'blecsd';
 *
 * const result = Color256Schema.safeParse(196);
 * if (result.success) {
 *   console.log('Valid color:', result.data);
 * }
 * ```
 */
export const Color256Schema = z
	.number()
	.int()
	.min(0)
	.max(255)
	.transform((n) => n as Color256);

/**
 * Schema for RGB color objects.
 *
 * @example
 * ```typescript
 * import { RGBSchema } from 'blecsd';
 *
 * const result = RGBSchema.safeParse({ r: 255, g: 128, b: 0 });
 * ```
 */
export const RGBSchema = z.object({
	r: z.number().int().min(0).max(255),
	g: z.number().int().min(0).max(255),
	b: z.number().int().min(0).max(255),
});

/**
 * Schema for RGBA color objects.
 */
export const RGBASchema = RGBSchema.extend({
	a: z.number().min(0).max(1),
});

/**
 * Schema for HSL color objects.
 */
export const HSLSchema = z.object({
	h: z.number().min(0).max(360),
	s: z.number().min(0).max(100),
	l: z.number().min(0).max(100),
});

/**
 * Schema for HSLA color objects.
 */
export const HSLASchema = HSLSchema.extend({
	a: z.number().min(0).max(1),
});

/**
 * Schema for hex color strings (#RGB, #RRGGBB, or #RRGGBBAA).
 *
 * @example
 * ```typescript
 * import { HexColorSchema } from 'blecsd';
 *
 * HexColorSchema.parse('#ff0000'); // Valid
 * HexColorSchema.parse('#f00');    // Valid (shorthand)
 * HexColorSchema.parse('#ff000080'); // Valid (with alpha)
 * ```
 */
export const HexColorSchema = z
	.string()
	.regex(
		/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
		'Invalid hex color format. Expected #RGB, #RRGGBB, or #RRGGBBAA',
	);

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Checks if a number is a valid 256-color palette index.
 *
 * @param value - The value to check
 * @returns True if value is a valid Color256
 *
 * @example
 * ```typescript
 * import { isColor256 } from 'blecsd';
 *
 * if (isColor256(userInput)) {
 *   // userInput is now typed as Color256
 * }
 * ```
 */
export function isColor256(value: unknown): value is Color256 {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255;
}

/**
 * Asserts that a number is a valid Color256 and returns it typed.
 * Throws if invalid.
 *
 * @param value - The value to convert
 * @returns The value as Color256
 * @throws Error if value is not a valid color index
 *
 * @example
 * ```typescript
 * import { asColor256 } from 'blecsd';
 *
 * const color = asColor256(196); // Returns 196 as Color256
 * asColor256(256); // Throws Error
 * ```
 */
export function asColor256(value: number): Color256 {
	if (!isColor256(value)) {
		throw new Error(`Invalid Color256: ${value}. Must be integer 0-255.`);
	}
	return value;
}

/**
 * Type guard for RGB objects.
 */
export function isRGB(value: unknown): value is RGB {
	if (typeof value !== 'object' || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.r === 'number' &&
		typeof obj.g === 'number' &&
		typeof obj.b === 'number' &&
		obj.r >= 0 &&
		obj.r <= 255 &&
		obj.g >= 0 &&
		obj.g <= 255 &&
		obj.b >= 0 &&
		obj.b <= 255
	);
}

// =============================================================================
// 256-COLOR PALETTE
// =============================================================================

/**
 * Standard 16 ANSI colors (indices 0-15).
 * These are the basic terminal colors that have been standard since the VT100.
 */
const STANDARD_COLORS: readonly RGB[] = [
	// Standard colors (0-7)
	{ r: 0, g: 0, b: 0 }, // 0: Black
	{ r: 128, g: 0, b: 0 }, // 1: Maroon (Dark Red)
	{ r: 0, g: 128, b: 0 }, // 2: Green (Dark Green)
	{ r: 128, g: 128, b: 0 }, // 3: Olive (Dark Yellow)
	{ r: 0, g: 0, b: 128 }, // 4: Navy (Dark Blue)
	{ r: 128, g: 0, b: 128 }, // 5: Purple (Dark Magenta)
	{ r: 0, g: 128, b: 128 }, // 6: Teal (Dark Cyan)
	{ r: 192, g: 192, b: 192 }, // 7: Silver (Light Gray)
	// Bright colors (8-15)
	{ r: 128, g: 128, b: 128 }, // 8: Gray (Dark Gray)
	{ r: 255, g: 0, b: 0 }, // 9: Red
	{ r: 0, g: 255, b: 0 }, // 10: Lime (Bright Green)
	{ r: 255, g: 255, b: 0 }, // 11: Yellow
	{ r: 0, g: 0, b: 255 }, // 12: Blue
	{ r: 255, g: 0, b: 255 }, // 13: Fuchsia (Magenta)
	{ r: 0, g: 255, b: 255 }, // 14: Aqua (Cyan)
	{ r: 255, g: 255, b: 255 }, // 15: White
] as const;

/**
 * Generate the 6x6x6 color cube (indices 16-231).
 * Each channel has 6 levels: 0, 95, 135, 175, 215, 255
 */
function generateColorCube(): readonly RGB[] {
	const levels = [0, 95, 135, 175, 215, 255] as const;
	const colors: RGB[] = [];

	for (let r = 0; r < 6; r++) {
		for (let g = 0; g < 6; g++) {
			for (let b = 0; b < 6; b++) {
				colors.push({
					r: levels[r] ?? 0,
					g: levels[g] ?? 0,
					b: levels[b] ?? 0,
				});
			}
		}
	}

	return colors;
}

/**
 * Generate the 24-step grayscale ramp (indices 232-255).
 * Values range from 8 to 238 in steps of 10.
 */
function generateGrayscale(): readonly RGB[] {
	const colors: RGB[] = [];

	for (let i = 0; i < 24; i++) {
		const gray = 8 + i * 10;
		colors.push({ r: gray, g: gray, b: gray });
	}

	return colors;
}

// Build the complete palette
const COLOR_CUBE = generateColorCube();
const GRAYSCALE = generateGrayscale();

/**
 * Complete 256-color palette as RGB values.
 * - Indices 0-15: Standard ANSI colors
 * - Indices 16-231: 6x6x6 color cube
 * - Indices 232-255: 24-step grayscale
 *
 * @example
 * ```typescript
 * import { PALETTE_RGB } from 'blecsd';
 *
 * const red = PALETTE_RGB[9]; // { r: 255, g: 0, b: 0 }
 * const gray = PALETTE_RGB[240]; // Grayscale value
 * ```
 */
export const PALETTE_RGB: readonly RGB[] = [
	...STANDARD_COLORS,
	...COLOR_CUBE,
	...GRAYSCALE,
] as const;

/**
 * Converts an RGB value to a hex string.
 */
function rgbToHexString(rgb: RGB): string {
	const toHex = (n: number): string => n.toString(16).padStart(2, '0');
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Complete 256-color palette as hex strings.
 *
 * @example
 * ```typescript
 * import { PALETTE_HEX } from 'blecsd';
 *
 * const red = PALETTE_HEX[9]; // '#ff0000'
 * ```
 */
export const PALETTE_HEX: readonly string[] = PALETTE_RGB.map(rgbToHexString) as readonly string[];

// =============================================================================
// PALETTE ACCESS FUNCTIONS
// =============================================================================

/**
 * Get the RGB value for a 256-color palette index.
 *
 * @param color - The palette index (0-255)
 * @returns The RGB color value
 *
 * @example
 * ```typescript
 * import { getRGB } from 'blecsd';
 *
 * const rgb = getRGB(196 as Color256);
 * console.log(rgb); // { r: 255, g: 0, b: 95 }
 * ```
 */
export function getRGB(color: Color256): RGB {
	const rgb = PALETTE_RGB[color];
	if (!rgb) {
		throw new Error(`Invalid Color256: ${color}`);
	}
	return rgb;
}

/**
 * Get the hex string for a 256-color palette index.
 *
 * @param color - The palette index (0-255)
 * @returns The hex color string
 *
 * @example
 * ```typescript
 * import { getHex } from 'blecsd';
 *
 * const hex = getHex(196 as Color256);
 * console.log(hex); // '#ff005f'
 * ```
 */
export function getHex(color: Color256): string {
	const hex = PALETTE_HEX[color];
	if (!hex) {
		throw new Error(`Invalid Color256: ${color}`);
	}
	return hex;
}

// =============================================================================
// COLOR CUBE UTILITIES
// =============================================================================

/**
 * The 6 intensity levels used in the 256-color cube.
 */
export const COLOR_CUBE_LEVELS = [0, 95, 135, 175, 215, 255] as const;

/**
 * Get the color cube index for given R, G, B levels (0-5 each).
 *
 * @param r - Red level (0-5)
 * @param g - Green level (0-5)
 * @param b - Blue level (0-5)
 * @returns The palette index (16-231)
 *
 * @example
 * ```typescript
 * import { colorCubeIndex } from 'blecsd';
 *
 * const index = colorCubeIndex(5, 0, 1); // Bright red with slight blue
 * ```
 */
export function colorCubeIndex(r: number, g: number, b: number): Color256 {
	if (r < 0 || r > 5 || g < 0 || g > 5 || b < 0 || b > 5) {
		throw new Error('Color cube levels must be 0-5');
	}
	return (16 + 36 * r + 6 * g + b) as Color256;
}

/**
 * Get the grayscale palette index for a given step (0-23).
 *
 * @param step - Grayscale step (0-23, where 0 is darkest)
 * @returns The palette index (232-255)
 *
 * @example
 * ```typescript
 * import { grayscaleIndex } from 'blecsd';
 *
 * const darkGray = grayscaleIndex(5);
 * const lightGray = grayscaleIndex(20);
 * ```
 */
export function grayscaleIndex(step: number): Color256 {
	if (step < 0 || step > 23) {
		throw new Error('Grayscale step must be 0-23');
	}
	return (232 + step) as Color256;
}

/**
 * Check if a palette index is in the standard color range (0-15).
 */
export function isStandardColor(color: Color256): boolean {
	return color >= 0 && color <= 15;
}

/**
 * Check if a palette index is in the color cube range (16-231).
 */
export function isColorCube(color: Color256): boolean {
	return color >= 16 && color <= 231;
}

/**
 * Check if a palette index is in the grayscale range (232-255).
 */
export function isGrayscale(color: Color256): boolean {
	return color >= 232 && color <= 255;
}

// =============================================================================
// STANDARD COLOR CONSTANTS
// =============================================================================

/**
 * Named constants for the 16 standard ANSI colors.
 *
 * @example
 * ```typescript
 * import { COLORS } from 'blecsd';
 *
 * const fg = COLORS.RED;
 * const bg = COLORS.BLACK;
 * ```
 */
export const COLORS = {
	BLACK: 0 as Color256,
	MAROON: 1 as Color256,
	GREEN: 2 as Color256,
	OLIVE: 3 as Color256,
	NAVY: 4 as Color256,
	PURPLE: 5 as Color256,
	TEAL: 6 as Color256,
	SILVER: 7 as Color256,
	GRAY: 8 as Color256,
	RED: 9 as Color256,
	LIME: 10 as Color256,
	YELLOW: 11 as Color256,
	BLUE: 12 as Color256,
	FUCHSIA: 13 as Color256,
	CYAN: 14 as Color256,
	WHITE: 15 as Color256,
} as const;

/**
 * Alias for standard colors using common terminal names.
 */
export const ANSI = {
	...COLORS,
	// Common aliases
	DARK_GRAY: 8 as Color256,
	LIGHT_GRAY: 7 as Color256,
	BRIGHT_RED: 9 as Color256,
	BRIGHT_GREEN: 10 as Color256,
	BRIGHT_YELLOW: 11 as Color256,
	BRIGHT_BLUE: 12 as Color256,
	BRIGHT_MAGENTA: 13 as Color256,
	BRIGHT_CYAN: 14 as Color256,
	MAGENTA: 5 as Color256,
	DARK_RED: 1 as Color256,
	DARK_GREEN: 2 as Color256,
	DARK_YELLOW: 3 as Color256,
	DARK_BLUE: 4 as Color256,
	DARK_MAGENTA: 5 as Color256,
	DARK_CYAN: 6 as Color256,
} as const;
