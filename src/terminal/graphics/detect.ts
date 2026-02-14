/**
 * Terminal Graphics Capability Detection
 *
 * Detects which graphics protocols are supported by the current terminal
 * based on environment variables and terminal type detection.
 *
 * @module terminal/graphics/detect
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Environment variable checker interface for testability.
 *
 * @example
 * ```typescript
 * import type { EnvChecker } from 'blecsd';
 *
 * const checker: EnvChecker = {
 *   getEnv: (name) => process.env[name],
 * };
 * ```
 */
export interface EnvChecker {
	readonly getEnv: (name: string) => string | undefined;
}

/**
 * Graphics detection result indicating which protocols are likely supported.
 *
 * @example
 * ```typescript
 * import type { GraphicsDetectionResult } from 'blecsd';
 *
 * const result: GraphicsDetectionResult = {
 *   kitty: true,
 *   iterm2: false,
 *   sixel: false,
 *   ansi: true,
 *   braille: true,
 * };
 * ```
 */
export interface GraphicsDetectionResult {
	/** Kitty graphics protocol support */
	readonly kitty: boolean;
	/** iTerm2 inline images support */
	readonly iterm2: boolean;
	/** Sixel graphics support */
	readonly sixel: boolean;
	/** ANSI color block rendering (256-color fallback) */
	readonly ansi: boolean;
	/** Braille pattern rendering (universal fallback) */
	readonly braille: boolean;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for GraphicsDetectionResult.
 *
 * @example
 * ```typescript
 * import { GraphicsDetectionResultSchema } from 'blecsd';
 *
 * const result = GraphicsDetectionResultSchema.safeParse({
 *   kitty: true,
 *   iterm2: false,
 *   sixel: false,
 *   ansi: true,
 *   braille: true,
 * });
 * ```
 */
export const GraphicsDetectionResultSchema = z.object({
	kitty: z.boolean(),
	iterm2: z.boolean(),
	sixel: z.boolean(),
	ansi: z.boolean(),
	braille: z.boolean(),
});

// =============================================================================
// DEFAULT ENVIRONMENT CHECKER
// =============================================================================

/**
 * Default environment checker using process.env.
 */
const defaultEnvChecker: EnvChecker = {
	getEnv: (name: string) => process.env[name],
};

// =============================================================================
// PROTOCOL DETECTION
// =============================================================================

/**
 * Detects Kitty graphics protocol support.
 *
 * Kitty sets TERM=xterm-kitty or TERM_PROGRAM=kitty, or KITTY_WINDOW_ID is set.
 *
 * @param env - Environment checker
 * @returns true if Kitty graphics are likely supported
 *
 * @example
 * ```typescript
 * import { detectKittySupport } from 'blecsd';
 *
 * if (detectKittySupport()) {
 *   console.log('Kitty graphics protocol available');
 * }
 * ```
 */
export function detectKittySupport(env: EnvChecker = defaultEnvChecker): boolean {
	const term = env.getEnv('TERM') ?? '';
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const kittyWindowId = env.getEnv('KITTY_WINDOW_ID') ?? '';

	// Kitty sets TERM=xterm-kitty
	if (term === 'xterm-kitty') return true;
	// Also check TERM_PROGRAM
	if (termProgram === 'kitty') return true;
	// KITTY_WINDOW_ID is set when running in Kitty
	if (kittyWindowId !== '') return true;

	return false;
}

/**
 * Detects iTerm2 inline images support.
 *
 * iTerm2 sets TERM_PROGRAM=iTerm.app or LC_TERMINAL=iTerm2.
 * Also supported by WezTerm and mintty.
 *
 * @param env - Environment checker
 * @returns true if iTerm2 inline images are likely supported
 *
 * @example
 * ```typescript
 * import { detectITerm2Support } from 'blecsd';
 *
 * if (detectITerm2Support()) {
 *   console.log('iTerm2 inline images available');
 * }
 * ```
 */
export function detectITerm2Support(env: EnvChecker = defaultEnvChecker): boolean {
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const lcTerminal = env.getEnv('LC_TERMINAL') ?? '';

	const iterm2Programs = ['iTerm.app', 'WezTerm', 'mintty'];
	return iterm2Programs.some((p) => termProgram === p || lcTerminal === p);
}

/**
 * Detects Sixel graphics support.
 *
 * Terminals known to support sixel:
 * - xterm with sixel enabled (XTERM_VERSION set)
 * - mlterm
 * - foot
 * - contour
 * - WezTerm
 * - TERM containing "sixel"
 *
 * @param env - Environment checker
 * @returns true if Sixel graphics are likely supported
 *
 * @example
 * ```typescript
 * import { detectSixelSupport } from 'blecsd';
 *
 * if (detectSixelSupport()) {
 *   console.log('Sixel graphics available');
 * }
 * ```
 */
export function detectSixelSupport(env: EnvChecker = defaultEnvChecker): boolean {
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const term = env.getEnv('TERM') ?? '';
	const xtermVersion = env.getEnv('XTERM_VERSION') ?? '';

	// xterm with sixel support (usually started with -ti vt340)
	if (termProgram === 'xterm' && xtermVersion !== '') return true;

	// Terminals known to support sixel
	const sixelPrograms = ['mlterm', 'foot', 'contour', 'WezTerm'];
	if (sixelPrograms.some((p) => termProgram === p)) return true;

	// TERM hints
	if (term.includes('sixel') || term === 'mlterm') return true;

	return false;
}

/**
 * Detects ANSI color block rendering support (256-color fallback).
 *
 * ANSI rendering is supported if the terminal has 256-color support.
 * This is a fallback for terminals that don't support native image protocols.
 *
 * @param env - Environment checker
 * @returns true if ANSI rendering is supported
 *
 * @example
 * ```typescript
 * import { detectAnsiSupport } from 'blecsd';
 *
 * if (detectAnsiSupport()) {
 *   console.log('ANSI color block rendering available');
 * }
 * ```
 */
export function detectAnsiSupport(env: EnvChecker = defaultEnvChecker): boolean {
	// Check for NO_COLOR environment variable
	if (env.getEnv('NO_COLOR') !== undefined) return false;

	// Check TERM for 256-color support
	const term = env.getEnv('TERM') ?? '';
	if (term.includes('256color') || term.includes('256-color')) return true;

	// Modern terminals typically support 256 colors
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const modernTerminals = ['iTerm.app', 'kitty', 'WezTerm', 'Alacritty', 'vscode'];
	if (modernTerminals.some((t) => termProgram === t)) return true;

	// xterm and screen derivatives usually support 256 colors
	if (term.startsWith('xterm') || term.startsWith('screen')) return true;

	return false;
}

/**
 * Detects braille pattern rendering support.
 *
 * Braille rendering requires Unicode support. This is the most universal
 * fallback and works in almost all modern terminals.
 *
 * @param env - Environment checker
 * @returns true if braille rendering is supported
 *
 * @example
 * ```typescript
 * import { detectBrailleSupport } from 'blecsd';
 *
 * if (detectBrailleSupport()) {
 *   console.log('Braille pattern rendering available');
 * }
 * ```
 */
export function detectBrailleSupport(env: EnvChecker = defaultEnvChecker): boolean {
	// Check LANG and LC_ALL for UTF-8
	const lang = env.getEnv('LANG') ?? '';
	const lcAll = env.getEnv('LC_ALL') ?? '';

	if (
		lang.includes('UTF-8') ||
		lang.includes('utf8') ||
		lcAll.includes('UTF-8') ||
		lcAll.includes('utf8')
	) {
		return true;
	}

	// Modern terminals generally support Unicode
	const termProgram = env.getEnv('TERM_PROGRAM') ?? '';
	const unicodeTerminals = ['iTerm.app', 'kitty', 'WezTerm', 'Alacritty', 'vscode'];
	if (unicodeTerminals.some((t) => termProgram === t)) return true;

	// Check TERM for hints
	const term = env.getEnv('TERM') ?? '';
	if (term.includes('utf') || term.includes('unicode')) return true;

	// Default to true (most modern systems support UTF-8)
	return true;
}

// =============================================================================
// COMBINED DETECTION
// =============================================================================

/**
 * Detects all graphics capabilities of the current terminal.
 *
 * This function runs all protocol detection checks and returns a summary
 * of which graphics backends are likely supported.
 *
 * @param env - Optional environment checker for testing
 * @returns Detection results for all graphics protocols
 *
 * @example
 * ```typescript
 * import { detectGraphicsSupport } from 'blecsd';
 *
 * const support = detectGraphicsSupport();
 * console.log('Graphics support:', support);
 *
 * if (support.kitty) {
 *   // Use Kitty graphics protocol
 * } else if (support.iterm2) {
 *   // Use iTerm2 inline images
 * } else if (support.sixel) {
 *   // Use Sixel graphics
 * } else if (support.ansi) {
 *   // Use ANSI color blocks
 * } else if (support.braille) {
 *   // Use braille patterns
 * }
 * ```
 */
export function detectGraphicsSupport(
	env: EnvChecker = defaultEnvChecker,
): GraphicsDetectionResult {
	return {
		kitty: detectKittySupport(env),
		iterm2: detectITerm2Support(env),
		sixel: detectSixelSupport(env),
		ansi: detectAnsiSupport(env),
		braille: detectBrailleSupport(env),
	};
}

/**
 * Returns the best available graphics backend name based on detection.
 *
 * Preference order: kitty > iterm2 > sixel > ansi > braille
 *
 * @param env - Optional environment checker for testing
 * @returns The name of the best available backend
 *
 * @example
 * ```typescript
 * import { getBestBackendName } from 'blecsd';
 *
 * const backend = getBestBackendName();
 * console.log(`Best graphics backend: ${backend}`);
 * ```
 */
export function getBestBackendName(env: EnvChecker = defaultEnvChecker): string {
	const support = detectGraphicsSupport(env);

	if (support.kitty) return 'kitty';
	if (support.iterm2) return 'iterm2';
	if (support.sixel) return 'sixel';
	if (support.ansi) return 'ansi';
	if (support.braille) return 'braille';

	// Should never happen, but fallback to braille
	return 'braille';
}
