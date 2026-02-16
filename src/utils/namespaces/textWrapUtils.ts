/**
 * Text wrapping utilities namespace.
 *
 * @example
 * ```typescript
 * import { textWrapUtils } from 'blecsd/utils';
 *
 * const wrapped = textWrapUtils.wordWrap(text, 80);
 * const truncated = textWrapUtils.truncate(text, 50);
 * const aligned = textWrapUtils.alignLine(text, 80, 'center');
 * ```
 */

import {
	alignLine,
	getVisibleWidth,
	padHeight,
	stripAnsi,
	truncate,
	wordWrap,
	wrapText,
} from '../textWrap';

export const textWrapUtils = Object.freeze({
	wordWrap,
	wrapText,
	truncate,
	alignLine,
	getVisibleWidth,
	stripAnsi,
	padHeight,
});

export type TextWrapUtilsModule = typeof textWrapUtils;
