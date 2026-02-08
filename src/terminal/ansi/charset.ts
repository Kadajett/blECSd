/**
 * ANSI Character Set Handling
 *
 * Character set designation and box drawing utilities.
 * Supports DEC Special Graphics, international character sets,
 * and box drawing characters.
 *
 * @module terminal/ansi/charset
 * @internal This module is internal and not exported from the main package.
 */

import { ESC } from './constants';

/**
 * Character set identifiers for G0-G3 designation.
 *
 * These correspond to the final characters in the escape sequence
 * that designates which character set to use.
 */
export type CharacterSetId =
	/** DEC Special Graphics (line drawing) */
	| 'dec-graphics'
	/** US ASCII (default) */
	| 'us-ascii'
	/** UK ASCII (£ instead of #) */
	| 'uk'
	/** Dutch */
	| 'dutch'
	/** Finnish */
	| 'finnish'
	/** French */
	| 'french'
	/** French Canadian */
	| 'french-canadian'
	/** German */
	| 'german'
	/** Italian */
	| 'italian'
	/** Norwegian/Danish */
	| 'norwegian-danish'
	/** Spanish */
	| 'spanish'
	/** Swedish */
	| 'swedish'
	/** Swiss */
	| 'swiss'
	/** ISO Latin-1 Supplemental */
	| 'iso-latin';

/**
 * G0-G3 register identifiers.
 *
 * The terminal maintains four character set registers (G0-G3) that can
 * each hold a different character set. GL and GR are the "working" areas
 * that get mapped to the left (00-7F) and right (80-FF) halves of the
 * character space.
 */
export type CharacterSetRegister = 0 | 1 | 2 | 3;

/**
 * Maps character set IDs to their escape sequence final characters.
 *
 * @internal
 */
const CHARSET_CODES: Record<CharacterSetId, string> = {
	'dec-graphics': '0',
	'us-ascii': 'B',
	uk: 'A',
	dutch: '4',
	finnish: 'C', // Also '5'
	french: 'R',
	'french-canadian': 'Q',
	german: 'K',
	italian: 'Y',
	'norwegian-danish': 'E', // Also '6'
	spanish: 'Z',
	swedish: 'H', // Also '7'
	swiss: '=',
	'iso-latin': '/A',
};

/**
 * Escape sequence introducers for G0-G3 designation.
 *
 * @internal
 */
const GN_INTRODUCERS: Record<CharacterSetRegister, string> = {
	0: '(',
	1: ')',
	2: '*',
	3: '+',
};

/**
 * DEC Special Graphics character set (VT100 line drawing).
 *
 * This maps the characters that the terminal interprets when in
 * DEC Special Graphics mode (after designating with ESC(0).
 * The keys are the input characters and values are Unicode equivalents.
 *
 * @example
 * ```typescript
 * import { DEC_SPECIAL_GRAPHICS } from 'blecsd/terminal';
 *
 * // Get the box-drawing horizontal line character
 * const horizontalLine = DEC_SPECIAL_GRAPHICS['q']; // '─'
 *
 * // Get corner characters for a box
 * const topLeft = DEC_SPECIAL_GRAPHICS['l'];     // '┌'
 * const topRight = DEC_SPECIAL_GRAPHICS['k'];    // '┐'
 * const bottomLeft = DEC_SPECIAL_GRAPHICS['m'];  // '└'
 * const bottomRight = DEC_SPECIAL_GRAPHICS['j']; // '┘'
 * ```
 */
