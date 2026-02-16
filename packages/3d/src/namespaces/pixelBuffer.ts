/**
 * PixelBuffer operations namespace for RGBA framebuffer management.
 *
 * @example
 * ```typescript
 * import { pixelBuffer } from '@blecsd/3d';
 *
 * const fb = pixelBuffer.create({ width: 400, height: 200 });
 * pixelBuffer.clear(fb, { r: 0, g: 0, b: 0, a: 255 });
 * pixelBuffer.setPixel(fb, 10, 20, { r: 255, g: 0, b: 0, a: 255 });
 * const color = pixelBuffer.getPixel(fb, 10, 20);
 * ```
 */

import {
	clearFramebuffer,
	createPixelFramebuffer,
	fillRect,
	getDepth,
	getPixel,
	isInBounds,
	type PixelFramebuffer,
	setPixel,
	setPixelUnsafe,
	testAndSetDepth,
} from '../rasterizer/pixelBuffer';
import type { PixelBufferConfig, RGBAColor } from '../schemas/rasterizer';

export const pixelBuffer = Object.freeze({
	create: createPixelFramebuffer,
	clear: clearFramebuffer,
	isInBounds,
	getPixel,
	setPixel,
	setPixelUnsafe,
	getDepth,
	testAndSetDepth,
	fillRect,
});

export type PixelBufferModule = typeof pixelBuffer;
export type { PixelFramebuffer, PixelBufferConfig, RGBAColor };
