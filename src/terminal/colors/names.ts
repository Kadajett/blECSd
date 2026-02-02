/**
 * Color name mappings for terminal colors
 * @module terminal/colors/names
 */

import { z } from 'zod';
import { matchColor } from './match';
import type { Color256, RGB } from './palette';

// =============================================================================
// COLOR NAME TYPES
// =============================================================================

/**
 * Basic terminal color names (standard ANSI).
 */
export type BasicColorName =
	| 'black'
	| 'red'
	| 'green'
	| 'yellow'
	| 'blue'
	| 'magenta'
	| 'cyan'
	| 'white';

/**
 * Light/bright color variants.
 */
export type LightColorName =
	| 'lightblack'
	| 'lightred'
	| 'lightgreen'
	| 'lightyellow'
	| 'lightblue'
	| 'lightmagenta'
	| 'lightcyan'
	| 'lightwhite';

/**
 * Bright color aliases (alternative naming).
 */
export type BrightColorName =
	| 'brightblack'
	| 'brightred'
	| 'brightgreen'
	| 'brightyellow'
	| 'brightblue'
	| 'brightmagenta'
	| 'brightcyan'
	| 'brightwhite';

/**
 * Dark color variants.
 */
export type DarkColorName =
	| 'darkred'
	| 'darkgreen'
	| 'darkyellow'
	| 'darkblue'
	| 'darkmagenta'
	| 'darkcyan'
	| 'darkgray'
	| 'darkgrey';

/**
 * Special color names.
 */
export type SpecialColorName = 'default' | 'transparent' | 'inherit';

/**
 * All supported color names.
 */
export type ColorName =
	| BasicColorName
	| LightColorName
	| BrightColorName
	| DarkColorName
	| SpecialColorName
	| 'gray'
	| 'grey'
	| 'silver'
	| 'maroon'
	| 'olive'
	| 'navy'
	| 'purple'
	| 'teal'
	| 'aqua'
	| 'lime'
	| 'fuchsia'
	| 'orange';

// =============================================================================
// NAME TO COLOR MAPPING
// =============================================================================

/**
 * Mapping of color names to 256-color palette indices.
 */
export const COLOR_NAMES: Record<string, Color256> = {
	// Basic colors (0-7)
	black: 0 as Color256,
	red: 1 as Color256,
	green: 2 as Color256,
	yellow: 3 as Color256,
	blue: 4 as Color256,
	magenta: 5 as Color256,
	cyan: 6 as Color256,
	white: 7 as Color256,

	// Bright/light variants (8-15)
	lightblack: 8 as Color256,
	lightred: 9 as Color256,
	lightgreen: 10 as Color256,
	lightyellow: 11 as Color256,
	lightblue: 12 as Color256,
	lightmagenta: 13 as Color256,
	lightcyan: 14 as Color256,
	lightwhite: 15 as Color256,

	// Bright aliases
	brightblack: 8 as Color256,
	brightred: 9 as Color256,
	brightgreen: 10 as Color256,
	brightyellow: 11 as Color256,
	brightblue: 12 as Color256,
	brightmagenta: 13 as Color256,
	brightcyan: 14 as Color256,
	brightwhite: 15 as Color256,

	// Dark variants (same as basic)
	darkred: 1 as Color256,
	darkgreen: 2 as Color256,
	darkyellow: 3 as Color256,
	darkblue: 4 as Color256,
	darkmagenta: 5 as Color256,
	darkcyan: 6 as Color256,
	darkgray: 8 as Color256,
	darkgrey: 8 as Color256,

	// Gray variants
	gray: 8 as Color256,
	grey: 8 as Color256,
	silver: 7 as Color256,

	// HTML/CSS color names
	maroon: 1 as Color256,
	olive: 3 as Color256,
	navy: 4 as Color256,
	purple: 5 as Color256,
	teal: 6 as Color256,
	aqua: 14 as Color256,
	lime: 10 as Color256,
	fuchsia: 13 as Color256,

	// Extended colors (from color cube)
	orange: 208 as Color256, // Closest orange in 256-color palette
} as const;

