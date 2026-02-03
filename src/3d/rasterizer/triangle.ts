/**
 * Scanline triangle rasterizer with depth buffer and color interpolation.
 *
 * @module 3d/rasterizer/triangle
 */

import type { RGBAColor, TriangleVertex } from '../schemas/rasterizer';
import { type PixelFramebuffer, setPixelUnsafe, testAndSetDepth } from './pixelBuffer';

/**
 * Bounding box for a triangle.
 */
export interface TriangleBBox {
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
}

/**
 * Compute the signed 2x area of a triangle.
 * Positive = counter-clockwise (front-facing), negative = clockwise (back-facing).
 *
 * @param v0 - First vertex
 * @param v1 - Second vertex
 * @param v2 - Third vertex
 * @returns Signed 2x area
 *
 * @example
 * ```typescript
 * const area = triangleArea2(
 *   { x: 0, y: 0 },
 *   { x: 10, y: 0 },
 *   { x: 0, y: 10 },
 * );
 * // area = 100 (CCW, front-facing)
 * ```
 */
export function triangleArea2(
	v0: { readonly x: number; readonly y: number },
	v1: { readonly x: number; readonly y: number },
	v2: { readonly x: number; readonly y: number },
): number {
	return (v1.x - v0.x) * (v2.y - v0.y) - (v2.x - v0.x) * (v1.y - v0.y);
}

/**
 * Compute the axis-aligned bounding box of a triangle.
 *
 * @param v0 - First vertex
 * @param v1 - Second vertex
 * @param v2 - Third vertex
 * @returns Bounding box
 *
 * @example
 * ```typescript
 * const bbox = triangleBoundingBox(v0, v1, v2);
 * ```
 */
export function triangleBoundingBox(
	v0: { readonly x: number; readonly y: number },
	v1: { readonly x: number; readonly y: number },
	v2: { readonly x: number; readonly y: number },
): TriangleBBox {
	return {
		minX: Math.min(v0.x, v1.x, v2.x),
		minY: Math.min(v0.y, v1.y, v2.y),
		maxX: Math.max(v0.x, v1.x, v2.x),
		maxY: Math.max(v0.y, v1.y, v2.y),
	};
}

/**
 * Fill a triangle with per-vertex color and depth interpolation.
 * Uses scanline rasterization with top-left fill rule.
 * Skips degenerate triangles (area < 0.5).
 *
 * @param fb - Framebuffer to draw into
 * @param v0 - First vertex
 * @param v1 - Second vertex
 * @param v2 - Third vertex
 *
 * @example
 * ```typescript
 * fillTriangle(fb,
 *   { x: 10, y: 0, depth: 0.5, r: 255, g: 0, b: 0 },
 *   { x: 0, y: 20, depth: 0.5, r: 0, g: 255, b: 0 },
 *   { x: 20, y: 20, depth: 0.5, r: 0, g: 0, b: 255 },
 * );
 * ```
 */
