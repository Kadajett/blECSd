/**
 * Zod schemas for the pixel rasterizer subsystem.
 * @module 3d/schemas/rasterizer
 */

import { z } from 'zod';

/**
 * Configuration for creating a pixel framebuffer.
 *
 * @example
 * ```typescript
 * const config = PixelBufferConfigSchema.parse({ width: 400, height: 200 });
 * ```
 */
export const PixelBufferConfigSchema = z.object({
	width: z.number().int().positive().max(4096).describe('Buffer width in pixels'),
	height: z.number().int().positive().max(4096).describe('Buffer height in pixels'),
	enableDepthBuffer: z.boolean().default(true),
});
export type PixelBufferConfig = z.input<typeof PixelBufferConfigSchema>;

/**
 * An RGBA color with components in the range [0, 255].
 *
 * @example
 * ```typescript
 * const red = RGBAColorSchema.parse({ r: 255, g: 0, b: 0 });
 * // red.a defaults to 255
 * ```
 */
/**
 * A line endpoint with position, optional depth, and color.
 *
 * @example
 * ```typescript
 * const endpoint = LineEndpointSchema.parse({ x: 10, y: 20, r: 255, g: 0, b: 0 });
 * ```
 */
export const LineEndpointSchema = z.object({
	x: z.number(),
	y: z.number(),
	depth: z.number().min(0).max(1).optional(),
	r: z.number().int().min(0).max(255),
	g: z.number().int().min(0).max(255),
	b: z.number().int().min(0).max(255),
	a: z.number().int().min(0).max(255).default(255),
});
export type LineEndpoint = z.input<typeof LineEndpointSchema>;

export const RGBAColorSchema = z.object({
	r: z.number().int().min(0).max(255),
	g: z.number().int().min(0).max(255),
	b: z.number().int().min(0).max(255),
	a: z.number().int().min(0).max(255).default(255),
});
export type RGBAColor = z.infer<typeof RGBAColorSchema>;

/**
 * A triangle vertex with position, depth, and color.
 *
 * @example
 * ```typescript
 * const vertex = TriangleVertexSchema.parse({ x: 10, y: 20, depth: 0.5, r: 255, g: 0, b: 0 });
 * ```
 */
export const TriangleVertexSchema = z.object({
	x: z.number(),
	y: z.number(),
	depth: z.number().min(0).max(1),
	r: z.number().int().min(0).max(255),
	g: z.number().int().min(0).max(255),
	b: z.number().int().min(0).max(255),
	a: z.number().int().min(0).max(255).default(255),
});
export type TriangleVertex = z.input<typeof TriangleVertexSchema>;

/**
 * A directional light source for flat shading.
 *
 * @example
 * ```typescript
 * const light = DirectionalLightSchema.parse({
 *   direction: [0, -1, 0],
 *   intensity: 0.8,
 * });
 * ```
 */
export const DirectionalLightSchema = z.object({
	direction: z.tuple([z.number(), z.number(), z.number()]).describe('Normalized light direction'),
	intensity: z.number().min(0).max(1).default(1.0),
	color: RGBAColorSchema.optional(),
});
export type DirectionalLight = z.input<typeof DirectionalLightSchema>;

/**
 * An ambient light for baseline illumination.
 *
 * @example
 * ```typescript
 * const ambient = AmbientLightSchema.parse({ intensity: 0.2 });
 * ```
 */
export const AmbientLightSchema = z.object({
	intensity: z.number().min(0).max(1).default(0.1),
	color: RGBAColorSchema.optional(),
});
export type AmbientLight = z.input<typeof AmbientLightSchema>;
