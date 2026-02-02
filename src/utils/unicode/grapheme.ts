/**
 * Grapheme cluster utilities for proper Unicode text segmentation.
 * Uses Intl.Segmenter (UAX #29) when available for correct handling of:
 * - Emoji ZWJ sequences (👨‍👩‍👧‍👦)
 * - Regional indicator pairs (🇺🇸)
 * - Skin tone modifiers (👋🏽)
 * - Combining character sequences
 *
 * @module utils/unicode/grapheme
 */

import { getCharWidth } from './widthTables';

// =============================================================================
// SEGMENTER DETECTION
// =============================================================================

/**
 * Check if Intl.Segmenter is available (Node.js 16+, modern browsers).
 */
const hasIntlSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

/**
 * Cached grapheme segmenter instance.
 */
let segmenterInstance: Intl.Segmenter | null = null;

/**
 * Gets or creates the grapheme segmenter.
 */
function getSegmenter(): Intl.Segmenter | null {
	if (!hasIntlSegmenter) {
		return null;
	}
	if (!segmenterInstance) {
		segmenterInstance = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
	}
	return segmenterInstance;
}

// =============================================================================
// GRAPHEME ITERATION
// =============================================================================

/**
 * Iterates over grapheme clusters in a string.
 * Uses Intl.Segmenter when available for UAX #29 compliance.
 *
 * A grapheme cluster is what users perceive as a single character,
 * even if it's composed of multiple code points (e.g., emoji with ZWJ).
 *
 * @param str - The string to iterate
 * @yields Grapheme clusters
 *
 * @example
 * ```typescript
 * import { graphemeClusters } from 'blecsd';
 *
 * // Simple ASCII
 * [...graphemeClusters('ABC')];  // ['A', 'B', 'C']
 *
 * // Emoji with ZWJ (family)
 * [...graphemeClusters('👨‍👩‍👧')];  // ['👨‍👩‍👧']
 *
 * // Flag (regional indicators)
 * [...graphemeClusters('🇺🇸')];  // ['🇺🇸']
 *
 * // Skin tone modifier
 * [...graphemeClusters('👋🏽')];  // ['👋🏽']
 *
 * // Combining characters
 * [...graphemeClusters('é')];  // ['é'] (whether composed or decomposed)
 * ```
 */
export function* graphemeClusters(str: string): Generator<string, void, undefined> {
	if (str.length === 0) {
		return;
	}

	const segmenter = getSegmenter();

	if (segmenter) {
		// Use Intl.Segmenter for proper UAX #29 segmentation
		for (const segment of segmenter.segment(str)) {
			yield segment.segment;
		}
	} else {
		// Fallback: iterate by code points (not fully UAX #29 compliant)
		// This handles surrogate pairs but not ZWJ sequences or regional indicators
		for (const char of str) {
			yield char;
		}
	}
}

/**
 * Converts a string to an array of grapheme clusters.
 *
 * @param str - The string to convert
 * @returns Array of grapheme clusters
 *
 * @example
 * ```typescript
 * import { toGraphemes } from 'blecsd';
 *
 * toGraphemes('Hello');      // ['H', 'e', 'l', 'l', 'o']
 * toGraphemes('👨‍👩‍👧');        // ['👨‍👩‍👧']
 * toGraphemes('🇺🇸🇬🇧');      // ['🇺🇸', '🇬🇧']
 * ```
 */
export function toGraphemes(str: string): string[] {
	return [...graphemeClusters(str)];
}

// =============================================================================
// GRAPHEME COUNTING
// =============================================================================

/**
 * Counts the number of grapheme clusters in a string.
 * This represents the number of user-perceived characters.
 *
 * @param str - The string to count
 * @returns Number of grapheme clusters
 *
 * @example
 * ```typescript
 * import { graphemeCount } from 'blecsd';
 *
 * graphemeCount('Hello');     // 5
 * graphemeCount('👨‍👩‍👧');       // 1 (family emoji is one grapheme)
 * graphemeCount('🇺🇸');        // 1 (flag is one grapheme)
 * graphemeCount('café');      // 4 (whether composed or decomposed)
 *
 * // Compare with string.length
 * '👨‍👩‍👧'.length;             // 8 (code units)
 * graphemeCount('👨‍👩‍👧');       // 1 (grapheme)
 * ```
 */
export function graphemeCount(str: string): number {
	if (str.length === 0) {
		return 0;
	}

	const segmenter = getSegmenter();

	if (segmenter) {
		let count = 0;
		for (const _ of segmenter.segment(str)) {
			count++;
		}
		return count;
	}

	// Fallback: count code points
	let count = 0;
	for (const _ of str) {
		count++;
	}
	return count;
}

// =============================================================================
// GRAPHEME ACCESS
// =============================================================================

