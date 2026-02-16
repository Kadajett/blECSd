/**
 * Color utilities namespace.
 *
 * @example
 * ```typescript
 * import { colors } from 'blecsd/utils';
 *
 * const hex = colors.colorToHex(255, 0, 0);
 * const color = colors.hexToColor('#ff0000');
 * const packed = colors.packColor(255, 0, 0);
 * ```
 */

import { colorToHex, hexToColor, packColor, parseColor, unpackColor } from '../color';

export const colors = Object.freeze({
	colorToHex,
	hexToColor,
	packColor,
	unpackColor,
	parseColor,
});

export type ColorsModule = typeof colors;
