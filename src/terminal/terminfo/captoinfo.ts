/**
 * Termcap to terminfo string converter.
 *
 * Converts termcap parameterized strings (% codes) to terminfo format.
 * Based on the ncurses captoinfo implementation.
 *
 * @module terminal/terminfo/captoinfo
 */

/**
 * Options for captoinfo conversion.
 */
export interface CaptoInfoOptions {
	/** Convert % escape sequences (default: true) */
	parameterized?: boolean;
	/** Convert padding specifications (default: true) */
	convertPadding?: boolean;
}

/**
 * State tracker for captoinfo conversion.
 *
 * @internal
 */
interface ConversionState {
	/** Output string */
	out: string;
	/** Current position in input */
	pos: number;
	/** Current parameter number */
	param: number;
	/** Current value on stack */
	onstack: number;
	/** Stack of values */
	stack: number[];
	/** Seen %r (reverse params) */
	seenr: boolean;
	/** Seen %m (mask) */
	seenm: boolean;
	/** Seen %n (XOR) */
	seenn: boolean;
}

/**
 * Creates initial conversion state.
 *
 * @internal
 */
function createState(): ConversionState {
	return {
		out: '',
		pos: 0,
		param: 1,
		onstack: 0,
		stack: [],
		seenr: false,
		seenm: false,
		seenn: false,
	};
}

/**
 * Checks if character is a digit.
 *
 * @internal
 */
function isDigit(ch: string | undefined): boolean {
	return ch !== undefined && ch >= '0' && ch <= '9';
}

/**
 * Checks if character is a printable graph character.
 *
 * @internal
 */
function isGraph(ch: string): boolean {
	return ch > ' ' && ch <= '~';
}

/**
 * Pushes current stack value.
 *
 * @internal
 */
function pushStack(state: ConversionState): void {
	if (state.stack.length < 16) {
		state.stack.push(state.onstack);
	}
}

/**
 * Pops from stack.
 *
 * @internal
 */
function popStack(state: ConversionState): void {
	if (state.stack.length > 0) {
		state.onstack = state.stack.pop() ?? 0;
	} else if (state.onstack !== 0) {
		state.onstack = 0;
	}
	state.param++;
}

/**
 * Gets parameter, handling %r reversal.
 *
 * @internal
 */
function getEffectiveParam(state: ConversionState, parm: number): number {
	if (!state.seenr) {
		return parm;
	}
	if (parm === 1) {
		return 2;
	}
	if (parm === 2) {
		return 1;
	}
	return parm;
}

/**
 * Emits parameter push instructions.
 *
 * @internal
 */
function emitParam(state: ConversionState, parm: number, count: number): void {
	const effectiveParm = getEffectiveParam(state, parm);

	if (state.onstack === effectiveParm) {
		if (count > 1) {
			state.out += '%Pa';
			for (let i = 0; i < count; i++) {
				state.out += '%ga';
			}
		}
		return;
	}

	if (state.onstack !== 0) {
		pushStack(state);
	}

	state.onstack = effectiveParm;

	for (let i = 0; i < count; i++) {
		state.out += `%p${effectiveParm}`;
	}

	// Apply %n and %m transformations for params 1-2
	if (effectiveParm < 3) {
		if (state.seenn) {
			state.out += '%{96}%^';
		}
		if (state.seenm) {
			state.out += '%{127}%^';
		}
	}
}

/**
 * Parses a backslash escape sequence for convertChar.
 *
 * @internal
 */
function parseBackslashChar(input: string, pos: number): [string, number] {
	const next = input[pos + 1];

	if (next === "'" || next === '$' || next === '\\' || next === '%') {
		return [next, 2];
	}

	if (next === undefined || next === '\0') {
		return ['\\', 1];
	}

	if (next >= '0' && next <= '3') {
		let code = 0;
		let j = pos + 1;
		let len = 1;
		while (isDigit(input[j])) {
			code = 8 * code + ((input[j]?.charCodeAt(0) ?? 0) - 48);
			j++;
			len++;
		}
		return [String.fromCharCode(code), len];
	}

	return [next, 2];
}

/**
 * Formats a character for terminfo push.
 *
 * @internal
 */
function formatCharPush(char: string): string {
	if (isGraph(char) && char !== ',' && char !== "'" && char !== '\\' && char !== ':') {
		return `%'${char}'`;
	}
	return `%{${char.charCodeAt(0)}}`;
}

/**
 * Converts a character to a terminfo push.
 *
 * @internal
 */
function convertChar(input: string, pos: number): [string, number] {
	const current = input[pos];

	if (current === '\\') {
		const [char, len] = parseBackslashChar(input, pos);
		return [formatCharPush(char), len];
	}

	if (current === '^') {
		const next = input[pos + 1];
		if (next !== undefined) {
			const char = String.fromCharCode(next.charCodeAt(0) & 0x1f);
			return [formatCharPush(char), 2];
		}
		return [formatCharPush(current), 1];
	}

	if (current !== undefined) {
		return [formatCharPush(current), 1];
	}

	return [formatCharPush('\0'), 1];
}

