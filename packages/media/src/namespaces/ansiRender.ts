/**
 * ANSI rendering namespace for converting bitmaps to terminal output.
 *
 * @example
 * ```typescript
 * import { ansiRender } from '@blecsd/media';
 *
 * const bitmap = { width: 100, height: 50, data: new Uint8Array(...) };
 * const cellMap = ansiRender.renderToAnsi(bitmap, { mode: '256-color' });
 * const output = ansiRender.cellMapToString(cellMap);
 * ```
 */

import {
	blendWithBackground,
	cellMapToString,
	luminanceToChar,
	renderToAnsi,
	rgbLuminance,
	rgbTo256Color,
	scaleBitmap,
} from '../render';

export const ansiRender = Object.freeze({
	renderToAnsi,
	cellMapToString,
	scaleBitmap,
	rgbTo256Color,
	rgbLuminance,
	luminanceToChar,
	blendWithBackground,
});

export type AnsiRenderModule = typeof ansiRender;
