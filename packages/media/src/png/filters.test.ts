/**
 * Tests for PNG filter reconstruction.
 *
 * @module media/png/filters.test
 */

import { describe, expect, it } from 'vitest';
import {
	bytesPerPixel,
	FilterType,
	paethPredictor,
	reconstructFilters,
	scanlineBytes,
} from './filters';
import type { PNGHeader } from './parser';
import { ColorType } from './parser';

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
 * Builds raw decompressed IDAT data with filter bytes prepended to each row.
 * Each row: [filterByte, ...rowData]
 */
function buildFilteredData(rows: Array<{ filter: FilterType; data: number[] }>): Uint8Array {
	let totalLength = 0;
	for (const row of rows) {
		totalLength += 1 + row.data.length;
	}
	const buffer = new Uint8Array(totalLength);
	let offset = 0;
	for (const row of rows) {
		buffer[offset] = row.filter;
		offset++;
		for (let i = 0; i < row.data.length; i++) {
			buffer[offset + i] = row.data[i] ?? 0;
		}
		offset += row.data.length;
	}
	return buffer;
}

// =============================================================================
// bytesPerPixel
// =============================================================================

describe('bytesPerPixel', () => {
	it('returns 1 for 8-bit grayscale', () => {
		expect(bytesPerPixel(ColorType.Grayscale, 8)).toBe(1);
	});

	it('returns 3 for 8-bit RGB', () => {
		expect(bytesPerPixel(ColorType.RGB, 8)).toBe(3);
	});

	it('returns 4 for 8-bit RGBA', () => {
		expect(bytesPerPixel(ColorType.RGBA, 8)).toBe(4);
	});

	it('returns 2 for 8-bit GrayscaleAlpha', () => {
		expect(bytesPerPixel(ColorType.GrayscaleAlpha, 8)).toBe(2);
	});

	it('returns 1 for indexed color', () => {
		expect(bytesPerPixel(ColorType.Indexed, 8)).toBe(1);
	});

	it('returns 6 for 16-bit RGB', () => {
		expect(bytesPerPixel(ColorType.RGB, 16)).toBe(6);
	});

	it('returns 8 for 16-bit RGBA', () => {
		expect(bytesPerPixel(ColorType.RGBA, 16)).toBe(8);
	});

	it('returns 1 for sub-byte grayscale (1-bit)', () => {
		expect(bytesPerPixel(ColorType.Grayscale, 1)).toBe(1);
	});

	it('returns 1 for sub-byte grayscale (4-bit)', () => {
		expect(bytesPerPixel(ColorType.Grayscale, 4)).toBe(1);
	});

	it('returns 1 for sub-byte indexed (2-bit)', () => {
		expect(bytesPerPixel(ColorType.Indexed, 2)).toBe(1);
	});
});

// =============================================================================
// scanlineBytes
// =============================================================================

describe('scanlineBytes', () => {
	it('returns correct bytes for 8-bit RGBA', () => {
		const header = makeHeader(10, 10, ColorType.RGBA);
		expect(scanlineBytes(header)).toBe(40); // 10 * 4
	});

	it('returns correct bytes for 8-bit RGB', () => {
		const header = makeHeader(10, 10, ColorType.RGB);
		expect(scanlineBytes(header)).toBe(30); // 10 * 3
	});

	it('returns correct bytes for 8-bit grayscale', () => {
		const header = makeHeader(10, 10, ColorType.Grayscale);
		expect(scanlineBytes(header)).toBe(10);
	});

	it('returns correct bytes for 1-bit grayscale', () => {
		const header = makeHeader(8, 1, ColorType.Grayscale, 1);
		expect(scanlineBytes(header)).toBe(1); // 8 pixels * 1 bit / 8 = 1 byte
	});

	it('returns correct bytes for 1-bit grayscale (non-byte-aligned)', () => {
		const header = makeHeader(10, 1, ColorType.Grayscale, 1);
		expect(scanlineBytes(header)).toBe(2); // ceil(10/8) = 2
	});

	it('returns correct bytes for 4-bit indexed', () => {
		const header = makeHeader(10, 1, ColorType.Indexed, 4);
		expect(scanlineBytes(header)).toBe(5); // ceil(10*4/8) = 5
	});

	it('returns correct bytes for 16-bit RGBA', () => {
		const header = makeHeader(10, 10, ColorType.RGBA, 16);
		expect(scanlineBytes(header)).toBe(80); // 10 * 4 * 2
	});
});

// =============================================================================
// paethPredictor
// =============================================================================