/**
 * Skips initial padding specification.
 *
 * @internal
 */
function skipPadding(input: string, pos: number): number {
	let i = pos;
	while (i < input.length) {
		const ch = input[i];
		if (!isDigit(ch) && ch !== '*' && ch !== '.') {
			break;
		}
		i++;
	}
	return i;
}

/**
 * Processes a % escape sequence.
 *
 * @internal
 */
function processPercent(input: string, state: ConversionState): void {
	state.pos++; // Skip initial %
	const code = input[state.pos];

	if (code === undefined) {
		state.out += '%';
		return;
	}

	state.pos++;

	switch (code) {
		case '%':
			state.out += '%';
			break;

		case 'r':
			state.seenr = true;
			break;

		case 'm':
			state.seenm = true;
			break;

		case 'n':
			state.seenn = true;
			break;

		case 'i':
			state.out += '%i';
			break;

		case '6':
		case 'B':
			// BCD conversion: %{10}%/%{16}%*%p1%{10}%m%+
			emitParam(state, state.param, 1);
			state.out += '%{10}%/%{16}%*';
			emitParam(state, state.param, 1);
			state.out += '%{10}%m%+';
			break;

		case '8':
		case 'D':
			// Difference encoding: %p1%{2}%*%-
			emitParam(state, state.param, 2);
			state.out += '%{2}%*%-';
			break;

		case '>': {
			// Conditional: %?%{x}%>%t%{y}%+%;
			emitParam(state, state.param, 2);
			state.out += '%?';
			const [char1, len1] = convertChar(input, state.pos);
			state.out += char1;
			state.pos += len1;
			state.out += '%>%t';
			const [char2, len2] = convertChar(input, state.pos);
			state.out += char2;
			state.pos += len2;
			state.out += '%+%;';
			break;
		}

		case '+': {
			// Add character and output as char
			emitParam(state, state.param, 1);
			const [char, len] = convertChar(input, state.pos);
			state.out += char;
			state.pos += len;
			state.out += '%+%c';
			popStack(state);
			break;
		}

		case '-': {
			// Subtract and output as char
			const [char, len] = convertChar(input, state.pos);
			state.out += char;
			state.pos += len;
			emitParam(state, state.param, 1);
			state.out += '%-%c';
			popStack(state);
			break;
		}

		case '.':
			// Output as character
			emitParam(state, state.param, 1);
			state.out += '%c';
			popStack(state);
			break;

		case 'd':
			// Output as decimal
			emitParam(state, state.param, 1);
			state.out += '%d';
			popStack(state);
			break;

		case '2':
			// Output as 2-digit decimal
			emitParam(state, state.param, 1);
			state.out += '%2d';
			popStack(state);
			break;

		case '3':
			// Output as 3-digit decimal
			emitParam(state, state.param, 1);
			state.out += '%3d';
			popStack(state);
			break;

		case '0':
			// %02 or %03
			if (input[state.pos] === '2') {
				state.pos++;
				emitParam(state, state.param, 1);
				state.out += '%2d';
				popStack(state);
			} else if (input[state.pos] === '3') {
				state.pos++;
				emitParam(state, state.param, 1);
				state.out += '%3d';
				popStack(state);
			} else {
				state.out += '%';
				state.pos--;
			}
			break;

		case 's':
			// Output as string
			emitParam(state, state.param, 1);
			state.out += '%s';
			popStack(state);
			break;

		case 'f':
			// Skip to next parameter
			state.param++;
			break;

		case 'b':
			// Go back to previous parameter
			state.param--;
			break;

		case '\\':
			state.out += '%\\';
			break;

		case 'a':
			// Arithmetic operation
			processArithmetic(input, state);
			break;

		default:
			// Unknown code, pass through
			state.out += '%';
			state.pos--;
	}
}

/**
 * Checks if operator is valid for arithmetic.
 *
 * @internal
 */
function isArithOp(ch: string | undefined): ch is '=' | '+' | '-' | '*' | '/' {
	return ch === '=' || ch === '+' || ch === '-' || ch === '*' || ch === '/';
}

/**
 * Emits the appropriate arithmetic operator.
 *
 * @internal
 */
function emitArithOp(op: string, state: ConversionState): void {
	const opMap: Record<string, string> = { '+': '%+', '-': '%-', '*': '%*', '/': '%/' };
	const mapped = opMap[op];
	if (mapped) {
		state.out += mapped;
	} else if (op === '=') {
		state.onstack = state.seenr
			? state.param === 1
				? 2
				: state.param === 2
					? 1
					: state.param
			: state.param;
	}
}

/**
 * Processes %a arithmetic operations.
 *
 * @internal
 */
