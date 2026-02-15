import { describe, expect, it } from 'vitest';
import { createPixelFramebuffer, setPixel } from '../rasterizer/pixelBuffer';
import { createHalfBlockBackend } from './halfblock';

const RED = { r: 255, g: 0, b: 0, a: 255 };
const BLUE = { r: 0, g: 0, b: 255, a: 255 };
const WHITE = { r: 255, g: 255, b: 255, a: 255 };

describe('Half-block backend', () => {
	describe('createHalfBlockBackend', () => {
		it('has correct type and capabilities', () => {
			const backend = createHalfBlockBackend();
			expect(backend.type).toBe('halfblock');
			expect(backend.capabilities.pixelsPerCellX).toBe(1);
			expect(backend.capabilities.pixelsPerCellY).toBe(2);
			expect(backend.capabilities.requiresEscapeSequences).toBe(false);
		});
	});

	describe('getPixelDimensions', () => {
		it('returns 1x width and 2x height', () => {
			const backend = createHalfBlockBackend();
			const dims = backend.getPixelDimensions(80, 24);
			expect(dims.width).toBe(80);
			expect(dims.height).toBe(48);
		});
	});

	describe('encode', () => {
		it('produces space for empty buffer', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			const output = backend.encode(fb, 0, 0);

			expect(output.cells).toHaveLength(1);
			expect(output.cells?.[0]?.char).toBe(' ');
		});

		it('produces correct number of cells', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 4, height: 6 });
			const output = backend.encode(fb, 0, 0);

			// 4 cols, 6/2 = 3 rows = 12 cells
			expect(output.cells).toHaveLength(12);
		});

		it('both pixels same color: full block', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			setPixel(fb, 0, 0, RED);
			setPixel(fb, 0, 1, RED);
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u2588');
			expect(output.cells?.[0]?.fg).toBe(0xff0000);
		});

		it('top red bottom blue: upper half block', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			setPixel(fb, 0, 0, RED);
			setPixel(fb, 0, 1, BLUE);
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u2580');
			expect(output.cells?.[0]?.fg).toBe(0xff0000);
			expect(output.cells?.[0]?.bg).toBe(0x0000ff);
		});

		it('top only: upper half block with bg background', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			setPixel(fb, 0, 0, WHITE);
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.char).toBe('\u2580');
			expect(output.cells?.[0]?.fg).toBe(0xffffff);
			expect(output.cells?.[0]?.bg).toBe(0x000000);
		});

		it('bottom only: upper half block with bg in fg', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			setPixel(fb, 0, 1, WHITE);
			const output = backend.encode(fb, 0, 0);

			// top = bg (0x000000), bottom = white
			// Uses upper half block: fg = top(bg), bg = bottom(white)
			expect(output.cells?.[0]?.char).toBe('\u2580');
			expect(output.cells?.[0]?.fg).toBe(0x000000);
			expect(output.cells?.[0]?.bg).toBe(0xffffff);
		});

		it('applies screen offset', () => {
			const backend = createHalfBlockBackend();
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			const output = backend.encode(fb, 3, 7);

			expect(output.cells?.[0]?.x).toBe(3);
			expect(output.cells?.[0]?.y).toBe(7);
		});

		it('uses configured background color', () => {
			const backend = createHalfBlockBackend({ backgroundColor: 0x333333 });
			const fb = createPixelFramebuffer({ width: 1, height: 2 });
			const output = backend.encode(fb, 0, 0);

			expect(output.cells?.[0]?.bg).toBe(0x333333);
		});
	});
});