/**
 * Gets the grapheme cluster at a specific index.
 *
 * @param str - The string to access
 * @param index - Grapheme index (0-based)
 * @returns The grapheme at the index, or undefined if out of bounds
 *
 * @example
 * ```typescript
 * import { graphemeAt } from 'blecsd';
 *
 * graphemeAt('Hello', 1);     // 'e'
 * graphemeAt('👨‍👩‍👧ABC', 0);    // '👨‍👩‍👧'
 * graphemeAt('👨‍👩‍👧ABC', 1);    // 'A'
 * graphemeAt('Hello', 10);    // undefined
 * ```
 */
export function graphemeAt(str: string, index: number): string | undefined {
	if (index < 0) {
		return undefined;
	}

	let i = 0;
	for (const grapheme of graphemeClusters(str)) {
		if (i === index) {
			return grapheme;
		}
		i++;
	}

	return undefined;
}

/**
 * Slices a string by grapheme indices.
 *
 * @param str - The string to slice
 * @param start - Start grapheme index (inclusive)
 * @param end - End grapheme index (exclusive), defaults to end of string
 * @returns The sliced string
 *
 * @example
 * ```typescript
 * import { sliceGraphemes } from 'blecsd';
 *
 * sliceGraphemes('Hello', 1, 3);      // 'el'
 * sliceGraphemes('👨‍👩‍👧ABC', 0, 2);     // '👨‍👩‍👧A'
 * sliceGraphemes('🇺🇸🇬🇧🇫🇷', 1, 2);   // '🇬🇧'
 * ```
 */
export function sliceGraphemes(str: string, start: number, end?: number): string {
	const startIndex = start < 0 ? 0 : start;

	let result = '';
	let i = 0;

	for (const grapheme of graphemeClusters(str)) {
		if (end !== undefined && i >= end) {
			break;
		}
		if (i >= startIndex) {
			result += grapheme;
		}
		i++;
	}

	return result;
}

// =============================================================================
// GRAPHEME WIDTH
// =============================================================================

/**
 * Gets the display width of a single grapheme cluster.
 *
 * For most graphemes, this returns the width of the first code point.
 * For emoji sequences, this typically returns 2.
 *
 * @param grapheme - A single grapheme cluster
 * @returns Display width (0, 1, or 2)
 *
 * @example
 * ```typescript
 * import { graphemeWidth } from 'blecsd';
 *
 * graphemeWidth('A');       // 1
 * graphemeWidth('中');      // 2
 * graphemeWidth('👨‍👩‍👧');    // 2 (emoji is wide)
 * graphemeWidth('🇺🇸');     // 2 (flag is wide)
 * graphemeWidth('é');       // 1 (composed or decomposed)
 * ```
 */
export function graphemeWidth(grapheme: string): 0 | 1 | 2 {
	if (grapheme.length === 0) {
		return 0;
	}

	// Get the first code point
	const firstCodePoint = grapheme.codePointAt(0);
	if (firstCodePoint === undefined) {
		return 0;
	}

	// Check if this is an emoji sequence (starts with emoji or regional indicator)
	// Emoji sequences are typically rendered as wide
	if (isEmojiSequence(grapheme)) {
		return 2;
	}

	// For regular graphemes, use the first code point's width
	return getCharWidth(firstCodePoint) as 0 | 1 | 2;
}

/**
 * Checks if a grapheme is an emoji sequence.
 * This includes:
 * - Emoji with variation selectors
 * - Emoji with skin tone modifiers
 * - Emoji ZWJ sequences
 * - Regional indicator pairs (flags)
 */
function isEmojiSequence(grapheme: string): boolean {
	if (grapheme.length === 0) {
		return false;
	}

	const firstCodePoint = grapheme.codePointAt(0);
	if (firstCodePoint === undefined) {
		return false;
	}

	// Regional indicator (flags): U+1F1E6 to U+1F1FF
	if (firstCodePoint >= 0x1f1e6 && firstCodePoint <= 0x1f1ff) {
		return true;
	}

	// Emoji ranges
	if (
		(firstCodePoint >= 0x1f300 && firstCodePoint <= 0x1f9ff) || // Misc Symbols, Emoticons, etc.
		(firstCodePoint >= 0x1fa00 && firstCodePoint <= 0x1faff) || // Extended Pictographs
		(firstCodePoint >= 0x2600 && firstCodePoint <= 0x26ff) || // Misc Symbols
		(firstCodePoint >= 0x2700 && firstCodePoint <= 0x27bf) // Dingbats
	) {
		return true;
	}

	// Check for variation selector or ZWJ in the grapheme
	// VS16 (U+FE0F) indicates emoji presentation
	// ZWJ (U+200D) joins emoji
	if (grapheme.includes('\uFE0F') || grapheme.includes('\u200D')) {
		return true;
	}

	return false;
}

