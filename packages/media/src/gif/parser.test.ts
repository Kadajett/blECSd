/**
 * Tests for GIF parser.
 *
 * @module media/gif/parser.test
 */

import { describe, expect, it } from 'vitest';
import {
	DisposalMethod,
	deinterlace,
	frameToRGBA,
	GIF87A_MAGIC,
	GIF89A_MAGIC,
	GIFHeaderSchema,
	parseColorTable,
	parseGIF,
	parseGIFHeader,
	readSubBlocks,
	validateGIFSignature,
} from './parser';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Builds a minimal GIF87a file with a single 1x1 frame.
 */
interface GIFBuildOptions {
	version?: '87a' | '89a';
	width?: number;
	height?: number;
	colorTableSize?: number;
	pixels?: number[];
	backgroundColor?: number;
	transparent?: number;
	delay?: number;
	disposal?: number;
	loopCount?: number;
	interlaced?: boolean;
}

function writeNetscapeExtension(parts: number[], loopCount: number): void {
	parts.push(0x21, 0xff, 11);
	// "NETSCAPE2.0"
	parts.push(78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48);
	parts.push(3, 1);
	parts.push(loopCount & 0xff, (loopCount >> 8) & 0xff);
	parts.push(0);
}

function writeGraphicsControlExtension(parts: number[], options: GIFBuildOptions): void {
	parts.push(0x21, 0xf9, 4);
	const disposalBits = ((options.disposal ?? 0) & 0x07) << 2;
	const transparentFlag = options.transparent !== undefined ? 1 : 0;
	parts.push(disposalBits | transparentFlag);
	const delayCS = Math.round((options.delay ?? 0) / 10);
	parts.push(delayCS & 0xff, (delayCS >> 8) & 0xff);
	parts.push(options.transparent ?? 0);
	parts.push(0);
}

function writeImageData(parts: number[], compressed: Uint8Array): void {
	let compOffset = 0;
	while (compOffset < compressed.length) {
		const blockSize = Math.min(255, compressed.length - compOffset);
		parts.push(blockSize);
		for (let i = 0; i < blockSize; i++) {
			parts.push(compressed[compOffset + i] ?? 0);
		}
		compOffset += blockSize;
	}
	parts.push(0);
}

function buildMinimalGIF(options: GIFBuildOptions = {}): Uint8Array {
	const version = options.version ?? '87a';
	const width = options.width ?? 1;
	const height = options.height ?? 1;
	const colorTableSizeExp = options.colorTableSize ?? 1;
	const numColors = 1 << (colorTableSizeExp + 1);

	const parts: number[] = [];

	// Signature
	parts.push(...(version === '87a' ? GIF87A_MAGIC : GIF89A_MAGIC));

	// Logical Screen Descriptor
	parts.push(width & 0xff, (width >> 8) & 0xff);
	parts.push(height & 0xff, (height >> 8) & 0xff);
	parts.push(0x80 | (colorTableSizeExp & 0x07));
	parts.push(options.backgroundColor ?? 0, 0);

	// Global Color Table
	for (let i = 0; i < numColors; i++) {
		parts.push((i * 37) % 256, (i * 73) % 256, (i * 113) % 256);
	}

	if (options.loopCount !== undefined) writeNetscapeExtension(parts, options.loopCount);

	const hasGCE =
		options.transparent !== undefined ||
		options.delay !== undefined ||
		options.disposal !== undefined;
	if (hasGCE) writeGraphicsControlExtension(parts, options);

	// Image Descriptor
	parts.push(0x2c, 0, 0, 0, 0);
	parts.push(width & 0xff, (width >> 8) & 0xff);
	parts.push(height & 0xff, (height >> 8) & 0xff);
	parts.push(options.interlaced ? 0x40 : 0x00);

	// Image Data
	const minCodeSize = colorTableSizeExp + 1;
	parts.push(minCodeSize);
	const pixelData = options.pixels ?? Array.from({ length: width * height }, () => 0);
	writeImageData(parts, lzwCompress(pixelData, minCodeSize));

	parts.push(0x3b); // Trailer
	return new Uint8Array(parts);
}

/**
 * LZW compressor for test data.
 * Correctly tracks code size increases to match the decompressor.
 * Emits individual pixel codes (no dictionary compression).
 */
