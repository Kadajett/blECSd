/**
 * Bresenham line drawing with color and depth interpolation.
 *
 * @module 3d/rasterizer/line
 */

import type { LineEndpoint } from '../schemas/rasterizer';
import { isInBounds, type PixelFramebuffer, setPixelUnsafe, testAndSetDepth } from './pixelBuffer';

/** Mutable state for Bresenham line stepping */
interface BresenhamState {
	x: number;
	y: number;
	err: number;
	step: number;
}

/** Perform one Bresenham step, returns true if line is complete */
function bresenhamStep(
	state: BresenhamState,
	endX: number,
	endY: number,
	dx: number,
	dy: number,
	sx: number,
	sy: number,
): boolean {
	if (state.x === endX && state.y === endY) {
		return true;
	}

	const e2 = 2 * state.err;
	if (e2 > -dy) {
		state.err -= dy;
		state.x += sx;
	}
	if (e2 < dx) {
		state.err += dx;
		state.y += sy;
	}
	state.step++;
	return false;
}

/** Draw a pixel with depth testing if depth buffer exists */
function drawPixelWithDepth(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	depth: number,
	r: number,
	g: number,
	b: number,
	a: number,
): void {
	if (!isInBounds(fb, x, y)) return;
	if (testAndSetDepth(fb, x, y, depth)) {
		setPixelUnsafe(fb, x, y, r, g, b, a);
	}
}

/** Compute interpolated color at t */
function lerpColor(
	r0: number,
	g0: number,
	b0: number,
	a0: number,
	r1: number,
	g1: number,
	b1: number,
	a1: number,
	t: number,
): { r: number; g: number; b: number; a: number } {
	return {
		r: Math.round(r0 + (r1 - r0) * t),
		g: Math.round(g0 + (g1 - g0) * t),
		b: Math.round(b0 + (b1 - b0) * t),
		a: Math.round(a0 + (a1 - a0) * t),
	};
}

/** Check if a pixel should be drawn (handles depth test logic) */
function shouldDrawPixel(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	depth: number,
	hasDepth: boolean,
): boolean {
	if (!hasDepth || !fb.depthBuffer) return true;
	return testAndSetDepth(fb, x, y, depth);
}

/** Draw interpolated color pixel at position */
function drawColorPixel(
	fb: PixelFramebuffer,
	x: number,
	y: number,
	p0: LineEndpoint,
	p1: LineEndpoint,
	t: number,
): void {
	const col = lerpColor(p0.r, p0.g, p0.b, p0.a ?? 255, p1.r, p1.g, p1.b, p1.a ?? 255, t);
	setPixelUnsafe(fb, x, y, col.r, col.g, col.b, col.a);
}

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
export function drawLineDepth(fb: PixelFramebuffer, p0: LineEndpoint, p1: LineEndpoint): void {
	const endX = Math.round(p1.x);
	const endY = Math.round(p1.y);
	const state: BresenhamState = {
		x: Math.round(p0.x),
		y: Math.round(p0.y),
		err: 0,
		step: 0,
	};

	const dx = Math.abs(endX - state.x);
	const dy = Math.abs(endY - state.y);
	const sx = state.x < endX ? 1 : -1;
	const sy = state.y < endY ? 1 : -1;
	state.err = dx - dy;

	const steps = Math.max(dx, dy);
	const invSteps = steps > 0 ? 1 / steps : 0;
	const d0 = p0.depth ?? 0;
	const d1 = p1.depth ?? 0;
	const r = p0.r;
	const g = p0.g;
	const b = p0.b;
	const a = p0.a ?? 255;

	for (;;) {
		const t = state.step * invSteps;
		const depth = d0 + (d1 - d0) * t;
		drawPixelWithDepth(fb, state.x, state.y, depth, r, g, b, a);

		if (bresenhamStep(state, endX, endY, dx, dy, sx, sy)) {
			break;
		}
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
export function drawLineColor(fb: PixelFramebuffer, p0: LineEndpoint, p1: LineEndpoint): void {
	const endX = Math.round(p1.x);
	const endY = Math.round(p1.y);
	const state: BresenhamState = {
		x: Math.round(p0.x),
		y: Math.round(p0.y),
		err: 0,
		step: 0,
	};

	const dx = Math.abs(endX - state.x);
	const dy = Math.abs(endY - state.y);
	const sx = state.x < endX ? 1 : -1;
	const sy = state.y < endY ? 1 : -1;
	state.err = dx - dy;

	const steps = Math.max(dx, dy);
	const invSteps = steps > 0 ? 1 / steps : 0;
	const d0 = p0.depth ?? 0;
	const d1 = p1.depth ?? 0;
	const hasDepth = p0.depth !== undefined || p1.depth !== undefined;

	for (;;) {
		if (isInBounds(fb, state.x, state.y)) {
			const t = state.step * invSteps;
			const depth = d0 + (d1 - d0) * t;

			if (shouldDrawPixel(fb, state.x, state.y, depth, hasDepth)) {
				drawColorPixel(fb, state.x, state.y, p0, p1, t);
			}
		}

		if (bresenhamStep(state, endX, endY, dx, dy, sx, sy)) {
			break;
		}
	}
}
