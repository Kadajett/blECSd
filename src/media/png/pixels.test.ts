/**
 * Tests for PNG pixel extraction.
 *
 * @module media/png/pixels.test
 */

import { describe, expect, it } from 'vitest';
import type { PNGChunk, PNGHeader } from './parser';
import { ColorType } from './parser';
import { extractPixels, parsePLTE, parseTRNS } from './pixels';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Creates a PNGHeader for testing.
 */
function makeHeader(width: number, height: number, colorType: ColorType, bitDepth = 8): PNGHeader {
	return {
		width,
		height,
		bitDepth,
		colorType,
		compression: 0,
		filter: 0,
		interlace: 0,
	};
}

/**
 * Creates a PLTE chunk from RGB triples.
 */
function buildPLTE(entries: Array<[number, number, number]>): PNGChunk {
	const data = new Uint8Array(entries.length * 3);
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry) continue;
		data[i * 3] = entry[0];
		data[i * 3 + 1] = entry[1];
		data[i * 3 + 2] = entry[2];
	}
	return { type: 'PLTE', data, crc: 0 };
}

/**
 * Creates a tRNS chunk from alpha values.
 */
function buildTRNS(alphas: number[]): PNGChunk {
	return { type: 'tRNS', data: new Uint8Array(alphas), crc: 0 };
}

// =============================================================================
// parsePLTE
// =============================================================================

describe('parsePLTE', () => {
	it('parses a palette with 3 entries', () => {
		const chunk = buildPLTE([
			[255, 0, 0],
			[0, 255, 0],
			[0, 0, 255],
		]);
		const palette = parsePLTE(chunk);
		expect(palette).toHaveLength(3);
		expect(palette[0]).toEqual({ r: 255, g: 0, b: 0 });
		expect(palette[1]).toEqual({ r: 0, g: 255, b: 0 });
		expect(palette[2]).toEqual({ r: 0, g: 0, b: 255 });
	});

	it('parses a single-entry palette', () => {
		const chunk = buildPLTE([[128, 64, 32]]);
		const palette = parsePLTE(chunk);
		expect(palette).toHaveLength(1);
		expect(palette[0]).toEqual({ r: 128, g: 64, b: 32 });
	});

	it('throws for non-PLTE chunk', () => {
		const chunk: PNGChunk = { type: 'IHDR', data: new Uint8Array(9), crc: 0 };
		expect(() => parsePLTE(chunk)).toThrow("Expected PLTE chunk, got 'IHDR'");
	});

	it('throws for data not divisible by 3', () => {
		const chunk: PNGChunk = { type: 'PLTE', data: new Uint8Array(7), crc: 0 };
		expect(() => parsePLTE(chunk)).toThrow('divisible by 3');
	});

	it('throws for empty palette', () => {
		const chunk: PNGChunk = { type: 'PLTE', data: new Uint8Array(0), crc: 0 };
		expect(() => parsePLTE(chunk)).toThrow('must be 1-256');
	});

	it('throws for palette with more than 256 entries', () => {
		const chunk: PNGChunk = { type: 'PLTE', data: new Uint8Array(769), crc: 0 };
		expect(() => parsePLTE(chunk)).toThrow();
	});
});

// =============================================================================
// parseTRNS
// =============================================================================

describe('parseTRNS', () => {
	it('parses transparency for palette indices', () => {
		const chunk = buildTRNS([0, 128, 255]);
		const alphas = parseTRNS(chunk, 5);
		expect(alphas).toHaveLength(5);
		expect(alphas[0]).toBe(0);
		expect(alphas[1]).toBe(128);
		expect(alphas[2]).toBe(255);
		expect(alphas[3]).toBe(255); // Default opaque
		expect(alphas[4]).toBe(255);
	});

	it('throws for non-tRNS chunk', () => {
		const chunk: PNGChunk = { type: 'IHDR', data: new Uint8Array(0), crc: 0 };
		expect(() => parseTRNS(chunk, 1)).toThrow("Expected tRNS chunk, got 'IHDR'");
	});

	it('handles empty tRNS chunk (all opaque)', () => {
		const chunk: PNGChunk = { type: 'tRNS', data: new Uint8Array(0), crc: 0 };
		const alphas = parseTRNS(chunk, 3);
		expect(alphas).toEqual([255, 255, 255]);
	});
});

// =============================================================================
// extractPixels - Grayscale
// =============================================================================

