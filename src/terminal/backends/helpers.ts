/**
 * Shared Terminal Backend Helpers
 *
 * Common utility functions used by ANSI and Kitty render backends.
 * Extracted from duplicated code to maintain DRY principles.
 *
 * @module terminal/backends/helpers
 */

import { Attr } from '../screen/cell';

// =============================================================================
// CONSTANTS
// =============================================================================

export const CSI = '\x1b[';

export const SGR = {
	RESET: 0,
	BOLD: 1,
	DIM: 2,
	ITALIC: 3,
	UNDERLINE: 4,
	BLINK: 5,
	INVERSE: 7,
	HIDDEN: 8,
	STRIKETHROUGH: 9,
	FG_256: 38,
	BG_256: 48,
} as const;

// =============================================================================
// RENDER STATE
// =============================================================================

export interface RenderState {
	lastX: number;
	lastY: number;
	lastFg: number;
	lastBg: number;
	lastAttrs: number;
}

export function createRenderState(): RenderState {
	return { lastX: -1, lastY: -1, lastFg: -1, lastBg: -1, lastAttrs: -1 };
}

// =============================================================================
// ANSI SEQUENCE HELPERS
// =============================================================================

/**
 * Generates an SGR (Select Graphic Rendition) escape sequence.
 *
 * @param codes - SGR codes to apply
 * @returns ANSI escape sequence string
 *
 * @example
 * ```typescript
 * sgr(1); // '\x1b[1m' (bold)
 * sgr(38, 2, 255, 0, 0); // '\x1b[38;2;255;0;0m' (truecolor fg red)
 * ```
 */
export function sgr(...codes: number[]): string {
	return `${CSI}${codes.join(';')}m`;
}

/**
 * Generates a cursor move escape sequence.
 *
 * @param x - Column (0-indexed)
 * @param y - Row (0-indexed)
 * @returns ANSI escape sequence to move cursor to (x, y)
 *
 * @example
 * ```typescript
 * moveCursor(5, 3); // '\x1b[4;6H' (move to row 4, col 6 in 1-indexed coords)
 * ```
 */
export function moveCursor(x: number, y: number): string {
	return `${CSI}${y + 1};${x + 1}H`;
}

/**
 * Generates a column move escape sequence.
 *
 * @param x - Column (0-indexed)
 * @returns ANSI escape sequence to move cursor to column x
 *
 * @example
 * ```typescript
 * moveColumn(10); // '\x1b[11G' (move to column 11 in 1-indexed coords)
 * ```
 */
export function moveColumn(x: number): string {
	return `${CSI}${x + 1}G`;
}

/**
 * Generates a cursor forward escape sequence.
 *
 * @param n - Number of columns to move forward
 * @returns ANSI escape sequence to move cursor forward n columns
 *
 * @example
 * ```typescript
 * cursorForward(1); // '\x1b[C' (move forward 1 column)
 * cursorForward(5); // '\x1b[5C' (move forward 5 columns)
 * ```
 */
export function cursorForward(n: number): string {
	if (n === 1) return `${CSI}C`;
	return `${CSI}${n}C`;
}

/**
 * Unpacks a packed RGBA color into components.
 *
 * Color format: 0xAARRGGBB (alpha, red, green, blue)
 *
 * @param color - Packed 32-bit RGBA color
 * @returns Object with r, g, b, a components (0-255)
 *
 * @example
 * ```typescript
 * unpackColor(0xFFFF0000); // { r: 255, g: 0, b: 0, a: 255 }
 * unpackColor(0x80FF8080); // { r: 255, g: 128, b: 128, a: 128 }
 * ```
 */
export function unpackColor(color: number): { r: number; g: number; b: number; a: number } {
	return {
		a: (color >>> 24) & 0xff,
		r: (color >>> 16) & 0xff,
		g: (color >>> 8) & 0xff,
		b: color & 0xff,
	};
}

/**
 * Generates a foreground color escape sequence.
 *
 * @param color - Packed RGBA color (0xAARRGGBB)
 * @returns ANSI truecolor foreground sequence, or default fg if alpha is 0
 *
 * @example
 * ```typescript
 * fgColor(0xFFFF0000); // '\x1b[38;2;255;0;0m' (red foreground)
 * fgColor(0x00000000); // '\x1b[39m' (default foreground)
 * ```
 */
