/**
 * Key event parser for ANSI escape sequences.
 * Rewrite of blessed keys.js with strict typing.
 * @module terminal/keyParser
 */

import { z } from 'zod';

/**
 * All recognized key names.
 * Includes letters, numbers, function keys, and navigation keys.
 */
export type KeyName =
	// Letters
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z'
	// Numbers
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	// Function keys
	| 'f1'
	| 'f2'
	| 'f3'
	| 'f4'
	| 'f5'
	| 'f6'
	| 'f7'
	| 'f8'
	| 'f9'
	| 'f10'
	| 'f11'
	| 'f12'
	// Navigation
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'home'
	| 'end'
	| 'pageup'
	| 'pagedown'
	| 'insert'
	| 'delete'
	| 'clear'
	// Special keys
	| 'return'
	| 'enter'
	| 'tab'
	| 'backspace'
	| 'escape'
	| 'space'
	// Punctuation and symbols
	| '!'
	| '@'
	| '#'
	| '$'
	| '%'
	| '^'
	| '&'
	| '*'
	| '('
	| ')'
	| '-'
	| '_'
	| '='
	| '+'
	| '['
	| ']'
	| '{'
	| '}'
	| '\\'
	| '|'
	| ';'
	| ':'
	| "'"
	| '"'
	| ','
	| '.'
	| '<'
	| '>'
	| '/'
	| '?'
	| '`'
	| '~'
	// Unknown key
	| 'undefined';

/**
 * All valid key name values as an array for Zod schema.
 */
const KEY_NAMES: readonly KeyName[] = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'w',
	'x',
	'y',
	'z',
	'0',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'f1',
	'f2',
	'f3',
	'f4',
	'f5',
	'f6',
	'f7',
	'f8',
	'f9',
	'f10',
	'f11',
	'f12',
	'up',
	'down',
	'left',
	'right',
	'home',
	'end',
	'pageup',
	'pagedown',
	'insert',
	'delete',
	'clear',
	'return',
	'enter',
	'tab',
	'backspace',
	'escape',
	'space',
	'!',
	'@',
	'#',
	'$',
	'%',
	'^',
	'&',
	'*',
	'(',
	')',
	'-',
	'_',
	'=',
	'+',
	'[',
	']',
	'{',
	'}',
	'\\',
	'|',
	';',
	':',
	"'",
	'"',
	',',
	'.',
	'<',
	'>',
	'/',
	'?',
	'`',
	'~',
	'undefined',
] as const;

/**
 * Parsed keyboard event with modifiers.
 *
 * @example
 * ```typescript
 * import { parseKeySequence, KeyEvent } from 'blecsd';
 *
 * const event = parseKeySequence(Buffer.from([0x1b, 0x5b, 0x41]));
 * if (event) {
 *   console.log(event.name); // 'up'
 *   console.log(event.ctrl); // false
 * }
 * ```
 */
export interface KeyEvent {
	/** The raw sequence string that generated this event */
	readonly sequence: string;
	/** Normalized key name */
	readonly name: KeyName;
	/** Ctrl modifier was pressed */
	readonly ctrl: boolean;
	/** Alt/Meta modifier was pressed */
	readonly meta: boolean;
	/** Shift modifier was pressed */
	readonly shift: boolean;
	/** Terminal-specific escape code (if applicable) */
	readonly code?: string;
	/** Raw buffer data */
	readonly raw: Uint8Array;
}

/**
 * Zod schema for KeyEvent validation.
 *
 * @example
 * ```typescript
 * import { KeyEventSchema } from 'blecsd';
 *
 * const result = KeyEventSchema.safeParse(event);
 * if (result.success) {
 *   console.log('Valid key event');
 * }
 * ```
 */
export const KeyEventSchema = z.object({
	sequence: z.string(),
	name: z.enum(KEY_NAMES as unknown as [KeyName, ...KeyName[]]),
	ctrl: z.boolean(),
	meta: z.boolean(),
	shift: z.boolean(),
	code: z.string().optional(),
	raw: z.instanceof(Uint8Array),
});

