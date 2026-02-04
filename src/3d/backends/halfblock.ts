/**
 * Half-block rendering backend.
 *
 * Maps 1x2 pixel blocks using upper/lower half-block characters.
 * Each terminal cell represents 2 pixels vertically, with independent
 * foreground and background colors for true 2-color-per-cell rendering.
 *
 * Characters used:
 * - U+2580 (upper half block): top pixel as fg, bottom pixel as bg
 * - U+2584 (lower half block): bottom pixel as fg, top pixel as bg
 * - U+2588 (full block): both pixels same color, that color as fg
 * - Space: both pixels are background color
 *
 * @module 3d/backends/halfblock
 */

import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type HalfBlockConfig, HalfBlockConfigSchema } from '../schemas/backends';
import type { RendererBackend } from './types';

const UPPER_HALF = '\u2580';
const FULL_BLOCK = '\u2588';

/**
 * Convert RGBA pixel values at an offset to a 24-bit RGB number.
 */
function pixelToRgb(buf: Uint8ClampedArray, idx: number): number {
	return ((buf[idx] as number) << 16) | ((buf[idx + 1] as number) << 8) | (buf[idx + 2] as number);
}

/**
 * Check if a pixel is transparent (alpha = 0).
 */
function isTransparent(buf: Uint8ClampedArray, idx: number): boolean {
	return (buf[idx + 3] as number) === 0;
}

/** Cell rendering result */
interface HalfBlockCell {
	char: string;
	fg: number;
	bg: number;
}

/**
 * Determine the character and colors for a half-block cell based on top/bottom pixel colors.
 */
function computeHalfBlockCell(topColor: number, botColor: number, bgColor: number): HalfBlockCell {
	// Both pixels are the same color
	if (topColor === botColor) {
		if (topColor === bgColor) {
			return { char: ' ', fg: bgColor, bg: bgColor };
		}
		return { char: FULL_BLOCK, fg: topColor, bg: bgColor };
	}
	// Different colors: use upper half block (fg = top, bg = bottom)
	return { char: UPPER_HALF, fg: topColor, bg: botColor };
}

/**
 * Create a half-block rendering backend.
 *
 * @param config - Optional half-block configuration
 * @returns A RendererBackend that encodes pixels as half-block characters
 *
 * @example
 * ```typescript
 * const backend = createHalfBlockBackend();
 * const dims = backend.getPixelDimensions(80, 24);
 * // dims = { width: 80, height: 48 }
 * ```
 */
export function createHalfBlockBackend(config?: HalfBlockConfig): RendererBackend {
	const validated = HalfBlockConfigSchema.parse(config ?? {});
	const bgColor = validated.backgroundColor;

	const capabilities: BackendCapabilities = {
		maxColors: 2,
		supportsAlpha: false,
		pixelsPerCellX: 1,
		pixelsPerCellY: 2,
		supportsAnimation: true,
		requiresEscapeSequences: false,
	};

	return {
		type: 'halfblock',
		capabilities,

		encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput {
			const cellsWide = framebuffer.width;
			const cellsTall = Math.floor(framebuffer.height / 2);
			const cells: Array<{ x: number; y: number; char: string; fg: number; bg: number }> = [];
			const buf = framebuffer.colorBuffer;
			const fbWidth = framebuffer.width;

			for (let cy = 0; cy < cellsTall; cy++) {
				for (let cx = 0; cx < cellsWide; cx++) {
					const topIdx = (cy * 2 * fbWidth + cx) * 4;
					const botIdx = ((cy * 2 + 1) * fbWidth + cx) * 4;

					const topColor = isTransparent(buf, topIdx) ? bgColor : pixelToRgb(buf, topIdx);
					const botColor = isTransparent(buf, botIdx) ? bgColor : pixelToRgb(buf, botIdx);

					const cell = computeHalfBlockCell(topColor, botColor, bgColor);

					cells.push({
						x: screenX + cx,
						y: screenY + cy,
						char: cell.char,
						fg: cell.fg,
						bg: cell.bg,
					});
				}
			}

			return { cells };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			return { width: cellWidth, height: cellHeight * 2 };
		},
	};
}
