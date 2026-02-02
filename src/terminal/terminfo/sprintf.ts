/**
 * Printf-style string formatting for terminal capabilities.
 *
 * Provides a subset of printf functionality needed for terminfo capability
 * strings and general terminal output formatting.
 *
 * @module terminal/terminfo/sprintf
 */

/**
 * Supported format specifier types.
 */
export type FormatType = 'd' | 'i' | 'o' | 'x' | 'X' | 's' | 'c';

/**
 * Format flags that modify output.
 */
export interface FormatFlags {
	/** Left-justify within the given field width */
	left: boolean;
	/** Always show sign (+ or -) for numeric values */
	sign: boolean;
	/** Prefix with 0, 0x, or 0X for octal/hex values */
	alternate: boolean;
	/** Pad with spaces if no sign */
	space: boolean;
	/** Pad with zeros instead of spaces */
	zero: boolean;
}

/**
 * Parsed format specifier.
 */
export interface FormatSpec {
	/** Original format string (e.g., '%08d') */
	original: string;
	/** Format flags */
	flags: FormatFlags;
	/** Minimum field width */
	width: number;
	/** Precision (for strings, max length; for numbers, min digits) */
	precision: number;
	/** Format type character */
	type: FormatType;
}

/**
 * Regular expression for matching format specifiers.
 *
 * Captures:
 * 1. Flags: -, +, #, space, 0
 * 2. Width: optional number
 * 3. Precision: optional .number
 * 4. Type: d, i, o, x, X, s, c
 */
const FORMAT_REGEX = /%([-+# 0]{0,5})(\d+)?(?:\.(\d+))?([dioxXsc])/g;

/**
 * Parses format flags from a string.
 *
 * @param flagStr - String containing flag characters
 * @returns Parsed flags object
 *
 * @internal
 */
function parseFlags(flagStr: string): FormatFlags {
	return {
		left: flagStr.includes('-'),
		sign: flagStr.includes('+'),
		alternate: flagStr.includes('#'),
		space: flagStr.includes(' '),
		zero: flagStr.includes('0'),
	};
}

/**
 * Formats a numeric value as decimal.
 *
 * @param value - Value to format
 * @returns Decimal string representation
 *
 * @internal
 */
function formatDecimal(value: unknown): string {
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return '0';
	}
	return Math.trunc(num).toString(10);
}

/**
 * Formats a numeric value as octal.
 *
 * @param value - Value to format
 * @returns Octal string representation (without prefix)
 *
 * @internal
 */
function formatOctal(value: unknown): string {
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return '0';
	}
	return (Math.trunc(num) >>> 0).toString(8);
}

/**
 * Formats a numeric value as hexadecimal.
 *
 * @param value - Value to format
 * @param uppercase - Whether to use uppercase letters
 * @returns Hex string representation (without prefix)
 *
 * @internal
 */
function formatHex(value: unknown, uppercase: boolean): string {
	const num = Number(value);
	if (!Number.isFinite(num)) {
		return '0';
	}
	const hex = (Math.trunc(num) >>> 0).toString(16);
	return uppercase ? hex.toUpperCase() : hex;
}

/**
 * Formats a value as a character.
 *
 * @param value - Character code or string
 * @returns Single character string
 *
 * @internal
 */
function formatChar(value: unknown): string {
	if (typeof value === 'string') {
		return value.charAt(0) || '\0';
	}
	const code = Number(value);
	if (!Number.isFinite(code)) {
		return '\0';
	}
	// Use 0x80 as fallback for 0 (common in terminal strings)
	return String.fromCharCode(code || 0x80);
}

/**
 * Formats a value as a string.
 *
 * @param value - Value to convert to string
 * @param precision - Maximum length (0 = unlimited)
 * @returns String representation
 *
 * @internal
 */
function formatString(value: unknown, precision: number): string {
	const str = value == null ? '' : String(value);
	if (precision > 0 && str.length > precision) {
		return str.slice(0, precision);
	}
	return str;
}

/**
 * Applies width padding and alignment to a formatted value.
 *
 * @param value - Formatted value
 * @param prefix - Sign or alternate prefix
 * @param spec - Format specification
 * @returns Padded string
 *
 * @internal
 */
