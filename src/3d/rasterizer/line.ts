/**
 * Bresenham line drawing with color and depth interpolation.
 *
 * @module 3d/rasterizer/line
 */

import type { LineEndpoint } from '../schemas/rasterizer';
import { type PixelFramebuffer, isInBounds, setPixelUnsafe, testAndSetDepth } from './pixelBuffer';

/**
 * Draw a solid-color line using Bresenham's algorithm.
 * No depth testing. Pixels outside the framebuffer are skipped.
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
 * drawLine(fb, 0, 0, 100, 50, 255, 255, 255);
 * ```
 */
export function drawLine(
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
	let cx0 = Math.round(x0);
	let cy0 = Math.round(y0);
	const cx1 = Math.round(x1);
	const cy1 = Math.round(y1);

	const dx = Math.abs(cx1 - cx0);
	const dy = Math.abs(cy1 - cy0);
	const sx = cx0 < cx1 ? 1 : -1;
	const sy = cy0 < cy1 ? 1 : -1;
	let err = dx - dy;

	for (;;) {
		if (isInBounds(fb, cx0, cy0)) {
			setPixelUnsafe(fb, cx0, cy0, r, g, b, a);
		}

		if (cx0 === cx1 && cy0 === cy1) {
			break;
		}

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			cx0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			cy0 += sy;
		}
	}
}

/**
 * Draw a line with linear depth interpolation and depth testing.
 * Uses a single color from p0. Pixels that fail the depth test are skipped.
 *
 * @param fb - Framebuffer to draw into (must have depth buffer)
 * @param p0 - Start endpoint with position, color, and depth
 * @param p1 - End endpoint with position and depth
 *
 * @example
 * ```typescript
 * drawLineDepth(fb,
 *   { x: 0, y: 0, depth: 0.2, r: 255, g: 0, b: 0 },
 *   { x: 100, y: 50, depth: 0.8, r: 255, g: 0, b: 0 },
 * );
 * ```
 */
export function drawLineDepth(
	fb: PixelFramebuffer,
	p0: LineEndpoint,
	p1: LineEndpoint,
): void {
	let cx0 = Math.round(p0.x);
	let cy0 = Math.round(p0.y);
	const cx1 = Math.round(p1.x);
	const cy1 = Math.round(p1.y);

	const dx = Math.abs(cx1 - cx0);
	const dy = Math.abs(cy1 - cy0);
	const sx = cx0 < cx1 ? 1 : -1;
	const sy = cy0 < cy1 ? 1 : -1;
	let err = dx - dy;

	const steps = Math.max(dx, dy);
	const invSteps = steps > 0 ? 1 / steps : 0;
	const d0 = p0.depth ?? 0;
	const d1 = p1.depth ?? 0;
	const r = p0.r;
	const g = p0.g;
	const b = p0.b;
	const a = p0.a ?? 255;

	let step = 0;

	for (;;) {
		if (isInBounds(fb, cx0, cy0)) {
			const t = step * invSteps;
			const depth = d0 + (d1 - d0) * t;
			if (testAndSetDepth(fb, cx0, cy0, depth)) {
				setPixelUnsafe(fb, cx0, cy0, r, g, b, a);
			}
		}

		if (cx0 === cx1 && cy0 === cy1) {
			break;
		}

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			cx0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			cy0 += sy;
		}
		step++;
	}
}

/**
 * Draw a line with both color and depth interpolation.
 * Color is linearly interpolated between endpoints.
 *
 * @param fb - Framebuffer to draw into (must have depth buffer for depth testing)
 * @param p0 - Start endpoint with position, color, and depth
 * @param p1 - End endpoint with position, color, and depth
 *
 * @example
 * ```typescript
 * drawLineColor(fb,
 *   { x: 0, y: 0, depth: 0.2, r: 255, g: 0, b: 0 },
 *   { x: 100, y: 50, depth: 0.8, r: 0, g: 0, b: 255 },
 * );
 * ```
 */
export function drawLineColor(
	fb: PixelFramebuffer,
	p0: LineEndpoint,
	p1: LineEndpoint,
): void {
	let cx0 = Math.round(p0.x);
	let cy0 = Math.round(p0.y);
	const cx1 = Math.round(p1.x);
	const cy1 = Math.round(p1.y);

	const dx = Math.abs(cx1 - cx0);
	const dy = Math.abs(cy1 - cy0);
	const sx = cx0 < cx1 ? 1 : -1;
	const sy = cy0 < cy1 ? 1 : -1;
	let err = dx - dy;

	const steps = Math.max(dx, dy);
	const invSteps = steps > 0 ? 1 / steps : 0;
	const d0 = p0.depth ?? 0;
	const d1 = p1.depth ?? 0;
	const r0 = p0.r;
	const g0 = p0.g;
	const b0 = p0.b;
	const a0 = p0.a ?? 255;
	const r1 = p1.r;
	const g1 = p1.g;
	const b1 = p1.b;
	const a1 = p1.a ?? 255;

	let step = 0;

	for (;;) {
		if (isInBounds(fb, cx0, cy0)) {
			const t = step * invSteps;
			const depth = d0 + (d1 - d0) * t;
			const hasDepth = p0.depth !== undefined || p1.depth !== undefined;

			const shouldDraw = !hasDepth || !fb.depthBuffer || testAndSetDepth(fb, cx0, cy0, depth);
			if (shouldDraw) {
				const r = Math.round(r0 + (r1 - r0) * t);
				const g = Math.round(g0 + (g1 - g0) * t);
				const b = Math.round(b0 + (b1 - b0) * t);
				const a = Math.round(a0 + (a1 - a0) * t);
				setPixelUnsafe(fb, cx0, cy0, r, g, b, a);
			}
		}

		if (cx0 === cx1 && cy0 === cy1) {
			break;
		}

		const e2 = 2 * err;
		if (e2 > -dy) {
			err -= dy;
			cx0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			cy0 += sy;
		}
		step++;
	}
}
