import { describe, expect, it } from 'vitest';
import { createPixelFramebuffer, getPixel } from './pixelBuffer';
import { fillTriangle, fillTriangleFlat, triangleArea2, triangleBoundingBox } from './triangle';

/**
 * Count non-transparent pixels in a framebuffer.
 */
function countFilledPixels(fb: ReturnType<typeof createPixelFramebuffer>): number {
	let count = 0;
	for (let y = 0; y < fb.height; y++) {
		for (let x = 0; x < fb.width; x++) {
			if (getPixel(fb, x, y).a > 0) {
				count++;
			}
		}
	}
	return count;
}

describe('Triangle rasterizer', () => {
	describe('triangleArea2', () => {
		it('returns positive for CCW winding', () => {
			const area = triangleArea2({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 });

			expect(area).toBe(100);
		});

		it('returns negative for CW winding', () => {
			const area = triangleArea2({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 0 });

			expect(area).toBe(-100);
		});

		it('returns zero for collinear points', () => {
			const area = triangleArea2({ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 });

			expect(area).toBe(0);
		});
	});

	describe('triangleBoundingBox', () => {
		it('computes correct bounding box', () => {
			const bbox = triangleBoundingBox({ x: 5, y: 2 }, { x: 15, y: 8 }, { x: 3, y: 12 });

			expect(bbox.minX).toBe(3);
			expect(bbox.minY).toBe(2);
			expect(bbox.maxX).toBe(15);
			expect(bbox.maxY).toBe(12);
		});
	});

	describe('fillTriangle', () => {
		it('fills a right triangle', () => {
			const fb = createPixelFramebuffer({ width: 30, height: 30 });

			fillTriangle(
				fb,
				{ x: 5, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 25, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 5, y: 25, depth: 0.5, r: 255, g: 0, b: 0 },
			);

			const count = countFilledPixels(fb);
			expect(count).toBeGreaterThan(100);

			// Corner pixels should be filled
			expect(getPixel(fb, 6, 6).a).toBeGreaterThan(0);
			// Outside the triangle
			expect(getPixel(fb, 24, 24).a).toBe(0);
		});

		it('skips degenerate triangle (collinear points)', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 20 });

			fillTriangle(
				fb,
				{ x: 0, y: 0, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 5, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 10, y: 10, depth: 0.5, r: 255, g: 0, b: 0 },
			);

			expect(countFilledPixels(fb)).toBe(0);
		});

		it('skips zero-area triangle', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 20 });

			fillTriangle(
				fb,
				{ x: 5, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 5, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 5, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
			);

			expect(countFilledPixels(fb)).toBe(0);
		});

		it('interpolates color between vertices', () => {
			const fb = createPixelFramebuffer({ width: 30, height: 30 });

			fillTriangle(
				fb,
				{ x: 15, y: 2, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 2, y: 25, depth: 0.5, r: 0, g: 255, b: 0 },
				{ x: 28, y: 25, depth: 0.5, r: 0, g: 0, b: 255 },
			);

			// Center-ish pixel should have a mix of all three colors
			const center = getPixel(fb, 15, 17);
			expect(center.a).toBeGreaterThan(0);
			// Each channel should have some contribution
			expect(center.r).toBeGreaterThan(20);
			expect(center.g).toBeGreaterThan(20);
			expect(center.b).toBeGreaterThan(20);
		});

		it('front triangle occludes back triangle', () => {
			const fb = createPixelFramebuffer({ width: 30, height: 30 });

			// Draw a far red triangle
			fillTriangle(
				fb,
				{ x: 5, y: 5, depth: 0.8, r: 255, g: 0, b: 0 },
				{ x: 25, y: 5, depth: 0.8, r: 255, g: 0, b: 0 },
				{ x: 15, y: 25, depth: 0.8, r: 255, g: 0, b: 0 },
			);

			// Draw a closer green triangle overlapping
			fillTriangle(
				fb,
				{ x: 10, y: 10, depth: 0.2, r: 0, g: 255, b: 0 },
				{ x: 20, y: 10, depth: 0.2, r: 0, g: 255, b: 0 },
				{ x: 15, y: 20, depth: 0.2, r: 0, g: 255, b: 0 },
			);

			// Overlapping area should be green
			const overlap = getPixel(fb, 15, 15);
			expect(overlap.g).toBeGreaterThan(200);
			expect(overlap.r).toBeLessThan(50);
		});

		it('clips to framebuffer bounds', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 20 });

			// Triangle extends beyond bounds
			fillTriangle(
				fb,
				{ x: -10, y: 10, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 30, y: 10, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 10, y: 30, depth: 0.5, r: 255, g: 0, b: 0 },
			);

			// Should have pixels within bounds
			const count = countFilledPixels(fb);
			expect(count).toBeGreaterThan(0);
		});

		it('handles CW winding (back-facing still draws)', () => {
			const fb = createPixelFramebuffer({ width: 30, height: 30 });

			// CW winding
			fillTriangle(
				fb,
				{ x: 5, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 5, y: 25, depth: 0.5, r: 255, g: 0, b: 0 },
				{ x: 25, y: 5, depth: 0.5, r: 255, g: 0, b: 0 },
			);

			expect(countFilledPixels(fb)).toBeGreaterThan(100);
		});
	});

	describe('fillTriangleFlat', () => {
		it('fills with a uniform color', () => {
			const fb = createPixelFramebuffer({ width: 30, height: 30 });
			const color = { r: 128, g: 64, b: 200, a: 255 };

			fillTriangleFlat(
				fb,
				{ x: 5, y: 5, depth: 0.5, r: 0, g: 0, b: 0 },
				{ x: 25, y: 5, depth: 0.5, r: 0, g: 0, b: 0 },
				{ x: 15, y: 25, depth: 0.5, r: 0, g: 0, b: 0 },
				color,
			);

			// All filled pixels should have the flat color
			for (let y = 0; y < fb.height; y++) {
				for (let x = 0; x < fb.width; x++) {
					const p = getPixel(fb, x, y);
					if (p.a > 0) {
						expect(p.r).toBe(128);
						expect(p.g).toBe(64);
						expect(p.b).toBe(200);
					}
				}
			}
		});

		it('skips degenerate triangles', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 20 });

			fillTriangleFlat(
				fb,
				{ x: 0, y: 0, depth: 0.5, r: 0, g: 0, b: 0 },
				{ x: 10, y: 10, depth: 0.5, r: 0, g: 0, b: 0 },
				{ x: 20, y: 20, depth: 0.5, r: 0, g: 0, b: 0 },
				{ r: 255, g: 0, b: 0, a: 255 },
			);

			expect(countFilledPixels(fb)).toBe(0);
		});

		it('respects depth buffer', () => {
			const fb = createPixelFramebuffer({ width: 30, height: 30 });

			// Close green triangle
			fillTriangleFlat(
				fb,
				{ x: 5, y: 5, depth: 0.2, r: 0, g: 0, b: 0 },
				{ x: 25, y: 5, depth: 0.2, r: 0, g: 0, b: 0 },
				{ x: 15, y: 25, depth: 0.2, r: 0, g: 0, b: 0 },
				{ r: 0, g: 255, b: 0, a: 255 },
			);

			// Far red triangle (should not overwrite)
			fillTriangleFlat(
				fb,
				{ x: 5, y: 5, depth: 0.8, r: 0, g: 0, b: 0 },
				{ x: 25, y: 5, depth: 0.8, r: 0, g: 0, b: 0 },
				{ x: 15, y: 25, depth: 0.8, r: 0, g: 0, b: 0 },
				{ r: 255, g: 0, b: 0, a: 255 },
			);

			// Should still be green
			const p = getPixel(fb, 15, 15);
			expect(p.g).toBe(255);
			expect(p.r).toBe(0);
		});
	});
});
