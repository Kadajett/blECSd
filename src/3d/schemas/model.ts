/**
 * Zod schemas for 3D model loading and mesh primitives.
 * @module 3d/schemas/model
 */

import { z } from 'zod';

/**
 * Options for loading an OBJ file.
 */
export const ObjLoadOptionsSchema = z.object({
	name: z.string().min(1).describe('Name for the mesh in meshStore'),
	flipYZ: z.boolean().default(false).describe('Swap Y and Z axes (some models use Z-up)'),
	scale: z.number().positive().default(1.0).describe('Uniform scale factor'),
	centerOrigin: z.boolean().default(true).describe('Center model at origin'),
});
export type ObjLoadOptions = z.input<typeof ObjLoadOptionsSchema>;

/**
 * Options for creating a cube mesh primitive.
 */
export const CubeMeshOptionsSchema = z.object({
	size: z.number().positive().default(1).describe('Half-extent of cube'),
	name: z.string().default('cube'),
});
export type CubeMeshOptions = z.input<typeof CubeMeshOptionsSchema>;

/**
 * Options for creating a sphere mesh primitive.
 */
export const SphereMeshOptionsSchema = z.object({
	radius: z.number().positive().default(1),
	widthSegments: z.number().int().min(3).max(128).default(16),
	heightSegments: z.number().int().min(2).max(64).default(12),
	name: z.string().default('sphere'),
});
export type SphereMeshOptions = z.input<typeof SphereMeshOptionsSchema>;

/**
 * Options for creating a plane mesh primitive.
 */
export const PlaneMeshOptionsSchema = z.object({
	width: z.number().positive().default(2),
	height: z.number().positive().default(2),
	widthSegments: z.number().int().min(1).max(128).default(1),
	heightSegments: z.number().int().min(1).max(128).default(1),
	name: z.string().default('plane'),
});
export type PlaneMeshOptions = z.input<typeof PlaneMeshOptionsSchema>;

/**
 * Options for creating a cylinder mesh primitive.
 */
export const CylinderMeshOptionsSchema = z.object({
	radiusTop: z.number().nonnegative().default(1),
	radiusBottom: z.number().nonnegative().default(1),
	height: z.number().positive().default(2),
	segments: z.number().int().min(3).max(128).default(16),
	name: z.string().default('cylinder'),
}).refine((d) => d.radiusTop > 0 || d.radiusBottom > 0, {
	message: 'At least one radius must be positive',
});
export type CylinderMeshOptions = z.input<typeof CylinderMeshOptionsSchema>;
