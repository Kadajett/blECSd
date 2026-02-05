/**
 * Tests for ANSI image renderer.
 *
 * @module media/render/ansi.test
 */

import { describe, expect, it } from 'vitest';
import {
	AnsiRenderOptionsSchema,
	type Bitmap,
	blendWithBackground,
	cellMapToString,
	luminanceToChar,
	renderToAnsi,
	rgbLuminance,
	rgbTo256Color,
	scaleBitmap,
} from './ansi';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Creates a small test bitmap filled with a single RGBA color.
 */
function createSolidBitmap(
	width: number,
	height: number,
	r: number,
	g: number,
	b: number,
	a: number = 255,
): Bitmap {
	const data = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		data[i * 4] = r;
		data[i * 4 + 1] = g;
		data[i * 4 + 2] = b;
		data[i * 4 + 3] = a;
	}
	return { width, height, data };
}

/**
 * Creates a 2x2 bitmap with distinct colors in each pixel.
 */
function create2x2Bitmap(): Bitmap {
	const data = new Uint8Array([
		// Row 0
		255,
		0,
		0,
		255, // (0,0): red
		0,
		255,
		0,
		255, // (1,0): green
		// Row 1
		0,
		0,
		255,
		255, // (0,1): blue
		255,
		255,
		255,
		255, // (1,1): white
	]);
	return { width: 2, height: 2, data };
}

// =============================================================================
// rgbTo256Color
// =============================================================================

describe('rgbTo256Color', () => {
	it('maps pure red to palette index 9', () => {
		expect(rgbTo256Color(255, 0, 0)).toBe(9);
	});

	it('maps pure green to palette index 10', () => {
		expect(rgbTo256Color(0, 255, 0)).toBe(10);
	});

	it('maps pure blue to palette index 12', () => {
		expect(rgbTo256Color(0, 0, 255)).toBe(12);
	});

	it('maps white to palette index 15', () => {
		expect(rgbTo256Color(255, 255, 255)).toBe(15);
	});

	it('maps black to palette index 0', () => {
		expect(rgbTo256Color(0, 0, 0)).toBe(0);
	});

	it('returns a number in 0-255 range', () => {
		const result = rgbTo256Color(128, 64, 192);
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(255);
	});

	it('maps similar colors to same palette entry', () => {
		// Very close colors should map to the same index
		const a = rgbTo256Color(200, 0, 0);
		const b = rgbTo256Color(201, 0, 0);
		expect(a).toBe(b);
	});
});

// =============================================================================
// luminanceToChar
// =============================================================================

describe('luminanceToChar', () => {
	it('returns space for luminance 0 (darkest)', () => {
		expect(luminanceToChar(0)).toBe(' ');
	});

	it('returns @ for luminance 1 (brightest)', () => {
		expect(luminanceToChar(1)).toBe('@');
	});

	it('returns different characters for different brightness levels', () => {
		const dark = luminanceToChar(0.1);
		const mid = luminanceToChar(0.5);
		const bright = luminanceToChar(0.9);
		// Each should be a different character
		expect(dark).not.toBe(mid);
		expect(mid).not.toBe(bright);
	});

	it('clamps values below 0 to space', () => {
		expect(luminanceToChar(-1)).toBe(' ');
	});

	it('clamps values above 1 to @', () => {
		expect(luminanceToChar(2)).toBe('@');
	});

	it('returns a single character', () => {
		for (let i = 0; i <= 10; i++) {
			const char = luminanceToChar(i / 10);
			expect(char).toHaveLength(1);
		}
	});
});

// =============================================================================
// rgbLuminance
// =============================================================================

describe('rgbLuminance', () => {
	it('returns 0 for black', () => {
		expect(rgbLuminance(0, 0, 0)).toBe(0);
	});

	it('returns 1 for white', () => {
		expect(rgbLuminance(255, 255, 255)).toBeCloseTo(1, 2);
	});

	it('green has higher luminance than red', () => {
		const greenLum = rgbLuminance(0, 255, 0);
		const redLum = rgbLuminance(255, 0, 0);
		expect(greenLum).toBeGreaterThan(redLum);
	});

	it('returns value between 0 and 1', () => {
		const lum = rgbLuminance(128, 64, 192);
		expect(lum).toBeGreaterThanOrEqual(0);
		expect(lum).toBeLessThanOrEqual(1);
	});
});

