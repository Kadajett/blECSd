/**
 * Escape Sequence Injection Prevention
 *
 * Sanitizes untrusted input to prevent terminal escape sequence injection.
 * Essential for displaying user-provided content in terminal applications.
 *
 * @module terminal/security/sanitize
 * @internal This module is internal and not exported from the main package.
 */

import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Options for sanitizing terminal input.
 */
export interface SanitizeOptions {
	/**
	 * Allow SGR (color/style) escape sequences.
	 * Default: false
	 */
	allowColors?: boolean;

	/**
	 * Allow cursor movement sequences.
	 * Default: false
	 */
	allowCursor?: boolean;

	/**
	 * Strip ALL escape sequences regardless of other options.
	 * Takes precedence over allowColors and allowCursor.
	 * Default: true
	 */
	stripAllEscapes?: boolean;

	/**
	 * Replace stripped sequences with a placeholder character.
	 * Default: '' (remove entirely)
	 */
	replacementChar?: string;
}

/**
 * Zod schema for SanitizeOptions validation.
 */
export const SanitizeOptionsSchema = z.object({
	allowColors: z.boolean().optional(),
	allowCursor: z.boolean().optional(),
	stripAllEscapes: z.boolean().optional(),
	replacementChar: z.string().max(1).optional(),
});

/**
 * Default sanitization options (most restrictive).
 */
export const DEFAULT_SANITIZE_OPTIONS: Required<SanitizeOptions> = {
	allowColors: false,
	allowCursor: false,
	stripAllEscapes: true,
	replacementChar: '',
};

// =============================================================================
// ESCAPE SEQUENCE PATTERNS
// =============================================================================

/** ESC character (0x1B) */
const ESC = '\x1b';

/**
 * Pattern to match CSI sequences: ESC [ ... (parameters and command)
 * CSI format: ESC [ <params> <intermediate> <final>
 * Final byte is in range 0x40-0x7E
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const CSI_PATTERN = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;

/**
 * Pattern to match SGR (color/style) sequences specifically.
 * SGR format: ESC [ <params> m
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const SGR_PATTERN = /\x1b\[[\d;]*m/g;

/**
 * Pattern to match cursor movement sequences.
 * Cursor commands: A (up), B (down), C (forward), D (back), E (next line),
 * F (prev line), G (column), H (position), f (position), J (erase display),
 * K (erase line), L (insert line), M (delete line), S (scroll up), T (scroll down),
 * s (save cursor), u (restore cursor)
 * NOTE: Does NOT include lowercase 'm' which is SGR (color/style).
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const CURSOR_PATTERN = /\x1b\[[\d;]*[ABCDEFGHJKLMSTfsu]/g;

/**
 * Pattern to test if a string is a cursor sequence (non-global, for use in callbacks).
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const CURSOR_TEST_PATTERN = /^\x1b\[[\d;]*[ABCDEFGHJKLMSTfsu]$/;

/**
 * Pattern to match SGR sequences specifically (for allowColors check).
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const SGR_INLINE_PATTERN = /^\x1b\[[\d;]*m$/;

/**
 * Pattern to match OSC sequences: ESC ] ... (BEL or ST)
 * OSC format: ESC ] <data> (BEL or ESC \)
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC and BEL characters are intentional
const OSC_PATTERN = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/**
 * Pattern to match DCS sequences: ESC P ... ST
 * DCS format: ESC P <data> ESC \
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const DCS_PATTERN = /\x1bP[^\x1b]*\x1b\\/g;

/**
 * Pattern to match APC sequences: ESC _ ... ST
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const APC_PATTERN = /\x1b_[^\x1b]*\x1b\\/g;

/**
 * Pattern to match SOS sequences: ESC X ... ST
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const SOS_PATTERN = /\x1bX[^\x1b]*\x1b\\/g;

/**
 * Pattern to match PM sequences: ESC ^ ... ST
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const PM_PATTERN = /\x1b\^[^\x1b]*\x1b\\/g;

/**
 * Pattern to match any escape sequence (most aggressive).
 * Matches ESC followed by sequence-starting characters.
 * - CSI sequences: ESC [ ... final_byte
 * - OSC sequences: ESC ] ... (BEL or ST)
 * - DCS/APC/SOS/PM sequences: ESC P/X/_/^ ... ST
 * - Known single-char sequences: ESC followed by specific chars (7, 8, D, E, H, M, etc.)
 * NOTE: Does NOT match raw ESC + unknown char (use RAW_ESC_PATTERN for that)
 */
const ALL_ESCAPE_PATTERN =
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC and BEL characters are intentional
	/\x1b(?:\[[^\x1b]*?[\x40-\x7e]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[PX_^][^\x1b]*\x1b\\|[78DEHMNOZ=>cnol|}~])/g;

