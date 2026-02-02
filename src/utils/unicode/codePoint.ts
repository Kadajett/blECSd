/**
 * Unicode code point utilities for low-level string handling.
 * @module utils/unicode/codePoint
 */

// =============================================================================
// SURROGATE PAIR CONSTANTS
// =============================================================================

/**
 * High surrogate range start (U+D800).
 */
export const HIGH_SURROGATE_START = 0xd800;

/**
 * High surrogate range end (U+DBFF).
 */
export const HIGH_SURROGATE_END = 0xdbff;

/**
 * Low surrogate range start (U+DC00).
 */
export const LOW_SURROGATE_START = 0xdc00;

/**
 * Low surrogate range end (U+DFFF).
 */
export const LOW_SURROGATE_END = 0xdfff;

// =============================================================================
// SURROGATE DETECTION
// =============================================================================

/**
 * Checks if a code unit is a high surrogate (U+D800-U+DBFF).
 *
 * @param code - Code unit to check
 * @returns true if high surrogate
 *
 * @example
 * ```typescript
 * import { isHighSurrogate } from 'blecsd';
 *
 * isHighSurrogate(0xd83d);  // true (part of emoji)
 * isHighSurrogate(0x0041);  // false (A)
 * ```
 */
export function isHighSurrogate(code: number): boolean {
	return code >= HIGH_SURROGATE_START && code <= HIGH_SURROGATE_END;
}

/**
 * Checks if a code unit is a low surrogate (U+DC00-U+DFFF).
 *
 * @param code - Code unit to check
 * @returns true if low surrogate
 *
 * @example
 * ```typescript
 * import { isLowSurrogate } from 'blecsd';
 *
 * isLowSurrogate(0xde00);  // true (part of emoji)
 * isLowSurrogate(0x0041);  // false (A)
 * ```
 */
export function isLowSurrogate(code: number): boolean {
	return code >= LOW_SURROGATE_START && code <= LOW_SURROGATE_END;
}

/**
 * Checks if a code unit is any surrogate (high or low).
 *
 * @param code - Code unit to check
 * @returns true if surrogate
 *
 * @example
 * ```typescript
 * import { isSurrogateCode } from 'blecsd';
 *
 * isSurrogateCode(0xd83d);  // true
 * isSurrogateCode(0xde00);  // true
 * isSurrogateCode(0x0041);  // false
 * ```
 */
export function isSurrogateCode(code: number): boolean {
	return code >= HIGH_SURROGATE_START && code <= LOW_SURROGATE_END;
}

/**
 * Checks if the character at a specific string index is part of a surrogate pair.
 *
 * @param str - The string to check
 * @param index - Character index (0-based, using charCodeAt)
 * @returns true if the character is a surrogate
 *
 * @example
 * ```typescript
 * import { isSurrogate } from 'blecsd';
 *
 * const emoji = '😀';
 * isSurrogate(emoji, 0);  // true (high surrogate)
 * isSurrogate(emoji, 1);  // true (low surrogate)
 * isSurrogate('A', 0);    // false
 * ```
 */
export function isSurrogate(str: string, index: number): boolean {
	if (index < 0 || index >= str.length) {
		return false;
	}
	const code = str.charCodeAt(index);
	return isSurrogateCode(code);
}

// =============================================================================
// SURROGATE PAIR CONVERSION
// =============================================================================

/**
 * Converts a surrogate pair to a single code point.
 *
 * @param high - High surrogate (U+D800-U+DBFF)
 * @param low - Low surrogate (U+DC00-U+DFFF)
 * @returns The combined code point
 * @throws Error if inputs are not valid surrogates
 *
 * @example
 * ```typescript
 * import { surrogatePairToCodePoint } from 'blecsd';
 *
 * // 😀 is U+1F600, encoded as D83D DE00
 * surrogatePairToCodePoint(0xd83d, 0xde00);  // 0x1f600
 * ```
 */
export function surrogatePairToCodePoint(high: number, low: number): number {
	if (!isHighSurrogate(high)) {
		throw new Error(`Invalid high surrogate: 0x${high.toString(16)}`);
	}
	if (!isLowSurrogate(low)) {
		throw new Error(`Invalid low surrogate: 0x${low.toString(16)}`);
	}

	return (high - HIGH_SURROGATE_START) * 0x400 + (low - LOW_SURROGATE_START) + 0x10000;
}

