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
	clipLine,
	computeOutcode,
	extractFrustumPlanes,
	isPointInFrustum,
	isSphereInFrustum,
} from '../math/clipping';

export const clipping = Object.freeze({
	computeOutcode,
	clipLine,
	extractFrustumPlanes,
	isPointInFrustum,
	isSphereInFrustum,
});

export type ClippingModule = typeof clipping;