function lzwCompress(pixels: number[], minCodeSize: number): Uint8Array {
	const clearCode = 1 << minCodeSize;
	const eoiCode = clearCode + 1;
	let codeSize = minCodeSize + 1;
	let nextCode = eoiCode + 1;
	let isFirstAfterClear = true;

	const buffer: number[] = [];
	let currentByte = 0;
	let bitsInByte = 0;

	function writeCode(code: number, size: number): void {
		let c = code;
		let remaining = size;
		while (remaining > 0) {
			const available = 8 - bitsInByte;
			const toWrite = Math.min(available, remaining);
			const mask = (1 << toWrite) - 1;
			currentByte |= (c & mask) << bitsInByte;
			c >>= toWrite;
			bitsInByte += toWrite;
			remaining -= toWrite;
			if (bitsInByte === 8) {
				buffer.push(currentByte);
				currentByte = 0;
				bitsInByte = 0;
			}
		}
	}

	writeCode(clearCode, codeSize);

	for (const pixel of pixels) {
		writeCode(pixel, codeSize);
		if (!isFirstAfterClear) {
			nextCode++;
			if (nextCode >= 1 << codeSize && codeSize < 12) {
				codeSize++;
			}
		}
		isFirstAfterClear = false;
	}

	writeCode(eoiCode, codeSize);

	if (bitsInByte > 0) {
		buffer.push(currentByte);
	}

	return new Uint8Array(buffer);
}

// =============================================================================
// SIGNATURE VALIDATION
// =============================================================================

describe('validateGIFSignature', () => {
	it('detects GIF87a', () => {
		expect(validateGIFSignature(GIF87A_MAGIC)).toBe('87a');
	});

	it('detects GIF89a', () => {
		expect(validateGIFSignature(GIF89A_MAGIC)).toBe('89a');
	});

	it('returns null for non-GIF data', () => {
		expect(validateGIFSignature(new Uint8Array([0, 1, 2, 3, 4, 5]))).toBeNull();
	});

	it('returns null for too-short data', () => {
		expect(validateGIFSignature(new Uint8Array([0x47, 0x49]))).toBeNull();
	});

	it('returns null for PNG data', () => {
		expect(validateGIFSignature(new Uint8Array([137, 80, 78, 71, 13, 10]))).toBeNull();
	});
});

// =============================================================================
// HEADER PARSING
// =============================================================================

describe('parseGIFHeader', () => {
	it('parses a GIF87a header', () => {
		const gif = buildMinimalGIF({ version: '87a', width: 100, height: 50 });
		const result = parseGIFHeader(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.header.version).toBe('87a');
			expect(result.header.width).toBe(100);
			expect(result.header.height).toBe(50);
			expect(result.header.hasGlobalColorTable).toBe(true);
		}
	});

	it('parses a GIF89a header', () => {
		const gif = buildMinimalGIF({ version: '89a', width: 320, height: 240 });
		const result = parseGIFHeader(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.header.version).toBe('89a');
			expect(result.header.width).toBe(320);
			expect(result.header.height).toBe(240);
		}
	});

	it('rejects data that is too short', () => {
		const result = parseGIFHeader(new Uint8Array(10));
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('too short');
		}
	});

	it('rejects invalid signature', () => {
		const data = new Uint8Array(13);
		const result = parseGIFHeader(data);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Invalid GIF signature');
		}
	});

	it('passes Zod schema validation', () => {
		const gif = buildMinimalGIF({ width: 640, height: 480 });
		const result = parseGIFHeader(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			const validated = GIFHeaderSchema.safeParse(result.header);
			expect(validated.success).toBe(true);
		}
	});
});

// =============================================================================
// COLOR TABLE
// =============================================================================

describe('parseColorTable', () => {
	it('parses a 4-entry color table', () => {
		const data = new Uint8Array([
			255,
			0,
			0, // Red
			0,
			255,
			0, // Green
			0,
			0,
			255, // Blue
			255,
			255,
			255, // White
		]);
		const colors = parseColorTable(data, 0, 4);
		expect(colors).toHaveLength(4);
		expect(colors[0]).toEqual({ r: 255, g: 0, b: 0 });
		expect(colors[1]).toEqual({ r: 0, g: 255, b: 0 });
		expect(colors[2]).toEqual({ r: 0, g: 0, b: 255 });
		expect(colors[3]).toEqual({ r: 255, g: 255, b: 255 });
	});

	it('handles offset correctly', () => {
		const data = new Uint8Array([0, 0, 0, 128, 64, 32]);
		const colors = parseColorTable(data, 3, 1);
		expect(colors[0]).toEqual({ r: 128, g: 64, b: 32 });
	});
});

