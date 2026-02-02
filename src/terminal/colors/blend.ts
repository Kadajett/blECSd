/**
 * Color blending and mixing functions
 * @module terminal/colors/blend
 */

import { hslToRgb, rgbToColor256, rgbToHsl } from './convert';
import type { Color256, RGB, RGBA } from './palette';

// =============================================================================
// RGB BLENDING
// =============================================================================

/**
 * Mixes two RGB colors together.
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @param ratio - Blend ratio (0 = all c1, 1 = all c2, 0.5 = equal mix). Default 0.5
 * @returns Blended RGB color
 *
 * @example
 * ```typescript
 * import { mix } from 'blecsd';
 *
 * // 50/50 mix of red and blue
 * const purple = mix(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 0, g: 0, b: 255 }
 * );
 *
 * // 75% red, 25% blue
 * const redPurple = mix(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 0, g: 0, b: 255 },
 *   0.25
 * );
 * ```
 */
export function mix(c1: RGB, c2: RGB, ratio: number = 0.5): RGB {
	const t = Math.max(0, Math.min(1, ratio));
	const s = 1 - t;

	return {
		r: Math.round(c1.r * s + c2.r * t),
		g: Math.round(c1.g * s + c2.g * t),
		b: Math.round(c1.b * s + c2.b * t),
	};
}

/**
 * Blends two Color256 palette colors together.
 *
 * @param c1 - First palette color
 * @param c2 - Second palette color
 * @param ratio - Blend ratio (0 = all c1, 1 = all c2). Default 0.5
 * @returns Nearest Color256 to the blended result
 *
 * @example
 * ```typescript
 * import { blend, COLORS } from 'blecsd';
 *
 * // Mix red and blue
 * const purple = blend(COLORS.RED, COLORS.BLUE);
 * ```
 */
export function blend(c1: Color256, c2: Color256, ratio: number = 0.5): Color256 {
	const rgb1 = { ...getPaletteRgb(c1) };
	const rgb2 = { ...getPaletteRgb(c2) };
	const mixed = mix(rgb1, rgb2, ratio);
	return rgbToColor256(mixed);
}

// =============================================================================
// LIGHTENING AND DARKENING
// =============================================================================

/**
 * Lightens an RGB color by a percentage.
 *
 * @param color - The color to lighten
 * @param amount - Amount to lighten (0-1, where 1 = white)
 * @returns Lightened RGB color
 *
 * @example
 * ```typescript
 * import { lighten } from 'blecsd';
 *
 * const lightRed = lighten({ r: 255, g: 0, b: 0 }, 0.3);
 * ```
 */
export function lighten(color: RGB, amount: number): RGB {
	const t = Math.max(0, Math.min(1, amount));
	return {
		r: Math.round(color.r + (255 - color.r) * t),
		g: Math.round(color.g + (255 - color.g) * t),
		b: Math.round(color.b + (255 - color.b) * t),
	};
}

/**
 * Darkens an RGB color by a percentage.
 *
 * @param color - The color to darken
 * @param amount - Amount to darken (0-1, where 1 = black)
 * @returns Darkened RGB color
 *
 * @example
 * ```typescript
 * import { darken } from 'blecsd';
 *
 * const darkRed = darken({ r: 255, g: 0, b: 0 }, 0.3);
 * ```
 */
export function darken(color: RGB, amount: number): RGB {
	const t = Math.max(0, Math.min(1, amount));
	const s = 1 - t;
	return {
		r: Math.round(color.r * s),
		g: Math.round(color.g * s),
		b: Math.round(color.b * s),
	};
}

/**
 * Lightens a Color256 palette color.
 *
 * @param color - The palette color
 * @param amount - Amount to lighten (0-1)
 * @returns Nearest Color256 to the lightened result
 */
export function lighten256(color: Color256, amount: number): Color256 {
	const rgb = { ...getPaletteRgb(color) };
	const lightened = lighten(rgb, amount);
	return rgbToColor256(lightened);
}

/**
 * Darkens a Color256 palette color.
 *
 * @param color - The palette color
 * @param amount - Amount to darken (0-1)
 * @returns Nearest Color256 to the darkened result
 */
export function darken256(color: Color256, amount: number): Color256 {
	const rgb = { ...getPaletteRgb(color) };
	const darkened = darken(rgb, amount);
	return rgbToColor256(darkened);
}

// =============================================================================
// SATURATION
// =============================================================================

/**
 * Increases the saturation of an RGB color.
 *
 * @param color - The color to saturate
 * @param amount - Amount to increase saturation (0-1)
 * @returns Saturated RGB color
 *
 * @example
 * ```typescript
 * import { saturate } from 'blecsd';
 *
 * // Make a muted color more vibrant
 * const vibrant = saturate({ r: 180, g: 150, b: 150 }, 0.5);
 * ```
 */
