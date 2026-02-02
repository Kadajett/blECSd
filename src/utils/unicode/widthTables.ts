/**
 * Unicode East Asian width lookup tables.
 * Used for calculating display width of characters in terminal.
 * @module utils/unicode/widthTables
 */

/**
 * A range of Unicode code points [start, end] (inclusive).
 */
export type CodePointRange = readonly [number, number];

// =============================================================================
// WIDE CHARACTER RANGES (width = 2)
// =============================================================================

/**
 * Wide character ranges that display as two terminal cells.
 * Includes CJK, Hangul, and other East Asian wide characters.
 *
 * @example
 * ```typescript
 * import { WIDE_RANGES } from 'blecsd';
 *
 * // Check if a character is in any wide range
 * for (const [start, end] of WIDE_RANGES) {
 *   if (codePoint >= start && codePoint <= end) {
 *     // Character is wide
 *   }
 * }
 * ```
 */
export const WIDE_RANGES: readonly CodePointRange[] = [
	// CJK Radicals Supplement
	[0x2e80, 0x2eff],
	// Kangxi Radicals
	[0x2f00, 0x2fdf],
	// Ideographic Description Characters
	[0x2ff0, 0x2fff],
	// CJK Symbols and Punctuation
	[0x3000, 0x303f],
	// Hiragana
	[0x3040, 0x309f],
	// Katakana
	[0x30a0, 0x30ff],
	// Bopomofo
	[0x3100, 0x312f],
	// Hangul Compatibility Jamo
	[0x3130, 0x318f],
	// Kanbun
	[0x3190, 0x319f],
	// Bopomofo Extended
	[0x31a0, 0x31bf],
	// CJK Strokes
	[0x31c0, 0x31ef],
	// Katakana Phonetic Extensions
	[0x31f0, 0x31ff],
	// Enclosed CJK Letters and Months
	[0x3200, 0x32ff],
	// CJK Compatibility
	[0x3300, 0x33ff],
	// CJK Unified Ideographs Extension A
	[0x3400, 0x4dbf],
	// CJK Unified Ideographs
	[0x4e00, 0x9fff],
	// Yi Syllables
	[0xa000, 0xa48f],
	// Yi Radicals
	[0xa490, 0xa4cf],
	// Hangul Syllables
	[0xac00, 0xd7a3],
	// CJK Compatibility Ideographs
	[0xf900, 0xfaff],
	// Vertical Forms
	[0xfe10, 0xfe1f],
	// CJK Compatibility Forms
	[0xfe30, 0xfe4f],
	// Small Form Variants
	[0xfe50, 0xfe6f],
	// Halfwidth and Fullwidth Forms (fullwidth only)
	[0xff00, 0xff60],
	[0xffe0, 0xffe6],
	// CJK Unified Ideographs Extension B
	[0x20000, 0x2a6df],
	// CJK Unified Ideographs Extension C
	[0x2a700, 0x2b73f],
	// CJK Unified Ideographs Extension D
	[0x2b740, 0x2b81f],
	// CJK Unified Ideographs Extension E
	[0x2b820, 0x2ceaf],
	// CJK Unified Ideographs Extension F
	[0x2ceb0, 0x2ebef],
	// CJK Compatibility Ideographs Supplement
	[0x2f800, 0x2fa1f],
	// CJK Unified Ideographs Extension G
	[0x30000, 0x3134f],
	// CJK Unified Ideographs Extension H
	[0x31350, 0x323af],
] as const;

// =============================================================================
// FULLWIDTH CHARACTER RANGES
// =============================================================================

/**
 * Fullwidth character ranges from Unicode Halfwidth and Fullwidth Forms block.
 * These are fullwidth variants of ASCII characters.
 *
 * @example
 * ```typescript
 * import { FULLWIDTH_RANGES } from 'blecsd';
 *
 * // Fullwidth 'A' is U+FF21
 * const fullwidthA = 0xff21;
 * ```
 */
export const FULLWIDTH_RANGES: readonly CodePointRange[] = [
	// Fullwidth ASCII variants (! through ~)
	[0xff01, 0xff5e],
	// Fullwidth cent, pound, not, macron, broken bar, yen, won
	[0xffe0, 0xffe6],
] as const;

// =============================================================================
// ZERO WIDTH CHARACTER RANGES (width = 0)
// =============================================================================

/**
 * Zero-width character ranges that don't occupy display cells.
 * Includes combining marks, control characters, and modifiers.
 *
 * @example
 * ```typescript
 * import { ZERO_WIDTH_RANGES } from 'blecsd';
 *
 * // Combining characters don't add to display width
 * ```
 */