// =============================================================================
// SUB-BLOCKS
// =============================================================================

describe('readSubBlocks', () => {
	it('reads a single sub-block', () => {
		const data = new Uint8Array([3, 10, 20, 30, 0]);
		const { blockData, nextOffset } = readSubBlocks(data, 0);
		expect(Array.from(blockData)).toEqual([10, 20, 30]);
		expect(nextOffset).toBe(5);
	});

	it('reads multiple sub-blocks', () => {
		const data = new Uint8Array([2, 10, 20, 3, 30, 40, 50, 0]);
		const { blockData, nextOffset } = readSubBlocks(data, 0);
		expect(Array.from(blockData)).toEqual([10, 20, 30, 40, 50]);
		expect(nextOffset).toBe(8);
	});

	it('handles empty sub-block (immediate terminator)', () => {
		const data = new Uint8Array([0]);
		const { blockData, nextOffset } = readSubBlocks(data, 0);
		expect(blockData.length).toBe(0);
		expect(nextOffset).toBe(1);
	});
});

// =============================================================================
// DEINTERLACE
// =============================================================================

describe('deinterlace', () => {
	it('deinterlaces a 1x8 image', () => {
		// Interlaced order for 8 rows:
		// Pass 1 (every 8, start 0): row 0
		// Pass 2 (every 8, start 4): row 4
		// Pass 3 (every 4, start 2): row 2, 6
		// Pass 4 (every 2, start 1): row 1, 3, 5, 7
		// So interlaced input order: row0, row4, row2, row6, row1, row3, row5, row7
		const interlaced = new Uint8Array([0, 4, 2, 6, 1, 3, 5, 7]);
		const result = deinterlace(interlaced, 1, 8);
		expect(Array.from(result)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it('deinterlaces a 2x4 image', () => {
		// 4 rows:
		// Pass 1 (every 8, start 0): row 0
		// Pass 2 (every 8, start 4): (none, height < 5)
		// Pass 3 (every 4, start 2): row 2
		// Pass 4 (every 2, start 1): row 1, row 3
		// Interlaced order: row0, row2, row1, row3
		const interlaced = new Uint8Array([
			10,
			11, // row 0
			30,
			31, // row 2
			20,
			21, // row 1
			40,
			41, // row 3
		]);
		const result = deinterlace(interlaced, 2, 4);
		expect(Array.from(result)).toEqual([
			10,
			11, // row 0
			20,
			21, // row 1
			30,
			31, // row 2
			40,
			41, // row 3
		]);
	});
});

// =============================================================================
// FRAME TO RGBA
// =============================================================================

describe('frameToRGBA', () => {
	it('converts a single pixel frame to RGBA', () => {
		const globalColorTable = [
			{ r: 255, g: 0, b: 0 },
			{ r: 0, g: 255, b: 0 },
		];
		const frame = {
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			pixels: new Uint8Array([0]),
			delay: 0,
			disposal: DisposalMethod.None,
			transparentIndex: undefined,
			localColorTable: undefined,
			interlaced: false,
		};

		const rgba = frameToRGBA(frame, globalColorTable);
		expect(rgba[0]).toBe(255); // R
		expect(rgba[1]).toBe(0); // G
		expect(rgba[2]).toBe(0); // B
		expect(rgba[3]).toBe(255); // A
	});

	it('handles transparency', () => {
		const globalColorTable = [{ r: 255, g: 0, b: 0 }];
		const frame = {
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			pixels: new Uint8Array([0]),
			delay: 0,
			disposal: DisposalMethod.None,
			transparentIndex: 0,
			localColorTable: undefined,
			interlaced: false,
		};

		const rgba = frameToRGBA(frame, globalColorTable);
		expect(rgba[0]).toBe(0);
		expect(rgba[1]).toBe(0);
		expect(rgba[2]).toBe(0);
		expect(rgba[3]).toBe(0); // Transparent
	});

	it('uses local color table over global', () => {
		const globalColorTable = [{ r: 255, g: 0, b: 0 }];
		const localColorTable = [{ r: 0, g: 0, b: 255 }];
		const frame = {
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			pixels: new Uint8Array([0]),
			delay: 0,
			disposal: DisposalMethod.None,
			transparentIndex: undefined,
			localColorTable,
			interlaced: false,
		};

		const rgba = frameToRGBA(frame, globalColorTable);
		expect(rgba[0]).toBe(0); // R (from local, not global)
		expect(rgba[1]).toBe(0); // G
		expect(rgba[2]).toBe(255); // B (blue from local table)
		expect(rgba[3]).toBe(255); // A
	});
});

// =============================================================================
// FULL PARSER
// =============================================================================

describe('parseGIF', () => {
	it('parses a minimal 1x1 GIF87a', () => {
		const gif = buildMinimalGIF({ version: '87a', width: 1, height: 1 });
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.header.version).toBe('87a');
			expect(result.header.width).toBe(1);
			expect(result.header.height).toBe(1);
			expect(result.frames).toHaveLength(1);
			expect(result.frames[0]?.pixels.length).toBe(1);
		}
	});

	it('parses a 2x2 GIF with specific colors', () => {
		const gif = buildMinimalGIF({
			width: 2,
			height: 2,
			pixels: [0, 1, 2, 3],
			colorTableSize: 1, // 4 colors
		});
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.frames).toHaveLength(1);
			const frame = result.frames[0];
			expect(frame).toBeDefined();
			if (frame) {
				expect(frame.width).toBe(2);
				expect(frame.height).toBe(2);
				expect(Array.from(frame.pixels)).toEqual([0, 1, 2, 3]);
			}
		}
	});

	it('parses a GIF89a with transparency', () => {
		const gif = buildMinimalGIF({
			version: '89a',
			width: 2,
			height: 1,
			pixels: [0, 1],
			transparent: 1,
			colorTableSize: 1,
		});
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.frames).toHaveLength(1);
			expect(result.frames[0]?.transparentIndex).toBe(1);
		}
	});

	it('parses a GIF with frame delay', () => {
		const gif = buildMinimalGIF({
			version: '89a',
			delay: 100, // 100ms
		});
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.frames[0]?.delay).toBe(100);
		}
	});

	it('parses a GIF with disposal method', () => {
		const gif = buildMinimalGIF({
			version: '89a',
			disposal: DisposalMethod.RestoreBackground,
			delay: 50,
		});
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.frames[0]?.disposal).toBe(DisposalMethod.RestoreBackground);
		}
	});

	it('parses a GIF with Netscape loop extension', () => {
		const gif = buildMinimalGIF({
			version: '89a',
			loopCount: 0, // Infinite loop
		});
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.loopCount).toBe(0);
		}
	});

	it('parses a GIF with finite loop count', () => {
		const gif = buildMinimalGIF({
			version: '89a',
			loopCount: 3,
		});
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.loopCount).toBe(3);
		}
	});

	it('extracts global color table', () => {
		const gif = buildMinimalGIF({ colorTableSize: 1 }); // 4 colors
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.globalColorTable).toHaveLength(4);
			// Verify the colors match our generation formula
			expect(result.globalColorTable[0]).toEqual({ r: 0, g: 0, b: 0 });
		}
	});

	it('rejects invalid data', () => {
		const result = parseGIF(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
		expect(result.ok).toBe(false);
	});

	it('rejects too-short data', () => {
		const result = parseGIF(new Uint8Array([0x47, 0x49, 0x46]));
		expect(result.ok).toBe(false);
	});

	it('handles larger image dimensions', () => {
		const gif = buildMinimalGIF({ width: 100, height: 50 });
		const result = parseGIF(gif);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.header.width).toBe(100);
			expect(result.header.height).toBe(50);
			expect(result.frames).toHaveLength(1);
			const frame = result.frames[0];
			expect(frame?.width).toBe(100);
			expect(frame?.height).toBe(50);
		}
	});
});

// =============================================================================
// DISPOSAL METHOD ENUM
// =============================================================================

describe('DisposalMethod', () => {
	it('has correct values', () => {
		expect(DisposalMethod.Unspecified).toBe(0);
		expect(DisposalMethod.None).toBe(1);
		expect(DisposalMethod.RestoreBackground).toBe(2);
		expect(DisposalMethod.RestorePrevious).toBe(3);
	});
});

// =============================================================================
// MAGIC BYTES
// =============================================================================

describe('GIF magic bytes', () => {
	it('GIF87A_MAGIC matches "GIF87a"', () => {
		const expected = new Uint8Array([71, 73, 70, 56, 55, 97]);
		expect(Array.from(GIF87A_MAGIC)).toEqual(Array.from(expected));
	});

	it('GIF89A_MAGIC matches "GIF89a"', () => {
		const expected = new Uint8Array([71, 73, 70, 56, 57, 97]);
		expect(Array.from(GIF89A_MAGIC)).toEqual(Array.from(expected));
	});
});
