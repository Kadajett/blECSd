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

import type { PixelFramebuffer } from '../rasterizer/pixelBuffer';
import type { BackendCapabilities, EncodedOutput } from '../schemas/backends';
import { type BrailleConfig, BrailleConfigSchema } from '../schemas/backends';
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
	0x01,
	0x08, // row 0: col 0 = bit 0, col 1 = bit 3
	0x02,
	0x10, // row 1: col 0 = bit 1, col 1 = bit 4
	0x04,
	0x20, // row 2: col 0 = bit 2, col 1 = bit 5
	0x40,
	0x80, // row 3: col 0 = bit 6, col 1 = bit 7
];

// Pre-computed braille character lookup table: 256 patterns -> pre-allocated strings
const BRAILLE_CHAR_TABLE: ReadonlyArray<string> = (() => {
	const table = new Array<string>(256);
	for (let i = 0; i < 256; i++) {
		table[i] = String.fromCharCode(BRAILLE_BASE + i);
	}
	return table;
})();

// Flat array of dot map values for unrolled inner loop access
const DOT0 = BRAILLE_DOT_MAP[0] as number; // row 0, col 0
const DOT1 = BRAILLE_DOT_MAP[1] as number; // row 0, col 1
const DOT2 = BRAILLE_DOT_MAP[2] as number; // row 1, col 0
const DOT3 = BRAILLE_DOT_MAP[3] as number; // row 1, col 1
const DOT4 = BRAILLE_DOT_MAP[4] as number; // row 2, col 0
const DOT5 = BRAILLE_DOT_MAP[5] as number; // row 2, col 1
const DOT6 = BRAILLE_DOT_MAP[6] as number; // row 3, col 0
const DOT7 = BRAILLE_DOT_MAP[7] as number; // row 3, col 1

/** Mutable accumulator for braille cell processing */
interface BrailleCellAccum {
	dotPattern: number;
	rSum: number;
	gSum: number;
	bSum: number;
	litCount: number;
}

/**
 * Process a single pixel and accumulate into the cell state.
 * Returns true if pixel was lit (above threshold).
 */
function processPixel(
	buf: Uint8ClampedArray,
	idx: number,
	threshold: number,
	dotBit: number,
	accum: BrailleCellAccum,
): void {
	const a = buf[idx + 3] as number;
	if (a >= threshold) {
		accum.dotPattern |= dotBit;
		accum.rSum += buf[idx] as number;
		accum.gSum += buf[idx + 1] as number;
		accum.bSum += buf[idx + 2] as number;
		accum.litCount++;
	}
}

/**
 * Compute average foreground color from accumulated RGB values.
 */
function computeForegroundColor(accum: BrailleCellAccum): number {
	if (accum.litCount === 0) return 0;
	const invLit = 1 / accum.litCount;
	return (
		(((accum.rSum * invLit + 0.5) | 0) << 16) |
		(((accum.gSum * invLit + 0.5) | 0) << 8) |
		((accum.bSum * invLit + 0.5) | 0)
	);
}

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
			const totalCells = cellsWide * cellsTall;
			const cells = new Array<{ x: number; y: number; char: string; fg: number; bg: number }>(
				totalCells,
			);
			const buf = framebuffer.colorBuffer;
			const fbWidth = framebuffer.width;
			const fbW4 = fbWidth * 4; // Row stride in bytes

			// Reusable accumulator to avoid per-cell allocations
			const accum: BrailleCellAccum = { dotPattern: 0, rSum: 0, gSum: 0, bSum: 0, litCount: 0 };

			let cellIdx = 0;
			for (let cy = 0; cy < cellsTall; cy++) {
				const basePixelY = cy * 4;
				const row0Base = basePixelY * fbW4;
				const row1Base = row0Base + fbW4;
				const row2Base = row1Base + fbW4;
				const row3Base = row2Base + fbW4;

				for (let cx = 0; cx < cellsWide; cx++) {
					const basePixelX4 = cx * 2 * 4;

					// Reset accumulator for this cell
					accum.dotPattern = 0;
					accum.rSum = 0;
					accum.gSum = 0;
					accum.bSum = 0;
					accum.litCount = 0;

					// Process all 8 pixels in the 2x4 braille cell
					processPixel(buf, row0Base + basePixelX4, threshold, DOT0, accum);
					processPixel(buf, row0Base + basePixelX4 + 4, threshold, DOT1, accum);
					processPixel(buf, row1Base + basePixelX4, threshold, DOT2, accum);
					processPixel(buf, row1Base + basePixelX4 + 4, threshold, DOT3, accum);
					processPixel(buf, row2Base + basePixelX4, threshold, DOT4, accum);
					processPixel(buf, row2Base + basePixelX4 + 4, threshold, DOT5, accum);
					processPixel(buf, row3Base + basePixelX4, threshold, DOT6, accum);
					processPixel(buf, row3Base + basePixelX4 + 4, threshold, DOT7, accum);

					cells[cellIdx++] = {
						x: screenX + cx,
						y: screenY + cy,
						char: BRAILLE_CHAR_TABLE[accum.dotPattern] ?? '⠀',
						fg: computeForegroundColor(accum),
						bg: bgColor,
					};
				}
			}

			return { cells };
		},

		getPixelDimensions(cellWidth: number, cellHeight: number): { width: number; height: number } {
			return { width: cellWidth * 2, height: cellHeight * 4 };
		},
	};
}
