/**
 * Chart utilities namespace.
 *
 * @example
 * ```typescript
 * import { chartUtils } from 'blecsd/widgets';
 * const char = chartUtils.brailleChar(0b11110000);
 * const scaled = chartUtils.scaleValue(50, 0, 100, 0, 10);
 * const color = chartUtils.getChartColor(2);
 * ```
 */
import {
	BRAILLE_BASE,
	BRAILLE_DOTS,
	brailleChar,
	brailleFillPattern,
	CHART_COLORS,
	calculateTickInterval,
	combineBrailleDots,
	formatNumber,
	formatPercentage,
	generateTicks,
	getChartColor,
	interpolateChartColor,
	renderBrailleBar,
	renderBrailleGradientBar,
	renderXAxisLabel,
	renderYAxisLabel,
	scaleValue,
} from '../chartUtils';

export const chartUtils = Object.freeze({
	brailleChar,
	brailleFillPattern,
	combineBrailleDots,
	scaleValue,
	getChartColor,
	interpolateChartColor,
	formatNumber,
	formatPercentage,
	calculateTickInterval,
	generateTicks,
	renderBrailleBar,
	renderBrailleGradientBar,
	renderXAxisLabel,
	renderYAxisLabel,
	BRAILLE_BASE,
	BRAILLE_DOTS,
	CHART_COLORS,
});

export type ChartUtilsModule = typeof chartUtils;
