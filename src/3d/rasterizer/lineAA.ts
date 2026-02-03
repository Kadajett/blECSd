/**
 * Wu's anti-aliased line drawing algorithm.
 *
 * Produces smoother lines by drawing two pixels per step with
 * fractional intensity. Best results on sixel/kitty backends
 * where subpixel rendering is available.
 *
 * @module 3d/rasterizer/lineAA
 */

import { type PixelFramebuffer, getPixel, isInBounds, setPixelUnsafe } from './pixelBuffer';

/**
 * Blend a color with an existing pixel at the given intensity.
 * Uses alpha blending: result = existing * (1 - intensity) + new * intensity.
 *
 * @param fb - Framebuffer to read/write
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-255)
 * @param intensity - Blend intensity (0.0 = fully transparent, 1.0 = fully opaque)
 *
 * @example
 * ```typescript
 * blendPixel(fb, 10, 20, 255, 255, 255, 255, 0.5);
 * ```
 */
export function blendPixel(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	r: number,
	g: number,
	b: number,
	a: number,
	intensity: number,
): void {
	if (!isInBounds(fb, x, y) || intensity <= 0) {
		return;
	}

	if (intensity >= 1) {
		setPixelUnsafe(fb, x, y, r, g, b, a);
		return;
	}

	const existing = getPixel(fb, x, y);
	const inv = 1 - intensity;

	const blendR = Math.round(existing.r * inv + r * intensity);
	const blendG = Math.round(existing.g * inv + g * intensity);
	const blendB = Math.round(existing.b * inv + b * intensity);
	const blendA = Math.round(existing.a * inv + a * intensity);

	setPixelUnsafe(fb, x, y, blendR, blendG, blendB, blendA);
}

/**
 * Draw an anti-aliased line using Wu's algorithm.
 * Draws two pixels per column/row step with fractional intensity
 * for smooth appearance.
 *
 * @param fb - Framebuffer to draw into
 * @param x0 - Start X coordinate
 * @param y0 - Start Y coordinate
 * @param x1 - End X coordinate
 * @param y1 - End Y coordinate
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-255, defaults to 255)
 *
 * @example
 * ```typescript
 * drawLineAA(fb, 0, 0, 100, 30, 255, 255, 255);
 * ```
 */
export function drawLineAA(
	fb: PixelFramebuffer,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	r: number,
	g: number,
	b: number,
	a: number = 255,
): void {
	const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

	let ax0 = x0;
	let ay0 = y0;
	let ax1 = x1;
	let ay1 = y1;

	if (steep) {
		[ax0, ay0] = [ay0, ax0];
		[ax1, ay1] = [ay1, ax1];
	}

	if (ax0 > ax1) {
		[ax0, ax1] = [ax1, ax0];
		[ay0, ay1] = [ay1, ay0];
	}

	const dx = ax1 - ax0;
	const dy = ay1 - ay0;
	const gradient = dx === 0 ? 1 : dy / dx;

	// First endpoint
	let xend = Math.round(ax0);
	let yend = ay0 + gradient * (xend - ax0);
	let xgap = 1 - fpart(ax0 + 0.5);
	const xpxl1 = xend;
	const ypxl1 = Math.floor(yend);

	if (steep) {
		blendPixel(fb, ypxl1, xpxl1, r, g, b, a, rfpart(yend) * xgap);
		blendPixel(fb, ypxl1 + 1, xpxl1, r, g, b, a, fpart(yend) * xgap);
	} else {
		blendPixel(fb, xpxl1, ypxl1, r, g, b, a, rfpart(yend) * xgap);
		blendPixel(fb, xpxl1, ypxl1 + 1, r, g, b, a, fpart(yend) * xgap);
	}

	let intery = yend + gradient;

	// Second endpoint
	xend = Math.round(ax1);
	yend = ay1 + gradient * (xend - ax1);
	xgap = fpart(ax1 + 0.5);
	const xpxl2 = xend;
	const ypxl2 = Math.floor(yend);

	if (steep) {
		blendPixel(fb, ypxl2, xpxl2, r, g, b, a, rfpart(yend) * xgap);
		blendPixel(fb, ypxl2 + 1, xpxl2, r, g, b, a, fpart(yend) * xgap);
	} else {
		blendPixel(fb, xpxl2, ypxl2, r, g, b, a, rfpart(yend) * xgap);
		blendPixel(fb, xpxl2, ypxl2 + 1, r, g, b, a, fpart(yend) * xgap);
	}

	// Main loop
	for (let x = xpxl1 + 1; x < xpxl2; x++) {
		const ipy = Math.floor(intery);
		if (steep) {
			blendPixel(fb, ipy, x, r, g, b, a, rfpart(intery));
			blendPixel(fb, ipy + 1, x, r, g, b, a, fpart(intery));
		} else {
			blendPixel(fb, x, ipy, r, g, b, a, rfpart(intery));
			blendPixel(fb, x, ipy + 1, r, g, b, a, fpart(intery));
		}
		intery += gradient;
	}
}

/** Fractional part of a number. */
function fpart(x: number): number {
	return x - Math.floor(x);
}

/** Complement of fractional part: 1 - fpart(x). */
function rfpart(x: number): number {
	return 1 - fpart(x);
}
