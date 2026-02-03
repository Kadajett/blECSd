/**
 * Zod schema for the Viewport3D widget configuration.
 *
 * This is the high-level widget config that users interact with.
 * It combines camera, viewport, and appearance settings into one schema.
 *
 * @module 3d/schemas/viewport3d
 */

import { z } from 'zod';

/**
 * Configuration for the Viewport3D widget.
 * Combines camera, viewport, and appearance settings.
 *
 * @example
 * ```typescript
 * const config = Viewport3DWidgetConfigSchema.parse({
 *   left: 5, top: 2, width: 60, height: 20,
 *   fov: Math.PI / 3,
 *   backend: 'auto',
 * });
 * ```
 */
export const Viewport3DWidgetConfigSchema = z.object({
	/** Viewport left position in terminal cells. */
	left: z.number().int().nonnegative().default(0),
	/** Viewport top position in terminal cells. */
	top: z.number().int().nonnegative().default(0),
	/** Viewport width in terminal cells. */
	width: z.number().int().positive().default(80),
	/** Viewport height in terminal cells. */
	height: z.number().int().positive().default(24),

	/** Camera field of view in radians (perspective mode). */
	fov: z.number().positive().max(Math.PI).default(Math.PI / 3),
	/** Camera near clipping plane. */
	near: z.number().positive().default(0.1),
	/** Camera far clipping plane. */
	far: z.number().positive().default(1000),
	/** Camera projection mode. */
	projectionMode: z.enum(['perspective', 'orthographic']).default('perspective'),

	/** Rendering backend. */
	backend: z.enum(['auto', 'braille', 'halfblock', 'sixel', 'kitty']).default('auto'),

	/** Label text displayed on the viewport border. */
	label: z.string().optional(),
}).refine(data => data.near < data.far, {
	message: 'Near plane must be less than far plane',
});
export type Viewport3DWidgetConfig = z.input<typeof Viewport3DWidgetConfigSchema>;