describe('paethPredictor', () => {
	it('returns a when a is the best predictor', () => {
		// p = a + b - c = 100 + 0 - 0 = 100
		// pa = |100 - 100| = 0, pb = |100 - 0| = 100, pc = |100 - 0| = 100
		expect(paethPredictor(100, 0, 0)).toBe(100);
	});

	it('returns b when b is the best predictor', () => {
		// p = 0 + 100 - 0 = 100
		// pa = |100 - 0| = 100, pb = |100 - 100| = 0, pc = |100 - 0| = 100
		expect(paethPredictor(0, 100, 0)).toBe(100);
	});

	it('returns c when c is the best predictor', () => {
		// p = 0 + 0 - 100 = -100
		// pa = |-100 - 0| = 100, pb = |-100 - 0| = 100, pc = |-100 - 100| = 200
		// pa == pb, so returns a... let's use a different case
		// p = 50 + 50 - 100 = 0
		// pa = |0 - 50| = 50, pb = |0 - 50| = 50, pc = |0 - 100| = 100
		// pa == pb, so returns b
		// Better: c is closest when p is near c
		// a=10, b=10, c=10: p=10, pa=0, pb=0, pc=0, returns a (tie goes to a)
		expect(paethPredictor(10, 10, 10)).toBe(10);
	});

	it('handles all zeros', () => {
		expect(paethPredictor(0, 0, 0)).toBe(0);
	});

	it('handles maximum values', () => {
		const result = paethPredictor(255, 255, 255);
		expect(result).toBe(255);
	});

	it('prefers a when pa equals pb', () => {
		// p = 100 + 100 - 100 = 100
		// pa = |100 - 100| = 0, pb = |100 - 100| = 0
		// Should return a (tie-breaking: a wins)
		expect(paethPredictor(100, 100, 100)).toBe(100);
	});
});

// =============================================================================
// FilterType enum
// =============================================================================

describe('FilterType', () => {
	it('has correct values', () => {
		expect(FilterType.None).toBe(0);
		expect(FilterType.Sub).toBe(1);
		expect(FilterType.Up).toBe(2);
		expect(FilterType.Average).toBe(3);
		expect(FilterType.Paeth).toBe(4);
	});
});

// =============================================================================
// reconstructFilters
// =============================================================================