export const DEC_SPECIAL_GRAPHICS: Readonly<Record<string, string>> = {
	// Box drawing: corners
	j: '\u2518', // '┘' - box corner bottom-right
	k: '\u2510', // '┐' - box corner top-right
	l: '\u250c', // '┌' - box corner top-left
	m: '\u2514', // '└' - box corner bottom-left

	// Box drawing: lines
	q: '\u2500', // '─' - horizontal line
	x: '\u2502', // '│' - vertical line

	// Box drawing: tees
	n: '\u253c', // '┼' - cross
	t: '\u251c', // '├' - tee pointing right
	u: '\u2524', // '┤' - tee pointing left
	v: '\u2534', // '┴' - tee pointing up
	w: '\u252c', // '┬' - tee pointing down

	// Scan lines (for form drawing)
	o: '\u23ba', // '⎺' - scan line 1
	p: '\u23bb', // '⎻' - scan line 3
	r: '\u23bc', // '⎼' - scan line 7
	s: '\u23bd', // '⎽' - scan line 9

	// Symbols
	'`': '\u25c6', // '◆' - diamond
	a: '\u2592', // '▒' - checkerboard
	f: '\u00b0', // '°' - degree symbol
	g: '\u00b1', // '±' - plus-minus
	h: '\u2424', // '␤' - newline symbol (NL)
	y: '\u2264', // '≤' - less than or equal
	z: '\u2265', // '≥' - greater than or equal
	'{': '\u03c0', // 'π' - pi
	'|': '\u2260', // '≠' - not equal
	'}': '\u00a3', // '£' - pound sign
	'~': '\u00b7', // '·' - centered dot

	// Control characters (whitespace)
	b: '\u0009', // tab
	c: '\u000c', // form feed
	d: '\u000d', // carriage return
	e: '\u000a', // line feed
	i: '\u000b', // vertical tab
};

/**
 * ASCII fallback characters for Unicode box drawing.
 *
 * When a terminal doesn't support Unicode, these ASCII characters
 * can be used as approximations of the box drawing characters.
 *
 * @example
 * ```typescript
 * import { UNICODE_TO_ASCII } from 'blecsd/terminal';
 *
 * // Convert Unicode to ASCII fallback
 * const char = '\u2500'; // '─'
 * const ascii = UNICODE_TO_ASCII[char]; // '-'
 * ```
 */
export const UNICODE_TO_ASCII: Readonly<Record<string, string>> = {
	'\u25c6': '*', // '◆' -> '*'
	'\u2592': ' ', // '▒' -> ' '
	'\u00b0': '*', // '°' -> '*'
	'\u00b1': '+', // '±' -> '+'
	'\u2424': '\n', // '␤' -> newline
	'\u2518': '+', // '┘' -> '+'
	'\u2510': '+', // '┐' -> '+'
	'\u250c': '+', // '┌' -> '+'
	'\u2514': '+', // '└' -> '+'
	'\u253c': '+', // '┼' -> '+'
	'\u23ba': '-', // '⎺' -> '-'
	'\u23bb': '-', // '⎻' -> '-'
	'\u2500': '-', // '─' -> '-'
	'\u23bc': '-', // '⎼' -> '-'
	'\u23bd': '_', // '⎽' -> '_'
	'\u251c': '+', // '├' -> '+'
	'\u2524': '+', // '┤' -> '+'
	'\u2534': '+', // '┴' -> '+'
	'\u252c': '+', // '┬' -> '+'
	'\u2502': '|', // '│' -> '|'
	'\u2264': '<', // '≤' -> '<'
	'\u2265': '>', // '≥' -> '>'
	'\u03c0': '*', // 'π' -> '*'
	'\u2260': '!', // '≠' -> '!'
	'\u00a3': '#', // '£' -> '#'
	'\u00b7': '.', // '·' -> '.'
};

/**
 * Character set handling namespace.
 *
 * Provides functions for:
 * - Designating character sets to G0-G3 registers
 * - Invoking character sets into GL/GR
 * - Entering/exiting alternate character set mode
 * - Single shift operations for individual characters
 *
 * @example
 * ```typescript
 * import { charset } from 'blecsd/terminal';
 *
 * // Enter DEC line drawing mode and draw a box
 * const boxTop = charset.enterAcs() + 'lqqqqk' + charset.exitAcs();
 *
 * // Or designate DEC graphics to G0 and use SI/SO
 * const setup = charset.designate('dec-graphics', 0);
 * // Later use charset.invokeG0() and charset.invokeG1() to switch
 * ```
 */
