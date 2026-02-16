/**
 * LineChart widget namespace.
 *
 * @example
 * ```typescript
 * import { lineChart } from 'blecsd/widgets';
 * const chart = lineChart.create(world, { series: [...] });
 * ```
 */
import { createLineChart, isLineChart, resetLineChartStore } from '../lineChart';

export const lineChart = Object.freeze({
	create: createLineChart,
	is: isLineChart,
	resetStore: resetLineChartStore,
});

export type LineChartModule = typeof lineChart;