/**
 * Calculates the display width of a string using grapheme clusters.
 * This is more accurate than stringWidth() for complex emoji sequences.
 *
 * @param str - The string to measure
 * @returns Total display width in columns
 *
 * @example
 * ```typescript
 * import { stringWidthGrapheme } from 'blecsd';
 *
 * stringWidthGrapheme('Hello');     // 5
 * stringWidthGrapheme('中文');       // 4
 * stringWidthGrapheme('👨‍👩‍👧');       // 2 (one wide grapheme)
 * stringWidthGrapheme('Hello👨‍👩‍👧'); // 7 (5 + 2)
 *
 * // Compare with code point-based width
 * stringWidth('👨‍👩‍👧');             // 8 (counts each code point)
 * stringWidthGrapheme('👨‍👩‍👧');       // 2 (treats as single wide grapheme)
 * ```
 */
export function stringWidthGrapheme(str: string): number {
	let width = 0;

	for (const grapheme of graphemeClusters(str)) {
		width += graphemeWidth(grapheme);
	}

	return width;
}

// =============================================================================
// GRAPHEME-BASED STRING OPERATIONS
// =============================================================================

/**
 * Result of slicing a string by display width (grapheme-aware).
 */
export interface GraphemeSliceResult {
	/** The sliced string */
	text: string;
	/** The display width of the sliced string */
	width: number;
	/** Whether the string was truncated */
	truncated: boolean;
}

/**
 * Slices a string to fit within a maximum display width (grapheme-aware).
 *
 * @param str - The string to slice
 * @param maxWidth - Maximum display width
 * @returns The sliced string, its width, and whether it was truncated
 *
 * @example
 * ```typescript
 * import { sliceByWidthGrapheme } from 'blecsd';
 *
 * sliceByWidthGrapheme('Hello World', 8);
 * // { text: 'Hello Wo', width: 8, truncated: true }
 *
 * sliceByWidthGrapheme('Hello👨‍👩‍👧World', 7);
 * // { text: 'Hello👨‍👩‍👧', width: 7, truncated: true }
 * ```
 */
export function sliceByWidthGrapheme(str: string, maxWidth: number): GraphemeSliceResult {
	let width = 0;
	let result = '';

	for (const grapheme of graphemeClusters(str)) {
		const gw = graphemeWidth(grapheme);

		if (width + gw > maxWidth) {
			return { text: result, width, truncated: true };
		}

		width += gw;
		result += grapheme;
	}

	return { text: result, width, truncated: false };
}

/**
 * Truncates a string with ellipsis (grapheme-aware).
 *
 * @param str - The string to truncate
 * @param maxWidth - Maximum display width (must be >= 1)
 * @param ellipsis - Ellipsis string (default: '…')
 * @returns The truncated string with ellipsis if needed
 *
 * @example
 * ```typescript
 * import { truncateWithEllipsisGrapheme } from 'blecsd';
 *
 * truncateWithEllipsisGrapheme('Hello World', 8);     // 'Hello W…'
 * truncateWithEllipsisGrapheme('Hello👨‍👩‍👧World', 8);  // 'Hello👨‍👩‍👧…'
 * ```
 */
export function truncateWithEllipsisGrapheme(
	str: string,
	maxWidth: number,
	ellipsis = '…',
): string {
	const strW = stringWidthGrapheme(str);
	if (strW <= maxWidth) {
		return str;
	}

	const ellipsisW = stringWidthGrapheme(ellipsis);
	if (ellipsisW >= maxWidth) {
		return sliceByWidthGrapheme(ellipsis, maxWidth).text;
	}

	const contentWidth = maxWidth - ellipsisW;
	return sliceByWidthGrapheme(str, contentWidth).text + ellipsis;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Checks if Intl.Segmenter is available for proper grapheme segmentation.
 *
 * @returns true if Intl.Segmenter is available
 *
 * @example
 * ```typescript
 * import { hasGraphemeSegmenter } from 'blecsd';
 *
 * if (hasGraphemeSegmenter()) {
 *   // Full UAX #29 support available
 * } else {
 *   // Fallback to code point iteration
 * }
 * ```
 */
export function hasGraphemeSegmenter(): boolean {
	return hasIntlSegmenter;
}

/**
 * Reverses a string by grapheme clusters.
 * Unlike string.split('').reverse().join(''), this handles
 * multi-code-point graphemes correctly.
 *
 * @param str - The string to reverse
 * @returns The reversed string
 *
 * @example
 * ```typescript
 * import { reverseGraphemes } from 'blecsd';
 *
 * reverseGraphemes('Hello');     // 'olleH'
 * reverseGraphemes('👨‍👩‍👧ABC');    // 'CBA👨‍👩‍👧'
 * reverseGraphemes('🇺🇸🇬🇧');      // '🇬🇧🇺🇸'
 * ```
 */
export function reverseGraphemes(str: string): string {
	return toGraphemes(str).reverse().join('');
}
