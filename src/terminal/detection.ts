/**
 * Terminal Detection System
 *
 * Detects terminal capabilities and type based on environment variables
 * and terminal responses.
 *
 * @module terminal/detection
 */

import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Color support levels
 */
export const ColorSupportSchema = z.union([
	z.literal(2), // Basic (black/white)
	z.literal(16), // 16 colors
	z.literal(256), // 256 colors
	z.literal('truecolor'), // 24-bit RGB
]);

export type ColorSupport = z.infer<typeof ColorSupportSchema>;

/**
 * Terminal information schema
 */
export const TerminalInfoSchema = z.object({
	/** Terminal name (xterm, vte, iterm2, etc.) */
	name: z.string(),
	/** Terminal version if available */
	version: z.string().optional(),
	/** Color support level */
	colorSupport: ColorSupportSchema,
	/** Unicode/UTF-8 support */
	unicodeSupport: z.boolean(),
	/** Mouse tracking support */
	mouseSupport: z.boolean(),
	/** Bracketed paste mode support */
	bracketedPaste: z.boolean(),
	/** Running inside tmux */
	tmux: z.boolean(),
	/** Running inside GNU screen */
	screen: z.boolean(),
	/** Running inside a VSCode terminal */
	vscode: z.boolean(),
	/** Terminal width in columns */
	cols: z.number().int().positive(),
	/** Terminal height in rows */
	rows: z.number().int().positive(),
});

export type TerminalInfo = z.infer<typeof TerminalInfoSchema>;

// =============================================================================
// ENVIRONMENT ACCESS
// =============================================================================

/**
 * Get environment variable (abstracted for testing)
 */
function getEnv(name: string): string | undefined {
	return process.env[name];
}

/**
 * Check if running in a TTY
 */
function isTTY(): boolean {
	return process.stdout.isTTY === true;
}

/**
 * Get terminal dimensions
 */
function getDimensions(): { cols: number; rows: number } {
	if (process.stdout.columns && process.stdout.rows) {
		return { cols: process.stdout.columns, rows: process.stdout.rows };
	}
	return { cols: 80, rows: 24 };
}

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect if running inside tmux.
 *
 * @returns true if inside tmux
 *
 * @example
 * ```typescript
 * if (isTmux()) {
 *   // Use tmux-specific escape sequences
 * }
 * ```
 */
export function isTmux(): boolean {
	return getEnv('TMUX') !== undefined;
}

/**
 * Detect if running inside GNU screen.
 *
 * @returns true if inside GNU screen
 */
export function isScreen(): boolean {
	const term = getEnv('TERM') ?? '';
	return term.startsWith('screen') || getEnv('STY') !== undefined;
}

/**
 * Detect if running inside VSCode integrated terminal.
 *
 * @returns true if inside VSCode terminal
 */
export function isVSCode(): boolean {
	return getEnv('TERM_PROGRAM') === 'vscode';
}

/**
 * Detect if terminal is xterm or xterm-compatible.
 *
 * @returns true if xterm or compatible
 */
export function isXterm(): boolean {
	const term = getEnv('TERM') ?? '';
	const termProgram = getEnv('TERM_PROGRAM') ?? '';
	return term.includes('xterm') || termProgram === 'Apple_Terminal';
}

/**
 * Detect if terminal is VTE-based (GNOME Terminal, Tilix, etc.).
 *
 * @returns true if VTE-based
 */
export function isVTE(): boolean {
	return getEnv('VTE_VERSION') !== undefined;
}

/**
 * Detect if terminal is iTerm2.
 *
 * @returns true if iTerm2
 */
export function isITerm2(): boolean {
	return getEnv('TERM_PROGRAM') === 'iTerm.app';
}

/**
 * Detect if terminal is Alacritty.
 *
 * @returns true if Alacritty
 */
export function isAlacritty(): boolean {
	return getEnv('TERM') === 'alacritty';
}

/**
 * Detect if terminal is Kitty.
 *
 * @returns true if Kitty
 */
export function isKitty(): boolean {
	return getEnv('TERM') === 'xterm-kitty' || getEnv('KITTY_WINDOW_ID') !== undefined;
}

/**
 * Detect if terminal is Windows Terminal.
 *
 * @returns true if Windows Terminal
 */
export function isWindowsTerminal(): boolean {
	return getEnv('WT_SESSION') !== undefined;
}

/**
 * Detect if terminal is Hyper.
 *
 * @returns true if Hyper terminal
 */
export function isHyper(): boolean {
	return getEnv('TERM_PROGRAM') === 'Hyper';
}

/**
 * Detect the terminal name.
 *
 * @returns Terminal name string
 */
export function detectTerminalName(): string {
	if (isITerm2()) return 'iTerm2';
	if (isKitty()) return 'Kitty';
	if (isAlacritty()) return 'Alacritty';
	if (isWindowsTerminal()) return 'Windows Terminal';
	if (isHyper()) return 'Hyper';
	if (isVSCode()) return 'VSCode';
	if (isVTE()) return 'VTE';
	if (isTmux()) return 'tmux';
	if (isScreen()) return 'screen';
	if (isXterm()) return 'xterm';

	const term = getEnv('TERM');
	if (term) return term;

	return 'unknown';
}

/**
 * Check for forced color settings.
 */
function checkForcedColor(): ColorSupport | null {
	if (getEnv('NO_COLOR') !== undefined) return 2;

	const forceColor = getEnv('FORCE_COLOR');
	if (forceColor === '0') return 2;
	if (forceColor === '1') return 16;
	if (forceColor === '2') return 256;
	if (forceColor === '3') return 'truecolor';

	return null;
}

/**
 * Check for truecolor environment indicators.
 */
