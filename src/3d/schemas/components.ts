/**
 * Zod schemas for 3D ECS components.
 * @module 3d/schemas/components
 */

import { z } from 'zod';

/**
 * Configuration for a 3D transform.
 * Translation (t), rotation in radians (r), scale (s).
 *
 * @example
 * ```typescript
 * const config = Transform3DConfigSchema.parse({ tx: 0, ty: 1, tz: -5 });
 * ```
 */
export const Transform3DConfigSchema = z.object({
	tx: z.number().default(0),
	ty: z.number().default(0),
	tz: z.number().default(0),
	rx: z.number().default(0),
	ry: z.number().default(0),
	rz: z.number().default(0),
	sx: z.number().default(1),
	sy: z.number().default(1),
	sz: z.number().default(1),
}).describe('3D transform: translation (t), rotation in radians (r), scale (s)');
export type Transform3DConfig = z.input<typeof Transform3DConfigSchema>;

/**
 * Configuration for a 3D camera.
 *
 * @example
 * ```typescript
 * const config = Camera3DConfigSchema.parse({ fov: Math.PI / 3, near: 0.1, far: 100 });
 * ```
 */
export const Camera3DConfigSchema = z.object({
	fov: z.number().positive().max(Math.PI).default(Math.PI / 3),
	near: z.number().positive().default(0.1),
	far: z.number().positive().default(100),
	aspect: z.number().positive().default(16 / 9),
	projectionMode: z.enum(['perspective', 'orthographic']).default('perspective'),
}).refine((data) => data.near < data.far, { message: 'near must be less than far' });
export type Camera3DConfig = z.input<typeof Camera3DConfigSchema>;

/**
 * Configuration for a 3D material.
 *
 * @example
 * ```typescript
 * const config = Material3DConfigSchema.parse({ wireColor: 0x00ff00 });
 * ```
 */
export const Material3DConfigSchema = z.object({
	wireColor: z.number().int().min(0).max(0xffffff).default(0xffffff),
	fillColor: z.number().int().min(0).max(0xffffff).default(0x808080),
	renderMode: z.enum(['wireframe', 'filled', 'both']).default('wireframe'),
	backfaceCull: z.boolean().default(true),
	flatShading: z.boolean().default(false),
	antiAlias: z.boolean().default(false),
}).describe('3D material configuration');
export type Material3DConfig = z.input<typeof Material3DConfigSchema>;

/**
 * Configuration for a 3D viewport.
 *
 * @example
 * ```typescript
 * const config = Viewport3DConfigSchema.parse({
 *   left: 5, top: 2, width: 60, height: 20,
 *   cameraEntity: cameraEid,
 * });
 * ```
 */
export const Viewport3DConfigSchema = z.object({
	left: z.number().int().min(0).default(0),
	top: z.number().int().min(0).default(0),
	width: z.number().int().positive().default(80),
	height: z.number().int().positive().default(24),
	cameraEntity: z.number().int().min(0),
	backendType: z.enum(['auto', 'braille', 'halfblock', 'sextant', 'sixel', 'kitty']).default('auto'),
}).describe('3D viewport configuration');
export type Viewport3DConfig = z.input<typeof Viewport3DConfigSchema>;

/**
 * Configuration for 3D animation.
 * Supports continuous rotation and orbital movement.
 *
 * @example
 * ```typescript
 * const config = Animation3DConfigSchema.parse({ rotateSpeed: { y: Math.PI } });
 * ```
 */
export const Animation3DConfigSchema = z.object({
	rotateSpeed: z.object({
		x: z.number().default(0),
		y: z.number().default(0),
		z: z.number().default(0),
	}).default(() => ({ x: 0, y: 0, z: 0 })).describe('Radians per second of continuous rotation'),
	orbitCenter: z.tuple([z.number(), z.number(), z.number()]).optional()
		.describe('Point to orbit around'),
	orbitSpeed: z.number().default(0).describe('Radians per second of orbit'),
	orbitRadius: z.number().positive().optional().describe('Distance from orbit center'),
}).describe('3D animation configuration');
export type Animation3DConfig = z.input<typeof Animation3DConfigSchema>;

/**
 * Configuration for mouse-based 3D camera interaction.
 *
 * @example
 * ```typescript
 * const config = MouseInteraction3DConfigSchema.parse({
 *   rotationSensitivity: 0.01,
 *   zoomSensitivity: 0.5,
 * });
 * ```
 */
export const MouseInteraction3DConfigSchema = z.object({
	rotationSensitivity: z.number().positive().default(0.01)
		.describe('Radians per pixel of mouse movement'),
	zoomSensitivity: z.number().positive().default(0.5)
		.describe('Units per scroll tick'),
	zoomMin: z.number().positive().default(1),
	zoomMax: z.number().positive().default(100),
	invertY: z.boolean().default(false),
}).describe('Mouse-based 3D camera interaction');
export type MouseInteraction3DConfig = z.input<typeof MouseInteraction3DConfigSchema>;
