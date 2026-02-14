/**
 * Slow frame detection and warning utilities.
 *
 * Tracks frame times and detects when frames exceed the target budget.
 * Useful for identifying performance issues and frame drops.
 *
 * @module debug/slowFrame
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for slow frame detection.
 */
export interface SlowFrameConfig {
	/** Frame budget in milliseconds (default: 16.67 for 60fps) */
	readonly budgetMs: number;
	/** Number of frames to track in history (default: 120) */
	readonly historySize: number;
	/** Multiplier above budget to trigger warning (default: 1.5) */
	readonly warningThreshold: number;
}

/**
 * Statistics about frame performance.
 */
export interface SlowFrameStats {
	/** Worst (slowest) frame time in milliseconds */
	readonly worstFrameMs: number;
	/** Average frame time in milliseconds */
	readonly averageFrameMs: number;
	/** Count of frames that exceeded the warning threshold */
	readonly slowFrameCount: number;
	/** Total frames tracked */
	readonly totalFrames: number;
	/** Whether the most recent frame was slow */
	readonly isCurrentlySlow: boolean;
	/** Frame time history (last N frames) */
	readonly histogram: readonly number[];
}

/**
 * Slow frame detector instance.
 */
export interface SlowFrameDetector {
	/** Check if a frame time exceeds the threshold. Returns true if frame was slow. */
	readonly check: (deltaMs: number) => boolean;
	/** Get current frame statistics */
	readonly getStats: () => SlowFrameStats;
	/** Reset all tracked data */
	readonly reset: () => void;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Zod schema for SlowFrameConfig validation.
 *
 * @example
 * ```typescript
 * import { SlowFrameConfigSchema } from 'blecsd/debug';
 *
 * const config = SlowFrameConfigSchema.parse({
 *   budgetMs: 16.67,
 *   historySize: 120,
 *   warningThreshold: 1.5,
 * });
 * ```
 */
export const SlowFrameConfigSchema = z.object({
	budgetMs: z.number().positive().finite(),
	historySize: z.number().int().positive(),
	warningThreshold: z.number().positive().finite(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: SlowFrameConfig = {
	budgetMs: 16.67, // 60fps
	historySize: 120, // 2 seconds at 60fps
	warningThreshold: 1.5, // 50% over budget
};

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Creates a slow frame detector.
 *
 * Tracks frame times and detects when frames exceed the target budget.
 * Maintains a rolling history of frame times for analysis.
 *
 * @param config - Optional configuration
 * @returns Slow frame detector instance
 *
 * @example
 * ```typescript
 * import { createSlowFrameDetector } from 'blecsd/debug';
 *
 * const detector = createSlowFrameDetector({
 *   budgetMs: 16.67, // 60fps
 *   historySize: 120,
 *   warningThreshold: 1.5,
 * });
 *
 * // In game loop
 * game.onUpdate((deltaMs) => {
 *   const isSlow = detector.check(deltaMs);
 *   if (isSlow) {
 *     const stats = detector.getStats();
 *     console.warn(`Slow frame: ${deltaMs.toFixed(2)}ms`);
 *   }
 * });
 * ```
 */
export function createSlowFrameDetector(config?: Partial<SlowFrameConfig>): SlowFrameDetector {
	const cfg: SlowFrameConfig = { ...DEFAULT_CONFIG, ...config };
	const threshold = cfg.budgetMs * cfg.warningThreshold;

	const histogram: number[] = [];
	let totalTime = 0;
	let worstFrame = 0;
	let slowCount = 0;
	let totalFrames = 0;
	let lastWasSlow = false;

	return {
		check(deltaMs: number): boolean {
			// Add to histogram
			histogram.push(deltaMs);
			totalTime += deltaMs;
			totalFrames++;

			// Update worst frame
			if (deltaMs > worstFrame) {
				worstFrame = deltaMs;
			}

			// Trim histogram to max size
			while (histogram.length > cfg.historySize) {
				const removed = histogram.shift();
				if (removed !== undefined) {
					totalTime -= removed;
				}
			}

			// Check if current frame is slow
			const isSlow = deltaMs > threshold;
			if (isSlow) {
				slowCount++;
			}
			lastWasSlow = isSlow;

			return isSlow;
		},

		getStats(): SlowFrameStats {
			const historyLength = histogram.length;
			const averageFrameMs = historyLength > 0 ? totalTime / historyLength : 0;

			return {
				worstFrameMs: worstFrame,
				averageFrameMs,
				slowFrameCount: slowCount,
				totalFrames,
				isCurrentlySlow: lastWasSlow,
				histogram: [...histogram],
			};
		},

		reset() {
			histogram.length = 0;
			totalTime = 0;
			worstFrame = 0;
			slowCount = 0;
			totalFrames = 0;
			lastWasSlow = false;
		},
	};
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders a slow frame warning message with ANSI formatting.
 *
 * Returns an empty string if the frame is not currently slow.
 * Returns a red "SLOW FRAME" warning with timing details if slow.
 *
 * @param stats - Frame statistics from detector
 * @returns ANSI-formatted warning string or empty string
 *
 * @example
 * ```typescript
 * import { createSlowFrameDetector, renderSlowFrameWarning } from 'blecsd/debug';
 *
 * const detector = createSlowFrameDetector();
 *
 * // In game loop
 * game.onUpdate((deltaMs) => {
 *   detector.check(deltaMs);
 *   const warning = renderSlowFrameWarning(detector.getStats());
 *   if (warning) {
 *     console.log(warning);
 *   }
 * });
 * ```
 */
export function renderSlowFrameWarning(stats: SlowFrameStats): string {
	if (!stats.isCurrentlySlow) {
		return '';
	}

	const lastFrame = stats.histogram[stats.histogram.length - 1] ?? 0;
	const red = '\x1b[31m';
	const bold = '\x1b[1m';
	const reset = '\x1b[0m';

	return `${bold}${red}⚠ SLOW FRAME${reset} ${lastFrame.toFixed(2)}ms (avg: ${stats.averageFrameMs.toFixed(2)}ms, worst: ${stats.worstFrameMs.toFixed(2)}ms)`;
}
