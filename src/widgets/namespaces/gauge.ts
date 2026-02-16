/**
 * Gauge widget namespace.
 *
 * @example
 * ```typescript
 * import { gauge } from 'blecsd/widgets';
 * const g = gauge.create(world, { min: 0, max: 100, value: 50 });
 * ```
 */
import { createGauge, isGauge, resetGaugeStore } from '../gauge';

export const gauge = Object.freeze({
	create: createGauge,
	is: isGauge,
	resetStore: resetGaugeStore,
});

export type GaugeModule = typeof gauge;