/**
 * Color aliases mapping common alternate names to canonical names.
 */
export const COLOR_ALIASES: Record<string, string> = {
	// Gray spelling variants
	grey: 'gray',
	lightgrey: 'lightblack',
	lightgray: 'lightblack',
	darkgrey: 'darkgray',

	// Bright/light equivalents
	bright: 'light',
	hi: 'light',

	// CSS/HTML aliases
	crimson: 'red',
	scarlet: 'red',
	vermillion: 'red',
	emerald: 'green',
	forest: 'green',
	azure: 'blue',
	cobalt: 'blue',
	indigo: 'blue',
	violet: 'magenta',
	pink: 'lightmagenta',
	gold: 'yellow',
	brown: 'maroon',

	// Regional spelling
	colour: 'color',
} as const;

// =============================================================================
// REVERSE MAPPING (COLOR TO NAME)
// =============================================================================

/**
 * Reverse mapping from color index to canonical name.
 * Only includes the primary name for each index.
 */
const COLOR_INDEX_TO_NAME: Map<number, string> = new Map([
	[0, 'black'],
	[1, 'red'],
	[2, 'green'],
	[3, 'yellow'],
	[4, 'blue'],
	[5, 'magenta'],
	[6, 'cyan'],
	[7, 'white'],
	[8, 'gray'],
	[9, 'brightred'],
	[10, 'brightgreen'],
	[11, 'brightyellow'],
	[12, 'brightblue'],
	[13, 'brightmagenta'],
	[14, 'brightcyan'],
	[15, 'brightwhite'],
	[208, 'orange'],
]);

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * List of all valid color names for schema validation.
 */
const ALL_COLOR_NAMES = Object.keys(COLOR_NAMES);

/**
 * Schema for validating color names.
 *
 * @example
 * ```typescript
 * import { ColorNameSchema } from 'blecsd';
 *
 * const result = ColorNameSchema.safeParse('red');
 * if (result.success) {
 *   console.log('Valid color name');
 * }
 * ```
 */
export const ColorNameSchema = z
	.string()
	.transform((s) => s.toLowerCase().trim())
	.refine(
		(name) =>
			ALL_COLOR_NAMES.includes(name) ||
			name === 'default' ||
			name === 'transparent' ||
			name === 'inherit',
		{ message: 'Invalid color name' },
	);

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Converts a color name to a Color256 index.
 * Returns null if the name is not recognized or is a special value.
 *
 * @param name - The color name (case-insensitive)
 * @returns Color256 index or null
 *
 * @example
 * ```typescript
 * import { nameToColor } from 'blecsd';
 *
 * nameToColor('red');        // 1
 * nameToColor('brightred');  // 9
 * nameToColor('invalid');    // null
 * nameToColor('default');    // null (special value)
 * ```
 */
export function nameToColor(name: string): Color256 | null {
	const normalized = name.toLowerCase().trim();

	// Check direct mapping first
	if (normalized in COLOR_NAMES) {
		return COLOR_NAMES[normalized];
	}

	// Check aliases
	const alias = COLOR_ALIASES[normalized];
	if (alias && alias in COLOR_NAMES) {
		return COLOR_NAMES[alias];
	}

	// Special values don't map to colors
	if (normalized === 'default' || normalized === 'transparent' || normalized === 'inherit') {
		return null;
	}

	// Try parsing compound names like 'bright-red', 'light_green'
	const parts = normalized.split(/[-_\s]+/);
	if (parts.length === 2) {
		const [modifier, base] = parts;
		const compoundName = modifier + base;
		if (compoundName in COLOR_NAMES) {
			return COLOR_NAMES[compoundName];
		}
	}

	return null;
}

