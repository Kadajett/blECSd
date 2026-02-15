/**
 * PNG file parser.
 *
 * Parses PNG files into structured data: header info, chunk structure,
 * IDAT decompression, and CRC validation. Supports all standard color types.
 *
 * @module media/png/parser
 */

import { inflateSync } from 'node:zlib';
import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * PNG magic bytes (8-byte signature).
 * Every valid PNG file starts with these exact bytes.
 */
export const PNG_MAGIC = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * CRC-32 lookup table for PNG chunk validation.
 */
const CRC_TABLE = buildCrcTable();

/**
 * Builds a CRC-32 lookup table.
 */
function buildCrcTable(): Uint32Array {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			if (c & 1) {
				c = 0xedb88320 ^ (c >>> 1);
			} else {
				c = c >>> 1;
			}
		}
		table[n] = c;
	}
	return table;
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * PNG color type values.
 *
 * @example
 * ```typescript
 * import { ColorType } from 'blecsd';
 *
 * if (header.colorType === ColorType.RGBA) {
 *   // Handle RGBA image
 * }
 * ```
 */
export enum ColorType {
	/** Single grayscale channel */
	Grayscale = 0,
	/** Red, green, blue channels */
	RGB = 2,
	/** Palette-indexed color */
	Indexed = 3,
	/** Grayscale with alpha */
	GrayscaleAlpha = 4,
	/** Red, green, blue, alpha channels */
	RGBA = 6,
}

/**
 * PNG file header parsed from IHDR chunk.
 */
export interface PNGHeader {
	/** Image width in pixels */
	readonly width: number;
	/** Image height in pixels */
	readonly height: number;
	/** Bit depth per channel (1, 2, 4, 8, or 16) */
	readonly bitDepth: number;
	/** Color type */
	readonly colorType: ColorType;
	/** Compression method (always 0 for deflate) */
	readonly compression: number;
	/** Filter method (always 0 for adaptive) */
	readonly filter: number;
	/** Interlace method (0 = none, 1 = Adam7) */
	readonly interlace: number;
}

/**
 * A parsed PNG chunk.
 */
export interface PNGChunk {
	/** 4-character chunk type (e.g., 'IHDR', 'IDAT', 'IEND') */
	readonly type: string;
	/** Chunk data bytes */
	readonly data: Uint8Array;
	/** CRC-32 checksum */
	readonly crc: number;
}

/**
 * Result of parsing a PNG file.
 */
export interface PNGParseResult {
	/** Parsed IHDR header */
	readonly header: PNGHeader;
	/** All parsed chunks */
	readonly chunks: readonly PNGChunk[];
	/** Decompressed image data from IDAT chunks */
	readonly imageData: Uint8Array;
}

/**
 * Error info returned when PNG parsing fails.
 */
export interface PNGParseError {
	readonly ok: false;
	readonly error: string;
}

/**
 * Successful PNG parse result.
 */
export interface PNGParseSuccess {
	readonly ok: true;
	readonly result: PNGParseResult;
}

/**
 * Result type for PNG parsing (success or error).
 */
export type PNGParseOutput = PNGParseSuccess | PNGParseError;

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for PNGHeader validation.
 *
 * @example
 * ```typescript
 * import { PNGHeaderSchema } from 'blecsd';
 *
 * const header = PNGHeaderSchema.parse(parsedData);
 * ```
 */
export const PNGHeaderSchema = z.object({
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	bitDepth: z
		.number()
		.int()
		.refine((v) => [1, 2, 4, 8, 16].includes(v), {
			message: 'Bit depth must be 1, 2, 4, 8, or 16',
		}),
	colorType: z.nativeEnum(ColorType),
	compression: z.literal(0),
	filter: z.literal(0),
	interlace: z.union([z.literal(0), z.literal(1)]),
});

/**
 * Zod schema for PNGChunk validation.
 */
export const PNGChunkSchema = z.object({
	type: z.string().length(4),
	data: z.instanceof(Uint8Array),
	crc: z.number().int(),
});

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Reads a 32-bit big-endian unsigned integer from a buffer.
 */
