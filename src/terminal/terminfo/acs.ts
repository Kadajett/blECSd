/**
 * ACS (Alternate Character Set) character maps.
 *
 * Provides mappings for DEC Special Character and Line Drawing Set characters
 * used for box drawing, and Unicode to ASCII fallbacks for terminals that
 * don't support Unicode.
 *
 * @module terminal/terminfo/acs
 *
 * @example
 * ```typescript
 * import { ACS, getAcsChar, unicodeToAscii } from 'blecsd';
 *
 * // Get box drawing characters
 * const topLeft = ACS.ulcorner;     // '┌'
 * const horizontal = ACS.hline;     // '─'
 *
 * // Convert Unicode to ASCII fallback
 * const fallback = unicodeToAscii('┌');  // '+'
 * ```
 */

// =============================================================================
// ACS CODE MAPPINGS
// =============================================================================

/**
 * DEC Special Character and Line Drawing Set.
 *
 * Maps the single-character codes used in terminfo's acsc capability
 * to their corresponding Unicode characters.
 *
 * The codes are from VT100/VT220 terminal specifications:
 * - `l` = upper-left corner
 * - `m` = lower-left corner
 * - `k` = upper-right corner
 * - `j` = lower-right corner
 * - `t` = left tee
 * - `u` = right tee
 * - `v` = bottom tee
 * - `w` = top tee
 * - `q` = horizontal line
 * - `x` = vertical line
 * - `n` = cross/plus
 */
export const ACSC_CODES: Readonly<Record<string, string>> = {
	// Box drawing - corners
	l: '┌', // upper-left corner
	m: '└', // lower-left corner
	k: '┐', // upper-right corner
	j: '┘', // lower-right corner

	// Box drawing - tees
	t: '├', // left tee (right-pointing)
	u: '┤', // right tee (left-pointing)
	v: '┴', // bottom tee (upward)
	w: '┬', // top tee (downward)

	// Box drawing - lines
	q: '─', // horizontal line
	x: '│', // vertical line
	n: '┼', // cross/plus

	// Box drawing - double lines (extended)
	L: '╔', // double upper-left corner
	M: '╚', // double lower-left corner
	K: '╗', // double upper-right corner
	J: '╝', // double lower-right corner
	T: '╠', // double left tee
	U: '╣', // double right tee
	V: '╩', // double bottom tee
	W: '╦', // double top tee
	Q: '═', // double horizontal line
	X: '║', // double vertical line
	N: '╬', // double cross

	// Miscellaneous symbols
	'`': '◆', // diamond
	a: '▒', // checkerboard (stipple)
	b: '␉', // HT symbol
	c: '␌', // FF symbol
	d: '␍', // CR symbol
	e: '␊', // LF symbol
	f: '°', // degree symbol
	g: '±', // plus/minus
	h: '␤', // NL symbol
	i: '␋', // VT symbol
	o: '⎺', // scan line 1 (top)
	p: '⎻', // scan line 3
	r: '⎼', // scan line 7
	s: '⎽', // scan line 9 (bottom)
	y: '≤', // less than or equal
	z: '≥', // greater than or equal
	'{': 'π', // pi
	'|': '≠', // not equal
	'}': '£', // British pound
	'~': '·', // bullet/middle dot

	// Arrows
	'+': '→', // right arrow
	',': '←', // left arrow
	'-': '↑', // up arrow
	'.': '↓', // down arrow

	// Block elements
	'0': '█', // full block (ACS_BLOCK)
} as const;

/**
 * ACS character names to Unicode mapping.
 *
 * Named constants for box drawing and special characters.
 * These match the ncurses ACS_* naming convention.
 */