export function saturate(color: RGB, amount: number): RGB {
	const hsl = rgbToHsl(color);
	const newSaturation = Math.min(100, hsl.s + hsl.s * amount);
	return hslToRgb({ ...hsl, s: newSaturation });
}

/**
 * Decreases the saturation of an RGB color.
 *
 * @param color - The color to desaturate
 * @param amount - Amount to decrease saturation (0-1, where 1 = grayscale)
 * @returns Desaturated RGB color
 *
 * @example
 * ```typescript
 * import { desaturate } from 'blecsd';
 *
 * // Make a color more muted
 * const muted = desaturate({ r: 255, g: 0, b: 0 }, 0.5);
 *
 * // Full desaturation = grayscale
 * const gray = desaturate({ r: 255, g: 0, b: 0 }, 1);
 * ```
 */
export function desaturate(color: RGB, amount: number): RGB {
	const hsl = rgbToHsl(color);
	const newSaturation = Math.max(0, hsl.s - hsl.s * amount);
	return hslToRgb({ ...hsl, s: newSaturation });
}

/**
 * Converts an RGB color to grayscale.
 *
 * @param color - The color to convert
 * @returns Grayscale RGB color
 *
 * @example
 * ```typescript
 * import { grayscale } from 'blecsd';
 *
 * const gray = grayscale({ r: 255, g: 0, b: 0 }); // { r: 77, g: 77, b: 77 }
 * ```
 */
export function grayscale(color: RGB): RGB {
	// Use luminance weights for perceptually accurate grayscale
	const gray = Math.round(color.r * 0.299 + color.g * 0.587 + color.b * 0.114);
	return { r: gray, g: gray, b: gray };
}

// =============================================================================
// ALPHA BLENDING
// =============================================================================

/**
 * Blends a foreground color with alpha over a background color.
 * Uses standard alpha compositing (Porter-Duff over operator).
 *
 * @param fg - Foreground color with alpha
 * @param bg - Background color (assumed opaque)
 * @returns Composited RGB color
 *
 * @example
 * ```typescript
 * import { blendWithAlpha } from 'blecsd';
 *
 * // 50% transparent red over blue
 * const result = blendWithAlpha(
 *   { r: 255, g: 0, b: 0, a: 0.5 },
 *   { r: 0, g: 0, b: 255 }
 * );
 * // { r: 128, g: 0, b: 128 }
 * ```
 */
export function blendWithAlpha(fg: RGBA, bg: RGB): RGB {
	const a = fg.a;
	const ia = 1 - a;

	return {
		r: Math.round(fg.r * a + bg.r * ia),
		g: Math.round(fg.g * a + bg.g * ia),
		b: Math.round(fg.b * a + bg.b * ia),
	};
}

/**
 * Blends two colors with alpha values together.
 * Uses Porter-Duff source over destination.
 *
 * @param src - Source (foreground) color
 * @param dst - Destination (background) color
 * @returns Composited RGBA color
 *
 * @example
 * ```typescript
 * import { blendAlpha } from 'blecsd';
 *
 * const result = blendAlpha(
 *   { r: 255, g: 0, b: 0, a: 0.5 },
 *   { r: 0, g: 0, b: 255, a: 0.5 }
 * );
 * ```
 */
export function blendAlpha(src: RGBA, dst: RGBA): RGBA {
	const srcA = src.a;
	const dstA = dst.a * (1 - srcA);
	const outA = srcA + dstA;

	if (outA === 0) {
		return { r: 0, g: 0, b: 0, a: 0 };
	}

	return {
		r: Math.round((src.r * srcA + dst.r * dstA) / outA),
		g: Math.round((src.g * srcA + dst.g * dstA) / outA),
		b: Math.round((src.b * srcA + dst.b * dstA) / outA),
		a: outA,
	};
}

// =============================================================================
// HUE OPERATIONS
// =============================================================================

/**
 * Rotates the hue of a color.
 *
 * @param color - The color to modify
 * @param degrees - Degrees to rotate hue (0-360)
 * @returns Color with rotated hue
 *
 * @example
 * ```typescript
 * import { rotateHue } from 'blecsd';
 *
 * // Red rotated 120 degrees = green
 * const green = rotateHue({ r: 255, g: 0, b: 0 }, 120);
 * ```
 */
export function rotateHue(color: RGB, degrees: number): RGB {
	const hsl = rgbToHsl(color);
	const newHue = (hsl.h + degrees) % 360;
	return hslToRgb({ ...hsl, h: newHue < 0 ? newHue + 360 : newHue });
}

