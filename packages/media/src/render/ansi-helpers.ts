/**
 * ANSI renderer helper functions.
 *
 * Functions shared with the core terminal graphics module are re-exported
 * from `blecsd/terminal` to avoid duplication. Functions unique to the
 * media package (pixel extraction, dithering) are defined here.
 *
 * @module media/render/ansi-helpers
 */

import type { RGB, RGBA } from 'blecsd/terminal';
import { blendWithAlpha, PALETTE_RGB, rgbToColor256 } from 'blecsd/terminal';
import type { Bitmap } from './ansi-types';

// ─── Re-exported from core ──────────────────────────────────────────────────
// These functions are identical to their `blecsd/terminal` counterparts.
// Re-exporting avoids maintaining two copies.

export {
	blendWithBackground,
	luminanceToChar,
	rgbLuminance,
	rgbTo256Color,
	scaleBitmap,
} from 'blecsd/terminal';

// ─── Media-specific helpers ─────────────────────────────────────────────────
// These are not exported from core (private in cellRenderer.ts).

/**
 * Extracts an RGBA pixel from a bitmap at the given coordinates.
 */
export function getPixel(bitmap: Bitmap, x: number, y: number): RGBA {
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
export function resolvePixel(bitmap: Bitmap, x: number, y: number, bg: RGB): RGB {
	const pixel = getPixel(bitmap, x, y);
	if (pixel.a === 255) {
		return { r: pixel.r, g: pixel.g, b: pixel.b };
	}
	if (pixel.a === 0) {
		return bg;
	}
	const normalizedAlpha = pixel.a / 255;
	return blendWithAlpha({ r: pixel.r, g: pixel.g, b: pixel.b, a: normalizedAlpha }, bg);
}

/**
 * Distributes quantization error to a neighboring pixel.
 */
export function distributeError(
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

/**
 * Applies Floyd-Steinberg dithering to an RGB pixel buffer in-place.
 */
export function applyDithering(
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
