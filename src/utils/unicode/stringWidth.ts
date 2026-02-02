/**
 * String width measurement for terminal display.
 * @module utils/unicode/stringWidth
 */

import { getCharWidth, isZeroWidthChar } from './widthTables';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for string width calculation.
 *
 * @example
 * ```typescript
 * import { stringWidth } from 'blecsd';
 *
 * // Default options
 * stringWidth('Hello\tWorld');  // Uses tabWidth: 8
 *
 * // Custom tab width
 * stringWidth('Hello\tWorld', { tabWidth: 4 });
 *
 * // CJK ambiguous chars as wide
 * stringWidth('αβγ', { ambiguousAsWide: true });
 * ```
 */
export interface WidthOptions {
	/**
	 * Width of tab characters in columns.
	 * @default 8
	 */
	tabWidth?: number;

	/**
	 * Treat ambiguous width characters as wide (2 columns).
	 * This is appropriate for CJK-locale terminals.
	 * @default false
	 */
	ambiguousAsWide?: boolean;
}

// =============================================================================
// CODE POINT WIDTH
// =============================================================================

/**
 * Gets the display width of a single code point.
 *
 * @param codePoint - Unicode code point (0 to 0x10FFFF)
 * @param ambiguousAsWide - Treat ambiguous width as 2 (default: false)
 * @returns Display width: 0, 1, or 2
 *
 * @example
 * ```typescript
 * import { codePointWidth } from 'blecsd';
 *
 * codePointWidth(0x0041);  // 1 - Latin 'A'
 * codePointWidth(0x4e00);  // 2 - CJK ideograph
 * codePointWidth(0x0300);  // 0 - Combining grave accent
 * codePointWidth(0x1f600); // 2 - Emoji
 * ```
 */
export function codePointWidth(codePoint: number, ambiguousAsWide = false): 0 | 1 | 2 {
	return getCharWidth(codePoint, ambiguousAsWide) as 0 | 1 | 2;
}

// =============================================================================
// SINGLE CHARACTER WIDTH
// =============================================================================

/**
 * Gets the display width of a single character string.
 * Handles surrogate pairs correctly.
 *
 * @param char - Single character (may be a surrogate pair)
 * @param ambiguousAsWide - Treat ambiguous width as 2 (default: false)
 * @returns Display width: 0, 1, or 2
 *
 * @example
 * ```typescript
 * import { charWidth } from 'blecsd';
 *
 * charWidth('A');  // 1
 * charWidth('中'); // 2
 * charWidth('😀'); // 2 (surrogate pair)
 * ```
 */
export function charWidth(char: string, ambiguousAsWide = false): 0 | 1 | 2 {
	if (char.length === 0) {
		return 0 as 0;
	}

	const codePoint = char.codePointAt(0);
	if (codePoint === undefined) {
		return 0 as 0;
	}

	return getCharWidth(codePoint, ambiguousAsWide) as 0 | 1 | 2;
}

/**
 * Gets the display width of the character at a specific index.
 * Handles surrogate pairs correctly.
 *
 * @param str - The string to check
 * @param index - Character index (0-based)
 * @param ambiguousAsWide - Treat ambiguous width as 2 (default: false)
 * @returns Display width: 0, 1, or 2, or -1 if index is out of bounds
 *
 * @example
 * ```typescript
 * import { charWidthAt } from 'blecsd';
 *
 * const str = 'A中😀';
 * charWidthAt(str, 0);  // 1 - 'A'
 * charWidthAt(str, 1);  // 2 - '中'
 * charWidthAt(str, 2);  // 2 - '😀'
 * charWidthAt(str, 3);  // -1 - out of bounds
 * ```
 */
export function charWidthAt(str: string, index: number, ambiguousAsWide = false): 0 | 1 | 2 | -1 {
	if (index < 0) {
		return -1;
	}

	// Iterate through code points to find the one at index
	let i = 0;
	for (const char of str) {
		if (i === index) {
			const codePoint = char.codePointAt(0);
			if (codePoint === undefined) {
				return 0 as 0;
			}
			return getCharWidth(codePoint, ambiguousAsWide) as 0 | 1 | 2;
		}
		i++;
	}

	return -1;
}

// =============================================================================
// STRING WIDTH
// =============================================================================

/**
 * Default tab width in columns.
 */
const DEFAULT_TAB_WIDTH = 8;

/**
 * Tab character code point.
 */
const TAB = 0x09;

