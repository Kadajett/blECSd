/**
 * BarChart widget namespace.
 *
 * @example
 * ```typescript
 * import { barChart } from 'blecsd/widgets';
 * const chart = barChart.create(world, { series: [...] });
 * ```
 */
import {
	createBarChart,
	HORIZONTAL_BLOCKS,
	isBarChart,
	resetBarChartStore,
	VERTICAL_BLOCKS,
} from '../barChart';

export const barChart = Object.freeze({
	create: createBarChart,
	is: isBarChart,
	resetStore: resetBarChartStore,
	HORIZONTAL_BLOCKS,
	VERTICAL_BLOCKS,
});

export type BarChartModule = typeof barChart;