export const charset = {
	/**
	 * Designate a character set to a G0-G3 register.
	 *
	 * This loads a character set into one of the four registers.
	 * To actually use it, you must invoke the register into GL or GR.
	 *
	 * @param set - The character set to load
	 * @param gn - The register (0-3, default 0)
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Load DEC graphics into G0
	 * process.stdout.write(charset.designate('dec-graphics', 0));
	 *
	 * // Load UK character set into G1
	 * process.stdout.write(charset.designate('uk', 1));
	 * ```
	 */
	designate(set: CharacterSetId, gn: CharacterSetRegister = 0): string {
		const code = CHARSET_CODES[set];
		const introducer = GN_INTRODUCERS[gn];
		return `${ESC}${introducer}${code}`;
	},

	/**
	 * Invoke G0 into GL (Shift In / SI).
	 *
	 * Makes G0 the active character set for the left half (00-7F).
	 * This is the default state.
	 *
	 * @returns The SI (0x0F) control character
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Switch back to G0 after using G1
	 * process.stdout.write(charset.invokeG0());
	 * ```
	 */
	invokeG0(): string {
		return '\x0f'; // SI (Shift In)
	},

	/**
	 * Invoke G1 into GL (Shift Out / SO).
	 *
	 * Makes G1 the active character set for the left half (00-7F).
	 *
	 * @returns The SO (0x0E) control character
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Designate DEC graphics to G1, then invoke it
	 * process.stdout.write(charset.designate('dec-graphics', 1));
	 * process.stdout.write(charset.invokeG1());
	 * // Now drawing characters will be line-drawing
	 * ```
	 */
	invokeG1(): string {
		return '\x0e'; // SO (Shift Out)
	},

	/**
	 * Invoke G2 into GL (LS2 - Locking Shift 2).
	 *
	 * Makes G2 the active character set for the left half (00-7F).
	 *
	 * @returns The LS2 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * process.stdout.write(charset.designate('german', 2));
	 * process.stdout.write(charset.invokeG2());
	 * ```
	 */
	invokeG2(): string {
		return `${ESC}n`; // LS2
	},

	/**
	 * Invoke G3 into GL (LS3 - Locking Shift 3).
	 *
	 * Makes G3 the active character set for the left half (00-7F).
	 *
	 * @returns The LS3 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * process.stdout.write(charset.designate('french', 3));
	 * process.stdout.write(charset.invokeG3());
	 * ```
	 */
	invokeG3(): string {
		return `${ESC}o`; // LS3
	},

	/**
	 * Invoke G1 into GR (LS1R - Locking Shift 1 Right).
	 *
	 * Makes G1 the active character set for the right half (80-FF).
	 *
	 * @returns The LS1R escape sequence
	 */
	invokeG1R(): string {
		return `${ESC}~`; // LS1R
	},

	/**
	 * Invoke G2 into GR (LS2R - Locking Shift 2 Right).
	 *
	 * Makes G2 the active character set for the right half (80-FF).
	 *
	 * @returns The LS2R escape sequence
	 */
	invokeG2R(): string {
		return `${ESC}}`; // LS2R
	},

	/**
	 * Invoke G3 into GR (LS3R - Locking Shift 3 Right).
	 *
	 * Makes G3 the active character set for the right half (80-FF).
	 *
	 * @returns The LS3R escape sequence
	 */
	invokeG3R(): string {
		return `${ESC}|`; // LS3R
	},

	/**
	 * Single shift to G2 (SS2).
	 *
	 * The next character will use G2, then return to current GL.
	 *
	 * @returns The SS2 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Use G2 for just the next character
	 * process.stdout.write(charset.singleShiftG2() + 'x');
	 * ```
	 */
	singleShiftG2(): string {
		return `${ESC}N`; // SS2
	},

	/**
	 * Single shift to G3 (SS3).
	 *
	 * The next character will use G3, then return to current GL.
	 *
	 * @returns The SS3 escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Use G3 for just the next character
	 * process.stdout.write(charset.singleShiftG3() + 'x');
	 * ```
	 */
	singleShiftG3(): string {
		return `${ESC}O`; // SS3
	},

	/**
	 * Enter alternate character set mode (smacs).
	 *
	 * This is a convenience function that designates DEC Special Graphics
	 * to G0 and is the standard way to enable line drawing characters.
	 *
	 * @returns The escape sequence to enter ACS mode
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // Draw a box using ACS mode
	 * let box = '';
	 * box += charset.enterAcs();
	 * box += 'lqqqqqqqqqk\n'; // ┌─────────┐
	 * box += 'x         x\n'; // │         │
	 * box += 'mqqqqqqqqqj';   // └─────────┘
	 * box += charset.exitAcs();
	 * process.stdout.write(box);
	 * ```
	 */
	enterAcs(): string {
		return `${ESC}(0`; // Designate DEC graphics to G0
	},

	/**
	 * Exit alternate character set mode (rmacs).
	 *
	 * This restores the normal US ASCII character set to G0.
	 *
	 * @returns The escape sequence to exit ACS mode
	 *
	 * @example
	 * ```typescript
	 * import { charset } from 'blecsd/terminal';
	 *
	 * // After drawing, return to normal text
	 * process.stdout.write(charset.exitAcs());
	 * process.stdout.write('Normal text');
	 * ```
	 */
	exitAcs(): string {
		return `${ESC}(B`; // Designate US ASCII to G0
	},

	/**
	 * Alias for enterAcs() - enter alternate character set mode.
	 */
	smacs(): string {
		return charset.enterAcs();
	},

	/**
	 * Alias for exitAcs() - exit alternate character set mode.
	 */
	rmacs(): string {
		return charset.exitAcs();
	},
} as const;