function checkTruecolorEnv(): boolean {
	const colorterm = getEnv('COLORTERM');
	if (colorterm === 'truecolor' || colorterm === '24bit') return true;

	// Modern terminals that support truecolor
	if (isITerm2() || isKitty() || isAlacritty() || isWindowsTerminal() || isHyper()) {
		return true;
	}

	// VTE 0.36+ supports truecolor
	const vteVersion = getEnv('VTE_VERSION');
	if (vteVersion) {
		const version = Number.parseInt(vteVersion, 10);
		if (version >= 3600) return true;
	}

	return false;
}

/**
 * Detect color support from TERM variable.
 */
function checkTermColorSupport(): ColorSupport | null {
	const term = getEnv('TERM') ?? '';

	if (term.includes('256color') || term.includes('256-color')) return 256;
	if (term.includes('color') || term.includes('ansi')) return 16;
	if (term.startsWith('xterm') || term.startsWith('screen') || term.startsWith('vt100')) return 256;

	return null;
}

/**
 * Detect color support level.
 *
 * @returns Color support level (2, 16, 256, or 'truecolor')
 *
 * @example
 * ```typescript
 * const colors = getColorDepth();
 * if (colors === 'truecolor') {
 *   // Use full RGB colors
 * }
 * ```
 */
export function getColorDepth(): ColorSupport {
	// Check for forced color settings first
	const forced = checkForcedColor();
	if (forced !== null) return forced;

	// Check for truecolor support
	if (checkTruecolorEnv()) return 'truecolor';

	// Check TERM for color hints
	const termColor = checkTermColorSupport();
	if (termColor !== null) return termColor;

	// TTY gets 16 colors, non-TTY gets no color
	return isTTY() ? 16 : 2;
}

/**
 * Check if color is supported (more than 2 colors).
 *
 * @returns true if color is supported
 *
 * @example
 * ```typescript
 * if (isColorSupported()) {
 *   // Use colored output
 * }
 * ```
 */
export function isColorSupported(): boolean {
	return getColorDepth() !== 2;
}

/**
 * Check if truecolor (24-bit) is supported.
 *
 * @returns true if truecolor is supported
 */
export function isTrueColorSupported(): boolean {
	return getColorDepth() === 'truecolor';
}

/**
 * Detect Unicode support.
 *
 * @returns true if Unicode is likely supported
 */
export function isUnicodeSupported(): boolean {
	// Check LANG and LC_ALL for UTF-8
	const lang = getEnv('LANG') ?? '';
	const lcAll = getEnv('LC_ALL') ?? '';

	if (
		lang.includes('UTF-8') ||
		lang.includes('utf8') ||
		lcAll.includes('UTF-8') ||
		lcAll.includes('utf8')
	) {
		return true;
	}

	// Modern terminals generally support Unicode
	if (isITerm2() || isKitty() || isAlacritty() || isWindowsTerminal() || isVSCode()) {
		return true;
	}

	// Check TERM for hints
	const term = getEnv('TERM') ?? '';
	if (term.includes('utf') || term.includes('unicode')) {
		return true;
	}

	// Default to true for TTYs (most modern systems support UTF-8)
	return isTTY();
}

/**
 * Detect mouse support.
 * Most modern terminals support mouse tracking.
 *
 * @returns true if mouse is likely supported
 */
export function isMouseSupported(): boolean {
	// Known terminals with mouse support
	if (isXterm() || isVTE() || isITerm2() || isKitty() || isAlacritty() || isWindowsTerminal()) {
		return true;
	}

	// tmux and screen pass through mouse events
	if (isTmux() || isScreen()) {
		return true;
	}

	// Check TERM for mouse-capable values
	const term = getEnv('TERM') ?? '';
	if (term.includes('xterm') || term.includes('256color')) {
		return true;
	}

	// Only return true if actually in a TTY
	return isTTY();
}

/**
 * Detect bracketed paste support.
 *
 * @returns true if bracketed paste is likely supported
 */
export function isBracketedPasteSupported(): boolean {
	// Known terminals with bracketed paste support
	if (isXterm() || isVTE() || isITerm2() || isKitty() || isAlacritty() || isWindowsTerminal()) {
		return true;
	}

	// Only return true if actually in a TTY
	return isTTY();
}

/**
 * Get terminal version if available.
 *
 * @returns Version string or undefined
 */
export function getTerminalVersion(): string | undefined {
	// VTE version
	const vteVersion = getEnv('VTE_VERSION');
	if (vteVersion) {
		// VTE version is MAJOR * 10000 + MINOR * 100 + MICRO
		const v = Number.parseInt(vteVersion, 10);
		const major = Math.floor(v / 10000);
		const minor = Math.floor((v % 10000) / 100);
		const micro = v % 100;
		return `${major}.${minor}.${micro}`;
	}

	// iTerm2 version
	const itermVersion = getEnv('TERM_PROGRAM_VERSION');
	if (itermVersion && isITerm2()) {
		return itermVersion;
	}

	return undefined;
}

/**
 * Detect terminal information.
 *
 * @returns Complete terminal information object
 *
 * @example
 * ```typescript
 * const info = getTerminalInfo();
 * console.log(`Terminal: ${info.name}`);
 * console.log(`Colors: ${info.colorSupport}`);
 * ```
 */
export function getTerminalInfo(): TerminalInfo {
	const dims = getDimensions();

	return {
		name: detectTerminalName(),
		version: getTerminalVersion(),
		colorSupport: getColorDepth(),
		unicodeSupport: isUnicodeSupported(),
		mouseSupport: isMouseSupported(),
		bracketedPaste: isBracketedPasteSupported(),
		tmux: isTmux(),
		screen: isScreen(),
		vscode: isVSCode(),
		cols: dims.cols,
		rows: dims.rows,
	};
}
