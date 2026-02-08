/**
 * ANSI cursor control functions.
 *
 * Provides functions for cursor movement, positioning, visibility,
 * shape, and color control. All functions return ANSI escape sequences
 * as strings with no side effects.
 *
 * @module terminal/ansi/cursor
 * @internal This module is internal and not exported from the main package.
 */

import { BEL, CSI, ESC, OSC } from './constants';

// =============================================================================
// CURSOR NAMESPACE
// =============================================================================

/**
 * Cursor control functions.
 * All functions return ANSI escape sequences as strings.
 */
export const cursor = {
	/**
	 * Move cursor to absolute position (1-indexed).
	 *
	 * @param x - Column (1-indexed)
	 * @param y - Row (1-indexed)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.move(10, 5) // Move to column 10, row 5
	 * // Returns: '\x1b[5;10H'
	 * ```
	 */
	move(x: number, y: number): string {
		return `${CSI}${y};${x}H`;
	},

	/**
	 * Move cursor to column (1-indexed) on current row.
	 *
	 * @param x - Column (1-indexed)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.column(1) // Move to column 1
	 * // Returns: '\x1b[1G'
	 * ```
	 */
	column(x: number): string {
		return `${CSI}${x}G`;
	},

	/**
	 * Move cursor up n rows.
	 *
	 * @param n - Number of rows (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.up(3) // Move up 3 rows
	 * // Returns: '\x1b[3A'
	 * ```
	 */
	up(n = 1): string {
		return `${CSI}${n}A`;
	},

	/**
	 * Move cursor down n rows.
	 *
	 * @param n - Number of rows (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.down(2) // Move down 2 rows
	 * // Returns: '\x1b[2B'
	 * ```
	 */
	down(n = 1): string {
		return `${CSI}${n}B`;
	},

	/**
	 * Move cursor forward (right) n columns.
	 *
	 * @param n - Number of columns (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.forward(5) // Move right 5 columns
	 * // Returns: '\x1b[5C'
	 * ```
	 */
	forward(n = 1): string {
		return `${CSI}${n}C`;
	},

	/**
	 * Move cursor back (left) n columns.
	 *
	 * @param n - Number of columns (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.back(3) // Move left 3 columns
	 * // Returns: '\x1b[3D'
	 * ```
	 */
	back(n = 1): string {
		return `${CSI}${n}D`;
	},

	/**
	 * Move cursor to beginning of line n lines down.
	 *
	 * @param n - Number of lines (default: 1)
	 * @returns ANSI escape sequence
	 */
	nextLine(n = 1): string {
		return `${CSI}${n}E`;
	},

	/**
	 * Move cursor to beginning of line n lines up.
	 *
	 * @param n - Number of lines (default: 1)
	 * @returns ANSI escape sequence
	 */
	prevLine(n = 1): string {
		return `${CSI}${n}F`;
	},

	/**
	 * Save cursor position (DEC private mode).
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.save() // Save current position
	 * // Returns: '\x1b[s'
	 * ```
	 */
	save(): string {
		return `${CSI}s`;
	},

	/**
	 * Restore cursor position (DEC private mode).
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.restore() // Restore saved position
	 * // Returns: '\x1b[u'
	 * ```
	 */
	restore(): string {
		return `${CSI}u`;
	},

	/**
	 * Show cursor (make visible).
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.show() // Make cursor visible
	 * // Returns: '\x1b[?25h'
	 * ```
	 */
	show(): string {
		return `${CSI}?25h`;
	},

	/**
	 * Hide cursor (make invisible).
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.hide() // Make cursor invisible
	 * // Returns: '\x1b[?25l'
	 * ```
	 */
	hide(): string {
		return `${CSI}?25l`;
	},

	/**
	 * Request cursor position report.
	 * Terminal responds with CSI row ; col R
	 *
	 * @returns ANSI escape sequence
	 */
	requestPosition(): string {
		return `${CSI}6n`;
	},

	/**
	 * Move cursor to home position (1,1).
	 *
	 * @returns ANSI escape sequence
	 */
	home(): string {
		return `${CSI}H`;
	},

	/**
	 * Set cursor shape.
	 *
	 * Shapes:
	 * - 0: Default (usually block)
	 * - 1: Blinking block
	 * - 2: Steady block
	 * - 3: Blinking underline
	 * - 4: Steady underline
	 * - 5: Blinking bar (xterm)
	 * - 6: Steady bar (xterm)
	 *
	 * @param shape - Cursor shape (0-6)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.setShape(CursorShape.STEADY_BAR) // Steady bar cursor
	 * // Returns: '\x1b[6 q'
	 * ```
	 */
	setShape(shape: number): string {
		return `${CSI}${shape} q`;
	},

	/**
	 * Set cursor to blinking block.
	 *
	 * @returns ANSI escape sequence
	 */
	blinkingBlock(): string {
		return `${CSI}1 q`;
	},

	/**
	 * Set cursor to steady (non-blinking) block.
	 *
	 * @returns ANSI escape sequence
	 */
	steadyBlock(): string {
		return `${CSI}2 q`;
	},

	/**
	 * Set cursor to blinking underline.
	 *
	 * @returns ANSI escape sequence
	 */
	blinkingUnderline(): string {
		return `${CSI}3 q`;
	},

	/**
	 * Set cursor to steady (non-blinking) underline.
	 *
	 * @returns ANSI escape sequence
	 */
	steadyUnderline(): string {
		return `${CSI}4 q`;
	},

	/**
	 * Set cursor to blinking bar (I-beam).
	 *
	 * @returns ANSI escape sequence
	 */
	blinkingBar(): string {
		return `${CSI}5 q`;
	},

	/**
	 * Set cursor to steady (non-blinking) bar (I-beam).
	 *
	 * @returns ANSI escape sequence
	 */
	steadyBar(): string {
		return `${CSI}6 q`;
	},

	/**
	 * Reset cursor shape to default.
	 *
	 * @returns ANSI escape sequence
	 */
	resetShape(): string {
		return `${CSI}0 q`;
	},

	/**
	 * Set cursor color (xterm extension).
	 * Uses OSC 12 to set cursor foreground color.
	 *
	 * @param color - Color as hex string (#RRGGBB) or color name
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * cursor.setColor('#ff0000') // Red cursor
	 * cursor.setColor('green')   // Green cursor
	 * ```
	 */
	setColor(color: string): string {
		return `${OSC}12;${color}${BEL}`;
	},

	/**
	 * Reset cursor color to default.
	 *
	 * @returns ANSI escape sequence
	 */
	resetColor(): string {
		return `${OSC}112${BEL}`;
	},

	/**
	 * Save cursor style (DECSCUSR save - not widely supported).
	 * Use cursor.save() for position, this saves shape/blink state.
	 *
	 * @returns ANSI escape sequence
	 */
	saveStyle(): string {
		return `${ESC}[s`;
	},

	/**
	 * Restore cursor style (DECSCUSR restore - not widely supported).
	 *
	 * @returns ANSI escape sequence
	 */
	restoreStyle(): string {
		return `${ESC}[u`;
	},
} as const;

/**
 * Cursor shape constants for use with cursor.setShape()
 */
export const CursorShape = {
	/** Default cursor (terminal-dependent) */
	DEFAULT: 0,
	/** Blinking block cursor */
	BLINKING_BLOCK: 1,
	/** Steady (non-blinking) block cursor */
	STEADY_BLOCK: 2,
	/** Blinking underline cursor */
	BLINKING_UNDERLINE: 3,
	/** Steady (non-blinking) underline cursor */
	STEADY_UNDERLINE: 4,
	/** Blinking bar (I-beam) cursor */
	BLINKING_BAR: 5,
	/** Steady (non-blinking) bar (I-beam) cursor */
	STEADY_BAR: 6,
} as const;

export type CursorShapeType = (typeof CursorShape)[keyof typeof CursorShape];
