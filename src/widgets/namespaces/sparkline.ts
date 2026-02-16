/**
 * Sparkline widget namespace.
 *
 * @example
 * ```typescript
 * import { sparkline } from 'blecsd/widgets';
 * const sp = sparkline.create(world, { data: [1, 2, 3, 4, 5] });
 * ```
 */
import { createSparkline, isSparkline, resetSparklineStore } from '../sparkline';

export const sparkline = Object.freeze({
	create: createSparkline,
	is: isSparkline,
	resetStore: resetSparklineStore,
});

export type SparklineModule = typeof sparkline;