/**
 * Box drawing utilities for creating text-mode UI.
 *
 * Provides pre-built character sets for different box styles.
 *
 * @example
 * ```typescript
 * import { boxDrawing } from 'blecsd/terminal';
 *
 * // Get Unicode box characters
 * const box = boxDrawing.unicode;
 * console.log(box.topLeft + box.horizontal + box.topRight);
 *
 * // Get ASCII fallback characters
 * const asciiBox = boxDrawing.ascii;
 * console.log(asciiBox.topLeft + asciiBox.horizontal + asciiBox.topRight);
 * ```
 */
export const boxDrawing = {
	/**
	 * Unicode single-line box drawing characters.
	 */
	unicode: {
		topLeft: '\u250c', // '┌'
		topRight: '\u2510', // '┐'
		bottomLeft: '\u2514', // '└'
		bottomRight: '\u2518', // '┘'
		horizontal: '\u2500', // '─'
		vertical: '\u2502', // '│'
		cross: '\u253c', // '┼'
		teeRight: '\u251c', // '├'
		teeLeft: '\u2524', // '┤'
		teeUp: '\u2534', // '┴'
		teeDown: '\u252c', // '┬'
	},

	/**
	 * Unicode double-line box drawing characters.
	 */
	unicodeDouble: {
		topLeft: '\u2554', // '╔'
		topRight: '\u2557', // '╗'
		bottomLeft: '\u255a', // '╚'
		bottomRight: '\u255d', // '╝'
		horizontal: '\u2550', // '═'
		vertical: '\u2551', // '║'
		cross: '\u256c', // '╬'
		teeRight: '\u2560', // '╠'
		teeLeft: '\u2563', // '╣'
		teeUp: '\u2569', // '╩'
		teeDown: '\u2566', // '╦'
	},

	/**
	 * Unicode rounded corner box drawing characters.
	 */
	unicodeRounded: {
		topLeft: '\u256d', // '╭'
		topRight: '\u256e', // '╮'
		bottomLeft: '\u2570', // '╰'
		bottomRight: '\u256f', // '╯'
		horizontal: '\u2500', // '─'
		vertical: '\u2502', // '│'
		cross: '\u253c', // '┼'
		teeRight: '\u251c', // '├'
		teeLeft: '\u2524', // '┤'
		teeUp: '\u2534', // '┴'
		teeDown: '\u252c', // '┬'
	},

	/**
	 * ASCII fallback box drawing characters.
	 */
	ascii: {
		topLeft: '+',
		topRight: '+',
		bottomLeft: '+',
		bottomRight: '+',
		horizontal: '-',
		vertical: '|',
		cross: '+',
		teeRight: '+',
		teeLeft: '+',
		teeUp: '+',
		teeDown: '+',
	},

	/**
	 * DEC VT100 line drawing characters (for use with ACS mode).
	 *
	 * These are the raw characters to send when in ACS mode.
	 * The terminal will translate them to line drawing.
	 */
	decGraphics: {
		topLeft: 'l',
		topRight: 'k',
		bottomLeft: 'm',
		bottomRight: 'j',
		horizontal: 'q',
		vertical: 'x',
		cross: 'n',
		teeRight: 't',
		teeLeft: 'u',
		teeUp: 'v',
		teeDown: 'w',
	},
} as const;

/**
 * Type for box drawing character sets.
 */
export type BoxDrawingSet = (typeof boxDrawing)['unicode'];
