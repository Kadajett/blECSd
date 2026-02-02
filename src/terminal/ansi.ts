/**
 * ANSI Escape Code Generator
 *
 * Pure functions for generating ANSI escape sequences.
 * All functions return strings with no side effects.
 *
 * @module terminal/ansi
 * @internal This module is internal and not exported from the main package.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Control Sequence Introducer - starts most ANSI sequences */
export const CSI = '\x1b[';

/** Operating System Command - used for terminal titles, clipboard, etc. */
export const OSC = '\x1b]';

/** Device Control String - used for terminal-specific commands */
export const DCS = '\x1bP';

/** String Terminator - ends OSC and DCS sequences */
export const ST = '\x1b\\';

/** Bell character - alternative string terminator for OSC */
export const BEL = '\x07';

/** Escape character */
export const ESC = '\x1b';

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

const basicFgColors: Record<BasicColor, number> = {
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

const basicBgColors: Record<BasicColor, number> = {
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

function isRGBColor(color: Color): color is RGBColor {
	return typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color;
}

function isBasicColor(color: Color): color is BasicColor {
	return typeof color === 'string';
}

/**
 * Generate SGR (Select Graphic Rendition) sequence
 */
function sgr(...codes: number[]): string {
	return `${CSI}${codes.join(';')}m`;
}

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

// =============================================================================
// MOUSE NAMESPACE
// =============================================================================

/**
 * Mouse protocol mode constants
 */
export const MouseMode = {
	/** X10 mouse reporting (button press only) */
	X10: 9,
	/** Normal tracking mode (button press and release) */
	NORMAL: 1000,
	/** Highlight tracking mode */
	HIGHLIGHT: 1001,
	/** Button-event tracking (press, release, motion with button) */
	BUTTON_EVENT: 1002,
	/** Any-event tracking (all motion) */
	ANY_EVENT: 1003,
	/** Focus tracking (focus in/out events) */
	FOCUS: 1004,
	/** UTF-8 extended coordinates */
	UTF8: 1005,
	/** SGR extended coordinates (recommended) */
	SGR: 1006,
	/** URXVT extended coordinates */
	URXVT: 1015,
	/** SGR-Pixels mode (pixel coordinates) */
	SGR_PIXELS: 1016,
} as const;

/**
 * Mouse tracking functions.
 * All functions return ANSI escape sequences as strings.
 *
 * Mouse protocols from oldest to newest:
 * - X10: Basic, button press only, limited coordinates
 * - Normal (1000): Press and release, limited coordinates
 * - SGR (1006): Extended coordinates, most compatible modern option
 * - URXVT (1015): Extended coordinates, less common
 *
 * @example
 * ```typescript
 * // Enable SGR mouse tracking (recommended)
 * process.stdout.write(mouse.enableSGR());
 * process.stdout.write(mouse.enableAnyEvent());
 *
 * // Disable all mouse tracking
 * process.stdout.write(mouse.disableAll());
 * ```
 */
export const mouse = {
	/**
	 * Enable X10 mouse reporting (button press only).
	 * This is the most basic and widely supported mode.
	 * Only reports button presses, not releases.
	 * Limited to coordinates 0-222.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableX10() // Returns: '\x1b[?9h'
	 * ```
	 */
	enableX10(): string {
		return `${CSI}?${MouseMode.X10}h`;
	},

	/**
	 * Disable X10 mouse reporting.
	 *
	 * @returns ANSI escape sequence
	 */
	disableX10(): string {
		return `${CSI}?${MouseMode.X10}l`;
	},

	/**
	 * Enable normal tracking mode (VT200).
	 * Reports button press and release events.
	 * Limited to coordinates 0-222.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableNormal() // Returns: '\x1b[?1000h'
	 * ```
	 */
	enableNormal(): string {
		return `${CSI}?${MouseMode.NORMAL}h`;
	},

	/**
	 * Disable normal tracking mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableNormal(): string {
		return `${CSI}?${MouseMode.NORMAL}l`;
	},

	/**
	 * Enable button-event tracking mode.
	 * Reports press, release, and motion while button is pressed.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableButtonEvent() // Returns: '\x1b[?1002h'
	 * ```
	 */
	enableButtonEvent(): string {
		return `${CSI}?${MouseMode.BUTTON_EVENT}h`;
	},

	/**
	 * Disable button-event tracking mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableButtonEvent(): string {
		return `${CSI}?${MouseMode.BUTTON_EVENT}l`;
	},

	/**
	 * Enable any-event tracking mode.
	 * Reports all mouse motion, not just when buttons are pressed.
	 * Use with caution as it generates many events.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableAnyEvent() // Returns: '\x1b[?1003h'
	 * ```
	 */
	enableAnyEvent(): string {
		return `${CSI}?${MouseMode.ANY_EVENT}h`;
	},

	/**
	 * Disable any-event tracking mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableAnyEvent(): string {
		return `${CSI}?${MouseMode.ANY_EVENT}l`;
	},

	/**
	 * Enable focus tracking.
	 * Reports when terminal gains or loses focus.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableFocus() // Returns: '\x1b[?1004h'
	 * ```
	 */
	enableFocus(): string {
		return `${CSI}?${MouseMode.FOCUS}h`;
	},

	/**
	 * Disable focus tracking.
	 *
	 * @returns ANSI escape sequence
	 */
	disableFocus(): string {
		return `${CSI}?${MouseMode.FOCUS}l`;
	},

	/**
	 * Enable SGR extended mouse mode.
	 * This is the recommended modern mouse protocol.
	 * - Supports coordinates > 222
	 * - Uses decimal encoding (more readable)
	 * - Reports button state in final character
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableSGR() // Returns: '\x1b[?1006h'
	 * ```
	 */
	enableSGR(): string {
		return `${CSI}?${MouseMode.SGR}h`;
	},

	/**
	 * Disable SGR extended mouse mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableSGR(): string {
		return `${CSI}?${MouseMode.SGR}l`;
	},

	/**
	 * Enable URXVT extended mouse mode.
	 * Alternative to SGR for extended coordinates.
	 * Less commonly supported than SGR.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableURXVT() // Returns: '\x1b[?1015h'
	 * ```
	 */
	enableURXVT(): string {
		return `${CSI}?${MouseMode.URXVT}h`;
	},

	/**
	 * Disable URXVT extended mouse mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableURXVT(): string {
		return `${CSI}?${MouseMode.URXVT}l`;
	},

	/**
	 * Enable UTF-8 extended mouse mode.
	 * Legacy extended coordinate mode, rarely needed.
	 *
	 * @returns ANSI escape sequence
	 */
	enableUTF8(): string {
		return `${CSI}?${MouseMode.UTF8}h`;
	},

	/**
	 * Disable UTF-8 extended mouse mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableUTF8(): string {
		return `${CSI}?${MouseMode.UTF8}l`;
	},

	/**
	 * Disable all mouse tracking modes.
	 * Sends disable sequences for all mouse modes.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.disableAll() // Disables X10, Normal, Button, Any, Focus, SGR, URXVT
	 * ```
	 */
	disableAll(): string {
		return [
			`${CSI}?${MouseMode.X10}l`,
			`${CSI}?${MouseMode.NORMAL}l`,
			`${CSI}?${MouseMode.BUTTON_EVENT}l`,
			`${CSI}?${MouseMode.ANY_EVENT}l`,
			`${CSI}?${MouseMode.FOCUS}l`,
			`${CSI}?${MouseMode.UTF8}l`,
			`${CSI}?${MouseMode.SGR}l`,
			`${CSI}?${MouseMode.URXVT}l`,
		].join('');
	},

	/**
	 * Enable recommended mouse tracking.
	 * Enables SGR mode with any-event tracking.
	 * This is the best default for modern terminals.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(mouse.enableRecommended());
	 * ```
	 */
	enableRecommended(): string {
		return `${CSI}?${MouseMode.SGR}h${CSI}?${MouseMode.ANY_EVENT}h`;
	},
} as const;

// =============================================================================
// SYNCHRONIZED OUTPUT NAMESPACE
// =============================================================================

/**
 * Synchronized output mode (DEC private mode 2026).
 *
 * Prevents screen tearing and flicker during rapid updates by
 * buffering output until the end marker is received. Essential
 * for smooth 60fps game rendering.
 *
 * Supported terminals: kitty, foot, contour, WezTerm, iTerm2 (3.5+),
 * mintty (3.6+), and others implementing DEC 2026.
 *
 * @example
 * ```typescript
 * // Manual usage
 * process.stdout.write(sync.begin());
 * // ... render frame ...
 * process.stdout.write(sync.end());
 *
 * // Or use wrap for convenience
 * process.stdout.write(sync.wrap(frameContent));
 * ```
 */
export const sync = {
	/**
	 * Begin synchronized output mode.
	 * Terminal buffers all output until end() is called.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * sync.begin() // Returns: '\x1b[?2026h'
	 * ```
	 */
	begin(): string {
		return `${CSI}?2026h`;
	},

	/**
	 * End synchronized output mode.
	 * Terminal flushes buffered output to screen.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * sync.end() // Returns: '\x1b[?2026l'
	 * ```
	 */
	end(): string {
		return `${CSI}?2026l`;
	},

	/**
	 * Wrap content in synchronized output markers.
	 * Convenience function for single-frame rendering.
	 *
	 * @param content - Content to wrap
	 * @returns Content wrapped in sync begin/end markers
	 *
	 * @example
	 * ```typescript
	 * const frame = renderFrame();
	 * process.stdout.write(sync.wrap(frame));
	 * ```
	 */
	wrap(content: string): string {
		return `${CSI}?2026h${content}${CSI}?2026l`;
	},
} as const;

// =============================================================================
// BRACKETED PASTE NAMESPACE
// =============================================================================

/**
 * Bracketed paste mode.
 *
 * When enabled, pasted text is wrapped in escape sequences allowing
 * the application to distinguish pasted text from typed text.
 *
 * @example
 * ```typescript
 * // Enable bracketed paste
 * process.stdout.write(bracketedPaste.enable());
 *
 * // Pasted text will be wrapped as:
 * // ESC[200~ <pasted text> ESC[201~
 * ```
 */
export const bracketedPaste = {
	/**
	 * Enable bracketed paste mode.
	 *
	 * @returns ANSI escape sequence
	 */
	enable(): string {
		return `${CSI}?2004h`;
	},

	/**
	 * Disable bracketed paste mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disable(): string {
		return `${CSI}?2004l`;
	},

	/**
	 * Start marker for pasted content (sent by terminal).
	 */
	START_MARKER: `${CSI}200~`,

	/**
	 * End marker for pasted content (sent by terminal).
	 */
	END_MARKER: `${CSI}201~`,
} as const;

// =============================================================================
// CLIPBOARD NAMESPACE (OSC 52)
// =============================================================================

/**
 * Clipboard selection identifiers.
 * Used with OSC 52 clipboard operations.
 */
export const ClipboardSelection = {
	/** Primary clipboard (X11 PRIMARY, macOS pasteboard) */
	CLIPBOARD: 'c',
	/** Primary selection (X11 PRIMARY) */
	PRIMARY: 'p',
	/** Secondary selection (X11 SECONDARY) */
	SECONDARY: 's',
	/** Select (cut buffer 0) */
	SELECT: 's',
	/** Cut buffers 0-7 */
	CUT0: '0',
	CUT1: '1',
	CUT2: '2',
	CUT3: '3',
	CUT4: '4',
	CUT5: '5',
	CUT6: '6',
	CUT7: '7',
} as const;

export type ClipboardSelectionType = (typeof ClipboardSelection)[keyof typeof ClipboardSelection];

/**
 * Default maximum clipboard content size (1MB).
 * This limit helps prevent accidental data exfiltration.
 */
export const DEFAULT_CLIPBOARD_MAX_SIZE = 1024 * 1024;

/**
 * Clipboard operations using OSC 52.
 *
 * OSC 52 allows terminal applications to read and write the system clipboard.
 * This is a powerful feature that requires careful security consideration.
 *
 * **Security Warning:**
 * - Remote applications (over SSH) can read/write your local clipboard
 * - Consider disabling clipboard access in untrusted environments
 * - Many terminals disable OSC 52 by default for security
 *
 * **Terminal Support:**
 * - xterm (enabled via allowWindowOps)
 * - iTerm2 (enabled by default for write, disabled for read)
 * - kitty (enabled by default)
 * - foot (enabled by default)
 * - Windows Terminal (enabled by default)
 *
 * @example
 * ```typescript
 * // Write to clipboard
 * process.stdout.write(clipboard.write('Hello World'));
 *
 * // Request clipboard read (response via terminal input)
 * process.stdout.write(clipboard.requestRead());
 * ```
 */
export const clipboard = {
	/**
	 * Write text to clipboard.
	 *
	 * @param text - Text to write to clipboard
	 * @param selection - Clipboard selection (default: 'c' for system clipboard)
	 * @param maxSize - Maximum allowed size in bytes (default: 1MB)
	 * @returns OSC 52 write sequence, or empty string if text exceeds maxSize
	 *
	 * @example
	 * ```typescript
	 * // Write to system clipboard
	 * process.stdout.write(clipboard.write('Hello World'));
	 *
	 * // Write to primary selection (X11)
	 * process.stdout.write(clipboard.write('Selection', 'p'));
	 * ```
	 */
	write(
		text: string,
		selection: ClipboardSelectionType = ClipboardSelection.CLIPBOARD,
		maxSize: number = DEFAULT_CLIPBOARD_MAX_SIZE,
	): string {
		// Enforce size limit to prevent accidental data exfiltration
		const bytes = Buffer.byteLength(text, 'utf8');
		if (bytes > maxSize) {
			return '';
		}

		// Encode content as base64
		const encoded = Buffer.from(text, 'utf8').toString('base64');
		return `${OSC}52;${selection};${encoded}${ST}`;
	},

	/**
	 * Request clipboard read from terminal.
	 *
	 * The terminal will respond with the clipboard contents via input.
	 * Response format: OSC 52 ; selection ; base64-data ST
	 *
	 * @param selection - Clipboard selection to read (default: 'c')
	 * @returns OSC 52 read request sequence
	 *
	 * @example
	 * ```typescript
	 * // Request clipboard contents
	 * process.stdout.write(clipboard.requestRead());
	 * // Terminal responds via stdin with base64-encoded contents
	 * ```
	 */
	requestRead(selection: ClipboardSelectionType = ClipboardSelection.CLIPBOARD): string {
		return `${OSC}52;${selection};?${ST}`;
	},

	/**
	 * Clear clipboard contents.
	 *
	 * @param selection - Clipboard selection to clear (default: 'c')
	 * @returns OSC 52 clear sequence
	 *
	 * @example
	 * ```typescript
	 * // Clear system clipboard
	 * process.stdout.write(clipboard.clear());
	 * ```
	 */
	clear(selection: ClipboardSelectionType = ClipboardSelection.CLIPBOARD): string {
		// Empty base64 data clears the clipboard
		return `${OSC}52;${selection};${ST}`;
	},

	/**
	 * Decode clipboard response from terminal.
	 *
	 * @param response - Raw OSC 52 response from terminal
	 * @returns Decoded text, or null if invalid response
	 *
	 * @example
	 * ```typescript
	 * const text = clipboard.decodeResponse('\x1b]52;c;SGVsbG8=\x1b\\');
	 * // text = 'Hello'
	 * ```
	 */
	decodeResponse(response: string): string | null {
		// Match OSC 52 response format
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional for ANSI parsing
		const match = response.match(/\x1b\]52;([^;]+);([A-Za-z0-9+/=]*)\x1b\\/);
		if (!match) {
			return null;
		}

		const base64Data = match[2];
		if (!base64Data) {
			return '';
		}

		try {
			return Buffer.from(base64Data, 'base64').toString('utf8');
		} catch {
			return null;
		}
	},

	/**
	 * Check if a response is an OSC 52 clipboard response.
	 *
	 * @param response - Response string to check
	 * @returns true if response is an OSC 52 clipboard response
	 */
	isClipboardResponse(response: string): boolean {
		return response.startsWith('\x1b]52;');
	},
} as const;

// =============================================================================
// TMUX PASS-THROUGH
// =============================================================================

/**
 * Tmux pass-through escape sequence handling.
 *
 * When running inside tmux, some escape sequences need to be wrapped in
 * DCS (Device Control String) pass-through sequences to reach the underlying
 * terminal. This is necessary for sequences that tmux doesn't understand or
 * that need to be handled by the outer terminal.
 *
 * The pass-through format is:
 * - Start: DCS tmux;
 * - Content: Original sequence with all ESC doubled
 * - End: ST
 *
 * @example
 * ```typescript
 * import { tmux, title } from 'blecsd/terminal/ansi';
 *
 * // Wrap a title sequence for tmux pass-through
 * const titleSeq = title.set('My App');
 * const wrapped = tmux.wrap(titleSeq);
 *
 * // Or wrap multiple sequences together
 * const sequences = cursor.hide() + title.set('App');
 * const wrappedAll = tmux.wrap(sequences);
 * ```
 */
export const tmux = {
	/**
	 * The DCS introducer for tmux pass-through.
	 * Format: ESC P tmux;
	 */
	PT_START: `${DCS}tmux;`,

	/**
	 * Wrap an escape sequence for tmux pass-through.
	 *
	 * This function wraps the given escape sequence(s) in a DCS pass-through
	 * envelope, doubling any ESC characters in the content as required by tmux.
	 *
	 * @param sequence - The escape sequence(s) to wrap
	 * @returns The wrapped sequence for tmux pass-through
	 *
	 * @example
	 * ```typescript
	 * // Wrap a single sequence
	 * const wrapped = tmux.wrap('\x1b]0;Title\x07');
	 * // Returns: '\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\'
	 *
	 * // Wrap multiple sequences
	 * const wrapped = tmux.wrap(cursor.hide() + title.set('App'));
	 * ```
	 */
	wrap(sequence: string): string {
		// Double all ESC characters in the sequence
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
		const doubled = sequence.replace(/\x1b/g, '\x1b\x1b');
		return `${DCS}tmux;${doubled}${ST}`;
	},

	/**
	 * Unwrap a tmux pass-through sequence.
	 *
	 * This reverses the wrapping done by wrap(), extracting the original
	 * sequence with doubled ESC characters restored to single ESC.
	 *
	 * @param wrapped - The wrapped sequence
	 * @returns The original sequence, or null if not a valid tmux pass-through
	 *
	 * @example
	 * ```typescript
	 * const original = tmux.unwrap('\x1bPtmux;\x1b\x1b]0;Title\x07\x1b\\');
	 * // Returns: '\x1b]0;Title\x07'
	 * ```
	 */
	unwrap(wrapped: string): string | null {
		// Match the tmux pass-through format
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
		const match = wrapped.match(/^\x1bPtmux;([\s\S]*)\x1b\\$/);
		if (!match) {
			return null;
		}

		// Restore doubled ESC characters to single
		const content = match[1] ?? '';
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
		return content.replace(/\x1b\x1b/g, '\x1b');
	},

	/**
	 * Check if a sequence is already wrapped for tmux pass-through.
	 *
	 * @param sequence - The sequence to check
	 * @returns true if the sequence is wrapped for tmux
	 */
	isWrapped(sequence: string): boolean {
		return sequence.startsWith(`${DCS}tmux;`) && sequence.endsWith(ST);
	},

	/**
	 * Conditionally wrap a sequence for tmux if needed.
	 *
	 * Use this when you want to wrap a sequence only if running inside tmux.
	 * The sequence is returned unchanged if not in tmux or if already wrapped.
	 *
	 * @param sequence - The escape sequence(s) to potentially wrap
	 * @param inTmux - Whether currently running inside tmux
	 * @returns The sequence, wrapped if in tmux and not already wrapped
	 *
	 * @example
	 * ```typescript
	 * import { tmux, title } from 'blecsd/terminal/ansi';
	 * import { isTmux } from 'blecsd/terminal/detection';
	 *
	 * // Conditionally wrap based on environment
	 * const seq = tmux.wrapIf(title.set('App'), isTmux());
	 * ```
	 */
	wrapIf(sequence: string, inTmux: boolean): string {
		if (!inTmux) {
			return sequence;
		}
		if (this.isWrapped(sequence)) {
			return sequence;
		}
		return this.wrap(sequence);
	},

	/**
	 * Begin pass-through mode for multiple sequences.
	 *
	 * This returns just the DCS introducer, allowing you to send the
	 * content and ST separately. Remember to double ESC characters manually.
	 *
	 * @returns The DCS tmux; prefix
	 *
	 * @example
	 * ```typescript
	 * // Manual pass-through mode
	 * process.stdout.write(tmux.begin());
	 * process.stdout.write(content.replace(/\x1b/g, '\x1b\x1b'));
	 * process.stdout.write(tmux.end());
	 * ```
	 */
	begin(): string {
		return `${DCS}tmux;`;
	},

	/**
	 * End pass-through mode.
	 *
	 * @returns The ST string terminator
	 */
	end(): string {
		return ST;
	},
} as const;

// =============================================================================
// CHARACTER SET HANDLING
// =============================================================================

/**
 * Character set identifiers for G0-G3 designation.
 *
 * These correspond to the final characters in the escape sequence
 * that designates which character set to use.
 */
export type CharacterSetId =
	/** DEC Special Graphics (line drawing) */
	| 'dec-graphics'
	/** US ASCII (default) */
	| 'us-ascii'
	/** UK ASCII (£ instead of #) */
	| 'uk'
	/** Dutch */
	| 'dutch'
	/** Finnish */
	| 'finnish'
	/** French */
	| 'french'
	/** French Canadian */
	| 'french-canadian'
	/** German */
	| 'german'
	/** Italian */
	| 'italian'
	/** Norwegian/Danish */
	| 'norwegian-danish'
	/** Spanish */
	| 'spanish'
	/** Swedish */
	| 'swedish'
	/** Swiss */
	| 'swiss'
	/** ISO Latin-1 Supplemental */
	| 'iso-latin';

/**
 * G0-G3 register identifiers.
 *
 * The terminal maintains four character set registers (G0-G3) that can
 * each hold a different character set. GL and GR are the "working" areas
 * that get mapped to the left (00-7F) and right (80-FF) halves of the
 * character space.
 */
export type CharacterSetRegister = 0 | 1 | 2 | 3;

/**
 * Maps character set IDs to their escape sequence final characters.
 *
 * @internal
 */
const CHARSET_CODES: Record<CharacterSetId, string> = {
	'dec-graphics': '0',
	'us-ascii': 'B',
	uk: 'A',
	dutch: '4',
	finnish: 'C', // Also '5'
	french: 'R',
	'french-canadian': 'Q',
	german: 'K',
	italian: 'Y',
	'norwegian-danish': 'E', // Also '6'
	spanish: 'Z',
	swedish: 'H', // Also '7'
	swiss: '=',
	'iso-latin': '/A',
};

/**
 * Escape sequence introducers for G0-G3 designation.
 *
 * @internal
 */
const GN_INTRODUCERS: Record<CharacterSetRegister, string> = {
	0: '(',
	1: ')',
	2: '*',
	3: '+',
};

/**
 * DEC Special Graphics character set (VT100 line drawing).
 *
 * This maps the characters that the terminal interprets when in
 * DEC Special Graphics mode (after designating with ESC(0).
 * The keys are the input characters and values are Unicode equivalents.
 *
 * @example
 * ```typescript
 * import { DEC_SPECIAL_GRAPHICS } from 'blecsd/terminal';
 *
 * // Get the box-drawing horizontal line character
 * const horizontalLine = DEC_SPECIAL_GRAPHICS['q']; // '─'
 *
 * // Get corner characters for a box
 * const topLeft = DEC_SPECIAL_GRAPHICS['l'];     // '┌'
 * const topRight = DEC_SPECIAL_GRAPHICS['k'];    // '┐'
 * const bottomLeft = DEC_SPECIAL_GRAPHICS['m'];  // '└'
 * const bottomRight = DEC_SPECIAL_GRAPHICS['j']; // '┘'
 * ```
 */
export const DEC_SPECIAL_GRAPHICS: Readonly<Record<string, string>> = {
	// Box drawing: corners
	j: '\u2518', // '┘' - box corner bottom-right
	k: '\u2510', // '┐' - box corner top-right
	l: '\u250c', // '┌' - box corner top-left
	m: '\u2514', // '└' - box corner bottom-left

	// Box drawing: lines
	q: '\u2500', // '─' - horizontal line
	x: '\u2502', // '│' - vertical line

	// Box drawing: tees
	n: '\u253c', // '┼' - cross
	t: '\u251c', // '├' - tee pointing right
	u: '\u2524', // '┤' - tee pointing left
	v: '\u2534', // '┴' - tee pointing up
	w: '\u252c', // '┬' - tee pointing down

	// Scan lines (for form drawing)
	o: '\u23ba', // '⎺' - scan line 1
	p: '\u23bb', // '⎻' - scan line 3
	r: '\u23bc', // '⎼' - scan line 7
	s: '\u23bd', // '⎽' - scan line 9

	// Symbols
	'`': '\u25c6', // '◆' - diamond
	a: '\u2592', // '▒' - checkerboard
	f: '\u00b0', // '°' - degree symbol
	g: '\u00b1', // '±' - plus-minus
	h: '\u2424', // '␤' - newline symbol (NL)
	y: '\u2264', // '≤' - less than or equal
	z: '\u2265', // '≥' - greater than or equal
	'{': '\u03c0', // 'π' - pi
	'|': '\u2260', // '≠' - not equal
	'}': '\u00a3', // '£' - pound sign
	'~': '\u00b7', // '·' - centered dot

	// Control characters (whitespace)
	b: '\u0009', // tab
	c: '\u000c', // form feed
	d: '\u000d', // carriage return
	e: '\u000a', // line feed
	i: '\u000b', // vertical tab
};

/**
 * ASCII fallback characters for Unicode box drawing.
 *
 * When a terminal doesn't support Unicode, these ASCII characters
 * can be used as approximations of the box drawing characters.
 *
 * @example
 * ```typescript
 * import { UNICODE_TO_ASCII } from 'blecsd/terminal';
 *
 * // Convert Unicode to ASCII fallback
 * const char = '\u2500'; // '─'
 * const ascii = UNICODE_TO_ASCII[char]; // '-'
 * ```
 */
export const UNICODE_TO_ASCII: Readonly<Record<string, string>> = {
	'\u25c6': '*', // '◆' -> '*'
	'\u2592': ' ', // '▒' -> ' '
	'\u00b0': '*', // '°' -> '*'
	'\u00b1': '+', // '±' -> '+'
	'\u2424': '\n', // '␤' -> newline
	'\u2518': '+', // '┘' -> '+'
	'\u2510': '+', // '┐' -> '+'
	'\u250c': '+', // '┌' -> '+'
	'\u2514': '+', // '└' -> '+'
	'\u253c': '+', // '┼' -> '+'
	'\u23ba': '-', // '⎺' -> '-'
	'\u23bb': '-', // '⎻' -> '-'
	'\u2500': '-', // '─' -> '-'
	'\u23bc': '-', // '⎼' -> '-'
	'\u23bd': '_', // '⎽' -> '_'
	'\u251c': '+', // '├' -> '+'
	'\u2524': '+', // '┤' -> '+'
	'\u2534': '+', // '┴' -> '+'
	'\u252c': '+', // '┬' -> '+'
	'\u2502': '|', // '│' -> '|'
	'\u2264': '<', // '≤' -> '<'
	'\u2265': '>', // '≥' -> '>'
	'\u03c0': '*', // 'π' -> '*'
	'\u2260': '!', // '≠' -> '!'
	'\u00a3': '#', // '£' -> '#'
	'\u00b7': '.', // '·' -> '.'
};

/**
 * Character set handling namespace.
 *
 * Provides functions for:
 * - Designating character sets to G0-G3 registers
 * - Invoking character sets into GL/GR
 * - Entering/exiting alternate character set mode
 * - Single shift operations for individual characters
 *
 * @example
 * ```typescript
 * import { charset } from 'blecsd/terminal';
 *
 * // Enter DEC line drawing mode and draw a box
 * const boxTop = charset.enterAcs() + 'lqqqqk' + charset.exitAcs();
 *
 * // Or designate DEC graphics to G0 and use SI/SO
 * const setup = charset.designate('dec-graphics', 0);
 * // Later use charset.invokeG0() and charset.invokeG1() to switch
 * ```
 */
export const charset = {
	/**
	 * Designate a character set to a G0-G3 register.
	 *
	 * This loads a character set into one of the four registers.
	 * To actually use it, you must invoke the register into GL or GR.
	 *
	 * @param set - The character set to load
	 * @param gn - The register (0-3, default 0)
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Load DEC graphics into G0
	 * process.stdout.write(charset.designate('dec-graphics', 0));
	 *
	 * // Load UK character set into G1
	 * process.stdout.write(charset.designate('uk', 1));
	 * ```
	 */
	designate(set: CharacterSetId, gn: CharacterSetRegister = 0): string {
		const code = CHARSET_CODES[set];
		const introducer = GN_INTRODUCERS[gn];
		return `${ESC}${introducer}${code}`;
	},

	/**
	 * Invoke G0 into GL (Shift In / SI).
	 *
	 * Makes G0 the active character set for the left half (00-7F).
	 * This is the default state.
	 *
	 * @returns The SI (0x0F) control character
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Switch back to G0 after using G1
	 * process.stdout.write(charset.invokeG0());
	 * ```
	 */
	invokeG0(): string {
		return '\x0f'; // SI (Shift In)
	},

	/**
	 * Invoke G1 into GL (Shift Out / SO).
	 *
	 * Makes G1 the active character set for the left half (00-7F).
	 *
	 * @returns The SO (0x0E) control character
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Designate DEC graphics to G1, then invoke it
	 * process.stdout.write(charset.designate('dec-graphics', 1));
	 * process.stdout.write(charset.invokeG1());
	 * // Now drawing characters will be line-drawing
	 * ```
	 */
	invokeG1(): string {
		return '\x0e'; // SO (Shift Out)
	},

	/**
	 * Invoke G2 into GL (LS2 - Locking Shift 2).
	 *
	 * Makes G2 the active character set for the left half (00-7F).
	 *
	 * @returns The LS2 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * process.stdout.write(charset.designate('german', 2));
	 * process.stdout.write(charset.invokeG2());
	 * ```
	 */
	invokeG2(): string {
		return `${ESC}n`; // LS2
	},

	/**
	 * Invoke G3 into GL (LS3 - Locking Shift 3).
	 *
	 * Makes G3 the active character set for the left half (00-7F).
	 *
	 * @returns The LS3 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * process.stdout.write(charset.designate('french', 3));
	 * process.stdout.write(charset.invokeG3());
	 * ```
	 */
	invokeG3(): string {
		return `${ESC}o`; // LS3
	},

	/**
	 * Invoke G1 into GR (LS1R - Locking Shift 1 Right).
	 *
	 * Makes G1 the active character set for the right half (80-FF).
	 *
	 * @returns The LS1R escape sequence
	 */
	invokeG1R(): string {
		return `${ESC}~`; // LS1R
	},

	/**
	 * Invoke G2 into GR (LS2R - Locking Shift 2 Right).
	 *
	 * Makes G2 the active character set for the right half (80-FF).
	 *
	 * @returns The LS2R escape sequence
	 */
	invokeG2R(): string {
		return `${ESC}}`; // LS2R
	},

	/**
	 * Invoke G3 into GR (LS3R - Locking Shift 3 Right).
	 *
	 * Makes G3 the active character set for the right half (80-FF).
	 *
	 * @returns The LS3R escape sequence
	 */
	invokeG3R(): string {
		return `${ESC}|`; // LS3R
	},

	/**
	 * Single shift to G2 (SS2).
	 *
	 * The next character will use G2, then return to current GL.
	 *
	 * @returns The SS2 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Use G2 for just the next character
	 * process.stdout.write(charset.singleShiftG2() + 'x');
	 * ```
	 */
	singleShiftG2(): string {
		return `${ESC}N`; // SS2
	},

	/**
	 * Single shift to G3 (SS3).
	 *
	 * The next character will use G3, then return to current GL.
	 *
	 * @returns The SS3 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Use G3 for just the next character
	 * process.stdout.write(charset.singleShiftG3() + 'x');
	 * ```
	 */
	singleShiftG3(): string {
		return `${ESC}O`; // SS3
	},

	/**
	 * Enter alternate character set mode (smacs).
	 *
	 * This is a convenience function that designates DEC Special Graphics
	 * to G0 and is the standard way to enable line drawing characters.
	 *
	 * @returns The escape sequence to enter ACS mode
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Draw a box using ACS mode
	 * let box = '';
	 * box += charset.enterAcs();
	 * box += 'lqqqqqqqqqk\n'; // ┌─────────┐
	 * box += 'x         x\n'; // │         │
	 * box += 'mqqqqqqqqqj';   // └─────────┘
	 * box += charset.exitAcs();
	 * process.stdout.write(box);
	 * ```
	 */
	enterAcs(): string {
		return `${ESC}(0`; // Designate DEC graphics to G0
	},

	/**
	 * Exit alternate character set mode (rmacs).
	 *
	 * This restores the normal US ASCII character set to G0.
	 *
	 * @returns The escape sequence to exit ACS mode
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // After drawing, return to normal text
	 * process.stdout.write(charset.exitAcs());
	 * process.stdout.write('Normal text');
	 * ```
	 */
	exitAcs(): string {
		return `${ESC}(B`; // Designate US ASCII to G0
	},

	/**
	 * Alias for enterAcs() - enter alternate character set mode.
	 */
	smacs(): string {
		return this.enterAcs();
	},

	/**
	 * Alias for exitAcs() - exit alternate character set mode.
	 */
	rmacs(): string {
		return this.exitAcs();
	},
} as const;

/**
 * Box drawing utilities for creating text-mode UI.
 *
 * Provides pre-built character sets for different box styles.
 *
 * @example
 * ```typescript
 * import { boxDrawing } from 'blecsd/terminal';
 *
 * // Get Unicode box characters
 * const box = boxDrawing.unicode;
 * console.log(box.topLeft + box.horizontal + box.topRight);
 *
 * // Get ASCII fallback characters
 * const asciiBox = boxDrawing.ascii;
 * console.log(asciiBox.topLeft + asciiBox.horizontal + asciiBox.topRight);
 * ```
 */
export const boxDrawing = {
	/**
	 * Unicode single-line box drawing characters.
	 */
	unicode: {
		topLeft: '\u250c', // '┌'
		topRight: '\u2510', // '┐'
		bottomLeft: '\u2514', // '└'
		bottomRight: '\u2518', // '┘'
		horizontal: '\u2500', // '─'
		vertical: '\u2502', // '│'
		cross: '\u253c', // '┼'
		teeRight: '\u251c', // '├'
		teeLeft: '\u2524', // '┤'
		teeUp: '\u2534', // '┴'
		teeDown: '\u252c', // '┬'
	},

	/**
	 * Unicode double-line box drawing characters.
	 */
	unicodeDouble: {
		topLeft: '\u2554', // '╔'
		topRight: '\u2557', // '╗'
		bottomLeft: '\u255a', // '╚'
		bottomRight: '\u255d', // '╝'
		horizontal: '\u2550', // '═'
		vertical: '\u2551', // '║'
		cross: '\u256c', // '╬'
		teeRight: '\u2560', // '╠'
		teeLeft: '\u2563', // '╣'
		teeUp: '\u2569', // '╩'
		teeDown: '\u2566', // '╦'
	},

	/**
	 * Unicode rounded corner box drawing characters.
	 */
	unicodeRounded: {
		topLeft: '\u256d', // '╭'
		topRight: '\u256e', // '╮'
		bottomLeft: '\u2570', // '╰'
		bottomRight: '\u256f', // '╯'
		horizontal: '\u2500', // '─'
		vertical: '\u2502', // '│'
		cross: '\u253c', // '┼'
		teeRight: '\u251c', // '├'
		teeLeft: '\u2524', // '┤'
		teeUp: '\u2534', // '┴'
		teeDown: '\u252c', // '┬'
	},

	/**
	 * ASCII fallback box drawing characters.
	 */
	ascii: {
		topLeft: '+',
		topRight: '+',
		bottomLeft: '+',
		bottomRight: '+',
		horizontal: '-',
		vertical: '|',
		cross: '+',
		teeRight: '+',
		teeLeft: '+',
		teeUp: '+',
		teeDown: '+',
	},

	/**
	 * DEC VT100 line drawing characters (for use with ACS mode).
	 *
	 * These are the raw characters to send when in ACS mode.
	 * The terminal will translate them to line drawing.
	 */
	decGraphics: {
		topLeft: 'l',
		topRight: 'k',
		bottomLeft: 'm',
		bottomRight: 'j',
		horizontal: 'q',
		vertical: 'x',
		cross: 'n',
		teeRight: 't',
		teeLeft: 'u',
		teeUp: 'v',
		teeDown: 'w',
	},
} as const;

/**
 * Type for box drawing character sets.
 */
export type BoxDrawingSet = (typeof boxDrawing)['unicode'];

// =============================================================================
// WINDOW MANIPULATION
// =============================================================================

/**
 * Window manipulation namespace.
 *
 * Provides functions for controlling the terminal window position, size,
 * and state. These are xterm control sequences that may not be supported
 * on all terminals.
 *
 * Note: Some terminals disable window manipulation for security reasons.
 * The `allowWindowOps` resource controls this in xterm.
 *
 * @example
 * ```typescript
 * import { windowOps } from 'blecsd/terminal';
 *
 * // Maximize the window
 * process.stdout.write(windowOps.maximize());
 *
 * // Move window to specific position
 * process.stdout.write(windowOps.move(100, 50));
 *
 * // Resize to specific character dimensions
 * process.stdout.write(windowOps.resizeChars(80, 24));
 * ```
 */
export const windowOps = {
	/**
	 * De-iconify (restore) the terminal window.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Restore minimized window
	 * process.stdout.write(windowOps.deiconify());
	 * ```
	 */
	deiconify(): string {
		return `${CSI}1t`;
	},

	/**
	 * Iconify (minimize) the terminal window.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Minimize window
	 * process.stdout.write(windowOps.iconify());
	 * ```
	 */
	iconify(): string {
		return `${CSI}2t`;
	},

	/**
	 * Move the terminal window to a specific position.
	 *
	 * @param x - X position in pixels from left edge of screen
	 * @param y - Y position in pixels from top edge of screen
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Move window to top-left corner
	 * process.stdout.write(windowOps.move(0, 0));
	 *
	 * // Move window to specific position
	 * process.stdout.write(windowOps.move(100, 50));
	 * ```
	 */
	move(x: number, y: number): string {
		return `${CSI}3;${x};${y}t`;
	},

	/**
	 * Resize the terminal window in pixels.
	 *
	 * @param width - Width in pixels
	 * @param height - Height in pixels
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Resize window to 800x600 pixels
	 * process.stdout.write(windowOps.resizePixels(800, 600));
	 * ```
	 */
	resizePixels(width: number, height: number): string {
		return `${CSI}4;${height};${width}t`;
	},

	/**
	 * Raise the terminal window to the front of the stacking order.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Bring window to front
	 * process.stdout.write(windowOps.raise());
	 * ```
	 */
	raise(): string {
		return `${CSI}5t`;
	},

	/**
	 * Lower the terminal window to the bottom of the stacking order.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Send window to back
	 * process.stdout.write(windowOps.lower());
	 * ```
	 */
	lower(): string {
		return `${CSI}6t`;
	},

	/**
	 * Refresh the terminal window.
	 *
	 * Forces a redraw of the terminal content.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Force window refresh
	 * process.stdout.write(windowOps.refresh());
	 * ```
	 */
	refresh(): string {
		return `${CSI}7t`;
	},

	/**
	 * Resize the text area in characters.
	 *
	 * @param columns - Number of columns
	 * @param rows - Number of rows
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Resize to 80x24 characters
	 * process.stdout.write(windowOps.resizeChars(80, 24));
	 *
	 * // Resize to 132 columns (wide mode)
	 * process.stdout.write(windowOps.resizeChars(132, 43));
	 * ```
	 */
	resizeChars(columns: number, rows: number): string {
		return `${CSI}8;${rows};${columns}t`;
	},

	/**
	 * Restore a maximized window to its previous size.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Restore from maximized state
	 * process.stdout.write(windowOps.restoreMaximized());
	 * ```
	 */
	restoreMaximized(): string {
		return `${CSI}9;0t`;
	},

	/**
	 * Maximize the terminal window.
	 *
	 * Resizes the window to fill the entire screen.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Maximize window
	 * process.stdout.write(windowOps.maximize());
	 * ```
	 */
	maximize(): string {
		return `${CSI}9;1t`;
	},

	/**
	 * Maximize the window vertically only.
	 *
	 * @returns The escape sequence
	 */
	maximizeVertical(): string {
		return `${CSI}9;2t`;
	},

	/**
	 * Maximize the window horizontally only.
	 *
	 * @returns The escape sequence
	 */
	maximizeHorizontal(): string {
		return `${CSI}9;3t`;
	},

	/**
	 * Exit full-screen mode.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Exit full-screen
	 * process.stdout.write(windowOps.exitFullScreen());
	 * ```
	 */
	exitFullScreen(): string {
		return `${CSI}10;0t`;
	},

	/**
	 * Enter full-screen mode.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Enter full-screen
	 * process.stdout.write(windowOps.enterFullScreen());
	 * ```
	 */
	enterFullScreen(): string {
		return `${CSI}10;1t`;
	},

	/**
	 * Toggle full-screen mode.
	 *
	 * @returns The escape sequence
	 */
	toggleFullScreen(): string {
		return `${CSI}10;2t`;
	},

	/**
	 * Save the window title and icon title to the stack.
	 *
	 * @param which - Which to save: 'both', 'icon', or 'title'
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps, title } from 'blecsd/terminal';
	 *
	 * // Save current title
	 * process.stdout.write(windowOps.pushTitle('both'));
	 *
	 * // Set temporary title
	 * process.stdout.write(title.set('Processing...'));
	 *
	 * // Later, restore original title
	 * process.stdout.write(windowOps.popTitle('both'));
	 * ```
	 */
	pushTitle(which: 'both' | 'icon' | 'title' = 'both'): string {
		const param = which === 'both' ? 0 : which === 'icon' ? 1 : 2;
		return `${CSI}22;${param}t`;
	},

	/**
	 * Restore the window title and icon title from the stack.
	 *
	 * @param which - Which to restore: 'both', 'icon', or 'title'
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Restore previously saved title
	 * process.stdout.write(windowOps.popTitle('both'));
	 * ```
	 */
	popTitle(which: 'both' | 'icon' | 'title' = 'both'): string {
		const param = which === 'both' ? 0 : which === 'icon' ? 1 : 2;
		return `${CSI}23;${param}t`;
	},

	/**
	 * Resize the window to a specific number of lines (DECSLPP).
	 *
	 * This is the DEC Set Lines Per Page command for setting
	 * the logical page size.
	 *
	 * @param lines - Number of lines (must be >= 24)
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Set page to 50 lines
	 * process.stdout.write(windowOps.setLines(50));
	 * ```
	 */
	setLines(lines: number): string {
		const n = Math.max(24, Math.floor(lines));
		return `${CSI}${n}t`;
	},
} as const;

// =============================================================================
// HYPERLINK SUPPORT (OSC 8)
// =============================================================================

/**
 * Allowed protocols for hyperlinks (security whitelist).
 *
 * Only these URL schemes are allowed in hyperlinks to prevent
 * injection attacks.
 */
export const HYPERLINK_ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'file:', 'tel:'] as const;