/**
 * Pattern to match raw ESC characters that aren't part of a sequence.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional
const RAW_ESC_PATTERN = /\x1b(?![[\]PX_^])/g;

// =============================================================================
// CONTROL CHARACTER FILTERING
// =============================================================================

/**
 * Pattern to match dangerous control characters (for replace operations).
 * These can cause terminal issues even without ESC.
 * - 0x00-0x08: Various control chars
 * - 0x0B-0x0C: Vertical tab, form feed
 * - 0x0E-0x1A: Various control chars
 * - 0x7F: DEL
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: Control characters are intentional
const DANGEROUS_CONTROL_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1a\x7f]/g;

/**
 * Pattern to detect dangerous control characters (for testing, no global flag).
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: Control characters are intentional
const DANGEROUS_CONTROL_TEST_PATTERN = /[\x00-\x08\x0b\x0c\x0e-\x1a\x7f]/;

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize a string for safe terminal output.
 *
 * Removes or filters escape sequences that could be used for injection attacks.
 * Use this when displaying user-provided content in terminal applications.
 *
 * @param input - Untrusted input string
 * @param options - Sanitization options
 * @returns Sanitized string safe for terminal output
 *
 * @example
 * ```typescript
 * // Strip all escape sequences (safest)
 * const safe = sanitizeForTerminal(userInput);
 *
 * // Allow color codes only
 * const colored = sanitizeForTerminal(userInput, { allowColors: true });
 * ```
 */
export function sanitizeForTerminal(input: string, options: SanitizeOptions = {}): string {
	const opts = { ...DEFAULT_SANITIZE_OPTIONS, ...options };
	const replacement = opts.replacementChar;

	let result = input;

	// If stripAllEscapes is true, remove all escape sequences first
	// (before removing control characters, since BEL is used as OSC terminator)
	if (opts.stripAllEscapes) {
		result = result.replace(ALL_ESCAPE_PATTERN, replacement);
		// Also catch any raw ESC characters
		result = result.replace(RAW_ESC_PATTERN, replacement);
		// Now remove dangerous control characters
		result = result.replace(DANGEROUS_CONTROL_PATTERN, replacement);
		return result;
	}

	// For selective stripping:
	// First strip dangerous sequences (OSC, DCS, APC, SOS, PM) BEFORE
	// removing control characters, since BEL is used as OSC terminator
	result = result.replace(OSC_PATTERN, replacement);
	result = result.replace(DCS_PATTERN, replacement);
	result = result.replace(APC_PATTERN, replacement);
	result = result.replace(SOS_PATTERN, replacement);
	result = result.replace(PM_PATTERN, replacement);

	// Now remove dangerous control characters
	result = result.replace(DANGEROUS_CONTROL_PATTERN, replacement);

	// Strip cursor movement if not allowed
	if (!opts.allowCursor) {
		result = result.replace(CURSOR_PATTERN, replacement);
	}

	// Strip color codes if not allowed
	if (!opts.allowColors) {
		result = result.replace(SGR_PATTERN, replacement);
	}

	// Strip any remaining CSI sequences
	result = result.replace(CSI_PATTERN, (match) => {
		// If colors are allowed, preserve SGR sequences
		if (opts.allowColors && SGR_INLINE_PATTERN.test(match)) {
			return match;
		}
		// If cursor is allowed, preserve cursor sequences
		// Use non-global pattern for testing to avoid lastIndex issues
		if (opts.allowCursor && CURSOR_TEST_PATTERN.test(match)) {
			return match;
		}
		return replacement;
	});

	// Catch any raw ESC characters
	result = result.replace(RAW_ESC_PATTERN, replacement);

	return result;
}

/**
 * Check if a string contains any escape sequences.
 *
 * @param input - String to check
 * @returns true if string contains escape sequences
 *
 * @example
 * ```typescript
 * if (containsEscapeSequences(userInput)) {
 *   console.warn('Input contains escape sequences');
 * }
 * ```
 */
export function containsEscapeSequences(input: string): boolean {
	return input.includes(ESC) || DANGEROUS_CONTROL_TEST_PATTERN.test(input);
}

/**
 * Check if a string is safe for terminal output.
 *
 * @param input - String to check
 * @returns true if string is safe
 */
export function isSafeForTerminal(input: string): boolean {
	return !containsEscapeSequences(input);
}

// =============================================================================
// SAFE STRING BUILDER
// =============================================================================

/**
 * Safe string builder for combining trusted and untrusted content.
 *
 * Use this when building terminal output that includes user-provided data.
 * Trusted content is passed through unchanged, while untrusted content
 * is automatically sanitized.
 *
 * @example
 * ```typescript
 * const builder = new SafeStringBuilder();
 * builder
 *   .append('\x1b[1m')           // Trusted: bold on
 *   .appendUntrusted(userName)   // Sanitized user input
 *   .append('\x1b[0m')           // Trusted: reset
 *   .append(': ')
 *   .appendUntrusted(message);   // Sanitized message
 *
 * process.stdout.write(builder.toString());
 * ```
 */
