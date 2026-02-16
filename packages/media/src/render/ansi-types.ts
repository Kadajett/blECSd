/**
 * ANSI renderer types and schemas.
 *
 * @module media/render/ansi-types
 */

import type { RGB } from 'blecsd/terminal';
import { z } from 'zod';

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

/**
 * ASCII characters ordered from darkest (space) to brightest.
 * Used for luminance-to-character mapping in ASCII art mode.
 */
export const ASCII_RAMP = ' .:-=+*#%@';

/**
 * The upper-half-block Unicode character, used in color mode to represent
 * two vertical pixels per cell (top pixel as fg, bottom pixel as bg).
 */
export const UPPER_HALF_BLOCK = '\u2580';

/**
 * Braille pattern offset for Unicode braille characters.
 */
export const BRAILLE_OFFSET = 0x2800;

/**
 * Braille dot mapping for a 2x4 grid within each character cell.
 */
export const BRAILLE_MAP = [
	[0x01, 0x08],
	[0x02, 0x10],
	[0x04, 0x20],
	[0x40, 0x80],
] as const;