/**
 * Type for allowed hyperlink protocols.
 */
export type HyperlinkProtocol = (typeof HYPERLINK_ALLOWED_PROTOCOLS)[number];

/**
 * Options for creating hyperlinks.
 */
export interface HyperlinkOptions {
	/**
	 * Optional ID for multi-line/multi-reference links.
	 *
	 * When multiple hyperlink regions share the same ID, terminals
	 * can highlight them together on hover.
	 */
	id?: string;
}

/**
 * Check if a URL uses an allowed protocol.
 *
 * @param url - The URL to validate
 * @returns True if the URL uses a whitelisted protocol
 *
 * @example
 * ```typescript
 * import { isHyperlinkAllowed } from 'blecsd/terminal';
 *
 * isHyperlinkAllowed('https://example.com');  // true
 * isHyperlinkAllowed('javascript:alert(1)'); // false
 * isHyperlinkAllowed('file:///home/user');   // true
 * ```
 */
export function isHyperlinkAllowed(url: string): boolean {
	try {
		const parsed = new URL(url);
		return HYPERLINK_ALLOWED_PROTOCOLS.includes(parsed.protocol as HyperlinkProtocol);
	} catch {
		// Invalid URL
		return false;
	}
}

/**
 * Hyperlink namespace for terminal clickable links (OSC 8).
 *
 * OSC 8 hyperlinks allow terminals to display clickable links.
 * The visible text can be different from the URL.
 *
 * Supported by: iTerm2, GNOME Terminal, Konsole, Windows Terminal,
 * Kitty, Alacritty, and others.
 *
 * @example
 * ```typescript
 * import { hyperlink } from 'blecsd/terminal';
 *
 * // Simple hyperlink
 * console.log(hyperlink.link('https://example.com', 'Click here'));
 *
 * // Email link
 * console.log(hyperlink.link('mailto:user@example.com', 'Contact us'));
 *
 * // Multi-line link with ID
 * console.log(hyperlink.start('https://doc.example.com', { id: 'doc-link' }));
 * console.log('This is a');
 * console.log('multi-line link');
 * console.log(hyperlink.end());
 * ```
 */