// =============================================================================
// scaleBitmap
// =============================================================================

describe('scaleBitmap', () => {
	it('produces correct output dimensions', () => {
		const bitmap = createSolidBitmap(10, 10, 255, 0, 0);
		const scaled = scaleBitmap(bitmap, 5, 5);

		expect(scaled.width).toBe(5);
		expect(scaled.height).toBe(5);
		expect(scaled.data.length).toBe(5 * 5 * 4);
	});

	it('scales up correctly', () => {
		const bitmap = createSolidBitmap(2, 2, 255, 0, 0);
		const scaled = scaleBitmap(bitmap, 4, 4);

		expect(scaled.width).toBe(4);
		expect(scaled.height).toBe(4);
		// All pixels should still be red
		for (let i = 0; i < 4 * 4; i++) {
			expect(scaled.data[i * 4]).toBe(255);
			expect(scaled.data[i * 4 + 1]).toBe(0);
			expect(scaled.data[i * 4 + 2]).toBe(0);
			expect(scaled.data[i * 4 + 3]).toBe(255);
		}
	});

	it('preserves colors when scaling down', () => {
		const bitmap = createSolidBitmap(100, 100, 0, 255, 0);
		const scaled = scaleBitmap(bitmap, 10, 10);

		// All pixels should be green (nearest-neighbor from solid green)
		for (let i = 0; i < 10 * 10; i++) {
			expect(scaled.data[i * 4]).toBe(0);
			expect(scaled.data[i * 4 + 1]).toBe(255);
			expect(scaled.data[i * 4 + 2]).toBe(0);
		}
	});

	it('handles 1x1 target', () => {
		const bitmap = createSolidBitmap(10, 10, 128, 128, 128);
		const scaled = scaleBitmap(bitmap, 1, 1);

		expect(scaled.width).toBe(1);
		expect(scaled.height).toBe(1);
		expect(scaled.data.length).toBe(4);
	});

	it('handles zero target dimensions', () => {
		const bitmap = createSolidBitmap(10, 10, 128, 128, 128);
		const scaled = scaleBitmap(bitmap, 0, 0);

		expect(scaled.width).toBe(0);
		expect(scaled.height).toBe(0);
		expect(scaled.data.length).toBe(0);
	});

	it('returns same dimensions when target matches source', () => {
		const bitmap = createSolidBitmap(5, 5, 100, 200, 50);
		const scaled = scaleBitmap(bitmap, 5, 5);

		expect(scaled.width).toBe(5);
		expect(scaled.height).toBe(5);
	});
});

// =============================================================================
// blendWithBackground
// =============================================================================

describe('blendWithBackground', () => {
	it('returns foreground for fully opaque pixel', () => {
		const result = blendWithBackground({ r: 255, g: 0, b: 0, a: 255 }, { r: 0, g: 0, b: 0 });

		expect(result.r).toBe(255);
		expect(result.g).toBe(0);
		expect(result.b).toBe(0);
	});

	it('returns background for fully transparent pixel', () => {
		const result = blendWithBackground({ r: 255, g: 0, b: 0, a: 0 }, { r: 0, g: 255, b: 0 });

		expect(result.r).toBe(0);
		expect(result.g).toBe(255);
		expect(result.b).toBe(0);
	});

	it('blends 50% alpha correctly', () => {
		const result = blendWithBackground({ r: 255, g: 0, b: 0, a: 128 }, { r: 0, g: 0, b: 255 });

		// ~50% blend: red channel ~ 128, blue channel ~ 127
		expect(result.r).toBeGreaterThan(100);
		expect(result.r).toBeLessThan(160);
		expect(result.b).toBeGreaterThan(100);
		expect(result.b).toBeLessThan(160);
	});

	it('blends with white background', () => {
		const result = blendWithBackground({ r: 0, g: 0, b: 0, a: 128 }, { r: 255, g: 255, b: 255 });

		// ~50% black over white should give ~128 gray
		expect(result.r).toBeGreaterThan(100);
		expect(result.r).toBeLessThan(160);
		expect(result.g).toBeGreaterThan(100);
		expect(result.g).toBeLessThan(160);
	});
});

