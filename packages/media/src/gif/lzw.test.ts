/**
 * Tests for GIF LZW decompression.
 *
 * @module media/gif/lzw.test
 */

import { describe, expect, it } from 'vitest';
import { createBitReader, decompressLZW, readCode } from './lzw';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Encodes pixel data into LZW compressed format for testing.
 * Correctly tracks code size increases to match the decompressor.
 * Uses simple encoding (no actual LZW compression, just individual codes).
 */
function lzwEncode(pixels: number[], minCodeSize: number): Uint8Array {
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
// BIT READER
// =============================================================================

describe('createBitReader', () => {
	it('creates a reader at position 0', () => {
		const reader = createBitReader(new Uint8Array([0xff]));
		expect(reader.byteOffset).toBe(0);
		expect(reader.bitOffset).toBe(0);
	});
});

describe('readCode', () => {
	it('reads a 3-bit code from the first byte', () => {
		const reader = createBitReader(new Uint8Array([0b00000101]));
		expect(readCode(reader, 3)).toBe(5);
	});

	it('reads multiple codes from the same byte', () => {
		const reader = createBitReader(new Uint8Array([0b10110100]));
		expect(readCode(reader, 4)).toBe(0b0100); // 4
		expect(readCode(reader, 4)).toBe(0b1011); // 11
	});

	it('reads codes spanning byte boundaries', () => {
		const reader = createBitReader(new Uint8Array([0xff, 0x01]));
		expect(readCode(reader, 9)).toBe(0x1ff);
	});

	it('returns -1 when data is exhausted', () => {
		const reader = createBitReader(new Uint8Array([0xff]));
		readCode(reader, 8);
		expect(readCode(reader, 1)).toBe(-1);
	});

	it('reads 12-bit codes correctly', () => {
		// 0xab = 10101011, 0xcd = 11001101, 0xef = 11101111
		// First 12 bits (LSB first from bytes): bits 0-7 from 0xab, bits 8-11 from low nibble of 0xcd
		// code1 = 0xab | ((0xcd & 0x0f) << 8) = 0xab | (0xd << 8) = 0xdab
		const reader = createBitReader(new Uint8Array([0xab, 0xcd, 0xef]));
		const code1 = readCode(reader, 12);
		expect(code1).toBe(0xdab);

		// Next 12 bits: upper nibble of 0xcd (bits 12-15) + all of 0xef (bits 16-23)
		// code2 = (0xcd >> 4) | (0xef << 4) = 0x0c | 0xef0 = 0xefc
		const code2 = readCode(reader, 12);
		expect(code2).toBe(0xefc);
	});
});

// =============================================================================
// LZW DECOMPRESSION
// =============================================================================

describe('decompressLZW', () => {
	it('rejects invalid minimum code size < 2', () => {
		const result = decompressLZW(new Uint8Array([]), 1, 10);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Invalid minimum code size');
		}
	});

	it('rejects invalid minimum code size > 11', () => {
		const result = decompressLZW(new Uint8Array([]), 12, 10);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('Invalid minimum code size');
		}
	});

	it('handles empty data gracefully', () => {
		const result = decompressLZW(new Uint8Array([]), 2, 0);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(0);
		}
	});

	it('decompresses a simple 2-color stream', () => {
		const compressed = lzwEncode([0, 1, 0, 1], 2);
		const result = decompressLZW(compressed, 2, 4);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual([0, 1, 0, 1]);
		}
	});

	it('decompresses repeated values', () => {
		const compressed = lzwEncode([1, 1, 1, 1], 2);
		const result = decompressLZW(compressed, 2, 4);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual([1, 1, 1, 1]);
		}
	});

	it('decompresses all zeros', () => {
		const compressed = lzwEncode([0, 0, 0, 0], 2);
		const result = decompressLZW(compressed, 2, 4);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual([0, 0, 0, 0]);
		}
	});

	it('decompresses a single pixel', () => {
		const compressed = lzwEncode([3], 2);
		const result = decompressLZW(compressed, 2, 1);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual([3]);
		}
	});

	it('decompresses with code size increase', () => {
		// With minCodeSize=2, code size starts at 3 (8 possible codes).
		// After adding a few table entries, code size should increase to 4.
		const pixels = [0, 1, 2, 3, 0, 1, 2, 3];
		const compressed = lzwEncode(pixels, 2);
		const result = decompressLZW(compressed, 2, 8);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual(pixels);
		}
	});

	it('handles minimum code size of 8 (256 colors)', () => {
		const compressed = lzwEncode([42], 8);
		const result = decompressLZW(compressed, 8, 1);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data[0]).toBe(42);
		}
	});

	it('decompresses 256-color sequential data', () => {
		const pixels = Array.from({ length: 16 }, (_, i) => i);
		const compressed = lzwEncode(pixels, 8);
		const result = decompressLZW(compressed, 8, 16);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual(pixels);
		}
	});

	it('limits output to expectedPixels', () => {
		const compressed = lzwEncode([0, 1, 2, 3], 2);
		const result = decompressLZW(compressed, 2, 2);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.length).toBe(2);
			expect(Array.from(result.data)).toEqual([0, 1]);
		}
	});

	it('decompresses larger data sets', () => {
		const pixels = Array.from({ length: 100 }, (_, i) => i % 4);
		const compressed = lzwEncode(pixels, 2);
		const result = decompressLZW(compressed, 2, 100);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual(pixels);
		}
	});

	it('decompresses with minCodeSize 3 (8 colors)', () => {
		const pixels = [0, 1, 2, 3, 4, 5, 6, 7];
		const compressed = lzwEncode(pixels, 3);
		const result = decompressLZW(compressed, 3, 8);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(Array.from(result.data)).toEqual(pixels);
		}
	});
});