export const hyperlink = {
	/**
	 * Create a complete hyperlink with text.
	 *
	 * @param url - The URL to link to
	 * @param text - The visible text for the link
	 * @param options - Optional link options
	 * @returns The escape sequence with link and text
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Simple link
	 * process.stdout.write(
	 *   hyperlink.link('https://nodejs.org', 'Node.js') + '\n'
	 * );
	 *
	 * // With ID for highlighting related links
	 * process.stdout.write(
	 *   'See ' +
	 *   hyperlink.link('https://docs.example.com', 'docs', { id: 'main-doc' }) +
	 *   ' for more info.\n'
	 * );
	 * ```
	 */
	link(url: string, text: string, options?: HyperlinkOptions): string {
		return `${this.start(url, options)}${text}${this.end()}`;
	},

	/**
	 * Start a hyperlink region.
	 *
	 * Use this for multi-line links or when the link text spans
	 * multiple output calls. Call `end()` to close the link region.
	 *
	 * @param url - The URL to link to
	 * @param options - Optional link options (id for multi-reference links)
	 * @returns The escape sequence to start the link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Multi-line link
	 * process.stdout.write(hyperlink.start('https://example.com'));
	 * process.stdout.write('This link\n');
	 * process.stdout.write('spans multiple\n');
	 * process.stdout.write('lines\n');
	 * process.stdout.write(hyperlink.end());
	 *
	 * // With ID (related links highlight together)
	 * const docUrl = 'https://docs.example.com';
	 * process.stdout.write(hyperlink.start(docUrl, { id: 'docs' }));
	 * process.stdout.write('[1]');
	 * process.stdout.write(hyperlink.end());
	 * process.stdout.write(' ... ');
	 * process.stdout.write(hyperlink.start(docUrl, { id: 'docs' }));
	 * process.stdout.write('[2]');
	 * process.stdout.write(hyperlink.end());
	 * ```
	 */
	start(url: string, options?: HyperlinkOptions): string {
		const params = options?.id ? `id=${options.id}` : '';
		return `${OSC}8;${params};${url}${ST}`;
	},

	/**
	 * End a hyperlink region.
	 *
	 * @returns The escape sequence to end the link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * process.stdout.write(hyperlink.start('https://example.com'));
	 * process.stdout.write('link text');
	 * process.stdout.write(hyperlink.end()); // Closes the link
	 * ```
	 */
	end(): string {
		return `${OSC}8;;${ST}`;
	},

	/**
	 * Create a safe hyperlink with URL validation.
	 *
	 * Only allows whitelisted protocols (http, https, mailto, file, tel).
	 * Returns just the text without a link if the URL is not allowed.
	 *
	 * @param url - The URL to link to
	 * @param text - The visible text for the link
	 * @param options - Optional link options
	 * @returns The escape sequence with link (or just text if URL not allowed)
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Safe link (URL validated)
	 * hyperlink.safeLink('https://example.com', 'Safe');
	 * // Returns: OSC 8;;https://example.com ST Safe OSC 8;; ST
	 *
	 * // Blocked URL (javascript:)
	 * hyperlink.safeLink('javascript:alert(1)', 'XSS');
	 * // Returns: 'XSS' (no link, just text)
	 * ```
	 */
	safeLink(url: string, text: string, options?: HyperlinkOptions): string {
		if (!isHyperlinkAllowed(url)) {
			return text;
		}
		return this.link(url, text, options);
	},

	/**
	 * Create a mailto link.
	 *
	 * @param email - Email address
	 * @param text - Optional display text (defaults to email)
	 * @param options - Optional link options
	 * @returns The escape sequence for an email link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Email with address as text
	 * process.stdout.write(hyperlink.mailto('user@example.com'));
	 *
	 * // Email with custom text
	 * process.stdout.write(hyperlink.mailto('support@company.com', 'Contact Support'));
	 * ```
	 */
	mailto(email: string, text?: string, options?: HyperlinkOptions): string {
		return this.link(`mailto:${email}`, text ?? email, options);
	},

	/**
	 * Create a file link.
	 *
	 * @param path - File path (absolute)
	 * @param text - Optional display text (defaults to path)
	 * @param options - Optional link options
	 * @returns The escape sequence for a file link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // File link
	 * process.stdout.write(hyperlink.file('/home/user/document.txt', 'document'));
	 *
	 * // Error output with file links
	 * console.log(`Error at ${hyperlink.file('/src/app.ts', 'app.ts')}:42`);
	 * ```
	 */
	file(path: string, text?: string, options?: HyperlinkOptions): string {
		return this.link(`file://${path}`, text ?? path, options);
	},
} as const;