describe('extractPixels - Grayscale', () => {
	it('extracts 8-bit grayscale pixels', () => {
		const header = makeHeader(2, 2, ColorType.Grayscale);
		const rawData = new Uint8Array([100, 200, 50, 150]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.width).toBe(2);
		expect(result.pixels.height).toBe(2);
		expect(result.pixels.data.length).toBe(16); // 2 * 2 * 4

		// First pixel: gray=100
		expect(result.pixels.data[0]).toBe(100);
		expect(result.pixels.data[1]).toBe(100);
		expect(result.pixels.data[2]).toBe(100);
		expect(result.pixels.data[3]).toBe(255);

		// Second pixel: gray=200
		expect(result.pixels.data[4]).toBe(200);
	});

	it('extracts 1-bit grayscale (black and white)', () => {
		const header = makeHeader(8, 1, ColorType.Grayscale, 1);
		// 0b10101010 = alternating white/black
		const rawData = new Uint8Array([0b10101010]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(255); // bit 1
		expect(result.pixels.data[4]).toBe(0); // bit 0
		expect(result.pixels.data[8]).toBe(255); // bit 1
		expect(result.pixels.data[12]).toBe(0); // bit 0
	});

	it('extracts 4-bit grayscale', () => {
		const header = makeHeader(2, 1, ColorType.Grayscale, 4);
		// First nibble = 0xF (15), second nibble = 0x0
		const rawData = new Uint8Array([0xf0]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// 15 scaled to 8-bit: (15 * 255) / 15 = 255
		expect(result.pixels.data[0]).toBe(255);
		// 0 scaled to 8-bit: 0
		expect(result.pixels.data[4]).toBe(0);
	});

	it('extracts 16-bit grayscale', () => {
		const header = makeHeader(1, 1, ColorType.Grayscale, 16);
		// 16-bit value: 0x8000 => high byte 128
		const rawData = new Uint8Array([0x80, 0x00]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(128);
		expect(result.pixels.data[3]).toBe(255); // fully opaque
	});
});

// =============================================================================
// extractPixels - RGB
// =============================================================================

describe('extractPixels - RGB', () => {
	it('extracts 8-bit RGB pixels', () => {
		const header = makeHeader(2, 1, ColorType.RGB);
		const rawData = new Uint8Array([255, 0, 0, 0, 255, 0]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Red pixel
		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[1]).toBe(0);
		expect(result.pixels.data[2]).toBe(0);
		expect(result.pixels.data[3]).toBe(255); // opaque

		// Green pixel
		expect(result.pixels.data[4]).toBe(0);
		expect(result.pixels.data[5]).toBe(255);
		expect(result.pixels.data[6]).toBe(0);
		expect(result.pixels.data[7]).toBe(255);
	});

	it('extracts 16-bit RGB pixels', () => {
		const header = makeHeader(1, 1, ColorType.RGB, 16);
		// R=0xFF00, G=0x8000, B=0x0000
		const rawData = new Uint8Array([0xff, 0x00, 0x80, 0x00, 0x00, 0x00]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[1]).toBe(128);
		expect(result.pixels.data[2]).toBe(0);
		expect(result.pixels.data[3]).toBe(255);
	});
});

// =============================================================================
// extractPixels - RGBA
// =============================================================================

describe('extractPixels - RGBA', () => {
	it('extracts 8-bit RGBA pixels', () => {
		const header = makeHeader(1, 1, ColorType.RGBA);
		const rawData = new Uint8Array([255, 128, 64, 200]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[1]).toBe(128);
		expect(result.pixels.data[2]).toBe(64);
		expect(result.pixels.data[3]).toBe(200);
	});

	it('extracts 16-bit RGBA pixels', () => {
		const header = makeHeader(1, 1, ColorType.RGBA, 16);
		// R=0xFF00, G=0x8000, B=0x4000, A=0xC800
		const rawData = new Uint8Array([0xff, 0x00, 0x80, 0x00, 0x40, 0x00, 0xc8, 0x00]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[1]).toBe(128);
		expect(result.pixels.data[2]).toBe(64);
		expect(result.pixels.data[3]).toBe(200);
	});
});

// =============================================================================
// extractPixels - GrayscaleAlpha
// =============================================================================

describe('extractPixels - GrayscaleAlpha', () => {
	it('extracts 8-bit grayscale+alpha pixels', () => {
		const header = makeHeader(2, 1, ColorType.GrayscaleAlpha);
		const rawData = new Uint8Array([100, 255, 200, 128]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Pixel 1: gray=100, alpha=255
		expect(result.pixels.data[0]).toBe(100);
		expect(result.pixels.data[1]).toBe(100);
		expect(result.pixels.data[2]).toBe(100);
		expect(result.pixels.data[3]).toBe(255);

		// Pixel 2: gray=200, alpha=128
		expect(result.pixels.data[4]).toBe(200);
		expect(result.pixels.data[5]).toBe(200);
		expect(result.pixels.data[6]).toBe(200);
		expect(result.pixels.data[7]).toBe(128);
	});

	it('extracts 16-bit grayscale+alpha pixels', () => {
		const header = makeHeader(1, 1, ColorType.GrayscaleAlpha, 16);
		const rawData = new Uint8Array([0x80, 0x00, 0xff, 0x00]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(128);
		expect(result.pixels.data[3]).toBe(255);
	});
});

// =============================================================================
// extractPixels - Indexed
// =============================================================================

describe('extractPixels - Indexed', () => {
	it('extracts 8-bit indexed pixels with palette', () => {
		const header = makeHeader(2, 1, ColorType.Indexed);
		const rawData = new Uint8Array([0, 1]); // Index 0 and 1
		const plte = buildPLTE([
			[255, 0, 0],
			[0, 255, 0],
		]);

		const result = extractPixels(rawData, header, [plte]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Pixel 0: palette[0] = red
		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[1]).toBe(0);
		expect(result.pixels.data[2]).toBe(0);
		expect(result.pixels.data[3]).toBe(255);

		// Pixel 1: palette[1] = green
		expect(result.pixels.data[4]).toBe(0);
		expect(result.pixels.data[5]).toBe(255);
		expect(result.pixels.data[6]).toBe(0);
		expect(result.pixels.data[7]).toBe(255);
	});

	it('extracts 4-bit indexed pixels', () => {
		const header = makeHeader(2, 1, ColorType.Indexed, 4);
		// 0x01 = index 0 (high nibble), index 1 (low nibble)
		const rawData = new Uint8Array([0x01]);
		const plte = buildPLTE([
			[255, 0, 0],
			[0, 0, 255],
		]);

		const result = extractPixels(rawData, header, [plte]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// First pixel: palette[0] = red
		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[1]).toBe(0);
		expect(result.pixels.data[2]).toBe(0);

		// Second pixel: palette[1] = blue
		expect(result.pixels.data[4]).toBe(0);
		expect(result.pixels.data[5]).toBe(0);
		expect(result.pixels.data[6]).toBe(255);
	});

	it('applies tRNS transparency', () => {
		const header = makeHeader(1, 1, ColorType.Indexed);
		const rawData = new Uint8Array([0]);
		const plte = buildPLTE([[255, 0, 0]]);
		const trns = buildTRNS([128]);

		const result = extractPixels(rawData, header, [plte, trns]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data[0]).toBe(255);
		expect(result.pixels.data[3]).toBe(128);
	});

	it('returns error when PLTE chunk is missing', () => {
		const header = makeHeader(1, 1, ColorType.Indexed);
		const rawData = new Uint8Array([0]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain('PLTE');
	});

	it('handles out-of-range palette index gracefully', () => {
		const header = makeHeader(1, 1, ColorType.Indexed);
		const rawData = new Uint8Array([5]); // Index 5, but palette only has 2 entries
		const plte = buildPLTE([
			[255, 0, 0],
			[0, 255, 0],
		]);

		const result = extractPixels(rawData, header, [plte]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		// Out of range, should be black
		expect(result.pixels.data[0]).toBe(0);
		expect(result.pixels.data[1]).toBe(0);
		expect(result.pixels.data[2]).toBe(0);
		expect(result.pixels.data[3]).toBe(255);
	});
});

// =============================================================================
// extractPixels - edge cases
// =============================================================================

describe('extractPixels - edge cases', () => {
	it('handles 1x1 images', () => {
		const header = makeHeader(1, 1, ColorType.Grayscale);
		const rawData = new Uint8Array([128]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data.length).toBe(4);
		expect(result.pixels.data[0]).toBe(128);
	});

	it('handles large images', () => {
		const header = makeHeader(100, 100, ColorType.RGBA);
		const rawData = new Uint8Array(100 * 100 * 4);
		rawData.fill(128);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.pixels.data.length).toBe(100 * 100 * 4);
	});

	it('returns error for unsupported color type', () => {
		const header = makeHeader(1, 1, 7 as ColorType);
		const rawData = new Uint8Array([0]);

		const result = extractPixels(rawData, header);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain('Unsupported color type');
	});
});