export const ACS = {
	// Corners
	ulcorner: '┌', // upper left corner
	urcorner: '┐', // upper right corner
	llcorner: '└', // lower left corner
	lrcorner: '┘', // lower right corner

	// Tee pieces
	ltee: '├', // left tee
	rtee: '┤', // right tee
	btee: '┴', // bottom tee
	ttee: '┬', // top tee

	// Lines
	hline: '─', // horizontal line
	vline: '│', // vertical line
	plus: '┼', // plus / crossover

	// Scan lines (for forms)
	s1: '⎺', // scan line 1
	s3: '⎻', // scan line 3
	s7: '⎼', // scan line 7
	s9: '⎽', // scan line 9

	// Symbols
	diamond: '◆',
	ckboard: '▒', // checkerboard (stipple)
	degree: '°',
	plminus: '±',
	bullet: '·',
	larrow: '←',
	rarrow: '→',
	darrow: '↓',
	uarrow: '↑',
	board: '░', // board of squares
	lantern: '☃', // lantern symbol
	block: '█', // solid square block

	// Less common
	lequal: '≤', // less than or equal
	gequal: '≥', // greater than or equal
	pi: 'π',
	nequal: '≠', // not equal
	sterling: '£', // UK pound sign

	// Double-line variants (not in standard ncurses)
	ulcorner_double: '╔',
	urcorner_double: '╗',
	llcorner_double: '╚',
	lrcorner_double: '╝',
	ltee_double: '╠',
	rtee_double: '╣',
	btee_double: '╩',
	ttee_double: '╦',
	hline_double: '═',
	vline_double: '║',
	plus_double: '╬',
} as const;

/**
 * ACS character type.
 */
export type AcsCharacter = keyof typeof ACS;

// =============================================================================
// UNICODE TO ASCII FALLBACK
// =============================================================================

/**
 * Unicode to ASCII fallback mapping.
 *
 * Maps Unicode box drawing and special characters to their
 * ASCII approximations for terminals that don't support Unicode.
 */