// =============================================================================
// MEDIA COPY (PRINT)
// =============================================================================

/**
 * Media copy mode values for printer control.
 */
export const MediaCopyMode = {
	/** Print screen (mc0) */
	PRINT_SCREEN: 0,
	/** Turn off printer controller mode (mc4) */
	PRINTER_OFF: 4,
	/** Turn on printer controller mode (mc5) */
	PRINTER_ON: 5,
	/** Print cursor line (mc1) - VT100 */
	PRINT_LINE: 1,
	/** Print composed display (mc10) - VT300+ */
	PRINT_DISPLAY: 10,
	/** Print all pages (mc11) - VT300+ */
	PRINT_ALL_PAGES: 11,
} as const;

export type MediaCopyModeValue = (typeof MediaCopyMode)[keyof typeof MediaCopyMode];

/**
 * Media copy (print) namespace.
 *
 * These are legacy terminal features for controlling printers and
 * capturing screen output. Rarely used in modern applications but
 * may be useful for specialized printing or screen capture scenarios.
 *
 * @example
 * ```typescript
 * import { mediaCopy } from 'blecsd/terminal';
 *
 * // Print the current screen
 * process.stdout.write(mediaCopy.printScreen());
 *
 * // Enable printer controller mode
 * process.stdout.write(mediaCopy.printerOn());
 * // ... output goes to printer ...
 * process.stdout.write(mediaCopy.printerOff());
 * ```
 */
