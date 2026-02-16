/**
 * ANSI rendering mode implementations.
 *
 * @module media/render/ansi-modes
 */

import type { RGB } from 'blecsd/terminal';
import { asColor256, rgbToColor256 } from 'blecsd/terminal';
import { applyDithering, luminanceToChar, resolvePixel, rgbLuminance } from './ansi-helpers';
import type { Bitmap, Cell, CellMap } from './ansi-types';
import { BRAILLE_MAP, BRAILLE_OFFSET, UPPER_HALF_BLOCK } from './ansi-types';

/**
 * Renders a bitmap in 256-color mode using upper-half-block characters.
 */
export function renderColorMode(bitmap: Bitmap, bg: RGB, dither: boolean): CellMap {
	const cellHeight = Math.ceil(bitmap.height / 2);
	const cellWidth = bitmap.width;

	if (dither) {
		return renderColorModeDithered(bitmap, bg, cellWidth, cellHeight);
	}

	const cells: Cell[][] = [];
	for (let cy = 0; cy < cellHeight; cy++) {
		const row: Cell[] = [];
		for (let cx = 0; cx < cellWidth; cx++) {
			const topY = cy * 2;
			const bottomY = cy * 2 + 1;

			const topRgb = resolvePixel(bitmap, cx, topY, bg);
			const bottomRgb = bottomY < bitmap.height ? resolvePixel(bitmap, cx, bottomY, bg) : bg;

			const fg = rgbToColor256(topRgb) as number;
			const bgColor = rgbToColor256(bottomRgb) as number;
			row.push({ char: UPPER_HALF_BLOCK, fg, bg: bgColor });
		}
		cells.push(row);
	}

	return { width: cellWidth, height: cellHeight, cells };
}

/**
 * Renders color mode with Floyd-Steinberg dithering.
 */
function renderColorModeDithered(
	bitmap: Bitmap,
	bg: RGB,
	cellWidth: number,
	cellHeight: number,
): CellMap {
	const buffer: Array<{ r: number; g: number; b: number }> = [];
	for (let y = 0; y < bitmap.height; y++) {
		for (let x = 0; x < bitmap.width; x++) {
			const rgb = resolvePixel(bitmap, x, y, bg);
			buffer.push({ r: rgb.r, g: rgb.g, b: rgb.b });
		}
	}

	applyDithering(buffer, bitmap.width, bitmap.height);

	const cells: Cell[][] = [];
	for (let cy = 0; cy < cellHeight; cy++) {
		const row: Cell[] = [];
		for (let cx = 0; cx < cellWidth; cx++) {
			const topY = cy * 2;
			const bottomY = cy * 2 + 1;

			const topPixel = buffer[topY * bitmap.width + cx] ?? { r: 0, g: 0, b: 0 };
			const bottomPixel =
				bottomY < bitmap.height
					? (buffer[bottomY * bitmap.width + cx] ?? { r: 0, g: 0, b: 0 })
					: bg;

			const fg = rgbToColor256(topPixel) as number;
			const bgColor = rgbToColor256(bottomPixel) as number;
			row.push({ char: UPPER_HALF_BLOCK, fg, bg: bgColor });
		}
		cells.push(row);
	}

	return { width: cellWidth, height: cellHeight, cells };
}

/**
 * Renders a bitmap in ASCII art mode using luminance-based characters.
 */
export function renderAsciiMode(bitmap: Bitmap, bg: RGB): CellMap {
	const cells: Cell[][] = [];

	for (let y = 0; y < bitmap.height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < bitmap.width; x++) {
			const rgb = resolvePixel(bitmap, x, y, bg);
			const lum = rgbLuminance(rgb.r, rgb.g, rgb.b);
			const char = luminanceToChar(lum);
			const fg = rgbToColor256(rgb) as number;
			row.push({ char, fg, bg: 0 });
		}
		cells.push(row);
	}

	return { width: bitmap.width, height: bitmap.height, cells };
}

/**
 * Accumulator for braille cell computation.
 */
interface BrailleAccum {
	pattern: number;
	totalR: number;
	totalG: number;
	totalB: number;
	count: number;
}

/**
 * Computes the braille pattern and average color for a single cell's 2x4 pixel grid.
 */
function computeBrailleCell(
	bitmap: Bitmap,
	cx: number,
	cy: number,
	bg: RGB,
	threshold: number,
): BrailleAccum {
	const accum: BrailleAccum = { pattern: 0, totalR: 0, totalG: 0, totalB: 0, count: 0 };

	for (let dy = 0; dy < 4; dy++) {
		for (let dx = 0; dx < 2; dx++) {
			const px = cx * 2 + dx;
			const py = cy * 4 + dy;
			if (px >= bitmap.width || py >= bitmap.height) continue;

			const rgb = resolvePixel(bitmap, px, py, bg);
			const lum = rgbLuminance(rgb.r, rgb.g, rgb.b);

			if (lum >= threshold) {
				const brailleRow = BRAILLE_MAP[dy];
				if (brailleRow) {
					accum.pattern |= brailleRow[dx] ?? 0;
				}
			}

			accum.totalR += rgb.r;
			accum.totalG += rgb.g;
			accum.totalB += rgb.b;
			accum.count++;
		}
	}

	return accum;
}

/**
 * Converts a braille accumulator to a Cell.
 */
function brailleAccumToCell(accum: BrailleAccum): Cell {
	const char = String.fromCodePoint(BRAILLE_OFFSET + accum.pattern);
	const avgColor =
		accum.count > 0
			? rgbToColor256({
					r: Math.round(accum.totalR / accum.count),
					g: Math.round(accum.totalG / accum.count),
					b: Math.round(accum.totalB / accum.count),
				})
			: asColor256(0);
	return { char, fg: avgColor as number, bg: 0 };
}

/**
 * Renders a bitmap in braille mode for higher resolution output.
 */
export function renderBrailleMode(bitmap: Bitmap, bg: RGB): CellMap {
	const cellWidth = Math.ceil(bitmap.width / 2);
	const cellHeight = Math.ceil(bitmap.height / 4);
	const cells: Cell[][] = [];
	const luminanceThreshold = 0.5;

	for (let cy = 0; cy < cellHeight; cy++) {
		const row: Cell[] = [];
		for (let cx = 0; cx < cellWidth; cx++) {
			const accum = computeBrailleCell(bitmap, cx, cy, bg, luminanceThreshold);
			row.push(brailleAccumToCell(accum));
		}
		cells.push(row);
	}

	return { width: cellWidth, height: cellHeight, cells };
}
