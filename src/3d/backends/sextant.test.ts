import { describe, expect, it } from 'vitest';
import { createPixelFramebuffer, setPixel } from '../rasterizer/pixelBuffer';
import { createSextantBackend } from './sextant';

const WHITE = { r: 255, g: 255, b: 255, a: 255 };
const RED = { r: 255, g: 0, b: 0, a: 255 };

describe('Sextant backend', () => {
	describe('createSextantBackend', () => {
		it('has correct type and capabilities', () => {
			const backend = createSextantBackend();
			expect(backend.type).toBe('sextant');
			expect(backend.capabilities.pixelsPerCellX).toBe(2);
			expect(backend.capabilities.pixelsPerCellY).toBe(3);
			expect(backend.capabilities.requiresEscapeSequences).toBe(false);
		});
	});

	describe('getPixelDimensions', () => {
		it('returns 2x width and 3x height', () => {
			const backend = createSextantBackend();
			const dims = backend.getPixelDimensions(80, 24);
			expect(dims.width).toBe(160);
			expect(dims.height).toBe(72);
		});
	});

	describe('encode', () => {
		it('produces space for empty buffer', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			const output = backend.encode(fb, 0, 0);

			expect(output.cells).toHaveLength(1);
			expect(output.cells?.[0]?.char).toBe(' ');
		});

		it('produces correct number of cells', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 6, height: 9 });
			const output = backend.encode(fb, 0, 0);

			// 6/2 = 3 cols, 9/3 = 3 rows = 9 cells
			expect(output.cells).toHaveLength(9);
		});

		it('all 6 pixels lit: full block', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			for (let y = 0; y < 3; y++) {
				for (let x = 0; x < 2; x++) {
					setPixel(fb, x, y, WHITE);
				}
			}
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u2588');
		});

		it('single pixel at position 0 (0,0): U+1FB00', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			setPixel(fb, 0, 0, WHITE);
			const output = backend.encode(fb, 0, 0);

			// pattern = bit 0 = 1, char = U+1FB00 + (1-1) = U+1FB00
			expect(output.cells?.[0]?.char).toBe('\u{1FB00}');
		});

		it('single pixel at position 1 (1,0): U+1FB01', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			setPixel(fb, 1, 0, WHITE);
			const output = backend.encode(fb, 0, 0);

			// pattern = bit 1 = 2, char = U+1FB00 + (2-1) = U+1FB01
			expect(output.cells?.[0]?.char).toBe('\u{1FB01}');
		});

		it('single pixel at position 2 (0,1): U+1FB03', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			setPixel(fb, 0, 1, WHITE);
			const output = backend.encode(fb, 0, 0);

			// pattern = bit 2 = 4, char = U+1FB00 + (4-1) = U+1FB03
			expect(output.cells?.[0]?.char).toBe('\u{1FB03}');
		});

		it('single pixel at position 4 (0,2): U+1FB0F', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			setPixel(fb, 0, 2, WHITE);
			const output = backend.encode(fb, 0, 0);

			// pattern = bit 4 = 16, char = U+1FB00 + (16-1) = U+1FB0F
			expect(output.cells?.[0]?.char).toBe('\u{1FB0F}');
		});

		it('averages color of lit pixels', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			setPixel(fb, 0, 0, RED); // 255, 0, 0
			setPixel(fb, 1, 0, WHITE); // 255, 255, 255
			const output = backend.encode(fb, 0, 0);

			const fg = output.cells?.[0]?.fg as number;
			const r = (fg >> 16) & 0xff;
			const g = (fg >> 8) & 0xff;
			const b = fg & 0xff;
			expect(r).toBe(255);
			expect(g).toBe(128);
			expect(b).toBe(128);
		});

		it('applies screen offset', () => {
			const backend = createSextantBackend();
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			const output = backend.encode(fb, 5, 10);

			expect(output.cells?.[0]?.x).toBe(5);
			expect(output.cells?.[0]?.y).toBe(10);
		});

		it('respects alpha threshold', () => {
			const backend = createSextantBackend({ threshold: 200 });
			const fb = createPixelFramebuffer({ width: 2, height: 3 });
			setPixel(fb, 0, 0, { r: 255, g: 255, b: 255, a: 100 }); // below threshold
			setPixel(fb, 1, 0, { r: 255, g: 255, b: 255, a: 255 }); // above threshold
			const output = backend.encode(fb, 0, 0);

			// Only (1,0) lit = bit 1 = 2, char = U+1FB00 + (2-1) = U+1FB01
			expect(output.cells?.[0]?.char).toBe('\u{1FB01}');
		});
	});
});