// ESC character code
const ESC = '\x1b';
const ESC_CODE = 0x1b;

// Regex patterns for escape sequence parsing
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is required for terminal input parsing
const META_KEY_RE = /^(?:\x1b)([a-zA-Z0-9])$/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is required for terminal input parsing
const META_KEY_RE_ANYWHERE = /(?:\x1b)([a-zA-Z0-9])/;

// Function key and control sequence pattern (anchored for single sequence parsing)
// Uses string-based RegExp to avoid biome control char lint
const FUNCTION_KEY_RE = new RegExp(
	'^(?:\\x1b+)(O|N|\\[|\\[\\[)(?:' +
		['(\\d+)(?:;(\\d+))?([~^$])', '(?:1;)?(\\d+)?([a-zA-Z])'].join('|') +
		')',
);

// Function key pattern (anywhere in string for buffer parsing)
// Uses string-based RegExp to avoid biome control char lint
const FUNCTION_KEY_RE_ANYWHERE = new RegExp(
	'(?:\\x1b+)(O|N|\\[|\\[\\[)(?:' +
		['(\\d+)(?:;(\\d+))?([~^$])', '(?:1;)?(\\d+)?([a-zA-Z])'].join('|') +
		')',
);

// Escape code to key name mappings
const ESCAPE_CODE_MAP: Readonly<Record<string, KeyName>> = {
	// xterm/gnome ESC O letter (F1-F4)
	OP: 'f1',
	OQ: 'f2',
	OR: 'f3',
	OS: 'f4',

	// xterm/rxvt ESC [ number ~ (F1-F4)
	'[11~': 'f1',
	'[12~': 'f2',
	'[13~': 'f3',
	'[14~': 'f4',

	// Cygwin and libuv
	'[[A': 'f1',
	'[[B': 'f2',
	'[[C': 'f3',
	'[[D': 'f4',
	'[[E': 'f5',

	// Common F5-F12
	'[15~': 'f5',
	'[17~': 'f6',
	'[18~': 'f7',
	'[19~': 'f8',
	'[20~': 'f9',
	'[21~': 'f10',
	'[23~': 'f11',
	'[24~': 'f12',

	// xterm ESC [ letter - arrows and navigation
	'[A': 'up',
	'[B': 'down',
	'[C': 'right',
	'[D': 'left',
	'[E': 'clear',
	'[F': 'end',
	'[H': 'home',

	// xterm/gnome ESC O letter - arrows and navigation
	OA: 'up',
	OB: 'down',
	OC: 'right',
	OD: 'left',
	OE: 'clear',
	OF: 'end',
	OH: 'home',

	// xterm/rxvt ESC [ number ~ - navigation
	'[1~': 'home',
	'[2~': 'insert',
	'[3~': 'delete',
	'[4~': 'end',
	'[5~': 'pageup',
	'[6~': 'pagedown',

	// PuTTY
	'[[5~': 'pageup',
	'[[6~': 'pagedown',

	// rxvt
	'[7~': 'home',
	'[8~': 'end',

	// rxvt with shift
	'[a': 'up',
	'[b': 'down',
	'[c': 'right',
	'[d': 'left',
	'[e': 'clear',

	'[2$': 'insert',
	'[3$': 'delete',
	'[5$': 'pageup',
	'[6$': 'pagedown',
	'[7$': 'home',
	'[8$': 'end',

	// rxvt with ctrl
	Oa: 'up',
	Ob: 'down',
	Oc: 'right',
	Od: 'left',
	Oe: 'clear',

	'[2^': 'insert',
	'[3^': 'delete',
	'[5^': 'pageup',
	'[6^': 'pagedown',
	'[7^': 'home',
	'[8^': 'end',

	// Shift+Tab
	'[Z': 'tab',
};