/**
 * Gets the complementary color (hue + 180 degrees).
 *
 * @param color - The original color
 * @returns Complementary RGB color
 *
 * @example
 * ```typescript
 * import { complement } from 'blecsd';
 *
 * const cyan = complement({ r: 255, g: 0, b: 0 }); // Complement of red
 * ```
 */
export function complement(color: RGB): RGB {
	return rotateHue(color, 180);
}

/**
 * Inverts a color (255 - each channel).
 *
 * @param color - The color to invert
 * @returns Inverted RGB color
 *
 * @example
 * ```typescript
 * import { invert } from 'blecsd';
 *
 * const cyan = invert({ r: 255, g: 0, b: 0 }); // { r: 0, g: 255, b: 255 }
 * ```
 */
export function invert(color: RGB): RGB {
	return {
		r: 255 - color.r,
		g: 255 - color.g,
		b: 255 - color.b,
	};
}

// =============================================================================
// GRADIENT GENERATION
// =============================================================================

/**
 * Generates a gradient of colors between two endpoints.
 *
 * @param from - Starting color
 * @param to - Ending color
 * @param steps - Number of colors to generate (including endpoints)
 * @returns Array of RGB colors forming the gradient
 *
 * @example
 * ```typescript
 * import { gradient } from 'blecsd';
 *
 * // 5-step gradient from red to blue
 * const colors = gradient(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 0, g: 0, b: 255 },
 *   5
 * );
 * // [red, redPurple, purple, bluePurple, blue]
 * ```
 */
export function gradient(from: RGB, to: RGB, steps: number): RGB[] {
	if (steps < 2) {
		return [from];
	}

	const result: RGB[] = [];
	for (let i = 0; i < steps; i++) {
		const ratio = i / (steps - 1);
		result.push(mix(from, to, ratio));
	}
	return result;
}

/**
 * Generates a gradient using Color256 palette colors.
 *
 * @param from - Starting palette color
 * @param to - Ending palette color
 * @param steps - Number of colors to generate
 * @returns Array of Color256 values forming the gradient
 *
 * @example
 * ```typescript
 * import { gradient256, COLORS } from 'blecsd';
 *
 * const colors = gradient256(COLORS.RED, COLORS.BLUE, 5);
 * ```
 */
export function gradient256(from: Color256, to: Color256, steps: number): Color256[] {
	const fromRgb = { ...getPaletteRgb(from) };
	const toRgb = { ...getPaletteRgb(to) };
	const rgbGradient = gradient(fromRgb, toRgb, steps);
	return rgbGradient.map(rgbToColor256);
}

// =============================================================================
// CONTRAST
// =============================================================================

/**
 * Calculates the relative luminance of a color (0-1).
 * Used for calculating contrast ratios.
 *
 * @param color - The color
 * @returns Relative luminance (0-1)
 */
export function luminance(color: RGB): number {
	const r = color.r / 255;
	const g = color.g / 255;
	const b = color.b / 255;

	const rs = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
	const gs = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
	const bs = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates the contrast ratio between two colors.
 * Result is between 1 (no contrast) and 21 (maximum contrast).
 *
 * WCAG guidelines:
 * - 4.5:1 minimum for normal text
 * - 3:1 minimum for large text
 * - 7:1 enhanced for normal text
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @returns Contrast ratio (1-21)
 *
 * @example
 * ```typescript
 * import { contrastRatio } from 'blecsd';
 *
 * const ratio = contrastRatio(
 *   { r: 0, g: 0, b: 0 },
 *   { r: 255, g: 255, b: 255 }
 * ); // 21 (maximum contrast)
 * ```
 */
export function contrastRatio(c1: RGB, c2: RGB): number {
	const l1 = luminance(c1);
	const l2 = luminance(c2);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines if two colors have sufficient contrast for accessibility.
 *
 * @param c1 - First color
 * @param c2 - Second color
 * @param threshold - Minimum contrast ratio (default: 4.5 for WCAG AA)
 * @returns True if contrast is sufficient
 *
 * @example
 * ```typescript
 * import { isReadable } from 'blecsd';
 *
 * if (isReadable(textColor, backgroundColor)) {
 *   // Text is readable
 * }
 * ```
 */
export function isReadable(c1: RGB, c2: RGB, threshold: number = 4.5): boolean {
	return contrastRatio(c1, c2) >= threshold;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Import palette for internal use
import { PALETTE_RGB } from './palette';

/**
 * Gets the RGB value for a palette color.
 */
function getPaletteRgb(color: Color256): RGB {
	return PALETTE_RGB[color];
}