/**
 * Converts a code point to a surrogate pair.
 *
 * @param codePoint - Code point (must be > 0xFFFF)
 * @returns Tuple of [highSurrogate, lowSurrogate]
 * @throws Error if code point doesn't need surrogate encoding
 *
 * @example
 * ```typescript
 * import { codePointToSurrogatePair } from 'blecsd';
 *
 * codePointToSurrogatePair(0x1f600);  // [0xd83d, 0xde00]
 * ```
 */
export function codePointToSurrogatePair(codePoint: number): [number, number] {
	if (codePoint <= 0xffff) {
		throw new Error(`Code point 0x${codePoint.toString(16)} doesn't need surrogate encoding`);
	}
	if (codePoint > 0x10ffff) {
		throw new Error(`Invalid code point: 0x${codePoint.toString(16)} (exceeds U+10FFFF)`);
	}

	const offset = codePoint - 0x10000;
	const high = (offset >> 10) + HIGH_SURROGATE_START;
	const low = (offset & 0x3ff) + LOW_SURROGATE_START;

	return [high, low];
}

// =============================================================================
// CODE POINT ACCESS
// =============================================================================

/**
 * Gets the code point at a specific index in a string.
 * This is a wrapper around String.prototype.codePointAt() with consistent return type.
 *
 * @param str - The string to read from
 * @param index - Code unit index (not code point index)
 * @returns The code point at the index, or -1 if out of bounds
 *
 * @example
 * ```typescript
 * import { codePointAt } from 'blecsd';
 *
 * codePointAt('A', 0);     // 65
 * codePointAt('😀', 0);    // 128512 (0x1F600)
 * codePointAt('A', 1);     // -1 (out of bounds)
 * ```
 */
export function codePointAt(str: string, index: number): number {
	if (index < 0 || index >= str.length) {
		return -1;
	}
	const cp = str.codePointAt(index);
	return cp === undefined ? -1 : cp;
}

/**
 * Creates a string from code points.
 * This is a wrapper around String.fromCodePoint() for consistency.
 *
 * @param codePoints - Code points to convert
 * @returns The resulting string
 *
 * @example
 * ```typescript
 * import { fromCodePoint } from 'blecsd';
 *
 * fromCodePoint(65, 66, 67);        // 'ABC'
 * fromCodePoint(0x1f600);           // '😀'
 * fromCodePoint(0x4e2d, 0x6587);    // '中文'
 * ```
 */
export function fromCodePoint(...codePoints: number[]): string {
	return String.fromCodePoint(...codePoints);
}

// =============================================================================
// ITERATORS
// =============================================================================

/**
 * Iterates over code points in a string.
 * Handles surrogate pairs correctly.
 *
 * @param str - The string to iterate
 * @yields Code points
 *
 * @example
 * ```typescript
 * import { codePoints } from 'blecsd';
 *
 * for (const cp of codePoints('A😀B')) {
 *   console.log(cp.toString(16));
 * }
 * // 41 (A)
 * // 1f600 (😀)
 * // 42 (B)
 * ```
 */
export function* codePoints(str: string): Generator<number, void, undefined> {
	for (const char of str) {
		const cp = char.codePointAt(0);
		if (cp !== undefined) {
			yield cp;
		}
	}
}

/**
 * Converts a string to an array of code points.
 *
 * @param str - The string to convert
 * @returns Array of code points
 *
 * @example
 * ```typescript
 * import { toCodePoints } from 'blecsd';
 *
 * toCodePoints('ABC');   // [65, 66, 67]
 * toCodePoints('A😀B');  // [65, 128512, 66]
 * ```
 */
export function toCodePoints(str: string): number[] {
	return [...codePoints(str)];
}

/**
 * Iterates over characters (not code units) in a string.
 * Each yielded string is a complete character (may include surrogate pairs).
 *
 * @param str - The string to iterate
 * @yields Characters
 *
 * @example
 * ```typescript
 * import { characters } from 'blecsd';
 *
 * for (const char of characters('A😀B')) {
 *   console.log(char, char.length);
 * }
 * // A 1
 * // 😀 2
 * // B 1
 * ```
 */
export function* characters(str: string): Generator<string, void, undefined> {
	for (const char of str) {
		yield char;
	}
}

