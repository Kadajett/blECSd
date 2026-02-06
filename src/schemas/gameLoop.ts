/**
 * Zod validation schemas for game loop configuration.
 *
 * Validates timing, fixed timestep, and FPS configuration
 * used by the game loop and scheduler.
 *
 * @module schemas/gameLoop
 */

import { z } from 'zod';

/**
 * Schema for fixed timestep mode configuration.
 *
 * Fixed timestep runs game logic at a consistent rate, independent
 * of the rendering frame rate. Essential for deterministic physics,
 * network synchronization, and replays.
 *
 * @example
 * ```typescript
 * import { FixedTimestepConfigSchema } from 'blecsd';
 *
 * const config = FixedTimestepConfigSchema.parse({
 *   tickRate: 60,
 *   maxUpdatesPerFrame: 5,
 *   interpolate: true,
 * });
 * ```
 */
export const FixedTimestepConfigSchema = z.object({
	tickRate: z.number().int().min(1).max(240),
	maxUpdatesPerFrame: z.number().int().min(1).max(30),
	interpolate: z.boolean(),
});

/**
 * Schema for game loop configuration options.
 *
 * Controls frame rate, timestep capping, and optional fixed
 * timestep mode for deterministic updates.
 *
 * @example
 * ```typescript
 * import { GameLoopOptionsSchema } from 'blecsd';
 *
 * const options = GameLoopOptionsSchema.parse({
 *   targetFPS: 60,
 *   maxDeltaTime: 0.1,
 * });
 * ```
 */
export const GameLoopOptionsSchema = z.object({
	targetFPS: z.number().min(0).max(240).optional(),
	fixedTimestep: z.boolean().optional(),
	maxDeltaTime: z.number().positive().max(1).optional(),
	fixedTimestepMode: FixedTimestepConfigSchema.optional(),
});

/**
 * Schema for loop performance statistics.
 *
 * Validates the shape of performance data returned by the game loop,
 * including FPS, frame time, tick counts, and interpolation state.
 *
 * @example
 * ```typescript
 * import { LoopStatsSchema } from 'blecsd';
 *
 * const stats = LoopStatsSchema.parse({
 *   fps: 60,
 *   frameTime: 16.67,
 *   frameCount: 3600,
 *   runningTime: 60,
 *   tickCount: 3600,
 *   ticksPerSecond: 60,
 *   interpolationAlpha: 0.5,
 *   skippedUpdates: 0,
 * });
 * ```
 */
export const LoopStatsSchema = z.object({
	fps: z.number().nonnegative(),
	frameTime: z.number().nonnegative(),
	frameCount: z.number().int().nonnegative(),
	runningTime: z.number().nonnegative(),
	tickCount: z.number().int().nonnegative(),
	ticksPerSecond: z.number().nonnegative(),
	interpolationAlpha: z.number().min(0).max(1),
	skippedUpdates: z.number().int().nonnegative(),
});
