/**
 * GIF frame rendering utilities.
 *
 * @module media/gif/frameRendering
 */

import type { GIFColor, GIFFrame } from './types';

/**
 * Converts a GIF frame to RGBA pixel data.
 *
 * Resolves palette indices to full RGBA colors using the appropriate color
 * table (local or global). Transparent pixels are rendered with alpha 0.
 *
 * @param frame - GIF frame to convert
 * @param globalColorTable - Global color table to use if no local table
 * @returns RGBA pixel data (4 bytes per pixel: R, G, B, A)
 *
 * @example
 * ```typescript
 * import { parseGIF, frameToRGBA } from 'blecsd';
 *
 * const gif = parseGIF(data);
 * if (gif.ok) {
 *   const rgba = frameToRGBA(gif.frames[0], gif.globalColorTable);
 *   // rgba is Uint8Array with width * height * 4 bytes
 * }
 * ```
 */
export function frameToRGBA(frame: GIFFrame, globalColorTable: readonly GIFColor[]): Uint8Array {
	const colorTable = frame.localColorTable ?? globalColorTable;
	const rgba = new Uint8Array(frame.width * frame.height * 4);

	for (let i = 0; i < frame.pixels.length; i++) {
		const index = frame.pixels[i] ?? 0;
		const outPos = i * 4;

		if (frame.transparentIndex !== undefined && index === frame.transparentIndex) {
			rgba[outPos] = 0;
			rgba[outPos + 1] = 0;
			rgba[outPos + 2] = 0;
			rgba[outPos + 3] = 0;
			continue;
		}

		const color = colorTable[index];
		if (color) {
			rgba[outPos] = color.r;
			rgba[outPos + 1] = color.g;
			rgba[outPos + 2] = color.b;
			rgba[outPos + 3] = 255;
		}
	}

	return rgba;
}