/**
 * Converts a Color256 index to a canonical color name.
 * Returns null for colors without standard names.
 *
 * @param color - The Color256 index
 * @returns Color name or null
 *
 * @example
 * ```typescript
 * import { colorToName } from 'blecsd';
 *
 * colorToName(1);   // 'red'
 * colorToName(9);   // 'brightred'
 * colorToName(100); // null (no standard name)
 * ```
 */
export function colorToName(color: Color256): string | null {
	return COLOR_INDEX_TO_NAME.get(color) ?? null;
}

/**
 * Checks if a string is a valid color name.
 *
 * @param name - The string to check
 * @returns True if valid color name
 *
 * @example
 * ```typescript
 * import { isColorName } from 'blecsd';
 *
 * isColorName('red');     // true
 * isColorName('invalid'); // false
 * ```
 */
export function isColorName(name: string): name is ColorName {
	const normalized = name.toLowerCase().trim();
	return (
		normalized in COLOR_NAMES ||
		normalized in COLOR_ALIASES ||
		normalized === 'default' ||
		normalized === 'transparent' ||
		normalized === 'inherit'
	);
}

/**
 * Checks if a color name is a special value (default, transparent, inherit).
 *
 * @param name - The color name
 * @returns True if special value
 *
 * @example
 * ```typescript
 * import { isSpecialColor } from 'blecsd';
 *
 * isSpecialColor('default');     // true
 * isSpecialColor('transparent'); // true
 * isSpecialColor('red');         // false
 * ```
 */
export function isSpecialColor(name: string): name is SpecialColorName {
	const normalized = name.toLowerCase().trim();
	return normalized === 'default' || normalized === 'transparent' || normalized === 'inherit';
}

// =============================================================================
// CSS/X11 COLOR NAMES (EXTENDED)
// =============================================================================

/**
 * Extended CSS/X11 color names with RGB values.
 * These are matched to the nearest 256-color palette entry.
 */
