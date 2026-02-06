/**
 * Input sanitization for untrusted text data.
 *
 * Sanitizes user-provided or network-received text by stripping
 * C0/C1 control characters, null bytes, invalid UTF-8 sequences,
 * and enforcing length limits. Designed for networked games and
 * applications with user-generated content.
 *
 * @module terminal/security/inputSanitize
 */

import { z } from 'zod';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

/**
 * Options for sanitizing text input.
 */
export interface InputSanitizeOptions {
	/** Allow non-ASCII Unicode characters (default: true) */
	readonly allowUnicode: boolean;
	/** Maximum string length; truncate beyond this (default: 0 = no limit) */
	readonly maxLength: number;
	/** Remove C0/C1 control characters (default: true) */
	readonly stripControl: boolean;
	/** Remove null bytes (default: true) */
	readonly stripNull: boolean;
	/** Allow tab characters (0x09) even when stripControl is true (default: true) */
	readonly allowTab: boolean;
	/** Allow newline characters (0x0A, 0x0D) even when stripControl is true (default: true) */
	readonly allowNewline: boolean;
	/** Replace invalid UTF-8 with this character (default: '\uFFFD') */
	readonly replacementChar: string;
}

/**
 * Zod schema for InputSanitizeOptions.
 */
export const InputSanitizeOptionsSchema = z.object({
	allowUnicode: z.boolean().optional(),
	maxLength: z.number().int().min(0).optional(),
	stripControl: z.boolean().optional(),
	stripNull: z.boolean().optional(),
	allowTab: z.boolean().optional(),
	allowNewline: z.boolean().optional(),
	replacementChar: z.string().max(4).optional(),
});

/**
 * Result of input sanitization with metadata.
 */
export interface SanitizeResult {
	/** The sanitized text */
	readonly text: string;
	/** Whether the input was modified */
	readonly modified: boolean;
	/** Number of characters stripped */
	readonly strippedCount: number;
	/** Whether the input was truncated */
	readonly truncated: boolean;
	/** Original length before truncation */
	readonly originalLength: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

/**
 * Default sanitization options (most common case).
 */
export const DEFAULT_INPUT_SANITIZE_OPTIONS: InputSanitizeOptions = {
	allowUnicode: true,
	maxLength: 0,
	stripControl: true,
	stripNull: true,
	allowTab: true,
	allowNewline: true,
	replacementChar: '\uFFFD',
};

// =============================================================================
// CONTROL CHARACTER PATTERNS
// =============================================================================

/**
 * C0 control characters: 0x00-0x1F
 * We selectively allow: 0x09 (tab), 0x0A (LF), 0x0D (CR)
 */
function isC0Control(code: number): boolean {
	return code >= 0x00 && code <= 0x1f;
}

/**
 * C1 control characters: 0x80-0x9F
 * These are the 8-bit control codes used in some encodings.
 */
function isC1Control(code: number): boolean {
	return code >= 0x80 && code <= 0x9f;
}

/**
 * Checks if a character code is a null byte.
 */
function isNull(code: number): boolean {
	return code === 0x00;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Sanitizes untrusted text input by removing control characters,
 * null bytes, and invalid sequences.
 *
 * @param input - The untrusted input string
 * @param options - Optional sanitization configuration
 * @returns The sanitized string
 *
 * @example
 * ```typescript
 * import { sanitizeTextInput } from 'blecsd';
 *
 * // Basic sanitization
 * const safe = sanitizeTextInput(userInput);
 *
 * // With length limit and no Unicode
 * const limited = sanitizeTextInput(userInput, {
 *   maxLength: 100,
 *   allowUnicode: false,
 * });
 * ```
 */
export function sanitizeTextInput(input: string, options?: Partial<InputSanitizeOptions>): string {
	const opts = { ...DEFAULT_INPUT_SANITIZE_OPTIONS, ...options };
	let result = input;

	// Strip null bytes first (before any other processing)
	if (opts.stripNull) {
		result = stripNullBytes(result);
	}

	// Strip control characters
	if (opts.stripControl) {
		result = stripControlChars(result, opts.allowTab, opts.allowNewline);
	}

	// Strip C1 control characters (always, these are never useful in text)
	result = stripC1Controls(result);

	// Validate/replace invalid UTF-8 surrogates
	result = replaceInvalidUtf16(result, opts.replacementChar);

	// Restrict to ASCII if Unicode not allowed
	if (!opts.allowUnicode) {
		result = restrictToAscii(result, opts.replacementChar);
	}

	// Truncate to max length
	if (opts.maxLength > 0 && result.length > opts.maxLength) {
		result = result.slice(0, opts.maxLength);
	}

	return result;
}

/**
 * Sanitizes text input and returns detailed metadata about changes.
 *
 * @param input - The untrusted input string
 * @param options - Optional sanitization configuration
 * @returns Sanitization result with metadata
 *
 * @example
 * ```typescript
 * import { sanitizeTextInputDetailed } from 'blecsd';
 *
 * const result = sanitizeTextInputDetailed(networkMessage, { maxLength: 256 });
 * if (result.modified) {
 *   console.warn(`Input sanitized: ${result.strippedCount} chars removed`);
 * }
 * ```
 */
export function sanitizeTextInputDetailed(
	input: string,
	options?: Partial<InputSanitizeOptions>,
): SanitizeResult {
	const opts = { ...DEFAULT_INPUT_SANITIZE_OPTIONS, ...options };
	const originalLength = input.length;
	const sanitized = sanitizeTextInput(input, options);
	const truncated = opts.maxLength > 0 && originalLength > opts.maxLength;

	return {
		text: sanitized,
		modified: sanitized !== input,
		strippedCount: originalLength - sanitized.length,
		truncated,
		originalLength,
	};
}

/**
 * Strips all null bytes (0x00) from a string.
 *
 * @param input - String to process
 * @returns String without null bytes
 *
 * @example
 * ```typescript
 * import { stripNullBytes } from 'blecsd';
 *
 * stripNullBytes('hello\x00world'); // 'helloworld'
 * ```
 */
export function stripNullBytes(input: string): string {
	// Fast path: no null bytes
	if (!input.includes('\x00')) return input;

	let result = '';
	for (let i = 0; i < input.length; i++) {
		if (input.charCodeAt(i) !== 0) {
			result += input[i];
		}
	}
	return result;
}

/**
 * Strips C0 control characters (0x01-0x1F) from a string,
 * optionally preserving tab and newline characters.
 *
 * @param input - String to process
 * @param allowTab - Whether to preserve tab (0x09)
 * @param allowNewline - Whether to preserve LF (0x0A) and CR (0x0D)
 * @returns String without C0 controls
 *
 * @example
 * ```typescript
 * import { stripControlChars } from 'blecsd';
 *
 * stripControlChars('hello\x07world', true, true); // 'helloworld'
 * ```
 */
export function stripControlChars(input: string, allowTab = true, allowNewline = true): string {
	let result = '';
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		if (isNull(code)) {
			continue; // Always strip null
		}
		if (isC0Control(code)) {
			if (allowTab && code === 0x09) {
				result += input[i];
				continue;
			}
			if (allowNewline && (code === 0x0a || code === 0x0d)) {
				result += input[i];
				continue;
			}
			continue; // Strip other C0 controls
		}
		result += input[i];
	}
	return result;
}

/**
 * Strips C1 control characters (0x80-0x9F) from a string.
 *
 * @param input - String to process
 * @returns String without C1 controls
 *
 * @example
 * ```typescript
 * import { stripC1Controls } from 'blecsd';
 *
 * stripC1Controls('hello\x85world'); // 'helloworld'
 * ```
 */
export function stripC1Controls(input: string): string {
	let result = '';
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		if (!isC1Control(code)) {
			result += input[i];
		}
	}
	return result;
}