export const mediaCopy = {
	/**
	 * Send media copy command with specified mode.
	 *
	 * @param mode - Media copy mode value
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mediaCopy.mc(MediaCopyMode.PRINT_SCREEN)
	 * // Returns: '\x1b[0i'
	 * ```
	 */
	mc(mode: MediaCopyModeValue): string {
		return `${CSI}${mode}i`;
	},

	/**
	 * Print screen (mc0).
	 * Sends screen contents to the printer.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mediaCopy.printScreen()
	 * // Returns: '\x1b[0i'
	 * ```
	 */
	printScreen(): string {
		return `${CSI}0i`;
	},

	/**
	 * Print cursor line (mc1).
	 * Sends the line containing the cursor to the printer.
	 *
	 * @returns ANSI escape sequence
	 */
	printLine(): string {
		return `${CSI}1i`;
	},

	/**
	 * Turn on printer controller mode (mc5).
	 * All subsequent output is sent to the printer until printerOff() is called.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Enable printer mode
	 * process.stdout.write(mediaCopy.printerOn());
	 *
	 * // This text goes to printer
	 * process.stdout.write('Hello, Printer!');
	 *
	 * // Disable printer mode
	 * process.stdout.write(mediaCopy.printerOff());
	 * ```
	 */
	printerOn(): string {
		return `${CSI}5i`;
	},

	/**
	 * Turn off printer controller mode (mc4).
	 * Stops sending output to the printer.
	 *
	 * @returns ANSI escape sequence
	 */
	printerOff(): string {
		return `${CSI}4i`;
	},

	/**
	 * Turn on printer for n bytes (mc5p).
	 * Sends exactly n bytes to the printer, then automatically turns off.
	 *
	 * @param n - Number of bytes to send to printer
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Print exactly 100 bytes
	 * mediaCopy.printerForBytes(100)
	 * // Returns: '\x1b[5;100i'
	 * ```
	 */
	printerForBytes(n: number): string {
		return `${CSI}5;${n}i`;
	},

	/**
	 * Print composed display (mc10).
	 * VT300+ feature for printing the composed display.
	 *
	 * @returns ANSI escape sequence
	 */
	printDisplay(): string {
		return `${CSI}10i`;
	},

	/**
	 * Print all pages (mc11).
	 * VT300+ feature for printing all pages.
	 *
	 * @returns ANSI escape sequence
	 */
	printAllPages(): string {
		return `${CSI}11i`;
	},

	/**
	 * Auto print mode - enable.
	 * Lines are automatically printed when cursor moves off them.
	 *
	 * @returns ANSI escape sequence
	 */
	autoPrintOn(): string {
		return `${CSI}?5i`;
	},

	/**
	 * Auto print mode - disable.
	 *
	 * @returns ANSI escape sequence
	 */
	autoPrintOff(): string {
		return `${CSI}?4i`;
	},

	/**
	 * Print cursor position report.
	 * Sends the cursor position to the printer.
	 *
	 * @returns ANSI escape sequence
	 */
	printCursorPosition(): string {
		return `${CSI}?1i`;
	},
} as const;