// Shift modifier codes (rxvt style with $ suffix)
const SHIFT_CODES = new Set([
	'[a',
	'[b',
	'[c',
	'[d',
	'[e',
	'[2$',
	'[3$',
	'[5$',
	'[6$',
	'[7$',
	'[8$',
	'[Z',
]);

// Ctrl modifier codes (rxvt style with ^ suffix)
const CTRL_CODES = new Set([
	'Oa',
	'Ob',
	'Oc',
	'Od',
	'Oe',
	'[2^',
	'[3^',
	'[5^',
	'[6^',
	'[7^',
	'[8^',
]);

// Special key mappings for single/double char sequences
const SPECIAL_KEY_MAP: Readonly<Record<string, { name: KeyName; meta?: boolean }>> = {
	'\r': { name: 'return' },
	'\n': { name: 'enter' },
	'\t': { name: 'tab' },
	'\b': { name: 'backspace' },
	'\x7f': { name: 'backspace' },
	'\x1b\x7f': { name: 'backspace', meta: true },
	'\x1b\b': { name: 'backspace', meta: true },
	[ESC]: { name: 'escape' },
	[ESC + ESC]: { name: 'escape', meta: true },
	' ': { name: 'space' },
	[`${ESC} `]: { name: 'space', meta: true },
};

/**
 * Helper to create a KeyEvent object.
 */
function createKeyEvent(
	sequence: string,
	name: KeyName,
	raw: Uint8Array,
	modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
	code?: string,
): KeyEvent {
	const event: KeyEvent = {
		sequence,
		name,
		ctrl: modifiers.ctrl ?? false,
		meta: modifiers.meta ?? false,
		shift: modifiers.shift ?? false,
		raw,
	};
	if (code !== undefined) {
		return { ...event, code };
	}
	return event;
}

/**
 * Parse modifier from escape sequence modifier value.
 * Modifier encoding: 1 + (shift * 1) + (alt * 2) + (ctrl * 4)
 */
function parseModifier(mod: number): { ctrl: boolean; meta: boolean; shift: boolean } {
	const modifier = mod - 1;
	return {
		shift: !!(modifier & 1),
		meta: !!((modifier >> 1) & 1) || !!((modifier >> 3) & 1),
		ctrl: !!((modifier >> 2) & 1),
	};
}

/**
 * Try to parse a special key from the mapping.
 */
function parseSpecialKey(s: string, raw: Uint8Array): KeyEvent | null {
	const mapping = SPECIAL_KEY_MAP[s];
	if (!mapping) return null;
	return createKeyEvent(s, mapping.name, raw, { meta: mapping.meta ?? false });
}

/**
 * Parse control character (Ctrl+letter).
 */
function parseControlChar(s: string, raw: Uint8Array): KeyEvent | null {
	if (s.length !== 1 || s > '\x1a') return null;
	const charCode = s.charCodeAt(0);
	const letter = String.fromCharCode(charCode + 'a'.charCodeAt(0) - 1) as KeyName;
	return createKeyEvent(s, letter, raw, { ctrl: true });
}

/**
 * Parse lowercase letter.
 */
function parseLowerLetter(s: string, raw: Uint8Array): KeyEvent | null {
	if (s.length !== 1 || s < 'a' || s > 'z') return null;
	return createKeyEvent(s, s as KeyName, raw);
}

/**
 * Parse uppercase letter (with shift).
 */
function parseUpperLetter(s: string, raw: Uint8Array): KeyEvent | null {
	if (s.length !== 1 || s < 'A' || s > 'Z') return null;
	return createKeyEvent(s, s.toLowerCase() as KeyName, raw, { shift: true });
}

/**
 * Parse digit.
 */
function parseDigit(s: string, raw: Uint8Array): KeyEvent | null {
	if (s.length !== 1 || s < '0' || s > '9') return null;
	return createKeyEvent(s, s as KeyName, raw);
}

/**
 * Parse punctuation/symbol.
 */
