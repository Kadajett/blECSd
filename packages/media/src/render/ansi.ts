/**
 * ANSI image renderer for converting bitmap data to terminal-displayable cells.
 *
 * @module media/render/ansi
 */

import type { RGB } from 'blecsd/terminal';
import { asColor256, sgrBg256, sgrFg256 } from 'blecsd/terminal';

// Re-export helpers
export {
	blendWithBackground,
	luminanceToChar,
	rgbLuminance,
	rgbTo256Color,
	scaleBitmap,
} from './ansi-helpers';
// Re-export types
export type { AnsiRenderOptions, Bitmap, Cell, CellMap, RenderMode } from './ansi-types';
export { AnsiRenderOptionsSchema } from './ansi-types';

import { scaleBitmap } from './ansi-helpers';
import { renderAsciiMode, renderBrailleMode, renderColorMode } from './ansi-modes';
// Import internal dependencies
import type { AnsiRenderOptions, Bitmap, CellMap } from './ansi-types';

/**
 * Renders a bitmap to a grid of ANSI terminal cells.
 *
 * Supports three render modes:
 * - **color**: Uses upper-half-block characters with 256-color fg/bg to display
 *   two vertical pixels per cell
 * - **ascii**: Maps pixel luminance to ASCII characters for text-art output
 * - **braille**: Uses braille pattern characters for 2x4 sub-cell resolution
 *
 * If width/height options are provided, the bitmap is scaled to fit.
 *
 * @param bitmap - Source bitmap with RGBA pixel data
 * @param options - Render options (dimensions, mode, dithering)
 * @returns A CellMap containing the rendered terminal cells
 *
 * @example
 * ```typescript
 * import { renderToAnsi } from 'blecsd';
 *
 * const bitmap = { width: 100, height: 50, data: pixelData };
 * const cells = renderToAnsi(bitmap, { width: 80, height: 24, mode: 'color' });
 * ```
 */
export function renderToAnsi(bitmap: Bitmap, options?: AnsiRenderOptions): CellMap {
	const mode = options?.mode ?? 'color';
	const dither = options?.dither ?? false;
	const bg: RGB = options?.background ?? { r: 0, g: 0, b: 0 };

	const targetWidth = options?.width ?? bitmap.width;
	let targetHeight = options?.height;

	if (targetHeight !== undefined && mode === 'color') {
		targetHeight = targetHeight * 2;
	}
	if (targetHeight !== undefined && mode === 'braille') {
		targetHeight = targetHeight * 4;
	}
	const targetBrailleWidth = mode === 'braille' && options?.width ? options.width * 2 : undefined;

	const scaledWidth = targetBrailleWidth ?? targetWidth;
	const scaledHeight = targetHeight ?? bitmap.height;

	const scaled =
		scaledWidth !== bitmap.width || scaledHeight !== bitmap.height
			? scaleBitmap(bitmap, scaledWidth, scaledHeight)
			: bitmap;

	switch (mode) {
		case 'color':
			return renderColorMode(scaled, bg, dither);
		case 'ascii':
			return renderAsciiMode(scaled, bg);
		case 'braille':
			return renderBrailleMode(scaled, bg);
	}
}

/**
 * Converts a CellMap to a string containing ANSI escape sequences.
 *
 * Each cell is rendered with 256-color foreground and background escape codes.
 * Rows are separated by newlines. A reset sequence is appended at the end.
 *
 * @param cellMap - The rendered cell map to convert
 * @returns A string with ANSI escape sequences ready for terminal output
 *
 * @example
 * ```typescript
 * import { renderToAnsi, cellMapToString } from 'blecsd';
 *
 * const cells = renderToAnsi(bitmap, { mode: 'color' });
 * const output = cellMapToString(cells);
 * process.stdout.write(output);
 * ```
 */
export function cellMapToString(cellMap: CellMap): string {
	const lines: string[] = [];

	for (const row of cellMap.cells) {
		let line = '';
		let prevFg = -1;
		let prevBg = -1;

		for (const cell of row) {
			if (cell.fg !== prevFg || cell.bg !== prevBg) {
				line += `\x1b[${sgrFg256(asColor256(cell.fg))};${sgrBg256(asColor256(cell.bg))}m`;
				prevFg = cell.fg;
				prevBg = cell.bg;
			}
			line += cell.char;
		}
		lines.push(line);
	}

	return `${lines.join('\n')}\x1b[0m`;
}
