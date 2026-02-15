/**
 * Scanline triangle rasterizer with depth buffer and color interpolation.
 *
 * @module 3d/rasterizer/triangle
 */

import type { RGBAColor, TriangleVertex } from '../schemas/rasterizer';
import { type PixelFramebuffer, setPixelUnsafe, testAndSetDepth } from './pixelBuffer';

/** Triangle scanline setup state */
interface TriangleScanSetup {
	invArea: number;
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	A01: number;
	B01: number;
	A12: number;
	B12: number;
	hasDepth: boolean;
	startW0: number;
	startW1: number;
}

/** Compute triangle scan setup, returns null if triangle is invalid */
function computeTriangleScanSetup(
	fb: PixelFramebuffer,
	v0: TriangleVertex,
	v1: TriangleVertex,
	v2: TriangleVertex,
): TriangleScanSetup | null {
	const area = triangleArea2(v0, v1, v2);
	if (Math.abs(area) < 0.5) return null;

	const invArea = 1 / area;
	const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
	const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
	const maxX = Math.min(fb.width - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
	const maxY = Math.min(fb.height - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

	if (minX > maxX || minY > maxY) return null;

	const startCx = minX + 0.5;
	const startCy = minY + 0.5;

	return {
		invArea,
		minX,
		minY,
		maxX,
		maxY,
		A01: (v1.y - v2.y) * invArea,
		B01: (v2.x - v1.x) * invArea,
		A12: (v2.y - v0.y) * invArea,
		B12: (v0.x - v2.x) * invArea,
		hasDepth: fb.depthBuffer !== null && fb.depthBuffer !== undefined,
		startW0: ((v1.y - v2.y) * (startCx - v2.x) + (v2.x - v1.x) * (startCy - v2.y)) * invArea,
		startW1: ((v2.y - v0.y) * (startCx - v2.x) + (v0.x - v2.x) * (startCy - v2.y)) * invArea,
	};
}

/** Process a single pixel with interpolated color */
function processPixelInterpolated(
	fb: PixelFramebuffer,
	px: number,
	py: number,
	w0: number,
	w1: number,
	v0: TriangleVertex,
	v1: TriangleVertex,
	v2: TriangleVertex,
	a0: number,
	a1: number,
	a2: number,
	hasDepth: boolean,
): void {
	const w2 = 1 - w0 - w1;
	if (w0 < 0 || w1 < 0 || w2 < 0) return;

	const depth = v0.depth * w0 + v1.depth * w1 + v2.depth * w2;
	if (hasDepth && !testAndSetDepth(fb, px, py, depth)) return;

	const r = (v0.r * w0 + v1.r * w1 + v2.r * w2 + 0.5) | 0;
	const g = (v0.g * w0 + v1.g * w1 + v2.g * w2 + 0.5) | 0;
	const b = (v0.b * w0 + v1.b * w1 + v2.b * w2 + 0.5) | 0;
	const a = (a0 * w0 + a1 * w1 + a2 * w2 + 0.5) | 0;
	setPixelUnsafe(fb, px, py, r, g, b, a);
}

/** Process a single pixel with flat color */
function processPixelFlat(
	fb: PixelFramebuffer,
	px: number,
	py: number,
	w0: number,
	w1: number,
	v0: TriangleVertex,
	v1: TriangleVertex,
	v2: TriangleVertex,
	color: RGBAColor,
	hasDepth: boolean,
): void {
	const w2 = 1 - w0 - w1;
	if (w0 < 0 || w1 < 0 || w2 < 0) return;

	const depth = v0.depth * w0 + v1.depth * w1 + v2.depth * w2;
	if (hasDepth && !testAndSetDepth(fb, px, py, depth)) return;

	setPixelUnsafe(fb, px, py, color.r, color.g, color.b, color.a);
}

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
	const setup = computeTriangleScanSetup(fb, v0, v1, v2);
	if (!setup) return;

	const a0 = v0.a ?? 255;
	const a1 = v1.a ?? 255;
	const a2 = v2.a ?? 255;

	let rowW0 = setup.startW0;
	let rowW1 = setup.startW1;

	for (let py = setup.minY; py <= setup.maxY; py++) {
		let w0 = rowW0;
		let w1 = rowW1;

		for (let px = setup.minX; px <= setup.maxX; px++) {
			processPixelInterpolated(fb, px, py, w0, w1, v0, v1, v2, a0, a1, a2, setup.hasDepth);
			w0 += setup.A01;
			w1 += setup.A12;
		}

		rowW0 += setup.B01;
		rowW1 += setup.B12;
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
	const setup = computeTriangleScanSetup(fb, v0, v1, v2);
	if (!setup) return;

	let rowW0 = setup.startW0;
	let rowW1 = setup.startW1;

	for (let py = setup.minY; py <= setup.maxY; py++) {
		let w0 = rowW0;
		let w1 = rowW1;

		for (let px = setup.minX; px <= setup.maxX; px++) {
			processPixelFlat(fb, px, py, w0, w1, v0, v1, v2, color, setup.hasDepth);
			w0 += setup.A01;
			w1 += setup.A12;
		}

		rowW0 += setup.B01;
		rowW1 += setup.B12;
	}
}