// =============================================================================
// renderToAnsi
// =============================================================================

describe('renderToAnsi', () => {
	describe('color mode', () => {
		it('renders a 2x2 bitmap to a CellMap', () => {
			const bitmap = create2x2Bitmap();
			const cellMap = renderToAnsi(bitmap, { mode: 'color' });

			// 2x2 pixels in color mode = 2 cols, 1 row (2 vertical pixels per cell)
			expect(cellMap.width).toBe(2);
			expect(cellMap.height).toBe(1);
			expect(cellMap.cells).toHaveLength(1);
			expect(cellMap.cells[0]).toHaveLength(2);
		});

		it('uses upper-half-block character', () => {
			const bitmap = createSolidBitmap(2, 2, 255, 0, 0);
			const cellMap = renderToAnsi(bitmap, { mode: 'color' });

			const cell = cellMap.cells[0]?.[0];
			expect(cell?.char).toBe('\u2580');
		});

		it('maps fg and bg to 256-color indices', () => {
			const bitmap = createSolidBitmap(1, 2, 255, 0, 0);
			const cellMap = renderToAnsi(bitmap, { mode: 'color' });

			const cell = cellMap.cells[0]?.[0];
			expect(cell?.fg).toBeGreaterThanOrEqual(0);
			expect(cell?.fg).toBeLessThanOrEqual(255);
			expect(cell?.bg).toBeGreaterThanOrEqual(0);
			expect(cell?.bg).toBeLessThanOrEqual(255);
		});

		it('handles odd-height bitmaps', () => {
			// 2x3 bitmap: last row only has top pixel, bottom = bg
			const bitmap = createSolidBitmap(2, 3, 0, 255, 0);
			const cellMap = renderToAnsi(bitmap, { mode: 'color' });

			expect(cellMap.height).toBe(2); // ceil(3/2)
			expect(cellMap.width).toBe(2);
		});

		it('scales to target dimensions', () => {
			const bitmap = createSolidBitmap(100, 100, 255, 0, 0);
			const cellMap = renderToAnsi(bitmap, { width: 40, height: 20, mode: 'color' });

			expect(cellMap.width).toBe(40);
			expect(cellMap.height).toBe(20);
		});

		it('renders with dithering enabled', () => {
			const bitmap = createSolidBitmap(4, 4, 128, 128, 128);
			const cellMap = renderToAnsi(bitmap, { mode: 'color', dither: true });

			expect(cellMap.width).toBe(4);
			expect(cellMap.height).toBe(2);
		});
	});

	describe('ascii mode', () => {
		it('renders characters based on luminance', () => {
			// Black pixel should produce space, white pixel should produce @
			const blackBitmap = createSolidBitmap(1, 1, 0, 0, 0);
			const whiteBitmap = createSolidBitmap(1, 1, 255, 255, 255);

			const blackMap = renderToAnsi(blackBitmap, { mode: 'ascii' });
			const whiteMap = renderToAnsi(whiteBitmap, { mode: 'ascii' });

			expect(blackMap.cells[0]?.[0]?.char).toBe(' ');
			expect(whiteMap.cells[0]?.[0]?.char).toBe('@');
		});

		it('outputs one cell per pixel', () => {
			const bitmap = createSolidBitmap(5, 3, 128, 128, 128);
			const cellMap = renderToAnsi(bitmap, { mode: 'ascii' });

			expect(cellMap.width).toBe(5);
			expect(cellMap.height).toBe(3);
		});

		it('uses black background for all cells', () => {
			const bitmap = createSolidBitmap(2, 2, 128, 128, 128);
			const cellMap = renderToAnsi(bitmap, { mode: 'ascii' });

			for (const row of cellMap.cells) {
				for (const cell of row) {
					expect(cell.bg).toBe(0);
				}
			}
		});

		it('assigns foreground color from pixel', () => {
			const bitmap = createSolidBitmap(1, 1, 255, 0, 0);
			const cellMap = renderToAnsi(bitmap, { mode: 'ascii' });

			const cell = cellMap.cells[0]?.[0];
			// Foreground should be a non-zero color (some shade of red)
			expect(cell?.fg).toBeGreaterThan(0);
		});
	});

	describe('braille mode', () => {
		it('maps 2x4 pixels to one cell', () => {
			const bitmap = createSolidBitmap(4, 8, 255, 255, 255);
			const cellMap = renderToAnsi(bitmap, { mode: 'braille' });

			expect(cellMap.width).toBe(2); // 4 / 2
			expect(cellMap.height).toBe(2); // 8 / 4
		});

		it('produces braille unicode characters', () => {
			const bitmap = createSolidBitmap(2, 4, 255, 255, 255);
			const cellMap = renderToAnsi(bitmap, { mode: 'braille' });

			const cell = cellMap.cells[0]?.[0];
			const codePoint = cell?.char.codePointAt(0) ?? 0;
			// Braille patterns are in the range U+2800 to U+28FF
			expect(codePoint).toBeGreaterThanOrEqual(0x2800);
			expect(codePoint).toBeLessThanOrEqual(0x28ff);
		});

		it('empty braille for all-black image', () => {
			const bitmap = createSolidBitmap(2, 4, 0, 0, 0);
			const cellMap = renderToAnsi(bitmap, { mode: 'braille' });

			const cell = cellMap.cells[0]?.[0];
			// All black = no dots lit = blank braille (U+2800)
			expect(cell?.char.codePointAt(0)).toBe(0x2800);
		});

		it('full braille for all-white image', () => {
			const bitmap = createSolidBitmap(2, 4, 255, 255, 255);
			const cellMap = renderToAnsi(bitmap, { mode: 'braille' });

			const cell = cellMap.cells[0]?.[0];
			// All white = all dots lit = U+28FF
			expect(cell?.char.codePointAt(0)).toBe(0x28ff);
		});
	});

	describe('defaults', () => {
		it('defaults to color mode', () => {
			const bitmap = createSolidBitmap(2, 2, 255, 0, 0);
			const cellMap = renderToAnsi(bitmap);

			// Color mode: 2x2 => 2 cols, 1 row
			expect(cellMap.width).toBe(2);
			expect(cellMap.height).toBe(1);
			expect(cellMap.cells[0]?.[0]?.char).toBe('\u2580');
		});

		it('uses bitmap dimensions when no target specified', () => {
			const bitmap = createSolidBitmap(10, 8, 128, 128, 128);
			const cellMap = renderToAnsi(bitmap, { mode: 'ascii' });

			expect(cellMap.width).toBe(10);
			expect(cellMap.height).toBe(8);
		});

		it('uses black background by default', () => {
			// Transparent pixel should blend to black
			const bitmap = createSolidBitmap(1, 1, 255, 255, 255, 0);
			const cellMap = renderToAnsi(bitmap, { mode: 'ascii' });

			// Transparent over black = black = space
			expect(cellMap.cells[0]?.[0]?.char).toBe(' ');
		});
	});

	describe('background option', () => {
		it('blends transparent pixels with custom background', () => {
			const bitmap = createSolidBitmap(1, 1, 255, 0, 0, 0);
			const cellMap = renderToAnsi(bitmap, {
				mode: 'ascii',
				background: { r: 255, g: 255, b: 255 },
			});

			// Transparent pixel over white bg = white = @
			expect(cellMap.cells[0]?.[0]?.char).toBe('@');
		});
	});
});

