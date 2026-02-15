/**
 * Tests for PNG parser.
 *
 * @module media/png/parser.test
 */

import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
	ColorType,
	decompressIDAT,
	PNG_MAGIC,
	PNGChunkSchema,
	PNGHeaderSchema,
	parseChunks,
	parseIHDR,
	parsePNG,
	validateCRC,
	validateMagicBytes,
} from './parser';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Writes a 32-bit big-endian unsigned integer into a buffer at offset.
 */
function writeUint32BE(buf: Uint8Array, value: number, offset: number): void {
	buf[offset] = (value >>> 24) & 0xff;
	buf[offset + 1] = (value >>> 16) & 0xff;
	buf[offset + 2] = (value >>> 8) & 0xff;
	buf[offset + 3] = value & 0xff;
}

/**
 * Builds a CRC-32 lookup table (test helper).
 */
function buildTestCrcTable(): Uint32Array {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c;
	}
	return table;
}

const TEST_CRC_TABLE = buildTestCrcTable();

/**
 * Computes CRC-32 over a byte sequence (test helper).
 */
function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < data.length; i++) {
		const byte = data[i] ?? 0;
		const idx = (crc ^ byte) & 0xff;
		crc = (TEST_CRC_TABLE[idx] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Builds a PNG chunk with correct CRC.
 */
function buildChunk(type: string, data: Uint8Array): Uint8Array {
	const typeBytes = new Uint8Array(4);
	for (let i = 0; i < 4; i++) {
		typeBytes[i] = type.charCodeAt(i);
	}

	// CRC is over type + data
	const crcInput = new Uint8Array(4 + data.length);
	crcInput.set(typeBytes, 0);
	crcInput.set(data, 4);
	const crc = crc32(crcInput);

	// Chunk = length(4) + type(4) + data(N) + crc(4)
	const chunk = new Uint8Array(12 + data.length);
	writeUint32BE(chunk, data.length, 0);
	chunk.set(typeBytes, 4);
	chunk.set(data, 8);
	writeUint32BE(chunk, crc, 8 + data.length);

	return chunk;
}

/**
 * Builds an IHDR data block (13 bytes).
 */
function buildIHDRData(
	width: number,
	height: number,
	bitDepth: number,
	colorType: number,
	interlace = 0,
): Uint8Array {
	const data = new Uint8Array(13);
	writeUint32BE(data, width, 0);
	writeUint32BE(data, height, 4);
	data[8] = bitDepth;
	data[9] = colorType;
	data[10] = 0; // compression
	data[11] = 0; // filter
	data[12] = interlace;
	return data;
}

/**
 * Builds a minimal valid PNG file.
 */
function buildMinimalPNG(
	width: number,
	height: number,
	colorType: ColorType,
	bitDepth = 8,
): Uint8Array {
	const ihdrData = buildIHDRData(width, height, bitDepth, colorType);
	const ihdrChunk = buildChunk('IHDR', ihdrData);

	// Build raw image data: each row starts with a filter byte (0 = None)
	const bytesPerPixel =
		colorType === ColorType.RGBA
			? 4
			: colorType === ColorType.RGB
				? 3
				: colorType === ColorType.GrayscaleAlpha
					? 2
					: 1;
	const rowBytes = 1 + width * bytesPerPixel * (bitDepth / 8);
	const rawImage = new Uint8Array(height * rowBytes); // All zeros (filter byte 0 + black pixels)

	const compressed = deflateSync(Buffer.from(rawImage));
	const idatChunk = buildChunk('IDAT', new Uint8Array(compressed));

	const iendChunk = buildChunk('IEND', new Uint8Array(0));

	// Assemble: magic + IHDR + IDAT + IEND
	const total = PNG_MAGIC.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
	const png = new Uint8Array(total);
	let offset = 0;
	png.set(PNG_MAGIC, offset);
	offset += PNG_MAGIC.length;
	png.set(ihdrChunk, offset);
	offset += ihdrChunk.length;
	png.set(idatChunk, offset);
	offset += idatChunk.length;
	png.set(iendChunk, offset);

	return png;
}

// =============================================================================
// TESTS
// =============================================================================

describe('PNG parser', () => {
	describe('validateMagicBytes', () => {
		it('accepts valid PNG magic bytes', () => {
			const data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
			expect(validateMagicBytes(data)).toBe(true);
		});

		it('rejects data shorter than 8 bytes', () => {
			const data = new Uint8Array([137, 80, 78]);
			expect(validateMagicBytes(data)).toBe(false);
		});

		it('rejects data with wrong magic bytes', () => {
			const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
			expect(validateMagicBytes(data)).toBe(false);
		});

		it('rejects JPEG magic bytes', () => {
			const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
			expect(validateMagicBytes(data)).toBe(false);
		});

		it('rejects empty data', () => {
			expect(validateMagicBytes(new Uint8Array(0))).toBe(false);
		});
	});

	describe('parseChunks', () => {
		it('parses chunks from a minimal PNG', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const chunks = parseChunks(png);

			expect(chunks.length).toBeGreaterThanOrEqual(3);
			expect(chunks[0]?.type).toBe('IHDR');
			expect(chunks[chunks.length - 1]?.type).toBe('IEND');
		});

		it('parses IHDR chunk with correct data length', () => {
			const png = buildMinimalPNG(1, 1, ColorType.RGB);
			const chunks = parseChunks(png);

			const ihdr = chunks[0];
			expect(ihdr?.type).toBe('IHDR');
			expect(ihdr?.data.length).toBe(13);
		});

		it('parses IDAT chunk', () => {
			const png = buildMinimalPNG(2, 2, ColorType.RGBA);
			const chunks = parseChunks(png);

			const idat = chunks.find((c) => c.type === 'IDAT');
			expect(idat).toBeDefined();
			expect(idat!.data.length).toBeGreaterThan(0);
		});

		it('parses IEND chunk with zero data', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const chunks = parseChunks(png);

			const iend = chunks.find((c) => c.type === 'IEND');
			expect(iend).toBeDefined();
			expect(iend!.data.length).toBe(0);
		});

		it('throws on missing magic bytes', () => {
			const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
			expect(() => parseChunks(data)).toThrow('missing magic bytes');
		});

		it('throws on truncated chunk header', () => {
			// Magic bytes + only 4 bytes (not enough for a complete chunk header)
			const data = new Uint8Array([...PNG_MAGIC, 0, 0, 0, 1]);
			expect(() => parseChunks(data)).toThrow('truncated chunk header');
		});

		it('throws on truncated chunk data', () => {
			// Magic bytes + length=100 + type + but only 2 data bytes
			const data = new Uint8Array([
				...PNG_MAGIC,
				0,
				0,
				0,
				100, // length = 100
				73,
				72,
				68,
				82, // IHDR
				0,
				0, // only 2 bytes of data (need 100 + 4 CRC)
			]);
			expect(() => parseChunks(data)).toThrow('truncated chunk data');
		});
	});

	describe('parseIHDR', () => {
		it('parses a Grayscale IHDR', () => {
			const png = buildMinimalPNG(16, 32, ColorType.Grayscale);
			const chunks = parseChunks(png);
			const header = parseIHDR(chunks[0]!);

			expect(header.width).toBe(16);
			expect(header.height).toBe(32);
			expect(header.bitDepth).toBe(8);
			expect(header.colorType).toBe(ColorType.Grayscale);
			expect(header.compression).toBe(0);
			expect(header.filter).toBe(0);
			expect(header.interlace).toBe(0);
		});

		it('parses an RGB IHDR', () => {
			const png = buildMinimalPNG(100, 200, ColorType.RGB);
			const chunks = parseChunks(png);
			const header = parseIHDR(chunks[0]!);

			expect(header.width).toBe(100);
			expect(header.height).toBe(200);
			expect(header.colorType).toBe(ColorType.RGB);
		});

		it('parses an RGBA IHDR', () => {
			const png = buildMinimalPNG(64, 64, ColorType.RGBA);
			const chunks = parseChunks(png);
			const header = parseIHDR(chunks[0]!);

			expect(header.colorType).toBe(ColorType.RGBA);
		});

		it('parses a GrayscaleAlpha IHDR', () => {
			const png = buildMinimalPNG(10, 10, ColorType.GrayscaleAlpha);
			const chunks = parseChunks(png);
			const header = parseIHDR(chunks[0]!);

			expect(header.colorType).toBe(ColorType.GrayscaleAlpha);
		});

		it('throws for non-IHDR chunk', () => {
			const chunk = { type: 'IDAT', data: new Uint8Array(13), crc: 0 };
			expect(() => parseIHDR(chunk)).toThrow("Expected IHDR chunk, got 'IDAT'");
		});

		it('throws for wrong data length', () => {
			const chunk = { type: 'IHDR', data: new Uint8Array(10), crc: 0 };
			expect(() => parseIHDR(chunk)).toThrow('expected 13 bytes, got 10');
		});

		it('throws for invalid bit depth', () => {
			const data = buildIHDRData(1, 1, 3, ColorType.RGB); // bitDepth=3 invalid
			const chunk = { type: 'IHDR', data, crc: 0 };
			expect(() => parseIHDR(chunk)).toThrow();
		});

		it('throws for invalid color type', () => {
			const data = buildIHDRData(1, 1, 8, 5); // colorType=5 invalid
			const chunk = { type: 'IHDR', data, crc: 0 };
			expect(() => parseIHDR(chunk)).toThrow();
		});
	});

	describe('decompressIDAT', () => {
		it('decompresses IDAT data from a 1x1 grayscale PNG', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const chunks = parseChunks(png);
			const imageData = decompressIDAT(chunks);

			// 1x1 grayscale: 1 filter byte + 1 pixel byte = 2 bytes
			expect(imageData.length).toBe(2);
			expect(imageData[0]).toBe(0); // filter byte = None
		});

		it('decompresses IDAT data from a 2x2 RGBA PNG', () => {
			const png = buildMinimalPNG(2, 2, ColorType.RGBA);
			const chunks = parseChunks(png);
			const imageData = decompressIDAT(chunks);

			// 2x2 RGBA: 2 rows * (1 filter byte + 2 * 4 bytes) = 2 * 9 = 18 bytes
			expect(imageData.length).toBe(18);
		});

		it('decompresses IDAT data from a 3x1 RGB PNG', () => {
			const png = buildMinimalPNG(3, 1, ColorType.RGB);
			const chunks = parseChunks(png);
			const imageData = decompressIDAT(chunks);

			// 3x1 RGB: 1 row * (1 filter + 3 * 3 bytes) = 10 bytes
			expect(imageData.length).toBe(10);
		});

		it('throws when no IDAT chunks found', () => {
			const chunks = [{ type: 'IHDR', data: new Uint8Array(13), crc: 0 }];
			expect(() => decompressIDAT(chunks)).toThrow('No IDAT chunks found');
		});

		it('throws on invalid compressed data', () => {
			const chunks = [{ type: 'IDAT', data: new Uint8Array([0xff, 0xff, 0xff]), crc: 0 }];
			expect(() => decompressIDAT(chunks)).toThrow('Failed to decompress');
		});
	});

	describe('validateCRC', () => {
		it('returns true for a chunk with valid CRC', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const chunks = parseChunks(png);

			for (const chunk of chunks) {
				expect(validateCRC(chunk)).toBe(true);
			}
		});

		it('returns false for a chunk with tampered data', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const chunks = parseChunks(png);
			const ihdr = chunks[0]!;

			// Tamper with the data
			const tamperedData = new Uint8Array(ihdr.data);
			tamperedData[0] = (tamperedData[0] ?? 0) ^ 0xff;
			const tampered = { ...ihdr, data: tamperedData };

			expect(validateCRC(tampered)).toBe(false);
		});

		it('returns false for a chunk with wrong CRC', () => {
			const png = buildMinimalPNG(1, 1, ColorType.RGB);
			const chunks = parseChunks(png);
			const ihdr = chunks[0]!;

			const wrongCrc = { ...ihdr, crc: 0xdeadbeef };
			expect(validateCRC(wrongCrc)).toBe(false);
		});

		it('validates IEND chunk CRC', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const chunks = parseChunks(png);
			const iend = chunks.find((c) => c.type === 'IEND');

			expect(iend).toBeDefined();
			expect(validateCRC(iend!)).toBe(true);
		});
	});

	describe('parsePNG', () => {
		it('parses a valid 1x1 grayscale PNG', () => {
			const png = buildMinimalPNG(1, 1, ColorType.Grayscale);
			const result = parsePNG(png);

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			expect(result.result.header.width).toBe(1);
			expect(result.result.header.height).toBe(1);
			expect(result.result.header.colorType).toBe(ColorType.Grayscale);
			expect(result.result.chunks.length).toBeGreaterThanOrEqual(3);
			expect(result.result.imageData.length).toBe(2);
		});

		it('parses a valid 4x4 RGBA PNG', () => {
			const png = buildMinimalPNG(4, 4, ColorType.RGBA);
			const result = parsePNG(png);

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			expect(result.result.header.width).toBe(4);
			expect(result.result.header.height).toBe(4);
			expect(result.result.header.colorType).toBe(ColorType.RGBA);
			// 4 rows * (1 filter byte + 4 * 4 bytes) = 4 * 17 = 68
			expect(result.result.imageData.length).toBe(68);
		});

		it('returns error for non-PNG data', () => {
			const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
			const result = parsePNG(data);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain('magic bytes');
		});

		it('returns error for empty data', () => {
			const result = parsePNG(new Uint8Array(0));

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain('magic bytes');
		});

		it('returns error for PNG with missing IHDR', () => {
			// Magic bytes + IEND chunk only (no IHDR)
			const iendChunk = buildChunk('IEND', new Uint8Array(0));
			const data = new Uint8Array(PNG_MAGIC.length + iendChunk.length);
			data.set(PNG_MAGIC, 0);
			data.set(iendChunk, PNG_MAGIC.length);

			const result = parsePNG(data);
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain('not IHDR');
		});
	});

	describe('PNGHeaderSchema', () => {
		it('validates a correct header', () => {
			const header = PNGHeaderSchema.parse({
				width: 100,
				height: 200,
				bitDepth: 8,
				colorType: ColorType.RGBA,
				compression: 0,
				filter: 0,
				interlace: 0,
			});
			expect(header.width).toBe(100);
		});

		it('rejects zero width', () => {
			expect(() =>
				PNGHeaderSchema.parse({
					width: 0,
					height: 1,
					bitDepth: 8,
					colorType: 2,
					compression: 0,
					filter: 0,
					interlace: 0,
				}),
			).toThrow();
		});

		it('rejects invalid bit depth', () => {
			expect(() =>
				PNGHeaderSchema.parse({
					width: 1,
					height: 1,
					bitDepth: 5,
					colorType: 2,
					compression: 0,
					filter: 0,
					interlace: 0,
				}),
			).toThrow();
		});

		it('rejects non-zero compression', () => {
			expect(() =>
				PNGHeaderSchema.parse({
					width: 1,
					height: 1,
					bitDepth: 8,
					colorType: 2,
					compression: 1,
					filter: 0,
					interlace: 0,
				}),
			).toThrow();
		});

		it('accepts interlace 0 and 1', () => {
			const h0 = PNGHeaderSchema.parse({
				width: 1,
				height: 1,
				bitDepth: 8,
				colorType: 2,
				compression: 0,
				filter: 0,
				interlace: 0,
			});
			const h1 = PNGHeaderSchema.parse({
				width: 1,
				height: 1,
				bitDepth: 8,
				colorType: 2,
				compression: 0,
				filter: 0,
				interlace: 1,
			});
			expect(h0.interlace).toBe(0);
			expect(h1.interlace).toBe(1);
		});
	});

	describe('PNGChunkSchema', () => {
		it('validates a correct chunk', () => {
			const chunk = PNGChunkSchema.parse({
				type: 'IHDR',
				data: new Uint8Array(13),
				crc: 12345,
			});
			expect(chunk.type).toBe('IHDR');
		});

		it('rejects type with wrong length', () => {
			expect(() =>
				PNGChunkSchema.parse({
					type: 'IH',
					data: new Uint8Array(0),
					crc: 0,
				}),
			).toThrow();
		});
	});

	describe('ColorType enum', () => {
		it('has correct values', () => {
			expect(ColorType.Grayscale).toBe(0);
			expect(ColorType.RGB).toBe(2);
			expect(ColorType.Indexed).toBe(3);
			expect(ColorType.GrayscaleAlpha).toBe(4);
			expect(ColorType.RGBA).toBe(6);
		});
	});

	describe('PNG_MAGIC', () => {
		it('has correct 8-byte signature', () => {
			expect(PNG_MAGIC.length).toBe(8);
			expect(PNG_MAGIC[0]).toBe(137);
			expect(PNG_MAGIC[1]).toBe(80); // 'P'
			expect(PNG_MAGIC[2]).toBe(78); // 'N'
			expect(PNG_MAGIC[3]).toBe(71); // 'G'
		});
	});

	describe('multiple IDAT chunks', () => {
		it('decompresses data split across multiple IDAT chunks', () => {
			// Build raw image data for 2x2 grayscale
			const rawImage = new Uint8Array(2 * (1 + 2)); // 2 rows * (filter + 2 pixels)
			const compressed = deflateSync(Buffer.from(rawImage));

			// Split compressed data into two IDAT chunks
			const mid = Math.floor(compressed.length / 2);
			const part1 = new Uint8Array(compressed.slice(0, mid));
			const part2 = new Uint8Array(compressed.slice(mid));

			const idatChunks = [
				{ type: 'IDAT', data: part1, crc: 0 },
				{ type: 'IDAT', data: part2, crc: 0 },
			];

			// Also include non-IDAT chunks that should be ignored
			const allChunks = [
				{ type: 'IHDR', data: new Uint8Array(13), crc: 0 },
				...idatChunks,
				{ type: 'IEND', data: new Uint8Array(0), crc: 0 },
			];

			const imageData = decompressIDAT(allChunks);
			expect(imageData.length).toBe(6); // 2 * (1 + 2)
		});
	});
});