export const CSS_COLORS: Record<string, RGB> = {
	// Reds
	indianred: { r: 205, g: 92, b: 92 },
	lightcoral: { r: 240, g: 128, b: 128 },
	salmon: { r: 250, g: 128, b: 114 },
	darksalmon: { r: 233, g: 150, b: 122 },
	lightsalmon: { r: 255, g: 160, b: 122 },
	crimson: { r: 220, g: 20, b: 60 },
	firebrick: { r: 178, g: 34, b: 34 },
	darkred: { r: 139, g: 0, b: 0 },

	// Pinks
	pink: { r: 255, g: 192, b: 203 },
	lightpink: { r: 255, g: 182, b: 193 },
	hotpink: { r: 255, g: 105, b: 180 },
	deeppink: { r: 255, g: 20, b: 147 },
	mediumvioletred: { r: 199, g: 21, b: 133 },
	palevioletred: { r: 219, g: 112, b: 147 },

	// Oranges
	coral: { r: 255, g: 127, b: 80 },
	tomato: { r: 255, g: 99, b: 71 },
	orangered: { r: 255, g: 69, b: 0 },
	darkorange: { r: 255, g: 140, b: 0 },
	orange: { r: 255, g: 165, b: 0 },

	// Yellows
	gold: { r: 255, g: 215, b: 0 },
	lightyellow: { r: 255, g: 255, b: 224 },
	lemonchiffon: { r: 255, g: 250, b: 205 },
	papayawhip: { r: 255, g: 239, b: 213 },
	moccasin: { r: 255, g: 228, b: 181 },
	peachpuff: { r: 255, g: 218, b: 185 },
	palegoldenrod: { r: 238, g: 232, b: 170 },
	khaki: { r: 240, g: 230, b: 140 },
	darkkhaki: { r: 189, g: 183, b: 107 },

	// Purples
	lavender: { r: 230, g: 230, b: 250 },
	thistle: { r: 216, g: 191, b: 216 },
	plum: { r: 221, g: 160, b: 221 },
	violet: { r: 238, g: 130, b: 238 },
	orchid: { r: 218, g: 112, b: 214 },
	mediumorchid: { r: 186, g: 85, b: 211 },
	mediumpurple: { r: 147, g: 112, b: 219 },
	rebeccapurple: { r: 102, g: 51, b: 153 },
	blueviolet: { r: 138, g: 43, b: 226 },
	darkviolet: { r: 148, g: 0, b: 211 },
	darkorchid: { r: 153, g: 50, b: 204 },
	darkmagenta: { r: 139, g: 0, b: 139 },
	indigo: { r: 75, g: 0, b: 130 },
	slateblue: { r: 106, g: 90, b: 205 },
	darkslateblue: { r: 72, g: 61, b: 139 },

	// Greens
	greenyellow: { r: 173, g: 255, b: 47 },
	chartreuse: { r: 127, g: 255, b: 0 },
	lawngreen: { r: 124, g: 252, b: 0 },
	limegreen: { r: 50, g: 205, b: 50 },
	palegreen: { r: 152, g: 251, b: 152 },
	lightgreen: { r: 144, g: 238, b: 144 },
	mediumspringgreen: { r: 0, g: 250, b: 154 },
	springgreen: { r: 0, g: 255, b: 127 },
	mediumseagreen: { r: 60, g: 179, b: 113 },
	seagreen: { r: 46, g: 139, b: 87 },
	forestgreen: { r: 34, g: 139, b: 34 },
	darkgreen: { r: 0, g: 100, b: 0 },
	yellowgreen: { r: 154, g: 205, b: 50 },
	olivedrab: { r: 107, g: 142, b: 35 },
	darkolivegreen: { r: 85, g: 107, b: 47 },
	mediumaquamarine: { r: 102, g: 205, b: 170 },
	darkseagreen: { r: 143, g: 188, b: 143 },
	lightseagreen: { r: 32, g: 178, b: 170 },
	darkcyan: { r: 0, g: 139, b: 139 },

	// Blues
	lightcyan: { r: 224, g: 255, b: 255 },
	paleturquoise: { r: 175, g: 238, b: 238 },
	aquamarine: { r: 127, g: 255, b: 212 },
	turquoise: { r: 64, g: 224, b: 208 },
	mediumturquoise: { r: 72, g: 209, b: 204 },
	darkturquoise: { r: 0, g: 206, b: 209 },
	cadetblue: { r: 95, g: 158, b: 160 },
	steelblue: { r: 70, g: 130, b: 180 },
	lightsteelblue: { r: 176, g: 196, b: 222 },
	powderblue: { r: 176, g: 224, b: 230 },
	lightblue: { r: 173, g: 216, b: 230 },
	skyblue: { r: 135, g: 206, b: 235 },
	lightskyblue: { r: 135, g: 206, b: 250 },
	deepskyblue: { r: 0, g: 191, b: 255 },
	dodgerblue: { r: 30, g: 144, b: 255 },
	cornflowerblue: { r: 100, g: 149, b: 237 },
	royalblue: { r: 65, g: 105, b: 225 },
	mediumblue: { r: 0, g: 0, b: 205 },
	darkblue: { r: 0, g: 0, b: 139 },
	midnightblue: { r: 25, g: 25, b: 112 },

	// Browns
	cornsilk: { r: 255, g: 248, b: 220 },
	blanchedalmond: { r: 255, g: 235, b: 205 },
	bisque: { r: 255, g: 228, b: 196 },
	navajowhite: { r: 255, g: 222, b: 173 },
	wheat: { r: 245, g: 222, b: 179 },
	burlywood: { r: 222, g: 184, b: 135 },
	tan: { r: 210, g: 180, b: 140 },
	rosybrown: { r: 188, g: 143, b: 143 },
	sandybrown: { r: 244, g: 164, b: 96 },
	goldenrod: { r: 218, g: 165, b: 32 },
	darkgoldenrod: { r: 184, g: 134, b: 11 },
	peru: { r: 205, g: 133, b: 63 },
	chocolate: { r: 210, g: 105, b: 30 },
	saddlebrown: { r: 139, g: 69, b: 19 },
	sienna: { r: 160, g: 82, b: 45 },
	brown: { r: 165, g: 42, b: 42 },

	// Whites/Grays
	snow: { r: 255, g: 250, b: 250 },
	honeydew: { r: 240, g: 255, b: 240 },
	mintcream: { r: 245, g: 255, b: 250 },
	azure: { r: 240, g: 255, b: 255 },
	aliceblue: { r: 240, g: 248, b: 255 },
	ghostwhite: { r: 248, g: 248, b: 255 },
	whitesmoke: { r: 245, g: 245, b: 245 },
	seashell: { r: 255, g: 245, b: 238 },
	beige: { r: 245, g: 245, b: 220 },
	oldlace: { r: 253, g: 245, b: 230 },
	floralwhite: { r: 255, g: 250, b: 240 },
	ivory: { r: 255, g: 255, b: 240 },
	antiquewhite: { r: 250, g: 235, b: 215 },
	linen: { r: 250, g: 240, b: 230 },
	lavenderblush: { r: 255, g: 240, b: 245 },
	mistyrose: { r: 255, g: 228, b: 225 },
	gainsboro: { r: 220, g: 220, b: 220 },
	lightgray: { r: 211, g: 211, b: 211 },
	lightgrey: { r: 211, g: 211, b: 211 },
	darkgray: { r: 169, g: 169, b: 169 },
	dimgray: { r: 105, g: 105, b: 105 },
	dimgrey: { r: 105, g: 105, b: 105 },
	lightslategray: { r: 119, g: 136, b: 153 },
	lightslategrey: { r: 119, g: 136, b: 153 },
	slategray: { r: 112, g: 128, b: 144 },
	slategrey: { r: 112, g: 128, b: 144 },
	darkslategray: { r: 47, g: 79, b: 79 },
	darkslategrey: { r: 47, g: 79, b: 79 },
} as const;