function applyWidth(value: string, prefix: string, spec: FormatSpec): string {
	const totalLen = prefix.length + value.length;
	if (spec.width <= totalLen) {
		return prefix + value;
	}

	const padLen = spec.width - totalLen;
	const padChar = spec.flags.zero && !spec.flags.left ? '0' : ' ';
	const padding = padChar.repeat(padLen);

	if (spec.flags.left) {
		// Left-justify: value first, then padding
		return prefix + value + padding;
	}
	if (spec.flags.zero) {
		// Zero-pad: prefix, then zeros, then value
		return prefix + padding + value;
	}
	// Right-justify with spaces: padding, then prefix+value
	return padding + prefix + value;
}

/**
 * Gets the sign prefix for decimal values.
 *
 * @param num - Numeric value
 * @param flags - Format flags
 * @returns Sign prefix string
 *
 * @internal
 */
function getSignPrefix(num: number, flags: FormatFlags): string {
	if (num < 0) {
		return '-';
	}
	if (flags.sign) {
		return '+';
	}
	if (flags.space) {
		return ' ';
	}
	return '';
}

/**
 * Gets the alternate form prefix for octal/hex values.
 *
 * @param num - Numeric value
 * @param type - Format type (o, x, or X)
 * @returns Alternate prefix string
 *
 * @internal
 */
function getAlternatePrefix(num: number, type: FormatType): string {
	if (num === 0) {
		return '';
	}
	if (type === 'o') {
		return '0';
	}
	if (type === 'x') {
		return '0x';
	}
	if (type === 'X') {
		return '0X';
	}
	return '';
}

/**
 * Gets the sign/alternate prefix for a numeric value.
 *
 * @param value - Original numeric value
 * @param type - Format type
 * @param flags - Format flags
 * @returns Prefix string
 *
 * @internal
 */
function getPrefix(value: unknown, type: FormatType, flags: FormatFlags): string {
	const num = Number(value);

	// Handle sign flags for decimal types
	if (type === 'd' || type === 'i') {
		return getSignPrefix(num, flags);
	}

	// Handle alternate flag for octal/hex
	if (flags.alternate) {
		return getAlternatePrefix(num, type);
	}

	return '';
}

/**
 * Formats a single value according to a format specifier.
 *
 * @param spec - Parsed format specification
 * @param value - Value to format
 * @returns Formatted string
 *
 * @internal
 */
function formatValue(spec: FormatSpec, value: unknown): string {
	let result: string;
	let prefix = '';

	switch (spec.type) {
		case 'd':
		case 'i': {
			const num = Number(value);
			prefix = getPrefix(num, spec.type, spec.flags);
			result = formatDecimal(Math.abs(num));
			// Apply precision as minimum digits
			if (spec.precision > 0 && result.length < spec.precision) {
				result = result.padStart(spec.precision, '0');
			}
			break;
		}
		case 'o':
			prefix = getPrefix(value, spec.type, spec.flags);
			result = formatOctal(value);
			if (spec.precision > 0 && result.length < spec.precision) {
				result = result.padStart(spec.precision, '0');
			}
			break;
		case 'x':
			prefix = getPrefix(value, spec.type, spec.flags);
			result = formatHex(value, false);
			if (spec.precision > 0 && result.length < spec.precision) {
				result = result.padStart(spec.precision, '0');
			}
			break;
		case 'X':
			prefix = getPrefix(value, spec.type, spec.flags);
			result = formatHex(value, true);
			if (spec.precision > 0 && result.length < spec.precision) {
				result = result.padStart(spec.precision, '0');
			}
			break;
		case 's':
			result = formatString(value, spec.precision);
			break;
		case 'c':
			result = formatChar(value);
			break;
		default:
			result = String(value);
	}

	return applyWidth(result, prefix, spec);
}

/**
 * Printf-style string formatting.
 *
 * Formats a string by replacing format specifiers with values from the
 * provided arguments. Supports a subset of printf functionality:
 *
 * **Format specifiers:** `%[flags][width][.precision]type`
 *
 * **Flags:**
 * - `-` Left-justify within field width
 * - `+` Always show sign for numbers
 * - ` ` (space) Prefix positive numbers with space
 * - `#` Alternate form (0 for octal, 0x for hex)
 * - `0` Zero-pad numbers
 *
 * **Types:**
 * - `d`, `i` Signed decimal integer
 * - `o` Unsigned octal
 * - `x` Unsigned hex (lowercase)
 * - `X` Unsigned hex (uppercase)
 * - `s` String
 * - `c` Character (from code point or first char of string)
 *
 * @param format - Format string with % specifiers
 * @param args - Values to substitute
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * import { sprintf } from 'blecsd';
 *
 * // Basic substitution
 * sprintf('%d items', 42);           // '42 items'
 * sprintf('%s: %d', 'Count', 10);    // 'Count: 10'
 *
 * // Width and padding
 * sprintf('%5d', 42);                // '   42'
 * sprintf('%-5d', 42);               // '42   '
 * sprintf('%05d', 42);               // '00042'
 *
 * // Hex formatting
 * sprintf('%x', 255);                // 'ff'
 * sprintf('%X', 255);                // 'FF'
 * sprintf('%#x', 255);               // '0xff'
 *
 * // Character codes
 * sprintf('%c', 65);                 // 'A'
 *
 * // Signs and spaces
 * sprintf('%+d', 42);                // '+42'
 * sprintf('% d', 42);                // ' 42'
 * ```
 */
