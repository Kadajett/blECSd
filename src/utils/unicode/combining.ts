/**
 * Unicode combining character lookup tables.
 * Combining characters attach to the previous base character.
 * @module utils/unicode/combining
 */

import type { CodePointRange } from './widthTables';

// =============================================================================
// COMBINING CHARACTER RANGES
// =============================================================================

/**
 * Unicode combining character ranges.
 * Combining characters are marks that attach to preceding base characters.
 * All combining characters are zero-width.
 *
 * @example
 * ```typescript
 * import { COMBINING_RANGES } from 'blecsd';
 *
 * // Check if a character is in any combining range
 * for (const [start, end] of COMBINING_RANGES) {
 *   if (codePoint >= start && codePoint <= end) {
 *     // Character is a combining mark
 *   }
 * }
 * ```
 */
export const COMBINING_RANGES: readonly CodePointRange[] = [
	// Combining Diacritical Marks
	[0x0300, 0x036f],
	// Combining Diacritical Marks Extended
	[0x1ab0, 0x1aff],
	// Combining Diacritical Marks Supplement
	[0x1dc0, 0x1dff],
	// Combining Diacritical Marks for Symbols
	[0x20d0, 0x20ff],
	// Combining Half Marks
	[0xfe20, 0xfe2f],
	// Arabic combining marks
	[0x0483, 0x0489],
	// Hebrew combining marks
	[0x0591, 0x05bd],
	[0x05bf, 0x05bf],
	[0x05c1, 0x05c2],
	[0x05c4, 0x05c5],
	[0x05c7, 0x05c7],
	// Arabic extended combining marks
	[0x0610, 0x061a],
	[0x064b, 0x065f],
	[0x0670, 0x0670],
	[0x06d6, 0x06dc],
	[0x06df, 0x06e4],
	[0x06e7, 0x06e8],
	[0x06ea, 0x06ed],
	// Syriac combining marks
	[0x0711, 0x0711],
	[0x0730, 0x074a],
	// Thaana combining marks
	[0x07a6, 0x07b0],
	// NKo combining marks
	[0x07eb, 0x07f3],
	[0x07fd, 0x07fd],
	// Samaritan combining marks
	[0x0816, 0x0819],
	[0x081b, 0x0823],
	[0x0825, 0x0827],
	[0x0829, 0x082d],
	// Mandaic combining marks
	[0x0859, 0x085b],
	// Arabic Extended-A combining marks
	[0x08d4, 0x08e1],
	[0x08e3, 0x0902],
	// Devanagari combining marks
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
	[0x09fe, 0x09fe],
	// Gurmukhi combining marks
	[0x0a01, 0x0a02],
	[0x0a3c, 0x0a3c],
	[0x0a41, 0x0a42],
	[0x0a47, 0x0a48],
	[0x0a4b, 0x0a4d],
	[0x0a51, 0x0a51],
	[0x0a70, 0x0a71],
	[0x0a75, 0x0a75],
	// Gujarati combining marks
	[0x0a81, 0x0a82],
	[0x0abc, 0x0abc],
	[0x0ac1, 0x0ac5],
	[0x0ac7, 0x0ac8],
	[0x0acd, 0x0acd],
	[0x0ae2, 0x0ae3],
	[0x0afa, 0x0aff],
	// Oriya combining marks
	[0x0b01, 0x0b01],
	[0x0b3c, 0x0b3c],
	[0x0b3f, 0x0b3f],
	[0x0b41, 0x0b44],
	[0x0b4d, 0x0b4d],
	[0x0b55, 0x0b56],
	[0x0b62, 0x0b63],
	// Tamil combining marks
	[0x0b82, 0x0b82],
	[0x0bc0, 0x0bc0],
	[0x0bcd, 0x0bcd],
	// Telugu combining marks
	[0x0c00, 0x0c00],
	[0x0c04, 0x0c04],
	[0x0c3e, 0x0c40],
	[0x0c46, 0x0c48],
	[0x0c4a, 0x0c4d],
	[0x0c55, 0x0c56],
	[0x0c62, 0x0c63],
	// Kannada combining marks
	[0x0c81, 0x0c81],
	[0x0cbc, 0x0cbc],
	[0x0cbf, 0x0cbf],
	[0x0cc6, 0x0cc6],
	[0x0ccc, 0x0ccd],
	[0x0ce2, 0x0ce3],
	// Malayalam combining marks
	[0x0d00, 0x0d01],
	[0x0d3b, 0x0d3c],
	[0x0d41, 0x0d44],
	[0x0d4d, 0x0d4d],
	[0x0d62, 0x0d63],
	// Sinhala combining marks
	[0x0dca, 0x0dca],
	[0x0dd2, 0x0dd4],
	[0x0dd6, 0x0dd6],
	// Thai combining marks
	[0x0e31, 0x0e31],
	[0x0e34, 0x0e3a],
	[0x0e47, 0x0e4e],
	// Lao combining marks
	[0x0eb1, 0x0eb1],
	[0x0eb4, 0x0ebc],
	[0x0ec8, 0x0ecd],
	// Tibetan combining marks
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
	// Myanmar combining marks
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
	// Ethiopic combining marks
	[0x135d, 0x135f],
	// Tagalog combining marks
	[0x1712, 0x1714],
	// Hanunoo combining marks
	[0x1732, 0x1734],
	// Buhid combining marks
	[0x1752, 0x1753],
	// Tagbanwa combining marks
	[0x1772, 0x1773],
	// Khmer combining marks
	[0x17b4, 0x17b5],
	[0x17b7, 0x17bd],
	[0x17c6, 0x17c6],
	[0x17c9, 0x17d3],
	[0x17dd, 0x17dd],
	// Mongolian combining marks
	[0x180b, 0x180d],
	[0x180f, 0x180f],
	// Limbu combining marks
	[0x1920, 0x1922],
	[0x1927, 0x1928],
	[0x1932, 0x1932],
	[0x1939, 0x193b],
	// Buginese combining marks
	[0x1a17, 0x1a18],
	[0x1a1b, 0x1a1b],
	// Tai Tham combining marks
	[0x1a56, 0x1a56],
	[0x1a58, 0x1a5e],
	[0x1a60, 0x1a60],
	[0x1a62, 0x1a62],
	[0x1a65, 0x1a6c],
	[0x1a73, 0x1a7c],
	[0x1a7f, 0x1a7f],
	// Balinese combining marks
	[0x1b00, 0x1b03],
	[0x1b34, 0x1b34],
	[0x1b36, 0x1b3a],
	[0x1b3c, 0x1b3c],
	[0x1b42, 0x1b42],
	[0x1b6b, 0x1b73],
	// Sundanese combining marks
	[0x1b80, 0x1b81],
	[0x1ba2, 0x1ba5],
	[0x1ba8, 0x1ba9],
	[0x1bab, 0x1bad],
	// Batak combining marks
	[0x1be6, 0x1be6],
	[0x1be8, 0x1be9],
	[0x1bed, 0x1bed],
	[0x1bef, 0x1bf1],
	// Lepcha combining marks
	[0x1c2c, 0x1c33],
	[0x1c36, 0x1c37],
	// Vedic Extensions combining marks
	[0x1cd0, 0x1cd2],
	[0x1cd4, 0x1ce0],
	[0x1ce2, 0x1ce8],
	[0x1ced, 0x1ced],
	[0x1cf4, 0x1cf4],
	[0x1cf8, 0x1cf9],
	// Variation Selectors
	[0xfe00, 0xfe0f],
	// Variation Selectors Supplement
	[0xe0100, 0xe01ef],
] as const;

