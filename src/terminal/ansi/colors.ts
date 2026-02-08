/**
 * ANSI color codes and color-related types.
 *
 * Provides SGR (Select Graphic Rendition) codes and type definitions for:
 * - Basic 16 colors (8 normal + 8 bright)
 * - 256-color palette
 * - RGB true color (24-bit)
 *
 * @module terminal/ansi/colors
 * @internal This module is internal and not exported from the main package.
 */

import { CSI } from './constants';

// =============================================================================
// SGR (Select Graphic Rendition) Codes
// =============================================================================

/** SGR attribute codes */
export const SGR = {
	/** Reset all attributes */
	RESET: 0,

	// Text styles
	BOLD: 1,
	DIM: 2,
	ITALIC: 3,
	UNDERLINE: 4,
	BLINK: 5,
	RAPID_BLINK: 6,
	INVERSE: 7,
	HIDDEN: 8,
	STRIKETHROUGH: 9,

	// Reset individual styles
	RESET_BOLD: 22,
	RESET_DIM: 22,
	RESET_ITALIC: 23,
	RESET_UNDERLINE: 24,
	RESET_BLINK: 25,
	RESET_INVERSE: 27,
	RESET_HIDDEN: 28,
	RESET_STRIKETHROUGH: 29,

	// Foreground colors (30-37, 90-97)
	FG_BLACK: 30,
	FG_RED: 31,
	FG_GREEN: 32,
	FG_YELLOW: 33,
	FG_BLUE: 34,
	FG_MAGENTA: 35,
	FG_CYAN: 36,
	FG_WHITE: 37,
	FG_DEFAULT: 39,

	// Bright foreground colors
	FG_BRIGHT_BLACK: 90,
	FG_BRIGHT_RED: 91,
	FG_BRIGHT_GREEN: 92,
	FG_BRIGHT_YELLOW: 93,
	FG_BRIGHT_BLUE: 94,
	FG_BRIGHT_MAGENTA: 95,
	FG_BRIGHT_CYAN: 96,
	FG_BRIGHT_WHITE: 97,

	// Background colors (40-47, 100-107)
	BG_BLACK: 40,
	BG_RED: 41,
	BG_GREEN: 42,
	BG_YELLOW: 43,
	BG_BLUE: 44,
	BG_MAGENTA: 45,
	BG_CYAN: 46,
	BG_WHITE: 47,
	BG_DEFAULT: 49,

	// Bright background colors
	BG_BRIGHT_BLACK: 100,
	BG_BRIGHT_RED: 101,
	BG_BRIGHT_GREEN: 102,
	BG_BRIGHT_YELLOW: 103,
	BG_BRIGHT_BLUE: 104,
	BG_BRIGHT_MAGENTA: 105,
	BG_BRIGHT_CYAN: 106,
	BG_BRIGHT_WHITE: 107,

	// Extended color codes
	FG_256: 38,
	BG_256: 48,
} as const;

// =============================================================================
// COLOR TYPES
// =============================================================================

/**
 * Basic 16 terminal colors (8 normal + 8 bright)
 */
export type BasicColor =
	| 'black'
	| 'red'
	| 'green'
	| 'yellow'
	| 'blue'
	| 'magenta'
	| 'cyan'
	| 'white'
	| 'brightBlack'
	| 'brightRed'
	| 'brightGreen'
	| 'brightYellow'
	| 'brightBlue'
	| 'brightMagenta'
	| 'brightCyan'
	| 'brightWhite'
	| 'default';

/**
 * 256-color palette index (0-255)
 */
export type Color256 = number;

/**
 * RGB color components (0-255 each)
 */
export interface RGBColor {
	r: number;
	g: number;
	b: number;
}

/**
 * Union type for all color formats
 */
export type Color = BasicColor | Color256 | RGBColor;

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

export const basicFgColors: Record<BasicColor, number> = {
	black: SGR.FG_BLACK,
	red: SGR.FG_RED,
	green: SGR.FG_GREEN,
	yellow: SGR.FG_YELLOW,
	blue: SGR.FG_BLUE,
	magenta: SGR.FG_MAGENTA,
	cyan: SGR.FG_CYAN,
	white: SGR.FG_WHITE,
	brightBlack: SGR.FG_BRIGHT_BLACK,
	brightRed: SGR.FG_BRIGHT_RED,
	brightGreen: SGR.FG_BRIGHT_GREEN,
	brightYellow: SGR.FG_BRIGHT_YELLOW,
	brightBlue: SGR.FG_BRIGHT_BLUE,
	brightMagenta: SGR.FG_BRIGHT_MAGENTA,
	brightCyan: SGR.FG_BRIGHT_CYAN,
	brightWhite: SGR.FG_BRIGHT_WHITE,
	default: SGR.FG_DEFAULT,
};

export const basicBgColors: Record<BasicColor, number> = {
	black: SGR.BG_BLACK,
	red: SGR.BG_RED,
	green: SGR.BG_GREEN,
	yellow: SGR.BG_YELLOW,
	blue: SGR.BG_BLUE,
	magenta: SGR.BG_MAGENTA,
	cyan: SGR.BG_CYAN,
	white: SGR.BG_WHITE,
	brightBlack: SGR.BG_BRIGHT_BLACK,
	brightRed: SGR.BG_BRIGHT_RED,
	brightGreen: SGR.BG_BRIGHT_GREEN,
	brightYellow: SGR.BG_BRIGHT_YELLOW,
	brightBlue: SGR.BG_BRIGHT_BLUE,
	brightMagenta: SGR.BG_BRIGHT_MAGENTA,
	brightCyan: SGR.BG_BRIGHT_CYAN,
	brightWhite: SGR.BG_BRIGHT_WHITE,
	default: SGR.BG_DEFAULT,
};

export function isRGBColor(color: Color): color is RGBColor {
	return typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color;
}

export function isBasicColor(color: Color): color is BasicColor {
	return typeof color === 'string';
}

/**
 * Generate SGR (Select Graphic Rendition) sequence
 */
export function sgr(...codes: number[]): string {
	return `${CSI}${codes.join(';')}m`;
}
