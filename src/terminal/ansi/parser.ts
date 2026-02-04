/**
 * ANSI SGR Attribute Code Parser
 *
 * Parses ANSI SGR (Select Graphic Rendition) codes from escape sequences
 * and converts them to internal attribute representations.
 *
 * @module terminal/ansi/parser
 * @internal This module is internal and not exported from the main package.
 */

import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Text style flags packed as a bitmask.
 */
export const TextStyle = {
	NONE: 0,
	BOLD: 1 << 0,
	DIM: 1 << 1,
	ITALIC: 1 << 2,
	UNDERLINE: 1 << 3,
	BLINK: 1 << 4,
	RAPID_BLINK: 1 << 5,
	INVERSE: 1 << 6,
	HIDDEN: 1 << 7,
	STRIKETHROUGH: 1 << 8,
	DOUBLE_UNDERLINE: 1 << 9,
	OVERLINE: 1 << 10,
} as const;

/**
 * Color type enum for internal representation.
 */
export const ColorType = {
	DEFAULT: 0,
	BASIC: 1,
	COLOR_256: 2,
	RGB: 3,
} as const;

export type ColorTypeValue = (typeof ColorType)[keyof typeof ColorType];

/**
 * Internal color representation.
 */
export interface InternalColor {
	type: ColorTypeValue;
	/** For BASIC: 0-15, for COLOR_256: 0-255, for RGB: packed as 0xRRGGBB */
	value: number;
}

/**
 * Terminal attribute representation.
 */
export interface Attribute {
	/** Foreground color */
	fg: InternalColor;
	/** Background color */
	bg: InternalColor;
	/** Style flags bitmask */
	styles: number;
}

/**
 * Zod schema for Attribute validation.
 */
export const AttributeSchema = z.object({
	fg: z.object({
		type: z.number().int().min(0).max(3),
		value: z.number().int().min(0),
	}),
	bg: z.object({
		type: z.number().int().min(0).max(3),
		value: z.number().int().min(0),
	}),
	styles: z.number().int().min(0),
});

// =============================================================================
// STYLE LOOKUP MAPS
// =============================================================================

/** Map SGR codes to style flags to enable */
const STYLE_ON_MAP: ReadonlyMap<number, number> = new Map([
	[1, TextStyle.BOLD],
	[2, TextStyle.DIM],
	[3, TextStyle.ITALIC],
	[4, TextStyle.UNDERLINE],
	[5, TextStyle.BLINK],
	[6, TextStyle.RAPID_BLINK],
	[7, TextStyle.INVERSE],
	[8, TextStyle.HIDDEN],
	[9, TextStyle.STRIKETHROUGH],
	[21, TextStyle.DOUBLE_UNDERLINE],
	[53, TextStyle.OVERLINE],
]);

/** Map SGR codes to style flags to disable */
const STYLE_OFF_MAP: ReadonlyMap<number, number> = new Map([
	[22, TextStyle.BOLD | TextStyle.DIM],
	[23, TextStyle.ITALIC],
	[24, TextStyle.UNDERLINE | TextStyle.DOUBLE_UNDERLINE],
	[25, TextStyle.BLINK | TextStyle.RAPID_BLINK],
	[27, TextStyle.INVERSE],
	[28, TextStyle.HIDDEN],
	[29, TextStyle.STRIKETHROUGH],
	[55, TextStyle.OVERLINE],
]);

// =============================================================================
// DEFAULT ATTRIBUTE
// =============================================================================

/**
 * Default attribute (reset state).
 */
export const DEFAULT_ATTRIBUTE: Readonly<Attribute> = {
	fg: { type: ColorType.DEFAULT, value: 0 },
	bg: { type: ColorType.DEFAULT, value: 0 },
	styles: TextStyle.NONE,
};

/**
 * Create a new attribute with default values.
 *
 * @returns New attribute object
 *
 * @example
 * ```typescript
 * const attr = createAttribute();
 * // attr.fg.type === ColorType.DEFAULT
 * ```
 */
