/**
 * Color utilities namespace.
 *
 * @example
 * ```typescript
 * import { colorUtils } from 'blecsd/utils';
 *
 * const hex = colorUtils.colorToHex(255, 0, 0);
 * const color = colorUtils.hexToColor('#ff0000');
 * const packed = colorUtils.packColor(255, 0, 0);
 * ```
 */

import { colorToHex, hexToColor, packColor, parseColor, unpackColor } from '../color';

export const colorUtils = Object.freeze({
	colorToHex,
	hexToColor,
	packColor,
	unpackColor,
	parseColor,
});

export type ColorUtilsModule = typeof colorUtils;
