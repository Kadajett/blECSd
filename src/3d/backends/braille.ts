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
			const cells = new Array<{ x: number; y: number; char: string; fg: number; bg: number }>(totalCells);
			const buf = framebuffer.colorBuffer;
			const fbWidth = framebuffer.width;
			const fbW4 = fbWidth * 4; // Row stride in bytes

			let cellIdx = 0;
			for (let cy = 0; cy < cellsTall; cy++) {
				const basePixelY = cy * 4;
				// Pre-compute row base offsets
				const row0Base = basePixelY * fbW4;
				const row1Base = row0Base + fbW4;
				const row2Base = row1Base + fbW4;
				const row3Base = row2Base + fbW4;

				for (let cx = 0; cx < cellsWide; cx++) {
					const basePixelX4 = cx * 2 * 4; // Base pixel X * 4 bytes

					let dotPattern = 0;
					let rSum = 0;
					let gSum = 0;
					let bSum = 0;
					let litCount = 0;

					// Unrolled 2x4 pixel loop (8 pixels per cell)
					// Row 0, Col 0
					let idx = row0Base + basePixelX4;
					let a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT0; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 0, Col 1
					idx += 4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT1; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 1, Col 0
					idx = row1Base + basePixelX4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT2; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 1, Col 1
					idx += 4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT3; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 2, Col 0
					idx = row2Base + basePixelX4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT4; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 2, Col 1
					idx += 4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT5; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 3, Col 0
					idx = row3Base + basePixelX4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT6; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }
					// Row 3, Col 1
					idx += 4;
					a = buf[idx + 3] as number;
					if (a >= threshold) { dotPattern |= DOT7; rSum += buf[idx] as number; gSum += buf[idx + 1] as number; bSum += buf[idx + 2] as number; litCount++; }

					let fg = 0;
					if (litCount > 0) {
						const invLit = 1 / litCount;
						fg = (((rSum * invLit + 0.5) | 0) << 16) | (((gSum * invLit + 0.5) | 0) << 8) | ((bSum * invLit + 0.5) | 0);
					}

					cells[cellIdx++] = {
						x: screenX + cx,
						y: screenY + cy,
						char: BRAILLE_CHAR_TABLE[dotPattern]!,
						fg,
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