/**
 * Gets the number of code points (characters) in a string.
 * This is different from string.length which returns code units.
 *
 * @param str - The string to measure
 * @returns Number of code points
 *
 * @example
 * ```typescript
 * import { codePointLength } from 'blecsd';
 *
 * 'ABC'.length;           // 3
 * codePointLength('ABC'); // 3
 *
 * '😀'.length;            // 2 (surrogate pair)
 * codePointLength('😀');  // 1
 *
 * 'A😀B'.length;          // 4
 * codePointLength('A😀B'); // 3
 * ```
 */
export function codePointLength(str: string): number {
	let count = 0;
	for (const _ of str) {
		count++;
	}
	return count;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Checks if a code point is valid (0 to 0x10FFFF, excluding surrogates).
 *
 * @param codePoint - Code point to check
 * @returns true if valid
 *
 * @example
 * ```typescript
 * import { isValidCodePoint } from 'blecsd';
 *
 * isValidCodePoint(0x0041);   // true (A)
 * isValidCodePoint(0x1f600);  // true (emoji)
 * isValidCodePoint(0xd800);   // false (high surrogate)
 * isValidCodePoint(0x110000); // false (too high)
 * isValidCodePoint(-1);       // false (negative)
 * ```
 */
export function isValidCodePoint(codePoint: number): boolean {
	if (codePoint < 0 || codePoint > 0x10ffff) {
		return false;
	}
	// Surrogates are not valid Unicode scalar values
	if (codePoint >= HIGH_SURROGATE_START && codePoint <= LOW_SURROGATE_END) {
		return false;
	}
	return true;
}

/**
 * Checks if a code point is in the Basic Multilingual Plane (BMP).
 * BMP characters don't need surrogate pair encoding.
 *
 * @param codePoint - Code point to check
 * @returns true if in BMP (0x0000-0xFFFF)
 *
 * @example
 * ```typescript
 * import { isBMP } from 'blecsd';
 *
 * isBMP(0x0041);   // true (A)
 * isBMP(0x4e2d);   // true (中)
 * isBMP(0x1f600);  // false (emoji, astral plane)
 * ```
 */
export function isBMP(codePoint: number): boolean {
	return codePoint >= 0 && codePoint <= 0xffff;
}

/**
 * Checks if a code point is in an astral plane (supplementary planes).
 * These require surrogate pair encoding in UTF-16.
 *
 * @param codePoint - Code point to check
 * @returns true if in astral plane (0x10000-0x10FFFF)
 *
 * @example
 * ```typescript
 * import { isAstral } from 'blecsd';
 *
 * isAstral(0x0041);   // false (A)
 * isAstral(0x1f600);  // true (emoji)
 * isAstral(0x20000);  // true (CJK Extension B)
 * ```
 */
export function isAstral(codePoint: number): boolean {
	return codePoint >= 0x10000 && codePoint <= 0x10ffff;
}

// =============================================================================
// CHARACTER ACCESS BY CODE POINT INDEX
// =============================================================================

/**
 * Gets the character at a code point index (not code unit index).
 * This handles surrogate pairs correctly.
 *
 * @param str - The string to access
 * @param index - Code point index (0-based)
 * @returns The character at the index, or empty string if out of bounds
 *
 * @example
 * ```typescript
 * import { charAtCodePoint } from 'blecsd';
 *
 * const str = 'A😀B';
 * charAtCodePoint(str, 0);  // 'A'
 * charAtCodePoint(str, 1);  // '😀'
 * charAtCodePoint(str, 2);  // 'B'
 * charAtCodePoint(str, 3);  // ''
 * ```
 */
export function charAtCodePoint(str: string, index: number): string {
	if (index < 0) {
		return '';
	}

	let i = 0;
	for (const char of str) {
		if (i === index) {
			return char;
		}
		i++;
	}

	return '';
}

/**
 * Slices a string by code point indices (not code unit indices).
 *
 * @param str - The string to slice
 * @param start - Start code point index (inclusive)
 * @param end - End code point index (exclusive), defaults to end of string
 * @returns The sliced string
 *
 * @example
 * ```typescript
 * import { sliceCodePoints } from 'blecsd';
 *
 * const str = 'A😀B😀C';
 * sliceCodePoints(str, 1, 3);  // '😀B'
 * sliceCodePoints(str, 2);    // 'B😀C'
 * ```
 */
export function sliceCodePoints(str: string, start: number, end?: number): string {
	const startIndex = start < 0 ? 0 : start;

	let result = '';
	let i = 0;

	for (const char of str) {
		if (end !== undefined && i >= end) {
			break;
		}
		if (i >= startIndex) {
			result += char;
		}
		i++;
	}

	return result;
}
