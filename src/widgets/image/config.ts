/**
 * Image Widget Configuration
 *
 * Zod schemas for runtime validation of image configuration.
 *
 * @module widgets/image/config
 */

import { z } from 'zod';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for image widget configuration.
 *
 * @example
 * ```typescript
 * import { ImageConfigSchema } from 'blecsd';
 *
 * const result = ImageConfigSchema.safeParse({ type: 'ansi', width: 40 });
 * ```
 */
export const ImageConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	type: z.enum(['ansi', 'overlay']).default('ansi'),
	bitmap: z
		.object({
			width: z.number().int().nonnegative(),
			height: z.number().int().nonnegative(),
			data: z.instanceof(Uint8Array),
		})
		.optional(),
	renderMode: z.enum(['color', 'ascii', 'braille']).default('color'),
	dither: z.boolean().default(false),
	visible: z.boolean().default(true),
	preserveAspectRatio: z.boolean().default(true),
});

/**
 * Zod schema for animated image configuration.
 *
 * @example
 * ```typescript
 * import { AnimatedImageConfigSchema } from 'blecsd';
 *
 * const result = AnimatedImageConfigSchema.safeParse({ frames: [...], frameDelays: [100, 100] });
 * ```
 */
export const AnimatedImageConfigSchema = ImageConfigSchema.extend({
	frames: z.array(
		z.object({
			width: z.number().int().nonnegative(),
			height: z.number().int().nonnegative(),
			data: z.instanceof(Uint8Array),
		}),
	),
	frameDelays: z.array(z.number().positive()),
	loopCount: z.number().int().nonnegative().default(1),
}).refine((data) => data.frames.length === data.frameDelays.length, {
	message: 'frames and frameDelays arrays must have the same length',
});