// =============================================================================
// RECTANGULAR AREA OPERATIONS (VT400+)
// =============================================================================

/**
 * Rectangle namespace for VT400+ rectangular area operations.
 *
 * These advanced features allow manipulation of rectangular areas
 * on the screen, including copying, filling, erasing, and modifying
 * attributes within a region.
 *
 * Note: These features require VT400+ compatible terminals.
 *
 * @example
 * ```typescript
 * import { rectangle } from 'blecsd/terminal';
 *
 * // Fill a rectangle with '#' character
 * process.stdout.write(rectangle.fill(1, 1, 10, 5, '#'));
 *
 * // Erase a rectangle
 * process.stdout.write(rectangle.erase(5, 5, 15, 10));
 *
 * // Copy a rectangle to another location
 * process.stdout.write(rectangle.copy(1, 1, 10, 5, 20, 1));
 * ```
 */
export const rectangle = {
	/**
	 * Set character attributes in a rectangular area (DECCARA).
	 * Changes attributes (bold, underline, etc.) within a rectangle.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @param attrs - SGR attribute codes to set
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Make text bold and underlined in rectangle
	 * rectangle.setAttrs(1, 1, 10, 20, [SGR.BOLD, SGR.UNDERLINE])
	 * // Returns: '\x1b[1;1;10;20;1;4$r'
	 * ```
	 */
	setAttrs(top: number, left: number, bottom: number, right: number, attrs: number[]): string {
		const attrStr = attrs.length > 0 ? `;${attrs.join(';')}` : '';
		return `${CSI}${top};${left};${bottom};${right}${attrStr}$r`;
	},

	/**
	 * Reverse character attributes in a rectangular area (DECRARA).
	 * Toggles specified attributes within a rectangle.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @param attrs - SGR attribute codes to reverse
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Toggle inverse attribute in rectangle
	 * rectangle.reverseAttrs(1, 1, 10, 20, [SGR.INVERSE])
	 * // Returns: '\x1b[1;1;10;20;7$t'
	 * ```
	 */
	reverseAttrs(top: number, left: number, bottom: number, right: number, attrs: number[]): string {
		const attrStr = attrs.length > 0 ? `;${attrs.join(';')}` : '';
		return `${CSI}${top};${left};${bottom};${right}${attrStr}$t`;
	},

	/**
	 * Copy rectangular area (DECCRA).
	 * Copies content from one rectangle to another location.
	 *
	 * @param srcTop - Source top row (1-indexed)
	 * @param srcLeft - Source left column (1-indexed)
	 * @param srcBottom - Source bottom row (1-indexed)
	 * @param srcRight - Source right column (1-indexed)
	 * @param destTop - Destination top row (1-indexed)
	 * @param destLeft - Destination left column (1-indexed)
	 * @param srcPage - Source page (default: 1)
	 * @param destPage - Destination page (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Copy rectangle from (1,1)-(10,20) to (1,30)
	 * rectangle.copy(1, 1, 10, 20, 1, 30)
	 * // Returns: '\x1b[1;1;10;20;1;1;30$v'
	 * ```
	 */
	copy(
		srcTop: number,
		srcLeft: number,
		srcBottom: number,
		srcRight: number,
		destTop: number,
		destLeft: number,
		srcPage = 1,
		destPage = 1,
	): string {
		return `${CSI}${srcTop};${srcLeft};${srcBottom};${srcRight};${srcPage};${destTop};${destLeft};${destPage}$v`;
	},

	/**
	 * Fill rectangular area with character (DECFRA).
	 * Fills a rectangle with a specified character.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @param char - Character to fill with (or character code)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Fill rectangle with '#'
	 * rectangle.fill(1, 1, 10, 20, '#')
	 * // Returns: '\x1b[35;1;1;10;20$x'
	 *
	 * // Fill with character code
	 * rectangle.fill(1, 1, 10, 20, 42) // '*' character
	 * ```
	 */
	fill(top: number, left: number, bottom: number, right: number, char: string | number): string {
		const charCode = typeof char === 'string' ? char.charCodeAt(0) : char;
		return `${CSI}${charCode};${top};${left};${bottom};${right}$x`;
	},

	/**
	 * Erase rectangular area (DECERA).
	 * Erases content within a rectangle (fills with spaces).
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Erase rectangle
	 * rectangle.erase(5, 5, 15, 25)
	 * // Returns: '\x1b[5;5;15;25$z'
	 * ```
	 */
	erase(top: number, left: number, bottom: number, right: number): string {
		return `${CSI}${top};${left};${bottom};${right}$z`;
	},

	/**
	 * Selective erase rectangular area (DECSERA).
	 * Erases only characters that are not protected by DECSCA.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Selective erase rectangle
	 * rectangle.selectiveErase(5, 5, 15, 25)
	 * // Returns: '\x1b[5;5;15;25${'
	 * ```
	 */
	selectiveErase(top: number, left: number, bottom: number, right: number): string {
		return `${CSI}${top};${left};${bottom};${right}\${`;
	},

	/**
	 * Set character protection attribute (DECSCA).
	 * Protected characters are not affected by selective erase.
	 *
	 * @param protect - Whether to protect characters (true) or unprotect (false)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Protect subsequent characters
	 * rectangle.setProtection(true)
	 * // Returns: '\x1b[1"q'
	 *
	 * // Unprotect
	 * rectangle.setProtection(false)
	 * // Returns: '\x1b[0"q'
	 * ```
	 */
	setProtection(protect: boolean): string {
		return `${CSI}${protect ? 1 : 0}"q`;
	},

	/**
	 * Enable rectangular area checksum reporting (DECRQCRA).
	 * Requests a checksum of a rectangular area.
	 *
	 * @param id - Request ID (returned in response)
	 * @param page - Page number (default: 1)
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @returns ANSI escape sequence
	 */
	requestChecksum(
		id: number,
		page: number,
		top: number,
		left: number,
		bottom: number,
		right: number,
	): string {
		return `${CSI}${id};${page};${top};${left};${bottom};${right}*y`;
	},
} as const;