export function sprintf(format: string, ...args: unknown[]): string {
	let argIndex = 0;

	return format.replace(FORMAT_REGEX, (match, flagStr, widthStr, precisionStr, type) => {
		const spec: FormatSpec = {
			original: match,
			flags: parseFlags(flagStr || ''),
			width: widthStr ? Number.parseInt(widthStr, 10) : 0,
			precision: precisionStr ? Number.parseInt(precisionStr, 10) : 0,
			type: type as FormatType,
		};

		const value = args[argIndex];
		argIndex++;

		return formatValue(spec, value);
	});
}

/**
 * Parses a format string and returns information about its specifiers.
 *
 * Useful for analyzing format strings or pre-validating arguments.
 *
 * @param format - Format string to analyze
 * @returns Array of parsed format specifiers
 *
 * @example
 * ```typescript
 * import { parseFormat } from 'blecsd';
 *
 * const specs = parseFormat('%5d %s');
 * // [
 * //   { original: '%5d', flags: {...}, width: 5, precision: 0, type: 'd' },
 * //   { original: '%s', flags: {...}, width: 0, precision: 0, type: 's' }
 * // ]
 * ```
 */
export function parseFormat(format: string): FormatSpec[] {
	const specs: FormatSpec[] = [];

	// Create a new regex instance for stateful iteration
	const regex = new RegExp(FORMAT_REGEX.source, FORMAT_REGEX.flags);

	for (;;) {
		const match = regex.exec(format);
		if (match === null) {
			break;
		}
		specs.push({
			original: match[0],
			flags: parseFlags(match[1] || ''),
			width: match[2] ? Number.parseInt(match[2], 10) : 0,
			precision: match[3] ? Number.parseInt(match[3], 10) : 0,
			type: match[4] as FormatType,
		});
	}

	return specs;
}

/**
 * Counts the number of format specifiers in a format string.
 *
 * @param format - Format string to analyze
 * @returns Number of % specifiers found
 *
 * @example
 * ```typescript
 * import { countFormatArgs } from 'blecsd';
 *
 * countFormatArgs('%d + %d = %d');  // 3
 * countFormatArgs('Hello %s!');     // 1
 * countFormatArgs('No args');       // 0
 * ```
 */
export function countFormatArgs(format: string): number {
	const matches = format.match(FORMAT_REGEX);
	return matches ? matches.length : 0;
}

/**
 * Checks if a format string is valid.
 *
 * @param format - Format string to validate
 * @returns True if format string has valid specifiers
 *
 * @example
 * ```typescript
 * import { isValidFormat } from 'blecsd';
 *
 * isValidFormat('%d');      // true
 * isValidFormat('%5.2s');   // true
 * isValidFormat('%z');      // false (invalid type)
 * isValidFormat('hello');   // true (no specifiers is valid)
 * ```
 */
export function isValidFormat(format: string): boolean {
	// Check for any % that isn't followed by a valid specifier or %%
	const invalidPattern = /%(?![-+# 0]*\d*(?:\.\d+)?[dioxXsc]|%)/g;
	return !invalidPattern.test(format);
}

/**
 * Creates a reusable formatter function for a format string.
 *
 * More efficient when formatting the same pattern multiple times.
 *
 * @param format - Format string
 * @returns Function that takes arguments and returns formatted string
 *
 * @example
 * ```typescript
 * import { createFormatter } from 'blecsd';
 *
 * const fmt = createFormatter('Point(%d, %d)');
 * fmt(10, 20);  // 'Point(10, 20)'
 * fmt(5, 15);   // 'Point(5, 15)'
 * ```
 */
export function createFormatter(format: string): (...args: unknown[]) => string {
	return (...args: unknown[]) => sprintf(format, ...args);
}
