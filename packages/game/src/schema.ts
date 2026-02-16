/**
 * Game configuration schema and types.
 *
 * @module game/schema
 */

import { z } from 'zod';

/**
 * Game configuration schema.
 */
export const GameConfigSchema = z.object({
	/**
	 * Game title (displayed in terminal title bar if supported).
	 */
	title: z.string().optional(),

	/**
	 * Terminal width in characters.
	 * @default 80
	 */
	width: z.number().int().positive().optional().default(80),

	/**
	 * Terminal height in characters.
	 * @default 24
	 */
	height: z.number().int().positive().optional().default(24),

	/**
	 * Target frames per second.
	 * @default 60
	 */
	targetFPS: z.number().positive().optional().default(60),

	/**
	 * Whether to enable mouse input.
	 * @default true
	 */
	mouse: z.boolean().optional().default(true),

	/**
	 * Whether to use alternate screen buffer.
	 * @default true
	 */
	alternateScreen: z.boolean().optional().default(true),

	/**
	 * Whether to hide the cursor.
	 * @default true
	 */
	hideCursor: z.boolean().optional().default(true),

	/**
	 * Fixed timestep configuration for physics.
	 */
	fixedTimestep: z
		.object({
			tickRate: z.number().positive().optional().default(60),
			maxUpdatesPerFrame: z.number().positive().optional().default(5),
			interpolate: z.boolean().optional().default(true),
		})
		.optional(),
});

/**
 * Game configuration type.
 */
export type GameConfig = z.input<typeof GameConfigSchema>;

/**
 * Resolved game configuration with defaults applied.
 */
export type ResolvedGameConfig = z.output<typeof GameConfigSchema>;