// =============================================================================
// DEC LOCATOR (ADVANCED MOUSE)
// =============================================================================

/**
 * DEC Locator event types.
 */
export const LocatorEvent = {
	/** No events */
	NONE: 0,
	/** Request only on button down */
	BUTTON_DOWN: 1,
	/** Request only on button up */
	BUTTON_UP: 2,
	/** Request on both button down and up */
	BUTTON_DOWN_UP: 3,
} as const;

export type LocatorEventValue = (typeof LocatorEvent)[keyof typeof LocatorEvent];

/**
 * DEC Locator button values.
 */
export const LocatorButton = {
	/** No button */
	NONE: 0,
	/** Right button */
	RIGHT: 1,
	/** Middle button */
	MIDDLE: 2,
	/** Left button */
	LEFT: 3,
	/** M4 button */
	M4: 4,
} as const;

export type LocatorButtonValue = (typeof LocatorButton)[keyof typeof LocatorButton];

/**
 * DEC Locator namespace for advanced mouse control.
 *
 * The DEC Locator is a more advanced mouse protocol than X10/SGR,
 * supporting pixel-level positioning, filter rectangles, and more
 * precise event control. However, it is less commonly supported
 * than SGR mouse mode.
 *
 * Note: Requires DEC Locator compatible terminals (xterm, some others).
 *
 * @example
 * ```typescript
 * import { locator } from 'blecsd/terminal';
 *
 * // Enable locator reporting with character cell units
 * process.stdout.write(locator.enable(2));
 *
 * // Set a filter rectangle for events
 * process.stdout.write(locator.setFilterRectangle(1, 1, 100, 50));
 *
 * // Request current locator position
 * process.stdout.write(locator.requestPosition());
 *
 * // Disable locator
 * process.stdout.write(locator.disable());
 * ```
 */
