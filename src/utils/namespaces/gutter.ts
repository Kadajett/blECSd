/**
 * Line gutter utilities namespace.
 *
 * @example
 * ```typescript
 * import { gutter } from 'blecsd/utils';
 *
 * const config = gutter.createGutterConfig({ mode: 'absolute' });
 * const width = gutter.computeGutterWidth(100);
 * const gutter = gutter.computeVisibleGutter(config, 0, 50, 100);
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

export const gutter = Object.freeze({
	computeGutterWidth,
	computeVisibleGutter,
	formatLineNumber,
	renderGutterBlock,
	createGutterConfig,
	computeDigitWidth,
	gutterWidthChanged,
});

export type GutterModule = typeof gutter;
