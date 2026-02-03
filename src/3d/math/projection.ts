/**
 * Camera projection matrices and viewport transforms.
 * @module 3d/math/projection
 */

import {
	type OrthographicConfig,
	OrthographicConfigSchema,
	type PerspectiveConfig,
	PerspectiveConfigSchema,
	type ViewportConfig,
	ViewportConfigSchema,
} from '../schemas/math';
import { type Mat4, mat4Identity, mat4Multiply, mat4TransformVec3 } from './mat4';
import { type Vec3, vec3, vec3Cross, vec3Normalize, vec3Sub } from './vec3';

/**
 * Build a perspective projection matrix.
 * Validated via PerspectiveConfigSchema at call time.
 *
 * @param config - Perspective configuration (fov, aspect, near, far)
 * @returns A new perspective projection Mat4
 *
 * @example
 * ```typescript
 * const proj = perspectiveMatrix({ fov: Math.PI / 3, aspect: 16/9, near: 0.1, far: 100 });
 * ```
 */
export function perspectiveMatrix(config: PerspectiveConfig): Mat4 {
	const validated = PerspectiveConfigSchema.parse(config);
	const { fov, aspect, near, far } = validated;

	const f = 1.0 / Math.tan(fov / 2);
	const rangeInv = 1.0 / (near - far);

	const out = new Float32Array(16);
	out[0] = f / aspect;
	out[5] = f;
	out[10] = (near + far) * rangeInv;
	out[11] = -1;
	out[14] = 2 * near * far * rangeInv;
	return out;
}

/**
 * Build an orthographic projection matrix.
 * Validated via OrthographicConfigSchema at call time.
 *
 * @param config - Orthographic bounds
 * @returns A new orthographic projection Mat4
 *
 * @example
 * ```typescript
 * const proj = orthographicMatrix({ left: -10, right: 10, bottom: -10, top: 10, near: 0.1, far: 100 });
 * ```
 */
export function orthographicMatrix(config: OrthographicConfig): Mat4 {
	const validated = OrthographicConfigSchema.parse(config);
	const { left, right, bottom, top, near, far } = validated;

	const lr = 1.0 / (left - right);
	const bt = 1.0 / (bottom - top);
	const nf = 1.0 / (near - far);

	const out = new Float32Array(16);
	out[0] = -2 * lr;
	out[5] = -2 * bt;
	out[10] = 2 * nf;
	out[12] = (left + right) * lr;
	out[13] = (top + bottom) * bt;
	out[14] = (far + near) * nf;
	out[15] = 1;
	return out;
}

/**
 * Build a view matrix (camera looking at target).
 *
 * @param eye - Camera position
 * @param target - Point the camera looks at
 * @param up - Up direction vector
 * @returns A new view Mat4
 *
 * @example
 * ```typescript
 * const view = lookAt(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));
 * ```
 */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
	const zAxis = vec3Normalize(vec3Sub(eye, target));
	const xAxis = vec3Normalize(vec3Cross(up, zAxis));
	const yAxis = vec3Cross(zAxis, xAxis);

	const out = mat4Identity();

	// Row 0
	out[0] = xAxis[0] as number;
	out[4] = xAxis[1] as number;
	out[8] = xAxis[2] as number;

	// Row 1
	out[1] = yAxis[0] as number;
	out[5] = yAxis[1] as number;
	out[9] = yAxis[2] as number;

	// Row 2
	out[2] = zAxis[0] as number;
	out[6] = zAxis[1] as number;
	out[10] = zAxis[2] as number;

	// Translation
	out[12] = -(
		(xAxis[0] as number) * (eye[0] as number) +
		(xAxis[1] as number) * (eye[1] as number) +
		(xAxis[2] as number) * (eye[2] as number)
	);
	out[13] = -(
		(yAxis[0] as number) * (eye[0] as number) +
		(yAxis[1] as number) * (eye[1] as number) +
		(yAxis[2] as number) * (eye[2] as number)
	);
	out[14] = -(
		(zAxis[0] as number) * (eye[0] as number) +
		(zAxis[1] as number) * (eye[1] as number) +
		(zAxis[2] as number) * (eye[2] as number)
	);

	return out;
}

/**
 * Projected screen coordinates from viewport transform.
 */
export interface ScreenCoord {
	readonly x: number;
	readonly y: number;
	readonly depth: number;
}

/**
 * Create a viewport transform function that maps NDC [-1,1] to pixel coordinates.
 * Validated via ViewportConfigSchema at call time.
 *
 * @param config - Viewport rectangle
 * @returns A function that transforms NDC coordinates to screen pixel coordinates
 *
 * @example
 * ```typescript
 * const transform = viewportTransform({ x: 0, y: 0, width: 160, height: 96 });
 * const screen = transform(vec3(0, 0, 0.5)); // center of viewport
 * ```
 */
export function viewportTransform(config: ViewportConfig): (ndc: Vec3) => ScreenCoord {
	const validated = ViewportConfigSchema.parse(config);
	const { x, y, width, height } = validated;
	const halfW = width / 2;
	const halfH = height / 2;

	return (ndc: Vec3): ScreenCoord => ({
		x: (ndc[0] as number) * halfW + (x + halfW),
		y: -(ndc[1] as number) * halfH + (y + halfH),
		depth: ((ndc[2] as number) + 1) / 2,
	});
}

/**
 * Project a 3D vertex through an MVP matrix to NDC coordinates.
 *
 * @param mvp - Model-View-Projection matrix
 * @param vertex - 3D vertex position
 * @returns NDC coordinates (x, y in [-1,1], z = depth)
 *
 * @example
 * ```typescript
 * const ndc = projectVertex(mvpMatrix, vec3(0, 0, -5));
 * ```
 */
export function projectVertex(mvp: Mat4, vertex: Vec3): Vec3 {
	return mat4TransformVec3(mvp, vertex);
}

/**
 * Unproject a screen position back to world coordinates.
 *
 * @param invMvp - Inverse of the MVP matrix
 * @param screenPos - Screen position as Vec3 (x, y in viewport pixels, z = depth 0..1)
 * @param viewport - Viewport configuration
 * @returns World-space Vec3 or null if unproject fails
 *
 * @example
 * ```typescript
 * const worldPos = unprojectVertex(invMvp, vec3(80, 48, 0.5), { x: 0, y: 0, width: 160, height: 96 });
 * ```
 */
export function unprojectVertex(
	invMvp: Mat4,
	screenPos: Vec3,
	viewport: ViewportConfig,
): Vec3 | null {
	const validated = ViewportConfigSchema.parse(viewport);
	const { x, y, width, height } = validated;

	// Screen to NDC
	const ndcX = (((screenPos[0] as number) - x) / width) * 2 - 1;
	const ndcY = -((((screenPos[1] as number) - y) / height) * 2 - 1);
	const ndcZ = (screenPos[2] as number) * 2 - 1;

	const ndc = vec3(ndcX, ndcY, ndcZ);
	return mat4TransformVec3(invMvp, ndc);
}

/**
 * Build an MVP matrix from model, view, and projection matrices.
 *
 * @param model - Model (world) matrix
 * @param view - View (camera) matrix
 * @param projection - Projection matrix
 * @returns Combined MVP matrix
 */
export function buildMVP(model: Mat4, view: Mat4, projection: Mat4): Mat4 {
	return mat4Multiply(projection, mat4Multiply(view, model));
}