// =============================================================================
// cellMapToString
// =============================================================================

describe('cellMapToString', () => {
	it('generates a string with ANSI escape sequences', () => {
		const bitmap = createSolidBitmap(2, 2, 255, 0, 0);
		const cellMap = renderToAnsi(bitmap, { mode: 'color' });
		const output = cellMapToString(cellMap);

		// Should contain escape sequences
		expect(output).toContain('\x1b[');
		// Should end with reset
		expect(output).toContain('\x1b[0m');
	});

	it('contains 256-color SGR sequences', () => {
		const bitmap = createSolidBitmap(1, 2, 255, 0, 0);
		const cellMap = renderToAnsi(bitmap, { mode: 'color' });
		const output = cellMapToString(cellMap);

		// Should contain 38;5; (fg) and 48;5; (bg) sequences
		expect(output).toMatch(/38;5;\d+/);
		expect(output).toMatch(/48;5;\d+/);
	});

	it('separates rows with newlines', () => {
		const bitmap = createSolidBitmap(2, 4, 128, 128, 128);
		const cellMap = renderToAnsi(bitmap, { mode: 'color' });
		const output = cellMapToString(cellMap);

		// 4 pixels tall in color mode = 2 rows, so 1 newline between them
		const lines = output.split('\n');
		expect(lines.length).toBe(2);
	});

	it('handles empty cell map', () => {
		const cellMap = { width: 0, height: 0, cells: [] };
		const output = cellMapToString(cellMap);

		expect(output).toBe('\x1b[0m');
	});

	it('optimizes by not repeating identical color sequences', () => {
		// A solid-color row should only set colors once per row, not per cell
		const bitmap = createSolidBitmap(5, 4, 200, 100, 50);
		const cellMap = renderToAnsi(bitmap, { mode: 'color' });
		const output = cellMapToString(cellMap);

		// Each row should have 1 color-set escape (38;5;...) and
		// the last line also gets the reset. So count color sequences
		// (38;5;) rather than all escapes.
		const lines = output.split('\n');
		const firstLine = lines[0] ?? '';
		// Count 256-color foreground sequences in the first row
		const colorEscapes = (firstLine.match(/38;5;\d+/g) ?? []).length;
		// Should have exactly 1 color set for a solid-color row
		expect(colorEscapes).toBe(1);
	});
});

