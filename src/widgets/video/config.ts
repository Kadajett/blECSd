/**
 * Configuration validation for Video widget.
 * @module widgets/video/config
 */

import { z } from 'zod';

/**
 * Zod schema for video widget configuration.
 *
 * @example
 * ```typescript
 * import { VideoConfigSchema } from 'blecsd';
 *
 * const result = VideoConfigSchema.safeParse({
 *   path: '/path/to/video.mp4',
 *   player: 'mpv',
 * });
 * ```
 */
export const VideoConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(80),
	height: z.number().int().positive().default(24),
	path: z.string().default(''),
	player: z.enum(['mpv', 'mplayer']).optional(),
	outputDriver: z.enum(['caca', 'tct', 'sixel']).default('caca'),
	speed: z.number().positive().default(1.0),
	autoPlay: z.boolean().default(false),
	loop: z.boolean().default(false),
	mute: z.boolean().default(true),
	visible: z.boolean().default(true),
});
