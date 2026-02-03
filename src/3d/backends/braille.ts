/**
 * Braille-dot rendering backend.
 *
 * Maps 2x4 pixel blocks to Unicode braille characters (U+2800-U+28FF).
 * Each terminal cell represents 8 pixels, giving ~2x density horizontally
 * and ~4x density vertically. This is the universal fallback backend
 * that works on virtually all Unicode terminals.
 *
 * Dot numbering follows the Unicode braille standard:
 * ```
 * [0] [3]     bit 0  bit 3
 * [1] [4]     bit 1  bit 4
 * [2] [5]     bit 2  bit 5
 * [6] [7]     bit 6  bit 7
 * ```
 *
 * @module 3d/backends/braille
 */

import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type BrailleConfig, BrailleConfigSchema } from '../schemas/backends';
import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { RendererBackend } from './types';

/** Braille Unicode block base offset. */
const BRAILLE_BASE = 0x2800;

/**
 * Bit positions for each pixel in a 2x4 braille cell.
 * Index = row * 2 + col, value = bit to set in the braille character.
 *
 * Layout:
 * ```
 * (0,0)=bit0  (1,0)=bit3
 * (0,1)=bit1  (1,1)=bit4
 * (0,2)=bit2  (1,2)=bit5
 * (0,3)=bit6  (1,3)=bit7
 * ```
 */
const BRAILLE_DOT_MAP: ReadonlyArray<number> = [
	0x01, 0x08, // row 0: col 0 = bit 0, col 1 = bit 3
	0x02, 0x10, // row 1: col 0 = bit 1, col 1 = bit 4
	0x04, 0x20, // row 2: col 0 = bit 2, col 1 = bit 5
	0x40, 0x80, // row 3: col 0 = bit 6, col 1 = bit 7
];

/**
 * Create a braille rendering backend.
 *
 * @param config - Optional braille configuration
 * @returns A RendererBackend that encodes pixels as braille characters
 *
 * @example
 * ```typescript
 * const backend = createBrailleBackend({ threshold: 64 });
 * const dims = backend.getPixelDimensions(80, 24);
 * // dims = { width: 160, height: 96 }
 * ```
 */
export function createBrailleBackend(config?: BrailleConfig): RendererBackend {
	const validated = BrailleConfigSchema.parse(config ?? {});
	const threshold = validated.threshold;
	const bgColor = validated.backgroundColor;

	const capabilities: BackendCapabilities = {
		maxColors: 2,
		supportsAlpha: false,
		pixelsPerCellX: 2,
		pixelsPerCellY: 4,
		supportsAnimation: true,
		requiresEscapeSequences: false,
	};

	return {
		type: 'braille',
		capabilities,

		encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput {
			const cellsWide = Math.floor(framebuffer.width / 2);
			const cellsTall = Math.floor(framebuffer.height / 4);
			const cells: Array<{ x: number; y: number; char: string; fg: number; bg: number }> = [];
			const buf = framebuffer.colorBuffer;
			const fbWidth = framebuffer.width;

			for (let cy = 0; cy < cellsTall; cy++) {
				for (let cx = 0; cx < cellsWide; cx++) {
					const px = cx * 2;
					const py = cy * 4;

					let dotPattern = 0;
					let rSum = 0;
					let gSum = 0;
					let bSum = 0;
					let litCount = 0;

					for (let row = 0; row < 4; row++) {
						for (let col = 0; col < 2; col++) {
							const pixelX = px + col;
							const pixelY = py + row;
							const idx = (pixelY * fbWidth + pixelX) * 4;
							const a = buf[idx + 3] as number;

							if (a >= threshold) {
								dotPattern |= BRAILLE_DOT_MAP[row * 2 + col] as number;
								rSum += buf[idx] as number;
								gSum += buf[idx + 1] as number;
								bSum += buf[idx + 2] as number;
								litCount++;
							}
						}
					}

					let fg = 0;
					if (litCount > 0) {
						const r = Math.round(rSum / litCount);
						const g = Math.round(gSum / litCount);
						const b = Math.round(bSum / litCount);
						fg = (r << 16) | (g << 8) | b;
					}

					cells.push({
						x: screenX + cx,
						y: screenY + cy,
						char: String.fromCharCode(BRAILLE_BASE + dotPattern),
						fg,
						bg: bgColor,
					});
				}
			}

			return { cells };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			return { width: cellWidth * 2, height: cellHeight * 4 };
		},
	};
}