export function fillTriangle(
	fb: PixelFramebuffer,
	v0: TriangleVertex,
	v1: TriangleVertex,
	v2: TriangleVertex,
): void {
	const area = triangleArea2(v0, v1, v2);

	// Skip degenerate triangles
	if (Math.abs(area) < 0.5) {
		return;
	}

	const invArea = 1 / area;

	// Compute bounding box and clip to framebuffer
	const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
	const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
	const maxX = Math.min(fb.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
	const maxY = Math.min(fb.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

	if (minX > maxX || minY > maxY) {
		return;
	}

	const a0 = v0.a ?? 255;
	const a1 = v1.a ?? 255;
	const a2 = v2.a ?? 255;

	// Pre-compute edge function coefficients for incremental evaluation
	const A01 = (v1.y - v2.y) * invArea;
	const B01 = (v2.x - v1.x) * invArea;
	const A12 = (v2.y - v0.y) * invArea;
	const B12 = (v0.x - v2.x) * invArea;

	const hasDepth = fb.depthBuffer !== null && fb.depthBuffer !== undefined;

	// Evaluate at first pixel center
	const startCx = minX + 0.5;
	const startCy = minY + 0.5;
	let rowW0 = ((v1.y - v2.y) * (startCx - v2.x) + (v2.x - v1.x) * (startCy - v2.y)) * invArea;
	let rowW1 = ((v2.y - v0.y) * (startCx - v2.x) + (v0.x - v2.x) * (startCy - v2.y)) * invArea;

	for (let py = minY; py <= maxY; py++) {
		let w0 = rowW0;
		let w1 = rowW1;

		for (let px = minX; px <= maxX; px++) {
			const w2 = 1 - w0 - w1;

			if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
				const depth = v0.depth * w0 + v1.depth * w1 + v2.depth * w2;

				if (!hasDepth || testAndSetDepth(fb, px, py, depth)) {
					const r = (v0.r * w0 + v1.r * w1 + v2.r * w2 + 0.5) | 0;
					const g = (v0.g * w0 + v1.g * w1 + v2.g * w2 + 0.5) | 0;
					const b = (v0.b * w0 + v1.b * w1 + v2.b * w2 + 0.5) | 0;
					const a = (a0 * w0 + a1 * w1 + a2 * w2 + 0.5) | 0;

					setPixelUnsafe(fb, px, py, r, g, b, a);
				}
			}

			// Increment edge functions along X
			w0 += A01;
			w1 += A12;
		}

		// Increment edge functions along Y
		rowW0 += B01;
		rowW1 += B12;
	}
}

/**
 * Fill a triangle with a single flat color and depth interpolation.
 * Faster than fillTriangle when per-vertex color is not needed.
 *
 * @param fb - Framebuffer to draw into
 * @param v0 - First vertex
 * @param v1 - Second vertex
 * @param v2 - Third vertex
 * @param color - Flat fill color
 *
 * @example
 * ```typescript
 * fillTriangleFlat(fb,
 *   { x: 10, y: 0, depth: 0.5, r: 0, g: 0, b: 0 },
 *   { x: 0, y: 20, depth: 0.5, r: 0, g: 0, b: 0 },
 *   { x: 20, y: 20, depth: 0.5, r: 0, g: 0, b: 0 },
 *   { r: 255, g: 128, b: 64, a: 255 },
 * );
 * ```
 */
export function fillTriangleFlat(
	fb: PixelFramebuffer,
	v0: TriangleVertex,
	v1: TriangleVertex,
	v2: TriangleVertex,
	color: RGBAColor,
): void {
	const area = triangleArea2(v0, v1, v2);

	if (Math.abs(area) < 0.5) {
		return;
	}

	const invArea = 1 / area;

	const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
	const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
	const maxX = Math.min(fb.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
	const maxY = Math.min(fb.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

	if (minX > maxX || minY > maxY) {
		return;
	}

	const cr = color.r;
	const cg = color.g;
	const cb = color.b;
	const ca = color.a;

	// Pre-compute edge function coefficients for incremental evaluation
	const A01 = (v1.y - v2.y) * invArea;
	const B01 = (v2.x - v1.x) * invArea;
	const A12 = (v2.y - v0.y) * invArea;
	const B12 = (v0.x - v2.x) * invArea;

	const hasDepth = fb.depthBuffer !== null && fb.depthBuffer !== undefined;

	const startCx = minX + 0.5;
	const startCy = minY + 0.5;
	let rowW0 = ((v1.y - v2.y) * (startCx - v2.x) + (v2.x - v1.x) * (startCy - v2.y)) * invArea;
	let rowW1 = ((v2.y - v0.y) * (startCx - v2.x) + (v0.x - v2.x) * (startCy - v2.y)) * invArea;

	for (let py = minY; py <= maxY; py++) {
		let w0 = rowW0;
		let w1 = rowW1;

		for (let px = minX; px <= maxX; px++) {
			const w2 = 1 - w0 - w1;

			if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
				const depth = v0.depth * w0 + v1.depth * w1 + v2.depth * w2;

				if (!hasDepth || testAndSetDepth(fb, px, py, depth)) {
					setPixelUnsafe(fb, px, py, cr, cg, cb, ca);
				}
			}

			w0 += A01;
			w1 += A12;
		}

		rowW0 += B01;
		rowW1 += B12;
	}
}