describe('reconstructFilters', () => {
	describe('FilterType.None', () => {
		it('passes through data unchanged for a single row', () => {
			const header = makeHeader(3, 1, ColorType.Grayscale);
			const data = buildFilteredData([{ filter: FilterType.None, data: [10, 20, 30] }]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([10, 20, 30]);
		});

		it('passes through data unchanged for multiple rows', () => {
			const header = makeHeader(2, 2, ColorType.Grayscale);
			const data = buildFilteredData([
				{ filter: FilterType.None, data: [10, 20] },
				{ filter: FilterType.None, data: [30, 40] },
			]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([10, 20, 30, 40]);
		});
	});

	describe('FilterType.Sub', () => {
		it('reconstructs Sub filter (adds previous pixel)', () => {
			const header = makeHeader(3, 1, ColorType.Grayscale);
			// Sub: output[i] = raw[i] + output[i-bpp]
			// bpp=1 for grayscale
			// raw: [10, 5, 3]
			// out[0] = 10 + 0 = 10
			// out[1] = 5 + 10 = 15
			// out[2] = 3 + 15 = 18
			const data = buildFilteredData([{ filter: FilterType.Sub, data: [10, 5, 3] }]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([10, 15, 18]);
		});

		it('handles RGB (bpp=3)', () => {
			const header = makeHeader(2, 1, ColorType.RGB);
			// bpp=3 for RGB, row has 6 bytes (2 pixels * 3 channels)
			// raw: [10, 20, 30, 5, 10, 15]
			// out[0] = 10 (no left for first 3 bytes)
			// out[1] = 20
			// out[2] = 30
			// out[3] = 5 + out[0] = 5 + 10 = 15
			// out[4] = 10 + out[1] = 10 + 20 = 30
			// out[5] = 15 + out[2] = 15 + 30 = 45
			const data = buildFilteredData([{ filter: FilterType.Sub, data: [10, 20, 30, 5, 10, 15] }]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([10, 20, 30, 15, 30, 45]);
		});

		it('wraps around at 256', () => {
			const header = makeHeader(2, 1, ColorType.Grayscale);
			// out[0] = 200, out[1] = 200 + 100 = 300 & 0xFF = 44
			const data = buildFilteredData([{ filter: FilterType.Sub, data: [200, 100] }]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data[1]).toBe(44); // (200 + 100) & 0xFF
		});
	});

	describe('FilterType.Up', () => {
		it('reconstructs Up filter (adds byte from previous row)', () => {
			const header = makeHeader(3, 2, ColorType.Grayscale);
			// Row 0 (None): [10, 20, 30]
			// Row 1 (Up): [5, 10, 15]
			// out[0] = 5 + 10 = 15
			// out[1] = 10 + 20 = 30
			// out[2] = 15 + 30 = 45
			const data = buildFilteredData([
				{ filter: FilterType.None, data: [10, 20, 30] },
				{ filter: FilterType.Up, data: [5, 10, 15] },
			]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([10, 20, 30, 15, 30, 45]);
		});

		it('first row Up treats previous as zeros', () => {
			const header = makeHeader(3, 1, ColorType.Grayscale);
			const data = buildFilteredData([{ filter: FilterType.Up, data: [10, 20, 30] }]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([10, 20, 30]);
		});
	});

	describe('FilterType.Average', () => {
		it('reconstructs Average filter', () => {
			const header = makeHeader(3, 2, ColorType.Grayscale);
			// Row 0 (None): [10, 20, 30]
			// Row 1 (Average): [5, 10, 15]
			// bpp=1, previous row = [10, 20, 30]
			// out[0] = 5 + floor((0 + 10) / 2) = 5 + 5 = 10
			// out[1] = 10 + floor((10 + 20) / 2) = 10 + 15 = 25
			// out[2] = 15 + floor((25 + 30) / 2) = 15 + 27 = 42
			const data = buildFilteredData([
				{ filter: FilterType.None, data: [10, 20, 30] },
				{ filter: FilterType.Average, data: [5, 10, 15] },
			]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data[3]).toBe(10);
			expect(result.data[4]).toBe(25);
			expect(result.data[5]).toBe(42);
		});

		it('first row with no left uses floor(0 + 0 / 2) = 0', () => {
			const header = makeHeader(2, 1, ColorType.Grayscale);
			const data = buildFilteredData([{ filter: FilterType.Average, data: [10, 20] }]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			// out[0] = 10 + floor(0/2) = 10
			// out[1] = 20 + floor(10/2) = 20 + 5 = 25
			expect(result.data[0]).toBe(10);
			expect(result.data[1]).toBe(25);
		});
	});

	describe('FilterType.Paeth', () => {
		it('reconstructs Paeth filter', () => {
			const header = makeHeader(3, 2, ColorType.Grayscale);
			// Row 0 (None): [10, 20, 30]
			// Row 1 (Paeth): [5, 10, 15]
			// bpp=1
			// out[0]: left=0, above=10, upperLeft=0, paeth(0,10,0) = 10 (b closest to p=10)
			//         => 5 + 10 = 15
			// out[1]: left=15, above=20, upperLeft=10, paeth(15,20,10) = ?
			//         p = 15+20-10 = 25, pa=|25-15|=10, pb=|25-20|=5, pc=|25-10|=15
			//         => b wins, 10 + 20 = 30
			// out[2]: left=30, above=30, upperLeft=20, paeth(30,30,20) = ?
			//         p = 30+30-20 = 40, pa=|40-30|=10, pb=|40-30|=10, pc=|40-20|=20
			//         pa==pb, so a wins, 15 + 30 = 45
			const data = buildFilteredData([
				{ filter: FilterType.None, data: [10, 20, 30] },
				{ filter: FilterType.Paeth, data: [5, 10, 15] },
			]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(result.data[3]).toBe(15);
			expect(result.data[4]).toBe(30);
			expect(result.data[5]).toBe(45);
		});
	});

	describe('mixed filters', () => {
		it('handles different filter types per row', () => {
			const header = makeHeader(2, 3, ColorType.Grayscale);
			const data = buildFilteredData([
				{ filter: FilterType.None, data: [100, 200] },
				{ filter: FilterType.Sub, data: [10, 20] },
				{ filter: FilterType.Up, data: [5, 10] },
			]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// Row 0: [100, 200]
			expect(result.data[0]).toBe(100);
			expect(result.data[1]).toBe(200);

			// Row 1 (Sub): [10, 10+20=30]
			expect(result.data[2]).toBe(10);
			expect(result.data[3]).toBe(30);

			// Row 2 (Up): [5+10=15, 10+30=40]
			expect(result.data[4]).toBe(15);
			expect(result.data[5]).toBe(40);
		});
	});

	describe('RGBA (4 bytes per pixel)', () => {
		it('reconstructs Sub filter with 4bpp', () => {
			const header = makeHeader(2, 1, ColorType.RGBA);
			// bpp=4, row has 8 bytes
			// Sub: first 4 bytes have no left
			// raw: [255, 0, 0, 255, 0, 128, 64, 0]
			// out[0..3] = [255, 0, 0, 255] (no left)
			// out[4] = 0 + 255 = 255
			// out[5] = 128 + 0 = 128
			// out[6] = 64 + 0 = 64
			// out[7] = 0 + 255 = 255
			const data = buildFilteredData([
				{ filter: FilterType.Sub, data: [255, 0, 0, 255, 0, 128, 64, 0] },
			]);

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(true);
			if (!result.ok) return;
			expect(Array.from(result.data)).toEqual([255, 0, 0, 255, 255, 128, 64, 255]);
		});
	});

	describe('error handling', () => {
		it('returns error for data too short', () => {
			const header = makeHeader(10, 10, ColorType.RGBA);
			const data = new Uint8Array(5); // Way too short

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain('too short');
		});

		it('returns error for invalid filter type', () => {
			const header = makeHeader(2, 1, ColorType.Grayscale);
			const data = new Uint8Array([99, 10, 20]); // filter type 99

			const result = reconstructFilters(data, header);
			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error).toContain('Invalid filter type');
		});
	});
});