// Cache for CSS color lookups
const cssColorCache = new Map<string, Color256>();

/**
 * Converts a CSS/X11 color name to the nearest Color256 index.
 * Returns null if the name is not recognized.
 *
 * @param name - The CSS color name (case-insensitive)
 * @returns Color256 index or null
 *
 * @example
 * ```typescript
 * import { cssNameToColor } from 'blecsd';
 *
 * cssNameToColor('coral');     // Nearest 256-color match
 * cssNameToColor('invalid');   // null
 * ```
 */
export function cssNameToColor(name: string): Color256 | null {
	const normalized = name.toLowerCase().trim();

	// Check cache
	const cached = cssColorCache.get(normalized);
	if (cached !== undefined) {
		return cached;
	}

	// Check basic names first
	const basic = nameToColor(normalized);
	if (basic !== null) {
		cssColorCache.set(normalized, basic);
		return basic;
	}

	// Check CSS colors
	const rgb = CSS_COLORS[normalized];
	if (rgb) {
		const color = matchColor(rgb);
		cssColorCache.set(normalized, color);
		return color;
	}

	return null;
}

/**
 * Gets all available color names.
 *
 * @returns Array of color name strings
 *
 * @example
 * ```typescript
 * import { getColorNames } from 'blecsd';
 *
 * const names = getColorNames();
 * // ['black', 'red', 'green', ...]
 * ```
 */
export function getColorNames(): readonly string[] {
	return ALL_COLOR_NAMES;
}

/**
 * Gets all available CSS/X11 color names.
 *
 * @returns Array of CSS color name strings
 */
export function getCssColorNames(): readonly string[] {
	return Object.keys(CSS_COLORS);
}
