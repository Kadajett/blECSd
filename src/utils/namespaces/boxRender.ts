/**
 * Box rendering utilities namespace.
 *
 * @example
 * ```typescript
 * import { boxRender } from 'blecsd/utils';
 *
 * const buffer = boxRender.createCellBuffer(80, 24);
 * boxRender.renderBox(buffer, 0, 0, 20, 10, boxRender.BOX_SINGLE);
 * const output = boxRender.bufferToString(buffer);
 * ```
 */

import {
	BOX_ASCII,
	BOX_BOLD,
	BOX_DASHED,
	BOX_DOUBLE,
	BOX_ROUNDED,
	BOX_SINGLE,
	boxFillRect,
	bufferToString,
	charsetToBoxChars,
	createCellBuffer,
	renderBox,
	renderHLine,
	renderText,
	renderVLine,
} from '../box';

export const boxRender = Object.freeze({
	renderBox,
	renderHLine,
	renderVLine,
	renderText,
	createCellBuffer,
	bufferToString,
	boxFillRect,
	charsetToBoxChars,
	BOX_ASCII,
	BOX_BOLD,
	BOX_DASHED,
	BOX_DOUBLE,
	BOX_ROUNDED,
	BOX_SINGLE,
});

export type BoxRenderModule = typeof boxRender;
