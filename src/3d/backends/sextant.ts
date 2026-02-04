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

import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type SextantConfig, SextantConfigSchema } from '../schemas/backends';
import type { RendererBackend } from './types';

/** Sextant Unicode block base offset. Pattern N maps to U+1FB00 + (N - 1). */
const SEXTANT_BASE = 0x1fb00;

/** Full block character for pattern 63 (all 6 pixels lit). */
const FULL_BLOCK = '\u2588';

/** Mutable accumulator for sextant cell processing */
interface SextantCellAccum {
	pattern: number;
	rSum: number;
	gSum: number;
	bSum: number;
	litCount: number;
}

/**
 * Process a 2x3 grid of pixels for a sextant cell.
 */
function processSextantPixels(
	buf: Uint8ClampedArray,
	px: number,
	py: number,
	fbWidth: number,
	threshold: number,
	accum: SextantCellAccum,
): void {
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 2; col++) {
			const pixelX = px + col;
			const pixelY = py + row;
			const idx = (pixelY * fbWidth + pixelX) * 4;
			const a = buf[idx + 3] as number;

			if (a >= threshold) {
				const bit = row * 2 + col;
				accum.pattern |= 1 << bit;
				accum.rSum += buf[idx] as number;
				accum.gSum += buf[idx + 1] as number;
				accum.bSum += buf[idx + 2] as number;
				accum.litCount++;
			}
		}
	}
}

/**
 * Get the character for a sextant pattern.
 */
function sextantPatternToChar(pattern: number): string {
	if (pattern === 0) return ' ';
	if (pattern === 63) return FULL_BLOCK;
	return String.fromCodePoint(SEXTANT_BASE + pattern - 1);
}

/**
 * Compute foreground color from accumulated RGB values.
 */
function computeSextantFg(accum: SextantCellAccum): number {
	if (accum.litCount === 0) return 0;
	const r = Math.round(accum.rSum / accum.litCount);
	const g = Math.round(accum.gSum / accum.litCount);
	const b = Math.round(accum.bSum / accum.litCount);
	return (r << 16) | (g << 8) | b;
}

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

			// Reusable accumulator to avoid per-cell allocations
			const accum: SextantCellAccum = { pattern: 0, rSum: 0, gSum: 0, bSum: 0, litCount: 0 };

			for (let cy = 0; cy < cellsTall; cy++) {
				for (let cx = 0; cx < cellsWide; cx++) {
					// Reset accumulator
					accum.pattern = 0;
					accum.rSum = 0;
					accum.gSum = 0;
					accum.bSum = 0;
					accum.litCount = 0;

					processSextantPixels(buf, cx * 2, cy * 3, fbWidth, threshold, accum);

					cells.push({
						x: screenX + cx,
						y: screenY + cy,
						char: sextantPatternToChar(accum.pattern),
						fg: computeSextantFg(accum),
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
