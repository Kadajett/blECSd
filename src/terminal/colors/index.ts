/**
 * Color system for terminal applications
 *
 * This module provides:
 * - 256-color palette with type-safe Color256 indices
 * - Color format conversions (RGB, HSL, Hex, Truecolor)
 * - Color matching algorithms for finding nearest palette colors
 * - Cached matching for performance
 * - SGR escape sequence helpers
 *
 * @module terminal/colors
 *
 * @example
 * ```typescript
 * import {
 *   COLORS,
 *   hexToRgb,
 *   rgbToColor256,
 *   matchColorCached,
 *   sgrFgRgb,
 * } from 'blecsd';
 *
 * // Use named ANSI colors
 * const fg = COLORS.RED;
 *
 * // Convert hex to RGB
 * const rgb = hexToRgb('#ff6600');
 *
 * // Find nearest 256-color match
 * const color256 = rgbToColor256(rgb);
 *
 * // Generate SGR escape sequence
 * const escape = `\x1b[${sgrFgRgb(rgb)}m`;
 * ```
 */

// =============================================================================
// PALETTE - Types, schemas, and color constants
// =============================================================================

export type {
	Color256,
	HSL,
	HSLA,
	RGB,
	RGBA,
} from './palette';

export {
	// Named color constants
	ANSI,
	// Type guards
	asColor256,
	// Palette data
	COLOR_CUBE_LEVELS,
	COLORS,
	// Zod schemas
	Color256Schema,
	// Palette utilities
	colorCubeIndex,
	// Palette access
	getHex,
	getRGB,
	grayscaleIndex,
	HexColorSchema,
	HSLASchema,
	HSLSchema,
	isColor256,
	isColorCube,
	isGrayscale,
	isRGB,
	isStandardColor,
	PALETTE_HEX,
	PALETTE_RGB,
	RGBASchema,
	RGBSchema,
} from './palette';

// =============================================================================
// CONVERT - Color format conversions
// =============================================================================

export type { ColorValue } from './convert';

export {
	// 256-color conversions
	color256ToHex,
	color256ToRgb,
	// Truecolor conversions
	color256ToTruecolor,
	hexToColor256,
	// Hex conversions
	hexToRgb,
	hexToTruecolor,
	// HSL conversions
	hslaToRgba,
	hslToRgb,
	// Unified parsing
	parseColor,
	rgbaToHex,
	rgbaToHsla,
	rgbToColor256,
	// Smart color cube/grayscale conversion
	rgbToColorCube,
	rgbToGrayscale256,
	rgbToHex,
	rgbToHsl,
	rgbToTruecolor,
	// SGR helpers
	sgrBg256,
	sgrBgRgb,
	sgrFg256,
	sgrFgRgb,
	toColor256,
	toHex,
	toTruecolor,
	truecolorToColor256,
	truecolorToHex,
	truecolorToRgb,
} from './convert';

// =============================================================================
// MATCH - Color matching algorithms
// =============================================================================

export type { DistanceFunction, MatchOptions } from './match';

export {
	// Cached matching
	clearColorCache,
	// Color difference metrics
	color256Similar,
	colorDifference,
	colorsSimilar,
	createColorCache,
	// Distance functions
	euclideanDistance,
	getColorCacheSize,
	// Basic matching
	matchColor,
	matchColorCached,
	// Specialized matchers
	matchColorCube,
	matchColorSmart,
	matchColors,
	matchGrayscale,
	matchStandardColor,
	redMeanDistance,
	weightedDistance,
} from './match';

// =============================================================================
// NAMES - Color name mappings
// =============================================================================

export type {
	BasicColorName,
	BrightColorName,
	ColorName,
	DarkColorName,
	LightColorName,
	SpecialColorName,
} from './names';

export {
	// Name mappings
	COLOR_ALIASES,
	COLOR_NAMES,
	// Zod schema
	ColorNameSchema,
	CSS_COLORS,
	// Conversion functions
	colorToName,
	cssNameToColor,
	// List utilities
	getColorNames,
	getCssColorNames,
	// Type guards
	isColorName,
	isSpecialColor,
	nameToColor,
} from './names';

// =============================================================================
// BLEND - Color blending and mixing
// =============================================================================

export {
	// Basic blending
	blend,
	// Alpha blending
	blendAlpha,
	blendWithAlpha,
	// Hue operations
	complement,
	// Contrast/accessibility
	contrastRatio,
	// Lightening/darkening
	darken,
	darken256,
	// Saturation
	desaturate,
	// Gradients
	gradient,
	gradient256,
	grayscale,
	invert,
	isReadable,
	lighten,
	lighten256,
	luminance,
	mix,
	rotateHue,
	saturate,
} from './blend';

// =============================================================================
// REDUCE - Color reduction for low-color terminals
// =============================================================================

export type { ColorBits, ColorDepth } from './reduce';

export {
	// Depth constants
	COLOR_DEPTH_BITS,
	// Color maps
	createColorMap,
	// Palettes
	createReducedPalette,
	getCachedColorMap,
	// Depth detection
	getMinimumDepth,
	getReducedPaletteRGB,
	isAccurateAtDepth,
	// Brightness preservation
	reduceBright,
	// Unified reduction
	reduceColor,
	reduceColors,
	reduceFast,
	reduceRgb,
	// Monochrome reduction
	reduceTo2,
	// 8-color reduction
	reduceTo8,
	// 16-color reduction
	reduceTo16,
	rgbTo2,
	rgbTo8,
	rgbTo16,
} from './reduce';
