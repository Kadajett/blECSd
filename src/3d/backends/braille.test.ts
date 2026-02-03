import { describe, expect, it } from 'vitest';
import { createPixelFramebuffer, setPixel } from '../rasterizer/pixelBuffer';
import { BrailleConfigSchema } from '../schemas/backends';
import { createBrailleBackend } from './braille';

const WHITE = { r: 255, g: 255, b: 255, a: 255 };
const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };

describe('Braille backend', () => {
	describe('createBrailleBackend', () => {
		it('has correct type and capabilities', () => {
			const backend = createBrailleBackend();
			expect(backend.type).toBe('braille');
			expect(backend.capabilities.maxColors).toBe(2);
			expect(backend.capabilities.pixelsPerCellX).toBe(2);
			expect(backend.capabilities.pixelsPerCellY).toBe(4);
			expect(backend.capabilities.requiresEscapeSequences).toBe(false);
		});
	});

	describe('getPixelDimensions', () => {
		it('returns 2x width and 4x height', () => {
			const backend = createBrailleBackend();
			const dims = backend.getPixelDimensions(80, 24);
			expect(dims.width).toBe(160);
			expect(dims.height).toBe(96);
		});

		it('handles small dimensions', () => {
			const backend = createBrailleBackend();
			const dims = backend.getPixelDimensions(1, 1);
			expect(dims.width).toBe(2);
			expect(dims.height).toBe(4);
		});
	});

	describe('encode', () => {
		it('produces blank braille for empty buffer', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			const output = backend.encode(fb, 0, 0);

			expect(output.cells).toHaveLength(1);
			expect(output.cells?.[0]?.char).toBe('\u2800'); // blank braille
		});

		it('produces correct number of cells', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 6, height: 8 });
			const output = backend.encode(fb, 0, 0);

			// 6/2 = 3 cols, 8/4 = 2 rows = 6 cells
			expect(output.cells).toHaveLength(6);
		});

		it('single pixel at (0,0) produces dot 1 (U+2801)', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			setPixel(fb, 0, 0, WHITE);
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u2801');
		});

		it('single pixel at (1,0) produces dot 4 (U+2808)', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			setPixel(fb, 1, 0, WHITE);
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u2808');
		});

		it('all 8 pixels lit produces U+28FF', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			for (let y = 0; y < 4; y++) {
				for (let x = 0; x < 2; x++) {
					setPixel(fb, x, y, WHITE);
				}
			}
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u28FF');
		});

		it('top-left 2x2 lit produces dots 0,1,3,4 (U+281B)', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			// (0,0) = dot 0 = 0x01, (1,0) = dot 3 = 0x08
			// (0,1) = dot 1 = 0x02, (1,1) = dot 4 = 0x10
			// 0x01 | 0x08 | 0x02 | 0x10 = 0x1B
			setPixel(fb, 0, 0, WHITE);
			setPixel(fb, 1, 0, WHITE);
			setPixel(fb, 0, 1, WHITE);
			setPixel(fb, 1, 1, WHITE);
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u281B');
		});

		it('averages color of lit pixels', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			setPixel(fb, 0, 0, RED);   // 255, 0, 0
			setPixel(fb, 1, 0, BLUE);  // 0, 0, 255
			const output = backend.encode(fb, 0, 0);

			const fg = output.cells?.[0]?.fg as number;
			const r = (fg >> 16) & 0xff;
			const g = (fg >> 8) & 0xff;
			const b = fg & 0xff;
			// Average of (255,0,0) and (0,0,255) = (128,0,128)
			expect(r).toBe(128);
			expect(g).toBe(0);
			expect(b).toBe(128);
		});

		it('applies screen offset to cell coordinates', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			const output = backend.encode(fb, 5, 10);

			expect(output.cells?.[0]?.x).toBe(5);
			expect(output.cells?.[0]?.y).toBe(10);
		});

		it('uses configured background color', () => {
			const backend = createBrailleBackend({ backgroundColor: 0x112233 });
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.bg).toBe(0x112233);
		});

		it('respects alpha threshold', () => {
			const backend = createBrailleBackend({ threshold: 200 });
			const fb = createPixelFramebuffer({ width: 2, height: 4 });
			// Set pixel with alpha below threshold
			setPixel(fb, 0, 0, { r: 255, g: 255, b: 255, a: 100 });
			// Set pixel with alpha above threshold
			setPixel(fb, 1, 0, { r: 255, g: 255, b: 255, a: 255 });
			const output = backend.encode(fb, 0, 0);

			// Only (1,0) is lit = dot 3 = 0x08 = U+2808
			expect(output.cells?.[0]?.char).toBe('\u2808');
		});

		it('braille chars are always in valid range', () => {
			const backend = createBrailleBackend();
			const fb = createPixelFramebuffer({ width: 10, height: 8 });
			// Random pixels
			setPixel(fb, 3, 2, WHITE);
			setPixel(fb, 7, 5, RED);
			const output = backend.encode(fb, 0, 0);

			for (const cell of output.cells ?? []) {
				const code = cell.char.charCodeAt(0);
				expect(code).toBeGreaterThanOrEqual(0x2800);
				expect(code).toBeLessThanOrEqual(0x28FF);
			}
		});
	});

	describe('BrailleConfigSchema', () => {
		it('applies defaults', () => {
			const result = BrailleConfigSchema.parse({});
			expect(result.threshold).toBe(128);
			expect(result.colorMode).toBe('average');
			expect(result.backgroundColor).toBe(0);
		});

		it('rejects threshold > 255', () => {
			expect(() => BrailleConfigSchema.parse({ threshold: 256 })).toThrow();
		});

		it('rejects threshold < 0', () => {
			expect(() => BrailleConfigSchema.parse({ threshold: -1 })).toThrow();
		});

		it('rejects invalid colorMode', () => {
			expect(() => BrailleConfigSchema.parse({ colorMode: 'invalid' })).toThrow();
		});
	});
});
