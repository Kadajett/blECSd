import { describe, expect, it } from 'vitest';
import { blendPixel, drawLineAA } from './lineAA';
import { createPixelFramebuffer, getPixel, setPixel } from './pixelBuffer';

/**
 * Collect all non-transparent pixels from a framebuffer.
 */
function collectPixels(fb: ReturnType<typeof createPixelFramebuffer>): Array<{ x: number; y: number; a: number }> {
	const pixels: Array<{ x: number; y: number; a: number }> = [];
	for (let y = 0; y < fb.height; y++) {
		for (let x = 0; x < fb.width; x++) {
			const p = getPixel(fb, x, y);
			if (p.a > 0) {
				pixels.push({ x, y, a: p.a });
			}
		}
	}
	return pixels;
}

describe('Wu Anti-Aliased Line Drawing', () => {
	describe('blendPixel', () => {
		it('full intensity overwrites existing pixel', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });
			setPixel(fb, 5, 5, { r: 100, g: 100, b: 100, a: 255 });

			blendPixel(fb, 5, 5, 255, 0, 0, 255, 1.0);

			const p = getPixel(fb, 5, 5);
			expect(p.r).toBe(255);
			expect(p.g).toBe(0);
			expect(p.b).toBe(0);
		});

		it('half intensity blends with existing', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });
			setPixel(fb, 5, 5, { r: 0, g: 0, b: 0, a: 255 });

			blendPixel(fb, 5, 5, 255, 255, 255, 255, 0.5);

			const p = getPixel(fb, 5, 5);
			// Should be ~128 (half of 255)
			expect(p.r).toBeGreaterThan(120);
			expect(p.r).toBeLessThan(135);
		});

		it('zero intensity does nothing', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });
			setPixel(fb, 5, 5, { r: 100, g: 100, b: 100, a: 255 });

			blendPixel(fb, 5, 5, 255, 0, 0, 255, 0);

			const p = getPixel(fb, 5, 5);
			expect(p.r).toBe(100);
		});

		it('handles out-of-bounds gracefully', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });

			// Should not throw
			blendPixel(fb, -1, -1, 255, 0, 0, 255, 1.0);
			blendPixel(fb, 100, 100, 255, 0, 0, 255, 1.0);
		});
	});

	describe('drawLineAA', () => {
		it('draws a horizontal line', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10, enableDepthBuffer: false });

			drawLineAA(fb, 2, 5, 10, 5, 255, 255, 255);

			const pixels = collectPixels(fb);
			// All pixels should be on y=5 (horizontal = no AA fringe)
			const onRow = pixels.filter((p) => p.y === 5);
			expect(onRow.length).toBeGreaterThan(0);
		});

		it('draws a vertical line', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 20, enableDepthBuffer: false });

			drawLineAA(fb, 5, 2, 5, 10, 255, 255, 255);

			const pixels = collectPixels(fb);
			const onCol = pixels.filter((p) => p.x === 5);
			expect(onCol.length).toBeGreaterThan(0);
		});

		it('draws a shallow angle line with AA fringe', () => {
			const fb = createPixelFramebuffer({ width: 40, height: 20, enableDepthBuffer: false });

			drawLineAA(fb, 0, 5, 30, 8, 255, 255, 255);

			const pixels = collectPixels(fb);
			// Should have more than one pixel per column (AA fringe)
			const columnsWithMultiple = new Map<number, number>();
			for (const p of pixels) {
				columnsWithMultiple.set(p.x, (columnsWithMultiple.get(p.x) ?? 0) + 1);
			}

			// At least some columns should have 2 pixels
			const multiPixelColumns = [...columnsWithMultiple.values()].filter((c) => c >= 2);
			expect(multiPixelColumns.length).toBeGreaterThan(0);
		});

		it('white line on black background produces gray fringe pixels', () => {
			const fb = createPixelFramebuffer({ width: 40, height: 20, enableDepthBuffer: false });

			// Draw at a shallow angle to produce fringe
			drawLineAA(fb, 0, 3, 30, 10, 255, 255, 255);

			const pixels = collectPixels(fb);
			// Some fringe pixels should have alpha less than 255
			const fringePixels = pixels.filter((p) => p.a > 0 && p.a < 255);
			expect(fringePixels.length).toBeGreaterThan(0);
		});

		it('single point draws at least one pixel', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });

			drawLineAA(fb, 5, 5, 5, 5, 255, 0, 0);

			const pixels = collectPixels(fb);
			expect(pixels.length).toBeGreaterThan(0);
		});

		it('handles out-of-bounds endpoints', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });

			// Should not throw
			drawLineAA(fb, -5, -5, 15, 15, 255, 255, 255);

			const pixels = collectPixels(fb);
			// Some pixels should be drawn within bounds
			for (const p of pixels) {
				expect(p.x).toBeGreaterThanOrEqual(0);
				expect(p.x).toBeLessThan(10);
				expect(p.y).toBeGreaterThanOrEqual(0);
				expect(p.y).toBeLessThan(10);
			}
		});

		it('defaults alpha to 255', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10, enableDepthBuffer: false });

			drawLineAA(fb, 0, 5, 10, 5, 200, 100, 50);

			const p = getPixel(fb, 5, 5);
			expect(p.a).toBeGreaterThan(200);
		});
	});
});
