/**
 * Sextant rendering backend.
 *
 * Maps 2x3 pixel blocks to Unicode 13 legacy computing sextant characters
 * (U+1FB00-U+1FB3B). Each terminal cell represents 6 pixels, offering a
 * middle ground between braille (2x4, 1 fg color) and half-block (1x2, 2 colors).
 *
 * Dot numbering:
 * ```
 * [0] [1]
 * [2] [3]
 * [4] [5]
 * ```
 *
 * Pattern mapping:
 * - Pattern 0 (all off): space character
 * - Patterns 1-62: U+1FB00 + (pattern - 1)
 * - Pattern 63 (all on): U+2588 (full block)
 *
 * Requires Unicode 13+ support in the terminal.
 *
 * @module 3d/backends/sextant
 */

import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type SextantConfig, SextantConfigSchema } from '../schemas/backends';
import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { RendererBackend } from './types';

/** Sextant Unicode block base offset. Pattern N maps to U+1FB00 + (N - 1). */
const SEXTANT_BASE = 0x1FB00;

/** Full block character for pattern 63 (all 6 pixels lit). */
const FULL_BLOCK = '\u2588';

/**
 * Create a sextant rendering backend.
 *
 * @param config - Optional sextant configuration
 * @returns A RendererBackend that encodes pixels as sextant characters
 *
 * @example
 * ```typescript
 * const backend = createSextantBackend({ threshold: 100 });
 * const dims = backend.getPixelDimensions(80, 24);
 * // dims = { width: 160, height: 72 }
 * ```
 */
export function createSextantBackend(config?: SextantConfig): RendererBackend {
	const validated = SextantConfigSchema.parse(config ?? {});
	const threshold = validated.threshold;
	const bgColor = validated.backgroundColor;

	const capabilities: BackendCapabilities = {
		maxColors: 2,
		supportsAlpha: false,
		pixelsPerCellX: 2,
		pixelsPerCellY: 3,
		supportsAnimation: true,
		requiresEscapeSequences: false,
	};

	return {
		type: 'sextant',
		capabilities,

		encode(framebuffer: PixelFramebuffer, screenX: number, screenY: number): EncodedOutput {
			const cellsWide = Math.floor(framebuffer.width / 2);
			const cellsTall = Math.floor(framebuffer.height / 3);
			const cells: Array<{ x: number; y: number; char: string; fg: number; bg: number }> = [];
			const buf = framebuffer.colorBuffer;
			const fbWidth = framebuffer.width;

			for (let cy = 0; cy < cellsTall; cy++) {
				for (let cx = 0; cx < cellsWide; cx++) {
					const px = cx * 2;
					const py = cy * 3;

					let pattern = 0;
					let rSum = 0;
					let gSum = 0;
					let bSum = 0;
					let litCount = 0;

					// Dot layout: row-major, left-to-right
					// [0][1] = row 0
					// [2][3] = row 1
					// [4][5] = row 2
					for (let row = 0; row < 3; row++) {
						for (let col = 0; col < 2; col++) {
							const pixelX = px + col;
							const pixelY = py + row;
							const idx = (pixelY * fbWidth + pixelX) * 4;
							const a = buf[idx + 3] as number;

							if (a >= threshold) {
								const bit = row * 2 + col;
								pattern |= (1 << bit);
								rSum += buf[idx] as number;
								gSum += buf[idx + 1] as number;
								bSum += buf[idx + 2] as number;
								litCount++;
							}
						}
					}

					let char: string;
					if (pattern === 0) {
						char = ' ';
					} else if (pattern === 63) {
						char = FULL_BLOCK;
					} else {
						char = String.fromCodePoint(SEXTANT_BASE + pattern - 1);
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
						char,
						fg,
						bg: bgColor,
					});
				}
			}

			return { cells };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			return { width: cellWidth * 2, height: cellHeight * 3 };
		},
	};
}