// =============================================================================
// PRE-COMPUTED LOOKUP SET
// =============================================================================

/**
 * Pre-computed Set of all combining character code points.
 * Use this for O(1) lookup when checking many characters.
 *
 * @example
 * ```typescript
 * import { COMBINING_SET } from 'blecsd';
 *
 * if (COMBINING_SET.has(codePoint)) {
 *   // Character is a combining mark
 * }
 * ```
 */
export const COMBINING_SET: ReadonlySet<number> = new Set(
	(function* () {
		for (const [start, end] of COMBINING_RANGES) {
			for (let cp = start; cp <= end; cp++) {
				yield cp;
			}
		}
	})(),
);

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
 * Checks if a character is a combining character.
 * Uses binary search over sorted ranges.
 *
 * Combining characters are marks that attach to the preceding base character.
 * They include accents, diacritics, vowel signs, tone marks, etc.
 *
 * @param codePoint - Unicode code point to check
 * @returns true if the character is a combining character
 *
 * @example
 * ```typescript
 * import { isCombiningChar } from 'blecsd';
 *
 * isCombiningChar(0x0300); // true - Combining grave accent
 * isCombiningChar(0x0301); // true - Combining acute accent
 * isCombiningChar(0x0308); // true - Combining diaeresis
 * isCombiningChar(0x0041); // false - Latin 'A'
 * isCombiningChar(0x200b); // false - Zero-width space (not combining)
 * isCombiningChar(0x200d); // false - Zero-width joiner (not combining)
 * ```
 */
export function isCombiningChar(codePoint: number): boolean {
	// Quick check for ASCII (most common case)
	if (codePoint < 0x0300) {
		return false;
	}

	// Use Set for O(1) lookup
	return COMBINING_SET.has(codePoint);
}

/**
 * Checks if a character is a combining character using binary search.
 * Slightly slower than isCombiningChar() but uses less memory.
 *
 * @param codePoint - Unicode code point to check
 * @returns true if the character is a combining character
 *
 * @example
 * ```typescript
 * import { isCombiningCharBinarySearch } from 'blecsd';
 *
 * isCombiningCharBinarySearch(0x0300); // true - Combining grave accent
 * isCombiningCharBinarySearch(0x0041); // false - Latin 'A'
 * ```
 */
export function isCombiningCharBinarySearch(codePoint: number): boolean {
	// Quick check for ASCII (most common case)
	if (codePoint < 0x0300) {
		return false;
	}

	return isInRanges(codePoint, COMBINING_RANGES);
}

/**
 * Gets the count of combining character code points covered by the ranges.
 *
 * @returns Total number of combining character code points
 *
 * @example
 * ```typescript
 * import { getCombiningCharCount } from 'blecsd';
 *
 * const count = getCombiningCharCount();
 * console.log(`Covering ${count} combining characters`);
 * ```
 */
export function getCombiningCharCount(): number {
	return COMBINING_SET.size;
}
