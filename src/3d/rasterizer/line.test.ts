import { describe, expect, it } from 'vitest';
import { drawLine, drawLineColor, drawLineDepth } from './line';
import { createPixelFramebuffer, getDepth, getPixel } from './pixelBuffer';

/**
 * Collect all non-transparent pixels from a framebuffer.
 */
function collectPixels(fb: ReturnType<typeof createPixelFramebuffer>): Array<{ x: number; y: number }> {
	const pixels: Array<{ x: number; y: number }> = [];
	for (let y = 0; y < fb.height; y++) {
		for (let x = 0; x < fb.width; x++) {
			const p = getPixel(fb, x, y);
			if (p.a > 0) {
				pixels.push({ x, y });
			}
		}
	}
	return pixels;
}

describe('Line drawing', () => {
	describe('drawLine', () => {
		it('draws a horizontal line', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10 });

			drawLine(fb, 2, 5, 8, 5, 255, 255, 255);

			const pixels = collectPixels(fb);
			// All pixels should be on y=5
			for (const p of pixels) {
				expect(p.y).toBe(5);
			}
			// Should span from x=2 to x=8
			const xs = pixels.map((p) => p.x).sort((a, b) => a - b);
			expect(xs[0]).toBe(2);
			expect(xs[xs.length - 1]).toBe(8);
			expect(xs.length).toBe(7); // 2,3,4,5,6,7,8
		});

		it('draws a vertical line', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 20 });

			drawLine(fb, 5, 2, 5, 8, 255, 255, 255);

			const pixels = collectPixels(fb);
			for (const p of pixels) {
				expect(p.x).toBe(5);
			}
			const ys = pixels.map((p) => p.y).sort((a, b) => a - b);
			expect(ys[0]).toBe(2);
			expect(ys[ys.length - 1]).toBe(8);
			expect(ys.length).toBe(7);
		});

		it('draws a diagonal line from (0,0) to (3,3)', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			drawLine(fb, 0, 0, 3, 3, 255, 255, 255);

			const pixels = collectPixels(fb);
			expect(pixels).toContainEqual({ x: 0, y: 0 });
			expect(pixels).toContainEqual({ x: 1, y: 1 });
			expect(pixels).toContainEqual({ x: 2, y: 2 });
			expect(pixels).toContainEqual({ x: 3, y: 3 });
			expect(pixels.length).toBe(4);
		});

		it('draws a single point when start equals end', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			drawLine(fb, 5, 5, 5, 5, 255, 0, 0);

			const pixels = collectPixels(fb);
			expect(pixels.length).toBe(1);
			expect(pixels[0]).toEqual({ x: 5, y: 5 });

			const color = getPixel(fb, 5, 5);
			expect(color.r).toBe(255);
			expect(color.g).toBe(0);
			expect(color.b).toBe(0);
		});

		it('is symmetric (same pixels regardless of direction)', () => {
			const fb1 = createPixelFramebuffer({ width: 20, height: 20 });
			const fb2 = createPixelFramebuffer({ width: 20, height: 20 });

			drawLine(fb1, 2, 3, 15, 11, 255, 255, 255);
			drawLine(fb2, 15, 11, 2, 3, 255, 255, 255);

			const pixels1 = collectPixels(fb1).sort((a, b) => a.x - b.x || a.y - b.y);
			const pixels2 = collectPixels(fb2).sort((a, b) => a.x - b.x || a.y - b.y);

			expect(pixels1.length).toBe(pixels2.length);
			for (let i = 0; i < pixels1.length; i++) {
				expect(pixels1[i]).toEqual(pixels2[i]);
			}
		});

		it('handles out-of-bounds endpoints without crashing', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			// Should not throw
			drawLine(fb, -5, -5, 15, 15, 255, 255, 255);

			// Some pixels should be drawn within bounds
			const pixels = collectPixels(fb);
			expect(pixels.length).toBeGreaterThan(0);
			for (const p of pixels) {
				expect(p.x).toBeGreaterThanOrEqual(0);
				expect(p.x).toBeLessThan(10);
				expect(p.y).toBeGreaterThanOrEqual(0);
				expect(p.y).toBeLessThan(10);
			}
		});

		it('handles fully out-of-bounds line without crashing', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			drawLine(fb, -10, -10, -5, -5, 255, 255, 255);

			const pixels = collectPixels(fb);
			expect(pixels.length).toBe(0);
		});

		it('uses the specified color', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			drawLine(fb, 0, 0, 5, 0, 100, 150, 200, 128);

			const color = getPixel(fb, 3, 0);
			expect(color.r).toBe(100);
			expect(color.g).toBe(150);
			expect(color.b).toBe(200);
			expect(color.a).toBe(128);
		});

		it('defaults alpha to 255', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			drawLine(fb, 0, 0, 5, 0, 100, 150, 200);

			const color = getPixel(fb, 3, 0);
			expect(color.a).toBe(255);
		});
	});

	describe('drawLineDepth', () => {
		it('draws line with depth interpolation', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10 });

			drawLineDepth(fb, { x: 0, y: 5, depth: 0.25, r: 255, g: 0, b: 0 }, { x: 10, y: 5, depth: 0.75, r: 255, g: 0, b: 0 });

			// Start should be near 0.25
			expect(getDepth(fb, 0, 5)).toBeCloseTo(0.25, 1);
			// End should be near 0.75
			expect(getDepth(fb, 10, 5)).toBeCloseTo(0.75, 1);
			// Middle should be near 0.5
			expect(getDepth(fb, 5, 5)).toBeCloseTo(0.5, 1);
		});

		it('closer line overwrites farther line', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10 });

			// Draw a far line (depth 0.8)
			drawLineDepth(fb, { x: 0, y: 5, depth: 0.8, r: 255, g: 0, b: 0 }, { x: 10, y: 5, depth: 0.8, r: 255, g: 0, b: 0 });

			// Draw a closer line (depth 0.2)
			drawLineDepth(fb, { x: 0, y: 5, depth: 0.2, r: 0, g: 255, b: 0 }, { x: 10, y: 5, depth: 0.2, r: 0, g: 255, b: 0 });

			// Should show the green (closer) line
			const color = getPixel(fb, 5, 5);
			expect(color.r).toBe(0);
			expect(color.g).toBe(255);
		});

		it('farther line does not overwrite closer line', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10 });

			// Draw a close line (depth 0.2)
			drawLineDepth(fb, { x: 0, y: 5, depth: 0.2, r: 255, g: 0, b: 0 }, { x: 10, y: 5, depth: 0.2, r: 255, g: 0, b: 0 });

			// Draw a farther line (depth 0.8)
			drawLineDepth(fb, { x: 0, y: 5, depth: 0.8, r: 0, g: 255, b: 0 }, { x: 10, y: 5, depth: 0.8, r: 0, g: 255, b: 0 });

			// Should still show the red (closer) line
			const color = getPixel(fb, 5, 5);
			expect(color.r).toBe(255);
			expect(color.g).toBe(0);
		});
	});

	describe('drawLineColor', () => {
		it('interpolates color between endpoints', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10, enableDepthBuffer: false });

			drawLineColor(
				fb,
				{ x: 0, y: 5, r: 255, g: 0, b: 0 },
				{ x: 10, y: 5, r: 0, g: 0, b: 255 },
			);

			// Start should be red
			const start = getPixel(fb, 0, 5);
			expect(start.r).toBe(255);
			expect(start.b).toBe(0);

			// End should be blue
			const end = getPixel(fb, 10, 5);
			expect(end.r).toBe(0);
			expect(end.b).toBe(255);

			// Middle should be approximately purple
			const mid = getPixel(fb, 5, 5);
			expect(mid.r).toBeGreaterThan(100);
			expect(mid.r).toBeLessThan(160);
			expect(mid.b).toBeGreaterThan(100);
			expect(mid.b).toBeLessThan(160);
		});

		it('draws single point with start color', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });

			drawLineColor(
				fb,
				{ x: 5, y: 5, r: 100, g: 200, b: 50 },
				{ x: 5, y: 5, r: 0, g: 0, b: 255 },
			);

			const color = getPixel(fb, 5, 5);
			expect(color.r).toBe(100);
			expect(color.g).toBe(200);
			expect(color.b).toBe(50);
		});

		it('draws line with color and depth interpolation', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 10 });

			drawLineColor(
				fb,
				{ x: 0, y: 5, depth: 0.25, r: 255, g: 0, b: 0 },
				{ x: 10, y: 5, depth: 0.75, r: 0, g: 0, b: 255 },
			);

			// Check color interpolation
			const mid = getPixel(fb, 5, 5);
			expect(mid.r).toBeGreaterThan(100);
			expect(mid.b).toBeGreaterThan(100);

			// Check depth interpolation
			expect(getDepth(fb, 0, 5)).toBeCloseTo(0.25, 1);
			expect(getDepth(fb, 10, 5)).toBeCloseTo(0.75, 1);
		});
	});
});
