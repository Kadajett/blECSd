/**
 * Cell-based image renderer for converting bitmap data to terminal-displayable cells.
 *
 * Supports 256-color palette mapping, ASCII art mode, and bitmap scaling
 * with alpha blending. Used by the ANSI and braille graphics backends.
 *
 * @module terminal/graphics/cellRenderer
 */

import { z } from 'zod';

import { blendWithAlpha } from '../colors/blend';
import { rgbToColor256, sgrBg256, sgrFg256 } from '../colors/convert';
import type { Color256, RGB, RGBA } from '../colors/palette';
import { PALETTE_RGB } from '../colors/palette';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single cell in the rendered output, representing one terminal character.
 */
export interface Cell {
	/** The character displayed in this cell */
	readonly char: string;
	/** Foreground color as a 256-color palette index */
	readonly fg: number;
	/** Background color as a 256-color palette index */
	readonly bg: number;
}

/**
 * A 2D grid of cells representing the rendered image.
 */
export interface CellMap {
	/** Width in terminal columns */
	readonly width: number;
	/** Height in terminal rows */
	readonly height: number;
	/** 2D array of cells, indexed as cells[row][col] */
	readonly cells: readonly (readonly Cell[])[];
}

/**
 * Raw RGBA bitmap pixel data.
 */
export interface Bitmap {
	/** Width in pixels */
	readonly width: number;
	/** Height in pixels */
	readonly height: number;
	/** RGBA pixel data (4 bytes per pixel: R, G, B, A) */
	readonly data: Uint8Array;
}

/**
 * Render mode for ANSI output.
 * - 'color': Full 256-color background blocks using upper-half-block characters
 * - 'ascii': ASCII art using luminance-based character ramp
 * - 'braille': Braille pattern characters for higher resolution
 */
export type RenderMode = 'color' | 'ascii' | 'braille';

/**
 * Options for controlling how bitmaps are rendered to ANSI cells.
 */