export const locator = {
	/**
	 * Enable locator reporting (DECELR).
	 *
	 * @param mode - Reporting mode:
	 *   - 0: Locator disabled (default)
	 *   - 1: Locator reports enabled, one-shot mode
	 *   - 2: Locator reports enabled, continuous mode
	 * @param units - Coordinate units:
	 *   - 0: Default (depends on terminal)
	 *   - 1: Device physical pixels
	 *   - 2: Character cells
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Enable one-shot locator with character cell units
	 * locator.enable(1, 2)
	 * // Returns: '\x1b[1;2'z'
	 *
	 * // Enable continuous locator with pixel units
	 * locator.enable(2, 1)
	 * // Returns: '\x1b[2;1'z'
	 * ```
	 */
	enable(mode: 0 | 1 | 2 = 2, units: 0 | 1 | 2 = 2): string {
		return `${CSI}${mode};${units}'z`;
	},

	/**
	 * Disable locator reporting (DECELR mode 0).
	 *
	 * @returns ANSI escape sequence
	 */
	disable(): string {
		return `${CSI}0'z`;
	},

	/**
	 * Set locator filter rectangle (DECEFR).
	 * Events are only reported within this rectangle.
	 *
	 * @param top - Top boundary
	 * @param left - Left boundary
	 * @param bottom - Bottom boundary
	 * @param right - Right boundary
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Set filter rectangle
	 * locator.setFilterRectangle(1, 1, 100, 200)
	 * // Returns: '\x1b[1;1;100;200'w'
	 * ```
	 */
	setFilterRectangle(top: number, left: number, bottom: number, right: number): string {
		return `${CSI}${top};${left};${bottom};${right}'w`;
	},

	/**
	 * Clear locator filter rectangle.
	 * Events will be reported for the entire screen.
	 *
	 * @returns ANSI escape sequence
	 */
	clearFilterRectangle(): string {
		return `${CSI}'w`;
	},

	/**
	 * Select locator events (DECSLE).
	 * Configure which events trigger locator reports.
	 *
	 * @param events - Array of event configurations:
	 *   - 0: Only respond to explicit requests (DECRQLP)
	 *   - 1: Report button down transitions
	 *   - 2: Do not report button down transitions
	 *   - 3: Report button up transitions
	 *   - 4: Do not report button up transitions
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Report both button down and up
	 * locator.setEvents([1, 3])
	 * // Returns: '\x1b[1;3'{''
	 *
	 * // Only report button down
	 * locator.setEvents([1, 4])
	 * // Returns: '\x1b[1;4'{'
	 * ```
	 */
	setEvents(events: number[]): string {
		return `${CSI}${events.join(';')}'{`;
	},

	/**
	 * Request locator position (DECRQLP).
	 * Terminal responds with a DECLRP sequence containing position.
	 *
	 * @param button - Button to check (optional):
	 *   - 0: Default (any)
	 *   - 1: Right button
	 *   - 2: Middle button
	 *   - 3: Left button
	 *   - 4: M4 button
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Request position of any button
	 * locator.requestPosition()
	 * // Returns: '\x1b['|'
	 *
	 * // Request position when left button is pressed
	 * locator.requestPosition(3)
	 * // Returns: '\x1b[3'|'
	 * ```
	 */
	requestPosition(button?: LocatorButtonValue): string {
		if (button === undefined) {
			return `${CSI}'|`;
		}
		return `${CSI}${button}'|`;
	},

	/**
	 * Enable locator key mode.
	 * Enables locator reporting for keyboard events.
	 *
	 * @returns ANSI escape sequence
	 */
	enableKeyMode(): string {
		return `${CSI}?99h`;
	},

	/**
	 * Disable locator key mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableKeyMode(): string {
		return `${CSI}?99l`;
	},

	/**
	 * Enable locator extended reporting (pixel coordinates).
	 *
	 * @returns ANSI escape sequence
	 */
	enableExtended(): string {
		return `${CSI}?1003h`;
	},

	/**
	 * Disable locator extended reporting.
	 *
	 * @returns ANSI escape sequence
	 */
	disableExtended(): string {
		return `${CSI}?1003l`;
	},

	/**
	 * Enable locator highlight reporting.
	 * Reports highlighting changes in the locator area.
	 *
	 * @returns ANSI escape sequence
	 */
	enableHighlight(): string {
		return `${CSI}?1001h`;
	},

	/**
	 * Disable locator highlight reporting.
	 *
	 * @returns ANSI escape sequence
	 */
	disableHighlight(): string {
		return `${CSI}?1001l`;
	},
} as const;
