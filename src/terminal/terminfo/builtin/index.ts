/**
 * Builtin terminfo data for common terminals.
 *
 * Provides hardcoded terminal capabilities when terminfo database files
 * are not available on the system. This ensures the library can function
 * on minimal systems without terminfo installed.
 *
 * @module terminal/terminfo/builtin
 *
 * @example
 * ```typescript
 * import { getBuiltinTerminfo, BUILTIN_TERMINALS } from 'blecsd';
 *
 * // Get terminfo for a specific terminal
 * const data = getBuiltinTerminfo('xterm-256color');
 *
 * // Check if a terminal has builtin data
 * if (BUILTIN_TERMINALS.has('screen-256color')) {
 *   console.log('screen-256color has builtin support');
 * }
 *
 * // List all supported terminals
 * for (const name of BUILTIN_TERMINALS.keys()) {
 *   console.log(name);
 * }
 * ```
 */

import type { TerminfoData } from '../tput';
import { LINUX } from './linux';
import { SCREEN, SCREEN_256COLOR, TMUX, TMUX_256COLOR } from './screen';
import { VT100, VT220 } from './vt100';
import { XTERM, XTERM_16COLOR, XTERM_256COLOR } from './xterm';

// Re-export individual terminal definitions
export { XTERM, XTERM_16COLOR, XTERM_256COLOR } from './xterm';
export { VT100, VT220 } from './vt100';
export { SCREEN, SCREEN_256COLOR, TMUX, TMUX_256COLOR } from './screen';
export { LINUX } from './linux';

/**
 * Map of terminal names to their builtin terminfo data.
 *
 * Includes common terminal types:
 * - xterm variants (xterm, xterm-16color, xterm-256color)
 * - VT100/VT220 for basic compatibility
 * - GNU Screen variants
 * - tmux variants
 * - Linux console
 *
 * @example
 * ```typescript
 * const data = BUILTIN_TERMINALS.get('xterm-256color');
 * if (data) {
 *   const tput = createTput({ data });
 *   // Use tput...
 * }
 * ```
 */
export const BUILTIN_TERMINALS: ReadonlyMap<string, TerminfoData> = new Map<string, TerminfoData>([
	// xterm family
	['xterm', XTERM],
	['xterm-16color', XTERM_16COLOR],
	['xterm-256color', XTERM_256COLOR],
	['xterm-direct', XTERM_256COLOR], // Direct color uses 256color as base
	['xterm-kitty', XTERM_256COLOR], // Kitty is xterm-compatible

	// VT100 family
	['vt100', VT100],
	['vt100-am', VT100],
	['vt102', VT100],
	['vt220', VT220],
	['vt200', VT220],

	// GNU Screen
	['screen', SCREEN],
	['screen-256color', SCREEN_256COLOR],
	['screen-256color-bce', SCREEN_256COLOR],

	// tmux
	['tmux', TMUX],
	['tmux-256color', TMUX_256COLOR],

	// Linux console
	['linux', LINUX],
	['linux-c', LINUX],
	['con80x25', LINUX],

	// Common aliases
	['ansi', VT100], // ANSI terminals are VT100-compatible
	['dumb', VT100], // Dumb terminal, minimal support
	['rxvt', XTERM], // rxvt is xterm-compatible
	['rxvt-unicode', XTERM_256COLOR],
	['rxvt-unicode-256color', XTERM_256COLOR],
	['konsole', XTERM_256COLOR], // KDE Konsole
	['konsole-256color', XTERM_256COLOR],
	['gnome', XTERM_256COLOR], // GNOME Terminal
	['gnome-256color', XTERM_256COLOR],
	['putty', XTERM_256COLOR], // PuTTY
	['putty-256color', XTERM_256COLOR],
	['iterm', XTERM_256COLOR], // iTerm2
	['iterm2', XTERM_256COLOR],
	['alacritty', XTERM_256COLOR], // Alacritty
	['wezterm', XTERM_256COLOR], // WezTerm
]);

/**
 * Gets builtin terminfo data for a terminal name.
 *
 * @param terminal - Terminal name (e.g., 'xterm-256color')
 * @returns TerminfoData or null if not found
 *
 * @example
 * ```typescript
 * import { getBuiltinTerminfo } from 'blecsd';
 *
 * const data = getBuiltinTerminfo('xterm-256color');
 * if (data) {
 *   console.log(`${data.name} supports ${data.numbers.max_colors} colors`);
 * }
 * ```
 */
export function getBuiltinTerminfo(terminal: string): TerminfoData | null {
	return BUILTIN_TERMINALS.get(terminal) ?? null;
}

/**
 * Checks if builtin terminfo data exists for a terminal.
 *
 * @param terminal - Terminal name to check
 * @returns true if builtin data exists
 *
 * @example
 * ```typescript
 * import { hasBuiltinTerminfo } from 'blecsd';
 *
 * if (hasBuiltinTerminfo(process.env.TERM ?? '')) {
 *   console.log('Builtin fallback available');
 * }
 * ```
 */
export function hasBuiltinTerminfo(terminal: string): boolean {
	return BUILTIN_TERMINALS.has(terminal);
}

/**
 * Gets the best matching builtin terminfo for a terminal name.
 *
 * Tries exact match first, then falls back to base terminal type
 * (e.g., 'xterm-256color-italic' would match 'xterm-256color').
 *
 * @param terminal - Terminal name
 * @returns Best matching TerminfoData or xterm-256color as ultimate fallback
 *
 * @example
 * ```typescript
 * import { getBestBuiltinTerminfo } from 'blecsd';
 *
 * // Will find xterm-256color even for variants
 * const data = getBestBuiltinTerminfo('xterm-256color-italic');
 * ```
 */
export function getBestBuiltinTerminfo(terminal: string): TerminfoData {
	// Try exact match
	const exact = BUILTIN_TERMINALS.get(terminal);
	if (exact) {
		return exact;
	}

	// Try without suffix (e.g., 'xterm-256color-italic' -> 'xterm-256color')
	const parts = terminal.split('-');
	while (parts.length > 1) {
		parts.pop();
		const partial = parts.join('-');
		const match = BUILTIN_TERMINALS.get(partial);
		if (match) {
			return match;
		}
	}

	// Try base name only (e.g., 'xterm-256color' -> 'xterm')
	const baseName = parts[0];
	if (baseName) {
		const base = BUILTIN_TERMINALS.get(baseName);
		if (base) {
			return base;
		}
	}

	// Ultimate fallback: xterm-256color
	return XTERM_256COLOR;
}

/**
 * Lists all supported builtin terminal names.
 *
 * @returns Array of terminal names
 *
 * @example
 * ```typescript
 * import { listBuiltinTerminals } from 'blecsd';
 *
 * console.log('Supported terminals:');
 * for (const name of listBuiltinTerminals()) {
 *   console.log(`  ${name}`);
 * }
 * ```
 */
export function listBuiltinTerminals(): readonly string[] {
	return [...BUILTIN_TERMINALS.keys()];
}