export const ZERO_WIDTH_RANGES: readonly CodePointRange[] = [
	// C0 Controls (except tab, which is handled specially)
	[0x0000, 0x001f],
	// Delete
	[0x007f, 0x009f],
	// Combining Diacritical Marks
	[0x0300, 0x036f],
	// Arabic combining marks
	[0x0483, 0x0489],
	// Devanagari combining marks
	[0x0591, 0x05bd],
	[0x05bf, 0x05bf],
	[0x05c1, 0x05c2],
	[0x05c4, 0x05c5],
	[0x05c7, 0x05c7],
	// Hebrew combining marks
	[0x0610, 0x061a],
	// Arabic combining marks continued
	[0x064b, 0x065f],
	[0x0670, 0x0670],
	// Various combining marks
	[0x06d6, 0x06dc],
	[0x06df, 0x06e4],
	[0x06e7, 0x06e8],
	[0x06ea, 0x06ed],
	// More combining marks
	[0x0711, 0x0711],
	[0x0730, 0x074a],
	[0x07a6, 0x07b0],
	[0x07eb, 0x07f3],
	[0x0816, 0x0819],
	[0x081b, 0x0823],
	[0x0825, 0x0827],
	[0x0829, 0x082d],
	// Thai combining marks
	[0x0859, 0x085b],
	[0x08d4, 0x08e1],
	[0x08e3, 0x0902],
	// Devanagari vowel signs
	[0x093a, 0x093a],
	[0x093c, 0x093c],
	[0x0941, 0x0948],
	[0x094d, 0x094d],
	[0x0951, 0x0957],
	[0x0962, 0x0963],
	// Bengali combining marks
	[0x0981, 0x0981],
	[0x09bc, 0x09bc],
	[0x09c1, 0x09c4],
	[0x09cd, 0x09cd],
	[0x09e2, 0x09e3],
	// More Indic scripts...
	[0x0a01, 0x0a02],
	[0x0a3c, 0x0a3c],
	[0x0a41, 0x0a42],
	[0x0a47, 0x0a48],
	[0x0a4b, 0x0a4d],
	[0x0a51, 0x0a51],
	[0x0a70, 0x0a71],
	[0x0a75, 0x0a75],
	// Gurmukhi, Gujarati, etc.
	[0x0a81, 0x0a82],
	[0x0abc, 0x0abc],
	[0x0ac1, 0x0ac5],
	[0x0ac7, 0x0ac8],
	[0x0acd, 0x0acd],
	[0x0ae2, 0x0ae3],
	// Oriya
	[0x0b01, 0x0b01],
	[0x0b3c, 0x0b3c],
	[0x0b3f, 0x0b3f],
	[0x0b41, 0x0b44],
	[0x0b4d, 0x0b4d],
	[0x0b56, 0x0b56],
	[0x0b62, 0x0b63],
	// Tamil
	[0x0b82, 0x0b82],
	[0x0bc0, 0x0bc0],
	[0x0bcd, 0x0bcd],
	// Telugu
	[0x0c00, 0x0c00],
	[0x0c3e, 0x0c40],
	[0x0c46, 0x0c48],
	[0x0c4a, 0x0c4d],
	[0x0c55, 0x0c56],
	[0x0c62, 0x0c63],
	// Kannada
	[0x0c81, 0x0c81],
	[0x0cbc, 0x0cbc],
	[0x0cbf, 0x0cbf],
	[0x0cc6, 0x0cc6],
	[0x0ccc, 0x0ccd],
	[0x0ce2, 0x0ce3],
	// Malayalam
	[0x0d00, 0x0d01],
	[0x0d3b, 0x0d3c],
	[0x0d41, 0x0d44],
	[0x0d4d, 0x0d4d],
	[0x0d62, 0x0d63],
	// Sinhala
	[0x0dca, 0x0dca],
	[0x0dd2, 0x0dd4],
	[0x0dd6, 0x0dd6],
	// Thai vowels and tone marks
	[0x0e31, 0x0e31],
	[0x0e34, 0x0e3a],
	[0x0e47, 0x0e4e],
	// Lao vowels and tone marks
	[0x0eb1, 0x0eb1],
	[0x0eb4, 0x0eb9],
	[0x0ebb, 0x0ebc],
	[0x0ec8, 0x0ecd],
	// Tibetan
	[0x0f18, 0x0f19],
	[0x0f35, 0x0f35],
	[0x0f37, 0x0f37],
	[0x0f39, 0x0f39],
	[0x0f71, 0x0f7e],
	[0x0f80, 0x0f84],
	[0x0f86, 0x0f87],
	[0x0f8d, 0x0f97],
	[0x0f99, 0x0fbc],
	[0x0fc6, 0x0fc6],
	// Myanmar
	[0x102d, 0x1030],
	[0x1032, 0x1037],
	[0x1039, 0x103a],
	[0x103d, 0x103e],
	[0x1058, 0x1059],
	[0x105e, 0x1060],
	[0x1071, 0x1074],
	[0x1082, 0x1082],
	[0x1085, 0x1086],
	[0x108d, 0x108d],
	[0x109d, 0x109d],
	// Combining Diacritical Marks Extended
	[0x1ab0, 0x1abd],
	[0x1abe, 0x1abe],
	[0x1abf, 0x1ac0],
	// Combining Diacritical Marks Supplement
	[0x1dc0, 0x1dff],
	// Zero Width Space, ZWNJ, ZWJ, LRM, RLM
	[0x200b, 0x200f],
	// Word Joiner and similar
	[0x2060, 0x2064],
	// Directional formatting
	[0x2066, 0x206f],
	// Combining Diacritical Marks for Symbols
	[0x20d0, 0x20ff],
	// Variation Selectors
	[0xfe00, 0xfe0f],
	// Combining Half Marks
	[0xfe20, 0xfe2f],
	// Zero Width No-Break Space (BOM)
	[0xfeff, 0xfeff],
	// Variation Selectors Supplement
	[0xe0100, 0xe01ef],
] as const;

