/**
 * Cohen-Sutherland line clipping and view frustum culling.
 * @module 3d/math/clipping
 */

import type { ClipRect } from '../schemas/math';
import type { Mat4 } from './mat4';
import { type Vec3, vec3, vec3Dot } from './vec3';

// Cohen-Sutherland outcode bits
const INSIDE = 0b0000;
const LEFT = 0b0001;
const RIGHT = 0b0010;
const BOTTOM = 0b0100;
const TOP = 0b1000;

/**
 * Result of a line clipping operation.
 */
export interface ClippedLine {
	readonly x0: number;
	readonly y0: number;
	readonly x1: number;
	readonly y1: number;
}

/**
 * A frustum plane defined by normal and distance from origin.
 */
export interface FrustumPlane {
	readonly normal: Vec3;
	readonly distance: number;
}

/**
 * Compute the 4-bit Cohen-Sutherland outcode for a point relative to a clip rectangle.
 *
 * @param x - Point X coordinate
 * @param y - Point Y coordinate
 * @param rect - Clip rectangle
 * @returns 4-bit outcode
 *
 * @example
 * ```typescript
 * const code = computeOutcode(5, 5, { xMin: 0, xMax: 10, yMin: 0, yMax: 10 });
 * // code === 0 (inside)
 * ```
 */
export function computeOutcode(x: number, y: number, rect: ClipRect): number {
	let code = INSIDE;
	if (x < rect.xMin) code |= LEFT;
	else if (x > rect.xMax) code |= RIGHT;
	if (y < rect.yMin) code |= BOTTOM;
	else if (y > rect.yMax) code |= TOP;
	return code;
}

/**
 * Compute the intersection point for a line crossing a clip boundary.
 */
function computeIntersection(
	outcodeOut: number,
	x0: number,
	y0: number,
	dx: number,
	dy: number,
	rect: ClipRect,
): { x: number; y: number } {
	if (outcodeOut & TOP) {
		return { x: x0 + (dx * (rect.yMax - y0)) / dy, y: rect.yMax };
	}
	if (outcodeOut & BOTTOM) {
		return { x: x0 + (dx * (rect.yMin - y0)) / dy, y: rect.yMin };
	}
	if (outcodeOut & RIGHT) {
		return { x: rect.xMax, y: y0 + (dy * (rect.xMax - x0)) / dx };
	}
	// LEFT
	return { x: rect.xMin, y: y0 + (dy * (rect.xMin - x0)) / dx };
}

/**
 * Clip a 2D line segment to a rectangle using Cohen-Sutherland algorithm.
 * Returns null if the line is entirely outside.
 *
 * @param x0 - Start X
 * @param y0 - Start Y
 * @param x1 - End X
 * @param y1 - End Y
 * @param rect - Clip rectangle
 * @returns Clipped line endpoints or null if fully outside
 *
 * @example
 * ```typescript
 * const result = clipLine(-5, 5, 15, 5, { xMin: 0, xMax: 10, yMin: 0, yMax: 10 });
 * // result = { x0: 0, y0: 5, x1: 10, y1: 5 }
 * ```
 */
export function clipLine(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	rect: ClipRect,
): ClippedLine | null {
	let cx0 = x0;
	let cy0 = y0;
	let cx1 = x1;
	let cy1 = y1;

	let outcode0 = computeOutcode(cx0, cy0, rect);
	let outcode1 = computeOutcode(cx1, cy1, rect);

	for (;;) {
		// Both inside
		if ((outcode0 | outcode1) === 0) {
			return { x0: cx0, y0: cy0, x1: cx1, y1: cy1 };
		}

		// Both outside same region
		if ((outcode0 & outcode1) !== 0) {
			return null;
		}

		// Pick the point that is outside
		const outcodeOut = outcode0 !== 0 ? outcode0 : outcode1;
		const dx = cx1 - cx0;
		const dy = cy1 - cy0;
		const intersection = computeIntersection(outcodeOut, cx0, cy0, dx, dy, rect);

		if (outcodeOut === outcode0) {
			cx0 = intersection.x;
			cy0 = intersection.y;
			outcode0 = computeOutcode(cx0, cy0, rect);
		} else {
			cx1 = intersection.x;
			cy1 = intersection.y;
			outcode1 = computeOutcode(cx1, cy1, rect);
		}
	}
}