function processArithmetic(input: string, state: ConversionState): void {
	const op = input[state.pos];
	const type = input[state.pos + 1];
	const arg = input[state.pos + 2];

	// Check for valid arithmetic format: %a[=+-*/][pc]X
	const isValidFormat = isArithOp(op) && (type === 'p' || type === 'c') && arg !== undefined;

	if (!isValidFormat) {
		// Not a valid arithmetic, treat as %a with char add
		emitParam(state, state.param, 1);
		const [char, len] = convertChar(input, state.pos);
		state.out += char;
		state.pos += len;
		state.out += '%+';
		return;
	}

	let len = 2;

	if (op !== '=') {
		emitParam(state, state.param, 1);
	}

	if (type === 'p') {
		const parmNum = state.param + ((arg?.charCodeAt(0) ?? 64) - 64);
		emitParam(state, parmNum, 1);
		if (state.param !== state.onstack) {
			popStack(state);
			state.param--;
		}
		len++;
	} else {
		state.pos += 2;
		const [char, charLen] = convertChar(input, state.pos);
		state.out += char;
		state.pos -= 2;
		len += charLen;
	}

	emitArithOp(op, state);
	state.pos += len;
}

/**
 * Converts a termcap parameterized string to terminfo format.
 *
 * This converts the termcap % escape codes to their terminfo equivalents:
 * - `%%` -> `%%` (literal percent)
 * - `%i` -> `%i` (increment both parameters)
 * - `%r` -> reverses parameter order
 * - `%d` -> `%d` (decimal output)
 * - `%.` -> `%c` (character output)
 * - `%+c` -> push c, add, output as char
 * - `%-c` -> push c, subtract, output as char
 * - `%2`, `%3` -> `%2d`, `%3d` (width formatting)
 * - `%>xy` -> conditional: if param > x, add y
 * - `%B` -> BCD conversion
 * - `%D` -> difference encoding
 *
 * @param input - Termcap string to convert
 * @param options - Conversion options
 * @returns Terminfo-format string
 *
 * @example
 * ```typescript
 * import { captoinfo } from 'blecsd';
 *
 * // Simple cursor movement
 * captoinfo('\\E[%i%d;%dH');
 * // '\\E[%i%p1%d;%p2%dH'
 *
 * // With character addition
 * captoinfo('\\E[%+ ;%+ H');
 * // '\\E[%p1%{32}%+%c;%p2%{32}%+%cH'
 * ```
 */
export function captoinfo(input: string, options: CaptoInfoOptions = {}): string {
	const { parameterized = true, convertPadding = true } = options;

	if (!input) {
		return '';
	}

	const state = createState();

	// Skip initial padding if requested
	if (convertPadding && isDigit(input[0])) {
		state.pos = skipPadding(input, 0);
	}

	while (state.pos < input.length) {
		const char = input[state.pos];

		if (char === '%' && parameterized) {
			processPercent(input, state);
		} else {
			state.out += char;
			state.pos++;
		}
	}

	return state.out;
}

/**
 * Converts all string capabilities in a termcap entry to terminfo format.
 *
 * @param strings - Record of termcap string capabilities
 * @param options - Conversion options
 * @returns Record with converted strings
 *
 * @example
 * ```typescript
 * import { convertTermcapStrings } from 'blecsd';
 *
 * const termcapStrings = {
 *   cm: '\\E[%i%d;%dH',
 *   cl: '\\E[H\\E[2J',
 * };
 *
 * const terminfoStrings = convertTermcapStrings(termcapStrings);
 * // { cm: '\\E[%i%p1%d;%p2%dH', cl: '\\E[H\\E[2J' }
 * ```
 */
export function convertTermcapStrings(
	strings: Record<string, string>,
	options: CaptoInfoOptions = {},
): Record<string, string> {
	const result: Record<string, string> = {};

	for (const [key, value] of Object.entries(strings)) {
		result[key] = captoinfo(value, options);
	}

	return result;
}

/**
 * Checks if a string contains termcap-style % codes that need conversion.
 *
 * @param input - String to check
 * @returns true if string contains convertible % codes
 *
 * @example
 * ```typescript
 * import { needsConversion } from 'blecsd';
 *
 * needsConversion('%d;%dH');      // true (has %d)
 * needsConversion('%.;%.H');      // true (has %.)
 * needsConversion('\\E[H\\E[2J'); // false (no % codes)
 * ```
 */
export function needsConversion(input: string): boolean {
	// Look for termcap % codes that differ from terminfo
	// %d without preceding %p indicates termcap format
	const hasTermcapDecimal = /%d/.test(input) && !/%p\d%d/.test(input);
	const hasTermcapChar = /%[.+-]/.test(input);
	const hasTermcapFlags = /%[rmnBD68]/.test(input);
	const hasTermcapConditional = /%>/.test(input);
	const hasTermcapArith = /%a/.test(input);
	const hasTermcapWidth = /%[023]/.test(input) && !/%p\d%\d/.test(input);

	return (
		hasTermcapDecimal ||
		hasTermcapChar ||
		hasTermcapFlags ||
		hasTermcapConditional ||
		hasTermcapArith ||
		hasTermcapWidth
	);
}
