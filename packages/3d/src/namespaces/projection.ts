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

import {
	buildMVP,
	lookAt,
	orthographicMatrix,
	perspectiveMatrix,
	projectVertex,
	unprojectVertex,
	viewportTransform,
} from '../math/projection';

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