export class SafeStringBuilder {
	private parts: string[] = [];
	private defaultOptions: SanitizeOptions;

	/**
	 * Create a new SafeStringBuilder.
	 *
	 * @param defaultOptions - Default sanitization options for untrusted content
	 */
	constructor(defaultOptions: SanitizeOptions = {}) {
		this.defaultOptions = { ...DEFAULT_SANITIZE_OPTIONS, ...defaultOptions };
	}

	/**
	 * Append trusted content (no sanitization).
	 *
	 * Only use this for content you control, such as escape sequences
	 * you generate programmatically.
	 *
	 * @param trusted - Trusted content to append
	 * @returns this for chaining
	 */
	append(trusted: string): this {
		this.parts.push(trusted);
		return this;
	}

	/**
	 * Append untrusted content (sanitized).
	 *
	 * Use this for any user-provided or external content.
	 *
	 * @param untrusted - Untrusted content to sanitize and append
	 * @param options - Override default sanitization options
	 * @returns this for chaining
	 */
	appendUntrusted(untrusted: string, options?: SanitizeOptions): this {
		const opts = options ? { ...this.defaultOptions, ...options } : this.defaultOptions;
		this.parts.push(sanitizeForTerminal(untrusted, opts));
		return this;
	}

	/**
	 * Clear the builder.
	 *
	 * @returns this for chaining
	 */
	clear(): this {
		this.parts = [];
		return this;
	}

	/**
	 * Get the combined string.
	 *
	 * @returns Combined string with trusted and sanitized content
	 */
	toString(): string {
		return this.parts.join('');
	}

	/**
	 * Get the current length of the combined string.
	 */
	get length(): number {
		return this.parts.reduce((sum, part) => sum + part.length, 0);
	}
}

// =============================================================================
// ESCAPE SEQUENCE EXTRACTION
// =============================================================================

/**
 * Extract all escape sequences from a string.
 *
 * Useful for analyzing or logging what sequences were removed.
 *
 * @param input - String to extract from
 * @returns Array of found escape sequences
 *
 * @example
 * ```typescript
 * const sequences = extractEscapeSequences(suspiciousInput);
 * console.log('Found sequences:', sequences);
 * ```
 */
export function extractEscapeSequences(input: string): string[] {
	const sequences: string[] = [];

	// Extract CSI sequences
	const csi = new RegExp(CSI_PATTERN.source, 'g');
	for (const m of input.matchAll(csi)) {
		sequences.push(m[0]);
	}

	// Extract OSC sequences
	const osc = new RegExp(OSC_PATTERN.source, 'g');
	for (const m of input.matchAll(osc)) {
		sequences.push(m[0]);
	}

	// Extract DCS sequences
	const dcs = new RegExp(DCS_PATTERN.source, 'g');
	for (const m of input.matchAll(dcs)) {
		sequences.push(m[0]);
	}

	// Extract APC sequences
	const apc = new RegExp(APC_PATTERN.source, 'g');
	for (const m of input.matchAll(apc)) {
		sequences.push(m[0]);
	}

	// Extract SOS sequences
	const sos = new RegExp(SOS_PATTERN.source, 'g');
	for (const m of input.matchAll(sos)) {
		sequences.push(m[0]);
	}

	// Extract PM sequences
	const pm = new RegExp(PM_PATTERN.source, 'g');
	for (const m of input.matchAll(pm)) {
		sequences.push(m[0]);
	}

	return sequences;
}

/**
 * Categorize escape sequences by type.
 *
 * @param input - String to analyze
 * @returns Object with sequences categorized by type
 */
export function categorizeEscapeSequences(input: string): {
	csi: string[];
	osc: string[];
	dcs: string[];
	apc: string[];
	sos: string[];
	pm: string[];
	other: string[];
} {
	const result = {
		csi: [] as string[],
		osc: [] as string[],
		dcs: [] as string[],
		apc: [] as string[],
		sos: [] as string[],
		pm: [] as string[],
		other: [] as string[],
	};

	// CSI
	for (const m of input.matchAll(new RegExp(CSI_PATTERN.source, 'g'))) {
		result.csi.push(m[0]);
	}

	// OSC
	for (const m of input.matchAll(new RegExp(OSC_PATTERN.source, 'g'))) {
		result.osc.push(m[0]);
	}

	// DCS
	for (const m of input.matchAll(new RegExp(DCS_PATTERN.source, 'g'))) {
		result.dcs.push(m[0]);
	}

	// APC
	for (const m of input.matchAll(new RegExp(APC_PATTERN.source, 'g'))) {
		result.apc.push(m[0]);
	}

	// SOS
	for (const m of input.matchAll(new RegExp(SOS_PATTERN.source, 'g'))) {
		result.sos.push(m[0]);
	}

	// PM
	for (const m of input.matchAll(new RegExp(PM_PATTERN.source, 'g'))) {
		result.pm.push(m[0]);
	}

	return result;
}