// =============================================================================
// AMBIGUOUS WIDTH RANGES
// =============================================================================

/**
 * Ambiguous width character ranges.
 * These may display as either 1 or 2 cells depending on context/locale.
 * Default treatment is narrow (width = 1).
 *
 * @example
 * ```typescript
 * import { AMBIGUOUS_RANGES } from 'blecsd';
 *
 * // Greek letters like α, β, γ have ambiguous width
 * // In CJK contexts they may be wide, otherwise narrow
 * ```
 */
export const AMBIGUOUS_RANGES: readonly CodePointRange[] = [
	// Some Latin Extended characters
	[0x00a1, 0x00a1], // Inverted exclamation
	[0x00a4, 0x00a4], // Currency sign
	[0x00a7, 0x00a8], // Section sign, diaeresis
	[0x00aa, 0x00aa], // Feminine ordinal
	[0x00ad, 0x00ae], // Soft hyphen, registered sign
	[0x00b0, 0x00b4], // Degree, superscripts
	[0x00b6, 0x00ba], // Pilcrow through masculine ordinal
	[0x00bc, 0x00bf], // Fractions, inverted question
	[0x00c6, 0x00c6], // AE ligature
	[0x00d0, 0x00d0], // Eth
	[0x00d7, 0x00d8], // Multiplication, O with stroke
	[0x00de, 0x00e1], // Thorn through a with acute
	[0x00e6, 0x00e6], // ae ligature
	[0x00e8, 0x00ea], // e with grave through e circumflex
	[0x00ec, 0x00ed], // i with grave, i with acute
	[0x00f0, 0x00f0], // eth
	[0x00f2, 0x00f3], // o with grave, o with acute
	[0x00f7, 0x00fa], // Division through u with acute
	[0x00fc, 0x00fc], // u with diaeresis
	[0x00fe, 0x00fe], // thorn
	// Greek and Coptic
	[0x0391, 0x03a1],
	[0x03a3, 0x03a9],
	[0x03b1, 0x03c1],
	[0x03c3, 0x03c9],
	// Cyrillic
	[0x0401, 0x0401],
	[0x0410, 0x044f],
	[0x0451, 0x0451],
	// Box Drawing
	[0x2500, 0x257f],
	// Block Elements
	[0x2580, 0x259f],
	// Geometric Shapes
	[0x25a0, 0x25ff],
	// Miscellaneous Symbols
	[0x2600, 0x26ff],
	// Dingbats
	[0x2700, 0x27bf],
] as const;

// =============================================================================
// EMOJI WIDTH (some emoji are wide, some are narrow)
// =============================================================================

/**
 * Emoji ranges that are typically displayed as wide characters.
 * Modern terminals usually render emoji as 2 cells.
 *
 * @example
 * ```typescript
 * import { EMOJI_WIDE_RANGES } from 'blecsd';
 *
 * // Check if a code point is a wide emoji
 * ```
 */