/**
 * Extract 6 frustum planes from a combined view-projection matrix.
 * Plane normals point inward (toward the visible region).
 *
 * @param viewProj - Combined view-projection matrix
 * @returns Array of 6 frustum planes: [left, right, bottom, top, near, far]
 *
 * @example
 * ```typescript
 * const planes = extractFrustumPlanes(vpMatrix);
 * ```
 */
export function extractFrustumPlanes(viewProj: Mat4): FrustumPlane[] {
	const m = viewProj;

	const planes: FrustumPlane[] = [];

	// Left: row3 + row0
	planes.push(
		normalizePlane(
			(m[3] as number) + (m[0] as number),
			(m[7] as number) + (m[4] as number),
			(m[11] as number) + (m[8] as number),
			(m[15] as number) + (m[12] as number),
		),
	);

	// Right: row3 - row0
	planes.push(
		normalizePlane(
			(m[3] as number) - (m[0] as number),
			(m[7] as number) - (m[4] as number),
			(m[11] as number) - (m[8] as number),
			(m[15] as number) - (m[12] as number),
		),
	);

	// Bottom: row3 + row1
	planes.push(
		normalizePlane(
			(m[3] as number) + (m[1] as number),
			(m[7] as number) + (m[5] as number),
			(m[11] as number) + (m[9] as number),
			(m[15] as number) + (m[13] as number),
		),
	);

	// Top: row3 - row1
	planes.push(
		normalizePlane(
			(m[3] as number) - (m[1] as number),
			(m[7] as number) - (m[5] as number),
			(m[11] as number) - (m[9] as number),
			(m[15] as number) - (m[13] as number),
		),
	);

	// Near: row3 + row2
	planes.push(
		normalizePlane(
			(m[3] as number) + (m[2] as number),
			(m[7] as number) + (m[6] as number),
			(m[11] as number) + (m[10] as number),
			(m[15] as number) + (m[14] as number),
		),
	);

	// Far: row3 - row2
	planes.push(
		normalizePlane(
			(m[3] as number) - (m[2] as number),
			(m[7] as number) - (m[6] as number),
			(m[11] as number) - (m[10] as number),
			(m[15] as number) - (m[14] as number),
		),
	);

	return planes;
}

function normalizePlane(a: number, b: number, c: number, d: number): FrustumPlane {
	const len = Math.sqrt(a * a + b * b + c * c);
	if (len === 0) {
		return { normal: vec3(0, 0, 0), distance: 0 };
	}
	const invLen = 1 / len;
	return {
		normal: vec3(a * invLen, b * invLen, c * invLen),
		distance: d * invLen,
	};
}

/**
 * Test if a point is inside all frustum planes.
 *
 * @param point - 3D point to test
 * @param planes - Array of frustum planes (normals point inward)
 * @returns True if the point is inside the frustum
 *
 * @example
 * ```typescript
 * const inside = isPointInFrustum(vec3(0, 0, -5), frustumPlanes);
 * ```
 */
export function isPointInFrustum(point: Vec3, planes: readonly FrustumPlane[]): boolean {
	for (const plane of planes) {
		const dist = vec3Dot(plane.normal, point) + plane.distance;
		if (dist < 0) {
			return false;
		}
	}
	return true;
}

/**
 * Test if a bounding sphere intersects or is inside the frustum.
 *
 * @param center - Sphere center
 * @param radius - Sphere radius
 * @param planes - Frustum planes
 * @returns True if the sphere is at least partially inside
 *
 * @example
 * ```typescript
 * const visible = isSphereInFrustum(vec3(0, 0, -5), 2.0, frustumPlanes);
 * ```
 */
export function isSphereInFrustum(
	center: Vec3,
	radius: number,
	planes: readonly FrustumPlane[],
): boolean {
	for (const plane of planes) {
		const dist = vec3Dot(plane.normal, center) + plane.distance;
		if (dist < -radius) {
			return false;
		}
	}
	return true;
}
