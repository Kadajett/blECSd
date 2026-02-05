/**
 * Legacy codepage encoding utilities.
 *
 * Provides conversion functions between legacy single-byte encodings
 * (CP437, CP850, CP866, CP1252) and UTF-8/UTF-16 strings.
 *
 * Primary use case is rendering classic ANSI art files that use CP437.
 *
 * @module utils/encoding
 *
 * @example
 * ```typescript
 * import { bufferToString, byteToChar } from 'blecsd/utils/encoding';
 * import { readFileSync } from 'fs';
 *
 * // Convert a CP437-encoded ANSI art file to UTF-8
 * const ansiFile = readFileSync('artwork.ans');
 * const content = bufferToString(ansiFile, 'cp437');
 *
 * // Get the UTF-8 representation of a specific CP437 byte
 * const fullBlock = byteToChar(0xdb, 'cp437'); // '█'
 * ```
 */

import { z } from 'zod';
import { CODEPAGE_CONTROL_TABLES, CODEPAGE_TABLES, CP437_CONTROL_CHARS } from './codepages';

// =============================================================================
// TYPES AND SCHEMAS
// =============================================================================

/**
 * Supported legacy codepage identifiers.
 *
 * - `cp437`: IBM PC / DOS (default for ANSI art)
 * - `cp850`: DOS Latin-1 (Western European)
 * - `cp866`: DOS Cyrillic (Russian)
 * - `cp1252`: Windows Latin-1
 */
export const CodePageSchema = z.enum(['cp437', 'cp850', 'cp866', 'cp1252']);

/**
 * Supported legacy codepage type.
 */
export type CodePage = z.infer<typeof CodePageSchema>;

/**
 * How to handle bytes that cannot be mapped to the target encoding.
 *
 * - `replace`: Replace unmappable characters with a replacement character
 * - `skip`: Skip unmappable characters entirely
 * - `error`: Throw an error on unmappable characters
 */
export const UnmappableModeSchema = z.enum(['replace', 'skip', 'error']);

/**
 * Unmappable character handling mode type.
 */
export type UnmappableMode = z.infer<typeof UnmappableModeSchema>;

/**
 * Options for encoding conversion.
 */
export const ConversionOptionsSchema = z
	.object({
		/** Source or target codepage */
		codepage: CodePageSchema,
		/** How to handle unmappable characters */
		unmappable: UnmappableModeSchema.default('replace'),
		/** Replacement character for unmappable bytes (used with 'replace' mode) */
		replacement: z.string().default('\uFFFD'),
		/**
		 * Whether to interpret control characters (0x00-0x1F) as their
		 * graphical symbols in CP437. If false, they pass through as-is.
		 * Only applies to CP437.
		 */
		interpretControlChars: z.boolean().default(false),
	})
	.strict();

/**
 * Conversion options type.
 */
export type ConversionOptions = z.infer<typeof ConversionOptionsSchema>;

/**
 * Partial conversion options (all fields optional).
 */
export type PartialConversionOptions = Partial<Omit<ConversionOptions, 'codepage'>>;

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

const HIGH_BYTE_OFFSET = 0x80;
const CONTROL_CHAR_LIMIT = 0x20;
const ASCII_LIMIT = 0x80;
const MAX_BYTE = 0xff;

/**
 * Builds a reverse mapping from UTF-8 characters to byte values.
 */
function buildReverseMap(
	highBytes: readonly string[],
	controlChars?: readonly string[],
): Map<string, number> {
	const map = new Map<string, number>();

	// Map high bytes (0x80-0xFF)
	for (let i = 0; i < highBytes.length; i++) {
		const char = highBytes[i];
		if (char) {
			map.set(char, HIGH_BYTE_OFFSET + i);
		}
	}

	// Map control character symbols (0x00-0x1F) if provided
	if (controlChars) {
		for (let i = 0; i < controlChars.length; i++) {
			const char = controlChars[i];
			if (char && char !== '\u0000') {
				map.set(char, i);
			}
		}
	}

	// Map control characters (0x00-0x1F) to themselves
	// These are preserved as-is during conversion
	for (let i = 0; i < CONTROL_CHAR_LIMIT; i++) {
		map.set(String.fromCharCode(i), i);
	}

	// Map standard ASCII (0x20-0x7E)
	for (let i = 0x20; i <= 0x7e; i++) {
		map.set(String.fromCharCode(i), i);
	}

	// Map DEL
	map.set('\x7f', 0x7f);

	return map;
}

// Cached reverse maps for each codepage
const reverseMaps = new Map<CodePage, Map<string, number>>();

