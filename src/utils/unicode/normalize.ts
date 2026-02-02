/**
 * Unicode normalization and simplification utilities.
 * For when terminals can't handle complex Unicode characters.
 * @module utils/unicode/normalize
 */

import { isAstral, isSurrogateCode } from './codePoint';
import { isCombiningChar } from './combining';
import { isWideChar, isZeroWidthChar } from './widthTables';

// =============================================================================
// DROP UNICODE
// =============================================================================

/**
 * Options for dropUnicode().
 */
export interface DropUnicodeOptions {
	/**
	 * Character to use as replacement.
	 * @default '?'
	 */
	replacement?: string;

	/**
	 * Drop wide characters (CJK, fullwidth, emoji).
	 * @default true
	 */
	dropWide?: boolean;

	/**
	 * Drop combining characters (accents, diacritics).
	 * @default true
	 */
	dropCombining?: boolean;

	/**
	 * Drop astral plane characters (emoji, supplementary).
	 * @default true
	 */
	dropAstral?: boolean;

	/**
	 * Drop zero-width characters (ZWSP, ZWJ, etc.).
	 * @default true
	 */
	dropZeroWidth?: boolean;

	/**
	 * Drop control characters (C0/C1).
	 * @default false
	 */
	dropControl?: boolean;
}

/**
 * Default options for dropUnicode().
 */
const DEFAULT_DROP_OPTIONS: Required<DropUnicodeOptions> = {
	replacement: '?',
	dropWide: true,
	dropCombining: true,
	dropAstral: true,
	dropZeroWidth: true,
	dropControl: false,
};

/**
 * Checks if a code point is a C0 or C1 control character (excluding common whitespace).
 */
function isControlChar(codePoint: number): boolean {
	// C0 controls (0x00-0x1F), excluding TAB (0x09), LF (0x0A), CR (0x0D)
	if (codePoint >= 0x00 && codePoint <= 0x1f) {
		return codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d;
	}
	// DEL
	if (codePoint === 0x7f) {
		return true;
	}
	// C1 controls (0x80-0x9F)
	if (codePoint >= 0x80 && codePoint <= 0x9f) {
		return true;
	}
	return false;
}

/**
 * TAB, LF, CR - useful whitespace to preserve.
 */
function isUsefulWhitespace(codePoint: number): boolean {
	return codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d;
}

/**
 * Handle zero-width characters for dropUnicode.
 */
function handleZeroWidth(char: string, codePoint: number, dropZeroWidth: boolean): string | null {
	if (dropZeroWidth && isZeroWidthChar(codePoint)) {
		return isUsefulWhitespace(codePoint) ? char : '';
	}
	return null; // Not handled
}

/**
 * Handle astral characters for dropUnicode.
 */
function handleAstral(
	char: string,
	codePoint: number,
	dropAstral: boolean,
	dropWide: boolean,
	replacement: string,
): string | null {
	if (!isAstral(codePoint)) {
		return null; // Not handled
	}
	if (dropAstral) {
		return replacement;
	}
	if (dropWide && isWideChar(codePoint)) {
		return replacement;
	}
	return char;
}

/**
 * Process a single character for dropUnicode.
 * Returns the character to append, replacement, or empty string to drop.
 */
function processCharForDrop(
	char: string,
	codePoint: number,
	opts: Required<DropUnicodeOptions>,
): string {
	// Surrogate check
	if (isSurrogateCode(codePoint)) {
		return opts.replacement;
	}

	// Combining characters
	if (isCombiningChar(codePoint)) {
		return opts.dropCombining ? '' : char;
	}

	// Control characters
	if (isControlChar(codePoint)) {
		return opts.dropControl ? '' : char;
	}

	// Zero-width characters
	const zeroWidthResult = handleZeroWidth(char, codePoint, opts.dropZeroWidth);
	if (zeroWidthResult !== null) {
		return zeroWidthResult;
	}

	// Astral plane characters
	const astralResult = handleAstral(
		char,
		codePoint,
		opts.dropAstral,
		opts.dropWide,
		opts.replacement,
	);
	if (astralResult !== null) {
		return astralResult;
	}

	// Wide characters
	if (opts.dropWide && isWideChar(codePoint)) {
		return opts.replacement;
	}

	return char;
}

/**
 * Replaces complex Unicode characters with a simple replacement.
 * Useful for terminals that can't handle wide, combining, or astral characters.
 *
 * @param text - The text to normalize
 * @param options - Options for what to drop
 * @returns Text with complex characters replaced
 *
 * @example
 * ```typescript
 * import { dropUnicode } from 'blecsd';
 *
 * dropUnicode('Hello 世界');     // 'Hello ??'
 * dropUnicode('café');          // 'caf?e' (if decomposed: café)
 * dropUnicode('Hello😀');       // 'Hello?'
 *
 * // Custom replacement
 * dropUnicode('Hello 中国', { replacement: '_' });  // 'Hello __'
 *
 * // Keep wide characters
 * dropUnicode('Hello 中国', { dropWide: false });  // 'Hello 中国'
 * ```
 */
