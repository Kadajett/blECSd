/**
 * ANSI text styling, screen control, and title functions.
 *
 * Provides functions for:
 * - Text styles (bold, italic, underline, etc.)
 * - Foreground and background colors
 * - Screen clearing and scrolling
 * - Window titles
 *
 * @module terminal/ansi/text
 * @internal This module is internal and not exported from the main package.
 */

import {
	basicBgColors,
	basicFgColors,
	type Color,
	isBasicColor,
	isRGBColor,
	SGR,
	sgr,
} from './colors';
import { BEL, CSI, OSC } from './constants';

// =============================================================================
// STYLE NAMESPACE
// =============================================================================

/**
 * Text style and color functions.
 * All functions return ANSI SGR (Select Graphic Rendition) sequences.
 */
export const style = {
	/**
	 * Reset all text attributes to default.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.reset() // Reset all styles
	 * // Returns: '\x1b[0m'
	 * ```
	 */
	reset(): string {
		return sgr(SGR.RESET);
	},

	/**
	 * Enable bold text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.bold() // Enable bold
	 * // Returns: '\x1b[1m'
	 * ```
	 */
	bold(): string {
		return sgr(SGR.BOLD);
	},

	/**
	 * Enable dim/faint text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.dim() // Enable dim
	 * // Returns: '\x1b[2m'
	 * ```
	 */
	dim(): string {
		return sgr(SGR.DIM);
	},

	/**
	 * Enable italic text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.italic() // Enable italic
	 * // Returns: '\x1b[3m'
	 * ```
	 */
	italic(): string {
		return sgr(SGR.ITALIC);
	},

	/**
	 * Enable underlined text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.underline() // Enable underline
	 * // Returns: '\x1b[4m'
	 * ```
	 */
	underline(): string {
		return sgr(SGR.UNDERLINE);
	},

	/**
	 * Enable blinking text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.blink() // Enable blink
	 * // Returns: '\x1b[5m'
	 * ```
	 */
	blink(): string {
		return sgr(SGR.BLINK);
	},

	/**
	 * Enable inverse/reverse video.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.inverse() // Enable inverse
	 * // Returns: '\x1b[7m'
	 * ```
	 */
	inverse(): string {
		return sgr(SGR.INVERSE);
	},

	/**
	 * Enable hidden/invisible text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.hidden() // Enable hidden
	 * // Returns: '\x1b[8m'
	 * ```
	 */
	hidden(): string {
		return sgr(SGR.HIDDEN);
	},

	/**
	 * Enable strikethrough text.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.strikethrough() // Enable strikethrough
	 * // Returns: '\x1b[9m'
	 * ```
	 */
	strikethrough(): string {
		return sgr(SGR.STRIKETHROUGH);
	},

	/**
	 * Set foreground (text) color.
	 *
	 * Supports:
	 * - Basic colors: 'red', 'brightBlue', etc.
	 * - 256 colors: number 0-255
	 * - RGB: { r: 255, g: 128, b: 0 }
	 *
	 * @param color - Color value
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.fg('red')           // Basic red
	 * style.fg(196)             // 256-color red
	 * style.fg({ r: 255, g: 0, b: 0 }) // RGB red
	 * ```
	 */
	fg(color: Color): string {
		if (isBasicColor(color)) {
			return sgr(basicFgColors[color]);
		}
		if (isRGBColor(color)) {
			return sgr(SGR.FG_256, 2, color.r, color.g, color.b);
		}
		// 256 color
		return sgr(SGR.FG_256, 5, color);
	},

	/**
	 * Set background color.
	 *
	 * Supports:
	 * - Basic colors: 'red', 'brightBlue', etc.
	 * - 256 colors: number 0-255
	 * - RGB: { r: 255, g: 128, b: 0 }
	 *
	 * @param color - Color value
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.bg('blue')          // Basic blue
	 * style.bg(21)              // 256-color blue
	 * style.bg({ r: 0, g: 0, b: 255 }) // RGB blue
	 * ```
	 */
	bg(color: Color): string {
		if (isBasicColor(color)) {
			return sgr(basicBgColors[color]);
		}
		if (isRGBColor(color)) {
			return sgr(SGR.BG_256, 2, color.r, color.g, color.b);
		}
		// 256 color
		return sgr(SGR.BG_256, 5, color);
	},

	/**
	 * Combine multiple style codes into a single sequence.
	 *
	 * @param codes - SGR codes to combine
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * style.combine(SGR.BOLD, SGR.FG_RED, SGR.BG_WHITE)
	 * // Returns: '\x1b[1;31;47m'
	 * ```
	 */
	combine(...codes: number[]): string {
		return sgr(...codes);
	},
} as const;