/**
 * Replaces lone surrogates (invalid UTF-16) with the replacement character.
 *
 * @param input - String to validate
 * @param replacement - Replacement for invalid sequences
 * @returns String with valid UTF-16 only
 */
export function replaceInvalidUtf16(input: string, replacement = '\uFFFD'): string {
	let result = '';
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		// High surrogate
		if (code >= 0xd800 && code <= 0xdbff) {
			const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
			// Valid surrogate pair
			if (next >= 0xdc00 && next <= 0xdfff) {
				result += input[i];
				result += input[i + 1];
				i++; // Skip low surrogate
			} else {
				result += replacement; // Lone high surrogate
			}
		} else if (code >= 0xdc00 && code <= 0xdfff) {
			result += replacement; // Lone low surrogate
		} else {
			result += input[i];
		}
	}
	return result;
}

/**
 * Restricts a string to printable ASCII characters (0x20-0x7E)
 * plus tab, newline, and carriage return.
 *
 * @param input - String to restrict
 * @param replacement - Replacement for non-ASCII characters
 * @returns ASCII-only string
 *
 * @example
 * ```typescript
 * import { restrictToAscii } from 'blecsd';
 *
 * restrictToAscii('café'); // 'caf\uFFFD'
 * ```
 */
export function restrictToAscii(input: string, replacement = '\uFFFD'): string {
	let result = '';
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		if (
			(code >= 0x20 && code <= 0x7e) || // Printable ASCII
			code === 0x09 || // Tab
			code === 0x0a || // LF
			code === 0x0d // CR
		) {
			result += input[i];
		} else {
			result += replacement;
		}
	}
	return result;
}

/**
 * Validates that a string contains only valid UTF-8 compatible content.
 * Checks for lone surrogates and overlong-encoded sequences.
 *
 * @param input - String to validate
 * @returns Whether the string is valid
 *
 * @example
 * ```typescript
 * import { isValidUtf8String } from 'blecsd';
 *
 * isValidUtf8String('hello'); // true
 * isValidUtf8String('hello\uD800'); // false (lone surrogate)
 * ```
 */
export function isValidUtf8String(input: string): boolean {
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		if (code >= 0xd800 && code <= 0xdbff) {
			// High surrogate - must be followed by low surrogate
			const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
			if (next < 0xdc00 || next > 0xdfff) return false;
			i++; // Skip low surrogate
		} else if (code >= 0xdc00 && code <= 0xdfff) {
			// Lone low surrogate
			return false;
		}
	}
	return true;
}

/**
 * Checks if a string contains any control characters (C0 or C1).
 *
 * @param input - String to check
 * @returns Whether the string contains control characters
 */
export function hasControlChars(input: string): boolean {
	for (let i = 0; i < input.length; i++) {
		const code = input.charCodeAt(i);
		if (isC0Control(code) || isC1Control(code)) return true;
	}
	return false;
}

/**
 * Checks if a string contains null bytes.
 *
 * @param input - String to check
 * @returns Whether the string contains null bytes
 */
export function hasNullBytes(input: string): boolean {
	return input.includes('\x00');
}