export function dropUnicode(text: string, options?: DropUnicodeOptions): string {
	const opts = { ...DEFAULT_DROP_OPTIONS, ...options };
	let result = '';

	for (const char of text) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			result += opts.replacement;
			continue;
		}

		result += processCharForDrop(char, codePoint, opts);
	}

	return result;
}

// =============================================================================
// ASCII ONLY
// =============================================================================

/**
 * Converts a string to ASCII-only by replacing non-ASCII with replacement.
 *
 * @param text - The text to convert
 * @param replacement - Replacement for non-ASCII (default: '?')
 * @returns ASCII-only string
 *
 * @example
 * ```typescript
 * import { toAscii } from 'blecsd';
 *
 * toAscii('Hello 世界');  // 'Hello ??'
 * toAscii('café');        // 'caf?'
 * toAscii('naïve');       // 'na?ve'
 * ```
 */
export function toAscii(text: string, replacement = '?'): string {
	let result = '';

	for (const char of text) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			result += replacement;
			continue;
		}

		// Keep ASCII printable (0x20-0x7E) and common whitespace
		if (codePoint >= 0x20 && codePoint <= 0x7e) {
			result += char;
		} else if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) {
			// Tab, LF, CR
			result += char;
		} else {
			result += replacement;
		}
	}

	return result;
}

// =============================================================================
// STRIP UTILITIES
// =============================================================================

/**
 * Strips all zero-width characters from a string.
 *
 * @param text - The text to strip
 * @returns Text without zero-width characters
 *
 * @example
 * ```typescript
 * import { stripZeroWidth } from 'blecsd';
 *
 * stripZeroWidth('a\u200Bb');  // 'ab' (removed zero-width space)
 * stripZeroWidth('Hello');     // 'Hello'
 * ```
 */
export function stripZeroWidth(text: string): string {
	let result = '';

	for (const char of text) {
		const codePoint = char.codePointAt(0);
		if (codePoint !== undefined && !isZeroWidthChar(codePoint)) {
			result += char;
		}
	}

	return result;
}

/**
 * Strips all combining characters from a string.
 *
 * @param text - The text to strip
 * @returns Text without combining characters
 *
 * @example
 * ```typescript
 * import { stripCombining } from 'blecsd';
 *
 * stripCombining('café');      // 'cafe' (if decomposed)
 * stripCombining('e\u0301');   // 'e'
 * ```
 */
export function stripCombining(text: string): string {
	let result = '';

	for (const char of text) {
		const codePoint = char.codePointAt(0);
		if (codePoint !== undefined && !isCombiningChar(codePoint)) {
			result += char;
		}
	}

	return result;
}

/**
 * Strips all control characters from a string.
 * Preserves TAB, LF, and CR.
 *
 * @param text - The text to strip
 * @returns Text without control characters
 *
 * @example
 * ```typescript
 * import { stripControl } from 'blecsd';
 *
 * stripControl('Hello\x00World');  // 'HelloWorld'
 * stripControl('Line1\nLine2');    // 'Line1\nLine2' (LF preserved)
 * ```
 */
export function stripControl(text: string): string {
	let result = '';

	for (const char of text) {
		const codePoint = char.codePointAt(0);
		if (codePoint !== undefined && !isControlChar(codePoint)) {
			result += char;
		}
	}

	return result;
}

// =============================================================================
// NORMALIZATION
// =============================================================================

/**
 * Normalizes a string to NFC form (canonical decomposition + canonical composition).
 * This is the most common normalization form.
 *
 * @param text - The text to normalize
 * @returns NFC normalized string
 *
 * @example
 * ```typescript
 * import { normalizeNFC } from 'blecsd';
 *
 * // e + combining acute -> precomposed é
 * normalizeNFC('e\u0301');  // 'é'
 * ```
 */
export function normalizeNFC(text: string): string {
	return text.normalize('NFC');
}

/**
 * Normalizes a string to NFD form (canonical decomposition).
 *
 * @param text - The text to normalize
 * @returns NFD normalized string
 *
 * @example
 * ```typescript
 * import { normalizeNFD } from 'blecsd';
 *
 * // precomposed é -> e + combining acute
 * normalizeNFD('é');  // 'e\u0301'
 * ```
 */
export function normalizeNFD(text: string): string {
	return text.normalize('NFD');
}

/**
 * Normalizes a string to NFKC form (compatibility decomposition + canonical composition).
 *
 * @param text - The text to normalize
 * @returns NFKC normalized string
 *
 * @example
 * ```typescript
 * import { normalizeNFKC } from 'blecsd';
 *
 * // Fullwidth A -> regular A
 * normalizeNFKC('Ａ');  // 'A'
 * ```
 */
export function normalizeNFKC(text: string): string {
	return text.normalize('NFKC');
}

/**
 * Normalizes a string to NFKD form (compatibility decomposition).
 *
 * @param text - The text to normalize
 * @returns NFKD normalized string
 *
 * @example
 * ```typescript
 * import { normalizeNFKD } from 'blecsd';
 *
 * // ﬁ ligature -> fi
 * normalizeNFKD('ﬁ');  // 'fi'
 * ```
 */
export function normalizeNFKD(text: string): string {
	return text.normalize('NFKD');
}