/**
 * Calculates the display width of a string in terminal columns.
 *
 * - Handles surrogate pairs (emoji, supplementary characters)
 * - Combining characters have width 0
 * - Control characters have width 0
 * - CJK and fullwidth characters have width 2
 * - Tabs are configurable (default: 8)
 *
 * @param str - The string to measure
 * @param options - Width calculation options
 * @returns Total display width in columns
 *
 * @example
 * ```typescript
 * import { stringWidth } from 'blecsd';
 *
 * stringWidth('Hello');      // 5
 * stringWidth('你好');        // 4
 * stringWidth('Hello🚀');    // 7
 * stringWidth('café');       // 4 (combining accent is zero-width)
 * stringWidth('A\tB');       // 9 (A=1, tab=8)
 * stringWidth('A\tB', { tabWidth: 4 }); // 5 (A=1, tab=4)
 * ```
 */
export function stringWidth(str: string, options?: WidthOptions): number {
	const tabWidth = options?.tabWidth ?? DEFAULT_TAB_WIDTH;
	const ambiguousAsWide = options?.ambiguousAsWide ?? false;

	let width = 0;

	for (const char of str) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			continue;
		}

		// Handle tab specially
		if (codePoint === TAB) {
			// Tab advances to the next tab stop
			const remainder = width % tabWidth;
			width += tabWidth - remainder;
			continue;
		}

		width += getCharWidth(codePoint, ambiguousAsWide);
	}

	return width;
}

/**
 * Alias for stringWidth() for convenience.
 *
 * @param str - The string to measure
 * @param options - Width calculation options
 * @returns Total display width in columns
 *
 * @example
 * ```typescript
 * import { strWidth } from 'blecsd';
 *
 * strWidth('Hello世界');  // 9 (5 + 4)
 * ```
 */
export function strWidth(str: string, options?: WidthOptions): number {
	return stringWidth(str, options);
}

// =============================================================================
// STRING SLICING BY WIDTH
// =============================================================================

/**
 * Result of slicing a string by display width.
 */
export interface SliceResult {
	/** The sliced string */
	text: string;
	/** The display width of the sliced string */
	width: number;
	/** Whether the string was truncated */
	truncated: boolean;
}

/**
 * Slices a string to fit within a maximum display width.
 *
 * @param str - The string to slice
 * @param maxWidth - Maximum display width
 * @param options - Width calculation options
 * @returns The sliced string, its width, and whether it was truncated
 *
 * @example
 * ```typescript
 * import { sliceByWidth } from 'blecsd';
 *
 * sliceByWidth('Hello World', 8);
 * // { text: 'Hello Wo', width: 8, truncated: true }
 *
 * sliceByWidth('你好世界', 5);
 * // { text: '你好', width: 4, truncated: true }
 * // (Can't fit half of '世')
 *
 * sliceByWidth('Hi', 10);
 * // { text: 'Hi', width: 2, truncated: false }
 * ```
 */
export function sliceByWidth(str: string, maxWidth: number, options?: WidthOptions): SliceResult {
	const ambiguousAsWide = options?.ambiguousAsWide ?? false;
	const tabWidth = options?.tabWidth ?? DEFAULT_TAB_WIDTH;

	let width = 0;
	let result = '';

	for (const char of str) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			continue;
		}

		let charW: number;
		if (codePoint === TAB) {
			const remainder = width % tabWidth;
			charW = tabWidth - remainder;
		} else {
			charW = getCharWidth(codePoint, ambiguousAsWide);
		}

		if (width + charW > maxWidth) {
			return { text: result, width, truncated: true };
		}

		width += charW;
		result += char;
	}

	return { text: result, width, truncated: false };
}

/**
 * Truncates a string to fit within a maximum display width.
 * Simpler version of sliceByWidth() that just returns the string.
 *
 * @param str - The string to truncate
 * @param maxWidth - Maximum display width
 * @param options - Width calculation options
 * @returns The truncated string
 *
 * @example
 * ```typescript
 * import { truncateByWidth } from 'blecsd';
 *
 * truncateByWidth('Hello World', 8);  // 'Hello Wo'
 * truncateByWidth('你好世界', 5);      // '你好'
 * ```
 */
export function truncateByWidth(str: string, maxWidth: number, options?: WidthOptions): string {
	return sliceByWidth(str, maxWidth, options).text;
}

