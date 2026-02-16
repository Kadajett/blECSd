/**
 * Text wrapping utilities namespace.
 *
 * @example
 * ```typescript
 * import { textWrap } from 'blecsd/utils';
 *
 * const wrapped = textWrap.wordWrap(text, 80);
 * const truncated = textWrap.truncate(text, 50);
 * const aligned = textWrap.alignLine(text, 80, 'center');
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

export const textWrap = Object.freeze({
	wordWrap,
	wrapText,
	truncate,
	alignLine,
	getVisibleWidth,
	stripAnsi,
	padHeight,
});

export type TextWrapModule = typeof textWrap;
