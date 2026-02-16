/**
 * ANSI renderer helper functions.
 *
 * @module media/render/ansi-helpers
 */

import type { RGB, RGBA } from 'blecsd/terminal';
import { blendWithAlpha, PALETTE_RGB, rgbToColor256 } from 'blecsd/terminal';
import type { Bitmap } from './ansi-types';
import { ASCII_RAMP } from './ansi-types';

/**
 * Converts RGB values to the nearest 256-color palette index.
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
 * ```
 */
export function rgbTo256Color(r: number, g: number, b: number): number {
	return rgbToColor256({ r, g, b }) as number;
}

/**
 * Maps a luminance value (0-1) to an ASCII character from the character ramp.
 *
 * @param luminance - Brightness value from 0 (black) to 1 (white)
 * @returns An ASCII character representing the brightness level
 *
 * @example
 * ```typescript
 * import { luminanceToChar } from 'blecsd';
 *
 * luminanceToChar(0);    // ' ' (space, darkest)
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

/**
 * Blends a pixel with an alpha channel over an opaque background color.
 *
 * @param pixel - Foreground pixel with RGBA channels
 * @param bg - Opaque background color
 * @returns The composited RGB color
 *
 * @example
 * ```typescript
 * import { blendWithBackground } from 'blecsd';
 *
 * const result = blendWithBackground(
 *   { r: 255, g: 0, b: 0, a: 128 },
 *   { r: 0, g: 0, b: 0 }
 * );
 * ```
 */
export function blendWithBackground(pixel: RGBA, bg: RGB): RGB {
	const normalizedAlpha = pixel.a / 255;
	return blendWithAlpha({ r: pixel.r, g: pixel.g, b: pixel.b, a: normalizedAlpha }, bg);
}

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
	return blendWithBackground(pixel, bg);
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