function getReverseMap(codepage: CodePage): Map<string, number> {
	const cached = reverseMaps.get(codepage);
	if (cached) {
		return cached;
	}

	const highBytes = CODEPAGE_TABLES[codepage];
	const controlChars = CODEPAGE_CONTROL_TABLES[codepage];

	if (!highBytes) {
		throw new Error(`Unknown codepage: ${codepage}`);
	}

	const map = buildReverseMap(highBytes, controlChars);
	reverseMaps.set(codepage, map);
	return map;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Gets the UTF-8 character for a specific byte in a codepage.
 *
 * @param byte - Byte value (0-255)
 * @param codepage - Codepage to use for mapping
 * @param options - Optional conversion options
 * @returns UTF-8 character string
 *
 * @example
 * ```typescript
 * import { byteToChar } from 'blecsd/utils/encoding';
 *
 * // CP437 byte 0xDB = '█' (full block)
 * const fullBlock = byteToChar(0xdb, 'cp437');
 * console.log(fullBlock); // '█'
 *
 * // CP437 byte 0xB0 = '░' (light shade)
 * const lightShade = byteToChar(0xb0, 'cp437');
 * console.log(lightShade); // '░'
 *
 * // CP437 control char 0x03 = '♥' (heart)
 * const heart = byteToChar(0x03, 'cp437', { interpretControlChars: true });
 * console.log(heart); // '♥'
 * ```
 */
export function byteToChar(
	byte: number,
	codepage: CodePage,
	options?: PartialConversionOptions,
): string {
	const validatedCodepage = CodePageSchema.parse(codepage);

	if (byte < 0 || byte > MAX_BYTE) {
		throw new RangeError(`Byte value must be 0-255, got: ${byte}`);
	}

	const intByte = byte | 0;

	// Handle control characters (0x00-0x1F)
	if (intByte < CONTROL_CHAR_LIMIT) {
		if (options?.interpretControlChars && validatedCodepage === 'cp437') {
			const char = CP437_CONTROL_CHARS[intByte];
			if (char) {
				return char;
			}
		}
		return String.fromCharCode(intByte);
	}

	// Standard ASCII (0x20-0x7F)
	if (intByte < ASCII_LIMIT) {
		return String.fromCharCode(intByte);
	}

	// High bytes (0x80-0xFF)
	const highBytes = CODEPAGE_TABLES[validatedCodepage];
	if (!highBytes) {
		throw new Error(`Unknown codepage: ${validatedCodepage}`);
	}

	const index = intByte - HIGH_BYTE_OFFSET;
	const char = highBytes[index];

	if (!char) {
		const replacement = options?.replacement ?? '\uFFFD';
		return replacement;
	}

	return char;
}

/**
 * Gets the byte value for a UTF-8 character in a codepage.
 *
 * @param char - Single UTF-8 character
 * @param codepage - Target codepage
 * @returns Byte value (0-255) or undefined if not mappable
 *
 * @example
 * ```typescript
 * import { charToByte } from 'blecsd/utils/encoding';
 *
 * // '█' (full block) = 0xDB in CP437
 * const byte = charToByte('█', 'cp437');
 * console.log(byte?.toString(16)); // 'db'
 * ```
 */
export function charToByte(char: string, codepage: CodePage): number | undefined {
	const validatedCodepage = CodePageSchema.parse(codepage);
	const reverseMap = getReverseMap(validatedCodepage);

	// Get the first character if multiple were provided
	const chars = [...char];
	const firstChar = chars[0];

	if (!firstChar) {
		return undefined;
	}

	return reverseMap.get(firstChar);
}

/**
 * Converts a Buffer from a legacy codepage to a UTF-8 string.
 *
 * @param buffer - Input buffer in legacy encoding
 * @param codepage - Source codepage identifier
 * @param options - Conversion options
 * @returns UTF-8 encoded string
 *
 * @example
 * ```typescript
 * import { bufferToString } from 'blecsd/utils/encoding';
 * import { readFileSync } from 'fs';
 *
 * // Convert CP437 ANSI art to displayable string
 * const ansiFile = readFileSync('artwork.ans');
 * const utf8Content = bufferToString(ansiFile, 'cp437');
 * console.log(utf8Content);
 * ```
 *
 * @example
 * ```typescript
 * // With control character interpretation
 * const buffer = Buffer.from([0x03, 0x20, 0xdb]);
 * const str = bufferToString(buffer, 'cp437', { interpretControlChars: true });
 * console.log(str); // '♥ █'
 * ```
 */
export function bufferToString(
	buffer: Buffer | Uint8Array,
	codepage: CodePage,
	options?: PartialConversionOptions,
): string {
	const validatedCodepage = CodePageSchema.parse(codepage);
	const mergedOptions: PartialConversionOptions = {
		unmappable: 'replace',
		replacement: '\uFFFD',
		interpretControlChars: false,
		...options,
	};

	const result: string[] = [];

	for (let i = 0; i < buffer.length; i++) {
		const byte = buffer[i];
		if (byte === undefined) continue;

		const char = byteToChar(byte, validatedCodepage, mergedOptions);
		result.push(char);
	}

	return result.join('');
}

/**
 * Converts a UTF-8 string to a Buffer in a legacy codepage.
 *
 * @param str - UTF-8 string to convert
 * @param codepage - Target codepage identifier
 * @param options - Conversion options
 * @returns Buffer in the target encoding
 *
 * @example
 * ```typescript
 * import { stringToBuffer } from 'blecsd/utils/encoding';
 *
 * const buffer = stringToBuffer('Hello █▄▀', 'cp437');
 * // buffer contains CP437-encoded bytes
 * ```
 *
 * @example
 * ```typescript
 * // With error handling
 * import { stringToBuffer } from 'blecsd/utils/encoding';
 *
 * try {
 *   const buffer = stringToBuffer('Hello 你好', 'cp437', { unmappable: 'error' });
 * } catch (e) {
 *   console.error('Unmappable character found');
 * }
 * ```
 */
export function stringToBuffer(
	str: string,
	codepage: CodePage,
	options?: PartialConversionOptions,
): Buffer {
	const validatedCodepage = CodePageSchema.parse(codepage);
	const mergedOptions: PartialConversionOptions = {
		unmappable: 'replace',
		replacement: '?',
		...options,
	};

	const reverseMap = getReverseMap(validatedCodepage);
	const bytes: number[] = [];
	const chars = [...str];

	for (let i = 0; i < chars.length; i++) {
		const char = chars[i];
		if (!char) continue;

		const byte = reverseMap.get(char);

		if (byte !== undefined) {
			bytes.push(byte);
			continue;
		}

		// Handle unmappable character
		switch (mergedOptions.unmappable) {
			case 'error':
				throw new Error(
					`Character '${char}' (U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}) ` +
						`cannot be encoded in ${validatedCodepage}`,
				);

			case 'skip':
				// Don't add anything
				break;
			default: {
				// Use the replacement character
				const replacementChar = mergedOptions.replacement ?? '?';
				const replacementByte = reverseMap.get(replacementChar);
				if (replacementByte !== undefined) {
					bytes.push(replacementByte);
				} else {
					// Fallback to '?' if replacement isn't in codepage
					bytes.push(0x3f); // ASCII '?'
				}
				break;
			}
		}
	}

	return Buffer.from(bytes);
}

/**
 * Checks if a codepage is supported.
 *
 * @param codepage - Codepage identifier to check
 * @returns True if codepage is supported
 *
 * @example
 * ```typescript
 * import { isCodePageSupported } from 'blecsd/utils/encoding';
 *
 * if (isCodePageSupported('cp437')) {
 *   // Safe to use cp437
 * }
 *
 * if (!isCodePageSupported('cp950')) {
 *   console.error('Traditional Chinese codepage not supported');
 * }
 * ```
 */
export function isCodePageSupported(codepage: string): codepage is CodePage {
	const result = CodePageSchema.safeParse(codepage);
	return result.success;
}

/**
 * Gets the list of supported codepages.
 *
 * @returns Array of supported codepage identifiers
 *
 * @example
 * ```typescript
 * import { getSupportedCodePages } from 'blecsd/utils/encoding';
 *
 * const codepages = getSupportedCodePages();
 * console.log(codepages); // ['cp437', 'cp850', 'cp866', 'cp1252']
 * ```
 */
export function getSupportedCodePages(): readonly CodePage[] {
	return ['cp437', 'cp850', 'cp866', 'cp1252'] as const;
}

/**
 * Gets the full character map for a codepage (all 256 bytes).
 *
 * @param codepage - Codepage to get map for
 * @param options - Optional conversion options
 * @returns Array of 256 UTF-8 characters indexed by byte value
 *
 * @example
 * ```typescript
 * import { getCodePageMap } from 'blecsd/utils/encoding';
 *
 * const cp437Map = getCodePageMap('cp437');
 * console.log(cp437Map[0xdb]); // '█'
 * console.log(cp437Map[0xb0]); // '░'
 * ```
 */
export function getCodePageMap(
	codepage: CodePage,
	options?: PartialConversionOptions,
): readonly string[] {
	const validatedCodepage = CodePageSchema.parse(codepage);
	const map: string[] = [];

	for (let i = 0; i <= MAX_BYTE; i++) {
		map.push(byteToChar(i, validatedCodepage, options));
	}

	return map;
}

// Re-export codepage tables for advanced usage
export {
	CP437_CONTROL_CHARS,
	CP437_HIGH_BYTES,
	CP850_HIGH_BYTES,
	CP866_HIGH_BYTES,
	CP1252_HIGH_BYTES,
} from './codepages';
