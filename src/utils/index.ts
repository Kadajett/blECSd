/**
 * Utility functions for blECSd
 * @module utils
 */

// Box rendering utilities
export type { BoxChars, Cell, CellBuffer, RenderBoxOptions } from './box';
export {
	BOX_ASCII,
	BOX_BOLD,
	BOX_DASHED,
	BOX_DOUBLE,
	BOX_ROUNDED,
	BOX_SINGLE,
	bufferToString,
	charsetToBoxChars,
	createCellBuffer,
	fillRect,
	renderBox,
	renderHLine,
	renderText,
	renderVLine,
} from './box';

// Text wrapping utilities
export type { TextAlign, WrapOptions } from './textWrap';
export {
	alignLine,
	getVisibleWidth,
	padHeight,
	stripAnsi,
	truncate,
	wordWrap,
	wrapText,
} from './textWrap';
