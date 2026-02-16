/**
 * Clipping utilities namespace for frustum culling and line clipping.
 *
 * @example
 * ```typescript
 * import { clipping } from '@blecsd/3d';
 *
 * const planes = clipping.extractFrustumPlanes(vpMatrix);
 * const visible = clipping.isSphereInFrustum(center, radius, planes);
 * const clipped = clipping.clipLine(x0, y0, x1, y1, clipRect);
 * ```
 */

import {
	type ClippedLine,
	clipLine,
	computeOutcode,
	extractFrustumPlanes,
	type FrustumPlane,
	isPointInFrustum,
	isSphereInFrustum,
} from '../math/clipping';
import type { Mat4 } from '../math/mat4';
import type { Vec3 } from '../math/vec3';
import type { ClipRect } from '../schemas/math';

export const clipping = Object.freeze({
	computeOutcode,
	clipLine,
	extractFrustumPlanes,
	isPointInFrustum,
	isSphereInFrustum,
});

export type ClippingModule = typeof clipping;
export type { ClippedLine, FrustumPlane, ClipRect, Mat4, Vec3 };