export function createAttribute(): Attribute {
	return {
		fg: { type: ColorType.DEFAULT, value: 0 },
		bg: { type: ColorType.DEFAULT, value: 0 },
		styles: TextStyle.NONE,
	};
}

/**
 * Clone an attribute.
 *
 * @param attr - Attribute to clone
 * @returns New attribute object
 */
export function cloneAttribute(attr: Attribute): Attribute {
	return {
		fg: { ...attr.fg },
		bg: { ...attr.bg },
		styles: attr.styles,
	};
}

// =============================================================================
// SGR CODE PARSING
// =============================================================================

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional for ANSI parsing
const SGR_REGEX = /\x1b\[([\d;]*)m/g;

/**
 * Extract SGR code sequences from a string.
 *
 * @param input - String containing ANSI sequences
 * @returns Array of SGR code arrays
 *
 * @example
 * ```typescript
 * const codes = extractSgrCodes('\x1b[1;31m');
 * // codes = [[1, 31]]
 * ```
 */
export function extractSgrCodes(input: string): number[][] {
	const results: number[][] = [];

	SGR_REGEX.lastIndex = 0;
	for (const match of input.matchAll(SGR_REGEX)) {
		const params = match[1] ?? '';
		if (params === '') {
			results.push([0]);
		} else {
			const codes = params.split(';').map((s) => Number.parseInt(s, 10) || 0);
			results.push(codes);
		}
	}

	return results;
}

/**
 * Parse basic foreground color code (30-37, 90-97).
 */
function parseBasicFg(code: number): InternalColor | null {
	if (code >= 30 && code <= 37) {
		return { type: ColorType.BASIC, value: code - 30 };
	}
	if (code >= 90 && code <= 97) {
		return { type: ColorType.BASIC, value: code - 90 + 8 };
	}
	if (code === 39) {
		return { type: ColorType.DEFAULT, value: 0 };
	}
	return null;
}

/**
 * Parse basic background color code (40-47, 100-107).
 */
function parseBasicBg(code: number): InternalColor | null {
	if (code >= 40 && code <= 47) {
		return { type: ColorType.BASIC, value: code - 40 };
	}
	if (code >= 100 && code <= 107) {
		return { type: ColorType.BASIC, value: code - 100 + 8 };
	}
	if (code === 49) {
		return { type: ColorType.DEFAULT, value: 0 };
	}
	return null;
}

/**
 * Parse extended color codes (256-color or RGB).
 */
function parseExtendedColor(
	codes: readonly number[],
	index: number,
	attr: Attribute,
	target: 'fg' | 'bg',
): number {
	const subCode = codes[index + 1];

	// 256-color: 38;5;N or 48;5;N
	if (subCode === 5) {
		const colorIndex = codes[index + 2];
		if (colorIndex !== undefined && colorIndex >= 0 && colorIndex <= 255) {
			attr[target] = { type: ColorType.COLOR_256, value: colorIndex };
		}
		return 3;
	}

	// RGB: 38;2;R;G;B or 48;2;R;G;B
	if (subCode === 2) {
		const r = codes[index + 2];
		const g = codes[index + 3];
		const b = codes[index + 4];
		if (isValidRgb(r, g, b)) {
			const packed = (r << 16) | ((g ?? 0) << 8) | (b ?? 0);
			attr[target] = { type: ColorType.RGB, value: packed };
		}
		return 5;
	}

	return 1;
}

/**
 * Check if RGB values are valid.
 */
function isValidRgb(
	r: number | undefined,
	g: number | undefined,
	b: number | undefined,
): r is number {
	return (
		r !== undefined &&
		g !== undefined &&
		b !== undefined &&
		r >= 0 &&
		r <= 255 &&
		g >= 0 &&
		g <= 255 &&
		b >= 0 &&
		b <= 255
	);
}

/**
 * Apply style ON code.
 */
function applyStyleOn(code: number, attr: Attribute): boolean {
	const style = STYLE_ON_MAP.get(code);
	if (style !== undefined) {
		attr.styles |= style;
		return true;
	}
	return false;
}

/**
 * Apply style OFF code.
 */
function applyStyleOff(code: number, attr: Attribute): boolean {
	const style = STYLE_OFF_MAP.get(code);
	if (style !== undefined) {
		attr.styles &= ~style;
		return true;
	}
	return false;
}

/**
 * Apply a color code to an attribute.
 */
function applyColorCode(code: number, attr: Attribute): boolean {
	const fgColor = parseBasicFg(code);
	if (fgColor !== null) {
		attr.fg = fgColor;
		return true;
	}

	const bgColor = parseBasicBg(code);
	if (bgColor !== null) {
		attr.bg = bgColor;
		return true;
	}

	return false;
}

/**
 * Apply a single SGR code to an attribute.
 * Returns the number of codes consumed (for 256-color and RGB handling).
 */
function applySingleCode(attr: Attribute, codes: readonly number[], index: number): number {
	const code = codes[index];
	if (code === undefined) return 1;

	// Reset
	if (code === 0) {
		attr.fg = { type: ColorType.DEFAULT, value: 0 };
		attr.bg = { type: ColorType.DEFAULT, value: 0 };
		attr.styles = TextStyle.NONE;
		return 1;
	}

	// Style ON codes
	if (applyStyleOn(code, attr)) return 1;

	// Style OFF codes
	if (applyStyleOff(code, attr)) return 1;

	// Extended foreground color (38;5;N or 38;2;R;G;B)
	if (code === 38) {
		return parseExtendedColor(codes, index, attr, 'fg');
	}

	// Extended background color (48;5;N or 48;2;R;G;B)
	if (code === 48) {
		return parseExtendedColor(codes, index, attr, 'bg');
	}

	// Basic colors
	applyColorCode(code, attr);

	return 1;
}

/**
 * Apply a sequence of SGR codes to an attribute.
 *
 * @param codes - Array of SGR code numbers
 * @param attr - Attribute to modify (mutated in place)
 *
 * @example
 * ```typescript
 * const attr = createAttribute();
 * applySgrCodes([1, 31], attr);
 * // attr now has bold style and red foreground
 * ```
 */
export function applySgrCodes(codes: readonly number[], attr: Attribute): void {
	let i = 0;
	while (i < codes.length) {
		const consumed = applySingleCode(attr, codes, i);
		i += consumed;
	}
}

/**
 * Parse SGR codes from a string and apply to an attribute.
 *
 * @param input - String containing SGR sequences
 * @param attr - Attribute to modify
 *
 * @example
 * ```typescript
 * const attr = createAttribute();
 * parseSgrString('\x1b[1;4;31m', attr);
 * // attr has bold, underline, and red foreground
 * ```
 */
interface SgrParseState {
	readonly input: string;
	readonly length: number;
	index: number;
	ended: boolean;
	invalid: boolean;
}

function createSgrParseState(input: string): SgrParseState {
	return { input, length: input.length, index: 0, ended: false, invalid: false };
}

function resetSgrAttribute(attr: Attribute): void {
	attr.fg = { type: ColorType.DEFAULT, value: 0 };
	attr.bg = { type: ColorType.DEFAULT, value: 0 };
	attr.styles = TextStyle.NONE;
}

function finalizeSgrParam(
	state: SgrParseState,
	value: number,
	hasDigits: boolean,
	terminator: number | null,
): number {
	if (terminator === 59) {
		state.index += 1;
		state.invalid = false;
		return hasDigits ? value : 0;
	}

	if (terminator === 109) {
		state.index += 1;
		state.ended = true;
		state.invalid = false;
		return hasDigits ? value : 0;
	}

	state.ended = true;
	state.invalid = true;
	if (terminator !== null) {
		state.index += 1;
	}
	return hasDigits ? value : 0;
}

function readSgrParam(state: SgrParseState): number {
	let value = 0;
	let hasDigits = false;
	state.invalid = false;

	while (state.index < state.length) {
		const ch = state.input.charCodeAt(state.index);
		if (ch >= 48 && ch <= 57) {
			value = value * 10 + (ch - 48);
			hasDigits = true;
			state.index += 1;
			continue;
		}

		return finalizeSgrParam(state, value, hasDigits, ch);
	}

	return finalizeSgrParam(state, value, hasDigits, null);
}

function applyExtendedColor(state: SgrParseState, attr: Attribute, code: number): void {
	if (state.ended) {
		return;
	}

	const target = code === 38 ? 'fg' : 'bg';
	const subCode = readSgrParam(state);
	if (state.invalid || state.ended) {
		return;
	}

	if (subCode === 5) {
		applyExtended256Color(state, attr, target);
		return;
	}

	if (subCode === 2) {
		applyExtendedRgbColor(state, attr, target);
	}
}

function applyExtended256Color(state: SgrParseState, attr: Attribute, target: 'fg' | 'bg'): void {
	const colorIndex = readSgrParam(state);
	if (state.invalid) {
		return;
	}
	if (colorIndex >= 0 && colorIndex <= 255) {
		attr[target] = { type: ColorType.COLOR_256, value: colorIndex };
	}
}

function applyExtendedRgbColor(state: SgrParseState, attr: Attribute, target: 'fg' | 'bg'): void {
	const rgb = readRgbParams(state);
	if (!rgb) {
		return;
	}
	const [r, g, b] = rgb;
	if (isValidRgb(r, g, b)) {
		attr[target] = {
			type: ColorType.RGB,
			value: (r << 16) | (g << 8) | b,
		};
	}
}

function readRgbParams(state: SgrParseState): [number, number, number] | null {
	const r = readSgrParam(state);
	if (state.invalid || state.ended) {
		return null;
	}
	const g = readSgrParam(state);
	if (state.invalid || state.ended) {
		return null;
	}
	const b = readSgrParam(state);
	if (state.invalid) {
		return null;
	}
	return [r, g, b];
}

function applySgrCode(state: SgrParseState, attr: Attribute, code: number): void {
	if (code === 0) {
		resetSgrAttribute(attr);
		return;
	}

	if (code === 38 || code === 48) {
		applyExtendedColor(state, attr, code);
		return;
	}

	if (applyStyleOn(code, attr)) return;
	if (applyStyleOff(code, attr)) return;

	applyColorCode(code, attr);
}

function parseSgrSequence(state: SgrParseState, attr: Attribute): void {
	state.ended = false;
	state.invalid = false;

	while (!state.ended && state.index <= state.length) {
		const code = readSgrParam(state);
		if (state.invalid) {
			return;
		}
		applySgrCode(state, attr, code);
		if (state.invalid) {
			return;
		}
	}
}

export function parseSgrString(input: string, attr: Attribute): void {
	const state = createSgrParseState(input);

	while (state.index < state.length) {
		const escIndex = input.indexOf('\x1b', state.index);
		if (escIndex === -1) {
			return;
		}

		state.index = escIndex + 1;
		if (state.index >= state.length || input.charCodeAt(state.index) !== 91) {
			continue;
		}

		state.index += 1;
		parseSgrSequence(state, attr);
	}
}

// =============================================================================
// ATTRIBUTE CODE FUNCTION
// =============================================================================

/**
 * Apply a single SGR code to an attribute, returning a new attribute.
 * This is the main entry point for processing individual codes.
 *
 * @param code - SGR code number or array of codes
 * @param attr - Current attribute
 * @param defaultAttr - Default attribute to reset to (default: DEFAULT_ATTRIBUTE)
 * @returns New attribute with code applied
 *
 * @example
 * ```typescript
 * const attr = createAttribute();
 * const newAttr = attrCode(1, attr); // Apply bold
 * const redAttr = attrCode([31], newAttr); // Apply red
 * ```
 */
export function attrCode(
	code: number | readonly number[],
	attr: Attribute,
	defaultAttr: Attribute = DEFAULT_ATTRIBUTE,
): Attribute {
	const result = cloneAttribute(attr);

	// Handle reset specially to use provided default
	const isReset = code === 0 || (Array.isArray(code) && code.length === 1 && code[0] === 0);
	if (isReset) {
		return cloneAttribute(defaultAttr);
	}

	const codes = Array.isArray(code) ? code : [code];
	applySgrCodes(codes, result);

	return result;
}

// =============================================================================
// ATTRIBUTE TO SGR STRING CONVERSION
// =============================================================================

/**
 * Color depth for output.
 */
export type OutputColorDepth = 'truecolor' | '256' | '16' | 'none';

/**
 * Options for codeAttr.
 */
export interface CodeAttrOptions {
	/** Maximum color depth to output. Defaults to 'truecolor'. */
	colorDepth?: OutputColorDepth;
	/** Include reset code at start. Defaults to false. */
	includeReset?: boolean;
}

/** Color code offsets for foreground (30/90) and background (40/100) */
interface ColorOffsets {
	base: number;
	bright: number;
	extended: number;
	defaultCode: number;
}

const FG_OFFSETS: ColorOffsets = { base: 30, bright: 90, extended: 38, defaultCode: 39 };
const BG_OFFSETS: ColorOffsets = { base: 40, bright: 100, extended: 48, defaultCode: 49 };

/** Converts basic color value to SGR codes */
function basicColorToSgr(value: number, offsets: ColorOffsets): number[] {
	return value < 8 ? [offsets.base + value] : [offsets.bright + (value - 8)];
}

/** Converts 256-color value to SGR codes */
function color256ToSgr(value: number, depth: OutputColorDepth, offsets: ColorOffsets): number[] {
	if (depth === '16') {
		const reduced = value < 16 ? value : reduceColorTo16(value);
		return basicColorToSgr(reduced, offsets);
	}
	return [offsets.extended, 5, value];
}

/** Converts RGB value to SGR codes */
function rgbToSgr(packedRgb: number, depth: OutputColorDepth, offsets: ColorOffsets): number[] {
	const { r, g, b } = unpackRgb(packedRgb);
	if (depth === 'truecolor') return [offsets.extended, 2, r, g, b];
	if (depth === '256') return [offsets.extended, 5, rgbToColor256(r, g, b)];
	return basicColorToSgr(rgbToBasic16(r, g, b), offsets);
}

/** Generic color to SGR conversion */
function colorToSgrCodes(
	color: InternalColor,
	depth: OutputColorDepth,
	offsets: ColorOffsets,
): number[] {
	if (color.type === ColorType.DEFAULT || depth === 'none') return [offsets.defaultCode];
	if (color.type === ColorType.BASIC) return basicColorToSgr(color.value, offsets);
	if (color.type === ColorType.COLOR_256) return color256ToSgr(color.value, depth, offsets);
	if (color.type === ColorType.RGB) return rgbToSgr(color.value, depth, offsets);
	return [];
}

/**
 * Convert a foreground color to SGR codes.
 */
function fgColorToSgrCodes(color: InternalColor, depth: OutputColorDepth): number[] {
	return colorToSgrCodes(color, depth, FG_OFFSETS);
}

/**
 * Convert a background color to SGR codes.
 */
function bgColorToSgrCodes(color: InternalColor, depth: OutputColorDepth): number[] {
	return colorToSgrCodes(color, depth, BG_OFFSETS);
}

/**
 * Convert style flags to SGR codes.
 */
function stylesToSgrCodes(styles: number): number[] {
	const codes: number[] = [];

	if ((styles & TextStyle.BOLD) !== 0) codes.push(1);
	if ((styles & TextStyle.DIM) !== 0) codes.push(2);
	if ((styles & TextStyle.ITALIC) !== 0) codes.push(3);
	if ((styles & TextStyle.UNDERLINE) !== 0) codes.push(4);
	if ((styles & TextStyle.BLINK) !== 0) codes.push(5);
	if ((styles & TextStyle.RAPID_BLINK) !== 0) codes.push(6);
	if ((styles & TextStyle.INVERSE) !== 0) codes.push(7);
	if ((styles & TextStyle.HIDDEN) !== 0) codes.push(8);
	if ((styles & TextStyle.STRIKETHROUGH) !== 0) codes.push(9);
	if ((styles & TextStyle.DOUBLE_UNDERLINE) !== 0) codes.push(21);
	if ((styles & TextStyle.OVERLINE) !== 0) codes.push(53);

	return codes;
}

/**
 * Reduce a 256-color value to basic 16.
 * Simple approximation without full color matching.
 */
function reduceColorCubeTo16(color: number): number {
	const idx = color - 16;
	const r = Math.floor(idx / 36);
	const g = Math.floor((idx % 36) / 6);
	const b = idx % 6;

	const lum = r * 0.3 + g * 0.59 + b * 0.11;
	const bright = lum > 2.5;

	const base = COLOR_CUBE_BASE[getColorCubeBits(r, g, b)] ?? 7;
	return bright ? base + 8 : base;
}

const COLOR_CUBE_BASE = [7, 1, 2, 3, 4, 5, 6, 7] as const;

function getColorCubeBits(r: number, g: number, b: number): number {
	const max = Math.max(r, g, b);
	return (r === max ? 1 : 0) | (g === max ? 2 : 0) | (b === max ? 4 : 0);
}

function reduceGrayscaleTo16(color: number): number {
	const gray = (color - 232) * 10 + 8;
	if (gray < 64) return 0;
	if (gray < 192) return 8;
	return 7;
}

function reduceColorTo16(color: number): number {
	if (color < 16) return color;
	if (color < 232) return reduceColorCubeTo16(color);
	return reduceGrayscaleTo16(color);
}

/**
 * Convert RGB to nearest 256-color palette index.
 */
function rgbToColor256(r: number, g: number, b: number): number {
	// Check if it's a grayscale
	if (r === g && g === b) {
		if (r < 8) return 16; // Near black
		if (r > 248) return 231; // Near white
		return Math.round((r - 8) / 10) + 232;
	}

	// Map to 6x6x6 color cube
	const ri = Math.round(r / 51);
	const gi = Math.round(g / 51);
	const bi = Math.round(b / 51);
	return 16 + ri * 36 + gi * 6 + bi;
}

/**
 * Convert RGB to basic 16-color palette.
 */
function rgbToBasic16(r: number, g: number, b: number): number {
	// Simple threshold-based conversion
	const bright = r + g + b > 384;

	const rBit = r > 127 ? 1 : 0;
	const gBit = g > 127 ? 1 : 0;
	const bBit = b > 127 ? 1 : 0;

	let base = (bBit << 2) | (gBit << 1) | rBit;
	if (bright && base !== 0) {
		base += 8;
	}

	return base;
}

/**
 * Convert an attribute to an SGR escape sequence string.
 *
 * This is the reverse of attrCode() - it takes an internal Attribute
 * and converts it to an ANSI escape sequence that will produce that attribute.
 *
 * @param attr - Attribute to convert
 * @param options - Conversion options
 * @returns SGR escape sequence string
 *
 * @example
 * ```typescript
 * import { codeAttr, createAttribute, attrCode, TextStyle } from 'blecsd';
 *
 * // Create a bold red attribute
 * let attr = createAttribute();
 * attr = attrCode([1, 31], attr);
 *
 * // Convert to SGR string
 * const sgr = codeAttr(attr);
 * // sgr = '\x1b[1;31m'
 *
 * // With color depth reduction
 * const sgrReduced = codeAttr(attr, { colorDepth: '16' });
 * ```
 */
export function codeAttr(attr: Attribute, options: CodeAttrOptions = {}): string {
	const depth = options.colorDepth ?? 'truecolor';
	const includeReset = options.includeReset ?? false;

	const codes: number[] = [];

	// Optionally include reset
	if (includeReset) {
		codes.push(0);
	}

	// Add style codes
	codes.push(...stylesToSgrCodes(attr.styles));

	// Add foreground color (skip if default and no reset)
	if (attr.fg.type !== ColorType.DEFAULT || includeReset) {
		codes.push(...fgColorToSgrCodes(attr.fg, depth));
	}

	// Add background color (skip if default and no reset)
	if (attr.bg.type !== ColorType.DEFAULT || includeReset) {
		codes.push(...bgColorToSgrCodes(attr.bg, depth));
	}

	// Empty means no change needed
	if (codes.length === 0) {
		return '';
	}

	return `\x1b[${codes.join(';')}m`;
}

/**
 * Convert an attribute to SGR codes array.
 *
 * @param attr - Attribute to convert
 * @param options - Conversion options
 * @returns Array of SGR code numbers
 *
 * @example
 * ```typescript
 * const codes = attrToSgrCodes(attr);
 * // [1, 31] for bold red
 * ```
 */
export function attrToSgrCodes(attr: Attribute, options: CodeAttrOptions = {}): number[] {
	const depth = options.colorDepth ?? 'truecolor';
	const includeReset = options.includeReset ?? false;

	const codes: number[] = [];

	if (includeReset) {
		codes.push(0);
	}

	codes.push(...stylesToSgrCodes(attr.styles));

	if (attr.fg.type !== ColorType.DEFAULT || includeReset) {
		codes.push(...fgColorToSgrCodes(attr.fg, depth));
	}

	if (attr.bg.type !== ColorType.DEFAULT || includeReset) {
		codes.push(...bgColorToSgrCodes(attr.bg, depth));
	}

	return codes;
}

/**
 * Get the SGR reset sequence.
 *
 * @returns Reset SGR sequence
 */
export function sgrReset(): string {
	return '\x1b[0m';
}

// =============================================================================
// ATTRIBUTE HELPERS
// =============================================================================

/**
 * Check if an attribute has a specific style.
 *
 * @param attr - Attribute to check
 * @param style - Style flag from TextStyle
 * @returns true if style is set
 *
 * @example
 * ```typescript
 * const attr = attrCode(1, createAttribute()); // bold
 * hasStyle(attr, TextStyle.BOLD); // true
 * hasStyle(attr, TextStyle.ITALIC); // false
 * ```
 */
export function hasStyle(attr: Attribute, style: number): boolean {
	return (attr.styles & style) !== 0;
}

/**
 * Check if two attributes are equal.
 *
 * @param a - First attribute
 * @param b - Second attribute
 * @returns true if attributes are equal
 */
export function attributesEqual(a: Attribute, b: Attribute): boolean {
	return (
		a.fg.type === b.fg.type &&
		a.fg.value === b.fg.value &&
		a.bg.type === b.bg.type &&
		a.bg.value === b.bg.value &&
		a.styles === b.styles
	);
}

/**
 * Unpack RGB value to components.
 *
 * @param packed - Packed RGB value (0xRRGGBB)
 * @returns RGB components
 */
export function unpackRgb(packed: number): { r: number; g: number; b: number } {
	return {
		r: (packed >> 16) & 0xff,
		g: (packed >> 8) & 0xff,
		b: packed & 0xff,
	};
}

/**
 * Pack RGB components into a single value.
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Packed RGB value
 */
export function packRgb(r: number, g: number, b: number): number {
	return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

// =============================================================================
// STRIP ANSI
// =============================================================================

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional for ANSI parsing
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * Strip all ANSI escape sequences from a string.
 *
 * @param input - String with ANSI sequences
 * @returns String without ANSI sequences
 *
 * @example
 * ```typescript
 * stripAnsi('\x1b[1;31mHello\x1b[0m');
 * // 'Hello'
 * ```
 */
export function stripAnsi(input: string): string {
	return input.replace(ANSI_REGEX, '');
}

/**
 * Get the visible length of a string (excluding ANSI sequences).
 *
 * @param input - String with possible ANSI sequences
 * @returns Length of visible characters
 */
export function visibleLength(input: string): number {
	return stripAnsi(input).length;
}