export const EMOJI_WIDE_RANGES: readonly CodePointRange[] = [
	// Miscellaneous Symbols and Pictographs
	[0x1f300, 0x1f5ff],
	// Emoticons
	[0x1f600, 0x1f64f],
	// Transport and Map Symbols
	[0x1f680, 0x1f6ff],
	// Supplemental Symbols and Pictographs
	[0x1f900, 0x1f9ff],
	// Symbols and Pictographs Extended-A
	[0x1fa00, 0x1fa6f],
	// Symbols and Pictographs Extended-B
	[0x1fa70, 0x1faff],
] as const;

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Binary search to check if a code point is in any of the given ranges.
 * More efficient than linear search for large range lists.
 *
 * @param codePoint - Unicode code point to check
 * @param ranges - Sorted array of [start, end] ranges
 * @returns true if code point is in any range
 */
function isInRanges(codePoint: number, ranges: readonly CodePointRange[]): boolean {
	let low = 0;
	let high = ranges.length - 1;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const range = ranges[mid];

		if (!range) break;

		const [start, end] = range;

		if (codePoint < start) {
			high = mid - 1;
		} else if (codePoint > end) {
			low = mid + 1;
		} else {
			return true;
		}
	}

	return false;
}

/**
 * Checks if a character is a wide character (displays as 2 cells).
 * Wide characters include CJK ideographs, Hangul, and fullwidth forms.
 *
 * @param codePoint - Unicode code point to check
 * @returns true if the character is wide (2 cells)
 *
 * @example
 * ```typescript
 * import { isWideChar } from 'blecsd';
 *
 * isWideChar(0x4e00);  // true - CJK ideograph
 * isWideChar(0x0041);  // false - Latin 'A'
 * isWideChar(0xff21);  // true - Fullwidth 'A'
 * isWideChar(0x1f600); // true - Emoji
 * ```
 */
export function isWideChar(codePoint: number): boolean {
	// Quick check for ASCII (most common case)
	if (codePoint < 0x1100) {
		return false;
	}

	// Check wide ranges
	if (isInRanges(codePoint, WIDE_RANGES)) {
		return true;
	}

	// Check emoji ranges
	if (isInRanges(codePoint, EMOJI_WIDE_RANGES)) {
		return true;
	}

	return false;
}

/**
 * Checks if a character is a zero-width character (displays as 0 cells).
 * Zero-width characters include combining marks, control characters, and modifiers.
 *
 * @param codePoint - Unicode code point to check
 * @returns true if the character is zero-width
 *
 * @example
 * ```typescript
 * import { isZeroWidthChar } from 'blecsd';
 *
 * isZeroWidthChar(0x0300); // true - Combining grave accent
 * isZeroWidthChar(0x200b); // true - Zero-width space
 * isZeroWidthChar(0x0041); // false - Latin 'A'
 * ```
 */
export function isZeroWidthChar(codePoint: number): boolean {
	// Check zero-width ranges
	return isInRanges(codePoint, ZERO_WIDTH_RANGES);
}

/**
 * Checks if a character has ambiguous width.
 * Ambiguous characters may display as 1 or 2 cells depending on context.
 *
 * @param codePoint - Unicode code point to check
 * @returns true if the character has ambiguous width
 *
 * @example
 * ```typescript
 * import { isAmbiguousChar } from 'blecsd';
 *
 * isAmbiguousChar(0x03b1); // true - Greek alpha
 * isAmbiguousChar(0x2500); // true - Box drawing
 * isAmbiguousChar(0x0041); // false - Latin 'A'
 * ```
 */
export function isAmbiguousChar(codePoint: number): boolean {
	return isInRanges(codePoint, AMBIGUOUS_RANGES);
}

/**
 * Gets the display width of a single character.
 * Returns 0, 1, or 2 based on character type.
 *
 * @param codePoint - Unicode code point to check
 * @param ambiguousIsWide - Treat ambiguous width chars as wide (default: false)
 * @returns Character display width (0, 1, or 2)
 *
 * @example
 * ```typescript
 * import { getCharWidth } from 'blecsd';
 *
 * getCharWidth(0x0041);  // 1 - Latin 'A'
 * getCharWidth(0x4e00);  // 2 - CJK ideograph
 * getCharWidth(0x0300);  // 0 - Combining mark
 * getCharWidth(0x03b1);  // 1 - Greek alpha (ambiguous, default narrow)
 * getCharWidth(0x03b1, true); // 2 - Greek alpha (ambiguous as wide)
 * ```
 */
export function getCharWidth(codePoint: number, ambiguousIsWide = false): number {
	// Zero-width characters
	if (isZeroWidthChar(codePoint)) {
		return 0;
	}

	// Wide characters
	if (isWideChar(codePoint)) {
		return 2;
	}

	// Ambiguous characters
	if (ambiguousIsWide && isAmbiguousChar(codePoint)) {
		return 2;
	}

	// Default: narrow (1 cell)
	return 1;
}