export interface AnsiRenderOptions {
	/** Target width in terminal columns. Defaults to bitmap width. */
	readonly width?: number | undefined;
	/** Target height in terminal rows. Defaults to bitmap height. */
	readonly height?: number | undefined;
	/** Render mode. Defaults to 'color'. */
	readonly mode?: RenderMode | undefined;
	/** Enable Floyd-Steinberg dithering. Defaults to false. */
	readonly dither?: boolean | undefined;
	/** Background color for alpha blending. Defaults to { r: 0, g: 0, b: 0 }. */
	readonly background?: RGB | undefined;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for validating AnsiRenderOptions at system boundaries.
 */
export const AnsiRenderOptionsSchema = z.object({
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	mode: z.enum(['color', 'ascii', 'braille']).optional(),
	dither: z.boolean().optional(),
	background: z
		.object({
			r: z.number().int().min(0).max(255),
			g: z.number().int().min(0).max(255),
			b: z.number().int().min(0).max(255),
		})
		.optional(),
});

// =============================================================================
// ASCII CHARACTER RAMP
// =============================================================================

const ASCII_RAMP = ' .:-=+*#%@';
const UPPER_HALF_BLOCK = '\u2580';
const BRAILLE_OFFSET = 0x2800;

// =============================================================================
// COLOR CONVERSION
// =============================================================================

/**
 * Converts RGB values to the nearest 256-color palette index.
 */
export function rgbTo256Color(r: number, g: number, b: number): number {
	return rgbToColor256({ r, g, b }) as number;
}

// =============================================================================
// LUMINANCE
// =============================================================================

/**
 * Maps a luminance value (0-1) to an ASCII character from the character ramp.
 */
export function luminanceToChar(luminance: number): string {
	const clamped = Math.max(0, Math.min(1, luminance));
	const index = Math.round(clamped * (ASCII_RAMP.length - 1));
	return ASCII_RAMP[index] ?? ' ';
}

/**
 * Calculates the perceived luminance of an RGB color.
 * Uses ITU-R BT.601 weights for perceptual accuracy.
 */
export function rgbLuminance(r: number, g: number, b: number): number {
	return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

// =============================================================================
// BITMAP SCALING
// =============================================================================

/**
 * Scales a bitmap to the target dimensions using nearest-neighbor sampling.
 */
export function scaleBitmap(bitmap: Bitmap, targetWidth: number, targetHeight: number): Bitmap {
	if (targetWidth <= 0 || targetHeight <= 0) {
		return { width: 0, height: 0, data: new Uint8Array(0) };
	}

	const data = new Uint8Array(targetWidth * targetHeight * 4);
	const xRatio = bitmap.width / targetWidth;
	const yRatio = bitmap.height / targetHeight;

	for (let y = 0; y < targetHeight; y++) {
		const srcY = Math.min(Math.floor(y * yRatio), bitmap.height - 1);
		for (let x = 0; x < targetWidth; x++) {
			const srcX = Math.min(Math.floor(x * xRatio), bitmap.width - 1);
			const srcIdx = (srcY * bitmap.width + srcX) * 4;
			const dstIdx = (y * targetWidth + x) * 4;
			data[dstIdx] = bitmap.data[srcIdx] ?? 0;
			data[dstIdx + 1] = bitmap.data[srcIdx + 1] ?? 0;
			data[dstIdx + 2] = bitmap.data[srcIdx + 2] ?? 0;
			data[dstIdx + 3] = bitmap.data[srcIdx + 3] ?? 0;
		}
	}

	return { width: targetWidth, height: targetHeight, data };
}

// =============================================================================
// ALPHA BLENDING
// =============================================================================

/**
 * Blends a pixel with an alpha channel over an opaque background color.
 */
export function blendWithBackground(pixel: RGBA, bg: RGB): RGB {
	const normalizedAlpha = pixel.a / 255;
	return blendWithAlpha({ r: pixel.r, g: pixel.g, b: pixel.b, a: normalizedAlpha }, bg);
}

// =============================================================================
// PIXEL EXTRACTION
// =============================================================================

function getPixel(bitmap: Bitmap, x: number, y: number): RGBA {
	const idx = (y * bitmap.width + x) * 4;
	return {
		r: bitmap.data[idx] ?? 0,
		g: bitmap.data[idx + 1] ?? 0,
		b: bitmap.data[idx + 2] ?? 0,
		a: bitmap.data[idx + 3] ?? 0,
	};
}

function resolvePixel(bitmap: Bitmap, x: number, y: number, bg: RGB): RGB {
	const pixel = getPixel(bitmap, x, y);
	if (pixel.a === 255) {
		return { r: pixel.r, g: pixel.g, b: pixel.b };
	}
	if (pixel.a === 0) {
		return bg;
	}
	return blendWithBackground(pixel, bg);
}

// =============================================================================
// DITHERING
// =============================================================================

function applyDithering(
	rgbBuffer: Array<{ r: number; g: number; b: number }>,
	width: number,
	height: number,
): void {
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			const pixel = rgbBuffer[idx];
			if (!pixel) continue;

			const colorIdx = rgbToColor256(pixel) as number;
			const palEntry = PALETTE_RGB[colorIdx];
			if (!palEntry) continue;

			const errR = pixel.r - palEntry.r;
			const errG = pixel.g - palEntry.g;
			const errB = pixel.b - palEntry.b;

			distributeError(rgbBuffer, width, height, x + 1, y, errR, errG, errB, 7 / 16);
			distributeError(rgbBuffer, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
			distributeError(rgbBuffer, width, height, x, y + 1, errR, errG, errB, 5 / 16);
			distributeError(rgbBuffer, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
		}
	}
}

function distributeError(
	buffer: Array<{ r: number; g: number; b: number }>,
	width: number,
	height: number,
	x: number,
	y: number,
	errR: number,
	errG: number,
	errB: number,
	factor: number,
): void {
	if (x < 0 || x >= width || y < 0 || y >= height) return;
	const idx = y * width + x;
	const pixel = buffer[idx];
	if (!pixel) return;
	pixel.r = Math.max(0, Math.min(255, Math.round(pixel.r + errR * factor)));
	pixel.g = Math.max(0, Math.min(255, Math.round(pixel.g + errG * factor)));
	pixel.b = Math.max(0, Math.min(255, Math.round(pixel.b + errB * factor)));
}

// =============================================================================
// RENDER: COLOR MODE
// =============================================================================

function renderColorMode(bitmap: Bitmap, bg: RGB, dither: boolean): CellMap {
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

// =============================================================================
// RENDER: ASCII MODE
// =============================================================================

function renderAsciiMode(bitmap: Bitmap, bg: RGB): CellMap {
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

// =============================================================================
// RENDER: BRAILLE MODE
// =============================================================================

const BRAILLE_MAP = [
	[0x01, 0x08],
	[0x02, 0x10],
	[0x04, 0x20],
	[0x40, 0x80],
] as const;

interface BrailleAccum {
	pattern: number;
	totalR: number;
	totalG: number;
	totalB: number;
	count: number;
}

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

function brailleAccumToCell(accum: BrailleAccum): Cell {
	const char = String.fromCodePoint(BRAILLE_OFFSET + accum.pattern);
	const avgColor =
		accum.count > 0
			? rgbToColor256({
					r: Math.round(accum.totalR / accum.count),
					g: Math.round(accum.totalG / accum.count),
					b: Math.round(accum.totalB / accum.count),
				})
			: (0 as Color256);
	return { char, fg: avgColor as number, bg: 0 };
}

function renderBrailleMode(bitmap: Bitmap, bg: RGB): CellMap {
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

// =============================================================================
// MAIN RENDER FUNCTION
// =============================================================================

/**
 * Renders a bitmap to a grid of ANSI terminal cells.
 *
 * Supports three render modes:
 * - **color**: Uses upper-half-block characters with 256-color fg/bg
 * - **ascii**: Maps pixel luminance to ASCII characters
 * - **braille**: Uses braille pattern characters for 2x4 sub-cell resolution
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

// =============================================================================
// STRING OUTPUT
// =============================================================================

/**
 * Converts a CellMap to a string containing ANSI escape sequences.
 */
export function cellMapToString(cellMap: CellMap): string {
	const lines: string[] = [];

	for (const row of cellMap.cells) {
		let line = '';
		let prevFg = -1;
		let prevBg = -1;

		for (const cell of row) {
			if (cell.fg !== prevFg || cell.bg !== prevBg) {
				line += `\x1b[${sgrFg256(cell.fg as Color256)};${sgrBg256(cell.bg as Color256)}m`;
				prevFg = cell.fg;
				prevBg = cell.bg;
			}
			line += cell.char;
		}
		lines.push(line);
	}

	return `${lines.join('\n')}\x1b[0m`;
}