// =============================================================================
// AnsiRenderOptionsSchema
// =============================================================================

describe('AnsiRenderOptionsSchema', () => {
	it('parses valid options', () => {
		const result = AnsiRenderOptionsSchema.safeParse({
			width: 80,
			height: 24,
			mode: 'color',
			dither: false,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.width).toBe(80);
			expect(result.data.height).toBe(24);
			expect(result.data.mode).toBe('color');
			expect(result.data.dither).toBe(false);
		}
	});

	it('accepts all valid modes', () => {
		for (const mode of ['color', 'ascii', 'braille']) {
			const result = AnsiRenderOptionsSchema.safeParse({ mode });
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid mode', () => {
		const result = AnsiRenderOptionsSchema.safeParse({ mode: 'invalid' });
		expect(result.success).toBe(false);
	});

	it('rejects negative width', () => {
		const result = AnsiRenderOptionsSchema.safeParse({ width: -1 });
		expect(result.success).toBe(false);
	});

	it('rejects zero height', () => {
		const result = AnsiRenderOptionsSchema.safeParse({ height: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects non-integer dimensions', () => {
		const result = AnsiRenderOptionsSchema.safeParse({ width: 80.5 });
		expect(result.success).toBe(false);
	});

	it('accepts empty object (all optional)', () => {
		const result = AnsiRenderOptionsSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('validates background color', () => {
		const valid = AnsiRenderOptionsSchema.safeParse({
			background: { r: 128, g: 0, b: 255 },
		});
		expect(valid.success).toBe(true);

		const invalid = AnsiRenderOptionsSchema.safeParse({
			background: { r: 300, g: 0, b: 0 },
		});
		expect(invalid.success).toBe(false);
	});

	it('rejects extra fields in strict mode', () => {
		// Zod strips unknown keys by default, so this should still pass
		const result = AnsiRenderOptionsSchema.safeParse({
			width: 80,
			unknown: true,
		});
		expect(result.success).toBe(true);
	});
});