/**
 * Truncates a string with an ellipsis if it exceeds the maximum width.
 *
 * @param str - The string to truncate
 * @param maxWidth - Maximum display width (must be >= 1)
 * @param ellipsis - Ellipsis string (default: '…')
 * @param options - Width calculation options
 * @returns The truncated string with ellipsis if needed
 *
 * @example
 * ```typescript
 * import { truncateWithEllipsis } from 'blecsd';
 *
 * truncateWithEllipsis('Hello World', 8);     // 'Hello W…'
 * truncateWithEllipsis('Hello World', 8, '...'); // 'Hello...'
 * truncateWithEllipsis('Hi', 10);             // 'Hi'
 * ```
 */
export function truncateWithEllipsis(
	str: string,
	maxWidth: number,
	ellipsis = '…',
	options?: WidthOptions,
): string {
	const strW = stringWidth(str, options);
	if (strW <= maxWidth) {
		return str;
	}

	const ellipsisW = stringWidth(ellipsis, options);
	if (ellipsisW >= maxWidth) {
		// Can't fit even the ellipsis, return truncated ellipsis
		return truncateByWidth(ellipsis, maxWidth, options);
	}

	const contentWidth = maxWidth - ellipsisW;
	return truncateByWidth(str, contentWidth, options) + ellipsis;
}

// =============================================================================
// PADDING BY WIDTH
// =============================================================================

/**
 * Pads a string to a target width by adding characters to the right.
 *
 * @param str - The string to pad
 * @param targetWidth - Target display width
 * @param padChar - Padding character (default: ' ')
 * @param options - Width calculation options
 * @returns The padded string
 *
 * @example
 * ```typescript
 * import { padEndByWidth } from 'blecsd';
 *
 * padEndByWidth('Hi', 5);      // 'Hi   '
 * padEndByWidth('你好', 6);     // '你好  '
 * padEndByWidth('Hi', 5, '.'); // 'Hi...'
 * ```
 */
export function padEndByWidth(
	str: string,
	targetWidth: number,
	padChar = ' ',
	options?: WidthOptions,
): string {
	const strW = stringWidth(str, options);
	if (strW >= targetWidth) {
		return str;
	}

	const padW = charWidth(padChar, options?.ambiguousAsWide);
	if (padW === 0) {
		return str; // Can't pad with zero-width char
	}

	const padding = targetWidth - strW;
	const padCount = Math.floor(padding / padW);
	return str + padChar.repeat(padCount);
}

/**
 * Pads a string to a target width by adding characters to the left.
 *
 * @param str - The string to pad
 * @param targetWidth - Target display width
 * @param padChar - Padding character (default: ' ')
 * @param options - Width calculation options
 * @returns The padded string
 *
 * @example
 * ```typescript
 * import { padStartByWidth } from 'blecsd';
 *
 * padStartByWidth('Hi', 5);      // '   Hi'
 * padStartByWidth('你好', 6);     // '  你好'
 * padStartByWidth('Hi', 5, '0'); // '000Hi'
 * ```
 */
export function padStartByWidth(
	str: string,
	targetWidth: number,
	padChar = ' ',
	options?: WidthOptions,
): string {
	const strW = stringWidth(str, options);
	if (strW >= targetWidth) {
		return str;
	}

	const padW = charWidth(padChar, options?.ambiguousAsWide);
	if (padW === 0) {
		return str; // Can't pad with zero-width char
	}

	const padding = targetWidth - strW;
	const padCount = Math.floor(padding / padW);
	return padChar.repeat(padCount) + str;
}

/**
 * Centers a string within a target width.
 *
 * @param str - The string to center
 * @param targetWidth - Target display width
 * @param padChar - Padding character (default: ' ')
 * @param options - Width calculation options
 * @returns The centered string
 *
 * @example
 * ```typescript
 * import { centerByWidth } from 'blecsd';
 *
 * centerByWidth('Hi', 6);      // '  Hi  '
 * centerByWidth('你好', 8);     // '  你好  '
 * ```
 */
export function centerByWidth(
	str: string,
	targetWidth: number,
	padChar = ' ',
	options?: WidthOptions,
): string {
	const strW = stringWidth(str, options);
	if (strW >= targetWidth) {
		return str;
	}

	const padW = charWidth(padChar, options?.ambiguousAsWide);
	if (padW === 0) {
		return str; // Can't pad with zero-width char
	}

	const totalPadding = targetWidth - strW;
	const leftPadding = Math.floor(totalPadding / 2);
	const rightPadding = totalPadding - leftPadding;

	const leftCount = Math.floor(leftPadding / padW);
	const rightCount = Math.floor(rightPadding / padW);

	return padChar.repeat(leftCount) + str + padChar.repeat(rightCount);
}