function parsePunctuation(s: string, raw: Uint8Array): KeyEvent | null {
	if (s.length !== 1) return null;
	const code = s.charCodeAt(0);
	if (code < 0x21 || code > 0x7e) return null;
	if (!KEY_NAMES.includes(s as KeyName)) return null;
	return createKeyEvent(s, s as KeyName, raw);
}

/**
 * Parse a single character or control character.
 * Split into smaller functions to reduce complexity.
 */
function parseSingleChar(s: string, raw: Uint8Array): KeyEvent | null {
	// Try special keys first (return, enter, tab, backspace, escape, space)
	const special = parseSpecialKey(s, raw);
	if (special) return special;

	// Try control character
	const ctrl = parseControlChar(s, raw);
	if (ctrl) return ctrl;

	// Try lowercase letter
	const lower = parseLowerLetter(s, raw);
	if (lower) return lower;

	// Try uppercase letter
	const upper = parseUpperLetter(s, raw);
	if (upper) return upper;

	// Try digit
	const digit = parseDigit(s, raw);
	if (digit) return digit;

	// Try punctuation
	return parsePunctuation(s, raw);
}

/**
 * Parse an ANSI escape sequence.
 */
function parseEscapeSequence(s: string, raw: Uint8Array): KeyEvent | null {
	// Meta+character (ESC followed by letter)
	const metaMatch = META_KEY_RE.exec(s);
	if (metaMatch?.[1]) {
		const char = metaMatch[1];
		const name = char.toLowerCase() as KeyName;
		const isUpper = /^[A-Z]$/.test(char);
		return createKeyEvent(s, name, raw, { meta: true, shift: isUpper });
	}

	// Function key or control sequence
	const funcMatch = FUNCTION_KEY_RE.exec(s);
	if (!funcMatch) return null;

	// Reconstruct the code without leading ESC and modifier
	const prefix = funcMatch[1] || '';
	const num = funcMatch[2] || '';
	const suffix = funcMatch[4] || '';
	const letter = funcMatch[6] || '';

	const code = prefix + num + suffix + letter;
	const modValue = Number(funcMatch[3] || funcMatch[5] || 1);
	const modifiers = parseModifier(modValue);

	// Check for rxvt-style shift/ctrl codes
	if (SHIFT_CODES.has(code)) {
		modifiers.shift = true;
	}
	if (CTRL_CODES.has(code)) {
		modifiers.ctrl = true;
	}

	const keyName = ESCAPE_CODE_MAP[code];
	if (keyName) {
		return createKeyEvent(s, keyName, raw, modifiers, code);
	}

	// Unknown escape sequence
	return createKeyEvent(s, 'undefined', raw, modifiers, code);
}

/**
 * Check if a buffer starts with a mouse sequence.
 * Mouse sequences are handled separately by the mouse parser.
 *
 * @param buffer - Input buffer to check
 * @returns true if buffer contains a mouse sequence
 *
 * @internal
 */