export const UNICODE_TO_ASCII: Readonly<Record<string, string>> = {
	// Box drawing - single line
	'┌': '+',
	'┐': '+',
	'└': '+',
	'┘': '+',
	'├': '+',
	'┤': '+',
	'┬': '+',
	'┴': '+',
	'┼': '+',
	'─': '-',
	'│': '|',

	// Box drawing - double line
	'╔': '+',
	'╗': '+',
	'╚': '+',
	'╝': '+',
	'╠': '+',
	'╣': '+',
	'╦': '+',
	'╩': '+',
	'╬': '+',
	'═': '=',
	'║': '|',

	// Box drawing - mixed single/double
	'╒': '+',
	'╓': '+',
	'╕': '+',
	'╖': '+',
	'╘': '+',
	'╙': '+',
	'╛': '+',
	'╜': '+',
	'╞': '+',
	'╟': '+',
	'╡': '+',
	'╢': '+',
	'╤': '+',
	'╥': '+',
	'╧': '+',
	'╨': '+',
	'╪': '+',
	'╫': '+',

	// Box drawing - heavy/light combinations
	'┍': '+',
	'┎': '+',
	'┑': '+',
	'┒': '+',
	'┕': '+',
	'┖': '+',
	'┙': '+',
	'┚': '+',
	'┝': '+',
	'┞': '+',
	'┟': '+',
	'┠': '+',
	'┡': '+',
	'┢': '+',
	'┥': '+',
	'┦': '+',
	'┧': '+',
	'┨': '+',
	'┩': '+',
	'┪': '+',
	'┭': '+',
	'┮': '+',
	'┯': '+',
	'┰': '+',
	'┱': '+',
	'┲': '+',
	'┵': '+',
	'┶': '+',
	'┷': '+',
	'┸': '+',
	'┹': '+',
	'┺': '+',
	'┽': '+',
	'┾': '+',
	'┿': '+',
	'╀': '+',
	'╁': '+',
	'╂': '+',
	'╃': '+',
	'╄': '+',
	'╅': '+',
	'╆': '+',
	'╇': '+',
	'╈': '+',
	'╉': '+',
	'╊': '+',
	'╋': '+',

	// Box drawing - rounded corners
	'╭': '+',
	'╮': '+',
	'╯': '+',
	'╰': '+',

	// Box drawing - dashed/dotted lines
	'┄': '-',
	'┅': '-',
	'┆': '|',
	'┇': '|',
	'┈': '-',
	'┉': '-',
	'┊': '|',
	'┋': '|',

	// Block elements
	'█': '#',
	'▀': '^',
	'▄': '_',
	'▌': '[',
	'▐': ']',
	'░': ':',
	'▒': '%',
	'▓': '#',
	'■': '#',
	'□': '.',

	// Arrows
	'←': '<',
	'→': '>',
	'↑': '^',
	'↓': 'v',
	'↔': '-',
	'↕': '|',
	'▲': '^',
	'▼': 'v',
	'◀': '<',
	'▶': '>',
	'◁': '<',
	'▷': '>',

	// Symbols
	'◆': '*',
	'◇': '*',
	'○': 'o',
	'●': '*',
	'◎': '@',
	'·': '.',
	'•': '*',
	'°': 'o',
	'±': '+',
	'≤': '<',
	'≥': '>',
	'≠': '!',
	π: 'p',
	'£': 'L',
	'€': 'E',
	'¥': 'Y',
	'©': 'c',
	'®': 'R',
	'™': 'T',
	'✓': 'v',
	'✔': 'v',
	'✕': 'x',
	'✖': 'x',
	'✗': 'x',
	'✘': 'x',

	// Scan lines
	'⎺': '-',
	'⎻': '-',
	'⎼': '-',
	'⎽': '_',

	// Control character symbols
	'␉': 'T',
	'␊': 'N',
	'␋': 'V',
	'␌': 'F',
	'␍': 'R',
	'␤': 'N',
	'␣': '_',
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parses a terminfo acsc (ACS character) string into a character map.
 *
 * The acsc string consists of pairs of characters:
 * - Odd positions: ACS code (input character)
 * - Even positions: Terminal character to send
 *
 * @param acsc - The acsc capability string from terminfo
 * @returns Map of ACS codes to terminal characters
 *
 * @example
 * ```typescript
 * import { parseAcsc } from 'blecsd';
 *
 * // Typical xterm acsc string
 * const acsc = '``aaffggjjkkllmmnnooppqqrrssttuuvvwwxxyyzz{{||}}~~';
 * const map = parseAcsc(acsc);
 *
 * // map.get('l') might return '\x0f' for upper-left corner
 * ```
 */
export function parseAcsc(acsc: string): Map<string, string> {
	const map = new Map<string, string>();

	for (let i = 0; i + 1 < acsc.length; i += 2) {
		const code = acsc[i];
		const char = acsc[i + 1];
		if (code && char) {
			map.set(code, char);
		}
	}

	return map;
}

/**
 * Gets an ACS character by name.
 *
 * @param name - ACS character name (e.g., 'ulcorner', 'hline')
 * @returns Unicode character or undefined
 *
 * @example
 * ```typescript
 * import { getAcsChar } from 'blecsd';
 *
 * getAcsChar('ulcorner');  // '┌'
 * getAcsChar('hline');     // '─'
 * getAcsChar('invalid');   // undefined
 * ```
 */
export function getAcsChar(name: AcsCharacter): string;
export function getAcsChar(name: string): string | undefined;
export function getAcsChar(name: string): string | undefined {
	return ACS[name as AcsCharacter];
}

/**
 * Gets an ACS character by its single-character code.
 *
 * @param code - Single character ACS code (e.g., 'l', 'q', 'x')
 * @returns Unicode character or the original code if not found
 *
 * @example
 * ```typescript
 * import { getAcsCharByCode } from 'blecsd';
 *
 * getAcsCharByCode('l');  // '┌' (upper-left corner)
 * getAcsCharByCode('q');  // '─' (horizontal line)
 * getAcsCharByCode('?');  // '?' (unknown, returns original)
 * ```
 */
export function getAcsCharByCode(code: string): string {
	return ACSC_CODES[code] ?? code;
}

/**
 * Converts a Unicode character to its ASCII fallback.
 *
 * @param char - Unicode character
 * @returns ASCII equivalent or original character if no mapping exists
 *
 * @example
 * ```typescript
 * import { unicodeToAscii } from 'blecsd';
 *
 * unicodeToAscii('┌');  // '+'
 * unicodeToAscii('─');  // '-'
 * unicodeToAscii('A');  // 'A' (no mapping, returns original)
 * ```
 */
export function unicodeToAscii(char: string): string {
	return UNICODE_TO_ASCII[char] ?? char;
}

/**
 * Converts a string containing Unicode characters to ASCII.
 *
 * @param str - String with potential Unicode characters
 * @returns String with Unicode replaced by ASCII equivalents
 *
 * @example
 * ```typescript
 * import { stringToAscii } from 'blecsd';
 *
 * stringToAscii('┌──────┐');  // '+------+'
 * stringToAscii('│ Hello │');  // '| Hello |'
 * ```
 */
export function stringToAscii(str: string): string {
	let result = '';
	for (const char of str) {
		result += unicodeToAscii(char);
	}
	return result;
}

/**
 * Checks if a character is an ACS box drawing character.
 *
 * @param char - Character to check
 * @returns true if the character is a box drawing character
 *
 * @example
 * ```typescript
 * import { isBoxDrawingChar } from 'blecsd';
 *
 * isBoxDrawingChar('┌');  // true
 * isBoxDrawingChar('A');  // false
 * ```
 */
export function isBoxDrawingChar(char: string): boolean {
	const code = char.charCodeAt(0);
	// Box Drawing block: U+2500 to U+257F
	return code >= 0x2500 && code <= 0x257f;
}

/**
 * Checks if a string contains any box drawing characters.
 *
 * @param str - String to check
 * @returns true if the string contains box drawing characters
 */
export function containsBoxDrawing(str: string): boolean {
	for (const char of str) {
		if (isBoxDrawingChar(char)) {
			return true;
		}
	}
	return false;
}

/**
 * Creates a box drawing string using ACS characters.
 *
 * @param width - Width of the box (including borders)
 * @param height - Height of the box (including borders)
 * @param style - Box style ('single', 'double', 'rounded')
 * @returns Array of strings representing box lines
 *
 * @example
 * ```typescript
 * import { createBox } from 'blecsd';
 *
 * const box = createBox(10, 5, 'single');
 * // Returns:
 * // ['┌────────┐',
 * //  '│        │',
 * //  '│        │',
 * //  '│        │',
 * //  '└────────┘']
 * ```
 */
export function createBox(
	width: number,
	height: number,
	style: 'single' | 'double' | 'rounded' = 'single',
): string[] {
	const innerWidth = Math.max(0, width - 2);
	const innerHeight = Math.max(0, height - 2);

	let tl: string;
	let tr: string;
	let bl: string;
	let br: string;
	let h: string;
	let v: string;

	switch (style) {
		case 'double':
			tl = ACS.ulcorner_double;
			tr = ACS.urcorner_double;
			bl = ACS.llcorner_double;
			br = ACS.lrcorner_double;
			h = ACS.hline_double;
			v = ACS.vline_double;
			break;
		case 'rounded':
			tl = '╭';
			tr = '╮';
			bl = '╰';
			br = '╯';
			h = ACS.hline;
			v = ACS.vline;
			break;
		default:
			tl = ACS.ulcorner;
			tr = ACS.urcorner;
			bl = ACS.llcorner;
			br = ACS.lrcorner;
			h = ACS.hline;
			v = ACS.vline;
	}

	const lines: string[] = [];

	// Top border
	lines.push(tl + h.repeat(innerWidth) + tr);

	// Middle rows
	const middleRow = v + ' '.repeat(innerWidth) + v;
	for (let i = 0; i < innerHeight; i++) {
		lines.push(middleRow);
	}

	// Bottom border
	lines.push(bl + h.repeat(innerWidth) + br);

	return lines;
}

/**
 * Gets all ACS character names.
 *
 * @returns Array of ACS character names
 *
 * @example
 * ```typescript
 * import { getAcsCharNames } from 'blecsd';
 *
 * const names = getAcsCharNames();
 * // ['ulcorner', 'urcorner', 'llcorner', ...]
 * ```
 */
export function getAcsCharNames(): readonly AcsCharacter[] {
	return Object.keys(ACS) as AcsCharacter[];
}
