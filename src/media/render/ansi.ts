/**
 * ANSI image renderer for converting bitmap data to terminal-displayable cells.
 *
 * Supports 256-color palette mapping, ASCII art mode, and bitmap scaling
 * with alpha blending.
 *
 * @module media/render/ansi
 */

import { z } from 'zod';

import { blendWithAlpha } from '../../terminal/colors/blend';
import { rgbToColor256, sgrBg256, sgrFg256 } from '../../terminal/colors/convert';
import type { Color256, RGB, RGBA } from '../../terminal/colors/palette';
import { PALETTE_RGB } from '../../terminal/colors/palette';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single cell in the rendered output, representing one terminal character.
 *
 * @example
 * ```typescript
 * import type { Cell } from 'blecsd';
 *
 * const cell: Cell = { char: '#', fg: 9, bg: 0 };
 * ```
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
 *
 * @example
 * ```typescript
 * import type { CellMap } from 'blecsd';
 *
 * const map: CellMap = { width: 80, height: 24, cells: [[]] };
 * ```
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
 *
 * @example
 * ```typescript
 * import type { Bitmap } from 'blecsd';
 *
 * // 2x2 red image
 * const bitmap: Bitmap = {
 *   width: 2,
 *   height: 2,
 *   data: new Uint8Array([
 *     255, 0, 0, 255,  255, 0, 0, 255,
 *     255, 0, 0, 255,  255, 0, 0, 255,
 *   ]),
 * };
 * ```
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
 *
 * @example
 * ```typescript
 * import type { AnsiRenderOptions } from 'blecsd';
 *
 * const opts: AnsiRenderOptions = {
 *   width: 80,
 *   height: 24,
 *   mode: 'color',
 * };
 * ```
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
 *
 * @example
 * ```typescript
 * import { AnsiRenderOptionsSchema } from 'blecsd';
 *
 * const result = AnsiRenderOptionsSchema.safeParse({ width: 80, mode: 'ascii' });
 * if (result.success) {
 *   console.log('Valid options:', result.data);
 * }
 * ```
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

/**
 * ASCII characters ordered from darkest (space) to brightest.
 * Used for luminance-to-character mapping in ASCII art mode.
 */
const ASCII_RAMP = ' .:-=+*#%@';

/**
 * The upper-half-block Unicode character, used in color mode to represent
 * two vertical pixels per cell (top pixel as fg, bottom pixel as bg).
 */
const UPPER_HALF_BLOCK = '\u2580';

/**
 * Braille pattern offset for Unicode braille characters.
 */
const BRAILLE_OFFSET = 0x2800;

// =============================================================================
// COLOR CONVERSION
// =============================================================================

/**
 * Converts RGB values to the nearest 256-color palette index.
 *
 * Uses Euclidean distance in RGB space to find the closest match
 * from the standard 256-color terminal palette.
 *
 * @param r - Red channel (0-255)
 * @param g - Green channel (0-255)
 * @param b - Blue channel (0-255)
 * @returns The nearest 256-color palette index
 *
 * @example
 * ```typescript
 * import { rgbTo256Color } from 'blecsd';
 *
 * rgbTo256Color(255, 0, 0);     // 9 (bright red)
 * rgbTo256Color(0, 255, 0);     // 10 (bright green)
 * rgbTo256Color(0, 0, 255);     // 12 (bright blue)
 * rgbTo256Color(255, 255, 255); // 15 (white)
 * rgbTo256Color(0, 0, 0);       // 0 (black)
 * ```
 */
export function rgbTo256Color(r: number, g: number, b: number): number {
	return rgbToColor256({ r, g, b }) as number;
}

// =============================================================================
// LUMINANCE
// =============================================================================

/**
 * Maps a luminance value (0-1) to an ASCII character from the character ramp.
 *
 * Darker values map to sparser characters (space, dot) while brighter
 * values map to denser characters (#, @).
 *
 * @param luminance - Brightness value from 0 (black) to 1 (white)
 * @returns An ASCII character representing the brightness level
 *
 * @example
 * ```typescript
 * import { luminanceToChar } from 'blecsd';
 *
 * luminanceToChar(0);    // ' ' (space, darkest)
 * luminanceToChar(0.5);  // '+' (mid-brightness)
 * luminanceToChar(1);    // '@' (brightest)
 * ```
 */
export function luminanceToChar(luminance: number): string {
	const clamped = Math.max(0, Math.min(1, luminance));
	const index = Math.round(clamped * (ASCII_RAMP.length - 1));
	return ASCII_RAMP[index] ?? ' ';
}

/**
 * Calculates the perceived luminance of an RGB color.
 * Uses ITU-R BT.601 weights for perceptual accuracy.
 *
 * @param r - Red channel (0-255)
 * @param g - Green channel (0-255)
 * @param b - Blue channel (0-255)
 * @returns Luminance value from 0 to 1
 *
 * @example
 * ```typescript
 * import { rgbLuminance } from 'blecsd';
 *
 * rgbLuminance(255, 255, 255); // 1.0
 * rgbLuminance(0, 0, 0);       // 0.0
 * ```
 */