export function fgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) return sgr(39); // Default fg
	return sgr(SGR.FG_256, 2, r, g, b);
}

/**
 * Generates a background color escape sequence.
 *
 * @param color - Packed RGBA color (0xAARRGGBB)
 * @returns ANSI truecolor background sequence, or default bg if alpha is 0
 *
 * @example
 * ```typescript
 * bgColor(0xFF0000FF); // '\x1b[48;2;0;0;255m' (blue background)
 * bgColor(0x00000000); // '\x1b[49m' (default background)
 * ```
 */
export function bgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) return sgr(49); // Default bg
	return sgr(SGR.BG_256, 2, r, g, b);
}

/**
 * Generates an attributes escape sequence.
 *
 * @param attrs - Bitfield of text attributes (bold, italic, etc.)
 * @returns ANSI SGR sequence for all set attributes, or empty string if none
 *
 * @example
 * ```typescript
 * attrsSequence(Attr.BOLD); // '\x1b[1m'
 * attrsSequence(Attr.BOLD | Attr.ITALIC); // '\x1b[1;3m'
 * attrsSequence(Attr.NONE); // ''
 * ```
 */
export function attrsSequence(attrs: number): string {
	const codes: number[] = [];
	if (attrs === Attr.NONE) return '';

	if (attrs & Attr.BOLD) codes.push(SGR.BOLD);
	if (attrs & Attr.DIM) codes.push(SGR.DIM);
	if (attrs & Attr.ITALIC) codes.push(SGR.ITALIC);
	if (attrs & Attr.UNDERLINE) codes.push(SGR.UNDERLINE);
	if (attrs & Attr.BLINK) codes.push(SGR.BLINK);
	if (attrs & Attr.INVERSE) codes.push(SGR.INVERSE);
	if (attrs & Attr.HIDDEN) codes.push(SGR.HIDDEN);
	if (attrs & Attr.STRIKETHROUGH) codes.push(SGR.STRIKETHROUGH);

	if (codes.length === 0) return '';
	return sgr(...codes);
}

// =============================================================================
// CURSOR MOVEMENT OPTIMIZATION
// =============================================================================

/**
 * Generates optimal cursor movement sequence.
 *
 * @param state - Current render state
 * @param x - Target column (0-indexed)
 * @param y - Target row (0-indexed)
 * @returns Optimized ANSI cursor movement sequence
 *
 * @internal
 */
export function generateCursorMove(state: RenderState, x: number, y: number): string {
	if (state.lastX === x && state.lastY === y) return '';

	if (state.lastY === y) {
		const diff = x - state.lastX;
		if (diff === 1) return ''; // Implicit advance
		if (diff > 0 && diff <= 4) return cursorForward(diff);
		return moveColumn(x);
	}

	return moveCursor(x, y);
}

/**
 * Generates style change sequences.
 *
 * @param state - Current render state (mutated)
 * @param fg - Foreground color
 * @param bg - Background color
 * @param attrs - Text attributes bitfield
 * @returns ANSI escape sequences for style changes
 *
 * @internal
 */
export function generateStyleChanges(
	state: RenderState,
	fg: number,
	bg: number,
	attrs: number,
): string {
	let output = '';

	// Handle attribute changes with reset if needed
	const needsReset = state.lastAttrs !== -1 && state.lastAttrs !== Attr.NONE && attrs === Attr.NONE;

	if (needsReset) {
		output += sgr(SGR.RESET);
		state.lastFg = -1;
		state.lastBg = -1;
		state.lastAttrs = -1;
	}

	if (attrs !== state.lastAttrs && attrs !== Attr.NONE) {
		if (state.lastAttrs !== -1 && state.lastAttrs !== Attr.NONE) {
			output += sgr(SGR.RESET);
			state.lastFg = -1;
			state.lastBg = -1;
		}
		output += attrsSequence(attrs);
		state.lastAttrs = attrs;
	} else if (attrs === Attr.NONE && state.lastAttrs === -1) {
		state.lastAttrs = Attr.NONE;
	}

	// Foreground color
	if (fg !== state.lastFg) {
		output += fgColor(fg);
		state.lastFg = fg;
	}

	// Background color
	if (bg !== state.lastBg) {
		output += bgColor(bg);
		state.lastBg = bg;
	}

	return output;
}