// =============================================================================
// INDEX BY WIDTH
// =============================================================================

/**
 * Finds the character index at a given display column position.
 *
 * @param str - The string to search
 * @param column - Display column position (0-based)
 * @param options - Width calculation options
 * @returns Character index, or -1 if column is past the end
 *
 * @example
 * ```typescript
 * import { indexAtColumn } from 'blecsd';
 *
 * const str = 'A中B';
 * indexAtColumn(str, 0);  // 0 ('A')
 * indexAtColumn(str, 1);  // 1 ('中')
 * indexAtColumn(str, 2);  // 1 ('中' spans columns 1-2)
 * indexAtColumn(str, 3);  // 2 ('B')
 * indexAtColumn(str, 4);  // -1 (past end)
 * ```
 */
export function indexAtColumn(str: string, column: number, options?: WidthOptions): number {
	const ambiguousAsWide = options?.ambiguousAsWide ?? false;
	const tabWidth = options?.tabWidth ?? DEFAULT_TAB_WIDTH;

	if (column < 0) {
		return -1;
	}

	let currentColumn = 0;
	let index = 0;

	for (const char of str) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			index++;
			continue;
		}

		let charW: number;
		if (codePoint === TAB) {
			const remainder = currentColumn % tabWidth;
			charW = tabWidth - remainder;
		} else {
			charW = getCharWidth(codePoint, ambiguousAsWide);
		}

		// If column falls within this character's span
		if (column >= currentColumn && column < currentColumn + charW) {
			return index;
		}

		// Special case: column exactly at start of zero-width char
		if (charW === 0 && column === currentColumn) {
			return index;
		}

		currentColumn += charW;
		index++;
	}

	// Column is past the end
	return -1;
}

/**
 * Finds the display column position of a character at a given index.
 *
 * @param str - The string to search
 * @param index - Character index (0-based)
 * @param options - Width calculation options
 * @returns Starting column position, or -1 if index is out of bounds
 *
 * @example
 * ```typescript
 * import { columnAtIndex } from 'blecsd';
 *
 * const str = 'A中B';
 * columnAtIndex(str, 0);  // 0 ('A' at column 0)
 * columnAtIndex(str, 1);  // 1 ('中' at column 1)
 * columnAtIndex(str, 2);  // 3 ('B' at column 3)
 * columnAtIndex(str, 3);  // -1 (out of bounds)
 * ```
 */
export function columnAtIndex(str: string, index: number, options?: WidthOptions): number {
	const ambiguousAsWide = options?.ambiguousAsWide ?? false;
	const tabWidth = options?.tabWidth ?? DEFAULT_TAB_WIDTH;

	if (index < 0) {
		return -1;
	}

	let currentColumn = 0;
	let currentIndex = 0;

	for (const char of str) {
		if (currentIndex === index) {
			return currentColumn;
		}

		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			currentIndex++;
			continue;
		}

		let charW: number;
		if (codePoint === TAB) {
			const remainder = currentColumn % tabWidth;
			charW = tabWidth - remainder;
		} else {
			charW = getCharWidth(codePoint, ambiguousAsWide);
		}

		currentColumn += charW;
		currentIndex++;
	}

	return -1;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Checks if a string contains any wide (2-column) characters.
 *
 * @param str - The string to check
 * @returns true if the string contains wide characters
 *
 * @example
 * ```typescript
 * import { hasWideChars } from 'blecsd';
 *
 * hasWideChars('Hello');     // false
 * hasWideChars('Hello中');   // true
 * hasWideChars('Hello😀');  // true
 * ```
 */
export function hasWideChars(str: string): boolean {
	for (const char of str) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			continue;
		}
		if (getCharWidth(codePoint) === 2) {
			return true;
		}
	}
	return false;
}

/**
 * Checks if a string contains any zero-width characters.
 *
 * @param str - The string to check
 * @returns true if the string contains zero-width characters
 *
 * @example
 * ```typescript
 * import { hasZeroWidthChars } from 'blecsd';
 *
 * hasZeroWidthChars('Hello');     // false
 * hasZeroWidthChars('café');      // true (combining accent)
 * hasZeroWidthChars('a\u200Bb'); // true (zero-width space)
 * ```
 */
export function hasZeroWidthChars(str: string): boolean {
	for (const char of str) {
		const codePoint = char.codePointAt(0);
		if (codePoint === undefined) {
			continue;
		}
		if (isZeroWidthChar(codePoint)) {
			return true;
		}
	}
	return false;
}
