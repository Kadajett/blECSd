/**
 * Projection utilities namespace for camera matrices and transforms.
 *
 * @example
 * ```typescript
 * import { projection } from '@blecsd/3d';
 *
 * const proj = projection.perspective({ fov: Math.PI / 3, aspect: 16/9, near: 0.1, far: 100 });
 * const view = projection.lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
 * const mvp = projection.buildMVP(modelMatrix, view, proj);
 * ```
 */

import type { Mat4 } from '../math/mat4';
import {
	buildMVP,
	lookAt,
	orthographicMatrix,
	perspectiveMatrix,
	projectVertex,
	type ScreenCoord,
	unprojectVertex,
	viewportTransform,
} from '../math/projection';
import type { Vec3 } from '../math/vec3';
import type { OrthographicConfig, PerspectiveConfig, ViewportConfig } from '../schemas/math';

export const projection = Object.freeze({
	perspective: perspectiveMatrix,
	orthographic: orthographicMatrix,
	lookAt,
	viewportTransform,
	projectVertex,
	unprojectVertex,
	buildMVP,
});

export type ProjectionModule = typeof projection;
export type { Mat4, Vec3, PerspectiveConfig, OrthographicConfig, ViewportConfig, ScreenCoord };