// =============================================================================
// SCREEN NAMESPACE
// =============================================================================

/**
 * Screen and display control functions.
 */
export const screen = {
	/**
	 * Clear entire screen.
	 *
	 * @returns ANSI escape sequence
	 */
	clear(): string {
		return `${CSI}2J`;
	},

	/**
	 * Clear from cursor to end of screen.
	 *
	 * @returns ANSI escape sequence
	 */
	clearDown(): string {
		return `${CSI}J`;
	},

	/**
	 * Clear from cursor to beginning of screen.
	 *
	 * @returns ANSI escape sequence
	 */
	clearUp(): string {
		return `${CSI}1J`;
	},

	/**
	 * Clear entire line.
	 *
	 * @returns ANSI escape sequence
	 */
	clearLine(): string {
		return `${CSI}2K`;
	},

	/**
	 * Clear from cursor to end of line.
	 *
	 * @returns ANSI escape sequence
	 */
	clearLineRight(): string {
		return `${CSI}K`;
	},

	/**
	 * Clear from cursor to beginning of line.
	 *
	 * @returns ANSI escape sequence
	 */
	clearLineLeft(): string {
		return `${CSI}1K`;
	},

	/**
	 * Erase n characters starting at cursor position.
	 * Characters are erased (replaced with spaces), cursor does not move.
	 *
	 * @param n - Number of characters to erase (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * screen.eraseChars(5) // Erase 5 characters
	 * // Returns: '\x1b[5X'
	 * ```
	 */
	eraseChars(n = 1): string {
		return `${CSI}${n}X`;
	},

	/**
	 * Enable alternate screen buffer (smcup).
	 * Saves the current screen content and switches to alternate buffer.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * screen.alternateOn() // Enter alternate screen
	 * // Returns: '\x1b[?1049h'
	 * ```
	 */
	alternateOn(): string {
		return `${CSI}?1049h`;
	},

	/**
	 * Alias for alternateOn (smcup terminology).
	 *
	 * @returns ANSI escape sequence
	 */
	enterAlt(): string {
		return `${CSI}?1049h`;
	},

	/**
	 * Disable alternate screen buffer (rmcup).
	 * Restores the previously saved screen content.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * screen.alternateOff() // Exit alternate screen
	 * // Returns: '\x1b[?1049l'
	 * ```
	 */
	alternateOff(): string {
		return `${CSI}?1049l`;
	},

	/**
	 * Alias for alternateOff (rmcup terminology).
	 *
	 * @returns ANSI escape sequence
	 */
	exitAlt(): string {
		return `${CSI}?1049l`;
	},

	/**
	 * Scroll screen up n lines.
	 *
	 * @param n - Number of lines (default: 1)
	 * @returns ANSI escape sequence
	 */
	scrollUp(n = 1): string {
		return `${CSI}${n}S`;
	},

	/**
	 * Scroll screen down n lines.
	 *
	 * @param n - Number of lines (default: 1)
	 * @returns ANSI escape sequence
	 */
	scrollDown(n = 1): string {
		return `${CSI}${n}T`;
	},

	/**
	 * Set scrolling region.
	 *
	 * @param top - Top row (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @returns ANSI escape sequence
	 */
	setScrollRegion(top: number, bottom: number): string {
		return `${CSI}${top};${bottom}r`;
	},

	/**
	 * Reset scrolling region to full screen.
	 *
	 * @returns ANSI escape sequence
	 */
	resetScrollRegion(): string {
		return `${CSI}r`;
	},
} as const;

// =============================================================================
// TITLE NAMESPACE
// =============================================================================

/**
 * Window title and icon functions.
 */
export const title = {
	/**
	 * Set window title.
	 *
	 * @param text - Title text
	 * @returns ANSI escape sequence
	 */
	set(text: string): string {
		return `${OSC}2;${text}${BEL}`;
	},

	/**
	 * Set icon name.
	 *
	 * @param text - Icon name
	 * @returns ANSI escape sequence
	 */
	setIcon(text: string): string {
		return `${OSC}1;${text}${BEL}`;
	},

	/**
	 * Set both window title and icon name.
	 *
	 * @param text - Title/icon text
	 * @returns ANSI escape sequence
	 */
	setBoth(text: string): string {
		return `${OSC}0;${text}${BEL}`;
	},
} as const;