function readUint32BE(data: Uint8Array, offset: number): number {
	return (
		(((data[offset] ?? 0) << 24) |
			((data[offset + 1] ?? 0) << 16) |
			((data[offset + 2] ?? 0) << 8) |
			(data[offset + 3] ?? 0)) >>>
		0
	);
}

/**
 * Computes CRC-32 over a byte sequence.
 */
function computeCrc(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < data.length; i++) {
		const byte = data[i] ?? 0;
		const tableIndex = (crc ^ byte) & 0xff;
		crc = (CRC_TABLE[tableIndex] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Validates that the data starts with the PNG magic bytes.
 *
 * @param data - Raw file data
 * @returns true if the data has a valid PNG signature
 *
 * @example
 * ```typescript
 * import { validateMagicBytes } from 'blecsd';
 *
 * const isValid = validateMagicBytes(fileData);
 * ```
 */
export function validateMagicBytes(data: Uint8Array): boolean {
	if (data.length < 8) return false;
	for (let i = 0; i < 8; i++) {
		if (data[i] !== PNG_MAGIC[i]) return false;
	}
	return true;
}

/**
 * Parses PNG chunk structure from raw data (after magic bytes).
 *
 * Each chunk has: 4-byte length, 4-byte type, data, 4-byte CRC.
 *
 * @param data - Raw PNG file data (including magic bytes)
 * @returns Array of parsed chunks
 *
 * @example
 * ```typescript
 * import { parseChunks } from 'blecsd';
 *
 * const chunks = parseChunks(pngBuffer);
 * for (const chunk of chunks) {
 *   console.log(chunk.type, chunk.data.length);
 * }
 * ```
 */
export function parseChunks(data: Uint8Array): PNGChunk[] {
	if (!validateMagicBytes(data)) {
		throw new Error('Invalid PNG: missing magic bytes');
	}

	const chunks: PNGChunk[] = [];
	let offset = 8; // Skip magic bytes

	while (offset < data.length) {
		if (offset + 8 > data.length) {
			throw new Error(`Invalid PNG: truncated chunk header at offset ${offset}`);
		}

		const length = readUint32BE(data, offset);
		offset += 4;

		const typeBytes = data.slice(offset, offset + 4);
		const type = String.fromCharCode(
			typeBytes[0] ?? 0,
			typeBytes[1] ?? 0,
			typeBytes[2] ?? 0,
			typeBytes[3] ?? 0,
		);
		offset += 4;

		if (offset + length + 4 > data.length) {
			throw new Error(`Invalid PNG: truncated chunk data for '${type}' at offset ${offset}`);
		}

		const chunkData = data.slice(offset, offset + length);
		offset += length;

		const crc = readUint32BE(data, offset);
		offset += 4;

		chunks.push({ type, data: chunkData, crc });

		if (type === 'IEND') break;
	}

	return chunks;
}

/**
 * Parses an IHDR chunk into a PNGHeader.
 *
 * The IHDR chunk must be exactly 13 bytes and is always the first chunk.
 *
 * @param chunk - The IHDR chunk
 * @returns Parsed header data
 *
 * @example
 * ```typescript
 * import { parseChunks, parseIHDR } from 'blecsd';
 *
 * const chunks = parseChunks(pngBuffer);
 * const ihdr = chunks.find(c => c.type === 'IHDR');
 * if (ihdr) {
 *   const header = parseIHDR(ihdr);
 *   console.log(header.width, header.height);
 * }
 * ```
 */
export function parseIHDR(chunk: PNGChunk): PNGHeader {
	if (chunk.type !== 'IHDR') {
		throw new Error(`Expected IHDR chunk, got '${chunk.type}'`);
	}
	if (chunk.data.length !== 13) {
		throw new Error(`Invalid IHDR: expected 13 bytes, got ${chunk.data.length}`);
	}

	const raw = {
		width: readUint32BE(chunk.data, 0),
		height: readUint32BE(chunk.data, 4),
		bitDepth: chunk.data[8] ?? 0,
		colorType: chunk.data[9] ?? 0,
		compression: chunk.data[10] ?? 0,
		filter: chunk.data[11] ?? 0,
		interlace: chunk.data[12] ?? 0,
	};

	return PNGHeaderSchema.parse(raw);
}

/**
 * Decompresses concatenated IDAT chunk data using zlib inflate.
 *
 * PNG stores compressed image data across one or more IDAT chunks.
 * This function concatenates all IDAT data and decompresses it.
 *
 * @param chunks - Array of PNG chunks (only IDAT chunks are used)
 * @returns Decompressed image data
 *
 * @example
 * ```typescript
 * import { parseChunks, decompressIDAT } from 'blecsd';
 *
 * const chunks = parseChunks(pngBuffer);
 * const imageData = decompressIDAT(chunks);
 * ```
 */
export function decompressIDAT(chunks: readonly PNGChunk[]): Uint8Array {
	const idatChunks = chunks.filter((c) => c.type === 'IDAT');
	if (idatChunks.length === 0) {
		throw new Error('No IDAT chunks found');
	}

	const totalLength = idatChunks.reduce((sum, c) => sum + c.data.length, 0);
	const combined = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of idatChunks) {
		combined.set(chunk.data, offset);
		offset += chunk.data.length;
	}

	try {
		const result = inflateSync(Buffer.from(combined));
		return new Uint8Array(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown decompression error';
		throw new Error(`Failed to decompress IDAT data: ${message}`);
	}
}

/**
 * Validates the CRC-32 checksum of a PNG chunk.
 *
 * The CRC is computed over the chunk type bytes followed by the chunk data.
 *
 * @param chunk - The chunk to validate
 * @returns true if the CRC matches
 *
 * @example
 * ```typescript
 * import { parseChunks, validateCRC } from 'blecsd';
 *
 * const chunks = parseChunks(pngBuffer);
 * for (const chunk of chunks) {
 *   if (!validateCRC(chunk)) {
 *     console.error(`CRC mismatch in ${chunk.type} chunk`);
 *   }
 * }
 * ```
 */
export function validateCRC(chunk: PNGChunk): boolean {
	const typeBytes = new Uint8Array(4);
	for (let i = 0; i < 4; i++) {
		typeBytes[i] = chunk.type.charCodeAt(i);
	}

	const combined = new Uint8Array(4 + chunk.data.length);
	combined.set(typeBytes, 0);
	combined.set(chunk.data, 4);

	const computed = computeCrc(combined);
	return computed === chunk.crc;
}

/**
 * Parses a complete PNG file from raw bytes.
 *
 * Validates magic bytes, parses all chunks, extracts the header from IHDR,
 * and decompresses IDAT image data.
 *
 * @param data - Raw PNG file data
 * @returns Parse result (success with parsed data, or error)
 *
 * @example
 * ```typescript
 * import { parsePNG } from 'blecsd';
 * import { readFileSync } from 'node:fs';
 *
 * const data = new Uint8Array(readFileSync('image.png'));
 * const result = parsePNG(data);
 * if (result.ok) {
 *   console.log(result.result.header.width, result.result.header.height);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function parsePNG(data: Uint8Array): PNGParseOutput {
	if (!validateMagicBytes(data)) {
		return { ok: false, error: 'Invalid PNG: missing or incorrect magic bytes' };
	}

	let chunks: PNGChunk[];
	try {
		chunks = parseChunks(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown chunk parsing error';
		return { ok: false, error: message };
	}

	if (chunks.length === 0) {
		return { ok: false, error: 'Invalid PNG: no chunks found' };
	}

	const ihdrChunk = chunks[0];
	if (!ihdrChunk || ihdrChunk.type !== 'IHDR') {
		return { ok: false, error: 'Invalid PNG: first chunk is not IHDR' };
	}

	let header: PNGHeader;
	try {
		header = parseIHDR(ihdrChunk);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown IHDR parsing error';
		return { ok: false, error: message };
	}

	let imageData: Uint8Array;
	try {
		imageData = decompressIDAT(chunks);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown decompression error';
		return { ok: false, error: message };
	}

	return {
		ok: true,
		result: { header, chunks, imageData },
	};
}
