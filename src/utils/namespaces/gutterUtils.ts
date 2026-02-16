/**
 * Line gutter utilities namespace.
 *
 * @example
 * ```typescript
 * import { gutterUtils } from 'blecsd/utils';
 *
 * const config = gutterUtils.createGutterConfig({ mode: 'absolute' });
 * const width = gutterUtils.computeGutterWidth(100);
 * const gutter = gutterUtils.computeVisibleGutter(config, 0, 50, 100);
 * ```
 */

import {
	computeDigitWidth,
	computeGutterWidth,
	computeVisibleGutter,
	createGutterConfig,
	formatLineNumber,
	gutterWidthChanged,
	renderGutterBlock,
} from '../lineGutter';

export const gutterUtils = Object.freeze({
	computeGutterWidth,
	computeVisibleGutter,
	formatLineNumber,
	renderGutterBlock,
	createGutterConfig,
	computeDigitWidth,
	gutterWidthChanged,
});

export type GutterUtilsModule = typeof gutterUtils;
