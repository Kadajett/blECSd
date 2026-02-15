/**
 * Zod validation schemas for 3D math types.
 * @module 3d/schemas/math
 */

import { z } from 'zod';

/**
 * Vec3 as a tuple of 3 numbers.
 */
export const Vec3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);

/**
 * Vec3 input that accepts either tuple or object form.
 * Use at API boundaries to be flexible with user input.
 */
export const Vec3InputSchema = z.union([
	Vec3Schema,
	z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
]);
export type Vec3Input = z.infer<typeof Vec3InputSchema>;

/**
 * Mat4 must be a Float32Array of exactly 16 elements (column-major).
 */
export const Mat4Schema = z
	.instanceof(Float32Array)
	.refine((arr) => arr.length === 16, { message: 'Mat4 must be Float32Array of length 16' });

/**
 * Euler angles in radians for rotation.
 */
export const EulerAnglesSchema = z.object({
	x: z.number().finite().describe('Rotation around X axis in radians'),
	y: z.number().finite().describe('Rotation around Y axis in radians'),
	z: z.number().finite().describe('Rotation around Z axis in radians'),
});
export type EulerAngles = z.infer<typeof EulerAnglesSchema>;

/**
 * Perspective projection configuration.
 */
export const PerspectiveConfigSchema = z
	.object({
		fov: z.number().positive().max(Math.PI).describe('Field of view in radians'),
		aspect: z.number().positive().describe('Width / height ratio'),
		near: z.number().positive().describe('Near clipping plane'),
		far: z.number().positive().describe('Far clipping plane'),
	})
	.refine((data) => data.near < data.far, {
		message: 'Near plane must be less than far plane',
	});
export type PerspectiveConfig = z.infer<typeof PerspectiveConfigSchema>;

/**
 * Orthographic projection configuration.
 */
export const OrthographicConfigSchema = z
	.object({
		left: z.number().finite(),
		right: z.number().finite(),
		bottom: z.number().finite(),
		top: z.number().finite(),
		near: z.number().finite(),
		far: z.number().finite(),
	})
	.refine((data) => data.left < data.right && data.bottom < data.top && data.near < data.far, {
		message: 'Invalid orthographic bounds: left < right, bottom < top, near < far required',
	});
export type OrthographicConfig = z.infer<typeof OrthographicConfigSchema>;

/**
 * Viewport transform configuration (NDC to pixel coords).
 */
export const ViewportConfigSchema = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});
export type ViewportConfig = z.infer<typeof ViewportConfigSchema>;

/**
 * 2D clip rectangle for Cohen-Sutherland clipping.
 */
export const ClipRectSchema = z
	.object({
		xMin: z.number().finite(),
		xMax: z.number().finite(),
		yMin: z.number().finite(),
		yMax: z.number().finite(),
	})
	.refine((d) => d.xMin < d.xMax && d.yMin < d.yMax, {
		message: 'Invalid clip rectangle: xMin < xMax and yMin < yMax required',
	});
export type ClipRect = z.infer<typeof ClipRectSchema>;
