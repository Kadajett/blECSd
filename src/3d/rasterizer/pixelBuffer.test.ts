import { describe, expect, it } from 'vitest';
import {
	clearFramebuffer,
	createPixelFramebuffer,
	fillRect,
	getDepth,
	getPixel,
	isInBounds,
	setPixel,
	setPixelUnsafe,
	testAndSetDepth,
} from './pixelBuffer';

describe('PixelFramebuffer', () => {
	describe('createPixelFramebuffer', () => {
		it('creates a framebuffer with correct dimensions', () => {
			const fb = createPixelFramebuffer({ width: 100, height: 50 });

			expect(fb.width).toBe(100);
			expect(fb.height).toBe(50);
		});

		it('allocates color buffer of correct size (width * height * 4)', () => {
			const fb = createPixelFramebuffer({ width: 100, height: 50 });

			expect(fb.colorBuffer).toBeInstanceOf(Uint8ClampedArray);
			expect(fb.colorBuffer.length).toBe(100 * 50 * 4);
		});

		it('allocates depth buffer by default', () => {
			const fb = createPixelFramebuffer({ width: 100, height: 50 });

			expect(fb.depthBuffer).toBeInstanceOf(Float32Array);
			expect(fb.depthBuffer?.length).toBe(100 * 50);
		});

		it('initializes depth buffer to 1.0 (far plane)', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			for (let i = 0; i < (fb.depthBuffer?.length ?? 0); i++) {
				expect(fb.depthBuffer?.[i]).toBe(1.0);
			}
		});

		it('skips depth buffer when enableDepthBuffer is false', () => {
			const fb = createPixelFramebuffer({ width: 100, height: 50, enableDepthBuffer: false });

			expect(fb.depthBuffer).toBeNull();
		});

		it('rejects width of 0', () => {
			expect(() => createPixelFramebuffer({ width: 0, height: 50 })).toThrow();
		});

		it('rejects negative width', () => {
			expect(() => createPixelFramebuffer({ width: -10, height: 50 })).toThrow();
		});

		it('rejects width exceeding 4096', () => {
			expect(() => createPixelFramebuffer({ width: 5000, height: 50 })).toThrow();
		});

		it('rejects height of 0', () => {
			expect(() => createPixelFramebuffer({ width: 100, height: 0 })).toThrow();
		});

		it('rejects non-integer dimensions', () => {
			expect(() => createPixelFramebuffer({ width: 10.5, height: 50 })).toThrow();
		});
	});

	describe('clearFramebuffer', () => {
		it('clears color buffer to transparent black by default', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			setPixel(fb, 5, 5, { r: 255, g: 0, b: 0, a: 255 });

			clearFramebuffer(fb);

			const pixel = getPixel(fb, 5, 5);
			expect(pixel.r).toBe(0);
			expect(pixel.g).toBe(0);
			expect(pixel.b).toBe(0);
			expect(pixel.a).toBe(0);
		});

		it('clears color buffer to specified color', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			clearFramebuffer(fb, { r: 128, g: 64, b: 32, a: 255 });

			const pixel = getPixel(fb, 0, 0);
			expect(pixel.r).toBe(128);
			expect(pixel.g).toBe(64);
			expect(pixel.b).toBe(32);
			expect(pixel.a).toBe(255);

			const pixel2 = getPixel(fb, 9, 9);
			expect(pixel2.r).toBe(128);
			expect(pixel2.g).toBe(64);
		});

		it('resets depth buffer to 1.0 by default', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			testAndSetDepth(fb, 5, 5, 0.3);

			clearFramebuffer(fb);

			expect(getDepth(fb, 5, 5)).toBe(1.0);
		});

		it('resets depth buffer to specified value', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			clearFramebuffer(fb, undefined, 0.5);

			expect(getDepth(fb, 5, 5)).toBe(0.5);
		});
	});

	describe('isInBounds', () => {
		const fb = createPixelFramebuffer({ width: 10, height: 10 });

		it('returns true for valid coordinates', () => {
			expect(isInBounds(fb, 0, 0)).toBe(true);
			expect(isInBounds(fb, 5, 5)).toBe(true);
			expect(isInBounds(fb, 9, 9)).toBe(true);
		});

		it('returns false for negative coordinates', () => {
			expect(isInBounds(fb, -1, 0)).toBe(false);
			expect(isInBounds(fb, 0, -1)).toBe(false);
		});

		it('returns false for out-of-bounds coordinates', () => {
			expect(isInBounds(fb, 10, 0)).toBe(false);
			expect(isInBounds(fb, 0, 10)).toBe(false);
		});
	});

	describe('setPixel / getPixel', () => {
		it('round-trips a pixel value', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			const color = { r: 200, g: 100, b: 50, a: 230 };

			setPixel(fb, 3, 7, color);
			const result = getPixel(fb, 3, 7);

			expect(result.r).toBe(200);
			expect(result.g).toBe(100);
			expect(result.b).toBe(50);
			expect(result.a).toBe(230);
		});

		it('setPixel is no-op for out-of-bounds coordinates', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			// Should not throw
			setPixel(fb, -1, 0, { r: 255, g: 0, b: 0, a: 255 });
			setPixel(fb, 0, 10, { r: 255, g: 0, b: 0, a: 255 });
			setPixel(fb, 100, 100, { r: 255, g: 0, b: 0, a: 255 });
		});

		it('getPixel returns transparent black for out-of-bounds', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			const result = getPixel(fb, -1, 0);
			expect(result).toEqual({ r: 0, g: 0, b: 0, a: 0 });

			const result2 = getPixel(fb, 10, 10);
			expect(result2).toEqual({ r: 0, g: 0, b: 0, a: 0 });
		});

		it('different pixels are independent', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			setPixel(fb, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
			setPixel(fb, 1, 0, { r: 0, g: 255, b: 0, a: 255 });

			expect(getPixel(fb, 0, 0).r).toBe(255);
			expect(getPixel(fb, 0, 0).g).toBe(0);
			expect(getPixel(fb, 1, 0).r).toBe(0);
			expect(getPixel(fb, 1, 0).g).toBe(255);
		});
	});

	describe('setPixelUnsafe', () => {
		it('writes pixel without bounds checking', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			setPixelUnsafe(fb, 5, 5, 100, 150, 200, 250);

			const result = getPixel(fb, 5, 5);
			expect(result.r).toBe(100);
			expect(result.g).toBe(150);
			expect(result.b).toBe(200);
			expect(result.a).toBe(250);
		});
	});

	describe('depth buffer', () => {
		it('getDepth returns 1.0 for fresh framebuffer', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			expect(getDepth(fb, 5, 5)).toBe(1.0);
		});

		it('getDepth returns 1.0 for out-of-bounds', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			expect(getDepth(fb, -1, 0)).toBe(1.0);
			expect(getDepth(fb, 10, 10)).toBe(1.0);
		});

		it('getDepth returns 1.0 when no depth buffer', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });

			expect(getDepth(fb, 5, 5)).toBe(1.0);
		});

		it('testAndSetDepth passes for closer pixel', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			const result = testAndSetDepth(fb, 5, 5, 0.5);

			expect(result).toBe(true);
			expect(getDepth(fb, 5, 5)).toBeCloseTo(0.5);
		});

		it('testAndSetDepth fails for farther pixel', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			testAndSetDepth(fb, 5, 5, 0.25);

			const result = testAndSetDepth(fb, 5, 5, 0.75);

			expect(result).toBe(false);
			expect(getDepth(fb, 5, 5)).toBeCloseTo(0.25);
		});

		it('testAndSetDepth updates on closer write', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			testAndSetDepth(fb, 5, 5, 0.75);

			const result = testAndSetDepth(fb, 5, 5, 0.25);

			expect(result).toBe(true);
			expect(getDepth(fb, 5, 5)).toBeCloseTo(0.25);
		});

		it('testAndSetDepth returns false for out-of-bounds', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });

			expect(testAndSetDepth(fb, -1, 0, 0.5)).toBe(false);
			expect(testAndSetDepth(fb, 10, 10, 0.5)).toBe(false);
		});

		it('testAndSetDepth returns false when no depth buffer', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10, enableDepthBuffer: false });

			expect(testAndSetDepth(fb, 5, 5, 0.5)).toBe(false);
		});

		it('testAndSetDepth fails for equal depth', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			testAndSetDepth(fb, 5, 5, 0.5);

			const result = testAndSetDepth(fb, 5, 5, 0.5);

			expect(result).toBe(false);
		});
	});

	describe('fillRect', () => {
		it('fills a rectangle region', () => {
			const fb = createPixelFramebuffer({ width: 20, height: 20 });
			const color = { r: 255, g: 128, b: 64, a: 255 };

			fillRect(fb, 5, 5, 10, 10, color);

			// Inside the rect
			expect(getPixel(fb, 5, 5)).toEqual(color);
			expect(getPixel(fb, 14, 14)).toEqual(color);
			expect(getPixel(fb, 10, 10)).toEqual(color);

			// Outside the rect
			expect(getPixel(fb, 4, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
			expect(getPixel(fb, 15, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
		});

		it('clips to framebuffer bounds on left/top', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			const color = { r: 255, g: 0, b: 0, a: 255 };

			fillRect(fb, -5, -5, 10, 10, color);

			// Visible part should be filled
			expect(getPixel(fb, 0, 0)).toEqual(color);
			expect(getPixel(fb, 4, 4)).toEqual(color);
			// Beyond the rect
			expect(getPixel(fb, 5, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
		});

		it('clips to framebuffer bounds on right/bottom', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			const color = { r: 0, g: 255, b: 0, a: 255 };

			fillRect(fb, 5, 5, 20, 20, color);

			// Visible part should be filled
			expect(getPixel(fb, 5, 5)).toEqual(color);
			expect(getPixel(fb, 9, 9)).toEqual(color);
			// Before the rect
			expect(getPixel(fb, 4, 5)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
		});

		it('handles fully out-of-bounds rect gracefully', () => {
			const fb = createPixelFramebuffer({ width: 10, height: 10 });
			const color = { r: 255, g: 0, b: 0, a: 255 };

			// Should not throw
			fillRect(fb, -20, -20, 5, 5, color);
			fillRect(fb, 20, 20, 5, 5, color);

			// No pixels should be set
			expect(getPixel(fb, 0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
		});
	});
});