export function rgbLuminance(r: number, g: number, b: number): number {
	return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

// =============================================================================
// BITMAP SCALING
// =============================================================================

/**
 * Scales a bitmap to the target dimensions using nearest-neighbor sampling.
 *
 * @param bitmap - Source bitmap with RGBA pixel data
 * @param targetWidth - Desired width in pixels
 * @param targetHeight - Desired height in pixels
 * @returns A new Bitmap with scaled pixel data
 *
 * @example
 * ```typescript
 * import { scaleBitmap } from 'blecsd';
 *
 * const small = scaleBitmap(largeBitmap, 80, 24);
 * console.log(small.width, small.height); // 80, 24
 * ```
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
 * Uses standard Porter-Duff "over" compositing.
 *
 * @param pixel - Foreground pixel with RGBA channels (each 0-255, alpha 0-255)
 * @param bg - Opaque background color
 * @returns The composited RGB color
 *
 * @example
 * ```typescript
 * import { blendWithBackground } from 'blecsd';
 *
 * // 50% transparent red over black
 * const result = blendWithBackground(
 *   { r: 255, g: 0, b: 0, a: 128 },
 *   { r: 0, g: 0, b: 0 }
 * );
 * // Approximately { r: 128, g: 0, b: 0 }
 * ```
 */
export function blendWithBackground(pixel: RGBA, bg: RGB): RGB {
	// Convert 0-255 alpha to 0-1 for the existing blendWithAlpha function
	const normalizedAlpha = pixel.a / 255;
	return blendWithAlpha({ r: pixel.r, g: pixel.g, b: pixel.b, a: normalizedAlpha }, bg);
}

// =============================================================================
// PIXEL EXTRACTION
// =============================================================================

/**
 * Extracts an RGBA pixel from a bitmap at the given coordinates.
 */
function getPixel(bitmap: Bitmap, x: number, y: number): RGBA {
	const idx = (y * bitmap.width + x) * 4;
	return {
		r: bitmap.data[idx] ?? 0,
		g: bitmap.data[idx + 1] ?? 0,
		b: bitmap.data[idx + 2] ?? 0,
		a: bitmap.data[idx + 3] ?? 0,
	};
}

/**
 * Resolves a pixel to an opaque RGB color by blending with the background.
 */
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

/**
 * Applies Floyd-Steinberg dithering to an RGB pixel buffer in-place.
 * This distributes quantization error to neighboring pixels for smoother
 * color gradients in 256-color mode.
 */
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

/**
 * Distributes quantization error to a neighboring pixel.
 */
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

/**
 * Renders a bitmap in 256-color mode using upper-half-block characters.
 * Each terminal cell represents two vertical pixels: the top pixel as the
 * foreground color and the bottom pixel as the background color.
 */
function renderColorMode(bitmap: Bitmap, bg: RGB, dither: boolean): CellMap {
	// In color mode, each cell represents 2 vertical pixels
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
	// Build mutable RGB buffer for dithering
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

/**
 * Renders a bitmap in ASCII art mode using luminance-based characters.
 */
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

/**
 * Braille dot mapping for a 2x4 grid within each character cell.
 * Each dot position maps to a bit in the braille Unicode offset.
 *
 * Dot layout:
 *   (0,0)=0x01  (1,0)=0x08
 *   (0,1)=0x02  (1,1)=0x10
 *   (0,2)=0x04  (1,2)=0x20
 *   (0,3)=0x40  (1,3)=0x80
 */
const BRAILLE_MAP = [
	[0x01, 0x08],
	[0x02, 0x10],
	[0x04, 0x20],
	[0x40, 0x80],
] as const;

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
			: (0 as Color256);
	return { char, fg: avgColor as number, bg: 0 };
}

/**
 * Renders a bitmap in braille mode for higher resolution output.
 * Each terminal cell represents a 2x4 pixel grid using braille patterns.
 */
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

	// Determine target pixel dimensions for scaling
	const targetWidth = options?.width ?? bitmap.width;
	let targetHeight = options?.height;

	// In color mode, each cell shows 2 vertical pixels, so we need 2x the cell height
	if (targetHeight !== undefined && mode === 'color') {
		targetHeight = targetHeight * 2;
	}
	// In braille mode, each cell shows 4 vertical pixels and 2 horizontal
	if (targetHeight !== undefined && mode === 'braille') {
		targetHeight = targetHeight * 4;
	}
	const targetBrailleWidth = mode === 'braille' && options?.width ? options.width * 2 : undefined;

	const scaledWidth = targetBrailleWidth ?? targetWidth;
	const scaledHeight = targetHeight ?? bitmap.height;

	// Scale if needed
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
			// Only emit escape sequences when colors change
			if (cell.fg !== prevFg || cell.bg !== prevBg) {
				line += `\x1b[${sgrFg256(cell.fg as Color256)};${sgrBg256(cell.bg as Color256)}m`;
				prevFg = cell.fg;
				prevBg = cell.bg;
			}
			line += cell.char;
		}
		lines.push(line);
	}

	// Reset colors at the end
	return `${lines.join('\n')}\x1b[0m`;
}
