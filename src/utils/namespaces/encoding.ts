/**
 * Legacy codepage encoding utilities namespace.
 *
 * Provides conversion functions between legacy single-byte encodings
 * (CP437, CP850, CP866, CP1252) and UTF-8/UTF-16 strings. Primary use
 * case is rendering classic ANSI art files that use CP437.
 *
 * @example
 * ```typescript
 * import { encoding } from 'blecsd/utils';
 *
 * const content = encoding.bufferToString(ansiFile, 'cp437');
 * const char = encoding.byteToChar(0xdb, 'cp437'); // full block
 * const supported = encoding.isCodePageSupported('cp437');
 * ```
 */

import {
	bufferToString,
	byteToChar,
	CodePageSchema,
	ConversionOptionsSchema,
	charToByte,
	getCodePageMap,
	getSupportedCodePages,
	isCodePageSupported,
	stringToBuffer,
	UnmappableModeSchema,
} from '../encoding';

import {
	CP437_CONTROL_CHARS,
	CP437_HIGH_BYTES,
	CP850_HIGH_BYTES,
	CP866_HIGH_BYTES,
	CP1252_HIGH_BYTES,
} from '../encoding/codepages';

export const encoding = Object.freeze({
	byteToChar,
	charToByte,
	bufferToString,
	stringToBuffer,
	isCodePageSupported,
	getSupportedCodePages,
	getCodePageMap,
	CodePageSchema,
	UnmappableModeSchema,
	ConversionOptionsSchema,
	CP437_CONTROL_CHARS,
	CP437_HIGH_BYTES,
	CP850_HIGH_BYTES,
	CP866_HIGH_BYTES,
	CP1252_HIGH_BYTES,
});

export type EncodingModule = typeof encoding;