export function isMouseSequence(buffer: Uint8Array): boolean {
	if (buffer.length < 3) return false;

	// ESC [ M - X10/X11 mouse
	if (buffer[0] === ESC_CODE && buffer[1] === 0x5b && buffer[2] === 0x4d) {
		return true;
	}

	// ESC [ < - SGR mouse
	if (buffer[0] === ESC_CODE && buffer[1] === 0x5b && buffer[2] === 0x3c) {
		return true;
	}

	// Check string patterns for other mouse protocols
	const s = new TextDecoder().decode(buffer);
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
	const x10Pattern = /\x1b\[M/;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
	const urxvtPattern = /\x1b\[(\d+;\d+;\d+)M/;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
	const sgrPattern = /\x1b\[<(\d+;\d+;\d+)([mM])/;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
	const focusPattern = /\x1b\[(O|I)/;
	return x10Pattern.test(s) || urxvtPattern.test(s) || sgrPattern.test(s) || focusPattern.test(s);
}

/**
 * Parse a key sequence from a buffer.
 *
 * Handles:
 * - Regular characters (a-z, A-Z, 0-9)
 * - Control characters (Ctrl+A through Ctrl+Z)
 * - Function keys (F1-F12)
 * - Navigation keys (arrows, home, end, pageup, pagedown)
 * - Modifier combinations (shift, ctrl, alt/meta)
 * - Special keys (escape, enter, tab, backspace, space)
 *
 * @param buffer - Raw input buffer to parse
 * @returns Parsed KeyEvent or null if not a key sequence
 *
 * @example
 * ```typescript
 * import { parseKeySequence } from 'blecsd';
 *
 * // Parse Ctrl+C
 * const ctrlC = parseKeySequence(Buffer.from([0x03]));
 * console.log(ctrlC?.name); // 'c'
 * console.log(ctrlC?.ctrl); // true
 *
 * // Parse Up arrow
 * const up = parseKeySequence(Buffer.from([0x1b, 0x5b, 0x41]));
 * console.log(up?.name); // 'up'
 *
 * // Parse F1
 * const f1 = parseKeySequence(Buffer.from([0x1b, 0x4f, 0x50]));
 * console.log(f1?.name); // 'f1'
 * ```
 */
export function parseKeySequence(buffer: Uint8Array): KeyEvent | null {
	if (buffer.length === 0) return null;

	// Skip mouse sequences
	if (isMouseSequence(buffer)) return null;

	// Handle high-bit set for meta key (byte > 127)
	const raw = buffer;
	let s: string;
	const firstByte = buffer[0];

	if (firstByte !== undefined && firstByte > 127 && buffer.length === 1) {
		const adjusted = new Uint8Array([firstByte - 128]);
		s = `${ESC}${new TextDecoder().decode(adjusted)}`;
	} else {
		s = new TextDecoder().decode(buffer);
	}

	// Try single character / control character parsing first
	const singleResult = parseSingleChar(s, raw);
	if (singleResult) return singleResult;

	// Try escape sequence parsing
	return parseEscapeSequence(s, raw);
}

/**
 * Parse multiple key sequences from a buffer.
 * Handles cases where multiple keypresses arrive in a single read.
 *
 * @param buffer - Raw input buffer that may contain multiple key sequences
 * @returns Array of parsed KeyEvents
 *
 * @example
 * ```typescript
 * import { parseKeyBuffer } from 'blecsd';
 *
 * // Parse buffer with multiple characters
 * const events = parseKeyBuffer(Buffer.from('abc'));
 * console.log(events.length); // 3
 * console.log(events[0].name); // 'a'
 * console.log(events[1].name); // 'b'
 * console.log(events[2].name); // 'c'
 * ```
 */
export function parseKeyBuffer(buffer: Uint8Array): readonly KeyEvent[] {
	if (buffer.length === 0) return [];

	// Skip mouse sequences
	if (isMouseSequence(buffer)) return [];

	const events: KeyEvent[] = [];
	const s = new TextDecoder().decode(buffer);

	// Split on escape sequence boundaries using "anywhere" patterns
	// Using string-based RegExp to avoid biome control char lint
	const escapeCodeRe = new RegExp(
		[FUNCTION_KEY_RE_ANYWHERE.source, META_KEY_RE_ANYWHERE.source, '\\x1b.'].join('|'),
		'g',
	);

	const parts: string[] = [];
	let lastIndex = 0;

	// Use exec in a loop pattern that doesn't assign in the condition
	for (;;) {
		const match = escapeCodeRe.exec(s);
		if (match === null) break;

		// Add characters before the match
		if (match.index > lastIndex) {
			const before = s.slice(lastIndex, match.index);
			parts.push(...before.split(''));
		}
		parts.push(match[0]);
		lastIndex = match.index + match[0].length;
	}

	// Add remaining characters
	if (lastIndex < s.length) {
		parts.push(...s.slice(lastIndex).split(''));
	}

	// Parse each part
	for (const part of parts) {
		const partBuffer = new TextEncoder().encode(part);
		const event = parseKeySequence(partBuffer);
		if (event) {
			events.push(event);
		}
	}

	return events;
}
