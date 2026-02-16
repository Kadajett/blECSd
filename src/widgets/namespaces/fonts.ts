/**
 * Fonts namespace.
 *
 * @example
 * ```typescript
 * import { fonts } from 'blecsd/widgets';
 * const font = fonts.load('standard');
 * const bitmap = fonts.getCharBitmap(font, 'A');
 * const rendered = fonts.renderChar(font, 'A', { spacing: 1 });
 * ```
 */
import { createFontNotFoundError, getCharBitmap, loadFont, renderChar } from '../fonts';

export const fonts = Object.freeze({
	load: loadFont,
	getCharBitmap,
	renderChar,
	createFontNotFoundError,
});

export type FontsModule = typeof fonts;
